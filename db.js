import Database from 'better-sqlite3';
export const db = new Database('users.db');
db.prepare(`
  CREATE TABLE IF NOT EXISTS users (
    user_id TEXT PRIMARY KEY,
    phone TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`).run();
export const savePhone = (userId, phone) => {
    db.prepare(`
    INSERT INTO users (user_id, phone)
    VALUES (?, ?)
    ON CONFLICT(user_id) DO UPDATE SET phone = excluded.phone
  `).run(userId, phone);
};
