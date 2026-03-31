/**
 * Happy Platform Skills
 * Reusable development patterns and automation recipes for enterprise platforms
 *
 * @author Happy Technologies LLC
 * @license Apache-2.0
 */

export { SkillLoader } from './loader.js';
export { SkillRegistry } from './registry.js';
export { SkillValidator } from './validator.js';

// Re-export skill categories for convenience
export const CATEGORIES = {
  ITSM: 'itsm',
  CMDB: 'cmdb',
  ADMIN: 'admin',
  CATALOG: 'catalog',
  SECURITY: 'security',
  REPORTING: 'reporting',
  DEVELOPMENT: 'development',
  CSM: 'csm',
  HRSD: 'hrsd',
  KNOWLEDGE: 'knowledge',
  SECOPS: 'secops',
  GRC: 'grc',
  ITOM: 'itom',
  GENAI: 'genai',
  SPM: 'spm',
  PROCUREMENT: 'procurement',
  LEGAL: 'legal',
  DOCUMENT: 'document',
  EA: 'ea',
  FSM: 'fsm',
  SAM: 'sam',
  OTSM: 'otsm',
  PSDS: 'psds'
};

// Supported platforms
export const PLATFORMS = {
  CLAUDE_CODE: 'claude-code',
  CLAUDE_DESKTOP: 'claude-desktop',
  CHATGPT: 'chatgpt',
  CURSOR: 'cursor',
  CUSTOM: 'any'
};

// Default export for convenience
export default {
  SkillLoader: (await import('./loader.js')).SkillLoader,
  SkillRegistry: (await import('./registry.js')).SkillRegistry,
  CATEGORIES,
  PLATFORMS
};
