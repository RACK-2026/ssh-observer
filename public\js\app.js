// ===================== SSH Monitor - 前端入口 =====================
// 职责：Socket.IO 事件分发 + 导航切换 + 全局状态管理

var currentData = null;
var socket = io();

// ---- Socket.IO 事件处理 ----
socket.on('connect', function() {
  updateConnectionBadge(true);
});

socket.on('disconnect', function() {
  updateConnectionBadge(false);
});

socket.on('init', function(data) {
  currentData = data;
  renderAll(data);
});

socket.on('update', function(data) {
  currentData = data;
  renderAll(data);
});

socket.on('connection-added', function(connections) {
  connections.forEach(function(conn) {
    showNotification('新连接: ' + (conn.foreignAddr || conn.remote) + ' -> ' + (conn.username || 'Unknown'), 'success');
    playConnectSound();
  });
});

socket.on('connection-removed', function(connections) {
  connections.forEach(function(conn) {
    showNotification('断开: ' + (conn.foreignAddr || conn.remote) + ' (' + (conn.username || 'Unknown') + ')', 'error');
    playDisconnectSound();
  });
});

socket.on('remote-update', function(remoteStatus) {
  if (currentData) {
    currentData.remoteStatus = remoteStatus;
    renderRemoteStatus(remoteStatus);
  }
});

// ---- 导航切换 ----
$$('.nav-item[data-view]').forEach(function(item) {
  item.addEventListener('click', function(e) {
    e.preventDefault();
    var view = item.dataset.view;
    $$('.nav-item[data-view]').forEach(function(n) { n.classList.remove('active'); });
    item.classList.add('active');
    $$('.view').forEach(function(v) { v.classList.remove('active'); });
    var target = document.getElementById('view-' + view);
    if (target) target.classList.add('active');
    var titles = { dashboard: '总览面板', connections: '连接列表', agent: '本地 Agent 状态', alerts: '告警日志', remote: '远程服务器', embed: 'Agent 列表', settings: '系统设置' };
    $('#pageTitle').textContent = titles[view] || '总览面板';
    $('#pageSubtitle').textContent = view === 'dashboard' ? 'SSH 连接实时监控' : '';
  });
});

// ---- 连接过滤 ----
$$('.filter-btn').forEach(function(btn) {
  btn.addEventListener('click', function() {
    $$('.filter-btn').forEach(function(b) { b.classList.remove('active'); });
    btn.classList.add('active');
    if (currentData) renderConnectionTable(currentData.connections);
  });
});

// ---- 渲染入口 ----
function renderAll(data) {
  if (!data) return;
  renderStats(data);
  renderTrendChart(data.metrics ? data.metrics.history : null);
  renderSystemInfo(data.systemInfo);
  renderAgentStatus(data.agentStatus);
  renderSSHDStatus(data.sshdStatus);
  renderConnectionTable(data.connections);
  renderAgentDetail(data.agentStatus, data.sshdStatus);
  renderAlertFeed(data.alerts);
  renderRemoteStatus(data.remoteStatus);
  renderAgentList(data.remoteStatus ? data.remoteStatus.agents : null);
  $('#headerConnCount').textContent = data.connections ? data.connections.length : 0;
}

// ---- 连接状态标识 ----
function updateConnectionBadge(connected) {
  var badge = $('#headerConnectionBadge');
  if (connected) { badge.style.background = '#D1FAE5'; badge.style.color = '#065F46'; }
  else { badge.style.background = '#FEE2E2'; badge.style.color = '#991B1B'; }
}

// ---- 手动刷新 ----
function refreshNow() {
  var btn = document.querySelector('.btn-primary');
  btn.disabled = true;
  btn.textContent = '刷新中...';
  setTimeout(function() {
    btn.disabled = false;
    btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg> 刷新';
  }, 1000);
}

// ---- 清空告警 ----
function clearAlerts() {
  if (currentData) { currentData.alerts = []; renderAlertFeed([]); showNotification('告警日志已清空', 'success'); }
}

// ---- 窗口自适应 ----
var resizeTimer;
window.addEventListener('resize', function() {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(function() {
    if (currentData) renderTrendChart(currentData.metrics ? currentData.metrics.history : null);
  }, 200);
});

console.log('[App] SSH Monitor 前端已加载');

