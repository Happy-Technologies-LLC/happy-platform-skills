<p align="center">
  <img src="https://happy-tech.biz/images/logo.svg" alt="Happy Platform Skills" width="120" height="120">
</p>

<h1 align="center">Happy Platform Skills</h1>

<p align="center">
  <strong>Reusable development patterns and automation recipes for enterprise platforms</strong><br>
  Works with Claude Code, Claude Desktop, ChatGPT, Cursor, and any agentic AI system
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/happy-platform-skills"><img src="https://img.shields.io/npm/v/happy-platform-skills.svg?style=flat-square" alt="npm version"></a>
  <a href="https://opensource.org/licenses/Apache-2.0"><img src="https://img.shields.io/badge/License-Apache%202.0-blue.svg?style=flat-square" alt="License: Apache 2.0"></a>
  <a href="https://skills.sh"><img src="https://img.shields.io/badge/skills.sh-compatible-blue.svg?style=flat-square" alt="skills.sh"></a>
</p>

<p align="center">
  <a href="https://happy-tech.biz">Website</a> |
  <a href="https://github.com/Happy-Technologies-LLC/happy-platform-skills">GitHub</a> |
  <a href="https://www.npmjs.com/package/happy-platform-skills">npm</a> |
  <a href="#available-skills">Skills</a> |
  <a href="CONTRIBUTING.md">Contributing</a> |
  <a href="#support">Support</a>
</p>

---

## Support

If you find this project useful, consider supporting its development. Contributions support Happy Technologies LLC.

[Buy Me a Coffee](https://buymeacoffee.com/nickzitzer) · [GitHub Sponsors](https://github.com/sponsors/Happy-Technologies-LLC)

## What Are Platform Skills?

**Skills are packaged instructions that teach AI agents how to perform specific tasks on enterprise platforms.** Unlike MCP tools (which provide *capabilities*), skills provide *knowledge* — the procedures, best practices, and decision logic that make AI agents effective.

```
MCP = The kitchen and ingredients
Skills = The recipes
```

Current coverage focuses on the **ServiceNow®** platform, with 184 skills across 23 categories covering ITSM, CSM, HRSD, SecOps, GRC, development, administration, and more.

## Quick Start

### Installation

```bash
# npm
npm install happy-platform-skills

# skills.sh
npx skills add Happy-Technologies-LLC/happy-platform-skills --all --full-depth
```

### Usage with Claude Code

```bash
# List available skills
npx hps list

# Search for skills
npx hps search "incident"

# Load a skill into your session
npx hps load itsm/incident-triage
```

### Programmatic Usage

```javascript
import { SkillLoader, SkillRegistry } from 'happy-platform-skills';

// Load all skills
const registry = new SkillRegistry();
await registry.discover();

// Find skills by tag
const itsmSkills = registry.findByTag('itsm');

// Load a specific skill
const skill = await SkillLoader.load('itsm/incident-triage');
console.log(skill.getInstructions());
```

---

## Available Skills

The npm package and CLI discover **184 skills across 23 categories**. Use `npx hps list` for every skill and description, or `npx hps search <query>` to narrow the catalog.

| Category | Domain | Skills |
|---|---|---:|
| `admin` | Administration | 16 |
| `catalog` | Service Catalog | 9 |
| `cmdb` | CMDB | 6 |
| `csm` | Customer Service Management | 10 |
| `development` | Development | 20 |
| `document` | Document Intelligence | 3 |
| `ea` | Enterprise Architecture | 2 |
| `fsm` | Field Service Management | 3 |
| `genai` | Generative AI | 19 |
| `grc` | Governance, Risk & Compliance | 11 |
| `hrsd` | HR Service Delivery | 12 |
| `itom` | IT Operations Management | 5 |
| `itsm` | IT Service Management | 19 |
| `knowledge` | Knowledge Management | 7 |
| `legal` | Legal & Contract Management | 6 |
| `otsm` | OT Security Management | 2 |
| `procurement` | Procurement | 6 |
| `psds` | Public Sector Digital Services | 2 |
| `reporting` | Reporting & Analytics | 6 |
| `sam` | Software Asset Management | 2 |
| `secops` | Security Operations | 7 |
| `security` | Platform Security | 4 |
| `spm` | Strategic Portfolio Management | 7 |
| **Total** | | **184** |

---

## Skill Anatomy

Each skill is a Markdown file with YAML frontmatter:

```markdown
---
name: incident-triage
version: 1.0.0
description: Intelligent incident triage and assignment
author: Happy Technologies LLC
tags: [itsm, incident, triage, assignment]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp: [SN-Query-Table, SN-Natural-Language-Search, SN-Assign-Incident]
  rest: [/api/now/table/incident, /api/now/table/sys_user_group]
  native: [Bash, Read, Write]
complexity: intermediate
estimated_time: 5-15 minutes
---

# Incident Triage Skill

## Overview
[What this skill accomplishes]

## Prerequisites
[Required access, permissions, or setup]

## Procedure
[Step-by-step instructions with decision points]

## Tool Usage
[How to use available tools — MCP, REST, or native]

## Best Practices
[Platform and ITIL best practices]

## Troubleshooting
[Common issues and solutions]
```

---

## Platform Compatibility

Skills are designed to work across multiple AI platforms:

| Platform | Tool Access | Notes |
|----------|-------------|-------|
| **Claude Code** | MCP + Native | Full integration with platform MCP Server |
| **Claude Desktop** | MCP only | Requires MCP server connection |
| **ChatGPT** | REST/Actions | Use REST API procedures |
| **Cursor** | Native + Extensions | IDE-based automation |
| **Custom Agents** | Any | Adapt procedures to available tools |

---

## Statistics

| Metric | Value |
|--------|-------|
| **Total Skills** | 184 |
| **Categories** | 23 |
| **Platforms Supported** | 5+ |
| **Live MCP Tools** | 60 |
| **Docs-only MCP Tools** | 6 |

---

## MCP Tool Contract

The bundled Happy Platform MCP v6.1 contract contains exactly 60 live MCP tools. Docs-only startup exposes exactly six docs-only tools: the five documentation tools plus `SN-Register-Instance`.

---

## Related Projects

- **[Happy Platform MCP](https://github.com/Happy-Technologies-LLC/happy-platform-mcp)** — MCP server providing ServiceNow platform automation tools
- **[Happy Technologies](https://happy-tech.biz)** — Enterprise AI solutions

---

## License

Apache License 2.0 — see [LICENSE](LICENSE) for details.

---

## Trademark Notice

**Happy Platform Skills** is a trademark of Happy Technologies LLC.

ServiceNow® is a registered trademark of ServiceNow, Inc. This project is not affiliated with, endorsed by, or sponsored by ServiceNow, Inc. All other trademarks are the property of their respective owners.

See [NOTICE](NOTICE) for full attribution and trademark information.

---

<p align="center">
  Built with care by <a href="https://happy-tech.biz">Happy Technologies LLC</a>
</p>
