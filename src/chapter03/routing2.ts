import {llmCall} from "../utils/util.ts";

type QueryCategory = "일상" | "빠른" | "코딩";
type AgentFn = (query: string) => Promise<string>;

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

async function runGeneralAgent(userPrompt: string): Promise<string> {
  let prompt = `너는 다재다능한 일상 도우미야.
여행 일정, 추천, 요약 등 일상적인 질문에 친절하고 유용하게 답변하지.

[사용자 질문]
${userPrompt}`;

  return await llmCall(prompt, "openai/gpt-4o-mini");
}

async function runQuickAgent(userPrompt: string): Promise<string> {
  let prompt = `너는 빠르고 간단한 응답을 제공하는 빠른 에이전트야.
사용자의 질문에 두괄식으로 간결하게 답변하지.

[사용자 질문]
${userPrompt}`;

  return await llmCall(prompt, "openai/gpt-4o-mini");
}

async function runCodingAgent(userPrompt: string): Promise<string> {
  let prompt = `너는 뛰어난 코딩 비서야.
파이썬, 타입스크립트, 자바스크립트, API 개발, 요류 디버깅 등에 능숙해.
질문에 대해 최대한 정확하고 실행 가능한 코드를 제공하지.

[사용자 질문]
${userPrompt}`;

  return await llmCall(prompt, "openai/gpt-4o-mini");
}

const queries = [
  "리스본 여행 일정을 짜줘.",
  "1 더하기 2는 뭐지?",
  "파이썬으로 API 웹 서버를 만들어줘",
];

for (const query of queries) {
  console.log(`사용자 질문\n ${query}`);

  const category: QueryCategory = await llmRouterCall(query);

  const ROUTING_MAP: Record<QueryCategory, AgentFn> = {
    "일상": runGeneralAgent,
    "빠른": runQuickAgent,
    "코딩": runCodingAgent,
  };

  const finalAgent = ROUTING_MAP[category];


  const response = await finalAgent(query);


  console.log(`응답 결과: ${response}`);
}
