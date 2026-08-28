// ===================== 本机 Agent / 系统 / SSHD 状态采集 =====================

const os = require('os');
const { execPS } = require('../utils');

// SSH Agent 状态
async function collectAgentStatus() {
  var result = { running: false, keys: [], socket: '', pid: null };
  try {
    var agentProc = await execPS('Get-Process ssh-agent -ErrorAction SilentlyContinue | ConvertTo-Json');
    if (agentProc) {
      result.running = true;
      try { var p = JSON.parse(agentProc); result.pid = Array.isArray(p) ? p[0].Id : p.Id; } catch(e) {}
    }
    result.socket = await execPS('echo $env:SSH_AUTH_SOCK') || 'npiperelay';
    var k = await execPS('ssh-add -l 2>$null');
    if (k && !k.includes('no identities') && !k.includes('Could not')) {
      result.keys = k.split('\n').filter(Boolean).map(function(line) {
        var parts = line.trim().split(/\s+/);
        return { bits: parts[0], fingerprint: parts[1], path: parts.slice(2).join(' ') };
      });
    }
  } catch(e) {}
  return result;
}

// 本机系统信息
function collectSystemInfo() {
  try {
    return {
      hostname: os.hostname(),
      platform: os.platform(),
      uptime: Math.floor(os.uptime()),
      memory: { total: os.totalmem(), free: os.freemem(), used: os.totalmem() - os.freemem() },
      cpus: os.cpus().length,
      loadAvg: os.loadavg().map(function(v) { return v.toFixed(2); }),
      timestamp: new Date().toISOString()
    };
  } catch(e) { return {}; }
}

// SSHD 服务状态
async function checkSSHDStatus() {
  try {
    var out = await execPS('Get-Process sshd -ErrorAction SilentlyContinue | Select-Object Id, StartTime | ConvertTo-Json');
    if (out) {
      try {
        var p = JSON.parse(out);
        var procs = Array.isArray(p) ? p : [p];
        return { running: true, processes: procs.map(function(x) { return { pid: x.Id, startTime: x.StartTime }; }), count: procs.length };
      } catch(e) { return { running: true, processes: [], count: 1 }; }
    }
  } catch(e) {}
  return { running: false, processes: [], count: 0 };
}

module.exports = { collectAgentStatus, collectSystemInfo, checkSSHDStatus };

