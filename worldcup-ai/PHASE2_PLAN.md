# worldcup-ai — Phase 1 Completion Report & Phase 2 Implementation Plan

> Documentation only. No code is changed by this document, and Phase 2 work has
> not started. This is a planning artifact for review.

---

## Phase 1 — Completion Report

**Status: ✅ Complete & verified** (2026-05-30)

| Capability | Evidence |
|---|---|
| Agents run end-to-end | `runOnce()` exit 0; trend-hunter → ad-generator → video-factory chained via `workflows/content-loop.js`, ~440s, all on `claude-sonnet-4-6` |
| Multilingual output | 9 files written to `outputs/{en,fr,es}/`; genuine localized fr/es (not copies), ~15–20% length expansion confirmed |
| Human approval queue | File-backed `pending → approved \| rejected` via `lib/queue.js`; CLI + HTTP both functional |
| State transitions | Live demo: 1 approved, 1 rejected (w/ reason), 1 left pending → `{pending:1, approved:1, rejected:1}`; reviewer + `decidedAt` stamped on disk |
| No auto-publishing | Confirmed — approval only relocates JSON; no posting path wired |

### Known gaps carried into Phase 2 (discovered during verification)

- `run:once` path does **not** load `dotenv` (only `server.js` / `orchestrator/master.js` do) — inconsistent config loading.
- HTTP endpoints in `server.js` are **unauthenticated** — `/run`, approve, reject are all open.
- No key-shape validation; the live key was exposed in plaintext during verification (**rotation pending**).
- "Trend score" is freeform LLM text, not a deterministic / inspectable value.
- Trend input is a hardcoded `DEFAULT_SIGNAL` constant — no real ingestion.
- Queue decisions are one-way via CLI (no un-approve).

---

## Phase 2 — Implementation Plan

**Cross-cutting seam:** `lib/queue.js` is already a single interface with
`REDIS_URL` / `DATABASE_URL` placeholders reserved — so a file → Postgres/Redis
migration is a drop-in later and is **not** a prerequisite for any item below.

### Recommended sequencing

```
2a  Foundation (do first)   → #5 key/config + auth,  #2 scoring engine
2b  Core features           → #1 ingestion,  #3 dashboard,  #4 export
2c  Optional (later)        → #6 image/video
```

Rationale: #3 dashboard depends on #5 auth (don't expose an open admin surface).
#4 export is richer once #2 produces structured scores. #1 is independent.
#6 is explicitly deferred.

---

### #5 — Safer key/config handling — *do first · effort: S*

- Centralize env loading in one `lib/env.js` bootstrap, required by **every**
  entrypoint including the `run:once` script — fixes the dotenv inconsistency.
- Fail-fast validation at startup: required keys present + shape check
  (`sk-ant-` prefix, length) **without ever printing the value**; clear error if
  missing.
- Add auth middleware (bearer token from `ADMIN_SECRET`, reusing the main
  backend's pattern) on all mutating + listing endpoints; lock down CORS.
- Secrets live only in Railway / host secret store; `.env` stays gitignored
  (already is). **Rotate the exposed key.**
- *Acceptance:* server refuses to boot with a bad/missing key; unauthenticated
  requests get 401.

### #2 — Stronger scoring engine — *effort: M*

- Switch trend-hunter to **structured output** (Anthropic tool / JSON schema) so
  it emits per-trend *features* (emotion, recency, volume/velocity, product-fit,
  competition) instead of markdown blocks.
- New `lib/scoring.js`: deterministic weighted formula over those features →
  reproducible, tunable score persisted as a queue-item field (enables
  sort/filter in the dashboard).
- *Acceptance:* same input → same score; weights live in `config/`; scores
  queryable.

### #1 — Real Trend Hunter data ingestion — *effort: M–L*

- Introduce `lib/sources/` adapter layer; each adapter normalizes to a
  `SignalBatch` schema `{source, items[], fetchedAt}`. Replace `DEFAULT_SIGNAL`
  with the aggregated batch.
- Start with 2 low-friction sources (e.g. news/RSS + Google Trends); add social
  trend APIs later. Persist raw signals + dedup. Orchestrator cron already drives
  cadence.
- *Risks:* per-source API keys, rate limits, ToS, cost.
- *Acceptance:* a scheduled run consumes live signals, no code edit to swap
  sources.

### #3 — Content review dashboard / admin endpoint — *effort: M · needs #5*

- Extend `server.js` (endpoints already exist: list/show/approve/reject) with a
  minimal secured static SPA, **or** wire `admin.celebratebanner.com` to call the
  HTTP API.
- Features: pending list w/ previews, 3-language side-by-side view, approve/reject
  w/ reviewer identity, filter by state/score/country, audit log.
- *Acceptance:* a reviewer can clear the queue from a browser, authenticated.

### #4 — Approved-content export system — *effort: M*

- New `lib/export.js` + CLI / `/export` endpoint: pull **only from `approved/`**,
  emit a consumable bundle (JSON/CSV/per-language markdown) and/or push to a
  destination (S3, Google Sheet, scheduler).
- Idempotency: flag items as `exported` (new field or sub-state) to prevent
  double-export.
- *Acceptance:* approved items export once, in a downstream-ready format; re-runs
  are no-ops.

### #6 — Optional image/video generation — *deferred · effort: L*

- `lib/openai.js` `generateImage` (gpt-image-1) already scaffolded but unused. Add
  an `image-factory` agent: approved ad/video specs → image prompts → assets
  stored in S3/Cloudinary. Video stays as specs until a video API is chosen.
- Gate behind a feature flag + budget cap; **keep human approval before any asset
  is used**; the no-logos / no-player-likenesses rule still applies.
- *Risks:* cost, generation latency, licensing. Explicitly last.

---

**Net:** Phase 2a hardens the foundation (security + reproducible scoring), 2b
delivers the operational engine (live data, review UI, export), 2c is optional
media generation. Nothing here requires the persistence migration, which can
happen independently when volume warrants.
