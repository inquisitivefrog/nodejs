const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchemaDefinition = {
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false, // Don't return password by default
  },
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user',
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  emailVerified: {
    type: Boolean,
    default: false,
  },
  emailVerificationToken: {
    type: String,
    select: false,
  },
  emailVerificationExpires: {
    type: Date,
    select: false,
  },
  passwordResetToken: {
    type: String,
    select: false,
  },
  passwordResetExpires: {
    type: Date,
    select: false,
  },
  refreshToken: {
    type: String,
    select: false,
  },
  refreshTokenExpires: {
    type: Date,
    select: false,
  },
  profilePicture: {
    type: String,
    default: null,
  },
  // User preferences/settings
  preferences: {
    type: {
      notifications: {
        email: { type: Boolean, default: true },
        push: { type: Boolean, default: true },
      },
      language: { type: String, default: 'en' },
      theme: { type: String, enum: ['light', 'dark', 'auto'], default: 'auto' },
    },
    default: {},
  },
};

const userSchemaOptions = {
  timestamps: true,
};

// Create schema
const userSchema = new mongoose.Schema(userSchemaDefinition, userSchemaOptions);

// Create text index for search functionality
userSchema.index({ name: 'text', email: 'text' });
// Compound index for common queries
userSchema.index({ role: 1, isActive: 1 });

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Method to compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Remove sensitive fields from JSON output
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.refreshToken;
  delete obj.refreshTokenExpires;
  delete obj.passwordResetToken;
  delete obj.passwordResetExpires;
  delete obj.emailVerificationToken;
  delete obj.emailVerificationExpires;
  return obj;
};

// Export model for default connection (backward compatibility)
const User = mongoose.model('User', userSchema);

/**
 * Get User model for a specific connection
 * Used for separate read/write connection pools
 */
const getUserModel = (connection) => {
  if (!connection) {
    return User; // Fallback to default connection
  }
  
  // Return existing model if it exists on this connection
  if (connection.models.User) {
    return connection.models.User;
  }
  
  // Create model on the specified connection
  return connection.model('User', userSchema);
};

module.exports = User;
module.exports.getUserModel = getUserModel;
module.exports.userSchema = userSchema;
