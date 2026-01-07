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

async function main() {
  const responses = await runLlmParallel(parallelPromptDetails);

  let aggregatorPrompt = `당므은 사용자의 질문에 대한 여러 LLM이 생성한 응답이야.
너의 역할은 이 응답을 종합해 최종 번역문을 제공하는 거야.
일부 응답이 부정확하거나 편향될 수 있으니 신뢰성 있고 정확한 답변을 해줘.
최종 응답만 출력해. 

사용자 질문:
${question}

모델응답:`;

  for (let i = 0; i < parallelPromptDetails.length; i++) {
    aggregatorPrompt += `\n${i + 1}. 모델 응답: ${responses[i]}\n`;
  }

  console.log(`최종 프롬프트: ${aggregatorPrompt}`);

  let finalResponse = await llmCallAsync(aggregatorPrompt, GPT);
  console.log(`최종 번역문: ${finalResponse}`);
}

main();

