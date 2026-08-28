// ===================== API 路由 =====================

const { getState, getHistory } = require('../state');

function setupRoutes(app) {
  app.get('/api/status', function(req, res) {
    res.json({ state: getState(), uptime: process.uptime(), connections: getState().connections.length });
  });

  app.get('/api/history', function(req, res) {
    res.json(getHistory());
  });

  app.get('/api/health', function(req, res) {
    var s = getState();
    res.json({
      status: 'ok',
      uptime: process.uptime(),
      connections: s.connections.length,
      agentRunning: s.agentStatus.running
    });
  });
}

module.exports = { setupRoutes };

