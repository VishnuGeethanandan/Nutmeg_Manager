/**
 * Centralized Department Configuration
 *
 * Single source of truth for valid department names across the Nutmeg Manager system.
 * Used by the Player model for validation and exposed via /api/config/departments
 * so the frontend can populate dropdowns consistently.
 *
 * These correspond to the departments at RIT Pampady that participate in the Nutmeg tournament.
 */

const DEPARTMENTS = [
  'MCA',
  'CSE',
  'CE',
  'ME',
  'EEE',
  'ECE',
  'B.Arch',
  'RAE',
];

/**
 * Valid football positions for player profile selection.
 */
const POSITIONS = ['Goalkeeper', 'Defender', 'Midfielder', 'Forward'];

module.exports = { DEPARTMENTS, POSITIONS };
