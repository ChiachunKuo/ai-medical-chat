// =======================
// 初始化確保 DOM ready
// =======================
window.onload = () => {

  initParticles();
  loadGames();

};

// =======================
// 🎆 粒子（完全修復版）
// =======================
function initParticles() {

  const canvas = document.getElementById("bg");
  if (!canvas) {
    console.error("canvas not found");
    return;
  }

  const ctx = canvas.getContext("2d");

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  resize();
  window.addEventListener("resize", resize);

  const particles = [];

  for (let i = 0; i < 120; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      dx: (Math.random() - 0.5) * 1,
      dy: (Math.random() - 0.5) * 1,
      r: Math.random() * 2 + 1
    });
  }

  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let p of particles) {

      p.x += p.dx;
      p.y += p.dy;

      if (p.x < 0 || p.x > canvas.width) p.dx *= -1;
      if (p.y < 0 || p.y > canvas.height) p.dy *= -1;

      ctx.fillStyle = "rgba(0,255,255,0.8)";
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }

    requestAnimationFrame(animate);
  }

  animate();
}

// =======================
// UI
// =======================
const chat = document.getElementById("chat");
const gamesDiv = document.getElementById("games");

function addUser(t) {
  const d = document.createElement("div");
  d.className = "user";
  d.innerText = t;
  chat.appendChild(d);
}

function addAI(t) {
  const d = document.createElement("div");
  d.className = "card";
  d.innerText = t;
  chat.appendChild(d);
}

function addYT(game) {
  const a = document.createElement("a");
  a.className = "yt";
  a.href = `https://www.youtube.com/results?search_query=${encodeURIComponent(game + "攻略")}`;
  a.target = "_blank";
  a.innerText = "🎥 YouTube攻略";
  chat.appendChild(a);
}

// =======================
// 🎯 遊戲名稱
// =======================
function extractGame(text) {
  const list = ["Elden Ring","Cyberpunk 2077","GTA V","Minecraft","原神"];
  for (let g of list) {
    if (text.toLowerCase().includes(g.toLowerCase())) return g;
  }
  return text;
}

// =======================
// 📚 Wiki
// =======================
async function getWiki(game) {
  try {
    const res = await fetch(`https://zh.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(game)}`);
    const data = await res.json();

    if (data.extract) {
      addAI("📚 Wiki: " + data.extract);
    }
  } catch {}
}

// =======================
// ⭐ Steam 真實評論（重點）
// =======================
async function getSteamReviews(game) {

  try {

    // ⚠️ Steam沒有官方公開評論API
    // 這裡用 unofficial endpoint
    const url = `https://store.steampowered.com/appreviews/1245620?json=1`;

    const res = await fetch(url);
    const data = await res.json();

    if (data.reviews && data.reviews.length > 0) {

      const reviews = data.reviews.slice(0, 3).map(r => r.review);

      addAI("⭐ Steam玩家評論：\n- " + reviews.join("\n- "));
    }

  } catch {
    addAI("⭐ 無法取得Steam評論");
  }
}

// =======================
// 🚀 send
// =======================
window.send = async function () {

  const input = document.getElementById("input");
  const text = input.value.trim();
  if (!text) return;

  addUser(text);
  input.value = "";

  const game = extractGame(text);

  try {

    const res = await fetch("/chat", {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({message:text})
    });

    const data = await res.json();

    addAI("🤖 " + data.reply);

    await getWiki(game);
    await getSteamReviews(game);
    addYT(game);

  } catch {
    addAI("⚠️ error");
  }
};

// =======================
// 🎮 熱門遊戲
// =======================
function loadGames() {

  const games = [
    {name:"Elden Ring",img:"https://cdn.cloudflare.steamstatic.com/steam/apps/1245620/header.jpg"},
    {name:"Cyberpunk 2077",img:"https://cdn.cloudflare.steamstatic.com/steam/apps/1091500/header.jpg"}
  ];

  games.forEach(g => {

    const d = document.createElement("div");
    d.innerHTML = `<img src="${g.img}" style="width:100%"><div>${g.name}</div>`;

    d.onclick = () => {
      document.getElementById("input").value = g.name;
      send();
    };

    gamesDiv.appendChild(d);
  });
}
