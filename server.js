import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());
app.use(express.static("public"));

const PORT = process.env.PORT || 3000;

const HF_API =
"https://api-inference.huggingface.co/models/google/flan-t5-base";

const HF_TOKEN = process.env.HF_TOKEN;

// 🧠 醫療 Prompt（穩定版）
function buildPrompt(input) {
  return `<s>[INST]
你是一個專業醫療問診AI。

規則：
- 先問症狀，不要直接診斷
- 每次最多問3個問題
- 最後建議掛號科別
- 語氣像醫生

症狀：${input}
[/INST]`;
}

// 🔁 HF API（穩定版 + retry）
async function askAI(prompt, retry = 3) {
  try {
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
          top_p: 0.9,
          return_full_text: false
        }
      })
    });

    const data = await res.json();

    console.log("HF RESPONSE:", JSON.stringify(data));

    // ❗ HF error handling
    if (data?.error) throw new Error(data.error);

    // ✔ array format
    if (Array.isArray(data)) {
      return data[0]?.generated_text || "無法解析回應";
    }

    // ✔ object format
    if (data?.generated_text) {
      return data.generated_text;
    }

    throw new Error("Unknown HF response format");
  } catch (err) {
    console.log("HF ERROR:", err.message);

    if (retry > 0) {
      console.log("retrying...", retry);
      await new Promise(r => setTimeout(r, 2000));
      return askAI(prompt, retry - 1);
    }

    return "AI暫時繁忙，請稍後再試";
  }
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
