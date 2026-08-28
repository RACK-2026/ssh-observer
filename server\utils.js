// ===================== 工具函数（执行命令、HTTP 请求） =====================

const { exec } = require('child_process');
const http = require('http');
const { REMOTE_HOST, AGENT_PORT } = require('./config');
const { getAgentCookie, setAgentCookie } = require('./state');

// 异步执行 PowerShell 命令
function execPS(cmd) {
  return new Promise(function(resolve) {
    exec(cmd, { encoding: 'utf-8', timeout: 5000, shell: 'powershell.exe' },
      function(err, stdout) { resolve(err ? '' : stdout.trim()); });
  });
}

// 异步执行 SSH 命令
function execSSH(cmd) {
  return new Promise(function(resolve) {
    exec(cmd, { encoding: 'utf-8', timeout: 5000, maxBuffer: 16384 },
      function(err, stdout) { resolve(err ? '' : stdout.trim()); });
  });
}

// HTTP POST JSON（用于 Agent 管理平台登录）
function httpPostJson(pathname, data) {
  return new Promise(function(resolve) {
    var body = JSON.stringify(data);
    var opts = {
      hostname: REMOTE_HOST, port: AGENT_PORT, path: pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'Cookie': getAgentCookie()
      },
      timeout: 5000
    };
    var req = http.request(opts, function(res) {
      var sc = res.headers['set-cookie'];
      if (sc) {
        setAgentCookie(Array.isArray(sc) ? sc[0].split(';')[0] : sc.split(';')[0]);
      }
      var data = '';
      res.on('data', function(c) { data += c; });
      res.on('end', function() { resolve(data); });
    });
    req.on('error', function() { resolve(''); });
    req.write(body);
    req.end();
  });
}

// HTTP GET（用于 Agent 管理平台 API）
function httpGet(pathname) {
  return new Promise(function(resolve) {
    var opts = {
      hostname: REMOTE_HOST, port: AGENT_PORT, path: pathname,
      method: 'GET',
      headers: { 'Cookie': getAgentCookie() },
      timeout: 5000
    };
    var req = http.request(opts, function(res) {
      var data = '';
      res.on('data', function(c) { data += c; });
      res.on('end', function() { resolve(data); });
    });
    req.on('error', function() { resolve(''); });
    req.end();
  });
}

// 获取 Agent 管理平台列表
async function fetchAgentList() {
  try {
    var loginRes = await httpPostJson('/login', {
      username: process.env.AGENT_USER || '',
      password: process.env.AGENT_PASSWORD || ''
    });
    if (!loginRes.includes('ok')) return [];
    var agentsData = await httpGet('/api/agents');
    if (agentsData && agentsData.startsWith('[')) return JSON.parse(agentsData);
  } catch(e) {}
  return [];
}

module.exports = { execPS, execSSH, httpPostJson, httpGet, fetchAgentList };

