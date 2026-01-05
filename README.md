# Media Streamer

A lightweight, containerized media streaming server built with Node.js. Browse your folders and stream videos directly in your browser or generate M3U playlists for VLC.

## Features

- 📂 **Folder Browsing**: Navigate your media directories via a clean web interface.
- 🎥 **Video Streaming**: Play videos directly in the browser (supports range requests).
- 📜 **Playlist Generation**: Download M3U playlists for entire folders or single files.
- 🔍 **Search**: Instantly search for files within the current folder.
- 🐳 **Docker Ready**: Easy deployment with Docker Compose.
- ⚡ **ES Modules**: Modern, modular codebase.

## Quick Start

### Using Docker (Recommended)

1.  Clone the repository:

    ```bash
    git clone https://github.com/yourusername/media-streamer.git
    cd media-streamer
    ```

2.  Update `docker-compose.yml` to point to your media folder:

    ```yaml
    volumes:
      - /path/to/your/movies:/data
    ```

3.  Start the server:

    ```bash
    docker-compose up -d
    ```

4.  Visit `http://localhost:8080`.

### Local Development

1.  Install dependencies:

    ```bash
    npm install
    ```

2.  Start the server:
    ```bash
    # Default media path is /data. set MEDIA_PATH env var to override.
    MEDIA_PATH=/path/to/media npm run dev
    ```

## Development

### Project Structure

- `src/`: Backend source code (Controllers, Services, Routes).
- `public/`: Frontend static files (ES Module client).

### Linting

```bash
npm run lint
```

## License

MIT
