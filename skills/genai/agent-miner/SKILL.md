---
name: agent-miner
version: 1.0.0
description: Mine agent interactions to find automation opportunities by analyzing repetitive patterns, identifying common resolutions, and discovering handoff points for bot candidates
author: Happy Technologies LLC
tags: [genai, agent-miner, automation, virtual-agent, patterns, analytics, bot-candidates]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp:
    - SN-Query-Table
    - SN-Read-Record
    - SN-NL-Search
    - SN-Get-Table-Schema
  rest:
    - /api/now/table/interaction
    - /api/now/table/sys_cs_conversation
    - /api/now/table/sys_cs_message
    - /api/now/table/incident
    - /api/now/table/sc_req_item
    - /api/now/table/task
    - /api/now/table/sys_user
    - /api/now/table/kb_knowledge
  native:
    - Bash
complexity: advanced
estimated_time: 45-90 minutes
---

# Agent Interaction Mining

## Overview

This skill covers mining agent interactions across ServiceNow to discover automation opportunities. By analyzing conversation logs, incident patterns, request fulfillment data, and resolution workflows, you can identify repetitive tasks ripe for virtual agent deflection or flow automation.

Key capabilities:
- Analyze conversation transcripts from Virtual Agent and live agent sessions
- Identify high-frequency, low-complexity interaction patterns suitable for automation
- Discover common resolution paths and standardize them into bot topics
- Map handoff points between virtual and live agents to optimize escalation flows
- Quantify automation ROI by estimating time savings per pattern
- Generate prioritized automation candidate reports

**When to use:** When planning virtual agent expansion, identifying self-service opportunities, building a business case for automation investment, or optimizing agent workload distribution.

## Prerequisites

- **Roles:** `admin`, `virtual_agent_admin`, or `itil` with reporting access
- **Plugins:** `com.glide.cs.chatbot` (Virtual Agent), `com.glide.interaction` (Agent Workspace)
- **Access:** Read access to `interaction`, `sys_cs_conversation`, `sys_cs_message`, `incident`, `sc_req_item` tables
- **Data:** At least 30 days of interaction history for meaningful pattern analysis
- **Related Skills:** `genai/build-agent` for implementing discovered automation candidates

## Procedure

### Step 1: Gather Interaction Volume Metrics

Retrieve overall interaction volumes to establish baseline and identify high-traffic categories.

**MCP Approach:**
```
Tool: SN-Query-Table
Parameters:
  table_name: interaction
  query: sys_created_on>=javascript:gs.daysAgo(30)^state=closed
  fields: sys_id,number,channel,category,subcategory,assignment_group,assigned_to,opened_at,closed_at,close_code,short_description
  limit: 500
```

**REST Approach:**
```
GET /api/now/table/interaction
  ?sysparm_query=sys_created_on>=javascript:gs.daysAgo(30)^state=closed
  &sysparm_fields=sys_id,number,channel,category,subcategory,assignment_group,assigned_to,opened_at,closed_at,close_code,short_description
  &sysparm_limit=500
  &sysparm_display_value=true
```

### Step 2: Analyze Virtual Agent Conversation Transcripts

Pull conversation messages to identify common intents and user language patterns.

**MCP Approach:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_cs_conversation
  query: sys_created_on>=javascript:gs.daysAgo(30)^state=closed
  fields: sys_id,number,topic,state,live_agent_transfer,user,sys_created_on,channel,resolution_code
  limit: 200
```

Then retrieve messages for high-frequency topics:
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_cs_message
  query: conversation=<conversation_sys_id>^ORDERBYsys_created_on
  fields: sys_id,body,direction,sys_created_on,typed_text
  limit: 50
```

**REST Approach:**
```
GET /api/now/table/sys_cs_conversation
  ?sysparm_query=sys_created_on>=javascript:gs.daysAgo(30)^state=closed
  &sysparm_fields=sys_id,number,topic,state,live_agent_transfer,user,sys_created_on,channel,resolution_code
  &sysparm_limit=200
  &sysparm_display_value=true
```

### Step 3: Identify Repetitive Incident Patterns

Query incidents to find high-frequency, short-resolution-time categories that indicate automatable tasks.

**MCP Approach:**
```
Tool: SN-Query-Table
Parameters:
  table_name: incident
  query: sys_created_on>=javascript:gs.daysAgo(30)^state=6^resolved_at!=NULL
  fields: sys_id,number,category,subcategory,short_description,close_notes,resolution_code,assignment_group,calendar_duration,contact_type,reassignment_count
  limit: 500
```

**REST Approach:**
```
GET /api/now/table/incident
  ?sysparm_query=sys_created_on>=javascript:gs.daysAgo(30)^state=6^resolved_at!=NULL
  &sysparm_fields=sys_id,number,category,subcategory,short_description,close_notes,resolution_code,assignment_group,calendar_duration,contact_type,reassignment_count
  &sysparm_limit=500
  &sysparm_display_value=true
```

### Step 4: Analyze Service Request Fulfillment Patterns

Identify catalog items with high volume and simple fulfillment workflows.

**MCP Approach:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sc_req_item
  query: sys_created_on>=javascript:gs.daysAgo(30)^stage=closed_complete
  fields: sys_id,number,cat_item,short_description,state,assignment_group,calendar_duration,approval,sys_created_on,closed_at
  limit: 500
```

**REST Approach:**
```
GET /api/now/table/sc_req_item
  ?sysparm_query=sys_created_on>=javascript:gs.daysAgo(30)^stage=closed_complete
  &sysparm_fields=sys_id,number,cat_item,short_description,state,assignment_group,calendar_duration,approval,sys_created_on,closed_at
  &sysparm_limit=500
  &sysparm_display_value=true
```

### Step 5: Map Agent Handoff Points

Identify where virtual agent conversations escalate to live agents and why.

**MCP Approach:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_cs_conversation
  query: live_agent_transfer=true^sys_created_on>=javascript:gs.daysAgo(30)
  fields: sys_id,number,topic,live_agent_transfer,transfer_reason,user,sys_created_on
  limit: 200
```

**REST Approach:**
```
GET /api/now/table/sys_cs_conversation
  ?sysparm_query=live_agent_transfer=true^sys_created_on>=javascript:gs.daysAgo(30)
  &sysparm_fields=sys_id,number,topic,live_agent_transfer,transfer_reason,user,sys_created_on
  &sysparm_limit=200
  &sysparm_display_value=true
```

### Step 6: Check Existing Knowledge Coverage

Determine whether knowledge articles exist for the top interaction patterns.

**MCP Approach:**
```
Tool: SN-Query-Table
Parameters:
  table_name: kb_knowledge
  query: workflow_state=published^active=true
  fields: sys_id,number,short_description,topic,category,sys_view_count,sys_updated_on
  limit: 100
```

**REST Approach:**
```
GET /api/now/table/kb_knowledge
  ?sysparm_query=workflow_state=published^active=true
  &sysparm_fields=sys_id,number,short_description,topic,category,sys_view_count,sys_updated_on
  &sysparm_limit=100
  &sysparm_display_value=true
```

### Step 7: Score and Prioritize Automation Candidates

Compile findings into a scored ranking using these criteria:

| Criterion | Weight | Scoring |
|-----------|--------|---------|
| Interaction volume | 30% | High (>50/month)=3, Medium (20-50)=2, Low (<20)=1 |
| Resolution complexity | 25% | Simple (1-step)=3, Moderate (2-3 steps)=2, Complex (4+)=1 |
| Current resolution time | 20% | >30 min=3, 15-30 min=2, <15 min=1 |
| Knowledge availability | 15% | KB exists=3, Partial=2, None=1 |
| Handoff frequency | 10% | Low handoffs=3, Moderate=2, High=1 |

### Step 8: Generate Automation Opportunity Report

Assemble the final report:

```
=== AGENT MINING REPORT ===
Period: [start_date] - [end_date]
Total Interactions Analyzed: [count]
Total Unique Patterns: [count]

TOP AUTOMATION CANDIDATES:
| Rank | Pattern | Volume | Avg Resolution | Score | Est. Savings |
|------|---------|--------|----------------|-------|--------------|
| 1 | Password reset | 245/mo | 8 min | 9.2 | 32 hrs/mo |
| 2 | VPN access request | 180/mo | 12 min | 8.7 | 36 hrs/mo |
| 3 | Software install | 150/mo | 15 min | 8.1 | 37 hrs/mo |

HANDOFF ANALYSIS:
- VA-to-Live transfer rate: [percentage]
- Top transfer reasons: [list]
- Recommended topic improvements: [list]

KNOWLEDGE GAPS:
- Patterns without KB articles: [list]
- Articles needing update: [list]

ESTIMATED ROI:
- Total automatable hours/month: [hours]
- Cost savings estimate: [amount]
- Implementation complexity: [low/medium/high]
```

## Tool Usage

| Tool | Purpose | When to Use |
|------|---------|-------------|
| SN-Query-Table | Bulk query interactions, incidents, requests | Pattern discovery across tables |
| SN-Read-Record | Read individual conversation or incident details | Deep-dive on specific patterns |
| SN-NL-Search | Natural language search for related patterns | Finding similar interactions |
| SN-Get-Table-Schema | Discover available fields on interaction tables | Initial exploration |

## Best Practices

1. **Analyze at least 30 days of data** to capture seasonal and cyclical patterns
2. **Normalize short descriptions** before grouping -- variations in wording mask true volumes
3. **Exclude outliers** such as mass-created incidents from major outages
4. **Weight recency** -- patterns trending upward are higher priority than declining ones
5. **Consider user satisfaction** -- automate pain points with low CSAT scores first
6. **Validate with agents** -- confirm findings with frontline staff who handle these interactions daily
7. **Start with quick wins** -- target high-volume, low-complexity patterns for initial automation
8. **Track deflection rates** post-implementation to measure actual ROI
9. **Revisit quarterly** -- interaction patterns shift as services and user bases change
10. **Protect sensitive data** -- redact PII from conversation transcripts before analysis

## Troubleshooting

| Issue | Cause | Resolution |
|-------|-------|------------|
| Low interaction count returned | Query date range too narrow or channel filter missing | Expand date range; remove channel filter to include all sources |
| Conversations missing messages | Message retention policy purged old data | Check `sys_cs_message` retention rules; use archived data if available |
| Categories all showing as "Other" | Incident categorization not enforced | Analyze short_description text instead; consider NLP clustering |
| Handoff reasons blank | Transfer reason field not configured in VA topics | Review VA topic configurations; check `transfer_reason` field population |
| Resolution times seem inflated | Includes wait time, not just handle time | Filter by `calendar_duration` vs `business_duration`; check SLA definitions |
| Duplicate patterns in results | Same issue categorized differently by different agents | Normalize by short_description similarity; group by resolution_code |

## Examples

### Example 1: Password Reset Automation Discovery

**Scenario:** Identify all password-reset-related interactions for bot automation.

```
Tool: SN-Query-Table
Parameters:
  table_name: incident
  query: sys_created_on>=javascript:gs.daysAgo(30)^short_descriptionLIKEpassword^state=6
  fields: number,short_description,category,subcategory,calendar_duration,assignment_group,resolution_code
  limit: 100
```

**Finding:** 245 password reset incidents/month, average resolution 8 minutes, 95% resolved with standard procedure. Recommended action: implement VA topic with LDAP integration for self-service password reset.

### Example 2: Software Request Pattern Analysis

**Scenario:** Analyze software installation requests to identify top candidates for catalog automation.

```
Tool: SN-Query-Table
Parameters:
  table_name: sc_req_item
  query: sys_created_on>=javascript:gs.daysAgo(30)^cat_item.categoryLIKEsoftware^stage=closed_complete
  fields: number,cat_item,short_description,calendar_duration,approval
  limit: 200
```

**Finding:** Top 5 software requests account for 60% of all software RITMs. All have standard approval and deployment processes suitable for SCCM/Intune automated fulfillment.

## Related Skills

- `genai/build-agent` - Build custom AI agents from discovered patterns
- `genai/flow-generation` - Generate automation flows for identified candidates
- `genai/playbook-generation` - Create playbooks for agent-assisted automation
- `knowledge/gap-analysis` - Identify knowledge gaps aligned with interaction patterns
- `reporting/trend-analysis` - Trend analysis for interaction volume forecasting
