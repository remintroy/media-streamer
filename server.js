const express = require("express");
const path = require("path");
const fs = require("fs").promises;
const fsSync = require("fs");

const app = express();
const PORT = process.env.PORT || 8080;
const MEDIA_PATH = process.env.MEDIA_PATH || "/data";
const VIDEO_EXTENSIONS = [
  ".mp4",
  ".mkv",
  ".avi",
  ".mov",
  ".wmv",
  ".flv",
  ".webm",
  ".m4v",
  ".mpg",
  ".mpeg",
  ".3gp",
];

// Serve static files from public directory
app.use(express.static(path.join(__dirname, "public")));

// Scan directory recursively for video files
async function scanMediaFiles(dir, baseDir = dir) {
  const files = [];

  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        files.push(...(await scanMediaFiles(fullPath, baseDir)));
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (VIDEO_EXTENSIONS.includes(ext)) {
          const relativePath = path.relative(baseDir, fullPath);
          const urlPath = "/media/" + relativePath.split(path.sep).join("/");

          files.push({
            title: entry.name,
            url: urlPath,
            path: relativePath,
            size: (await fs.stat(fullPath)).size,
          });
        }
      }
    }
  } catch (err) {
    console.error(`Error scanning ${dir}:`, err.message);
  }

  return files.sort((a, b) => a.title.localeCompare(b.title));
}

// Generate M3U playlist
function generateM3U(files, baseUrl) {
  let playlist = "#EXTM3U\n\n";

  for (const file of files) {
    playlist += `#EXTINF:-1,${file.title}\n`;
    playlist += `${baseUrl}${file.url}\n\n`;
  }

  return playlist;
}

// Format file size
function formatSize(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  if (bytes < 1024 * 1024 * 1024)
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + " GB";
}

// Routes
app.get("/playlist.m3u", async (req, res) => {
  try {
    const files = await scanMediaFiles(MEDIA_PATH);
    const baseUrl = `${req.protocol}://${req.get("host")}`;

    res.setHeader("Content-Type", "audio/x-mpegurl");
    res.setHeader("Content-Disposition", "attachment; filename=playlist.m3u");
    res.send(generateM3U(files, baseUrl));
  } catch (err) {
    res.status(500).send("Error generating playlist: " + err.message);
  }
});

app.get("/single.m3u", async (req, res) => {
  try {
    const filePath = req.query.file;
    if (!filePath) {
      return res.status(400).send("Missing file parameter");
    }

    const files = await scanMediaFiles(MEDIA_PATH);
    const matching = files.filter((f) => f.path === filePath);

    if (matching.length === 0) {
      return res.status(404).send("File not found");
    }

    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const filename = matching[0].title.replace(/[^a-zA-Z0-9.-]/g, "_");

    res.setHeader("Content-Type", "audio/x-mpegurl");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=${filename}.m3u`
    );
    res.send(generateM3U(matching, baseUrl));
  } catch (err) {
    res.status(500).send("Error generating playlist: " + err.message);
  }
});

app.get("/api/files", async (req, res) => {
  try {
    const files = await scanMediaFiles(MEDIA_PATH);
    res.json(files);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Serve video files with range support
app.get("/media/*", (req, res) => {
  const relativePath = req.params[0];
  const filePath = path.join(MEDIA_PATH, relativePath);

  // Security check
  const resolved = path.resolve(filePath);
  if (!resolved.startsWith(path.resolve(MEDIA_PATH))) {
    return res.status(403).send("Forbidden");
  }

  if (!fsSync.existsSync(filePath) || !fsSync.statSync(filePath).isFile()) {
    return res.status(404).send("File not found");
  }

  const stat = fsSync.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;

  // MIME types
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes = {
    ".mp4": "video/mp4",
    ".mkv": "video/x-matroska",
    ".avi": "video/x-msvideo",
    ".mov": "video/quicktime",
    ".wmv": "video/x-ms-wmv",
    ".flv": "video/x-flv",
    ".webm": "video/webm",
    ".m4v": "video/x-m4v",
    ".mpg": "video/mpeg",
    ".mpeg": "video/mpeg",
    ".3gp": "video/3gpp",
  };
  const contentType = mimeTypes[ext] || "application/octet-stream";

  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunkSize = end - start + 1;

    res.writeHead(206, {
      "Content-Range": `bytes ${start}-${end}/${fileSize}`,
      "Accept-Ranges": "bytes",
      "Content-Length": chunkSize,
      "Content-Type": contentType,
    });

    fsSync.createReadStream(filePath, { start, end }).pipe(res);
  } else {
    res.writeHead(200, {
      "Content-Length": fileSize,
      "Content-Type": contentType,
      "Accept-Ranges": "bytes",
    });

    fsSync.createReadStream(filePath).pipe(res);
  }
});

// Start server
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
  console.log(`Media path: ${MEDIA_PATH}`);
});
