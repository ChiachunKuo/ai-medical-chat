window.accept = function () {
  document.getElementById("modal").style.display = "none";
};

function addMsg(text, type) {
  const div = document.createElement("div");
  div.className = "msg " + type;
  div.innerText = text;
  document.getElementById("chat").appendChild(div);
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

  } catch (err) {
    addMsg("系統錯誤，請稍後再試", "ai");
  }

  setLoading(false);
};
