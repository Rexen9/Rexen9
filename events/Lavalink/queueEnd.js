const { EmbedBuilder } = require("discord.js");
const db = require("../../schema/setup");

module.exports = async (client, player) => {
  // Clear voice channel status when music stops
  try {
    let guild = client.guilds.cache.get(player.guild);
    if (guild) {
      const voiceChannel = guild.channels.cache.get(player.voiceChannel);
      if (voiceChannel && voiceChannel.type === 2) { // Voice channel type
        await voiceChannel.setStatus(null); // Clear the status
      }
    }
  } catch (error) {
    console.error('Error clearing voice channel status:', error);
  }

	const invite = client.config.links.invite

	let guild = client.guilds.cache.get(player.guild);
	if (!guild) return;
	const data = await db.findOne({ Guild: guild.id });
	if (!data) return;
	let channel = guild.channels.cache.get(data.Channel);
	if (!channel) return;

	let message;

	try {

		message = await channel.messages.fetch({message: data.Message, cache: true });

	} catch (e) { };

	if (!message) return;
	await message.edit({ embeds: [new EmbedBuilder().setColor(client.embedColor).setTitle(`Nothing playing right now in this server!`).setDescription(`[Invite](${client.config.links.invite}) - [Support Server](${client.config.links.support})`).setImage(client.config.links.img)] }).catch(() => { });

	const emojiwarn = client.emoji.warn;
	let thing = new EmbedBuilder()
		.setColor(client.embedColor)
		.setAuthor({name: `Queue Concluded`, iconURL: client.user.displayAvatarURL() })
		.setDescription(`Enjoying music with me? Consider me by **Inviting**[Click Here](${invite})`)
	channel.send({ embeds: [thing] }).then(msg => { setTimeout(() => { msg.delete() }, 5000) });
	
    if (!player.twentyFourSeven) {
        // Start 60-second music inactivity timer
        if (!client.musicInactivityTimers) client.musicInactivityTimers = new Map();
        
        const timerId = setTimeout(async () => {
            const currentPlayer = client.manager?.get(guild.id);
            if (currentPlayer && !currentPlayer.queue.current && currentPlayer.queue.size === 0) {
                // Find notification channel
                let notificationChannel = channel;
                
                // Try to find the last command channel used by any user in this guild
                if (client.userLastChannel) {
                    for (const [userId, channelId] of client.userLastChannel.entries()) {
                        const user = client.users.cache.get(userId);
                        if (user && guild && guild.members.cache.has(userId)) {
                            const testChannel = client.channels.cache.get(channelId);
                            if (testChannel && testChannel.guild.id === guild.id) {
                                notificationChannel = testChannel;
                                break;
                            }
                        }
                    }
                }
                
                const inactivityEmbed = new EmbedBuilder()
                    .setColor(client.embedColor)
                    .setTitle('<:stop:1379440247049551953> Left Voice Channel')
                    .setDescription(`Left <#${currentPlayer.voiceChannel}> due to music inactivity (no music playing for 60 seconds)`)
                    .setTimestamp();
                
                notificationChannel.send({ embeds: [inactivityEmbed] }).catch(() => {});
                
                // Destroy the player
                await currentPlayer.destroy();
            }
            
            // Clean up timer
            client.musicInactivityTimers.delete(guild.id);
        }, 60000); // 60 seconds
        
        client.musicInactivityTimers.set(guild.id, timerId);
    } else {
        await player.stop();
    }
}
