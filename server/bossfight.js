const fs = require('fs').promises;
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');

function getFilePath(guildId, filename) {
  return path.join(DATA_DIR, `${guildId}_${filename}.json`);
}

async function readJSON(filePath, defaultValue = {}) {
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return defaultValue;
    }
    throw error;
  }
}

async function writeJSON(filePath, data) {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

async function getAllCharacters(guildId, userId) {
  const filePath = getFilePath(guildId, 'characters');
  const data = await readJSON(filePath, {});
  return data[userId] || [];
}

async function createCharacter(guildId, userId, name, hp, atk, def, spd, type) {
  const filePath = getFilePath(guildId, 'characters');
  const data = await readJSON(filePath, {});
  
  if (!data[userId]) {
    data[userId] = [];
  }
  
  const existingChar = data[userId].find(c => c.name.toLowerCase() === name.toLowerCase());
  if (existingChar) {
    return { success: false, error: 'Ya existe un personaje con ese nombre' };
  }
  
  if (hp > 1000 || atk > 1000 || def > 1000 || spd > 1000) {
    return { success: false, error: 'Los stats no pueden superar 1000' };
  }
  
  const character = {
    name,
    hp,
    maxHp: hp,
    atk,
    def,
    spd,
    type: type.toLowerCase(),
    sp: 100,
    maxSp: 100,
    weaknesses: [],
    resistances: [],
    reflects: {},
    skills: []
  };
  
  data[userId].push(character);
  await writeJSON(filePath, data);
  
  return { success: true, character };
}

async function editCharacter(guildId, userId, charName, field, value) {
  const filePath = getFilePath(guildId, 'characters');
  const data = await readJSON(filePath, {});
  
  if (!data[userId]) {
    return { success: false, error: 'No tienes personajes' };
  }
  
  const character = data[userId].find(c => c.name.toLowerCase() === charName.toLowerCase());
  if (!character) {
    return { success: false, error: 'Personaje no encontrado' };
  }
  
  const validFields = ['hp', 'atk', 'def', 'spd', 'sp'];
  if (validFields.includes(field)) {
    if (value > 1000) {
      return { success: false, error: 'El valor no puede superar 1000' };
    }
    character[field] = value;
    if (field === 'hp') character.maxHp = value;
    if (field === 'sp') character.maxSp = value;
  }
  
  await writeJSON(filePath, data);
  return { success: true, character };
}

async function setCharacterWeakness(guildId, userId, charName, type) {
  const filePath = getFilePath(guildId, 'characters');
  const data = await readJSON(filePath, {});
  
  if (!data[userId]) return { success: false, error: 'No tienes personajes' };
  
  const character = data[userId].find(c => c.name.toLowerCase() === charName.toLowerCase());
  if (!character) return { success: false, error: 'Personaje no encontrado' };
  
  if (!character.weaknesses.includes(type.toLowerCase())) {
    character.weaknesses.push(type.toLowerCase());
  }
  
  await writeJSON(filePath, data);
  return { success: true, character };
}

async function setCharacterResistance(guildId, userId, charName, type) {
  const filePath = getFilePath(guildId, 'characters');
  const data = await readJSON(filePath, {});
  
  if (!data[userId]) return { success: false, error: 'No tienes personajes' };
  
  const character = data[userId].find(c => c.name.toLowerCase() === charName.toLowerCase());
  if (!character) return { success: false, error: 'Personaje no encontrado' };
  
  if (!character.resistances.includes(type.toLowerCase())) {
    character.resistances.push(type.toLowerCase());
  }
  
  await writeJSON(filePath, data);
  return { success: true, character };
}

async function setCharacterReflect(guildId, userId, charName, type, percentage) {
  const filePath = getFilePath(guildId, 'characters');
  const data = await readJSON(filePath, {});
  
  if (!data[userId]) return { success: false, error: 'No tienes personajes' };
  
  const character = data[userId].find(c => c.name.toLowerCase() === charName.toLowerCase());
  if (!character) return { success: false, error: 'Personaje no encontrado' };
  
  character.reflects[type.toLowerCase()] = percentage;
  
  await writeJSON(filePath, data);
  return { success: true, character };
}

async function equipSkill(guildId, userId, charName, skillName) {
  const filePath = getFilePath(guildId, 'characters');
  const data = await readJSON(filePath, {});
  
  if (!data[userId]) return { success: false, error: 'No tienes personajes' };
  
  const character = data[userId].find(c => c.name.toLowerCase() === charName.toLowerCase());
  if (!character) return { success: false, error: 'Personaje no encontrado' };
  
  const skills = await getAllCommonSkills(guildId);
  const skill = skills.find(s => s.name.toLowerCase() === skillName.toLowerCase());
  if (!skill) return { success: false, error: 'Habilidad no encontrada' };
  
  if (character.skills.includes(skillName)) {
    return { success: false, error: 'Ya tiene esa habilidad equipada' };
  }
  
  character.skills.push(skillName);
  
  await writeJSON(filePath, data);
  return { success: true, character, skill };
}

async function getAllCommonSkills(guildId) {
  const filePath = getFilePath(guildId, 'common_skills');
  const data = await readJSON(filePath, { skills: [] });
  return data.skills || [];
}

async function createCommonSkill(guildId, name, type, spCost, damage, effect, duration, cooldown, usesHp = false) {
  const filePath = getFilePath(guildId, 'common_skills');
  const data = await readJSON(filePath, { skills: [] });
  
  if (!data.skills) data.skills = [];
  
  const existing = data.skills.find(s => s.name.toLowerCase() === name.toLowerCase());
  if (existing) {
    return { success: false, error: 'Ya existe una habilidad con ese nombre' };
  }
  
  const skill = {
    name,
    type: type.toLowerCase(),
    spCost,
    damage,
    effect,
    duration,
    cooldown,
    usesHp
  };
  
  data.skills.push(skill);
  await writeJSON(filePath, data);
  
  return { success: true, skill };
}

async function getAllBosses(guildId) {
  const filePath = getFilePath(guildId, 'bosses');
  const data = await readJSON(filePath, { bosses: [] });
  return data.bosses || [];
}

async function createBoss(guildId, name, hp, atk, def, spd, type) {
  const filePath = getFilePath(guildId, 'bosses');
  const data = await readJSON(filePath, { bosses: [] });
  
  if (!data.bosses) data.bosses = [];
  
  const existing = data.bosses.find(b => b.name.toLowerCase() === name.toLowerCase());
  if (existing) {
    return { success: false, error: 'Ya existe un boss con ese nombre' };
  }
  
  if (hp > 1000 || atk > 1000 || def > 1000 || spd > 1000) {
    return { success: false, error: 'Los stats no pueden superar 1000' };
  }
  
  const boss = {
    name,
    hp,
    maxHp: hp,
    atk,
    def,
    spd,
    type: type.toLowerCase(),
    weaknesses: [],
    resistances: [],
    reflects: {},
    skills: []
  };
  
  data.bosses.push(boss);
  await writeJSON(filePath, data);
  
  return { success: true, boss };
}

async function editBoss(guildId, bossName, field, value) {
  const filePath = getFilePath(guildId, 'bosses');
  const data = await readJSON(filePath, { bosses: [] });
  
  if (!data.bosses) return { success: false, error: 'No hay bosses' };
  
  const boss = data.bosses.find(b => b.name.toLowerCase() === bossName.toLowerCase());
  if (!boss) return { success: false, error: 'Boss no encontrado' };
  
  const validFields = ['hp', 'atk', 'def', 'spd'];
  if (validFields.includes(field)) {
    if (value > 1000) {
      return { success: false, error: 'El valor no puede superar 1000' };
    }
    boss[field] = value;
    if (field === 'hp') boss.maxHp = value;
  }
  
  await writeJSON(filePath, data);
  return { success: true, boss };
}

async function setBossWeakness(guildId, bossName, type) {
  const filePath = getFilePath(guildId, 'bosses');
  const data = await readJSON(filePath, { bosses: [] });
  
  const boss = data.bosses.find(b => b.name.toLowerCase() === bossName.toLowerCase());
  if (!boss) return { success: false, error: 'Boss no encontrado' };
  
  if (!boss.weaknesses.includes(type.toLowerCase())) {
    boss.weaknesses.push(type.toLowerCase());
  }
  
  await writeJSON(filePath, data);
  return { success: true, boss };
}

async function setBossResistance(guildId, bossName, type) {
  const filePath = getFilePath(guildId, 'bosses');
  const data = await readJSON(filePath, { bosses: [] });
  
  const boss = data.bosses.find(b => b.name.toLowerCase() === bossName.toLowerCase());
  if (!boss) return { success: false, error: 'Boss no encontrado' };
  
  if (!boss.resistances.includes(type.toLowerCase())) {
    boss.resistances.push(type.toLowerCase());
  }
  
  await writeJSON(filePath, data);
  return { success: true, boss };
}

async function setBossReflect(guildId, bossName, type, percentage) {
  const filePath = getFilePath(guildId, 'bosses');
  const data = await readJSON(filePath, { bosses: [] });
  
  const boss = data.bosses.find(b => b.name.toLowerCase() === bossName.toLowerCase());
  if (!boss) return { success: false, error: 'Boss no encontrado' };
  
  boss.reflects[type.toLowerCase()] = percentage;
  
  await writeJSON(filePath, data);
  return { success: true, boss };
}

async function addBossSkill(guildId, bossName, skillName, type, damage, effect, cooldown) {
  const filePath = getFilePath(guildId, 'bosses');
  const data = await readJSON(filePath, { bosses: [] });
  
  const boss = data.bosses.find(b => b.name.toLowerCase() === bossName.toLowerCase());
  if (!boss) return { success: false, error: 'Boss no encontrado' };
  
  if (boss.skills.length >= 3) {
    return { success: false, error: 'El boss ya tiene el máximo de 3 habilidades' };
  }
  
  const skill = {
    name: skillName,
    type: type.toLowerCase(),
    damage,
    effect,
    cooldown
  };
  
  boss.skills.push(skill);
  await writeJSON(filePath, data);
  
  return { success: true, boss, skill };
}

async function deleteBossSkill(guildId, bossName, skillName) {
  const filePath = getFilePath(guildId, 'bosses');
  const data = await readJSON(filePath, { bosses: [] });
  
  const boss = data.bosses.find(b => b.name.toLowerCase() === bossName.toLowerCase());
  if (!boss) return { success: false, error: 'Boss no encontrado' };
  
  const initialLength = boss.skills.length;
  boss.skills = boss.skills.filter(s => s.name.toLowerCase() !== skillName.toLowerCase());
  
  if (boss.skills.length === initialLength) {
    return { success: false, error: 'Habilidad no encontrada en este boss' };
  }
  
  await writeJSON(filePath, data);
  return { success: true, boss };
}

function calculateDamage(attacker, defender, options = {}) {
  const { skillType, skillDamage, weaknesses, resistances, reflects } = options;
  
  const type = skillType || attacker.type;
  const defenderWeaknesses = weaknesses || defender.weaknesses || [];
  const defenderResistances = resistances || defender.resistances || [];
  const defenderReflects = reflects || defender.reflects || {};
  
  let baseDamage;
  if (skillDamage !== undefined && skillDamage !== null) {
    baseDamage = skillDamage;
  } else {
    baseDamage = attacker.atk - defender.def;
  }
  
  if (baseDamage < 0) baseDamage = 0;
  
  if (defenderWeaknesses.includes(type)) {
    baseDamage *= 1.5;
  }
  
  if (defenderResistances.includes(type)) {
    baseDamage *= 0.5;
  }
  
  if (defenderReflects[type]) {
    const reflectDamage = Math.floor(baseDamage * (defenderReflects[type] / 100));
    return { damage: 0, reflected: reflectDamage, isReflect: true };
  }
  
  return { damage: Math.floor(baseDamage), reflected: 0, isReflect: false };
}

module.exports = {
  getAllCharacters,
  createCharacter,
  editCharacter,
  setCharacterWeakness,
  setCharacterResistance,
  setCharacterReflect,
  equipSkill,
  getAllCommonSkills,
  createCommonSkill,
  getAllBosses,
  createBoss,
  editBoss,
  setBossWeakness,
  setBossResistance,
  setBossReflect,
  addBossSkill,
  deleteBossSkill,
  calculateDamage
};
