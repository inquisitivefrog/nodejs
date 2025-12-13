const mongoose = require('mongoose');

const deviceTokenSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    token: {
      type: String,
      required: [true, 'Device token is required'],
      index: true,
      // Note: unique constraint removed to allow token transfer between users
      // The application logic handles uniqueness per user
    },
    platform: {
      type: String,
      enum: ['ios', 'android', 'web'],
      required: [true, 'Platform is required'],
    },
    deviceId: {
      type: String,
      required: false, // Optional device identifier
    },
    appVersion: {
      type: String,
      required: false, // Optional app version
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastUsedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient queries
deviceTokenSchema.index({ userId: 1, isActive: 1 });
deviceTokenSchema.index({ token: 1, isActive: 1 });

// Method to mark token as inactive
deviceTokenSchema.methods.deactivate = function () {
  this.isActive = false;
  this.lastUsedAt = new Date();
  return this.save();
};

// Static method to get active tokens for a user
deviceTokenSchema.statics.getActiveTokensForUser = function (userId) {
  return this.find({ userId, isActive: true }).select('token platform');
};

// Static method to deactivate token
deviceTokenSchema.statics.deactivateToken = function (token) {
  return this.findOneAndUpdate(
    { token },
    { isActive: false, lastUsedAt: new Date() },
    { new: true }
  );
};

// Static method to update last used timestamp
deviceTokenSchema.statics.updateLastUsed = function (token) {
  return this.findOneAndUpdate(
    { token, isActive: true },
    { lastUsedAt: new Date() },
    { new: true }
  );
};

const DeviceToken = mongoose.model('DeviceToken', deviceTokenSchema);

module.exports = DeviceToken;

