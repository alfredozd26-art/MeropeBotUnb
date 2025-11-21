const { Client, GatewayIntentBits, EmbedBuilder, PermissionsBitField, PermissionFlagsBits, REST, Routes, SlashCommandBuilder } = require('discord.js');
const dotenv = require('dotenv');
const storage = require('./server/storage');
const { searchItemByPartialName, searchItemByPartialNameSync } = require('./utils/itemSearch');
const { Client: UnbClient } = require('unb-api');
const bossfight = require('./server/bossfight');
const combat = require('./server/combat');

dotenv.config();

const unbClient = new UnbClient(process.env.UNBELIEVABOAT_TOKEN);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

const PREFIX = '*';
const DEFAULT_TICKET_ROLE = 'Ticket';
const DEFAULT_PULL_TIMER = 11500;

const pendingConfirmations = new Map();
const spinCooldowns = new Map();

client.on('clientReady', async () => {
  console.log(`✅ Bot conectado como ${client.user.tag}`);
  await storage.ensureDataFiles();

  const commands = [
    new SlashCommandBuilder()
      .setName('oye')
      .setDescription('Oye')
      .toJSON(),
    new SlashCommandBuilder()
      .setName('spin')
      .setDescription('🎰 Realizar una tirada del gacha')
      .toJSON(),
    new SlashCommandBuilder()
      .setName('spin10')
      .setDescription('🎰 Realizar 10 tiradas del gacha')
      .toJSON()
  ];

  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

  try {
    console.log('🔄 Registrando comandos slash...');
    await rest.put(
      Routes.applicationCommands(client.user.id),
      { body: commands }
    );
    console.log('✅ Comandos slash registrados: /oye, /spin, /spin10');
  } catch (error) {
    console.error('❌ Error registrando comandos slash:', error);
  }
});

client.on('interactionCreate', async (interaction) => {
  if (interaction.isButton()) {
    try {
      await handleCombatButton(interaction);
    } catch (error) {
      console.error('Error en botón de combate:', error);
    }
    return;
  }

  if (!interaction.isChatInputCommand()) return;

  try {
    if (interaction.commandName === 'oye') {
      await interaction.reply({
        content: 'https://tenor.com/view/bokunorhythem-otama-eyecomova-gif-23829255'
      });
    } else if (interaction.commandName === 'spin') {
      await handleGirarSlash(interaction);
    } else if (interaction.commandName === 'spin10') {
      await handleGirar10Slash(interaction);
    }
  } catch (error) {
    console.error('Error en slash command:', error);
    const errorMsg = '❌ Ocurrió un error al ejecutar el comando.';
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: errorMsg, ephemeral: true });
    } else {
      await interaction.reply({ content: errorMsg, ephemeral: true });
    }
  }
});

client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const command = args.shift()?.toLowerCase();

  try {
    if (command === 'spin') {
      await handleGirar(message);
    } else if (command === 'spin10') {
      await handleGirar10(message);
    } else if (command === 'banner') {
      await handleBanner(message);
    } else if (command === 'bannerc') {
      await handleBannerShop(message);
    } else if (command === 'perfil' || command === 'profile') {
      await handlePerfil(message);
    } else if (command === 'setfav') {
      await handleSetFav(message, args);
    } else if (command === 'createitem') {
      await handleCreateItem(message, args);
    } else if (command === 'edititem') {
      await handleEditItem(message, args);
    } else if (command === 'deleteitem') {
      await handleDeleteItem(message, args);
    } else if (command === 'resetitems') {
      await handleResetItems(message);
    } else if (command === 'iteminfo') {
      await handleItemInfo(message, args);
    } else if (command === 'canjear') {
      await handleExchange(message, args);
    } else if (command === 'tokens') {
      await handleTokens(message);
    } else if (command === 'createexchange') {
      await handleCreateExchange(message, args);
    } else if (command === 'listexchanges') {
      await handleListExchanges(message);
    } else if (command === 'setticketrole') {
      await handleSetTicketRole(message, args);
    } else if (command === 'setticketrole10') {
      await handleSetTicketRole10(message, args);
    } else if (command === 'editpull') {
      await handleEditPull(message, args);
    } else if (command === 'editpullssr') {
      await handleEditPullSSR(message, args);
    } else if (command === 'editpulltimer') {
      await handleEditPullTimer(message, args);
    } else if (command === 'help') {
      await handleHelp(message);
    } else if (command === 'fixhelp') {
      await handleFixHelp(message);
    } else if (command === 'editexchange') {
      await handleEditExchange(message, args);
    } else if (command === 'resetexchanges') {
      await handleResetExchanges(message);
    } else if (command === 'addtokens') {
      await handleAddTokens(message, args);
    } else if (command === 'removetokens') {
      await handleRemoveTokens(message, args);
    } else if (command === 'resettokens') {
      await handleResetTokens(message);
    } else if (command === 'confirmar' || command === 'confirm') {
      await handleConfirm(message);
    } else if (command === 'cancelar' || command === 'cancel') {
      await handleCancel(message);
    } else if (command === 'pity') {
      await handlePityInfo(message);
    } else if (command === 'setcurrency') {
      await handleSetCurrency(message, args);
    } else if (command === 'createitemsecret') {
      await handleCreateItemSecret(message, args);
    } else if (command === 'secretbanner') {
      await handleSecretBanner(message);
    } else if (command === 'inventory') {
      await handleInventory(message);
    } else if (command === 'resetcollectable') {
      await handleResetCollectable(message, args);
    } else if (command === 'editpity') {
      await handleEditPity(message, args);
    } else if (command === 'sell' || command === 'vender') {
      await handleSell(message, args);
    } else if (command === 'setcurrencyunb') {
      await handleSetCurrencyUnb(message, args);
    } else if (command === 'createchar') {
      await handleCreateChar(message, args);
    } else if (command === 'editchar') {
      await handleEditChar(message, args);
    } else if (command === 'editbf') {
      await handleEditBF(message, args);
    } else if (command === 'equip') {
      await handleEquip(message, args);
    } else if (command === 'createboss') {
      await handleCreateBoss(message, args);
    } else if (command === 'editboss') {
      await handleEditBoss(message, args);
    } else if (command === 'addskillboss') {
      await handleAddSkillBoss(message, args);
    } else if (command === 'deleteskillboss') {
      await handleDeleteSkillBoss(message, args);
    } else if (command === 'enablebf') {
      await handleEnableBF(message);
    } else if (command === 'disablebf') {
      await handleDisableBF(message);
    } else if (command === 'startbf') {
      await handleStartBF(message, args);
    } else if (command === 'listchars') {
      await handleListChars(message);
    } else if (command === 'listbosses') {
      await handleListBosses(message);
    } else if (command === 'editcdbf') {
      await handleEditCDBF(message, args);
    } else if (command === 'createskill') {
      await handleCreateSkill(message, args);
    } else if (command === 'listskills') {
      await handleListSkills(message);
    } else if (command === 'deleteskill') {
      await handleDeleteSkill(message, args);
    } else if (command === 'mv' || command === 'moveset') {
      await handleMoveTypes(message);
    }
  } catch (error) {
    console.error('Error:', error);
    message.reply('❌ Ocurrió un error al ejecutar el comando.');
  }
});

async function handleGirar(message) {
  const member = message.member;
  const guildId = message.guild?.id;
  if (!member || !guildId) return;

  // Verificar si hay una tirada en curso
  const cooldownKey = `${guildId}-${message.author.id}`;
  if (spinCooldowns.has(cooldownKey)) {
    const timeLeft = spinCooldowns.get(cooldownKey) - Date.now();
    if (timeLeft > 0) {
      const embed = new EmbedBuilder()
        .setColor(0xFFD700)
        .setTitle('🎰 Tirada en Curso')
        .setDescription(`Ya tienes una tirada activa.\n\n⏱️ Podrás hacer otra tirada en **${Math.ceil(timeLeft / 1000)}** segundos.`)
        .setFooter({ text: 'Espera a que termine tu tirada actual' });
      return message.reply({ embeds: [embed] });
    }
    spinCooldowns.delete(cooldownKey);
  }

  let ticketRole = await storage.getConfig(guildId, 'ticket_role') || DEFAULT_TICKET_ROLE;

  const mentionMatch = ticketRole.match(/<@&(\d+)>/);
  if (mentionMatch) {
    ticketRole = mentionMatch[1];
  }

  const hasTicket = member.roles.cache.some((role) =>
    role.name.toLowerCase() === ticketRole.toLowerCase() || role.id === ticketRole
  );

  if (!hasTicket) {
    const embed = new EmbedBuilder()
      .setColor(0xFF0000)
      .setTitle('❌ Sin Ticket')
      .setDescription(`No tienes el ticket necesario para hacer un spin.\n\nCompra un ticket en <@292953664492929025> para poder jugar.`);
    return message.reply({ embeds: [embed] });
  }

  // Activar cooldown de 5 segundos
  const cooldownTime = 5000; // 5 segundos fijos
  spinCooldowns.set(cooldownKey, Date.now() + cooldownTime);
  setTimeout(() => spinCooldowns.delete(cooldownKey), cooldownTime);

  // Esperar 1 segundo antes de quitar el rol (para evitar errores)
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Quitar el rol después de 1 segundo
  const ticketRoleToRemove = member.roles.cache.find((role) =>
    role.name.toLowerCase() === ticketRole.toLowerCase() || role.id === ticketRole
  );

  if (ticketRoleToRemove) {
    try {
      await member.roles.remove(ticketRoleToRemove);
      console.log(`✅ Ticket "${ticketRoleToRemove.name}" removido (con delay de 1s)`);
    } catch (error) {
      console.error(`❌ Error al remover ticket "${ticketRoleToRemove.name}":`, error.message);

      if (error.code === 50001) {
        const warningEmbed = new EmbedBuilder()
          .setColor(0xFFA500)
          .setTitle('⚠️ No se pudo remover el ticket')
          .setDescription(`El bot no tiene permisos para remover el rol **${ticketRoleToRemove.name}**.\n\n**Solución:** Asegúrate de que el rol del bot esté por encima de este rol en la jerarquía del servidor.`);
        await message.reply({ embeds: [warningEmbed] });
        return; // Detener el spin si no se puede quitar el ticket
      }
    }
  }

  const item = await storage.getRandomItemWithPity(guildId, message.author.id);

  // Incrementar contador de spins totales
  await storage.incrementTotalSpins(guildId, message.author.id, 1);

  if (!item) {
    return message.reply('❌ No hay premios configurados en el gacha.');
  }

  const isSSRorPromo = item.rarity.toUpperCase() === 'SSR' || item.promo;
  const gifToShow = isSSRorPromo
    ? await storage.getConfig(guildId, 'ssr_gif')
    : await storage.getConfig(guildId, 'pity_gif');

  if (gifToShow) {
    const pullTimer = await storage.getConfig(guildId, 'pull_timer') || DEFAULT_PULL_TIMER;

    const loadingEmbed = new EmbedBuilder()
      .setColor(0xFFD700)
      .setTitle('🌟 Realizando tirada...')
      .setImage(gifToShow);

    const loadingMessage = await message.reply({ embeds: [loadingEmbed] });

    await new Promise(resolve => setTimeout(resolve, pullTimer));

    await loadingMessage.delete();
  }

  let hasRoleGiven = false;

  if (item.roleGiven) {
    let roleToCheck = message.guild?.roles.cache.find((r) => r.name === item.roleGiven);

    if (!roleToCheck) {
      const roleMentionMatch = item.roleGiven?.match(/<@&(\d+)>/);
      if (roleMentionMatch) {
        roleToCheck = message.guild?.roles.cache.get(roleMentionMatch[1]);
      }
    }

    if (!roleToCheck && item.roleGiven) {
      roleToCheck = message.guild?.roles.cache.get(item.roleGiven);
    }

    if (roleToCheck) {
      hasRoleGiven = member.roles.cache.has(roleToCheck.id);
    }
  }

  const isDuplicate = hasRoleGiven;
  const embedColor = item.secret ? 0x8B0000 : storage.getRarityColor(item.rarity);
  const objectType = item.objectType || 'personaje';

  const collectables = await storage.getUserCollectables(guildId, message.author.id);
  const currentCount = collectables[item.name] || 0;
  const isCollectable = item.collectable && item.collectable > 0;

  let replyToUse = item.reply;
  if (isCollectable && (item.replyCollectable1 || item.replyCollectable2 || item.replyCollectable3)) {
    const collectableReplies = [item.replyCollectable1, item.replyCollectable2, item.replyCollectable3].filter(r => r);
    if (collectableReplies.length > 0) {
      replyToUse = collectableReplies[Math.floor(Math.random() * collectableReplies.length)];
    }
  }

  const isUrl = replyToUse?.match(/^https?:\/\/.+\.(gif|png|jpg|jpeg|webp)(\?.*)?$/i);

  if ((isDuplicate && item.giveTokens) || (objectType === 'persona' && item.giveTokens)) {
    const tokenEmoji = await storage.getTokenEmoji(item.rarity);
    const tokenType = `Token ${item.rarity.toUpperCase()}`;
    await storage.addTokens(guildId, message.author.id, tokenType, 1);

    const rarityStars = storage.getRarityStars(item.rarity);

    const embed = new EmbedBuilder()
      .setColor(0xFFA500)
      .setTitle(`🔄 ¡${objectType.charAt(0).toUpperCase() + objectType.slice(1)} Duplicado!`)
      .addFields(
        { name: objectType.charAt(0).toUpperCase() + objectType.slice(1), value: item.name, inline: true },
        { name: 'Rareza', value: rarityStars, inline: true },
        { name: '<:Dupe:1425315638959673384> Tokens', value: `+1 ${tokenEmoji}`, inline: true }
      )
      .setFooter({ text: `Ya tenías este ${objectType}, recibiste Tokens` });

    if (isUrl) {
      embed.setImage(replyToUse);
    }

    await message.channel.send({ embeds: [embed] });
  } else {
    const rarityStars = storage.getRarityStars(item.rarity);

    const embed = new EmbedBuilder()
      .setColor(embedColor)
      .setTitle(item.secret ? `🔒 ¡${objectType.charAt(0).toUpperCase() + objectType.slice(1)} Secreto Obtenido!` : `🎉 ¡Nuevo ${objectType.charAt(0).toUpperCase() + objectType.slice(1)} Obtenido!`)
      .addFields(
        { name: objectType.charAt(0).toUpperCase() + objectType.slice(1), value: item.name, inline: true },
        { name: 'Rareza', value: rarityStars, inline: true }
      );

    if (item.secret) {
      embed.setDescription('🔒 ¡Has conseguido un personaje secreto!');
    }

    if (isCollectable) {
      const remaining = item.collectable - currentCount;
      embed.addFields({ name: '📦 Coleccionable', value: `${currentCount}/${item.collectable} (Faltan ${remaining})`, inline: false });

      if (currentCount >= item.collectable && item.roleGiven) {
        embed.addFields({ name: '✅ Completado', value: `Rol asignado: ${item.roleGiven}`, inline: false });
      }
    }

    embed.setFooter({ text: item.secret ? '¡Has desbloqueado un secreto!' : `¡Felicidades por tu nuevo ${objectType}!` });

    if (isUrl) {
      embed.setImage(replyToUse);
    }

    await message.channel.send({ embeds: [embed] });

    if (item.roleGiven) {
      const shouldGiveRole = !isCollectable || currentCount >= item.collectable;

      if (shouldGiveRole) {
        let roleToGive = message.guild?.roles.cache.find((r) => r.name === item.roleGiven);

        if (!roleToGive) {
          const roleMentionMatch = item.roleGiven?.match(/<@&(\d+)>/);
          if (roleMentionMatch) {
            roleToGive = message.guild?.roles.cache.get(roleMentionMatch[1]);
          }
        }

        if (!roleToGive && item.roleGiven) {
          roleToGive = message.guild?.roles.cache.get(item.roleGiven);
        }

        if (roleToGive) {
          try {
            await member.roles.add(roleToGive);
            console.log(`✅ Rol "${roleToGive.name}" asignado exitosamente a ${message.author.tag}`);
          } catch (error) {
            console.error(`❌ Error al asignar rol "${roleToGive.name}":`, error.message);
          }
        } else {
          console.log(`⚠️ No se encontró el rol "${item.roleGiven}" en el servidor`);
        }
      }
    }
  }
}

async function handleGirar10(message) {
  const member = message.member;
  const guildId = message.guild?.id;
  if (!member || !guildId) return;

  let ticketRole10 = await storage.getConfig(guildId, 'ticket_role_10') || 'Ticket x10';

  const mentionMatch = ticketRole10.match(/<@&(\d+)>/);
  if (mentionMatch) {
    ticketRole10 = mentionMatch[1];
  }

  const hasTicket10 = member.roles.cache.some((role) =>
    role.name.toLowerCase() === ticketRole10.toLowerCase() || role.id === ticketRole10
  );

  if (!hasTicket10) {
    const embed = new EmbedBuilder()
      .setColor(0xFF0000)
      .setTitle('❌ Sin Ticket x10')
      .setDescription(`No tienes el ticket necesario para hacer 10 spins.\n\nCompra un ticket x10 en <@292953664492929025> para poder jugar.`);
    return message.reply({ embeds: [embed] });
  }

  // Esperar 1 segundo antes de quitar el rol (para evitar errores)
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Quitar el rol después de 1 segundo
  const ticketRoleToRemove = member.roles.cache.find((role) =>
    role.name.toLowerCase() === ticketRole10.toLowerCase() || role.id === ticketRole10
  );

  if (ticketRoleToRemove) {
    try {
      await member.roles.remove(ticketRoleToRemove);
      console.log(`✅ Ticket x10 "${ticketRoleToRemove.name}" removido (con delay de 1s)`);
    } catch (error) {
      console.error(`❌ Error al remover ticket x10:`, error.message);

      if (error.code === 50001) {
        const warningEmbed = new EmbedBuilder()
          .setColor(0xFFA500)
          .setTitle('⚠️ No se pudo remover el ticket')
          .setDescription(`El bot no tiene permisos para remover el rol **${ticketRoleToRemove.name}**.\n\n**Solución:** Asegúrate de que el rol del bot esté por encima de este rol en la jerarquía del servidor.`);
        await message.reply({ embeds: [warningEmbed] });
        return; // Detener el spin si no se puede quitar el ticket
      }
    }
  }

  const results = [];

  // Incrementar contador de spins totales
  await storage.incrementTotalSpins(guildId, message.author.id, 10);

  for (let i = 0; i < 10; i++) {
    const item = await storage.getRandomItemWithPity(guildId, message.author.id);
    if (!item) continue;

    let hasRoleGiven = false;

    if (item.roleGiven) {
      let roleToCheck = message.guild?.roles.cache.find((r) => r.name === item.roleGiven);

      if (!roleToCheck) {
        const roleMentionMatch = item.roleGiven?.match(/<@&(\d+)>/);
        if (roleMentionMatch) {
          roleToCheck = message.guild?.roles.cache.get(roleMentionMatch[1]);
        }
      }

      if (!roleToCheck && item.roleGiven) {
        roleToCheck = message.guild?.roles.cache.get(item.roleGiven);
      }

      if (roleToCheck) {
        hasRoleGiven = member.roles.cache.has(roleToCheck.id);
      }
    }

    const isDuplicate = hasRoleGiven;
    const objectType = item.objectType || 'personaje';

    if (isDuplicate || (objectType === 'persona' && item.giveTokens)) {
      const tokenType = `Token ${item.rarity.toUpperCase()}`;
      await storage.addTokens(guildId, message.author.id, tokenType, 1);
    } else if (!isDuplicate && item.roleGiven) {
      let roleToGive = message.guild?.roles.cache.find((r) => r.name === item.roleGiven);

      if (!roleToGive) {
        const roleMentionMatch = item.roleGiven?.match(/<@&(\d+)>/);
        if (roleMentionMatch) {
          roleToGive = message.guild?.roles.cache.get(roleMentionMatch[1]);
        }
      }

      if (!roleToGive && item.roleGiven) {
        roleToGive = message.guild?.roles.cache.get(item.roleGiven);
      }

      if (roleToGive && !member.roles.cache.has(roleToGive.id)) {
        try {
          await member.roles.add(roleToGive);
        } catch (error) {
          console.error(`❌ Error al asignar rol "${roleToGive.name}":`, error.message);
        }
      }
    }

    results.push({ item, isDuplicate });
  }

  const rarityPriority = { 'SSR': 1, 'SR': 2, 'UR': 3, 'R': 4 };
  const hasPromo = results.some(r => r.item.promo);
  const highestRarity = results.reduce((highest, current) => {
    const currentPriority = rarityPriority[current.item.rarity.toUpperCase()] || 999;
    const highestPriority = rarityPriority[highest.toUpperCase()] || 999;
    return currentPriority < highestPriority ? current.item.rarity : highest;
  }, 'R');

  const isSSRorPromo = highestRarity.toUpperCase() === 'SSR' || hasPromo;
  const gifToShow = isSSRorPromo
    ? await storage.getConfig(guildId, 'ssr_gif')
    : await storage.getConfig(guildId, 'pity_gif');

  if (gifToShow) {
    const pullTimer = await storage.getConfig(guildId, 'pull_timer') || DEFAULT_PULL_TIMER;

    const loadingEmbed = new EmbedBuilder()
      .setColor(0xFFD700)
      .setTitle('🌟 Realizando 10 tiradas...')
      .setImage(gifToShow);

    const loadingMessage = await message.reply({ embeds: [loadingEmbed] });
    await new Promise(resolve => setTimeout(resolve, pullTimer));
    await loadingMessage.delete();
  }

  const groupedResults = {};

  results.forEach(({ item, isDuplicate }) => {
    if (!groupedResults[item.name]) {
      groupedResults[item.name] = { count: 0, isDuplicate, rarity: item.rarity };
    }
    groupedResults[item.name].count++;
  });

  const bestItems = results.filter(r => r.item.rarity === highestRarity);
  const randomBestItem = bestItems[Math.floor(Math.random() * bestItems.length)].item;

  const isUrl = randomBestItem.reply.match(/^https?:\/\/.+\.(gif|png|jpg|jpeg|webp)(\?.*)?$/i);

  if (isUrl) {
    const bestItemEmbed = new EmbedBuilder()
      .setColor(storage.getRarityColor(randomBestItem.rarity))
      .setTitle(`✨ ¡${randomBestItem.name}!`)
      .setDescription(`${storage.getRarityStars(randomBestItem.rarity)} - Tu mejor premio de estas 10 tiradas`)
      .setImage(randomBestItem.reply);

    await message.reply({ embeds: [bestItemEmbed] });

    await new Promise(resolve => setTimeout(resolve, 1500));
  }

  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle('🎉 Resultados de 10 Giros')
    .setDescription(`${message.author.username}, aquí están tus resultados:`);

  Object.entries(groupedResults).forEach(([name, data]) => {
    const rarityStars = storage.getRarityStars(data.rarity);
    const status = data.isDuplicate ? '🔄 Duplicado' : '✨ Nuevo';
    embed.addFields({
      name: `${rarityStars} ${name}`,
      value: `${status} - Obtenido **${data.count}x**`,
      inline: false
    });
  });

  await message.reply({ embeds: [embed] });
}

async function handleBanner(message) {
  const guildId = message.guild?.id;
  if (!guildId) return;
  const allItems = await storage.getAllItems(guildId);

  const items = allItems.filter(item => {
    if (item.secret) return false;
    const objectType = (item.objectType || 'personaje').toLowerCase();
    return objectType === 'personaje';
  });

  if (items.length === 0) {
    const embed = new EmbedBuilder()
      .setColor(0xFF0000)
      .setTitle('❌ Banner Vacío')
      .setDescription('No hay personajes configurados en el gacha aún.\n\nLos administradores pueden crear personajes con `*createitem`');
    return message.channel.send({ embeds: [embed] });
  }

  const totalChance = items.reduce((sum, item) => sum + item.chance, 0);
  const guild = message.guild;

  const rarityOrder = ['SSR', 'SR', 'UR', 'R'];
  const sortedItems = [...items].sort((a, b) => {
    const rarityDiff = rarityOrder.indexOf(a.rarity.toUpperCase()) - rarityOrder.indexOf(b.rarity.toUpperCase());
    if (rarityDiff !== 0) return rarityDiff;
    return a.name.localeCompare(b.name);
  });

  const rarityConfig = {
    'SSR': { stars: storage.getRarityStars('SSR'), name: await storage.getTokenEmoji('SSR'), color: 0xFFD700 },
    'SR': { stars: storage.getRarityStars('SR'), name: await storage.getTokenEmoji('SR'), color: 0xA020F0 },
    'UR': { stars: storage.getRarityStars('UR'), name: await storage.getTokenEmoji('UR'), color: 0x3498DB },
    'R': { stars: storage.getRarityStars('R'), name: await storage.getTokenEmoji('R'), color: 0x2ECC71 }
  };

  const itemsByRarity = {
    'SSR': [],
    'SR': [],
    'UR': [],
    'R': []
  };

  sortedItems.forEach(item => {
    const rarity = item.rarity.toUpperCase();
    if (itemsByRarity[rarity]) {
      itemsByRarity[rarity].push(item);
    }
  });

  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setAuthor({
      name: `${guild?.name || 'Server'} Banner`,
      iconURL: guild?.iconURL() || undefined
    })
    .setTitle('<:dogsuke:1425324917854834708> Premios del Banner <:dogsuke:1425324917854834708>')
    .setDescription('◆━━━━━━━━━✪━━━━━━━━━◆');

  let totalPercentageCheck = 0;

  rarityOrder.forEach(rarityKey => {
    const itemsInRarity = itemsByRarity[rarityKey];
    if (itemsInRarity.length === 0) return;

    const config = rarityConfig[rarityKey];
    let rarityList = '';
    let rarityTotal = 0;

    itemsInRarity.forEach((item) => {
      const percentage = ((item.chance / totalChance) * 100).toFixed(2);
      rarityTotal += parseFloat(percentage);
      const promoMarker = item.promo ? '⭐' : '';
      rarityList += `${percentage}% — **${item.name}** ${promoMarker}\n`;
    });

    totalPercentageCheck += rarityTotal;

    embed.addFields({
      name: `${config.stars} ${config.name} (${rarityTotal.toFixed(2)}%)`,
      value: rarityList || 'Sin items',
      inline: false
    });
  });

  if (message.channel.isSendable()) {
    await message.channel.send({ embeds: [embed] });
  }
}

async function handleBannerShop(message) {
  const guildId = message.guild?.id;
  if (!guildId) return;
  const allItems = await storage.getAllItems(guildId);

  const items = allItems.filter(item => {
    if (item.secret) return false;
    const objectType = (item.objectType || 'personaje').toLowerCase();
    return objectType === 'persona' || objectType === 'objeto' || objectType === 'object';
  });

  if (items.length === 0) {
    const embed = new EmbedBuilder()
      .setColor(0xFF0000)
      .setTitle('❌ Tienda Vacía')
      .setDescription('No hay personas u objetos configurados en el gacha aún.\n\nLos administradores pueden crear items con `*createitem` y configurar su tipo con `*edititem <nombre> object persona`');
    return message.channel.send({ embeds: [embed] });
  }

  // Calcular probabilidad con TODOS los items del pool (incluyendo personajes)
  const allNonSecretItems = allItems.filter(item => !item.secret);
  const totalChance = allNonSecretItems.reduce((sum, item) => sum + item.chance, 0);
  const guild = message.guild;

  const rarityOrder = ['SSR', 'SR', 'UR', 'R'];
  const sortedItems = [...items].sort((a, b) => {
    const rarityDiff = rarityOrder.indexOf(a.rarity.toUpperCase()) - rarityOrder.indexOf(b.rarity.toUpperCase());
    if (rarityDiff !== 0) return rarityDiff;
    return a.name.localeCompare(b.name);
  });

  const rarityConfig = {
    'SSR': { stars: storage.getRarityStars('SSR'), name: await storage.getTokenEmoji('SSR'), color: 0xFFD700 },
    'SR': { stars: storage.getRarityStars('SR'), name: await storage.getTokenEmoji('SR'), color: 0xA020F0 },
    'UR': { stars: storage.getRarityStars('UR'), name: await storage.getTokenEmoji('UR'), color: 0x3498DB },
    'R': { stars: storage.getRarityStars('R'), name: await storage.getTokenEmoji('R'), color: 0x2ECC71 }
  };

  const itemsByRarity = {
    'SSR': [],
    'SR': [],
    'UR': [],
    'R': []
  };

  sortedItems.forEach(item => {
    const rarity = item.rarity.toUpperCase();
    if (itemsByRarity[rarity]) {
      itemsByRarity[rarity].push(item);
    }
  });

  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setAuthor({
      name: `${guild?.name || 'Server'} Banner`,
      iconURL: guild?.iconURL() || undefined
    })
    .setTitle('<:dogsuke:1425324917854834708> Premios del Banner <:dogsuke:1425324917854834708>')
    .setDescription('◆━━━━━━━━━✪━━━━━━━━━◆');

  const customSymbol = await storage.getConfig(guildId, 'custom_currency_symbol');
  let currencySymbol = customSymbol;

  if (!currencySymbol) {
    if (unbClient) {
      try {
        const guildData = await unbClient.getGuild(guildId);
        currencySymbol = guildData.currencySymbol || '💰';
      } catch (error) {
        currencySymbol = '💰';
      }
    } else {
      currencySymbol = '💰';
    }
  }

  rarityOrder.forEach(rarityKey => {
    const itemsInRarity = itemsByRarity[rarityKey];
    if (itemsInRarity.length === 0) return;

    const config = rarityConfig[rarityKey];
    let rarityList = '';
    let rarityTotal = 0;

    itemsInRarity.forEach((item) => {
      const percentage = ((item.chance / totalChance) * 100).toFixed(2);
      rarityTotal += parseFloat(percentage);
      const promoMarker = item.promo ? '⭐' : '';
      const price = item.price || 0;
      const formattedPrice = price.toLocaleString('en-US');
      rarityList += `${percentage}% — **${item.name}** ${promoMarker} | ${currencySymbol} ${formattedPrice}\n`;
    });

    embed.addFields({
      name: `${config.stars} ${config.name} (${rarityTotal.toFixed(2)}%)`,
      value: rarityList || 'Sin items',
      inline: false
    });
  });

  if (message.channel.isSendable()) {
    await message.channel.send({ embeds: [embed] });
  }
}

async function handleCreateItem(message, args) {
  if (!message.member?.permissions.has(PermissionsBitField.Flags.Administrator)) {
    return message.channel.send('❌ Solo administradores pueden usar este comando.');
  }

  if (args.length < 1) {
    return message.channel.send('❌ Uso: `*createitem <nombre con espacios>`\n\nEjemplo: `*createitem Joker Premium`\n\nDespués configura con `*edititem` los campos: chance, rarity, reply, tokens, role-given, object, promo');
  }

  const name = args.join(' ');
  const guildId = message.guild?.id;
  if (!guildId) return;

  await storage.createItem(guildId, name, 1, 'R', 'Premio obtenido');

  const embed = new EmbedBuilder()
    .setColor(storage.RarityColor(item.rarity))
    .setTitle('✅ Premio Creado')
    .setDescription(`El premio **${name}** ha sido creado con valores por defecto.`)
    .addFields(
      { name: 'Nombre', value: name, inline: true },
      { name: 'Rareza', value: storage.getRarityStars('R') + ' (por defecto)', inline: true },
      { name: 'Probabilidad', value: '1 (por defecto)', inline: true },
      { name: 'Siguiente Paso', value: `Configura los campos con:\n\`*edititem <nombre> chance 10\`\n\`*edititem <nombre> rarity SSR\` (SSR=5★, SR=4★, UR=3★, R=2★)\n\`*edititem <nombre> reply url o texto\`\n\`*edititem <nombre> tokens si\`\n\`*edititem <nombre> role-given NombreRol\`\n\`*edititem <nombre> object persona\`\n\`*edititem <nombre> promo true\``, inline: false }
    );

  if (message.channel.isSendable()) {
    await message.channel.send({ embeds: [embed] });
  }
}

async function handleCreateItemSecret(message, args) {
  if (!message.member?.permissions.has(PermissionsBitField.Flags.Administrator)) {
    return message.channel.send('❌ Solo administradores pueden usar este comando.');
  }

  if (args.length < 1) {
    return message.channel.send('❌ Uso: `*createitemsecret <nombre con espacios>`\n\nEjemplo: `*createitemsecret Johnny Secreto`\n\nDespués configura con `*edititem` los campos: chance, rarity, reply, tokens, role-given, object, promo');
  }

  const name = args.join(' ');
  const guildId = message.guild?.id;
  if (!guildId) return;

  await storage.createItem(guildId, name, 1, 'R', 'Premio secreto obtenido', true);

  const embed = new EmbedBuilder()
    .setColor(0x8B0000)
    .setTitle('🔒 Personaje Secreto Creado')
    .setDescription(`El personaje secreto **${name}** ha sido creado.`)
    .addFields(
      { name: 'Nombre', value: name, inline: true },
      { name: 'Rareza', value: storage.getRarityStars('R') + ' (por defecto)', inline: true },
      { name: 'Probabilidad', value: '1 (por defecto)', inline: true },
      { name: '🔒 Secreto', value: 'Este personaje NO aparece en el banner público', inline: false },
      { name: 'Siguiente Paso', value: `Configura los campos con:\n\`*edititem ${name} chance 10\`\n\`*edititem ${name} rarity SSR\`\n\`*edititem ${name} reply url o texto\`\n\`*edititem ${name} tokens si\`\n\`*edititem ${name} role-given NombreRol\`\n\`*edititem ${name} object persona\`\n\`*edititem ${name} promo true\``, inline: false }
    )
    .setFooter({ text: 'Usa *secretbanner para ver todos los personajes secretos' });

  if (message.channel.isSendable()) {
    await message.channel.send({ embeds: [embed] });
  }
}

async function handleSecretBanner(message) {
  if (!message.member?.permissions.has(PermissionsBitField.Flags.Administrator)) {
    return message.channel.send('❌ Solo administradores pueden usar este comando.');
  }

  const guildId = message.guild?.id;
  if (!guildId) return;

  const allItems = await storage.getAllItems(guildId);
  const secretItems = allItems.filter(item => item.secret);

  if (secretItems.length === 0) {
    return message.channel.send('❌ No hay personajes secretos configurados.');
  }

  const totalChance = secretItems.reduce((sum, item) => sum + item.chance, 0);
  const guild = message.guild;

  const rarityOrder = ['SSR', 'SR', 'UR', 'R'];
  const sortedItems = [...secretItems].sort((a, b) => {
    const rarityDiff = rarityOrder.indexOf(a.rarity.toUpperCase()) - rarityOrder.indexOf(b.rarity.toUpperCase());
    if (rarityDiff !== 0) return rarityDiff;
    return a.name.localeCompare(b.name);
  });

  const rarityConfig = {
    'SSR': { stars: storage.getRarityStars('SSR'), name: await storage.getTokenEmoji('SSR'), color: 0xFFD700 },
    'SR': { stars: storage.getRarityStars('SR'), name: await storage.getTokenEmoji('SR'), color: 0xA020F0 },
    'UR': { stars: storage.getRarityStars('UR'), name: await storage.getTokenEmoji('UR'), color: 0x3498DB },
    'R': { stars: storage.getRarityStars('R'), name: await storage.getTokenEmoji('R'), color: 0x2ECC71 }
  };

  const itemsByRarity = {
    'SSR': [],
    'SR': [],
    'UR': [],
    'R': []
  };

  sortedItems.forEach(item => {
    const rarity = item.rarity.toUpperCase();
    if (itemsByRarity[rarity]) {
      itemsByRarity[rarity].push(item);
    }
  });

  const embed = new EmbedBuilder()
    .setColor(0x8B0000)
    .setAuthor({
      name: `${guild?.name || 'Server'} Banner Secreto`,
      iconURL: guild?.iconURL() || undefined
    })
    .setTitle('🔒 Personajes Secretos 🔒')
    .setDescription('◆━━━━━━━━━✪━━━━━━━━━◆\nEstos personajes NO aparecen en el banner público');

  rarityOrder.forEach(rarityKey => {
    const itemsInRarity = itemsByRarity[rarityKey];
    if (itemsInRarity.length === 0) return;

    const config = rarityConfig[rarityKey];
    let rarityList = '';
    let rarityTotal = 0;

    itemsInRarity.forEach((item) => {
      const percentage = ((item.chance / totalChance) * 100).toFixed(2);
      rarityTotal += parseFloat(percentage);
      const promoMarker = item.promo ? '⭐' : '';
      rarityList += `${percentage}% — **${item.name}** ${promoMarker}\n`;
    });

    embed.addFields({
      name: `${config.stars} ${config.name} (${rarityTotal.toFixed(2)}%)`,
      value: rarityList || 'Sin items',
      inline: false
    });
  });

  if (message.channel.isSendable()) {
    await message.channel.send({ embeds: [embed] });
  }
}

async function handleEditItem(message, args) {
  if (!message.member?.permissions.has(PermissionsBitField.Flags.Administrator)) {
    return message.reply('❌ Solo administradores pueden usar este comando.');
  }

  if (!message.channel.isSendable()) return;

  if (args.length < 2) {
    return message.channel.send('❌ Uso: `*edititem <nombre> <campo> <valor...>`\n**Campos:** chance, rarity, reply, tokens, role-given, object, promo, secret, collectable, price\n\nEjemplos:\n`*edititem Joker rarity SSR`\n`*edititem Joker chance 5`\n`*edititem Joker reply https://imagen.gif`\n`*edititem Joker tokens si`\n`*edititem Joker role-given NombreRol`\n`*edititem Joker promo true`\n`*edititem Joker secret true`\n`*edititem "Cuerpo Santo" collectable 5`\n`*edititem Jack object persona`\n`*edititem Jack price 1000`');
  }

  let itemName;
  let field;
  let valueArgs;

  if (args[0].startsWith('"')) {
    const endQuoteIndex = args.findIndex((arg, i) => i > 0 && arg.endsWith('"'));
    if (endQuoteIndex === -1) {
      return message.channel.send('❌ Falta comillas de cierre en el nombre del item.');
    }

    itemName = args.slice(0, endQuoteIndex + 1).join(' ').replace(/^"|"$/g, '');
    field = args[endQuoteIndex + 1]?.toLowerCase();
    valueArgs = args.slice(endQuoteIndex + 2);
  } else {
    itemName = args[0];
    field = args[1]?.toLowerCase();
    valueArgs = args.slice(2);
  }

  const guildId = message.guild?.id;
  if (!guildId) return;

  const allItems = await storage.getAllItems(guildId);
  const item = await searchItemByPartialName(allItems, itemName);

  if (!item) {
    return message.channel.send(`❌ No se encontró el premio **${itemName}**.`);
  }

  if (field === 'chance') {
    const chance = parseInt(valueArgs[0]);
    if (isNaN(chance) || chance <= 0) {
      return message.channel.send('❌ La probabilidad debe ser un número mayor a 0.');
    }

    await storage.updateItem(guildId, item.name, 'chance', chance);
    return message.channel.send(`✅ Probabilidad del premio **${item.name}** actualizada a **${chance}**.`);

  } else if (field === 'rarity') {
    const rarity = valueArgs[0]?.toUpperCase();
    const validRarities = ['SSR', 'SR', 'UR', 'R'];

    if (!validRarities.includes(rarity)) {
      return message.channel.send(`❌ Rareza inválida. Usa: SSR (5★), SR (4★), UR (3★), o R (2★)`);
    }

    await storage.updateItem(guildId, item.name, 'rarity', rarity);

    const embed = new EmbedBuilder()
      .setColor(storage.getRarityColor(rarity))
      .setTitle('✅ Rareza Actualizada')
      .setDescription(`La rareza del premio **${item.name}** ha sido actualizada.`)
      .addFields({ name: 'Nueva Rareza', value: storage.getRarityStars(rarity), inline: false });

    return message.channel.send({ embeds: [embed] });

  } else if (field === 'reply') {
    const reply = valueArgs.join(' ');
    if (!reply) {
      return message.channel.send('❌ Debes proporcionar una URL o texto de respuesta.');
    }

    await storage.updateItem(guildId, item.name, 'reply', reply);
    return message.channel.send(`✅ Respuesta del premio **${item.name}** actualizada.`);

  } else if (field === 'tokens') {
    const value = valueArgs[0]?.toLowerCase();
    const giveTokens = value === 'si' || value === 'yes' || value === 'true';

    await storage.updateItem(guildId, item.name, 'giveTokens', giveTokens);
    return message.channel.send(`✅ El premio **${item.name}** ${giveTokens ? 'ahora da' : 'ya no da'} Tokens al duplicarse.`);

  } else if (field === 'role-given' || field === 'role') {
    const roleName = valueArgs.join(' ');

    if (!roleName) {
      await storage.updateItem(guildId, item.name, 'roleGiven', null);
      return message.channel.send(`✅ Rol removido del premio **${item.name}**.`);
    }

    await storage.updateItem(guildId, item.name, 'roleGiven', roleName);
    return message.channel.send(`✅ El premio **${item.name}** ahora otorgará el rol **${roleName}**.`);

  } else if (field === 'object' || field === 'tipo') {
    const objectType = valueArgs[0]?.toLowerCase();
    const validTypes = ['personaje', 'persona', 'objeto', 'object'];

    if (!validTypes.includes(objectType)) {
      return message.channel.send('❌ Tipo inválido. Usa: personaje, persona, objeto');
    }

    await storage.updateItem(guildId, item.name, 'objectType', objectType);
    return message.channel.send(`✅ El tipo del premio **${item.name}** ha sido actualizado a **${objectType}**.`);

  } else if (field === 'promo') {
    const value = valueArgs[0]?.toLowerCase();
    const isPromo = value === 'true' || value === 'si' || value === 'yes';

    await storage.updateItem(guildId, item.name, 'promo', isPromo);
    return message.channel.send(`✅ El premio **${item.name}** ${isPromo ? 'ahora es' : 'ya no es'} promocional.`);

  } else if (field === 'secret') {
    const value = valueArgs[0]?.toLowerCase();
    const isSecret = value === 'true' || value === 'si' || value === 'yes';

    await storage.updateItem(guildId, item.name, 'secret', isSecret);
    return message.channel.send(`✅ El premio **${item.name}** ${isSecret ? 'ahora es secreto 🔒' : 'ya no es secreto'}.`);

  } else if (field === 'collectable') {
    const amount = parseInt(valueArgs[0]);
    if (isNaN(amount) || amount < 0) {
      return message.channel.send('❌ La cantidad debe ser un número mayor o igual a 0.');
    }

    await storage.updateItem(guildId, item.name, 'collectable', amount);

    // Si se desactiva collectable (amount = 0), eliminar replycollectables
    if (amount === 0) {
      await storage.updateItem(guildId, item.name, 'replyCollectable1', null);
      await storage.updateItem(guildId, item.name, 'replyCollectable2', null);
      await storage.updateItem(guildId, item.name, 'replyCollectable3', null);
      return message.channel.send(`✅ El premio **${item.name}** ya no es coleccionable. Se eliminaron los replies coleccionables.`);
    }

    return message.channel.send(`✅ El premio **${item.name}** ahora requiere **${amount}** copias para completarse.`);

  } else if (field === 'name' || field === 'nombre') {
    const newName = valueArgs.join(' ');
    if (!newName) {
      return message.channel.send('❌ Debes proporcionar un nuevo nombre.');
    }

    const existingItem = await storage.getItemByName(guildId, newName);
    if (existingItem && existingItem.name !== item.name) {
      return message.channel.send(`❌ Ya existe un premio con el nombre **${newName}**.`);
    }

    await storage.renameItem(guildId, item.name, newName);
    return message.channel.send(`✅ El premio **${item.name}** ha sido renombrado a **${newName}**.`);

  } else if (field === 'replycollectable1') {
    if (!item.collectable || item.collectable === 0) {
      return message.channel.send(`❌ El premio **${item.name}** no es coleccionable. Usa \`*edititem ${item.name} collectable <cantidad>\` primero para activar el modo coleccionable.`);
    }
    const reply = valueArgs.join(' ');
    await storage.updateItem(guildId, item.name, 'replyCollectable1', reply || null);
    return message.channel.send(`✅ Reply coleccionable 1 del premio **${item.name}** actualizado.`);

  } else if (field === 'replycollectable2') {
    if (!item.collectable || item.collectable === 0) {
      return message.channel.send(`❌ El premio **${item.name}** no es coleccionable. Usa \`*edititem ${item.name} collectable <cantidad>\` primero para activar el modo coleccionable.`);
    }
    const reply = valueArgs.join(' ');
    await storage.updateItem(guildId, item.name, 'replyCollectable2', reply || null);
    return message.channel.send(`✅ Reply coleccionable 2 del premio **${item.name}** actualizado.`);

  } else if (field === 'replycollectable3') {
    if (!item.collectable || item.collectable === 0) {
      return message.channel.send(`❌ El premio **${item.name}** no es coleccionable. Usa \`*edititem ${item.name} collectable <cantidad>\` primero para activar el modo coleccionable.`);
    }
    const reply = valueArgs.join(' ');
    await storage.updateItem(guildId, item.name, 'replyCollectable3', reply || null);
    return message.channel.send(`✅ Reply coleccionable 3 del premio **${item.name}** actualizado.`);

  } else if (field === 'price' || field === 'precio') {
    const objectType = (item.objectType || 'personaje').toLowerCase();
    if (objectType === 'personaje') {
      return message.channel.send(`❌ No puedes configurar precio para personajes. Solo para personas y objetos.\n\nCambia el tipo primero: \`*edititem ${item.name} object persona\``);
    }

    const price = parseInt(valueArgs[0]);
    if (isNaN(price) || price < 0) {
      return message.channel.send('❌ El precio debe ser un número mayor o igual a 0.');
    }

    await storage.updateItem(guildId, item.name, 'price', price);

    const customSymbol = await storage.getConfig(guildId, 'custom_currency_symbol');
    const currencySymbol = customSymbol || (await unbClient.getGuild(guildId).catch(() => null))?.currencySymbol || '💰';

    return message.channel.send(`✅ El precio de venta de **${item.name}** ha sido configurado a **${price}${currencySymbol}** (por unidad).`);

  } else if (field === 'bfstats') {
    if (item.objectType && (item.objectType.toLowerCase() !== 'personaje')) {
      return message.channel.send(`❌ Solo puedes configurar stats de bossfight para items de tipo 'personaje'.\nActualmente es '${item.objectType}'. Usa '*edititem ${item.name} object personaje' para cambiarlo.`);
    }

    const statArgs = valueArgs.join(' ').split('|').map(s => s.trim());
    const bfStats = {};

    for (const arg of statArgs) {
      const parts = arg.split(':');
      if (parts.length !== 2) continue;
      const key = parts[0].trim().toLowerCase();
      const value = parts[1].trim();

      if (key === 'hp') bfStats.hp = parseInt(value);
      else if (key === 'atk') bfStats.atk = parseInt(value);
      else if (key === 'def') bfStats.def = parseInt(value);
      else if (key === 'spd') bfStats.spd = parseInt(value);
      else if (key === 'sp') bfStats.sp = parseInt(value);
      else if (key === 'tipo') bfStats.type = value.toLowerCase();
      else if (key === 'habilidades') bfStats.skills = value.split(',').map(s => s.trim());
      else if (key === 'debilidades') bfStats.weaknesses = value.split(',').map(s => s.trim());
      else if (key === 'resistencias') bfStats.resistances = value.split(',').map(s => s.trim());
      else if (key === 'reflects') {
        bfStats.reflects = {};
        value.split(',').forEach(reflectEntry => {
          const reflectParts = reflectEntry.split('(');
          if (reflectParts.length === 2) {
            const type = reflectParts[0].trim().toLowerCase();
            const percentageMatch = reflectParts[1].match(/(\d+)%/);
            if (percentageMatch) {
              bfStats.reflects[type] = parseInt(percentageMatch[1]);
            }
          }
        });
      }
    }

    // Validar campos obligatorios
    if (!bfStats.hp || !bfStats.atk || !bfStats.def || !bfStats.spd || !bfStats.type) {
      return message.channel.send('❌ Faltan campos obligatorios para `bfstats`: `hp`, `atk`, `def`, `spd`, `tipo`.\nEjemplo: `*edititem Joker bfstats hp:500 | atk:120 | def:80 | spd:100 | tipo:curse`');
    }

    await storage.updateItem(guildId, item.name, 'bfStats', bfStats);
    return message.channel.send(`✅ Stats de bossfight del personaje **${item.name}** actualizados.`);

  } else {
    return message.channel.send('❌ Campo inválido. Usa: chance, rarity, reply, tokens, role-given, object, promo, secret, collectable, name, price, bfstats, replycollectable1, replycollectable2, replycollectable3');
  }
}

async function handleDeleteItem(message, args) {
  if (!message.member?.permissions.has(PermissionsBitField.Flags.Administrator)) {
    return message.reply('❌ Solo administradores pueden usar este comando.');
  }

  if (args.length < 1) {
    return message.reply('❌ Uso: `*deleteitem <nombre del premio>`');
  }

  if (!message.channel.isSendable()) return;

  const itemName = args.join(' ');
  const guildId = message.guild?.id;
  if (!guildId) return;

  const allItems = await storage.getAllItems(guildId);
  const item = await searchItemByPartialName(allItems, itemName);

  if (!item) {
    return message.channel.send(`❌ No se encontró el premio **${itemName}**.`);
  }

  const confirmationKey = `${message.author.id}-deleteitem`;

  if (pendingConfirmations.has(confirmationKey)) {
    clearTimeout(pendingConfirmations.get(confirmationKey).timeout);
  }

  const timeout = setTimeout(() => {
    pendingConfirmations.delete(confirmationKey);
  }, 30000);

  pendingConfirmations.set(confirmationKey, {
    command: 'deleteitem',
    data: { itemName: item.name },
    timeout
  });

  const embed = new EmbedBuilder()
    .setColor(0xFF0000)
    .setTitle('⚠️ Confirmación Requerida')
    .setDescription(`¿Estás seguro de que quieres **ELIMINAR** el premio **${item.name}**?\n\nEsta acción no se puede deshacer.\n\nEscribe \`*confirmar\` para continuar o \`*cancelar\` para abortar.\n\n_Esta confirmación expira en 30 segundos._`);

  await message.channel.send({ embeds: [embed] });
}

async function handleResetItems(message) {
  if (!message.member?.permissions.has(PermissionsBitField.Flags.Administrator)) {
    return message.reply('❌ Solo administradores pueden usar este comando.');
  }

  if (!message.channel.isSendable()) return;

  const confirmationKey = `${message.author.id}-resetitems`;

  if (pendingConfirmations.has(confirmationKey)) {
    clearTimeout(pendingConfirmations.get(confirmationKey).timeout);
  }

  const timeout = setTimeout(() => {
    pendingConfirmations.delete(confirmationKey);
  }, 30000);

  pendingConfirmations.set(confirmationKey, {
    command: 'resetitems',
    data: {},
    timeout
  });

  const embed = new EmbedBuilder()
    .setColor(0xFF0000)
    .setTitle('⚠️ Confirmación Requerida')
    .setDescription(`¿Estás seguro de que quieres **ELIMINAR TODOS LOS PREMIOS** del gacha?\n\nEsto también eliminará todos los inventarios de usuarios.\n\nEsta acción no se puede deshacer.\n\nEscribe \`*confirmar\` para continuar o \`*cancelar\` para abortar.\n\n_Esta confirmación expira en 30 segundos._`);

  await message.channel.send({ embeds: [embed] });
}

async function handleSetFav(message, args) {
  const guildId = message.guild?.id;
  if (!guildId) return;

  if (args.length < 1) {
    const currentFav = await storage.getUserFavorite(guildId, message.author.id);
    if (currentFav) {
      return message.channel.send(`⭐ Tu personaje favorito actual es: **${currentFav.name}**\n\nPara cambiarlo: \`*setfav <nombre del personaje>\``);
    }
    return message.channel.send('❌ Uso: `*setfav <nombre del personaje>`\n\nEjemplo: `*setfav Joker`\n\nPuedes usar nombres parciales como `*setfav jok`');
  }

  const characterName = args.join(' ');
  const allItems = await storage.getAllItems(guildId);

  // Filtrar solo personajes
  const personajes = allItems.filter(item => {
    const objectType = (item.objectType || 'personaje').toLowerCase();
    return objectType === 'personaje';
  });

  const item = await searchItemByPartialName(personajes, characterName);

  if (!item) {
    return message.channel.send(`❌ No se encontró el personaje **${characterName}**.\n\nPuedes usar nombres parciales como \`*setfav jok\` para buscar "Joker".`);
  }

  const member = message.member;
  if (!member) {
    return message.channel.send('❌ No se pudo verificar tus roles. Intenta de nuevo.');
  }

  let hasCharacter = false;

  if (item.roleGiven) {
    let roleToCheck = message.guild?.roles.cache.find((r) => r.name === item.roleGiven);

    if (!roleToCheck) {
      const roleMentionMatch = item.roleGiven?.match(/<@&(\d+)>/);
      if (roleMentionMatch) {
        roleToCheck = message.guild?.roles.cache.get(roleMentionMatch[1]);
      }
    }

    if (!roleToCheck && item.roleGiven) {
      roleToCheck = message.guild?.roles.cache.get(item.roleGiven);
    }

    if (roleToCheck) {
      hasCharacter = member.roles.cache.has(roleToCheck.id);
    }
  }

  if (!hasCharacter) {
    return message.channel.send(`❌ No tienes el personaje **${item.name}**. Solo puedes establecer como favorito personajes que tengas.\n\nObtén personajes haciendo spins en el gacha.`);
  }

  await storage.setUserFavorite(guildId, message.author.id, item.name);

  const embed = new EmbedBuilder()
    .setColor(storage.getRarityColor(item.rarity))
    .setTitle('⭐ Personaje Favorito Actualizado')
    .setDescription(`Has establecido a **${item.name}** como tu personaje favorito.\n\nAparecerá en tu perfil al usar \`*perfil\`.`)
    .addFields({ name: 'Rareza', value: storage.getRarityStars(item.rarity), inline: true });

  const isUrl = item.reply?.match(/^https?:\/\/.+\.(gif|png|jpg|jpeg|webp)(\?.*)?$/i);
  if (isUrl) {
    embed.setImage(item.reply);
  }

  await message.channel.send({ embeds: [embed] });
}

async function handleItemInfo(message, args) {
  if (args.length < 1) {
    return message.channel.send('❌ Uso: `*iteminfo <nombre del premio>`');
  }

  const itemName = args.join(' ');
  const guildId = message.guild?.id;
  if (!guildId) return;

  const allItems = await storage.getAllItems(guildId);
  const item = await searchItemByPartialName(allItems, itemName);

  if (!item) {
    return message.channel.send(`❌ No se encontró el premio **${itemName}**.`);
  }

  // Proteger items secretos para usuarios sin permisos de admin
  if (item.secret && !message.member?.permissions.has(PermissionsBitField.Flags.Administrator)) {
    return message.channel.send(`❌ No se encontró el premio **${itemName}**.`);
  }

  const embed = new EmbedBuilder()
    .setColor(storage.getRarityColor(item.rarity))
    .setTitle(`📋 Información: ${item.name}`)
    .addFields(
      { name: 'Rareza', value: storage.getRarityStars(item.rarity), inline: true },
      { name: 'Probabilidad', value: item.chance.toString(), inline: true },
      { name: 'Tipo', value: (item.objectType || 'personaje').charAt(0).toUpperCase() + (item.objectType || 'personaje').slice(1), inline: true },
      { name: 'Da Tokens', value: item.giveTokens ? 'Sí' : 'No', inline: true },
      { name: 'Promocional', value: item.promo ? 'Sí ⭐' : 'No', inline: true },
      { name: 'Secreto', value: item.secret ? 'Sí 🔒' : 'No', inline: true }
    );

  if (item.roleGiven) {
    embed.addFields({ name: 'Rol Otorgado', value: item.roleGiven, inline: false });
  }

  // Mostrar stats de bossfight si es personaje y tiene stats configurados
  const objectType = (item.objectType || 'personaje').toLowerCase();
  if (objectType === 'personaje' && item.bfStats) {
    const bfStats = item.bfStats;
    let statsText = `**HP:** ${bfStats.hp} | **ATK:** ${bfStats.atk} | **DEF:** ${bfStats.def}\n**SPD:** ${bfStats.spd} | **SP:** ${bfStats.sp} | **Tipo:** ${bfStats.type.toUpperCase()}`;

    if (bfStats.skills && bfStats.skills.length > 0) {
      statsText += `\n**Habilidades:** ${bfStats.skills.join(', ')}`;
    }

    if (bfStats.weaknesses && bfStats.weaknesses.length > 0) {
      statsText += `\n**Debilidades:** ${bfStats.weaknesses.map(w => w.toUpperCase()).join(', ')}`;
    }

    if (bfStats.resistances && bfStats.resistances.length > 0) {
      statsText += `\n**Resistencias:** ${bfStats.resistances.map(r => r.toUpperCase()).join(', ')}`;
    }

    if (bfStats.reflects && Object.keys(bfStats.reflects).length > 0) {
      const reflects = Object.entries(bfStats.reflects).map(([type, perc]) => `${type.toUpperCase()} (${perc}%)`).join(', ');
      statsText += `\n**Reflects:** ${reflects}`;
    }

    embed.addFields({ name: '⚔️ Stats de Combate', value: statsText, inline: false });
  } else if (objectType === 'personaje') {
    embed.addFields({ name: '⚔️ Stats de Combate', value: 'No configurados (valores por defecto: HP 500, ATK 100, DEF 80, SPD 100, SP 100)', inline: false });
  }

  if (item.collectable && item.collectable > 0) {
    embed.addFields({ name: '📦 Coleccionable', value: `Requiere ${item.collectable} copias`, inline: false });

    if (item.replyCollectable1 || item.replyCollectable2 || item.replyCollectable3) {
      const collectableReplies = [];
      if (item.replyCollectable1) collectableReplies.push('Reply 1 configurado');
      if (item.replyCollectable2) collectableReplies.push('Reply 2 configurado');
      if (item.replyCollectable3) collectableReplies.push('Reply 3 configurado');
      embed.addFields({ name: 'Replies Coleccionables', value: collectableReplies.join('\n'), inline: false });
    }
  } else {
    if (item.replyCollectable1 || item.replyCollectable2 || item.replyCollectable3) {
      embed.addFields({
        name: '⚠️ Replies Coleccionables',
        value: 'Este item tiene replies coleccionables configurados pero no es coleccionable.\nUsa `*edititem ' + item.name + ' collectable <cantidad>` para activarlo.',
        inline: false
      });
    }
  }

  if (item.reply) {
    const isUrl = item.reply.match(/^https?:\/\/.+\.(gif|png|jpg|jpeg|webp)(\?.*)?$/i);
    if (isUrl) {
      embed.setImage(item.reply);
    } else {
      embed.addFields({ name: 'Respuesta', value: item.reply, inline: false });
    }
  }

  await message.channel.send({ embeds: [embed] });
}

async function handleExchange(message, args) {
  if (args.length < 1) {
    return message.channel.send('❌ Uso: `*canjear <ID del canje>`\n\nUsa `*listexchanges` para ver los canjes disponibles.');
  }

  const exchangeId = args[0];
  const guildId = message.guild?.id;
  if (!guildId) return;

  const exchanges = await storage.getExchangeRules(guildId);
  const exchange = exchanges.find(e => e.id === exchangeId);

  if (!exchange) {
    return message.channel.send(`❌ No existe un canje con ID **${exchangeId}**.\n\nUsa \`*listexchanges\` para ver los canjes disponibles.`);
  }

  const userTokens = await storage.getUserTokens(guildId, message.author.id);

  let canAfford = true;
  for (const [rarity, amount] of Object.entries(exchange.prices)) {
    const tokenType = `Token ${rarity}`;
    if (!userTokens[tokenType] || userTokens[tokenType] < amount) {
      canAfford = false;
      break;
    }
  }

  const priceDisplayPromises = Object.entries(exchange.prices)
    .map(async ([rarity, amount]) => `${amount} ${await storage.getTokenEmoji(guildId, rarity)}`);
  const priceDisplay = (await Promise.all(priceDisplayPromises)).join(', ');

  if (!canAfford) {
    return message.channel.send(`❌ No tienes suficientes Tokens para este canje.\n\n**Requiere:** ${priceDisplay}\n\nUsa \`*tokens\` para ver tus Tokens actuales.`);
  }

  for (const [rarity, amount] of Object.entries(exchange.prices)) {
    const tokenType = `Token ${rarity}`;
    await storage.removeTokens(guildId, message.author.id, tokenType, amount);
  }

  if (exchange.roleGiven && message.member) {
    let roleToGive = message.guild?.roles.cache.find((r) => r.name === exchange.roleGiven);

    if (!roleToGive) {
      const roleMentionMatch = exchange.roleGiven?.match(/<@&(\d+)>/);
      if (roleMentionMatch) {
        roleToGive = message.guild?.roles.cache.get(roleMentionMatch[1]);
      }
    }

    if (!roleToGive && exchange.roleGiven) {
      roleToGive = message.guild?.roles.cache.get(exchange.roleGiven);
    }

    if (roleToGive) {
      try {
        await message.member.roles.add(roleToGive);
      } catch (error) {
        console.error(`❌ Error al asignar rol "${roleToGive.name}":`, error.message);
      }
    }
  }

  const embed = new EmbedBuilder()
    .setColor(0x00FF00)
    .setTitle('✅ Canje Exitoso')
    .setDescription(`Has canjeado con éxito: **${exchange.rewardName}**`)
    .addFields(
      { name: 'Tokens Gastados', value: priceDisplay, inline: false }
    );

  await message.channel.send({ embeds: [embed] });
}

async function handleTokens(message) {
  const guildId = message.guild?.id;
  if (!guildId) return;
  const tokens = await storage.getUserTokens(guildId, message.author.id);
  const customEmoji = await storage.getConfig(guildId, 'currency_emoji');
  const titleEmoji = customEmoji || '<:Dupe:1425315638959673384>';

  if (Object.keys(tokens).length === 0) {
    const embed = new EmbedBuilder()
      .setColor(0xFF0000)
      .setTitle(`${titleEmoji} Tokens`)
      .setDescription('No tienes ningún Token aún.\n\nObtén Tokens al conseguir premios duplicados en el gacha.')
      .setAuthor({
        name: message.author.username,
        iconURL: message.author.displayAvatarURL({ dynamic: true })
      });
    return message.channel.send({ embeds: [embed] });
  }

  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle(`${titleEmoji} Tokens de ${message.author.username}`)
    .setDescription('Aquí están tus Tokens acumulados:')
    .setAuthor({
      name: message.author.username,
      iconURL: message.author.displayAvatarURL({ dynamic: true })
    });

  const rarityOrder = ['Token SSR', 'Token SR', 'Token UR', 'Token R'];

  for (const tokenType of rarityOrder) {
    if (tokens[tokenType] && tokens[tokenType] > 0) {
      const rarity = tokenType.replace('Token ', '');
      const tokenEmoji = await storage.getTokenEmoji(guildId, rarity);
      embed.addFields({
        name: `Token ${tokenEmoji}`,
        value: `${tokens[tokenType]}`,
        inline: true
      });
    }
  }

  await message.channel.send({ embeds: [embed] });
}

async function handleCreateExchange(message, args) {
  if (!message.member?.permissions.has(PermissionsBitField.Flags.Administrator)) {
    return message.reply('❌ Solo administradores pueden usar este comando.');
  }

  if (args.length < 1) {
    return message.reply('❌ Uso: `*createexchange <nombre del canje>`\n\nEjemplo: `*createexchange Spin Gratis`');
  }

  const rewardName = args.join(' ');
  const guildId = message.guild?.id;
  if (!guildId) return;
  const exchangeId = await storage.createExchange(guildId, rewardName);

  const embed = new EmbedBuilder()
    .setColor(0x00FF00)
    .setTitle('✅ Canje Creado')
    .setDescription(`El canje **${rewardName}** ha sido creado con ID: **${exchangeId}**`)
    .addFields(
      { name: 'Siguiente Paso', value: `Configura el canje con:\n\`*editexchange ${exchangeId} price 1SSR 3SR 10UR 40R\`\n\`*editexchange ${exchangeId} role @Ticket\``, inline: false }
    );

  if (message.channel.isSendable()) {
    await message.channel.send({ embeds: [embed] });
  }
}

async function handleListExchanges(message) {
  const guildId = message.guild?.id;
  if (!guildId) return;
  const exchanges = await storage.getExchangeRules(guildId);

  if (exchanges.length === 0) {
    return message.channel.send('❌ No hay canjes configurados. Los administradores pueden crear uno con `*createexchange`.');
  }

  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle('💱 Canjes Disponibles')
    .setDescription('Usa `*canjear <ID>` para canjear tus Tokens:');

  for (const exchange of exchanges) {
    const priceDisplayPromises = Object.entries(exchange.prices)
      .map(async ([rarity, amount]) => `${amount} ${await storage.getTokenEmoji(guildId, rarity)}`);
    const priceDisplay = (await Promise.all(priceDisplayPromises)).join(', ') || 'Sin precio configurado';

    embed.addFields({
      name: `ID: ${exchange.id} - ${exchange.rewardName}`,
      value: `**Precio:** ${priceDisplay}`,
      inline: false
    });
  }

  await message.channel.send({ embeds: [embed] });
}

async function handleSetTicketRole(message, args) {
  if (!message.member?.permissions.has(PermissionsBitField.Flags.Administrator)) {
    return message.channel.send('❌ Solo administradores pueden usar este comando.');
  }

  if (args.length < 1) {
    return message.channel.send('❌ Uso: `*setticketrole <nombre del rol o @mención>`');
  }

  const roleName = args.join(' ');
  const guildId = message.guild?.id;
  if (!guildId) return;
  await storage.setConfig(guildId, 'ticket_role', roleName);

  const embed = new EmbedBuilder()
    .setColor(0x00FF00)
    .setTitle('✅ Rol de Ticket Configurado')
    .setDescription(`El rol de ticket para \`*spin\` ha sido configurado a: **${roleName}**`);

  await message.channel.send({ embeds: [embed] });
}

async function handleSetTicketRole10(message, args) {
  if (!message.member?.permissions.has(PermissionsBitField.Flags.Administrator)) {
    return message.channel.send('❌ Solo administradores pueden usar este comando.');
  }

  if (args.length < 1) {
    return message.channel.send('❌ Uso: `*setticketrole10 <nombre del rol o @mención>`');
  }

  const roleName = args.join(' ');
  const guildId = message.guild?.id;
  if (!guildId) return;
  await storage.setConfig(guildId, 'ticket_role_10', roleName);

  const embed = new EmbedBuilder()
    .setColor(0x00FF00)
    .setTitle('✅ Rol de Ticket x10 Configurado')
    .setDescription(`El rol de ticket para \`*spin10\` ha sido configurado a: **${roleName}**`);

  await message.channel.send({ embeds: [embed] });
}

async function handleEditPull(message, args) {
  if (!message.member?.permissions.has(PermissionsBitField.Flags.Administrator)) {
    return message.channel.send('❌ Solo administradores pueden usar este comando.');
  }

  if (args.length === 0) {
    return message.channel.send('❌ Uso: `*editpull <URL del GIF>`\nO `*editpull remove` para quitar el GIF');
  }
  const guildId = message.guild?.id;
  if (!guildId) return;

  if (args[0].toLowerCase() === 'remove') {
    await storage.setConfig(guildId, 'pity_gif', null);
    return message.channel.send('✅ GIF de tirada removido.');
  }

  const gifUrl = args[0];
  await storage.setConfig(guildId, 'pity_gif', gifUrl);

  const embed = new EmbedBuilder()
    .setColor(0x00FF00)
    .setTitle('✅ GIF de Tirada Configurado')
    .setDescription('El GIF que aparecerá al hacer una tirada ha sido actualizado.')
    .setImage(gifUrl);

  await message.channel.send({ embeds: [embed] });
}

async function handleEditPullSSR(message, args) {
  if (!message.member?.permissions.has(PermissionsBitField.Flags.Administrator)) {
    return message.channel.send('❌ Solo administradores pueden usar este comando.');
  }

  if (args.length === 0) {
    return message.channel.send('❌ Uso: `*editpullssr <URL del GIF>`\nO `*editpullssr remove` para quitar el GIF');
  }
  const guildId = message.guild?.id;
  if (!guildId) return;

  if (args[0].toLowerCase() === 'remove') {
    await storage.setConfig(guildId, 'ssr_gif', null);
    return message.channel.send('✅ GIF de SSR/Promocional removido.');
  }

  const gifUrl = args[0];
  await storage.setConfig(guildId, 'ssr_gif', gifUrl);

  const embed = new EmbedBuilder()
    .setColor(0xFFD700)
    .setTitle('✅ GIF de SSR/Promocional Configurado')
    .setDescription('El GIF que aparecerá al sacar un SSR o promocional ha sido actualizado.')
    .setImage(gifUrl);

  await message.channel.send({ embeds: [embed] });
}

async function handleEditPullTimer(message, args) {
  if (!message.member?.permissions.has(PermissionsBitField.Flags.Administrator)) {
    return message.channel.send('❌ Solo administradores pueden usar este comando.');
  }

  const guildId = message.guild?.id;
  if (!guildId) return;

  if (args.length === 0) {
    const currentTimer = await storage.getConfig(guildId, 'pull_timer') || DEFAULT_PULL_TIMER;
    return message.channel.send(`⏱️ Timer actual: **${currentTimer}ms** (${(currentTimer/1000).toFixed(1)}s)\n\nPara cambiarlo usa: \`*editpulltimer <milisegundos>\`\nEjemplo: \`*editpulltimer 5000\` (5 segundos)`);
  }

  if (args[0].toLowerCase() === 'reset' || args[0].toLowerCase() === 'default') {
    await storage.setConfig(guildId, 'pull_timer', DEFAULT_PULL_TIMER);
    const embed = new EmbedBuilder()
      .setColor(0x00FF00)
      .setTitle('✅ Timer de Tirada Reseteado')
      .setDescription(`El timer ha sido reseteado al valor por defecto: **${DEFAULT_PULL_TIMER}ms** (${(DEFAULT_PULL_TIMER/1000).toFixed(1)}s)`);
    return message.channel.send({ embeds: [embed] });
  }

  const timer = parseInt(args[0]);

  if (isNaN(timer) || timer < 1000 || timer > 60000) {
    return message.channel.send('❌ El timer debe ser un número entre 1000 y 60000 milisegundos (1-60 segundos).\n\nEjemplo: `*editpulltimer 5000` para 5 segundos');
  }

  await storage.setConfig(guildId, 'pull_timer', timer);

  const embed = new EmbedBuilder()
    .setColor(0x00FF00)
    .setTitle('✅ Timer de Tirada Configurado')
    .setDescription(`El timer de los GIFs de tirada ha sido actualizado a: **${timer}ms** (${(timer/1000).toFixed(1)}s)`)
    .addFields(
      { name: 'Nota', value: 'Este timer se aplicará tanto para tiradas normales (*spin) como para tiradas x10 (*spin10)', inline: false }
    );

  await message.channel.send({ embeds: [embed] });
}

async function handleHelp(message) {
  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle('<:dogsuke:1425324917854834708> Comandos del Gacha Bot <:dogsuke:1425324917854834708>')
    .setDescription('Aquí están los comandos que puedes usar:')
    .addFields(
      {
        name: '🎰 Comandos de Juego',
        value: '**`*spin`** - Hacer un spin del gacha (requiere Ticket)\n**`*spin10`** - Hacer 10 spins del gacha (requiere Ticket x10)\n**`*banner`** - Ver el banner actual con probabilidades\n**`*pity`** - Ver tu contador de pity actual',
        inline: false
      },
      {
        name: '🎒 Comandos de Inventario',
        value: '**`*tokens`** - Ver tus Tokens acumulados\n**`*inventory`** - Ver tus premios y objetos coleccionables\n**`*canjear <ID>`** - Canjear Tokens por recompensas\n**`*listexchanges`** - Ver canjes disponibles',
        inline: false
      },
      {
        name: '⚔️ Comandos de Combate',
        value: '**`*startbf <boss> <personaje1> [personaje2] [personaje3]`** - Iniciar bossfight\n**`*listbosses`** - Ver bosses disponibles\n**`*mv`** - Ver tipos de ataque disponibles',
        inline: false
      },
      {
        name: 'ℹ️ Sistema de Rarezas',
        value: '<:SSRTK:1425246335472369857> - Super Super Raro (5★)\n<:SRTK:1425246269307359395> - Super Raro (4★)\n<:URTK:1425246198071033906> - Ultra Raro (3★)\n<:RTK:1425246396654682272> - Raro (2★)\n\n⭐ = Personaje Promocional (Banner)',
        inline: false
      }
    )
    .setFooter({ text: 'Usa *help para ver este menú en cualquier momento' });

  if (message.channel.isSendable()) {
    await message.channel.send({ embeds: [embed] });
  }
}

async function handleFixHelp(message) {
  if (!message.member?.permissions.has(PermissionFlagsBits.Administrator)) {
    return message.reply('❌ Solo administradores pueden usar este comando. Usa `*help` para ver los comandos disponibles.');
  }

  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle('<:dogsuke:1425324917854834708> Comandos del Gacha Bot <:dogsuke:1425324917854834708>')
    .setDescription('Aquí está la lista completa de comandos disponibles:')
    .addFields(
      {
        name: '🎰 Comandos de Juego',
        value: '**`*spin`** - Hacer un spin del gacha (requiere Ticket)\n**`*spin10`** - Hacer 10 spins del gacha (requiere Ticket x10)\n**`*banner`** - Ver el banner actual con probabilidades\n**`*pity`** - Ver tu contador de pity actual',
        inline: false
      },
      {
        name: '🎒 Comandos de Inventario',
        value: '**`*tokens`** - Ver tus Tokens acumulados\n**`*inventory`** - Ver tus premios y objetos coleccionables\n**`*canjear <ID>`** - Canjear Tokens por recompensas\n**`*listexchanges`** - Ver canjes disponibles',
        inline: false
      },
      {
        name: '⚙️ Comandos Admin - Crear Items',
        value: '**`*createitem <nombre>`** - Crear premio\n**`*createitemsecret <nombre>`** - Crear secreto 🔒\n**`*deleteitem <nombre>`** - Eliminar premio\n**`*resetitems`** - Eliminar todos\n**`*iteminfo <nombre>`** - Ver info\n**`*secretbanner`** - Ver secretos 🔒',
        inline: false
      },
      {
        name: '⚙️ Comandos Admin - Editar Items (Parte 1)',
        value: '**`*edititem <nombre> <campo> <valor>`**\n\n**Campos básicos:**\n`*edititem Joker rarity SSR`\n`*edititem Joker chance 5`\n`*edititem Joker reply https://imagen.gif`\n`*edititem Joker tokens si`\n`*edititem Joker role-given @NombreRol`',
        inline: false
      },
      {
        name: '⚙️ Comandos Admin - Editar Items (Parte 2)',
        value: '**Campos avanzados:**\n`*edititem Joker promo true`\n`*edititem Joker secret true` 🔒\n`*edititem Joker collectable 5`\n`*edititem Joker name "Nuevo Nombre"`\n`*edititem Joker object persona`',
        inline: false
      },
      {
        name: '⚙️ Comandos Admin - Replies Coleccionables',
        value: '**Configurar replies aleatorios:**\n`*edititem Joker replycollectable1 <url>`\n`*edititem Joker replycollectable2 <url>`\n`*edititem Joker replycollectable3 <url>`',
        inline: false
      },
      {
        name: '⚙️ Comandos de Administración - Tokens & Coleccionables',
        value: '**`*addtokens <@usuario> <cantidad><rareza>`** - Dar tokens a un usuario\nEjemplo: `*addtokens @Juan 5SSR`\n\n**`*removetokens <@usuario> <cantidad><rareza>`** - Quitar tokens\nEjemplo: `*removetokens @Juan 2SR`\n\n**`*resettokens`** - Resetear tokens de todos (requiere confirmación)\n**`*resetcollectable <item> <@usuario>`** - Resetear coleccionables de un item\nEjemplo: `*resetcollectable Cuerpo santo @Juan`',
        inline: false
      },
      {
        name: '⚙️ Comandos de Administración - Canjes',
        value: '**`*createexchange <nombre>`** - Crear un nuevo canje\nEjemplo: `*createexchange Spin Gratis`\n\n**`*editexchange <id> price <tokens>`** - Editar precios del canje\nEjemplo: `*editexchange 1 price 1SSR 3SR 10UR 40R`\n\n**`*editexchange <id> role <rol>`** - Asignar rol al canje\nEjemplo: `*editexchange 1 role @Ticket`\n\n**`*resetexchanges`** - Eliminar todos los canjes',
        inline: false
      },
      {
        name: '⚙️ Comandos de Configuración',
        value: '**`*setticketrole <rol>`** - Configurar rol de ticket para `*spin`\n**`*setticketrole10 <rol>`** - Configurar rol de ticket para `*spin10`\n**`*editpull <url_gif>`** - Configurar GIF de tirada normal\n**`*editpull remove`** - Quitar GIF de tirada normal\n**`*editpullssr <url_gif>`** - Configurar GIF para SSR/Promocional\n**`*editpullssr remove`** - Quitar GIF de SSR/Promocional\n**`*editpulltimer <milisegundos>`** - Configurar duración del GIF (ej: 5000 = 5s)\n**`*editpulltimer`** - Ver timer actual\n**`*editpulltimer reset`** - Resetear timer a 11.5s\n**`*editpity <número>`** - Configurar en qué tirada es el SSR asegurado (ej: 100)\n**`*editpity`** - Ver pity actual\n**`*editpity reset`** - Resetear pity a 90\n**`*setcurrency <emoji>`** - Configurar emoji del título de tokens\n**`*setcurrencyunb <emoji>`** - Configurar emoji de moneda UnbelievaBoat\n**`*setcurrencyunb reset`** - Usar emoji por defecto de UnbelievaBoat',
        inline: false
      },
      {
        name: '⚔️ Sistema de Bossfight - Personajes',
        value: '**`*editbf <personaje> <campo> <valor>`** (SOLO ADMIN) - Editar stats de combate\nCampos: hp, atk, def, spd, sp, type\nEjemplo: `*editbf Joker hp 600` o `*editbf Joker type curse`\n\n**`*editbf deb <personaje> <tipo>`** - Configurar debilidad (×1.5 daño)\n**`*editbf resist <personaje> <tipo>`** - Configurar resistencia (×0.5 daño)\n**`*editbf reflect <personaje> <tipo> <porcentaje>`** - Configurar reflect\n\n**`*equip <personaje> <habilidad>`** (SOLO ADMIN) - Equipar habilidad (máx 3)\n**`*mv <personaje>`** o **`*moveset <personaje>`** - Ver stats completos y moveset\n\n**Tipos válidos:** agi, bufu, zio, eiga, hama, curse, physical, almighty',
        inline: false
      },
      {
        name: '⚔️ Sistema de Bossfight - Bosses',
        value: '**`*createboss <nombre> <HP> <ATK> <DEF> <SPD> <tipo>`** - Crear boss\nEjemplo: `*createboss Yaldabaoth 800 150 100 90 eiga`\n\n**`*editboss <boss> <campo> <valor>`** - Editar stats\nCampos: hp, atk, def, spd\n\n**`*editboss <boss> deb <tipo>`** - Configurar debilidad\n**`*editboss <boss> resist <tipo>`** - Configurar resistencia\n**`*editboss <boss> reflect <tipo> <porcentaje>`** - Configurar reflect\n\n**`*addskillboss <boss> "<nombre>" <tipo> <daño> [efecto] [cd]`** - Agregar habilidad\nEjemplo: `*addskillboss Yaldabaoth "Bloody Strike" eiga 160 atk_down 3`\n\n**`*deleteskillboss <boss> "<nombre>"`** - Eliminar habilidad\n**`*listbosses`** - Ver bosses disponibles',
        inline: false
      },
      {
        name: '⚔️ Sistema de Bossfight - Habilidades Comunes',
        value: '**`*createskill "<nombre>" <tipo> <costo_sp> <daño> [efecto] [duración] [cd] [usa_hp]`**\nEjemplo: `*createskill "Tarukaja" buff 20 0 atk_up 3 0 false`\n\n**`*listskills`** - Ver habilidades comunes\n**`*deleteskill "<nombre>"`** - Eliminar habilidad común',
        inline: false
      },
      {
        name: '⚔️ Sistema de Bossfight - Combate',
        value: '**`*enablebf`** - Activar bossfights en el servidor (ADMIN)\n**`*disablebf`** - Desactivar bossfights en el servidor (ADMIN)\n\n**`*startbf <boss> <personaje1> [personaje2] [personaje3]`** - Iniciar combate\nEjemplo: `*startbf Yaldabaoth Joker Ryuji Ann`\n\n**`*listbosses`** - Ver bosses disponibles\n**`*mv`** - Ver tabla de tipos de ataque\n\n**`*editcdbf <horas>`** - Configurar cooldown de bossfights (ADMIN)\nEjemplo: `*editcdbf 4` (4 horas)\n**`*editcdbf`** - Ver cooldown actual\n**`*editcdbf reset`** - Resetear a 24h\n\n**Nota:** Máximo 6 bossfights simultáneas por servidor. Timeout: 90 segundos por turno. Durante el combate usa los botones: Atacar, Habilidad, Defender, Rendirse.',
        inline: false
      },
      {
        name: 'ℹ️ Sistema de Rarezas',
        value: '<:SSRTK:1425246335472369857> - Super Super Raro (5★)\n<:SRTK:1425246269307359395> - Super Raro (4★)\n<:URTK:1425246198071033906> - Ultra Raro (3★)\n<:RTK:1425246396654682272> - Raro (2★)\n\n⭐ = Personaje Promocional (Banner)',
        inline: false
      }
    )
    .setFooter({ text: 'Usa *fixhelp para ver este menú en cualquier momento' });

  if (message.channel.isSendable()) {
    await message.channel.send({ embeds: [embed] });
  }
}

async function handleResetExchanges(message) {
  if (!message.member?.permissions.has(PermissionsBitField.Flags.Administrator)) {
    return message.reply('❌ Solo administradores pueden usar este comando.');
  }
  const guildId = message.guild?.id;
  if (!guildId) return;

  if (!message.channel.isSendable()) return;

  const deletedCount = await storage.resetAllExchanges(guildId);

  const embed = new EmbedBuilder()
    .setColor(0xFF0000)
    .setTitle('🗑️ Todos los Canjes Eliminados')
    .setDescription(`Se han eliminado **${deletedCount}** canjes.\n\n✅ Ahora puedes crear nuevos canjes desde cero.`);

  await message.channel.send({ embeds: [embed] });
}

async function handleEditExchange(message, args) {
  if (!message.member?.permissions.has(PermissionsBitField.Flags.Administrator)) {
    return message.reply('❌ Solo administradores pueden usar este comando.');
  }

  if (!message.channel.isSendable()) return;

  if (args.length < 2) {
    return message.channel.send('❌ Uso: `*editexchange <id> <campo> <valor...>`\n**Campos:** price, role\n\nEjemplo precio: `*editexchange 1 price 1SSR 3SR 10UR 40R`\nEjemplo rol: `*editexchange 1 role @Ticket`');
  }

  const exchangeId = args[0];
  const field = args[1].toLowerCase();
  const guildId = message.guild?.id;
  if (!guildId) return;

  const exchanges = await storage.getExchangeRules(guildId);
  const exchange = exchanges.find(e => e.id === exchangeId);

  if (!exchange) {
    return message.channel.send(`❌ No existe un canje con ID **${exchangeId}**.`);
  }

  if (field === 'price') {
    const priceArgs = args.slice(2);
    const prices = {};

    for (const arg of priceArgs) {
      const match = arg.match(/^(\d+)(R|UR|SR|SSR)$/i);
      if (match) {
        const amount = parseInt(match[1]);
        const rarity = match[2].toUpperCase();
        prices[rarity] = amount;
      }
    }

    if (Object.keys(prices).length === 0) {
      return message.channel.send('❌ Formato inválido. Usa: `*editexchange <id> price 1SSR 3SR 10UR 40R`\nPuedes omitir rarezas que no necesites.');
    }

    exchange.prices = prices;
    const filePath = require('path').join(__dirname, 'data', `${guildId}_exchanges.json`);
    await require('fs').promises.writeFile(filePath, JSON.stringify({ exchanges }, null, 2), 'utf-8');

    const priceDisplayPromises = Object.entries(prices)
      .map(async ([rarity, amount]) => `${amount} ${await storage.getTokenEmoji(guildId, rarity)}`);
    const priceDisplay = (await Promise.all(priceDisplayPromises)).join(', ');

    const embed = new EmbedBuilder()
      .setColor(0x00FF00)
      .setTitle('✅ Precios Actualizados')
      .setDescription(`Los precios del canje **${exchange.rewardName}** (ID: ${exchangeId}) han sido actualizados.`)
      .addFields({ name: 'Nuevos Precios', value: priceDisplay });

    await message.channel.send({ embeds: [embed] });

  } else if (field === 'role' || field === 'role-given') {
    const roleName = args.slice(2).join(' ');

    if (!roleName) {
      exchange.roleGiven = null;
      const filePath = require('path').join(__dirname, 'data', `${guildId}_exchanges.json`);
      await require('fs').promises.writeFile(filePath, JSON.stringify({ exchanges }, null, 2), 'utf-8');
      return message.channel.send(`✅ Rol eliminado del canje **${exchange.rewardName}**.`);
    }

    exchange.roleGiven = roleName;
    const filePath = require('path').join(__dirname, 'data', `${guildId}_exchanges.json`);
    await require('fs').promises.writeFile(filePath, JSON.stringify({ exchanges }, null, 2), 'utf-8');
    await message.channel.send(`✅ El canje **${exchange.rewardName}** ahora otorgará el rol **${roleName}**.`);

  } else {
    await message.channel.send('❌ Campo inválido. Usa: price, role, o role-given.');
  }
}

async function handleAddTokens(message, args) {
  if (!message.member?.permissions.has(PermissionsBitField.Flags.Administrator)) {
    return message.channel.send('❌ Solo administradores pueden usar este comando.');
  }

  if (args.length < 2) {
    return message.channel.send('❌ Uso: `*addtokens <@usuario> <cantidad><rareza>`\n\nEjemplos:\n`*addtokens @Juan 5SSR`\n`*addtokens @Maria 10R`');
  }

  const userMention = args[0];
  const userIdMatch = userMention.match(/<@!?(\d+)>/);
  const userId = userIdMatch ? userIdMatch[1] : null;

  if (!userId) {
    return message.channel.send('❌ Debes mencionar a un usuario válido.\nEjemplo: `*addtokens @Juan 5SSR`');
  }

  const tokenArg = args[1];
  const match = tokenArg.match(/^(\d+)(R|UR|SR|SSR)$/i);

  if (!match) {
    return message.channel.send('❌ Formato inválido. Usa: `<cantidad><rareza>`\nEjemplos: 5SSR, 10R, 3SR');
  }

  const amount = parseInt(match[1]);
  const rarity = match[2].toUpperCase();
  const tokenType = `Token ${rarity}`;
  const guildId = message.guild?.id;
  if (!guildId) return;

  console.log(`Adding ${amount} ${tokenType} to user ${userId} on guild ${guildId}`);
  await storage.addTokens(guildId, userId, tokenType, amount);

  const tokenEmoji = await storage.getRarityTokenEmoji(rarity);
  const user = await message.guild.members.fetch(userId);
  const embed = new EmbedBuilder()
    .setColor(0x00FF00)
    .setTitle('✅ Tokens Añadidos')
    .setDescription(`Se han añadido **${amount}** ${tokenEmoji} a ${user.user.username}.`);

  await message.channel.send({ embeds: [embed] });
}

async function handleRemoveTokens(message, args) {
  if (!message.member?.permissions.has(PermissionsBitField.Flags.Administrator)) {
    return message.channel.send('❌ Solo administradores pueden usar este comando.');
  }

  if (args.length < 2) {
    return message.channel.send('❌ Uso: `*removetokens <@usuario> <cantidad><rareza>`\n\nEjemplos:\n`*removetokens @Juan 5SSR`\n`*removetokens @Maria 10R`');
  }

  const userMention = args[0];
  const userIdMatch = userMention.match(/<@!?(\d+)>/);
  const userId = userIdMatch ? userIdMatch[1] : null;

  if (!userId) {
    return message.channel.send('❌ Debes mencionar a un usuario válido.\nEjemplo: `*removetokens @Juan 5SSR`');
  }

  const tokenArg = args[1];
  const match = tokenArg.match(/^(\d+)(R|UR|SR|SSR)$/i);

  if (!match) {
    return message.channel.send('❌ Formato inválido. Usa: `<cantidad><rareza>`\nEjemplos: 5SSR, 10R, 3SR');
  }

  const amount = parseInt(match[1]);
  const rarity = match[2].toUpperCase();
  const tokenType = `Token ${rarity}`;
  const guildId = message.guild?.id;
  if (!guildId) return;

  console.log(`Removing ${amount} ${tokenType} from user ${userId} on guild ${guildId}`);
  const success = await storage.removeTokens(guildId, userId, tokenType, amount);

  const tokenEmoji = await storage.getRarityTokenEmoji(rarity);
  const user = await message.guild.members.fetch(userId);

  if (!success) {
    return message.channel.send(`❌ ${user.user.username} no tiene suficientes ${tokenEmoji} para remover.`);
  }

  const embed = new EmbedBuilder()
    .setColor(0xFF6B35)
    .setTitle('✅ Tokens Removidos')
    .setDescription(`Se han removido **${amount}** ${tokenEmoji} de ${user.user.username}.`);

  await message.channel.send({ embeds: [embed] });
}

async function handleResetTokens(message) {
  if (!message.member?.permissions.has(PermissionsBitField.Flags.Administrator)) {
    return message.channel.send('❌ Solo administradores pueden usar este comando.');
  }

  if (!message.channel.isSendable()) return;
  const guildId = message.guild?.id;
  if (!guildId) return;

  const confirmationKey = `${message.author.id}-resettokens`;

  if (pendingConfirmations.has(confirmationKey)) {
    clearTimeout(pendingConfirmations.get(confirmationKey).timeout);
  }

  const timeout = setTimeout(() => {
    pendingConfirmations.delete(confirmationKey);
  }, 30000);

  pendingConfirmations.set(confirmationKey, {
    command: 'resettokens',
    data: {},
    timeout
  });

  const embed = new EmbedBuilder()
    .setColor(0xFF0000)
    .setTitle('⚠️ Confirmación Requerida')
    .setDescription(`¿Estás seguro de que quieres **RESETEAR TODOS LOS TOKENS** de todos los usuarios?\n\nEsta acción no se puede deshacer.\n\nEscribe \`*confirmar\` para continuar o \`*cancelar\` para abortar.\n\n_Esta confirmación expira en 30 segundos._`);

  await message.channel.send({ embeds: [embed] });
}

async function handleConfirm(message) {
  const guildId = message.guild?.id;
  if (!guildId) return;

  const confirmationKey = `${message.author.id}-deleteitem`;
  const confirmationKey2 = `${message.author.id}-resetitems`;
  const confirmationKey3 = `${message.author.id}-resettokens`;

  if (pendingConfirmations.has(confirmationKey)) {
    const confirmation = pendingConfirmations.get(confirmationKey);
    clearTimeout(confirmation.timeout);
    pendingConfirmations.delete(confirmationKey);

    await storage.deleteItem(guildId, confirmation.data.itemName);

    const embed = new EmbedBuilder()
      .setColor(0x00FF00)
      .setTitle('✅ Premio Eliminado')
      .setDescription(`El premio **${confirmation.data.itemName}** ha sido eliminado del gacha.`);

    return message.channel.send({ embeds: [embed] });
  }

  if (pendingConfirmations.has(confirmationKey2)) {
    const confirmation = pendingConfirmations.get(confirmationKey2);
    clearTimeout(confirmation.timeout);
    pendingConfirmations.delete(confirmationKey2);

    await storage.resetAllItems(guildId);

    const embed = new EmbedBuilder()
      .setColor(0xFF0000)
      .setTitle('🗑️ Todos los Premios Eliminados')
      .setDescription('Se han eliminado todos los premios del gacha y todos los inventarios de usuarios.\n\n✅ Ahora puedes crear nuevos premios desde cero.');

    return message.channel.send({ embeds: [embed] });
  }

  if (pendingConfirmations.has(confirmationKey3)) {
    const confirmation = pendingConfirmations.get(confirmationKey3);
    clearTimeout(confirmation.timeout);
    pendingConfirmations.delete(confirmationKey3);

    await storage.resetAllTokens(guildId);

    const embed = new EmbedBuilder()
      .setColor(0xFF0000)
      .setTitle('🗑️ Todos los Tokens Reseteados')
      .setDescription('Se han eliminado todos los tokens de todos los usuarios.\n\n✅ Los tokens comenzarán desde cero.');

    return message.channel.send({ embeds: [embed] });
  }

  return message.channel.send('❌ No tienes ninguna confirmación pendiente.');
}

async function handleCancel(message) {
  const confirmationKey = `${message.author.id}-deleteitem`;
  const confirmationKey2 = `${message.author.id}-resetitems`;
  const confirmationKey3 = `${message.author.id}-resettokens`;

  if (pendingConfirmations.has(confirmationKey)) {
    const confirmation = pendingConfirmations.get(confirmationKey);
    clearTimeout(confirmation.timeout);
    pendingConfirmations.delete(confirmationKey);
    return message.channel.send('❌ Eliminación de premio cancelada.');
  }

  if (pendingConfirmations.has(confirmationKey2)) {
    const confirmation = pendingConfirmations.get(confirmationKey2);
    clearTimeout(confirmation.timeout);
    pendingConfirmations.delete(confirmationKey2);
    return message.channel.send('❌ Reseteo de premios cancelado.');
  }

  if (pendingConfirmations.has(confirmationKey3)) {
    const confirmation = pendingConfirmations.get(confirmationKey3);
    clearTimeout(confirmation.timeout);
    pendingConfirmations.delete(confirmationKey3);
    return message.channel.send('❌ Reseteo de tokens cancelado.');
  }

  return message.channel.send('❌ No tienes ninguna confirmación pendiente para cancelar.');
}

async function handlePityInfo(message) {
  const guildId = message.guild?.id;
  if (!guildId) return;
  const pityData = await storage.getUserPity(guildId, message.author.id);
  const pityMax = await storage.getConfig(guildId, 'pity_max') || 90;

  const fiftyFiftyStatus = pityData.guaranteedPromo
    ? '🎯 Próximo SSR será PROMOCIONAL garantizado'
    : '🎲 Próximo SSR tiene 50% de ser promocional';

  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle('📊 Tu Información de Pity')
    .setDescription('Sistema de garantía de personajes raros')
    .addFields(
      { name: 'Tiradas desde último SSR', value: `${pityData.counter}/${pityMax}`, inline: true },
      { name: 'Próximo SSR garantizado en', value: `${pityMax - pityData.counter} tiradas`, inline: true },
      { name: 'Sistema 50/50', value: fiftyFiftyStatus, inline: false }
    )
    .setFooter({ text: 'El pity se resetea al obtener un SSR. Si pierdes el 50/50 (obtienes estándar), el próximo SSR será promocional garantizado.' })
    .setAuthor({
      name: message.author.username,
      iconURL: message.author.displayAvatarURL({ dynamic: true })
    });

  await message.channel.send({ embeds: [embed] });
}

async function handleSetCurrency(message, args) {
  if (!message.member?.permissions.has(PermissionsBitField.Flags.Administrator)) {
    return message.channel.send('❌ Solo administradores pueden usar este comando.');
  }

  if (args.length < 1) {
    return message.channel.send('❌ Uso: `*setcurrency <emoji>`\n\nEjemplo: `*setcurrency 💰` o `*setcurrency <:SSRTK:1425246335472369857>`');
  }

  const emoji = args.join(' ');
  const guildId = message.guild?.id;
  if (!guildId) return;
  await storage.setConfig(guildId, 'currency_emoji', emoji);

  const embed = new EmbedBuilder()
    .setColor(0x00FF00)
    .setTitle('✅ Emoji de Tokens Configurado')
    .setDescription(`El emoji de tokens ha sido configurado a: ${emoji}\n\nAhora aparecerá en el título de \`*bal\` y \`*tokens\`\n\nPrueba con \`*tokens\` para ver el cambio.`);

  await message.channel.send({ embeds: [embed] });
}

async function handleInventory(message) {
  const guildId = message.guild?.id;
  if (!guildId) return;

  const allItems = await storage.getAllItems(guildId);
  const collectables = await storage.getUserCollectables(guildId, message.author.id);

  const personasAndObjects = allItems.filter(item => {
    const objectType = (item.objectType || 'personaje').toLowerCase();
    return objectType === 'persona' || objectType === 'objeto' || objectType === 'object';
  });

  if (personasAndObjects.length === 0) {
    return message.channel.send('❌ No hay personas u objetos configurados en el gacha.');
  }

  const customSymbol = await storage.getConfig(guildId, 'custom_currency_symbol');
  let currencySymbol = customSymbol;

  if (!currencySymbol) {
    if (unbClient) {
      try {
        const guildData = await unbClient.getGuild(guildId);
        currencySymbol = guildData.currencySymbol || '💰';
      } catch (error) {
        currencySymbol = '💰';
      }
    } else {
      currencySymbol = '💰';
    }
  }

  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle('🎒 Tu Inventario')
    .setDescription(`Aquí están tus personas y objetos coleccionables:`)
    .setAuthor({
      name: message.author.username,
      iconURL: message.author.displayAvatarURL({ dynamic: true })
    });

  let hasAnyItem = false;

  for (const item of personasAndObjects) {
    const count = collectables[item.name] || 0;
    const objectType = (item.objectType || 'personaje').toLowerCase();
    const rarityStars = storage.getRarityStars(item.rarity);

    if (count > 0) {
      hasAnyItem = true;
      let statusText = `**Cantidad:** ${count}`;

      if (item.collectable && item.collectable > 0) {
        statusText += ` / ${item.collectable}`;
        if (count >= item.collectable) {
          statusText += ' ✅ (Completado)';
        } else {
          statusText += ` (${Math.floor((count / item.collectable) * 100)}%)`;
        }
      }

      const price = item.price || 0;
      const formattedPrice = price.toLocaleString('en-US');
      const priceText = price > 0 ? `\n💰 **Precio de venta:** ${currencySymbol}${formattedPrice} c/u` : '';

      embed.addFields({
        name: `${rarityStars} ${item.name}`,
        value: `**Tipo:** ${objectType.charAt(0).toUpperCase() + objectType.slice(1)}\n${statusText}${priceText}`,
        inline: true
      });
    }
  }

  if (!hasAnyItem) {
    embed.setDescription('No tienes ninguna persona u objeto en tu inventario aún.\n\nObtén items haciendo spins en el gacha.');
  }

  embed.setFooter({ text: 'Usa *sell <nombre> <cantidad> para vender items' });

  await message.channel.send({ embeds: [embed] });
}

async function handlePerfil(message) {
  const guildId = message.guild?.id;
  if (!guildId) return;

  const allItems = await storage.getAllItems(guildId);
  const member = message.member;
  const pityData = await storage.getUserPity(guildId, message.author.id);
  const pityMax = await storage.getConfig(guildId, 'pity_max') || 90;
  const collectables = await storage.getUserCollectables(guildId, message.author.id);
  const totalSpins = await storage.getUserTotalSpins(guildId, message.author.id);

  // Filtrar personajes que el usuario tiene (por rol)
  const personajes = [];
  for (const item of allItems) {
    const objectType = (item.objectType || 'personaje').toLowerCase();
    if (objectType !== 'personaje') continue;

    if (item.roleGiven) {
      let roleToCheck = message.guild?.roles.cache.find((r) => r.name === item.roleGiven);

      if (!roleToCheck) {
        const roleMentionMatch = item.roleGiven?.match(/<@&(\d+)>/);
        if (roleMentionMatch) {
          roleToCheck = message.guild?.roles.cache.get(roleMentionMatch[1]);
        }
      }

      if (!roleToCheck && item.roleGiven) {
        roleToCheck = message.guild?.roles.cache.get(item.roleGiven);
      }

      if (roleToCheck && member.roles.cache.has(roleToCheck.id)) {
        personajes.push(item);
      }
    }
  }

  // Ordenar personajes por rareza (SSR > SR > UR > R)
  const rarityOrder = { 'SSR': 1, 'SR': 2, 'UR': 3, 'R': 4 };
  personajes.sort((a, b) => {
    const rarityDiff = (rarityOrder[a.rarity.toUpperCase()] || 999) - (rarityOrder[b.rarity.toUpperCase()] || 999);
    if (rarityDiff !== 0) return rarityDiff;
    return a.name.localeCompare(b.name);
  });

  // Filtrar personas/objetos que el usuario tiene en inventario
  const personasObjetos = [];
  for (const item of allItems) {
    const objectType = (item.objectType || 'personaje').toLowerCase();
    if (objectType !== 'persona' && objectType !== 'objeto' && objectType !== 'object') continue;

    const count = collectables[item.name] || 0;
    if (count > 0) {
      personasObjetos.push(item);
    }
  }

  // Ordenar personas/objetos por rareza
  personasObjetos.sort((a, b) => {
    const rarityDiff = (rarityOrder[a.rarity.toUpperCase()] || 999) - (rarityOrder[b.rarity.toUpperCase()] || 999);
    if (rarityDiff !== 0) return rarityDiff;
    return a.name.localeCompare(b.name);
  });

  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle(`📋 Perfil de ${message.author.username}`)
    .setAuthor({
      name: message.author.username,
      iconURL: message.author.displayAvatarURL({ dynamic: true })
    })
    .addFields(
      { name: '🎲 Tiradas Totales', value: `${totalSpins.toLocaleString('en-US')}`, inline: true },
      { name: '🎯 Sistema 50/50', value: pityData.guaranteedPromo ? 'Garantizado' : 'Activo', inline: true },
      { name: '👥 Personajes Obtenidos', value: `${personajes.length}`, inline: true }
    );

  // Obtener personaje favorito
  const favCharacter = await storage.getUserFavorite(guildId, message.author.id);
  if (favCharacter && favCharacter.reply) {
    const isUrl = favCharacter.reply.match(/^https?:\/\/.+\.(gif|png|jpg|jpeg|webp)(\?.*)?$/i);
    if (isUrl) {
      embed.setThumbnail(favCharacter.reply);
    }
  }

  // Mostrar personajes (sin estrellas)
  if (personajes.length > 0) {
    let personajesList = '';
    for (const item of personajes) {
      const promoMarker = item.promo ? ' ⭐' : '';
      personajesList += `${item.name}${promoMarker}\n`;
    }

    // Dividir en chunks si es muy largo
    if (personajesList.length > 1024) {
      const chunks = personajesList.match(/.{1,1020}/g) || [];
      chunks.forEach((chunk, index) => {
        embed.addFields({
          name: index === 0 ? '🌟 Personajes' : '🌟 Personajes (cont.)',
          value: chunk,
          inline: false
        });
      });
    } else {
      embed.addFields({
        name: '🌟 Personajes',
        value: personajesList || 'Ninguno',
        inline: false
      });
    }
  } else {
    embed.addFields({
      name: '🌟 Personajes',
      value: 'No tienes personajes aún',
      inline: false
    });
  }

  // Mostrar personas/objetos (sin estrellas)
  if (personasObjetos.length > 0) {
    let personasObjetosList = '';
    for (const item of personasObjetos) {
      personasObjetosList += `${item.name}\n`;
    }

    if (personasObjetosList.length > 1024) {
      const chunks = personasObjetosList.match(/.{1,1020}/g) || [];
      chunks.forEach((chunk, index) => {
        embed.addFields({
          name: index === 0 ? '🎒 Inventario' : '🎒 Inventario (cont.)',
          value: chunk,
          inline: false
        });
      });
    } else {
      embed.addFields({
        name: '🎒 Inventario',
        value: personasObjetosList,
        inline: false
      });
    }
  } else {
    embed.addFields({
      name: '🎒 Inventario',
      value: 'No tienes personas u objetos',
      inline: false
    });
  }

  await message.channel.send({ embeds: [embed] });
}

async function handleSell(message, args) {
  const guildId = message.guild?.id;
  if (!guildId) return;

  if (args.length < 2) {
    return;
  }

  const quantity = parseInt(args[args.length - 1]);
  if (isNaN(quantity) || quantity <= 0) {
    return;
  }

  const itemName = args.slice(0, args.length - 1).join(' ');

  const allItems = await storage.getAllItems(guildId);
  const item = await searchItemByPartialName(allItems, itemName);

  if (!item) {
    return message.reply(`❌ No se encontró el item **${itemName}**.`);
  }

  const objectType = (item.objectType || 'personaje').toLowerCase();
  if (objectType === 'personaje') {
    return;
  }

  if (objectType !== 'persona' && objectType !== 'objeto' && objectType !== 'object') {
    return;
  }

  const price = item.price || 0;
  if (price === 0) {
    return;
  }

  const collectables = await storage.getUserCollectables(guildId, message.author.id);
  const currentCount = collectables[item.name] || 0;

  if (currentCount < quantity) {
    return;
  }

  const totalPrice = price * quantity;

  try {
    const customSymbol = await storage.getConfig(guildId, 'custom_currency_symbol');
    const currencySymbol = customSymbol || (await unbClient.getGuild(guildId).catch(() => null))?.currencySymbol || '💰';

    await unbClient.editUserBalance(guildId, message.author.id, {
      cash: totalPrice,
      reason: `Venta de ${quantity}x ${item.name}`
    });

    for (let i = 0; i < quantity; i++) {
      const collectablesData = await storage.getUserCollectables(guildId, message.author.id);
      if (collectablesData[item.name] && collectablesData[item.name] > 0) {
        const filePath = require('path').join(__dirname, 'data', `${guildId}_collectables.json`);
        const fs = require('fs').promises;
        const data = JSON.parse(await fs.readFile(filePath, 'utf-8'));

        if (!data[message.author.id]) data[message.author.id] = {};
        data[message.author.id][item.name] = (data[message.author.id][item.name] || 0) - 1;

        if (data[message.author.id][item.name] <= 0) {
          delete data[message.author.id][item.name];
        }

        await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
      }
    }

    const rarityStars = storage.getRarityStars(item.rarity);
    const formattedTotal = totalPrice.toLocaleString('en-US');
    const formattedPrice = price.toLocaleString('en-US');
    const embed = new EmbedBuilder()
      .setColor(0x57F287)
      .setTitle('💰 Venta Exitosa')
      .setDescription(`Has vendido **${quantity}x ${item.name}**`)
      .addFields(
        { name: 'Item', value: `${rarityStars} ${item.name}`, inline: true },
        { name: 'Cantidad', value: `${quantity}`, inline: true },
        { name: 'Total Recibido', value: `${currencySymbol} ${formattedTotal}`, inline: true },
        { name: 'Precio Unitario', value: `${currencySymbol} ${formattedPrice}`, inline: true }
      );

    await message.channel.send({ embeds: [embed] });
    console.log(`✅ ${message.author.tag} vendió ${quantity}x ${item.name} por ${currencySymbol} ${formattedTotal}`);

  } catch (error) {
    console.error('Error al vender item:', error);

    if (error.response?.status === 403) {
      return message.channel.send('❌ El bot no tiene permisos para gestionar la economía de UnbelievaBoat en este servidor.\n\nAsegúrate de que la aplicación esté autorizada en: https://unbelievaboat.com/applications');
    }

    return message.channel.send('❌ Ocurrió un error al procesar la venta. Verifica que UnbelievaBoat esté configurado correctamente en el servidor.');
  }
}

async function handleSetCurrencyUnb(message, args) {
  if (!message.member?.permissions.has(PermissionsBitField.Flags.Administrator)) {
    return message.channel.send('❌ Solo administradores pueden usar este comando.');
  }

  const guildId = message.guild?.id;
  if (!guildId) return;

  if (args.length === 0) {
    const currentSymbol = await storage.getConfig(guildId, 'custom_currency_symbol');
    if (currentSymbol) {
      return message.channel.send(`💰 Emoji de moneda actual: **${currentSymbol}**\n\nPara cambiarlo usa: \`*setcurrencyunb <emoji>\`\nPara usar el de UnbelievaBoat: \`*setcurrencyunb reset\``);
    } else {
      return message.channel.send(`💰 Usando el emoji de moneda por defecto de UnbelievaBoat.\n\nPara configurar uno personalizado: \`*setcurrencyunb <emoji>\`\nEjemplo: \`*setcurrencyunb 💎\``);
    }
  }

  if (args[0].toLowerCase() === 'reset' || args[0].toLowerCase() === 'default') {
    await storage.setConfig(guildId, 'custom_currency_symbol', null);
    const embed = new EmbedBuilder()
      .setColor(0x00FF00)
      .setTitle('✅ Emoji Reseteado')
      .setDescription('Ahora se usará el emoji de moneda por defecto de UnbelievaBoat.');
    return message.channel.send({ embeds: [embed] });
  }

  const newSymbol = args.join(' ');

  await storage.setConfig(guildId, 'custom_currency_symbol', newSymbol);

  const embed = new EmbedBuilder()
    .setColor(0x00FF00)
    .setTitle('✅ Emoji de Moneda Configurado')
    .setDescription(`El emoji de moneda se ha actualizado a: **${newSymbol}**`)
    .addFields(
      { name: 'Ejemplo', value: `${newSymbol} 1,000`, inline: false }
    );

  await message.channel.send({ embeds: [embed] });
}

async function handleResetCollectable(message, args) {
  if (!message.member?.permissions.has(PermissionsBitField.Flags.Administrator)) {
    return message.channel.send('❌ Solo administradores pueden usar este comando.');
  }

  if (args.length < 2) {
    return message.channel.send('❌ Uso: `*resetcollectable <nombre_item> <@usuario>`\n\nEjemplo: `*resetcollectable Cuerpo santo @Juan`');
  }

  const userMention = args[args.length - 1];
  const userIdMatch = userMention.match(/<@!?(\d+)>/);
  const userId = userIdMatch ? userIdMatch[1] : null;

  if (!userId) {
    return message.reply('❌ Debes mencionar a un usuario válido.\nEjemplo: `*resetcollectable Cuerpo santo @Juan`');
  }

  const itemName = args.slice(0, args.length - 1).join(' ');
  const guildId = message.guild?.id;
  if (!guildId) return;

  const allItems = await storage.getAllItems(guildId);
  const item = await searchItemByPartialName(allItems, itemName);
  if (!item) {
    return message.channel.send(`❌ No se encontró el item **${itemName}**.`);
  }

  await storage.resetCollectable(guildId, userId, item.name);

  const user = await message.guild.members.fetch(userId);
  const embed = new EmbedBuilder()
    .setColor(0xFF6B35)
    .setTitle('✅ Coleccionables Reseteados')
    .setDescription(`Los coleccionables de **${item.name}** han sido reseteados para ${user.user.username}.`);

  await message.channel.send({ embeds: [embed] });
}

async function handleEditPity(message, args) {
  if (!message.member?.permissions.has(PermissionsBitField.Flags.Administrator)) {
    return message.channel.send('❌ Solo administradores pueden usar este comando.');
  }

  const guildId = message.guild?.id;
  if (!guildId) return;

  if (args.length === 0) {
    const currentPity = await storage.getConfig(guildId, 'pity_max') || 90;
    return message.channel.send(`⏱️ Pity actual: **${currentPity}** tiradas\n\nPara cambiarlo usa: \`*editpity <número>\`\nEjemplo: \`*editpity 100\` (el pity será a las 100 tiradas)`);
  }

  if (args[0].toLowerCase() === 'reset' || args[0].toLowerCase() === 'default') {
    await storage.setConfig(guildId, 'pity_max', 90);
    const embed = new EmbedBuilder()
      .setColor(0x00FF00)
      .setTitle('✅ Pity Reseteado')
      .setDescription(`El pity ha sido reseteado al valor por defecto: **90 tiradas**`);
    return message.channel.send({ embeds: [embed] });
  }

  const pityMax = parseInt(args[0]);

  if (isNaN(pityMax) || pityMax < 1 || pityMax > 500) {
    return message.channel.send('❌ El pity debe ser un número entre 1 y 500.\n\nEjemplo: `*editpity 100` para que el pity sea a las 100 tiradas');
  }

  await storage.setConfig(guildId, 'pity_max', pityMax);

  const embed = new EmbedBuilder()
    .setColor(0x00FF00)
    .setTitle('✅ Pity Configurado')
    .setDescription(`El pity ha sido actualizado a: **${pityMax} tiradas**`)
    .addFields(
      { name: 'Nota', value: 'Los usuarios recibirán un SSR garantizado al llegar a este número de tiradas sin obtener uno.', inline: false }
    );

  await message.channel.send({ embeds: [embed] });
}

async function handleGirarSlash(interaction) {
  const member = interaction.member;
  const guildId = interaction.guild?.id;
  if (!member || !guildId) return;

  // Verificar si hay una tirada en curso
  const cooldownKey = `${guildId}-${interaction.user.id}`;
  if (spinCooldowns.has(cooldownKey)) {
    const timeLeft = spinCooldowns.get(cooldownKey) - Date.now();
    if (timeLeft > 0) {
      const embed = new EmbedBuilder()
        .setColor(0xFFD700)
        .setTitle('🎰 Tirada en Curso')
        .setDescription(`Ya tienes una tirada activa.\n\n⏱️ Podrás hacer otra tirada en **${Math.ceil(timeLeft / 1000)}** segundos.`)
        .setFooter({ text: 'Espera a que termine tu tirada actual' });
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }
    spinCooldowns.delete(cooldownKey);
  }

  let ticketRole = await storage.getConfig(guildId, 'ticket_role') || DEFAULT_TICKET_ROLE;

  const mentionMatch = ticketRole.match(/<@&(\d+)>/);
  if (mentionMatch) {
    ticketRole = mentionMatch[1];
  }

  const hasTicket = member.roles.cache.some((role) =>
    role.name.toLowerCase() === ticketRole.toLowerCase() || role.id === ticketRole
  );

  if (!hasTicket) {
    const embed = new EmbedBuilder()
      .setColor(0xFF0000)
      .setTitle('❌ Sin Ticket')
      .setDescription(`No tienes el ticket necesario para hacer un spin.\n\nCompra un ticket en <@292953664492929025> para poder jugar.`);
    return interaction.reply({ embeds: [embed], ephemeral: true });
  }

  // Activar cooldown de 5 segundos
  const cooldownTime = 5000; // 5 segundos fijos
  spinCooldowns.set(cooldownKey, Date.now() + cooldownTime);
  setTimeout(() => spinCooldowns.delete(cooldownKey), cooldownTime);

  // Esperar 1 segundo antes de quitar el rol (para evitar errores)
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Quitar el rol después de 1 segundo
  const ticketRoleToRemove = member.roles.cache.find((role) =>
    role.name.toLowerCase() === ticketRole.toLowerCase() || role.id === ticketRole
  );

  if (ticketRoleToRemove) {
    try {
      await member.roles.remove(ticketRoleToRemove);
      console.log(`✅ Ticket "${ticketRoleToRemove.name}" removido (con delay de 1s) [slash]`);
    } catch (error) {
      console.error(`❌ Error al remover ticket "${ticketRoleToRemove.name}":`, error.message);

      if (error.code === 50001) {
        const warningEmbed = new EmbedBuilder()
          .setColor(0xFFA500)
          .setTitle('⚠️ No se pudo remover el ticket')
          .setDescription(`El bot no tiene permisos para remover el rol **${ticketRoleToRemove.name}**.\n\n**Solución:** Asegúrate de que el rol del bot esté por encima de este rol en la jerarquía del servidor.`);
        await interaction.reply({ embeds: [warningEmbed], ephemeral: true });
        return;
      }
    }
  }

  const item = await storage.getRandomItemWithPity(guildId, interaction.user.id);

  // Incrementar contador de spins totales
  await storage.incrementTotalSpins(guildId, interaction.user.id, 1);

  if (!item) {
    return interaction.reply({ content: '❌ No hay premios configurados en el gacha.', ephemeral: true });
  }

  const isSSRorPromo = item.rarity.toUpperCase() === 'SSR' || item.promo;
  const gifToShow = isSSRorPromo
    ? await storage.getConfig(guildId, 'ssr_gif')
    : await storage.getConfig(guildId, 'pity_gif');

  if (gifToShow) {
    const pullTimer = await storage.getConfig(guildId, 'pull_timer') || DEFAULT_PULL_TIMER;

    const loadingEmbed = new EmbedBuilder()
      .setColor(0xFFD700)
      .setTitle('🌟 Realizando tirada...')
      .setImage(gifToShow);

    await interaction.reply({ embeds: [loadingEmbed] });

    await new Promise(resolve => setTimeout(resolve, pullTimer));

    await interaction.deleteReply();
  } else {
    await interaction.deferReply();
  }

  let hasRoleGiven = false;

  if (item.roleGiven) {
    let roleToCheck = interaction.guild?.roles.cache.find((r) => r.name === item.roleGiven);

    if (!roleToCheck) {
      const roleMentionMatch = item.roleGiven?.match(/<@&(\d+)>/);
      if (roleMentionMatch) {
        roleToCheck = interaction.guild?.roles.cache.get(roleMentionMatch[1]);
      }
    }

    if (!roleToCheck && item.roleGiven) {
      roleToCheck = interaction.guild?.roles.cache.get(item.roleGiven);
    }

    if (roleToCheck) {
      hasRoleGiven = member.roles.cache.has(roleToCheck.id);
    }
  }

  const isDuplicate = hasRoleGiven;
  const embedColor = item.secret ? 0x8B0000 : storage.getRarityColor(item.rarity);
  const objectType = item.objectType || 'personaje';

  const collectables = await storage.getUserCollectables(guildId, interaction.user.id);
  const currentCount = collectables[item.name] || 0;
  const isCollectable = item.collectable && item.collectable > 0;

  let replyToUse = item.reply;
  if (isCollectable && (item.replyCollectable1 || item.replyCollectable2 || item.replyCollectable3)) {
    const collectableReplies = [item.replyCollectable1, item.replyCollectable2, item.replyCollectable3].filter(r => r);
    if (collectableReplies.length > 0) {
      replyToUse = collectableReplies[Math.floor(Math.random() * collectableReplies.length)];
    }
  }

  const isUrl = replyToUse?.match(/^https?:\/\/.+\.(gif|png|jpg|jpeg|webp)(\?.*)?$/i);

  if ((isDuplicate && item.giveTokens) || (objectType === 'persona' && item.giveTokens)) {
    const tokenEmoji = await storage.getTokenEmoji(item.rarity);
    const tokenType = `Token ${item.rarity.toUpperCase()}`;
    await storage.addTokens(guildId, interaction.user.id, tokenType, 1);

    const rarityStars = storage.getRarityStars(item.rarity);

    const embed = new EmbedBuilder()
      .setColor(0xFFA500)
      .setTitle(`🔄 ¡${objectType.charAt(0).toUpperCase() + objectType.slice(1)} Duplicado!`)
      .addFields(
        { name: objectType.charAt(0).toUpperCase() + objectType.slice(1), value: item.name, inline: true },
        { name: 'Rareza', value: rarityStars, inline: true },
        { name: '<:Dupe:1425315638959673384> Tokens', value: `+1 ${tokenEmoji}`, inline: true }
      )
      .setFooter({ text: `Ya tenías este ${objectType}, recibiste Tokens` });

    if (isUrl) {
      embed.setImage(replyToUse);
    }

    const replyMethod = interaction.replied ? 'followUp' : 'reply';
    await interaction[replyMethod]({ embeds: [embed] });
  } else {
    const rarityStars = storage.getRarityStars(item.rarity);

    const embed = new EmbedBuilder()
      .setColor(embedColor)
      .setTitle(item.secret ? `🔒 ¡${objectType.charAt(0).toUpperCase() + objectType.slice(1)} Secreto Obtenido!` : `🎉 ¡Nuevo ${objectType.charAt(0).toUpperCase() + objectType.slice(1)} Obtenido!`)
      .addFields(
        { name: objectType.charAt(0).toUpperCase() + objectType.slice(1), value: item.name, inline: true },
        { name: 'Rareza', value: rarityStars, inline: true }
      );

    if (item.secret) {
      embed.setDescription('🔒 ¡Has conseguido un personaje secreto!');
    }

    if (isCollectable) {
      const remaining = item.collectable - currentCount;
      embed.addFields({ name: '📦 Coleccionable', value: `${currentCount}/${item.collectable} (Faltan ${remaining})`, inline: false });

      if (currentCount >= item.collectable && item.roleGiven) {
        embed.addFields({ name: '✅ Completado', value: `Rol asignado: ${item.roleGiven}`, inline: false });
      }
    }

    embed.setFooter({ text: item.secret ? '¡Has desbloqueado un secreto!' : `¡Felicidades por tu nuevo ${objectType}!` });

    if (isUrl) {
      embed.setImage(replyToUse);
    }

    const replyMethod = interaction.replied ? 'followUp' : 'reply';
    await interaction[replyMethod]({ embeds: [embed] });

    if (item.roleGiven) {
      const shouldGiveRole = !isCollectable || currentCount >= item.collectable;

      if (shouldGiveRole) {
        let roleToGive = interaction.guild?.roles.cache.find((r) => r.name === item.roleGiven);

        if (!roleToGive) {
          const roleMentionMatch = item.roleGiven?.match(/<@&(\d+)>/);
          if (roleMentionMatch) {
            roleToGive = interaction.guild?.roles.cache.get(roleMentionMatch[1]);
          }
        }

        if (!roleToGive && item.roleGiven) {
          roleToGive = interaction.guild?.roles.cache.get(item.roleGiven);
        }

        if (roleToGive) {
          try {
            await member.roles.add(roleToGive);
            console.log(`✅ Rol "${roleToGive.name}" asignado exitosamente a ${interaction.user.tag}`);
          } catch (error) {
            console.error(`❌ Error al asignar rol "${roleToGive.name}":`, error.message);
          }
        } else {
          console.log(`⚠️ No se encontró el rol "${item.roleGiven}" en el servidor`);
        }
      }
    }
  }
}

async function handleGirar10Slash(interaction) {
  const member = interaction.member;
  const guildId = interaction.guild?.id;
  if (!member || !guildId) return;

  let ticketRole10 = await storage.getConfig(guildId, 'ticket_role_10') || 'Ticket x10';

  const mentionMatch = ticketRole10.match(/<@&(\d+)>/);
  if (mentionMatch) {
    ticketRole10 = mentionMatch[1];
  }

  const hasTicket10 = member.roles.cache.some((role) =>
    role.name.toLowerCase() === ticketRole10.toLowerCase() || role.id === ticketRole10
  );

  if (!hasTicket10) {
    const embed = new EmbedBuilder()
      .setColor(0xFF0000)
      .setTitle('❌ Sin Ticket x10')
      .setDescription(`No tienes el ticket necesario para hacer 10 spins.\n\nCompra un ticket x10 en <@292953664492929025> para poder jugar.`);
    return interaction.reply({ embeds: [embed], ephemeral: true });
  }

  await interaction.deferReply();

  // Esperar 1 segundo antes de quitar el rol (para evitar errores)
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Quitar el rol después de 1 segundo
  const ticketRoleToRemove = member.roles.cache.find((role) =>
    role.name.toLowerCase() === ticketRole10.toLowerCase() || role.id === ticketRole10
  );

  if (ticketRoleToRemove) {
    try {
      await member.roles.remove(ticketRoleToRemove);
      console.log(`✅ Ticket x10 "${ticketRoleToRemove.name}" removido (con delay de 1s) [slash]`);
    } catch (error) {
      console.error(`❌ Error al remover ticket x10:`, error.message);

      if (error.code === 50001) {
        const warningEmbed = new EmbedBuilder()
          .setColor(0xFFA500)
          .setTitle('⚠️ No se pudo remover el ticket')
          .setDescription(`El bot no tiene permisos para remover el rol **${ticketRoleToRemove.name}**.\n\n**Solución:** Asegúrate de que el rol del bot esté por encima de este rol en la jerarquía del servidor.`);
        await interaction.followUp({ embeds: [warningEmbed], ephemeral: true });
        return;
      }
    }
  }

  const results = [];

  // Incrementar contador de spins totales
  await storage.incrementTotalSpins(guildId, interaction.user.id, 10);

  for (let i = 0; i < 10; i++) {
    const item = await storage.getRandomItemWithPity(guildId, interaction.user.id);
    if (!item) continue;

    let hasRoleGiven = false;

    if (item.roleGiven) {
      let roleToCheck = interaction.guild?.roles.cache.find((r) => r.name === item.roleGiven);

      if (!roleToCheck) {
        const roleMentionMatch = item.roleGiven?.match(/<@&(\d+)>/);
        if (roleMentionMatch) {
          roleToCheck = interaction.guild?.roles.cache.get(roleMentionMatch[1]);
        }
      }

      if (!roleToCheck && item.roleGiven) {
        roleToCheck = interaction.guild?.roles.cache.get(item.roleGiven);
      }

      if (roleToCheck) {
        hasRoleGiven = member.roles.cache.has(roleToCheck.id);
      }
    }

    const isDuplicate = hasRoleGiven;
    const objectType = item.objectType || 'personaje';

    if (isDuplicate || (objectType === 'persona' && item.giveTokens)) {
      const tokenType = `Token ${item.rarity.toUpperCase()}`;
      await storage.addTokens(guildId, interaction.user.id, tokenType, 1);
    } else if (!isDuplicate && item.roleGiven) {
      let roleToGive = interaction.guild?.roles.cache.find((r) => r.name === item.roleGiven);

      if (!roleToGive) {
        const roleMentionMatch = item.roleGiven?.match(/<@&(\d+)>/);
        if (roleMentionMatch) {
          roleToGive = interaction.guild?.roles.cache.get(roleMentionMatch[1]);
        }
      }

      if (!roleToGive && item.roleGiven) {
        roleToGive = interaction.guild?.roles.cache.get(item.roleGiven);
      }

      if (roleToGive && !member.roles.cache.has(roleToGive.id)) {
        try {
          await member.roles.add(roleToGive);
        } catch (error) {
          console.error(`❌ Error al asignar rol "${roleToGive.name}":`, error.message);
        }
      }
    }

    results.push({ item, isDuplicate });
  }

  const rarityPriority = { 'SSR': 1, 'SR': 2, 'UR': 3, 'R': 4 };
  const hasPromo = results.some(r => r.item.promo);
  const highestRarity = results.reduce((highest, current) => {
    const currentPriority = rarityPriority[current.item.rarity.toUpperCase()] || 999;
    const highestPriority = rarityPriority[highest.toUpperCase()] || 999;
    return currentPriority < highestPriority ? current.item.rarity : highest;
  }, 'R');

  const isSSRorPromo = highestRarity.toUpperCase() === 'SSR' || hasPromo;
  const gifToShow = isSSRorPromo
    ? await storage.getConfig(guildId, 'ssr_gif')
    : await storage.getConfig(guildId, 'pity_gif');

  if (gifToShow) {
    const pullTimer = await storage.getConfig(guildId, 'pull_timer') || DEFAULT_PULL_TIMER;

    const loadingEmbed = new EmbedBuilder()
      .setColor(0xFFD700)
      .setTitle('🌟 Realizando 10 tiradas...')
      .setImage(gifToShow);

    await interaction.editReply({ embeds: [loadingEmbed] });
    await new Promise(resolve => setTimeout(resolve, pullTimer));
  }

  const groupedResults = {};

  results.forEach(({ item, isDuplicate }) => {
    if (!groupedResults[item.name]) {
      groupedResults[item.name] = { count: 0, isDuplicate, rarity: item.rarity };
    }
    groupedResults[item.name].count++;
  });

  const bestItems = results.filter(r => r.item.rarity === highestRarity);
  const randomBestItem = bestItems[Math.floor(Math.random() * bestItems.length)].item;

  const isUrl = randomBestItem.reply.match(/^https?:\/\/.+\.(gif|png|jpg|jpeg|webp)(\?.*)?$/i);

  if (isUrl) {
    const bestItemEmbed = new EmbedBuilder()
      .setColor(storage.getRarityColor(randomBestItem.rarity))
      .setTitle(`✨ ¡${randomBestItem.name}!`)
      .setDescription(`${storage.getRarityStars(randomBestItem.rarity)} - Tu mejor premio de estas 10 tiradas`)
      .setImage(randomBestItem.reply);

    await interaction.editReply({ embeds: [bestItemEmbed] });

    await new Promise(resolve => setTimeout(resolve, 1500));
  }

  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle('🎉 Resultados de 10 Giros')
    .setDescription(`${interaction.user.username}, aquí están tus resultados:`);

  Object.entries(groupedResults).forEach(([name, data]) => {
    const rarityStars = storage.getRarityStars(data.rarity);
    const status = data.isDuplicate ? '🔄 Duplicado' : '✨ Nuevo';
    embed.addFields({
      name: `${rarityStars} ${name}`,
      value: `${status} - Obtenido **${data.count}x**`,
      inline: false
    });
  });

  await interaction.followUp({ embeds: [embed] });
}

async function handleCreateChar(message, args) {
  const guildId = message.guild?.id;
  if (!guildId) return;

  if (!message.member?.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
    return message.reply('❌ Necesitas permisos de administrador para crear personajes.');
  }

  if (args.length < 6) {
    return message.reply('❌ Uso: `*createchar <nombre> <HP> <ATK> <DEF> <SPD> <tipo>`\nEjemplo: `*createchar Joker 500 120 80 100 curse`');
  }

  const [name, hp, atk, def, spd, type] = args;

  const result = await bossfight.createCharacter(guildId, message.author.id, name, parseInt(hp), parseInt(atk), parseInt(def), parseInt(spd), type);

  if (!result.success) {
    return message.reply(`❌ ${result.error}`);
  }

  const embed = new EmbedBuilder()
    .setColor(0x00FF00)
    .setTitle('✅ Personaje Creado')
    .addFields(
      { name: 'Nombre', value: result.character.name, inline: true },
      { name: 'HP', value: `${result.character.hp}`, inline: true },
      { name: 'ATK', value: `${result.character.atk}`, inline: true },
      { name: 'DEF', value: `${result.character.def}`, inline: true },
      { name: 'SPD', value: `${result.character.spd}`, inline: true },
      { name: 'Tipo', value: result.character.type.toUpperCase(), inline: true }
    );

  message.reply({ embeds: [embed] });
}

async function handleEditChar(message, args) {
  const guildId = message.guild?.id;
  if (!guildId) return;

  if (!message.member?.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
    return message.reply('❌ Necesitas permisos de administrador.');
  }

  if (args.length < 3) {
    return message.reply('❌ Uso: `*editchar <personaje> <campo> <valor>`\nCampos: hp, atk, def, spd, sp\nEjemplo: `*editchar Joker hp 600`');
  }

  const [charName, field, value] = args;
  const result = await bossfight.editCharacter(guildId, message.author.id, charName, field.toLowerCase(), parseInt(value));

  if (!result.success) {
    return message.reply(`❌ ${result.error}`);
  }

  message.reply(`✅ ${charName} actualizado: **${field.toUpperCase()}** = ${value}`);
}

async function handleEditBF(message, args) {
  const guildId = message.guild?.id;
  if (!guildId) return;

  if (!message.member?.permissions.has(PermissionsBitField.Flags.Administrator)) {
    return message.reply('❌ Solo administradores pueden usar este comando.');
  }

  if (args.length < 3) {
    return message.reply('❌ Uso:\n`*editbf <personaje> <campo> <valor>`\nCampos: hp, atk, def, spd, sp, type\n`*editbf deb <personaje> <tipo>`\n`*editbf resist <personaje> <tipo>`\n`*editbf reflect <personaje> <tipo> <porcentaje>`\n\nEjemplo: `*editbf Joker hp 4000`');
  }

  const [action, charName, ...rest] = args;
  let result;

  // Comandos especiales (deb, resist, reflect)
  if (action === 'deb') {
    const type = rest[0];
    result = await bossfight.setCharacterWeakness(guildId, charName, type);
  } else if (action === 'resist') {
    const type = rest[0];
    result = await bossfight.setCharacterResistance(guildId, charName, type);
  } else if (action === 'reflect') {
    const type = rest[0];
    const percentage = rest[1];
    if (!percentage) {
      return message.reply('❌ Debes especificar el porcentaje de reflect.');
    }
    result = await bossfight.setCharacterReflect(guildId, charName, type, parseInt(percentage));
  } else {
    // Editar stats normales (hp, atk, def, spd, sp, type)
    const field = charName;
    const value = rest[0];
    
    if (!field || !value) {
      return message.reply('❌ Uso: `*editbf <personaje> <campo> <valor>`\nEjemplo: `*editbf Joker hp 4000`');
    }
    
    // Si el campo es type, pasar string; si no, parsear número
    const finalValue = field === 'type' ? value : parseInt(value);
    
    if (field !== 'type' && isNaN(finalValue)) {
      return message.reply('❌ El valor debe ser un número válido.');
    }
    
    result = await bossfight.editCharacterBFStats(guildId, action, field, finalValue);
  }

  if (!result.success) {
    return message.reply(`❌ ${result.error}`);
  }

  message.reply(`✅ Actualizado correctamente.`);
}

async function handleEquip(message, args) {
  const guildId = message.guild?.id;
  if (!guildId) return;

  if (args.length < 2) {
    return message.reply('❌ Uso: `*equip <personaje> <habilidad>`');
  }

  const [charName, ...skillParts] = args;
  const skillName = skillParts.join(' ');

  const result = await bossfight.equipSkill(guildId, message.author.id, charName, skillName);

  if (!result.success) {
    return message.reply(`❌ ${result.error}`);
  }

  message.reply(`✅ ${charName} ahora tiene equipada la habilidad **${skillName}**`);
}

async function handleCreateBoss(message, args) {
  const guildId = message.guild?.id;
  if (!guildId) return;

  if (!message.member?.permissions.has(PermissionsBitField.Flags.Administrator)) {
    return message.reply('❌ Solo administradores pueden crear bosses.');
  }

  if (args.length < 6) {
    return message.reply('❌ Uso: `*createboss <nombre> <HP> <ATK> <DEF> <SPD> <tipo>`\nEjemplo: `*createboss Yaldabaoth 800 150 100 90 eiga`');
  }

  const [name, hp, atk, def, spd, type] = args;
  const result = await bossfight.createBoss(guildId, name, parseInt(hp), parseInt(atk), parseInt(def), parseInt(spd), type);

  if (!result.success) {
    return message.reply(`❌ ${result.error}`);
  }

  const embed = new EmbedBuilder()
    .setColor(0xFF0000)
    .setTitle('👹 Boss Creado')
    .addFields(
      { name: 'Nombre', value: result.boss.name, inline: true },
      { name: 'HP', value: `${result.boss.hp}`, inline: true },
      { name: 'ATK', value: `${result.boss.atk}`, inline: true },
      { name: 'DEF', value: `${result.boss.def}`, inline: true },
      { name: 'SPD', value: `${result.boss.spd}`, inline: true },
      { name: 'Tipo', value: result.boss.type.toUpperCase(), inline: true }
    );

  message.reply({ embeds: [embed] });
}

async function handleEditBoss(message, args) {
  const guildId = message.guild?.id;
  if (!guildId) return;

  if (!message.member?.permissions.has(PermissionsBitField.Flags.Administrator)) {
    return message.reply('❌ Solo administradores pueden editar bosses.');
  }

  if (args.length < 3) {
    return message.reply('❌ Uso: `*editboss <boss> <campo> <valor>`\nCampos: hp, atk, def, spd, reward, difficulty\nTambién: `*editboss <boss> deb/resist <tipo>`\n`*editboss <boss> reflect <tipo> <porcentaje>`');
  }

  const [bossName, field, value, percentage] = args;
  let result;

  if (field === 'deb') {
    result = await bossfight.setBossWeakness(guildId, bossName, value);
  } else if (field === 'resist') {
    result = await bossfight.setBossResistance(guildId, bossName, value);
  } else if (field === 'reflect') {
    if (!percentage) {
      return message.reply('❌ Debes especificar el porcentaje de reflect.');
    }
    result = await bossfight.setBossReflect(guildId, bossName, value, parseInt(percentage));
  } else if (field === 'reward') {
    result = await bossfight.setBossReward(guildId, bossName, parseInt(value));
    
    if (result.success) {
      const customSymbol = await storage.getConfig(guildId, 'custom_currency_symbol');
      const currencySymbol = customSymbol || (await unbClient.getGuild(guildId).catch(() => null))?.currencySymbol || '💰';
      return message.reply(`✅ Recompensa del boss ${bossName} actualizada a **${parseInt(value).toLocaleString('en-US')}${currencySymbol}**`);
    }
  } else if (field === 'difficulty') {
    result = await bossfight.setBossDifficulty(guildId, bossName, value);
    
    if (result.success) {
      const difficultyEmojis = {
        'facil': '🟢',
        'normal': '🟡',
        'dificil': '🟠',
        'extremo': '🔴'
      };
      const emoji = difficultyEmojis[value.toLowerCase()] || '';
      return message.reply(`✅ Dificultad del boss ${bossName} actualizada a **${emoji} ${value.charAt(0).toUpperCase() + value.slice(1)}**`);
    }
  } else {
    result = await bossfight.editBoss(guildId, bossName, field.toLowerCase(), parseInt(value));
  }

  if (!result.success) {
    return message.reply(`❌ ${result.error}`);
  }

  message.reply(`✅ Boss ${bossName} actualizado correctamente.`);
}

async function handleAddSkillBoss(message, args) {
  const guildId = message.guild?.id;
  if (!guildId) return;

  if (!message.member?.permissions.has(PermissionsBitField.Flags.Administrator)) {
    return message.reply('❌ Solo administradores pueden agregar habilidades.');
  }

  const fullText = args.join(' ');
  const match = fullText.match(/^(.+?)\s+"([^"]+)"\s+(\w+)\s+(\d+)(?:\s+(\w+))?(?:\s+(\d+))?$/);

  if (!match) {
    return message.reply('❌ Uso: `*addskillboss <boss> "<nombre>" <tipo> <daño> [efecto] [cooldown]`\nEjemplo: `*addskillboss Yaldabaoth "Bloody Strike" eiga 160 atk_down 3`');
  }

  const [, bossName, skillName, type, damage, effect, cooldown] = match;

  const result = await bossfight.addBossSkill(guildId, bossName, skillName, type, parseInt(damage), effect || null, parseInt(cooldown) || 0);

  if (!result.success) {
    return message.reply(`❌ ${result.error}`);
  }

  message.reply(`✅ Habilidad **${skillName}** agregada al boss ${bossName}`);
}

async function handleDeleteSkillBoss(message, args) {
  const guildId = message.guild?.id;
  if (!guildId) return;

  if (!message.member?.permissions.has(PermissionsBitField.Flags.Administrator)) {
    return message.reply('❌ Solo administradores pueden eliminar habilidades.');
  }

  if (args.length < 2) {
    return message.reply('❌ Uso: `*deleteskillboss <boss> "<nombre>"`');
  }

  const fullText = args.join(' ');
  const match = fullText.match(/^(.+?)\s+"([^"]+)"$/);

  if (!match) {
    return message.reply('❌ El nombre de la habilidad debe estar entre comillas.');
  }

  const [, bossName, skillName] = match;

  const result = await bossfight.deleteBossSkill(guildId, bossName, skillName);

  if (!result.success) {
    return message.reply(`❌ ${result.error}`);
  }

  message.reply(`✅ Habilidad **${skillName}** eliminada del boss ${bossName}`);
}

async function handleEnableBF(message) {
  const guildId = message.guild?.id;
  if (!guildId) return;

  if (!message.member?.permissions.has(PermissionsBitField.Flags.Administrator)) {
    return message.reply('❌ Solo administradores pueden habilitar bossfights.');
  }

  await storage.setConfig(guildId, 'bossfight_enabled', true);
  message.reply('✅ Sistema de bossfights **activado** en este servidor.');
}

async function handleDisableBF(message) {
  const guildId = message.guild?.id;
  if (!guildId) return;

  if (!message.member?.permissions.has(PermissionsBitField.Flags.Administrator)) {
    return message.reply('❌ Solo administradores pueden deshabilitar bossfights.');
  }

  await storage.setConfig(guildId, 'bossfight_enabled', false);
  message.reply('✅ Sistema de bossfights **desactivado** en este servidor.');
}

async function handleStartBF(message, args) {
  const guildId = message.guild?.id;
  if (!guildId) return;

  const enabled = await storage.getConfig(guildId, 'bossfight_enabled');
  if (!enabled) {
    return message.reply('❌ El sistema de bossfights está desactivado. Un administrador debe usar `*enablebf` primero.');
  }

  if (args.length < 2) {
    return message.reply('❌ Uso: `*startbf <boss> <personaje1> [personaje2] [personaje3]`\nPuedes usar entre 1 y 3 personajes.');
  }

  const now = Date.now();
  const cooldownHours = await storage.getConfig(guildId, 'bossfight_cooldown') || 24;
  const cooldown = cooldownHours * 60 * 60 * 1000;

  const lastBF = await storage.getConfig(guildId, `bf_cooldown_${message.author.id}`);
  if (lastBF) {
    const timeLeft = lastBF - now;
    if (timeLeft > 0) {
      const hoursLeft = (timeLeft / (60 * 60 * 1000)).toFixed(1);
      return message.reply(`❌ Debes esperar **${hoursLeft} horas** antes de iniciar otra bossfight.`);
    }
  }

  if (!combat.canStartSession(guildId)) {
    return message.reply(`❌ Este servidor ya tiene el máximo de 6 bossfights activas. Espera a que termine alguna.`);
  }

  const existingSession = combat.getSession(guildId, message.author.id);
  if (existingSession) {
    return message.reply('❌ Ya tienes una bossfight activa.');
  }

  const [bossName, ...charNames] = args;

  if (charNames.length > 3) {
    return message.reply('❌ Máximo 3 personajes por batalla.');
  }

  const bosses = await bossfight.getAllBosses(guildId);
  const boss = bosses.find(b => b.name.toLowerCase() === bossName.toLowerCase());

  if (!boss) {
    return message.reply(`❌ Boss **${bossName}** no encontrado.`);
  }

  const userChars = await bossfight.getAllCharacters(guildId, message.author.id);
  const selectedChars = [];

  for (const charName of charNames) {
    const char = userChars.find(c => c.name.toLowerCase() === charName.toLowerCase());
    if (!char) {
      return message.reply(`❌ Personaje **${charName}** no encontrado.`);
    }
    selectedChars.push(char);
  }

  const entryFee = await storage.getConfig(guildId, 'bossfight_entry_fee') || 0;

  if (entryFee > 0) {
    try {
      const balance = await unbClient.getUserBalance(guildId, message.author.id);
      if (balance.cash < entryFee) {
        return message.reply(`❌ Necesitas **${entryFee}** monedas para entrar a la bossfight. Tienes **${balance.cash}**.`);
      }

      await unbClient.editUserBalance(guildId, message.author.id, { cash: -entryFee, reason: 'Entrada a bossfight' });
    } catch (error) {
      console.error('Error verificando balance:', error);
      return message.reply('❌ Error al verificar tu balance en UnbelievaBoat.');
    }
  }

  const session = combat.createSession(guildId, message.channel.id, message.author.id, boss, selectedChars);

  await storage.setConfig(guildId, `bf_cooldown_${message.author.id}`, now + cooldown);

  const embed = combat.createCombatEmbed(session);
  const buttons = combat.createActionButtons(session);

  const sentMessage = await message.reply({ embeds: [embed], components: buttons });
  session.messageId = sentMessage.id;

  setTimeout(async () => {
    const currentSession = combat.getSession(guildId, message.author.id);
    if (currentSession && currentSession.messageId === sentMessage.id) {
      combat.deleteSession(guildId, message.author.id);
      await message.channel.send(`⏰ ${message.author}, tu tiempo se agotó. **Derrota automática**.`);
    }
  }, combat.COMBAT_TIMEOUT);
}

async function handleCombatButton(interaction) {
  const guildId = interaction.guild?.id;
  if (!guildId) return;

  const session = combat.getSession(guildId, interaction.user.id);

  if (!session) {
    return interaction.reply({ content: '❌ No tienes una bossfight activa.', ephemeral: true });
  }

  if (interaction.message.id !== session.messageId) {
    return interaction.reply({ content: '❌ Esta no es tu bossfight activa.', ephemeral: true });
  }

  await interaction.deferUpdate();

  const currentChar = session.characters[session.currentCharIndex];
  const boss = session.boss;

  let playerAction = '';
  let playerDamage = 0;

  if (interaction.customId === 'combat_attack') {
    const stats = combat.applyBuffs(currentChar);
    const dmgResult = bossfight.calculateDamage(
      stats,
      boss,
      {
        weaknesses: boss.weaknesses,
        resistances: boss.resistances,
        reflects: boss.reflects
      }
    );

    boss.currentHp -= dmgResult.damage;
    if (boss.currentHp < 0) boss.currentHp = 0;

    if (dmgResult.isReflect) {
      currentChar.currentHp -= dmgResult.reflected;
      if (currentChar.currentHp < 0) currentChar.currentHp = 0;
    }

    playerAction = `**${currentChar.name}** atacó`;
    playerDamage = dmgResult.damage;

  } else if (interaction.customId === 'combat_skill') {
    if (currentChar.skills.length === 0) {
      return interaction.followUp({ content: '❌ No tienes habilidades equipadas.', ephemeral: true });
    }

    const skills = await bossfight.getAllCommonSkills(guildId);
    const availableSkills = currentChar.skills
      .map(skillName => skills.find(s => s.name === skillName))
      .filter(skill => skill && (!currentChar.cooldowns[skill.name] || currentChar.cooldowns[skill.name] <= 0));

    if (availableSkills.length === 0) {
      return interaction.followUp({ content: '❌ Todas tus habilidades están en cooldown.', ephemeral: true });
    }

    const skill = availableSkills[0];

    if (skill.usesHp && currentChar.currentHp < skill.spCost) {
      return interaction.followUp({ content: `❌ No tienes suficiente HP para usar **${skill.name}** (${skill.spCost} HP requerido).`, ephemeral: true });
    }

    if (!skill.usesHp && currentChar.currentSp < skill.spCost) {
      return interaction.followUp({ content: `❌ No tienes suficiente SP para usar **${skill.name}** (${skill.spCost} SP requerido).`, ephemeral: true });
    }

    if (skill.usesHp) {
      currentChar.currentHp -= skill.spCost;
    } else {
      currentChar.currentSp -= skill.spCost;
    }

    if (skill.damage > 0) {
      const stats = combat.applyBuffs(currentChar);
      const dmgResult = bossfight.calculateDamage(
        stats,
        boss,
        {
          skillType: skill.type,
          skillDamage: skill.damage,
          weaknesses: boss.weaknesses,
          resistances: boss.resistances,
          reflects: boss.reflects
        }
      );

      boss.currentHp -= dmgResult.damage;
      if (boss.currentHp < 0) boss.currentHp = 0;

      if (dmgResult.isReflect) {
        currentChar.currentHp -= dmgResult.reflected;
        if (currentChar.currentHp < 0) currentChar.currentHp = 0;
      }

      playerDamage = dmgResult.damage;
    }

    if (skill.effect) {
      const [effectType, effectTarget] = skill.effect.split('_');
      if (effectTarget === 'up') {
        currentChar.buffs[skill.effect] = skill.duration || 3;
      } else if (effectTarget === 'down') {
        session.bossDebuffs[skill.effect] = skill.duration || 3;
      } else if (skill.effect === 'heal') {
        const healAmount = skill.damage;
        currentChar.currentHp = Math.min(currentChar.currentHp + healAmount, currentChar.maxHp);
      }
    }

    if (skill.cooldown > 0) {
      currentChar.cooldowns[skill.name] = skill.cooldown;
    }

    playerAction = `**${currentChar.name}** usó **${skill.name}**`;

  } else if (interaction.customId === 'combat_defend') {
    currentChar.buffs.def_up = 1;
    playerAction = `**${currentChar.name}** se defiende (+30% DEF)`;

  } else if (interaction.customId === 'combat_surrender') {
    combat.deleteSession(guildId, interaction.user.id);
    const embed = new EmbedBuilder()
      .setColor(0x808080)
      .setTitle('🏳️ Rendición')
      .setDescription(`${interaction.user} se ha rendido. La bossfight ha terminado.`);
    return interaction.editReply({ embeds: [embed], components: [] });
  }

  if (boss.currentHp <= 0) {
    combat.deleteSession(guildId, interaction.user.id);

    const rewards = await storage.getConfig(guildId, 'bossfight_rewards') || 1000;

    try {
      await unbClient.editUserBalance(guildId, interaction.user.id, { cash: rewards, reason: `Victoria contra ${boss.name}` });
    } catch (error) {
      console.error('Error otorgando recompensa:', error);
    }

    const embed = new EmbedBuilder()
      .setColor(0x00FF00)
      .setTitle('🎉 ¡VICTORIA!')
      .setDescription(`¡Has derrotado a **${boss.name}**!\n\n💰 Recompensa: **${rewards}** monedas`)
      .addFields({ name: 'Acción final', value: playerAction, inline: false });

    return interaction.editReply({ embeds: [embed], components: [] });
  }

  const bossAction = combat.performBossAction(session);

  if (currentChar.currentHp <= 0) {
    session.currentCharIndex++;

    if (session.currentCharIndex >= session.characters.length) {
      combat.deleteSession(guildId, interaction.user.id);

      const embed = new EmbedBuilder()
        .setColor(0xFF0000)
        .setTitle('💀 DERROTA')
        .setDescription(`Todos tus personajes han caído ante **${boss.name}**.`);

      return interaction.editReply({ embeds: [embed], components: [] });
    }
  }

  combat.decrementBuffsDebuffs(currentChar);
  combat.decrementBuffsDebuffs({ buffs: session.bossBuffs, debuffs: session.bossDebuffs });

  if (currentChar.cooldowns) {
    for (const skill in currentChar.cooldowns) {
      currentChar.cooldowns[skill]--;
      if (currentChar.cooldowns[skill] <= 0) {
        delete currentChar.cooldowns[skill];
      }
    }
  }

  const spRegen = combat.regenerateSP(session);

  session.turn++;
  session.lastActionTime = Date.now();

  const combatLog = `${playerAction}${playerDamage > 0 ? ` (${playerDamage} daño)` : ''}\n**${boss.name}** ${bossAction.action} (${bossAction.damage} daño)${spRegen ? '\n🔮 +10 SP regenerados' : ''}`;

  const embed = combat.createCombatEmbed(session);
  embed.addFields({ name: '📜 Último turno', value: combatLog, inline: false });

  const buttons = combat.createActionButtons(session);

  await interaction.editReply({ embeds: [embed], components: buttons });

  setTimeout(async () => {
    const currentSession = combat.getSession(guildId, interaction.user.id);
    if (currentSession && currentSession.messageId === interaction.message.id && currentSession.turn === session.turn) {
      combat.deleteSession(guildId, interaction.user.id);
      await interaction.channel.send(`⏰ ${interaction.user}, tu tiempo se agotó. **Derrota automática**.`);
    }
  }, combat.COMBAT_TIMEOUT);
}

async function handleListChars(message) {
  const guildId = message.guild?.id;
  if (!guildId) return;

  const chars = await bossfight.getAllCharacters(guildId, message.author.id);

  if (chars.length === 0) {
    return message.reply('❌ No tienes personajes creados. Usa `*createchar` para crear uno.');
  }

  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle('⚔️ Tus Personajes')
    .setDescription(chars.map(c => 
      `**${c.name}** - HP: ${c.hp} | ATK: ${c.atk} | DEF: ${c.def} | SPD: ${c.spd} | Tipo: ${c.type.toUpperCase()}`
    ).join('\n'));

  message.reply({ embeds: [embed] });
}

async function handleListBosses(message) {
  const guildId = message.guild?.id;
  if (!guildId) return;

  const bosses = await bossfight.getAllBosses(guildId);

  if (bosses.length === 0) {
    return message.reply('❌ No hay bosses configurados.');
  }

  const customSymbol = await storage.getConfig(guildId, 'custom_currency_symbol');
  const currencySymbol = customSymbol || (await unbClient.getGuild(guildId).catch(() => null))?.currencySymbol || '💰';

  const difficultyEmojis = {
    'facil': '🟢',
    'normal': '🟡',
    'dificil': '🟠',
    'extremo': '🔴'
  };

  const embed = new EmbedBuilder()
    .setColor(0xFF0000)
    .setTitle('👹 Bosses Disponibles')
    .setDescription(bosses.map(b => {
      const difficulty = b.difficulty || 'normal';
      const diffEmoji = difficultyEmojis[difficulty] || '🟡';
      const reward = (b.reward || 1000).toLocaleString('en-US');
      return `**${b.name}** ${diffEmoji}\nHP: ${b.hp} | ATK: ${b.atk} | DEF: ${b.def} | SPD: ${b.spd}\nTipo: ${b.type.toUpperCase()} | Recompensa: ${currencySymbol}${reward}`;
    }).join('\n\n'));

  message.reply({ embeds: [embed] });
}

async function handleEditCDBF(message, args) {
  if (!message.member?.permissions.has(PermissionsBitField.Flags.Administrator)) {
    return message.channel.send('❌ Solo administradores pueden usar este comando.');
  }

  const guildId = message.guild?.id;
  if (!guildId) return;

  if (args.length === 0) {
    const currentCD = await storage.getConfig(guildId, 'bossfight_cooldown') || 24;
    return message.channel.send(`⏱️ Cooldown actual: **${currentCD} horas**\n\nPara cambiarlo usa: \`*editcdbf <horas>\`\nEjemplo: \`*editcdbf 4\` (4 horas)\nO usa: \`*editcdbf reset\` para resetear a 24h`);
  }

  if (args[0].toLowerCase() === 'reset' || args[0].toLowerCase() === 'default') {
    await storage.setConfig(guildId, 'bossfight_cooldown', 24);
    const embed = new EmbedBuilder()
      .setColor(0x00FF00)
      .setTitle('✅ Cooldown Reseteado')
      .setDescription(`El cooldown de bossfights ha sido reseteado a **24 horas**`);
    return message.channel.send({ embeds: [embed] });
  }

  const hours = parseFloat(args[0]);

  if (isNaN(hours) || hours < 0 || hours > 168) {
    return message.channel.send('❌ El cooldown debe ser un número entre 0 y 168 horas (1 semana).\n\nEjemplo: `*editcdbf 4` para 4 horas\nO usa decimales: `*editcdbf 0.5` para 30 minutos');
  }

  await storage.setConfig(guildId, 'bossfight_cooldown', hours);

  const embed = new EmbedBuilder()
    .setColor(0x00FF00)
    .setTitle('✅ Cooldown Configurado')
    .setDescription(`El cooldown de bossfights ha sido actualizado a: **${hours} horas**`)
    .addFields(
      { name: 'Nota', value: 'Los jugadores deberán esperar este tiempo después de completar una bossfight antes de poder iniciar otra.', inline: false }
    );

  await message.channel.send({ embeds: [embed] });
}

async function handleCreateSkill(message, args) {
  if (!message.member?.permissions.has(PermissionsBitField.Flags.Administrator)) {
    return message.reply('❌ Solo administradores pueden crear habilidades comunes.');
  }

  if (args.length < 4) {
    return message.reply('❌ Uso: `*createskill "<nombre>" <tipo> <costo_sp> <daño> [efecto] [duración] [cooldown] [usa_hp]`\nEjemplo: `*createskill "Tarukaja" buff 20 0 atk_up 3 0 false`');
  }

  const guildId = message.guild?.id;
  if (!guildId) return;

  const fullText = args.join(' ');
  const match = fullText.match(/^"([^"]+)"\s+(\w+)\s+(\d+)\s+(\d+)(?:\s+(\w+))?(?:\s+(\d+))?(?:\s+(\d+))?(?:\s+(true|false))?$/);

  if (!match) {
    return message.reply('❌ Formato incorrecto. El nombre debe estar entre comillas.\nEjemplo: `*createskill "Tarukaja" buff 20 0 atk_up 3 0 false`');
  }

  const [, name, type, spCost, damage, effect, duration, cooldown, usesHp] = match;

  const result = await bossfight.createCommonSkill(
    guildId,
    name,
    type,
    parseInt(spCost),
    parseInt(damage),
    effect || null,
    parseInt(duration) || 0,
    parseInt(cooldown) || 0,
    usesHp === 'true'
  );

  if (!result.success) {
    return message.reply(`❌ ${result.error}`);
  }

  const embed = new EmbedBuilder()
    .setColor(0x00FF00)
    .setTitle('✅ Habilidad Común Creada')
    .addFields(
      { name: 'Nombre', value: result.skill.name, inline: true },
      { name: 'Tipo', value: result.skill.type.toUpperCase(), inline: true },
      { name: 'Costo', value: `${result.skill.spCost} ${result.skill.usesHp ? 'HP' : 'SP'}`, inline: true },
      { name: 'Daño', value: `${result.skill.damage}`, inline: true },
      { name: 'Efecto', value: result.skill.effect || 'Ninguno', inline: true },
      { name: 'Cooldown', value: `${result.skill.cooldown} turnos`, inline: true }
    );

  message.reply({ embeds: [embed] });
}

async function handleListSkills(message) {
  const guildId = message.guild?.id;
  if (!guildId) return;

  const skills = await bossfight.getAllCommonSkills(guildId);

  if (skills.length === 0) {
    return message.reply('❌ No hay habilidades comunes configuradas.\n\nUsa `*createskill` para crear una.');
  }

  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle('🔮 Habilidades Comunes')
    .setDescription(skills.map(s => 
      `**${s.name}** - Tipo: ${s.type.toUpperCase()} | Costo: ${s.spCost} ${s.usesHp ? 'HP' : 'SP'} | Daño: ${s.damage} | CD: ${s.cooldown}t`
    ).join('\n'));

  message.reply({ embeds: [embed] });
}

async function handleDeleteSkill(message, args) {
  if (!message.member?.permissions.has(PermissionsBitField.Flags.Administrator)) {
    return message.reply('❌ Solo administradores pueden eliminar habilidades.');
  }

  if (args.length < 1) {
    return message.reply('❌ Uso: `*deleteskill "<nombre>"`');
  }

  const guildId = message.guild?.id;
  if (!guildId) return;

  const fullText = args.join(' ');
  const match = fullText.match(/^"([^"]+)"$/);

  if (!match) {
    return message.reply('❌ El nombre de la habilidad debe estar entre comillas.');
  }

  const [, skillName] = match;

  const result = await bossfight.deleteCommonSkill(guildId, skillName);

  if (!result.success) {
    return message.reply(`❌ ${result.error}`);
  }

  message.reply(`✅ Habilidad **${skillName}** eliminada correctamente.`);
}

async function handleMoveTypes(message) {
  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle('⚔️ Tabla de Tipos de Ataque')
    .setDescription('Lista completa de tipos elementales disponibles en el sistema de combate:')
    .addFields(
      { name: '🔥 Agi', value: 'Fuego', inline: true },
      { name: '❄️ Bufu', value: 'Hielo', inline: true },
      { name: '⚡ Zio', value: 'Eléctrico', inline: true },
      { name: '💨 Garu', value: 'Viento', inline: true },
      { name: '💀 Eiga', value: 'Maldición', inline: true },
      { name: '✨ Hama', value: 'Luz', inline: true },
      { name: '⚔️ Physical', value: 'Físico', inline: true },
      { name: '♾️ Todo Poderoso', value: 'Sin debilidades', inline: true }
    )

  await message.reply({ embeds: [embed] });
}

const token = process.env.DISCORD_TOKEN;

if (!token) {
  console.error('❌ Error: No se encontró DISCORD_TOKEN en las variables de entorno');
  process.exit(1);
}

client.login(token);