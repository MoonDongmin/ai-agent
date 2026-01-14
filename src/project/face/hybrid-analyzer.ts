/**
 * 하이브리드 분석: 표정 지표 + GPT Vision 결합
 */

import OpenAI                                        from "openai";
import type { SignificantChange, ExpressionMetrics } from "./facial-expression-tracker.ts";

export interface KeyFrameData {
  timestamp: number;
  imageBase64: string; // 프레임 이미지
  metrics: ExpressionMetrics;
  change: SignificantChange;
}

export class HybridAnalyzer {
  private openai: OpenAI;

  constructor(apiKey?: string) {
    if (!apiKey) {
      apiKey = process.env.OPEN_AI_KEY || process.env.OPENAI_API_KEY;
    }

    if (!apiKey) {
      throw new Error("OPENAI_API_KEY가 설정되지 않았습니다.");
    }

    this.openai = new OpenAI({ apiKey });
  }

  /**
   * 주요 순간 선택 (가장 큰 변화가 있었던 시점)
   */
  selectKeyMoments(
    significantChanges: SignificantChange[],
    maxFrames: number = 10
  ): SignificantChange[] {
    // 변화율로 정렬하여 상위 N개 선택
    return significantChanges
      .sort((a, b) => b.changeRate - a.changeRate)
      .slice(0, maxFrames)
      .sort((a, b) => a.timestamp - b.timestamp); // 시간순 재정렬
  }

  /**
   * 키 프레임 시각적 분석 (GPT-4o Vision)
   */
  async analyzeKeyFrames(keyFrames: KeyFrameData[]): Promise<{
    overallImpression: string;
    frameAnalysis: Array<{
      timestamp: number;
      emotionalState: string;
      confidence: string;
      naturalness: string;
    }>;
  }> {
    if (keyFrames.length === 0) {
      return {
        overallImpression: "분석할 프레임이 없습니다.",
        frameAnalysis: [],
      };
    }

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: `당신은 면접 전문가입니다. 면접자의 주요 표정 변화 순간을 분석합니다.
각 이미지에서:
1. 감정 상태 (긍정적/중립/부정적/긴장)
2. 자신감 수준 (높음/중간/낮음)
3. 표정의 자연스러움 (자연스러움/어색함/과장됨)

응답은 JSON 형식으로 제공하세요.`,
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `면접 중 주요 표정 변화 순간 ${keyFrames.length}개를 분석해주세요. 각 이미지는 시간순으로 정렬되어 있습니다.`,
          },
          ...keyFrames.map((frame, idx) => ({
            type: "image_url" as const,
            image_url: {
              url: frame.imageBase64,
              detail: "low" as const, // 비용 절감
            },
          })),
        ],
      },
    ];

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o-mini", // Vision 지원 + 저렴
        messages,
        response_format: { type: "json_object" },
        max_tokens: 1000,
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error("GPT Vision 응답이 비어있습니다.");
      }

      return JSON.parse(content);
    } catch (error) {
      console.error("키 프레임 분석 실패:", error);
      throw error;
    }
  }

  /**
   * 수치 데이터 + 시각 분석 결합
   */
  async combineAnalysis(data: {
    metricsHistory: ExpressionMetrics[];
    significantChanges: SignificantChange[];
    summary: any;
    visualAnalysis?: {
      overallImpression: string;
      frameAnalysis: Array<{
        timestamp: number;
        emotionalState: string;
        confidence: string;
        naturalness: string;
      }>;
    };
  }): Promise<any> {
    const prompt = this.buildCombinedPrompt(data);

    const response = await this.openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `당신은 면접 전문가입니다.
수치 데이터(표정 지표)와 시각 분석 결과를 종합하여 면접자를 평가합니다.
수치 데이터는 정확한 측정값이고, 시각 분석은 맥락과 뉘앙스를 제공합니다.
두 정보를 결합하여 더 정확하고 풍부한 피드백을 제공하세요.`,
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("종합 분석 응답이 비어있습니다.");
    }

    return JSON.parse(content);
  }

  private buildCombinedPrompt(data: any): string {
    const { summary, visualAnalysis } = data;

    return `
# 면접 표정 종합 분석

## 수치 데이터 요약
- 분석 시간: ${(summary.totalDuration / 1000 / 60).toFixed(2)}분
- 평균 눈 개폐율: ${summary.averageMetrics.eyeAspectRatio?.left.toFixed(3)}
- 평균 입 개방도: ${summary.averageMetrics.mouthAspectRatio?.toFixed(3)}
- 표정 변화 횟수: ${summary.changeCount}회

${
  visualAnalysis
    ? `
## 시각 분석 결과
- 전반적 인상: ${visualAnalysis.overallImpression}

### 주요 순간 분석
${visualAnalysis.frameAnalysis
  .map(
    (f: any, idx: number) => `
${idx + 1}. [${(f.timestamp / 1000).toFixed(1)}초]
   - 감정 상태: ${f.emotionalState}
   - 자신감: ${f.confidence}
   - 자연스러움: ${f.naturalness}
`
  )
  .join("")}
`
    : ""
}

---

위 데이터를 종합하여 다음 JSON 형식으로 평가하세요:

{
  "overallScore": <0-100>,
  "confidence": {
    "score": <0-100>,
    "feedback": "<수치와 시각 정보를 모두 고려한 피드백>"
  },
  "engagement": {
    "score": <0-100>,
    "feedback": "<피드백>"
  },
  "emotionalStability": {
    "score": <0-100>,
    "feedback": "<피드백>"
  },
  "visualInsights": "<시각 분석에서 얻은 추가 인사이트>",
  "recommendations": ["<제안1>", "<제안2>", "<제안3>"],
  "detailedAnalysis": "<종합 평가>"
}
`;
  }
}

/**
 * 사용 예시:
 *
 * ```typescript
 * const hybrid = new HybridAnalyzer();
 *
 * // 1. 주요 순간 선택
 * const keyMoments = hybrid.selectKeyMoments(significantChanges, 10);
 *
 * // 2. 해당 시점의 프레임 이미지 준비
 * const keyFrames: KeyFrameData[] = keyMoments.map(moment => ({
 *   timestamp: moment.timestamp,
 *   imageBase64: captureFrame(video, moment.timestamp),
 *   metrics: getMetricsAt(moment.timestamp),
 *   change: moment
 * }));
 *
 * // 3. 시각 분석
 * const visualAnalysis = await hybrid.analyzeKeyFrames(keyFrames);
 *
 * // 4. 종합 분석
 * const result = await hybrid.combineAnalysis({
 *   metricsHistory,
 *   significantChanges,
 *   summary,
 *   visualAnalysis
 * });
 * ```
 */
