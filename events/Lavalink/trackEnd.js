const { Player, Track, Payload } = require("erela.js");
const MusicBot = require("../../structures/Client");
/**
 *
 * @param {MusicBot} client
 * @param {Player} player
 * @param {Track} track
 * @param {Payload} playload
 * @returns {Promise<void>}
 */
module.exports = async (client, player, track, payload) => {
  const guild = client.guilds.cache.get(player.guild);
  if (!guild) return;

  const channel = guild.channels.cache.get(player.textChannel);

  // Handle autoplay
  if (player.get("autoplay") === true) {
    // If queue is empty or only has 1 track left, add more tracks
    if (player.queue.size <= 1 && !player.queue.current) {
      try {
        const lastIdentifier = player.get("identifier") || track.identifier;
        const autoplayHistory = player.get("autoplayHistory") || [];

        // Search for related tracks
        const search = `https://www.youtube.com/watch?v=${lastIdentifier}&list=RD${lastIdentifier}`;
        const res = await player.search(search, player.get("requester") || client.user);

        if (res.tracks && res.tracks.length > 0) {
          // Filter out tracks we've already played recently
          const newTracks = res.tracks.filter(t => 
            !autoplayHistory.includes(t.identifier) && 
            t.identifier !== lastIdentifier
          );

          if (newTracks.length > 0) {
            // Add 2-3 tracks
            const tracksToAdd = newTracks.slice(0, Math.min(3, newTracks.length));
            player.queue.add(tracksToAdd);

            // Update history (keep only last 20 tracks)
            autoplayHistory.push(...tracksToAdd.map(t => t.identifier));
            if (autoplayHistory.length > 20) {
              autoplayHistory.splice(0, autoplayHistory.length - 20);
            }
            player.set("autoplayHistory", autoplayHistory);

            // Update identifier for next autoplay
            player.set("identifier", tracksToAdd[0].identifier);
          }
        }

        // If we have tracks in queue, play next
        if (player.queue.size > 0) {
          player.play();
        } else {
          // No more tracks available, destroy player
          await player.destroy();
        }
      } catch (error) {
        console.error('Autoplay error:', error);
        if (!player.queue.current && player.queue.size === 0) {
          await player.destroy();
        }
      }
    }
  } else {
    // Regular behavior - destroy if no more tracks
    if (!player.queue.current && player.queue.size === 0) {
      await player.destroy();
    }
  }
};