/**
 * Skill Loader - Loads and parses skill files
 *
 * @author Happy Technologies LLC
 */

import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import matter from 'gray-matter';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SKILLS_DIR = join(__dirname, '..', 'skills');

export class SkillLoader {
  /**
   * Load a skill by its path (e.g., 'itsm/incident-triage')
   * @param {string} skillPath - Path to skill (category/skill-name)
   * @returns {Promise<Skill>} Parsed skill object
   */
  static async load(skillPath) {
    const fullPath = join(SKILLS_DIR, skillPath, 'SKILL.md');
    const legacyPath = join(SKILLS_DIR, `${skillPath}.md`);

    try {
      const content = await readFile(fullPath, 'utf-8');
      return this.parse(content, skillPath);
    } catch (error) {
      if (error.code === 'ENOENT') {
        try {
          const content = await readFile(legacyPath, 'utf-8');
          return this.parse(content, skillPath);
        } catch (legacyError) {
          if (legacyError.code === 'ENOENT') {
            throw new Error(`Skill not found: ${skillPath}`);
          }
          throw legacyError;
        }
      }
      throw error;
    }
  }

  /**
   * Parse skill content from markdown with frontmatter
   * @param {string} content - Raw markdown content
   * @param {string} path - Skill path for reference
   * @returns {Skill} Parsed skill object
   */
  static parse(content, path = 'unknown') {
    const { data: frontmatter, content: body } = matter(content);

    // Extract sections from markdown body
    const sections = this.extractSections(body);

    return {
      // Metadata from frontmatter
      name: frontmatter.name || path.split('/').pop(),
      version: frontmatter.version || '1.0.0',
      description: frontmatter.description || '',
      author: frontmatter.author || 'Unknown',
      tags: frontmatter.tags || [],
      platforms: frontmatter.platforms || ['any'],
      tools: frontmatter.tools || {},
      complexity: frontmatter.complexity || 'intermediate',
      estimatedTime: frontmatter.estimated_time || 'varies',

      // Path information
      path: path,
      category: path.split('/')[0] || 'uncategorized',

      // Content sections
      overview: sections.overview || sections.description || '',
      prerequisites: sections.prerequisites || '',
      procedure: sections.procedure || sections.steps || '',
      toolUsage: sections['tool usage'] || sections.tools || '',
      bestPractices: sections['best practices'] || '',
      troubleshooting: sections.troubleshooting || '',
      examples: sections.examples || '',

      // Raw content for full access
      rawContent: body,
      sourceContent: content,
      frontmatter: frontmatter,

      // Utility methods
      getInstructions() {
        return this.procedure;
      },

      getToolsForPlatform(platform) {
        if (!this.tools) return [];
        switch (platform) {
          case 'claude-code':
          case 'claude-desktop':
            return [...(this.tools.mcp || []), ...(this.tools.native || [])];
          case 'chatgpt':
            return this.tools.rest || [];
          default:
            return Object.values(this.tools).flat();
        }
      },

      toPrompt() {
        return `# ${this.name}\n\n${this.description}\n\n## Procedure\n${this.procedure}\n\n## Best Practices\n${this.bestPractices}`;
      }
    };
  }

  /**
   * Extract sections from markdown content
   * @param {string} content - Markdown content
   * @returns {Object} Sections keyed by heading
   */
  static extractSections(content) {
    const sections = {};
    const lines = content.split('\n');
    let currentSection = 'intro';
    let currentContent = [];

    for (const line of lines) {
      // Match ## headings (level 2)
      const headingMatch = line.match(/^##\s+(.+)$/);

      if (headingMatch) {
        // Save previous section
        if (currentContent.length > 0) {
          sections[currentSection.toLowerCase()] = currentContent.join('\n').trim();
        }
        // Start new section
        currentSection = headingMatch[1];
        currentContent = [];
      } else {
        currentContent.push(line);
      }
    }

    // Save last section
    if (currentContent.length > 0) {
      sections[currentSection.toLowerCase()] = currentContent.join('\n').trim();
    }

    return sections;
  }

  /**
   * Load multiple skills at once
   * @param {string[]} skillPaths - Array of skill paths
   * @returns {Promise<Skill[]>} Array of parsed skills
   */
  static async loadMultiple(skillPaths) {
    return Promise.all(skillPaths.map(path => this.load(path)));
  }
}

export default SkillLoader;
