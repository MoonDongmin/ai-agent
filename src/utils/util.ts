import {OpenRouter}        from "@openrouter/sdk";
import {
  GPT,
  OPEN_ROUTER_API_KEY,
}                          from "../index.ts";
import type {ChatResponse} from "@openrouter/sdk/models";

const openRouter = new OpenRouter({
  apiKey: OPEN_ROUTER_API_KEY,
});

type Message = {
  role: "user" | "assistant";
  content: any;
}

export async function llmCall(prompt: string, model: string = "openai/gpt-4o-mini"): Promise<string> {

  let message: Message[] = [];

  message.push({
    role: "user",
    content: prompt,
  });

  const chatCompletion: ChatResponse = await openRouter.chat.send({
    model: model,
    messages: message,
  });

  return chatCompletion.choices[0]?.message.content as string;
}

export async function llmCallAsync(prompt: string, model: string = "openai/gpt-4o-mini"): Promise<string> {
  let message: Message[] = [];

  message.push({
    role: "user",
    content: prompt,
  });

  const chatCompletion: ChatResponse = await openRouter.chat.send({
    model: model,
    messages: message,
  });

  console.log(`${model} 완료`);

  return chatCompletion.choices[0]?.message.content as string;
}

export async function llmSearchAsync(prompt: string, model: string = GPT): Promise<string> {
  const response = await openRouter.chat.send({
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

  if (typeof content === "string") {
    return content;
  }

  return JSON.stringify(content);
}
