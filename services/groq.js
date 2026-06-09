import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

export async function analyzePrompt(message) {

  const completion =
    await groq.chat.completions.create({

      model: "llama-3.3-70b-versatile",

      temperature: 0.2,

      response_format: {
        type: "json_object"
      },

      messages: [
  {
    role: "system",
    content: `
請分析玩家需求並回傳JSON格式

json格式:

{
  "genres": [],
  "keywords": [],
  "mood": "",
  "reason": ""
}

只輸出json
`
  },
  {
    role: "user",
    content: prompt
  }
]
    });

  return JSON.parse(
    completion.choices[0].message.content
  );
}
