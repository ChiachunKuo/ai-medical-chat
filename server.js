import express from "express";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());
app.use(express.static("public"));

const PORT = process.env.PORT || 3000;

// ✅ API KEY
const GROQ_API_KEY = process.env.GROQ_API_KEY;

if (!GROQ_API_KEY) {
  console.error("❌ GROQ_API_KEY 未設定");
}

// 🧠 醫療 prompt
function buildPrompt(input) {
  return `
你是一個「醫療初步分流AI」，不是診斷醫生。

你的任務：
1. 只做初步判斷（不要確診）
2. 判斷風險：低 / 中 / 高
3. 建議掛號科別
4. 如果可能危險 → 建議急診
5. 最後提供就醫建議

輸出格式必須固定：

【初步判斷】
（1~2句）

【風險等級】
低 / 中 / 高

【建議科別】
例如：家醫科 / 內科 / 神經內科 / 急診

【就醫建議】
一句簡單建議

使用者症狀：
${input}
`;
}

// 🔥 Groq API（最新穩定版）
async function askAI(prompt) {
  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        // ✅ 🔥 最新可用模型（重點修正）
        model: "llama-3.1-8b-instant",

        messages: [
          {
            role: "system",
            content: "你是專業醫療問診AI，只能用問診方式回答，不可直接診斷"
          },
          {
            role: "user",
            content: prompt
          }
        ],

        temperature: 0.7,
        max_tokens: 300
      })
    });

    const data = await res.json();

    console.log("GROQ RESPONSE:", JSON.stringify(data));

    // ❗ API error handling
    if (!res.ok) {
      throw new Error(data.error?.message || "Groq API error");
    }

    return data.choices?.[0]?.message?.content || "無回應";

  } catch (err) {
    console.error("❌ GROQ ERROR:", err.message);

    return "系統暫時忙碌，請稍後再試";
  }
}

// 💬 API
app.post("/chat", async (req, res) => {
  try {
    const userMessage = req.body.message;

    if (!userMessage) {
      return res.json({ reply: "請輸入症狀" });
    }

    const reply = await askAI(buildPrompt(userMessage));

    res.json({ reply });

  } catch (err) {
    console.error(err);
    res.json({ reply: "系統錯誤，請稍後再試" });
  }
});

app.listen(PORT, () => {
  console.log("🚀 Server running on port", PORT);
});
