const fs = require("fs");
const path = require("path");

module.exports = (client, reload = false) => {
    !reload ? console.log('[CMD] Loading Commands...'.green) : '';
    let count = 0;

    // Use synchronous reading for better performance
    const commandDirs = fs.readdirSync("./commands/", { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);

    for (const dir of commandDirs) {
        const commandPath = path.join("./commands", dir);
        const commandFiles = fs.readdirSync(commandPath)
            .filter(file => file.endsWith(".js"));

        for (const file of commandFiles) {
            const fullPath = path.join(commandPath, file);

            if (reload) {
                const resolvedPath = require.resolve(path.resolve(fullPath));
                delete require.cache[resolvedPath];
            }

            try {
                const command = require(path.resolve(fullPath));

                if (command.name && typeof command.name === 'string') {
                    client.commands.set(command.name, command);
                    count++;

                    // Handle aliases more efficiently
                    if (command.aliases && Array.isArray(command.aliases)) {
                        for (const alias of command.aliases) {
                            client.aliases.set(alias, command.name);
                        }
                    }
                } else {
                    console.log(`[ERR] ${file} command is missing a valid name property.`);
                }
            } catch (error) {
                console.error(`[ERR] Failed to load command ${file}:`, error.message);
            }
        }
    }

    !reload ? console.log(`[CMD] Client Commands Loaded ${count}`.green) : '';

  // Load slash commands
  if (fs.existsSync('./slashCommands')) {
    const slashCommandFiles = fs
      .readdirSync('./slashCommands')
      .filter((file) => file.endsWith('.js'));
    for (const file of slashCommandFiles) {
      const slashCommand = require(`../slashCommands/${file}`);
      if (slashCommand.data && slashCommand.data.name) {
        client.slashCommands.set(slashCommand.data.name, slashCommand);
      }
    }
    console.log(`${client.slashCommands.size} Slash Commands loaded.`.red);
  }
};