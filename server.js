// ===================== SSH 监控面板 — 入口 =====================

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { execSync } = require('child_process');
const path = require('path');
const os = require('os');

const { PORT, POLL_INTERVAL } = require('./server/config');
const { setupRoutes } = require('./server/routes/api');
const { setupHttpProxy } = require('./server/proxy/http');
const { setupWsProxy } = require('./server/proxy/ws');
const { setupSocket } = require('./server/socket');
const { collectAll, collectRemoteLoop } = require('./server/collectors/loop');
const { resetState } = require('./server/state');

// ---- 创建服务 ----
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*', methods: ['GET', 'POST'] } });

// ---- 注册各模块 ----
app.use(express.static(path.join(__dirname, 'public')));
setupRoutes(app);
setupHttpProxy(app);
setupWsProxy(server);
setupSocket(io);

// ---- 启动 ----
function getLocalIP() {
  var ifaces = os.networkInterfaces();
  for (var name of Object.keys(ifaces)) {
    for (var iface of ifaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) return iface.address;
    }
  }
  return '127.0.0.1';
}

async function start() {
  try { execSync('npm install --silent', { cwd: __dirname, stdio: 'pipe' }); } catch(e) {}

  console.log('[Init] 启动 SSH 连接监控服务...');
  server.listen(PORT, function() {
    console.log('  ✅ SSH 监控面板已启动');
    console.log('  📊 本地访问: http://localhost:' + PORT);
    console.log('  🌐 网络访问: http://' + getLocalIP() + ':' + PORT);
    console.log('  🔄 刷新间隔: ' + POLL_INTERVAL + 'ms\n');

    setTimeout(function() {
      collectAll(io);
      collectRemoteLoop(io);
    }, 500);
    setInterval(function() { collectAll(io); }, POLL_INTERVAL);
    setInterval(function() { collectRemoteLoop(io); }, 10000);
  });
}

start().catch(function(e) { console.error('启动失败:', e.message); });

