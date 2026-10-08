const PRIORITIES = ['low', 'medium', 'high'];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isString(value) {
  return typeof value === 'string';
}

// True only for real calendar dates in YYYY-MM-DD form (rejects 2026-02-31).
function isRealDate(text) {
  if (!DATE_RE.test(text)) return false;
  const date = new Date(`${text}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === text;
}

function todayUtc() {
  return new Date().toISOString().slice(0, 10);
}

// Validates the body for POST /api/tasks.
// Returns { errors, value }. "value" contains ONLY whitelisted fields, so a client can not
// set id, status, userId or anything else by adding extra fields to the request.
function validateCreateTask(body) {
  const errors = [];
  const input = body && typeof body === 'object' && !Array.isArray(body) ? body : {};
  const value = {};

  const title = isString(input.title) ? input.title.trim() : '';
  if (title.length < 1 || title.length > 100) {
    errors.push({ field: 'title', message: 'Title is required and must be 1 to 100 characters' });
  } else {
    value.title = title;
  }

  if (input.description !== undefined && input.description !== null) {
    if (!isString(input.description) || input.description.trim().length > 500) {
      errors.push({ field: 'description', message: 'Description must be text up to 500 characters' });
    } else {
      value.description = input.description.trim();
    }
  }

  if (input.dueDate !== undefined && input.dueDate !== null) {
    if (!isString(input.dueDate) || !isRealDate(input.dueDate)) {
      errors.push({ field: 'dueDate', message: 'Due date must be a real date in YYYY-MM-DD format' });
    } else if (input.dueDate < todayUtc()) {
      errors.push({ field: 'dueDate', message: 'Due date can not be in the past' });
    } else {
      value.dueDate = input.dueDate;
    }
  }

  if (input.priority !== undefined) {
    if (!PRIORITIES.includes(input.priority)) {
      errors.push({ field: 'priority', message: 'Priority must be low, medium or high' });
    } else {
      value.priority = input.priority;
    }
  }

  return { errors, value };
}

module.exports = { validateCreateTask, isRealDate, PRIORITIES };
