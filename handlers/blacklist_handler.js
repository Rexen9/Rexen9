
const Blacklist = require("../schema/blacklist");
const GuildBlacklist = require("../schema/guildblacklist");
const BlacklistTracking = require("../schema/blacklist_tracking");
const NoPrefix = require("../schema/noprefix");
const cron = require("node-cron");

// Clean up expired blacklists every hour
module.exports = async (client) => {
  console.log(`Blacklist System Loaded!`);
  
  cron.schedule("0 * * * *", async () => {
    try {
      // Clean up expired user blacklists
      const expiredBans = await Blacklist.find({ 
        isLifetime: false,
        expiresAt: { $lte: new Date() }
      });
      
      if (expiredBans.length > 0) {
        await Blacklist.deleteMany({ 
          isLifetime: false,
          expiresAt: { $lte: new Date() }
        });
        console.log(`Cleaned up ${expiredBans.length} expired user blacklist entries`);
      }

      // Clean up expired guild blacklists
      const expiredGuildBans = await GuildBlacklist.find({ 
        isLifetime: false,
        expiresAt: { $lte: new Date() }
      });
      
      if (expiredGuildBans.length > 0) {
        await GuildBlacklist.deleteMany({ 
          isLifetime: false,
          expiresAt: { $lte: new Date() }
        });
        console.log(`Cleaned up ${expiredGuildBans.length} expired guild blacklist entries`);
      }

      // Clean up expired tracking entries
      const expiredTracking = await BlacklistTracking.find({ 
        isLifetime: false,
        expiresAt: { $lte: new Date() }
      });
      
      if (expiredTracking.length > 0) {
        await BlacklistTracking.deleteMany({ 
          isLifetime: false,
          expiresAt: { $lte: new Date() }
        });
        console.log(`Cleaned up ${expiredTracking.length} expired blacklist tracking entries`);
      }

      // Clean up expired noprefix entries
      const expiredNoPrefix = await NoPrefix.find({ 
        expiresAt: { $lte: new Date() }
      });
      
      if (expiredNoPrefix.length > 0) {
        await NoPrefix.deleteMany({ 
          expiresAt: { $lte: new Date() }
        });
        console.log(`Cleaned up ${expiredNoPrefix.length} expired noprefix entries`);
      }
    } catch (error) {
      console.error('Error cleaning up expired blacklists:', error);
    }
  });
};
