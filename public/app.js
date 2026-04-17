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

// 🚑 真正附近醫院（GPS）
function addNearbyHospital() {
  if (!navigator.geolocation) {
    fallback();
    return;
  }

  navigator.geolocation.getCurrentPosition((pos) => {
    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;

    const url = `https://www.google.com/maps/search/hospital/@${lat},${lng},15z`;

    const link = document.createElement("a");
    link.href = url;
    link.target = "_blank";
    link.innerText = "🏥 查看你附近醫院 / 診所";
    link.style.display = "block";
    link.style.marginTop = "10px";

    document.getElementById("chat").appendChild(link);

  }, fallback);
}

function fallback() {
  const link = document.createElement("a");
  link.href = "https://www.google.com/maps/search/hospital+near+me";
  link.target = "_blank";
  link.innerText = "🏥 查看附近醫院";
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

  setLoading(true);

  try {
    const res = await fetch("/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text })
    });

    const data = await res.json();

    addMsg(data.reply, "ai");

    addNearbyHospital();

  } catch (err) {
    addMsg("系統錯誤，請稍後再試", "ai");
  }

  setLoading(false);
  loading = false;
};
