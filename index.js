const { EmbedBuilder, ActionRowBuilder, ButtonStyle, StingSelectMenuBuilder, Events, ButtonBuilder, editEmbed, Collection, ChannelType, PermissionFlagsBits } = require("discord.js");
const MusicBot = require("./structures/Client");
const client = new MusicBot();
const GiveawayManager = require("./handlers/GiveawayManager");
client.connect()
const util = require('./handlers/util');
const config = require('./config');

// Rate-limit ke chodon ki chudai
client.util = new util(client);
client.giveawaysManager = new GiveawayManager(client);
require('./handlers/blacklist_handler')(client);

// Rate-limit ke chodon ki chudai x2
const CooldownManager = require('./handlers/cooldown_handler');
client.cooldownManager = new CooldownManager();

// Initialize sub-owner handler
const SubOwnerHandler = require('./handlers/subowner_handler');
client.subOwnerHandler = new SubOwnerHandler(client);

// Auto-add bot owners to blacklist ignore list
const BlacklistIgnore = require('./schema/blacklist_ignore');
client.once('ready', async () => {
  try {
    const ownerIDs = Array.isArray(config.ownerID) ? config.ownerID : [config.ownerID];
    
    for (const ownerID of ownerIDs) {
      const ownerInIgnore = await BlacklistIgnore.findOne({ entityId: ownerID, type: 'user' });
      
      if (!ownerInIgnore) {
        await BlacklistIgnore.create({
          entityId: ownerID,
          type: 'user',
          addedBy: client.user.id,
          addedAt: new Date(),
          reason: 'Bot owner - automatic protection on startup'
        });
        console.log(`[OWNER PROTECTION] Added bot owner ${ownerID} to blacklist ignore list`);
      } else {
        console.log(`[OWNER PROTECTION] Bot owner ${ownerID} already protected from blacklist`);
      }
    }
  } catch (error) {
    console.error('Error adding owners to blacklist ignore:', error);
  }
});

// Clean up old cooldown entries every 5 minutes
setInterval(() => {
  client.cooldownManager.cleanup();
}, 5 * 60 * 1000);

client.emoji = {
  'tick': '<:tick:1390958199988818061>',
  'cross': '<:cross:1390957294749089812>',
  'dot': '<a:dot:1386096822392459415>',
  'giveaway': '<:gw:1390957567542558752>',
  'music': '<a:music_disc:1379440965353345057>',
  'volumehigh': '<:vol:1390958235292536893>',
  'play': '<:play:1390958144926253126>',
  'stop': '<:stop:1390958195056574534>',
  'skip': '<:skip:1390958182326730792>',
  'resume': '<:resume:1390958167361327204>',
  'pause': '<:pause:1390958141533061180>',
  'rewind': '<:rewind:1390958170993721466>',
  'shuffle': '🔀',
  'global': '<:global:1390957563486539867>',
  'local': '<:local:1390958007780905043>',
  'vc': '<:vc:1390958226148687892>',
  'user': '<:user:1390958219152592907>',
  'helpdev': '<:dev:1390957298918096906>',
  'helphome': '<:home:1390957607845367868>',
  'helpinfo': '<:user:1390958219152592907>',
  'helpmusic': '<:music2:1390958101569736774>',
  'helpvoice': '<:vc:1390958226148687892>',
  'helpmod': '<:moderation:1390958044149710939>',
  'helpplaylist': '<:playlist:1390958153180381235>',
  'helpanime': '<:anime:1390957250037940365>',
};

client.userSettings = new Collection();
client.color = '5ed7ff';

// VC Inactivity tracker
client.vcInactivityTimers = new Map();
client.musicInactivityTimers = new Map();

// Performance optimizations
client.setMaxListeners(0);
process.setMaxListeners(0);

// Cache optimization
const originalCacheSet = client.users.cache.set;
client.users.cache.set = function(key, value) {
    if (this.size >= 1000) {
        const firstKey = this.firstKey();
        this.delete(firstKey);
    }
    return originalCacheSet.call(this, key, value);
};

// Initialize Voice Recording Handler
const VoiceRecordingHandler = require('./handlers/VoiceRecordingHandler');
client.voiceRecordingHandler = new VoiceRecordingHandler(client);

module.exports = client;

// Join2Create Voice Channel System
client.on('voiceStateUpdate', async (oldState, newState) => {
    if (!client.join2create) client.join2create = new Map();
    if (!client.vcCommandUsed) client.vcCommandUsed = new Map(); // Track if vc commands were used
    
    const guild = newState.guild || oldState.guild;
    const join2createChannelId = client.join2create.get(guild.id);
    
    if (!join2createChannelId) return;

    // Someone joined the join2create channel
    if (newState.channelId === join2createChannelId && newState.member) {
        try {
            const member = newState.member;
            const category = newState.channel.parent;
            
            // Create a new voice channel for the user
            const newChannel = await guild.channels.create({
                name: `${member.displayName}'s Channel`,
                type: ChannelType.GuildVoice,
                parent: category,
                permissionOverwrites: [
                    {
                        id: guild.id,
                        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect],
                    },
                    {
                        id: member.id,
                        allow: [
                            PermissionFlagsBits.ViewChannel,
                            PermissionFlagsBits.Connect,
                            PermissionFlagsBits.Speak,
                            PermissionFlagsBits.ManageChannels,
                            PermissionFlagsBits.MoveMembers,
                            PermissionFlagsBits.MuteMembers,
                            PermissionFlagsBits.DeafenMembers
                        ],
                    },
                    {
                        id: client.user.id,
                        allow: [
                            PermissionFlagsBits.ViewChannel,
                            PermissionFlagsBits.Connect,
                            PermissionFlagsBits.Speak,
                            PermissionFlagsBits.ManageChannels,
                            PermissionFlagsBits.MoveMembers
                        ],
                    },
                ],
            });

            // Move the member to their new channel
            await member.voice.setChannel(newChannel);

            // Store the temporary channel info
            if (!client.tempChannels) client.tempChannels = new Map();
            client.tempChannels.set(newChannel.id, member.id);

        } catch (error) {
            console.error('Error creating join2create channel:', error);
        }
    }

    // Handle VC inactivity for all voice channels (not just join2create)
    if (oldState.channelId && oldState.channelId !== newState.channelId) {
        const leftChannel = oldState.channel;
        if (leftChannel && leftChannel.members.filter(m => !m.user.bot).size === 0) {
            // No human members left in VC, start 5-second timer
            const timerId = setTimeout(async () => {
                // Check if there's a music player in this channel
                const player = client.manager?.get(leftChannel.guild.id);
                if (player && player.voiceChannel === leftChannel.id) {
                    // Find notification channel
                    let notificationChannel;
                    
                    // Try to find the last command channel used by any user in this guild
                    if (client.userLastChannel) {
                        for (const [userId, channelId] of client.userLastChannel.entries()) {
                            const user = client.users.cache.get(userId);
                            const guild = client.guilds.cache.get(leftChannel.guild.id);
                            if (user && guild && guild.members.cache.has(userId)) {
                                notificationChannel = client.channels.cache.get(channelId);
                                if (notificationChannel && notificationChannel.guild.id === leftChannel.guild.id) {
                                    break;
                                }
                            }
                        }
                    }
                    
                    // Fallback to player's text channel
                    if (!notificationChannel) {
                        notificationChannel = client.channels.cache.get(player.textChannel);
                    }
                    
                    if (notificationChannel) {
                        const embed = new EmbedBuilder()
                            .setColor(client.color)
                            .setTitle('<:stop:1379440247049551953> Left Voice Channel')
                            .setDescription(`Left <#${leftChannel.id}> due to inactivity (no members for 5 seconds)`)
                            .setTimestamp();
                        
                        notificationChannel.send({ embeds: [embed] }).catch(() => {});
                    }
                    
                    // Destroy the player
                    player.destroy();
                }
                
                // Clean up timer
                client.vcInactivityTimers.delete(leftChannel.id);
            }, 5000);
            
            client.vcInactivityTimers.set(leftChannel.id, timerId);
        }
    }
    
    // Cancel inactivity timer if someone joins back
    if (newState.channelId && client.vcInactivityTimers.has(newState.channelId)) {
        const timerId = client.vcInactivityTimers.get(newState.channelId);
        clearTimeout(timerId);
        client.vcInactivityTimers.delete(newState.channelId);
    }

    // Someone left a temporary channel - check ownership transfer or deletion
    if (oldState.channelId && client.tempChannels && client.tempChannels.has(oldState.channelId)) {
        const channel = oldState.channel;
        const currentOwner = client.tempChannels.get(channel.id);
        
        // Only check for ownership transfer if the owner actually LEFT the channel (not just mute/unmute)
        if (oldState.member.id === currentOwner && 
            newState.channelId !== oldState.channelId && // Actually left the channel
            channel && channel.members.size > 0) {
            
            // Transfer ownership to a random member
            const members = Array.from(channel.members.filter(m => !m.user.bot).values());
            if (members.length > 0) {
                const newOwner = members[Math.floor(Math.random() * members.length)];
                client.tempChannels.set(channel.id, newOwner.id);
                
                // Update channel permissions for new owner
                try {
                    await channel.permissionOverwrites.edit(newOwner.id, {
                        ViewChannel: true,
                        Connect: true,
                        Speak: true,
                        ManageChannels: true,
                        MoveMembers: true,
                        MuteMembers: true,
                        DeafenMembers: true
                    });
                    
                    // Remove old owner permissions if they're still in the server
                    if (oldState.member) {
                        await channel.permissionOverwrites.delete(oldState.member.id);
                    }
                    
                    // Only send transfer message if the previous owner used vc commands
                    const channelCommandKey = `${channel.id}_${oldState.member.id}`;
                    const hasUsedVcCommands = client.vcCommandUsed && client.vcCommandUsed.has(channelCommandKey);
                    
                    if (hasUsedVcCommands) {
                        // Find notification channel (last command channel or last message channel)
                        let notificationChannel;
                        if (client.userLastChannel && client.userLastChannel.has(oldState.member.id)) {
                            notificationChannel = client.channels.cache.get(client.userLastChannel.get(oldState.member.id));
                        }
                        
                        // If no last command channel, try to find their last message channel
                        if (!notificationChannel) {
                            // This would require tracking user messages, for now use a general channel
                            notificationChannel = channel.guild.systemChannel || channel.guild.channels.cache.find(c => c.type === 0 && c.permissionsFor(client.user).has('SendMessages'));
                        }
                        
                        if (notificationChannel) {
                            const embed = new EmbedBuilder()
                                .setColor(client.color)
                                .setTitle('<:vc:1379473053708189809> Voice Channel Ownership Transferred')
                                .setDescription(`Ownership of <#${channel.id}> has been transferred to ${newOwner}`)
                                .addFields([
                                    { name: 'Previous Owner', value: `${oldState.member}`, inline: true },
                                    { name: 'New Owner', value: `${newOwner}`, inline: true }
                                ])
                                .setTimestamp();
                            
                            notificationChannel.send({ embeds: [embed] }).catch(() => {});
                        }
                        
                        // Clean up the vc command usage tracking for this channel/user combination
                        client.vcCommandUsed.delete(channelCommandKey);
                    }
                    
                } catch (error) {
                    console.error('Error transferring join2create ownership:', error);
                }
            }
        }
        
        // Check if channel is empty and delete it
        if (channel && channel.members.size === 0) {
            try {
                // Remove from temp channels map
                client.tempChannels.delete(channel.id);
                
                // Clean up vc command usage tracking for this channel
                if (client.vcCommandUsed) {
                    const keysToDelete = [];
                    for (const key of client.vcCommandUsed.keys()) {
                        if (key.startsWith(`${channel.id}_`)) {
                            keysToDelete.push(key);
                        }
                    }
                    keysToDelete.forEach(key => client.vcCommandUsed.delete(key));
                }
                
                // Delete the empty voice channel
                await channel.delete('Join2Create: Channel empty and inactive');
                
                console.log(`Deleted empty join2create channel: ${channel.name} (${channel.id})`);
            } catch (error) {
                console.error('Error deleting empty join2create channel:', error);
            }
        }
    }
});

client.on(Events.InteractionCreate, async interaction => {

    if (!interaction.isStringSelectMenu()) return;

    process.on('unhandledRejection', (reason, p) => {
        console.error('Unhandled Rejection:', reason);
    });

    process.on('uncaughtException', (err, origin) => {
        console.error('Uncaught Exception:', err);
    });

    process.on('uncaughtExceptionMonitor', (err, origin) => {
        console.error('Uncaught Exception Monitor:', err);
    });

    let options = interaction.values;
    let funny = options[0];

// Handle help dropdown selections
    if (interaction.customId === 'helpop') {
        const value = interaction.values[0];
        let embed;
        const prefix = client.prefix || ','; // Get prefix or default to ','

        switch(value) {
            case 'home':
                embed = new EmbedBuilder()
                    .setAuthor({ name: `Help Panel`, iconURL: client.user.displayAvatarURL() })
                    .setDescription(`
                    ${client.emoji?.helpdev} Prefix on this server: \`${prefix}\`
                    ${client.emoji?.helpdev} Type **\`${prefix}\`help** for more info
                    ${client.emoji?.helpdev} Total commands: \`${client.commands.size}\`
                    **[Invite Me](${config.links.invite}) | [Support HQ](${config.links.support})**
                    `)
                    .addFields([
                        {
                            name: `**${client.emoji?.helphome} Main Categories**`,
                            value: `
                              ${client.emoji?.helpinfo} Information
                              ${client.emoji?.helpmusic} Music
                              ${client.emoji?.helpvoice} Voice
                              ${client.emoji?.helpmod} Moderation
                              ${client.emoji?.helpplaylist} Playlist
                              ${client.emoji?.helpanime} Anime`,
                        }
                    ])
                    .setThumbnail(client.user.displayAvatarURL())
                    .setColor(client.color)
                    .setTimestamp()
                    .setImage("https://cdn.discordapp.com/attachments/1294253194351743001/1379462382941638808/Ice_Banner.jpg?ex=684053f5&is=683f0275&hm=13653ab42a328f67b78d5fa07120ba11421afb66a929a7b64e9eaa96ab26b617&");
                break;
            case 'information':
                embed = new EmbedBuilder()
                    .setAuthor({ name: `Help Panel`, iconURL: client.user.displayAvatarURL() })
                    .setTitle("**Information \`[13]\`**")
                    .setDescription(`
                    \`afk\` \`avatar\` \`banner\` \`boostcount\` \`help\` \`invite\` \`membercount\` \`owner\` \`ping\` \`serverinfo\` \`status\` \`uptime\` \`user\`
                    `)
                    .setColor(client.color)
                    .setTimestamp()
                    .setFooter({ text: `Requested by ${interaction.member.user.username}`, iconURL: interaction.member.user.displayAvatarURL({ dynamic: true }) });
                break;
            case 'music':
                embed = new EmbedBuilder()
                    .setAuthor({ name: `Help Panel`, iconURL: client.user.displayAvatarURL() })
                    .setTitle("**Music \`[24]\`**")
                    .setDescription(`
                    \`247\` \`autoplay\` \`clearqueue\` \`filters\` \`grab\` \`join\` \`leave\` \`loop\` \`lyrics\` \`nowplaying\` \`pause\` \`play\` \`playfile\` \`queue\` \`remove\` \`resume\` \`search\` \`seek\` \`shuffle\` \`skip\` \`skipto\` \`stop\` \`volume\`
                    `)
                    .setColor(client.color)
                    .setTimestamp()
                    .setFooter({ text: `Requested by ${interaction.member.user.username}`, iconURL: interaction.member.user.displayAvatarURL({ dynamic: true }) });
                break;
            case 'voice':
                embed = new EmbedBuilder()
                    .setAuthor({ name: `Help Panel`, iconURL: client.user.displayAvatarURL() })
                    .setTitle("**Voice \`[17]\`**")
                    .setDescription(`
                    \`join2create\` \`vcdeafen\` \`vcinfo\` \`vckick\` \`vckickall\` \`vclimit\` \`vclist\` \`vclock\` \`vcmove\` \`vcmute\` \`vcmuteall\` \`vcrename\` \`vcundeafen\` \`vcunlock\` \`vcunmute\` \`vcunmuteall\`
                    `)
                    .setColor(client.color)
                    .setTimestamp()
                    .setFooter({ text: `Requested by ${interaction.member.user.username}`, iconURL: interaction.member.user.displayAvatarURL({ dynamic: true }) });
                break;
            case 'moderation':
                embed = new EmbedBuilder()
                    .setAuthor({ name: `Help Panel`, iconURL: client.user.displayAvatarURL() })
                    .setTitle("**Moderation \`[15]\`**")
                    .setDescription(`
                    \`ban\` \`gwend\` \`gwreroll\` \`gwstart\` \`hide\` \`kick\` \`lock\` \`mute\` \`nuke\` \`purge\` \`purgebots\` \`setprefix\` \`unhide\` \`unlock\` \`unmute\`
                    `)
                    .setColor(client.color)
                    .setTimestamp()
                    .setFooter({ text: `Requested by ${interaction.member.user.username}`, iconURL: interaction.member.user.displayAvatarURL({ dynamic: true }) });
                break;
            case 'playlist':
                embed = new EmbedBuilder()
                    .setAuthor({ name: `Help Panel`, iconURL: client.user.displayAvatarURL() })
                    .setTitle("**Playlist \`[8]\`**")
                    .setDescription(`
                    \`p_create\` \`p_delete\` \`p_info\` \`p_list\` \`p_load\` \`p_removetrack\` \`p_savecurrent\` \`p_savequeue\`
                    `)
                    .setColor(client.color)
                    .setTimestamp()
                    .setFooter({ text: `Requested by ${interaction.member.user.username}`, iconURL: interaction.member.user.displayAvatarURL({ dynamic: true }) });
                break;
            default:
                return;
        }

        interaction.update({ embeds: [embed], ephemeral: true });
        return;
    }

module.exports = client;
})