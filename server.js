import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// =======================
// 🤖 Groq（強化版）
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
            content: `
你是專業遊戲攻略 AI：
1. 必須使用繁體中文（禁止簡體）
2. 遊戲專有名詞保留英文
3. 回答要精準且簡短（重點式）
4. 提供玩法建議 + 新手技巧
5. 不確定的資訊不要亂編
`
          },
          { role: "user", content: msg }
        ]
      })
    });

    const data = await r.json();
    res.json({ reply: data.choices?.[0]?.message?.content || "AI 無回應" });

  } catch {
    res.json({ reply: "AI 暫時無法使用" });
  }
});

// =======================
// Steam API
// =======================
app.get("/steam/search", async (req, res) => {
  const r = await fetch(`https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(req.query.game)}`);
  const d = await r.json();
  res.json(d.items?.[0] || null);
});

app.get("/steam/details", async (req, res) => {
  const r = await fetch(`https://store.steampowered.com/api/appdetails?appids=${req.query.appid}`);
  const d = await r.json();
  res.json(d[req.query.appid].data);
});

app.get("/steam/reviews", async (req, res) => {
  const r = await fetch(`https://store.steampowered.com/appreviews/${req.query.appid}?json=1`);
  const d = await r.json();
  res.json(d);
});

// =======================
// 熱門榜（穩定版）
// =======================
app.get("/games", (req, res) => {
  res.json([
    "Elden Ring",
    "Cyberpunk 2077",
    "GTA V",
    "Red Dead Redemption 2",
    "Helldivers 2"
  ]);
});

app.listen(3000, () => console.log("V11 FIX RUNNING"));
