// Reads the token settings from environment variables.
// Fails loudly if the secret is missing or weak, so the app never runs with a guessable secret.
function getJwtConfig() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('JWT_SECRET must be set to a random string of at least 32 characters');
  }
  return {
    secret,
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
  };
}

module.exports = { getJwtConfig };
