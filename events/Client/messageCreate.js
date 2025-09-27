const { Events, EmbedBuilder, PermissionsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require("../../schema/prefix");
const db2 = require("../../schema/dj");
const User = require("../../schema/User");

module.exports = {
    name: Events.MessageCreate,
    run: async (client, message) => {
        if (message.author.bot || !message.guild) return;

        // Check for AFK users coming back
        const { afk, globalAfk, afkPings } = require("../../utils/afk");
        
        // Check if user is returning from AFK
        const globalAfkData = globalAfk.get(message.author.id);
        const localAfkData = afk.get(`${message.author.id}_${message.guild.id}`);
        
        if (globalAfkData || localAfkData) {
            const afkData = globalAfkData || localAfkData;
            const afkType = globalAfkData ? 'global' : 'local';
            const afkEmoji = globalAfkData ? '<:global:1390957563486539867>' : '<:local:1390958007780905043>';
            
            // Calculate AFK duration
            const afkDuration = Date.now() - afkData.time;
            const duration = Math.floor(afkDuration / 1000);
            const hours = Math.floor(duration / 3600);
            const minutes = Math.floor((duration % 3600) / 60);
            const seconds = duration % 60;
            
            let timeString = '';
            if (hours > 0) timeString += `${hours}h `;
            if (minutes > 0) timeString += `${minutes}m `;
            timeString += `${seconds}s`;
            
            // Get ping information
            const pingKey = globalAfkData ? `global_${message.author.id}` : `local_${message.author.id}_${message.guild.id}`;
            const pings = afkPings.get(pingKey) || [];
            
            let description = `${afkEmoji} Welcome back **${message.author.username}**! You were AFK for **${timeString}**\n**Reason:** ${afkData.reason}`;
            
            // Add ping information if any
            if (pings.length > 0) {
                description += '\n\n**You were pinged by:**';
                for (const ping of pings) {
                    description += `\n[${ping.username}](${ping.messageUrl})`;
                }
            }
            
            // Remove from AFK and clear pings
            if (globalAfkData) {
                globalAfk.delete(message.author.id);
            } else {
                afk.delete(`${message.author.id}_${message.guild.id}`);
            }
            afkPings.delete(pingKey);
            
            const embed = new EmbedBuilder()
                .setColor(client.color)
                .setDescription(description)
                .setFooter({ text: `AFK Mode: ${afkType.charAt(0).toUpperCase() + afkType.slice(1)}` });
            
            return message.reply({ embeds: [embed] });
        }
        
        // Check for mentions of AFK users
        if (message.mentions.users.size > 0) {
            for (const [userId, user] of message.mentions.users) {
                if (user.bot || userId === message.author.id) continue;
                
                const globalAfkData = globalAfk.get(userId);
                const localAfkData = afk.get(`${userId}_${message.guild.id}`);
                
                if (globalAfkData || localAfkData) {
                    const afkData = globalAfkData || localAfkData;
                    const afkType = globalAfkData ? 'global' : 'local';
                    const afkEmoji = globalAfkData ? '<:global:1390957563486539867>' : '<:local:1390958007780905043>';
                    
                    // Track the ping
                    const pingKey = globalAfkData ? `global_${userId}` : `local_${userId}_${message.guild.id}`;
                    let pings = afkPings.get(pingKey) || [];
                    
                    // Check if this user hasn't already pinged (to avoid spam)
                    const existingPing = pings.find(ping => ping.userId === message.author.id);
                    if (!existingPing) {
                        pings.push({
                            userId: message.author.id,
                            username: message.author.username,
                            messageUrl: message.url,
                            timestamp: Date.now()
                        });
                        
                        // Limit to last 10 pings to avoid spam
                        if (pings.length > 10) {
                            pings = pings.slice(-10);
                        }
                        
                        afkPings.set(pingKey, pings);
                    }
                    
                    // Calculate AFK duration
                    const afkDuration = Date.now() - afkData.time;
                    const duration = Math.floor(afkDuration / 1000);
                    const hours = Math.floor(duration / 3600);
                    const minutes = Math.floor((duration % 3600) / 60);
                    const seconds = duration % 60;
                    
                    let timeString = '';
                    if (hours > 0) timeString += `${hours}h `;
                    if (minutes > 0) timeString += `${minutes}m `;
                    timeString += `${seconds}s`;
                    
                    const embed = new EmbedBuilder()
                        .setColor(client.color)
                        .setDescription(`${afkEmoji} **${user.username}** is currently AFK (${afkType})\n**Reason:** ${afkData.reason}\n**Duration:** ${timeString}`)
                        .setFooter({ text: `AFK since ${new Date(afkData.time).toLocaleString()}` });
                    
                    message.reply({ embeds: [embed] });
                    break; // Only show one AFK message per message
                }
            }
        }

        // Get custom prefix for this server
        let prefix = client.prefix;
        try {
            const serverPrefix = await db.findOne({ Guild: message.guild.id });
            if (serverPrefix && serverPrefix.Prefix) {
                prefix = serverPrefix.Prefix;
            }
        } catch (error) {
            console.error('Error fetching server prefix:', error);
            // Fallback to default prefix
        }

        if (message.content === `<@${client.user.id}>` || message.content === `<@!${client.user.id}>`) {
            const embed = new EmbedBuilder()
                .setAuthor({
                    name: client.user.username,
                    iconURL: client.user.displayAvatarURL({ dynamic: true })
                })
                .setTitle(`**__Hey! I'm ${client.user.username}__**`)
                .setDescription(`A Very Good Music Bot With Cool Features`)
                .addFields([
                    { name: '**__Thanks For Pinging__**', value: `${client.emoji?.tick} Browse my commands by using \`${prefix}help\`
${client.emoji?.tick} Join [Community](https://discord.gg/lunardevs) to get updates related to Bot`, inline: true },
                ]);

          const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setLabel("Invite Me")
          .setEmoji('1056925359750262824')
          .setStyle(ButtonStyle.Link)
          .setURL(`https://discord.com/api/oauth2/authorize?client_id=${client.user.id}&permissions=8&scope=bot`),

        new ButtonBuilder()
          .setLabel("Support HQ")
          .setStyle(ButtonStyle.Link)
          .setEmoji('1056925477849284608')
          .setURL("https://discord.gg/E9Xec5zZn5"),
      );


            message.channel.send({ embeds: [embed] , components : [row]})
        };
        // Check if user has no-prefix access
        const NoPrefix = require("../../schema/noprefix");
        let hasNoPrefix = false;
        
        try {
            const noPrefixData = await NoPrefix.findOne({ userId: message.author.id });
            if (noPrefixData) {
                // Check if no-prefix access has expired
                if (noPrefixData.expiresAt && Date.now() >= noPrefixData.expiresAt) {
                    // Remove expired no-prefix access
                    await NoPrefix.deleteOne({ userId: message.author.id });
                    hasNoPrefix = false;
                } else {
                    hasNoPrefix = true;
                }
            }
        } catch (error) {
            console.error('Error checking no-prefix access:', error);
        }

        let regex = new RegExp(`^<@!?${client.user.id}>`);
        let pre = message.content.match(regex) ? message.content.match(regex)[0] : prefix;

        // Check if message starts with prefix, bot mention, or user has no-prefix access
        let isCommand = message.content.startsWith(prefix) || message.content.match(regex) || hasNoPrefix;

        if (!isCommand) return;



          // Check if guild is blacklisted (bypass for bot owner)
          const config = require('../../config');
          const isMainOwner = Array.isArray(config.ownerID) 
              ? config.ownerID.includes(message.author.id) 
              : message.author.id === config.ownerID;

          if (!isMainOwner) {
            try {
              const GuildBlacklist = require("../../schema/guildblacklist");
              const guildBlacklistData = await GuildBlacklist.findOne({ guildId: message.guild.id });
              if (guildBlacklistData) {
                // Check if guild blacklist has expired (if not lifetime)
                if (!guildBlacklistData.isLifetime && guildBlacklistData.expiresAt && Date.now() >= guildBlacklistData.expiresAt) {
                  // Guild blacklist has expired, remove it
                  await GuildBlacklist.deleteOne({ guildId: message.guild.id });
                } else {
                  // Guild is still blacklisted
                  // Check if this user has already been notified in this session
                  if (!client.guildBlacklistNotified) {
                    client.guildBlacklistNotified = new Set();
                  }

                  const notificationKey = `${message.guild.id}-${message.author.id}`;
                  if (!client.guildBlacklistNotified.has(notificationKey)) {
                    // Send guild blacklist message to user (once per session)
                    const guildBlacklistEmbed = new EmbedBuilder()
                      .setColor(client.color)
                      .setDescription(`**The guild is blacklisted due to command spamming. Contact support to remove blacklist __[Support Server](https://discord.gg/E9Xec5zZn5)__**`);

                    await message.channel.send({ embeds: [guildBlacklistEmbed] });

                    // Mark this user as notified for this guild
                    client.guildBlacklistNotified.add(notificationKey);
                  }

                  // Ignore all commands from this guild
                  return;
                }
              }
            } catch (error) {
              console.error('Error checking guild blacklist:', error);
            }
          }

          let args;
          let commandName;
          
          if (message.content.startsWith(prefix)) {
              // Normal prefix usage
              args = message.content.slice(prefix.length).trim().split(/ +/);
              commandName = args.shift().toLowerCase();
          } else if (message.content.match(regex)) {
              // Bot mention usage
              args = message.content.slice(pre.length).trim().split(/ +/);
              commandName = args.shift().toLowerCase();
          } else if (hasNoPrefix) {
              // No-prefix usage (only for users in database)
              args = message.content.trim().split(/ +/);
              commandName = args.shift().toLowerCase();
          } else {
              return;
          }

            const command = client.commands.get(commandName) ||
                client.commands.find((cmd) => cmd.aliases && cmd.aliases.includes(commandName));

        if (!command) return;

        // Check cooldown before executing command
        const canExecute = await client.cooldownManager.handleCommand(message, client);
        if (!canExecute) return;
        if (!message.guild.members.me.permissions.has(PermissionsBitField.resolve('SendMessages'))) return await message.author.dmChannel.send({ content: `I don't have **\`SEND_MESSAGES\`** permission in <#${message.channelId}> to execute this **\`${command.name}\`** command.` }).catch(() => { });

        if (!message.guild.members.me.permissions.has(PermissionsBitField.resolve('ViewChannel'))) return;

        if (!message.guild.members.me.permissions.has(PermissionsBitField.resolve('EmbedLinks'))) return await message.channel.send({ content: `I don't have **\`EMBED_LINKS\`** permission in <#${message.channelId}> to execute this **\`${command.name}\`** command.` }).catch(() => { });

        const embed = new EmbedBuilder()
            .setColor(client.color)

        if (command.args && !args.length) {
            let reply = `You didn't provide any arguments, ${message.author}!`;

            if (command.usage) {
                reply += `\nUsage: \`${prefix}${command.name} ${command.usage}\``;
            }

            embed.setDescription(reply);
            return message.channel.send({ embeds: [embed] });
        }

        if (command.botPerms) {
            if (!message.guild.members.me.permissions.has(PermissionsBitField.resolve(command.botPerms || []))) {
                embed.setDescription(`I don't have **\`${command.botPerms}\`** permission in <#${message.channelId}> to execute this **\`${command.name}\`** command.`);
                return message.channel.send({ embeds: [embed] });
            }
        }
        if (command.userPerms) {
            if (!message.member.permissions.has(PermissionsBitField.resolve(command.userPerms || []))) {
                embed.setDescription(`You don't have **\`${command.userPerms}\`** permission in <#${message.channelId}> to execute this **\`${command.name}\`** command.`);
                return message.channel.send({ embeds: [embed] });
            }
        }

        if (command.owner) {
            const isOwner = Array.isArray(config.ownerID) 
                ? config.ownerID.includes(message.author.id) 
                : message.author.id === config.ownerID;

            if (!isOwner) {
                return; // Ignore the command completely for non-owners
            }
        }

        // Check if owner is using admin commands - allow no-prefix for moderation
        const isOwner = Array.isArray(config.ownerID) 
            ? config.ownerID.includes(message.author.id) 
            : message.author.id === config.ownerID;

        if (isOwner && (command.category === 'Moderation' || command.category === 'Vcmod')) {
            // Owner can use moderation/voice commands without prefix
            // No additional checks needed
        } else if (command.owner && isOwner) {
            // Check if command has noPrefix property set to true
            if (command.noPrefix === true) {
                // Allow no-prefix usage for commands that explicitly allow it
                // No additional checks needed
            } else {
                // For sensitive owner commands, require prefix for security
                const sensitiveCommands = ['restart', 'stop', 'dmall', 'sdmall', 'reset'];
                if (sensitiveCommands.includes(command.name) && !message.content.startsWith(prefix)) {
                    return message.reply({
                        embeds: [
                            new EmbedBuilder()
                                .setColor(client.color)
                                .setDescription(`${client.emoji?.cross || '❌'} | This command requires the prefix \`${prefix}\` for security reasons.`)
                        ]
                    });
                }
            }
        }

        const player = message.client.manager.get(message.guild.id);

        if (command.player && !player) {
            embed.setDescription("There is no player for this guild.");
            return message.channel.send({ embeds: [embed] });
        }

        if (command.inVoiceChannel && !message.member.voice.channelId) {
            embed.setDescription("You must be in a voice channel!");
            return message.channel.send({ embeds: [embed] });
        }

        if (command.sameVoiceChannel) {
            if (message.guild.members.me.voice.channel) {
                if (message.guild.members.me.voice.channelId !== message.member.voice.channelId) {
                    embed.setDescription(`You must be in the same channel as ${message.client.user}!`);
                    return message.channel.send({ embeds: [embed] });
                }
            }
        }
        if (command.dj) {
            let data = await db2.findOne({ Guild: message.guild.id })
            let perm = 'MuteMembers';
            if (data) {
                if (data.Mode) {
                    let pass = false;
                    if (data.Roles.length > 0) {
                        message.member.roles.cache.forEach((x) => {
                            let role = data.Roles.find((r) => r === x.id);
                            if (role) pass = true;
                        });
                    };
                    if (!pass && !message.member.permissions.has(perm)) return message.channel.send({ embeds: [embed.setDescription(`You don't have permission or dj role to use this command`)] })
                };
            };
        }

        try {
          await command.execute(message, args, client, prefix);

          // Log command usage
          try {

            const commandLogsChannel = client.channels.cache.get(config.commandLogsChannel);
            if (commandLogsChannel) {
              const embed = new EmbedBuilder()
                .setColor(client.color)
                .setTitle('📝 Command Executed')
                .addFields([
                  { name: 'Command Executed', value: `\`${message.content}\``, inline: false },
                  { name: 'User', value: `${message.author.tag} (\`${message.author.id}\`)`, inline: true },
                  { name: 'Server', value: `${message.guild.name} (\`${message.guild.id}\`)`, inline: true },
                  { name: 'Channel', value: `${message.channel.name} (\`${message.channel.id}\`)`, inline: true },
                  { name: 'Message Link', value: `[Jump to Message](${message.url})`, inline: true }
                ])
                .setFooter({ text: `User ID: ${message.author.id} • Server ID: ${message.guild.id}` })
                .setTimestamp();

              await commandLogsChannel.send({ embeds: [embed] });
            }
          } catch (logError) {
            console.error('Error logging command usage:', logError);
          }
        } catch (error) {
          console.log(error);
        }
    }
};