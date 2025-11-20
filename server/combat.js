
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const bossfight = require('./bossfight');

const MAX_SESSIONS_PER_GUILD = 5;
const activeSessions = new Map();

function getSessionKey(guildId, userId) {
  return `${guildId}-${userId}`;
}

function canStartSession(guildId) {
  let count = 0;
  for (const [key] of activeSessions) {
    if (key.startsWith(guildId + '-')) {
      count++;
    }
  }
  return count < MAX_SESSIONS_PER_GUILD;
}

function createSession(guildId, channelId, userId, boss, characters) {
  const sessionKey = getSessionKey(guildId, userId);
  
  const bossClone = JSON.parse(JSON.stringify(boss));
  bossClone.currentHp = boss.hp;
  
  const charsClone = characters.map(c => {
    const clone = JSON.parse(JSON.stringify(c));
    clone.currentHp = c.hp;
    clone.currentSp = c.sp;
    clone.buffs = {};
    clone.debuffs = {};
    clone.cooldowns = {};
    return clone;
  });
  
  const session = {
    guildId,
    channelId,
    userId,
    boss: bossClone,
    characters: charsClone,
    currentCharIndex: 0,
    turn: 0,
    bossBuffs: {},
    bossDebuffs: {},
    lastActionTime: Date.now(),
    messageId: null
  };
  
  activeSessions.set(sessionKey, session);
  return session;
}

function getSession(guildId, userId) {
  return activeSessions.get(getSessionKey(guildId, userId));
}

function deleteSession(guildId, userId) {
  activeSessions.delete(getSessionKey(guildId, userId));
}

function createCombatEmbed(session) {
  const currentChar = session.characters[session.currentCharIndex];
  const boss = session.boss;
  
  const bossHpPercent = Math.floor((boss.currentHp / boss.maxHp) * 100);
  const charHpPercent = Math.floor((currentChar.currentHp / currentChar.maxHp) * 100);
  const charSpPercent = Math.floor((currentChar.currentSp / currentChar.maxSp) * 100);
  
  const embed = new EmbedBuilder()
    .setColor(0xFF0000)
    .setTitle(`⚔️ Boss Fight - Turno ${session.turn + 1}`)
    .setDescription(`**${boss.name}** VS **${currentChar.name}**`)
    .addFields(
      {
        name: `👹 ${boss.name}`,
        value: `HP: ${boss.currentHp}/${boss.maxHp} (${bossHpPercent}%)\n**Tipo:** ${boss.type.toUpperCase()}`,
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
    embed.addFields({ name: '🔮 Estados', value: buffsText.join('\n'), inline: false });
  }
  
  return embed;
}

function createActionButtons(session) {
  const currentChar = session.characters[session.currentCharIndex];
  
  const row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('combat_attack')
        .setLabel('⚔️ Atacar')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('combat_skill')
        .setLabel('🔮 Habilidad')
        .setStyle(ButtonStyle.Success)
        .setDisabled(currentChar.skills.length === 0),
      new ButtonBuilder()
        .setCustomId('combat_defend')
        .setLabel('🛡️ Defender')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('combat_surrender')
        .setLabel('🏳️ Rendirse')
        .setStyle(ButtonStyle.Danger)
    );
  
  return [row];
}

function performBossAction(session) {
  const boss = session.boss;
  const currentChar = session.characters[session.currentCharIndex];
  
  let selectedSkill = null;
  
  if (boss.skills && boss.skills.length > 0) {
    const availableSkills = boss.skills.filter(s => !s.currentCooldown || s.currentCooldown <= 0);
    
    if (availableSkills.length > 0) {
      selectedSkill = availableSkills[Math.floor(Math.random() * availableSkills.length)];
    }
  }
  
  let damage = 0;
  let action = '';
  
  if (selectedSkill) {
    const stats = applyBuffs(boss, session.bossBuffs, session.bossDebuffs);
    const dmgResult = bossfight.calculateDamage(
      stats,
      currentChar,
      {
        skillType: selectedSkill.type,
        skillDamage: selectedSkill.damage,
        weaknesses: currentChar.weaknesses,
        resistances: currentChar.resistances,
        reflects: currentChar.reflects
      }
    );
    
    damage = dmgResult.damage;
    currentChar.currentHp -= damage;
    if (currentChar.currentHp < 0) currentChar.currentHp = 0;
    
    if (selectedSkill.effect) {
      const [effectType, effectTarget] = selectedSkill.effect.split('_');
      if (effectTarget === 'up') {
        session.bossBuffs[selectedSkill.effect] = 3;
      } else if (effectTarget === 'down') {
        currentChar.debuffs[selectedSkill.effect] = 3;
      }
    }
    
    if (selectedSkill.cooldown > 0) {
      selectedSkill.currentCooldown = selectedSkill.cooldown;
    }
    
    action = `usó **${selectedSkill.name}**`;
  } else {
    const stats = applyBuffs(boss, session.bossBuffs, session.bossDebuffs);
    const dmgResult = bossfight.calculateDamage(
      stats,
      currentChar,
      {
        weaknesses: currentChar.weaknesses,
        resistances: currentChar.resistances,
        reflects: currentChar.reflects
      }
    );
    
    damage = dmgResult.damage;
    currentChar.currentHp -= damage;
    if (currentChar.currentHp < 0) currentChar.currentHp = 0;
    
    action = 'atacó';
  }
  
  if (boss.skills) {
    for (const skill of boss.skills) {
      if (skill.currentCooldown && skill.currentCooldown > 0) {
        skill.currentCooldown--;
      }
    }
  }
  
  return { action, damage };
}

function applyBuffs(character, buffs = null, debuffs = null) {
  const stats = {
    atk: character.atk,
    def: character.def,
    spd: character.spd,
    type: character.type
  };
  
  const effectiveBuffs = buffs || character.buffs || {};
  const effectiveDebuffs = debuffs || character.debuffs || {};
  
  if (effectiveBuffs.atk_up) stats.atk = Math.floor(stats.atk * 1.3);
  if (effectiveBuffs.def_up) stats.def = Math.floor(stats.def * 1.3);
  if (effectiveBuffs.spd_up) stats.spd = Math.floor(stats.spd * 1.3);
  
  if (effectiveDebuffs.atk_down) stats.atk = Math.floor(stats.atk * 0.7);
  if (effectiveDebuffs.def_down) stats.def = Math.floor(stats.def * 0.7);
  if (effectiveDebuffs.spd_down) stats.spd = Math.floor(stats.spd * 0.7);
  
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

function regenerateSP(session) {
  if (session.turn % 3 === 0 && session.turn > 0) {
    const currentChar = session.characters[session.currentCharIndex];
    currentChar.currentSp = Math.min(currentChar.currentSp + 10, currentChar.maxSp);
    return true;
  }
  return false;
}

module.exports = {
  MAX_SESSIONS_PER_GUILD,
  canStartSession,
  createSession,
  getSession,
  deleteSession,
  createCombatEmbed,
  createActionButtons,
  performBossAction,
  applyBuffs,
  decrementBuffsDebuffs,
  regenerateSP
};
