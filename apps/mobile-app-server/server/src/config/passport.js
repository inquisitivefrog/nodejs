const passport = require('passport');
const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const { getReadUserModel } = require('../utils/db-helper');

const opts = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
};

passport.use(
  new JwtStrategy(opts, async (jwt_payload, done) => {
    try {
      if (!jwt_payload || !jwt_payload.id) {
        // Only log in development, not in test or production
        // In test, these errors are expected and tested, so we suppress them
        if (process.env.NODE_ENV === 'development') {
          console.error('JWT payload missing or invalid:', jwt_payload);
        }
        return done(null, false);
      }
      // Use read pool for JWT authentication (read operation - can use secondary)
      const ReadUser = await getReadUserModel();
      const user = await ReadUser.findById(jwt_payload.id);
      if (user) {
        return done(null, user);
      }
      // Only log in development, not in test or production
      if (process.env.NODE_ENV === 'development') {
        console.error('User not found for ID:', jwt_payload.id);
      }
      return done(null, false);
    } catch (error) {
      // Only log in development, not in test or production
      if (process.env.NODE_ENV === 'development') {
        console.error('Error in JWT strategy:', error);
      }
      return done(error, false);
    }
  })
);

// Serialize user for session (not used with JWT, but required by Passport)
passport.serializeUser((user, done) => {
  done(null, user._id);
});

passport.deserializeUser(async (id, done) => {
  try {
    // Use read pool for deserialization (read operation - can use secondary)
    const ReadUser = await getReadUserModel();
    const user = await ReadUser.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

module.exports = passport;

