
const { Schema, model } = require("mongoose");

module.exports = model(
  "join2create",
  new Schema({
    guildId: {
      type: String,
      required: true,
    },
    channelId: {
      type: String,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  })
);
