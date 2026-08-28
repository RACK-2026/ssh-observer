// ===================== 全局状态管理 =====================

const { MAX_HISTORY } = require('./config');

// 状态对象
let state = {
  connections: [],
  agentStatus: { running: false, keys: [], socket: '' },
  systemInfo: {},
  sshdStatus: { running: false, processes: [], count: 0 },
  remoteStatus: {
    connected: false, hostname: '-',
    sshd: { running: false, processes: [], count: 0 },
    agent: { running: false, keys: [], socket: '' },
    connections: [], users: [], load: [], agents: [],
    lastCheck: null, error: null
  },
  metrics: { total: 0, users: 0, peak: 0, history: [] },
  alerts: []
};

let history = [];
let agentCookie = '';

// 获取/设置状态
function getState() { return state; }
function setState(updates) { Object.assign(state, updates); }

function getHistory() { return history; }
function pushHistory(point) {
  history.push(point);
  if (history.length > MAX_HISTORY) history.shift();
}

function getAgentCookie() { return agentCookie; }
function setAgentCookie(c) { agentCookie = c; }

// 重置状态到初始（仅用于热启动）
function resetState() {
  state.alerts = [];
  state.metrics = { total: 0, users: 0, peak: 0, history: [] };
  state.connections = [];
}

module.exports = {
  getState, setState, getHistory, pushHistory,
  getAgentCookie, setAgentCookie, resetState
};

