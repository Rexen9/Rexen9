
const mongoose = require('mongoose');

const blacklistTrackingSchema = new mongoose.Schema({
  blacklistId: {
    type: String,
    required: true,
    unique: true
  },
  type: {
    type: String,
    enum: ['autobl', 'owner_member', 'owner_guild'],
    required: true
  },
  userId: {
    type: String,
    required: false // Only for member blacklists
  },
  guildId: {
    type: String,
    required: false // Only for guild blacklists
  },
  ownerId: {
    type: String,
    required: false // Only for autobl (stores the guild owner)
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
    required: true
  },
  addedAt: {
    type: Date,
    default: Date.now
  },
  reason: {
    type: String,
    default: "No reason provided"
  },
  blacklistedBy: {
    type: String,
    enum: ['Owner', 'Autobl'],
    required: true
  }
});

// Index for automatic cleanup of expired documents
blacklistTrackingSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("BlacklistTracking", blacklistTrackingSchema);
