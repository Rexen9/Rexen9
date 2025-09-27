
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  Id: {
    type: String,
    required: true,
    unique: true
  },
  isPremium: {
    type: Boolean,
    default: false
  },
  premiumType: {
    type: String,
    enum: ['monthly', 'yearly', 'lifetime'],
    default: null
  },
  premiumExpiry: {
    type: Date,
    default: null
  },
  premiumAddedBy: {
    type: String,
    default: null
  },
  premiumAddedAt: {
    type: Date,
    default: null
  }
});

module.exports = mongoose.model("User", userSchema);
