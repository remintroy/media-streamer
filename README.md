# 📺 Media Streaming Server

A lightweight, containerized media server built with Node.js and Express. Stream your video collection from anywhere with M3U8 playlist support.

## ✨ Features

- **Recursive Directory Scanning** - Automatically finds all video files in subdirectories
- **HTTP Range Requests** - Full support for video seeking (206 Partial Content)
- **M3U8 Playlist Generation** - Compatible with VLC, IPTV players, and more
- **Modern Web Interface** - Dark theme with glassmorphism design
- **Real-time Search** - Filter videos instantly without page reload
- **Docker Ready** - Runs in a lightweight Alpine container

## 📁 Supported Video Formats

`.mp4`, `.mkv`, `.avi`, `.mov`, `.wmv`, `.flv`, `.webm`, `.m4v`, `.mpg`, `.mpeg`, `.3gp`

## 🚀 Quick Start

### Using Docker Compose (Recommended)

1. **Set the media directory path:**

   ```bash
   export MEDIA_PATH=/path/to/your/videos
   ```

2. **Start the server:**

   ```bash
   docker-compose up -d
   ```

3. **Access the web interface:**

   Open [http://localhost:8080](http://localhost:8080) in your browser

### Using Node.js Directly

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Set environment variables:**

   ```bash
   export MEDIA_PATH=/path/to/your/videos
   export PORT=8080  # Optional, defaults to 8080
   ```

3. **Start the server:**

   ```bash
   npm start
   ```

## 📡 API Endpoints

| Endpoint                    | Description                     |
| --------------------------- | ------------------------------- |
| `GET /`                     | Web interface with video grid   |
| `GET /api/files`            | JSON array of all video files   |
| `GET /playlist.m3u`         | Download full M3U8 playlist     |
| `GET /single.m3u?file=path` | Download single file playlist   |
| `GET /stream/:path`         | Stream video with range support |
| `GET /health`               | Health check endpoint           |

## 🎬 Using with Media Players

### VLC Media Player

1. Download the playlist from the web interface
2. Open VLC → Media → Open File
3. Select the downloaded `.m3u` file

### IPTV Players

Use the playlist URL directly:

```
http://your-server-ip:8080/playlist.m3u
```

### Kodi

1. Add a new source with the playlist URL
2. Or use the PVR IPTV Simple Client addon

## 🐳 Docker Configuration

### Environment Variables

| Variable     | Default       | Description                              |
| ------------ | ------------- | ---------------------------------------- |
| `PORT`       | `8080`        | Server port                              |
| `MEDIA_PATH` | `/data`       | Path to media directory inside container |
| `BASE_URL`   | Auto-detected | Base URL for playlist generation         |

### Resource Limits

The container is configured with:

- **Memory:** 128MB max
- **CPU:** 0.5 cores max

To adjust, modify `docker-compose.yml`:

```yaml
deploy:
  resources:
    limits:
      memory: 256M
      cpus: "1.0"
```

### Custom Port

```bash
# In docker-compose.yml, change:
ports:
  - "3000:8080"
```

## 📂 Folder Structure

```
streamer/
├── server.js          # Main application
├── package.json       # Dependencies
├── docker-compose.yml # Docker configuration
└── README.md          # This file
```

## 🔧 Advanced Configuration

### Running Behind a Reverse Proxy (Nginx)

```nginx
server {
    listen 80;
    server_name media.example.com;

    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_buffering off;
    }
}
```

### Running with Traefik

Add labels to `docker-compose.yml`:

```yaml
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.media.rule=Host(`media.example.com`)"
```

## 🛡️ Security Notes

- Media directory is mounted as **read-only** (`:ro`)
- Path traversal attacks are prevented
- Only video file extensions are served
- No authentication included (add a reverse proxy for auth)

## 📊 Performance Tips

1. **Use SSD storage** for faster file scanning
2. **Keep video files organized** in subdirectories
3. **Monitor memory usage** with `docker stats`
4. **Increase cache TTL** in `server.js` for large libraries

## 🐛 Troubleshooting

### Videos not appearing

1. Check the media directory path:

   ```bash
   docker exec media-server ls -la /data
   ```

2. Verify file permissions:
   ```bash
   ls -la $MEDIA_PATH
   ```

### Seeking not working

Ensure your client supports HTTP range requests. Most modern browsers and players do.

### Container keeps restarting

Check logs:

```bash
docker logs media-server
```

## 📝 License

MIT License - Feel free to use, modify, and distribute.

---

**Built with ❤️ using Node.js and Express**
