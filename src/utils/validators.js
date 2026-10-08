const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isString(value) {
  return typeof value === 'string';
}

// Returns { errors: [{field, message}], value: {cleaned fields} }.
// Only whitelisted fields are copied, so extra fields (like "role") are ignored.
function validateRegister(body) {
  const errors = [];
  const input = body && typeof body === 'object' ? body : {};

  const name = isString(input.name) ? input.name.trim() : '';
  if (name.length < 2 || name.length > 50) {
    errors.push({ field: 'name', message: 'Name must be 2 to 50 characters' });
  }

  const email = isString(input.email) ? input.email.trim().toLowerCase() : '';
  if (!EMAIL_RE.test(email) || email.length > 254) {
    errors.push({ field: 'email', message: 'A valid email is required' });
  }

  const password = isString(input.password) ? input.password : '';
  // bcrypt only uses the first 72 bytes, so cap the length.
  if (password.length < 8 || password.length > 72 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    errors.push({
      field: 'password',
      message: 'Password must be 8 to 72 characters and include a letter and a number',
    });
  }

  return { errors, value: { name, email, password } };
}

function validateLogin(body) {
  const errors = [];
  const input = body && typeof body === 'object' ? body : {};

  const email = isString(input.email) ? input.email.trim().toLowerCase() : '';
  if (!email) errors.push({ field: 'email', message: 'Email is required' });

  const password = isString(input.password) ? input.password : '';
  if (!password) errors.push({ field: 'password', message: 'Password is required' });

  return { errors, value: { email, password } };
}

module.exports = { validateRegister, validateLogin };
