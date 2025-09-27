const { EmbedBuilder } = require('discord.js');
const { getSettings } = require("../../schema/welcomesystem");
module.exports = {
  name: "guildMemberAdd",
  run: async (client, member) => {

 // client.on('guildMemberAdd', async (member) => {
    if (!member || !member.guild) return;
    const { guild } = member;
    
    // Send DM to new member
    if (!member.user.bot) {
      try {
        const dmMessage = `# Hey, I'm Ice
**I am a multipurpose bot developed by Encryptor.**
My owner is giving away free no prefix to people who adds Ice in their server.
- Requirement - 20+ real users
Create a ticket in [Night Devs](https://discord.gg/E9Xec5zZn5) <#1384637584264790208> to get your no prefix.`;
        
        await member.user.send(dmMessage);
        console.log(`[MEMBER JOIN DM] Successfully sent DM to ${member.user.tag} (${member.user.id}) who joined ${guild.name}`);
      } catch (error) {
        console.log(`[MEMBER JOIN DM] Failed to send DM to ${member.user.tag} (${member.user.id}) in ${guild.name}: ${error.message}`);
      }
    }
    
    // Continue with existing welcome system
    const settings = await getSettings(guild);
    if(!settings.welcome.enabled) return;
    client.util.sendWelcome(member, settings);
  }
}