import {llmCall} from "../utils/util.ts";

async function summarizeText(text: string): Promise<string> {
  const prompt = `아래 내용을 요약해줘.
원문: ${text}`;

  const summary: string = await llmCall(prompt);

  return summary;
}

const evaluatorPrompt = `평가 기준에 따라 다음 요약문을 엄격하게 심사해.

1. 형식:
- 여러 항목으로 된 개조식이어야 하며, 한 문장이라도 개조식이 아니면 무조건 FAIL

2. 내용:
- 정의 또는 원리, 주요 장점, 활용 예 등 3가지 핷미 요소가 모두 포함되면 PASS
- 사소한 세부 내용, 인용, 부연 설명 누락은 FAIL이 아님

3. 표현:
- 모든 항목은 짧고 명확해야 함
- 불필요한 수식, 반복문, 비문, 맞춤법/띄어쓰기 오류가 2개 이상이면 FAIL

위 기준 중 하나라도 미달이면 반드시 FAIL을 부여해. 

응답 양식: 
- 평가 결과: PASS /FAIL
- 문제점 및 개선 방향: (FAIL인 경우 구체적으로)`;

function evaluateSummary(content: string, summary: string) {
  const prompt = `${evaluatorPrompt}
  
원문: 
${content}

요약문: 
${summary}`;

  return llmCall(prompt);
}

async function main() {
  const url = "https://raw.githubusercontent.com/dabidstudio/sample_files/refs/heads/main/sample_wiki_text.md";

  const content: string = await fetch(url).then((res) => res.text());

  const summary: string = await summarizeText(content);
  console.log("요약 결과:\n", summary);

  const evaluation: string = await evaluateSummary(content, summary);

  console.log(`평가 결과: \n${evaluation}`);
}

await main();
