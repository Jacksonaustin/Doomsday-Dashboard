function errorMiddleware(err, req, res, next) {
  const statusCode = err.statusCode || err.status || 500;
  if (statusCode >= 500) {
    console.error(err);
  }

  const message =
    statusCode === 500 && process.env.NODE_ENV === 'production'
      ? 'An unexpected error occurred'
      : err.message || 'An unexpected error occurred';

  res.status(statusCode).json({
    success: false,
    message
  });
}

module.exports = errorMiddleware;
