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
app.use("/", express.static(path.join(__dirname, "public")));

// List directory contents (folders and video files)
async function listDirectory(dirPath) {
  const items = { folders: [], files: [] };

  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        items.folders.push({
          name: entry.name,
          type: "folder",
        });
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (VIDEO_EXTENSIONS.includes(ext)) {
          const stats = await fs.stat(fullPath);
          items.files.push({
            name: entry.name,
            type: "file",
            size: stats.size,
          });
        }
      }
    }

    // Sort alphabetically
    items.folders.sort((a, b) => a.name.localeCompare(b.name));
    items.files.sort((a, b) => a.name.localeCompare(b.name));
  } catch (err) {
    console.error(`Error listing ${dirPath}:`, err.message);
  }

  return items;
}

// Recursively get all video files for playlist generation
async function getAllFiles(dir, baseDir = dir) {
  const files = [];

  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        files.push(...(await getAllFiles(fullPath, baseDir)));
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (VIDEO_EXTENSIONS.includes(ext)) {
          const relativePath = path.relative(baseDir, fullPath);
          files.push({
            title: entry.name,
            url: "/media/" + relativePath.split(path.sep).join("/"),
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

// API: Browse directory
app.get("/api/browse", async (req, res) => {
  try {
    const relativePath = req.query.path || "";
    const fullPath = path.join(MEDIA_PATH, relativePath);

    // Security check
    const resolved = path.resolve(fullPath);
    if (!resolved.startsWith(path.resolve(MEDIA_PATH))) {
      return res.status(403).json({ error: "Forbidden" });
    }

    // Check if path exists
    try {
      await fs.access(fullPath);
    } catch {
      return res.status(404).json({ error: "Path not found" });
    }

    const stats = await fs.stat(fullPath);
    if (!stats.isDirectory()) {
      return res.status(400).json({ error: "Not a directory" });
    }

    const items = await listDirectory(fullPath);

    // Add path info
    const pathParts = relativePath
      ? relativePath.split("/").filter(Boolean)
      : [];

    res.json({
      currentPath: relativePath,
      pathParts: pathParts,
      ...items,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API: Get all files (for stats)
app.get("/api/files", async (req, res) => {
  try {
    const files = await getAllFiles(MEDIA_PATH);
    res.json(files);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Full playlist
app.get("/playlist.m3u", async (req, res) => {
  try {
    const relativePath = req.query.path || "";
    const fullPath = path.join(MEDIA_PATH, relativePath);

    // Security check
    const resolved = path.resolve(fullPath);
    if (!resolved.startsWith(path.resolve(MEDIA_PATH))) {
      return res.status(403).send("Forbidden");
    }

    const files = await getAllFiles(fullPath);
    const baseUrl = `${req.protocol}://${req.get("host")}`;

    res.setHeader("Content-Type", "audio/x-mpegurl");
    res.setHeader("Content-Disposition", "attachment; filename=playlist.m3u");
    res.send(generateM3U(files, baseUrl));
  } catch (err) {
    res.status(500).send("Error generating playlist: " + err.message);
  }
});

// Single file playlist
app.get("/single.m3u", async (req, res) => {
  try {
    const filePath = req.query.file;
    if (!filePath) {
      return res.status(400).send("Missing file parameter");
    }

    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const title = path.basename(filePath);
    const url = "/media/" + filePath.split(path.sep).join("/");

    const playlist = `#EXTM3U\n\n#EXTINF:-1,${title}\n${baseUrl}${url}\n`;
    const filename = title.replace(/[^a-zA-Z0-9.-]/g, "_");

    res.setHeader("Content-Type", "audio/x-mpegurl");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=${filename}.m3u`
    );
    res.send(playlist);
  } catch (err) {
    res.status(500).send("Error generating playlist: " + err.message);
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
