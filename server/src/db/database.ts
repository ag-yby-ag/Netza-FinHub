import Database, { Database as DatabaseType } from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const IS_SERVERLESS = !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_NAME;
const TMP_DB = '/tmp/netza-finhub.db';
const LOCAL_DB_DIR = path.join(__dirname, '../../data');
const DB_PATH = IS_SERVERLESS ? TMP_DB : path.join(LOCAL_DB_DIR, 'netza-finhub.db');

if (!IS_SERVERLESS && !fs.existsSync(LOCAL_DB_DIR)) {
  fs.mkdirSync(LOCAL_DB_DIR, { recursive: true });
}

// On Vercel cold start: restore pre-built seed DB from bundle (instant vs re-seeding)
if (IS_SERVERLESS && !fs.existsSync(TMP_DB)) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const b64: string = require('./seed-data');
    fs.writeFileSync(TMP_DB, Buffer.from(b64, 'base64'));
    console.log('✅ Pre-built DB restored to /tmp');
  } catch {
    // seed-data.js not available (local dev or first deploy) — will seed at runtime
    console.log('ℹ️  No pre-built DB found, will seed at runtime');
  }
}

const db: DatabaseType = new Database(DB_PATH);

// Performance pragmas
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('synchronous = NORMAL');

export default db;
export { IS_SERVERLESS, TMP_DB };
