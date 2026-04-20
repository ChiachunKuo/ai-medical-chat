import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());
app.use(express.static("public"));

app.post("/chat", async (req, res) => {
  const msg = req.body.message;

  if (!process.env.GROQ_API_KEY) {
    return res.json({
      reply: "❌ 系統未設定 GROQ_API_KEY（請到 Render / .env 設定）"
    });
  }

  try {
    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "llama3-70b-8192",
          messages: [
            {
              role: "system",
              content: `
你是台灣醫療輔助AI：
- 使用繁體中文
- 不可診斷
- 必須清楚分類：
【可能原因】
【建議處理】
【建議科別】
【是否需要就醫（輕微/中等/緊急）】
              `
            },
            { role: "user", content: msg }
          ],
          temperature: 0.5
        })
      }
    );

    const data = await response.json();

    // 🔥 重要：錯誤檢查
    if (data.error) {
      console.log("GROQ ERROR:", data.error);
      return res.json({
        reply: "❌ AI回傳錯誤：" + data.error.message
      });
    }

    const text = data?.choices?.[0]?.message?.content;

    if (!text) {
      return res.json({
        reply: "❌ AI沒有回傳內容（可能模型或API異常）"
      });
    }

    res.json({ reply: text });

  } catch (err) {
    console.log("SERVER ERROR:", err);

    res.json({
      reply: "❌ 伺服器錯誤：" + err.message
    });
  }
});

app.listen(3000, () => {
  console.log("Medical AI running...");
});
