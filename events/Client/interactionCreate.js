const {
  CommandInteraction,
  InteractionType,
  PermissionFlagsBits,
  PermissionsBitField,
  Events,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");
const { SearchResult, Track } = require("erela.js");
const { AggregatedSearchSuggestions } = require("../../utils/SearchAggregator");
const MusicBot = require("../../structures/Client");
const db = require("../../schema/prefix.js");
const db2 = require("../../schema/dj");
const db3 = require("../../schema/setup");
const { afk, globalAfk, afkPings } = require('../../utils/afk');

module.exports = {
  name: "interactionCreate",
  /**
   *
   * @param {MusicBot} client
   * @param {CommandInteraction} interaction
   */
  run: async (client, interaction) => {
    const emb1 = new EmbedBuilder()
      .setColor(client.color)
      .setTitle('<:emoji_1737655441477:1332048210788876399> **__Owner__**')
      .setDescription("**1. [Soumen](https://discord.com/users/1034339539315077121)**");

    // Handle reset confirmation buttons
    if (interaction.isButton() && interaction.customId.startsWith('reset_')) {
      const parts = interaction.customId.split('_');
      const action = parts[1]; // 'confirm' or 'cancel'
      const userId = parts[2];

      // Verify user can only confirm their own reset
      if (userId !== interaction.user.id) {
        return interaction.reply({ 
          content: 'You can only confirm your own reset request!', 
          ephemeral: true 
        });
      }

      if (action === 'confirm') {
        const embed = new EmbedBuilder()
          .setColor(client.color)
          .setTitle('🔄 Bot Reset Initiated')
          .setDescription('**Type "confirm" or "yes" to proceed with the reset.**\n**Type "cancel" or "no" to abort.**')
          .setFooter({ text: 'Waiting for text confirmation...' });

        await interaction.update({ embeds: [embed], components: [] });

        // Set up message collector for text confirmation
        const filter = m => m.author.id === interaction.user.id;
        const collector = interaction.channel.createMessageCollector({ filter, time: 30000, max: 1 });

        collector.on('collect', async (m) => {
          const response = m.content.toLowerCase();
          
          if (response === 'confirm' || response === 'yes') {
            const successEmbed = new EmbedBuilder()
              .setColor('#00ff00')
              .setTitle('✅ Reset Confirmed')
              .setDescription('**Bot reset has been initiated successfully!**\n\n*Note: In a real implementation, this would clear all database collections.*')
              .setTimestamp();

            m.reply({ embeds: [successEmbed] });
          } else if (response === 'cancel' || response === 'no') {
            const cancelEmbed = new EmbedBuilder()
              .setColor('#ff9900')
              .setTitle('❌ Reset Cancelled')
              .setDescription('**Bot reset has been cancelled.**')
              .setTimestamp();

            m.reply({ embeds: [cancelEmbed] });
          } else {
            const invalidEmbed = new EmbedBuilder()
              .setColor('#ff0000')
              .setDescription('❌ Invalid response. Reset cancelled.')
              .setTimestamp();

            m.reply({ embeds: [invalidEmbed] });
          }
        });

        collector.on('end', (collected) => {
          if (collected.size === 0) {
            const timeoutEmbed = new EmbedBuilder()
              .setColor('#ff0000')
              .setDescription('❌ Reset confirmation timed out.')
              .setTimestamp();

            interaction.followUp({ embeds: [timeoutEmbed] });
          }
        });

      } else if (action === 'cancel') {
        const embed = new EmbedBuilder()
          .setColor('#ff9900')
          .setTitle('❌ Reset Cancelled')
          .setDescription('**Bot reset has been cancelled.**')
          .setTimestamp();

        await interaction.update({ embeds: [embed], components: [] });
      }

      return;
    }

    // Handle AFK button interactions
    if (interaction.isButton() && interaction.customId.startsWith('afk_')) {
      const parts = interaction.customId.split('_');
      const mode = parts[1]; // 'global' or 'local'
      const userId = parts[2];

      // Verify user can only set their own AFK
      if (userId !== interaction.user.id) {
        return interaction.reply({ 
          content: 'You can only set your own AFK status!', 
          ephemeral: true 
        });
      }

      let reason, guildId;
      if (mode === 'global') {
        reason = Buffer.from(parts[3], 'base64').toString();
      } else {
        guildId = parts[3];
        reason = Buffer.from(parts[4], 'base64').toString();
      }

      const afkData = {
        time: Date.now(),
        reason: reason
      };

      if (mode === 'global') {
        globalAfk.set(userId, afkData);
        // Remove from local AFK if exists
        afk.delete(`${userId}_${interaction.guild.id}`);
      } else {
        afk.set(`${userId}_${guildId}`, afkData);
        // Remove from global AFK if exists
        globalAfk.delete(userId);
      }

      const modeEmoji = mode === 'global' ? (client.emoji?.global || '<:global:1390957563486539867>') : (client.emoji?.local || '<:local:1390958007780905043>');
      const embed = new EmbedBuilder()
        .setColor(client.color)
        .setDescription(`${modeEmoji} Your AFK is now set to **${mode}** mode: **${reason}**`)
        .setFooter({ text: `Mode: ${mode === 'global' ? 'Global (All servers)' : 'Local (This server only)'}` });

      return await interaction.update({ embeds: [embed], components: [] });
    }

    if (interaction.isButton()) { // Checks if the interaction is a button
      if (interaction.customId === '11') { // Check for the customId of the button
        interaction.reply({ // update the interaction with the new action row
          embeds: [emb1],
          ephemeral: true
        });
      } 
      if (interaction.customId === '12') { // Check for the customId of the button
        interaction.reply({ // update the interaction with the new action row
          embeds: [emb2],
          ephemeral: true
        });
      }
    }

    let prefix = client.prefix;
    const ress = await db.findOne({ Guild: interaction.guildId });
    if (ress && ress.Prefix) prefix = ress.Prefix;

    if (interaction.type === InteractionType.ApplicationCommandAutocomplete) {
      switch (interaction.commandName) {
        case "play":
          /**
           * @type {import("discord.js").AutocompleteFocusedOption}
           */
          const focused = interaction.options.getFocused(true);

          if (focused.name === "input") {
            if (focused.value === "") return;
            /**
             * @type {SearchResult}
             */
            const searchSuggestions = await AggregatedSearchSuggestions(
              client,
              focused.value,
              interaction.user
            );
            if(searchSuggestions) await interaction.respond(searchSuggestions);
            return;
          }
          break;
      }
    }

    if (interaction.type === InteractionType.ApplicationCommand) {
      const command = client.slashCommands.get(interaction.commandName);
      if (!command) return;

      const embed = new EmbedBuilder().setColor("#000000");

      if (command.botPerms) {
        if (
          !interaction.guild.members.me.permissions.has(
            PermissionsBitField.resolve(command.botPerms || [])
          )
        ) {
          embed.setDescription(
            `I don't have **\`${
              command.botPerms
            }\`** permission in ${interaction.channel.toString()} to execute this **\`${
              command.name
            }\`** command.`
          );
          return interaction.reply({ embeds: [embed] });
        }
      }

      if (command.userPerms) {
        if (
          !interaction.member.permissions.has(
            PermissionsBitField.resolve(command.userPerms || [])
          )
        ) {
          embed.setDescription(
            `You don't have **\`${
              command.userPerms
            }\`** permission in ${interaction.channel.toString()} to execute this **\`${
              command.name
            }\`** command.`
          );
          return interaction.reply({ embeds: [embed] });
        }
      }

      const player = interaction.client.manager.get(interaction.guildId);
      if (command.player && !player) {
        if (interaction.replied) {
          return await interaction
            .editReply({
              content: `There is no player for this guild.`,
              ephemeral: true,
            })
            .catch(() => {});
        } else {
          return await interaction
            .reply({
              content: `There is no player for this guild.`,
              ephemeral: true,
            })
            .catch(() => {});
        }
      }
      if (command.inVoiceChannel && !interaction.member.voice.channel) {
        if (interaction.replied) {
          return await interaction
            .editReply({
              content: `You must be in a voice channel!`,
              ephemeral: true,
            })
            .catch(() => {});
        } else {
          return await interaction
            .reply({
              content: `You must be in a voice channel!`,
              ephemeral: true,
            })
            .catch(() => {});
        }
      }
      if (command.sameVoiceChannel) {
        if (interaction.guild.members.me.voice.channel) {
          if (
            interaction.member.voice.channel !==
            interaction.guild.members.me.voice.channel
          ) {
            return await interaction
              .reply({
                content: `You must be in the same ${interaction.guild.members.me.voice.channel.toString()} to use this command!`,
                ephemeral: true,
              })
              .catch(() => {});
          }
        }
      }
      if (command.dj) {
        let data = await db2.findOne({ Guild: interaction.guildId });
        let perm = PermissionFlagsBits.MuteMembers;
        if (data) {
          if (data.Mode) {
            let pass = false;
            if (data.Roles.length > 0) {
              interaction.member.roles.cache.forEach((x) => {
                let role = data.Roles.find((r) => r === x.id);
                if (role) pass = true;
              });
            }
            if (!pass && !interaction.member.permissions.has(perm))
              return await interaction.reply({
                content: `You don't have permission or dj role to use this command`,
                ephemeral: true,
              });
          }
        }
      }

      try {
        const result = await command.run(client, interaction, prefix);

        // Log command usage
        try {
          const config = require('../../config');

          const commandLogsChannel = client.channels.cache.get(config.commandLogsChannel);
          if (commandLogsChannel) {
            const commandWithOptions = interaction.options.data.length > 0 
              ? `/${interaction.commandName} ${interaction.options.data.map(opt => `${opt.name}:${opt.value}`).join(' ')}`
              : `/${interaction.commandName}`;

            const embed = new EmbedBuilder()
              .setColor(client.color)
              .setTitle('📝 Slash Command Executed')
              .addFields([
                { name: 'Command Executed', value: `\`${commandWithOptions}\``, inline: false },
                { name: 'User', value: `${interaction.user.tag} (\`${interaction.user.id}\`)`, inline: true },
                { name: 'Server', value: `${interaction.guild.name} (\`${interaction.guild.id}\`)`, inline: true },
                { name: 'Channel', value: `${interaction.channel.name} (\`${interaction.channel.id}\`)`, inline: true }
              ])
              .setFooter({ text: `User ID: ${interaction.user.id} • Server ID: ${interaction.guild.id}` })
              .setTimestamp();

            await commandLogsChannel.send({ embeds: [embed] });
          }
        } catch (logError) {
          console.error('Error logging slash command usage:', logError);
        }

        return result;
      } catch (error) {
        if (interaction.replied) {
          await interaction
            .editReply({
              content: `An unexcepted error occured.`,
            })
            .catch(() => {});
        } else {
          await interaction
            .reply({
              ephemeral: true,
              content: `An unexcepted error occured.`,
            })
            .catch(() => {});
        }
        console.error(error);
      }
    }

    if (interaction.isButton()) {
      let data = await db3.findOne({ Guild: interaction.guildId });
      if (
        data &&
        interaction.channelId === data.Channel &&
        interaction.message.id === data.Message
      )
        return client.emit("playerButtons", interaction, data);
    }
  },
};