---
name: chat-reply-recommendation
version: 1.0.0
description: Generate recommended chat replies for ITSM agents based on incident context, knowledge base matches, and resolution history
author: Happy Technologies LLC
tags: [itsm, chat, recommendation, virtual-agent, live-agent, incident, knowledge, resolution]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp:
    - SN-Query-Table
    - SN-Get-Record
    - SN-NL-Search
    - SN-Update-Record
    - SN-Add-Work-Notes
    - SN-Execute-Background-Script
  rest:
    - /api/now/table/incident
    - /api/now/table/kb_knowledge
    - /api/now/table/problem
    - /api/now/table/sys_journal_field
    - /api/now/table/interaction
    - /api/now/table/sys_user
  native:
    - Bash
complexity: intermediate
estimated_time: 5-15 minutes
---

# Chat Reply Recommendation

## Overview

This skill provides a structured approach to generating recommended chat replies for ITSM agents handling live support conversations. It covers:

- Analyzing incident context to understand the user's issue and history
- Matching the issue against knowledge base articles for known solutions
- Reviewing resolution history of similar past incidents
- Generating context-aware reply suggestions with appropriate technical detail
- Adapting tone and complexity based on the user's technical proficiency
- Providing escalation and handoff messages when issues exceed agent scope

**When to use:** When live chat agents need assistance formulating accurate, helpful responses during support conversations, particularly for complex technical issues or when quick access to knowledge base content is needed.

**Plugin required:** `com.snc.incident` (Incident Management), optionally `com.glide.interaction` (Agent Workspace)

## Prerequisites

- **Roles:** `itil`, `sn_interaction_read`, or `agent_workspace_user`
- **Access:** Read access to `incident`, `kb_knowledge`, `problem`, `interaction`
- **Knowledge:** Familiarity with common IT support scenarios, knowledge base structure, and chat etiquette
- **Plugins:** `com.snc.incident` must be activated; `com.glide.interaction` recommended for chat context

## Procedure

### Step 1: Retrieve the Active Incident Context

Pull the incident associated with the chat session.

**Using MCP:**
```
Tool: SN-Get-Record
Parameters:
  table_name: incident
  sys_id: [incident_sys_id]
  fields: sys_id,number,short_description,description,state,priority,category,subcategory,assignment_group,assigned_to,caller_id,caller_id.name,caller_id.vip,cmdb_ci,business_service,opened_at,work_notes_list
```

**Using REST API:**
```bash
GET /api/now/table/incident/[incident_sys_id]?sysparm_fields=sys_id,number,short_description,description,state,priority,category,subcategory,assignment_group,assigned_to,caller_id,cmdb_ci,business_service,opened_at&sysparm_display_value=true
```

### Step 2: Review the Chat/Interaction History

Retrieve the conversation thread to understand what has already been discussed.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: interaction
  query: document=incident^document_id=[incident_sys_id]^ORDERBYDESCsys_created_on
  fields: sys_id,type,direction,message,opened_for,assigned_to,state,channel,sys_created_on
  limit: 20
```

**Using REST API:**
```bash
GET /api/now/table/interaction?sysparm_query=document=incident^document_id=[incident_sys_id]^ORDERBYDESCsys_created_on&sysparm_fields=sys_id,type,direction,message,opened_for,assigned_to,state,channel,sys_created_on&sysparm_display_value=true&sysparm_limit=20
```

### Step 3: Search Knowledge Base for Solutions

Find relevant knowledge articles matching the incident description.

**Using MCP:**
```
Tool: SN-NL-Search
Parameters:
  table_name: kb_knowledge
  query: "[keywords from incident short_description and description]"
  fields: sys_id,number,short_description,text,kb_category,workflow_state,rating
  limit: 5
```

**Using REST API:**
```bash
GET /api/now/table/kb_knowledge?sysparm_query=workflow_state=published^short_descriptionLIKE[keyword1]^ORtextLIKE[keyword1]&sysparm_fields=sys_id,number,short_description,text,kb_category&sysparm_display_value=true&sysparm_limit=5
```

### Step 4: Find Similar Resolved Incidents

Look for past incidents with similar descriptions that have been resolved.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: incident
  query: state=6^ORstate=7^short_descriptionLIKE[keyword]^ORcategoryLIKE[category]^ORDERBYDESCresolved_at
  fields: sys_id,number,short_description,close_code,close_notes,resolved_at,category
  limit: 10
```

**Using REST API:**
```bash
GET /api/now/table/incident?sysparm_query=state=6^ORstate=7^short_descriptionLIKE[keyword]^ORDERBYDESCresolved_at&sysparm_fields=sys_id,number,short_description,close_code,close_notes,resolved_at,category&sysparm_display_value=true&sysparm_limit=10
```

### Step 5: Check for Known Problems

Identify if the issue is linked to a known problem with a workaround.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: problem
  query: active=true^known_error=true^short_descriptionLIKE[keyword]
  fields: sys_id,number,short_description,workaround,fix,state,known_error
  limit: 5
```

**Using REST API:**
```bash
GET /api/now/table/problem?sysparm_query=active=true^known_error=true^short_descriptionLIKE[keyword]&sysparm_fields=sys_id,number,short_description,workaround,fix,state,known_error&sysparm_display_value=true&sysparm_limit=5
```

### Step 6: Generate Recommended Chat Replies

Based on the gathered context, generate appropriate reply options.

**Reply Templates by Scenario:**

**Scenario 1: Known Solution Found (KB Match)**
```
Hi [Name], I found a solution that should help with this issue.

Here are the steps:
1. [Step from KB article]
2. [Step from KB article]
3. [Step from KB article]

You can also find detailed instructions in our knowledge base: KB[number] - [Article Title]

Could you try these steps and let me know if the issue is resolved?
```

**Scenario 2: Known Error with Workaround**
```
Hi [Name], this is a known issue that our team is actively working to resolve permanently.

In the meantime, here is a workaround that should get you back up and running:
[Workaround steps]

I have linked your incident to the known problem (PRB[number]) so you will be notified when the permanent fix is deployed.
```

**Scenario 3: Troubleshooting Required**
```
Hi [Name], I would like to help you troubleshoot this issue. Could you provide a few more details?

1. When did this issue first start?
2. Are you seeing any error messages? If so, could you share them?
3. Has anything changed recently (software updates, new hardware, etc.)?

This will help me narrow down the cause and find the right solution for you.
```

**Scenario 4: Escalation Needed**
```
Hi [Name], thank you for your patience. Based on what we have found so far, this issue requires specialized support from our [Team Name] team.

I am going to transfer you to a specialist who can assist further. Here is a summary of what we have covered:
- [Summary point 1]
- [Summary point 2]

Your incident [INC number] will stay open, and the specialist will have all the context from our conversation.
```

**Scenario 5: VIP Caller**
```
Hello [Name], thank you for reaching out. I understand this issue is affecting your work, and I want to make sure we get it resolved as quickly as possible.

I am prioritizing your request and [action being taken]. I will provide you with an update within [timeframe].

Is there anything else I can assist with in the meantime?
```

### Step 7: Document the Interaction

Log the recommended reply and any actions taken.

**Using MCP:**
```
Tool: SN-Add-Work-Notes
Parameters:
  table_name: incident
  sys_id: [incident_sys_id]
  work_notes: |
    === CHAT REPLY RECOMMENDATION ===
    Context: [Brief issue summary]
    KB Match: KB[number] - [Title] (confidence: high/medium/low)
    Similar Incidents: [INC numbers]
    Known Error: [PRB number if applicable]

    Recommended Reply: [Reply type - Solution/Workaround/Troubleshooting/Escalation]
    [Reply text used]
```

## Tool Usage

### MCP Tools Reference

| Tool | When to Use |
|------|-------------|
| `SN-Get-Record` | Retrieve incident and user context |
| `SN-Query-Table` | Search interactions, KB articles, similar incidents, known errors |
| `SN-NL-Search` | Natural language knowledge base search |
| `SN-Update-Record` | Update incident state or assignment during chat |
| `SN-Add-Work-Notes` | Document recommended replies and actions |
| `SN-Execute-Background-Script` | Complex matching logic or bulk recommendation analysis |

### REST API Reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/now/table/incident` | GET | Query incident context |
| `/api/now/table/kb_knowledge` | GET | Search knowledge base |
| `/api/now/table/problem` | GET | Find known errors |
| `/api/now/table/interaction` | GET | Review chat history |
| `/api/now/table/sys_user` | GET | Check caller details and VIP status |

## Best Practices

- **Read Before Replying:** Always review the chat history to avoid asking questions already answered
- **Match Technical Level:** Adjust language complexity based on whether the user is technical or non-technical
- **Provide Options:** When multiple solutions exist, present the simplest first with alternatives
- **Set Expectations:** Always communicate estimated resolution time or next steps
- **Acknowledge VIPs:** Check the caller's VIP flag and adjust priority and tone accordingly
- **Link to KB Articles:** Reference specific KB articles so users can self-serve for future occurrences
- **Confirm Resolution:** Always ask the user to confirm the issue is resolved before closing

## Troubleshooting

### No Knowledge Base Matches

**Cause:** Search terms too specific or KB not populated for this topic
**Solution:** Broaden search terms. Try searching by category instead of exact description. Fall back to similar incident resolution patterns.

### Chat History Not Available

**Cause:** Interaction records not created, or chat happened through a different channel
**Solution:** Check `sys_journal_field` for comments on the incident. Review `sys_email` for email-based communication.

### Recommended Reply Too Technical

**Cause:** Reply generated from technical KB articles without simplification
**Solution:** Check the caller's role and department. Rewrite technical steps in plain language. Offer to walk through steps together.

### Escalation Target Unknown

**Cause:** Assignment group routing not clear for the specific issue type
**Solution:** Query `sys_user_group` for groups matching the incident category. Check the assignment lookup rules or use the standard escalation matrix.

## Examples

### Example 1: Password Reset Chat

```
# 1. Get incident context
Tool: SN-Get-Record
Parameters:
  table_name: incident
  sys_id: [sys_id]
  fields: number,short_description,caller_id.name,category

# 2. Find KB article
Tool: SN-NL-Search
Parameters:
  table_name: kb_knowledge
  query: "password reset self-service"
  fields: number,short_description,text
  limit: 3

# Recommended reply:
# "Hi [Name], I can help you reset your password. You can do this
# yourself anytime by visiting [Self-Service Portal URL] and clicking
# 'Forgot Password'. Would you like me to walk you through it, or
# would you prefer I initiate a reset from my end?"
```

### Example 2: Application Error with Known Problem

```
# 1. Check for known errors
Tool: SN-Query-Table
Parameters:
  table_name: problem
  query: known_error=true^short_descriptionLIKESAP login
  fields: number,short_description,workaround
  limit: 3
```

### Example 3: Bulk Reply Analysis

```
Tool: SN-Execute-Background-Script
Parameters:
  description: Analyze most common chat topics and recommended replies
  script: |
    gs.info('=== CHAT TOPIC ANALYSIS ===');

    var ga = new GlideAggregate('incident');
    ga.addQuery('contact_type', 'chat');
    ga.addQuery('sys_created_on', '>=', gs.daysAgo(30));
    ga.addAggregate('COUNT');
    ga.groupBy('category');
    ga.orderByAggregate('COUNT', 'DESC');
    ga.setLimit(10);
    ga.query();

    while (ga.next()) {
      gs.info('Category: ' + ga.category.getDisplayValue() + ' | Chat Incidents: ' + ga.getAggregate('COUNT'));
    }
```

## Related Skills

- `itsm/email-recommendation` - Email-based response recommendations
- `itsm/incident-triage` - Triage context used for chat routing
- `itsm/kb-generation` - Generate KB articles for chat-recommended solutions
- `itsm/incident-summarization` - Summarize incident for escalation handoff

## References

- [ServiceNow Agent Workspace](https://docs.servicenow.com/bundle/utah-it-service-management/page/product/agent-workspace/concept/agent-workspace.html)
- [Virtual Agent](https://docs.servicenow.com/bundle/utah-now-intelligence/page/administer/virtual-agent/concept/virtual-agent.html)
- [Knowledge Management](https://docs.servicenow.com/bundle/utah-it-service-management/page/product/knowledge-management/concept/c_KnowledgeManagement.html)
