import {OpenRouter}          from "@openrouter/sdk";
import {OPEN_ROUTER_API_KEY} from "../index.ts";

const openRouter = new OpenRouter({
  apiKey: OPEN_ROUTER_API_KEY,
});

const response = await openRouter.chat.send({
  model: "openai/gpt-4o-mini",
  messages: [
    {
      role: "user",
      content: "Say this is a test.",
    },
  ],
});

console.log(response.choices[0]!.message.content);
