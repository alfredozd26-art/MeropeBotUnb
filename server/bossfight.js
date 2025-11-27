const storage = require('./storage');

// Tipos válidos de elementos
const VALID_TYPES = ['agi', 'bufu', 'zio', 'garu', 'eiga', 'hama', 'physical', 'todopoderoso'];

const typeEmojis = {
    'agi': '🔥',
    'bufu': '❄️',
    'zio': '⚡',
    'garu': '💨',
    'eiga': '💀',
    'hama': '✨',
    'physical': '⚔️',
    'todopoderoso': '♾️'
  };


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
      currentHp: 500,
      atk: 100,
      def: 80,
      spd: 100,
      type: 'physical',
      sp: 100,
      maxSp: 100,
      currentSp: 100,
      skills: [],
      weaknesses: [],
      resistances: [],
      reflects: {},
      buffs: {},
      debuffs: {},
      cooldowns: {}
    };
  }

  return {
    name: item.name,
    hp: item.bfStats.hp || 500,
    maxHp: item.bfStats.hp || 500,
    currentHp: item.bfStats.hp || 500,
    atk: item.bfStats.atk || 100,
    def: item.bfStats.def || 80,
    spd: item.bfStats.spd || 100,
    type: item.bfStats.type || 'physical',
    sp: item.bfStats.sp || 100,
    maxSp: item.bfStats.sp || 100,
    currentSp: item.bfStats.sp || 100,
    skills: item.bfStats.skills || [],
    weaknesses: item.bfStats.weaknesses || [],
    resistances: item.bfStats.resistances || [],
    reflects: item.bfStats.reflects || {},
    buffs: {},
    debuffs: {},
    cooldowns: {}
  };
}

// Editar stats de combate de un personaje del gacha
async function editCharacterBFStats(guildId, charName, field, value) {
  const allItems = await storage.getAllItems(guildId);
  const { searchItemByPartialName } = require('../utils/itemSearch');
  const item = searchItemByPartialName(allItems, charName);

  if (!item) {
    return { success: false, error: 'Personaje no encontrado en el gacha' };
  }

  const validFields = ['hp', 'atk', 'def', 'spd', 'sp', 'type'];
  if (!validFields.includes(field)) {
    return { success: false, error: 'Campo inválido. Use: hp, atk, def, spd, sp, type' };
  }

  if (field === 'type') {
    const typeValue = value.toLowerCase();
    if (!VALID_TYPES.includes(typeValue)) {
      return { success: false, error: `Tipo inválido. Tipos válidos: ${VALID_TYPES.join(', ')}` };
    }
  } else if (value > 4000 || value < 1) { // Changed limit to 4000
    return { success: false, error: 'El valor debe estar entre 1 y 4000' }; // Updated error message
  }

  if (!item.bfStats) {
    item.bfStats = {
      hp: 500,
      atk: 100,
      def: 80,
      spd: 100,
      type: 'physical',
      sp: 100,
      skills: [],
      weaknesses: [],
      resistances: [],
      reflects: {}
    };
  }

  if (field === 'hp') {
    item.bfStats.hp = parseInt(value); // Ensure value is an integer
  } else if (field === 'sp') {
    item.bfStats.sp = parseInt(value); // Ensure value is an integer
  } else {
    item.bfStats[field] = field === 'type' ? value.toLowerCase() : parseInt(value); // Ensure value is an integer for stats
  }

  await storage.updateItem(guildId, item.name, 'bfStats', item.bfStats);

  return { success: true };
}

// Configurar debilidad
async function setCharacterWeakness(guildId, charName, type) {
  const allItems = await storage.getAllItems(guildId);
  const { searchItemByPartialName } = require('../utils/itemSearch');
  const item = searchItemByPartialName(allItems, charName);

  if (!item) {
    return { success: false, error: 'Personaje no encontrado' };
  }

  const typeValue = type.toLowerCase();
  if (!VALID_TYPES.includes(typeValue)) {
    return { success: false, error: `Tipo inválido. Tipos válidos: ${VALID_TYPES.join(', ')}` };
  }

  if (!item.bfStats) {
    item.bfStats = {
      hp: 500,
      atk: 100,
      def: 80,
      spd: 100,
      type: 'physical',
      sp: 100,
      skills: [],
      weaknesses: [],
      resistances: [],
      reflects: {}
    };
  }

  if (!item.bfStats.weaknesses.includes(typeValue)) {
    item.bfStats.weaknesses.push(typeValue);
  }

  await storage.updateItem(guildId, item.name, 'bfStats', item.bfStats);

  return { success: true };
}

// Configurar resistencia
async function setCharacterResistance(guildId, charName, type) {
  const allItems = await storage.getAllItems(guildId);
  const { searchItemByPartialName } = require('../utils/itemSearch');
  const item = searchItemByPartialName(allItems, charName);

  if (!item) {
    return { success: false, error: 'Personaje no encontrado' };
  }

  const typeValue = type.toLowerCase();
  if (!VALID_TYPES.includes(typeValue)) {
    return { success: false, error: `Tipo inválido. Tipos válidos: ${VALID_TYPES.join(', ')}` };
  }

  if (!item.bfStats) {
    item.bfStats = {
      hp: 500,
      atk: 100,
      def: 80,
      spd: 100,
      type: 'physical',
      sp: 100,
      skills: [],
      weaknesses: [],
      resistances: [],
      reflects: {}
    };
  }

  if (!item.bfStats.resistances.includes(typeValue)) {
    item.bfStats.resistances.push(typeValue);
  }

  await storage.updateItem(guildId, item.name, 'bfStats', item.bfStats);

  return { success: true };
}

// Configurar reflect
async function setCharacterReflect(guildId, charName, type, percentage) {
  const allItems = await storage.getAllItems(guildId);
  const { searchItemByPartialName } = require('../utils/itemSearch');
  const item = searchItemByPartialName(allItems, charName);

  if (!item) {
    return { success: false, error: 'Personaje no encontrado' };
  }

  const typeValue = type.toLowerCase();
  if (!VALID_TYPES.includes(typeValue)) {
    return { success: false, error: `Tipo inválido. Tipos válidos: ${VALID_TYPES.join(', ')}` };
  }

  if (percentage < 0 || percentage > 100) {
    return { success: false, error: 'El porcentaje debe estar entre 0 y 100' };
  }

  if (!item.bfStats) {
    item.bfStats = {
      hp: 500,
      atk: 100,
      def: 80,
      spd: 100,
      type: 'physical',
      sp: 100,
      skills: [],
      weaknesses: [],
      resistances: [],
      reflects: {}
    };
  }

  item.bfStats.reflects[typeValue] = percentage;

  await storage.updateItem(guildId, item.name, 'bfStats', item.bfStats);

  return { success: true };
}

// Equipar habilidad
async function equipSkill(guildId, charName, skillName) {
  const allItems = await storage.getAllItems(guildId);
  const { searchItemByPartialName } = require('../utils/itemSearch');
  const item = searchItemByPartialName(allItems, charName);

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
      atk: 100,
      def: 80,
      spd: 100,
      type: 'physical',
      sp: 100,
      skills: [],
      weaknesses: [],
      resistances: [],
      reflects: {}
    };
  }

  if (item.bfStats.skills.length >= 3) {
    return { success: false, error: 'Máximo 3 habilidades por personaje' };
  }

  if (item.bfStats.skills.includes(skill.name)) {
    return { success: false, error: 'Esta habilidad ya está equipada' };
  }

  item.bfStats.skills.push(skill.name);

  await storage.updateItem(guildId, item.name, 'bfStats', item.bfStats);

  return { success: true };
}

// Obtener moveset completo de un personaje
async function getCharacterMoveset(guildId, charName) {
  const allItems = await storage.getAllItems(guildId);
  const { searchItemByPartialName } = require('../utils/itemSearch');
  const item = searchItemByPartialName(allItems, charName);

  if (!item) {
    return { success: false, error: 'Personaje no encontrado' };
  }

  const objectType = (item.objectType || 'personaje').toLowerCase();
  if (objectType !== 'personaje') {
    return { success: false, error: 'Este item no es un personaje' };
  }

  const bfStats = item.bfStats || {
    hp: 500,
    atk: 100,
    def: 80,
    spd: 100,
    type: 'physical',
    sp: 100,
    skills: [],
    weaknesses: [],
    resistances: [],
    reflects: {}
  };

  const skills = await getAllCommonSkills(guildId);
  const equippedSkills = bfStats.skills.map(skillName => 
    skills.find(s => s.name === skillName)
  ).filter(s => s);

  return {
    success: true,
    character: {
      name: item.name,
      type: bfStats.type || 'physical',
      hp: bfStats.hp || 500,
      atk: bfStats.atk || 100,
      def: bfStats.def || 80,
      spd: bfStats.spd || 100,
      sp: bfStats.sp || 100,
      weaknesses: bfStats.weaknesses || [],
      resistances: bfStats.resistances || [],
      reflects: bfStats.reflects || {},
      skills: equippedSkills
    }
  };
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
    reflects: {},
    reward: 1000,
    difficulty: 'normal'
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

// Configurar recompensa del boss
async function setBossReward(guildId, bossName, reward) {
  const bosses = await getAllBosses(guildId);
  const boss = bosses.find(b => b.name.toLowerCase() === bossName.toLowerCase());

  if (!boss) {
    return { success: false, error: 'Boss no encontrado' };
  }

  if (reward < 0) {
    return { success: false, error: 'La recompensa debe ser un número positivo' };
  }

  boss.reward = reward;

  const filePath = storage.getFilePath(guildId, 'bosses');
  await storage.writeJSON(filePath, { bosses });

  return { success: true };
}

// Configurar dificultad del boss
async function setBossDifficulty(guildId, bossName, difficulty) {
  const bosses = await getAllBosses(guildId);
  const boss = bosses.find(b => b.name.toLowerCase() === bossName.toLowerCase());

  if (!boss) {
    return { success: false, error: 'Boss no encontrado' };
  }

  const validDifficulties = ['facil', 'normal', 'dificil', 'extremo'];
  const difficultyValue = difficulty.toLowerCase();

  if (!validDifficulties.includes(difficultyValue)) {
    return { success: false, error: `Dificultad inválida. Usa: facil, normal, dificil, extremo` };
  }

  boss.difficulty = difficultyValue;

  const filePath = storage.getFilePath(guildId, 'bosses');
  await storage.writeJSON(filePath, { bosses });

  return { success: true };
}

// Configurar precio de recompensa del boss
async function setBossPrice(guildId, bossName, price) {
  const bosses = await getAllBosses(guildId);
  const boss = bosses.find(b => b.name.toLowerCase() === bossName.toLowerCase());

  if (!boss) {
    return { success: false, error: 'Boss no encontrado' };
  }

  if (price < 0) {
    return { success: false, error: 'El precio debe ser un número positivo' };
  }

  boss.price = price;

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
  VALID_TYPES,
  getCharacterFromItem,
  editCharacterBFStats,
  setCharacterWeakness,
  setCharacterResistance,
  setCharacterReflect,
  equipSkill,
  getCharacterMoveset,
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
  setBossReward,
  setBossDifficulty,
  setBossPrice,
  calculateDamage
};