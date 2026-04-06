/**
 * Benchmark: compare transcription latency across models on Together AI.
 *
 * Usage:  npx tsx scripts/bench-transcribe.ts
 *
 * Reads all .mp3/.wav/.m4a files from data/ and transcribes each with every
 * model, measuring wall-clock time. Runs multiple iterations for stability.
 */
import "dotenv/config";
import fs from "fs";
import path from "path";
import os from "os";
import OpenAI from "openai";

const DATA_DIR = path.join(__dirname, "..", "data");
const AUDIO_EXTENSIONS = new Set([".mp3", ".wav", ".m4a", ".flac", ".webm"]);
const ITERATIONS = 3;

interface ModelConfig {
  name: string;
  model: string;
}

const MODELS: ModelConfig[] = [
  { name: "whisper-large-v3", model: "openai/whisper-large-v3" },
  { name: "parakeet-tdt-0.6b-v3", model: "nvidia/parakeet-tdt-0.6b-v3" },
];

interface RunResult {
  model: string;
  file: string;
  iteration: number;
  latencyMs: number;
  wordCount: number;
  audioDuration: number | null;
}

async function transcribe(
  client: OpenAI,
  audioPath: string,
  model: string
): Promise<{ latencyMs: number; wordCount: number; audioDuration: number | null }> {
  const audioStream = fs.createReadStream(audioPath);

  const start = performance.now();
  const response = await client.audio.transcriptions.create({
    file: audioStream,
    model,
    response_format: "verbose_json",
    timestamp_granularities: ["word"],
  });
  const latencyMs = performance.now() - start;

  const raw = response as unknown as Record<string, unknown>;
  const words = raw.words as Array<{ word: string }> | undefined;
  const duration = typeof raw.duration === "number" ? raw.duration : null;

  return {
    latencyMs,
    wordCount: words?.length ?? 0,
    audioDuration: duration,
  };
}

function fmt(ms: number): string {
  return (ms / 1000).toFixed(2) + "s";
}

async function main() {
  const apiKey = process.env.TOGETHER_API_KEY;
  if (!apiKey) {
    console.error("TOGETHER_API_KEY not set in .env");
    process.exit(1);
  }

  const files = fs
    .readdirSync(DATA_DIR)
    .filter((f) => AUDIO_EXTENSIONS.has(path.extname(f).toLowerCase()))
    .map((f) => path.join(DATA_DIR, f));

  if (files.length === 0) {
    console.error(`No audio files found in ${DATA_DIR}`);
    process.exit(1);
  }

  const client = new OpenAI({
    apiKey,
    baseURL: "https://api.together.xyz/v1",
  });

  console.log("=== Transcription Benchmark ===");
  console.log(`CPU:        ${os.cpus()[0].model} (${os.cpus().length} cores)`);
  console.log(`Files:      ${files.length} (${files.map((f) => path.basename(f)).join(", ")})`);
  console.log(`Models:     ${MODELS.map((m) => m.name).join(", ")}`);
  console.log(`Iterations: ${ITERATIONS}`);
  console.log("");

  const results: RunResult[] = [];

  for (const file of files) {
    const basename = path.basename(file);
    console.log(`--- ${basename} ---`);

    for (const modelCfg of MODELS) {
      const runs: number[] = [];

      for (let i = 0; i < ITERATIONS; i++) {
        process.stdout.write(
          `  ${modelCfg.name} [${i + 1}/${ITERATIONS}]...`
        );

        try {
          const result = await transcribe(client, file, modelCfg.model);
          runs.push(result.latencyMs);

          results.push({
            model: modelCfg.name,
            file: basename,
            iteration: i + 1,
            latencyMs: result.latencyMs,
            wordCount: result.wordCount,
            audioDuration: result.audioDuration,
          });

          console.log(
            ` ${fmt(result.latencyMs)} (${result.wordCount} words, ${result.audioDuration?.toFixed(1) ?? "?"}s audio)`
          );
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.log(` FAILED: ${msg}`);
        }
      }

      if (runs.length > 0) {
        const avg = runs.reduce((a, b) => a + b, 0) / runs.length;
        const min = Math.min(...runs);
        const max = Math.max(...runs);
        console.log(
          `  ${modelCfg.name} avg=${fmt(avg)}  min=${fmt(min)}  max=${fmt(max)}`
        );
      }
      console.log("");
    }
  }

  // Summary table
  console.log("=== Summary ===");
  console.log("");
  console.log(
    "Model                   File            Avg(s)   Min(s)   Max(s)   RTF      Words"
  );
  console.log("─".repeat(85));

  for (const modelCfg of MODELS) {
    for (const file of files) {
      const basename = path.basename(file);
      const runs = results.filter(
        (r) => r.model === modelCfg.name && r.file === basename
      );
      if (runs.length === 0) continue;

      const latencies = runs.map((r) => r.latencyMs);
      const avg = latencies.reduce((a, b) => a + b, 0) / latencies.length;
      const min = Math.min(...latencies);
      const max = Math.max(...latencies);
      const audioDur = runs[0].audioDuration ?? 0;
      const rtf = audioDur > 0 ? avg / 1000 / audioDur : 0;
      const words = runs[0].wordCount;

      console.log(
        `${modelCfg.name.padEnd(24)}${basename.padEnd(16)}${(avg / 1000).toFixed(2).padStart(7)}  ${(min / 1000).toFixed(2).padStart(7)}  ${(max / 1000).toFixed(2).padStart(7)}  ${rtf.toFixed(3).padStart(7)}  ${String(words).padStart(5)}`
      );
    }
  }

  // Winner
  console.log("");
  const modelAvgs = MODELS.map((m) => {
    const runs = results.filter((r) => r.model === m.name);
    if (runs.length === 0) return { name: m.name, avg: Infinity };
    const avg =
      runs.reduce((a, b) => a + b.latencyMs, 0) / runs.length;
    return { name: m.name, avg };
  }).sort((a, b) => a.avg - b.avg);

  if (modelAvgs.length >= 2 && modelAvgs[0].avg < Infinity) {
    const speedup = modelAvgs[1].avg / modelAvgs[0].avg;
    console.log(
      `Winner: ${modelAvgs[0].name} (${speedup.toFixed(2)}x faster than ${modelAvgs[1].name})`
    );
  }
}

main().catch((err) => {
  console.error("Benchmark failed:", err);
  process.exit(1);
});
