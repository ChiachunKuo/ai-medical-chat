function accept() {
  document.getElementById("modal").style.display = "none";
}

function addMsg(text, type) {
  const div = document.createElement("div");
  div.className = "msg " + type;
  div.innerText = text;
  document.getElementById("chat").appendChild(div);
}

async function send() {
  const input = document.getElementById("input");
  const text = input.value;

  if (!text) return;

  addMsg(text, "user");
  input.value = "";

  const res = await fetch("/chat", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({ message: text })
  });

  const data = await res.json();
  addMsg(data.reply, "ai");

  // 🏥 自動加入掛號提示
  addMsg("👉 建議可前往附近醫院，請點下方開啟地圖搜尋", "ai");

  const link = document.createElement("a");
  link.innerText = "📍 開啟 Google Maps 搜尋附近醫院";
  link.href = "https://www.google.com/maps/search/hospital+near+me";
  link.target = "_blank";

  document.getElementById("chat").appendChild(link);
}