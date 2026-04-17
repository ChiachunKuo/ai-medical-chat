// 🔐 切結書
window.agree = function () {
  document.getElementById("modal").style.display = "none";
};

window.decline = function () {
  window.location.href = "https://www.google.com";
};

// 💬 UI
function addMsg(text, type) {
  const div = document.createElement("div");
  div.className = "msg " + type;
  div.innerText = text;
  document.getElementById("chat").appendChild(div);
}

// 🏥 根據嚴重程度推薦
function openNearby(type) {
  if (!navigator.geolocation) return fallback(type);

  navigator.geolocation.getCurrentPosition((pos) => {
    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;

    let keyword = "clinic";
    if (type === "emergency") keyword = "hospital";
    if (type === "normal") keyword = "clinic";

    const url = `https://www.google.com/maps/search/${keyword}/@${lat},${lng},15z`;

    window.open(url, "_blank");
  }, () => fallback(type));
}

function fallback(type) {
  const keyword = type === "emergency" ? "hospital" : "clinic";
  window.open(`https://www.google.com/maps/search/${keyword}+near+me`);
}

// 🔍 判斷 AI 回應
function handleResult(text) {

  if (text.includes("可觀察")) {
    addMsg("👉 建議先休息、多喝水、觀察症狀變化", "ai");
  }

  if (text.includes("需要")) {
    addMsg("👉 建議儘早前往診所就醫", "ai");
    openNearby("normal");
  }

  if (text.includes("緊急") || text.includes("危急")) {
    addMsg("🚨 請立即前往急診", "ai");
    openNearby("emergency");
  }
}

// 🚀 發送
let loading = false;

window.send = async function () {
  if (loading) return;

  const input = document.getElementById("input");
  const text = input.value.trim();
  if (!text) return;

  loading = true;

  addMsg(text, "user");
  input.value = "";

  try {
    const res = await fetch("/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text })
    });

    const data = await res.json();

    addMsg(data.reply, "ai");

    handleResult(data.reply);

  } catch {
    addMsg("系統錯誤", "ai");
  }

  loading = false;
};
