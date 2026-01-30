import { promises as fs } from "fs";
import path from "path";

export async function GET() {
  try {
    const contentDir = path.join(process.cwd(), "public", "content");

    let folders: string[] = [];
    try {
      folders = await fs.readdir(contentDir);
    } catch {
      return Response.json({ videos: [] });
    }

    const videos = [];

    for (const folder of folders) {
      const timelinePath = path.join(contentDir, folder, "timeline.json");

      try {
        const timelineContent = await fs.readFile(timelinePath, "utf-8");
        const timeline = JSON.parse(timelineContent);

        const stat = await fs.stat(timelinePath);

        let thumbnailUrl = null;
        if (timeline.elements && timeline.elements.length > 0) {
          const firstImageUid = timeline.elements[0].imageUrl;
          thumbnailUrl = `/content/${folder}/images/${firstImageUid}.png`;
        }

        videos.push({
          slug: folder,
          title: timeline.shortTitle || folder,
          createdAt: stat.mtime.toISOString(),
          thumbnailUrl,
          segmentCount: timeline.elements?.length || 0,
          textCount: timeline.text?.length || 0,
        });
      } catch {
        continue;
      }
    }

    videos.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return Response.json({ videos });
  } catch (error) {
    console.error("Error listing videos:", error);
    return Response.json({ videos: [], error: "Failed to list videos" }, { status: 500 });
  }
}
