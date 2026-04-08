#!/usr/bin/env node

const API_BASE = (process.env.SEED_API_BASE_URL || "http://localhost:3000/api").replace(/\/+$/, "");
const SEED_EMAIL = process.env.SEED_EMAIL;
const SEED_PASSWORD = process.env.SEED_PASSWORD;
const SEED_START = process.env.SEED_START || "2025-12-01";
const SEED_END = process.env.SEED_END || "2026-03-31";
const SEED_TRADES = Number(process.env.SEED_TRADES || "200");
const SEED_MODE = (process.env.SEED_MODE || "append").toLowerCase();
const SEED_RNG = Number(process.env.SEED_RNG || "20260408");
const SEED_LABEL = process.env.SEED_LABEL || "seed-2026q1";

const sessions = ["asia", "london", "newyork", "newyork_pm"];
const confidenceLevels = ["good", "average", "bad"];

const strategyTemplates = [
  {
    name: "Momentum Continuation",
    description: "Follow break-and-retest continuation setups with strict invalidation.",
  },
  {
    name: "Range Mean Reversion",
    description: "Fade range extremes with tight risk and quick exits.",
  },
  {
    name: "Session Breakout",
    description: "Trade London/New York opens when volatility expands.",
  },
];

const tagTemplates = [
  { name: "A+ Setup", color: "#10b981" },
  { name: "FOMO", color: "#ef4444" },
  { name: "Rule Break", color: "#f59e0b" },
  { name: "Disciplined", color: "#3b82f6" },
  { name: "Review Needed", color: "#8b5cf6" },
];

const accountTemplates = [
  { name: "Primary Futures", initial_balance: 25000 },
  { name: "FX Swing", initial_balance: 10000 },
  { name: "Equities Tactical", initial_balance: 15000 },
];

const assetCatalog = {
  futures: [
    { symbol: "ES", point_value: 50 },
    { symbol: "NQ", point_value: 20 },
    { symbol: "YM", point_value: 5 },
    { symbol: "CL", point_value: 1000 },
  ],
  forex: [
    { symbol: "EURUSD", contract_size: 100000 },
    { symbol: "GBPUSD", contract_size: 100000 },
    { symbol: "USDJPY", contract_size: 100000 },
    { symbol: "AUDUSD", contract_size: 100000 },
  ],
  stocks: [
    { symbol: "AAPL" },
    { symbol: "NVDA" },
    { symbol: "MSFT" },
    { symbol: "TSLA" },
  ],
  crypto: [
    { symbol: "BTCUSD" },
    { symbol: "ETHUSD" },
    { symbol: "SOLUSD" },
    { symbol: "XRPUSD" },
  ],
  commodity: [
    { symbol: "XAUUSD", contract_size: 100 },
    { symbol: "XAGUSD", contract_size: 5000 },
  ],
};

function createRng(seed) {
  let state = seed % 2147483647;
  if (state <= 0) state += 2147483646;
  return () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
}

const rng = createRng(SEED_RNG);
const rand = (min, max) => min + (max - min) * rng();
const pick = (arr) => arr[Math.floor(rng() * arr.length)];
const maybe = (chance) => rng() < chance;
const round = (n, p = 2) => Number(n.toFixed(p));

function dateRangeWeekdays(startIso, endIso) {
  const out = [];
  const start = new Date(`${startIso}T00:00:00.000Z`);
  const end = new Date(`${endIso}T00:00:00.000Z`);
  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    const dow = d.getUTCDay();
    if (dow !== 0 && dow !== 6) out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

function requiredEnv() {
  const missing = [];
  if (!SEED_EMAIL) missing.push("SEED_EMAIL");
  if (!SEED_PASSWORD) missing.push("SEED_PASSWORD");
  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }
}

async function requestJson(path, { method = "GET", token, body } = {}) {
  const maxRetries = 5;
  let attempt = 0;
  while (true) {
    attempt += 1;
    const headers = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    let payload = null;
    try {
      payload = text ? JSON.parse(text) : {};
    } catch {
      payload = { raw: text };
    }
    if (!res.ok) {
      if (res.status === 429 && attempt < maxRetries) {
        const waitMs = attempt * 1500;
        await new Promise((resolve) => setTimeout(resolve, waitMs));
        continue;
      }
      throw new Error(`${method} ${path} failed (${res.status}): ${JSON.stringify(payload)}`);
    }
    return payload;
  }
}

async function login() {
  const payload = await requestJson("/auth/login", {
    method: "POST",
    body: { email: SEED_EMAIL, password: SEED_PASSWORD },
  });
  return payload?.data?.token;
}

async function listAllTradesInRange(token, dateFrom, dateTo) {
  let offset = 0;
  const limit = 1000;
  let total = 0;
  const all = [];
  do {
    const q = new URLSearchParams({
      date_from: dateFrom,
      date_to: dateTo,
      limit: String(limit),
      offset: String(offset),
    });
    const payload = await requestJson(`/trades?${q.toString()}`, { token });
    const rows = payload?.data || [];
    total = Number(payload?.total || 0);
    all.push(...rows);
    offset += limit;
  } while (offset < total);
  return all;
}

async function ensureNamedEntities(token, path, templates, createMapper) {
  const existing = await requestJson(path, { token });
  const current = existing?.data || [];
  const byName = new Map(current.map((item) => [item.name, item]));
  const created = [];
  const reused = [];

  for (const template of templates) {
    if (byName.has(template.name)) {
      reused.push(byName.get(template.name));
      continue;
    }
    const createdRes = await requestJson(path, {
      method: "POST",
      token,
      body: createMapper(template),
    });
    const entity = createdRes?.data;
    byName.set(entity.name, entity);
    created.push(entity);
    reused.push(entity);
  }

  return { all: Array.from(byName.values()), created, reused };
}

function buildTradePayload(date, accounts, strategies, tags) {
  const assetClass = pick(Object.keys(assetCatalog));
  const instrument = pick(assetCatalog[assetClass]);
  const strategy = pick(strategies);
  const status = rng() < 0.08 ? "open" : rng() < 0.58 ? "closed" : "reviewed";
  const tradeType = rng() < 0.5 ? "long" : "short";
  const session = pick(sessions);
  const confidenceLevel = pick(confidenceLevels);
  const positionSize = assetClass === "stocks" ? round(rand(10, 400), 0) : round(rand(0.2, 4.0), 2);

  const basePrice = (() => {
    if (assetClass === "futures") return rand(3000, 22000);
    if (assetClass === "forex") return rand(0.6, 1.6);
    if (assetClass === "stocks") return rand(50, 800);
    if (assetClass === "crypto") return rand(20, 70000);
    return rand(15, 2800);
  })();

  const movePct = rand(-0.018, 0.022);
  const entryPrice = round(basePrice, assetClass === "forex" ? 5 : 2);
  const derivedExit = round(
    basePrice * (tradeType === "long" ? 1 + movePct : 1 - movePct),
    assetClass === "forex" ? 5 : 2
  );
  const exitPrice = status === "open" ? null : derivedExit;

  const riskDelta = Math.abs(basePrice * rand(0.003, 0.01));
  const stopLoss = round(
    tradeType === "long" ? basePrice - riskDelta : basePrice + riskDelta,
    assetClass === "forex" ? 5 : 2
  );
  const takeProfit = round(
    tradeType === "long" ? basePrice + riskDelta * rand(1.2, 2.4) : basePrice - riskDelta * rand(1.2, 2.4),
    assetClass === "forex" ? 5 : 2
  );

  let pnl = 0;
  if (exitPrice != null) {
    const diff = tradeType === "long" ? exitPrice - entryPrice : entryPrice - exitPrice;
    if (assetClass === "futures") pnl = diff * (instrument.point_value || 20) * positionSize;
    else if (assetClass === "forex") pnl = diff * (instrument.contract_size || 100000) * positionSize;
    else if (assetClass === "commodity") pnl = diff * (instrument.contract_size || 100) * positionSize;
    else pnl = diff * positionSize;
  }
  pnl = round(pnl - rand(2, 18), 2);

  const accountPnls = {};
  if (status !== "open") {
    const accountCount = maybe(0.7) ? 1 : 2;
    const selected = [...accounts].sort(() => rng() - 0.5).slice(0, accountCount);
    let remaining = pnl;
    selected.forEach((account, idx) => {
      if (idx === selected.length - 1) {
        accountPnls[account.id] = round(remaining, 2);
      } else {
        const split = round(pnl * rand(0.35, 0.65), 2);
        accountPnls[account.id] = split;
        remaining -= split;
      }
    });
  }

  const tagIds = maybe(0.82)
    ? [...tags].sort(() => rng() - 0.5).slice(0, maybe(0.6) ? 1 : 2).map((t) => t.id)
    : [];

  const noteCore = [
    "Followed pre-session plan",
    "Waited for confirmation candle",
    "Entry aligned with higher timeframe bias",
    "Reduced size after prior drawdown",
    "Managed trade according to invalidation",
  ];
  const reflectionCore = [
    "Execution quality was acceptable; continue similar process.",
    "Need better patience before entry, but risk was controlled.",
    "Good discipline with stop placement and no revenge behavior.",
    "Could improve exits by scaling out at planned levels.",
    "Journaling this setup helps reinforce rule-based trading.",
  ];

  const payload = {
    symbol: instrument.symbol,
    asset_class: assetClass,
    trade_type: tradeType,
    position_size: positionSize,
    entry_price: entryPrice,
    exit_price: exitPrice,
    stop_loss: stopLoss,
    take_profit: takeProfit,
    date,
    strategy_id: strategy?.id || null,
    notes: `[${SEED_LABEL}] ${pick(noteCore)}.`,
    reflection: status === "open" ? "" : pick(reflectionCore),
    tag_ids: tagIds,
    account_pnls: accountPnls,
    session,
    confidence_level: confidenceLevel,
    status,
    fees: round(rand(0.5, 14), 2),
    contract_size:
      assetClass === "forex" || assetClass === "commodity"
        ? instrument.contract_size
        : undefined,
    point_value: assetClass === "futures" ? instrument.point_value || 20 : undefined,
    unit_size: assetClass === "crypto" ? round(rand(0.01, 0.5), 4) : undefined,
  };

  return Object.fromEntries(
    Object.entries(payload).filter(
      ([, value]) => value !== undefined && value !== null
    )
  );
}

async function main() {
  requiredEnv();
  if (SEED_MODE !== "append") {
    throw new Error(`Unsupported SEED_MODE="${SEED_MODE}". This script only supports append mode.`);
  }

  console.log(`Seed start: range ${SEED_START}..${SEED_END}, target ${SEED_TRADES}, label ${SEED_LABEL}`);
  const token = await login();
  if (!token) throw new Error("Login succeeded but no JWT token was returned.");

  const accountsResult = await ensureNamedEntities(
    token,
    "/accounts",
    accountTemplates,
    (item) => ({
      name: item.name,
      initial_balance: item.initial_balance,
      current_balance: item.initial_balance,
    })
  );
  const strategiesResult = await ensureNamedEntities(
    token,
    "/strategies",
    strategyTemplates,
    (item) => ({ name: item.name, description: item.description })
  );
  const tagsResult = await ensureNamedEntities(
    token,
    "/tags",
    tagTemplates,
    (item) => ({ name: item.name, color: item.color })
  );

  const weekdays = dateRangeWeekdays(SEED_START, SEED_END);
  if (weekdays.length === 0) throw new Error("No weekdays in selected range.");

  const existingTrades = await listAllTradesInRange(token, SEED_START, SEED_END);
  const existingSeedCount = existingTrades.filter((t) => String(t.notes || "").includes(`[${SEED_LABEL}]`)).length;
  const tradesToCreate = Math.max(0, SEED_TRADES - existingSeedCount);
  const statusMix = { open: 0, closed: 0, reviewed: 0 };

  for (let i = 0; i < tradesToCreate; i += 1) {
    const date = weekdays[Math.floor((i * weekdays.length) / Math.max(tradesToCreate, 1))];
    const payload = buildTradePayload(
      date,
      accountsResult.all,
      strategiesResult.all,
      tagsResult.all
    );
    statusMix[payload.status] += 1;
    await requestJson("/trades", { method: "POST", token, body: payload });
    if ((i + 1) % 25 === 0) {
      console.log(`Inserted ${i + 1}/${tradesToCreate} trades...`);
    }
  }

  const finalTrades = await listAllTradesInRange(token, SEED_START, SEED_END);
  const finalSeedCount = finalTrades.filter((t) => String(t.notes || "").includes(`[${SEED_LABEL}]`)).length;

  const rangeParams = new URLSearchParams({ date_from: SEED_START, date_to: SEED_END });
  const dashboard = await requestJson(`/analytics/dashboard?${rangeParams.toString()}`, { token });
  const insights = await requestJson(`/analytics/insights?${rangeParams.toString()}`, { token });

  console.log("\nSeed complete.");
  console.log("Summary:");
  console.log(`- Accounts created: ${accountsResult.created.length}, total available: ${accountsResult.all.length}`);
  console.log(`- Strategies created: ${strategiesResult.created.length}, total available: ${strategiesResult.all.length}`);
  console.log(`- Tags created: ${tagsResult.created.length}, total available: ${tagsResult.all.length}`);
  console.log(`- Existing labeled trades in range before run: ${existingSeedCount}`);
  console.log(`- Newly inserted labeled trades this run: ${tradesToCreate}`);
  console.log(`- Labeled trades in range after run: ${finalSeedCount}`);
  console.log(`- Status mix inserted: open=${statusMix.open}, closed=${statusMix.closed}, reviewed=${statusMix.reviewed}`);
  console.log(`- Dashboard total_trades in range: ${dashboard?.data?.total_trades ?? 0}`);
  console.log(`- Insights symbol buckets in range: ${insights?.data?.by_symbol?.length ?? 0}`);
}

main().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});
