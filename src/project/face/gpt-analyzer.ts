/**
 * GPT를 활용한 면접 표정 분석
 * 수집된 표정 데이터를 기반으로 AI 피드백 생성
 */

import OpenAI from "openai";
import type {
  ExpressionMetrics,
  SignificantChange,
}             from "./facial-expression-tracker.ts";

export interface AnalysisResult {
  overallScore: number;
  confidence: {
    score: number;
    feedback: string;
  };
  engagement: {
    score: number;
    feedback: string;
  };
  emotionalStability: {
    score: number;
    feedback: string;
  };
  recommendations: string[];
  detailedAnalysis: string;
}

export class GPTAnalyzer {
  private openai: OpenAI;

  constructor(apiKey?: string) {
    if (!apiKey) {
      // .env에서 자동으로 로드됨 (Bun)
      apiKey = process.env.OPEN_AI_KEY || process.env.OPENAI_API_KEY;
    }

    if (!apiKey) {
      throw new Error("OPENAI_API_KEY가 설정되지 않았습니다.");
    }

    this.openai = new OpenAI({ apiKey });
  }

  /**
   * 표정 데이터를 분석하여 면접 평가 생성
   */
  async analyze(data: {
    metricsHistory: ExpressionMetrics[];
    significantChanges: SignificantChange[];
    summary: {
      totalDuration: number;
      averageMetrics: Partial<ExpressionMetrics>;
      changeCount: number;
    };
  }): Promise<AnalysisResult> {
    const prompt = this.buildAnalysisPrompt(data);

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `당신은 면접 전문가이자 심리학자입니다. 면접자의 표정 데이터를 분석하여 다음을 평가합니다:
1. 자신감 (Confidence): 눈 맞춤, 안정적인 표정
2. 참여도 (Engagement): 표정 변화, 반응성
3. 감정 안정성 (Emotional Stability): 급격한 표정 변화가 적고 일관성 유지

각 항목을 0-100점으로 평가하고, 구체적인 피드백과 개선 제안을 제공하세요.
응답은 반드시 JSON 형식으로 작성하세요.`,
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        response_format: {type: "json_object"},
        temperature: 0.7,
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error("GPT 응답이 비어있습니다.");
      }

      const result = JSON.parse(content);
      return this.normalizeResult(result);
    } catch (error) {
      console.error("GPT 분석 실패:", error);
      throw new Error(`GPT 분석 실패: ${error}`);
    }
  }

  /**
   * GPT를 위한 프롬프트 생성
   */
  private buildAnalysisPrompt(data: {
    metricsHistory: ExpressionMetrics[];
    significantChanges: SignificantChange[];
    summary: any;
  }): string {
    const {
      metricsHistory,
      significantChanges,
      summary,
    } = data;

    const durationMinutes = (summary.totalDuration / 1000 / 60).toFixed(2);
    const sampleRate = metricsHistory.length > 0 ? summary.totalDuration / metricsHistory.length : 0;

    // 주요 표정 변화 요약
    const changesByType = significantChanges.reduce((acc, change) => {
      acc[change.metric] = (acc[change.metric] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // 시간대별 변화 분포 (초기/중기/후기)
    const timeSegments = this.segmentChanges(significantChanges, summary.totalDuration);

    const prompt = `
# 면접 표정 분석 데이터

## 기본 정보
- 분석 시간: ${durationMinutes}분
- 총 프레임 수: ${metricsHistory.length}개
- 샘플링 간격: ${sampleRate.toFixed(0)}ms
- 유의미한 변화 횟수: ${significantChanges.length}회

## 평균 표정 지표
- 평균 눈 개폐율 (EAR):
  - 왼쪽: ${summary.averageMetrics.eyeAspectRatio?.left.toFixed(3) || "N/A"}
  - 오른쪽: ${summary.averageMetrics.eyeAspectRatio?.right.toFixed(3) || "N/A"}
- 평균 입 개방도 (MAR): ${summary.averageMetrics.mouthAspectRatio?.toFixed(3) || "N/A"}
- 평균 웃음 강도: ${summary.averageMetrics.smileIntensity?.toFixed(3) || "N/A"}

## 표정 변화 유형별 빈도
${Object.entries(changesByType)
      .map(([type, count]) => `- ${type}: ${count}회`)
      .join("\n")}

## 시간대별 변화 분포
- 초기 (0-33%): ${timeSegments.early}회
- 중기 (33-66%): ${timeSegments.middle}회
- 후기 (66-100%): ${timeSegments.late}회

## 주요 표정 변화 이벤트 (최대 10개)
${significantChanges
      .slice(0, 10)
      .map((change, idx) => {
        const timeSeconds = (change.timestamp / 1000).toFixed(1);
        return `${idx + 1}. [${timeSeconds}초] ${change.description} (변화율: ${(change.changeRate * 100).toFixed(1)}%)`;
      })
      .join("\n")}

---

위 데이터를 기반으로 다음 JSON 형식으로 분석 결과를 작성해주세요:

{
  "overallScore": <0-100 정수>,
  "confidence": {
    "score": <0-100 정수>,
    "feedback": "<자신감 관련 피드백>"
  },
  "engagement": {
    "score": <0-100 정수>,
    "feedback": "<참여도 관련 피드백>"
  },
  "emotionalStability": {
    "score": <0-100 정수>,
    "feedback": "<감정 안정성 관련 피드백>"
  },
  "recommendations": [
    "<구체적인 개선 제안 1>",
    "<구체적인 개선 제안 2>",
    "<구체적인 개선 제안 3>"
  ],
  "detailedAnalysis": "<종합 분석 및 총평>"
}
`;

    return prompt;
  }

  /**
   * 시간대별 변화 분포 계산
   */
  private segmentChanges(
    changes: SignificantChange[],
    totalDuration: number,
  ): { early: number; middle: number; late: number } {
    const segments = {
      early: 0,
      middle: 0,
      late: 0,
    };

    changes.forEach(change => {
      const progress = change.timestamp / totalDuration;
      if (progress < 0.33) {
        segments.early++;
      } else if (progress < 0.66) {
        segments.middle++;
      } else {
        segments.late++;
      }
    });

    return segments;
  }

  /**
   * GPT 응답 정규화
   */
  private normalizeResult(rawResult: any): AnalysisResult {
    return {
      overallScore: rawResult.overallScore || 0,
      confidence: {
        score: rawResult.confidence?.score || 0,
        feedback: rawResult.confidence?.feedback || "",
      },
      engagement: {
        score: rawResult.engagement?.score || 0,
        feedback: rawResult.engagement?.feedback || "",
      },
      emotionalStability: {
        score: rawResult.emotionalStability?.score || 0,
        feedback: rawResult.emotionalStability?.feedback || "",
      },
      recommendations: rawResult.recommendations || [],
      detailedAnalysis: rawResult.detailedAnalysis || "",
    };
  }

  /**
   * 분석 결과를 보기 좋게 포맷팅
   */
  formatResult(result: AnalysisResult): string {
    return `
╔════════════════════════════════════════════════════════════════╗
║                    면접 표정 분석 결과                         ║
╚════════════════════════════════════════════════════════════════╝

📊 종합 점수: ${result.overallScore}/100

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💪 자신감 (Confidence)
   점수: ${result.confidence.score}/100
   ${result.confidence.feedback}

🎯 참여도 (Engagement)
   점수: ${result.engagement.score}/100
   ${result.engagement.feedback}

😊 감정 안정성 (Emotional Stability)
   점수: ${result.emotionalStability.score}/100
   ${result.emotionalStability.feedback}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💡 개선 제안

${result.recommendations.map((rec, idx) => `   ${idx + 1}. ${rec}`).join("\n")}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📝 종합 분석

${result.detailedAnalysis}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;
  }
}
