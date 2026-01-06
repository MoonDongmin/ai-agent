import {OpenRouter}          from "@openrouter/sdk";
import {OPEN_ROUTER_API_KEY} from "../index.ts";
import type {ChatResponse}   from "@openrouter/sdk/models";

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

// const test = await llmCall("한국의 수도는?");
// console.log(test);
