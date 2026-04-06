import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://www.usesubstudio.com/",
      lastModified: new Date(),
      priority: 1.0,
    },
  ];
}
