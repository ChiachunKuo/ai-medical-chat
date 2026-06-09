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
你是遊戲推薦AI。

請分析玩家需求。

回傳：

{
  "keywords":[],
  "genres":[],
  "mood":"",
  "reason":""
}
`
        },
        {
          role: "user",
          content: message
        }
      ]
    });

  return JSON.parse(
    completion.choices[0].message.content
  );
}