import {llmCall} from "../utils/util.ts";

async function promptChaining(initialInput: string, promptChain: string[]) {
  let responseChain: string[] = [];
  let response: string = initialInput;

  for (let i = 0; i < promptChain.length; i++) {
    console.log(`\n========== ${i + 1} 단계 ==========\n`);
    const prompt = promptChain[i];
    const finalPrompt = `${prompt}
    처음에 사용자가 입력한 내용은 다음과 같아. 응답할 때 항상 이 내용을 고려해.
    ${initialInput}
    
    또한 응답 시 아래 내용도 참고해.
    ${response}`;

    console.log(`프롬프트: \n${finalPrompt}`);

    response = await llmCall(finalPrompt);

    responseChain.push(response);

    console.log(`응답:\n ${response}\n`);
  }

  return responseChain;
}

const prompts = [
  `# 1단계: 여행 후보지 세 곳 추천 사용자의 여행 취향을 바탕으로 적합한 여행지 세 곳을 추천해.\n 
  - 사용자가 입력한 내용을 요약해.\n  
  - 추천한 여행지가 왜 적합한지 설명해.\n 
  - 각 여행지의 기후, 주요 관광지를 알려줘.`,

  `# 2단계: 한 곳을 선택하고 다섯 가지 활동 나열\n
   가장 추천하는 여행지 한 곳을 선정하고, 거기서 할 수 있는 활동을 제안해.\n
   - 왜 최종 여행지로 선정했는지 설명해.\n
   - 해당 여행지에서 즐길 수 있는 다섯 가지 활동을 나열해.\n
   - 자연 탐방, 역사 탐방, 음식 체험 등 다양한 영역의 활동을 골라줘.\n`,

  `# 3단계: 최종 추천 여행지의 하루 일정 계획\n
   추천한 여행지의 하루 일정 계획을 세워줘.\n
   - 오전, 오후, 저녁으로 나눠 일정을 짜줘.\n,
   - 각 시간대에 어떤 활동을 하면 좋을지 설명해.\n`,
];

let result = await promptChaining("따뜻한 날씨를 좋아하고 역사적인 장소를 둘러보는 걸 선호해", prompts);
console.log(result);
