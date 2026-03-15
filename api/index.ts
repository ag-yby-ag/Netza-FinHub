// Vercel serverless entry point
// Sets VERCEL env so server code uses /tmp paths
if (!process.env.VERCEL) process.env.VERCEL = '1';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const serverless = require('serverless-http');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const app = require('../server/src/index').default;

module.exports = serverless(app);
