/**
 * Benchmark: measure how long burnSubtitles takes on the sample video.
 *
 * Usage:  npx tsx scripts/bench-burn.ts
 */
import fs from "fs";
import path from "path";
import os from "os";
import { burnSubtitles } from "../src/lib/video-utils";

const SAMPLE_VIDEO = path.join(__dirname, "..", "public", "sample-demo.mp4");

// Minimal SRT that covers the full 60s video
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

async function main() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "burn-bench-"));
  const srtPath = path.join(tmpDir, "bench.srt");
  const outputPath = path.join(tmpDir, "burned.mp4");
  const fontsDir = path.join(__dirname, "..", "public", "fonts");

  fs.writeFileSync(srtPath, SRT_CONTENT);

  console.log("=== Burn Subtitle Benchmark ===");
  console.log(`Video:    ${SAMPLE_VIDEO}`);
  console.log(`Duration: 60s, 1440x720, h264`);
  console.log(`Preset:   medium, CRF 17`);
  console.log(`CPU:      ${os.cpus()[0].model} (${os.cpus().length} cores)`);
  console.log("");

  const start = performance.now();

  await burnSubtitles(SAMPLE_VIDEO, srtPath, outputPath, { fontsDir }, (p) => {
    process.stdout.write(`\r  encoding… ${Math.round(p.percent)}%`);
  });

  const elapsed = ((performance.now() - start) / 1000).toFixed(2);
  const outSize = fs.statSync(outputPath).size;

  console.log(`\r  encoding… 100%`);
  console.log("");
  console.log(`Elapsed:     ${elapsed}s`);
  console.log(`Output size: ${(outSize / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Speed:       ${(60 / parseFloat(elapsed)).toFixed(2)}x realtime`);

  // Cleanup
  fs.unlinkSync(srtPath);
  fs.unlinkSync(outputPath);
  fs.rmdirSync(tmpDir);
}

main().catch((err) => {
  console.error("Benchmark failed:", err);
  process.exit(1);
});
