function agree(){
  document.getElementById("consent").style.display="none";
  document.getElementById("app").style.display="block";
}

function leave(){
  window.location.href="https://www.google.com";
}

async function send(){
  const input = document.getElementById("input");
  const text = input.value;

  add("user", text);

  const r = await fetch("/chat",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body: JSON.stringify({message:text})
  });

  const d = await r.json();
  add("ai", d.reply);

  // 導向地圖
  window.open(`https://www.google.com/maps/search/${encodeURIComponent("醫院")}`);
}

function add(role, text){
  const div = document.createElement("div");
  div.className = role;
  div.innerText = text;
  document.getElementById("chat").appendChild(div);
}
