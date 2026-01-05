import express from 'express';
import { mediaController } from '../controllers/mediaController.js';

const router = express.Router();

router.get('/browse', mediaController.browse);
router.get('/files', mediaController.getFiles);
// Note: Playlist routes are often on root or separate, but putting them in API is fine or we keep them on app level if we want clean URLs.
// Based on old server.js, they were root. Let's keep them there or put them here?
// The old structure had /playlist.m3u on root. Let's keep it consistent in app.js or route them here.
// I will separate API routes from generic serving routes if needed, but for now let's put "API" routes here.

export const apiRouter = router;
