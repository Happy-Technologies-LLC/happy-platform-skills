# Skill Template

Use this template when contributing a new skill to Happy Platform Skills.

## Directory Structure

```
skills/
  <category>/
    my-skill.md        # Your skill file (required)
```

Each skill is a single Markdown file placed in the appropriate category directory.

## Quick Start

```bash
# 1. Copy the template into the right category
cp templates/skill-template/skill.md skills/<category>/my-skill.md

# 2. Edit the file — fill in frontmatter and all sections
# 3. Validate
npm run validate

# 4. Submit a PR (see CONTRIBUTING.md)
```

## Naming Rules

Skill file names must follow these rules:

1. **Use lowercase kebab-case:** `incident-triage.md`, `contract-analysis.md`
2. **No vendor or trademarked names:** Do not include platform vendor names in file names.
   - Good: `incident-triage.md`
   - Bad: `servicenow-incident-triage.md`
3. **Describe the action, not the platform:** Focus on what the skill does.
   - Good: `flow-generation.md`, `ai-search-rag.md`
   - Bad: `now-assist-setup.md`
4. **Keep it concise:** 2-4 words, max 40 characters.

## Frontmatter Fields

| Field | Required | Description |
|-------|----------|-------------|
| `name` | Yes | Skill identifier (matches filename without `.md`) |
| `version` | Yes | Semantic version (e.g., `1.0.0`) |
| `description` | Yes | One-line summary of the skill |
| `author` | Yes | Your name or organization |
| `tags` | Yes | Array of searchable tags |
| `platforms` | Yes | Compatible AI platforms |
| `tools.mcp` | No | MCP tools used by this skill |
| `tools.rest` | No | REST API endpoints used |
| `tools.native` | No | Native AI agent tools used |
| `complexity` | Yes | `beginner`, `intermediate`, `advanced`, or `expert` |
| `estimated_time` | Yes | Expected time range (e.g., `5-15 minutes`) |

## Required Sections

Every skill must include all of the following sections:

1. **Overview** — What, who, and why
2. **Prerequisites** — Roles, permissions, dependencies
3. **Procedure** — Step-by-step with MCP and REST alternatives
4. **Tool Usage** — Tables listing tools and their purposes
5. **Best Practices** — Industry-aligned recommendations
6. **Troubleshooting** — Real-world issues and fixes

Optional but encouraged:
- **Examples** — Concrete input/output demonstrations
- **Related Skills** — Cross-references to related content
- **References** — Links to public documentation

## Trademark Compliance

- Never use trademarked vendor names in file or directory names
- Use ® on first mention of registered trademarks within document body
- Prefer generic terminology: "platform," "instance," "service management"
- All content must be original — no copied vendor docs or sample code

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for the full trademark guidelines.
