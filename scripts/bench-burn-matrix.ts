/**
 * Benchmark matrix: test different preset/CRF combos locally.
 *
 * Usage:  npx tsx scripts/bench-burn-matrix.ts
 */
import fs from "fs";
import path from "path";
import os from "os";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "@ffmpeg-installer/ffmpeg";

ffmpeg.setFfmpegPath(ffmpegPath.path);

const SAMPLE_VIDEO = path.join(__dirname, "..", "public", "sample-demo.mp4");
const FONTS_DIR = path.join(__dirname, "..", "public", "fonts");

const SRT_CONTENT = `1
00:00:00,000 --> 00:00:05,000
This is a benchmark subtitle line one.

2
00:00:05,000 --> 00:00:10,000
This is a benchmark subtitle line two.

3
00:00:10,000 --> 00:00:20,000
A slightly longer subtitle to test rendering performance.

4
00:00:20,000 --> 00:00:40,000
More text here to simulate a real subtitle file with content.

5
00:00:40,000 --> 00:01:00,000
Final subtitle line covering the last segment of the video.
`;

interface Config {
  preset: string;
  crf: number;
}

const CONFIGS: Config[] = [
  // baseline
  { preset: "medium", crf: 17 },
  // faster presets, same quality
  { preset: "fast", crf: 17 },
  { preset: "veryfast", crf: 17 },
  { preset: "ultrafast", crf: 17 },
  // lower quality, fast presets
  { preset: "veryfast", crf: 23 },
  { preset: "ultrafast", crf: 23 },
  { preset: "ultrafast", crf: 28 },
];

function burnWithConfig(
  videoPath: string,
  srtPath: string,
  outputPath: string,
  config: Config,
  fontsDir: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const safeSrtPath = srtPath.replace(/\\/g, "/").replace(/:/g, "\\:");
    const safeFontsDir = fontsDir.replace(/\\/g, "/").replace(/:/g, "\\:");

    const subtitleFilter =
      `subtitles='${safeSrtPath}':fontsdir='${safeFontsDir}'` +
      `:force_style='Fontname=Noto Sans,Fontsize=20,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BorderStyle=3,Outline=2,Shadow=0,MarginV=25'`;

    ffmpeg(videoPath)
      .videoFilters([subtitleFilter])
      .outputOptions([
        `-c:v libx264`,
        `-crf ${config.crf}`,
        `-preset ${config.preset}`,
        `-pix_fmt yuv420p`,
        `-c:a copy`,
        `-movflags +faststart`,
      ])
      .on("error", reject)
      .on("end", resolve)
      .save(outputPath);
  });
}

async function main() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "burn-matrix-"));
  const srtPath = path.join(tmpDir, "bench.srt");
  fs.writeFileSync(srtPath, SRT_CONTENT);

  console.log("=== Burn Subtitle Benchmark Matrix ===");
  console.log(`Video: 60s, 1440x720, h264`);
  console.log(`CPU:   ${os.cpus()[0].model} (${os.cpus().length} cores)`);
  console.log("");
  console.log(
    "Preset        CRF   Time(s)  Size(MB)  Speed(x)  vs baseline"
  );
  console.log("─".repeat(65));

  let baselineTime = 0;

  for (const config of CONFIGS) {
    const outputPath = path.join(
      tmpDir,
      `out_${config.preset}_${config.crf}.mp4`
    );

    const start = performance.now();
    await burnWithConfig(SAMPLE_VIDEO, srtPath, outputPath, config, FONTS_DIR);
    const elapsed = (performance.now() - start) / 1000;

    const size = fs.statSync(outputPath).size / 1024 / 1024;
    const speed = 60 / elapsed;

    if (config.preset === "medium" && config.crf === 17) baselineTime = elapsed;

    const improvement = baselineTime
      ? `${((1 - elapsed / baselineTime) * 100).toFixed(0)}% faster`
      : "baseline";

    console.log(
      `${config.preset.padEnd(14)}${String(config.crf).padEnd(6)}${elapsed.toFixed(2).padStart(7)}  ${size.toFixed(2).padStart(8)}  ${speed.toFixed(2).padStart(8)}  ${improvement}`
    );

    fs.unlinkSync(outputPath);
  }

  fs.unlinkSync(srtPath);
  fs.rmdirSync(tmpDir);
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
