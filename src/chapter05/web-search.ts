import {OpenRouter} from "@openrouter/sdk";
import {
  GPT,
  OPEN_ROUTER_API_KEY,
}                   from "../index.ts";

const client = new OpenRouter({
  apiKey: OPEN_ROUTER_API_KEY,
});


async function llmSearchAsync(prompt: string, model: string = GPT): Promise<string> {
  const response = await client.chat.send({
    model: model,
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
    plugins: [
      {
        id: "web",
        enabled: true,
        maxResults: 5,
      },
    ],
    stream: false, // 논스트리밍 응답
  });

  // 응답에서 content 추출
  const content = response.choices?.[0]?.message?.content;

  if (typeof content === 'string') {
    return content;
  }

  return JSON.stringify(content);
}

// 사용 예시
async function main() {
  const result = await llmSearchAsync("오늘 흥미로운 뉴스를 찾아줘");
  console.log(result);
}

// 실행
if (import.meta.main) {
  await main();
}
