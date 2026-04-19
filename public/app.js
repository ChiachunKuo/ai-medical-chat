window.onload=()=>{
  initParticles();
  loadGames();
  initVoice();
};

const chat=document.getElementById("chat");

// =======================
// 打字機 + 自動滾動
// =======================
function typeAI(text){
  const d=document.createElement("div");
  d.className="card";
  chat.appendChild(d);

  let i=0;
  function t(){
    if(i<text.length){
      d.innerText+=text[i++];
      chat.scrollTop=chat.scrollHeight;
      setTimeout(t,10);
    }
  }
  t();
}

// =======================
// 語音輸入
// =======================
function initVoice(){
  if(!('webkitSpeechRecognition' in window)) return;

  const rec=new webkitSpeechRecognition();
  rec.lang="zh-TW";

  window.startVoice=()=>{
    rec.start();
  };

  rec.onresult=(e)=>{
    document.getElementById("input").value=e.results[0][0].transcript;
  };
}

// =======================
// Steam V10
// =======================
async function getSteam(game){

  const s=await fetch(`/steam/search?game=${game}`);
  const g=await s.json();
  if(!g){typeAI("找不到Steam");return;}

  const id=g.id;

  const det=await fetch(`/steam/details?appid=${id}`);
  const d=await det.json();

  typeAI(`🎮 ${d.name}`);
  typeAI(`💰 ${d.is_free?"Free":d.price_overview?.final_formatted}`);
  typeAI(`📅 ${d.release_date.date}`);

  // 圖片
  const img=document.createElement("img");
  img.src=d.header_image;
  img.style.width="100%";
  chat.appendChild(img);

  // 評論
  const rev=await fetch(`/steam/reviews?appid=${id}`);
  const r=await rev.json();

  let pos=0,neg=0;
  r.reviews.forEach(x=>x.voted_up?pos++:neg++);

  typeAI(`⭐ 👍${pos} 👎${neg}`);

  const texts=r.reviews.map(x=>x.review).slice(0,3);
  typeAI(texts.join("\n\n"));
}

// =======================
// send
// =======================
window.send=async()=>{
  const input=document.getElementById("input");
  const text=input.value.trim();
  if(!text) return;

  const u=document.createElement("div");
  u.className="user";
  u.innerText=text;
  chat.appendChild(u);

  input.value="";

  const r=await fetch("/chat",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({message:text})
  });

  const d=await r.json();

  typeAI("🤖 "+d.reply);
  typeAI("🎯 類型："+d.type);

  await getSteam(text);
};

// =======================
// 粒子（滑鼠互動）
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

  let mouse={x:0,y:0};

  window.onmousemove=e=>{
    mouse.x=e.x;
    mouse.y=e.y;
  };

  const p=[];
  for(let i=0;i<120;i++){
    p.push({
      x:Math.random()*c.width,
      y:Math.random()*c.height,
      dx:(Math.random()-0.5),
      dy:(Math.random()-0.5)
    });
  }

  function draw(){
    ctx.clearRect(0,0,c.width,c.height);

    p.forEach(a=>{
      a.x+=a.dx;
      a.y+=a.dy;

      // 吸引滑鼠
      const dx=mouse.x-a.x;
      const dy=mouse.y-a.y;
      const dist=Math.sqrt(dx*dx+dy*dy);

      if(dist<100){
        a.x+=dx*0.01;
        a.y+=dy*0.01;
      }

      ctx.fillStyle="cyan";
      ctx.fillRect(a.x,a.y,2,2);
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
