const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const QUEUE_ROOT = path.join(__dirname, '..', 'queue');
const STATES = ['pending', 'approved', 'rejected'];

function dirFor(state) {
  if (!STATES.includes(state)) throw new Error(`unknown queue state: ${state}`);
  const dir = path.join(QUEUE_ROOT, state);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function newId() {
  return Date.now().toString(36) + '-' + crypto.randomBytes(3).toString('hex');
}

function fileFor(state, id) {
  return path.join(dirFor(state), `${id}.json`);
}

function enqueue(item) {
  const id = item.id || newId();
  const record = {
    id,
    createdAt: new Date().toISOString(),
    state: 'pending',
    ...item,
  };
  fs.writeFileSync(fileFor('pending', id), JSON.stringify(record, null, 2));
  return record;
}

function list(state = 'pending') {
  const dir = dirFor(state);
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')));
}

function get(id, state = 'pending') {
  const file = fileFor(state, id);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function move(id, toState, meta = {}) {
  const item = get(id, 'pending');
  if (!item) throw new Error(`item not found in pending: ${id}`);
  if (!['approved', 'rejected'].includes(toState)) {
    throw new Error(`cannot move to ${toState}`);
  }
  const updated = {
    ...item,
    state: toState,
    decidedAt: new Date().toISOString(),
    ...meta,
  };
  fs.writeFileSync(fileFor(toState, id), JSON.stringify(updated, null, 2));
  fs.unlinkSync(fileFor('pending', id));
  return updated;
}

function approve(id, reviewer) {
  return move(id, 'approved', { reviewer });
}

function reject(id, reviewer, reason) {
  return move(id, 'rejected', { reviewer, reason });
}

function stats() {
  return STATES.reduce((acc, state) => {
    acc[state] = list(state).length;
    return acc;
  }, {});
}

module.exports = { enqueue, list, get, approve, reject, stats, STATES };
