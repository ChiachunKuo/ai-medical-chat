import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// =======================
// 🤖 Groq AI（繁體控制）
// =======================
app.post("/chat", async (req, res) => {
  const msg = req.body.message;

  try {
    const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: "llama3-70b-8192",
        messages: [
          {
            role: "system",
            content: "請使用繁體中文回答，若內容為英文遊戲專有名詞請保留英文，不要使用簡體中文。回答精簡。"
          },
          {
            role: "user",
            content: msg
          }
        ]
      })
    });

    const data = await r.json();
    res.json({ reply: data.choices[0].message.content });

  } catch {
    res.json({ reply: "AI 暫時無法使用" });
  }
});

// =======================
// Steam 搜尋
// =======================
app.get("/steam/search", async (req, res) => {
  const r = await fetch(`https://store.steampowered.com/api/storesearch/?term=${req.query.game}`);
  const d = await r.json();
  res.json(d.items?.[0] || null);
});

// =======================
// Steam 詳細
// =======================
app.get("/steam/details", async (req, res) => {
  const r = await fetch(`https://store.steampowered.com/api/appdetails?appids=${req.query.appid}`);
  const d = await r.json();
  res.json(d[req.query.appid].data);
});

// =======================
// Steam 評論
// =======================
app.get("/steam/reviews", async (req, res) => {
  const r = await fetch(`https://store.steampowered.com/appreviews/${req.query.appid}?json=1`);
  const d = await r.json();
  res.json(d);
});

// =======================
// 熱門遊戲（簡單榜）
// =======================
app.get("/games", (req, res) => {
  res.json([
    "Elden Ring",
    "Cyberpunk 2077",
    "GTA V",
    "Helldivers 2",
    "Palworld"
  ]);
});

app.listen(3000, () => console.log("V11 running"));
