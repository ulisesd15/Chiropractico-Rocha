# Chiropractico Rocha

Simple chiropractic clinic booking app built with Node.js, Express and SQLite.

## Setup

```bash
npm install
cp .env.example .env
```

Edit `.env` with your own `JWT_SECRET` if desired. The database will be created automatically using `data/seed.sql`.

Run the development server:

```bash
npm start
```

Visit `http://localhost:3000`.

## Deployment

The app is ready for Heroku. Ensure `Procfile` and environment variables are set.

## API Examples (Insomnia)

Import `docs/Insomnia_Export.json` into Insomnia to test the API endpoints.
