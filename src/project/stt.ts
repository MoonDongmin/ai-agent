import {OpenAI}      from "openai";
import {OPEN_AI_KEY} from "../index.ts";
import * as fs       from "node:fs";

const openai = new OpenAI({
  apiKey: OPEN_AI_KEY,
});

const transcription = await openai.audio.transcriptions.create({
  file: fs.createReadStream("./src/project/mp3/덕명동 2.m4a"),
  model: "gpt-4o-mini-transcribe",
  response_format: "text",
  language: "ko",
});

console.log(transcription);
