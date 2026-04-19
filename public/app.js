// =======================
// 初始化
// =======================
window.onload = () => {
  initParticles();
  loadGames();
};

const chat = document.getElementById("chat");
const gamesDiv = document.getElementById("games");

// =======================
// UI
// =======================
function addUser(t){
  const d=document.createElement("div");
  d.className="user";
  d.innerText=t;
  chat.appendChild(d);
}

function addAI(t){
  const d=document.createElement("div");
  d.className="card";
  d.innerText=t;
  chat.appendChild(d);
}

function addYT(game){
  const a=document.createElement("a");
  a.className="yt";
  a.href=`https://www.youtube.com/results?search_query=${encodeURIComponent(game+"攻略")}`;
  a.target="_blank";
  a.innerText="🎥 YouTube攻略";
  chat.appendChild(a);
}

// =======================
// 🎯 遊戲名稱
// =======================
function extractGame(text){
  return text;
}

// =======================
// 📚 Wiki
// =======================
async function getWiki(game){
  try{
    const r=await fetch(`https://zh.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(game)}`);
    const d=await r.json();
    if(d.extract) addAI("📚 "+d.extract);
  }catch{}
}

// =======================
// 🔥 Steam完整流程
// =======================
async function getSteamData(game){

  try{

    // ① 搜尋 appId
    const search = await fetch(`/steam/search?game=${encodeURIComponent(game)}`);
    const gameData = await search.json();

    if(!gameData){
      addAI("⚠️ Steam找不到此遊戲");
      return;
    }

    const appid = gameData.id;

    addAI(`🎮 Steam：${gameData.name}`);

    // ② 評分
    const summaryRes = await fetch(`/steam/summary?appid=${appid}`);
    const summary = await summaryRes.json();

    if(summary){
      addAI(`⭐ 好評率：${summary.review_score_desc} (${summary.total_reviews} reviews)`);
    }

    // ③ 評論
    const reviewRes = await fetch(`/steam/reviews?appid=${appid}`);
    const reviewData = await reviewRes.json();

    if(reviewData && reviewData.reviews){
      const texts = reviewData.reviews.map(r=>r.review);
      addAI("🗣️ Steam玩家評論：\n- "+texts.join("\n- "));
    }

  }catch{
    addAI("⚠️ Steam載入失敗");
  }
}

// =======================
// 🚀 send
// =======================
window.send = async function(){

  const input=document.getElementById("input");
  const text=input.value.trim();
  if(!text) return;

  addUser(text);
  input.value="";

  try{

    const r=await fetch("/chat",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({message:text})
    });

    const d=await r.json();

    // ❗ 保留原文（不強制翻譯）
    addAI("🤖 "+d.reply);

    await getWiki(text);
    await getSteamData(text);
    addYT(text);

  }catch{
    addAI("⚠️ error");
  }
};

// =======================
// 🎆 粒子（保證顯示）
// =======================
function initParticles(){

  const canvas=document.getElementById("bg");
  const ctx=canvas.getContext("2d");

  function resize(){
    canvas.width=window.innerWidth;
    canvas.height=window.innerHeight;
  }
  resize();
  window.addEventListener("resize",resize);

  const p=[];
  for(let i=0;i<120;i++){
    p.push({
      x:Math.random()*canvas.width,
      y:Math.random()*canvas.height,
      dx:(Math.random()-0.5),
      dy:(Math.random()-0.5),
      r:Math.random()*2+1
    });
  }

  function animate(){
    ctx.clearRect(0,0,canvas.width,canvas.height);

    for(let i of p){
      i.x+=i.dx;
      i.y+=i.dy;

      if(i.x<0||i.x>canvas.width) i.dx*=-1;
      if(i.y<0||i.y>canvas.height) i.dy*=-1;

      ctx.fillStyle="cyan";
      ctx.beginPath();
      ctx.arc(i.x,i.y,i.r,0,Math.PI*2);
      ctx.fill();
    }

    requestAnimationFrame(animate);
  }

  animate();
}

// =======================
// 🎮 熱門遊戲
// =======================
function loadGames(){

  const list=["Elden Ring","Cyberpunk 2077","GTA V"];

  list.forEach(g=>{
    const d=document.createElement("div");
    d.className="game";
    d.innerText=g;
    d.onclick=()=>{
      document.getElementById("input").value=g;
      send();
    };
    gamesDiv.appendChild(d);
  });
}
