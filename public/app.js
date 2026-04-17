window.accept = function () {
  document.getElementById("modal").style.display = "none";
};

function addMsg(text, type) {
  const div = document.createElement("div");
  div.className = "msg " + type;
  div.innerText = text;
  document.getElementById("chat").appendChild(div);
}

function addHospitalLink() {
  const link = document.createElement("a");
  link.href = "https://www.google.com/maps/search/%E9%86%AB%E9%99%A2+%E8%87%BA%E5%8C%97";
  link.target = "_blank";
  link.innerText = "🏥 點擊查看附近醫院 / 診所";
  link.style.display = "block";
  link.style.marginTop = "8px";
  document.getElementById("chat").appendChild(link);
}

function setLoading(show) {
  document.getElementById("loading").style.display =
    show ? "block" : "none";
}

window.send = async function () {
  const input = document.getElementById("input");
  const text = input.value;

  if (!text) return;

  addMsg(text, "user");
  input.value = "";

  setLoading(true);

  try {
    const res = await fetch("/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text })
    });

    const data = await res.json();

    addMsg(data.reply, "ai");

    // 👉 強制加醫院轉介
    addHospitalLink();

  } catch (err) {
    addMsg("系統錯誤，請稍後再試", "ai");
  }

  setLoading(false);
};
