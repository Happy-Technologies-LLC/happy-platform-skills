---
name: gap-grouping
version: 1.0.0
description: Group and categorize knowledge gaps by topic, service area, and priority to identify systemic documentation needs, cluster related gaps, and create action plans for article creation
author: Happy Technologies LLC
tags: [knowledge, gap-grouping, clustering, prioritization, action-plan, knowledge-management]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp:
    - SN-Query-Table
    - SN-NL-Search
    - SN-Aggregate
    - SN-Create-Record
    - SN-Update-Record
    - SN-Add-Work-Notes
  rest:
    - /api/now/table/kb_knowledge
    - /api/now/table/kb_knowledge_base
    - /api/now/table/kb_category
    - /api/now/table/incident
    - /api/now/table/sn_customerservice_case
    - /api/now/table/kb_submission
    - /api/now/table/search_log
    - /api/now/stats/incident
  native:
    - Bash
complexity: advanced
estimated_time: 25-45 minutes
---

# Knowledge Gap Grouping and Categorization

## Overview

This skill builds on gap analysis by grouping, clustering, and categorizing identified knowledge gaps into actionable themes. Individual gaps in isolation are hard to prioritize, but when clustered by topic, service area, or user impact, patterns emerge that reveal systemic documentation deficiencies requiring coordinated action.

This skill helps you:

- Collect and normalize knowledge gap data from multiple sources (incidents, search logs, feedback, submissions)
- Cluster related gaps by service area, category, configuration item, and assignment group
- Identify systemic documentation deficiencies across service domains
- Prioritize gap clusters by aggregate impact, frequency, and business criticality
- Create structured action plans assigning gap clusters to knowledge authors with deadlines
- Track progress on gap remediation efforts

**When to use:** After completing a gap analysis, during quarterly knowledge planning, when building a knowledge creation backlog, or when staffing knowledge authoring sprints.

## Prerequisites

- **Roles:** `knowledge_manager` or `knowledge_admin` for full workflow; `knowledge` for read-only analysis
- **Access:** Read access to `incident`, `kb_knowledge`, `kb_submission`, `search_log`, `kb_feedback` tables; write access to `kb_submission` and `kb_knowledge`
- **Plugin:** `com.glideapp.knowledge` (Knowledge Management) activated
- **Recommended:** Completed gap analysis (see `knowledge/gap-analysis` skill) providing raw gap data
- **Knowledge:** Understanding of your organization's service catalog taxonomy and knowledge ownership model

## Procedure

### Step 1: Collect Raw Gap Data from Incidents

Aggregate resolved incidents without linked KB articles, grouped by category and subcategory, to identify volume-based gaps.

**Using MCP:**
```
Tool: SN-Aggregate
Parameters:
  table_name: incident
  query: opened_at>=javascript:gs.daysAgoStart(90)^state=6^kb_knowledgeISEMPTY^close_notesISNOTEMPTY
  group_by: category,subcategory,assignment_group
  aggregate: COUNT
  order_by: COUNT
  limit: 50
```

**Using REST API:**
```bash
GET /api/now/stats/incident?sysparm_query=opened_at>=javascript:gs.daysAgoStart(90)^state=6^kb_knowledgeISEMPTY^close_notesISNOTEMPTY&sysparm_group_by=category,subcategory,assignment_group&sysparm_count=true&sysparm_orderby=COUNT&sysparm_limit=50
```

### Step 2: Collect Gap Data from Failed Searches

Aggregate failed knowledge search terms to find clusters of unmet user needs.

**Using MCP:**
```
Tool: SN-Aggregate
Parameters:
  table_name: search_log
  query: sys_created_on>=javascript:gs.daysAgoStart(90)^results_count=0^search_application=knowledge
  group_by: search_term
  aggregate: COUNT
  order_by: COUNT
  limit: 40
```

**Using REST API:**
```bash
GET /api/now/stats/search_log?sysparm_query=sys_created_on>=javascript:gs.daysAgoStart(90)^results_count=0^search_application=knowledge&sysparm_group_by=search_term&sysparm_count=true&sysparm_orderby=COUNT&sysparm_limit=40
```

### Step 3: Collect Gap Data from Knowledge Submissions

Review pending knowledge submissions (requests for new articles) to capture user-reported gaps.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: kb_submission
  query: state=pending^ORstate=open^sys_created_on>=javascript:gs.daysAgoStart(180)
  fields: sys_id,number,short_description,description,kb_knowledge_base,category,assignment_group,priority,sys_created_on
  limit: 40
```

**Using REST API:**
```bash
GET /api/now/table/kb_submission?sysparm_query=state=pending^ORstate=open^sys_created_on>=javascript:gs.daysAgoStart(180)&sysparm_fields=sys_id,number,short_description,description,kb_knowledge_base,category,assignment_group,priority,sys_created_on&sysparm_limit=40
```

### Step 4: Collect Gap Data from Negative Article Feedback

Find articles receiving negative feedback, which may indicate incomplete coverage of a topic area.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: kb_feedback
  query: sys_created_on>=javascript:gs.daysAgoStart(90)^rating=not_helpful^ORrating=1
  fields: sys_id,article,article.number,article.short_description,article.kb_category,comments,sys_created_on
  limit: 40
```

**Using REST API:**
```bash
GET /api/now/table/kb_feedback?sysparm_query=sys_created_on>=javascript:gs.daysAgoStart(90)^rating=not_helpful^ORrating=1&sysparm_fields=sys_id,article,article.number,article.short_description,article.kb_category,comments,sys_created_on&sysparm_limit=40
```

### Step 5: Define Grouping Dimensions

Cluster the collected gaps using these dimensions:

**Grouping Taxonomy:**

| Dimension | Source Fields | Purpose |
|-----------|-------------|---------|
| Service Area | `category`, `cmdb_ci.sys_class_name` | Group by IT service domain |
| Topic | `subcategory`, `short_description` keywords | Group by specific subject matter |
| Audience | `assignment_group`, incident caller type | Internal IT vs. end-user vs. customer |
| Knowledge Base | `kb_knowledge_base` | Align to existing KB ownership |
| Priority Tier | Incident `priority`, case `priority` | Business criticality ranking |
| CI/Application | `cmdb_ci`, `cmdb_ci.name` | Group by affected system |

### Step 6: Cluster Gaps by Service Area

Map each gap to a service area cluster. Query existing KB categories to align clusters with the knowledge base taxonomy.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: kb_category
  query: kb_knowledge_base=[primary_kb_sys_id]^active=true^parent_id=NULL
  fields: sys_id,label,full_category,kb_knowledge_base
  limit: 30
```

**Using REST API:**
```bash
GET /api/now/table/kb_category?sysparm_query=kb_knowledge_base=[primary_kb_sys_id]^active=true^parent_idISEMPTY&sysparm_fields=sys_id,label,full_category,kb_knowledge_base&sysparm_limit=30
```

Map incident categories to KB categories:

| Incident Category | KB Category | Gap Count | Service Area Cluster |
|-------------------|-------------|-----------|---------------------|
| Network | Network & Connectivity | 47 | Infrastructure |
| Software | Applications | 35 | End-User Computing |
| Hardware | Devices & Peripherals | 28 | End-User Computing |
| Email | Email & Collaboration | 22 | Communication |
| Database | Data Services | 18 | Infrastructure |
| Security | Security & Access | 15 | Security |

### Step 7: Score and Prioritize Gap Clusters

Apply a composite scoring model to rank gap clusters by urgency and impact.

**Cluster Scoring Formula:**

| Factor | Weight | Measurement |
|--------|--------|-------------|
| Total incident volume | 30% | Sum of incidents across all gaps in cluster |
| Average incident priority | 20% | Weighted average (P1=5, P2=4, P3=3, P4=2, P5=1) |
| Failed search frequency | 20% | Sum of failed search queries matching cluster topics |
| Negative feedback count | 15% | Count of negative ratings on related articles |
| Knowledge submission count | 15% | Number of pending article requests in this topic |

**Priority Tiers:**
- **Critical (Score 4.0-5.0):** Immediate action required; assign to next sprint
- **High (Score 3.0-3.9):** Plan for current quarter
- **Medium (Score 2.0-2.9):** Schedule for next quarter
- **Low (Score 1.0-1.9):** Add to backlog, address opportunistically

### Step 8: Identify Knowledge Authoring Ownership

Determine which team or individual should own each gap cluster based on assignment group patterns.

**Using MCP:**
```
Tool: SN-Aggregate
Parameters:
  table_name: incident
  query: opened_at>=javascript:gs.daysAgoStart(90)^state=6^category=network^kb_knowledgeISEMPTY
  group_by: assignment_group
  aggregate: COUNT
  order_by: COUNT
  limit: 10
```

**Using REST API:**
```bash
GET /api/now/stats/incident?sysparm_query=opened_at>=javascript:gs.daysAgoStart(90)^state=6^category=network^kb_knowledgeISEMPTY&sysparm_group_by=assignment_group&sysparm_count=true&sysparm_limit=10
```

The assignment group resolving the most incidents for a gap cluster is the best candidate to author the knowledge articles.

### Step 9: Create Action Plan Records

Create knowledge submission records for each gap cluster with clear scope and deadlines.

**Using MCP:**
```
Tool: SN-Create-Record
Parameters:
  table_name: kb_submission
  data:
    short_description: "Gap Cluster: Network Connectivity Troubleshooting (5 articles needed)"
    description: |
      === KNOWLEDGE GAP CLUSTER ACTION PLAN ===
      Cluster: Infrastructure - Network & Connectivity
      Priority: Critical (Score: 4.3/5)

      Gap Items:
      1. DNS configuration troubleshooting (47 incidents, 23 failed searches)
      2. VPN split tunnel configuration (31 incidents, 15 failed searches)
      3. Wireless network authentication errors (28 incidents, 12 failed searches)
      4. Network printer connectivity (22 incidents, 8 failed searches)
      5. Proxy configuration for remote users (18 incidents, 10 failed searches)

      Total Incident Impact: 146 incidents in 90 days
      Estimated Articles: 5 new, 2 updates to existing
      Target Completion: 2026-04-30
      Assigned Team: Network Operations

      Success Criteria:
      - All 5 articles published and indexed
      - Failed search rate for cluster topics reduced by 50%
      - Incident-to-KB attachment rate >60% for network category
    kb_knowledge_base: [target_kb_sys_id]
    category: Network
    assignment_group: Network Operations
    priority: 1
```

**Using REST API:**
```bash
POST /api/now/table/kb_submission
Content-Type: application/json

{
  "short_description": "Gap Cluster: Network Connectivity Troubleshooting (5 articles needed)",
  "description": "=== KNOWLEDGE GAP CLUSTER ACTION PLAN ===\nCluster: Infrastructure...",
  "kb_knowledge_base": "[target_kb_sys_id]",
  "category": "Network",
  "assignment_group": "[group_sys_id]",
  "priority": "1"
}
```

### Step 10: Track Gap Remediation Progress

Periodically check how many gaps in each cluster have been addressed by querying newly created articles.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: kb_knowledge
  query: sys_created_on>=javascript:gs.daysAgoStart(30)^kb_category.label=Network^workflow_stateINdraft,review,published
  fields: sys_id,number,short_description,workflow_state,kb_category,author,sys_created_on
  limit: 20
```

**Using REST API:**
```bash
GET /api/now/table/kb_knowledge?sysparm_query=sys_created_on>=javascript:gs.daysAgoStart(30)^kb_category.label=Network^workflow_stateINdraft,review,published&sysparm_fields=sys_id,number,short_description,workflow_state,kb_category,author,sys_created_on&sysparm_limit=20
```

## Tool Usage

### MCP Tools Reference

| Tool | When to Use |
|------|-------------|
| `SN-Query-Table` | Query gaps, submissions, feedback, articles |
| `SN-NL-Search` | Search for existing coverage by topic |
| `SN-Aggregate` | Aggregate incidents and search logs for volume analysis |
| `SN-Create-Record` | Create action plan records as knowledge submissions |
| `SN-Update-Record` | Update submission status and progress notes |
| `SN-Add-Work-Notes` | Document clustering decisions and rationale |

### REST API Reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/now/stats/incident` | GET | Aggregate incident volume by category |
| `/api/now/stats/search_log` | GET | Aggregate failed search frequency |
| `/api/now/table/kb_submission` | GET/POST | Manage knowledge submissions and action plans |
| `/api/now/table/kb_feedback` | GET | Retrieve negative feedback data |
| `/api/now/table/kb_category` | GET | Map gaps to KB taxonomy |
| `/api/now/table/kb_knowledge` | GET | Track remediation progress |

## Best Practices

- **Group Before You Prioritize:** Individual gaps are noisy; clustering reveals the true priorities and prevents fragmented effort
- **Align to KB Taxonomy:** Map gap clusters to existing knowledge base categories so articles land in the right place
- **Assign Ownership by Expertise:** The team that resolves the incidents is best positioned to write the articles; use assignment group data to identify authors
- **Set Realistic Timelines:** A typical knowledge author can produce 2-3 quality articles per week; plan cluster timelines accordingly
- **Define Success Metrics:** Each action plan should include measurable criteria (search hit rate improvement, incident deflection, feedback scores)
- **Review Quarterly:** Gap clusters shift as the organization evolves; re-run the analysis each quarter and adjust priorities
- **Start with Quick Wins:** Within each cluster, identify gaps that can be filled by repurposing existing close notes or problem workarounds

## Troubleshooting

### "Gap clusters are too broad -- every gap falls into the same category"

**Cause:** Incident categorization is too coarse (e.g., everything is "Software")
**Solution:** Use subcategory, CI, or assignment group as additional dimensions. If subcategories are sparse, cluster by keyword patterns in short descriptions

### "Cannot determine knowledge authoring ownership"

**Cause:** No clear assignment group pattern; incidents spread across many teams
**Solution:** Assign to the Knowledge Management team as a centralized authoring function, or identify a subject matter expert through the most frequent resolver

### "Pending knowledge submissions are stale and outdated"

**Cause:** Submissions were created but never triaged or assigned
**Solution:** Filter submissions by age and close those older than 12 months that are no longer relevant. Focus on submissions from the past 6 months

### "Gap cluster priorities change frequently"

**Cause:** New incident spikes or organizational changes shift priorities
**Solution:** Use a rolling 90-day window for scoring to capture current trends. Re-score monthly and communicate changes to stakeholders

### "Action plan records are not being tracked"

**Cause:** No workflow or reporting on knowledge submission records
**Solution:** Create a simple dashboard or scheduled report tracking `kb_submission` records by state, assignment group, and age

## Examples

### Example 1: Infrastructure Gap Cluster

**Cluster:** Infrastructure - Network & Connectivity
**Score:** 4.3/5 (Critical)

**Gaps Identified:**
| Gap Topic | Incidents | Failed Searches | Submissions |
|-----------|-----------|-----------------|-------------|
| DNS troubleshooting | 47 | 23 | 1 |
| VPN split tunnel | 31 | 15 | 2 |
| Wireless auth errors | 28 | 12 | 0 |
| Network printer setup | 22 | 8 | 1 |
| Proxy for remote users | 18 | 10 | 0 |

**Action Plan:** 5 new articles, assigned to Network Operations, target completion 4 weeks. Start with DNS and VPN as highest volume.

### Example 2: End-User Computing Gap Cluster

**Cluster:** End-User Computing - Applications
**Score:** 3.5/5 (High)

**Gaps Identified:**
| Gap Topic | Incidents | Failed Searches | Negative Feedback |
|-----------|-----------|-----------------|-------------------|
| Office 365 migration FAQ | 35 | 28 | 5 |
| Adobe license activation | 22 | 11 | 2 |
| Zoom plugin install | 19 | 9 | 0 |
| Browser compatibility | 15 | 7 | 3 |

**Action Plan:** 4 new articles + 2 article updates, assigned to Desktop Support knowledge authors, target completion 3 weeks. Prioritize Office 365 migration content due to ongoing rollout.

### Example 3: Customer-Facing Gap Cluster

**Cluster:** Customer Service - Product Support
**Score:** 4.1/5 (Critical)

**Gaps Identified:**
| Gap Topic | Cases | Failed Portal Searches | Submissions |
|-----------|-------|------------------------|-------------|
| Product return process | 38 | 22 | 3 |
| Warranty claim procedure | 25 | 18 | 2 |
| Order tracking status | 20 | 14 | 1 |

**Action Plan:** 3 new customer-facing articles for external KB, assigned to Customer Service knowledge team. Critical priority due to direct customer impact and self-service deflection opportunity. Target completion 2 weeks.

## Related Skills

- `knowledge/gap-analysis` - Identify individual knowledge gaps (prerequisite for this skill)
- `knowledge/article-generation` - Generate articles to fill gaps in each cluster
- `knowledge/duplicate-detection` - Prevent duplicates when creating articles for gap clusters
- `knowledge/content-recommendation` - Validate that new articles are surfaced for relevant incidents
