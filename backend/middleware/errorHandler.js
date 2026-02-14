function errorHandler(err, req, res, next) {
  console.log("CUSTOM ERROR HANDLER ACTIVE");
  const status = err.statusCode || 500;
  const isOperational = status < 500;

  const log = {
    time: new Date().toISOString(),
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    status,
    message: err.message,
    stack: status === 500 ? err.stack : undefined
  };

  console.error("ERROR LOG:", JSON.stringify(log, null, 2));

  res.status(status).json({
    error: isOperational ? err.message : "Internal Server Error"
  });
}

module.exports = errorHandler;
