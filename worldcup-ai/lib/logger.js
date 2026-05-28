const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });

const LOG_FILE = path.join(LOG_DIR, 'worldcup-ai.log');

function fmt(level, msg, meta) {
  const stamp = new Date().toISOString();
  const metaStr = meta ? ' ' + JSON.stringify(meta) : '';
  return `[${stamp}] [${level}] ${msg}${metaStr}\n`;
}

function write(level, msg, meta) {
  const line = fmt(level, msg, meta);
  process.stdout.write(line);
  try {
    fs.appendFileSync(LOG_FILE, line);
  } catch (err) {
    process.stderr.write(`logger write failed: ${err.message}\n`);
  }
}

module.exports = {
  info: (msg, meta) => write('INFO', msg, meta),
  warn: (msg, meta) => write('WARN', msg, meta),
  error: (msg, meta) => write('ERROR', msg, meta),
};
