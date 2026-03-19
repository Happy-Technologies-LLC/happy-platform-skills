---
name: build-agent
version: 1.0.0
description: Build custom AI agents for ServiceNow including agent capabilities, knowledge sources, tool access, conversational flows, and guardrails
author: Happy Technologies LLC
tags: [genai, agent, virtual-agent, ai, chatbot, conversational, now-assist, skills]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp:
    - SN-Query-Table
    - SN-Create-Record
    - SN-Update-Record
    - SN-Get-Table-Schema
    - SN-Read-Record
  rest:
    - /api/now/table/sys_cs_topic
    - /api/now/table/sys_cs_topic_goal
    - /api/now/table/sys_cs_intent
    - /api/now/table/sys_cs_message
    - /api/now/table/sys_cs_entity
    - /api/now/table/sys_cb_topic
    - /api/now/table/sys_cb_action
    - /api/now/table/kb_knowledge
    - /api/now/table/sys_hub_flow
  native:
    - Bash
complexity: expert
estimated_time: 60-180 minutes
---

# Build Custom AI Agents

## Overview

This skill provides a comprehensive guide to building custom AI agents in ServiceNow:

- Defining agent capabilities and scope of responsibility
- Configuring knowledge sources for agent grounding (KB articles, catalog items, documentation)
- Setting up tool access so agents can perform actions (create records, query data, trigger flows)
- Designing conversational flows with intent recognition and entity extraction
- Implementing guardrails for safety, accuracy, and compliance
- Testing and iterating on agent behavior before production deployment

**When to use:** When building a new virtual agent topic, extending Now Assist skill capabilities, creating a domain-specific AI assistant, or configuring agent tool access for automated task execution.

## Prerequisites

- **Roles:** `admin`, `va_admin`, or `now_assist_admin`
- **Plugins:** `com.glide.cs.chatbot` (Virtual Agent), `com.snc.now_assist` (Now Assist) recommended
- **Access:** Write access to `sys_cs_topic`, `sys_cs_intent`, `sys_cs_entity`, `sys_cb_topic`, `kb_knowledge` tables
- **Knowledge:** Understanding of conversational AI concepts (intents, entities, slots, fulfillment)
- **Related Skills:** `genai/agent-miner` for discovering what to automate, `genai/skill-kit-custom` for Now Assist skills

## Procedure

### Step 1: Define Agent Scope and Capabilities

Document the agent's purpose, target users, and boundaries.

```
=== AGENT DEFINITION ===
Name: [Agent Name]
Domain: [IT Support / HR / Facilities / Custom]
Target Users: [Employee / Customer / Technician]

CAPABILITIES (What the agent CAN do):
- [ ] Answer questions about [topic]
- [ ] Create [record type] on behalf of users
- [ ] Look up [information type]
- [ ] Trigger [workflow/process]
- [ ] Escalate to [team] when needed

BOUNDARIES (What the agent CANNOT do):
- [ ] Access [restricted data/system]
- [ ] Approve [request type]
- [ ] Modify [critical records]
- [ ] Share [sensitive information]

SUCCESS METRICS:
- Deflection Rate Target: [%]
- User Satisfaction Target: [score]
- Resolution Rate Target: [%]
- Average Handle Time Target: [minutes]
```

### Step 2: Configure Knowledge Sources

Set up the knowledge base articles and data sources the agent will use for grounding.

**MCP Approach:**
```
Tool: SN-Query-Table
Parameters:
  table_name: kb_knowledge
  query: kb_knowledge_base=[KB_SYS_ID]^workflow_state=published^active=true
  fields: sys_id,number,short_description,kb_category,article_type
  limit: 100
```

**REST Approach:**
```
GET /api/now/table/kb_knowledge
  ?sysparm_query=kb_knowledge_base=[KB_SYS_ID]^workflow_state=published^active=true
  &sysparm_fields=sys_id,number,short_description,kb_category,article_type
  &sysparm_limit=100
```

Verify knowledge coverage for each agent capability:

| Capability | KB Articles | Gaps Identified |
|-----------|------------|-----------------|
| Password reset | KB001, KB002 | None |
| VPN setup | KB010 | Missing macOS instructions |
| Software request | None | Need catalog mapping article |

### Step 3: Create Agent Topic

Build the primary topic that defines the agent's conversational scope.

**MCP Approach:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_cs_topic
  data:
    name: "IT Support Assistant"
    description: "Handles common IT support requests including password resets, VPN access, and software installations"
    state: draft
    category: IT
    greeting_message: "Hi! I'm your IT Support Assistant. I can help with password resets, VPN access, software requests, and general IT questions. What do you need help with?"
    no_match_message: "I'm not sure I understand. Could you rephrase your request, or would you like me to connect you with a live agent?"
    max_retries: 3
```

**REST Approach:**
```
POST /api/now/table/sys_cs_topic
Body: {
  "name": "IT Support Assistant",
  "description": "Handles common IT support requests",
  "state": "draft",
  "category": "IT",
  "greeting_message": "Hi! I'm your IT Support Assistant...",
  "no_match_message": "I'm not sure I understand...",
  "max_retries": "3"
}
```

### Step 4: Define Intents and Training Utterances

Create intents that the agent should recognize and respond to.

**MCP Approach:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_cs_intent
  data:
    name: "Reset Password"
    topic: [TOPIC_SYS_ID]
    description: "User wants to reset their password for any system"
    training_utterances: |
      I need to reset my password
      My password expired
      I can't log in
      Password not working
      Forgot my password
      Need a new password
      Locked out of my account
      Account locked
      Can't access my account
      Reset credentials
```

Repeat for each capability:

| Intent | Sample Utterances | Entity Slots |
|--------|------------------|--------------|
| Reset Password | "reset my password", "locked out" | system_name, username |
| VPN Access | "connect to VPN", "VPN not working" | vpn_type, device_type |
| Software Install | "install software", "need [app]" | software_name, justification |
| General Question | "how do I...", "what is..." | topic_keyword |

### Step 5: Define Entities for Slot Filling

Create entities to extract structured data from user messages.

**MCP Approach:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_cs_entity
  data:
    name: "system_name"
    topic: [TOPIC_SYS_ID]
    type: "list"
    prompt: "Which system do you need the password reset for?"
    required: true
    values: |
      Active Directory|AD|Windows login
      Email|Outlook|Exchange
      VPN|Cisco AnyConnect
      SAP|ERP
      Salesforce|CRM
```

**REST Approach:**
```
POST /api/now/table/sys_cs_entity
Body: {
  "name": "system_name",
  "topic": "[TOPIC_SYS_ID]",
  "type": "list",
  "prompt": "Which system do you need the password reset for?",
  "required": "true"
}
```

### Step 6: Configure Tool Access and Actions

Define what actions the agent can perform in ServiceNow.

**MCP Approach:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_cb_action
  data:
    topic: [TOPIC_SYS_ID]
    name: "Create Incident for Password Reset"
    action_type: "create_record"
    table: "incident"
    field_values: |
      category=inquiry
      subcategory=password
      short_description=Password reset request: ${system_name}
      assignment_group=IT Help Desk
      caller_id=${sys_user}
      urgency=3
      impact=3
```

**REST Approach:**
```
POST /api/now/table/sys_cb_action
Body: {
  "topic": "[TOPIC_SYS_ID]",
  "name": "Create Incident for Password Reset",
  "action_type": "create_record",
  "table": "incident",
  "field_values": "category=inquiry^subcategory=password^short_description=Password reset request"
}
```

**Common Action Types:**

| Action Type | Purpose | Configuration |
|------------|---------|---------------|
| create_record | Create a new record | table, field_values |
| update_record | Update existing record | table, sys_id, field_values |
| query_record | Look up records | table, query, return_fields |
| run_flow | Trigger a Flow Designer flow | flow_sys_id, inputs |
| run_script | Execute server-side script | script body |
| kb_search | Search knowledge base | query, kb_base |
| escalate | Transfer to live agent | queue, message |

### Step 7: Implement Guardrails

Configure safety boundaries and compliance controls.

**Input Guardrails:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_cs_topic_goal
  data:
    topic: [TOPIC_SYS_ID]
    name: "Input Validation"
    type: "guardrail"
    configuration: |
      BLOCKED_INTENTS:
      - Requests for other users' personal data
      - Attempts to bypass approval processes
      - Requests for admin/root access

      INPUT_SANITIZATION:
      - Strip HTML/script tags from user input
      - Validate employee ID format before lookup
      - Limit free-text input to 500 characters

      AUTHENTICATION:
      - Require verified session for record creation
      - Verify caller identity before sharing account details
      - MFA challenge for sensitive operations
```

**Output Guardrails:**
```
RESPONSE RULES:
- Never expose sys_id values or internal table names to users
- Never share other employees' personal information
- Always confirm destructive actions before executing
- Include disclaimer for estimated timeframes
- Redirect compliance/legal questions to appropriate teams
- Log all agent actions for audit trail

ESCALATION TRIGGERS:
- User expresses frustration (sentiment < -0.5)
- 3 consecutive failed intent matches
- Request involves VIP or executive user
- Security-related request (account compromise)
- Agent confidence score below threshold (< 0.7)
```

### Step 8: Design Conversation Flows

Map out the full conversational flow for each intent.

```
CONVERSATION FLOW: Password Reset

[User Message] -> Intent Recognition -> "Reset Password" (confidence > 0.8)
  |
  v
[Slot: system_name] -> "Which system?" -> User provides system
  |
  v
[Slot: username] -> "What is your username?" -> User provides username
  |
  v
[Validation] -> Verify user exists in system
  |-- User found -> Proceed
  |-- User not found -> "I couldn't find that username. Please verify and try again."
  |
  v
[Action] -> Trigger password reset flow
  |-- Success -> "Your password has been reset. Check your email for the temporary password."
  |-- Failure -> "I wasn't able to reset your password. Let me connect you with a live agent."
  |
  v
[Follow-up] -> "Is there anything else I can help you with?"
```

### Step 9: Test the Agent

Validate agent behavior with test scenarios.

**MCP Approach:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_cs_topic
  query: sys_id=[TOPIC_SYS_ID]
  fields: sys_id,name,state,test_status,last_tested
```

**Test Matrix:**

| Test Case | Input | Expected Behavior | Result |
|-----------|-------|-------------------|--------|
| Happy path | "Reset my AD password" | Collect username, trigger reset | |
| Missing entity | "Reset my password" | Ask which system | |
| Unknown intent | "What's the weather?" | No-match response | |
| Guardrail trigger | "Reset John's password" | Refuse, explain why | |
| Escalation | "This isn't working, get me a human" | Transfer to live agent | |
| Edge case | Empty message | Prompt for input | |

### Step 10: Deploy and Monitor

Publish the agent and set up monitoring.

**MCP Approach:**
```
Tool: SN-Update-Record
Parameters:
  table_name: sys_cs_topic
  sys_id: [TOPIC_SYS_ID]
  data:
    state: published
```

**Post-Deployment Monitoring Queries:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_cs_conversation
  query: topic=[TOPIC_SYS_ID]^sys_created_on>=javascript:gs.daysAgo(7)
  fields: sys_id,state,live_agent,transfer_reason,user_satisfaction,sys_created_on
  limit: 100
```

## Tool Usage

| Tool | Purpose | When to Use |
|------|---------|-------------|
| SN-Query-Table | Find existing topics, intents, and knowledge articles | Discovery and validation |
| SN-Create-Record | Create topics, intents, entities, and actions | Building agent components |
| SN-Update-Record | Modify agent settings, publish topics | Configuration and deployment |
| SN-Get-Table-Schema | Discover topic and intent table structures | Initial setup |
| SN-Read-Record | Get detailed record for specific topic or intent | Reviewing existing configurations |

## Best Practices

1. **Start narrow, expand gradually** -- launch with 2-3 well-defined intents before adding more
2. **Use at least 10 training utterances per intent** for reliable recognition
3. **Test with real user language** -- avoid technical jargon in training data
4. **Implement graceful fallbacks** -- always provide a path to live agent assistance
5. **Monitor and retrain weekly** during the first month after deployment
6. **Version your topics** -- maintain draft versions while published version serves users
7. **Separate concerns** -- one topic per domain area (IT, HR, Facilities)
8. **Log all actions** -- maintain audit trail for compliance and debugging
9. **Set confidence thresholds** -- do not act on low-confidence intent matches
10. **Gather user feedback** -- use post-conversation surveys to identify improvement areas

## Troubleshooting

| Issue | Cause | Resolution |
|-------|-------|------------|
| Agent not recognizing intents | Insufficient or poor training utterances | Add more diverse utterances; include typos and abbreviations |
| Wrong intent matched | Overlapping utterances between intents | Review and deduplicate training data; increase confidence threshold |
| Entity not extracted | Entity values do not match user input | Add synonyms and variations to entity value list |
| Action fails silently | Missing permissions or invalid field mapping | Check agent user roles; validate field names against table schema |
| Agent loops on same question | Required slot not being filled by user response | Add skip logic or alternative slot-filling prompts |
| High escalation rate | Agent scope too narrow or responses not helpful | Expand knowledge sources; review escalated conversations for patterns |

## Examples

### Example 1: IT Support Bot

**Scenario:** Build a virtual agent for common IT support requests.

```
AGENT: IT Support Assistant
INTENTS:
1. Password Reset -> Flow: Reset Password (AD, Email, VPN)
2. Software Request -> Action: Create RITM from catalog
3. VPN Troubleshooting -> KB Search: VPN articles
4. Hardware Issue -> Action: Create incident, escalate if P1
5. General IT Question -> KB Search: IT knowledge base

GUARDRAILS:
- Cannot reset passwords for other users
- Software requests require manager approval flow
- Hardware replacements require asset verification
```

### Example 2: HR Benefits Bot

**Scenario:** Build an agent for benefits enrollment questions.

```
AGENT: Benefits Assistant
INTENTS:
1. Benefits Overview -> KB: Benefits summary article
2. Enrollment Period -> KB: Open enrollment dates and process
3. Plan Comparison -> KB: Plan comparison matrix
4. Life Event Change -> Action: Create HR case for life event
5. Dependent Add/Remove -> Action: Create HR case with dependent info

GUARDRAILS:
- Cannot share other employees' benefits information
- Directs medical questions to benefits provider
- Logs all interactions for compliance
```

### Example 3: Facilities Service Bot

**Scenario:** Build an agent for workplace service requests.

```
AGENT: Facilities Assistant
INTENTS:
1. Room Booking -> Action: Query room availability, create reservation
2. Maintenance Request -> Action: Create facilities incident
3. Badge Access -> Action: Create access request RITM
4. Parking -> KB: Parking policy and waitlist info
5. Catering -> Action: Create catering request with details

GUARDRAILS:
- Room bookings limited to 4 hours maximum
- Maintenance requests auto-prioritized by type
- Badge access requires security team approval
```

## Related Skills

- `genai/agent-miner` - Discover automation opportunities from interaction data
- `genai/flow-generation` - Build flows that agents can trigger
- `genai/playbook-generation` - Create playbooks for agent-assisted workflows
- `genai/skill-kit-custom` - Build custom Now Assist skills
- `knowledge/article-generation` - Generate KB articles for agent knowledge sources
