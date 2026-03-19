---
name: kb-summarization
version: 1.0.0
description: Summarize knowledge articles for quick consumption including executive summaries, TL;DR versions, key takeaway bullets, topic extraction, and readability-optimized condensed formats
author: Happy Technologies LLC
tags: [knowledge, summarization, kb-articles, executive-summary, tldr, content, knowledge-management]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp:
    - SN-Query-Table
    - SN-Get-Record
    - SN-Update-Record
    - SN-NL-Search
  rest:
    - /api/now/table/kb_knowledge
    - /api/now/table/kb_knowledge_base
    - /api/now/table/kb_category
    - /api/now/table/kb_feedback
    - /api/now/table/sys_attachment
    - /api/now/table/kb_use
  native:
    - Bash
complexity: intermediate
estimated_time: 5-15 minutes
---

# Knowledge Article Summarization

## Overview

This skill generates concise summaries of ServiceNow knowledge base articles in multiple formats optimized for different consumption contexts:

- **Executive summaries**: High-level overviews for leadership and decision-makers
- **TL;DR bullets**: Ultra-concise key points for quick scanning
- **Key takeaways**: Actionable items and critical information extracted from lengthy articles
- **Topic extraction**: Identifying primary and secondary topics for categorization
- **Readability optimization**: Simplifying complex technical content for broader audiences
- **Multi-article synthesis**: Combining related articles into unified summaries

**When to use:** When users need quick access to article content without reading the full text, when building knowledge digests or newsletters, when enriching search results with preview summaries, or when assessing article quality and coverage.

## Prerequisites

- **Roles:** `knowledge_manager`, `knowledge`, or `admin`
- **Plugins:** `com.glideapp.knowledge` (Knowledge Management)
- **Access:** Read access to `kb_knowledge`, `kb_knowledge_base`, `kb_category`
- **Knowledge:** Knowledge base structure, article lifecycle states, content taxonomy
- **Related Skills:** `knowledge/article-generation` for creating articles, `knowledge/gap-analysis` for coverage assessment

## Procedure

### Step 1: Retrieve the Knowledge Article

Fetch the full article content including metadata for context.

**MCP Approach:**
```
Tool: SN-Get-Record
Parameters:
  table_name: kb_knowledge
  sys_id: <article_sys_id>
  fields: sys_id,number,short_description,text,kb_knowledge_base,kb_category,author,sys_created_on,sys_updated_on,workflow_state,article_type,rating,sys_view_count,wiki
```

**REST Approach:**
```
GET /api/now/table/kb_knowledge/<article_sys_id>
  ?sysparm_fields=sys_id,number,short_description,text,kb_knowledge_base,kb_category,author,sys_created_on,sys_updated_on,workflow_state,article_type,rating,sys_view_count
  &sysparm_display_value=true
```

For searching by keyword:
```
Tool: SN-NL-Search
Parameters:
  query: "VPN connection troubleshooting"
  table: kb_knowledge
  limit: 5
```

### Step 2: Analyze Article Structure and Content

Parse the article body (`text` or `wiki` field) to identify:

- **Headings and sections**: H1-H6 tags indicating content hierarchy
- **Step-by-step procedures**: Numbered or bulleted lists indicating instructions
- **Code blocks**: Technical scripts or configuration snippets
- **Tables**: Structured data, comparison matrices, or reference information
- **Images/attachments**: Referenced media that may contain critical information
- **Links**: Cross-references to other articles or external resources
- **Content length**: Word count and estimated reading time

### Step 3: Retrieve Article Usage Metrics

Understand how the article is consumed to tailor the summary appropriately.

**MCP Approach:**
```
Tool: SN-Query-Table
Parameters:
  table_name: kb_use
  query: article=<article_sys_id>^ORDERBYDESCsys_created_on
  fields: sys_id,article,user,sys_created_on,useful
  limit: 100
```

```
Tool: SN-Query-Table
Parameters:
  table_name: kb_feedback
  query: article=<article_sys_id>^ORDERBYDESCsys_created_on
  fields: sys_id,article,user,rating,comments,sys_created_on
  limit: 20
```

### Step 4: Generate Executive Summary

Create a high-level overview suitable for leadership and non-technical stakeholders:

```
=== EXECUTIVE SUMMARY ===
Article: KB0012345 - VPN Connection Troubleshooting Guide
Category: Network Services > Remote Access
Last Updated: 2025-10-15
Views: 2,340 | Rating: 4.2/5

SUMMARY:
This article provides a comprehensive troubleshooting guide for VPN
connectivity issues affecting remote workers. It covers the three most
common failure scenarios (authentication failures, split tunnel
configuration, and DNS resolution), provides step-by-step resolution
procedures for each, and includes escalation paths when self-service
resolution is not possible.

KEY IMPACT:
- Addresses the #2 most common IT support request (VPN issues)
- Self-service resolution rate: estimated 65% of VPN tickets
- Applicable to all remote employees (approx. 3,200 users)

AUDIENCE: End users and Level 1 support agents
READING TIME: 12 minutes (full article)
```

### Step 5: Generate TL;DR Bullets

Create an ultra-concise summary for quick scanning:

```
=== TL;DR ===
Article: KB0012345 - VPN Connection Troubleshooting

- Restart the VPN client and clear cached credentials before anything else
- Authentication failures: Reset password via SSO portal, then reconnect
- Split tunnel issues: Run the diagnostic script (Section 3) to auto-fix routing
- DNS not resolving: Flush DNS cache and set DNS to automatic in VPN settings
- If none of the above work: Contact the Network Operations team (Priority 3)
- Known issue: VPN client v4.2 has a bug on macOS Sonoma -- update to v4.3+
```

### Step 6: Extract Key Takeaways

Identify actionable items and critical information:

```
=== KEY TAKEAWAYS ===
Article: KB0012345

MUST KNOW:
1. Always restart the VPN client before attempting other troubleshooting steps
2. VPN client version 4.2 has a known incompatibility with macOS Sonoma
3. Split tunnel is enabled by default -- corporate resources use the tunnel,
   internet traffic goes direct

ACTION ITEMS:
- Update VPN client to v4.3 or later if running macOS Sonoma
- Bookmark the self-service diagnostic tool: https://vpn-diag.internal/
- Save the Network Operations team contact for escalations

COMMON MISTAKES TO AVOID:
- Do not manually configure DNS servers -- the VPN client sets these automatically
- Do not disable split tunneling without IT approval (causes bandwidth issues)
- Do not use personal VPN services simultaneously with corporate VPN

RELATED RESOURCES:
- KB0012001: VPN Client Installation Guide
- KB0012189: Remote Desktop Connection Setup
- KB0012290: Network Drive Mapping for Remote Users
```

### Step 7: Generate Topic Tags

Extract primary and secondary topics for improved categorization:

**MCP Approach:**
```
Tool: SN-Update-Record
Parameters:
  table_name: kb_knowledge
  sys_id: <article_sys_id>
  data:
    u_topics: "vpn,troubleshooting,remote-access,network,authentication,dns,split-tunnel"
    u_primary_topic: "vpn-troubleshooting"
    u_audience: "end-user,level-1-support"
```

### Step 8: Assess Readability and Quality

Evaluate the article's readability and completeness:

```
=== QUALITY ASSESSMENT ===
Readability Score: Intermediate (suitable for technical staff)
Content Completeness: 85% (missing mobile device VPN instructions)
Structure Quality: Good (clear headings, numbered steps, screenshots referenced)
Currency: Current (updated 2 months ago, all links valid)
User Feedback: Positive (4.2/5 from 156 ratings)

IMPROVEMENT SUGGESTIONS:
1. Add mobile device (iOS/Android) VPN setup section
2. Include a flowchart for the decision tree (text-only currently)
3. Add estimated resolution time for each scenario
4. Update screenshot for VPN client v4.3 interface changes
```

### Step 9: Generate Multi-Article Synthesis (Optional)

When summarizing multiple related articles into a unified digest:

**MCP Approach:**
```
Tool: SN-Query-Table
Parameters:
  table_name: kb_knowledge
  query: kb_category=<category_sys_id>^workflow_state=published^ORDERBYDESCsys_view_count
  fields: sys_id,number,short_description,text,sys_view_count,rating,sys_updated_on
  limit: 10
```

Compile into a topic digest:
```
=== KNOWLEDGE DIGEST: Remote Access ===
Articles Summarized: 5
Total Coverage: VPN setup, troubleshooting, remote desktop, file access, security

1. KB0012345 - VPN Troubleshooting (2,340 views)
   Quick fix for VPN issues: restart client, update to v4.3, flush DNS

2. KB0012001 - VPN Installation (1,890 views)
   Step-by-step VPN client setup for Windows, Mac, and Linux

3. KB0012189 - Remote Desktop Setup (1,456 views)
   Configure RDP/SSH access to office workstations from home

4. KB0012290 - Network Drives (1,203 views)
   Map corporate file shares over VPN with drive letter assignments

5. KB0012310 - Remote Security Policy (980 views)
   Security requirements for remote work: MFA, disk encryption, screen lock
```

### Step 10: Store or Distribute the Summary

Save the generated summary as a field on the article or create a companion record.

**MCP Approach:**
```
Tool: SN-Update-Record
Parameters:
  table_name: kb_knowledge
  sys_id: <article_sys_id>
  data:
    u_executive_summary: "<executive summary text>"
    u_tldr: "<tldr bullets>"
    u_key_takeaways: "<takeaways text>"
```

## Tool Usage

| Tool | Purpose | When to Use |
|------|---------|-------------|
| SN-Get-Record | Retrieve full article content by sys_id | Single article summarization |
| SN-Query-Table | Fetch articles by category, keyword, or metrics | Multi-article summaries and discovery |
| SN-Update-Record | Save summaries back to article records | Persisting generated summaries |
| SN-NL-Search | Find articles by natural language query | When article number is unknown |

## Best Practices

1. **Preserve technical accuracy** -- summaries must not introduce errors or oversimplifications
2. **Match summary format to audience** -- executives need impact, technicians need steps
3. **Include article metadata** -- always show article number, last updated date, and rating
4. **Flag outdated content** -- note if the article has not been updated in over 6 months
5. **Maintain cross-references** -- include links to related articles in every summary format
6. **Respect content sensitivity** -- check article visibility settings before distributing summaries
7. **Include reading time estimates** -- help users decide whether to read the full article
8. **Extract warnings and caveats** -- critical safety or compliance notes must appear in summaries
9. **Use consistent formatting** -- standardize summary templates across the knowledge base
10. **Track summary usage** -- monitor if summaries reduce full article reads or improve resolution rates

## Troubleshooting

| Issue | Cause | Resolution |
|-------|-------|------------|
| Article body is empty | Content stored in `wiki` field instead of `text` | Check both `text` and `wiki` fields |
| HTML tags in summary | Raw HTML not stripped from article body | Parse HTML and extract plain text before summarizing |
| Article not found | Wrong table or article in draft state | Query with `workflow_state=published` or check `kb_knowledge_base` scope |
| Usage metrics missing | Knowledge use tracking not enabled | Enable `kb_use` tracking in Knowledge Management properties |
| Feedback records empty | Feedback feature not enabled for this knowledge base | Check knowledge base configuration for feedback settings |
| Summary too long | Article is very comprehensive | Enforce word limits per summary format (TL;DR: 100 words, Executive: 200 words) |

## Examples

### Example 1: Quick Summary for Search Results

**Input:** "Summarize KB0012345 in 2 sentences for search preview"

**Output:** "This article covers the three most common VPN connection failures (authentication, split tunnel, DNS) with step-by-step resolution procedures. Most issues can be resolved by restarting the VPN client and updating to version 4.3 or later."

### Example 2: Executive Digest for IT Leadership

**Input:** "Generate a weekly knowledge digest for the top 10 most-viewed articles"

**Steps:** Query `kb_knowledge` ordered by `sys_view_count` for the past week, generate executive summary for each, compile into a formatted digest with trend analysis (new articles, rising articles, declining articles).

### Example 3: Onboarding Knowledge Pack

**Input:** "Summarize all articles in the 'New Employee Setup' category for an onboarding checklist"

**Steps:** Query all published articles in the category, extract key action items from each, compile into a sequential checklist with links to full articles for details.

## Related Skills

- `knowledge/article-generation` - Create new knowledge articles
- `knowledge/gap-analysis` - Identify missing knowledge coverage
- `knowledge/content-recommendation` - Recommend relevant articles to users
- `knowledge/duplicate-detection` - Find redundant or overlapping articles
- `knowledge/gap-grouping` - Group knowledge gaps by topic
