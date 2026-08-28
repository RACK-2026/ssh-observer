// ===================== 渲染函数（每个函数只负责一个视图区域的渲染） =====================

var $ = function(sel) { return document.querySelector(sel); };

// ---- 统计卡片 ----
function renderStats(data) {
  var m = data.metrics || {};
  $('#statActiveConns').textContent = data.connections ? data.connections.length : 0;
  $('#statUniqueUsers').textContent = m.users || 0;
  $('#statPeakToday').textContent = m.peak || 0;
  $('#statUptime').textContent = formatUptime(data.systemInfo ? data.systemInfo.uptime : 0);
}

// ---- 趋势图（Canvas） ----
function renderTrendChart(history) {
  var canvas = $('#trendChart');
  var empty = $('#trendEmpty');
  if (!history || history.length < 2) {
    canvas.style.display = 'none';
    if (empty) empty.style.display = 'block';
    return;
  }
  canvas.style.display = 'block';
  if (empty) empty.style.display = 'none';

  var ctx = canvas.getContext('2d');
  var rect = canvas.parentElement.getBoundingClientRect();
  canvas.width = rect.width * 2;
  canvas.height = 200 * 2;
  canvas.style.width = rect.width + 'px';
  canvas.style.height = '200px';
  ctx.scale(2, 2);

  var w = rect.width, h = 200;
  var pad = { top: 20, bottom: 25, left: 40, right: 20 };
  var cw = w - pad.left - pad.right, ch = h - pad.top - pad.bottom;
  var values = history.map(function(p) { return p.count; });
  var maxVal = Math.max.apply(null, values) || 1;

  ctx.clearRect(0, 0, w, h);
  ctx.strokeStyle = '#F3F4F6';
  ctx.lineWidth = 1;
  for (var i = 0; i <= 4; i++) {
    var y = pad.top + (ch / 4) * i;
    ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(w - pad.right, y); ctx.stroke();
  }

  var gradient = ctx.createLinearGradient(0, pad.top, 0, h - pad.bottom);
  gradient.addColorStop(0, 'rgba(59,130,246,0.12)');
  gradient.addColorStop(1, 'rgba(59,130,246,0.01)');
  ctx.beginPath();
  values.forEach(function(v, i) {
    var x = pad.left + (cw / (values.length - 1)) * i;
    var y = pad.top + ch - (v / maxVal) * ch;
    if (i === 0) ctx.moveTo(x, h - pad.bottom);
    else ctx.lineTo(x, y);
  });
  ctx.lineTo(pad.left + cw, h - pad.bottom);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();

  ctx.beginPath();
  values.forEach(function(v, i) {
    var x = pad.left + (cw / (values.length - 1)) * i;
    var y = pad.top + ch - (v / maxVal) * ch;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = '#3B82F6';
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  ctx.stroke();

  ctx.fillStyle = '#9CA3AF';
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'right';
  for (var i = 0; i <= 4; i++) {
    var val = Math.round((maxVal / 4) * (4 - i));
    var y = pad.top + (ch / 4) * i;
    ctx.fillText(val, pad.left - 8, y + 4);
  }
  ctx.textAlign = 'center';
  var step = Math.max(1, Math.floor(values.length / 5));
  for (var i = 0; i < values.length; i += step) {
    var x = pad.left + (cw / (values.length - 1)) * i;
    var time = new Date(history[i].time);
    ctx.fillText(
      time.getHours().toString().padStart(2, '0') + ':' + time.getMinutes().toString().padStart(2, '0'),
      x, h - 5
    );
  }
}

// ---- 系统信息 ----
function renderSystemInfo(info) {
  if (!info) return;
  $('#sysHostname').textContent = info.hostname || '-';
  $('#sysPlatform').textContent = info.platform || '-';
  $('#sysMemory').textContent = info.memory ? formatBytes(info.memory.used) + ' / ' + formatBytes(info.memory.total) : '-';
  $('#sysCpus').textContent = info.cpus ? info.cpus + ' 核' : '-';
  $('#sysLoad').textContent = info.loadAvg ? info.loadAvg.join(', ') : '-';
  $('#sysUptime').textContent = formatUptime(info.uptime);
}

// ---- 本机 Agent 状态 ----
function renderAgentStatus(agent) {
  if (!agent) return;
  var el = $('#agentRunningStatus');
  if (agent.running) { el.textContent = '● 运行中'; el.className = 'pill-status running'; }
  else { el.textContent = '● 已停止'; el.className = 'pill-status stopped'; }
  $('#agentPid').textContent = agent.pid || '-';
  $('#agentSocket').textContent = agent.socket || '-';
  $('#agentKeyCount').textContent = agent.keys ? agent.keys.length : 0;
  var keyListEl = $('#agentKeyList');
  if (agent.keys && agent.keys.length > 0) {
    keyListEl.innerHTML = agent.keys.map(function(k) {
      return '<div class="key-item"><div class="key-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg></div><div class="key-info"><div class="key-fingerprint">' + escapeHtml(k.fingerprint) + '</div><div class="key-path">' + escapeHtml(k.path) + '</div></div><span class="key-type">' + k.bits + ' bit</span></div>';
    }).join('');
  } else { keyListEl.innerHTML = ''; }
}

// ---- SSHD 状态 ----
function renderSSHDStatus(sshd) {
  if (!sshd) return;
  var badge = $('#sshdBadge');
  if (sshd.running) { badge.textContent = '● 运行中'; badge.style.background = '#D1FAE5'; badge.style.color = '#065F46'; }
  else { badge.textContent = '● 已停止'; badge.style.background = '#FEE2E2'; badge.style.color = '#991B1B'; }
  $('#sshdCount').textContent = sshd.count || 0;
  $('#sshdPids').textContent = sshd.processes ? sshd.processes.map(function(p) { return p.pid; }).join(', ') : '-';
}

// ---- 连接表格 ----
function renderConnectionTable(connections) {
  var activeFilter = $('.filter-btn.active') ? $('.filter-btn.active').dataset.filter : 'all';
  var tbody = $('#connTableBody');
  if (!connections || connections.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="table-empty">暂无活跃连接</td></tr>';
    $('#connListCount').textContent = '0 条记录';
    return;
  }
  var filtered = activeFilter === 'all' ? connections : connections.filter(function(c) { return c.state === activeFilter; });
  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="table-empty">没有 ' + activeFilter + ' 状态的连接</td></tr>';
    $('#connListCount').textContent = connections.length + ' 条记录 (已筛选)';
    return;
  }
  tbody.innerHTML = filtered.map(function(c) {
    return '<tr><td><span class="mono">' + escapeHtml(c.foreignAddr || c.remote || '-') + '</span></td><td>' + (c.foreignPort || c.rport || '-') + '</td><td><span class="mono">' + escapeHtml(c.localAddr || c.local || '-') + ':' + (c.localPort || c.lport || '-') + '</span></td><td><span class="state-pill ' + (c.state || 'default-state') + '">' + (c.state || 'Unknown') + '</span></td><td>' + escapeHtml(c.username || c.user || '-') + '</td><td class="mono">' + (c.pid || '-') + '</td><td class="time-cell">' + formatTime(c.detectedAt || c.at) + '</td></tr>';
  }).join('');
  $('#connListCount').textContent = filtered.length + ' / ' + connections.length + ' 条记录';
}

// ---- Agent 详情页 ----
function renderAgentDetail(agent, sshd) {
  if (!agent) return;
  var el = $('#agentDetailStatus');
  if (agent.running) { el.textContent = '● 运行中'; el.className = 'pill-status running'; }
  else { el.textContent = '● 已停止'; el.className = 'pill-status stopped'; }
  $('#agentDetailPid').textContent = agent.pid || '-';
  $('#agentDetailSocket').textContent = agent.socket || '-';

  if (sshd) {
    var sEl = $('#sshdDetailStatus');
    if (sshd.running) { sEl.textContent = '● 运行中'; sEl.className = 'pill-status running'; }
    else { sEl.textContent = '● 已停止'; sEl.className = 'pill-status stopped'; }
    $('#sshdDetailPids').textContent = sshd.processes ? sshd.processes.map(function(p) { return p.pid; }).join(', ') : '-';
  }
  $('#agentDetailKeyCount').textContent = (agent.keys ? agent.keys.length : 0) + ' 个密钥';
  var keyListEl = $('#agentFullKeyList');
  if (agent.keys && agent.keys.length > 0) {
    keyListEl.innerHTML = agent.keys.map(function(k) {
      return '<div class="key-item"><div class="key-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg></div><div class="key-info"><div class="key-fingerprint">' + escapeHtml(k.fingerprint) + '</div><div class="key-path">' + escapeHtml(k.path) + '</div><div class="key-path">' + escapeHtml(k.fullLine || '') + '</div></div><span class="key-type">' + k.bits + ' bit</span></div>';
    }).join('');
  } else {
    keyListEl.innerHTML = '<div class="empty-state"><div class="empty-icon"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" stroke-width="1.5"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg></div><h4>无已加载密钥</h4><p>SSH Agent 运行中但没有加载密钥</p></div>';
  }
}

// ---- 告警日志 ----
function renderAlertFeed(alerts) {
  var feed = $('#alertFeed');
  if (!alerts || alerts.length === 0) {
    feed.innerHTML = '<div class="empty-state"><div class="empty-icon"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" stroke-width="1.5"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg></div><h4>暂无告警</h4><p>新的 SSH 连接或断开事件将在此显示</p></div>';
    $('#alertCount').textContent = '0 条';
    return;
  }
  feed.innerHTML = alerts.slice(0, 50).map(function(a) {
    var svg = a.type === 'connected'
      ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="#10B981" stroke="white" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>'
      : '<svg width="16" height="16" viewBox="0 0 24 24" fill="#EF4444" stroke="white" stroke-width="2"><path d="M5 12h14"/></svg>';
    return '<div class="alert-item ' + a.type + '"><div class="alert-icon">' + svg + '</div><div class="alert-content"><div class="alert-message">' + escapeHtml(a.message) + '</div><div class="alert-time">' + formatTime(a.time) + '</div></div></div>';
  }).join('');
  $('#alertCount').textContent = alerts.length + ' 条';
}

// ---- 远程服务器 ----
function renderRemoteStatus(remote) {
  if (!remote) return;
  var connEl = $('#remoteConnected');
  var connBadge = $('#remoteConnBadge');
  if (remote.connected) { connEl.innerHTML = '<span class="pill-status running">● 已连接</span>'; connBadge.textContent = '● 已连接'; connBadge.style.background = '#D1FAE5'; connBadge.style.color = '#065F46'; }
  else if (!remote.lastCheck && !remote.error) { connEl.innerHTML = '<span class="pill-status checking">● 采集中</span>'; connBadge.textContent = '● 采集中'; connBadge.style.background = '#F3F4F6'; connBadge.style.color = '#5F6368'; }
  else { connEl.innerHTML = '<span class="pill-status stopped">● 已断开</span>'; connBadge.textContent = '● 已断开'; connBadge.style.background = '#FEE2E2'; connBadge.style.color = '#991B1B'; }
  $('#remoteHostname').textContent = remote.hostname || '-';
  var lc = $('#remoteLastCheck');
  if (!remote.lastCheck && !remote.error) { lc.textContent = '⏳ 首次采集进行中...'; lc.style.color = '#F59E0B'; }
  else if (remote.error) { lc.textContent = '❌ ' + remote.error; lc.style.color = '#EF4444'; }
  else { lc.textContent = formatTime(remote.lastCheck); lc.style.color = ''; }
  if (remote.load && remote.load.length >= 3) $('#remoteLoad1').textContent = remote.load.join(' / ');
  else $('#remoteLoad1').textContent = '-';
  if (remote.users && remote.users.length > 0) {
    $('#remoteUsers').textContent = remote.users.length + ' 人在线';
    $('#remoteUserList').innerHTML = remote.users.map(function(u) { return '<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #F3F4F6;font-size:13px"><span style="font-weight:500;color:#1A1A2E">' + escapeHtml(u.user) + '</span><span style="color:#5F6368;font-family:monospace;font-size:11px">' + escapeHtml(u.from) + '</span></div>'; }).join('');
  } else { $('#remoteUsers').textContent = '-'; $('#remoteUserList').innerHTML = '<div class="empty-state" style="padding:12px"><h4 style="font-size:13px">无在线用户</h4></div>'; }
  if (remote.sshd) { var se = $('#remoteSSHDRunning'); if (remote.sshd.running) se.innerHTML = '<span class="pill-status running">● 运行中</span>'; else se.innerHTML = '<span class="pill-status stopped">● 已停止</span>'; $('#remoteSSHDCount').textContent = remote.sshd.count || 0; $('#remoteSSHDDetail').textContent = remote.sshd.processes && remote.sshd.processes.length > 0 ? remote.sshd.processes.map(function(p) { return 'PID:' + p.pid + '(' + p.user + ')'; }).join(' | ') : '-'; }
  if (remote.agent) { var ae = $('#remoteAgentRunning'); if (remote.agent.running) ae.innerHTML = '<span class="pill-status running">● 运行中</span>'; else ae.innerHTML = '<span class="pill-status stopped">● 已停止</span>'; $('#remoteAgentPid').textContent = remote.agent.pid || '-'; $('#remoteAgentKeys').textContent = (remote.agent.keys ? remote.agent.keys.length : 0) + ' 个'; }
  if (remote.connections && remote.connections.length > 0) { $('#remoteConnCount').textContent = remote.connections.length; $('#remoteConnTableBody').innerHTML = remote.connections.map(function(c, i) { return '<tr><td>' + (i + 1) + '</td><td class="mono">' + escapeHtml(c.localAddr) + '</td><td class="mono">' + escapeHtml(c.foreignAddr) + '</td><td><span class="state-pill ESTABLISHED">' + c.state + '</span></td></tr>'; }).join(''); }
  else { $('#remoteConnCount').textContent = '0'; $('#remoteConnTableBody').innerHTML = '<tr><td colspan="4" class="table-empty">暂无远程连接数据</td></tr>'; }
}

// ---- Agent 列表（嵌入式平台侧边 Agent 数据） ----
function renderAgentList(agents) {
  var body = $('#agentListBody');
  if (!agents || agents.length === 0) {
    body.innerHTML = '<div class="empty-state"><div class="empty-icon"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" stroke-width="1.5"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg></div><h4>暂无 Agent 数据</h4><p>等待远程服务器采集</p></div>';
    return;
  }
  body.innerHTML = '<div class="agent-grid">' + agents.map(function(a) {
    var isOnline = a.status === 'online';
    var sc = isOnline ? '#10B981' : '#EF4444', sb = isOnline ? '#D1FAE5' : '#FEE2E2', st = isOnline ? '#065F46' : '#991B1B';
    var card = '<div class="agent-card" style="background:#FFFFFF;border-radius:8px;padding:12px 16px;box-shadow:0 1px 3px rgba(0,0,0,.06);border-left:4px solid ' + sc + ';margin-bottom:8px">';
    card += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><div style="display:flex;align-items:center;gap:8px"><span style="font-size:13px;font-weight:600;color:#1A1A2E">' + escapeHtml(a.name || a.id) + '</span><span style="font-size:11px;color:#9CA3AF">' + escapeHtml(a.id) + '</span></div><span style="padding:1px 8px;border-radius:20px;font-size:11px;font-weight:500;background:' + sb + ';color:' + st + '">● ' + a.status + '</span></div>';
    card += '<div style="font-size:12px;color:#5F6368">' + escapeHtml(a.host) + ':' + a.port + ' · ' + escapeHtml(a.role || '-') + ' · PID:' + (a.pid || '-') + '</div>';
    card += '</div>';
    return card;
  }).join('') + '</div>';
}

