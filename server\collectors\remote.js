// ===================== 远程服务器状态采集 =====================
// 原子级拆分：每个解析步骤独立函数

const { SSH_CMD } = require('../config');
const { execSSH, fetchAgentList } = require('../utils');

// ---- 原子解析函数（每个只干一件事） ----

function parseSshdCount(raw) {
  return { running: parseInt(raw) > 0, processes: [], count: parseInt(raw) || 0 };
}

function parseAgentProcess(raw) {
  if (!raw || !raw.length) return { running: false, pid: null, socket: '-' };
  var lines = raw.split('\n').filter(Boolean);
  if (!lines.length) return { running: false, pid: null, socket: '-' };
  var parts = lines[0].trim().split(/\s+/).filter(Boolean);
  return {
    running: true,
    pid: parts[1] || parts[0] || '-',
    socket: '/tmp/ssh-agent.sock'
  };
}

function parseAgentKeys(raw) {
  if (!raw || raw === 'NO_KEYS' || raw.includes('no identities')) return [];
  return raw.split('\n').filter(Boolean).map(function(l) {
    var p = l.trim().split(/\s+/);
    return { bits: p[0], fingerprint: p[1], path: p.slice(2).join(' ') };
  });
}

function parseRemoteConns(raw) {
  if (!raw || raw === 'NO_CONNS') return [];
  return raw.split('\n').filter(Boolean).map(function(l, i) {
    var p = l.trim().split(/\s+/);
    var la = '-', fa = '-';
    if (p.length >= 5) {
      if (p[0].startsWith('tcp')) { la = p[3]; fa = p[4]; }
      else { la = p[4]; fa = p[5]; }
    }
    return { id: 'r-' + i, localAddr: la, foreignAddr: fa, state: 'ESTABLISHED' };
  });
}

function parseRemoteUsers(raw) {
  if (!raw || raw === 'NO_USERS') return [];
  return raw.split('\n').filter(Boolean).map(function(l) {
    var p = l.trim().split(/\s+/);
    return { user: p[0] || '-', from: p[p.length > 3 ? 4 : 1] || '-' };
  });
}

function parseLoadAvg(raw) {
  if (!raw || raw === 'NO_LOAD') return [];
  var nums = raw.match(/[\d.]+/g);
  return nums ? nums.slice(0, 3) : [];
}

// ---- 编排函数（只负责串联，不处理解析逻辑） ----

async function collectRemoteStatus() {
  var result = {
    connected: false, hostname: '-',
    sshd: { running: false, processes: [], count: 0 },
    agent: { running: false, keys: [], socket: '' },
    connections: [], users: [], load: [],
    lastCheck: new Date().toISOString(), error: null, agents: []
  };

  try {
    var hostname = await execSSH(SSH_CMD + ' "hostname 2>/dev/null || echo unknown"');
    if (!hostname) { result.error = '无法连接远程服务器'; return result; }
    result.connected = true;
    result.hostname = hostname;

    var r = await Promise.all([
      execSSH(SSH_CMD + ' "ps aux | grep sshd | grep -v grep | wc -l"'),
      execSSH(SSH_CMD + ' "ps aux | grep ssh-agent | grep -v grep | head -3"'),
      execSSH(SSH_CMD + ' "ss -tnp 2>/dev/null | grep ' + "'" + ':22' + "'" + ' | grep ESTAB | head -20 || netstat -tnp 2>/dev/null | grep ' + "'" + ':22' + "'" + ' | grep ESTABLISHED | head -20 || echo NO_CONNS"'),
      execSSH(SSH_CMD + ' "who 2>/dev/null || echo NO_USERS"'),
      execSSH(SSH_CMD + ' "cat /proc/loadavg 2>/dev/null || echo NO_LOAD"'),
      execSSH(SSH_CMD + ' "ssh-add -l 2>/dev/null || echo NO_KEYS"')
    ]);

    result.sshd = parseSshdCount(r[0]);
    result.agent = Object.assign(result.agent, parseAgentProcess(r[1]));
    result.agent.keys = parseAgentKeys(r[5]);
    result.connections = parseRemoteConns(r[2]);
    result.users = parseRemoteUsers(r[3]);
    result.load = parseLoadAvg(r[4]);
    result.agents = await fetchAgentList();

  } catch(e) { result.error = e.message; }

  return result;
}

module.exports = { collectRemoteStatus };

