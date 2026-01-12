import {GPT}     from "../index.ts";
import {llmCall} from "../utils/util.ts";

function getOrchestratorPrompt(userQuery: string) {
  return `다음 사용자 질문을 분석한 뒤, 이를 3개 이내의 관련 하위 질문으로 분석해.
결과는 JSON 배열로 출력해. 
JSON 배열 안의 각 하위 질문은 다음 형식을 따른느 JSON 객체로 만들어. 
[
  {{
      "question": "하위 질문1",
      "description": "이 하위 질문의 요지와 의도에 대한 설명"
  }},
  {{
      "question": "하위 질문2",
      "description": "이 하위 질문의 요지와 의도에 대한 설명"
  }}
]

사용자 질문: ${userQuery}`;
}

async function runOrchestratorWorkflow(userQuery: string) {
  const prompt: string = getOrchestratorPrompt(userQuery);
  const response = await llmCall(prompt, GPT);

  console.log(response);

  let cleanedResponse = response
    .replace(/```json\s*/g, "")
    .replace(/```/g, "")
    .trim();

  let subtaskList;
  try {
    subtaskList = JSON.parse(cleanedResponse);
  } catch (e) {
    console.log(e);
  }

  subtaskList.forEach((subtask, index) => {
    console.log(`\n--- 하위 질문 ${index + 1} ---`);
    console.log("질문:", subtask.question);
    console.log("설명:", subtask.description);
  });

  return subtaskList;
}

async function main() {
  return await runOrchestratorWorkflow("2025년, AI 서비스는 어떻게 발전했을까?");
}

await main();
