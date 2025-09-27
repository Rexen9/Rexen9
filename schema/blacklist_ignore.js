
const mongoose = require('mongoose');

const blacklistIgnoreSchema = new mongoose.Schema({
  entityId: {
    type: String,
    required: true,
    unique: true
  },
  type: {
    type: String,
    enum: ['user', 'guild'],
    required: true
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
  }
});

module.exports = mongoose.model("BlacklistIgnore", blacklistIgnoreSchema);
