// ===================== HTTP 代理（Agent 管理平台转发） =====================
// 职责：接收请求 → 转发到远程平台 → 路径重写 → 返回响应

const http = require('http');
const { REMOTE_HOST, AGENT_PORT } = require('../config');
const { getAgentCookie } = require('../state');
const { fetchAgentList } = require('../utils');
const { rewriteResponseBody } = require('./rewrite');

function setupHttpProxy(app) {
  app.all('/api/proxy/*', async function(req, res) {
    try {
      // 确保已登录（共享 cookie）
      if (!getAgentCookie()) { try { await fetchAgentList(); } catch(e) {} }

      var proxyPath = req.originalUrl.substring('/api/proxy'.length) || '/';
      var opts = {
        hostname: REMOTE_HOST, port: AGENT_PORT,
        path: proxyPath, method: req.method,
        headers: {
          'Cookie': getAgentCookie(),
          'Accept': req.headers.accept || '*/*',
          'Accept-Encoding': 'identity',
          'User-Agent': req.headers['user-agent'] || 'Mozilla/5.0',
          'Content-Type': req.headers['content-type'] || 'application/json'
        },
        timeout: 10000
      };

      var preq = http.request(opts, function(pres) {
        var chunks = [];
        pres.on('data', function(c) { chunks.push(c); });
        pres.on('end', function() {
          var body = Buffer.concat(chunks);
          var ct = pres.headers['content-type'] || '';
          var hdrs = Object.assign({}, pres.headers);
          delete hdrs['transfer-encoding']; delete hdrs['connection']; delete hdrs['content-length'];

          // 重写 Location 重定向头
          if (hdrs.location && hdrs.location.startsWith('/')) {
            hdrs.location = '/api/proxy' + hdrs.location;
          }

          // 重写响应体（JS/HTML 路径 + CSS 注入）
          body = rewriteResponseBody(body, ct);

          res.writeHead(pres.statusCode, hdrs);
          res.end(body);
        });
      });

      preq.on('error', function(e) {
        if (!res.headersSent) res.status(502).json({ error: '代理失败: ' + e.message });
      });

      req.pipe(preq);
    } catch(e) {
      if (!res.headersSent) res.status(500).json({ error: e.message });
    }
  });
}

module.exports = { setupHttpProxy };

