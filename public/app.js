const chat = document.getElementById("chat");
const historyDiv = document.getElementById("history");

let history = JSON.parse(localStorage.getItem("history")) || [];

// 🔥 顯示紀錄
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

// 🧠 儲存紀錄
function saveHistory(text){
  history.unshift(text);
  if(history.length > 10) history.pop();
  localStorage.setItem("history", JSON.stringify(history));
  renderHistory();
}

// 💬 UI
function add(role,text){
  const d=document.createElement("div");
  d.className=role;
  d.innerText=text;
  chat.appendChild(d);
}

// 🚑 AI
async function send(){
  const input=document.getElementById("input");
  const text=input.value.trim();
  if(!text) return;

  add("user",text);
  saveHistory(text);

  const r=await fetch("/chat",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({message:text})
  });

  const d=await r.json();
  add("ai",d.reply);
}

// 🏥 醫院搜尋（依症狀）
function openHospital(){
  const last = history[0] || "醫院";
  const url = `https://www.google.com/maps/search/${encodeURIComponent(last + " 醫院 診所")}`;
  window.open(url);
}

// 🧹 清除紀錄
function clearHistory(){
  history = [];
  localStorage.removeItem("history");
  renderHistory();
}
