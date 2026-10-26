---
name: natural-language-queries
version: 1.0.3
description: Use parser-verified Happy Platform MCP 6.1 natural-language search phrases and fall back to precise encoded table queries
author: Happy Technologies LLC
tags: [itsm, search, natural-language, queries]
platforms: [claude-code, claude-desktop]
tools:
  mcp: [SN-Natural-Language-Search, SN-Query-Table]
  rest: ["/api/now/table/{table}"]
complexity: beginner
estimated_time: 5-10 minutes
---

# Natural-Language Queries

## Overview

Happy Platform MCP 6.1 converts a bounded set of natural-language phrases into
ServiceNow encoded conditions. Use `SN-Natural-Language-Search` for the atomic,
parser-verified patterns below. Use `SN-Query-Table` whenever exact operators,
multiple branches, exclusions, field-specific text behavior, or deterministic
ordering matter.

The authoritative fixtures are packaged in
`contracts/happy-platform-mcp-6.1.0-natural-language.json` and can be checked
against the sibling MCP source with `npm run contract:nl-check`.

## Prerequisites

- Happy Platform MCP 6.1.0 configured for the target instance
- Read access to the target table
- The exact table name
- A small result limit and explicit return fields for exploratory searches

## Procedure

### 1. Choose one parser-verified phrase

The following atomic phrases parse completely in MCP 6.1.0:

| Intent | Supported phrase | Encoded condition produced |
|---|---|---|
| Priority label | `high priority` | `priority=2` |
| Priority number | `P1` or `priority 2` | `priority=1` or `priority=2` |
| Impact | `high impact` | `impact=1` |
| Urgency | `medium urgency` | `urgency=2` |
| Current user | `assigned to me` | `assigned_to=javascript:gs.getUserID()` |
| No assignee | `unassigned` | `assigned_toISEMPTY` |
| Named assignee | `assigned to John Smith` | `assigned_to.nameLIKEJohn Smith` |
| Opened today | `opened today` | `sys_created_on>javascript:gs.daysAgoStart(0)` |
| Opened recently | `opened in the last 7 days` | `sys_created_on>javascript:gs.daysAgo(7)` |
| Recent record | `recent` | `sys_created_on>javascript:gs.daysAgo(7)` |
| Active record | `active` | `active=true` |
| Description text | `description contains authentication` | `descriptionLIKEauthentication` |
| General content | `about SAP` | `short_descriptionLIKESAP^ORdescriptionLIKESAP` |
| Exact number | `number is INC0012345` | `number=INC0012345` |
| Caller | `caller is John Smith` | `caller_id.nameLIKEJohn Smith` |
| Category | `category is Software` | `categoryLIKESoftware` |
| Assignment group | `assignment group is Network Team` | `assignment_group.nameLIKENetwork Team` |

The mappings above are literal v6.1 parser outputs. For example, “high” maps to
priority value 2, while “critical” maps to value 1.

### 2. Execute a bounded search

Always provide `table`; the v6.1 argument is not named `table_name`. Specify the
target instance for live or concurrent work.

```text
Tool: SN-Natural-Language-Search
Parameters:
  table: incident
  query: P1
  fields: sys_id,number,short_description,priority
  limit: 10
  instance: dev
```

Inspect `encodedQuery`, `matchedPatterns`, `unmatchedText`, and the returned
records. Treat non-empty `unmatchedText` as a failed validation, even if the tool
also returns an encoded condition.

### 3. Keep exploratory calls atomic

Use a separate bounded call for each independent question:

```text
Tool: SN-Natural-Language-Search
Parameters:
  table: incident
  query: unassigned
  fields: sys_id,number,assigned_to
  limit: 10
  instance: dev
```

```text
Tool: SN-Natural-Language-Search
Parameters:
  table: incident
  query: opened in the last 7 days
  fields: sys_id,number,sys_created_on
  limit: 10
  instance: dev
```

Do not infer that two separately supported phrases can be freely composed. The
v6.1 parser processes each pattern at most once, and leftover words can change
or weaken the result.

### 4. Use encoded queries for precision

When the requirement includes exact comparisons, exclusions, multiple values,
field-specific text operators, or deterministic ordering, construct and review
an encoded query and use `SN-Query-Table`:

```text
Tool: SN-Query-Table
Parameters:
  table_name: incident
  query: priority=1^state!=7^assigned_toISEMPTY^ORDERBYDESCsys_created_on
  fields: sys_id,number,short_description,priority,state,assigned_to,sys_created_on
  limit: 25
  instance: dev
```

The encoded-query path is also the correct choice for automation because its
meaning does not depend on pattern extraction from free-form text.

### 5. Validate non-incident targets explicitly

Natural-language parsing uses the supplied table for table-dependent behavior.
Never rely on the default when searching another table:

```text
Tool: SN-Natural-Language-Search
Parameters:
  table: change_request
  query: recent
  fields: sys_id,number,short_description,sys_created_on
  limit: 10
  instance: dev
```

For unfamiliar tables, prefer an encoded `SN-Query-Table` query until the
natural-language result has been verified against known records.

## Tool Usage

| Tool | Use |
|---|---|
| `SN-Natural-Language-Search` | Bounded exploration with one parser-verified phrase |
| `SN-Query-Table` | Exact, repeatable encoded-query execution |

## Best Practices

- Provide `table`, `fields`, `limit`, and `instance` explicitly.
- Start with one atomic phrase from the packaged fixture contract.
- Require empty `unmatchedText` before trusting the parser result.
- Compare exploratory results with known records before expanding the limit.
- Use encoded queries for production automation and complex conditions.
- Keep field selection minimal to reduce payload and accidental data exposure.

## Troubleshooting

### No encoded condition is returned

The phrase did not match a v6.1 pattern. Use one fixture-backed atomic phrase or
switch to `SN-Query-Table` with a reviewed encoded query.

### A condition is returned with leftover text

The parser matched only part of the request. Do not treat the result as an
equivalent query. Reduce the request to one verified phrase or use an encoded
query.

### The returned condition has the wrong meaning

Stop using that phrase. Natural-language matching can accept words in an
unintended pattern. Express the requirement directly as an encoded query and
verify it on a small result set.

### A non-incident search returns incident-shaped results

Confirm the call uses `table`, not an obsolete argument name, and that the
explicit table value is correct.

## Related Skills

- `itsm/incident-triage`
- `itsm/quick-reference`
- `admin/generic-crud-operations`
