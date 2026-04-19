import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// =======================
// 🤖 AI分類（簡易）
// =======================
function classify(game){
  const g = game.toLowerCase();

  if(g.includes("elden")) return "RPG";
  if(g.includes("cod") || g.includes("valorant")) return "FPS";
  if(g.includes("gta")) return "Open World";
  return "Game";
}

// =======================
app.post("/chat", async (req, res)=>{
  const msg = req.body.message;

  res.json({
    reply: `Guide: ${msg}\nFocus on core gameplay, upgrade early, and adapt strategy.`,
    type: classify(msg)
  });
});

// =======================
// Steam 搜尋
// =======================
app.get("/steam/search", async (req,res)=>{
  const game=req.query.game;

  const r=await fetch(`https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(game)}`);
  const d=await r.json();

  res.json(d.items?.[0]||null);
});

// =======================
// Steam 詳細
// =======================
app.get("/steam/details", async (req,res)=>{
  const id=req.query.appid;

  const r=await fetch(`https://store.steampowered.com/api/appdetails?appids=${id}`);
  const d=await r.json();

  res.json(d[id].data);
});

// =======================
// Steam 評論
// =======================
app.get("/steam/reviews", async (req,res)=>{
  const id=req.query.appid;

  const r=await fetch(`https://store.steampowered.com/appreviews/${id}?json=1&num_per_page=6`);
  const d=await r.json();

  res.json(d);
});

app.listen(3000, ()=>console.log("V10 running"));
