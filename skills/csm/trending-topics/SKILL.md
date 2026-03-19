---
name: trending-topics
version: 1.0.0
description: Identify trending customer service topics by analyzing case patterns, channel distribution, and sentiment shifts across the CSM portfolio
author: Happy Technologies LLC
tags: [csm, trending, analytics, patterns, sentiment, channel-analysis, case-volume, reporting]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp:
    - SN-NL-Search
    - SN-Query-Table
    - SN-Read-Record
    - SN-Execute-Background-Script
  rest:
    - /api/now/table/sn_customerservice_case
    - /api/now/table/interaction
    - /api/now/table/csm_consumer
    - /api/now/table/sys_journal_field
    - /api/now/stats/sn_customerservice_case
  native:
    - Bash
complexity: advanced
estimated_time: 15-30 minutes
---

# Trending Topics Analysis for CSM

## Overview

This skill identifies emerging and trending topics across the customer service portfolio by analyzing case creation patterns, category distributions, channel preferences, and sentiment shifts. It enables proactive support management by surfacing issues before they become widespread. It covers:

- Analyzing case volume trends by category, subcategory, and product over configurable time windows
- Detecting sudden spikes in case creation for specific issue types
- Mapping channel distribution shifts (phone, chat, email, portal) across topics
- Identifying sentiment trends in customer communications for early warning signals
- Correlating trending topics with account tiers and customer segments
- Generating executive-level trend reports with actionable recommendations

**When to use:** During daily standup reviews, weekly operational reporting, when investigating a suspected increase in case volume for a specific topic, or when proactively monitoring service health across the customer base.

**Value proposition:** Enables proactive support management by detecting emerging issues before they impact SLAs. Supports staffing decisions, knowledge gap identification, and product feedback loops with data-driven trend analysis.

## Prerequisites

- **Plugins:** Customer Service Management (`com.sn_customerservice`) must be active
- **Roles:** `sn_customerservice_manager`, `csm_admin`, or `report_admin`
- **Access:** Read access to `sn_customerservice_case`, `interaction`, `csm_consumer`, and `sys_journal_field` tables; access to aggregate/stats APIs
- **Data:** At least 90 days of case history for meaningful trend analysis; more data yields better baseline comparisons
- **Knowledge:** Understanding of case categorization taxonomy, customer segments, and SLA targets

## Procedure

### Step 1: Establish Baseline Case Volume by Category

Query case volumes for the current period and comparison period to detect deviations.

**Using MCP (Claude Code/Desktop):**
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_customerservice_case
  query: opened_atONLast 7 days@javascript:gs.beginningOfLast7Days()@javascript:gs.endOfLast7Days()
  fields: category,subcategory,product,priority,contact_type,state
  limit: 500
```

For the comparison baseline (previous 7-day period):
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_customerservice_case
  query: opened_atBETWEENjavascript:gs.daysAgoStart(14)@javascript:gs.daysAgoEnd(7)
  fields: category,subcategory,product,priority,contact_type,state
  limit: 500
```

**Using REST API:**
```bash
GET /api/now/stats/sn_customerservice_case?sysparm_query=opened_atONLast 7 days@javascript:gs.beginningOfLast7Days()@javascript:gs.endOfLast7Days()&sysparm_group_by=category&sysparm_count=true

GET /api/now/stats/sn_customerservice_case?sysparm_query=opened_atBETWEENjavascript:gs.daysAgoStart(14)@javascript:gs.daysAgoEnd(7)&sysparm_group_by=category&sysparm_count=true
```

### Step 2: Detect Category Volume Spikes

Use a background script to compute percentage changes and flag anomalies.

**Using MCP:**
```
Tool: SN-Execute-Background-Script
Parameters:
  description: Calculate category volume changes between current and previous week
  script: |
    var categories = {};
    var currentWeek = new GlideAggregate('sn_customerservice_case');
    currentWeek.addQuery('opened_at', '>=', gs.daysAgoStart(7));
    currentWeek.addAggregate('COUNT');
    currentWeek.groupBy('category');
    currentWeek.query();
    while (currentWeek.next()) {
      var cat = currentWeek.category.getDisplayValue() || 'Uncategorized';
      categories[cat] = categories[cat] || { current: 0, previous: 0 };
      categories[cat].current = parseInt(currentWeek.getAggregate('COUNT'));
    }

    var prevWeek = new GlideAggregate('sn_customerservice_case');
    prevWeek.addQuery('opened_at', '>=', gs.daysAgoStart(14));
    prevWeek.addQuery('opened_at', '<', gs.daysAgoStart(7));
    prevWeek.addAggregate('COUNT');
    prevWeek.groupBy('category');
    prevWeek.query();
    while (prevWeek.next()) {
      var cat2 = prevWeek.category.getDisplayValue() || 'Uncategorized';
      categories[cat2] = categories[cat2] || { current: 0, previous: 0 };
      categories[cat2].previous = parseInt(prevWeek.getAggregate('COUNT'));
    }

    var results = [];
    for (var c in categories) {
      var pctChange = categories[c].previous > 0
        ? Math.round(((categories[c].current - categories[c].previous) / categories[c].previous) * 100)
        : (categories[c].current > 0 ? 100 : 0);
      results.push(c + ': ' + categories[c].current + ' (was ' + categories[c].previous + ', ' + pctChange + '% change)');
    }
    gs.info('Category Trends:\n' + results.join('\n'));
```

**Using REST API:**
```bash
GET /api/now/stats/sn_customerservice_case?sysparm_query=opened_atONLast 7 days@javascript:gs.beginningOfLast7Days()@javascript:gs.endOfLast7Days()&sysparm_group_by=category,subcategory&sysparm_count=true&sysparm_display_value=true
```

### Step 3: Analyze Channel Distribution per Topic

Determine which channels customers are using for trending topics to optimize staffing.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_customerservice_case
  query: opened_atONLast 7 days@javascript:gs.beginningOfLast7Days()@javascript:gs.endOfLast7Days()^category=[trending_category]
  fields: contact_type,priority,state
  limit: 200
```

```
Tool: SN-Query-Table
Parameters:
  table_name: interaction
  query: opened_atONLast 7 days@javascript:gs.beginningOfLast7Days()@javascript:gs.endOfLast7Days()
  fields: channel,state,parent,opened_at
  limit: 200
```

**Using REST API:**
```bash
GET /api/now/stats/sn_customerservice_case?sysparm_query=opened_atONLast 7 days@javascript:gs.beginningOfLast7Days()@javascript:gs.endOfLast7Days()^category=[trending_category]&sysparm_group_by=contact_type&sysparm_count=true&sysparm_display_value=true
```

### Step 4: Identify Product-Specific Trends

Break down trending topics by product to identify product-level issues.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_customerservice_case
  query: opened_atONLast 7 days@javascript:gs.beginningOfLast7Days()@javascript:gs.endOfLast7Days()^productISNOTEMPTY
  fields: product,category,subcategory,priority,state
  limit: 300
```

**Using REST API:**
```bash
GET /api/now/stats/sn_customerservice_case?sysparm_query=opened_atONLast 7 days@javascript:gs.beginningOfLast7Days()@javascript:gs.endOfLast7Days()^productISNOTEMPTY&sysparm_group_by=product,category&sysparm_count=true&sysparm_display_value=true
```

### Step 5: Analyze Priority Distribution for Trending Topics

Assess severity patterns to understand business impact of trending issues.

**Using MCP:**
```
Tool: SN-Execute-Background-Script
Parameters:
  description: Analyze priority distribution for top trending categories
  script: |
    var trendingCategories = ['Portal Access', 'Billing', 'Performance'];
    var results = [];

    trendingCategories.forEach(function(cat) {
      var ga = new GlideAggregate('sn_customerservice_case');
      ga.addQuery('opened_at', '>=', gs.daysAgoStart(7));
      ga.addQuery('category', cat);
      ga.addAggregate('COUNT');
      ga.groupBy('priority');
      ga.query();

      var priorities = {};
      while (ga.next()) {
        priorities[ga.priority.getDisplayValue()] = parseInt(ga.getAggregate('COUNT'));
      }
      results.push(cat + ': ' + JSON.stringify(priorities));
    });

    gs.info('Priority Distribution:\n' + results.join('\n'));
```

**Using REST API:**
```bash
GET /api/now/stats/sn_customerservice_case?sysparm_query=opened_atONLast 7 days@javascript:gs.beginningOfLast7Days()@javascript:gs.endOfLast7Days()^category=[category]&sysparm_group_by=priority&sysparm_count=true&sysparm_display_value=true
```

### Step 6: Assess Account Segment Impact

Determine which customer segments are most affected by trending issues.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_customerservice_case
  query: opened_atONLast 7 days@javascript:gs.beginningOfLast7Days()@javascript:gs.endOfLast7Days()^category=[trending_category]
  fields: account,consumer,priority,state
  limit: 100
```

Cross-reference with account tiers:
```
Tool: SN-Query-Table
Parameters:
  table_name: customer_account
  query: sys_idIN[account_sys_ids_from_cases]
  fields: sys_id,name,customer_tier,industry
  limit: 50
```

**Using REST API:**
```bash
GET /api/now/table/sn_customerservice_case?sysparm_query=opened_atONLast 7 days@javascript:gs.beginningOfLast7Days()@javascript:gs.endOfLast7Days()^category=[trending_category]&sysparm_fields=account,consumer,priority,state&sysparm_limit=100&sysparm_display_value=true
```

### Step 7: Generate the Trending Topics Report

Compile all analysis into an executive-ready report.

```
=== TRENDING TOPICS REPORT ===
Period: Mar 12 - Mar 19, 2026
Generated: Mar 19, 2026

TOP TRENDING TOPICS (by volume change):

1. Portal Access Issues [SPIKE]
   Volume: 87 cases (+145% vs. prev week)
   Priority Mix: P1(5) P2(32) P3(45) P4(5)
   Channel: Chat 45% | Phone 30% | Portal 20% | Email 5%
   Products: Customer Portal v3.2 (78%), Mobile App (22%)
   Segments: Gold accounts 40%, Silver 35%, Bronze 25%
   Insight: Spike correlates with Portal v3.2.1 release on Mar 14
   Action: Coordinate with Engineering on hotfix; draft KB article

2. Billing Discrepancies [RISING]
   Volume: 42 cases (+35% vs. prev week)
   Priority Mix: P2(12) P3(25) P4(5)
   Channel: Phone 55% | Email 30% | Portal 15%
   Products: Billing Module (100%)
   Segments: Gold 60% (disproportionate)
   Insight: Increase concentrated in enterprise accounts post rate change
   Action: Review billing rule changes; proactive outreach to Gold accounts

3. Password Reset Failures [STABLE]
   Volume: 28 cases (-5% vs. prev week)
   Priority Mix: P3(20) P4(8)
   Channel: Chat 60% | Portal 30% | Phone 10%
   Insight: Consistent volume; candidate for self-service automation
   Action: Review Virtual Agent deflection rates

EMERGING SIGNALS:
- "API timeout" mentions up 200% in case descriptions (12 cases)
- 3 Platinum accounts opened P1 cases for same integration error
- Chat channel usage up 15% overall (staffing review recommended)

RECOMMENDATIONS:
1. Deploy hotfix for Portal v3.2.1 session handling
2. Create proactive communication for billing rate change impact
3. Staff additional chat agents for peak hours (10am-2pm)
4. Investigate API timeout cluster for potential infrastructure issue
```

## Tool Usage

### MCP Tools Reference

| Tool | When to Use |
|------|-------------|
| `SN-NL-Search` | Semantic search across case descriptions for emerging keyword patterns |
| `SN-Query-Table` | Structured aggregate queries for volume, channel, and priority analysis |
| `SN-Read-Record` | Deep-dive into specific trending cases for root cause analysis |
| `SN-Execute-Background-Script` | Complex aggregation and statistical calculations across large datasets |

### REST API Reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/now/table/sn_customerservice_case` | GET | Query cases for trend analysis |
| `/api/now/stats/sn_customerservice_case` | GET | Aggregate statistics by category, product, priority |
| `/api/now/table/interaction` | GET | Channel distribution analysis |
| `/api/now/table/csm_consumer` | GET | Consumer segment correlation |
| `/api/now/table/sys_journal_field` | GET | Text mining from case communications |

## Best Practices

- **Establish baselines first:** Always compare against a baseline period (previous week, 30-day rolling average) rather than using absolute numbers
- **Use multiple time windows:** Analyze 7-day, 30-day, and 90-day windows to distinguish spikes from sustained trends
- **Correlate with events:** Cross-reference spikes with known events (releases, outages, billing cycles, seasonal patterns)
- **Segment by account tier:** Prioritize trends affecting premium accounts for proactive outreach
- **Monitor channel shifts:** Channel preference changes may indicate changing customer demographics or issue urgency
- **Set alert thresholds:** Define percentage change thresholds (e.g., >50% increase) for automated alerts
- **Track keyword emergence:** Monitor new keywords appearing in case descriptions that do not match existing categories
- **Report actionably:** Every trend insight should include a recommended action for operations, product, or engineering teams

## Troubleshooting

### "Volume numbers seem too low"

**Cause:** Query time range may not account for timezone differences or the case category taxonomy may have changed.
**Solution:** Verify the time range uses server-side JavaScript functions. Check for recent category renames or merges that may split historical data.

### "Channel distribution does not match interaction data"

**Cause:** The `contact_type` field on cases may differ from the `channel` field on interactions. Cases may be reclassified after creation.
**Solution:** Use interaction records for definitive channel data and case records for initial contact type. Reconcile discrepancies in the report.

### "Emerging keywords generating false positives"

**Cause:** Common words appearing in unrelated contexts.
**Solution:** Use multi-word phrases and bigrams for keyword analysis. Require minimum frequency thresholds (e.g., 5+ occurrences) before flagging.

### "Cannot run aggregate queries on large datasets"

**Cause:** GlideAggregate may time out on very large case tables.
**Solution:** Add date range filters to limit the dataset. Use the REST stats API which is optimized for aggregation. Consider scheduled reports for recurring analysis.

## Examples

### Example 1: Daily Standup Trend Summary

**Scenario:** Manager needs a quick 5-minute trend overview for the morning standup.

```
Tool: SN-Execute-Background-Script
Parameters:
  description: Generate daily trend summary
  script: |
    var ga = new GlideAggregate('sn_customerservice_case');
    ga.addQuery('opened_at', '>=', gs.daysAgoStart(1));
    ga.addAggregate('COUNT');
    ga.groupBy('category');
    ga.orderByAggregate('COUNT', 'DESC');
    ga.query();
    var summary = 'Yesterday Case Volume by Category:\n';
    while (ga.next()) {
      summary += ga.category.getDisplayValue() + ': ' + ga.getAggregate('COUNT') + '\n';
    }
    gs.info(summary);
```

### Example 2: Product-Specific Trend Deep Dive

**Scenario:** Product manager requests trend analysis for a specific product after a release.

```
Tool: SN-Query-Table
Parameters:
  table_name: sn_customerservice_case
  query: product=[product_sys_id]^opened_atONLast 14 days@javascript:gs.beginningOfLast14Days()@javascript:gs.endOfLast14Days()
  fields: category,subcategory,priority,state,opened_at,short_description
  limit: 200
```

### Example 3: Sentiment Shift Detection

**Scenario:** Detect if customer sentiment is deteriorating for a trending topic.

```
Tool: SN-Query-Table
Parameters:
  table_name: sn_customerservice_case
  query: category=[trending_category]^opened_atONLast 7 days@javascript:gs.beginningOfLast7Days()@javascript:gs.endOfLast7Days()^escalation>0
  fields: number,short_description,escalation,priority,consumer,account
  limit: 50
```

Escalation rate increase often correlates with negative sentiment shifts and can serve as a proxy when direct sentiment scores are unavailable.

## Related Skills

- `csm/case-summarization` - Summarize individual cases within trending topics
- `csm/sentiment-analysis` - Detailed sentiment analysis for trend correlation
- `csm/sidebar-summarization` - Agent context for trending issue cases
- `csm/kb-generation` - Generate KB articles for identified trending topics
- `reporting/dashboard-generation` - Visualize trends on operational dashboards
