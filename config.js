require("dotenv").config();

module.exports = {
    token: process.env.TOKEN || "TOKEN",
    clientID: process.env.CLIENT_ID || "1390713271828349029", 
    prefix: process.env.PREFIX || ",", 
    ownerID: "1222274732095836303",
    SpotifyID: process.env.SPOTIFY_ID || "0c303046fd8e4d2dbaa03bd66cc9e119",
    SpotifySecret: process.env.SPOTIFY_SECRET || "f0a724d948244bdaaa6b9d993246f7e8",
    mongourl: process.env.MONGO_URL || "mongodb+srv://devsarthi2611:hEbgKL9n6nH3Ays0@cluster0.1fx3q.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0",
    embedColor: process.env.EMBED_COLOR || "#5ed7ff",
    logs: process.env.LOGS || "1379419318558789702",
    errorLogsChannel: process.env.ERROR_LOGS_CHANNEL || "1379419427975729265",
    buglogschannel: process.env.BUG_LOGS_CHANNEL || "1379419468454826066",
    commandLogsChannel: process.env.COMMAND_LOGS_CHANNEL || "1384302712665145535",
    SearchPlatform: "youtube",
    AggregatedSearchOrder: process.env.AGGREGATED_SEARCH_ORDER || "youtube, youtube music, soundcloud",
    links: {
        img: process.env.IMG || '', 
        support: process.env.SUPPORT || 'https://discord.gg/southasia',
        invite: process.env.INVITE || 'https://discord.gg/southasia' 
    },
    nodes: [
        {
            host: process.env.NODE_HOST || "lavalink.serenetia.com",
            port: parseInt(process.env.NODE_PORT || "80"),
            password: process.env.NODE_PASSWORD || "https://dsc.gg/ajidevserver",
            secure: parseBoolean(process.env.NODE_SECURE || "false"),
        }
    ],
};

function parseBoolean(value) {
    if (typeof value === 'string') {
        value = value.trim().toLowerCase();
    }
    switch (value) {
        case true:
        case "true":
            return true;
        default:
            return false;
    }
}
