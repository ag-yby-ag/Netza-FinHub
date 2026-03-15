// Vercel serverless entry point
if (!process.env.VERCEL) process.env.VERCEL = '1';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const serverless = require('serverless-http');

let handler: ReturnType<typeof serverless>;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const app = require('../server/src/index').default;
  handler = serverless(app);
} catch (err: unknown) {
  const message = err instanceof Error ? err.message + '\n' + err.stack : String(err);
  // Return an Express-like handler that reports the init error
  handler = (_req: unknown, res: { status: (c: number) => { json: (b: unknown) => void } }) => {
    res.status(500).json({ error: 'Function init failed', detail: message });
  };
}

module.exports = handler;
