// ===================== HTML/JS 路径重写（原子函数） =====================
// 纯函数：输入 body + content-type，输出重写后的 body

// JS 路径重写：fetch / location / WebSocket 中的路径
function rewriteJsPaths(str) {
  return str
    .replace(/fetch\(([`'"])\/api\//g, 'fetch($1/api/proxy/api/')
    .replace(/fetch\(['"]\/login/g, "fetch('/api/proxy/login")
    .replace(/location\.href\s*=\s*(['"])\//g, 'location.href = $1/api/proxy/')
    .replace(/WebSocket\((['"])/g, 'WebSocket($1/api/proxy/');
}

// HTML 属性重写：src / href / action / agents 路径
function rewriteHtmlAttrs(str) {
  return str
    .replace(/src="\//g, 'src="/api/proxy/')
    .replace(/href="\//g, 'href="/api/proxy/')
    .replace(/action="\/login/g, 'action="/api/proxy/login')
    .replace(/"\/agents\//g, '"/api/proxy/agents/')
    .replace(/'\/agents\//g, "'/api/proxy/agents/");
}

// CSS 注入：优化远程平台在 iframe 中的展示
function injectOptimizedCss(str) {
  return str
    .replace('<head>', '<head><base href="/api/proxy/">')
    .replace('</head>',
      '<style>' +
      'body{padding:6px 12px!important}' +
      '#list.grid{display:grid!important;grid-template-columns:repeat(3,1fr)!important;gap:10px!important;overflow-y:auto!important}' +
      '#list.grid .card{display:flex!important;flex-direction:column!important;padding:16px 14px 14px!important}' +
      '#list.grid .card>div:not([style*="margin-top"]){flex:1 1 auto!important}' +
      '#list.grid .card [style*="margin-top:16px"]{margin-top:auto!important}' +
      '.topbar{padding:5px 10px!important;margin-bottom:6px!important}' +
      '.kv{font-size:13px!important;padding:3px 0!important}' +
      '.btn{font-size:12px!important;padding:5px 12px!important;min-height:28px}' +
      '.pill{font-size:12px!important}' +
      '</style></head>');
}

// 统一入口：根据 content-type 选择重写策略
function rewriteResponseBody(body, contentType) {
  if (!contentType.includes('text/html') && !contentType.includes('javascript')) {
    return body; // 非 HTML/JS 不处理
  }

  var str = body.toString('utf8');

  // JS 重写（对所有 script 生效）
  str = rewriteJsPaths(str);
  // HTML 属性重写（对所有标签属性生效）
  str = rewriteHtmlAttrs(str);
  // CSS 注入（仅 HTML 页面）
  if (contentType.includes('text/html')) {
    str = injectOptimizedCss(str);
  }

  return Buffer.from(str, 'utf8');
}

module.exports = { rewriteResponseBody };

