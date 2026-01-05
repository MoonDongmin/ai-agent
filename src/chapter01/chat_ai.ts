import {OpenRouter}          from "@openrouter/sdk";
import {OPEN_ROUTER_API_KEY} from "../index.ts";
import * as readline         from "node:readline";

const openRouter = new OpenRouter({
  apiKey: OPEN_ROUTER_API_KEY,
});

type Message = {
  role: "user" | "assistant";
  content: any;
}

let messageHistory: Message[] = [];

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const ask = (question: string) => new Promise<string>((resolve) => rl.question(question, resolve));

while (true) {
  const userInput = await ask("사용자: ");

  if (userInput === "exit") {
    console.log("대화를 종료합니다.");
    process.exit(0);
  }

  messageHistory.push({
    role: "user",
    content: userInput,
  });

  const response = await openRouter.chat.send({
    model: "openai/gpt-4o-mini",
    messages: messageHistory, // 이렇게 하면 이전 대화 내용을 기억한 채 대화 가능함
  });

  const aiResponse = response.choices[0]?.message.content ?? "";

  messageHistory.push({
    role: "assistant",
    content: aiResponse,
  });

  console.log(`챗봇: ${aiResponse}`);
}
