// Request logging middleware to identify which server instance handled the request
const requestLogger = (req, res, next) => {
  const serverInstance = process.env.SERVER_INSTANCE || 'unknown';
  const timestamp = new Date().toISOString();
  const method = req.method;
  const path = req.path;
  const ip = req.ip || req.connection.remoteAddress;

  // Log the request
  console.log(`[${timestamp}] [${serverInstance}] ${method} ${path} - IP: ${ip}`);

  // Add server instance to response header
  res.setHeader('X-Server-Instance', serverInstance);

  next();
};

module.exports = requestLogger;





