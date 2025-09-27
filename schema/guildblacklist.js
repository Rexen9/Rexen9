
const mongoose = require('mongoose');

const guildBlacklistSchema = new mongoose.Schema({
  guildId: {
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
guildBlacklistSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("GuildBlacklist", guildBlacklistSchema);
