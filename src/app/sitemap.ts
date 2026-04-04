import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
    return [
        {
            url: "https://ai-subtitles-rosy.vercel.app",
            lastModified: new Date(),
            priority: 1.0,
        },
    ];
}
