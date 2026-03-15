// Vercel serverless entry point
// Using static TypeScript imports so @vercel/node (ncc) bundles everything
// into a single JS file for fast cold starts
if (!process.env.VERCEL) process.env.VERCEL = '1';

import serverless from 'serverless-http';
import app from '../server/src/index';

export default serverless(app);
