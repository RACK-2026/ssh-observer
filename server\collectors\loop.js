// ===================== 采集主循环编排 =====================

const { getState, setState, getHistory, pushHistory, getAlerts } = require('../state');
const { collectSSHConnections } = require('./ssh');
const { collectAgentStatus, collectSystemInfo, checkSSHDStatus } = require('./local');
const { collectRemoteStatus } = require('./remote');

// 检测新增/断开连接
function detectChanges(oldConns, newConns) {
  var oldIds = {};
  newConns.forEach(function(c) { oldIds[c.id] = true; });
  return {
    added: newConns.filter(function(c) { return !oldIds[c.id]; }),
    removed: oldConns.filter(function(c) { return !oldIds[c.id]; })
  };
}

// 主采集循环（本机快速采集）
async function collectAll(io) {
  try {
    var [connections, agentStatus, sysInfo, sshdStatus] = await Promise.all([
      collectSSHConnections(), collectAgentStatus(),
      collectSystemInfo(), checkSSHDStatus()
    ]);

    var state = getState();
    var dr = detectChanges(state.connections, connections);
    var uniqueUsers = new Set(connections.map(function(c) { return c.username; })).size;

    setState({
      connections: connections,
      agentStatus: agentStatus,
      systemInfo: sysInfo,
      sshdStatus: sshdStatus,
      metrics: {
        total: connections.length,
        users: uniqueUsers,
        peak: Math.max(connections.length, state.metrics.peak),
        history: getHistory()
      }
    });

    pushHistory({ time: new Date().toISOString(), count: connections.length, users: uniqueUsers });

    // 告警
    var alerts = [];
    dr.added.forEach(function(c) { alerts.push({ type: 'connected', message: '新连接: ' + (c.foreignAddr || c.remote), conn: c, time: new Date().toISOString() }); });
    dr.removed.forEach(function(c) { alerts.push({ type: 'disconnected', message: '断开: ' + (c.foreignAddr || c.remote), conn: c, time: new Date().toISOString() }); });
    if (alerts.length) {
      var s = getState();
      setState({ alerts: alerts.concat(s.alerts).slice(0, 100) });
    }

    // 推送
    var s = getState();
    io.emit('update', {
      connections: s.connections, agentStatus: s.agentStatus,
      systemInfo: s.systemInfo, sshdStatus: s.sshdStatus,
      remoteStatus: s.remoteStatus,
      metrics: s.metrics, alerts: s.alerts
    });
    if (dr.added.length) io.emit('connection-added', dr.added);
    if (dr.removed.length) io.emit('connection-removed', dr.removed);

  } catch(e) { console.error('采集错误:', e.message); }
}

// 远程采集循环
async function collectRemoteLoop(io) {
  try {
    var rs = await collectRemoteStatus();
    setState({ remoteStatus: rs });
    io.emit('remote-update', rs);
  } catch(e) { console.error('远程采集错误:', e.message); }
}

module.exports = { collectAll, collectRemoteLoop };

