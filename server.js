// =======================
// 🎮 GAME GUIDE AI V9 SERVER
// =======================

import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// =======================
// 🤖 AI（保留原文）
// =======================
app.post("/chat", async (req, res) => {
  const msg = req.body.message;
  try {
    res.json({
      reply: `Guide for "${msg}": Focus on core mechanics, upgrade early, and learn enemy patterns.`
    });
  } catch {
    res.json({ reply: "error" });
  }
});

// =======================
// 🔍 Steam 搜尋
// =======================
app.get("/steam/search", async (req, res) => {
  const game = req.query.game;

  try {
    const r = await fetch(
      `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(game)}&l=english`
    );
    const d = await r.json();
    res.json(d.items?.[0] || null);
  } catch {
    res.json(null);
  }
});

// =======================
// ⭐ 評論 + 評分
// =======================
app.get("/steam/reviews", async (req, res) => {
  const appid = req.query.appid;

  try {
    const r = await fetch(
      `https://store.steampowered.com/appreviews/${appid}?json=1&num_per_page=5`
    );
    const d = await r.json();
    res.json(d);
  } catch {
    res.json(null);
  }
});

// =======================
// 🎮 商店資訊（價格、圖）
// =======================
app.get("/steam/details", async (req, res) => {
  const appid = req.query.appid;

  try {
    const r = await fetch(
      `https://store.steampowered.com/api/appdetails?appids=${appid}&l=english`
    );
    const d = await r.json();
    res.json(d[appid].data);
  } catch {
    res.json(null);
  }
});

// =======================
app.listen(3000, () => console.log("V9 Server running"));
