# worldcup-ai — Phase 1

Modular AI marketing engine for World Cup custom-product campaigns. Lives inside `celebratebanner-api` as a standalone subsystem with its own dependencies, server, and PM2 processes.

**Phase 1 scope:** scaffolding only. Three agents (Trend Hunter, Ad Generator, Video Factory), a master orchestrator, multilingual output (en/fr/es), and a file-backed human approval queue. No auto-posting to any social platform.

---

## Architecture

```
worldcup-ai/
├── server.js                  Express HTTP API (queue + manual trigger)
├── orchestrator/master.js     Cron-driven master loop (PM2 entry)
├── agents/
│   ├── trend-hunter/          raw signal → structured trend report
│   ├── ad-generator/          trend report → hooks/ads/scripts/CTAs
│   └── video-factory/         ad copy   → short-form video specs
├── workflows/
│   ├── content-loop.js        one full pipeline pass; enqueues results
│   └── multilingual-posts.js  writes en/fr/es text files per agent
├── lib/
│   ├── claude.js              Anthropic SDK wrapper
│   ├── openai.js              OpenAI SDK wrapper (image gen — Phase 2)
│   ├── translate.js           en → fr, en → es via Claude
│   ├── queue.js               pending → approved | rejected
│   ├── language-router.js     country → language code
│   └── logger.js              file + stdout
├── config/
│   ├── languages.js
│   ├── countries.js
│   └── models.js              centralized model IDs
├── cli/review.js              CLI to list/approve/reject queue items
├── queue/{pending,approved,rejected}/    review queue
├── outputs/{en,fr,es}/                   raw text dumps per language
└── logs/                                  worldcup-ai.log
```

### Agent contract

Each agent exports `run(input)` and returns:

```js
{
  agent: 'trend-hunter' | 'ad-generator' | 'video-factory',
  model: '<model id used>',
  usage: { input_tokens, output_tokens },
  content: { en: '...', fr: '...', es: '...' }
}
```

The orchestrator passes each agent's output to the next. Every item lands in `queue/pending/` as a JSON record — nothing is published until a human approves it.

---

## Quick start

```bash
cd worldcup-ai
npm install
cp .env.example .env
# fill in ANTHROPIC_API_KEY and OPENAI_API_KEY

# Run the pipeline once
npm run run:once

# Or start the HTTP API (port 3100 by default)
npm run start:server

# Or start the scheduled orchestrator
npm run start:orchestrator
```

### Approve / reject content

```bash
# list what's waiting
node cli/review.js list pending

# inspect one item
node cli/review.js show <id>

# decide
node cli/review.js approve <id>
node cli/review.js reject  <id> <reviewer> "reason"

# stats
node cli/review.js stats
```

### HTTP endpoints

| Method | Path                       | Purpose                              |
|--------|----------------------------|--------------------------------------|
| GET    | `/health`                  | Service status + queue counts        |
| GET    | `/queue/:state`            | List items (pending/approved/rejected) |
| GET    | `/queue/item/:id`          | Fetch one item across all states     |
| POST   | `/queue/:id/approve`       | Approve `{ reviewer }`               |
| POST   | `/queue/:id/reject`        | Reject `{ reviewer, reason }`        |
| POST   | `/run`                     | Trigger a pipeline run `{ signal? }` |

### PM2

```bash
npm run pm2:start
pm2 logs
npm run pm2:stop
```

Defined in `ecosystem.config.js`: one orchestrator process + one HTTP process.

---

## Environment variables

See `.env.example`. Required: `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`. Schedule, model IDs, and port are all overridable.

Phase 1 stores queue state on the local filesystem. `REDIS_URL` / `DATABASE_URL` are reserved placeholders — `lib/queue.js` is a single interface that can be swapped to Redis/Postgres without changes to agents or orchestrator.

---

## Phase 1 deliberately excludes

- Auto-posting to TikTok / Instagram / YouTube / Meta / X
- UGC outreach agent
- Conversion optimization agent
- SEO content engine
- Email / SMS automation
- Real image / video generation (only text specs + image *prompts* for now)

All of the above are Phase 2+. The folder layout and queue contract are designed so each becomes an additional `agents/<name>/` module that plugs into the same orchestrator and review queue.

---

## Safety rules baked into agent prompts

- No licensed logos, no player likenesses (Champion / team SKUs).
- No invented player quotes, scores, or match outcomes.
- All agent output is multilingual and queued for human approval before any publication path is wired.
