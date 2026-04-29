# Creating Skills for Happy ServiceNow AI Skills

This guide walks you through creating your own skills for the library.

## Quick Start

1. Copy the template:
   ```bash
   mkdir -p skills/[category]/my-skill
   cp templates/skill-template.md skills/[category]/my-skill/SKILL.md
   ```

2. Edit the frontmatter:
   ```yaml
   ---
   name: my-skill
   version: 1.0.0
   description: What my skill does
   author: Your Name
   tags: [tag1, tag2]
   platforms: [claude-code, any]
   ---
   ```

3. Write the content following the template structure

4. Validate:
   ```bash
   npm run validate skills/[category]/my-skill
   ```

5. Test with an AI agent

6. Submit a pull request

## Skill Categories

Choose the appropriate category for your skill:

| Category | Use For |
|----------|---------|
| `itsm/` | Incident, Problem, Change, Request workflows |
| `cmdb/` | Configuration management, CI operations |
| `admin/` | System administration, deployment, configuration |
| `catalog/` | Service catalog items and fulfillment |
| `security/` | Security operations and compliance |
| `reporting/` | Reports, dashboards, analytics |

## Writing Great Skills

### 1. Start with the User's Goal

Think about what the user is trying to accomplish:

**Good:** "Triage and assign incidents based on content analysis"
**Bad:** "Use SN-Query-Table to get incidents"

### 2. Be Platform-Agnostic

Always provide alternatives for different platforms:

```markdown
**Using MCP (Claude Code/Desktop):**
\`\`\`
Tool: SN-Query-Table
Parameters:
  table_name: incident
  query: active=true
\`\`\`

**Using REST API (ChatGPT/Other):**
\`\`\`bash
GET /api/now/table/incident?sysparm_query=active=true
\`\`\`
```

### 3. Include Decision Points

Help the AI (and user) make decisions:

```markdown
### Step 2: Determine Priority

**If** the incident mentions "outage" or affects multiple users:
- Set Impact = 1 (High)
- Set Urgency = 1 (High)
- Resulting Priority = P1

**If** the incident affects a single user:
- Set Impact = 2 (Medium)
- Evaluate urgency based on user's role
```

### 4. Provide Context, Not Just Commands

Explain *why*, not just *what*:

```markdown
### Step 3: Add Work Notes

Always document your triage decision. This helps:
- Future analysts understand the reasoning
- Audit trail for compliance
- Training data for ML models

\`\`\`
Tool: SN-Add-Work-Notes
...
\`\`\`
```

### 5. Handle Errors Gracefully

Include troubleshooting for common issues:

```markdown
## Troubleshooting

### "No records found"

**Symptom:** Query returns empty results
**Cause:** Query too restrictive or wrong table
**Solution:**
1. Verify table name is correct
2. Broaden query conditions
3. Check if records exist in the table
```

## Tool Reference Format

When referencing tools, use this format:

### MCP Tools

```markdown
**Tool:** SN-Query-Table
**Purpose:** Query records from any ServiceNow table
**Parameters:**
| Parameter | Required | Description |
|-----------|----------|-------------|
| table_name | Yes | Table to query |
| query | No | Encoded query string |
| fields | No | Comma-separated field list |
| limit | No | Max records to return |

**Example:**
\`\`\`
Tool: SN-Query-Table
Parameters:
  table_name: incident
  query: active=true^priority=1
  fields: number,short_description,state
  limit: 10
\`\`\`
```

### REST API

```markdown
**Endpoint:** GET /api/now/table/{table_name}
**Authentication:** Basic Auth or OAuth
**Parameters:**
| Parameter | Location | Description |
|-----------|----------|-------------|
| sysparm_query | Query | Encoded query |
| sysparm_fields | Query | Fields to return |
| sysparm_limit | Query | Max records |

**Example:**
\`\`\`bash
curl -X GET \
  'https://instance.service-now.com/api/now/table/incident?sysparm_query=active=true&sysparm_limit=10' \
  -H 'Authorization: Basic <token>' \
  -H 'Accept: application/json'
\`\`\`
```

## Testing Your Skill

### Manual Testing

1. Load the skill in Claude Code:
   ```bash
   npx sn-skills load category/my-skill --prompt
   ```

2. Copy the output into a conversation with Claude

3. Test the workflow end-to-end

### Automated Validation

```bash
# Validate single skill
npm run validate skills/category/my-skill

# Validate all skills
npm run validate
```

## Submitting Your Skill

### Pull Request Checklist

- [ ] Skill passes validation (`npm run validate`)
- [ ] Tested with at least one AI platform
- [ ] Follows naming conventions
- [ ] Placed in correct category
- [ ] Includes all required sections
- [ ] Has meaningful examples
- [ ] No hardcoded instance URLs or credentials

### PR Template

```markdown
## New Skill: [skill-name]

### Description
Brief description of what this skill does.

### Category
[itsm/cmdb/admin/catalog/security/reporting]

### Testing
- [ ] Tested with Claude Code
- [ ] Tested with Claude Desktop
- [ ] Tested with ChatGPT
- [ ] Tested against ServiceNow instance

### Notes
Any additional context or considerations.
```

## Style Guide

### Headings

- Use `#` for the skill title (matches skill name)
- Use `##` for main sections
- Use `###` for subsections
- Use `####` sparingly for deep nesting

### Code Blocks

- Use triple backticks with language identifier
- For tool calls, use plain text (no language)
- For REST/curl, use `bash`
- For JavaScript, use `javascript`

### Tables

Use tables for:
- Field references
- Decision matrices
- Status mappings

### Lists

- Use numbered lists for sequential steps
- Use bullet lists for options/alternatives
- Use checkboxes for checklists

## Getting Help

- Review existing skills for examples
- Check the [SKILL_SPEC.md](SKILL_SPEC.md) for technical details
- Open an issue for questions
- Join our community discussions
