// ===================== Socket.IO 事件处理 =====================

const { getState } = require('./state');

function setupSocket(io) {
  io.on('connection', function(socket) {
    var s = getState();
    socket.emit('init', {
      connections: s.connections, agentStatus: s.agentStatus,
      systemInfo: s.systemInfo, sshdStatus: s.sshdStatus,
      remoteStatus: s.remoteStatus,
      metrics: s.metrics, alerts: s.alerts
    });

    socket.on('disconnect', function() {});
  });
}

module.exports = { setupSocket };

