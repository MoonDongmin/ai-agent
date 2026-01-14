/**
 * 표정 지표 추적 및 변화량 계산 클래스
 * MediaPipe Face Landmarker의 478개 랜드마크를 기반으로 표정을 수치화
 */

export interface FaceLandmark {
  x: number;
  y: number;
  z: number;
}

export interface ExpressionMetrics {
  timestamp: number;
  eyeAspectRatio: {
    left: number;
    right: number;
  };
  mouthAspectRatio: number;
  eyebrowHeight: {
    left: number;
    right: number;
  };
  smileIntensity: number;
  headTilt: number;
}

export interface SignificantChange {
  timestamp: number;
  metric: string;
  value: number;
  changeRate: number;
  description: string;
}

export class FacialExpressionTracker {
  private metricsHistory: ExpressionMetrics[] = [];
  private significantChanges: SignificantChange[] = [];
  private readonly maxDuration: number;
  private readonly changeThreshold = 0.15; // 15% 변화를 유의미한 변화로 간주

  // MediaPipe Face Landmarker 인덱스
  private readonly LEFT_EYE_INDICES = [33, 160, 158, 133, 153, 144];
  private readonly RIGHT_EYE_INDICES = [362, 385, 387, 263, 373, 380];
  private readonly MOUTH_INDICES = [61, 291, 0, 17, 78, 308];
  private readonly LEFT_EYEBROW_INDICES = [70, 63, 105, 66, 107];
  private readonly RIGHT_EYEBROW_INDICES = [336, 296, 334, 293, 300];
  private readonly SMILE_INDICES = [61, 291, 13, 14]; // 입꼬리

  constructor(maxDurationMinutes: number = 2) {
    this.maxDuration = maxDurationMinutes * 60 * 1000; // 밀리초로 변환
  }

  /**
   * Eye Aspect Ratio (EAR) 계산
   * 눈의 개폐 정도를 측정 (0에 가까울수록 감김, 1에 가까울수록 열림)
   */
  private calculateEAR(eyeLandmarks: FaceLandmark[]): number {
    const [p1, p2, p3, p4, p5, p6] = eyeLandmarks;

    const verticalDist1 = this.distance(p2, p6);
    const verticalDist2 = this.distance(p3, p5);
    const horizontalDist = this.distance(p1, p4);

    return (verticalDist1 + verticalDist2) / (2.0 * horizontalDist);
  }

  /**
   * Mouth Aspect Ratio (MAR) 계산
   * 입의 열림 정도를 측정
   */
  private calculateMAR(mouthLandmarks: FaceLandmark[]): number {
    const [p1, p2, p3, p4, p5, p6] = mouthLandmarks;

    const verticalDist = this.distance(p3, p4);
    const horizontalDist = this.distance(p1, p2);

    return verticalDist / horizontalDist;
  }

  /**
   * 두 점 사이의 유클리드 거리 계산
   */
  private distance(p1: FaceLandmark, p2: FaceLandmark): number {
    return Math.sqrt(
      Math.pow(p2.x - p1.x, 2) +
      Math.pow(p2.y - p1.y, 2) +
      Math.pow(p2.z - p1.z, 2),
    );
  }

  /**
   * 눈썹 높이 계산 (놀람 표정 감지)
   */
  private calculateEyebrowHeight(
    eyebrowLandmarks: FaceLandmark[],
    eyeLandmarks: FaceLandmark[],
  ): number {
    const eyebrowAvgY = eyebrowLandmarks.reduce((sum, p) => sum + p.y, 0) / eyebrowLandmarks.length;
    const eyeAvgY = eyeLandmarks.reduce((sum, p) => sum + p.y, 0) / eyeLandmarks.length;

    return Math.abs(eyeAvgY - eyebrowAvgY);
  }

  /**
   * 웃음 강도 계산
   * 입꼬리가 올라가는 정도를 측정
   */
  private calculateSmileIntensity(smileLandmarks: FaceLandmark[]): number {
    const [leftCorner, rightCorner, upperLip, lowerLip] = smileLandmarks;

    const mouthCenter = {
      x: (upperLip.x + lowerLip.x) / 2,
      y: (upperLip.y + lowerLip.y) / 2,
      z: (upperLip.z + lowerLip.z) / 2,
    };

    const leftSmile = leftCorner.y - mouthCenter.y;
    const rightSmile = rightCorner.y - mouthCenter.y;

    return (leftSmile + rightSmile) / 2;
  }

  /**
   * 머리 기울기 계산
   */
  private calculateHeadTilt(landmarks: FaceLandmark[]): number {
    const leftEye = landmarks[33];
    const rightEye = landmarks[263];

    const angle = Math.atan2(
      rightEye.y - leftEye.y,
      rightEye.x - leftEye.x,
    );

    return angle * (180 / Math.PI);
  }

  /**
   * 얼굴 랜드마크로부터 표정 지표 추출
   */
  public extractMetrics(
    landmarks: FaceLandmark[],
    timestamp: number,
  ): ExpressionMetrics {
    const leftEyeLandmarks = this.LEFT_EYE_INDICES.map(i => landmarks[i]);
    const rightEyeLandmarks = this.RIGHT_EYE_INDICES.map(i => landmarks[i]);
    const mouthLandmarks = this.MOUTH_INDICES.map(i => landmarks[i]);
    const leftEyebrowLandmarks = this.LEFT_EYEBROW_INDICES.map(i => landmarks[i]);
    const rightEyebrowLandmarks = this.RIGHT_EYEBROW_INDICES.map(i => landmarks[i]);
    const smileLandmarks = this.SMILE_INDICES.map(i => landmarks[i]);

    const metrics: ExpressionMetrics = {
      timestamp,
      eyeAspectRatio: {
        left: this.calculateEAR(leftEyeLandmarks),
        right: this.calculateEAR(rightEyeLandmarks),
      },
      mouthAspectRatio: this.calculateMAR(mouthLandmarks),
      eyebrowHeight: {
        left: this.calculateEyebrowHeight(leftEyebrowLandmarks, leftEyeLandmarks),
        right: this.calculateEyebrowHeight(rightEyebrowLandmarks, rightEyeLandmarks),
      },
      smileIntensity: this.calculateSmileIntensity(smileLandmarks),
      headTilt: this.calculateHeadTilt(landmarks),
    };

    this.metricsHistory.push(metrics);
    this.detectSignificantChanges(metrics);

    return metrics;
  }

  /**
   * 유의미한 변화 감지
   */
  private detectSignificantChanges(currentMetrics: ExpressionMetrics): void {
    if (this.metricsHistory.length < 2) return;

    const previousMetrics = this.metricsHistory[this.metricsHistory.length - 2];
    const changes: Array<{ metric: string; value: number; changeRate: number; description: string }> = [];

    // EAR 변화 (깜빡임, 눈 뜨기/감기)
    const leftEARChange = Math.abs(currentMetrics.eyeAspectRatio.left - previousMetrics.eyeAspectRatio.left);
    const rightEARChange = Math.abs(currentMetrics.eyeAspectRatio.right - previousMetrics.eyeAspectRatio.right);

    if (leftEARChange > this.changeThreshold) {
      changes.push({
        metric: "leftEyeAspectRatio",
        value: currentMetrics.eyeAspectRatio.left,
        changeRate: leftEARChange,
        description: currentMetrics.eyeAspectRatio.left < 0.2 ? "왼쪽 눈 감김" : "왼쪽 눈 뜨기",
      });
    }

    if (rightEARChange > this.changeThreshold) {
      changes.push({
        metric: "rightEyeAspectRatio",
        value: currentMetrics.eyeAspectRatio.right,
        changeRate: rightEARChange,
        description: currentMetrics.eyeAspectRatio.right < 0.2 ? "오른쪽 눈 감김" : "오른쪽 눈 뜨기",
      });
    }

    // MAR 변화 (말하기, 하품)
    const marChange = Math.abs(currentMetrics.mouthAspectRatio - previousMetrics.mouthAspectRatio);
    if (marChange > this.changeThreshold) {
      changes.push({
        metric: "mouthAspectRatio",
        value: currentMetrics.mouthAspectRatio,
        changeRate: marChange,
        description: currentMetrics.mouthAspectRatio > 0.5 ? "입 크게 벌림" : "입 다물기",
      });
    }

    // 눈썹 높이 변화 (놀람, 의아함)
    const leftEyebrowChange = Math.abs(currentMetrics.eyebrowHeight.left - previousMetrics.eyebrowHeight.left);
    const rightEyebrowChange = Math.abs(currentMetrics.eyebrowHeight.right - previousMetrics.eyebrowHeight.right);

    if (leftEyebrowChange > this.changeThreshold || rightEyebrowChange > this.changeThreshold) {
      const avgChange = (leftEyebrowChange + rightEyebrowChange) / 2;
      changes.push({
        metric: "eyebrowHeight",
        value: (currentMetrics.eyebrowHeight.left + currentMetrics.eyebrowHeight.right) / 2,
        changeRate: avgChange,
        description: "눈썹 위치 변화 (놀람 또는 의아함)",
      });
    }

    // 웃음 강도 변화
    const smileChange = Math.abs(currentMetrics.smileIntensity - previousMetrics.smileIntensity);
    if (smileChange > this.changeThreshold) {
      changes.push({
        metric: "smileIntensity",
        value: currentMetrics.smileIntensity,
        changeRate: smileChange,
        description: currentMetrics.smileIntensity > previousMetrics.smileIntensity ? "웃음 시작" : "웃음 멈춤",
      });
    }

    // 머리 기울기 변화
    const headTiltChange = Math.abs(currentMetrics.headTilt - previousMetrics.headTilt);
    if (headTiltChange > 5) { // 5도 이상 변화
      changes.push({
        metric: "headTilt",
        value: currentMetrics.headTilt,
        changeRate: headTiltChange,
        description: `머리 기울기 변화 (${currentMetrics.headTilt.toFixed(1)}도)`,
      });
    }

    // 유의미한 변화 저장
    changes.forEach(change => {
      this.significantChanges.push({
        timestamp: currentMetrics.timestamp,
        ...change,
      });
    });
  }

  /**
   * 측정 완료 및 결과 반환
   */
  public finalize(): {
    metricsHistory: ExpressionMetrics[];
    significantChanges: SignificantChange[];
    summary: {
      totalDuration: number;
      averageMetrics: Partial<ExpressionMetrics>;
      changeCount: number;
    };
  } {
    const summary = this.generateSummary();

    return {
      metricsHistory: this.metricsHistory,
      significantChanges: this.significantChanges,
      summary,
    };
  }

  /**
   * 요약 통계 생성
   */
  private generateSummary() {
    if (this.metricsHistory.length === 0) {
      return {
        totalDuration: 0,
        averageMetrics: {},
        changeCount: 0,
      };
    }

    const firstTimestamp = this.metricsHistory[0].timestamp;
    const lastTimestamp = this.metricsHistory[this.metricsHistory.length - 1].timestamp;
    const totalDuration = lastTimestamp - firstTimestamp;

    // 평균 지표 계산
    const avgLeftEAR = this.metricsHistory.reduce((sum, m) => sum + m.eyeAspectRatio.left, 0) / this.metricsHistory.length;
    const avgRightEAR = this.metricsHistory.reduce((sum, m) => sum + m.eyeAspectRatio.right, 0) / this.metricsHistory.length;
    const avgMAR = this.metricsHistory.reduce((sum, m) => sum + m.mouthAspectRatio, 0) / this.metricsHistory.length;
    const avgSmile = this.metricsHistory.reduce((sum, m) => sum + m.smileIntensity, 0) / this.metricsHistory.length;

    return {
      totalDuration,
      averageMetrics: {
        eyeAspectRatio: {
          left: avgLeftEAR,
          right: avgRightEAR,
        },
        mouthAspectRatio: avgMAR,
        smileIntensity: avgSmile,
      },
      changeCount: this.significantChanges.length,
    };
  }

  /**
   * 데이터 초기화
   */
  public reset(): void {
    this.metricsHistory = [];
    this.significantChanges = [];
  }
}
