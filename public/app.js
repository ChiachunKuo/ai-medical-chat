document.addEventListener("DOMContentLoaded", () => {
  initParticles();
  loadGames();
});

const chat = document.getElementById("chat");

// =======================
// 打字動畫
// =======================
function typeAI(text) {
  const d = document.createElement("div");
  d.className = "card typing";
  chat.appendChild(d);

  let i = 0;
  function t() {
    if (i < text.length) {
      d.innerText += text[i++];
      chat.scrollTop = chat.scrollHeight;
      setTimeout(t, 12);
    } else {
      d.classList.remove("typing");
    }
  }
  t();
}

// =======================
// 粒子（保證顯示）
// =======================
function initParticles() {
  const canvas = document.getElementById("bg");
  const ctx = canvas.getContext("2d");

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener("resize", resize);

  const particles = Array.from({ length: 120 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    vx: (Math.random() - 0.5) * 1.2,
    vy: (Math.random() - 0.5) * 1.2
  }));

  let mouse = { x: 0, y: 0 };
  window.addEventListener("mousemove", e => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  });

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;

      const dx = mouse.x - p.x;
      const dy = mouse.y - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 120) {
        p.x += dx * 0.01;
        p.y += dy * 0.01;
      }

      ctx.fillStyle = "cyan";
      ctx.fillRect(p.x, p.y, 2, 2);
    });

    requestAnimationFrame(draw);
  }

  draw();
}

// =======================
// Steam（價格+評分）
// =======================
async function getSteam(game) {
  const s = await fetch(`/steam/search?game=${game}`);
  const g = await s.json();
  if (!g) {
    typeAI("找不到遊戲資料");
    return;
  }

  const id = g.id;

  const det = await fetch(`/steam/details?appid=${id}`);
  const d = await det.json();

  typeAI(`🎮 ${d.name}`);
  typeAI(`💰 ${d.is_free ? "免費" : d.price_overview?.final_formatted || "無資料"}`);

  const rev = await fetch(`/steam/reviews?appid=${id}`);
  const r = await rev.json();

  if (r.query_summary) {
    typeAI(`⭐ ${r.query_summary.review_score_desc}`);
    typeAI(`👍 ${r.query_summary.total_positive} / 👎 ${r.query_summary.total_negative}`);
  }
}

// =======================
// 發送
// =======================
window.send = async () => {
  const input = document.getElementById("input");
  const text = input.value.trim();
  if (!text) return;

  const u = document.createElement("div");
  u.className = "user";
  u.innerText = text;
  chat.appendChild(u);

  input.value = "";

  typeAI("⏳ AI 分析中...");

  const r = await fetch("/chat", {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({ message: text })
  });

  const d = await r.json();

  typeAI(d.reply);

  await getSteam(text);
};

// =======================
// 熱門榜
// =======================
async function loadGames() {
  const res = await fetch("/games");
  const list = await res.json();

  const div = document.getElementById("games");

  list.forEach(g => {
    const el = document.createElement("div");
    el.className = "game";
    el.innerText = g;

    el.onclick = () => {
      document.getElementById("input").value = g;
      send();
    };

    div.appendChild(el);
  });
}
