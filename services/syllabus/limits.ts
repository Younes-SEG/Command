import { createHmac } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { ApiError } from '../../src/lib/server/errors';

export interface Limits {
  networkDaily: number;
  globalDaily: number;
  globalMonthly: number;
}

/** One service process, one persistent disk. Reserve BEFORE any paid request; never refund
 * uncertain failures, since the provider may already have charged for them. */
export class UsageLimits {
  private db: DatabaseSync;
  constructor(
    path: string,
    private salt: string,
    private limits: Limits,
  ) {
    if (salt.length < 32 || Object.values(limits).some((n) => !Number.isSafeInteger(n) || n < 1))
      throw new Error('Invalid service limits configuration.');
    this.db = new DatabaseSync(path);
    this.db.exec(`PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS usage (bucket TEXT PRIMARY KEY, count INTEGER NOT NULL, expires TEXT NOT NULL);`);
  }
  reserve(network: string, now = new Date()) {
    const day = now.toISOString().slice(0, 10);
    const month = day.slice(0, 7);
    const tomorrow = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1),
    )
      .toISOString()
      .slice(0, 10);
    const nextMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1))
      .toISOString()
      .slice(0, 10);
    // Daily rotation prevents cross-day linkage. Raw network addresses are never persisted.
    const networkHash = createHmac('sha256', this.salt).update(`${day}:${network}`).digest('hex');
    const buckets = [
      { key: `network:${day}:${networkHash}`, limit: this.limits.networkDaily, expiry: tomorrow },
      { key: `day:${day}`, limit: this.limits.globalDaily, expiry: tomorrow },
      { key: `month:${month}`, limit: this.limits.globalMonthly, expiry: nextMonth },
    ];
    this.db.exec('BEGIN IMMEDIATE');
    try {
      this.db.prepare('DELETE FROM usage WHERE expires <= ?').run(day);
      for (const b of buckets) {
        const row = this.db.prepare('SELECT count FROM usage WHERE bucket = ?').get(b.key);
        if (row && Number(row.count) >= b.limit)
          throw new ApiError(429, 'Syllabus reading allowance reached. Please try again later.');
      }
      for (const b of buckets)
        this.db
          .prepare(
            `INSERT INTO usage (bucket, count, expires) VALUES (?, 1, ?)
        ON CONFLICT(bucket) DO UPDATE SET count = count + 1`,
          )
          .run(b.key, b.expiry);
      this.db.exec('COMMIT');
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }
  prune(now = new Date()) {
    this.db.prepare('DELETE FROM usage WHERE expires <= ?').run(now.toISOString().slice(0, 10));
  }
  close() {
    this.db.close();
  }
}
