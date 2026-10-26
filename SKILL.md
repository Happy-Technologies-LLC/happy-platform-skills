---
name: happy-platform-skills
version: 2.5.0
author: Happy Technologies LLC
description: Reusable enterprise platform instructions - 184 skills across 23 categories with a versioned Happy Platform MCP v6.1 contract
tags:
  - platform-skills
  - servicenow
  - itsm
  - cmdb
  - development
  - enterprise
platforms:
  - claude-code
  - claude-desktop
  - chatgpt
  - cursor
  - any
---

# Happy Platform Skills

Use this root skill to discover the Happy Platform Skills catalog. The package
contains 184 task-specific skills across 23 categories. Load the narrowest
matching `skills/<category>/<name>/SKILL.md` file before performing work.

## When to use this skill

Use the catalog for ServiceNow administration, development, IT service
management, customer and employee workflows, operations, security, governance,
reporting, and related enterprise-platform tasks.

## Catalog

| Category | Skills |
|---|---:|
| admin | 16 |
| catalog | 9 |
| cmdb | 6 |
| csm | 10 |
| development | 20 |
| document | 3 |
| ea | 2 |
| fsm | 3 |
| genai | 19 |
| grc | 11 |
| hrsd | 12 |
| itom | 5 |
| itsm | 19 |
| knowledge | 7 |
| legal | 6 |
| otsm | 2 |
| procurement | 6 |
| psds | 2 |
| reporting | 6 |
| sam | 2 |
| secops | 7 |
| security | 4 |
| spm | 7 |
| **Total** | **184** |

Discover exact skill names with:

```bash
npx hps list
npx hps search "incident"
```

Load one skill with:

```bash
npx hps load itsm/incident-triage
```

## Happy Platform MCP v6.1 contract

The bundled contract contains exactly 60 live MCP tools. Docs-only startup
exposes exactly six docs-only tools: the five documentation tools plus
`SN-Register-Instance`.

Use only tool names present in the bundled versioned contracts under
`contracts/`. Prefer live MCP tools for ServiceNow operations. Use background
script execution only when the live MCP contract cannot express the operation.

## Installation

```bash
# npm package and CLI
npm install happy-platform-skills

# Agent skill discovery from GitHub
npx skills add Happy-Technologies-LLC/happy-platform-skills --all --full-depth
```

## Package API

```javascript
import { SkillLoader, SkillRegistry } from 'happy-platform-skills';

const registry = new SkillRegistry();
await registry.discover();

const skill = await SkillLoader.load('itsm/incident-triage');
console.log(skill.getInstructions());
console.log(skill.toPrompt());
```

## Contributing

See `docs/CREATING_SKILLS.md` and `docs/SKILL_SPEC.md`.

## License

Apache-2.0 - Happy Technologies LLC
