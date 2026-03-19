---
name: insights-clustering
version: 1.0.0
description: Cluster and analyze insights from incidents, conversations, and cases grouping by topic, sentiment, and resolution pattern to generate actionable POV summaries
author: Happy Technologies LLC
tags: [genai, insights, clustering, analytics, sentiment, incidents, cases, patterns, trends, nlp]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp:
    - SN-Query-Table
    - SN-Read-Record
    - SN-NL-Search
    - SN-Create-Record
  rest:
    - /api/now/table/incident
    - /api/now/table/sn_customerservice_case
    - /api/now/table/interaction
    - /api/now/table/sys_cs_conversation
    - /api/now/table/kb_knowledge
    - /api/now/table/problem
    - /api/now/table/sys_journal_field
  native:
    - Bash
complexity: advanced
estimated_time: 30-60 minutes
---

# Insights Clustering and Analysis

## Overview

This skill covers clustering and analyzing insights from ServiceNow operational data to identify patterns and generate actionable recommendations:

- Grouping incidents, cases, and conversations by topic similarity to discover recurring themes
- Performing sentiment analysis across interactions to identify service quality trends
- Analyzing resolution patterns to find best practices and knowledge gaps
- Detecting emerging issue clusters before they become major problems
- Generating point-of-view (POV) summaries with data-backed recommendations
- Building trend reports that connect operational patterns to business impact

**When to use:** When performing periodic service review analysis, investigating a spike in support volume, preparing data-driven improvement recommendations, identifying proactive problem management candidates, or generating management insights from operational data.

## Prerequisites

- **Roles:** `admin`, `analytics_admin`, `itil`, or `problem_manager`
- **Plugins:** `com.glide.interaction` (Agent Workspace), `com.snc.problem_management` (Problem Management) recommended
- **Access:** Read access to `incident`, `sn_customerservice_case`, `interaction`, `sys_cs_conversation`, `kb_knowledge`, `problem` tables
- **Data:** At least 30 days of incident, case, or interaction data for meaningful clustering
- **Related Skills:** `genai/agent-miner` for interaction mining, `knowledge/gap-analysis` for KB gap identification

## Procedure

### Step 1: Define Analysis Scope

Determine the data sources, time range, and focus area for clustering.

```
ANALYSIS SCOPE DEFINITION:

Data Sources:
- [ ] Incidents (incident table)
- [ ] Customer Cases (sn_customerservice_case)
- [ ] Agent Interactions (interaction)
- [ ] Virtual Agent Conversations (sys_cs_conversation)
- [ ] Problem Records (problem)

Time Range: [start_date] to [end_date]
Focus Area: [All / Specific category / Assignment group / Service]
Minimum Cluster Size: [threshold, e.g., 5 records]

ANALYSIS OBJECTIVES:
1. [Primary objective, e.g., "Identify top incident drivers"]
2. [Secondary objective, e.g., "Find knowledge gaps"]
3. [Tertiary objective, e.g., "Assess customer sentiment trends"]
```

### Step 2: Extract Incident Data for Clustering

Pull incident records with text and classification fields.

**MCP Approach:**
```
Tool: SN-Query-Table
Parameters:
  table_name: incident
  query: sys_created_on>=javascript:gs.daysAgo(30)^state!=8^ORDERBYDESCsys_created_on
  fields: sys_id,number,short_description,description,category,subcategory,priority,impact,urgency,state,close_code,close_notes,assignment_group,cmdb_ci,business_service,resolved_at,opened_at,resolution_code
  limit: 1000
```

**REST Approach:**
```
GET /api/now/table/incident
  ?sysparm_query=sys_created_on>=javascript:gs.daysAgo(30)^state!=8
  &sysparm_fields=sys_id,number,short_description,description,category,subcategory,priority,impact,urgency,state,close_code,close_notes,assignment_group,cmdb_ci,business_service,resolved_at,opened_at
  &sysparm_limit=1000
  &sysparm_display_value=true
```

### Step 3: Extract Case and Interaction Data

Pull additional data sources for cross-channel analysis.

**MCP Approach:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_customerservice_case
  query: sys_created_on>=javascript:gs.daysAgo(30)^ORDERBYDESCsys_created_on
  fields: sys_id,number,short_description,description,category,subcategory,priority,state,resolution_code,close_notes,contact,account,product
  limit: 500
```

```
Tool: SN-Query-Table
Parameters:
  table_name: interaction
  query: sys_created_on>=javascript:gs.daysAgo(30)^state=closed
  fields: sys_id,number,short_description,channel,category,close_code,assignment_group,duration
  limit: 500
```

### Step 4: Perform Topic Clustering

Group records by topic similarity using text analysis of short descriptions and descriptions.

**Clustering Approach:**

1. **Category-Based Grouping:** Group by existing category/subcategory taxonomy
2. **Text Similarity:** Cluster short_description fields by keyword and phrase overlap
3. **CI-Based Grouping:** Group by affected configuration item or business service
4. **Resolution-Based:** Group by close_code and resolution patterns

**MCP Approach (Category Aggregation):**
```
Tool: SN-Query-Table
Parameters:
  table_name: incident
  query: sys_created_on>=javascript:gs.daysAgo(30)
  fields: category,subcategory
  limit: 2000
```

**Topic Cluster Output:**

```
=== TOPIC CLUSTERS ===
Analysis Period: [date range]
Total Records Analyzed: [count]
Clusters Identified: [count]

CLUSTER 1: [Topic Name] - [count] records ([%] of total)
  Keywords: [top keywords]
  Categories: [categories represented]
  Sample Records:
  - [INC#]: [short_description]
  - [INC#]: [short_description]
  Trend: [increasing/stable/decreasing] vs prior period

CLUSTER 2: [Topic Name] - [count] records ([%] of total)
  ...
```

### Step 5: Analyze Sentiment Patterns

Assess sentiment from customer comments and interaction transcripts.

**MCP Approach:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_journal_field
  query: element_id=[RECORD_SYS_ID]^element=comments
  fields: value,sys_created_on,sys_created_by
  limit: 20
```

**Sentiment Classification Framework:**

| Signal | Positive | Neutral | Negative |
|--------|----------|---------|----------|
| Language | "thank you", "great", "resolved" | "ok", "understood", factual | "frustrated", "unacceptable", "still broken" |
| Frequency | Single contact | Follow-up after resolution | Multiple escalations |
| Reopens | None | 1 reopen | 2+ reopens |
| Survey Score | 4-5 | 3 | 1-2 |

**Sentiment Distribution:**
```
SENTIMENT ANALYSIS:
Positive: [count] ([%])
Neutral: [count] ([%])
Negative: [count] ([%])

NEGATIVE SENTIMENT DRIVERS:
1. [Topic/Category]: [count] negative interactions
   Common complaints: [themes]
2. [Topic/Category]: [count] negative interactions
   Common complaints: [themes]

SENTIMENT TREND (vs Prior Period):
Positive: [+/- change]
Negative: [+/- change]
```

### Step 6: Analyze Resolution Patterns

Identify common resolution approaches and their effectiveness.

**MCP Approach:**
```
Tool: SN-Query-Table
Parameters:
  table_name: incident
  query: sys_created_on>=javascript:gs.daysAgo(30)^state=6
  fields: category,subcategory,close_code,resolution_code,close_notes
  limit: 500
```

**Resolution Pattern Analysis:**

```
RESOLUTION PATTERNS:

CLUSTER: [Topic Name]
Total Incidents: [count]
Resolution Methods:
  1. [Resolution type] - [count] ([%]) - Avg Resolution Time: [time]
  2. [Resolution type] - [count] ([%]) - Avg Resolution Time: [time]
  3. [Resolution type] - [count] ([%]) - Avg Resolution Time: [time]

MOST EFFECTIVE RESOLUTION:
[Resolution type] resolves [%] of incidents in this cluster with
an average resolution time of [time] and [%] reopen rate.

KNOWLEDGE GAP:
[Count] incidents in this cluster had no matching KB article.
[Count] incidents were resolved by workaround (no permanent fix).
```

### Step 7: Detect Emerging Clusters

Identify new or growing issue patterns that may indicate emerging problems.

**MCP Approach:**
```
Tool: SN-Query-Table
Parameters:
  table_name: incident
  query: sys_created_on>=javascript:gs.daysAgo(7)
  fields: short_description,category,subcategory,cmdb_ci,business_service,priority
  limit: 500
```

Compare recent volume against baseline:

```
EMERGING CLUSTER DETECTION:

ALERT: [Cluster Name]
Current Volume (7 days): [count]
Baseline (avg 7-day): [count]
Increase: [%]
Affected CIs: [list]

PATTERN: [Description of the emerging pattern]
POTENTIAL IMPACT: [Assessment of what this could become]
RECOMMENDED ACTION: [Create problem record / Investigate / Monitor]
```

### Step 8: Cross-Channel Correlation

Correlate patterns across incidents, cases, and interactions.

```
CROSS-CHANNEL CORRELATION:

Topic: [Cluster Name]
Incidents: [count] | Cases: [count] | Interactions: [count]
Total Volume: [sum]

CHANNEL DISTRIBUTION:
  Self-Service: [%]
  Phone: [%]
  Chat: [%]
  Email: [%]
  Walk-up: [%]

INSIGHT: [Description of cross-channel pattern, e.g., "Users first attempt
self-service, fail, then call. Knowledge article KB0012345 is outdated."]
```

### Step 9: Generate POV Summary

Create an actionable point-of-view summary with data-backed recommendations.

```
=== INSIGHTS POV SUMMARY ===
Analysis Period: [date range]
Data Analyzed: [total records] across [channels]
Generated: [date]

EXECUTIVE SUMMARY:
[2-3 sentence summary of key findings and their business impact]

TOP INSIGHT CLUSTERS:

1. [CLUSTER NAME] - [Priority: HIGH/MEDIUM/LOW]
   Volume: [count] records ([%] of total, [trend] vs prior period)
   Impact: [business impact description]
   Sentiment: [predominant sentiment]
   Root Pattern: [underlying cause or pattern]

   RECOMMENDATION:
   [Specific, actionable recommendation with expected outcome]

   ESTIMATED IMPACT:
   - Reduction in volume: [%] if addressed
   - Time savings: [hours/month]
   - Satisfaction improvement: [projected]

2. [CLUSTER NAME] - [Priority: HIGH/MEDIUM/LOW]
   ...

CROSS-CUTTING THEMES:
- [Theme that spans multiple clusters]
- [Systemic issue identified across data sources]

KNOWLEDGE GAPS IDENTIFIED:
| Topic | Volume | Existing KB | Gap Description |
|-------|--------|-------------|-----------------|
| [topic] | [count] | [None/Outdated] | [What is needed] |

PROACTIVE PROBLEM CANDIDATES:
| Pattern | Volume | Trend | Suggested PRB |
|---------|--------|-------|---------------|
| [pattern] | [count] | [increasing] | [problem description] |

ACTION PLAN:
| # | Action | Owner | Priority | Timeline |
|---|--------|-------|----------|----------|
| 1 | [Action] | [Team] | High | [timeframe] |
| 2 | [Action] | [Team] | Medium | [timeframe] |
| 3 | [Action] | [Team] | Low | [timeframe] |

DATA QUALITY NOTES:
- [Any data quality issues that may affect analysis accuracy]
- [Assumptions made in the clustering process]
```

### Step 10: Create Problem Records for Top Clusters

For clusters that warrant proactive investigation, create problem records.

**MCP Approach:**
```
Tool: SN-Create-Record
Parameters:
  table_name: problem
  data:
    short_description: "Proactive: [Cluster description] - [count] related incidents"
    description: |
      CLUSTER ANALYSIS:
      This problem was created based on insights clustering analysis
      identifying [count] related incidents over [time period].

      PATTERN:
      [Description of the recurring pattern]

      SAMPLE INCIDENTS:
      - [INC#]: [short_description]
      - [INC#]: [short_description]
      - [INC#]: [short_description]

      IMPACT:
      [Business impact assessment]

      SUGGESTED INVESTIGATION:
      [Where to start the root cause investigation]
    category: [category]
    priority: [priority based on cluster analysis]
    assignment_group: [relevant team]
```

## Tool Usage

| Tool | Purpose | When to Use |
|------|---------|-------------|
| SN-Query-Table | Extract incident, case, and interaction data | Primary data collection |
| SN-Read-Record | Get detailed record for deep analysis | Investigating specific records |
| SN-NL-Search | Find related records by description similarity | Cross-referencing patterns |
| SN-Create-Record | Create problem records from cluster findings | Acting on insights |

## Best Practices

1. **Use at least 30 days of data** for stable clustering results
2. **Combine structured and unstructured data** -- categories alone miss nuance; text alone misses context
3. **Set minimum cluster thresholds** -- ignore clusters with fewer than 5 records to reduce noise
4. **Compare against prior periods** -- trends matter more than absolute numbers
5. **Validate with SMEs** -- have domain experts review cluster labels and recommendations
6. **Exclude noise records** -- filter out test tickets, duplicates, and auto-generated records
7. **Weight by impact** -- a cluster of 10 P1 incidents is more important than 50 P4 incidents
8. **Track cluster evolution** -- re-run clustering monthly to see which patterns grow or shrink
9. **Connect to business outcomes** -- translate technical patterns into business impact language
10. **Act on findings** -- clustering without action is just analytics theater

## Troubleshooting

| Issue | Cause | Resolution |
|-------|-------|------------|
| Too many small clusters | Threshold too low or data too diverse | Increase minimum cluster size; restrict analysis scope |
| Clusters too broad | Insufficient text granularity | Include description field, not just short_description; add subcategory |
| Sentiment analysis inaccurate | Limited customer-facing comments | Focus on interaction transcripts; use reopen count as sentiment proxy |
| No emerging clusters found | Stable environment or insufficient baseline | Extend baseline period; lower detection threshold |
| Cross-channel data mismatch | Different fields and categories across tables | Normalize category mappings before clustering; use text-based clustering |
| Volume too large for analysis | Too many records in time range | Narrow time range or filter to specific category/group |

## Examples

### Example 1: Monthly IT Service Review

**Scenario:** Generate monthly insights for IT service management review.

```
INSIGHTS POV - IT Services - February 2026

TOP 3 CLUSTERS:
1. VPN Connectivity Issues (187 incidents, +45% vs Jan)
   Driver: Recent network configuration change
   Action: Roll back VPN split-tunnel config change

2. Password Lockouts (142 incidents, stable)
   Driver: MFA policy change confusing users
   Action: Update KB article; add VA topic for guided MFA setup

3. Printer Issues - Building C (68 incidents, NEW cluster)
   Driver: New printer fleet deployment incomplete
   Action: Complete printer driver deployment; update print server config
```

### Example 2: Customer Service Trend Analysis

**Scenario:** Analyze customer case trends for quarterly business review.

```
CUSTOMER INSIGHTS - Q1 2026

SENTIMENT TREND: Negative sentiment increased 12% QoQ
PRIMARY DRIVER: Order processing delays (cluster of 234 cases)

CLUSTER ANALYSIS:
- Order Delays: 234 cases (28%) - Negative sentiment 78%
- Billing Disputes: 156 cases (19%) - Negative sentiment 65%
- Product Questions: 312 cases (37%) - Neutral sentiment 80%
- Account Access: 89 cases (11%) - Mixed sentiment

RECOMMENDATION: Order processing system needs capacity upgrade.
Current processing time exceeds SLA in 32% of orders during peak hours.
```

### Example 3: Proactive Problem Identification

**Scenario:** Detect emerging patterns for proactive problem management.

```
EMERGING PATTERN DETECTED:

Application: SAP Finance Module
7-Day Volume: 23 incidents (baseline: 8/week)
Increase: 188%
Affected Users: Finance department, 3 locations

Pattern: "SAP report timeout" and "SAP slow response" keywords
appearing with increasing frequency since March 12.

Correlated Event: Database maintenance performed March 11.

RECOMMENDATION: Create problem record PRB0005678.
Investigate database performance post-maintenance.
Potential index rebuild needed.
```

## Related Skills

- `genai/agent-miner` - Mine agent interactions for automation opportunities
- `knowledge/gap-analysis` - Identify knowledge base coverage gaps
- `knowledge/gap-grouping` - Group knowledge gaps by theme
- `itsm/problem-analysis` - Root cause analysis for identified problems
- `reporting/trend-analysis` - Trend analysis and visualization
- `csm/sentiment-analysis` - Customer sentiment analysis
