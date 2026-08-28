// ===================== WebSocket 代理（Agent 实时日志流） =====================

const http = require('http');
const url = require('url');
const { REMOTE_HOST, AGENT_PORT } = require('../config');
const { getAgentCookie } = require('../state');

function setupWsProxy(server) {
  server.on('upgrade', function(req, socket, head) {
    var pn = url.parse(req.url).pathname;

    if (pn.startsWith('/api/proxy/') && (pn.endsWith('/log/ws') || pn.includes('/audit_check/ws'))) {
      var target = pn.replace('/api/proxy/api/', '/api/').replace('/api/proxy/', '/');
      if (req.url.includes('?')) target += req.url.substring(req.url.indexOf('?'));

      var areq = http.request({
        hostname: REMOTE_HOST, port: AGENT_PORT,
        path: target, method: 'GET',
        headers: {
          'Cookie': getAgentCookie(),
          'Connection': 'Upgrade', 'Upgrade': 'websocket',
          'Sec-WebSocket-Version': req.headers['sec-websocket-version'],
          'Sec-WebSocket-Key': req.headers['sec-websocket-key']
        }
      });

      areq.on('upgrade', function(rr, rs, rh) {
        rs.pipe(socket);
        socket.pipe(rs);
        if (rh) rs.write(rh);
        if (head) areq.write(head);
      });

      areq.on('error', function() { try { socket.destroy(); } catch(e) {} });
      areq.end();
    }
  });
}

module.exports = { setupWsProxy };

