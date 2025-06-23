require('dotenv').config();
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcrypt');
const cron = require('node-cron');
const db = require('./db');
const { generateToken, authRequired, adminRequired } = require('./auth');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'html');
app.engine('html', require('ejs').renderFile);

function markCompleted() {
  const now = new Date();
  const stmt = db.prepare("SELECT * FROM appointments WHERE status='scheduled'");
  const update = db.prepare("UPDATE appointments SET status='completed' WHERE id=?");
  const reward = db.prepare("UPDATE users SET rewards = rewards + 10 WHERE id=?");
  for (const appt of stmt.all()) {
    const apptDate = new Date(appt.date + 'T' + appt.time);
    if (apptDate < now) {
      update.run(appt.id);
      reward.run(appt.user_id);
    }
  }
}
cron.schedule('0 0 * * *', markCompleted); // nightly

app.get('/', (req, res) => {
  res.render('index');
});

app.get('/register', (req, res) => res.render('register'));
app.post('/register', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).send('Missing fields');
  const hash = bcrypt.hashSync(password, 10);
  try {
    const stmt = db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)');
    const info = stmt.run(username, hash);
    const user = { id: info.lastInsertRowid, username };
    res.cookie('token', generateToken(user), { httpOnly: true });
    res.redirect('/dashboard');
  } catch (err) {
    res.status(400).send('User exists');
  }
});

app.get('/login', (req, res) => res.render('login'));
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE username=?').get(username);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).send('Invalid');
  }
  res.cookie('token', generateToken(user), { httpOnly: true });
  res.redirect('/dashboard');
});

app.get('/dashboard', authRequired, (req, res) => {
  const appts = db.prepare('SELECT * FROM appointments WHERE user_id=? ORDER BY date, time').all(req.user.id);
  const user = db.prepare('SELECT * FROM users WHERE id=?').get(req.user.id);
  res.render('dashboard', { username: user.username, rewards: user.rewards, appointments: appts });
});

app.get('/admin', authRequired, adminRequired, (req, res) => {
  const appts = db.prepare('SELECT a.*, u.username FROM appointments a JOIN users u ON a.user_id=u.id').all();
  const revenue = db.prepare("SELECT COUNT(*) as count FROM appointments WHERE status='completed'").get().count * 65;
  res.render('admin', { appointments: appts, revenue });
});

app.post('/api/appointments', authRequired, (req, res) => {
  const { date, time, reason } = req.body;
  const stmt = db.prepare('INSERT INTO appointments (user_id, date, time, reason) VALUES (?, ?, ?, ?)');
  const info = stmt.run(req.user.id, date, time, reason);
  res.json({ id: info.lastInsertRowid });
});

app.get('/api/appointments', authRequired, (req, res) => {
  const rows = db.prepare('SELECT * FROM appointments WHERE user_id=? ORDER BY date, time').all(req.user.id);
  res.json(rows);
});

app.put('/api/appointments/:id', authRequired, (req, res) => {
  const { date, time, reason } = req.body;
  const stmt = db.prepare('UPDATE appointments SET date=?, time=?, reason=? WHERE id=? AND user_id=?');
  stmt.run(date, time, reason, req.params.id, req.user.id);
  res.json({ success: true });
});

app.delete('/api/appointments/:id', authRequired, (req, res) => {
  const stmt = db.prepare('UPDATE appointments SET status="canceled" WHERE id=? AND user_id=?');
  stmt.run(req.params.id, req.user.id);
  res.json({ success: true });
});

app.get('/logout', (req, res) => {
  res.clearCookie('token');
  res.redirect('/');
});

app.listen(PORT, () => console.log('Server running on', PORT));
