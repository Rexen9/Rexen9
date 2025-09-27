const { GiveawaysManager } = require("discord-giveaways");
const Model = require("../schema/Giveaways");

// Explanation at: https://github.com/Androz2091/discord-giveaways/blob/master/examples/custom-databases/mongoose.js
module.exports = class extends GiveawaysManager {
  constructor(client) {
    super(client, {
      default: {
        botsCanWin: false,
        embedColor: '#2f3136',
        embedColorEnd: '#2f3136',
        reaction: '<:gift:1189876367102312448>',
      },
      forceUpdateEvery: 5000, // Check for updates every 5 seconds
    });
    
    // Initialize giveaways array for faster access
    this.giveaways = [];
    this._loadGiveaways();
  }

  async _loadGiveaways() {
    try {
      this.giveaways = await this.getAllGiveaways();
      console.log(`[GIVEAWAY MANAGER] Loaded ${this.giveaways.length} giveaways into memory`);
    } catch (error) {
      console.error('[GIVEAWAY MANAGER] Error loading giveaways:', error);
    }
  }

  async getAllGiveaways() {
    return await Model.find().lean().exec();
  }

  async saveGiveaway(messageId, giveawayData) {
    await Model.create(giveawayData);
    // Update local memory
    this.giveaways.push(giveawayData);
    console.log(`[GIVEAWAY MANAGER] Saved new giveaway: ${messageId}`);
    return true;
  }

  async editGiveaway(messageId, giveawayData) {
    await Model.updateOne({ messageId }, giveawayData, { omitUndefined: true }).exec();
    // Update local memory
    const index = this.giveaways.findIndex(g => g.messageId === messageId);
    if (index !== -1) {
      this.giveaways[index] = { ...this.giveaways[index], ...giveawayData };
    }
    return true;
  }

  async deleteGiveaway(messageId) {
    await Model.deleteOne({ messageId }).exec();
    // Remove from local memory
    this.giveaways = this.giveaways.filter(g => g.messageId !== messageId);
    console.log(`[GIVEAWAY MANAGER] Deleted giveaway from memory: ${messageId}`);
    return true;
  }
};
