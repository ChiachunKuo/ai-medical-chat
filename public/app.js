const chat = document.getElementById("chat");
const gamesDiv = document.getElementById("games");

// =======================
// 👤 user
// =======================
function addUser(t) {
  const d = document.createElement("div");
  d.className = "user";
  d.innerText = t;
  chat.appendChild(d);
}

// =======================
// 🤖 AI（不強制翻譯）
// =======================
function addAI(t) {
  const d = document.createElement("div");
  d.className = "card";
  d.innerText = t;
  chat.appendChild(d);
}

// =======================
// 🎥 YouTube
// =======================
function addYT(game) {
  const d = document.createElement("a");
  d.className = "yt";
  d.href = `https://www.youtube.com/results?search_query=${encodeURIComponent(game + "攻略")}`;
  d.target = "_blank";
  d.innerText = `🎥 ${game} YouTube攻略`;
  chat.appendChild(d);
}

// =======================
// 🎯 遊戲辨識
// =======================
function extractGame(text) {
  const list = ["Elden Ring","Cyberpunk 2077","GTA V","League of Legends","Minecraft","原神"];
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
    const res = await fetch(
      `https://zh.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(game)}`
    );
    const data = await res.json();

    if (data.extract) {
      addAI("📚 Wiki：" + data.extract);
    }
  } catch {}
}

// =======================
// 🗣️ 評論
// =======================
function reviews(game) {
  const map = {
    "Elden Ring": ["高難度","自由探索","史詩體驗"],
    "Cyberpunk 2077": ["劇情強","畫面優","更新改善"],
    "GTA V": ["自由度高","耐玩","任務多"],
    "default": ["玩家評價良好","可玩性高","畫面佳"]
  };

  const r = map[game] || map.default;
  addAI("🗣️ 玩家評論：\n- " + r.join("\n- "));
}

// =======================
// 🎮 熱門遊戲
// =======================
function loadGames() {
  const games = [
    {name:"Elden Ring",img:"https://cdn.cloudflare.steamstatic.com/steam/apps/1245620/header.jpg"},
    {name:"Cyberpunk 2077",img:"https://cdn.cloudflare.steamstatic.com/steam/apps/1091500/header.jpg"},
    {name:"GTA V",img:"https://upload.wikimedia.org/wikipedia/en/a/a5/Grand_Theft_Auto_V.png"}
  ];

  games.forEach(g=>{
    const d=document.createElement("div");
    d.className="game";
    d.innerHTML=`<img src="${g.img}"><div>${g.name}</div>`;
    d.onclick=()=>{
      document.getElementById("input").value=g.name+" 攻略";
      send();
    };
    gamesDiv.appendChild(d);
  });
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

    // ⚠️ 不強制翻譯（保留原文）
    addAI("🤖 " + data.reply);

    await getWiki(game);
    reviews(game);
    addYT(game);

  } catch {
    addAI("⚠️ error");
  }
};

// =======================
// 🎆 粒子（修復版100%可動）
// =======================
const canvas = document.getElementById("bg");
const ctx = canvas.getContext("2d");

function resize(){
  canvas.width=window.innerWidth;
  canvas.height=window.innerHeight;
}
resize();
window.addEventListener("resize",resize);

let p=[];
for(let i=0;i<120;i++){
  p.push({
    x:Math.random()*canvas.width,
    y:Math.random()*canvas.height,
    r:Math.random()*2,
    dx:(Math.random()-0.5)*0.8,
    dy:(Math.random()-0.5)*0.8
  });
}

function animate(){
  ctx.fillStyle="rgba(0,0,0,0.35)";
  ctx.fillRect(0,0,canvas.width,canvas.height);

  for(let i of p){
    i.x+=i.dx;
    i.y+=i.dy;

    if(i.x<0||i.x>canvas.width) i.dx*=-1;
    if(i.y<0||i.y>canvas.height) i.dy*=-1;

    ctx.fillStyle="rgba(0,255,255,0.7)";
    ctx.beginPath();
    ctx.arc(i.x,i.y,i.r,0,Math.PI*2);
    ctx.fill();
  }

  requestAnimationFrame(animate);
}
animate();

loadGames();
