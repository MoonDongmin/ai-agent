import {llmCall} from "../utils/util.ts";

type QueryCategory = "일상" | "빠른" | "코딩";
type ModelName = "openai/gpt-4o-mini";

async function llmRouterCall(userPrompt: string): Promise<QueryCategory> {
  let routerPrompt = `사용자 질문: ${userPrompt}
  
위 질문에 대해 가장 적절한 유형을 하나 골라.
- 일상: 일반적인 대화, 일정 짜기, 정보 요청 등
- 빠른: 계산, 단답형 질문, 간단한 명령 등
- 코딩: 타입스크립트, 코드 작성, 오류 디버깅 등
  
단답형으로 유형만 출력해.`;

  const routingResult: QueryCategory = await llmCall(routerPrompt) as QueryCategory;
  return routingResult;
}

// 라우팅 맵 정의

const ROUTING_MAP: Record<QueryCategory, ModelName> = {
  "일상": "openai/gpt-4o-mini",
  "빠른": "openai/gpt-4o-mini",
  "코딩": "openai/gpt-4o-mini",
};

const queries = [
  "리스본 여행 일정을 짜줘.",
  "1 더하기 2는 뭐지?",
  "파이썬으로 API 웹 서버를 만들어줘",
];

for (const query of queries) {
  const category: QueryCategory = await llmRouterCall(query);

  const selectedModel: string = ROUTING_MAP[category] ?? "openai/gpt-4o-mini";

  console.log(`질문: ${query}`);
  console.log(`선택 모델: ${selectedModel}`);

  const response = await llmCall(query, selectedModel);
  console.log(`응답 결과: ${response}`);
}
