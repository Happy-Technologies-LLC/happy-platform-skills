---
name: duplicate-detection
version: 1.0.0
description: Identify duplicate knowledge articles using content similarity analysis, compare titles and metadata across knowledge bases, and recommend merge or deduplication strategies
author: Happy Technologies LLC
tags: [knowledge, duplicate, deduplication, content-analysis, quality, knowledge-management]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp:
    - SN-Query-Table
    - SN-NL-Search
    - SN-Update-Record
    - SN-Add-Work-Notes
  rest:
    - /api/now/table/kb_knowledge
    - /api/now/table/kb_knowledge_base
    - /api/now/table/kb_category
  native:
    - Bash
complexity: advanced
estimated_time: 15-30 minutes
---

# Knowledge Article Duplicate Detection

## Overview

This skill provides a structured approach to identifying and resolving duplicate knowledge articles in ServiceNow. Over time, knowledge bases accumulate redundant content created by different authors, imported from multiple sources, or drafted independently for similar issues. Duplicates degrade search quality, confuse users, and increase maintenance burden.

This skill helps you:

- Query and compare knowledge articles by title similarity, category, and keyword overlap
- Identify clusters of articles covering the same topic or resolution
- Evaluate which article is the authoritative version based on usage metrics and freshness
- Recommend merge strategies: retire, redirect, consolidate, or archive
- Document deduplication decisions with audit-ready work notes

**When to use:** During periodic knowledge base hygiene reviews, after bulk imports, or when users report conflicting articles for the same issue.

## Prerequisites

- **Roles:** `knowledge_manager` or `knowledge_admin`
- **Access:** Read/write access to `kb_knowledge`, `kb_knowledge_base`, `kb_category`, and `kb_use` tables
- **Plugin:** `com.glideapp.knowledge` (Knowledge Management) activated
- **Knowledge:** Familiarity with your organization's knowledge base structure and article lifecycle

## Procedure

### Step 1: Identify Candidate Duplicates by Title Similarity

Search for articles with similar or identical short descriptions across all published knowledge bases.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: kb_knowledge
  query: workflow_state=published^short_descriptionLIKEpassword reset
  fields: sys_id,number,short_description,kb_knowledge_base,kb_category,author,sys_updated_on,rating,sys_view_count
  limit: 25
```

**Using REST API:**
```bash
GET /api/now/table/kb_knowledge?sysparm_query=workflow_state=published^short_descriptionLIKEpassword reset&sysparm_fields=sys_id,number,short_description,kb_knowledge_base,kb_category,author,sys_updated_on,rating,sys_view_count&sysparm_limit=25
```

### Step 2: Expand Search with Keyword Variations

Duplicates often use different phrasing. Search for common synonyms and alternate terms.

**Using MCP:**
```
Tool: SN-NL-Search
Parameters:
  table_name: kb_knowledge
  query: "published knowledge articles about resetting passwords or changing credentials or account lockout"
  fields: sys_id,number,short_description,text,kb_knowledge_base,author
  limit: 30
```

**Using REST API:**
```bash
GET /api/now/table/kb_knowledge?sysparm_query=workflow_state=published^short_descriptionLIKEpassword^ORshort_descriptionLIKEcredential^ORshort_descriptionLIKElockout&sysparm_fields=sys_id,number,short_description,text,kb_knowledge_base,author&sysparm_limit=30
```

### Step 3: Compare Article Content for Overlap

Retrieve the full text of candidate duplicates and compare their content structure.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: kb_knowledge
  query: numberIN KB0010234,KB0010567,KB0010890
  fields: sys_id,number,short_description,text,wiki,kb_knowledge_base,kb_category,author,published,sys_updated_on
  limit: 10
```

**Using REST API:**
```bash
GET /api/now/table/kb_knowledge?sysparm_query=numberINKB0010234,KB0010567,KB0010890&sysparm_fields=sys_id,number,short_description,text,wiki,kb_knowledge_base,kb_category,author,published,sys_updated_on
```

### Step 4: Analyze Usage Metrics to Determine Authoritative Article

Check view counts, feedback ratings, and attachment counts to identify the most-used version.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: kb_use
  query: article.numberINKB0010234,KB0010567,KB0010890
  fields: article,article.number,viewed,useful,not_useful
  limit: 20
```

**Using REST API:**
```bash
GET /api/now/table/kb_use?sysparm_query=article.numberINKB0010234,KB0010567,KB0010890&sysparm_fields=article,article.number,viewed,useful,not_useful&sysparm_limit=20
```

Check feedback records:

```
Tool: SN-Query-Table
Parameters:
  table_name: kb_feedback
  query: article.numberINKB0010234,KB0010567,KB0010890
  fields: article,article.number,rating,comments,sys_created_on
  limit: 50
```

### Step 5: Check Cross-References and Linked Incidents

Determine which articles are actively linked to incidents or cases.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: m2m_kb_task
  query: kb_knowledge.numberINKB0010234,KB0010567,KB0010890
  fields: kb_knowledge,kb_knowledge.number,task,task.number
  limit: 50
```

**Using REST API:**
```bash
GET /api/now/table/m2m_kb_task?sysparm_query=kb_knowledge.numberINKB0010234,KB0010567,KB0010890&sysparm_fields=kb_knowledge,kb_knowledge.number,task,task.number&sysparm_limit=50
```

### Step 6: Execute Deduplication Action

Based on the analysis, choose a merge strategy and execute it.

**Strategy A: Retire the Duplicate**

Set the inferior article to "retired" and add a redirect note:

```
Tool: SN-Update-Record
Parameters:
  table_name: kb_knowledge
  sys_id: [duplicate_article_sys_id]
  data:
    workflow_state: retired
    retirement_date: 2026-03-19
    work_notes: "Retired as duplicate of KB0010234. Content merged into authoritative article."
```

**Strategy B: Consolidate Content**

Update the authoritative article with the best content from all duplicates:

```
Tool: SN-Update-Record
Parameters:
  table_name: kb_knowledge
  sys_id: [authoritative_article_sys_id]
  data:
    text: "[Merged content from KB0010234, KB0010567]"
    work_notes: "Consolidated content from duplicate articles KB0010567 and KB0010890. Retired duplicates."
```

### Step 7: Document the Deduplication Decision

**Using MCP:**
```
Tool: SN-Add-Work-Notes
Parameters:
  sys_id: [authoritative_article_sys_id]
  work_notes: |
    === DEDUPLICATION ANALYSIS ===
    Date: 2026-03-19
    Analyst: Knowledge Manager

    Duplicate Cluster Identified:
    - KB0010234 (Authoritative) - 1,245 views, 4.5 rating, last updated 2026-02-15
    - KB0010567 (Retired) - 312 views, 3.8 rating, last updated 2025-08-20
    - KB0010890 (Retired) - 89 views, no rating, last updated 2025-03-10

    Decision: Retained KB0010234 as primary. Merged unique resolution steps from KB0010567.
    Retired KB0010567 and KB0010890.

    Impact: Reduced duplicate search results for "password reset" queries.
```

## Tool Usage

### MCP Tools Reference

| Tool | When to Use |
|------|-------------|
| `SN-Query-Table` | Structured queries for articles, usage data, feedback |
| `SN-NL-Search` | Natural language search for topic-based duplicate discovery |
| `SN-Update-Record` | Retire duplicates, update authoritative articles |
| `SN-Add-Work-Notes` | Document deduplication decisions and rationale |

### REST API Reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/now/table/kb_knowledge` | GET | Query knowledge articles |
| `/api/now/table/kb_knowledge/{sys_id}` | PATCH | Update or retire articles |
| `/api/now/table/kb_use` | GET | Retrieve usage/view metrics |
| `/api/now/table/kb_feedback` | GET | Retrieve user feedback and ratings |
| `/api/now/table/m2m_kb_task` | GET | Find articles linked to incidents |

## Best Practices

- **Start with High-Traffic Topics:** Focus deduplication on the most-searched topics first for maximum user impact
- **Preserve the Best Content:** Always merge unique, valuable content into the authoritative article before retiring duplicates
- **Maintain Redirects:** When retiring articles, add notes pointing to the replacement article so users following old links can find the right content
- **Batch by Category:** Process duplicates one knowledge category at a time for consistency
- **Verify Before Retiring:** Confirm no active incident references or bookmarks point to the article being retired
- **Track Metrics:** Record before/after search result quality to demonstrate deduplication value

## Troubleshooting

### "Too many results returned for title search"

**Cause:** Generic keywords matching unrelated articles
**Solution:** Add category or knowledge base filters: `kb_knowledge_base=<sys_id>^short_descriptionLIKEpassword`

### "Cannot retire article - workflow state transition blocked"

**Cause:** Article lifecycle requires specific transitions (e.g., published -> review -> retired)
**Solution:** Check the knowledge workflow configuration; you may need to move through intermediate states

### "Usage metrics show zero for all articles"

**Cause:** `kb_use` tracking may not be enabled or articles accessed via direct URL bypass tracking
**Solution:** Verify the `glide.knowman.track_article_usage` property is set to `true`

### "Articles span multiple knowledge bases"

**Cause:** Different teams created similar articles in separate knowledge bases
**Solution:** Coordinate with knowledge base owners; cross-KB deduplication may require governance approval

## Examples

### Example 1: Password Reset Duplicate Cluster

**Search:** Articles about password reset procedures

**Findings:**
- KB0010234: "How to Reset Your Password" - 1,245 views, IT knowledge base
- KB0010567: "Password Reset Instructions" - 312 views, HR knowledge base
- KB0010890: "Reset Password Steps" - 89 views, IT knowledge base

**Action:** Consolidated best content into KB0010234, retired KB0010567 and KB0010890. Notified HR knowledge base owner about the consolidated article.

### Example 2: VPN Configuration Duplicates

**Search:** Articles about VPN setup and troubleshooting

**Findings:**
- KB0020100: "VPN Setup Guide for Windows" - 890 views, comprehensive
- KB0020145: "How to Configure VPN" - 456 views, outdated client version
- KB0020200: "VPN Troubleshooting" - 1,100 views, different topic (keep)

**Action:** Merged KB0020145 content into KB0020100 and retired KB0020145. Kept KB0020200 as it covers troubleshooting, not setup.

## Related Skills

- `knowledge/gap-analysis` - Find topics missing articles
- `knowledge/content-recommendation` - Surface relevant articles for incidents
- `knowledge/article-generation` - Create new articles from resolved incidents
- `knowledge/gap-grouping` - Cluster knowledge gaps for action planning
