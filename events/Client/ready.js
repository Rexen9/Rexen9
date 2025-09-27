const { prefix } = require("../../config.js");
const config = require("../../config.js");
const { ActivityType } = require("discord.js");
const User = require("../../schema/User");
const Join2Create = require("../../schema/join2create");

module.exports = {
  name: "ready",
  run: async (client) => {
    client.manager.init(client.user.id);

    // Register slash commands
    const slashCommands = Array.from(client.slashCommands.values()).map(cmd => cmd.data.toJSON());
    if (slashCommands.length > 0) {
      try {
        await client.application.commands.set(slashCommands);
        console.log(`${slashCommands.length} Slash commands registered globally.`.brightGreen);
      } catch (error) {
        console.error('Error registering slash commands:', error);
      }
    }

    client.logger.log(`${client.user.username} idle!`, "ready");
    client.logger.log(`Ready on ${client.guilds.cache.size} servers, for a total of ${client.guilds.cache.reduce((a, g) => a + g.memberCount, 0)} users`, "ready");

    // Set bot status to DND
    await client.user.setStatus('dnd');

    // Set game activity to the desired listening statuses
    const statuses = [
      "FasterThanCosmicInflation"
    ];
    let i = 0;
    setInterval(() => {
      client.user.setActivity(statuses[i], { type: ActivityType.Listening });
      i = (i + 1) % statuses.length;
    }, 10000);

    // Premium system removed - no longer loading user settings

    // Load join2create channels
    try {
        if (!client.join2create) client.join2create = new Map();
        const j2cChannels = await Join2Create.find();
        j2cChannels.forEach((channel) => {
            client.join2create.set(channel.guildId, channel.channelId);
        });
        console.log(`[READY] Loaded ${j2cChannels.length} join2create channels`);

    // Initialize giveaway manager and load existing giveaways
    try {
        const giveaways = await client.giveawaysManager.getAllGiveaways();
        console.log(`[READY] Loaded ${giveaways.length} existing giveaways from memory`);

        // Clean up any giveaways with deleted messages
        for (const giveaway of giveaways) {
            try {
                const channel = client.channels.cache.get(giveaway.channelId);
                if (channel) {
                    const message = await channel.messages.fetch(giveaway.messageId).catch(() => null);
                    if (!message) {
                        // Message was deleted, remove giveaway from memory
                        await client.giveawaysManager.deleteGiveaway(giveaway.messageId);
                        console.log(`[GIVEAWAY] Removed deleted giveaway: ${giveaway.messageId}`);
                    }
                }
            } catch (error) {
                console.error(`[GIVEAWAY] Error checking giveaway ${giveaway.messageId}:`, error);
            }
        }
    } catch (error) {
        console.error('[GIVEAWAY] Error loading giveaways from memory:', error);
    }

    const node = {
        host: config.nodes[0].host,
        port: config.nodes[0].port,
        password: config.nodes[0].password,
        secure: config.nodes[0].secure,
    };
    // Node creation is already handled by manager.init
    // client.manager.create(node);
    } catch (error) {
        console.error('[READY] Error loading join2create channels:', error);
    }

    console.log(`${client.user.username} is ready!`.brightGreen);
  }
};