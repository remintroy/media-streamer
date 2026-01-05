import { app } from './app.js';
import { config } from './config/env.js';

app.listen(config.port, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${config.port}`);
  console.log(`Media path: ${config.mediaPath}`);
});
