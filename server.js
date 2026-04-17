import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());
app.use(express.static("public"));

const HF_API = "https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct";
const HF_TOKEN = process.env.HF_TOKEN;

// 🧠 AI 問診 Prompt
function buildPrompt(userInput) {
  return `<s>[INST]
你是一個醫療問診AI助手，規則：
1. 用問診方式回覆（先追問再判斷）
2. 不要直接下診斷
3. 最後要告訴可能掛哪一科（例如：內科、神經內科、耳鼻喉科）
4. 回答要簡潔像醫生

使用者症狀：${userInput}
[/INST]`;
}

// 🤖 呼叫 Hugging Face
async function askAI(prompt) {
  const res = await fetch(HF_API, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${HF_TOKEN}`,
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
  return data?.[0]?.generated_text || "無法取得回應";
}

// 💬 Chat API
app.post("/chat", async (req, res) => {
  try {
    const userInput = req.body.message;
    const prompt = buildPrompt(userInput);

    const aiResponse = await askAI(prompt);

    res.json({ reply: aiResponse });
  } catch (err) {
    res.json({ reply: "系統錯誤，請稍後再試" });
  }
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});