
const mongoose = require('mongoose');

const subOwnerSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true
  },
  isSubOwner: {
    type: Boolean,
    default: true
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

module.exports = mongoose.model("SubOwner", subOwnerSchema);
