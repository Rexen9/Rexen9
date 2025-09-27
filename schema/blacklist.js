
const mongoose = require('mongoose');

const blacklistSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true
  },
  isBlacklisted: {
    type: Boolean,
    default: true
  },
  isLifetime: {
    type: Boolean,
    default: false
  },
  expiresAt: {
    type: Date,
    required: false
  },
  addedBy: {
    type: String,
    required: false
  },
  addedAt: {
    type: Date,
    default: Date.now
  },
  reason: {
    type: String,
    default: "No reason provided"
  }
});

// Index for automatic cleanup of expired documents
blacklistSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Pre-save middleware to set expiration if temporary
blacklistSchema.pre('save', function(next) {
  if (this.expiresAt && !this.isNew) {
    // Document is being updated with expiration
    this.markModified('expiresAt');
  }
  next();
});

module.exports = mongoose.model("Blacklist", blacklistSchema);
