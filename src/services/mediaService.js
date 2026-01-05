import fs from 'fs/promises';
import path from 'path';
import { config } from '../config/env.js';

export class MediaService {
  async listDirectory(dirPath) {
    const items = { folders: [], files: [] };

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);

        if (entry.isDirectory()) {
          items.folders.push({
            name: entry.name,
            type: 'folder',
          });
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          if (config.videoExtensions.includes(ext)) {
            const stats = await fs.stat(fullPath);
            items.files.push({
              name: entry.name,
              type: 'file',
              size: stats.size,
            });
          }
        }
      }

      items.folders.sort((a, b) => a.name.localeCompare(b.name));
      items.files.sort((a, b) => a.name.localeCompare(b.name));
    } catch (err) {
      console.error(`Error listing ${dirPath}:`, err.message);
      throw err;
    }

    return items;
  }

  async getAllFiles(dir, baseDir = dir) {
    const files = [];

    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          files.push(...(await this.getAllFiles(fullPath, baseDir)));
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          if (config.videoExtensions.includes(ext)) {
            const relativePath = path.relative(baseDir, fullPath);
            files.push({
              title: entry.name,
              url: '/media/' + relativePath.split(path.sep).join('/'),
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

  generateM3U(files, baseUrl) {
    let playlist = '#EXTM3U\n\n';

    for (const file of files) {
      playlist += `#EXTINF:-1,${file.title}\n`;
      playlist += `${baseUrl}${file.url}\n\n`;
    }

    return playlist;
  }

  async getFileStats(filePath) {
      return await fs.stat(filePath);
  }

  async checkAccess(filePath) {
      await fs.access(filePath);
  }
}

export const mediaService = new MediaService();
