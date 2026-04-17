import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());
app.use(express.static("public"));

const PORT = process.env.PORT || 3000;

const HF_API =
  "https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct";

const HF_TOKEN = process.env.HF_TOKEN;

// 🧠 醫療問診 Prompt（已優化）
function buildPrompt(input) {
  return `<s>[INST]
你是一個專業醫療問診AI助手。

規則：
- 先問症狀細節
- 不可直接診斷
- 每次最多問3個問題
- 最後一定要建議掛號科別
- 用自然醫生語氣

使用者：${input}
[/INST]`;
}

async function askAI(prompt) {
  const res = await fetch(HF_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${HF_TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      inputs: prompt,
      parameters: {
        max_new_tokens: 250,
        temperature: 0.7,
        top_p: 0.9
      }
    })
  });

  const data = await res.json();

  return data?.[0]?.generated_text || "AI暫時無回應";
}

app.post("/chat", async (req, res) => {
  try {
    const userMessage = req.body.message;

    const prompt = buildPrompt(userMessage);
    const reply = await askAI(prompt);

    res.json({ reply });
  } catch (err) {
    console.log(err);
    res.json({ reply: "系統錯誤，請稍後再試" });
  }
});

app.listen(PORT, () => {
  console.log("Server running on", PORT);
});
