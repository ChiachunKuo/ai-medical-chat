import express from "express";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());
app.use(express.static("public"));

const PORT = process.env.PORT || 3000;

const GROQ_API_KEY = process.env.GROQ_API_KEY;

// 🧠 醫療分流 prompt（安全版）
function buildPrompt(input) {
  return `
你是一個醫療初步分流AI。

請依照以下格式回答：

【初步判斷】（簡單描述，不可診斷）
【風險等級】低 / 中 / 高
【建議科別】例如內科 / 神經內科 / 家醫科 / 急診
【就醫建議】一句話建議

使用者症狀：
${input}
`;
}

// 🔥 Groq API（穩定最新版）
async function askAI(prompt) {
  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          {
            role: "system",
            content: "你是醫療分流AI，只能做初步判斷，不可診斷疾病"
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.6,
        max_tokens: 300
      })
    });

    const data = await res.json();

    console.log("GROQ STATUS:", res.status);
    console.log("GROQ RESPONSE:", JSON.stringify(data));

    if (!res.ok) {
      throw new Error(data.error?.message || "Groq API error");
    }

    return data.choices?.[0]?.message?.content || "無回應";

  } catch (err) {
    console.error("GROQ ERROR:", err.message);
    return "系統暫時忙碌，請稍後再試";
  }
}

// 💬 API
app.post("/chat", async (req, res) => {
  try {
    const message = req.body.message;

    if (!message) {
      return res.json({ reply: "請輸入症狀" });
    }

    const reply = await askAI(buildPrompt(message));

    res.json({ reply });

  } catch (err) {
    res.json({ reply: "系統錯誤，請稍後再試" });
  }
});

app.listen(PORT, () => {
  console.log("🚀 Server running on", PORT);
});
