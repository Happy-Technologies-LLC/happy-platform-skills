---
name: detect-conversation-type
version: 1.0.0
description: Detect and classify conversation types including inquiry, complaint, request, feedback, and escalation. Route to appropriate handling workflows based on intent, sentiment, and urgency analysis
author: Happy Technologies LLC
tags: [genai, conversation, classification, intent-detection, routing, sentiment, virtual-agent, engagement]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp:
    - SN-Query-Table
    - SN-Create-Record
    - SN-Update-Record
    - SN-NL-Search
    - SN-Get-Record
  rest:
    - /api/now/table/sys_cs_conversation
    - /api/now/table/sys_cs_message
    - /api/now/table/interaction
    - /api/now/table/incident
    - /api/now/table/sn_customerservice_case
    - /api/now/table/sn_hr_core_case
    - /api/now/table/sys_cb_topic
    - /api/now/table/sys_cs_topic_map
  native:
    - Bash
complexity: intermediate
estimated_time: 5-15 minutes
---

# Conversation Type Detection and Classification

## Overview

This skill detects and classifies the type of conversation occurring in ServiceNow engagement channels (Virtual Agent, chat, email, portal) to enable intelligent routing and handling:

- **Inquiry**: Information-seeking questions about services, policies, or status
- **Request**: Actionable service requests or catalog orders
- **Complaint**: Expressions of dissatisfaction requiring service recovery
- **Feedback**: Constructive input about services, processes, or experiences
- **Escalation**: Urgent issues requiring immediate attention or management involvement
- **Troubleshooting**: Technical problem-solving requiring diagnostic steps
- **Follow-up**: Continuation of a previous conversation or existing ticket

**When to use:** When building Virtual Agent topic routing, when enriching interaction records with classification metadata, when automating conversation handoff decisions, or when analyzing conversation patterns for service improvement.

## Prerequisites

- **Roles:** `admin`, `sn_customerservice_manager`, `itil`, or `virtual_agent_admin`
- **Plugins:** `com.glide.cs.chatbot` (Virtual Agent), `com.glide.interaction` (Agent Workspace Interaction)
- **Access:** Read access to `sys_cs_conversation`, `sys_cs_message`, `interaction` tables
- **Knowledge:** Virtual Agent topic design, conversation flow concepts, sentiment analysis basics
- **Related Skills:** `csm/sentiment-analysis` for sentiment scoring, `csm/chat-recommendation` for response suggestions

## Procedure

### Step 1: Retrieve Conversation Messages

Fetch the conversation history for classification.

**MCP Approach:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_cs_message
  query: conversation=<conversation_sys_id>^ORDERBYsys_created_on
  fields: sys_id,body,direction,sys_created_on,typed_by,message_type
  limit: 50
```

**REST Approach:**
```
GET /api/now/table/sys_cs_message
  ?sysparm_query=conversation=<conversation_sys_id>^ORDERBYsys_created_on
  &sysparm_fields=sys_id,body,direction,sys_created_on,typed_by,message_type
  &sysparm_limit=50
```

For interaction-based conversations:
```
Tool: SN-Query-Table
Parameters:
  table_name: interaction
  query: sys_id=<interaction_sys_id>
  fields: sys_id,short_description,type,channel,state,opened_for,assigned_to,opened_at,work_notes
  limit: 1
```

### Step 2: Analyze Initial User Message

The first user message is the strongest signal for conversation type. Extract:

**Intent Signals:**

| Signal Type | Examples | Classification |
|-------------|----------|---------------|
| Question words | "How do I...", "What is...", "Where can I..." | Inquiry |
| Action verbs | "I need...", "Please set up...", "Can you create..." | Request |
| Negative sentiment | "This is unacceptable...", "I'm frustrated..." | Complaint |
| Suggestion language | "It would be nice if...", "Have you considered..." | Feedback |
| Urgency markers | "URGENT", "This is critical", "Need help NOW" | Escalation |
| Problem description | "It's not working", "I'm getting an error..." | Troubleshooting |
| Reference to prior | "Following up on INC...", "As discussed..." | Follow-up |

### Step 3: Apply Classification Rules

Score the conversation against each type using a weighted analysis:

```
=== CONVERSATION CLASSIFICATION ===
Conversation ID: CS0045678
Channel: Virtual Agent (Service Portal)
User: Jane Smith (Engineering)
Initial Message: "I've been waiting 5 days for my laptop and no one
  has contacted me. This is the third time I've had to follow up.
  I need this resolved today or I need to speak with a manager."

Classification Scores:
| Type            | Score | Signals Detected |
|-----------------|-------|------------------|
| Complaint       | 85%   | Negative sentiment, dissatisfaction, wait time mention |
| Escalation      | 75%   | "speak with a manager", urgency ("today") |
| Follow-up       | 60%   | "third time", reference to prior interaction |
| Request         | 30%   | "need this resolved" (implicit service need) |
| Inquiry         | 10%   | No information-seeking language |
| Feedback        | 5%    | No constructive suggestion |
| Troubleshooting | 5%    | No technical problem described |

PRIMARY: Complaint (85%)
SECONDARY: Escalation (75%)
COMPOSITE: Complaint with Escalation Request

URGENCY: High
SENTIMENT: Negative (frustrated)
PRIORITY ACTION: Route to human agent with escalation flag
```

### Step 4: Detect Multi-Intent Conversations

Some conversations contain multiple intents. Identify all:

**MCP Approach:**
```
Tool: SN-NL-Search
Parameters:
  query: "laptop delivery delay complaint escalation"
  table: sys_cb_topic
  limit: 10
```

Analyze message-by-message for intent shifts:
```
Message 1: "I need to reset my password" -> Request
Message 2: "Also, the VPN has been slow all week" -> Troubleshooting
Message 3: "And when will the new laptops be available?" -> Inquiry

Classification: Multi-intent conversation
Primary: Request (password reset - most actionable)
Secondary: Troubleshooting (VPN performance)
Tertiary: Inquiry (laptop availability)
```

### Step 5: Map Classification to Routing Rules

Determine the appropriate handling workflow based on classification.

**Routing Matrix:**

| Classification | Channel | Priority | Route To |
|---------------|---------|----------|----------|
| Inquiry | Virtual Agent | Low | Knowledge search -> FAQ topic |
| Request | Virtual Agent | Medium | Catalog item topic -> Fulfillment |
| Complaint | Live Agent | High | CSM queue -> Service Recovery |
| Feedback | Async | Low | Feedback collection -> Survey |
| Escalation | Live Agent | Critical | Manager queue -> Priority handling |
| Troubleshooting | Virtual Agent | Medium | Diagnostic topic -> IT Support |
| Follow-up | Live Agent | Medium | Original assignee -> Context resume |

**MCP Approach:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_cb_topic
  query: nameLIKEcomplaint^active=true
  fields: sys_id,name,description,queue,priority,active
  limit: 5
```

### Step 6: Enrich the Interaction Record

Update the interaction or conversation record with classification metadata.

**MCP Approach:**
```
Tool: SN-Update-Record
Parameters:
  table_name: interaction
  sys_id: <interaction_sys_id>
  data:
    u_conversation_type: "complaint"
    u_secondary_type: "escalation"
    u_urgency: "high"
    u_sentiment: "negative"
    u_classification_confidence: "85"
    u_routing_recommendation: "csm_escalation_queue"
```

**REST Approach:**
```
PATCH /api/now/table/interaction/<interaction_sys_id>
Body: {
  "u_conversation_type": "complaint",
  "u_secondary_type": "escalation",
  "u_urgency": "high",
  "u_sentiment": "negative"
}
```

### Step 7: Create Downstream Records Based on Type

Automatically create appropriate records based on classification.

**For Complaints -- Create CSM Case:**

**MCP Approach:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sn_customerservice_case
  data:
    short_description: "Complaint: Laptop delivery delay - 3rd follow-up"
    description: "<conversation summary>"
    priority: 2
    contact: "<user_sys_id>"
    category: "complaint"
    u_complaint_type: "service_delivery"
    u_source_conversation: "<conversation_sys_id>"
```

**For Requests -- Create Catalog Request:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sc_request
  data:
    requested_for: "<user_sys_id>"
    short_description: "Password reset request via chat"
    description: "<conversation context>"
    u_source_conversation: "<conversation_sys_id>"
```

### Step 8: Handle Escalation Routing

When an escalation is detected, trigger immediate routing.

**MCP Approach:**
```
Tool: SN-Update-Record
Parameters:
  table_name: interaction
  sys_id: <interaction_sys_id>
  data:
    state: "transferred_to_agent"
    assignment_group: "<escalation_queue_sys_id>"
    u_escalation_reason: "Customer requested manager involvement"
    u_escalation_priority: "high"
    work_notes: "AI Classification: Complaint with escalation request. Customer has followed up 3 times regarding laptop delivery delay. Sentiment: Negative/Frustrated. Routing to escalation queue."
```

### Step 9: Track Classification Accuracy

Monitor and validate classification decisions over time.

**MCP Approach:**
```
Tool: SN-Query-Table
Parameters:
  table_name: interaction
  query: u_conversation_typeISNOTEMPTY^sys_created_on>javascript:gs.daysAgo(30)
  fields: u_conversation_type,u_classification_confidence,state,u_agent_override_type
  limit: 500
```

Calculate accuracy metrics:
```
=== CLASSIFICATION ACCURACY (Last 30 Days) ===

| Type            | Classified | Agent Override | Accuracy |
|-----------------|-----------|---------------|----------|
| Inquiry         | 245       | 12            | 95.1%    |
| Request         | 189       | 8             | 95.8%    |
| Complaint       | 67        | 5             | 92.5%    |
| Troubleshooting | 156       | 11            | 92.9%    |
| Escalation      | 34        | 3             | 91.2%    |
| Feedback        | 28        | 4             | 85.7%    |
| Follow-up       | 42        | 6             | 85.7%    |

Overall Accuracy: 93.4%
Most Common Misclassification: Feedback classified as Inquiry
```

### Step 10: Refine Classification Rules

Use override data to improve classification accuracy.

**MCP Approach:**
```
Tool: SN-Query-Table
Parameters:
  table_name: interaction
  query: u_agent_override_typeISNOTEMPTY^u_conversation_type!=u_agent_override_type
  fields: u_conversation_type,u_agent_override_type,short_description
  limit: 50
```

Analyze misclassifications to identify patterns and update routing rules.

## Tool Usage

| Tool | Purpose | When to Use |
|------|---------|-------------|
| SN-Query-Table | Fetch conversations, messages, topics, metrics | Primary data retrieval |
| SN-Get-Record | Retrieve specific interaction details | Single conversation analysis |
| SN-Create-Record | Create downstream records (cases, incidents) | Acting on classification |
| SN-Update-Record | Enrich interaction with classification metadata | Recording classification results |
| SN-NL-Search | Find matching topics or similar conversations | Topic routing and pattern matching |

## Best Practices

1. **Classify on first message** -- do not wait for multiple exchanges to make an initial classification
2. **Support reclassification** -- conversations can shift type mid-stream; update classification dynamically
3. **Use confidence thresholds** -- below 70% confidence, route to human agent for classification
4. **Combine intent and sentiment** -- a request with negative sentiment may actually be a complaint
5. **Handle multi-intent gracefully** -- address the most urgent intent first, then secondary intents
6. **Preserve conversation context** -- pass full classification metadata to receiving agent or workflow
7. **Track agent overrides** -- use override data as training signal for improving classification rules
8. **Consider channel context** -- phone calls have different patterns than chat or email
9. **Detect language and tone shifts** -- escalation often manifests as a shift from neutral to negative
10. **Respect privacy** -- do not log or classify sensitive personal information in metadata fields

## Troubleshooting

| Issue | Cause | Resolution |
|-------|-------|------------|
| Messages not retrieved | Wrong conversation table or ID format | Check `sys_cs_conversation` vs `interaction` table |
| Classification always "Inquiry" | Default fallback too aggressive | Lower inquiry threshold, add more signal patterns |
| Escalation not detected | Urgency language not in signal list | Add domain-specific urgency phrases to detection rules |
| Multi-intent not handled | Only first intent extracted | Implement per-message analysis with intent accumulation |
| Routing to wrong queue | Topic mapping outdated | Update `sys_cb_topic` routing configuration |
| Low confidence scores | Ambiguous or very short messages | Request clarification from user before classifying |

## Examples

### Example 1: Virtual Agent Inquiry Classification

**Input:** User message: "What are the company holidays for 2026?"

**Classification:** Inquiry (95% confidence). Route to Knowledge search topic. Suggested KB article: "2026 Company Holiday Calendar."

### Example 2: Complaint with Escalation Detection

**Input:** User message: "I submitted a request two weeks ago and nothing has happened. This is completely unacceptable. I need to talk to someone who can actually help."

**Classification:** Complaint (88%) + Escalation (80%). Route to live agent in escalation queue. Flag as high priority. Auto-search for existing open requests by this user.

### Example 3: Multi-Intent Chat Session

**Input:** User sends 3 messages: password reset request, question about VPN policy, and feedback about the portal design.

**Classification:** Multi-intent detected. Primary: Request (password reset, actionable). Secondary: Inquiry (VPN policy). Tertiary: Feedback (portal). Route password reset to IT topic, queue VPN question for knowledge search, log feedback for UX team review.

## Related Skills

- `csm/sentiment-analysis` - Deep sentiment analysis for conversations
- `csm/chat-recommendation` - Suggested responses for agents
- `hrsd/chat-reply-recommendation` - HR-specific chat response suggestions
- `genai/playbook-recommendations` - Match conversation to handling playbooks
- `itsm/incident-triage` - Incident classification and routing
