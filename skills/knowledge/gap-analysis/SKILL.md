---
name: gap-analysis
version: 1.0.0
description: Analyze knowledge gaps by examining incident and case patterns without matching KB articles, identify topics needing new articles, track failed searches, and prioritize article creation
author: Happy Technologies LLC
tags: [knowledge, gap-analysis, incident-patterns, search-analytics, knowledge-management, content-planning]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp:
    - SN-Query-Table
    - SN-NL-Search
    - SN-Aggregate
    - SN-Create-Record
    - SN-Add-Work-Notes
  rest:
    - /api/now/table/kb_knowledge
    - /api/now/table/kb_knowledge_base
    - /api/now/table/kb_category
    - /api/now/table/incident
    - /api/now/table/sn_customerservice_case
    - /api/now/table/kb_feedback
    - /api/now/table/search_log
    - /api/now/stats/incident
  native:
    - Bash
complexity: advanced
estimated_time: 20-40 minutes
---

# Knowledge Gap Analysis

## Overview

This skill provides a systematic approach to identifying gaps in your ServiceNow knowledge base by correlating incident and case data with existing knowledge articles. Knowledge gaps lead to longer resolution times, repeated escalations, and poor self-service adoption.

This skill helps you:

- Identify high-volume incident categories that lack corresponding knowledge articles
- Analyze search logs to find queries that return zero or irrelevant results
- Correlate resolved incidents with knowledge base coverage to surface missing documentation
- Examine feedback signals indicating articles are incomplete or unhelpful
- Prioritize article creation based on incident volume, business impact, and resolution complexity
- Build a data-driven knowledge creation backlog

**When to use:** During quarterly knowledge reviews, after noticing rising incident volumes in specific categories, when self-service deflection rates drop, or when onboarding new support domains.

## Prerequisites

- **Roles:** `knowledge_manager`, `knowledge_admin`, or `itil` with reporting access
- **Access:** Read access to `kb_knowledge`, `incident`, `sn_customerservice_case`, `kb_feedback`, `search_log`, and `kb_use` tables
- **Plugin:** `com.glideapp.knowledge` (Knowledge Management) activated
- **Recommended Plugin:** `com.glide.search` (Search Analytics) for search log analysis
- **Knowledge:** Understanding of your incident categorization taxonomy and knowledge base structure

## Procedure

### Step 1: Identify Top Incident Categories by Volume

Aggregate incidents by category and subcategory to find the highest-volume topics over the past 90 days.

**Using MCP:**
```
Tool: SN-Aggregate
Parameters:
  table_name: incident
  query: opened_at>=javascript:gs.daysAgoStart(90)^active=false^state=6
  group_by: category,subcategory
  aggregate: COUNT
  order_by: COUNT
  limit: 25
```

**Using REST API:**
```bash
GET /api/now/stats/incident?sysparm_query=opened_at>=javascript:gs.daysAgoStart(90)^active=false^state=6&sysparm_group_by=category,subcategory&sysparm_count=true&sysparm_orderby=COUNT&sysparm_limit=25
```

### Step 2: Check Knowledge Coverage for Top Categories

For each high-volume category, search for published articles covering that topic.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: kb_knowledge
  query: workflow_state=published^kb_category.label=Network^ORshort_descriptionLIKEnetwork
  fields: sys_id,number,short_description,kb_knowledge_base,kb_category,sys_view_count,rating,sys_updated_on
  limit: 20
```

**Using REST API:**
```bash
GET /api/now/table/kb_knowledge?sysparm_query=workflow_state=published^kb_category.label=Network^ORshort_descriptionLIKEnetwork&sysparm_fields=sys_id,number,short_description,kb_knowledge_base,kb_category,sys_view_count,rating,sys_updated_on&sysparm_limit=20
```

### Step 3: Identify Incident Topics Without Any KB Articles

Cross-reference the top incident categories against knowledge base coverage. Query incidents in categories where Step 2 returned zero articles.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: incident
  query: opened_at>=javascript:gs.daysAgoStart(90)^state=6^category=network^subcategory=dns^resolved_byISNOTEMPTY
  fields: sys_id,number,short_description,close_notes,category,subcategory,resolved_by,resolution_code
  limit: 30
```

**Using REST API:**
```bash
GET /api/now/table/incident?sysparm_query=opened_at>=javascript:gs.daysAgoStart(90)^state=6^category=network^subcategory=dns^resolved_byISNOTEMPTY&sysparm_fields=sys_id,number,short_description,close_notes,category,subcategory,resolved_by,resolution_code&sysparm_limit=30
```

### Step 4: Analyze Search Logs for Failed Queries

Find search terms users entered in the knowledge portal that returned no results or very few results.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: search_log
  query: sys_created_on>=javascript:gs.daysAgoStart(30)^results_count=0^search_application=knowledge
  fields: sys_id,search_term,results_count,sys_created_on,user
  limit: 50
```

**Using REST API:**
```bash
GET /api/now/table/search_log?sysparm_query=sys_created_on>=javascript:gs.daysAgoStart(30)^results_count=0^search_application=knowledge&sysparm_fields=sys_id,search_term,results_count,sys_created_on,user&sysparm_limit=50
```

Aggregate failed search terms to find the most common unmet queries:

```
Tool: SN-Aggregate
Parameters:
  table_name: search_log
  query: sys_created_on>=javascript:gs.daysAgoStart(30)^results_count=0^search_application=knowledge
  group_by: search_term
  aggregate: COUNT
  order_by: COUNT
  limit: 20
```

### Step 5: Review Negative Feedback on Existing Articles

Find articles that users flagged as unhelpful, which may indicate incomplete coverage of a topic.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: kb_feedback
  query: sys_created_on>=javascript:gs.daysAgoStart(90)^rating=not_helpful^ORrating=1
  fields: sys_id,article,article.number,article.short_description,rating,comments,sys_created_on
  limit: 30
```

**Using REST API:**
```bash
GET /api/now/table/kb_feedback?sysparm_query=sys_created_on>=javascript:gs.daysAgoStart(90)^rating=not_helpful^ORrating=1&sysparm_fields=sys_id,article,article.number,article.short_description,rating,comments,sys_created_on&sysparm_limit=30
```

### Step 6: Examine Incidents Resolved Without KB Attachment

Find resolved incidents where no knowledge article was linked, indicating the resolution was ad hoc and undocumented.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: incident
  query: opened_at>=javascript:gs.daysAgoStart(90)^state=6^close_notes!=^kb_knowledgeISEMPTY
  fields: sys_id,number,short_description,close_notes,category,subcategory,assignment_group,resolved_by
  limit: 40
```

**Using REST API:**
```bash
GET /api/now/table/incident?sysparm_query=opened_at>=javascript:gs.daysAgoStart(90)^state=6^close_notes!=^kb_knowledgeISEMPTY&sysparm_fields=sys_id,number,short_description,close_notes,category,subcategory,assignment_group,resolved_by&sysparm_limit=40
```

### Step 7: Analyze CSM Cases for Service-Specific Gaps

If Customer Service Management is enabled, check for case topics lacking knowledge coverage.

**Using MCP:**
```
Tool: SN-Aggregate
Parameters:
  table_name: sn_customerservice_case
  query: opened_at>=javascript:gs.daysAgoStart(90)^state=3^knowledge=false
  group_by: product,category
  aggregate: COUNT
  order_by: COUNT
  limit: 20
```

**Using REST API:**
```bash
GET /api/now/stats/sn_customerservice_case?sysparm_query=opened_at>=javascript:gs.daysAgoStart(90)^state=3^knowledge=false&sysparm_group_by=product,category&sysparm_count=true&sysparm_limit=20
```

### Step 8: Build the Prioritized Gap Report

Compile findings into a prioritized list. Score each gap based on incident volume, business impact, and resolution complexity.

**Gap Scoring Matrix:**

| Factor | Weight | Score Range |
|--------|--------|-------------|
| Incident volume (90 days) | 40% | 1-5 based on count |
| Average priority of incidents | 25% | 1-5 (P1=5, P5=1) |
| Failed search frequency | 20% | 1-5 based on count |
| Negative feedback count | 15% | 1-5 based on count |

### Step 9: Create Knowledge Gap Records

Log identified gaps as tasks for knowledge authors.

**Using MCP:**
```
Tool: SN-Create-Record
Parameters:
  table_name: kb_submission
  data:
    short_description: "Knowledge Gap: DNS Configuration Troubleshooting"
    description: "Gap Analysis identified 47 resolved incidents in 90 days for DNS configuration issues with no matching KB article. Top search terms: 'dns settings', 'dns not resolving', 'configure dns'. Priority score: 4.2/5."
    kb_knowledge_base: [target_kb_sys_id]
    category: Network
    assignment_group: Knowledge Authors
```

**Using REST API:**
```bash
POST /api/now/table/kb_submission
Content-Type: application/json

{
  "short_description": "Knowledge Gap: DNS Configuration Troubleshooting",
  "description": "Gap Analysis identified 47 resolved incidents...",
  "kb_knowledge_base": "[target_kb_sys_id]",
  "category": "Network",
  "assignment_group": "[group_sys_id]"
}
```

## Tool Usage

### MCP Tools Reference

| Tool | When to Use |
|------|-------------|
| `SN-Query-Table` | Query incidents, articles, feedback, search logs |
| `SN-NL-Search` | Natural language searches for topic coverage |
| `SN-Aggregate` | Aggregate incident counts by category, search term frequency |
| `SN-Create-Record` | Create knowledge submission records for gaps |
| `SN-Add-Work-Notes` | Document analysis findings on existing records |

### REST API Reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/now/table/incident` | GET | Query resolved incidents |
| `/api/now/stats/incident` | GET | Aggregate incident data |
| `/api/now/table/kb_knowledge` | GET | Check existing article coverage |
| `/api/now/table/search_log` | GET | Analyze failed search queries |
| `/api/now/table/kb_feedback` | GET | Review negative article feedback |
| `/api/now/table/kb_submission` | POST | Create knowledge gap records |

## Best Practices

- **Run Regularly:** Perform gap analysis monthly or quarterly to stay ahead of emerging topics
- **Use Multiple Signals:** Combine incident data, search logs, and feedback for a complete picture; no single source tells the whole story
- **Focus on Resolved Incidents:** Only analyze closed/resolved incidents where the resolution is documented in close notes
- **Engage SMEs:** Share gap findings with subject matter experts who can validate and prioritize article creation
- **Track Deflection Impact:** Measure incident deflection rates before and after filling identified gaps
- **Consider Self-Service:** Prioritize gaps that would enable end-user self-service over internal-only documentation
- **Filter Out Noise:** Exclude one-off incidents and focus on recurring patterns with 5+ occurrences

## Troubleshooting

### "Search log table is empty or inaccessible"

**Cause:** Search analytics plugin not activated or search logging not enabled
**Solution:** Verify `com.glide.search` is active and the property `glide.ts.search.log` is set to `true`

### "Incident categories do not align with KB categories"

**Cause:** Different taxonomies used for incident classification vs. knowledge categorization
**Solution:** Create a mapping table between incident categories/subcategories and KB category labels for accurate cross-referencing

### "Too many incidents returned without KB links"

**Cause:** Knowledge-centered service (KCS) practices not enforced; agents not linking articles
**Solution:** Filter by assignment groups that are expected to use KCS and focus on categories where articles exist but are not being attached

### "Aggregate queries time out"

**Cause:** Large incident tables with broad date ranges
**Solution:** Narrow the date range to 30 days or filter by specific assignment groups or categories

## Examples

### Example 1: Network DNS Gap Discovery

**Analysis:**
- 47 resolved incidents for "DNS" subcategory in 90 days
- 23 failed knowledge searches for "dns settings" and "dns not resolving"
- Zero published KB articles matching DNS configuration
- Average incident priority: P3

**Gap Score:** 4.2/5 (high volume, frequent failed searches)

**Recommendation:** Create a comprehensive DNS troubleshooting article covering common configuration errors, resolution steps, and escalation paths. Assign to Network Operations knowledge author.

### Example 2: New Employee Onboarding Gap

**Analysis:**
- 112 incidents for "Account Setup" category in 90 days
- 45 failed searches for "new employee access", "first day setup", "onboarding checklist"
- 2 existing KB articles found but both rated "not helpful" (8 negative feedback entries)
- Existing articles are 18 months old and reference deprecated tools

**Gap Score:** 4.8/5 (very high volume, existing content outdated)

**Recommendation:** Retire outdated articles and create a new comprehensive onboarding guide. Coordinate with HR and IT to cover all provisioning steps. High priority due to impact on new hire productivity.

### Example 3: CSM Product Return Gap

**Analysis:**
- 38 customer service cases for "Product Returns" with no knowledge flag
- 15 failed portal searches for "return policy", "return label", "refund status"
- No published articles in the external customer knowledge base

**Gap Score:** 3.9/5 (moderate volume, customer-facing impact)

**Recommendation:** Create a customer-facing article covering return eligibility, process steps, label generation, and refund timelines. Publish to the external knowledge base for self-service deflection.

## Related Skills

- `knowledge/duplicate-detection` - Clean up redundant articles before gap analysis
- `knowledge/content-recommendation` - Surface existing articles for incidents
- `knowledge/article-generation` - Generate articles from resolved incidents to fill gaps
- `knowledge/gap-grouping` - Cluster and prioritize identified gaps by topic
