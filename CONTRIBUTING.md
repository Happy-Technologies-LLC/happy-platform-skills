# Contributing to Happy Platform Skills

Thank you for your interest in contributing! This guide covers how to submit new skills, naming conventions, quality standards, and our Contributor License Agreement (CLA) requirement.

## Contributor License Agreement (CLA)

**All contributors must sign our CLA before any contribution can be merged.**

By submitting a pull request, you agree that:

1. You are the original author of the contribution, or have the right to submit it.
2. You grant Happy Technologies LLC a perpetual, worldwide, non-exclusive, royalty-free, irrevocable license to use, reproduce, modify, distribute, and sublicense your contribution as part of this project.
3. You understand your contribution will be licensed under the Apache License 2.0.
4. Your contribution does not contain any code, documentation, or content copied from proprietary platform vendors, their documentation, sample code, or store applications.

To sign the CLA, add the following to your first pull request description:

```
I have read and agree to the Happy Platform Skills Contributor License Agreement.

Signed: [Your Full Name]
Date: [YYYY-MM-DD]
Email: [your@email.com]
```

## How to Submit a New Skill

### 1. Choose the Right Category

Place your skill in the appropriate category directory under `skills/`:

| Category | Use For |
|----------|---------|
| `itsm/` | Incident, problem, change, request workflows |
| `csm/` | Customer service management |
| `hrsd/` | HR service delivery |
| `development/` | Scripts, APIs, testing, code patterns |
| `admin/` | System administration, deployment, configuration |
| `catalog/` | Service catalog items and fulfillment |
| `cmdb/` | Configuration management, CI operations |
| `security/` | Access control, compliance, data classification |
| `secops/` | Security operations center workflows |
| `grc/` | Governance, risk, and compliance |
| `genai/` | AI/ML features, automation generation |
| `knowledge/` | Knowledge management and articles |
| `spm/` | Strategic portfolio management |
| `itom/` | IT operations management |
| `reporting/` | Reports, dashboards, analytics |
| `procurement/` | Procurement and finance |
| `legal/` | Legal and contract management |
| `fsm/` | Field service management |
| `sam/` | Software asset management |
| `document/` | Document intelligence |
| `otsm/` | OT security management |
| `psds/` | Public sector digital services |
| `ea/` | Enterprise architecture |

If your skill doesn't fit an existing category, propose a new one in your PR description.

### 2. Copy the Template

```bash
cp templates/skill-template/skill.md skills/<category>/my-skill.md
```

### 3. Write Your Skill

Follow the template structure. Every skill must include:

- **Frontmatter** with name, version, description, author, tags, platforms, tools, complexity, and estimated_time
- **Overview** — What the skill does and when to use it
- **Prerequisites** — Required roles, permissions, or setup
- **Procedure** — Step-by-step instructions with decision points
- **Tool Usage** — MCP, REST, and native tool alternatives
- **Best Practices** — Industry-standard recommendations
- **Troubleshooting** — Common issues and solutions

### 4. Validate

```bash
npm run validate
```

### 5. Submit a Pull Request

- Fork the repository
- Create a feature branch: `git checkout -b skill/category-name`
- Commit your changes
- Push and open a PR against `main`
- Include your CLA signature in the PR description

## Naming Conventions

### Skill Names

Skill names must use **generic platform terminology**. Do not include vendor names, trademarked product names, or proprietary feature names in skill file names or directory names.

**Good:**
- `incident-triage`
- `change-risk-explanation`
- `contract-analysis`
- `flow-generation`
- `ai-search-rag`

**Bad:**
- `servicenow-incident-triage` (vendor name in skill name)
- `now-assist-setup` (proprietary product name as skill name)
- `virtual-agent-config` (ambiguous with trademarked product — use descriptive alternative)

### Category Directories

Category names use industry-standard abbreviations:
- `itsm`, `csm`, `hrsd`, `cmdb`, `grc`, `secops`, `itom`, `spm`, `fsm`, `sam`
- Or descriptive terms: `development`, `admin`, `catalog`, `security`, `reporting`, `knowledge`, `legal`, `procurement`, `document`

### File Naming

- Use lowercase kebab-case: `my-skill-name.md`
- Keep names concise but descriptive
- Focus on what the skill *does*, not which platform it targets

## Trademark Guidelines

When writing skill content:

1. **Never use trademarked names in file or directory names.** Vendor names belong only in descriptive documentation text.
2. **Use ® on first reference** to registered trademarks within a document (e.g., "ServiceNow®").
3. **Use generic terms** where possible: "platform," "instance," "enterprise service management."
4. **Do not use proprietary product names as if they are generic terms.** For example, refer to "virtual agent capabilities" generically rather than capitalizing as a branded feature.
5. **Never copy vendor documentation, sample code, or store app code.** All content must be original.

## Quality Standards

### Content

- All procedures must be tested and verified on a current platform release
- Include both MCP tool and REST API alternatives for platform-agnostic compatibility
- Decision points must have clear criteria and outcomes
- Troubleshooting sections must address real-world issues

### Code

- All script examples must be original work
- Scripts must include error handling
- Follow platform scripting best practices (e.g., use `.changes()` in business rules)
- No hardcoded credentials, instance URLs, or sensitive data

### Style

- Write in clear, imperative language ("Query the table" not "You should query the table")
- Use consistent Markdown formatting
- Keep lines under 120 characters where practical
- Use fenced code blocks with language identifiers

## Review Process

1. **Automated validation** — `npm run validate` must pass
2. **Naming review** — Skill names checked for trademark compliance
3. **Content review** — Procedure accuracy, completeness, and originality
4. **Maintainer approval** — At least one maintainer must approve

PRs that fail CLA verification or contain trademarked terms in file/directory names will not be merged.

## Questions?

Open an issue on GitHub or contact us at [happy-tech.biz](https://happy-tech.biz).
