import Database from 'better-sqlite3';
export const db = new Database('users.db');
db.prepare(`
    CREATE TABLE IF NOT EXISTS users (
                                         user_id TEXT PRIMARY KEY,
                                         phone TEXT NOT NULL,
                                         created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`).run();
export function savePhone(userId, phone) {
    db.prepare(`
    INSERT INTO users (user_id, phone)
    VALUES (?, ?)
    ON CONFLICT(user_id)
    DO UPDATE SET phone = excluded.phone
  `).run(userId, phone);
}
// функция для проверки содержимого
export function getAllUsers() {
    return db.prepare('SELECT * FROM users').all();
}
export function getUserByPhone(phone) {
    return db
        .prepare('SELECT * FROM users WHERE phone = ?')
        .get(phone);
}
export function deleteUserById(userId) {
    const result = db
        .prepare('DELETE FROM users WHERE user_id = ?')
        .run(userId);
    return result.changes > 0; // true если пользователь был удалён
}
