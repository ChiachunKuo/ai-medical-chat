window.onload = () => {
  initParticles();
  loadGames();
};

const chat = document.getElementById("chat");

// =======================
// UI
// =======================
function addUser(t){
  const d=document.createElement("div");
  d.className="user";
  d.innerText=t;
  chat.appendChild(d);
}

// 🧠 打字機效果
function typeAI(text){
  const d=document.createElement("div");
  d.className="card typing";
  chat.appendChild(d);

  let i=0;
  function typing(){
    if(i<text.length){
      d.innerText += text[i++];
      setTimeout(typing,15);
    }else{
      d.classList.remove("typing");
    }
  }
  typing();
}

// =======================
// 🎥 YouTube
// =======================
function addYT(game){
  const a=document.createElement("a");
  a.className="yt";
  a.href=`https://www.youtube.com/results?search_query=${encodeURIComponent(game+" gameplay")}`;
  a.target="_blank";
  a.innerText="🎥 Gameplay";
  chat.appendChild(a);
}

// =======================
// 📚 Wiki
// =======================
async function getWiki(game){
  try{
    const r=await fetch(`https://zh.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(game)}`);
    const d=await r.json();
    if(d.extract) typeAI("📚 "+d.extract);
  }catch{}
}

// =======================
// 🔥 Steam V9（完整）
// =======================
async function getSteam(game){

  try{
    const s=await fetch(`/steam/search?game=${encodeURIComponent(game)}`);
    const g=await s.json();
    if(!g){ typeAI("❌ Steam找不到"); return;}

    const appid=g.id;

    // details
    const det=await fetch(`/steam/details?appid=${appid}`);
    const data=await det.json();

    typeAI(`🎮 ${data.name}`);
    typeAI(`💰 ${data.is_free ? "Free" : data.price_overview?.final_formatted || "N/A"}`);

    // 評論
    const rev=await fetch(`/steam/reviews?appid=${appid}`);
    const rdata=await rev.json();

    const reviews=rdata.reviews.map(r=>r.review);

    // ⭐ 情緒分析（簡單版）
    let pos=0,neg=0;
    rdata.reviews.forEach(r=>{
      if(r.voted_up) pos++;
      else neg++;
    });

    typeAI(`⭐ 👍${pos} / 👎${neg}`);

    typeAI("🗣️ "+reviews.join("\n\n"));

  }catch{
    typeAI("Steam error");
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

    typeAI("🤖 "+d.reply);

    await getWiki(text);
    await getSteam(text);
    addYT(text);

  }catch{
    typeAI("error");
  }
};

// =======================
// 🎆 粒子（連線版）
// =======================
function initParticles(){

  const c=document.getElementById("bg");
  const ctx=c.getContext("2d");

  function resize(){
    c.width=window.innerWidth;
    c.height=window.innerHeight;
  }
  resize();
  window.addEventListener("resize",resize);

  const p=[];
  for(let i=0;i<100;i++){
    p.push({
      x:Math.random()*c.width,
      y:Math.random()*c.height,
      dx:(Math.random()-0.5),
      dy:(Math.random()-0.5)
    });
  }

  function draw(){
    ctx.clearRect(0,0,c.width,c.height);

    // 點
    p.forEach(a=>{
      a.x+=a.dx;
      a.y+=a.dy;

      ctx.fillStyle="cyan";
      ctx.fillRect(a.x,a.y,2,2);
    });

    // 線（距離連線）
    for(let i=0;i<p.length;i++){
      for(let j=i+1;j<p.length;j++){
        const dx=p[i].x-p[j].x;
        const dy=p[i].y-p[j].y;
        const dist=Math.sqrt(dx*dx+dy*dy);

        if(dist<100){
          ctx.strokeStyle="rgba(0,255,255,0.2)";
          ctx.beginPath();
          ctx.moveTo(p[i].x,p[i].y);
          ctx.lineTo(p[j].x,p[j].y);
          ctx.stroke();
        }
      }
    }

    requestAnimationFrame(draw);
  }

  draw();
}

// =======================
// 🎮 games
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
