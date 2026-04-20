document.addEventListener("DOMContentLoaded", () => {
  initParticles();
});

function agree(){
  document.getElementById("consent").style.display="none";
}

function leave(){
  window.location.href="https://google.com";
}

const chat = document.getElementById("chat");

function add(role, text){
  const d = document.createElement("div");
  d.className = role==="user"?"user":"card";
  d.innerText = text;
  chat.appendChild(d);
}

// AI
async function send(){
  const input = document.getElementById("input");
  const text = input.value;

  add("user", text);

  const r = await fetch("/chat",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body: JSON.stringify({message:text})
  });

  const d = await r.json();
  add("ai", d.reply);

  window.open("https://www.google.com/maps/search/醫院");
}

// 粒子
function initParticles(){
  const c = document.getElementById("bg");
  const ctx = c.getContext("2d");

  function resize(){
    c.width = window.innerWidth;
    c.height = window.innerHeight;
  }
  resize();
  window.onresize = resize;

  let p = Array.from({length:100},()=>({
    x:Math.random()*c.width,
    y:Math.random()*c.height,
    vx:(Math.random()-0.5),
    vy:(Math.random()-0.5)
  }));

  function draw(){
    ctx.clearRect(0,0,c.width,c.height);
    p.forEach(a=>{
      a.x+=a.vx;
      a.y+=a.vy;
      ctx.fillStyle="cyan";
      ctx.fillRect(a.x,a.y,2,2);
    });
    requestAnimationFrame(draw);
  }
  draw();
}
