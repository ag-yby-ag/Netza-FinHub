// Vercel serverless entry point — Express app as direct handler (no wrapper needed)
if (!process.env.VERCEL) process.env.VERCEL = '1';

import app from '../server/src/index';

export default app;
