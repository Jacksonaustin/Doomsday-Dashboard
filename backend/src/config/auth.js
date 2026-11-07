function getJwtSecret() {
  const secret = process.env.JWT_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error('JWT_SECRET must be set to a value at least 32 characters long');
  }

  return secret;
}

module.exports = { getJwtSecret };
