import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

import { analyzePrompt }
from "./services/groq.js";

import { searchGames }
from "./services/rawg.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, "Public");
let currentGenres = [
  "RPG",
  "Action",
  "Adventure",
  "Open World",
  "Survival",
  "Strategy"
];

function updateHomeGenres(genres) {

  if (
    Array.isArray(genres) &&
    genres.length > 0
  ) {

    currentGenres = genres;

  }

}
const port = process.env.PORT || 3000;
const host = process.env.HOST || "0.0.0.0";
const cacheClearIntervalMs = 3 * 24 * 60 * 60 * 1000;
const cacheTtlMs = 6 * 60 * 60 * 1000;
const steamRequestTimeoutMs = 8000;
const steamRequestRetries = 2;
const gameCache = new Map();
const appLogs = [];
let nextLogId = 1;
let lastCacheClearAt = new Date();

const steamLocale = {
  cc: "TW",
  l: "tchinese"
};

const fallbackGames = [
  {
    id: 1245620,
    appid: 1245620,
    name: "Elden Ring",
    category: "RPG",
    score: "熱門推薦",
    img: "https://cdn.akamai.steamstatic.com/steam/apps/1245620/header.jpg",
    url: "https://store.steampowered.com/app/1245620/"
  },
  {
    id: 1091500,
    appid: 1091500,
    name: "Cyberpunk 2077",
    category: "開放世界",
    score: "熱門推薦",
    img: "https://cdn.akamai.steamstatic.com/steam/apps/1091500/header.jpg",
    url: "https://store.steampowered.com/app/1091500/"
  },
  {
    id: 1086940,
    appid: 1086940,
    name: "Baldur's Gate 3",
    category: "RPG",
    score: "熱門推薦",
    img: "https://cdn.akamai.steamstatic.com/steam/apps/1086940/header.jpg",
    url: "https://store.steampowered.com/app/1086940/"
  }
];

const interestQueries = {
  "熱門": "popular",
  "開放世界": "open world",
  "FPS射擊": "fps",
  "恐怖遊戲": "horror",
  "懸疑推理": "mystery detective",
  "RPG": "rpg",
  "生存遊戲": "survival",
  "動作冒險": "action adventure",
  "解謎": "puzzle"
};

const steamTagRules = [
  { patterns: ["open world", "開放", "開放世界", "sandbox", "沙盒"], tag: 1695, label: "開放世界" },
  { patterns: ["fps", "射擊", "shooter"], tag: 1663, label: "FPS射擊" },
  { patterns: ["horror", "恐怖"], tag: 1667, label: "恐怖遊戲" },
  { patterns: ["survival", "生存"], tag: 1662, label: "生存遊戲" },
  { patterns: ["co-op", "coop", "合作", "多人"], tag: 1685, label: "合作遊戲" },
  { patterns: ["puzzle", "解謎"], tag: 1664, label: "解謎" },
  { patterns: ["racing", "race", "賽車", "競速"], tag: 699, label: "競速賽車" },
  { patterns: ["action", "adventure", "動作", "冒險"], tag: 19, label: "動作冒險" },
  {
  patterns:["rpg","角色扮演"],
  tag:122,
  label:"RPG"
},
{
  patterns:["open world","開放世界"],
  tag:1695,
  label:"開放世界"
},
{
  patterns:["strategy","策略"],
  tag:9,
  label:"策略"
},
{
  patterns:["simulation","模擬"],
  tag:599,
  label:"模擬"
}
];

const suggestionConcepts = [
  { label: "第三人稱視角", terms: ["third person", "third-person", "3rd person"], keywords: ["third person", "third-person", "第三人稱", "視角"] },
  { label: "競速賽車", terms: ["racing", "driving", "racing game"], keywords: ["racing", "race", "driving", "賽車", "競速"] },
  { label: "開放世界", terms: ["open world", "sandbox"], keywords: ["open world", "開放", "開放世界", "sandbox", "沙盒"] },
  { label: "合作多人", terms: ["co-op", "multiplayer", "online co-op"], keywords: ["co-op", "coop", "合作", "多人", "連線"] },
  { label: "角色扮演", terms: ["rpg", "role playing"], keywords: ["rpg", "角色扮演"] },
  { label: "恐怖", terms: ["horror", "survival horror"], keywords: ["horror", "恐怖", "驚悚"] },
  { label: "推理解謎", terms: ["detective", "mystery", "puzzle"], keywords: ["detective", "mystery", "推理", "懸疑", "解謎"] },
  { label: "生存", terms: ["survival", "crafting survival"], keywords: ["survival", "生存"] },
  { label: "動作冒險", terms: ["action adventure", "action", "adventure"], keywords: ["action", "adventure", "動作", "冒險"] },
  { label: "策略", terms: ["strategy", "turn-based strategy"], keywords: ["strategy", "策略", "戰略"] }
];

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml"
};

function sendJson(res, statusCode, body) {
  res.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk;

      if (body.length > 1_000_000) {
        req.destroy();
      }
    });

    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function logEvent(level, event, message, details = {}) {
  const entry = {
    id: nextLogId++,
    at: new Date().toISOString(),
    level,
    event,
    message,
    details
  };

  appLogs.unshift(entry);

  if (appLogs.length > 200) {
    appLogs.length = 200;
  }

  const consoleMethod = level === "error" ? "error" : level === "warn" ? "warn" : "log";
  console[consoleMethod](`[${level}] ${event}: ${message}`, details);

  return entry;
}

function getRecentLogs(limit = 50) {
  return appLogs.slice(0, Math.min(Math.max(limit, 1), 200));
}

function steamParams(extra = {}) {
  return new URLSearchParams({
    cc: steamLocale.cc,
    l: steamLocale.l,
    ...extra
  });
}

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function addSuggestion(suggestions, candidate) {
  const query = String(candidate.query || candidate.label || "").trim();

  if (!query && !candidate.tag) {
    return;
  }

  const key = candidate.tag
    ? `tag:${candidate.tag}:${query.toLowerCase()}`
    : `query:${query.toLowerCase()}`;

  if (suggestions.some((item) => item.key === key)) {
    return;
  }

  suggestions.push({
    key,
    label: candidate.label || query,
    query,
    source: candidate.source || "local",
    reason: candidate.reason || "",
    tag: candidate.tag || null
  });
}

function getMatchedConcepts(input) {
  const normalizedInput = normalizeText(input);

  return suggestionConcepts.filter((concept) =>
    concept.keywords.some((keyword) => normalizedInput.includes(keyword.toLowerCase()))
  );
}

function buildLocalSearchSuggestions(input) {
  const trimmedInput = String(input || "").trim();
  const suggestions = [];

  if (!trimmedInput) {
    addSuggestion(suggestions, {
      label: "熱門 Steam 遊戲",
      query: "popular",
      source: "default",
      reason: "未輸入條件"
    });
    return suggestions;
  }

  if (interestQueries[trimmedInput]) {
    addSuggestion(suggestions, {
      label: trimmedInput,
      query: interestQueries[trimmedInput],
      source: "category",
      reason: "首頁分類"
    });
  }

  const matchedConcepts = getMatchedConcepts(trimmedInput);
  const normalizedInput = normalizeText(trimmedInput);
  const matchedTagRules = steamTagRules.filter((rule) =>
    rule.patterns.some((pattern) => normalizedInput.includes(pattern.toLowerCase()))
  );

  if (matchedConcepts.length > 1) {
    addSuggestion(suggestions, {
      label: matchedConcepts.map((concept) => concept.label).join(" + "),
      query: matchedConcepts.map((concept) => concept.terms[0]).join(" "),
      source: "association",
      reason: "多個語意線索"
    });

    for (const tagRule of matchedTagRules) {
      const nonTagConcepts = matchedConcepts.filter((concept) =>
        !concept.keywords.some((keyword) => tagRule.patterns.includes(keyword))
      );

      addSuggestion(suggestions, {
        label: `${nonTagConcepts.map((concept) => concept.label).join(" + ")} + ${tagRule.label}`,
        query: nonTagConcepts.map((concept) => concept.terms[0]).join(" "),
        tag: tagRule.tag,
        source: "steam_tag",
        reason: "Steam 標籤加語意條件"
      });
    }
  }

  for (const rule of matchedTagRules) {
    addSuggestion(suggestions, {
      label: rule.label,
      query: rule.label,
      tag: rule.tag,
      source: "steam_tag",
      reason: "Steam 標籤聯想"
    });
  }

  for (const concept of matchedConcepts) {
    for (const term of concept.terms) {
      addSuggestion(suggestions, {
        label: concept.label,
        query: term,
        source: "association",
        reason: "輸入語意聯想"
      });
    }
  }

  addSuggestion(suggestions, {
    label: `直接搜尋「${trimmedInput}」`,
    query: trimmedInput,
    source: "raw",
    reason: "保留原始輸入"
  });

  return suggestions.slice(0, 10);
}

function parseSteamSuggestionPayload(payload) {
  if (Array.isArray(payload)) {
    return payload
      .map((item) => item?.name || item?.title || item?.value || item?.label)
      .filter(Boolean);
  }

  if (typeof payload === "string") {
    const matches = [...payload.matchAll(/data-ds-appid="(\d+)"[\s\S]*?<div[^>]*class="match_name"[^>]*>([\s\S]*?)<\/div>/g)];
    return matches
      .map((match) => decodeHtml(match[2].replace(/<[^>]+>/g, "").trim()))
      .filter(Boolean);
  }

  if (payload?.suggestions && Array.isArray(payload.suggestions)) {
    return payload.suggestions
      .map((item) => item?.name || item?.title || item?.value || item?.label)
      .filter(Boolean);
  }

  return [];
}

async function fetchSteamAutocompleteSuggestions(input) {
  const trimmedInput = String(input || "").trim();

  if (trimmedInput.length < 2) {
    return [];
  }

  const params = steamParams({
    term: trimmedInput,
    f: "games",
    realm: "1"
  });
  const response = await fetch(`https://store.steampowered.com/search/suggest?${params}`, {
    headers: { Accept: "application/json, text/html;q=0.9" },
    signal: AbortSignal.timeout(steamRequestTimeoutMs)
  });

  if (!response.ok) {
    throw new Error(`Steam suggestions HTTP ${response.status}`);
  }

  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  return parseSteamSuggestionPayload(payload).slice(0, 5).map((name) => ({
    label: name,
    query: name,
    source: "steam_suggest",
    reason: "Steam 自動建議"
  }));
}

async function getSearchSuggestions(input) {
  const suggestions = [];

  try {
    const steamSuggestions = await fetchSteamAutocompleteSuggestions(input);
    steamSuggestions.forEach((suggestion) => addSuggestion(suggestions, suggestion));
  } catch (error) {
    logEvent("warn", "steam.suggest_failed", "Steam autocomplete suggestions failed.", {
      input,
      error: error.message
    });
  }

  buildLocalSearchSuggestions(input).forEach((suggestion) => addSuggestion(suggestions, suggestion));
  return suggestions.slice(0, 8).map(({ key, ...suggestion }) => suggestion);
}

function getCacheKey(interest) {
  return (interest || "熱門").trim().toLowerCase();
}

function clearGameCache(reason = "scheduled") {
  gameCache.clear();
  lastCacheClearAt = new Date();
  logEvent("info", "cache.clear", "Game cache cleared.", {
    reason,
    entries: gameCache.size
  });
}

function getCachedGames(cacheKey) {
  const cached = gameCache.get(cacheKey);

  if (!cached) {
    return null;
  }

  if (Date.now() - cached.cachedAt > cacheTtlMs) {
    gameCache.delete(cacheKey);
    logEvent("info", "cache.expired", "Expired cached Steam result removed.", {
      cacheKey
    });
    return null;
  }

  return cached.games;
}

function setCachedGames(cacheKey, games) {
  gameCache.set(cacheKey, {
    cachedAt: Date.now(),
    games
  });
  logEvent("info", "cache.set", "Stored Steam result in cache.", {
    cacheKey,
    count: games.length
  });
}

setInterval(() => {
  clearGameCache("3-day interval");
}, cacheClearIntervalMs).unref();

async function fetchJson(url) {
  let lastError;

  for (let attempt = 1; attempt <= steamRequestRetries + 1; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), steamRequestTimeoutMs);

    try {
      const response = await fetch(url, {
        headers: {
          "Accept": "application/json",
          "User-Agent": "KUS-Game-Search-AI/1.0"
        },
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(`Steam request failed: ${response.status}`);
      }

      return response.json();
    } catch (error) {
      lastError = error;
      logEvent("warn", "steam.request_failed", "Steam request attempt failed.", {
        attempt,
        url,
        error: error.message
      });
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError;
}

function normalizeSearchResult(item, fallbackCategory = "Steam") {
  const appid = item.id || item.appid;

  return {
    id: appid,
    appid,
    name: item.name,
    category: fallbackCategory,
    score: item.metascore ? `Metacritic ${item.metascore}` : "Steam",
    img: item.tiny_image || item.header_image || `https://cdn.akamai.steamstatic.com/steam/apps/${appid}/header.jpg`,
    url: `https://store.steampowered.com/app/${appid}/`,
    price: item.price?.final || item.final_price || null
  };
}

function decodeHtml(value) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function parseSteamSearchHtml(html, fallbackCategory) {
  const rows = html.match(/<a[\s\S]*?class="search_result_row[\s\S]*?<\/a>/g) || [];

  return rows.map((row) => {
    const appid = Number(row.match(/data-ds-appid="(\d+)"/)?.[1]);
    const name = decodeHtml(row.match(/<span class="title">([\s\S]*?)<\/span>/)?.[1]?.trim() || "");
    const img = decodeHtml(row.match(/<img src="([^"]+)"/)?.[1] || "");
    const releaseDate = decodeHtml(row.match(/<div class="search_released responsive_secondrow">\s*([\s\S]*?)\s*<\/div>/)?.[1]?.trim() || "");

    if (!appid || !name) {
      return null;
    }

    return {
      id: appid,
      appid,
      name,
      category: fallbackCategory,
      score: "Steam 標籤推薦",
      img: img || `https://cdn.akamai.steamstatic.com/steam/apps/${appid}/header.jpg`,
      url: `https://store.steampowered.com/app/${appid}/`,
      releaseDate
    };
  }).filter(Boolean);
}

function normalizeDetails(appid, details, fallbackGame) {
  if (!details?.success || !details.data) {
    return fallbackGame;
  }

  const data = details.data;
  const genres = Array.isArray(data.genres)
    ? data.genres.map((genre) => genre.description).filter(Boolean)
    : [];
  const categories = Array.isArray(data.categories)
    ? data.categories.map((category) => category.description).filter(Boolean)
    : [];
  const reviewText = data.recommendations?.total
    ? `${Number(data.recommendations.total).toLocaleString("zh-TW")} 人推薦`
    : fallbackGame.score;

  return {
    ...fallbackGame,
    id: appid,
    appid,
    name: data.name || fallbackGame.name,
    category: genres[0] || fallbackGame.category,
    genres,
    categories,
    score: reviewText,
    img: data.header_image || fallbackGame.img,
    url: `https://store.steampowered.com/app/${appid}/`,
    description: data.short_description || "",
    releaseDate: data.release_date?.date || "",
    platforms: Object.entries(data.platforms || {})
      .filter(([, supported]) => supported)
      .map(([platform]) => platform)
  };
}

async function fetchSteamDetails(games) {
  const detailRequests = games.slice(0, 12).map(async (game) => {
    if (!game.appid) {
      return game;
    }

    try {
      const params = steamParams({ appids: String(game.appid) });
      const details = await fetchJson(`https://store.steampowered.com/api/appdetails?${params}`);
      return normalizeDetails(game.appid, details[String(game.appid)], game);
    } catch {
      return game;
    }
  });

  return Promise.all(detailRequests);
}

async function searchSteamByTag(candidate, interest) {
  const params = steamParams({
    query: candidate.query || "",
    start: "0",
    count: "12",
    category1: "998",
    tags: String(candidate.tag),
    infinite: "1"
  });
  const data = await fetchJson(`https://store.steampowered.com/search/results/?${params}`);
  const taggedGames = parseSteamSearchHtml(data.results_html || "", candidate.label);

  logEvent(taggedGames.length ? "info" : "warn", taggedGames.length ? "steam.tag_results" : "steam.no_tag_results", "Steam tag search completed.", {
    interest,
    tag: candidate.tag,
    label: candidate.label,
    query: candidate.query || "",
    count: taggedGames.length
  });

  return taggedGames;
}

async function searchSteamByKeyword(candidate, interest) {
  const params = steamParams({
    term: candidate.query,
    category1: "998",
    supportedlang: "english",
    page: "1"
  });
  const data = await fetchJson(`https://store.steampowered.com/api/storesearch?${params}`);
  const rawItems = Array.isArray(data.items) ? data.items : [];
  const games = rawItems
    .filter((item) => item.id && item.name)
    .slice(0, 12)
    .map((item) => normalizeSearchResult(item, interest || "Steam"));

  logEvent(games.length ? "info" : "warn", games.length ? "steam.keyword_results" : "steam.no_keyword_results", "Steam keyword search completed.", {
    interest,
    query: candidate.query,
    suggestionSource: candidate.source,
    count: games.length
  });

  return games;
}

async function searchSteamGames(interest) {
  const suggestions = await getSearchSuggestions(interest);

  logEvent("info", "steam.search_suggestions", "Searching Steam by suggestion candidates.", {
    interest,
    suggestions: suggestions.map((suggestion) => ({
      label: suggestion.label,
      query: suggestion.query,
      source: suggestion.source,
      tag: suggestion.tag
    }))
  });

  for (const candidate of suggestions) {
    const games = candidate.tag
      ? await searchSteamByTag(candidate, interest)
      : await searchSteamByKeyword(candidate, interest);

    if (games.length) {
      return {
        games: await fetchSteamDetails(games),
        suggestions,
        matchedSuggestion: candidate
      };
    }
  }

  return {
    games: [],
    suggestions,
    matchedSuggestion: null
  };
}

async function fetchFeaturedSteamGames() {
  logEvent("info", "steam.featured", "Fetching Steam featured categories.", {});
  const params = steamParams();
  const data = await fetchJson(`https://store.steampowered.com/api/featuredcategories?${params}`);
  const sections = [
    data?.top_sellers?.items,
    data?.new_releases?.items,
    data?.specials?.items
  ];
  const rawItems = sections.flatMap((items) => Array.isArray(items) ? items : []);
  const seen = new Set();
  const games = rawItems
    .filter((item) => {
      const appid = item.id || item.appid;

      if (!appid || seen.has(appid)) {
        return false;
      }

      seen.add(appid);
      return true;
    })
    .slice(0, 12)
    .map((item) => normalizeSearchResult(item, "Steam 熱門"));

  return fetchSteamDetails(games);
}

async function getGamesForInterest(interest, options = {}) {
  const { forceRefresh = false } = options;
  const cacheKey = getCacheKey(interest);
  const cachedGames = forceRefresh ? null : getCachedGames(cacheKey);

  if (cachedGames) {
    logEvent("info", "cache.hit", "Served Steam result from cache.", {
      cacheKey,
      interest: interest || "熱門",
      count: cachedGames.length
    });
    return {
      games: cachedGames,
      source: "steam",
      cacheHit: true,
      suggestions: buildLocalSearchSuggestions(interest),
      matchedSuggestion: null
    };
  }

  try {
    let games;
    let suggestions = [];
    let matchedSuggestion = null;

    if (!interest || interest === "熱門" || interest === "全部") {
      games = await fetchFeaturedSteamGames();
    } else {
      const searchResult = await searchSteamGames(interest);
      games = searchResult.games;
      suggestions = searchResult.suggestions;
      matchedSuggestion = searchResult.matchedSuggestion;
    }

    if (!games.length) {
      logEvent("warn", "recommendation.fallback_no_results", "Using fallback because Steam returned no matching games.", {
        interest: interest || "熱門"
      });
      return {
        games: fallbackGames,
        source: "fallback",
        fallbackReason: "no_results",
        cacheHit: false,
        suggestions,
        matchedSuggestion
      };
    }

    setCachedGames(cacheKey, games);
    return {
      games,
      source: "steam",
      cacheHit: false,
      suggestions,
      matchedSuggestion
    };
  } catch (error) {
    logEvent("error", "recommendation.fallback_request_error", "Using fallback because Steam request failed.", {
      interest: interest || "熱門",
      error: error.message
    });
    return {
      games: fallbackGames,
      source: "fallback",
      fallbackReason: "request_error",
      error: error.message,
      cacheHit: false,
      suggestions: buildLocalSearchSuggestions(interest),
      matchedSuggestion: null
    };
  }
}

async function serveStaticFile(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const requestedPath = url.pathname === "/" ? "/index.html" : decodeURIComponent(url.pathname);
  const filePath = path.normalize(path.join(publicDir, requestedPath));

  if (!filePath.startsWith(publicDir)) {
    sendJson(res, 403, { error: "Forbidden" });
    return;
  }

  try {
    const content = await readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      "Content-Type": mimeTypes[ext] || "application/octet-stream",
      "Cache-Control": [".html", ".css", ".js"].includes(ext) ? "no-store" : "public, max-age=3600"
    });
    res.end(content);
  } catch {
    sendJson(res, 404, { error: "Not found" });
  }
}

async function handleGames(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const interest = url.searchParams.get("interest")?.trim() || "";
  const forceRefresh = url.searchParams.get("refresh") === "1";
  const cacheKey = getCacheKey(interest);
  const cacheHit = !forceRefresh && Boolean(getCachedGames(cacheKey));
  const result = await getGamesForInterest(interest, { forceRefresh });

  sendJson(res, 200, {
    source: result.source,
    interest: interest || "熱門",
    fallbackReason: result.fallbackReason || null,
    cache: {
      entries: gameCache.size,
      hit: result.cacheHit || cacheHit,
      lastClearedAt: lastCacheClearAt.toISOString(),
      ttlHours: cacheTtlMs / 1000 / 60 / 60,
      clearsEveryDays: cacheClearIntervalMs / 1000 / 60 / 60 / 24
    },
    suggestions: result.suggestions || [],
    matchedSuggestion: result.matchedSuggestion || null,
    games: result.games
  });
}

async function handleSuggestions(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const query = url.searchParams.get("q")?.trim() || "";
  const suggestions = await getSearchSuggestions(query);

  sendJson(res, 200, {
    query,
    suggestions
  });
}

function buildRecommendationReply(message, games, source, fallbackReason, matchedSuggestion, suggestions = []) {
  let sourceText = "我從 Steam Store 找到以下符合興趣的遊戲：";

  if (source !== "steam" && fallbackReason === "no_results") {
    sourceText = "Steam 有回應，但找不到完全符合的結果，先提供本地備援推薦：";
  } else if (source !== "steam") {
    sourceText = "Steam 暫時無法連線，先提供本地備援推薦：";
  }
  const matchedText = matchedSuggestion
    ? `我先聯想到「${matchedSuggestion.label}」，並用「${matchedSuggestion.query || matchedSuggestion.label}」搜尋。`
    : suggestions.length
      ? `我嘗試的聯想方向包含：${suggestions.slice(0, 3).map((suggestion) => suggestion.label).join("、")}。`
      : "我會優先用 Steam 的搜尋結果判斷，再保留你的原始輸入作為最後查詢。";
  const gameLines = games.slice(0, 5).map((game, index) => {
    const tags = [game.category, game.releaseDate].filter(Boolean).join(" / ");
    return `${index + 1}. ${game.name} - ${tags || "Steam 遊戲"} - ${game.score}`;
  });

  return [
    `你輸入的興趣是：「${message}」。`,
    matchedText,
    sourceText,
    ...gameLines,
    "可以點左側遊戲卡片查看 Steam 商店頁，或從搜尋欄下方的聯想詞改查更接近的方向。"
  ].join("\n");
}

function normalizeRawgGame(game) {

  return {
    id: game.id,
    appid: game.id,

    name: game.name,

    category:
      game.genres?.[0]?.name ||
      "Game",

    score:
      game.rating
        ? `評分 ${game.rating}`
        : "RAWG",

    img:
      game.background_image,

    url:
      `https://rawg.io/games/${game.slug}`,

    releaseDate:
      game.released || ""
  };
}

async function handleChat(req,res){

  let payload;

  try{

    const body =
      await readRequestBody(req);

    payload =
      body
        ? JSON.parse(body)
        : {};

  }catch{

    sendJson(
      res,
      400,
      {
        reply:"JSON格式錯誤"
      }
    );

    return;
  }

  const message =
    String(
      payload.message || ""
    ).trim();

  if(!message){

    sendJson(
      res,
      400,
      {
        reply:"請輸入內容"
      }
    );

    return;
  }

  try{

    const ai =
      await analyzePrompt(
        message
      );
    
    updateHomeGenres(
  ai.genres
);

    const rawgGames =
  await searchGames(
    ai.genres || []
  );

    const games =
      rawgGames.map(
        normalizeRawgGame
      );

    sendJson(
      res,
      200,
      {

        reply:
`
AI分析完成

風格：
${(ai.genres || []).join("、")}

情緒：
${ai.mood}

推薦原因：
${ai.reason}
`,

        analysis: ai,

        games
      }
    );

  }catch(error){

    sendJson(
      res,
      500,
      {
        reply:
          error.message
      }
    );
  }
}
  
const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === "GET" && url.pathname === "/health") {
    sendJson(res, 200, {
      ok: true,
      cacheEntries: gameCache.size,
      logEntries: appLogs.length,
      cacheTtlHours: cacheTtlMs / 1000 / 60 / 60,
      cacheClearsEveryDays: cacheClearIntervalMs / 1000 / 60 / 60 / 24
    });
    return;
  }

  if (req.method === "GET" && url.pathname === "/logs") {
    const limit = Number(url.searchParams.get("limit") || 50);

    sendJson(res, 200, {
      logs: getRecentLogs(limit)
    });
    return;
  }

  if (req.method === "GET" && url.pathname === "/games") {
    await handleGames(req, res);
    return;
  }

  if (req.method === "GET" && url.pathname === "/suggestions") {
    await handleSuggestions(req, res);
    return;
  }

  if (req.method === "POST" && url.pathname === "/chat") {
    await handleChat(req, res);
    return;
  }

  if (req.method === "GET") {
    await serveStaticFile(req, res);
    return;
  }

  sendJson(res, 405, { error: "Method not allowed" });
});

server.listen(port, host, () => {
  console.log(`Game AI server running on ${host}:${port}`);
});


