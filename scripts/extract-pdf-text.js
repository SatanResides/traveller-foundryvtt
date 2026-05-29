#!/usr/bin/env node
/**
 * Traveller PDF Text Extraction Script
 * 
 * Extracts text from Mongoose Traveller 2e PDFs using pdfjs-dist.
 * Outputs structured JSON for weapon, armour, equipment, and ship data.
 * 
 * Usage:
 *   node scripts/extract-pdf-text.js <pdf-path> [--type weapons|armour|equipment|cargo|ships]
 * 
 * The script extracts ALL text with page numbers, then applies heuristic
 * table parsers to identify item entries from Traveller stat blocks.
 */

const fs = require('fs');
const path = require('path');

async function extractPdfText(pdfPath, options = {}) {
  const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.mjs');
  
  if (!fs.existsSync(pdfPath)) {
    console.error(`PDF not found: ${pdfPath}`);
    process.exit(1);
  }

  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const doc = await pdfjsLib.getDocument(data).promise;
  
  console.log(`PDF: ${path.basename(pdfPath)}`);
  console.log(`Pages: ${doc.numPages}`);
  
  const pages = [];
  
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    
    const text = content.items
      .map(item => item.str)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    pages.push({
      page: i,
      text: text
    });
    
    if (i % 50 === 0) {
      console.error(`Extracted page ${i}/${doc.numPages}...`);
    }
  }
  
  return pages;
}

/**
 * Parse weapon entries from extracted text pages.
 * Looks for patterns like: "Weapon Name" followed by damage/range/TL/cost/mass/traits
 */
function parseWeapons(pages) {
  const weapons = [];
  const allText = pages.map(p => `[PAGE ${p.page}] ${p.text}`).join('\n');
  
  // Traveller weapon stat block pattern:
  // Weapon Name      Damage    Short  Medium  Long  TL  Cost  Mass  Traits
  // e.g.: "Acolyte DEX 10   Auto Pistol  3D6  5  20  50  7  250  0.5  Auto 4"
  
  const lines = allText.split('\n');
  let currentPage = 0;
  
  for (const rawLine of lines) {
    const pageMatch = rawLine.match(/\[PAGE (\d+)\]/);
    if (pageMatch) currentPage = parseInt(pageMatch[1]);
    
    const line = rawLine.replace(/\[PAGE \d+\]/, '').trim();
    if (!line || line.length < 10) continue;
    
    // Skip headers and metadata
    if (line.match(/^(weapon|damage|range|tl|cost|mass|traits|page)/i)) continue;
    if (line.match(/^[A-Z\s]{5,}$/) && line.length < 60) continue;
    
    // Try to match weapon stat blocks
    // Format: Name  Damage  Short  Medium  Long  TL  Cost  Mass  Traits
    const weaponPattern = /^(.+?)\s+(\d+D\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+([\d,]+)\s+([\d.]+)\s+(.+)$/;
    const match = line.match(weaponPattern);
    
    if (match) {
      const name = match[1].trim();
      weapons.push({
        name: name,
        page: currentPage,
        source: 'Core Rulebook 2022',
        damage: match[2],
        shortRange: parseInt(match[3]),
        mediumRange: parseInt(match[4]),
        longRange: parseInt(match[5]),
        tl: parseInt(match[6]),
        cost: parseInt(match[7].replace(/,/g, '')),
        mass: parseFloat(match[8]),
        traits: match[9].trim()
      });
    }
  }
  
  return weapons;
}

/**
 * Parse armour entries from extracted text.
 */
function parseArmour(pages) {
  const armours = [];
  const allText = pages.map(p => `[PAGE ${p.page}] ${p.text}`).join('\n');
  const lines = allText.split('\n');
  
  let currentPage = 0;
  
  for (const rawLine of lines) {
    const pageMatch = rawLine.match(/\[PAGE (\d+)\]/);
    if (pageMatch) currentPage = parseInt(pageMatch[1]);
    
    const line = rawLine.replace(/\[PAGE \d+\]/, '').trim();
    if (!line || line.length < 10) continue;
    
    // Format: Name  Protection  TL  Cost  Mass  Skill  Rad
    const armourPattern = /^(.+?)\s+(\d+)\s+(\d+)\s+([\d,]+)\s+([\d.]+)\s+(.+?)\s+(\d*)$/;
    const match = line.match(armourPattern);
    
    if (match) {
      const name = match[1].trim();
      // Skip if it looks like a header
      if (name.match(/^(armour|protection|name|type)/i)) continue;
      
      armours.push({
        name: name,
        page: currentPage,
        protection: parseInt(match[2]),
        tl: parseInt(match[3]),
        cost: parseInt(match[4].replace(/,/g, '')),
        mass: parseFloat(match[5]),
        skill: match[6].trim(),
        rad: match[7] ? parseInt(match[7]) : 0
      });
    }
  }
  
  return armours;
}

/**
 * Parse equipment entries.
 */
function parseEquipment(pages) {
  const equipment = [];
  const allText = pages.map(p => `[PAGE ${p.page}] ${p.text}`).join('\n');
  const lines = allText.split('\n');
  
  let currentPage = 0;
  
  for (const rawLine of lines) {
    const pageMatch = rawLine.match(/\[PAGE (\d+)\]/);
    if (pageMatch) currentPage = parseInt(pageMatch[1]);
    
    const line = rawLine.replace(/\[PAGE \d+\]/, '').trim();
    if (!line || line.length < 10) continue;
    
    // Format: Name  TL  Cost  Mass  Legality  Category
    const equipPattern = /^(.+?)\s+(\d+)\s+([\d,]+)\s+([\d.]+)\s+(\d+)\s+(.+)$/;
    const match = line.match(equipPattern);
    
    if (match) {
      const name = match[1].trim();
      if (name.match(/^(name|item|equipment|tl)/i)) continue;
      
      equipment.push({
        name: name,
        page: currentPage,
        tl: parseInt(match[2]),
        cost: parseInt(match[3].replace(/,/g, '')),
        mass: parseFloat(match[4]),
        legality: parseInt(match[5]),
        category: match[6].trim()
      });
    }
  }
  
  return equipment;
}

/**
 * Main entry point
 */
async function main() {
  const args = process.argv.slice(2);
  const pdfPath = args[0];
  
  if (!pdfPath) {
    console.error('Usage: node extract-pdf-text.js <pdf-path> [--raw] [--type weapons|armour|equipment|all]');
    process.exit(1);
  }
  
  const isRaw = args.includes('--raw');
  const type = args.includes('--type') ? args[args.indexOf('--type') + 1] : 'all';
  
  const pages = await extractPdfText(pdfPath);
  
  // If raw mode, output all text per page
  if (isRaw) {
    console.log(JSON.stringify(pages, null, 2));
    return;
  }
  
  const result = {};
  
  if (type === 'all' || type === 'weapons') {
    result.weapons = parseWeapons(pages);
  }
  if (type === 'all' || type === 'armour') {
    result.armour = parseArmour(pages);
  }
  if (type === 'all' || type === 'equipment') {
    result.equipment = parseEquipment(pages);
  }
  
  console.log(JSON.stringify(result, null, 2));
  
  // Stats
  for (const [key, items] of Object.entries(result)) {
    console.error(`Found ${items.length} ${key} entries`);
  }
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});