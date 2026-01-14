# 면접 표정 분석 시스템

MediaPipe와 GPT를 활용한 실시간 얼굴 표정 분석 시스템입니다. 면접 시뮬레이션 중 2분간 표정을 측정하고, AI가 자신감, 참여도, 감정 안정성을 평가합니다.

## 주요 기능

- 📹 **실시간 얼굴 인식**: MediaPipe Face Landmarker를 사용한 478개 랜드마크 추적
- 📊 **표정 지표 수치화**:
  - Eye Aspect Ratio (EAR): 눈의 개폐 정도
  - Mouth Aspect Ratio (MAR): 입의 열림 정도
  - 눈썹 높이: 놀람 표정 감지
  - 웃음 강도: 긍정적 감정 측정
  - 머리 기울기: 자세 분석
- 🔄 **변화량 추적**: 시간에 따른 표정 변화를 실시간으로 감지하고 저장
- 🤖 **AI 분석**: GPT-4o를 활용한 면접 평가 및 피드백
- ⏱️ **2분 제한**: 최대 2분간 측정

## 기술 스택

- **Runtime**: Bun
- **Backend**: Bun.serve() API
- **Frontend**: Vanilla JavaScript + HTML5
- **AI/ML**:
  - MediaPipe Tasks Vision (얼굴 인식)
  - OpenAI GPT-4o (분석 및 피드백)

## 프로젝트 구조

```
src/project/
├── facial-expression-tracker.ts  # 표정 지표 추적 및 변화량 계산
├── face-analysis.ts              # MediaPipe 얼굴 분석 (Node.js/Bun용)
├── gpt-analyzer.ts               # GPT 분석 모듈
├── interview-server.ts           # Bun 웹 서버
├── interview.html                # 웹 UI (프론트엔드)
└── README.md                     # 이 파일
```

## 설치 및 실행

### 1. 환경 설정

먼저 `.env` 파일에 OpenAI API 키를 설정하세요:

```bash
echo "OPENAI_API_KEY=your-api-key-here" > .env
```

### 2. 의존성 설치

```bash
bun install
```

### 3. 서버 실행

```bash
bun src/project/interview-server.ts
```

서버가 시작되면 다음과 같은 메시지가 표시됩니다:

```
╔═══════════════════════════════════════════════════════════════╗
║             면접 표정 분석 시스템                             ║
╚═══════════════════════════════════════════════════════════════╝

🚀 서버가 시작되었습니다!

📍 URL: http://localhost:3000
📊 API: http://localhost:3000/api/analyze
```

### 4. 사용 방법

1. 브라우저에서 `http://localhost:3000` 접속
2. "분석 시작" 버튼 클릭
3. 웹캠 권한 허용
4. 2분간 면접 시뮬레이션 진행
5. 자동으로 GPT 분석 결과 표시

## API 엔드포인트

### POST `/api/analyze`

면접 표정 데이터를 분석합니다.

**요청 본문:**

```json
{
  "metricsHistory": [
    {
      "timestamp": 1234567890,
      "eyeAspectRatio": { "left": 0.3, "right": 0.3 },
      "mouthAspectRatio": 0.2,
      "eyebrowHeight": { "left": 0.1, "right": 0.1 },
      "smileIntensity": 0.05,
      "headTilt": 0.5
    }
  ],
  "significantChanges": [
    {
      "timestamp": 1234567890,
      "metric": "leftEye",
      "value": 0.1,
      "changeRate": 0.2,
      "description": "왼쪽 눈 감김"
    }
  ],
  "summary": {
    "totalDuration": 120000,
    "averageMetrics": {
      "eyeAspectRatio": { "left": 0.3, "right": 0.3 },
      "mouthAspectRatio": 0.2,
      "smileIntensity": 0.05
    },
    "changeCount": 15
  }
}
```

**응답:**

```json
{
  "overallScore": 85,
  "confidence": {
    "score": 80,
    "feedback": "안정적인 눈 맞춤을 유지했습니다..."
  },
  "engagement": {
    "score": 90,
    "feedback": "적절한 표정 변화로 참여도가 높습니다..."
  },
  "emotionalStability": {
    "score": 85,
    "feedback": "감정 변화가 안정적입니다..."
  },
  "recommendations": [
    "눈 맞춤을 조금 더 유지하세요",
    "미소를 더 자주 지어보세요"
  ],
  "detailedAnalysis": "전반적으로 우수한 면접 태도..."
}
```

## 평가 지표

### 자신감 (Confidence)

- 눈의 개폐율 (EAR)이 안정적인지 측정
- 눈 맞춤 유지 능력 평가
- 깜빡임 빈도 분석

### 참여도 (Engagement)

- 표정 변화의 빈도와 다양성
- 반응성 (적절한 시점의 표정 변화)
- 웃음 빈도

### 감정 안정성 (Emotional Stability)

- 급격한 표정 변화 최소화
- 일관된 표정 유지
- 스트레스 지표 (과도한 눈 깜빡임, 입 긴장 등)

## 표정 지표 상세

### Eye Aspect Ratio (EAR)

```
EAR = (|p2 - p6| + |p3 - p5|) / (2 * |p1 - p4|)
```

- 값이 0.2 이하: 눈 감김
- 값이 0.3~0.4: 정상
- 급격한 변화: 깜빡임 또는 눈 찡그림

### Mouth Aspect Ratio (MAR)

```
MAR = |p3 - p4| / |p1 - p2|
```

- 값이 0.5 이상: 입 크게 벌림 (말하기, 하품)
- 값이 0.2 이하: 입 다물기
- 급격한 변화: 표정 변화

## 주의사항

- 웹캠 권한이 필요합니다
- HTTPS 환경 또는 localhost에서만 웹캠 접근 가능
- OpenAI API 사용량에 따라 비용 발생
- 최소 조명 조건이 필요합니다 (얼굴 인식 정확도 향상)
- 브라우저는 최신 Chrome, Edge, Firefox 권장

## 개발 가이드

### 표정 추적 클래스 사용

```typescript
import { FacialExpressionTracker } from "./facial-expression-tracker";

const tracker = new FacialExpressionTracker(2); // 2분

// 얼굴 랜드마크 데이터 추가
const metrics = tracker.extractMetrics(landmarks, Date.now());

// 측정 완료 및 결과 가져오기
const results = tracker.finalize();
console.log(results.significantChanges);
```

### GPT 분석 클래스 사용

```typescript
import { GPTAnalyzer } from "./gpt-analyzer";

const analyzer = new GPTAnalyzer();
const result = await analyzer.analyze(data);
console.log(analyzer.formatResult(result));
```

## 라이선스

MIT

## 기여

버그 리포트나 기능 제안은 이슈를 통해 제출해주세요.
