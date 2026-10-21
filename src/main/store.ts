import fs from 'node:fs';
import path from 'node:path';
import initSqlJs, { type Database, type SqlValue } from 'sql.js';

type Params = SqlValue[];

/**
 * SQLite 파일 하나 (sql.js, 순수 WASM이라 설치 PC에 따로 깔 것이 없음).
 * 메모리에서 작업하고, 바뀔 때마다 파일 전체를 안전하게(임시 파일 → 이름 바꾸기) 저장한다.
 */
export class Store {
  private constructor(private db: Database, readonly file: string) {}

  static async open(file: string): Promise<Store> {
    const SQL = await initSqlJs({ wasmBinary: wasmBinary() });
    const db = fs.existsSync(file) ? new SQL.Database(fs.readFileSync(file)) : new SQL.Database();
    db.run('PRAGMA foreign_keys = ON');
    const store = new Store(db, file);
    store.migrate();
    return store;
  }

  all<T>(sql: string, params: Params = []): T[] {
    const stmt = this.db.prepare(sql);
    try {
      stmt.bind(params);
      const rows: T[] = [];
      while (stmt.step()) rows.push(stmt.getAsObject() as T);
      return rows;
    } finally {
      stmt.free();
    }
  }

  get<T>(sql: string, params: Params = []): T | undefined {
    return this.all<T>(sql, params)[0];
  }

  run(sql: string, params: Params = []): number {
    this.db.run(sql, params);
    return Number(this.db.exec('SELECT last_insert_rowid()')[0]?.values[0]?.[0] ?? 0);
  }

  /** 여러 변경을 한 번에. 끝나면 파일로 저장. 중간에 오류가 나면 되돌린다. */
  tx<T>(fn: () => T): T {
    this.db.run('BEGIN');
    try {
      const result = fn();
      this.db.run('COMMIT');
      this.save();
      return result;
    } catch (e) {
      this.db.run('ROLLBACK');
      throw e;
    }
  }

  save(): void {
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    const tmp = `${this.file}.tmp`;
    fs.writeFileSync(tmp, Buffer.from(this.db.export()));
    fs.renameSync(tmp, this.file);
  }

  private migrate(): void {
    const version = Number(this.db.exec('PRAGMA user_version')[0].values[0][0]);
    if (version >= MIGRATIONS.length) return;
    this.tx(() => {
      for (let v = version; v < MIGRATIONS.length; v++) this.db.run(MIGRATIONS[v]);
      this.db.run(`PRAGMA user_version = ${MIGRATIONS.length}`);
    });
  }
}

/** 업데이트로 표가 바뀌면 여기에 새 항목을 덧붙인다 (기존 항목은 절대 고치지 않는다). */
const MIGRATIONS = [
  `
  CREATE TABLE customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    memo TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL
  );
  CREATE UNIQUE INDEX customers_name_phone ON customers(name, phone);
  CREATE TABLE contracts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL REFERENCES customers(id),
    contract_date TEXT NOT NULL,
    principal INTEGER NOT NULL,
    rate_type TEXT NOT NULL CHECK (rate_type IN ('month', 'year')),
    rate REAL NOT NULL,
    monthly_interest INTEGER NOT NULL,
    collateral TEXT NOT NULL DEFAULT '',
    maturity_date TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'repaid', 'forfeited')),
    closed_date TEXT,
    memo TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL
  );
  CREATE INDEX contracts_customer ON contracts(customer_id);
  CREATE TABLE contract_photos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contract_id INTEGER NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL
  );
  CREATE TABLE notices (
    contract_id INTEGER NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
    period INTEGER NOT NULL,
    sent_at TEXT NOT NULL,
    auto INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (contract_id, period)
  );
  CREATE TABLE payments (
    contract_id INTEGER NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
    period INTEGER NOT NULL,
    paid_date TEXT NOT NULL,
    amount INTEGER NOT NULL,
    PRIMARY KEY (contract_id, period)
  );
  CREATE TABLE settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
  `
];

function wasmBinary(): ArrayBuffer {
  // 설치본에서는 asar 밖(app.asar.unpacked)에 풀어 둔 파일을 읽는다.
  const file = require.resolve('sql.js/dist/sql-wasm.wasm').replace(`app.asar${path.sep}`, `app.asar.unpacked${path.sep}`);
  const buf = fs.readFileSync(file);
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
}
