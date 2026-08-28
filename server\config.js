// ===================== 全局常量配置 =====================

const PORT = 4521;
const SSH_PORT = 22;
const POLL_INTERVAL = 3000;
const REMOTE_HOST = process.env.SSH_HOST || '127.0.0.1';
const REMOTE_USER = process.env.SSH_USER || 'user';
const AGENT_PORT = Number(process.env.AGENT_PORT || 9100);
const MAX_HISTORY = 120;
const SSH_CMD = `ssh -o BatchMode=yes -o ConnectTimeout=5 ${REMOTE_USER}@${REMOTE_HOST}`;

module.exports = {
  PORT, SSH_PORT, POLL_INTERVAL,
  REMOTE_HOST, REMOTE_USER, AGENT_PORT, MAX_HISTORY, SSH_CMD
};

