
const mongoose = require("mongoose");

const TTSLanguageSchema = new mongoose.Schema({
  guildId: {
    type: String,
    required: true,
    unique: true,
  },
  language: {
    type: String,
    default: "hi", // Hindi (Romanized) as default
  },
  updatedBy: {
    type: String,
    required: true,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("TTSLanguage", TTSLanguageSchema);
