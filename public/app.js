// 🔐 等 DOM 載入後綁定（關鍵）
window.addEventListener("DOMContentLoaded", () => {

  document.getElementById("agreeBtn").onclick = () => {
    document.getElementById("modal").style.display = "none";
  };

  document.getElementById("declineBtn").onclick = () => {
    window.location.href = "https://www.google.com";
  };

});

// 💬 UI
function addMsg(text, type) {
  const div = document.createElement("div");
  div.className = "msg " + type;
  div.innerText = text;
  document.getElementById("chat").appendChild(div);
}

// 🏥 按鈕（點擊才開）
function addHospitalButton(type) {
  const btn = document.createElement("button");

  btn.innerText =
    type === "emergency"
      ? "🚨 查看附近急診醫院"
      : "🏥 查看附近診所";

  btn.style.marginTop = "10px";

  btn.onclick = () => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition((pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;

      const keyword = type === "emergency" ? "hospital" : "clinic";

      const url = `https://www.google.com/maps/search/${keyword}/@${lat},${lng},15z`;

      window.open(url, "_blank");
    });
  };

  document.getElementById("chat").appendChild(btn);
}

// 判斷
function handleResult(text) {

  if (text.includes("可觀察")) {
    addMsg("👉 建議休息、多喝水", "ai");
  }

  if (text.includes("需要")) {
    addMsg("👉 建議就醫", "ai");
    addHospitalButton("normal");
  }

  if (text.includes("緊急") || text.includes("危急")) {
    addMsg("🚨 請立即急診", "ai");
    addHospitalButton("emergency");
  }
}

// 發送
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
