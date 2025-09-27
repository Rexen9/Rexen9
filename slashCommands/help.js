
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../schema/prefix.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Shows help information for Ice bot'),
    
    async run(client, interaction) {
        // Get custom prefix for this server
        let prefix = client.prefix;
        const serverPrefix = await db.findOne({ Guild: interaction.guildId });
        if (serverPrefix && serverPrefix.Prefix) {
            prefix = serverPrefix.Prefix;
        }

        const embed = new EmbedBuilder()
            .setColor(client.color)
            .setDescription(`Hey I'm **Ice**, I'm a prefix bot do **${prefix}help** to see my command list.`)
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};
