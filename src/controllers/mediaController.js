import path from 'path';
import fs from 'fs';
import { mediaService } from '../services/mediaService.js';
import { config } from '../config/env.js';

export class MediaController {
  async browse(req, res) {
    try {
      const relativePath = req.query.path || '';
      const fullPath = path.join(config.mediaPath, relativePath);

      // Security check
      const resolved = path.resolve(fullPath);
      if (!resolved.startsWith(path.resolve(config.mediaPath))) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      // Check if path exists
      try {
        await mediaService.checkAccess(fullPath);
      } catch {
        return res.status(404).json({ error: 'Path not found' });
      }

      const stats = await mediaService.getFileStats(fullPath);
      if (!stats.isDirectory()) {
        return res.status(400).json({ error: 'Not a directory' });
      }

      const items = await mediaService.listDirectory(fullPath);

      // Add path info
      const pathParts = relativePath
        ? relativePath.split('/').filter(Boolean)
        : [];

      res.json({
        currentPath: relativePath,
        pathParts: pathParts,
        ...items,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  async getFiles(req, res) {
    try {
      const files = await mediaService.getAllFiles(config.mediaPath);
      res.json(files);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  async getPlaylist(req, res) {
    try {
      const relativePath = req.query.path || '';
      const fullPath = path.join(config.mediaPath, relativePath);

      // Security check
      const resolved = path.resolve(fullPath);
      if (!resolved.startsWith(path.resolve(config.mediaPath))) {
        return res.status(403).send('Forbidden');
      }

      const files = await mediaService.getAllFiles(fullPath);
      const baseUrl = `${req.protocol}://${req.get('host')}`;

      res.setHeader('Content-Type', 'audio/x-mpegurl');
      res.setHeader('Content-Disposition', 'attachment; filename=playlist.m3u');
      res.send(mediaService.generateM3U(files, baseUrl));
    } catch (err) {
      res.status(500).send('Error generating playlist: ' + err.message);
    }
  }

  async getSinglePlaylist(req, res) {
    try {
      const filePath = req.query.file;
      if (!filePath) {
        return res.status(400).send('Missing file parameter');
      }

      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const title = path.basename(filePath);
      const url = '/media/' + filePath.split(path.sep).join('/');

      const playlist = `#EXTM3U\n\n#EXTINF:-1,${title}\n${baseUrl}${url}\n`;
      const filename = title.replace(/[^a-zA-Z0-9.-]/g, '_');

      res.setHeader('Content-Type', 'audio/x-mpegurl');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=${filename}.m3u`
      );
      res.send(playlist);
    } catch (err) {
      res.status(500).send('Error generating playlist: ' + err.message);
    }
  }

  streamMedia(req, res) {
    const relativePath = req.params[0];
    const filePath = path.join(config.mediaPath, relativePath);

    // Security check
    const resolved = path.resolve(filePath);
    if (!resolved.startsWith(path.resolve(config.mediaPath))) {
      return res.status(403).send('Forbidden');
    }

    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
      return res.status(404).send('File not found');
    }

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;

    // MIME types
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      '.mp4': 'video/mp4',
      '.mkv': 'video/x-matroska',
      '.avi': 'video/x-msvideo',
      '.mov': 'video/quicktime',
      '.wmv': 'video/x-ms-wmv',
      '.flv': 'video/x-flv',
      '.webm': 'video/webm',
      '.m4v': 'video/x-m4v',
      '.mpg': 'video/mpeg',
      '.mpeg': 'video/mpeg',
      '.3gp': 'video/3gpp',
    };
    const contentType = mimeTypes[ext] || 'application/octet-stream';

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = end - start + 1;

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': contentType,
      });

      fs.createReadStream(filePath, { start, end }).pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': contentType,
        'Accept-Ranges': 'bytes',
      });

      fs.createReadStream(filePath).pipe(res);
    }
  }
}

export const mediaController = new MediaController();
