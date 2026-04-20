window.onload = () => {
  initParticles();
  loadGames();
};

const chat = document.getElementById("chat");

// =======================
// 打字機
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
      setTimeout(t, 10);
    } else {
      d.classList.remove("typing");
    }
  }
  t();
}

// =======================
// 粒子（100%顯示）
// =======================
function initParticles() {
  const c = document.getElementById("bg");
  const ctx = c.getContext("2d");

  function resize() {
    c.width = window.innerWidth;
    c.height = window.innerHeight;
  }
  resize();
  window.onresize = resize;

  let p = [];
  for (let i = 0; i < 120; i++) {
    p.push({
      x: Math.random() * c.width,
      y: Math.random() * c.height,
      dx: (Math.random() - 0.5),
      dy: (Math.random() - 0.5)
    });
  }

  function draw() {
    ctx.clearRect(0, 0, c.width, c.height);

    for (let i = 0; i < p.length; i++) {
      let a = p[i];
      a.x += a.dx;
      a.y += a.dy;

      ctx.fillStyle = "cyan";
      ctx.fillRect(a.x, a.y, 2, 2);

      // 連線
      for (let j = i + 1; j < p.length; j++) {
        let b = p[j];
        let dx = a.x - b.x;
        let dy = a.y - b.y;
        let dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 100) {
          ctx.strokeStyle = "rgba(0,255,255,0.2)";
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }

    requestAnimationFrame(draw);
  }

  draw();
}

// =======================
// Steam
// =======================
async function getSteam(game) {

  const s = await fetch(`/steam/search?game=${game}`);
  const g = await s.json();
  if (!g) { typeAI("找不到Steam遊戲"); return; }

  const id = g.id;

  const det = await fetch(`/steam/details?appid=${id}`);
  const d = await det.json();

  typeAI(`🎮 ${d.name}`);
  typeAI(`💰 ${d.is_free ? "免費" : d.price_overview?.final_formatted}`);

  const rev = await fetch(`/steam/reviews?appid=${id}`);
  const r = await rev.json();

  const sum = r.query_summary;
  if (sum) {
    typeAI(`⭐ ${sum.review_score_desc}`);
    typeAI(`👍 ${sum.total_positive} / 👎 ${sum.total_negative}`);
  }
}

// =======================
// send
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

  typeAI("⏳ AI思考中...");

  const r = await fetch("/chat", {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({message: text})
  });

  const d = await r.json();

  typeAI(d.reply);

  await getSteam(text);
};

// =======================
// 熱門遊戲
// =======================
async function loadGames() {

  const res = await fetch("/games");
  const list = await res.json();

  const div = document.getElementById("games");

  list.forEach(g => {
    const d = document.createElement("div");
    d.className = "game";
    d.innerText = g;

    d.onclick = () => {
      document.getElementById("input").value = g;
      send();
    };

    div.appendChild(d);
  });
}
