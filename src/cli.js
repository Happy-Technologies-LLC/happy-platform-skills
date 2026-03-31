#!/usr/bin/env node

/**
 * Happy Platform Skills CLI
 *
 * @author Happy Technologies LLC
 */

import { program } from 'commander';
import chalk from 'chalk';
import { SkillLoader } from './loader.js';
import { SkillRegistry } from './registry.js';
import { SkillValidator } from './validator.js';

const registry = new SkillRegistry();

program
  .name('hps')
  .description('Happy Platform Skills - Reusable development patterns for enterprise platforms')
  .version('2.0.0');

// List command
program
  .command('list')
  .description('List all available skills')
  .option('-c, --category <category>', 'Filter by category')
  .option('-t, --tag <tag>', 'Filter by tag')
  .option('-p, --platform <platform>', 'Filter by platform')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    await registry.discover();

    let skills;

    if (options.category) {
      skills = registry.findByCategory(options.category);
    } else if (options.tag) {
      skills = registry.findByTag(options.tag);
    } else if (options.platform) {
      skills = registry.findByPlatform(options.platform);
    } else {
      skills = registry.getAll();
    }

    if (options.json) {
      console.log(JSON.stringify(skills, null, 2));
      return;
    }

    console.log(chalk.bold('\n🎯 Happy Platform Skills\n'));

    // Group by category
    const byCategory = {};
    for (const skill of skills) {
      if (!byCategory[skill.category]) {
        byCategory[skill.category] = [];
      }
      byCategory[skill.category].push(skill);
    }

    for (const [category, categorySkills] of Object.entries(byCategory)) {
      console.log(chalk.cyan.bold(`\n📁 ${category.toUpperCase()}`));

      for (const skill of categorySkills) {
        const complexity = {
          beginner: chalk.green('●'),
          intermediate: chalk.yellow('●●'),
          advanced: chalk.red('●●●'),
          expert: chalk.magenta('●●●●')
        }[skill.complexity] || chalk.gray('○');

        console.log(`  ${complexity} ${chalk.white(skill.name)} - ${chalk.gray(skill.description)}`);
        console.log(`     ${chalk.dim(`Path: ${skill.path} | Tags: ${skill.tags.join(', ')}`)}`);
      }
    }

    console.log(chalk.dim(`\n📊 Total: ${skills.length} skills\n`));
  });

// Search command
program
  .command('search <query>')
  .description('Search skills by name, description, or tags')
  .option('--json', 'Output as JSON')
  .action(async (query, options) => {
    await registry.discover();
    const results = registry.search(query);

    if (options.json) {
      console.log(JSON.stringify(results, null, 2));
      return;
    }

    if (results.length === 0) {
      console.log(chalk.yellow(`\nNo skills found matching "${query}"\n`));
      return;
    }

    console.log(chalk.bold(`\n🔍 Search results for "${query}":\n`));

    for (const skill of results) {
      console.log(`  ${chalk.cyan(skill.path)}`);
      console.log(`     ${skill.description}`);
      console.log(`     ${chalk.dim(`Tags: ${skill.tags.join(', ')}`)}`);
      console.log();
    }
  });

// Load command
program
  .command('load <skill-path>')
  .description('Load and display a skill')
  .option('-s, --section <section>', 'Show specific section only')
  .option('--prompt', 'Output as prompt-ready format')
  .option('--json', 'Output as JSON')
  .action(async (skillPath, options) => {
    try {
      const skill = await SkillLoader.load(skillPath);

      if (options.json) {
        console.log(JSON.stringify(skill, null, 2));
        return;
      }

      if (options.prompt) {
        console.log(skill.toPrompt());
        return;
      }

      if (options.section) {
        const section = skill[options.section] || skill.rawContent;
        console.log(section);
        return;
      }

      // Full display
      console.log(chalk.bold.cyan(`\n# ${skill.name} v${skill.version}\n`));
      console.log(chalk.white(skill.description));
      console.log(chalk.dim(`\nAuthor: ${skill.author}`));
      console.log(chalk.dim(`Category: ${skill.category}`));
      console.log(chalk.dim(`Complexity: ${skill.complexity}`));
      console.log(chalk.dim(`Tags: ${skill.tags.join(', ')}`));
      console.log(chalk.dim(`Platforms: ${skill.platforms.join(', ')}`));

      if (skill.tools && Object.keys(skill.tools).length > 0) {
        console.log(chalk.dim('\nTools:'));
        for (const [type, tools] of Object.entries(skill.tools)) {
          console.log(chalk.dim(`  ${type}: ${tools.join(', ')}`));
        }
      }

      console.log(chalk.cyan('\n## Procedure\n'));
      console.log(skill.procedure || skill.rawContent);

    } catch (error) {
      console.error(chalk.red(`\n❌ Error: ${error.message}\n`));
      process.exit(1);
    }
  });

// Info command
program
  .command('info <skill-path>')
  .description('Show skill metadata')
  .action(async (skillPath) => {
    await registry.discover();
    const skill = registry.get(skillPath);

    if (!skill) {
      console.error(chalk.red(`\n❌ Skill not found: ${skillPath}\n`));
      process.exit(1);
    }

    console.log(chalk.bold(`\n📋 ${skill.name}\n`));
    console.log(`Description: ${skill.description}`);
    console.log(`Version:     ${skill.version}`);
    console.log(`Author:      ${skill.author}`);
    console.log(`Category:    ${skill.category}`);
    console.log(`Complexity:  ${skill.complexity}`);
    console.log(`Tags:        ${skill.tags.join(', ')}`);
    console.log(`Platforms:   ${skill.platforms.join(', ')}`);
    console.log();
  });

// Validate command
program
  .command('validate [skill-path]')
  .description('Validate skill files')
  .action(async (skillPath) => {
    if (skillPath) {
      const skill = await SkillLoader.load(skillPath);
      const validator = new SkillValidator();
      const result = validator.validate(skill.rawContent, skillPath);

      console.log(`\n${result.summary}\n`);
      result.errors.forEach(e => console.log(chalk.red(`  ❌ ${e}`)));
      result.warnings.forEach(w => console.log(chalk.yellow(`  ⚠️  ${w}`)));

      process.exit(result.valid ? 0 : 1);
    } else {
      console.log(chalk.bold('\n🔍 Validating all skills...\n'));

      const results = await SkillValidator.validateAll();
      let valid = 0;
      let invalid = 0;

      for (const result of results) {
        const icon = result.valid ? chalk.green('✓') : chalk.red('✗');
        console.log(`${icon} ${result.path}`);

        if (!result.valid) {
          result.errors.forEach(e => console.log(chalk.red(`    ${e}`)));
          invalid++;
        } else {
          valid++;
        }
      }

      console.log(chalk.bold(`\n📊 ${valid} valid, ${invalid} invalid\n`));
      process.exit(invalid > 0 ? 1 : 0);
    }
  });

// Stats command
program
  .command('stats')
  .description('Show skills library statistics')
  .action(async () => {
    await registry.discover();
    const stats = registry.getStats();

    console.log(chalk.bold('\n📊 Happy Platform Skills Statistics\n'));
    console.log(`Total Skills:  ${chalk.cyan(stats.totalSkills)}`);
    console.log(`Categories:    ${chalk.cyan(stats.categories)}`);
    console.log(`Unique Tags:   ${chalk.cyan(stats.tags)}`);

    console.log(chalk.bold('\nBy Category:'));
    for (const [cat, count] of Object.entries(stats.byCategory)) {
      console.log(`  ${cat}: ${count}`);
    }

    console.log(chalk.bold('\nBy Complexity:'));
    for (const [complexity, count] of Object.entries(stats.byComplexity)) {
      console.log(`  ${complexity}: ${count}`);
    }

    console.log();
  });

// Categories command
program
  .command('categories')
  .description('List all categories')
  .action(async () => {
    await registry.discover();
    const categories = registry.getCategories();

    console.log(chalk.bold('\n📁 Categories:\n'));
    categories.forEach(c => console.log(`  • ${c}`));
    console.log();
  });

// Tags command
program
  .command('tags')
  .description('List all tags')
  .action(async () => {
    await registry.discover();
    const tags = registry.getTags();

    console.log(chalk.bold('\n🏷️  Tags:\n'));
    console.log(`  ${tags.join(', ')}`);
    console.log();
  });

program.parse();
