const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const dbPath = process.env.DATABASE_URL || path.join(__dirname, 'clinic.db');

const dbExists = fs.existsSync(dbPath);
const db = new Database(dbPath);

if (!dbExists) {
  const seed = fs.readFileSync(path.join(__dirname, 'data', 'seed.sql'), 'utf8');
  db.exec(seed);
}

module.exports = db;
