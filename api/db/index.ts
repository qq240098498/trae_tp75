import initSqlJs, { Database } from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '../../data');
const DB_FILE = path.join(DATA_DIR, 'hardware.db');
const MIGRATIONS_DIR = path.join(__dirname, '../../migrations');

let db: Database | null = null;

export async function initDatabase(): Promise<Database> {
  if (db) return db;

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const SQL = await initSqlJs({
    locateFile: (file) => path.join(__dirname, '../../node_modules/sql.js/dist', file)
  });

  if (fs.existsSync(DB_FILE)) {
    const fileBuffer = fs.readFileSync(DB_FILE);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  await runMigrations(db);

  saveDatabase();

  return db;
}

async function runMigrations(database: Database) {
  const migrationFiles = fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort();

  const result = database.exec(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name='migrations'
  `);

  if (result.length === 0) {
    database.run(`
      CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filename VARCHAR(100) UNIQUE NOT NULL,
        executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  const executedMigrations = new Set(
    database.exec('SELECT filename FROM migrations')
      .flatMap(r => r.values.map(v => v[0] as string))
  );

  for (const file of migrationFiles) {
    if (!executedMigrations.has(file)) {
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
      database.exec(sql);
      database.run(
        'INSERT INTO migrations (filename) VALUES (?)',
        [file]
      );
      console.log(`执行迁移: ${file}`);
    }
  }
}

export function saveDatabase() {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_FILE, buffer);
}

export function getDb(): Database {
  if (!db) {
    throw new Error('数据库未初始化');
  }
  return db;
}

export function query<T = any>(sql: string, params: any[] = []): T[] {
  const database = getDb();
  const result = database.exec(sql, params);
  if (result.length === 0) return [];
  
  const columns = result[0].columns;
  return result[0].values.map(row => {
    const obj: Record<string, any> = {};
    columns.forEach((col, idx) => {
      obj[camelCase(col)] = row[idx];
    });
    return obj as T;
  });
}

export function queryOne<T = any>(sql: string, params: any[] = []): T | null {
  const result = query<T>(sql, params);
  return result.length > 0 ? result[0] : null;
}

export function execute(sql: string, params: any[] = []): { changes: number; lastInsertRowid: number } {
  const database = getDb();
  const stmt = database.prepare(sql);
  stmt.run(params);
  const result = {
    changes: database.getRowsModified(),
    lastInsertRowid: Number(database.exec('SELECT last_insert_rowid() as id')[0].values[0][0])
  };
  stmt.free();
  saveDatabase();
  return result;
}

function camelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

export function beginTransaction() {
  execute('BEGIN TRANSACTION');
}

export function commitTransaction() {
  execute('COMMIT');
}

export function rollbackTransaction() {
  execute('ROLLBACK');
}
