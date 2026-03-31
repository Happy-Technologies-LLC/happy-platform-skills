---
name: skill-name
version: 1.0.0
description: Brief description of what this skill accomplishes
author: Your Name or Organization
tags: [tag1, tag2, tag3]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp: [SN-Query-Table, SN-Create-Record]
  rest: [/api/now/table/tablename]
  native: [Bash, Read, Write]
complexity: intermediate  # beginner, intermediate, advanced, expert
estimated_time: 5-15 minutes
---

# Skill Name

## Overview

Provide a clear, concise overview of what this skill accomplishes and when to use it.

- What problem does it solve?
- Who should use this skill?
- What are the expected outcomes?

## Prerequisites

List any requirements before using this skill:

- Required platform roles (e.g., `itil`, `admin`, `catalog_admin`)
- Required permissions or access
- Required data or configuration
- Related skills that should be completed first

## Procedure

### Step 1: Initial Assessment

Describe the first step with clear instructions.

**If using MCP tools:**
```
Tool: SN-Query-Table
Parameters:
  table_name: incident
  query: active=true^priority=1
  fields: number,short_description,state
  limit: 10
```

**If using REST API:**
```bash
GET /api/now/table/incident?sysparm_query=active=true^priority=1&sysparm_fields=number,short_description,state&sysparm_limit=10
```

### Step 2: Analysis

Describe the analysis or decision-making process.

**Decision Points:**
- If condition A → Do action X
- If condition B → Do action Y
- Otherwise → Do action Z

### Step 3: Execution

Describe the main action to take.

### Step 4: Verification

Describe how to verify the action was successful.

## Tool Usage

### MCP Tools (Claude Code/Desktop)

| Tool | Purpose |
|------|---------|
| `SN-Query-Table` | Query records |
| `SN-Create-Record` | Create new records |

### REST API (ChatGPT/Other)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/now/table/tablename` | GET | Query records |
| `/api/now/table/tablename` | POST | Create records |

### Native Tools (Claude Code)

| Tool | Purpose |
|------|---------|
| `Bash` | Execute commands |
| `Read` | Read configuration files |

## Best Practices

- **Best Practice 1:** Description and rationale
- **Best Practice 2:** Description and rationale
- **ITIL Alignment:** How this aligns with ITIL frameworks

## Troubleshooting

### Common Issue 1

**Symptom:** Description of what goes wrong
**Cause:** Why it happens
**Solution:** How to fix it

### Common Issue 2

**Symptom:** Description of what goes wrong
**Cause:** Why it happens
**Solution:** How to fix it

## Examples

### Example 1: Basic Usage

```
[Show a complete example with input and expected output]
```

### Example 2: Advanced Usage

```
[Show a more complex example]
```

## Related Skills

- `category/related-skill-1` — Brief description
- `category/related-skill-2` — Brief description

## References

- [ITIL Framework](https://www.itil.org)
- Platform vendor documentation (cite specific public docs)
