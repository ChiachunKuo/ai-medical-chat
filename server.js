import express from "express";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());
app.use(express.static("public"));

const GROQ_API_KEY = process.env.GROQ_API_KEY;

// 🧠 V3 醫療分流 Prompt（核心升級）
function buildPrompt(input) {
  return `
你是一個「醫療分流AI」，你不是醫生。

你的任務是做「就醫必要性評估」。

請嚴格輸出以下格式：

【是否需要就醫】
需要 / 可觀察 / 緊急

【風險等級】
低 / 中 / 高 / 危急

【原因判斷】
用白話解釋可能原因（1~2句）

【建議行動】
- 是否需要看醫生
- 是否可先觀察
- 是否建議急診

【建議科別】
如果需要就醫，請給科別（例如：內科/神經內科/急診/耳鼻喉科）

使用者症狀：
${input}
`;
}

// 🔥 Groq API
async function askAI(prompt) {
  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.1-70b-versatile",
        messages: [
          {
            role: "system",
            content: "你是醫療分流系統，只能做風險評估，不可診斷疾病"
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.4,
        max_tokens: 400
      })
    });

    const data = await res.json();

    console.log("GROQ:", JSON.stringify(data));

    if (!res.ok) {
      throw new Error(data.error?.message || "Groq error");
    }

    return data.choices[0].message.content;

  } catch (err) {
    console.error(err);
    return "系統忙碌，請稍後再試";
  }
}

// API
app.post("/chat", async (req, res) => {
  try {
    const message = req.body.message;

    if (!message) {
      return res.json({ reply: "請輸入症狀" });
    }

    const reply = await askAI(buildPrompt(message));

    res.json({ reply });

  } catch (err) {
    res.json({ reply: "系統錯誤" });
  }
});

app.listen(3000, () => {
  console.log("V3 醫療分流系統啟動");
});
