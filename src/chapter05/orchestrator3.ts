import {GPT} from "../index.ts";
import {
  llmCall,
  llmSearchAsync,
}            from "../utils/util.ts";

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

function getWorkerPrompt(userQuery: string, question: string, description: string) {
  return `다음 사용자 질문에서 파생된 하위 질문을 보고 응답해.
사용자 질문: ${userQuery}
하위 질문: ${question}
하위 질문의 의도: ${description}
하위 질문을 철저히 분석해 그에 대한 포과적이고 상세하게 응답해.
웹 검색 도구를 이용해 자료 조사를 하고, 이를 반영해 응답해.`;
}

async function runLlmParallel(promptDetails: any[]) {
  let tasks = promptDetails.map((item) =>
    llmSearchAsync(item.user_prompt, item.model),
  );

  const responses = await Promise.all(tasks);

  return responses;
}

async function runOrchestratorWorkflow(userQuery: string) {
  const orchestratorPrompt = getOrchestratorPrompt(userQuery);
  const response = await llmCall(orchestratorPrompt, GPT);

  const cleanedResponse = response
    .replace(/```json\s*/g, "")
    .replace(/```/g, "")
    .trim();

  let subtaskList: any[];
  try {
    subtaskList = JSON.parse(cleanedResponse);
  } catch (e) {
    throw new Error(
      `Orchestrator 응답을 JSON으로 파싱할 수 없습니다:\n${cleanedResponse}`,
    );
  }

  subtaskList.forEach((subtask, index) => {
    console.log(`\n--- 하위 질문 ${index + 1} ---`);
    console.log("질문:", subtask.question);
    console.log("설명:", subtask.description);
  });

  const workerPromptDetails: any[] = subtaskList.map(
    (subtask) => ({
      user_prompt: getWorkerPrompt(
        userQuery,
        subtask.question,
        subtask.description,
      ),
      model: GPT,
    }),
  );

  console.log("\n========== 샘플 워커 프롬프트 ==========");
  console.log(workerPromptDetails[0].user_prompt);

  const workerResponses = await runLlmParallel(workerPromptDetails);

  console.log("\n========== 워커 응답 결과 ==========");
  workerResponses.forEach((response, index) => {
    console.log(`\n--- 하위 질문 ${index + 1} 응답 ---`);
    console.log(response);
  });

  let aggregatorPrompt =
    `다음은 사용자 질문을 하위 질문으로 나누고 받은 응답이야.
     이 내용을 모두 종합해 최종 답변을 해.
     
     하위 질문의 응답을 최대한 포괄적이고 상세하게 포함해.
     사용자 질문: ${userQuery}
     
     하위 질문 및 응답: `;

  for (let i = 0; i < subtaskList.length; i++) {
    aggregatorPrompt += `\n${i + 1}. 하위 질문: ${subtaskList[i].question}\n 응답: ${workerResponses[i]}\n`;
  }
  console.log("\n========== 애그리게이터 프롬프트 ==========");
  console.log(aggregatorPrompt);

  const finalResponse = await llmCall(aggregatorPrompt, GPT);
  console.log("\n========== 최종 보고서 결과 ==========");
  console.log(finalResponse);
}

async function main() {
  return await runOrchestratorWorkflow("2025년, AI 서비스는 어떻게 발전했을까?");
}

await main();
