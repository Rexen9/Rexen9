
const mongoose = require('mongoose');

const noPrefixTrackerSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true
  },
  addedAt: {
    type: Date,
    default: Date.now
  },
  addedBy: {
    type: String,
    required: true
  }
});

module.exports = mongoose.model('NoPrefixTracker', noPrefixTrackerSchema);
