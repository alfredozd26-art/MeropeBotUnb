const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const { calculateDamage } = require('./bossfight');

const activeSessions = new Map();
const MAX_SESSIONS_PER_GUILD = 5;
const TURN_TIMEOUT = 60000;

function getActiveSessions(guildId) {
  if (!activeSessions.has(guildId)) {
    activeSessions.set(guildId, new Map());
  }
  return activeSessions.get(guildId);
}

function canStartSession(guildId) {
  const sessions = getActiveSessions(guildId);
  return sessions.size < MAX_SESSIONS_PER_GUILD;
}

function createSession(guildId, channelId, userId, boss, characters) {
  const sessions = getActiveSessions(guildId);
  
  const session = {
    channelId,
    userId,
    boss: JSON.parse(JSON.stringify(boss)),
    characters: characters.map(c => ({
      ...JSON.parse(JSON.stringify(c)),
      buffs: {},
      debuffs: {},
      cooldowns: {},
      currentHp: c.hp,
      currentSp: c.sp
    })),
    currentCharIndex: 0,
    turn: 0,
    bossCooldowns: {},
    bossBuffs: {},
    bossDebuffs: {},
    startTime: Date.now(),
    lastActionTime: Date.now(),
    rewards: 0
  };
  
  sessions.set(userId, session);
  return session;
}

function getSession(guildId, userId) {
  const sessions = getActiveSessions(guildId);
  return sessions.get(userId);
}

function deleteSession(guildId, userId) {
  const sessions = getActiveSessions(guildId);
  sessions.delete(userId);
}

function applyBuffs(character) {
  const stats = {
    atk: character.atk,
    def: character.def,
    spd: character.spd,
    type: character.type
  };
  
  if (character.buffs && character.buffs.atk_up) stats.atk *= 1.3;
  if (character.buffs && character.buffs.def_up) stats.def *= 1.3;
  if (character.buffs && character.buffs.spd_up) stats.spd *= 1.3;
  
  if (character.debuffs && character.debuffs.atk_down) stats.atk *= 0.7;
  if (character.debuffs && character.debuffs.def_down) stats.def *= 0.7;
  if (character.debuffs && character.debuffs.spd_down) stats.spd *= 0.7;
  
  return stats;
}

function decrementBuffsDebuffs(entity) {
  for (const buff in entity.buffs) {
    entity.buffs[buff]--;
    if (entity.buffs[buff] <= 0) {
      delete entity.buffs[buff];
    }
  }
  
  for (const debuff in entity.debuffs) {
    entity.debuffs[debuff]--;
    if (entity.debuffs[debuff] <= 0) {
      delete entity.debuffs[debuff];
    }
  }
}

function createCombatEmbed(session) {
  const currentChar = session.characters[session.currentCharIndex];
  const boss = session.boss;
  
  const bossHpPercent = Math.floor((boss.hp / boss.maxHp) * 100);
  const charHpPercent = Math.floor((currentChar.currentHp / currentChar.maxHp) * 100);
  const charSpPercent = Math.floor((currentChar.currentSp / currentChar.maxSp) * 100);
  
  const embed = new EmbedBuilder()
    .setColor(0xFF0000)
    .setTitle(`⚔️ Boss Fight - Turno ${session.turn + 1}`)
    .setDescription(`**${boss.name}** VS **${currentChar.name}**`)
    .addFields(
      {
        name: `👹 ${boss.name}`,
        value: `HP: ${boss.hp}/${boss.maxHp} (${bossHpPercent}%)\n**Tipo:** ${boss.type.toUpperCase()}`,
        inline: true
      },
      {
        name: `⚔️ ${currentChar.name}`,
        value: `HP: ${currentChar.currentHp}/${currentChar.maxHp} (${charHpPercent}%)\nSP: ${currentChar.currentSp}/${currentChar.maxSp} (${charSpPercent}%)\n**Tipo:** ${currentChar.type.toUpperCase()}`,
        inline: true
      }
    )
    .setFooter({ text: 'Tienes 60 segundos para actuar' });
  
  const buffsText = [];
  if (Object.keys(currentChar.buffs).length > 0) {
    buffsText.push('**Buffs:** ' + Object.entries(currentChar.buffs).map(([k, v]) => `${k} (${v}t)`).join(', '));
  }
  if (Object.keys(currentChar.debuffs).length > 0) {
    buffsText.push('**Debuffs:** ' + Object.entries(currentChar.debuffs).map(([k, v]) => `${k} (${v}t)`).join(', '));
  }
  if (buffsText.length > 0) {
    embed.addFields({ name: '📊 Estado', value: buffsText.join('\n'), inline: false });
  }
  
  return embed;
}

function createActionButtons(session) {
  const currentChar = session.characters[session.currentCharIndex];
  
  const row1 = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('combat_attack')
        .setLabel('⚔️ Atacar')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId('combat_skill')
        .setLabel('✨ Habilidad')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(currentChar.skills.length === 0),
      new ButtonBuilder()
        .setCustomId('combat_defend')
        .setLabel('🛡️ Defender')
        .setStyle(ButtonStyle.Secondary)
    );
  
  const row2 = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('combat_surrender')
        .setLabel('🏳️ Rendirse')
        .setStyle(ButtonStyle.Danger)
    );
  
  return [row1, row2];
}

function performBossAction(session) {
  const boss = session.boss;
  const currentChar = session.characters[session.currentCharIndex];
  
  const availableSkills = boss.skills.filter(s => !session.bossCooldowns[s.name] || session.bossCooldowns[s.name] <= 0);
  
  let action;
  let result = {};
  
  if (availableSkills.length > 0 && Math.random() > 0.4) {
    const skill = availableSkills[Math.floor(Math.random() * availableSkills.length)];
    
    const bossStats = applyBuffs({ ...boss, buffs: session.bossBuffs, debuffs: session.bossDebuffs });
    const charStats = applyBuffs(currentChar);
    
    const dmgResult = calculateDamage(
      { ...bossStats, type: skill.type },
      charStats,
      {
        skillType: skill.type,
        skillDamage: skill.damage,
        weaknesses: currentChar.weaknesses,
        resistances: currentChar.resistances,
        reflects: currentChar.reflects
      }
    );
    
    currentChar.currentHp -= dmgResult.damage;
    if (currentChar.currentHp < 0) currentChar.currentHp = 0;
    
    if (dmgResult.isReflect) {
      boss.hp -= dmgResult.reflected;
      if (boss.hp < 0) boss.hp = 0;
    }
    
    if (skill.effect) {
      const [effectType, effectTarget] = skill.effect.split('_');
      if (effectTarget === 'down') {
        currentChar.debuffs[skill.effect] = 3;
      } else if (effectTarget === 'up') {
        session.bossBuffs[skill.effect] = 3;
      }
    }
    
    session.bossCooldowns[skill.name] = skill.cooldown;
    
    result = {
      action: `usó **${skill.name}**`,
      damage: dmgResult.damage,
      reflected: dmgResult.reflected,
      isReflect: dmgResult.isReflect,
      effect: skill.effect
    };
  } else {
    const bossStats = applyBuffs({ ...boss, buffs: session.bossBuffs, debuffs: session.bossDebuffs });
    const charStats = applyBuffs(currentChar);
    
    const dmgResult = calculateDamage(
      bossStats,
      charStats,
      {
        weaknesses: currentChar.weaknesses,
        resistances: currentChar.resistances,
        reflects: currentChar.reflects
      }
    );
    
    currentChar.currentHp -= dmgResult.damage;
    if (currentChar.currentHp < 0) currentChar.currentHp = 0;
    
    if (dmgResult.isReflect) {
      boss.hp -= dmgResult.reflected;
      if (boss.hp < 0) boss.hp = 0;
    }
    
    result = {
      action: 'atacó',
      damage: dmgResult.damage,
      reflected: dmgResult.reflected,
      isReflect: dmgResult.isReflect
    };
  }
  
  for (const skill in session.bossCooldowns) {
    session.bossCooldowns[skill]--;
  }
  
  return result;
}

function regenerateSP(session) {
  if (session.turn % 3 === 0 && session.turn > 0) {
    for (const char of session.characters) {
      char.currentSp = Math.min(char.currentSp + 10, char.maxSp);
    }
    return true;
  }
  return false;
}

function cleanupInactiveSessions() {
  const now = Date.now();
  for (const [guildId, sessions] of activeSessions.entries()) {
    for (const [userId, session] of sessions.entries()) {
      if (now - session.lastActionTime > 120000) {
        sessions.delete(userId);
      }
    }
  }
}

setInterval(cleanupInactiveSessions, 60000);

module.exports = {
  getActiveSessions,
  canStartSession,
  createSession,
  getSession,
  deleteSession,
  applyBuffs,
  decrementBuffsDebuffs,
  createCombatEmbed,
  createActionButtons,
  performBossAction,
  regenerateSP,
  MAX_SESSIONS_PER_GUILD
};
