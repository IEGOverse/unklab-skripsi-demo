/**
 * Middleware Penanganan Error Global
 */

function errorHandler(err, req, res, next) {
  console.error('❌ Error:', err.message);

  const statusCode = err.statusCode || 500;

  res.status(statusCode).json({
    success: false,
    message: err.message || 'Terjadi kesalahan pada server',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
}

function notFound(req, res, next) {
  res.status(404).json({
    success: false,
    message: `Endpoint ${req.originalUrl} tidak ditemukan`
  });
}

module.exports = { errorHandler, notFound };
