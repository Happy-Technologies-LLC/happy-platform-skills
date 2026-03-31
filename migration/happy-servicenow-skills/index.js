/**
 * DEPRECATED: happy-servicenow-skills has been renamed to happy-platform-skills.
 *
 * This package re-exports everything from happy-platform-skills for backwards
 * compatibility. Please update your imports:
 *
 *   Before: import { SkillLoader } from 'happy-servicenow-skills';
 *   After:  import { SkillLoader } from 'happy-platform-skills';
 *
 * @see https://github.com/Happy-Technologies-LLC/happy-platform-skills
 */

console.warn(
  '\x1b[33m[DEPRECATED]\x1b[0m happy-servicenow-skills has been renamed to happy-platform-skills. ' +
  'Please run: npm install happy-platform-skills && npm uninstall happy-servicenow-skills'
);

export * from 'happy-platform-skills';
export { default } from 'happy-platform-skills';
