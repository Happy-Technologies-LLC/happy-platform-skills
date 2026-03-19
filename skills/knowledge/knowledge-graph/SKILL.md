---
name: knowledge-graph
version: 1.0.0
description: Build and navigate knowledge graphs showing article relationships, topic hierarchies, cross-reference maps, content dependency analysis, and knowledge domain coverage visualization
author: Happy Technologies LLC
tags: [knowledge, knowledge-graph, relationships, topic-hierarchy, cross-references, dependencies, content-analysis, visualization]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp:
    - SN-Query-Table
    - SN-Get-Record
    - SN-Create-Record
    - SN-Update-Record
    - SN-NL-Search
  rest:
    - /api/now/table/kb_knowledge
    - /api/now/table/kb_knowledge_base
    - /api/now/table/kb_category
    - /api/now/table/m2m_kb_to_kb
    - /api/now/table/kb_use
    - /api/now/table/kb_feedback
    - /api/now/table/sys_tag
    - /api/now/table/label_entry
    - /api/now/table/incident
  native:
    - Bash
complexity: advanced
estimated_time: 30-60 minutes
---

# Knowledge Graph Construction and Navigation

## Overview

This skill covers building and navigating knowledge graphs within ServiceNow Knowledge Management:

- Mapping article-to-article relationships (prerequisites, related, supersedes, depends-on)
- Building topic hierarchies from category structures and content analysis
- Creating cross-reference maps that surface hidden connections between articles
- Analyzing content dependencies to understand knowledge flow and gaps
- Identifying orphaned articles with no inbound or outbound connections
- Visualizing knowledge domain coverage and density
- Using graph traversal to recommend related content and learning paths

**When to use:** When knowledge managers need to understand the structure and interconnections of their knowledge base, when building guided learning paths, when identifying knowledge silos, or when improving article discoverability through relationship enrichment.

## Prerequisites

- **Roles:** `knowledge_manager`, `knowledge_admin`, or `admin`
- **Plugins:** `com.glideapp.knowledge` (Knowledge Management)
- **Access:** Read/write access to `kb_knowledge`, `kb_category`, `m2m_kb_to_kb`, `label_entry`
- **Knowledge:** Graph concepts (nodes, edges, traversal), knowledge management taxonomy principles
- **Related Skills:** `knowledge/gap-analysis` for coverage assessment, `knowledge/content-recommendation` for graph-based recommendations

## Procedure

### Step 1: Map the Category Hierarchy (Topic Tree)

Retrieve the full category structure to establish the topic hierarchy backbone.

**MCP Approach:**
```
Tool: SN-Query-Table
Parameters:
  table_name: kb_category
  query: active=true^ORDERBYparent,order
  fields: sys_id,label,parent_id,parent_table,full_category,active,kb_knowledge_base
  limit: 500
```

**REST Approach:**
```
GET /api/now/table/kb_category
  ?sysparm_query=active=true^ORDERBYparent_id,order
  &sysparm_fields=sys_id,label,parent_id,full_category,active,kb_knowledge_base
  &sysparm_display_value=true
  &sysparm_limit=500
```

Build the hierarchy tree:
```
Knowledge Base: IT Support
  +-- Hardware
  |   +-- Laptops
  |   |   +-- Setup & Configuration
  |   |   +-- Troubleshooting
  |   +-- Printers
  |   +-- Mobile Devices
  +-- Software
  |   +-- Operating Systems
  |   +-- Business Applications
  |   +-- Development Tools
  +-- Network
      +-- VPN & Remote Access
      +-- WiFi
      +-- Email & Calendar
```

### Step 2: Retrieve Existing Article Relationships

Fetch the many-to-many relationship records between articles.

**MCP Approach:**
```
Tool: SN-Query-Table
Parameters:
  table_name: m2m_kb_to_kb
  query: from_kb.workflow_state=published
  fields: sys_id,from_kb,to_kb,relationship_type
  limit: 1000
```

**REST Approach:**
```
GET /api/now/table/m2m_kb_to_kb
  ?sysparm_query=from_kb.workflow_state=published
  &sysparm_fields=sys_id,from_kb,to_kb,relationship_type
  &sysparm_display_value=true
  &sysparm_limit=1000
```

### Step 3: Discover Implicit Relationships from Content

Find hidden connections by analyzing article content for cross-references.

**Approach 1 -- Inline links:**

**MCP Approach:**
```
Tool: SN-Query-Table
Parameters:
  table_name: kb_knowledge
  query: workflow_state=published^textLIKEKB00
  fields: sys_id,number,short_description,text
  limit: 200
```

Parse the `text` field for patterns like `KB001XXXX` to extract referenced article numbers.

**Approach 2 -- Shared tags and labels:**
```
Tool: SN-Query-Table
Parameters:
  table_name: label_entry
  query: table=kb_knowledge
  fields: sys_id,id_display,label,table,id
  limit: 500
```

Group articles by shared labels to identify topic clusters:
```
Label: "vpn" -> KB0012001, KB0012345, KB0012290, KB0012310
Label: "remote-access" -> KB0012001, KB0012189, KB0012290, KB0012310
Label: "security" -> KB0012310, KB0013001, KB0013045
```

**Approach 3 -- Co-occurrence in incident resolution:**
```
Tool: SN-Query-Table
Parameters:
  table_name: incident
  query: u_knowledge_articleISNOTEMPTY^resolved_at>javascript:gs.daysAgo(90)
  fields: u_knowledge_article,category,subcategory
  limit: 500
```

Articles frequently used to resolve the same incident category are implicitly related.

### Step 4: Build the Knowledge Graph Data Structure

Represent the graph as nodes (articles) and edges (relationships):

```
=== KNOWLEDGE GRAPH STRUCTURE ===

Nodes (Articles): 342 published articles
Edges (Relationships): 567 connections

Node Properties:
- sys_id, number, title, category, knowledge_base
- view_count, rating, age_days, word_count
- in_degree (articles pointing to this), out_degree (articles this points to)

Edge Types:
- RELATED_TO: General topical relationship (312 edges)
- PREREQUISITE: Must read A before B (45 edges)
- SUPERSEDES: Article A replaces article B (28 edges)
- DEPENDS_ON: Article A references procedures in B (89 edges)
- SAME_TOPIC: Articles in the same category (93 edges)

Graph Metrics:
- Average degree: 3.3 connections per article
- Density: 0.0097 (sparse - room for enrichment)
- Connected components: 23 (ideally should be 1-3)
- Orphaned articles: 47 (no connections at all)
```

### Step 5: Identify Orphaned and Weakly Connected Articles

Find articles with no or minimal connections.

**MCP Approach:**
```
Tool: SN-Query-Table
Parameters:
  table_name: kb_knowledge
  query: workflow_state=published^sys_idNOT IN<list_of_connected_article_ids>
  fields: sys_id,number,short_description,kb_category,sys_view_count,rating,sys_created_on
  limit: 100
```

```
=== ORPHANED ARTICLES ===
Articles with zero connections: 47

High-Impact Orphans (>100 views, still unlinked):
| Article    | Title                           | Views | Category        |
|------------|---------------------------------|-------|-----------------|
| KB0014523  | Outlook Calendar Sync Issues    | 890   | Email           |
| KB0014601  | Docker Container Best Practices | 456   | Dev Tools       |
| KB0014789  | Expense Report Submission Guide | 1,234 | Finance         |

Recommended Actions:
1. KB0014523 -> Link to KB0012290 (shares email/remote topic)
2. KB0014601 -> Link to KB0013201 (development environment setup)
3. KB0014789 -> Create new "Finance" topic cluster
```

### Step 6: Create Missing Relationships

Add discovered relationships to the knowledge graph.

**MCP Approach:**
```
Tool: SN-Create-Record
Parameters:
  table_name: m2m_kb_to_kb
  data:
    from_kb: "<article_a_sys_id>"
    to_kb: "<article_b_sys_id>"
    relationship_type: "related"
```

**REST Approach:**
```
POST /api/now/table/m2m_kb_to_kb
Body: {
  "from_kb": "<article_a_sys_id>",
  "to_kb": "<article_b_sys_id>",
  "relationship_type": "related"
}
```

### Step 7: Analyze Topic Density and Coverage

Evaluate how well different topics are covered:

```
=== TOPIC COVERAGE ANALYSIS ===

| Topic Area          | Articles | Avg Rating | Avg Views | Gaps Identified |
|---------------------|----------|------------|-----------|-----------------|
| VPN & Remote Access | 12       | 4.1        | 1,450     | Mobile VPN setup |
| Email & Calendar    | 8        | 3.8        | 980       | Shared mailbox config |
| Laptop Setup        | 15       | 4.3        | 2,100     | Linux support |
| Printer Setup       | 6        | 3.2        | 560       | Wireless printing |
| Software Install    | 22       | 3.9        | 1,800     | License requests |
| Security Policies   | 5        | 4.0        | 780       | BYOD policies |

Under-served Topics (high incident volume, low article count):
1. Password Reset - 450 incidents/month, only 2 articles
2. MFA Setup - 280 incidents/month, only 1 article
3. File Sharing - 190 incidents/month, only 3 articles
```

### Step 8: Build Learning Paths from Graph Traversal

Create ordered reading sequences using prerequisite relationships:

```
=== LEARNING PATH: VPN Administration ===

Level 1 - Foundations:
  1. KB0012001 - VPN Client Installation (prerequisite for all)
  2. KB0012310 - Remote Security Policy (prerequisite for all)

Level 2 - User Support:
  3. KB0012345 - VPN Troubleshooting (depends on KB0012001)
  4. KB0012290 - Network Drive Mapping (depends on KB0012001)

Level 3 - Advanced:
  5. KB0012400 - VPN Split Tunnel Configuration (depends on KB0012345)
  6. KB0012450 - VPN Server Administration (depends on KB0012001, KB0012310)

Estimated Total Reading Time: 45 minutes
Assessment Available: Yes (quiz after Level 2)
```

### Step 9: Generate Graph Visualization Data

Export graph data in a format suitable for visualization tools:

**MCP Approach:**
```
Tool: SN-Query-Table
Parameters:
  table_name: kb_knowledge
  query: workflow_state=published
  fields: sys_id,number,short_description,kb_category,sys_view_count
  limit: 500
```

Output as a node-edge list for visualization:
```json
{
  "nodes": [
    {"id": "KB0012001", "label": "VPN Installation", "group": "Network", "size": 1890},
    {"id": "KB0012345", "label": "VPN Troubleshooting", "group": "Network", "size": 2340}
  ],
  "edges": [
    {"from": "KB0012001", "to": "KB0012345", "type": "prerequisite"},
    {"from": "KB0012345", "to": "KB0012400", "type": "related"}
  ]
}
```

### Step 10: Monitor and Maintain the Graph

Set up ongoing graph health monitoring:

**MCP Approach:**
```
Tool: SN-Query-Table
Parameters:
  table_name: kb_knowledge
  query: workflow_state=published^sys_created_on>javascript:gs.daysAgo(30)
  fields: sys_id,number,short_description,kb_category
  limit: 50
```

For each new article, check if it has been connected to the graph. Flag unconnected new articles for relationship assignment.

## Tool Usage

| Tool | Purpose | When to Use |
|------|---------|-------------|
| SN-Query-Table | Fetch articles, categories, relationships, usage data | Primary data retrieval for graph construction |
| SN-Get-Record | Retrieve single article details for content analysis | Deep-dive into specific nodes |
| SN-Create-Record | Create new relationship records | Adding edges to the graph |
| SN-Update-Record | Update article tags, topics, metadata | Enriching node properties |
| SN-NL-Search | Find semantically related articles | Discovering implicit relationships |

## Best Practices

1. **Start with category hierarchy** -- the topic tree is the backbone of the knowledge graph
2. **Prioritize high-traffic orphans** -- connect popular articles first for maximum impact
3. **Use bidirectional relationships** -- if A relates to B, B should relate to A
4. **Define relationship types clearly** -- distinguish between "related", "prerequisite", and "supersedes"
5. **Review graph health monthly** -- new articles without connections degrade discoverability
6. **Use view co-occurrence data** -- articles viewed in the same session are likely related
7. **Limit relationship depth** -- more than 3 levels of prerequisites creates friction
8. **Tag consistently** -- standardize label vocabulary across the knowledge base
9. **Retire stale edges** -- remove relationships to retired or outdated articles
10. **Validate learning paths** -- test prerequisite chains with actual users before publishing

## Troubleshooting

| Issue | Cause | Resolution |
|-------|-------|------------|
| No m2m records found | Relationships not used in this instance | Check if `m2m_kb_to_kb` table exists; may need custom relationship table |
| Category hierarchy flat | Categories not structured with parent references | Build hierarchy using `parent_id` field on `kb_category` |
| Too many orphaned articles | Relationship management not part of publishing workflow | Add relationship check to article review process |
| Graph too dense | Every article linked to every other | Limit to meaningful relationships; use topic clustering instead |
| Learning path loops | Circular prerequisite chains | Validate graph is a DAG (directed acyclic graph) for prerequisites |
| Performance issues with large queries | Too many articles queried at once | Paginate queries using `sysparm_offset` and process in batches |

## Examples

### Example 1: Knowledge Base Health Report

**Input:** "Analyze the IT Support knowledge base graph and identify disconnected clusters"

**Steps:** Retrieve all published articles and relationships, build adjacency list, run connected component analysis, identify isolated clusters, generate report with recommendations to bridge clusters.

### Example 2: Build a New Hire Learning Path

**Input:** "Create a learning path for new IT support agents covering incident management"

**Steps:** Identify all articles in the Incident Management category, analyze prerequisite relationships, order by dependency depth, generate a sequential learning path with estimated reading times.

### Example 3: Cross-Reference Enrichment

**Input:** "Find and create missing relationships for all VPN-related articles"

**Steps:** Query all articles with "VPN" in title or body, analyze inline references and shared tags, identify articles that reference each other but lack formal relationships, create `m2m_kb_to_kb` records for discovered connections.

## Related Skills

- `knowledge/gap-analysis` - Identify missing knowledge coverage areas
- `knowledge/content-recommendation` - Recommend articles based on graph proximity
- `knowledge/duplicate-detection` - Find redundant articles in the graph
- `knowledge/kb-summarization` - Summarize articles for graph node descriptions
- `knowledge/article-generation` - Create articles to fill identified graph gaps
- `knowledge/gap-grouping` - Group knowledge gaps by topic clusters
