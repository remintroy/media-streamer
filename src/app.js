import express from 'express';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { fileURLToPath } from 'url';
import { apiRouter } from './routes/api.js';
import { mediaController } from './controllers/mediaController.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename) || process.cwd();
// Root is one level up from src
const rootDir = path.join(__dirname, '..');

const app = express();

// Middleware
app.use(
  helmet({
    contentSecurityPolicy: false, // Disable for now to avoid video playback issues if not configured correctly
  })
);
app.use(cors());
app.use(morgan('dev'));
app.use(express.static(path.join(rootDir, 'public')));

// API Routes
app.use('/api', apiRouter);

// Playlist Routes (kept at root for backward compatibility if desired, or can be moved)
app.get('/playlist.m3u', mediaController.getPlaylist);
app.get('/single.m3u', mediaController.getSinglePlaylist);

// Media Stream Route
app.get('/media/*', (req, res) => mediaController.streamMedia(req, res));

// Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export { app };
