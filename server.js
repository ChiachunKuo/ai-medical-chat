import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());
app.use(express.static("public"));

const MODELS = [
  "llama3-70b-8192-preview",
  "llama3-8b-8192",
  "mixtral-8x7b-32768"
];

async function callGroq(msg, modelIndex = 0) {
  const model = MODELS[modelIndex];

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
你是台灣醫療AI：
- 使用繁體中文
- 不可診斷疾病
- 分析症狀並分類：
【可能原因】
【建議處理】
【建議科別】
【嚴重程度】
`
          },
          { role: "user", content: msg }
        ],
        temperature: 0.5
      })
    }
  );

  const data = await res.json();

  // 🔥 如果模型壞掉 → 自動換下一個
  if (data.error) {
    console.log("MODEL ERROR:", model, data.error.message);

    if (modelIndex < MODELS.length - 1) {
      return callGroq(msg, modelIndex + 1);
    }

    return { reply: "❌ AI模型全部失敗：" + data.error.message };
  }

  return {
    reply: data.choices?.[0]?.message?.content || "無回應"
  };
}

app.post("/chat", async (req, res) => {
  try {
    const result = await callGroq(req.body.message);
    res.json(result);
  } catch (err) {
    console.log(err);
    res.json({ reply: "❌ 系統錯誤：" + err.message });
  }
});

app.listen(3000, () => {
  console.log("Medical AI running (fixed model)");
});
