const { ChannelType, EmbedBuilder } = require('discord.js');
const moment = require('moment');

module.exports = {
  name: "guildCreate",
  run: async (client, guild) => {

    const channel = client.channels.cache.get(client.config.logs);
    let own = await guild?.fetchOwner();
    let text;
    guild.channels.cache.forEach(c => {
      if (c.type === ChannelType.GuildText && !text) text = c;
    });
    const invite = await text.createInvite({ reason: `For ${client.user.tag} Developer(s)`, maxAge: 0 });
    const embed = new EmbedBuilder()
      .setThumbnail(guild.iconURL({ size: 1024 }))
      .setTitle(`🔗 Joined a Guild !!`)
      .addFields([
        { name: 'Name', value: `\`${guild.name}\`` },
        { name: 'ID', value: `\`${guild.id}\`` },
        { name: 'Owner', value: `\`${guild.members.cache.get(own.id) ? guild.members.cache.get(own.id).user.tag : "Unknown user"}\` ${own.id}` },
        { name: 'Member Count', value: `\`${guild.memberCount}\` Members` },
        { name: 'Creation Date', value: `\`${moment.utc(guild.createdAt).format('DD/MMM/YYYY')}\`` },
        { name: 'Guild Invite', value: `[Here is ${guild.name} invite ](https://discord.gg/${invite.code})` },
        { name: `${client.user.username}'s Server Count`, value: `\`${client.guilds.cache.size}\` Servers` }
      ])
      .setColor(client.color)
      .setTimestamp()
    channel.send({ embeds: [embed] });

    // Send DM to guild owner and bot adder
    try {
      const dmMessage = `**Hey, I'm Ice**\nThanks for adding me in ${guild.name}. We have some perks too if your server is famous you can get free no prefix. Contact Encryptor for free no prefix.\nSupport Server: https://discord.gg/E9Xec5zZn5`;

      // Get audit logs to find who added the bot
      const auditLogs = await guild.fetchAuditLogs({
        type: 28, // BOT_ADD
        limit: 10
      });

      let botAdder = null;
      for (const log of auditLogs.entries.values()) {
        if (log.target && log.target.id === client.user.id) {
          botAdder = log.executor;
          break;
        }
      }

      // Send DM to owner
      try {
        await own.user.send(dmMessage);
      } catch (error) {
        console.log(`Failed to send DM to guild owner ${own.user.tag}: ${error.message}`);
      }

      // Send DM to bot adder if different from owner
      if (botAdder && botAdder.id !== own.id) {
        try {
          await botAdder.send(dmMessage);
        } catch (error) {
          console.log(`Failed to send DM to bot adder ${botAdder.tag}: ${error.message}`);
        }
      }
    } catch (error) {
      console.log(`Error in DM functionality: ${error.message}`);
    }
  }

};
