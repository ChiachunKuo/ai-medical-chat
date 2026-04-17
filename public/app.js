window.accept = function () {
  document.getElementById("modal").style.display = "none";
};

function addMsg(text, type) {
  const div = document.createElement("div");
  div.className = "msg " + type;
  div.innerText = text;
  document.getElementById("chat").appendChild(div);
}

window.send = async function () {
  const input = document.getElementById("input");
  const text = input.value;

  if (!text) return;

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

    // 📍 附近醫院引導
    const link = document.createElement("a");
    link.href = "https://www.google.com/maps/search/hospital+near+me";
    link.target = "_blank";
    link.innerText = "📍 點我查看附近醫院";

    document.getElementById("chat").appendChild(link);

  } catch (err) {
    addMsg("系統錯誤，請稍後再試", "ai");
  }
};
