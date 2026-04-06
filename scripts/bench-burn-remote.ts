/**
 * Benchmark: measure burn subtitle latency on a deployed Vercel instance.
 *
 * Usage:  npx tsx scripts/bench-burn-remote.ts [url]
 */

const BASE_URL = process.argv[2] || "https://www.usesubstudio.com/";

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
  const jobId = `bench-${Date.now()}`;

  console.log("=== Remote Burn Benchmark ===");
  console.log(`URL:    ${BASE_URL}/api/burn`);
  console.log(`Job ID: ${jobId}`);
  console.log(`Video:  sample-demo.mp4 (60s, 1440x720)`);
  console.log("");

  const start = performance.now();

  const res = await fetch(`${BASE_URL}/api/burn`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jobId,
      srtContent: SRT_CONTENT,
      isSample: true,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`HTTP ${res.status}: ${text}`);
    process.exit(1);
  }

  const reader = res.body!.getReader();
  let videoBytes = 0;
  let jsonBuffer = "";
  let doneMarkerSeen = false;
  let lastProgress = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    if (!doneMarkerSeen) {
      // Parse streaming JSON lines for progress
      const text = new TextDecoder().decode(value);
      jsonBuffer += text;

      const lines = jsonBuffer.split("\n");
      jsonBuffer = lines.pop()!; // keep incomplete line

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const evt = JSON.parse(line);
          if (evt.done) {
            doneMarkerSeen = true;
            break;
          }
          if (evt.stage === "encoding" && evt.progress != null) {
            const msg = `  encoding… ${evt.progress}%`;
            if (msg !== lastProgress) {
              process.stdout.write(`\r${msg}`);
              lastProgress = msg;
            }
          }
          if (evt.stage === "error") {
            console.error(`\nServer error: ${evt.message}`);
            process.exit(1);
          }
        } catch {}
      }
    } else {
      videoBytes += value.byteLength;
    }
  }

  const elapsed = ((performance.now() - start) / 1000).toFixed(2);

  console.log(`\r  encoding… 100%`);
  console.log("");
  console.log(`Elapsed:     ${elapsed}s`);
  console.log(`Output size: ${(videoBytes / 1024 / 1024).toFixed(2)} MB`);
  console.log(
    `Speed:       ${(60 / parseFloat(elapsed)).toFixed(2)}x realtime`,
  );
}

main().catch((err) => {
  console.error("Benchmark failed:", err);
  process.exit(1);
});
