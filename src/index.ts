/**
 * Legacy Code Revival AI - Codebase Analysis Engine
 * Entry point for the application
 */

import app from './api/server';
import { logger } from './utils/logger';

export * from './types';
export * from './interfaces';

const PORT = process.env.PORT || 3000;

// Start server
app.listen(PORT, () => {
  logger.info('Legacy Code Revival AI - Codebase Analysis Engine started', { port: PORT });
});
