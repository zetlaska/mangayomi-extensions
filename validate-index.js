#!/usr/bin/env node
/**
 * Validates index.json against Mangayomi's Source model requirements
 * Based on: https://github.com/kodjodevf/mangayomi/blob/main/lib/models/source.dart
 */

const fs = require('fs');
const path = require('path');

const REQUIRED_FIELDS = [
  'id',
  'name',
  'baseUrl',
  'lang',
  'typeSource',
  'iconUrl',
  'sourceCodeUrl',
  'version',
  'isManga',
  'itemType',
  'isFullData',
  'appMinVerReq',
  'sourceCodeLanguage',
  'hasCloudflare',
  'isNsfw',
];

const OPTIONAL_FIELDS = [
  'dateFormat',
  'dateFormatLocale',
  'apiUrl',
  'additionalParams',
  'notes',
];

const FIELD_TYPES = {
  id: 'number',
  name: 'string',
  baseUrl: 'string',
  lang: 'string',
  typeSource: 'string',
  iconUrl: 'string',
  sourceCodeUrl: 'string',
  version: 'string',
  isManga: 'boolean',
  itemType: 'number',
  isFullData: 'boolean',
  appMinVerReq: 'string',
  sourceCodeLanguage: 'number',
  hasCloudflare: 'boolean',
  isNsfw: 'boolean',
  dateFormat: 'string',
  dateFormatLocale: 'string',
  apiUrl: 'string',
  additionalParams: 'string',
  notes: 'string',
};

function validateEntry(entry, index) {
  const errors = [];
  const warnings = [];

  // Check required fields
  for (const field of REQUIRED_FIELDS) {
    if (!(field in entry)) {
      errors.push(`Entry ${index} (${entry.name || 'unnamed'}): Missing required field '${field}'`);
    } else if (entry[field] === null) {
      errors.push(`Entry ${index} (${entry.name}): Field '${field}' is null (must be ${FIELD_TYPES[field]})`);
    } else if (typeof entry[field] !== FIELD_TYPES[field]) {
      errors.push(`Entry ${index} (${entry.name}): Field '${field}' has wrong type (expected ${FIELD_TYPES[field]}, got ${typeof entry[field]})`);
    }
  }

  // Check field types for optional fields if present
  for (const field of OPTIONAL_FIELDS) {
    if (field in entry && entry[field] !== null && typeof entry[field] !== FIELD_TYPES[field]) {
      errors.push(`Entry ${index} (${entry.name}): Field '${field}' has wrong type (expected ${FIELD_TYPES[field]}, got ${typeof entry[field]})`);
    }
  }

  // Specific validations
  if (entry.id && (!Number.isInteger(entry.id) || entry.id <= 0)) {
    errors.push(`Entry ${index} (${entry.name}): 'id' must be a positive integer`);
  }

  if (entry.version && !/^\d+\.\d+\.\d+$/.test(entry.version)) {
    warnings.push(`Entry ${index} (${entry.name}): 'version' should follow semver format (x.y.z)`);
  }

  if (entry.sourceCodeLanguage !== undefined && ![0, 1, 2, 3, 4].includes(entry.sourceCodeLanguage)) {
    errors.push(`Entry ${index} (${entry.name}): 'sourceCodeLanguage' must be 0-4 (0=dart, 1=javascript, 2=mihon, 3=lnreader, 4=aidoku)`);
  }

  if (entry.itemType !== undefined && ![0, 1, 2].includes(entry.itemType)) {
    errors.push(`Entry ${index} (${entry.name}): 'itemType' must be 0-2 (0=manga, 1=anime, 2=novel)`);
  }

  if (entry.lang && entry.lang.length < 2) {
    warnings.push(`Entry ${index} (${entry.name}): 'lang' should be a 2-letter ISO code (e.g., 'en', 'ja')`);
  }

  // Check for unexpected fields
  const allKnownFields = [...REQUIRED_FIELDS, ...OPTIONAL_FIELDS];
  for (const field of Object.keys(entry)) {
    if (!allKnownFields.includes(field)) {
      warnings.push(`Entry ${index} (${entry.name}): Unknown field '${field}' (will be ignored by app)`);
    }
  }

  return { errors, warnings };
}

function validateIndex(indexPath) {
  console.log('Validating index.json...\n');

  let index;
  try {
    const content = fs.readFileSync(indexPath, 'utf8');
    index = JSON.parse(content);
  } catch (error) {
    console.error('❌ Failed to parse index.json:', error.message);
    process.exit(1);
  }

  if (!Array.isArray(index)) {
    console.error('❌ index.json must be an array');
    process.exit(1);
  }

  const allErrors = [];
  const allWarnings = [];
  const ids = new Set();
  const duplicateIds = new Set();

  index.forEach((entry, i) => {
    const { errors, warnings } = validateEntry(entry, i);
    allErrors.push(...errors);
    allWarnings.push(...warnings);

    // Check for duplicate IDs
    if (entry.id) {
      if (ids.has(entry.id)) {
        duplicateIds.add(entry.id);
        allErrors.push(`Duplicate ID ${entry.id} found in entry ${i} (${entry.name})`);
      }
      ids.add(entry.id);
    }
  });

  // Report results
  if (allErrors.length > 0) {
    console.error('❌ VALIDATION FAILED\n');
    allErrors.forEach(error => console.error(`  ${error}`));
    console.error(`\n${allErrors.length} error(s) found\n`);
  }

  if (allWarnings.length > 0) {
    console.warn('⚠️  WARNINGS\n');
    allWarnings.forEach(warning => console.warn(`  ${warning}`));
    console.warn(`\n${allWarnings.length} warning(s) found\n`);
  }

  if (allErrors.length === 0 && allWarnings.length === 0) {
    console.log('✅ index.json is valid\n');
    console.log(`  ${index.length} extension(s) validated`);
    console.log(`  ${ids.size} unique ID(s)`);
  }

  if (allErrors.length > 0) {
    process.exit(1);
  }
}

// Run validation
const indexPath = path.join(__dirname, 'index.json');
validateIndex(indexPath);
