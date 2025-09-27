const Blacklist = require("../schema/blacklist");
const GuildBlacklist = require("../schema/guildblacklist");
const BlacklistTracking = require("../schema/blacklist_tracking");
const BlacklistIgnore = require('../schema/blacklist_ignore');
const { EmbedBuilder } = require('discord.js');
const config = require('../config');

class CooldownManager {
  constructor() {
    this.cooldowns = new Map(); // userId -> { lastCommand: timestamp, warnings: number }
    this.COOLDOWN_TIME = 5000; // 5 seconds
    this.MESSAGE_DELETE_TIME = 3000; // 3 seconds
  }

  async handleCommand(message, client) {
    const userId = message.author.id;
    const commandName = message.content.split(' ')[0].toLowerCase();

    // Bypass cooldown and autobl for bot owner
    if (userId === config.ownerID) {
      return true;
    }

    // Check if user is in blacklist ignore list (bli users) - bypass everything
    try {
      const userIgnored = await BlacklistIgnore.findOne({ entityId: userId, type: 'user' });
      if (userIgnored) {
        return true; // Allow command without any restrictions
      }
    } catch (error) {
      console.error('Error checking blacklist ignore status:', error);
    }

    const now = Date.now();

    if (!this.cooldowns.has(userId)) {
      // First command, set cooldown
      this.cooldowns.set(userId, { lastCommand: now, warnings: 0 });
      return true; // Allow command
    }

    const userData = this.cooldowns.get(userId);
    const timeSinceLastCommand = now - userData.lastCommand;

    if (timeSinceLastCommand < this.COOLDOWN_TIME) {
      // User is still on cooldown
      userData.warnings++;

      if (userData.warnings === 1) {
        // First warning - send warning message without replying
        const warningMsg = await message.channel.send({
          content: "You are under cooldown. Please try again later.\n> ⚠ Wait until cooldown ends else you'll be blacklisted!"
        });

        // Delete the warning message after 3 seconds
        setTimeout(() => {
          warningMsg.delete().catch(() => {});
        }, this.MESSAGE_DELETE_TIME);

        // Update last command time but don't reset warnings
        userData.lastCommand = now;
        return false; // Block command
      } else if (userData.warnings === 2) {
        // Second violation - blacklist the user
        await this.blacklistUser(userId, message, client);
        return false; // Block command
      } else {
        // More than 2 violations - user should already be blacklisted, just block
        return false;
      }
    } else {
      // Cooldown has expired, reset
      this.cooldowns.set(userId, { lastCommand: now, warnings: 0 });
      return true; // Allow command
    }
  }

  async handleMention(message, client) {
    const userId = message.author.id;

    // Bypass cooldown and autobl for bot owner
    if (userId === config.ownerID) {
      return true;
    }

    // Check if user is in blacklist ignore list (bli users) - bypass everything
    try {
      const userIgnored = await BlacklistIgnore.findOne({ entityId: userId, type: 'user' });
      if (userIgnored) {
        return true; // Allow mention without any restrictions
      }
    } catch (error) {
      console.error('Error checking blacklist ignore status:', error);
    }

    // Check if message mentions the bot
    const mention = new RegExp(`^<@!?${client.user.id}>( |)$`);
    if (!message.content.match(mention)) {
      return true; // Not a mention, allow
    }

    const now = Date.now();

    if (!this.cooldowns.has(userId)) {
      // First mention, set cooldown
      this.cooldowns.set(userId, { lastCommand: now, warnings: 0 });
      return true; // Allow mention
    }

    const userData = this.cooldowns.get(userId);
    const timeSinceLastMention = now - userData.lastCommand;

    if (timeSinceLastMention < this.COOLDOWN_TIME) {
      // User is still on cooldown
      userData.warnings++;

      if (userData.warnings === 1) {
        // First warning - send warning message without replying
        const warningMsg = await message.channel.send({
          content: "You are spamming mentions. Please stop or you'll be blacklisted!"
        });

        // Delete the warning message after 3 seconds
        setTimeout(() => {
          warningMsg.delete().catch(() => {});
        }, this.MESSAGE_DELETE_TIME);

        // Update last command time but don't reset warnings
        userData.lastCommand = now;
        return false; // Block mention response
      } else if (userData.warnings === 2) {
        // Second violation - blacklist the user
        await this.blacklistUser(userId, message, client, 'mention spamming');
        return false; // Block mention response
      } else {
        // More than 2 violations - user should already be blacklisted, just block
        return false;
      }
    } else {
      // Cooldown has expired, reset
      this.cooldowns.set(userId, { lastCommand: now, warnings: 0 });
      return true; // Allow mention
    }
  }

  async blacklistUser(userId, message, client, spamType = 'command spamming') {
    const { EmbedBuilder } = require('discord.js');
    const config = require('../config');
    const Blacklist = require('../schema/blacklist');
    const BlacklistTracking = require('../schema/blacklist_tracking');
    const BlacklistIgnore = require('../schema/blacklist_ignore');
    const GuildBlacklist = require('../schema/guildblacklist');

    // Don't blacklist the bot owner
    if (userId === config.ownerID) {
      console.log(`Attempted to auto-blacklist bot owner ${userId}, skipping`);
      return;
    }

    try {
      // Check if user is in ignore list
      const userIgnored = await BlacklistIgnore.findOne({ entityId: userId, type: 'user' });
      if (userIgnored) {
        console.log(`User ${userId} is ignored from auto-blacklist`);
        return;
      }

      // Check if guild is in ignore list
      const guildIgnored = await BlacklistIgnore.findOne({ entityId: message.guild.id, type: 'guild' });
      if (guildIgnored) {
        console.log(`Guild ${message.guild.id} is ignored from auto-blacklist`);
        return;
      }

      // Check if already blacklisted
      const existingBlacklist = await Blacklist.findOne({ userId: userId });
      if (!existingBlacklist) {
        // Create user blacklist entry
        await Blacklist.create({
          userId: userId,
          isBlacklisted: true,
          isLifetime: true,
          expiresAt: null,
          addedBy: client.user.id,
          addedAt: new Date(),
          reason: `Auto-blacklisted for ${spamType}`
        });

        // Notify the user they've been blacklisted
        try {
          await message.author.send({
            embeds: [
              new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('🚫 Auto-Blacklisted')
                .setDescription(`You have been automatically blacklisted from using this bot.\n\n**Reason:** ${spamType}\n\n**Duration:** Lifetime\n\nContact the bot owner if you believe this is an error.`)
                .setTimestamp()
            ]
          });
        } catch (error) {
          console.log(`Could not DM user ${message.author.tag} about blacklist`);
        }
      }

      // Get guild and owner
      const guild = message.guild;
      let guildOwner;

      try {
        guildOwner = await guild.fetchOwner();
      } catch (error) {
        console.error('Error fetching guild owner:', error);
        return; // Skip autobl if can't get owner
      }

      // Check if guild is already blacklisted
      const existingGuildBlacklist = await GuildBlacklist.findOne({ guildId: guild.id });
      if (!existingGuildBlacklist) {
        // Create guild blacklist entry for 1 week
        const weekFromNow = new Date(Date.now() + (7 * 24 * 60 * 60 * 1000)); // 1 week

        await GuildBlacklist.create({
          guildId: guild.id,
          isBlacklisted: true,
          isLifetime: false,
          expiresAt: weekFromNow,
          addedBy: client.user.id,
          addedAt: new Date(),
          reason: `Auto-bl due to spamming in the server. Owner id: ${guildOwner.id}. Spammer id: ${userId}`
        });

        // Blacklist guild owner if not already blacklisted and not the bot owner
        const existingOwnerBlacklist = await Blacklist.findOne({ userId: guildOwner.id });
        if (!existingOwnerBlacklist && guildOwner.id !== config.ownerID) {
          await Blacklist.create({
            userId: guildOwner.id,
            isBlacklisted: true,
            isLifetime: false,
            expiresAt: weekFromNow,
            addedBy: client.user.id,
            addedAt: new Date(),
            reason: `Auto-bl Owner of a spamming server`
          });

          // Notify guild owner
          try {
            await guildOwner.send({
              embeds: [
                new EmbedBuilder()
                  .setColor('#FF0000')
                  .setTitle('🚫 Auto-Blacklisted')
                  .setDescription(`You have been automatically blacklisted from using this bot.\n\n**Reason:** Your guild member ${message.author.tag} was ${spamType}.\n\n**Duration:** 1 week\n\nContact the bot owner if you believe this is an error.`)
                  .setTimestamp()
              ]
            });
          } catch (error) {
            console.log(`Could not DM guild owner ${guildOwner.user.tag} about blacklist`);
          }
        }

        // Create single blacklist tracking entry for the autobl
        const blacklistId = `BL-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
        await BlacklistTracking.create({
          blacklistId: blacklistId,
          type: 'autobl',
          userId: userId,
          guildId: guild.id,
          ownerId: guildOwner.id,
          isLifetime: false,
          expiresAt: weekFromNow,
          addedBy: client.user.id,
          addedAt: new Date(),
          reason: `Auto-bl due to spamming in the server. Owner id: ${guildOwner.id}. Spammer id: ${userId}`,
          blacklistedBy: 'Autobl'
        });

        // Send log to logs channel
        try {
          const logChannel = client.channels.cache.get(config.logs);
          if (logChannel) {
            const logEmbed = new EmbedBuilder()
              .setColor('#FF0000')
              .setTitle('🚫 Auto-Blacklist Triggered')
              .setDescription(`**User:** <@${userId}> (${userId})\n**Guild:** ${guild.name} (${guild.id})\n**Owner:** <@${guildOwner.id}> (${guildOwner.id})\n**Reason:** ${spamType}\n**Duration:** 1 week`)
              .setTimestamp()
              .setFooter({ text: `Blacklist ID: ${blacklistId}` });

            await logChannel.send({ embeds: [logEmbed] });
          }
        } catch (error) {
          console.error('Error sending blacklist log:', error);
        }
      }

      // Send blacklist notification in embed
      const blacklistEmbed = new EmbedBuilder()
        .setColor(client.color)
        .setDescription(`**<@${userId}> You are blacklisted from using this bot. Contact the staff to get unblacklisted __[Support Server](https://discord.gg/southasia)__**`);

      await message.channel.send({ embeds: [blacklistEmbed] });

      // Remove from cooldown tracking
      this.cooldowns.delete(userId);

      console.log(`Auto-blacklisted user ${userId} for ${spamType}`);
    } catch (error) {
      console.error('Error auto-blacklisting user:', error);
    }
  }

  // Clean up old cooldown entries periodically
  cleanup() {
    const now = Date.now();
    const CLEANUP_TIME = 60000; // 1 minute

    for (const [userId, userData] of this.cooldowns.entries()) {
      if (now - userData.lastCommand > CLEANUP_TIME) {
        this.cooldowns.delete(userId);
      }
    }
  }

  async autoBlacklist(message, client, spamType) {
    const userId = message.author.id;

    try {
      // Check if user is in ignore list
      const userIgnored = await BlacklistIgnore.findOne({ entityId: userId, type: 'user' });
      if (userIgnored) {
        console.log(`User ${userId} is ignored from auto-blacklist`);
        return;
      }

      // Check if guild is in ignore list
      const guildIgnored = await BlacklistIgnore.findOne({ entityId: message.guild.id, type: 'guild' });
      if (guildIgnored) {
        console.log(`Guild ${message.guild.id} is ignored from auto-blacklist`);
        return;
      }

      // Check if already blacklisted
      const existingBlacklist = await Blacklist.findOne({ userId: userId });
      if (!existingBlacklist) {
        // Create user blacklist entry
        await Blacklist.create({
          userId: userId,
          isBlacklisted: true,
          isLifetime: true,
          expiresAt: null,
          addedBy: client.user.id,
          addedAt: new Date(),
          reason: `Auto-blacklisted for ${spamType}`
        });

        // Notify the user they've been blacklisted
        try {
          await message.author.send({
            embeds: [
              new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('🚫 Auto-Blacklisted')
                .setDescription(`You have been automatically blacklisted from using this bot.\n\n**Reason:** ${spamType}\n\n**Duration:** Lifetime\n\nContact the bot owner if you believe this is an error.`)
                .setTimestamp()
            ]
          });
        } catch (error) {
          console.log(`Could not DM user ${message.author.tag} about blacklist`);
        }
      }

      // Get guild and owner
      const guild = message.guild;
      let guildOwner;

      try {
        guildOwner = await guild.fetchOwner();
      } catch (error) {
        console.error('Error fetching guild owner:', error);
        return; // Skip autobl if can't get owner
      }

      // Check if guild is already blacklisted
      const existingGuildBlacklist = await GuildBlacklist.findOne({ guildId: guild.id });
      if (!existingGuildBlacklist) {
        // Create guild blacklist entry for 1 week
        const weekFromNow = new Date(Date.now() + (7 * 24 * 60 * 60 * 1000)); // 1 week

        await GuildBlacklist.create({
          guildId: guild.id,
          isBlacklisted: true,
          isLifetime: false,
          expiresAt: weekFromNow,
          addedBy: client.user.id,
          addedAt: new Date(),
          reason: `Auto-bl due to spamming in the server. Owner id: ${guildOwner.id}. Spammer id: ${userId}`
        });

        // Blacklist guild owner if not already blacklisted
        const existingOwnerBlacklist = await Blacklist.findOne({ userId: guildOwner.id });
        if (!existingOwnerBlacklist) {
          await Blacklist.create({
            userId: guildOwner.id,
            isBlacklisted: true,
            isLifetime: false,
            expiresAt: weekFromNow,
            addedBy: client.user.id,
            addedAt: new Date(),
            reason: `Auto-bl Owner of a spamming server`
          });

          // Notify guild owner
          try {
            await guildOwner.send({
              embeds: [
                new EmbedBuilder()
                  .setColor('#FF0000')
                  .setTitle('🚫 Auto-Blacklisted')
                  .setDescription(`You have been automatically blacklisted from using this bot.\n\n**Reason:** Your guild member ${message.author.tag} was ${spamType}.\n\n**Duration:** 1 week\n\nContact the bot owner if you believe this is an error.`)
                  .setTimestamp()
              ]
            });
          } catch (error) {
            console.log(`Could not DM guild owner ${guildOwner.user.tag} about blacklist`);
          }
        }

        // Create single blacklist tracking entry for the autobl
        const blacklistId = `BL-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
        await BlacklistTracking.create({
          blacklistId: blacklistId,
          type: 'autobl',
          userId: userId,
          guildId: guild.id,
          ownerId: guildOwner.id,
          isLifetime: false,
          expiresAt: weekFromNow,
          addedBy: client.user.id,
          addedAt: new Date(),
          reason: `Auto-bl due to spamming in the server. Owner id: ${guildOwner.id}. Spammer id: ${userId}`,
          blacklistedBy: 'Autobl'
        });

        // Send log to logs channel
        try {
          const logChannel = client.channels.cache.get(config.logs);
          if (logChannel) {
            const logEmbed = new EmbedBuilder()
              .setColor('#FF0000')
              .setTitle('🚫 Auto-Blacklist Triggered')
              .setDescription(`**User:** <@${userId}> (${userId})\n**Guild:** ${guild.name} (${guild.id})\n**Owner:** <@${guildOwner.id}> (${guildOwner.id})\n**Reason:** ${spamType}\n**Duration:** 1 week`)
              .setTimestamp()
              .setFooter({ text: `Blacklist ID: ${blacklistId}` });

            await logChannel.send({ embeds: [logEmbed] });
          }
        } catch (error) {
          console.error('Error sending blacklist log:', error);
        }
      }

      // Send blacklist notification in embed
      const blacklistEmbed = new EmbedBuilder()
        .setColor(client.color)
        .setDescription(`**<@${userId}> You are blacklisted from using this bot. Contact the staff to get unblacklisted __[Support Server](https://discord.gg/southasia)__**`);

      await message.channel.send({ embeds: [blacklistEmbed] });

      // Remove from cooldown tracking
      this.cooldowns.delete(userId);

      console.log(`Auto-blacklisted user ${userId} for ${spamType}`);
    } catch (error) {
      console.error('Error auto-blacklisting user:', error);
    }
  }
}

module.exports = CooldownManager;