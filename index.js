require('dotenv').config();

const { Client, EmbedBuilder } = require('discord.js');
const fs = require('node:fs');

const SharpClient = class extends Client {
    constructor(options) {
        super(options);
        
        this.PREFIX = '.';
        this.cabbageInfo = require('./cabbage.json');
        
        this.atStake = [];
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
            };
            client.cabbageInfo[message.author.id].aliases.push(username);
            
            fs.writeFileSync('./cabbage.json', JSON.stringify(client.cabbageInfo));
            client.cabbageInfo = require('./cabbage.json');
            message.reply(`Successfully registered you! Current aliases: \`${client.cabbageInfo[message.author.id].aliases.join(', ')}\`.`);
        } else if (command === 'leaderboard') {
            const p = client.cabbageInfo;
            let people = Object.entries(p);
            people = people.sort((a, b) => b.cabbageCount - a.cabbageCount);
            
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
                        data[p].fields.push({
                            name: `${i + 1}. <@${id}> (\`${id}\`)`,
                            value: `\`${info.cabbageCount}\` cabbages, \`${info.minimuffins}\` minimuffins. Win Rate: \`${(info.muffins / (info.cabbages + info.muffins)).toFixed(2) * 100}%\``,
                        });
                    }
                }
            } else {
                data[0] = { title: 'Cabbage Leaderboard', fields: [] };
                people.forEach(([id, info], index) => {
                    data[0].fields.push({
                        name: `${index + 1}. <@${id}> (\`${id}\`):`, 
                        value: `\`${info.cabbageCount}\` cabbages, \`${info.minimuffins}\` minimuffins. Win Rate: \`${(info.muffins / (info.cabbages + info.muffins)).toFixed(2) * 100}%\``,
                    });
                    
                    message.channel.send({ embeds: [embed] });
                });
            }
            
            const { title, fields } = data[0];
            embed.setTitle(title);
            embed.setDescription('Leaderboard of cabbaging.');
            embed.addFields(fields);

            console.log(embed);

            message.channel.send({ embeds: [embed], })
                .then(async msg => {
                    await msg.react('➡️');

                    client.messages.set(msg.id, {
                        data,
                        currentPage: 0,
                        author: message.author.id,
                    });
                });
        }
    } else {
        if (client.atStake.includes(message.author.id)) {
            if (message.content.replaceAll(' ', '').includes('minimuffin')) {
                client.cabbageInfo[message.author.id].minimuffins++;
                fs.writeFileSync('./cabbage.json', JSON.stringify(client.cabbageInfo));
                message.reply(`You have used a minimuffin. Minimuffin usage: \`${client.cabbageInfo[message.author.id].minimuffins}\`.`, { allowedMentions });
            } else {
                client.atStake.splice(client.atStake.indexOf(message.author.id), 1);
                client.cabbageInfo[message.author.id].cabbageCount++;
                fs.writeFileSync('./cabbage.json', JSON.stringify(client.cabbageInfo));
                message.reply(`You have been cabbaged. Total cabbage count: \`${client.cabbageInfo[message.author.id].cabbageCount}\`.`);
            }
        }

        // SLOW CODE INCOMING: ⚠
        const username = message.content.split(' ').pop();
        let id = null;
        Object.entries(client.cabbageInfo).forEach(([identifier, info]) => {
            if (info.aliases.includes(username)) id = identifier;
        });
        // ok phew no more slow code
        
        if (!id) return;
        if (message.author.id !== id && !client.atStake.includes(id)) client.atStake.push(id);
    }
});