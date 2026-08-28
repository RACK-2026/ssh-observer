// ===================== 本机 SSH 连接采集 =====================

const { SSH_PORT } = require('../config');
const { execPS } = require('../utils');

// 获取进程所属用户
async function getProcessUser(pid) {
  if (!pid) return 'System';
  var out = await execPS('(Get-Process -Id ' + pid + ' -IncludeUserName -ErrorAction SilentlyContinue).UserName');
  if (out && !out.includes('Exception') && !out.includes('Cannot')) {
    return out.split('\\').pop();
  }
  return 'Unknown';
}

// 采集本机所有 SSH 连接
async function collectSSHConnections() {
  var connections = [];

  // 方法1: Get-NetTCPConnection
  try {
    var cmd = 'try { ' +
      '$c = Get-NetTCPConnection -State Established,TimeWait,CloseWait -ErrorAction SilentlyContinue | ' +
      'Where-Object { $_.LocalPort -eq ' + SSH_PORT + ' -or $_.RemotePort -eq ' + SSH_PORT + ' }; ' +
      'if (-not $c) { echo "[]"; return }; ' +
      '$c | Select-Object LocalAddress,LocalPort,RemoteAddress,RemotePort,OwningProcess,CreationTime | ' +
      'ForEach-Object { [PSCustomObject]@{LA=$_.LocalAddress;LP=$_.LocalPort;RA=$_.RemoteAddress;RP=$_.RemotePort;S=$_.State.ToString();P=$_.OwningProcess;CT=$_.CreationTime} } | ' +
      'ConvertTo-Json -Compress } catch { echo "[]" }';
    var out = await execPS(cmd);
    if (out) {
      var d;
      try { d = JSON.parse(out); } catch(e) {}
      if (d) {
        var items = Array.isArray(d) ? d : [d];
        for (var item of items) {
          var pid = item.P || 0;
          var u = await getProcessUser(pid);
          connections.push({
            id: item.RA + '-' + item.RP + '-' + pid,
            localAddr: item.LA, localPort: item.LP,
            foreignAddr: item.RA, foreignPort: item.RP,
            state: item.S, pid: pid, username: u,
            connectedSince: item.CT ? new Date(item.CT).getTime() : Date.now(),
            detectedAt: new Date().toISOString()
          });
        }
        if (connections.length) return connections;
      }
    }
  } catch(e) {}

  // 方法2: netstat 降级
  try {
    var out = await execPS('netstat -ano | Select-String ":' + SSH_PORT + '\\s"');
    var lines = out.split('\n').filter(function(l) { return l.trim(); });
    for (var line of lines) {
      var parts = line.trim().split(/\s+/);
      if (parts.length < 5 || parts[3] === 'LISTENING') continue;
      var pid = parseInt(parts[parts.length - 1]) || 0;
      var foreign = parts[2];
      var u = await getProcessUser(pid);
      connections.push({
        id: foreign + '-' + pid,
        foreignAddr: foreign, state: parts[3],
        pid: pid, username: u,
        detectedAt: new Date().toISOString()
      });
    }
  } catch(e) {}

  return connections;
}

module.exports = { collectSSHConnections, getProcessUser };

