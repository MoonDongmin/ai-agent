import {
  GPT,
  MINI,
  o3,
}                     from "../index.ts";
import {llmCallAsync} from "../utils/util.ts";

type PromptDetail = {
  userPrompt: string;
  model: string;
};

const question = `아래 문장을 자연스러운 한국어로 번역해줘.
"Do what you can, with what you have, where you are. - Theodore Roosevelt`;

const parallelPromptDetails: PromptDetail[] = [
  {
    "userPrompt": question,
    "model": GPT,
  },
  {
    "userPrompt": question,
    "model": MINI,
  },
  {
    "userPrompt": question,
    "model": o3,
  },
];

async function runLlmParallel(promptDetails: PromptDetail[]) {
  const tasks = promptDetails.map((prompt: PromptDetail) =>
    llmCallAsync(prompt.userPrompt, prompt.model),
  );

  let responses: string[] = [];

  for (const task of tasks) {
    const result = await task;

    console.log(result);

    responses.push(result);
  }

  return responses;
}

await runLlmParallel(parallelPromptDetails);
