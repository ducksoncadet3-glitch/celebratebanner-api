#!/usr/bin/env node
const queue = require('../lib/queue');

function printItemSummary(item) {
  const preview = (item.content?.en || '').slice(0, 200).replace(/\s+/g, ' ');
  console.log(`- ${item.id}  [${item.type}]  runId=${item.runId}`);
  console.log(`    en: ${preview}${preview.length === 200 ? '…' : ''}`);
}

function cmdList(state = 'pending') {
  const items = queue.list(state);
  if (!items.length) {
    console.log(`(no items in ${state})`);
    return;
  }
  console.log(`${state}: ${items.length} item(s)`);
  items.forEach(printItemSummary);
}

function cmdShow(id) {
  for (const state of queue.STATES) {
    const item = queue.get(id, state);
    if (item) {
      console.log(JSON.stringify(item, null, 2));
      return;
    }
  }
  console.error(`not found: ${id}`);
  process.exit(1);
}

function cmdApprove(id, reviewer) {
  const item = queue.approve(id, reviewer || process.env.USER || 'cli');
  console.log(`approved: ${item.id}`);
}

function cmdReject(id, reviewer, reason) {
  const item = queue.reject(id, reviewer || process.env.USER || 'cli', reason || '');
  console.log(`rejected: ${item.id}`);
}

function cmdStats() {
  console.log(JSON.stringify(queue.stats(), null, 2));
}

function usage() {
  console.log(`worldcup-ai review CLI

usage:
  node cli/review.js list [pending|approved|rejected]
  node cli/review.js show <id>
  node cli/review.js approve <id> [reviewer]
  node cli/review.js reject <id> [reviewer] [reason]
  node cli/review.js stats
`);
}

function main() {
  const [, , cmd, ...args] = process.argv;
  switch (cmd) {
    case 'list': return cmdList(args[0]);
    case 'show': return cmdShow(args[0]);
    case 'approve': return cmdApprove(args[0], args[1]);
    case 'reject': return cmdReject(args[0], args[1], args.slice(2).join(' '));
    case 'stats': return cmdStats();
    default: return usage();
  }
}

main();
