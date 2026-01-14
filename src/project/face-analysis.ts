/**
 * MediaPipe를 사용한 얼굴 분석
 * 비디오 파일 또는 웹캠으로부터 얼굴 표정 분석
 */

import {
  FilesetResolver,
  FaceLandmarker,
  FaceLandmarkerOptions,
} from "@mediapipe/tasks-vision";
import {
  FacialExpressionTracker,
  FaceLandmark,
} from "./face/facial-expression-tracker.ts";

export class FaceAnalyzer {
  private faceLandmarker: FaceLandmarker | null = null;
  private tracker: FacialExpressionTracker;
  private isInitialized = false;
  private startTime: number = 0;
  private maxDuration: number;

  constructor(maxDurationMinutes: number = 2) {
    this.maxDuration = maxDurationMinutes * 60 * 1000;
    this.tracker = new FacialExpressionTracker(maxDurationMinutes);
  }

  /**
   * MediaPipe Face Landmarker 초기화
   */
  async initialize(): Promise<void> {
    try {
      console.log("MediaPipe 초기화 중...");

      // MediaPipe WASM 파일 로드
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm",
      );

      // Face Landmarker 생성
      const options: FaceLandmarkerOptions = {
        baseOptions: {
          modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
          delegate: "CPU",
        },
        runningMode: "VIDEO",
        numFaces: 1,
        minFaceDetectionConfidence: 0.5,
        minFacePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
        outputFaceBlendshapes: true,
        outputFacialTransformationMatrixes: true,
      };

      this.faceLandmarker = await FaceLandmarker.createFromOptions(vision, options);
      this.isInitialized = true;

      console.log("MediaPipe 초기화 완료!");
    } catch (error) {
      console.error("MediaPipe 초기화 실패:", error);
      throw new Error(`MediaPipe 초기화 실패: ${error}`);
    }
  }

  /**
   * 비디오 프레임에서 얼굴 분석
   * @param videoElement HTML Video 엘리먼트 또는 Canvas
   * @param timestamp 현재 타임스탬프 (밀리초)
   */
  async analyzeFrame(
    videoElement: HTMLVideoElement | HTMLCanvasElement | HTMLImageElement,
    timestamp: number,
  ): Promise<void> {
    if (!this.isInitialized || !this.faceLandmarker) {
      throw new Error("Face Landmarker가 초기화되지 않았습니다. initialize()를 먼저 호출하세요.");
    }

    if (this.startTime === 0) {
      this.startTime = timestamp;
    }

    const elapsedTime = timestamp - this.startTime;
    if (elapsedTime > this.maxDuration) {
      console.log("최대 측정 시간 도달");
      return;
    }

    try {
      // 얼굴 랜드마크 감지
      const results = this.faceLandmarker.detectForVideo(videoElement, timestamp);

      if (results.faceLandmarks && results.faceLandmarks.length > 0) {
        const landmarks = results.faceLandmarks[0];

        // FaceLandmark 형식으로 변환
        const faceLandmarks: FaceLandmark[] = landmarks.map(lm => ({
          x: lm.x,
          y: lm.y,
          z: lm.z || 0,
        }));

        // 표정 지표 추출 및 추적
        this.tracker.extractMetrics(faceLandmarks, timestamp);
      }
    } catch (error) {
      console.error("프레임 분석 실패:", error);
    }
  }

  /**
   * 이미지에서 얼굴 분석 (단일 프레임)
   */
  async analyzeImage(
    imageElement: HTMLImageElement | HTMLCanvasElement,
    timestamp: number,
  ): Promise<void> {
    if (!this.isInitialized || !this.faceLandmarker) {
      throw new Error("Face Landmarker가 초기화되지 않았습니다.");
    }

    try {
      const results = this.faceLandmarker.detect(imageElement);

      if (results.faceLandmarks && results.faceLandmarks.length > 0) {
        const landmarks = results.faceLandmarks[0];

        const faceLandmarks: FaceLandmark[] = landmarks.map(lm => ({
          x: lm.x,
          y: lm.y,
          z: lm.z || 0,
        }));

        this.tracker.extractMetrics(faceLandmarks, timestamp);
      }
    } catch (error) {
      console.error("이미지 분석 실패:", error);
    }
  }

  /**
   * 분석 완료 및 결과 반환
   */
  finalize() {
    return this.tracker.finalize();
  }

  /**
   * 리소스 정리
   */
  cleanup(): void {
    if (this.faceLandmarker) {
      this.faceLandmarker.close();
      this.faceLandmarker = null;
    }
    this.tracker.reset();
    this.isInitialized = false;
    this.startTime = 0;
  }

  /**
   * 초기화 상태 확인
   */
  isReady(): boolean {
    return this.isInitialized;
  }
}

/**
 * 간단한 사용 예제 (브라우저 환경)
 *
 * ```typescript
 * const analyzer = new FaceAnalyzer(2); // 2분
 * await analyzer.initialize();
 *
 * // 웹캠 스트림 처리
 * const video = document.querySelector('video');
 * const processFrame = async () => {
 *   if (video.readyState === video.HAVE_ENOUGH_DATA) {
 *     await analyzer.analyzeFrame(video, Date.now());
 *   }
 *   requestAnimationFrame(processFrame);
 * };
 *
 * // 분석 시작
 * processFrame();
 *
 * // 2분 후 결과 확인
 * setTimeout(() => {
 *   const results = analyzer.finalize();
 *   console.log(results);
 *   analyzer.cleanup();
 * }, 2 * 60 * 1000);
 * ```
 */
