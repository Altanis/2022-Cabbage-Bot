require('dotenv').config();

const { Client, EmbedBuilder } = require('discord.js');
const fs = require('node:fs');

const SharpClient = class extends Client {
    constructor(options) {
        super(options);
        
        this.PREFIX = '.';
        this.cabbageInfo = require('./cabbage.json');
        
        this.cabbageAttemps = {};
        this.atStake = new Map();
        this.messages = new Map();
    }
}

const client = new SharpClient({ intents: [131071], allowedMentions: { repliedUser: false } });


client.login(process.env.TOKEN);

client.on('ready', () => console.log('[INFO]: Bot is online.'));
client.on('error', console.error);

client.on('messageReactionAdd', function(reaction, user) {
    const info = client.messages.get(reaction.message.id);
    if (!info) return;

    let { data, currentPage, author } = info;

    if (reaction.emoji.name === '➡️') {
        currentPage++;
    } else if (reaction.emoji.name === '⬅️') {
        currentPage--;
    }

    const embed = new EmbedBuilder();
    const { title, fields } = data;
    embed.setTitle(title);
    embed.setDescription('Leaderboard of cabbaging.');


    reaction.message.edit({ embeds: [embed] })
        .then(async msg => {
            if (currentPage >= 1) await msg.react('➡️');
            else if (currentPage + 1 < Object.values(data).length) await msg.react('⬅️');

            client.messages.set(msg.id, {
                data,
                currentPage,
                author,
            });
        });
});

client.on('messageCreate', function(message) {
    if (message.author.bot) return;
    
    if (message.content.startsWith(client.PREFIX)) {
        const args = message.content.split(' '),
        command = args.shift().toLowerCase().replace(client.PREFIX, '');
        
        if (command === 'register') {
            // EXAMPLE COMMAND:
            // bin ben, idk only example cause he has the only 2 letter thing
            // can be used multiple times, so i could set my name as alt and altanis
            const username = args.join(' '); 
            if (!username) return message.reply('You must specify a username. Example command: `.register altanis` would register your username as altanis.');
            
            if (!client.cabbageInfo[message.author.id]) client.cabbageInfo[message.author.id] = {
                aliases: [],
                cabbageCount: 0,
                minimuffins: 0,
                turnips: 0,
            };
            client.cabbageInfo[message.author.id].aliases.push(username);
            
            fs.writeFileSync('./cabbage.json', JSON.stringify(client.cabbageInfo, null, 4));
            client.cabbageInfo = require('./cabbage.json');
            message.reply(`Successfully registered you! Current aliases: \`${client.cabbageInfo[message.author.id].aliases.join(', ')}\`.`);
        } else if (command === 'leaderboard') {
            const p = client.cabbageInfo;
            let people = Object.entries(p);
            people = people.sort((a, b) => b[1].cabbageCount - a[1].cabbageCount);
            
            const embed = new EmbedBuilder();
            const data = [];
            
            if (people.length > 25) {
                const count = Math.ceil(people.length / 25);
                for (let p = 0; p < count; p++) {
                    data[p] = {
                        title: `Cabbage Leaderboard (${p + 1}/${count})`,
                        fields: [],
                    };
                    
                    for (let i = p * 25; i < p * 25 + 25; i++) {
                        const [id, info] = people[i];
                        let winrate = (info.minimuffins + info.turnips) / (info.cabbageCount + info.minimuffins + info.turnips);
                        if (isNaN(winrate)) winrate = 0.00;

                        data[p].fields.push({
                            name: `${i + 1}. ${info.aliases[0]} (\`${id}\`)`,
                            value: `\`${info.cabbageCount}\` cabbages, \`${info.minimuffins}\` minimuffins, \`${info.turnips}\` turnips. Win Rate: \`${winrate.toFixed(2) * 100}%\``,
                        });
                    }
                }
            } else {
                data[0] = { title: 'Cabbage Leaderboard', fields: [] };
                people.forEach(([id, info], index) => {
                    let winrate = (info.minimuffins + info.turnips) / (info.cabbageCount + info.minimuffins + info.turnips);
                    if (isNaN(winrate)) winrate = 0.00;
                    
                    data[0].fields.push({
                        name: `${index + 1}. ${info.aliases[0]} (\`${id}\`):`, 
                        value: `\`${info.cabbageCount}\` cabbages, \`${info.minimuffins}\` minimuffins, \`${info.turnips}\` turnips. Win Rate: \`${winrate.toFixed(2) * 100}%\``,
                    });
                });
            }
            
            const { title, fields } = data[0];
            embed.setTitle(title);
            embed.setDescription('Leaderboard of cabbaging.');
            embed.addFields(fields);

            message.channel.send({ embeds: [embed], })
                .then(async msg => {
                    await msg.react('➡️'); // bugged

                    client.messages.set(msg.id, {
                        data,
                        currentPage: 0,
                        author: message.author.id,
                    });
                });
        }
    } else {
        message.content = message.content.toLowerCase();
        const info = client.atStake.get(message.author.id);

        const embed = new EmbedBuilder()
            .setTitle('Cabbaging');

        if (info) {
            if (message.content.startsWith('minimuffin')) {
                client.atStake.delete(message.author.id);
                client.cabbageInfo[message.author.id].minimuffins++;
                fs.writeFileSync('./cabbage.json', JSON.stringify(client.cabbageInfo, null, 4));

                embed.setColor('Green')
                    .setDescription(`<@${message.author.id}>, you have used a minimuffin. Minimuffin usage: \`${client.cabbageInfo[message.author.id].minimuffins}\`.`)
                    .addFields({
                        name: 'Incriminating Message', value: `[Jump!](${info.link})`
                    });

                message.reply({ embeds: [embed] });
            } else if (message.content.startsWith('turnip') && ((Date.now() - info.timestamp) >= 10000)) {
                client.atStake.delete(message.author.id);
                client.cabbageInfo[message.author.id].turnips++;
                fs.writeFileSync('./cabbage.json', JSON.stringify(client.cabbageInfo, null, 4));

                embed.setColor('Green')
                    .setDescription(`<@${message.author.id}>, you have used a turnip. Turnip usage: \`${client.cabbageInfo[message.author.id].turnips}\`.`)
                    .addFields({
                        name: 'Incriminating Message', value: `[Jump!](${info.link})`
                    });

                message.reply({ embeds: [embed] });
            } else {
                info.cabbageable = true;
            }
        }  
        
        let cont = true;

        if (message.content.replaceAll(' ', '').startsWith('cabbageimproperusage')) {
            client.atStake.forEach(info => {
                if (info.authorID === 'improper usage') {
                    cont = false;

                    client.atStake.delete(info.id);
                    client.cabbageInfo[info.id].cabbageCount++;
                    fs.writeFileSync('./cabbage.json', JSON.stringify(client.cabbageInfo, null, 4));    

                    embed.setColor('Red')
                        .setDescription(`<@${info.id}>, you have been cabbaged by <@${message.author.id}>. Cabbage count: \`${client.cabbageInfo[info.id].cabbageCount}\`.`)
                        .addFields({
                            name: 'Incriminating Message', value: `[Jump!](${info.link})`
                        });

                    message.reply({ embeds: [embed] });
                }
            });
        } else if (message.content.startsWith('cabbage') && cont) {
            let passed = false;

            client.atStake.forEach(info => {
                if (info.authorID === message.author.id && info.cabbageable) {
                    passed = true;

                    client.atStake.delete(info.id);
                    client.cabbageInfo[info.id].cabbageCount++;
                    fs.writeFileSync('./cabbage.json', JSON.stringify(client.cabbageInfo, null, 4));    

                    embed.setColor('Red')
                        .setDescription(`<@${info.id}>, you have been cabbaged by <@${info.authorID}>. Cabbage count: \`${client.cabbageInfo[info.id].cabbageCount}\`.`)
                        .addFields({
                            name: 'Incriminating Message', value: `[Jump!](${info.link})`
                        });

                    message.reply({ embeds: [embed] });
                }
            });

            if (!passed) {
                client.atStake.set(message.author.id, {
                    link: `https://discord.com/channels/${message.guild.id}/${message.channel.id}/${message.id}`,
                    timestamp: Date.now(), 
                    authorID: 'improper usage',
                    id: message.author.id, 
                });
            }
        }

        if (message.content.replaceAll(' ', '').startsWith('iam')) {
            const tempAlias = message.content.split(' ')[2];

            client.cabbageInfo[message.author.id].aliases.push(tempAlias);
            setTimeout(() => {
                client.cabbageInfo[message.author.id].aliases.splice(client.cabbageInfo[message.author.id].aliases.indexOf(tempAlias), 1);
            }, 1e4);
        } else if (message.content.replaceAll(' ', '').startsWith('im') || message.content.replaceAll(' ', '').startsWith('i\'m')) {
            const tempAlias = message.content.split(' ')[1];

            client.cabbageInfo[message.author.id].aliases.push(tempAlias);
            setTimeout(() => {
                client.cabbageInfo[message.author.id].aliases.splice(client.cabbageInfo[message.author.id].aliases.indexOf(tempAlias), 1);
            }, 1e4);
        }

        // SLOW CODE INCOMING: ⚠
        const username = message.content.split(' ').pop();
        let id = null;
        Object.entries(client.cabbageInfo).forEach(([identifier, info]) => {
            if (info.aliases.includes(username)) id = identifier;
        });
        // ok phew no more slow code

        if (!id) return;
        if (message.author.id !== id && !client.atStake.get(id)) client.atStake.set(id, {
            link: `https://discord.com/channels/${message.guild.id}/${message.channel.id}/${message.id}`,
            timestamp: Date.now(), 
            authorID: message.author.id,
            id,
            cabbageable: false,
        });
    }
});