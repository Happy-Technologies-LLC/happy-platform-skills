/**
 * Skill Validator - Validates skill files against the specification
 *
 * @author Happy Technologies LLC
 */

import { existsSync, realpathSync } from 'fs';
import { readdir, readFile } from 'fs/promises';
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'path';
import { fileURLToPath } from 'url';
import matter from 'gray-matter';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SKILLS_DIR = join(__dirname, '..', 'skills');
const REPOSITORY_ROOT = join(__dirname, '..');
const PACKAGE_MANIFEST = JSON.parse(await readFile(join(REPOSITORY_ROOT, 'package.json'), 'utf8'));
const PACKAGED_FILE_RULES = PACKAGE_MANIFEST.files || [];
const MCP_TOOL_CONTRACT = JSON.parse(await readFile(
  join(REPOSITORY_ROOT, 'contracts', 'happy-platform-mcp-6.1.0.json'),
  'utf8'
));
const SUPPORTED_MCP_TOOLS = new Set(MCP_TOOL_CONTRACT.tools);

const RELEASE_SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const VALID_TOOL_TYPES = ['mcp', 'rest', 'native', 'cli'];

// Required frontmatter fields
const REQUIRED_FIELDS = ['name', 'version', 'description'];

// Optional but recommended fields
const RECOMMENDED_FIELDS = ['author', 'tags', 'platforms', 'tools', 'complexity', 'estimated_time'];

// Valid values for enumerated fields
const VALID_VALUES = {
  complexity: ['beginner', 'intermediate', 'advanced', 'expert'],
  platforms: ['claude-code', 'claude-desktop', 'chatgpt', 'cursor', 'any']
};

// Required sections in the skill body
const REQUIRED_SECTIONS = ['overview', 'prerequisites', 'procedure'];

// Recommended sections
const RECOMMENDED_SECTIONS = ['best practices'];

export class SkillValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.sourcePath = 'unknown';
    this.content = '';
    this.frontmatter = null;
  }

  /**
   * Validate a single skill file
   * @param {string} content - Raw markdown content
   * @param {string} path - Skill path for error messages
   * @param {object} options - Source context for path-aware validation
   * @returns {ValidationResult} Validation result
   */
  validate(content, path = 'unknown', options = {}) {
    this.errors = [];
    this.warnings = [];
    this.sourcePath = options.sourcePath || path;
    this.content = content;
    this.frontmatter = null;

    let frontmatter, body;

    // Parse frontmatter
    try {
      const parsed = matter(content);
      frontmatter = parsed.data;
      body = parsed.content;
      this.frontmatter = frontmatter;
    } catch (error) {
      const line = error.mark?.line === undefined ? 1 : error.mark.line + 2;
      this.error(line, `Invalid YAML frontmatter: ${error.message}`);
      return this.getResult(path);
    }

    // Validate frontmatter
    this.validateFrontmatter(frontmatter, path, options);

    // Validate body sections
    this.validateSections(body);

    // Validate tools specification
    if (Object.hasOwn(frontmatter, 'tools')) {
      this.validateTools(frontmatter.tools);
    }

    this.validateBodyTools(body, path);
    if (options.catalogPaths) {
      this.validateReferences(body, options);
    }

    return this.getResult(path);
  }

  /**
   * Validate frontmatter fields
   * @param {Object} frontmatter - Parsed frontmatter
   * @param {string} path - Logical skill path
   * @param {object} options - Source context
   */
  validateFrontmatter(frontmatter, path, options) {
    // Check required fields
    for (const field of REQUIRED_FIELDS) {
      if (!Object.hasOwn(frontmatter, field)) {
        this.error(this.frontmatterLine(field), `Missing required field: ${field}`);
      }
    }

    // Check recommended fields
    for (const field of RECOMMENDED_FIELDS) {
      if (!Object.hasOwn(frontmatter, field)) {
        this.warning(this.frontmatterLine(field), `Missing recommended field: ${field}`);
      }
    }

    const expectedSlug = options.skillSlug || this.inferSkillSlug(path, options.sourcePath);
    const category = path.includes('/') ? path.split('/')[0] : null;
    if (Object.hasOwn(frontmatter, 'name')) {
      const name = frontmatter.name;
      if (typeof name !== 'string' || !SLUG.test(name)) {
        this.error(this.frontmatterLine('name'), 'name must be a nonempty lowercase kebab-case slug');
      } else if (expectedSlug && ![expectedSlug, category && `${category}-${expectedSlug}`].includes(name)) {
        this.error(
          this.frontmatterLine('name'),
          `frontmatter name "${name}" must be path-derived: "${expectedSlug}" or "${category}-${expectedSlug}"`
        );
      }
    }

    // The catalog uses release versions only: exactly major.minor.patch.
    if (Object.hasOwn(frontmatter, 'version') &&
        (typeof frontmatter.version !== 'string' || !RELEASE_SEMVER.test(frontmatter.version))) {
      this.error(
        this.frontmatterLine('version'),
        `version must be an exact release semantic version (major.minor.patch, no leading zero): ${String(frontmatter.version)}`
      );
    }

    if (Object.hasOwn(frontmatter, 'description') &&
        (typeof frontmatter.description !== 'string' ||
         frontmatter.description.trim().length === 0 ||
         frontmatter.description.length >= 200)) {
      this.error(
        this.frontmatterLine('description'),
        'description must be a nonempty string under 200 characters'
      );
    }

    // Validate complexity value
    if (Object.hasOwn(frontmatter, 'complexity') &&
        !VALID_VALUES.complexity.includes(frontmatter.complexity)) {
      this.error(
        this.frontmatterLine('complexity'),
        `Invalid complexity: ${frontmatter.complexity}. Valid: ${VALID_VALUES.complexity.join(', ')}`
      );
    }

    // Validate platforms
    if (Object.hasOwn(frontmatter, 'platforms')) {
      if (!Array.isArray(frontmatter.platforms)) {
        this.error(this.frontmatterLine('platforms'), 'platforms must be an array');
      } else if (frontmatter.platforms.length === 0) {
        this.error(this.frontmatterLine('platforms'), 'platforms must contain at least one supported platform');
      } else {
        for (const platform of frontmatter.platforms) {
          if (typeof platform !== 'string' || !VALID_VALUES.platforms.includes(platform)) {
            this.error(this.frontmatterLine('platforms'), `platforms contains unknown or invalid entry: ${String(platform)}`);
          }
        }
      }
    }

    // Validate tags
    if (Object.hasOwn(frontmatter, 'tags')) {
      if (!Array.isArray(frontmatter.tags)) {
        this.error(this.frontmatterLine('tags'), 'tags must be an array');
      } else if (frontmatter.tags.length === 0) {
        this.error(this.frontmatterLine('tags'), 'tags must contain at least one lowercase slug');
      } else {
        for (const tag of frontmatter.tags) {
          if (typeof tag !== 'string' || !SLUG.test(tag)) {
            this.error(
              this.frontmatterLine('tags'),
              `tags entries must be nonempty lowercase slugs: ${String(tag)}`
            );
          }
        }
      }
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
        this.error(1, `Missing required section: ## ${this.sectionTitle(section)}`);
      }
    }

    // Check recommended sections
    for (const section of RECOMMENDED_SECTIONS) {
      if (!lowerSections.includes(section)) {
        this.warning(1, `Missing recommended section: ## ${this.sectionTitle(section)}`);
      }
    }

    for (const section of REQUIRED_SECTIONS) {
      if (lowerSections.includes(section)) {
        const sectionContent = this.getSectionContent(body, section);
        if (sectionContent.trim().length === 0) {
          this.error(this.sectionLine(body, section), `Required section is empty: ## ${this.sectionTitle(section)}`);
        }
      }
    }

    const procedureContent = this.getSectionContent(body, 'procedure');
    if (procedureContent && procedureContent.trim().length < 50) {
      this.warning(this.sectionLine(body, 'procedure'), 'Procedure section seems too short');
    }
  }

  /**
   * Validate tools specification
   * @param {Object} tools - Tools configuration
   */
  validateTools(tools) {
    const line = this.frontmatterLine('tools');
    if (!tools || typeof tools !== 'object' || Array.isArray(tools)) {
      this.error(line, 'tools must be an object keyed by mcp, rest, native, or cli');
      return;
    }
    if (Object.keys(tools).length === 0) {
      this.error(line, 'tools must declare at least one tool type');
      return;
    }

    for (const [type, toolList] of Object.entries(tools)) {
      if (!VALID_TOOL_TYPES.includes(type)) {
        this.error(line, `tools contains unknown tool type: ${type}`);
      }

      if (!Array.isArray(toolList)) {
        this.error(line, `tools.${type} must be an array`);
        continue;
      }
      if (toolList.length === 0) {
        this.error(line, `tools.${type} must contain at least one tool`);
      }
      for (const toolName of toolList) {
        if (typeof toolName !== 'string' || toolName.trim().length === 0) {
          this.error(line, `tools.${type} entries must be nonempty strings; received ${String(toolName)}`);
          continue;
        }
        if (type === 'mcp') {
          if (!SUPPORTED_MCP_TOOLS.has(toolName)) {
            this.error(line, `tools.mcp contains unsupported tool: ${toolName}`);
          }
        }
      }
    }
  }

  /**
   * Validate operative MCP references in a Markdown body. Deliberately match
   * only exact SN-style names, not prefixes or wildcard families. Ambiguous
   * prose labels should be written out rather than shaped like tool names.
   * @param {string} body - Markdown body
   * @param {string} path - Source path for diagnostics
   */
  validateBodyTools(body, path) {
    const toolNames = new Set();
    for (const match of body.matchAll(/\b(SN-[A-Za-z0-9-]*[A-Za-z0-9])\b/g)) toolNames.add(match[1]);
    const bodyStartLine = this.lineOf(this.content, body, this.content.indexOf(body));

    for (const toolName of toolNames) {
      if (!SUPPORTED_MCP_TOOLS.has(toolName)) {
        const line = bodyStartLine + this.lineOf(body, toolName) - 1;
        this.error(line, `Unsupported MCP tool: ${toolName}`);
      }
    }
  }

  /**
   * Validate local Markdown links and references declared in Related Skills.
   * Related targets accept `category/slug`, a same-category `slug`, or a
   * Markdown link that resolves to another catalog skill.
   */
  validateReferences(body, { sourcePath, catalogPaths, skillsRoot }) {
    if (!sourcePath) return;
    const absoluteSourcePath = isAbsolute(sourcePath)
      ? sourcePath
      : resolve(sourcePath);
    const catalog = new Set(catalogPaths);
    const bodyStartLine = this.lineOf(this.content, body, this.content.indexOf(body));
    const absoluteRoot = dirname(resolve(skillsRoot));
    const canonicalRoot = realpathSync(absoluteRoot);

    for (const link of this.markdownLinks(body)) {
      const linkLine = bodyStartLine + (link.targetLine ?? link.line) - 1;
      let decodedTarget;
      try {
        decodedTarget = decodeURIComponent(link.target);
      } catch {
        this.error(linkLine, `Malformed percent-encoding in Markdown link: ${link.target}`);
        continue;
      }
      if (decodedTarget.startsWith('#')) continue;
      const scheme = this.uriScheme(decodedTarget);
      if (scheme && ['http', 'https'].includes(scheme)) continue;
      if (scheme && ['javascript', 'data', 'file'].includes(scheme)) {
        this.error(linkLine, `Unsafe Markdown link scheme: ${link.target}`);
        continue;
      }
      if (scheme || decodedTarget.startsWith('//')) {
        this.error(linkLine, `Unsupported Markdown URI scheme: ${link.target}`);
        continue;
      }
      const targetWithoutFragment = decodedTarget.split('#')[0];
      if (!targetWithoutFragment) continue;
      if (this.isAbsoluteFilesystemPath(targetWithoutFragment)) {
        this.error(linkLine, `Absolute local Markdown link is not allowed: ${link.target}`);
        continue;
      }
      const absoluteTarget = resolve(dirname(absoluteSourcePath), targetWithoutFragment);
      if (!this.isPathContained(absoluteRoot, absoluteTarget)) {
        this.error(linkLine, `Local Markdown link escapes the packed root: ${link.target}`);
        continue;
      }
      if (!existsSync(absoluteTarget)) {
        this.error(linkLine, `Broken local Markdown link: ${link.target}`);
        continue;
      }
      const canonicalTarget = realpathSync(absoluteTarget);
      if (!this.isPathContained(canonicalRoot, canonicalTarget)) {
        this.error(linkLine, `Local Markdown link resolves outside the packed root: ${link.target}`);
      } else if (!this.isPackagedPath(canonicalRoot, canonicalTarget)) {
        this.error(linkLine, `Local Markdown link target is not included in the package: ${link.target}`);
      }
    }

    const related = this.getSectionWithOffset(body, 'related skills');
    if (!related) return;
    const category = this.inferCategoryFromSource(sourcePath);
    const currentCatalogPath = this.catalogPathForLocalTarget(dirname(absoluteSourcePath), skillsRoot);
    const seenTargets = new Set();
    const recordTarget = (target, line) => {
      if (target === currentCatalogPath) {
        this.error(line, `Related Skills target must not reference itself: ${target}`);
      }
      if (seenTargets.has(target)) {
        this.error(line, `Duplicate Related Skills target: ${target}`);
      } else {
        seenTargets.add(target);
      }
    };
    const relatedLinks = this.markdownLinks(related.content, body);
    const markdownTargets = new Set(relatedLinks.map(link => link.raw));
    for (const link of relatedLinks) {
      const line = related.startLine + link.line - 1;
      let decodedTarget;
      try {
        decodedTarget = decodeURIComponent(link.target);
      } catch {
        continue;
      }
      if (this.uriScheme(decodedTarget) || decodedTarget.startsWith('//') || decodedTarget.startsWith('#')) {
        this.error(line, `Related Skills Markdown link must resolve to a catalog skill: ${link.target}`);
        continue;
      }
      decodedTarget = decodedTarget.split('#')[0];
      if (this.isAbsoluteFilesystemPath(decodedTarget)) continue;
      const absoluteTarget = resolve(dirname(absoluteSourcePath), decodedTarget);
      const catalogTarget = this.catalogPathForLocalTarget(absoluteTarget, skillsRoot);
      if (!catalogTarget || !catalog.has(catalogTarget)) {
        this.error(line, `Related Skills Markdown link does not resolve to a catalog skill: ${link.target}`);
      } else {
        recordTarget(catalogTarget, line);
      }
    }
    for (const candidate of this.relatedSkillCandidates(related.content)) {
      if (markdownTargets.has(candidate.raw)) continue;
      const normalized = candidate.target.includes('/')
        ? candidate.target
        : `${category}/${candidate.target}`;
      if (!catalog.has(normalized)) {
        this.error(
          related.startLine + candidate.line - 1,
          `Unknown related skill target: ${candidate.target}`
        );
      } else {
        recordTarget(normalized, related.startLine + candidate.line - 1);
      }
    }
    for (const entry of this.unsupportedRelatedEntries(related.content, body)) {
      this.error(
        related.startLine + entry.line - 1,
        `Related Skills entry must resolve to a catalog skill: ${entry.target}`
      );
    }
  }

  markdownLinks(content, referenceSource = content) {
    const links = [];
    const occupied = [];
    const definitions = new Map();
    const definitionPattern = /^ {0,3}\[([^\]\n]+)\]:[ \t]*(?:\n[ \t]+)?(?:<([^>\n]+)>|(\S+))(?:[ \t]+(?:"[^"\n]*"|'[^'\n]*'|\([^\)\n]*\)))?[ \t]*$/gm;
    for (const match of referenceSource.matchAll(definitionPattern)) {
      const label = this.normalizeReferenceLabel(match[1]);
      if (!definitions.has(label)) {
        const target = match[2] || match[3];
        const renderedTarget = match[2] ? `<${target}>` : target;
        const targetOffset = match[0].lastIndexOf(renderedTarget) + (match[2] ? 1 : 0);
        definitions.set(label, {
          target,
          line: this.lineOf(referenceSource, target, match.index + targetOffset)
        });
      }
      if (referenceSource === content) occupied.push([match.index, match.index + match[0].length]);
    }

    const pattern = /!?\[[^\]]*\]\(\s*(<[^>]+>|[^)\s]+)(?:\s+["'][^"']*["'])?\s*\)/g;
    for (const match of content.matchAll(pattern)) {
      const raw = match[0];
      const target = match[1].replace(/^<|>$/g, '');
      links.push({ raw, target, line: this.lineOf(content, raw, match.index) });
      occupied.push([match.index, match.index + raw.length]);
    }

    const referencePattern = /!?\[([^\]\n]*)\]\[([^\]\n]*)\]/g;
    for (const match of content.matchAll(referencePattern)) {
      const definition = definitions.get(this.normalizeReferenceLabel(match[2] || match[1]));
      if (!definition) continue;
      links.push({
        raw: match[0],
        target: definition.target,
        line: this.lineOf(content, match[0], match.index),
        targetLine: definition.line
      });
      occupied.push([match.index, match.index + match[0].length]);
    }

    const shortcutPattern = /!?\[([^\]\n]+)\](?![ \t]*(?:\(|\[|:))/g;
    for (const match of content.matchAll(shortcutPattern)) {
      if (occupied.some(([start, end]) => match.index >= start && match.index < end)) continue;
      const definition = definitions.get(this.normalizeReferenceLabel(match[1]));
      if (!definition) continue;
      links.push({
        raw: match[0],
        target: definition.target,
        line: this.lineOf(content, match[0], match.index),
        targetLine: definition.line
      });
    }

    const autolinkPattern = /<([a-z][a-z0-9+.-]*:[^<>\s]+)>/gi;
    for (const match of content.matchAll(autolinkPattern)) {
      if (occupied.some(([start, end]) => match.index >= start && match.index < end)) continue;
      links.push({
        raw: match[0],
        target: match[1],
        line: this.lineOf(content, match[0], match.index)
      });
    }
    return links;
  }

  normalizeReferenceLabel(label) {
    return label.trim().replace(/\s+/g, ' ').toLowerCase();
  }

  relatedSkillCandidates(content) {
    const candidates = [];
    const seen = new Set();
    const add = (target, raw, index) => {
      if (!/^(?:[a-z0-9]+(?:-[a-z0-9]+)*\/)?[a-z0-9]+(?:-[a-z0-9]+)*$/.test(target)) return;
      const key = `${index}:${target}`;
      if (seen.has(key)) return;
      seen.add(key);
      candidates.push({ target, raw, line: this.lineOf(content, raw, index) });
    };

    for (const match of content.matchAll(/`([^`]+)`/g)) add(match[1], match[0], match.index);
    for (const match of content.matchAll(/^\s*-\s+((?:[a-z0-9]+(?:-[a-z0-9]+)*\/)?[a-z0-9]+(?:-[a-z0-9]+)*)(?=\s+(?:-{1,2}|—)\s+|\s*$)/gm)) {
      add(match[1], match[0], match.index);
    }
    return candidates;
  }

  unsupportedRelatedEntries(content, referenceSource = content) {
    const entries = [];
    const slugTarget = '(?:[a-z0-9]+(?:-[a-z0-9]+)*\\/)?[a-z0-9]+(?:-[a-z0-9]+)*';
    const supported = new RegExp(`^(?:\`${slugTarget}\`|${slugTarget})(?:\\s+(?:-{1,2}|—)\\s+.*)?$`);
    for (const match of content.matchAll(/^\s*-\s+(.+?)\s*$/gm)) {
      const target = match[1].trim();
      if (this.markdownLinks(target, referenceSource).length > 0 || supported.test(target)) continue;
      entries.push({ target, line: this.lineOf(content, match[0], match.index) });
    }
    return entries;
  }

  uriScheme(target) {
    return /^([a-z][a-z0-9+.-]*):/i.exec(target)?.[1].toLowerCase() || null;
  }

  isAbsoluteFilesystemPath(target) {
    return /^(?:\/|[a-z]:[\\/]|\\\\)/i.test(target);
  }

  isPathContained(root, target) {
    const targetRelative = relative(resolve(root), resolve(target));
    return targetRelative !== '..' &&
      !targetRelative.startsWith(`..${sep}`) &&
      !isAbsolute(targetRelative);
  }

  isPackagedPath(root, target) {
    const packagedPath = relative(resolve(root), resolve(target)).split(sep).join('/');
    if (packagedPath === 'package.json') return true;
    return PACKAGED_FILE_RULES.some(rule => {
      if (rule.endsWith('/**/*')) {
        const prefix = rule.slice(0, -5);
        return packagedPath === prefix || packagedPath.startsWith(`${prefix}/`);
      }
      return packagedPath === rule;
    });
  }

  inferSkillSlug(path, sourcePath) {
    if (sourcePath) return basename(dirname(sourcePath));
    if (/^[^/]+\/[^/]+$/.test(path) && !path.startsWith('fixtures/')) {
      return path.split('/')[1];
    }
    return null;
  }

  inferCategoryFromSource(sourcePath) {
    const parts = sourcePath.split(/[\\/]/);
    const skillsIndex = parts.lastIndexOf('skills');
    return skillsIndex >= 0 ? parts[skillsIndex + 1] : parts.at(-3);
  }

  catalogPathForLocalTarget(absoluteTarget, skillsRoot) {
    if (!skillsRoot) return null;
    const root = resolve(skillsRoot);
    let target = absoluteTarget;
    if (basename(target) === 'SKILL.md') target = dirname(target);
    const targetRelative = relative(root, target);
    if (targetRelative.startsWith('..') || isAbsolute(targetRelative)) return null;
    const parts = targetRelative.split(sep);
    return parts.length === 2 ? parts.join('/') : null;
  }

  frontmatterLine(field) {
    const match = this.content.match(new RegExp(`^${field}:`, 'm'));
    return match ? this.lineOf(this.content, match[0], match.index) : 1;
  }

  sectionLine(body, sectionName) {
    const match = body.match(new RegExp(`^##\\s+${sectionName}\\s*$`, 'im'));
    return match ? this.lineOf(this.content, match[0], this.content.indexOf(match[0])) : 1;
  }

  sectionTitle(section) {
    return section.replace(/\b\w/g, letter => letter.toUpperCase());
  }

  getSectionWithOffset(body, sectionName) {
    const heading = new RegExp(`^##\\s+${sectionName}\\s*$`, 'im');
    const match = heading.exec(body);
    if (!match) return null;
    const start = match.index + match[0].length;
    const rest = body.slice(start);
    const next = rest.search(/^##\s/m);
    const content = next === -1 ? rest : rest.slice(0, next);
    const bodyOffset = this.content.indexOf(body);
    return {
      content,
      startLine: this.lineOf(this.content, match[0], bodyOffset + match.index) + 1
    };
  }

  lineOf(content, needle, index = content.indexOf(needle)) {
    if (index < 0) return 1;
    return content.slice(0, index).split('\n').length;
  }

  error(line, message) {
    this.errors.push(`${this.sourcePath}:${line}: ${message}`);
  }

  warning(line, message) {
    this.warnings.push(`${this.sourcePath}:${line}: ${message}`);
  }

  /** Validate operative tool references in non-skill Markdown documents. */
  static async validateContractDocuments() {
    const docsRoot = join(REPOSITORY_ROOT, 'docs');
    const docsEntries = await readdir(docsRoot, { recursive: true });
    const documents = [
      'SKILL.md',
      'README.md',
      ...docsEntries
        .filter(entry => entry.endsWith('.md'))
        .map(entry => `docs/${entry}`)
    ].sort();
    const results = [];
    for (const documentPath of documents) {
      const content = await readFile(join(REPOSITORY_ROOT, documentPath), 'utf8');
      const validator = new SkillValidator();
      validator.sourcePath = documentPath;
      validator.content = content;
      validator.validateBodyTools(content, documentPath);
      results.push(validator.getResult(documentPath));
    }
    return results;
  }

  /**
   * Validate one catalog skill with the same path and reference context used by
   * full-catalog validation.
   * @param {string} skillPath - Logical category/skill path
   * @param {object} options - Catalog location override for tests/consumers
   * @returns {Promise<ValidationResult>} Validation result
   */
  static async validateOne(skillPath, { skillsDir = SKILLS_DIR } = {}) {
    const results = await SkillValidator.validateAll({
      includeContractDocuments: false,
      skillsDir
    });
    const result = results.find(candidate => candidate.path === skillPath);
    if (!result) throw new Error(`Skill not found: ${skillPath}`);
    return result;
  }

  static unreadableResult(skillPath, sourcePath, error, isDirectory) {
    const message = error?.code === 'ENOENT' && isDirectory
      ? `${sourcePath}:1: Missing required skill file: SKILL.md`
      : `${sourcePath}:1: Could not read file: ${error?.message || 'unknown error'}`;
    return {
      path: skillPath,
      valid: false,
      errors: [message],
      warnings: [],
      summary: '❌ Could not read file'
    };
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
  static async validateAll({
    includeContractDocuments = true,
    skillsDir = SKILLS_DIR
  } = {}) {
    const results = [];
    const nameOwners = new Map();
    const categories = await readdir(skillsDir, { withFileTypes: true });
    const catalogPaths = new Set();
    const skillFiles = [];

    for (const category of categories) {
      if (!category.isDirectory()) continue;
      const categoryPath = join(skillsDir, category.name);
      const items = await readdir(categoryPath, { withFileTypes: true });
      for (const item of items) {
        if (!item.isDirectory() && !item.name.endsWith('.md')) continue;
        const slug = item.isDirectory() ? item.name : item.name.replace(/\.md$/, '');
        const skillPath = `${category.name}/${slug}`;
        const fullPath = item.isDirectory()
          ? join(categoryPath, item.name, 'SKILL.md')
          : join(categoryPath, item.name);
        const descriptor = { fullPath, isDirectory: item.isDirectory(), skillPath, slug };
        skillFiles.push(descriptor);
        try {
          descriptor.content = await readFile(fullPath, 'utf-8');
          matter(descriptor.content);
          catalogPaths.add(skillPath);
        } catch (error) {
          descriptor.error = error;
        }
      }
    }

    for (const { content, error, fullPath, isDirectory, skillPath, slug } of skillFiles) {
      if (content !== undefined) {
        try {
          const validator = new SkillValidator();
          const result = validator.validate(content, skillPath, {
            sourcePath: fullPath,
            skillSlug: slug,
            catalogPaths,
            skillsRoot: skillsDir
          });
          results.push(result);
          const name = validator.frontmatter?.name;
          if (typeof name === 'string') {
            const owners = nameOwners.get(name) || [];
            owners.push({ result, sourcePath: fullPath, line: validator.frontmatterLine('name') });
            nameOwners.set(name, owners);
          }
        } catch (validationError) {
          results.push(SkillValidator.unreadableResult(skillPath, fullPath, validationError, isDirectory));
        }
      } else {
        results.push(SkillValidator.unreadableResult(skillPath, fullPath, error, isDirectory));
      }
    }

    for (const [name, owners] of nameOwners) {
      if (owners.length < 2) continue;
      for (const owner of owners) {
        owner.result.errors.push(
          `${owner.sourcePath}:${owner.line}: frontmatter name "${name}" must be globally unique`
        );
        owner.result.valid = false;
        owner.result.summary = `❌ Invalid: ${owner.result.errors.length} error(s)`;
      }
    }

    if (includeContractDocuments) {
      results.push(...await SkillValidator.validateContractDocuments());
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
