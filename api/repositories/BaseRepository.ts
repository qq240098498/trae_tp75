import { query, queryOne, execute, beginTransaction, commitTransaction, rollbackTransaction } from '../db/index.js';

export class BaseRepository<T extends { id?: number }> {
  protected tableName: string;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  findAll(where: string = '', params: any[] = [], orderBy: string = 'id DESC'): T[] {
    const sql = `SELECT * FROM ${this.tableName} ${where ? 'WHERE ' + where : ''} ORDER BY ${orderBy}`;
    return query<T>(sql, params);
  }

  findById(id: number): T | null {
    return queryOne<T>(`SELECT * FROM ${this.tableName} WHERE id = ?`, [id]);
  }

  findOne(where: string, params: any[] = []): T | null {
    return queryOne<T>(`SELECT * FROM ${this.tableName} WHERE ${where} LIMIT 1`, params);
  }

  paginate(page: number = 1, pageSize: number = 20, where: string = '', params: any[] = [], orderBy: string = 'id DESC'): { items: T[]; total: number; page: number; pageSize: number } {
    const countResult = queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM ${this.tableName} ${where ? 'WHERE ' + where : ''}`,
      params
    );
    const total = countResult?.count || 0;
    const offset = (page - 1) * pageSize;
    const items = query<T>(
      `SELECT * FROM ${this.tableName} ${where ? 'WHERE ' + where : ''} ORDER BY ${orderBy} LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );
    return { items, total, page, pageSize };
  }

  create(data: Omit<T, 'id'>): number {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map(() => '?').join(', ');
    const columns = keys.map(this.toSnakeCase).join(', ');
    const sql = `INSERT INTO ${this.tableName} (${columns}) VALUES (${placeholders})`;
    const result = execute(sql, values);
    return result.lastInsertRowid;
  }

  update(id: number, data: Partial<T>): boolean {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const setClause = keys.map(k => `${this.toSnakeCase(k)} = ?`).join(', ');
    const sql = `UPDATE ${this.tableName} SET ${setClause} WHERE id = ?`;
    const result = execute(sql, [...values, id]);
    return result.changes > 0;
  }

  delete(id: number): boolean {
    const result = execute(`DELETE FROM ${this.tableName} WHERE id = ?`, [id]);
    return result.changes > 0;
  }

  count(where: string = '', params: any[] = []): number {
    const result = queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM ${this.tableName} ${where ? 'WHERE ' + where : ''}`,
      params
    );
    return result?.count || 0;
  }

  transaction<T = void>(callback: () => T): T {
    beginTransaction();
    try {
      const result = callback();
      commitTransaction();
      return result;
    } catch (error) {
      rollbackTransaction();
      throw error;
    }
  }

  private toSnakeCase(str: string): string {
    return str.replace(/([A-Z])/g, '_$1').toLowerCase();
  }
}
