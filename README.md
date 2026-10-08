# Student Task Manager

A small REST API where students manage their own tasks: create, update, delete and complete.

Built for the "AI and Git/GitHub" practical assessment.

Stack: Node.js, Express, Sequelize, SQLite.

## Setup

1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env` and set `JWT_SECRET` to a long random value.
3. Start the server: `npm start` (or `npm run dev` to auto-restart on changes).
4. Check it works: `GET http://localhost:3000/health`

Real secrets live only in `.env`. That file is listed in `.gitignore` and is never committed.
