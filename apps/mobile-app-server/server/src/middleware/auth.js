const passport = require('passport');

const authenticate = (req, res, next) => {
  passport.authenticate('jwt', { session: false }, (err, user, info) => {
    if (err) {
      // Only log in development, not in test or production
      // In test, these errors are expected and tested, so we suppress them
      if (process.env.NODE_ENV === 'development') {
        console.error('Passport authentication error:', err);
      }
      return next(err);
    }
    if (!user) {
      // Only log in development, not in test or production
      // In test, these errors are expected and tested, so we suppress them
      if (process.env.NODE_ENV === 'development') {
        console.error('Passport authentication failed - no user:', info);
      }
      return res.status(401).json({ message: 'Unauthorized' });
    }
    req.user = user;
    next();
  })(req, res, next);
};

const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    return next();
  }
  return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
};

module.exports = {
  authenticate,
  isAdmin,
};

