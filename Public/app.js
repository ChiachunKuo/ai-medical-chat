const chat = document.getElementById("chat");

let allGames = [];
let filteredGames = [];
let currentInterest = "熱門";
let lastUpdatedAt = null;
let nextRefreshAt = null;
let refreshTimer = null;
let countdownTimer = null;
let suggestionTimer = null;
let currentSuggestions = [];
let activeSuggestionIndex = -1;

const autoRefreshIntervalMs = 5 * 60 * 1000;
const consentCookieName = "kus_game_ai_consent";
const profileStorageKey = "kus_game_ai_profile";
const interests = [
  "熱門",
  "開放世界",
  "FPS射擊",
  "恐怖遊戲",
  "懸疑推理",
  "RPG",
  "生存遊戲",
  "動作冒險",
  "解謎"
];

function setCookie(name, value, days) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();

  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

function deleteCookie(name) {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`;
}

function getCookie(name) {
  return document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`))
    ?.split("=")[1];
}

function hasPreferenceConsent() {
  return decodeURIComponent(getCookie(consentCookieName) || "") === "accepted";
}

function hasConsentChoice() {
  return ["accepted", "declined"].includes(decodeURIComponent(getCookie(consentCookieName) || ""));
}

function getProfile() {
  try {
    return JSON.parse(localStorage.getItem(profileStorageKey)) || {
      interests: {},
      searches: []
    };
  } catch {
    return {
      interests: {},
      searches: []
    };
  }
}

function saveProfile(profile) {
  localStorage.setItem(profileStorageKey, JSON.stringify(profile));
}

function clearProfile() {
  localStorage.removeItem(profileStorageKey);
  deleteCookie(consentCookieName);
}

function inferInterest(text) {
  const trimmedText = String(text || "").trim();

  return interests.includes(trimmedText) ? trimmedText : trimmedText;
}

function safeHttpUrl(value, fallback = "") {
  try {
    const url = new URL(value);

    if (["http:", "https:"].includes(url.protocol)) {
      return url.href;
    }
  } catch {
    return fallback;
  }

  return fallback;
}

function recordInterest(rawInterest, weight = 1) {
  if (!hasPreferenceConsent() || !rawInterest || rawInterest === "熱門") {
    return;
  }

  const interest = inferInterest(rawInterest);
  const profile = getProfile();

  profile.interests[interest] = (profile.interests[interest] || 0) + weight;
  profile.lastInterest = interest;
  profile.searches = [
    {
      value: rawInterest,
      interest,
      at: new Date().toISOString()
    },
    ...(profile.searches || [])
  ].slice(0, 20);

  saveProfile(profile);
}

function recordGameInterest(game, weight = 2) {
  const interest = game.category || game.genres?.[0] || currentInterest;

  recordInterest(interest, weight);
}

function getPreferredInterest() {
  if (!hasPreferenceConsent()) {
    return "熱門";
  }

  const profile = getProfile();
  const rankedInterests = Object.entries(profile.interests || {})
    .sort((a, b) => b[1] - a[1]);

  return rankedInterests[0]?.[0] || profile.lastInterest || "熱門";
}

function createConsentModal() {
  if (hasConsentChoice() || document.getElementById("consent-modal")) {
    return;
  }

  const modal = document.createElement("div");
  modal.id = "consent-modal";

  const panel = document.createElement("div");
  const title = document.createElement("div");
  const body = document.createElement("div");
  const actions = document.createElement("div");
  const acceptButton = document.createElement("button");
  const declineButton = document.createElement("button");

  panel.className = "consent-panel";
  title.className = "consent-title";
  body.className = "consent-body";
  actions.className = "consent-actions";
  declineButton.className = "secondary-btn";

  title.textContent = "個人化推薦設定";
  body.textContent = "同意後，本 app 會在這台瀏覽器記錄你點選的分類、搜尋興趣與 Steam 連結點擊，用來在下次開啟首頁時優先推薦可能喜歡的 Steam 遊戲。資料只保存在本機瀏覽器，可隨時清除。";
  acceptButton.textContent = "同意並啟用";
  declineButton.textContent = "暫不啟用";

  acceptButton.onclick = () => {
    setCookie(consentCookieName, "accepted", 180);
    modal.remove();
    add("ai", "已啟用個人化推薦。我會依你之後搜尋與點選的興趣調整首頁推薦。");
  };

  declineButton.onclick = () => {
    setCookie(consentCookieName, "declined", 30);
    modal.remove();
    add("ai", "未啟用個人化推薦，首頁會維持顯示熱門遊戲。");
  };

  actions.append(acceptButton, declineButton);
  panel.append(title, body, actions);
  modal.appendChild(panel);

  document.body.appendChild(modal);
}

function add(role, text) {
  const d = document.createElement("div");

  d.className = role;
  d.textContent = text;
  chat.appendChild(d);
  chat.scrollTop = chat.scrollHeight;
}

function showLoading(message = "正在從 Steam 取得遊戲資訊...") {
  const div = document.getElementById("games");
  const emptyState = document.createElement("div");

  div.replaceChildren();
  emptyState.className = "empty-state";
  emptyState.textContent = message;
  div.appendChild(emptyState);
}

function formatTime(date) {
  return date.toLocaleTimeString("zh-TW", {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function updateRefreshStatus(message = "") {
  const status = document.getElementById("refresh-status");

  if (!status) {
    return;
  }

  if (message) {
    status.innerText = message;
    return;
  }

  if (!lastUpdatedAt || !nextRefreshAt) {
    status.innerText = "遊戲列表會每 5 分鐘自動更新。";
    return;
  }

  const remainingMs = Math.max(nextRefreshAt.getTime() - Date.now(), 0);
  const remainingMinutes = Math.ceil(remainingMs / 60000);

  status.innerText = `上次更新 ${formatTime(lastUpdatedAt)}，約 ${remainingMinutes} 分鐘後自動更新「${currentInterest}」。`;
}

function scheduleNextRefresh() {
  clearTimeout(refreshTimer);
  clearInterval(countdownTimer);

  nextRefreshAt = new Date(Date.now() + autoRefreshIntervalMs);
  updateRefreshStatus();

  countdownTimer = setInterval(updateRefreshStatus, 30000);
  refreshTimer = setTimeout(() => {
    refreshCurrentGames();
  }, autoRefreshIntervalMs);
}

async function refreshCurrentGames() {
  if (document.visibilityState === "hidden") {
    scheduleNextRefresh();
    return;
  }

  await loadGames(currentInterest, false, {
    forceRefresh: true,
    silent: true,
    resetPage: false
  });
}

async function fetchGames(interest = "", options = {}) {
  const params = new URLSearchParams();

  if (interest) {
    params.set("interest", interest);
  }

  if (options.refresh) {
    params.set("refresh", "1");
  }

  const query = params.toString() ? `?${params}` : "";
  const response = await fetch(`/games${query}`);

  if (!response.ok) {
    throw new Error("games request failed");
  }

  return response.json();
}

async function fetchSuggestions(query) {
  const trimmedQuery = query.trim();

  if (trimmedQuery.length < 2) {
    return [];
  }

  const response = await fetch(`/suggestions?q=${encodeURIComponent(trimmedQuery)}`);

  if (!response.ok) {
    throw new Error("suggestions request failed");
  }

  const data = await response.json();
  return Array.isArray(data.suggestions) ? data.suggestions : [];
}

function hideSuggestions() {
  const suggestions = document.getElementById("suggestions");
  const input = document.getElementById("input");

  currentSuggestions = [];
  activeSuggestionIndex = -1;
  suggestions.replaceChildren();
  suggestions.classList.remove("visible");
  input.setAttribute("aria-expanded", "false");
}

function renderSuggestions(suggestions) {
  const container = document.getElementById("suggestions");
  const input = document.getElementById("input");

  currentSuggestions = suggestions;
  activeSuggestionIndex = suggestions.length ? 0 : -1;
  container.replaceChildren();

  if (!suggestions.length) {
    container.classList.remove("visible");
    input.setAttribute("aria-expanded", "false");
    return;
  }

  suggestions.forEach((suggestion, index) => {
    const button = document.createElement("button");
    const label = document.createElement("span");
    const meta = document.createElement("span");

    button.type = "button";
    button.className = `suggestion-item${index === activeSuggestionIndex ? " active" : ""}`;
    button.setAttribute("role", "option");
    button.setAttribute("aria-selected", index === activeSuggestionIndex ? "true" : "false");
    label.className = "suggestion-label";
    meta.className = "suggestion-meta";
    label.textContent = suggestion.label;
    meta.textContent = suggestion.reason || suggestion.source || "聯想搜尋";
    button.onclick = () => applySuggestion(suggestion);
    button.append(label, meta);
    container.appendChild(button);
  });

  container.classList.add("visible");
  input.setAttribute("aria-expanded", "true");
}

function setActiveSuggestion(index) {
  if (!currentSuggestions.length) {
    return;
  }

  const nextIndex = (index + currentSuggestions.length) % currentSuggestions.length;
  const buttons = document.querySelectorAll(".suggestion-item");

  activeSuggestionIndex = nextIndex;
  buttons.forEach((button, buttonIndex) => {
    const isActive = buttonIndex === nextIndex;

    button.classList.toggle("active", isActive);
    button.setAttribute("aria-selected", isActive ? "true" : "false");
  });
}

function applySuggestion(suggestion) {
  const input = document.getElementById("input");
  const query = suggestion.query || suggestion.label;

  input.value = query;
  hideSuggestions();
  send(query);
}

function queueSuggestions() {
  const input = document.getElementById("input");
  const query = input.value.trim();

  clearTimeout(suggestionTimer);

  if (query.length < 2) {
    hideSuggestions();
    return;
  }

  suggestionTimer = setTimeout(async () => {
    try {
      const suggestions = await fetchSuggestions(query);

      if (input.value.trim() === query) {
        renderSuggestions(suggestions);
      }
    } catch {
      hideSuggestions();
    }
  }, 250);
}

async function loadGames(interest = "熱門", shouldRecord = true, options = {}) {
  const { silent = false } = options;

  currentInterest = interest || "熱門";

  if (!silent) {
    showLoading();
  } else {
    updateRefreshStatus(`正在背景更新「${currentInterest}」遊戲列表...`);
  }

  if (shouldRecord) {
    recordInterest(currentInterest);
  }

  try {
    const data = await fetchGames(currentInterest, {
      refresh: options.forceRefresh
    });

    allGames = Array.isArray(data.games) ? data.games : [];
    filteredGames = [...allGames];
    lastUpdatedAt = new Date();
    renderGames();
    scheduleNextRefresh();
  } catch {
    if (!silent) {
      showLoading("目前無法取得遊戲資料，請稍後再試。");
    }

    scheduleNextRefresh();
  }
}

async function send(forcedText = "") {
  const input = document.getElementById("input");
  const text = String(forcedText || input.value).trim();

  if (!text) return;

  hideSuggestions();
  add("user", text);
  recordInterest(text);
  input.value = "";
  add("ai", "正在依你的興趣搜尋 Steam 遊戲...");

  try {
    const response = await fetch("/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: text
      })
    });
    const data = await response.json();

    chat.lastChild.remove();
    add("ai", data.reply);

    if (Array.isArray(data.games)) {
      currentInterest = inferInterest(text);
      allGames = data.games;
      filteredGames = [...allGames];
      lastUpdatedAt = new Date();
      renderGames();
      scheduleNextRefresh();
    }
  } catch {
    chat.lastChild.remove();
    add("ai", "目前無法取得 Steam 資料，請稍後再試。");
  }
}

function renderCategories() {
  const div = document.getElementById("categories");

  div.replaceChildren();

  interests.forEach((interest) => {
    const btn = document.createElement("button");

    btn.className = "category-btn";
    btn.innerText = interest;
    btn.onclick = () => loadGames(interest);
    div.appendChild(btn);
  });
}

function renderGames() {
  const div = document.getElementById("games");

  div.replaceChildren();

  if (!filteredGames.length) {
    const emptyState = document.createElement("div");

    emptyState.className = "empty-state";
    emptyState.textContent = "找不到符合條件的 Steam 遊戲。";
    div.appendChild(emptyState);
    return;
  }

  filteredGames.forEach((game) => {
    const d = document.createElement("div");
    const imageFrame = document.createElement("div");
    const image = document.createElement("img");
    const info = document.createElement("div");
    const title = document.createElement("div");
    const score = document.createElement("div");
    const category = document.createElement("div");
    const link = document.createElement("a");
    const tags = [
      game.category,
      Array.isArray(game.genres) ? game.genres.slice(1, 3).join(" / ") : "",
      game.releaseDate
    ].filter(Boolean).join(" / ");

    d.className = "game";
    imageFrame.className = "game-image";
    info.className = "game-info";
    title.className = "game-title";
    score.className = "game-score";
    category.className = "game-category";
    link.className = "steam-link";

    image.src = safeHttpUrl(game.img);
    image.alt = game.name || "Steam game";
    title.textContent = `🎮 ${game.name || "Unknown Game"}`;
    score.textContent = game.score || "Steam";
    category.textContent = tags || "Steam 遊戲";
    link.href = safeHttpUrl(game.url, "#");
    link.target = "_blank";
    link.rel = "noopener";
    link.textContent = "查看 Steam";
    link.onclick = () => recordGameInterest(game, 3);

    imageFrame.appendChild(image);
    info.append(title, score, category, link);
    d.append(imageFrame, info);

    d.onclick = (event) => {
      if (event.target.tagName === "A") {
        return;
      }

      recordGameInterest(game, 2);
      document.getElementById("input").value = game.name;
      send();
    };

    div.appendChild(d);
  });
}

function boot() {
  renderCategories();
  createConsentModal();
  setupPrivacyControls();
  setupSearchControls();

  const preferredInterest = getPreferredInterest();

  if (preferredInterest !== "熱門") {
    add("ai", `根據你之前的興趣，這次先推薦「${preferredInterest}」相關遊戲。`);
  }

  loadGames(preferredInterest, false);
}

function setupSearchControls() {
  const input = document.getElementById("input");
  const sendButton = document.getElementById("send-button");

  input.addEventListener("input", queueSuggestions);
  input.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveSuggestion(activeSuggestionIndex + 1);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveSuggestion(activeSuggestionIndex - 1);
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();

      if (currentSuggestions[activeSuggestionIndex]) {
        applySuggestion(currentSuggestions[activeSuggestionIndex]);
      } else {
        send();
      }
      return;
    }

    if (event.key === "Escape") {
      hideSuggestions();
    }
  });
  input.addEventListener("blur", () => {
    setTimeout(hideSuggestions, 150);
  });

  sendButton.onclick = () => send();
}

function setupPrivacyControls() {
  const resetButton = document.getElementById("reset-profile");
  const logsButton = document.getElementById("show-logs");

  if (resetButton) {
    resetButton.onclick = () => {
      clearProfile();
      add("ai", "已清除本機個人化推薦資料。首頁會回到熱門推薦。");
      createConsentModal();
      loadGames("熱門", false, {
        forceRefresh: true
      });
    };
  }

  if (logsButton) {
    logsButton.onclick = showDiagnostics;
  }
}

async function showDiagnostics() {
  try {
    const response = await fetch("/logs?limit=40");

    if (!response.ok) {
      throw new Error("logs request failed");
    }

    const data = await response.json();
    renderDiagnosticsModal(Array.isArray(data.logs) ? data.logs : []);
  } catch {
    add("ai", "無法讀取診斷紀錄，請確認後端服務仍在執行。");
  }
}

function renderDiagnosticsModal(logs) {
  const oldModal = document.getElementById("diagnostics-modal");

  if (oldModal) {
    oldModal.remove();
  }

  const modal = document.createElement("div");
  const panel = document.createElement("div");
  const header = document.createElement("div");
  const title = document.createElement("div");
  const closeButton = document.createElement("button");
  const list = document.createElement("div");

  modal.id = "diagnostics-modal";
  panel.className = "diagnostics-panel";
  header.className = "diagnostics-header";
  title.className = "diagnostics-title";
  closeButton.className = "secondary-btn";
  list.className = "diagnostics-list";

  title.textContent = "診斷紀錄";
  closeButton.textContent = "關閉";
  closeButton.onclick = () => modal.remove();

  if (!logs.length) {
    const empty = document.createElement("div");

    empty.className = "diagnostics-empty";
    empty.textContent = "目前沒有診斷紀錄。";
    list.appendChild(empty);
  }

  logs.forEach((log) => {
    const item = document.createElement("div");
    const meta = document.createElement("div");
    const message = document.createElement("div");
    const details = document.createElement("pre");

    item.className = `diagnostics-item ${log.level || "info"}`;
    meta.className = "diagnostics-meta";
    message.className = "diagnostics-message";
    details.className = "diagnostics-details";

    meta.textContent = `${new Date(log.at).toLocaleString("zh-TW")} · ${log.level} · ${log.event}`;
    message.textContent = log.message || "";
    details.textContent = JSON.stringify(log.details || {}, null, 2);

    item.append(meta, message, details);
    list.appendChild(item);
  });

  header.append(title, closeButton);
  panel.append(header, list);
  modal.appendChild(panel);
  document.body.appendChild(modal);
}

boot();

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && nextRefreshAt && Date.now() >= nextRefreshAt.getTime()) {
    refreshCurrentGames();
  }
});
