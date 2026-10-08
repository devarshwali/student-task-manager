// Unknown URL: answer in JSON, like the rest of the API.
function notFound(req, res) {
  res.status(404).json({ message: 'Route not found' });
}

// Last line of defence. Never sends stack traces or internal messages to the client.
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'Request body is not valid JSON' });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ message: 'Request body is too large' });
  }

  console.error('Unhandled error:', err.message);
  return res.status(500).json({ message: 'Something went wrong' });
}

module.exports = { notFound, errorHandler };
