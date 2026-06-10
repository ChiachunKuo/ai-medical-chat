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
請分析玩家想玩的遊戲類型。

必須回傳 json。

格式：

{
  role: "system",
  content: `
請分析玩家想玩的遊戲類型

必須回傳 json

格式：

{
  "genres": [],
  "keywords": [],
  "mood": "",
  "reason": ""
}

genres只能從以下選擇：

RPG
Action
Adventure
Shooter
FPS
Open World
Survival
Horror
Puzzle
Strategy
Simulation
Racing
Sandbox
Co-op

只輸出json
`
}

genres只能使用：

RPG
Action
Adventure
Shooter
FPS
Open World
Survival
Horror
Puzzle
Strategy
Simulation
Racing
Sandbox
Co-op

只輸出json
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
