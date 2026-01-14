import {OpenAI}      from "openai";
import * as path     from "node:path";
import * as fs       from "node:fs";
import {OPEN_AI_KEY} from "../index.ts";

const openai = new OpenAI({
  apiKey: OPEN_AI_KEY,
});

const fileName: string = Math.random().toString(36).substring(2, 15) + ".mp3";

const speechFile: string = path.resolve(`./src/project/mp3/${fileName}`);

const mp3 = await openai.audio.speech.create({
  model: "gpt-4o-mini-tts",
  voice: "coral",
  input: "이것은 면접 질문입니다. 그러니까 상세하게 답변해주세요.",
  instructions: "말할 때 면접관톤으로 해주세요.",
  speed: 1.2,
});

const buffer = Buffer.from(await mp3.arrayBuffer());
await fs.promises.writeFile(speechFile, buffer);
