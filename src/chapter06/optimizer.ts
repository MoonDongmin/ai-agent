import {llmCall} from "../utils/util.ts";

async function summarizeText(text: string): Promise<string> {
  const prompt = `아래 내용을 요약해줘.
원문: ${text}`;

  const summary: string = await llmCall(prompt);

  return summary;
}

const url = "https://raw.githubusercontent.com/dabidstudio/sample_files/refs/heads/main/sample_wiki_text.md";

const content: string = await fetch(url).then((res) => res.text());

console.log(`원문(앞부분): \n ${content.slice(0, 300)}`);

const summary = await summarizeText(content);
console.log(`\n요약 결과: \n${summary}`);
