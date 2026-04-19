// =======================
// 🎮 GAME GUIDE AI SERVER (Steam版)
// =======================

import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// =======================
// 🤖 AI（你原本的）
// =======================
app.post("/chat", async (req, res) => {

  const msg = req.body.message;

  try {
    const reply = `Here is a guide for: ${msg}`;
    res.json({ reply });

  } catch {
    res.json({ reply: "error" });
  }
});

// =======================
// 🔍 Steam 搜尋 AppID
// =======================
app.get("/steam/search", async (req, res) => {

  const game = req.query.game;

  try {

    const url = `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(game)}&l=english`;

    const r = await fetch(url);
    const data = await r.json();

    if (data.items && data.items.length > 0) {
      res.json(data.items[0]); // 第一筆最相關
    } else {
      res.json(null);
    }

  } catch {
    res.json(null);
  }
});

// =======================
// ⭐ Steam 評論
// =======================
app.get("/steam/reviews", async (req, res) => {

  const appid = req.query.appid;

  try {

    const url = `https://store.steampowered.com/appreviews/${appid}?json=1&num_per_page=3`;

    const r = await fetch(url);
    const data = await r.json();

    res.json(data);

  } catch {
    res.json(null);
  }
});

// =======================
// ⭐ Steam 評分（好評率）
// =======================
app.get("/steam/summary", async (req, res) => {

  const appid = req.query.appid;

  try {

    const url = `https://store.steampowered.com/appreviews/${appid}?json=1&num_per_page=0`;

    const r = await fetch(url);
    const data = await r.json();

    res.json(data.query_summary);

  } catch {
    res.json(null);
  }
});

// =======================
app.listen(3000, () => console.log("Server running"));
