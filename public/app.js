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

// 🏥 建立「點擊式」按鈕（重點）
function addHospitalButton(type) {
  const btn = document.createElement("button");

  if (type === "emergency") {
    btn.innerText = "🚨 查看附近急診醫院";
    btn.style.background = "red";
  } else {
    btn.innerText = "🏥 查看附近診所";
  }

  btn.style.marginTop = "10px";

  btn.onclick = () => {
    if (!navigator.geolocation) {
      fallback(type);
      return;
    }

    navigator.geolocation.getCurrentPosition((pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;

      let keyword = "clinic";
      if (type === "emergency") keyword = "hospital";

      const url = `https://www.google.com/maps/search/${keyword}/@${lat},${lng},15z`;

      window.open(url, "_blank");
    }, () => fallback(type));
  };

  document.getElementById("chat").appendChild(btn);
}

// fallback
function fallback(type) {
  const keyword = type === "emergency" ? "hospital" : "clinic";
  window.open(`https://www.google.com/maps/search/${keyword}+near+me`);
}

// 🔍 判斷 AI 結果
function handleResult(text) {

  if (text.includes("可觀察")) {
    addMsg("👉 建議先休息、多喝水、觀察症狀", "ai");
  }

  if (text.includes("需要")) {
    addMsg("👉 建議安排門診就醫", "ai");
    addHospitalButton("normal"); // 🔥 按鈕
  }

  if (text.includes("緊急") || text.includes("危急")) {
    addMsg("🚨 請立即前往急診", "ai");
    addHospitalButton("emergency"); // 🔥 按鈕
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
