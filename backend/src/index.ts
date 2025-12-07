// backend/src/index.ts
// Main entry point for Pronexma Protocol backend
process.on('unhandledRejection', (reason) => {
  // eslint-disable-next-line no-console
  console.error('UNHANDLED_REJECTION >>>', reason);
});

process.on('uncaughtException', (err) => {
  // eslint-disable-next-line no-console
  console.error('UNCAUGHT_EXCEPTION >>>', err);
});

import { startServer } from './server';

// Start the server
startServer();
