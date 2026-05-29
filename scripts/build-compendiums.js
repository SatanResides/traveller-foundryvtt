#!/usr/bin/env node
/**
 * MgT2e Compendium Build Script
 *
 * Reads JSON data files from data/ and generates Foundry VTT compendium
 * item JSON files under mgt2e/packs/_source/.
 *
 * Usage: node scripts/build-compendiums.js
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');
const SYSTEM_DIR = path.join(ROOT, 'mgt2e');
const OUTPUT_DIR = path.join(SYSTEM_DIR, 'packs', '_source');

// Compendium definitions: name → output dir name, label, folder config
const COMPENDIA = {
  weapons: {
    dir: 'mgt2e-weapons',
    label: 'MgT2e Weapons',
    folderName: 'Weapons',
    folderColor: '#f1511b',
    sort: 0,
  },
  armour: {
    dir: 'mgt2e-armour',
    label: 'MgT2e Armour',
    folderName: 'Armour',
    folderColor: '#40a040',
    sort: 100000,
  },
  equipment: {
    dir: 'mgt2e-equipment',
    label: 'MgT2e Equipment',
    folderName: 'Equipment',
    folderColor: '#4080c0',
    sort: 200000,
  },
  'ship-components': {
    dir: 'mgt2e-ship-components',
    label: 'MgT2e Ship Components',
    folderName: 'Ship Components',
    folderColor: '#c08040',
    sort: 300000,
  },
};

// Helper: generate a deterministic 16-char ID from a name
function generateId(name) {
  const hash = crypto.createHash('md5').update(name).digest('base64url');
  // Base64url gives 22 chars; take first 16
  return hash.substring(0, 16);
}

// Helper: generate a timestamp in milliseconds
function now() {
  return Date.now();
}

// Icon mapping for weapons based on skill
function weaponIcon(skill, traits) {
  const t = (traits || '').toLowerCase();
  if (skill && skill.includes('melee')) {
    if (skill.includes('blade')) return 'systems/mgt2e/icons/items/melee-blade.svg';
    if (skill.includes('bludgeon')) return 'systems/mgt2e/icons/items/melee-bludgeon.svg';
    if (skill.includes('unarmed')) return 'systems/mgt2e/icons/items/melee-unarmed.svg';
    return 'systems/mgt2e/icons/items/melee-blade.svg';
  }
  if (skill && skill.includes('laser')) return 'systems/mgt2e/icons/items/ranged-laser.svg';
  if (skill && skill.includes('plasma')) return 'systems/mgt2e/icons/items/ranged-plasma.svg';
  if (skill && skill.includes('slug')) return 'systems/mgt2e/icons/items/ranged-slug.svg';
  return 'systems/mgt2e/icons/items/ranged-slug.svg';
}

// Icon mapping for armour
function armourIcon(name) {
  const n = name.toLowerCase();
  if (n.includes('vacc') || n.includes('environment')) return 'systems/mgt2e/icons/items/vacc-suit.svg';
  if (n.includes('battle') || n.includes('combat')) return 'systems/mgt2e/icons/items/combat-armour.svg';
  return 'systems/mgt2e/icons/items/armour.svg';
}

// Icon for equipment by category
function equipmentIcon(category) {
  const icons = {
    communications: 'systems/mgt2e/icons/items/communications.svg',
    electronics: 'systems/mgt2e/icons/items/electronics.svg',
    medical: 'systems/mgt2e/icons/items/medical.svg',
    power: 'systems/mgt2e/icons/items/power.svg',
    tools: 'systems/mgt2e/icons/items/tools.svg',
    survival: 'systems/mgt2e/icons/items/survival.svg',
  };
  return icons[category] || 'systems/mgt2e/icons/items/generic-item.svg';
}

// Icon for hardware
function hardwareIcon(item) {
  if (item.type === 'hull') return 'systems/mgt2e/icons/ship/hull.svg';
  if (item.type === 'weapon') return 'systems/mgt2e/icons/ship/weapon.svg';
  return 'systems/mgt2e/icons/ship/component.svg';
}

function baseStats(systemVersion) {
  return {
    systemId: 'mgt2e',
    systemVersion: systemVersion,
    coreVersion: '13.351',
    createdTime: now(),
    modifiedTime: now(),
    lastModifiedBy: 'mhUjqDVicnwIUaiq',
    compendiumSource: null,
    duplicateSource: null,
    exportSource: null,
  };
}

function ownership() {
  return {
    default: 0,
    mhUjqDVicnwIUaiq: 3,
  };
}

// ──────────────────────────────────────────────
// Weapon builder
// ──────────────────────────────────────────────
function buildWeapon(item, systemVersion, folderId) {
  const id = generateId(item.name);
  return {
    _id: id,
    name: item.name,
    type: 'weapon',
    img: weaponIcon(item.skill, item.traits),
    system: {
      tl: String(item.tl),
      weight: item.mass,
      cost: item.cost,
      notes: '',
      active: false,
      quantity: 1,
      status: null,
      legality: 9,
      weapon: {
        scale: 'traveller',
        range: item.rangeLong || item.range || 0,
        minRange: item.range || 0,
        damage: item.damage,
        magazine: 0,
        ammo: 0,
        magazineCost: 0,
        characteristic: 'DEX',
        skill: item.skill || 'guncombat.slug',
        parryBonus: 0,
        damageBonus: '',
        damageType: 'standard',
        attackBonus: 0,
        traits: item.traits || '',
      },
      description: `<p>${item.name}. Cost: Cr${item.cost}, TL ${item.tl}, Mass ${item.mass}kg.${item.traits ? ' Traits: ' + item.traits + '.' : ''}</p>`,
    },
    effects: [],
    folder: folderId,
    sort: 0,
    ownership: ownership(),
    flags: { core: {} },
    _stats: baseStats(systemVersion),
    _key: `!items!${id}`,
  };
}

// ──────────────────────────────────────────────
// Armour builder
// ──────────────────────────────────────────────
function buildArmour(item, systemVersion, folderId) {
  const id = generateId(item.name);
  const system = {
    tl: String(item.tl),
    weight: item.mass,
    cost: item.cost,
    notes: '',
    active: false,
    quantity: 1,
    status: null,
    legality: 9,
    armour: {
      protection: item.protection,
      otherProtection: 0,
      otherTypes: item.special || '',
      rad: item.rad || 0,
      archaic: 0,
      skill: item.skill || '',
      duration: 0,
      slots: 0,
      form: 'standard',
      layered: 0,
      ablat: item.ablat || 0,
      powered: 0,
      psi: 0,
      worn: 0,
    },
    description: item.description || `<p>${item.name}. Protection ${item.protection}, TL ${item.tl}, Cost Cr${item.cost}, Mass ${item.mass}kg.</p>`,
  };
  return {
    _id: id,
    name: item.name,
    type: 'armour',
    img: armourIcon(item.name),
    system: system,
    effects: [],
    folder: folderId,
    sort: 0,
    ownership: ownership(),
    flags: { core: {} },
    _stats: baseStats(systemVersion),
    _key: `!items!${id}`,
  };
}

// ──────────────────────────────────────────────
// Equipment (item type) builder
// ──────────────────────────────────────────────
function buildEquipment(item, systemVersion, folderId) {
  const id = generateId(item.name);
  return {
    _id: id,
    name: item.name,
    type: 'item',
    img: equipmentIcon(item.category),
    system: {
      tl: String(item.tl),
      weight: item.mass,
      cost: item.cost,
      notes: '',
      active: false,
      quantity: 1,
      status: null,
      legality: item.legality || 9,
      description: item.description || `<p>${item.name}. Cost Cr${item.cost}, TL ${item.tl}, Mass ${item.mass}kg.</p>`,
    },
    effects: [],
    folder: folderId,
    sort: 0,
    ownership: ownership(),
    flags: { core: {} },
    _stats: baseStats(systemVersion),
    _key: `!items!${id}`,
  };
}

// ──────────────────────────────────────────────
// Ship Component (hardware type) builder
// ──────────────────────────────────────────────
function buildShipComponent(item, systemVersion, folderId) {
  const id = generateId(item.name);
  const isHull = item.type === 'hull';
  const isWeapon = item.type === 'weapon';

  let hardwareSystem;
  if (isHull) {
    hardwareSystem = {
      system: 'hull',
      tons: item.tons || 0,
      power: 0,
      rating: item.agility || 0,
      variables: { max: 0, tl: String(item.tl), cost: item.cost || 0 },
      tonnage: { tons: item.tons || 0, percent: 0, cost: item.cost || 0, minimum: 0 },
      powerPerTon: 0,
      mount: 'none',
      advantages: '',
      armouredBulkhead: false,
      hardened: false,
      weapons: {},
    };
  } else if (isWeapon) {
    hardwareSystem = {
      system: 'weapon',
      tons: item.tons || 0,
      power: item.power || 0,
      rating: 0,
      variables: { max: 0, tl: String(item.tl), cost: item.cost || 0 },
      tonnage: { tons: item.tons || 0, percent: 0, cost: 0, minimum: 0 },
      powerPerTon: 0,
      mount: item.mount || 'turret',
      advantages: item.traits || '',
      armouredBulkhead: false,
      hardened: false,
      weapons: {
        weapon0: {
          name: item.name,
          damage: item.damage || '',
          range: item.range || 'Close',
          traits: item.traits || '',
          blast: 0,
          auto: 0,
        },
      },
    };
  } else {
    hardwareSystem = {
      system: 'component',
      tons: item.tons || 0,
      power: item.power || 0,
      rating: 0,
      variables: { max: 0, tl: String(item.tl), cost: item.cost || 0 },
      tonnage: { tons: item.tons || 0, percent: 0, cost: 0, minimum: 0 },
      powerPerTon: 0,
      mount: 'none',
      advantages: '',
      armouredBulkhead: false,
      hardened: false,
      weapons: {},
    };
  }

  return {
    _id: id,
    name: item.name,
    type: 'hardware',
    img: hardwareIcon(item),
    system: {
      tl: String(item.tl || 0),
      weight: 0,
      cost: item.cost || 0,
      notes: '',
      active: false,
      quantity: 1,
      status: null,
      legality: 9,
      hardware: hardwareSystem,
      description: item.description || `<p>${item.name}.</p>`,
    },
    effects: [],
    folder: folderId,
    sort: 0,
    ownership: ownership(),
    flags: { core: {} },
    _stats: baseStats(systemVersion),
    _key: `!items!${id}`,
  };
}

// ──────────────────────────────────────────────
// Folder builder
// ──────────────────────────────────────────────
function buildFolder(name, color, packDir) {
  const id = generateId(`folder-${name}`);
  const folderPath = path.join(OUTPUT_DIR, packDir, `${name.replace(/[^a-zA-Z0-9_-]/g, '_')}_${id}.json`);
  return {
    path: folderPath,
    data: {
      name: name,
      sorting: 'a',
      folder: null,
      type: 'Item',
      _id: id,
      sort: 0,
      color: color,
      flags: {},
      _stats: {
        systemId: 'mgt2e',
        systemVersion: '0.21.0.0',
        coreVersion: '13.351',
        createdTime: now(),
        modifiedTime: now(),
        lastModifiedBy: 'mhUjqDVicnwIUaiq',
      },
      _key: `!folders!${id}`,
    },
    id: id,
  };
}

// ──────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────
function main() {
  const systemVersion = '0.21.0.0';

  // Ensure output dirs exist
  for (const [key, comp] of Object.entries(COMPENDIA)) {
    const dir = path.join(OUTPUT_DIR, comp.dir);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`Created output directory: ${dir}`);
    }
  }

  // Read data files
  const dataFiles = {
    weapons: 'weapons.json',
    armour: 'armour.json',
    equipment: 'equipment.json',
    'ship-components': 'ship-components.json',
  };

  // Map data file to builder function
  const builders = {
    weapons: buildWeapon,
    armour: buildArmour,
    equipment: buildEquipment,
    'ship-components': buildShipComponent,
  };

  let totalItems = 0;

  for (const [compKey, dataFile] of Object.entries(dataFiles)) {
    const dataPath = path.join(DATA_DIR, dataFile);
    if (!fs.existsSync(dataPath)) {
      console.warn(`Warning: ${dataPath} not found, skipping.`);
      continue;
    }

    const comp = COMPENDIA[compKey];
    const compDir = path.join(OUTPUT_DIR, comp.dir);
    const items = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

    // Clear old files in directory (but not the folder json)
    const existingFiles = fs.readdirSync(compDir);
    for (const f of existingFiles) {
      if (f.endsWith('.json')) {
        fs.unlinkSync(path.join(compDir, f));
      }
    }

    // Create folder for this compendium
    const folder = buildFolder(comp.folderName, comp.folderColor, comp.dir);
    fs.writeFileSync(folder.path, JSON.stringify(folder.data, null, 2));
    console.log(`Created folder: ${comp.folderName} (${folder.id})`);

    // Build items
    const builder = builders[compKey];
    for (const item of items) {
      const built = builder(item, systemVersion, folder.id);
      const safeName = item.name.replace(/[^a-zA-Z0-9_-]/g, '_');
      const outPath = path.join(compDir, `${safeName}_${built._id}.json`);
      fs.writeFileSync(outPath, JSON.stringify(built, null, 2));
      console.log(`  ${item.name} → ${safeName}_${built._id}.json`);
      totalItems++;
    }
  }

  console.log(`\nDone! Generated ${totalItems} items across ${Object.keys(COMPENDIA).length} compendiums.`);
}

main();
