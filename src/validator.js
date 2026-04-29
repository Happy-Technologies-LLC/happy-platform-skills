/**
 * Skill Validator - Validates skill files against the specification
 *
 * @author Happy Technologies LLC
 */

import { readdir, readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import matter from 'gray-matter';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SKILLS_DIR = join(__dirname, '..', 'skills');

// Required frontmatter fields
const REQUIRED_FIELDS = ['name', 'version', 'description'];

// Optional but recommended fields
const RECOMMENDED_FIELDS = ['author', 'tags', 'platforms', 'tools', 'complexity'];

// Valid values for enumerated fields
const VALID_VALUES = {
  complexity: ['beginner', 'intermediate', 'advanced', 'expert'],
  platforms: ['claude-code', 'claude-desktop', 'chatgpt', 'cursor', 'any']
};

// Required sections in the skill body
const REQUIRED_SECTIONS = ['procedure'];

// Recommended sections
const RECOMMENDED_SECTIONS = ['overview', 'prerequisites', 'best practices'];

export class SkillValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
  }

  /**
   * Validate a single skill file
   * @param {string} content - Raw markdown content
   * @param {string} path - Skill path for error messages
   * @returns {ValidationResult} Validation result
   */
  validate(content, path = 'unknown') {
    this.errors = [];
    this.warnings = [];

    let frontmatter, body;

    // Parse frontmatter
    try {
      const parsed = matter(content);
      frontmatter = parsed.data;
      body = parsed.content;
    } catch (error) {
      this.errors.push(`Invalid YAML frontmatter: ${error.message}`);
      return this.getResult(path);
    }

    // Validate frontmatter
    this.validateFrontmatter(frontmatter);

    // Validate body sections
    this.validateSections(body);

    // Validate tools specification
    if (frontmatter.tools) {
      this.validateTools(frontmatter.tools);
    }

    return this.getResult(path);
  }

  /**
   * Validate frontmatter fields
   * @param {Object} frontmatter - Parsed frontmatter
   */
  validateFrontmatter(frontmatter) {
    // Check required fields
    for (const field of REQUIRED_FIELDS) {
      if (!frontmatter[field]) {
        this.errors.push(`Missing required field: ${field}`);
      }
    }

    // Check recommended fields
    for (const field of RECOMMENDED_FIELDS) {
      if (!frontmatter[field]) {
        this.warnings.push(`Missing recommended field: ${field}`);
      }
    }

    // Validate version format (semver)
    if (frontmatter.version && !/^\d+\.\d+\.\d+/.test(frontmatter.version)) {
      this.warnings.push(`Version should follow semver format: ${frontmatter.version}`);
    }

    // Validate complexity value
    if (frontmatter.complexity && !VALID_VALUES.complexity.includes(frontmatter.complexity)) {
      this.errors.push(`Invalid complexity: ${frontmatter.complexity}. Valid: ${VALID_VALUES.complexity.join(', ')}`);
    }

    // Validate platforms
    if (frontmatter.platforms) {
      if (!Array.isArray(frontmatter.platforms)) {
        this.errors.push('platforms must be an array');
      } else {
        for (const platform of frontmatter.platforms) {
          if (!VALID_VALUES.platforms.includes(platform)) {
            this.warnings.push(`Unknown platform: ${platform}`);
          }
        }
      }
    }

    // Validate tags
    if (frontmatter.tags && !Array.isArray(frontmatter.tags)) {
      this.errors.push('tags must be an array');
    }
  }

  /**
   * Validate body sections
   * @param {string} body - Markdown body content
   */
  validateSections(body) {
    const sections = this.extractSectionNames(body);
    const lowerSections = sections.map(s => s.toLowerCase());

    // Check required sections
    for (const section of REQUIRED_SECTIONS) {
      if (!lowerSections.includes(section)) {
        this.errors.push(`Missing required section: ## ${section}`);
      }
    }

    // Check recommended sections
    for (const section of RECOMMENDED_SECTIONS) {
      if (!lowerSections.includes(section)) {
        this.warnings.push(`Missing recommended section: ## ${section}`);
      }
    }

    // Check for empty procedure section
    if (lowerSections.includes('procedure')) {
      const procedureContent = this.getSectionContent(body, 'procedure');
      if (procedureContent.trim().length < 50) {
        this.warnings.push('Procedure section seems too short');
      }
    }
  }

  /**
   * Validate tools specification
   * @param {Object} tools - Tools configuration
   */
  validateTools(tools) {
    const validToolTypes = ['mcp', 'rest', 'native', 'cli'];

    for (const [type, toolList] of Object.entries(tools)) {
      if (!validToolTypes.includes(type)) {
        this.warnings.push(`Unknown tool type: ${type}`);
      }

      if (!Array.isArray(toolList)) {
        this.errors.push(`tools.${type} must be an array`);
      }
    }
  }

  /**
   * Extract section names from markdown
   * @param {string} content - Markdown content
   * @returns {string[]} Array of section names
   */
  extractSectionNames(content) {
    const matches = content.match(/^##\s+(.+)$/gm) || [];
    return matches.map(m => m.replace(/^##\s+/, ''));
  }

  /**
   * Get content of a specific section
   * @param {string} content - Markdown content
   * @param {string} sectionName - Section name to find
   * @returns {string} Section content
   */
  getSectionContent(content, sectionName) {
    const regex = new RegExp(`^##\\s+${sectionName}\\s*$\\n?([\\s\\S]*?)(?=^##\\s|(?![\\s\\S]))`, 'im');
    const match = content.match(regex);
    return match ? match[1] : '';
  }

  /**
   * Get validation result
   * @param {string} path - Skill path
   * @returns {ValidationResult}
   */
  getResult(path) {
    return {
      path,
      valid: this.errors.length === 0,
      errors: [...this.errors],
      warnings: [...this.warnings],
      summary: this.errors.length === 0
        ? (this.warnings.length === 0 ? '✅ Valid' : `⚠️ Valid with ${this.warnings.length} warning(s)`)
        : `❌ Invalid: ${this.errors.length} error(s)`
    };
  }

  /**
   * Validate all skills in the skills directory
   * Supports both old format (skill.md) and new skills.sh format (skill/SKILL.md)
   * @returns {Promise<ValidationResult[]>}
   */
  static async validateAll() {
    const results = [];
    const categories = await readdir(SKILLS_DIR, { withFileTypes: true });

    for (const category of categories) {
      if (!category.isDirectory()) continue;

      const categoryPath = join(SKILLS_DIR, category.name);
      const items = await readdir(categoryPath, { withFileTypes: true });

      for (const item of items) {
        let skillPath, fullPath;

        if (item.isDirectory()) {
          // New skills.sh format: skill/SKILL.md
          skillPath = `${category.name}/${item.name}`;
          fullPath = join(categoryPath, item.name, 'SKILL.md');
        } else if (item.name.endsWith('.md')) {
          // Old format: skill.md
          skillPath = `${category.name}/${item.name.replace('.md', '')}`;
          fullPath = join(categoryPath, item.name);
        } else {
          continue;
        }

        try {
          const content = await readFile(fullPath, 'utf-8');
          const validator = new SkillValidator();
          results.push(validator.validate(content, skillPath));
        } catch (error) {
          // Skip if SKILL.md doesn't exist in directory
          if (error.code !== 'ENOENT') {
            results.push({
              path: skillPath,
              valid: false,
              errors: [`Could not read file: ${error.message}`],
              warnings: [],
              summary: '❌ Could not read file'
            });
          }
        }
      }
    }

    return results;
  }
}

// Run validation when called directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log('🔍 Validating all skills...\n');

  SkillValidator.validateAll().then(results => {
    let valid = 0;
    let invalid = 0;

    for (const result of results) {
      console.log(`${result.summary} - ${result.path}`);

      if (result.errors.length > 0) {
        result.errors.forEach(e => console.log(`   ❌ ${e}`));
        invalid++;
      } else {
        valid++;
      }

      if (result.warnings.length > 0) {
        result.warnings.forEach(w => console.log(`   ⚠️  ${w}`));
      }
    }

    console.log(`\n📊 Results: ${valid} valid, ${invalid} invalid out of ${results.length} skills`);
    process.exit(invalid > 0 ? 1 : 0);
  });
}

export default SkillValidator;
