/**
 * Test 3 subtitle styles burned into the sample video, in parallel.
 *
 * Usage:  npx tsx scripts/test-styles.ts
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

interface Style {
  name: string;
  forceStyle: string;
}

const STYLES: Style[] = [
  {
    name: "modern-box",
    // Black text on white opaque box (BorderStyle=3 uses OutlineColour as box color)
    forceStyle:
      "Fontname=Noto Sans,Fontsize=32,Bold=1,PrimaryColour=&H00000000,OutlineColour=&H00FFFFFF,BorderStyle=3,Outline=6,Shadow=0,MarginV=30",
  },
];

function burnWithStyle(
  videoPath: string,
  srtPath: string,
  outputPath: string,
  style: Style
): Promise<void> {
  return new Promise((resolve, reject) => {
    const safeSrtPath = srtPath
      .replace(/\\/g, "/")
      .replace(/:/g, "\\:")
      .replace(/'/g, "'\\''");
    const safeFontsDir = FONTS_DIR.replace(/\\/g, "/").replace(/:/g, "\\:");

    const filter = `subtitles='${safeSrtPath}':fontsdir='${safeFontsDir}':force_style='${style.forceStyle}'`;

    console.log(`[${style.name}] Starting burn...`);

    ffmpeg(videoPath)
      .videoFilters([filter])
      .outputOptions([
        "-c:v libx264",
        "-crf 28",
        "-preset ultrafast",
        "-threads 0",
        "-pix_fmt yuv420p",
        "-c:a copy",
        "-t 10",
        "-movflags +faststart",
      ])
      .on("progress", (p) => {
        const pct =
          typeof p.percent === "number" && !isNaN(p.percent) ? p.percent : 0;
        if (Math.round(pct) % 25 === 0 && pct > 0) {
          console.log(`[${style.name}] ${Math.round(pct)}%`);
        }
      })
      .on("error", (err) => {
        console.error(`[${style.name}] Error:`, err.message);
        reject(err);
      })
      .on("end", () => {
        const size = fs.statSync(outputPath).size;
        console.log(
          `[${style.name}] Done → ${outputPath} (${(size / 1024 / 1024).toFixed(2)} MB)`
        );
        resolve();
      })
      .save(outputPath);
  });
}

async function main() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "style-test-"));
  const srtPath = path.join(tmpDir, "test.srt");
  fs.writeFileSync(srtPath, SRT_CONTENT);

  console.log("=== Subtitle Style Test (3 styles in parallel) ===");
  console.log(`Video:  ${SAMPLE_VIDEO}`);
  console.log(`Tmp:    ${tmpDir}`);
  console.log(`Styles: ${STYLES.map((s) => s.name).join(", ")}`);
  console.log("");

  const start = performance.now();

  await Promise.all(
    STYLES.map((style) => {
      const outputPath = path.join(tmpDir, `${style.name}.mp4`);
      return burnWithStyle(SAMPLE_VIDEO, srtPath, outputPath, style);
    })
  );

  const elapsed = ((performance.now() - start) / 1000).toFixed(2);
  console.log("");
  console.log(`All 3 styles completed in ${elapsed}s`);
  console.log(`Output files in: ${tmpDir}`);
}

main().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
