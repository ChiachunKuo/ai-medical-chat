window.onload = () => {
  initParticles();
  loadGames();
  initVoice();
};

const chat = document.getElementById("chat");

// =======================
// 打字機
// =======================
function typeAI(text){
  const d = document.createElement("div");
  d.className = "card";
  chat.appendChild(d);

  let i=0;
  function t(){
    if(i<text.length){
      d.innerHTML += text[i++];
      chat.scrollTop = chat.scrollHeight;
      setTimeout(t, 8);
    }
  }
  t();
}

// =======================
// Steam（🔥修正版）
// =======================
async function getSteam(game){

  const s = await fetch(`/steam/search?game=${game}`);
  const g = await s.json();

  if(!g){
    typeAI("❌ 找不到遊戲");
    return;
  }

  const id = g.id;

  // 詳細資料
  const det = await fetch(`/steam/details?appid=${id}`);
  const d = await det.json();

  typeAI(`🎮 ${d.name}`);

  // ✅ 價格修正
  if(d.is_free){
    typeAI(`💰 免費遊戲`);
  }else{
    typeAI(`💰 ${d.price_overview?.final_formatted || "無價格資料"}`);
  }

  typeAI(`📅 ${d.release_date?.date || "未知"}`);

  // 圖片
  const img = document.createElement("img");
  img.src = d.header_image;
  img.style.width = "100%";
  img.style.borderRadius = "10px";
  img.style.margin = "10px 0";
  chat.appendChild(img);

  // =======================
  // 🔥 評論（正確寫法）
  // =======================
  const rev = await fetch(`/steam/reviews?appid=${id}`);
  const r = await rev.json();

  const summary = r.query_summary;

  if(summary){
    const pos = summary.total_positive;
    const neg = summary.total_negative;
    const desc = summary.review_score_desc;

    typeAI(`⭐ ${desc}`);
    typeAI(`👍 ${pos} / 👎 ${neg}`);
  }

  // 留言
  if(r.reviews){
    const texts = r.reviews.slice(0,3).map(x=>x.review);
    typeAI(texts.join("<br><br>"));
  }
}

// =======================
// send
// =======================
window.send = async ()=>{
  const input = document.getElementById("input");
  const text = input.value.trim();

  if(!text) return;

  const u = document.createElement("div");
  u.className = "user";
  u.innerText = text;
  chat.appendChild(u);

  input.value = "";

  typeAI("⏳ 加載中...");

  const r = await fetch("/chat",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({message:text})
  });

  const d = await r.json();

  typeAI("🤖 "+d.reply);
  typeAI("🎯 類型："+d.type);

  await getSteam(text);
};

// =======================
// 粒子（🔥100%顯示版）
// =======================
function initParticles(){
  const c = document.getElementById("bg");
  const ctx = c.getContext("2d");

  function resize(){
    c.width = window.innerWidth;
    c.height = window.innerHeight;
  }
  resize();
  window.onresize = resize;

  let particles = [];

  for(let i=0;i<150;i++){
    particles.push({
      x:Math.random()*c.width,
      y:Math.random()*c.height,
      vx:(Math.random()-0.5)*1.5,
      vy:(Math.random()-0.5)*1.5
    });
  }

  function draw(){
    ctx.clearRect(0,0,c.width,c.height);

    particles.forEach(p=>{
      p.x += p.vx;
      p.y += p.vy;

      if(p.x<0||p.x>c.width) p.vx*=-1;
      if(p.y<0||p.y>c.height) p.vy*=-1;

      ctx.fillStyle="rgba(0,255,255,0.7)";
      ctx.beginPath();
      ctx.arc(p.x,p.y,2,0,Math.PI*2);
      ctx.fill();
    });

    requestAnimationFrame(draw);
  }

  draw();
}

// =======================
function loadGames(){
  const list=["Elden Ring","Cyberpunk 2077","GTA V"];
  const div=document.getElementById("games");

  list.forEach(g=>{
    const d=document.createElement("div");
    d.className="game";
    d.innerText=g;

    d.onclick=()=>{
      document.getElementById("input").value=g;
      send();
    };

    div.appendChild(d);
  });
}

// =======================
function initVoice(){
  if(!('webkitSpeechRecognition' in window)) return;

  const rec=new webkitSpeechRecognition();
  rec.lang="zh-TW";

  window.startVoice=()=>rec.start();

  rec.onresult=(e)=>{
    document.getElementById("input").value =
      e.results[0][0].transcript;
  };
}
