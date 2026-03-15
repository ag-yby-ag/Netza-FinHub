/**
 * Build-time script: generates server/dist/db/seed-data.js
 * containing the pre-built SQLite database as base64.
 * Run via: node dist/db/gen-seed.js
 * Included in Vercel buildCommand so cold starts just decode + write to /tmp.
 */
import fs from 'fs';
import path from 'path';
import { runMigrations } from './migrations';
import { runSeed } from './seed';
import db from './database';

// Generate DB at the standard data path (not /tmp, VERCEL env not set during build)
runMigrations();
runSeed();

// Critical: checkpoint WAL and switch to DELETE mode before saving.
// WAL mode splits data between .db and .db-wal files.
// We must merge them into a single .db file for portable base64 embedding.
db.pragma('wal_checkpoint(TRUNCATE)');
db.pragma('journal_mode = DELETE');
db.close();

const dbPath = path.join(__dirname, '../../data/netza-finhub.db');

if (!fs.existsSync(dbPath)) {
  console.error('❌ DB not found at', dbPath);
  process.exit(1);
}

const b64 = fs.readFileSync(dbPath).toString('base64');
// Must write to src/db/ so @vercel/node can bundle it from TypeScript sources
const outPath = path.join(__dirname, '../../src/db/seed-data.js');

fs.writeFileSync(outPath, `module.exports = '${b64}';\n`);
console.log(`✅ seed-data.js written (${Math.round(b64.length / 1024)} KB b64)`);

process.exit(0);
