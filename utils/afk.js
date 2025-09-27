
const { Collection } = require('discord.js');

const afk = new Collection();
const globalAfk = new Collection();
const afkPings = new Collection(); // Stores pings for AFK users

module.exports = { afk, globalAfk, afkPings };
