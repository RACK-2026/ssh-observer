// ===================== 工具函数（纯函数，无副作用） =====================

// 格式化运行时间
function formatUptime(seconds) {
  if (!seconds && seconds !== 0) return '-';
  var d = Math.floor(seconds / 86400);
  var h = Math.floor((seconds % 86400) / 3600);
  var m = Math.floor((seconds % 3600) / 60);
  var s = seconds % 60;
  var parts = [];
  if (d > 0) parts.push(d + '天');
  if (h > 0) parts.push(h + '时');
  if (m > 0) parts.push(m + '分');
  parts.push(s + '秒');
  return parts.join('');
}

// 格式化字节数
function formatBytes(bytes) {
  if (!bytes) return '0 B';
  var sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  var i = Math.floor(Math.log(bytes) / Math.log(1024));
  return (bytes / Math.pow(1024, i)).toFixed(1) + ' ' + sizes[i];
}

// 格式化时间（仅 HH:MM:SS）
function formatTime(isoStr) {
  if (!isoStr) return '-';
  var d = new Date(isoStr);
  return d.getHours().toString().padStart(2, '0') + ':' +
         d.getMinutes().toString().padStart(2, '0') + ':' +
         d.getSeconds().toString().padStart(2, '0');
}

// 转义 HTML 特殊字符
function escapeHtml(str) {
  if (!str) return '-';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

