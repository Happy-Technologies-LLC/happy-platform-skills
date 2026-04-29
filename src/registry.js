/**
 * Skill Registry - Discovers and indexes all available skills
 *
 * @author Happy Technologies LLC
 */

import { readdir, readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import matter from 'gray-matter';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SKILLS_DIR = join(__dirname, '..', 'skills');

export class SkillRegistry {
  constructor() {
    this.skills = new Map();
    this.index = {
      byTag: new Map(),
      byCategory: new Map(),
      byPlatform: new Map(),
      byComplexity: new Map()
    };
    this.discovered = false;
  }

  /**
   * Discover all skills in the skills directory
   * @returns {Promise<void>}
   */
  async discover() {
    const categories = await readdir(SKILLS_DIR, { withFileTypes: true });

    for (const category of categories) {
      if (!category.isDirectory()) continue;

      const categoryPath = join(SKILLS_DIR, category.name);
      const items = await readdir(categoryPath, { withFileTypes: true });

      for (const item of items) {
        let skillPath;
        let fullPath;

        if (item.isDirectory()) {
          skillPath = `${category.name}/${item.name}`;
          fullPath = join(categoryPath, item.name, 'SKILL.md');
        } else if (item.name.endsWith('.md')) {
          skillPath = `${category.name}/${item.name.replace('.md', '')}`;
          fullPath = join(categoryPath, item.name);
        } else {
          continue;
        }

        try {
          const content = await readFile(fullPath, 'utf-8');
          const { data: frontmatter } = matter(content);

          const fallbackName = item.isDirectory() ? item.name : item.name.replace('.md', '');
          const skillInfo = {
            path: skillPath,
            name: frontmatter.name || fallbackName,
            description: frontmatter.description || '',
            version: frontmatter.version || '1.0.0',
            author: frontmatter.author || 'Unknown',
            tags: frontmatter.tags || [],
            platforms: frontmatter.platforms || ['any'],
            complexity: frontmatter.complexity || 'intermediate',
            category: category.name,
            tools: frontmatter.tools || {}
          };

          this.skills.set(skillPath, skillInfo);
          this.indexSkill(skillInfo);
        } catch (error) {
          if (error.code !== 'ENOENT') {
            console.warn(`Warning: Could not parse skill ${skillPath}: ${error.message}`);
          }
        }
      }
    }

    this.discovered = true;
  }

  /**
   * Index a skill for fast lookup
   * @param {Object} skill - Skill info object
   */
  indexSkill(skill) {
    // Index by tags
    for (const tag of skill.tags) {
      if (!this.index.byTag.has(tag)) {
        this.index.byTag.set(tag, []);
      }
      this.index.byTag.get(tag).push(skill.path);
    }

    // Index by category
    if (!this.index.byCategory.has(skill.category)) {
      this.index.byCategory.set(skill.category, []);
    }
    this.index.byCategory.get(skill.category).push(skill.path);

    // Index by platform
    for (const platform of skill.platforms) {
      if (!this.index.byPlatform.has(platform)) {
        this.index.byPlatform.set(platform, []);
      }
      this.index.byPlatform.get(platform).push(skill.path);
    }

    // Index by complexity
    if (!this.index.byComplexity.has(skill.complexity)) {
      this.index.byComplexity.set(skill.complexity, []);
    }
    this.index.byComplexity.get(skill.complexity).push(skill.path);
  }

  /**
   * Find skills by tag
   * @param {string} tag - Tag to search for
   * @returns {Object[]} Array of skill info objects
   */
  findByTag(tag) {
    const paths = this.index.byTag.get(tag.toLowerCase()) || [];
    return paths.map(p => this.skills.get(p));
  }

  /**
   * Find skills by category
   * @param {string} category - Category name
   * @returns {Object[]} Array of skill info objects
   */
  findByCategory(category) {
    const paths = this.index.byCategory.get(category.toLowerCase()) || [];
    return paths.map(p => this.skills.get(p));
  }

  /**
   * Find skills by platform
   * @param {string} platform - Platform name
   * @returns {Object[]} Array of skill info objects
   */
  findByPlatform(platform) {
    const paths = this.index.byPlatform.get(platform.toLowerCase()) || [];
    const anyPlatform = this.index.byPlatform.get('any') || [];
    const combined = [...new Set([...paths, ...anyPlatform])];
    return combined.map(p => this.skills.get(p));
  }

  /**
   * Search skills by name or description
   * @param {string} query - Search query
   * @returns {Object[]} Array of matching skill info objects
   */
  search(query) {
    const lowerQuery = query.toLowerCase();
    const results = [];

    for (const skill of this.skills.values()) {
      const searchText = `${skill.name} ${skill.description} ${skill.tags.join(' ')}`.toLowerCase();
      if (searchText.includes(lowerQuery)) {
        results.push(skill);
      }
    }

    return results;
  }

  /**
   * Get all skills
   * @returns {Object[]} Array of all skill info objects
   */
  getAll() {
    return Array.from(this.skills.values());
  }

  /**
   * Get skill by path
   * @param {string} path - Skill path
   * @returns {Object|undefined} Skill info or undefined
   */
  get(path) {
    return this.skills.get(path);
  }

  /**
   * Get all categories
   * @returns {string[]} Array of category names
   */
  getCategories() {
    return Array.from(this.index.byCategory.keys());
  }

  /**
   * Get all tags
   * @returns {string[]} Array of tag names
   */
  getTags() {
    return Array.from(this.index.byTag.keys());
  }

  /**
   * Get statistics about the registry
   * @returns {Object} Statistics object
   */
  getStats() {
    return {
      totalSkills: this.skills.size,
      categories: this.index.byCategory.size,
      tags: this.index.byTag.size,
      platforms: this.index.byPlatform.size,
      byCategory: Object.fromEntries(
        Array.from(this.index.byCategory.entries())
          .map(([k, v]) => [k, v.length])
      ),
      byComplexity: Object.fromEntries(
        Array.from(this.index.byComplexity.entries())
          .map(([k, v]) => [k, v.length])
      )
    };
  }
}

export default SkillRegistry;
