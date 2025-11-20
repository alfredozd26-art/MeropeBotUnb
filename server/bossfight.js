
const storage = require('./storage');

// Crear personaje
async function createCharacter(guildId, userId, name, hp, atk, def, spd, type) {
  if (hp > 1000 || atk > 1000 || def > 1000 || spd > 1000) {
    return { success: false, error: 'Los stats no pueden exceder 1000' };
  }
  
  if (hp < 1 || atk < 1 || def < 1 || spd < 1) {
    return { success: false, error: 'Los stats deben ser mayores a 0' };
  }
  
  const characters = await getAllCharacters(guildId, userId);
  if (characters.find(c => c.name.toLowerCase() === name.toLowerCase())) {
    return { success: false, error: 'Ya tienes un personaje con ese nombre' };
  }
  
  const character = {
    name,
    hp,
    maxHp: hp,
    currentHp: hp,
    atk,
    def,
    spd,
    type: type.toLowerCase(),
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
  
  const filePath = storage.getFilePath(guildId, 'characters');
  const data = await storage.readJSON(filePath, {});
  
  if (!data[userId]) {
    data[userId] = [];
  }
  
  data[userId].push(character);
  await storage.writeJSON(filePath, data);
  
  return { success: true, character };
}

// Obtener todos los personajes de un usuario
async function getAllCharacters(guildId, userId) {
  const filePath = storage.getFilePath(guildId, 'characters');
  const data = await storage.readJSON(filePath, {});
  return data[userId] || [];
}

// Editar personaje
async function editCharacter(guildId, userId, charName, field, value) {
  const characters = await getAllCharacters(guildId, userId);
  const char = characters.find(c => c.name.toLowerCase() === charName.toLowerCase());
  
  if (!char) {
    return { success: false, error: 'Personaje no encontrado' };
  }
  
  const validFields = ['hp', 'atk', 'def', 'spd', 'sp'];
  if (!validFields.includes(field)) {
    return { success: false, error: 'Campo inválido' };
  }
  
  if (value > 1000 || value < 1) {
    return { success: false, error: 'El valor debe estar entre 1 y 1000' };
  }
  
  if (field === 'hp') {
    char.hp = value;
    char.maxHp = value;
    char.currentHp = value;
  } else if (field === 'sp') {
    char.sp = value;
    char.maxSp = value;
    char.currentSp = value;
  } else {
    char[field] = value;
  }
  
  const filePath = storage.getFilePath(guildId, 'characters');
  const data = await storage.readJSON(filePath, {});
  data[userId] = characters;
  await storage.writeJSON(filePath, data);
  
  return { success: true };
}

// Configurar debilidad
async function setCharacterWeakness(guildId, userId, charName, type) {
  const characters = await getAllCharacters(guildId, userId);
  const char = characters.find(c => c.name.toLowerCase() === charName.toLowerCase());
  
  if (!char) {
    return { success: false, error: 'Personaje no encontrado' };
  }
  
  if (!char.weaknesses.includes(type.toLowerCase())) {
    char.weaknesses.push(type.toLowerCase());
  }
  
  const filePath = storage.getFilePath(guildId, 'characters');
  const data = await storage.readJSON(filePath, {});
  data[userId] = characters;
  await storage.writeJSON(filePath, data);
  
  return { success: true };
}

// Configurar resistencia
async function setCharacterResistance(guildId, userId, charName, type) {
  const characters = await getAllCharacters(guildId, userId);
  const char = characters.find(c => c.name.toLowerCase() === charName.toLowerCase());
  
  if (!char) {
    return { success: false, error: 'Personaje no encontrado' };
  }
  
  if (!char.resistances.includes(type.toLowerCase())) {
    char.resistances.push(type.toLowerCase());
  }
  
  const filePath = storage.getFilePath(guildId, 'characters');
  const data = await storage.readJSON(filePath, {});
  data[userId] = characters;
  await storage.writeJSON(filePath, data);
  
  return { success: true };
}

// Configurar reflect
async function setCharacterReflect(guildId, userId, charName, type, percentage) {
  const characters = await getAllCharacters(guildId, userId);
  const char = characters.find(c => c.name.toLowerCase() === charName.toLowerCase());
  
  if (!char) {
    return { success: false, error: 'Personaje no encontrado' };
  }
  
  if (percentage < 0 || percentage > 100) {
    return { success: false, error: 'El porcentaje debe estar entre 0 y 100' };
  }
  
  char.reflects[type.toLowerCase()] = percentage;
  
  const filePath = storage.getFilePath(guildId, 'characters');
  const data = await storage.readJSON(filePath, {});
  data[userId] = characters;
  await storage.writeJSON(filePath, data);
  
  return { success: true };
}

// Equipar habilidad
async function equipSkill(guildId, userId, charName, skillName) {
  const characters = await getAllCharacters(guildId, userId);
  const char = characters.find(c => c.name.toLowerCase() === charName.toLowerCase());
  
  if (!char) {
    return { success: false, error: 'Personaje no encontrado' };
  }
  
  const skills = await getAllCommonSkills(guildId);
  const skill = skills.find(s => s.name.toLowerCase() === skillName.toLowerCase());
  
  if (!skill) {
    return { success: false, error: 'Habilidad no encontrada' };
  }
  
  if (char.skills.length >= 3) {
    return { success: false, error: 'Máximo 3 habilidades por personaje' };
  }
  
  if (!char.skills.includes(skill.name)) {
    char.skills.push(skill.name);
  }
  
  const filePath = storage.getFilePath(guildId, 'characters');
  const data = await storage.readJSON(filePath, {});
  data[userId] = characters;
  await storage.writeJSON(filePath, data);
  
  return { success: true };
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
  createCharacter,
  getAllCharacters,
  editCharacter,
  setCharacterWeakness,
  setCharacterResistance,
  setCharacterReflect,
  equipSkill,
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
