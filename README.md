# [SubStudio](https://substudio.vercel.app) — generate perfect subtitles with AI

Upload a video or paste a direct media link to instantly create accurate, timed subtitles. Edit, style, and export captions for any platform. Powered by [Together AI](https://together.ai).

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Luffixos/ai-subtitles&env=TOGETHER_API_KEY&project-name=substudio&repo-name=substudio)

[![SubStudio](./public/sub-studio-OG.png)](https://substudio.vercel.app)

## How it works

SubStudio uses [Together AI's](https://together.ai) Whisper Large v3 model to transcribe your video with word-level timestamps. It automatically merges short intervals into readable subtitle blocks, then lets you preview and style them in real-time with 6 preset styles.

1. **Upload** a video file or paste a direct media link
2. **Transcribe** — audio is extracted and sent to Together AI's Whisper endpoint for fast, accurate transcription
3. **Edit & Style** — preview subtitles in real time with 6 styles (Classic, TikTok, Modern Box, Cinematic, Outline, Bold Center)
4. **Export** — download as `.srt`, `.vtt`, or burned-in `.mp4`

## Running Locally

### Cloning the repository

```bash
git clone https://github.com/Luffixos/ai-subtitles.git
cd ai-subtitles
```

### Getting API keys

**Together AI** (required — powers transcription):

1. Go to [Together AI](https://api.together.ai/settings/api-keys) to create an account
2. Copy your API key

### Storing API keys in .env

Create a `.env` file in the root directory and add your key:

```
TOGETHER_API_KEY=your_api_key_here
```

Or enter your Together AI key directly in the app by clicking the key icon in the top-right corner.

### Installing dependencies

```bash
npm install
```

### Running the application

```bash
npm run dev
```

The app will be available at `http://localhost:3000`.

## One-Click Deploy

Deploy your own instance using [Vercel](https://vercel.com):

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Luffixos/ai-subtitles&env=TOGETHER_API_KEY&project-name=substudio&repo-name=substudio)

## Tech stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router)
- **AI**: [Together AI](https://together.ai) — Whisper Large v3 for transcription
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Video Processing**: FFmpeg (via `fluent-ffmpeg`)

## License

This repo is MIT licensed.
