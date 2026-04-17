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
  link.href = "https://www.google.com/maps/search/hospital+near+me";
  link.target = "_blank";
  link.innerText = "🏥 點擊查看附近醫院 / 診所";
  link.style.display = "block";
  link.style.marginTop = "10px";
  document.getElementById("chat").appendChild(link);
}

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

    // 🚨 判斷是否需要醫院
    if (
      data.reply.includes("需要就醫") ||
      data.reply.includes("緊急") ||
      data.reply.includes("高")
    ) {
      addHospitalLink();
    }

  } catch (err) {
    addMsg("系統錯誤", "ai");
  }

  loading = false;
};
