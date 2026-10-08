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

## API overview

All `/api/tasks` routes need the header `Authorization: Bearer <token>`.

| Method | Path | What it does |
|---|---|---|
| POST | `/api/auth/register` | Create an account |
| POST | `/api/auth/login` | Log in and get a token |
| GET | `/api/auth/me` | Show the logged-in student |
| POST | `/api/tasks` | Create a task |
| GET | `/api/tasks` | List, search and filter your tasks |
| PATCH | `/api/tasks/:id` | Update a task |
| PATCH | `/api/tasks/:id/complete` | Mark a task completed |
| DELETE | `/api/tasks/:id` | Delete a task |

## Search and filter

`GET /api/tasks` accepts these optional query parameters:

| Parameter | Example | Meaning |
|---|---|---|
| `q` | `q=maths` | Text to find in the title or description (not case sensitive, max 100 characters) |
| `status` | `status=pending` | `pending` or `completed` |
| `priority` | `priority=high` | `low`, `medium` or `high` |
| `dueAfter` | `dueAfter=2027-03-01` | Due on or after this date (YYYY-MM-DD) |
| `dueBefore` | `dueBefore=2027-03-31` | Due on or before this date |
| `sort` | `sort=dueDate` | `createdAt` (default), `dueDate`, `priority` or `title` |
| `order` | `order=asc` | `asc` or `desc` (default `desc`) |
| `page` | `page=2` | Page number, starting at 1 |
| `limit` | `limit=20` | Items per page, 1 to 50 (default 10) |

Example: `GET /api/tasks?q=maths&status=pending&sort=dueDate&order=asc`

Invalid values return `400` with a list of what is wrong. Students only ever see their own tasks.
