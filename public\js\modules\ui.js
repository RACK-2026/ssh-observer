// ===================== 通知 & 音效（纯 UI 副作用） =====================

// DOM 简写
var $ = function(sel) { return document.querySelector(sel); };
var $$ = function(sel) { return document.querySelectorAll(sel); };

// 通知容器（懒初始化）
var _notifContainer = null;
function _ensureContainer() {
  if (!_notifContainer) {
    _notifContainer = document.createElement('div');
    _notifContainer.id = 'notification-container';
    _notifContainer.style.cssText = 'position:fixed;top:16px;right:16px;z-index:9999;display:flex;flex-direction:column;gap:8px;';
    document.body.appendChild(_notifContainer);
  }
}

// 显示通知弹窗
function showNotification(msg, type) {
  _ensureContainer();
  var el = document.createElement('div');
  var bg = type === 'success' ? '#D1FAE5' : '#FEE2E2';
  var tc = type === 'success' ? '#065F46' : '#991B1B';
  var bc = type === 'success' ? '#10B981' : '#EF4444';
  el.style.cssText = 'padding:10px 16px;border-radius:8px;font-size:13px;font-weight:500;background:' + bg + ';color:' + tc + ';border-left:3px solid ' + bc + ';box-shadow:0 4px 12px rgba(0,0,0,.1);max-width:360px;transition:all 200ms;';
  el.textContent = msg;
  _notifContainer.appendChild(el);
  setTimeout(function() {
    el.style.opacity = '0';
    el.style.transform = 'translateX(20px)';
    setTimeout(function() { el.remove(); }, 200);
  }, 4000);
}

// 声音提示（纯 JS 生成，无需音频文件）
function playConnectSound() {
  try {
    var ctx = new (window.AudioContext || window.webkitAudioContext)();
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 800;
    gain.gain.value = 0.1;
    osc.start(ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    osc.stop(ctx.currentTime + 0.15);
  } catch(e) {}
}

function playDisconnectSound() {
  try {
    var ctx = new (window.AudioContext || window.webkitAudioContext)();
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 400;
    gain.gain.value = 0.1;
    osc.start(ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
    osc.stop(ctx.currentTime + 0.2);
  } catch(e) {}
}

