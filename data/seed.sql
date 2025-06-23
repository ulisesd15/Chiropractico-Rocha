CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE,
  password_hash TEXT,
  rewards INTEGER DEFAULT 0,
  is_admin INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS appointments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  date TEXT,
  time TEXT,
  reason TEXT,
  status TEXT DEFAULT 'scheduled'
);

INSERT OR IGNORE INTO users (id, username, password_hash, rewards, is_admin)
VALUES (1, 'admin', '', 0, 1);
