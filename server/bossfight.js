
const storage = require('./storage');

// Obtener personaje del gacha con stats de combate
async function getCharacterFromItem(guildId, itemName) {
  const item = await storage.getItemByName(guildId, itemName);
  if (!item) {
    return null;
  }
  
  // Si no tiene stats de combate, inicializarlos con valores por defecto
  if (!item.bfStats) {
    return {
      name: item.name,
      hp: 500,
      maxHp: 500,
      atk: 100,
      def: 80,
      spd: 100,
      type: 'physical',
      sp: 100,
      maxSp: 100,
      skills: [],
      weaknesses: [],
      resistances: [],
      reflects: {}
    };
  }
  
  return {
    name: item.name,
    ...item.bfStats
  };
}

// Editar stats de combate de un personaje del gacha
async function editCharacterBFStats(guildId, charName, field, value) {
  const item = await storage.getItemByName(guildId, charName);
  
  if (!item) {
    return { success: false, error: 'Personaje no encontrado en el gacha' };
  }
  
  const validFields = ['hp', 'atk', 'def', 'spd', 'sp', 'type'];
  if (!validFields.includes(field)) {
    return { success: false, error: 'Campo inválido' };
  }
  
  if (field !== 'type' && (value > 1000 || value < 1)) {
    return { success: false, error: 'El valor debe estar entre 1 y 1000' };
  }
  
  if (!item.bfStats) {
    item.bfStats = {
      hp: 500,
      maxHp: 500,
      atk: 100,
      def: 80,
      spd: 100,
      type: 'physical',
      sp: 100,
      maxSp: 100,
      skills: [],
      weaknesses: [],
      resistances: [],
      reflects: {}
    };
  }
  
  if (field === 'hp') {
    item.bfStats.hp = value;
    item.bfStats.maxHp = value;
  } else if (field === 'sp') {
    item.bfStats.sp = value;
    item.bfStats.maxSp = value;
  } else {
    item.bfStats[field] = field === 'type' ? value.toLowerCase() : value;
  }
  
  await storage.updateItem(guildId, item.name, 'bfStats', item.bfStats);
  
  return { success: true };
}

// Configurar debilidad
async function setCharacterWeakness(guildId, charName, type) {
  const item = await storage.getItemByName(guildId, charName);
  
  if (!item) {
    return { success: false, error: 'Personaje no encontrado' };
  }
  
  if (!item.bfStats) {
    item.bfStats = {
      hp: 500,
      maxHp: 500,
      atk: 100,
      def: 80,
      spd: 100,
      type: 'physical',
      sp: 100,
      maxSp: 100,
      skills: [],
      weaknesses: [],
      resistances: [],
      reflects: {}
    };
  }
  
  if (!item.bfStats.weaknesses.includes(type.toLowerCase())) {
    item.bfStats.weaknesses.push(type.toLowerCase());
  }
  
  await storage.updateItem(guildId, item.name, 'bfStats', item.bfStats);
  
  return { success: true };
}

// Configurar resistencia
async function setCharacterResistance(guildId, charName, type) {
  const item = await storage.getItemByName(guildId, charName);
  
  if (!item) {
    return { success: false, error: 'Personaje no encontrado' };
  }
  
  if (!item.bfStats) {
    item.bfStats = {
      hp: 500,
      maxHp: 500,
      atk: 100,
      def: 80,
      spd: 100,
      type: 'physical',
      sp: 100,
      maxSp: 100,
      skills: [],
      weaknesses: [],
      resistances: [],
      reflects: {}
    };
  }
  
  if (!item.bfStats.resistances.includes(type.toLowerCase())) {
    item.bfStats.resistances.push(type.toLowerCase());
  }
  
  await storage.updateItem(guildId, item.name, 'bfStats', item.bfStats);
  
  return { success: true };
}

// Configurar reflect
async function setCharacterReflect(guildId, charName, type, percentage) {
  const item = await storage.getItemByName(guildId, charName);
  
  if (!item) {
    return { success: false, error: 'Personaje no encontrado' };
  }
  
  if (percentage < 0 || percentage > 100) {
    return { success: false, error: 'El porcentaje debe estar entre 0 y 100' };
  }
  
  if (!item.bfStats) {
    item.bfStats = {
      hp: 500,
      maxHp: 500,
      atk: 100,
      def: 80,
      spd: 100,
      type: 'physical',
      sp: 100,
      maxSp: 100,
      skills: [],
      weaknesses: [],
      resistances: [],
      reflects: {}
    };
  }
  
  item.bfStats.reflects[type.toLowerCase()] = percentage;
  
  await storage.updateItem(guildId, item.name, 'bfStats', item.bfStats);
  
  return { success: true };
}

// Equipar habilidad
async function equipSkill(guildId, charName, skillName) {
  const item = await storage.getItemByName(guildId, charName);
  
  if (!item) {
    return { success: false, error: 'Personaje no encontrado' };
  }
  
  const skills = await getAllCommonSkills(guildId);
  const skill = skills.find(s => s.name.toLowerCase() === skillName.toLowerCase());
  
  if (!skill) {
    return { success: false, error: 'Habilidad no encontrada' };
  }
  
  if (!item.bfStats) {
    item.bfStats = {
      hp: 500,
      maxHp: 500,
      atk: 100,
      def: 80,
      spd: 100,
      type: 'physical',
      sp: 100,
      maxSp: 100,
      skills: [],
      weaknesses: [],
      resistances: [],
      reflects: {}
    };
  }
  
  if (item.bfStats.skills.length >= 3) {
    return { success: false, error: 'Máximo 3 habilidades por personaje' };
  }
  
  if (!item.bfStats.skills.includes(skill.name)) {
    item.bfStats.skills.push(skill.name);
  }
  
  await storage.updateItem(guildId, item.name, 'bfStats', item.bfStats);
  
  return { success: true };
}

// Obtener personajes del usuario (solo los que tiene rol)
async function getUserCharacters(guildId, userId, guild, member) {
  const items = await storage.getAllItems(guildId);
  const userChars = [];
  
  for (const item of items) {
    const objectType = (item.objectType || 'personaje').toLowerCase();
    if (objectType !== 'personaje') continue;
    
    // Verificar si tiene el rol
    if (item.roleGiven) {
      let roleToCheck = guild.roles.cache.find((r) => r.name === item.roleGiven);
      
      if (!roleToCheck) {
        const roleMentionMatch = item.roleGiven?.match(/<@&(\d+)>/);
        if (roleMentionMatch) {
          roleToCheck = guild.roles.cache.get(roleMentionMatch[1]);
        }
      }
      
      if (!roleToCheck && item.roleGiven) {
        roleToCheck = guild.roles.cache.get(item.roleGiven);
      }
      
      if (roleToCheck && member.roles.cache.has(roleToCheck.id)) {
        const char = await getCharacterFromItem(guildId, item.name);
        if (char) {
          userChars.push(char);
        }
      }
    }
  }
  
  return userChars;
}

// Obtener todas las habilidades comunes
async function getAllCommonSkills(guildId) {
  const filePath = storage.getFilePath(guildId, 'common_skills');
  const data = await storage.readJSON(filePath, { skills: [] });
  return data.skills || [];
}

// Crear habilidad común
async function createCommonSkill(guildId, name, type, spCost, damage, effect, duration, cooldown, usesHp) {
  const skills = await getAllCommonSkills(guildId);
  
  if (skills.find(s => s.name.toLowerCase() === name.toLowerCase())) {
    return { success: false, error: 'Ya existe una habilidad con ese nombre' };
  }
  
  const skill = {
    name,
    type: type.toLowerCase(),
    spCost,
    damage,
    effect: effect || null,
    duration: duration || 0,
    cooldown: cooldown || 0,
    usesHp: usesHp || false
  };
  
  skills.push(skill);
  
  const filePath = storage.getFilePath(guildId, 'common_skills');
  await storage.writeJSON(filePath, { skills });
  
  return { success: true, skill };
}

// Eliminar habilidad común
async function deleteCommonSkill(guildId, skillName) {
  const skills = await getAllCommonSkills(guildId);
  const skillIndex = skills.findIndex(s => s.name.toLowerCase() === skillName.toLowerCase());
  
  if (skillIndex === -1) {
    return { success: false, error: 'Habilidad no encontrada' };
  }
  
  skills.splice(skillIndex, 1);
  
  const filePath = storage.getFilePath(guildId, 'common_skills');
  await storage.writeJSON(filePath, { skills });
  
  return { success: true };
}

// Crear boss
async function createBoss(guildId, name, hp, atk, def, spd, type) {
  if (hp > 1000 || atk > 1000 || def > 1000 || spd > 1000) {
    return { success: false, error: 'Los stats no pueden exceder 1000' };
  }
  
  const bosses = await getAllBosses(guildId);
  if (bosses.find(b => b.name.toLowerCase() === name.toLowerCase())) {
    return { success: false, error: 'Ya existe un boss con ese nombre' };
  }
  
  const boss = {
    name,
    hp,
    maxHp: hp,
    atk,
    def,
    spd,
    type: type.toLowerCase(),
    skills: [],
    weaknesses: [],
    resistances: [],
    reflects: {}
  };
  
  const filePath = storage.getFilePath(guildId, 'bosses');
  const data = await storage.readJSON(filePath, { bosses: [] });
  
  if (!data.bosses) {
    data.bosses = [];
  }
  
  data.bosses.push(boss);
  await storage.writeJSON(filePath, data);
  
  return { success: true, boss };
}

// Obtener todos los bosses
async function getAllBosses(guildId) {
  const filePath = storage.getFilePath(guildId, 'bosses');
  const data = await storage.readJSON(filePath, { bosses: [] });
  return data.bosses || [];
}

// Editar boss
async function editBoss(guildId, bossName, field, value) {
  const bosses = await getAllBosses(guildId);
  const boss = bosses.find(b => b.name.toLowerCase() === bossName.toLowerCase());
  
  if (!boss) {
    return { success: false, error: 'Boss no encontrado' };
  }
  
  const validFields = ['hp', 'atk', 'def', 'spd'];
  if (!validFields.includes(field)) {
    return { success: false, error: 'Campo inválido' };
  }
  
  if (value > 1000 || value < 1) {
    return { success: false, error: 'El valor debe estar entre 1 y 1000' };
  }
  
  if (field === 'hp') {
    boss.hp = value;
    boss.maxHp = value;
  } else {
    boss[field] = value;
  }
  
  const filePath = storage.getFilePath(guildId, 'bosses');
  await storage.writeJSON(filePath, { bosses });
  
  return { success: true };
}

// Configurar debilidad del boss
async function setBossWeakness(guildId, bossName, type) {
  const bosses = await getAllBosses(guildId);
  const boss = bosses.find(b => b.name.toLowerCase() === bossName.toLowerCase());
  
  if (!boss) {
    return { success: false, error: 'Boss no encontrado' };
  }
  
  if (!boss.weaknesses.includes(type.toLowerCase())) {
    boss.weaknesses.push(type.toLowerCase());
  }
  
  const filePath = storage.getFilePath(guildId, 'bosses');
  await storage.writeJSON(filePath, { bosses });
  
  return { success: true };
}

// Configurar resistencia del boss
async function setBossResistance(guildId, bossName, type) {
  const bosses = await getAllBosses(guildId);
  const boss = bosses.find(b => b.name.toLowerCase() === bossName.toLowerCase());
  
  if (!boss) {
    return { success: false, error: 'Boss no encontrado' };
  }
  
  if (!boss.resistances.includes(type.toLowerCase())) {
    boss.resistances.push(type.toLowerCase());
  }
  
  const filePath = storage.getFilePath(guildId, 'bosses');
  await storage.writeJSON(filePath, { bosses });
  
  return { success: true };
}

// Configurar reflect del boss
async function setBossReflect(guildId, bossName, type, percentage) {
  const bosses = await getAllBosses(guildId);
  const boss = bosses.find(b => b.name.toLowerCase() === bossName.toLowerCase());
  
  if (!boss) {
    return { success: false, error: 'Boss no encontrado' };
  }
  
  if (percentage < 0 || percentage > 100) {
    return { success: false, error: 'El porcentaje debe estar entre 0 y 100' };
  }
  
  boss.reflects[type.toLowerCase()] = percentage;
  
  const filePath = storage.getFilePath(guildId, 'bosses');
  await storage.writeJSON(filePath, { bosses });
  
  return { success: true };
}

// Agregar habilidad al boss
async function addBossSkill(guildId, bossName, skillName, type, damage, effect, cooldown) {
  const bosses = await getAllBosses(guildId);
  const boss = bosses.find(b => b.name.toLowerCase() === bossName.toLowerCase());
  
  if (!boss) {
    return { success: false, error: 'Boss no encontrado' };
  }
  
  if (boss.skills.length >= 3) {
    return { success: false, error: 'Máximo 3 habilidades por boss' };
  }
  
  const skill = {
    name: skillName,
    type: type.toLowerCase(),
    damage,
    effect: effect || null,
    cooldown: cooldown || 0,
    currentCooldown: 0
  };
  
  boss.skills.push(skill);
  
  const filePath = storage.getFilePath(guildId, 'bosses');
  await storage.writeJSON(filePath, { bosses });
  
  return { success: true };
}

// Eliminar habilidad del boss
async function deleteBossSkill(guildId, bossName, skillName) {
  const bosses = await getAllBosses(guildId);
  const boss = bosses.find(b => b.name.toLowerCase() === bossName.toLowerCase());
  
  if (!boss) {
    return { success: false, error: 'Boss no encontrado' };
  }
  
  const skillIndex = boss.skills.findIndex(s => s.name.toLowerCase() === skillName.toLowerCase());
  
  if (skillIndex === -1) {
    return { success: false, error: 'Habilidad no encontrada' };
  }
  
  boss.skills.splice(skillIndex, 1);
  
  const filePath = storage.getFilePath(guildId, 'bosses');
  await storage.writeJSON(filePath, { bosses });
  
  return { success: true };
}

// Calcular daño
function calculateDamage(attacker, defender, options = {}) {
  const { skillType, skillDamage, weaknesses = [], resistances = [], reflects = {} } = options;
  
  let baseDamage = attacker.atk - defender.def;
  if (baseDamage < 1) baseDamage = 1;
  
  if (skillDamage) {
    baseDamage = skillDamage;
  }
  
  const attackType = skillType || attacker.type;
  let multiplier = 1;
  let isReflect = false;
  let reflected = 0;
  
  if (weaknesses.includes(attackType)) {
    multiplier = 1.5;
  } else if (resistances.includes(attackType)) {
    multiplier = 0.5;
  } else if (reflects[attackType]) {
    isReflect = true;
    reflected = Math.floor(baseDamage * (reflects[attackType] / 100));
    baseDamage = 0;
  }
  
  const finalDamage = Math.floor(baseDamage * multiplier);
  
  return { damage: finalDamage, isReflect, reflected };
}

module.exports = {
  getCharacterFromItem,
  editCharacterBFStats,
  setCharacterWeakness,
  setCharacterResistance,
  setCharacterReflect,
  equipSkill,
  getUserCharacters,
  getAllCommonSkills,
  createCommonSkill,
  deleteCommonSkill,
  createBoss,
  getAllBosses,
  editBoss,
  setBossWeakness,
  setBossResistance,
  setBossReflect,
  addBossSkill,
  deleteBossSkill,
  calculateDamage
};
