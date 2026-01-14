/**
 * 면접 표정 분석 서버
 * Bun.serve()를 사용한 웹 서버
 */

import { GPTAnalyzer }                               from "./gpt-analyzer.ts";
import type { ExpressionMetrics, SignificantChange } from "./facial-expression-tracker.ts";

const PORT = 3000;

interface AnalysisRequest {
  metricsHistory: ExpressionMetrics[];
  significantChanges: SignificantChange[];
  summary: {
    totalDuration: number;
    averageMetrics: Partial<ExpressionMetrics>;
    changeCount: number;
  };
}

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);

    // CORS 헤더
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    // OPTIONS 요청 처리
    if (req.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // 루트 경로 - HTML 파일 제공
    if (url.pathname === "/") {
      const html = await Bun.file("src/project/interview.html").text();
      return new Response(html, {
        headers: {
          "Content-Type": "text/html",
          ...corsHeaders,
        },
      });
    }

    // 분석 API
    if (url.pathname === "/api/analyze" && req.method === "POST") {
      try {
        const data: AnalysisRequest = await req.json();

        console.log("\n=== 분석 요청 수신 ===");
        console.log(`측정 시간: ${(data.summary.totalDuration / 1000 / 60).toFixed(2)}분`);
        console.log(`프레임 수: ${data.metricsHistory.length}개`);
        console.log(`유의미한 변화: ${data.significantChanges.length}회`);

        const analyzer = new GPTAnalyzer();
        const result = await analyzer.analyze(data);

        console.log("\n=== GPT 분석 완료 ===");
        console.log(`종합 점수: ${result.overallScore}/100`);
        console.log(`자신감: ${result.confidence?.score}/100`);
        console.log(`참여도: ${result.engagement?.score}/100`);
        console.log(`감정 안정성: ${result.emotionalStability?.score}/100`);
        console.log(`개선 제안: ${result.recommendations?.length}개`);
        console.log("\n응답 데이터 구조:");
        console.log(JSON.stringify(result, null, 2));

        return new Response(JSON.stringify(result), {
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        });
      } catch (error) {
        console.error("분석 중 오류:", error);
        return new Response(
          JSON.stringify({
            error: "분석 중 오류가 발생했습니다.",
            details: String(error),
          }),
          {
            status: 500,
            headers: {
              "Content-Type": "application/json",
              ...corsHeaders,
            },
          }
        );
      }
    }

    // 헬스체크
    if (url.pathname === "/health") {
      return new Response(JSON.stringify({ status: "ok" }), {
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      });
    }

    // 404
    return new Response("Not Found", {
      status: 404,
      headers: corsHeaders,
    });
  },
});

console.log(`
╔═══════════════════════════════════════════════════════════════╗
║             면접 표정 분석 시스템                             ║
╚═══════════════════════════════════════════════════════════════╝

🚀 서버가 시작되었습니다!

📍 URL: http://localhost:${PORT}
📊 API: http://localhost:${PORT}/api/analyze

💡 사용 방법:
   1. 브라우저에서 http://localhost:${PORT} 접속
   2. "분석 시작" 버튼 클릭
   3. 웹캠 권한 허용
   4. 2분간 면접 시뮬레이션
   5. 자동으로 GPT 분석 결과 표시

⚠️  OPENAI_API_KEY가 .env 파일에 설정되어 있어야 합니다.

`);
