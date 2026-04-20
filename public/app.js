const chat = document.getElementById("chat");
const historyDiv = document.getElementById("history");

let history = JSON.parse(localStorage.getItem("history")) || [];

function saveHistory(text){
  history.unshift(text);
  if(history.length > 10) history.pop();
  localStorage.setItem("history", JSON.stringify(history));
  renderHistory();
}

function renderHistory(){
  historyDiv.innerHTML = "";
  history.forEach(h=>{
    const d = document.createElement("div");
    d.innerText = h;
    d.onclick = ()=> document.getElementById("input").value = h;
    historyDiv.appendChild(d);
  });
}

renderHistory();

// UI
function add(role, text){
  const d = document.createElement("div");
  d.className = role;
  d.innerText = text;
  chat.appendChild(d);
}

// AI
async function send(){
  const input = document.getElementById("input");
  const text = input.value.trim();
  if(!text) return;

  add("user", text);
  add("ai", "⏳ 分析中...");

  saveHistory(text);

  const r = await fetch("/chat",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body: JSON.stringify({message:text})
  });

  const d = await r.json();

  chat.lastChild.remove();
  add("ai", d.reply);
}

// 其他功能
function openMap(){
  window.open("https://www.google.com/maps/search/醫院");
}

function clearChat(){
  chat.innerHTML = "";
}

function agree(){
  document.getElementById("consent").style.display = "none";
}

function leave(){
  window.location.href = "https://google.com";
}
