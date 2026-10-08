const { isRealDate } = require('./taskValidators');

const STATUSES = ['pending', 'completed'];
const PRIORITIES = ['low', 'medium', 'high'];
const SORT_FIELDS = ['createdAt', 'dueDate', 'priority', 'title'];
const MAX_LIMIT = 50;

function single(value) {
  // Express turns ?a=1&a=2 into an array. We only accept one value per parameter.
  return typeof value === 'string' ? value : undefined;
}

// Validates the query string of GET /api/tasks.
// Returns { errors, value } where value is a clean, safe set of options.
function parseTaskQuery(query) {
  const errors = [];
  const q = query || {};
  const value = {
    search: null,
    status: null,
    priority: null,
    dueAfter: null,
    dueBefore: null,
    sort: 'createdAt',
    order: 'desc',
    page: 1,
    limit: 10,
  };

  const fail = (field, message) => errors.push({ field, message });

  if (q.q !== undefined) {
    const text = single(q.q);
    if (text === undefined) fail('q', 'Search text must be a single value');
    else if (text.trim().length > 100) fail('q', 'Search text can be at most 100 characters');
    else if (text.trim().length > 0) value.search = text.trim();
  }

  if (q.status !== undefined) {
    const s = single(q.status);
    if (!STATUSES.includes(s)) fail('status', 'Status must be pending or completed');
    else value.status = s;
  }

  if (q.priority !== undefined) {
    const p = single(q.priority);
    if (!PRIORITIES.includes(p)) fail('priority', 'Priority must be low, medium or high');
    else value.priority = p;
  }

  for (const field of ['dueAfter', 'dueBefore']) {
    if (q[field] !== undefined) {
      const d = single(q[field]);
      if (d === undefined || !isRealDate(d)) fail(field, `${field} must be a real date in YYYY-MM-DD format`);
      else value[field] = d;
    }
  }
  if (value.dueAfter && value.dueBefore && value.dueAfter > value.dueBefore) {
    fail('dueAfter', 'dueAfter can not be later than dueBefore');
  }

  if (q.sort !== undefined) {
    const s = single(q.sort);
    if (!SORT_FIELDS.includes(s)) fail('sort', `Sort must be one of: ${SORT_FIELDS.join(', ')}`);
    else value.sort = s;
  }

  if (q.order !== undefined) {
    const o = single(q.order);
    if (o !== 'asc' && o !== 'desc') fail('order', 'Order must be asc or desc');
    else value.order = o;
  }

  if (q.page !== undefined) {
    const n = single(q.page);
    if (!/^\d+$/.test(n || '') || Number(n) < 1) fail('page', 'Page must be a whole number of 1 or more');
    else value.page = Number(n);
  }

  if (q.limit !== undefined) {
    const n = single(q.limit);
    if (!/^\d+$/.test(n || '') || Number(n) < 1 || Number(n) > MAX_LIMIT) {
      fail('limit', `Limit must be a whole number from 1 to ${MAX_LIMIT}`);
    } else value.limit = Number(n);
  }

  return { errors, value };
}

module.exports = { parseTaskQuery, MAX_LIMIT };
