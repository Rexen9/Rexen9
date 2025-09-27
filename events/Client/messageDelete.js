
const { Events } = require('discord.js');

module.exports = {
    name: Events.MessageDelete,
    run: async (client, message) => {
        // Skip if message is from DM or bot messages
        if (!message.guild || message.author?.bot) return;

        try {
            // Check if the deleted message was a giveaway
            const giveaway = await client.giveawaysManager.giveaways.find(g => g.messageId === message.id);
            
            if (giveaway) {
                // Cancel and remove the giveaway from memory
                await client.giveawaysManager.deleteGiveaway(message.id);
                console.log(`[GIVEAWAY] Cancelled giveaway due to message deletion: ${message.id} in ${message.guild.name}`);
                
                // Optional: Log to giveaway logs channel if you have one
                try {
                    const config = require('../../config');
                    const logsChannel = client.channels.cache.get(config.logs);
                    if (logsChannel) {
                        const { EmbedBuilder } = require('discord.js');
                        const embed = new EmbedBuilder()
                            .setColor('#FF0000')
                            .setTitle('🎁 Giveaway Cancelled')
                            .setDescription(`Giveaway message was deleted`)
                            .addFields([
                                { name: 'Prize', value: giveaway.prize || 'Unknown', inline: true },
                                { name: 'Channel', value: `<#${message.channelId}>`, inline: true },
                                { name: 'Server', value: message.guild.name, inline: true }
                            ])
                            .setTimestamp();
                        
                        await logsChannel.send({ embeds: [embed] });
                    }
                } catch (logError) {
                    console.error('Error logging giveaway cancellation:', logError);
                }
            }
        } catch (error) {
            console.error('Error handling giveaway message deletion:', error);
        }
    }
};
