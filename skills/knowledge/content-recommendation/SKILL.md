---
name: content-recommendation
version: 1.0.0
description: Recommend relevant knowledge articles based on incident or case context by matching keywords, categories, and historical resolution patterns to surface the most useful articles
author: Happy Technologies LLC
tags: [knowledge, recommendation, incident, case, search, matching, knowledge-management]
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
    - /api/now/table/incident
    - /api/now/table/sn_customerservice_case
    - /api/now/table/kb_use
    - /api/now/table/kb_feedback
    - /api/now/table/m2m_kb_task
  native:
    - Bash
complexity: intermediate
estimated_time: 10-20 minutes
---

# Knowledge Content Recommendation

## Overview

This skill provides a structured approach to recommending relevant knowledge articles for active incidents, cases, or user queries in ServiceNow. Effective knowledge recommendation reduces resolution times, improves first-call resolution rates, and increases self-service adoption.

This skill helps you:

- Extract keywords and context from incident or case descriptions to build targeted searches
- Query knowledge bases using category matching, keyword overlap, and natural language search
- Rank candidate articles by relevance using view counts, ratings, recency, and historical resolution patterns
- Identify articles previously used to resolve similar incidents
- Attach recommended articles to incident or case records with contextual notes

**When to use:** When triaging or working an incident/case, when a user asks for help on a topic, or when building automated recommendation workflows.

## Prerequisites

- **Roles:** `itil`, `sn_customerservice_agent`, or `knowledge` role for read access
- **Access:** Read access to `kb_knowledge`, `incident`, `sn_customerservice_case`, `m2m_kb_task`, `kb_use`, and `kb_feedback` tables
- **Plugin:** `com.glideapp.knowledge` (Knowledge Management) activated
- **Knowledge:** Familiarity with your organization's knowledge base structure, categories, and tagging conventions

## Procedure

### Step 1: Extract Context from the Incident or Case

Retrieve the incident or case details to understand the problem context.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: incident
  query: number=INC0012345
  fields: sys_id,number,short_description,description,category,subcategory,cmdb_ci,assignment_group,impact,urgency,close_notes
  limit: 1
```

**Using REST API:**
```bash
GET /api/now/table/incident?sysparm_query=number=INC0012345&sysparm_fields=sys_id,number,short_description,description,category,subcategory,cmdb_ci,assignment_group,impact,urgency,close_notes&sysparm_limit=1
```

For CSM cases:

```
Tool: SN-Query-Table
Parameters:
  table_name: sn_customerservice_case
  query: number=CS0045678
  fields: sys_id,number,short_description,description,product,category,account,contact,priority
  limit: 1
```

### Step 2: Search Knowledge by Category Match

Use the incident's category and subcategory to find articles in the same knowledge domain.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: kb_knowledge
  query: workflow_state=published^kb_category.label=Network^active=true
  fields: sys_id,number,short_description,kb_knowledge_base,kb_category,sys_view_count,rating,sys_updated_on,author
  limit: 15
```

**Using REST API:**
```bash
GET /api/now/table/kb_knowledge?sysparm_query=workflow_state=published^kb_category.label=Network^active=true&sysparm_fields=sys_id,number,short_description,kb_knowledge_base,kb_category,sys_view_count,rating,sys_updated_on,author&sysparm_limit=15
```

### Step 3: Search Knowledge by Keyword Matching

Extract key terms from the incident short description and description, then search for articles containing those terms.

**Using MCP:**
```
Tool: SN-NL-Search
Parameters:
  table_name: kb_knowledge
  query: "published articles about VPN connection timeout error when connecting to corporate network"
  fields: sys_id,number,short_description,text,kb_knowledge_base,kb_category,sys_view_count,rating
  limit: 15
```

**Using REST API:**
```bash
GET /api/now/table/kb_knowledge?sysparm_query=workflow_state=published^short_descriptionLIKEvpn^ORtextLIKEvpn^short_descriptionLIKEtimeout^ORtextLIKEtimeout^short_descriptionLIKEconnection^ORtextLIKEconnection&sysparm_fields=sys_id,number,short_description,kb_knowledge_base,kb_category,sys_view_count,rating&sysparm_limit=15
```

### Step 4: Find Articles Used to Resolve Similar Incidents

Query the many-to-many relationship table to find articles that were linked to previously resolved incidents with matching categories.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: m2m_kb_task
  query: task.category=network^task.subcategory=vpn^task.state=6
  fields: kb_knowledge,kb_knowledge.number,kb_knowledge.short_description,task,task.number,task.short_description
  limit: 20
```

**Using REST API:**
```bash
GET /api/now/table/m2m_kb_task?sysparm_query=task.category=network^task.subcategory=vpn^task.state=6&sysparm_fields=kb_knowledge,kb_knowledge.number,kb_knowledge.short_description,task,task.number,task.short_description&sysparm_limit=20
```

### Step 5: Check Article Quality Signals

For the candidate articles found in Steps 2-4, evaluate quality using usage metrics and feedback.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: kb_use
  query: article.numberINKB0010100,KB0010200,KB0010300
  fields: article,article.number,viewed,useful,not_useful
  limit: 20
```

**Using REST API:**
```bash
GET /api/now/table/kb_use?sysparm_query=article.numberINKB0010100,KB0010200,KB0010300&sysparm_fields=article,article.number,viewed,useful,not_useful&sysparm_limit=20
```

Check for recent negative feedback:

```
Tool: SN-Query-Table
Parameters:
  table_name: kb_feedback
  query: article.numberINKB0010100,KB0010200,KB0010300^sys_created_on>=javascript:gs.daysAgoStart(90)
  fields: article,article.number,rating,comments,sys_created_on
  limit: 20
```

### Step 6: Rank and Select Top Recommendations

Apply a relevance scoring model to rank candidate articles:

**Ranking Criteria:**

| Factor | Weight | Description |
|--------|--------|-------------|
| Category match | 25% | Article category matches incident category |
| Keyword overlap | 30% | Number of matching keywords in title and body |
| Historical resolution | 20% | Article was used to resolve similar past incidents |
| Article rating | 10% | Average user rating (higher is better) |
| Recency | 10% | More recently updated articles score higher |
| View count | 5% | Higher view count indicates general usefulness |

**Scoring guidelines:**
- Articles matching 3+ criteria are "strong recommendations"
- Articles matching 2 criteria are "possible recommendations"
- Articles with negative feedback in the past 90 days should be flagged with a caveat

### Step 7: Attach Recommended Articles to the Incident

Link the top-ranked article to the incident and document the recommendation.

**Using MCP:**
```
Tool: SN-Update-Record
Parameters:
  table_name: incident
  sys_id: [incident_sys_id]
  data:
    kb_knowledge: [recommended_article_sys_id]
    work_notes: "Knowledge Recommendation: Attached KB0010100 'VPN Connection Timeout Troubleshooting' based on category match (Network/VPN), keyword overlap (vpn, timeout, connection), and historical resolution of 12 similar incidents."
```

**Using REST API:**
```bash
PATCH /api/now/table/incident/{sys_id}
Content-Type: application/json

{
  "kb_knowledge": "[recommended_article_sys_id]",
  "work_notes": "Knowledge Recommendation: Attached KB0010100..."
}
```

### Step 8: Document Multiple Recommendations

When several articles are relevant, add work notes listing all recommendations with rationale.

**Using MCP:**
```
Tool: SN-Add-Work-Notes
Parameters:
  sys_id: [incident_sys_id]
  work_notes: |
    === KNOWLEDGE RECOMMENDATIONS ===
    Based on: INC0012345 "VPN connection timeout when connecting remotely"

    1. KB0010100 - "VPN Connection Timeout Troubleshooting" (Score: 4.5/5)
       - Category match: Network/VPN
       - Used in 12 similar resolved incidents
       - Rating: 4.2/5, 890 views
       - RECOMMENDED: Primary article

    2. KB0010200 - "Corporate Network Access Guide" (Score: 3.2/5)
       - Keyword match: "corporate network", "connection"
       - Rating: 3.8/5, 456 views
       - SUPPLEMENTARY: General reference

    3. KB0010300 - "VPN Client Installation" (Score: 2.1/5)
       - Partial category match
       - May be relevant if client reinstallation needed
       - SITUATIONAL: Only if client is corrupt
```

## Tool Usage

### MCP Tools Reference

| Tool | When to Use |
|------|-------------|
| `SN-Query-Table` | Structured queries for incidents, articles, usage data |
| `SN-NL-Search` | Natural language search for topic-based article discovery |
| `SN-Update-Record` | Attach recommended articles to incidents/cases |
| `SN-Add-Work-Notes` | Document recommendation rationale |

### REST API Reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/now/table/incident` | GET | Retrieve incident context |
| `/api/now/table/kb_knowledge` | GET | Search knowledge articles |
| `/api/now/table/m2m_kb_task` | GET | Find articles linked to past incidents |
| `/api/now/table/kb_use` | GET | Check article usage metrics |
| `/api/now/table/kb_feedback` | GET | Review article feedback quality |
| `/api/now/table/incident/{sys_id}` | PATCH | Attach article to incident |

## Best Practices

- **Extract Multiple Keywords:** Pull at least 3-5 meaningful keywords from the incident description; avoid stop words and generic terms
- **Search Broadly, Then Filter:** Start with natural language search for broad coverage, then filter by category and quality signals
- **Prefer Proven Articles:** Articles linked to previously resolved incidents carry more weight than untested articles
- **Check Recency:** Deprioritize articles not updated in over 12 months, as procedures may have changed
- **Flag Quality Issues:** If the best-matching article has negative feedback, note this and consider recommending it with caveats
- **Consider Audience:** Match article audience (IT staff vs. end user) to the context; self-service requests need user-facing articles
- **Track Recommendation Outcomes:** Follow up to see if recommended articles led to resolution; this feedback improves future recommendations

## Troubleshooting

### "No articles found for the incident category"

**Cause:** Knowledge base does not have articles for this topic, or category labels differ between incident and KB
**Solution:** Broaden the search using keyword matching instead of strict category filters. This may also indicate a knowledge gap -- see the `gap-analysis` skill

### "Too many candidate articles returned"

**Cause:** Generic keywords matching a broad set of articles
**Solution:** Add more specific keywords, filter by knowledge base, or narrow by CI/service. Combine category and keyword filters with AND logic

### "Historical resolution data is sparse"

**Cause:** Agents are not linking KB articles to incidents upon resolution
**Solution:** Focus on keyword and category matching instead. Consider promoting KCS practices to improve future data

### "Article ratings are all zero"

**Cause:** Feedback collection is not enabled or users are not rating articles
**Solution:** Check the `glide.knowman.show_feedback` property. Use view count as an alternative quality signal

## Examples

### Example 1: VPN Connectivity Incident

**Incident:** INC0012345 - "Cannot connect to VPN - timeout error after 30 seconds"

**Context extracted:**
- Category: Network, Subcategory: VPN
- Keywords: VPN, connect, timeout, error
- CI: Cisco AnyConnect VPN

**Search results:**
1. KB0010100 - "VPN Connection Timeout Troubleshooting" (category match + keyword match + 12 historical resolutions)
2. KB0010200 - "Cisco AnyConnect Configuration Guide" (CI match + keyword match)
3. KB0010450 - "Remote Access FAQ" (partial keyword match)

**Recommendation:** KB0010100 as primary, KB0010200 as supplementary

### Example 2: Customer Service Case

**Case:** CS0045678 - "Product license key not activating after purchase"

**Context extracted:**
- Product: Enterprise Suite
- Category: Licensing
- Keywords: license, key, activate, purchase

**Search results:**
1. KB0030100 - "License Activation Troubleshooting" (category + keyword + 8 case resolutions)
2. KB0030150 - "Enterprise Suite License Types" (product + keyword)
3. KB0030200 - "How to Request a Replacement License Key" (keyword match)

**Recommendation:** KB0030100 as primary. If the key is invalid rather than not activating, also suggest KB0030200.

## Related Skills

- `knowledge/gap-analysis` - Identify topics with no matching articles
- `knowledge/duplicate-detection` - Clean up duplicate articles that confuse recommendations
- `knowledge/article-generation` - Generate new articles when no relevant content exists
- `knowledge/gap-grouping` - Group missing content areas for bulk article creation
