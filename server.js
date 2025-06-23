const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const querystring = require('querystring');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const sessions = {};
const usersFile = path.join(__dirname, 'data', 'users.json');
const appointmentsFile = path.join(__dirname, 'data', 'appointments.json');

function readJSON(file) {
  try {
    const data = fs.readFileSync(file, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    return [];
  }
}

function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function getUser(username) {
  const users = readJSON(usersFile);
  return users.find(u => u.username === username);
}

function createUser(username, password) {
  const users = readJSON(usersFile);
  if (users.find(u => u.username === username)) {
    return false;
  }
  users.push({ username, password, rewards: 0 });
  writeJSON(usersFile, users);
  return true;
}

function authenticate(username, password) {
  const user = getUser(username);
  return user && user.password === password;
}

function addAppointment(username, date, time) {
  const appts = readJSON(appointmentsFile);
  appts.push({ username, date, time });
  writeJSON(appointmentsFile, appts);
}

function serveStatic(res, filePath, contentType = 'text/html') {
  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404);
      return res.end('404 Not Found');
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  });
}

function handleFormData(req, callback) {
  let body = '';
  req.on('data', chunk => {
    body += chunk.toString();
  });
  req.on('end', () => {
    callback(querystring.parse(body));
  });
}

function getSession(req) {
  const cookies = (req.headers.cookie || '').split(';').reduce((acc, pair) => {
    const [k, v] = pair.trim().split('=');
    if (k && v) acc[k] = v;
    return acc;
  }, {});
  const token = cookies.sessionId;
  const username = sessions[token];
  return { token, username };
}

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const { pathname } = parsedUrl;
  const session = getSession(req);

  if (req.method === 'GET') {
    if (pathname === '/') {
      return serveStatic(res, path.join(__dirname, 'views', 'index.html'));
    }
    if (pathname === '/login') {
      return serveStatic(res, path.join(__dirname, 'views', 'login.html'));
    }
    if (pathname === '/register') {
      return serveStatic(res, path.join(__dirname, 'views', 'register.html'));
    }
    if (pathname === '/dashboard') {
      if (!session.username) {
        res.writeHead(302, { Location: '/login' });
        return res.end();
      }
      const user = getUser(session.username);
      let dashboard = fs.readFileSync(path.join(__dirname, 'views', 'dashboard.html'), 'utf8');
      dashboard = dashboard.replace('{{username}}', user.username).replace('{{rewards}}', user.rewards);
      res.writeHead(200, { 'Content-Type': 'text/html' });
      return res.end(dashboard);
    }
    if (pathname === '/appointments') {
      if (!session.username) {
        res.writeHead(302, { Location: '/login' });
        return res.end();
      }
      return serveStatic(res, path.join(__dirname, 'views', 'appointments.html'));
    }
    if (pathname === '/logout') {
      if (session.token) delete sessions[session.token];
      res.writeHead(302, { 'Set-Cookie': 'sessionId=; HttpOnly', Location: '/' });
      return res.end();
    }
    if (pathname.startsWith('/public/')) {
      const ext = path.extname(pathname);
      const contentTypes = {
        '.css': 'text/css',
        '.js': 'application/javascript',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.svg': 'image/svg+xml'
      };
      return serveStatic(res, path.join(__dirname, pathname), contentTypes[ext] || 'text/plain');
    }
  } else if (req.method === 'POST') {
    if (pathname === '/login') {
      return handleFormData(req, data => {
        if (authenticate(data.username, data.password)) {
          const token = crypto.randomBytes(16).toString('hex');
          sessions[token] = data.username;
          res.writeHead(302, { 'Set-Cookie': `sessionId=${token}; HttpOnly`, Location: '/dashboard' });
          return res.end();
        }
        res.writeHead(302, { Location: '/login?error=1' });
        res.end();
      });
    }
    if (pathname === '/register') {
      return handleFormData(req, data => {
        if (createUser(data.username, data.password)) {
          res.writeHead(302, { Location: '/login' });
          return res.end();
        }
        res.writeHead(302, { Location: '/register?error=1' });
        res.end();
      });
    }
    if (pathname === '/appointments') {
      if (!session.username) {
        res.writeHead(302, { Location: '/login' });
        return res.end();
      }
      return handleFormData(req, data => {
        addAppointment(session.username, data.date, data.time);
        res.writeHead(302, { Location: '/dashboard' });
        res.end();
      });
    }
  }

  res.writeHead(404);
  res.end('Not Found');
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
