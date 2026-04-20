import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());
app.use(express.static("public"));

const MODELS = [
  "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant"
];

async function askGroq(message, index = 0) {
  const model = MODELS[index];

  const res = await fetch(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content: `
你是台灣醫療AI助手：
- 必須使用繁體中文
- 不可做醫療診斷
- 回答格式固定：

【可能原因】
【建議處理】
【建議科別】
【嚴重程度（輕微/中等/緊急）】
`
          },
          { role: "user", content: message }
        ],
        temperature: 0.4
      })
    }
  );

  const data = await res.json();

  // ❗ 如果模型失敗 → 自動換下一個
  if (data.error) {
    console.log(`MODEL FAIL: ${model}`, data.error.message);

    if (index < MODELS.length - 1) {
      return askGroq(message, index + 1);
    }

    return {
      reply: "❌ AI模型全部失敗：" + data.error.message
    };
  }

  return {
    reply: data.choices?.[0]?.message?.content || "無回應"
  };
}

app.post("/chat", async (req, res) => {
  try {
    const result = await askGroq(req.body.message);
    res.json(result);
  } catch (err) {
    res.json({
      reply: "❌ 系統錯誤：" + err.message
    });
  }
});

app.listen(3000, () => {
  console.log("Medical AI running (Groq latest model)");
});
