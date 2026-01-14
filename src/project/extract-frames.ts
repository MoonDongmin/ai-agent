import ffmpeg from "fluent-ffmpeg";
import { existsSync, mkdirSync, readdirSync, readFileSync } from "fs";
import { join } from "path";

/**
 * 동영상에서 프레임 추출
 * @param videoPath 동영상 파일 경로
 * @param outputDir 프레임 저장 디렉토리
 * @param fps 초당 프레임 수 (기본값: 2)
 */
export async function extractFrames(
  videoPath: string,
  outputDir: string = "./frames",
  fps: number = 2
): Promise<string> {

  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  return new Promise<string>((resolve, reject) => {
    ffmpeg(videoPath)
      .outputOptions([
        `-vf fps=${fps}`,
      ])
      .output(`${outputDir}/frame-%04d.jpg`)
      .on("start", (commandLine) => {
        console.log("🎬 프레임 추출 시작:", commandLine);
      })
      .on("progress", (progress) => {
        if (progress.percent) {
          console.log(`⏳ 진행률: ${progress.percent.toFixed(2)}%`);
        }
      })
      .on("end", () => {
        console.log(`✅ 프레임 추출 완료: ${outputDir}`);
        resolve(outputDir);
      })
      .on("error", (err) => {
        console.error("❌ 프레임 추출 실패:", err.message);
        reject(err);
      })
      .run();
  });
}

/**
 * 추출된 프레임을 base64로 인코딩
 * @param framesDir 프레임 디렉토리
 * @returns base64 인코딩된 이미지 배열
 */
export function encodeFrames(framesDir: string): string[] {
  const files = readdirSync(framesDir)
    .filter((f) => f.endsWith(".jpg"))
    .sort();

  console.log(`📸 총 ${files.length}개의 프레임 발견`);

  return files.map((file) => {
    const path = join(framesDir, file);
    const buffer = readFileSync(path);
    return buffer.toString("base64");
  });
}

/**
 * 동영상 메타데이터 가져오기
 */
export async function getVideoMetadata(videoPath: string): Promise<any> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) {
        reject(err);
      } else {
        resolve(metadata);
      }
    });
  });
}

/**
 * 분수 형식의 FPS를 숫자로 변환 (예: "30/1" -> 30)
 */
function parseFps(fpsString: string): number {
  const [numerator, denominator] = fpsString.split("/").map(Number);
  return numerator / denominator;
}

// 직접 실행 시 테스트
if (import.meta.main) {
  const testVideoPath = process.argv[2];

  if (!testVideoPath) {
    console.error("사용법: bun src/chapter06/extract-frames.ts <video-path>");
    process.exit(1);
  }

  if (!existsSync(testVideoPath)) {
    console.error(`❌ 파일을 찾을 수 없습니다: ${testVideoPath}`);
    process.exit(1);
  }

  // 메타데이터 출력
  const metadata = await getVideoMetadata(testVideoPath);
  console.log("\n📊 동영상 정보:");
  console.log(`- 포맷: ${metadata.format.format_long_name}`);
  console.log(`- 길이: ${metadata.format.duration}초`);
  console.log(`- 크기: ${(metadata.format.size / 1024 / 1024).toFixed(2)}MB`);

  const videoStream = metadata.streams.find((s: any) => s.codec_type === "video");
  if (videoStream) {
    console.log(`- 해상도: ${videoStream.width}x${videoStream.height}`);
    console.log(`- FPS: ${parseFps(videoStream.r_frame_rate).toFixed(2)}`);
  }

  // 프레임 추출
  console.log("\n🎬 프레임 추출 중...\n");
  const outputDir = await extractFrames(testVideoPath, "./frames", 2);

  // 프레임 인코딩
  const encodedFrames = encodeFrames(outputDir);
  console.log(`\n✅ ${encodedFrames.length}개의 프레임을 base64로 인코딩 완료`);
}
