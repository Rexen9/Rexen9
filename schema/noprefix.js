const mongoose = require('mongoose');

const noprefixSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true
  },
  addedBy: {
    type: String,
    required: false
  },
  addedAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    required: false
  },
  reason: {
    type: String,
    default: "No-prefix access granted"
  }
});

// Index for automatic cleanup of expired documents
noprefixSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Pre-save middleware to set expiration if temporary
noprefixSchema.pre('save', function(next) {
  if (this.expiresAt && !this.isNew) {
    // Document is being updated with expiration
    this.markModified('expiresAt');
  }
  next();
});

module.exports = mongoose.model("NoPrefix", noprefixSchema);