---
name: now-assist-qa
version: 1.0.0
description: Configure Now Assist Q&A for conversational AI assistance including skill configurations, knowledge source setup, response quality tuning, context management, and multi-channel deployment
author: Happy Technologies LLC
tags: [genai, now-assist, Q&A, conversational-AI, virtual-agent, knowledge, NLU, response-quality]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp:
    - SN-Query-Table
    - SN-Create-Record
    - SN-Update-Record
    - SN-Get-Table-Schema
  rest:
    - /api/now/table/sn_now_assist_skill
    - /api/now/table/sn_now_assist_skill_config
    - /api/now/table/sn_now_assist_context
    - /api/now/table/sn_now_assist_panel_config
    - /api/now/table/sn_gen_ai_config
    - /api/now/table/sys_cs_topic
    - /api/now/table/sys_cs_conversation
    - /api/now/table/kb_knowledge_base
    - /api/now/table/kb_knowledge
    - /api/now/table/sn_now_assist_feedback
  native:
    - Bash
complexity: advanced
estimated_time: 30-60 minutes
---

# Now Assist Q&A Configuration

## Overview

This skill covers configuring ServiceNow Now Assist Q&A for conversational AI assistance:

- Setting up Now Assist skills for Q&A across different contexts (agent, employee, developer)
- Configuring knowledge sources that feed conversational responses
- Tuning response quality through prompt engineering and LLM parameters
- Managing conversation context and multi-turn dialogue
- Deploying Now Assist panels in Workspace, Portal, and Mobile
- Monitoring response quality through feedback analysis
- Integrating with AI Search for retrieval-augmented answers

**When to use:** When enabling AI-powered Q&A for agents, employees, or customers through Now Assist, configuring knowledge-grounded responses, or tuning conversational AI quality.

## Prerequisites

- **Roles:** `now_assist_admin`, `admin`
- **Plugins:** `sn_now_assist` (Now Assist), `com.snc.generative_ai_controller` (Generative AI Controller), `sn_gen_ai` (Generative AI)
- **Access:** sn_now_assist_skill, sn_now_assist_skill_config, sn_gen_ai_config tables
- **Knowledge:** Understanding of LLM concepts (prompts, temperature, tokens), knowledge management
- **Related Skills:** `genai/ai-search-rag` for search configuration, `genai/skill-kit-custom` for custom skills

## Procedure

### Step 1: Assess Current Now Assist Configuration

Query existing Now Assist skills and their status.

**MCP Approach:**
```
Use SN-Query-Table on sn_now_assist_skill:
  - query: active=true
  - fields: sys_id,name,description,skill_type,context,active,status
  - limit: 20
```

Check existing skill configurations:
```
Use SN-Query-Table on sn_now_assist_skill_config:
  - query: active=true
  - fields: sys_id,skill,name,config_type,value
  - limit: 50
```

**REST Approach:**
```
GET /api/now/table/sn_now_assist_skill
  ?sysparm_query=active=true
  &sysparm_fields=sys_id,name,description,skill_type,context,active
  &sysparm_limit=20
```

### Step 2: Configure Now Assist Q&A Skill

**Agent-Facing Q&A Skill:**

**MCP Approach:**
```
Use SN-Create-Record on sn_now_assist_skill:
  - name: "IT Agent Q&A"
  - description: "Provides AI-powered answers to IT agent questions from knowledge bases and resolved incidents"
  - skill_type: "qa"
  - context: "agent_workspace"
  - active: true
  - status: "draft"
  - knowledge_sources: "<kb_sys_id_1>,<kb_sys_id_2>"
  - enable_rag: true
  - response_mode: "generative"
```

**REST Approach:**
```
POST /api/now/table/sn_now_assist_skill
Body: {
  "name": "IT Agent Q&A",
  "description": "Provides AI-powered answers to IT agent questions from knowledge bases",
  "skill_type": "qa",
  "context": "agent_workspace",
  "active": true,
  "status": "draft",
  "enable_rag": true,
  "response_mode": "generative"
}
```

**Employee-Facing Q&A Skill:**
```
Use SN-Create-Record on sn_now_assist_skill:
  - name: "Employee Self-Service Q&A"
  - description: "AI answers for common employee IT and HR questions"
  - skill_type: "qa"
  - context: "employee_portal"
  - active: true
  - status: "draft"
  - knowledge_sources: "<it_kb_sys_id>,<hr_kb_sys_id>"
  - enable_rag: true
  - response_mode: "generative"
  - fallback_action: "create_incident"
```

**Context options for Now Assist skills:**

| Context | Value | Description |
|---------|-------|-------------|
| Agent Workspace | agent_workspace | IT agents in workspace UI |
| Employee Portal | employee_portal | Self-service employee portal |
| Customer Portal | customer_portal | External customer-facing |
| Mobile | mobile | ServiceNow mobile app |
| Virtual Agent | virtual_agent | VA conversation channel |
| Platform | platform | Platform-wide availability |

### Step 3: Configure Knowledge Sources

Link knowledge bases to the Q&A skill for grounded responses.

**MCP Approach:**
```
Use SN-Query-Table on kb_knowledge_base:
  - query: active=true
  - fields: sys_id,title,description,kb_version
  - limit: 20
```

Associate knowledge bases with the skill:
```
Use SN-Create-Record on sn_now_assist_skill_config:
  - skill: "<qa_skill_sys_id>"
  - name: "knowledge_source_1"
  - config_type: "knowledge_base"
  - value: "<kb_sys_id>"
  - active: true
  - order: 100
```

```
Use SN-Create-Record on sn_now_assist_skill_config:
  - skill: "<qa_skill_sys_id>"
  - name: "knowledge_source_2"
  - config_type: "knowledge_base"
  - value: "<hr_kb_sys_id>"
  - active: true
  - order: 200
```

**Configure knowledge filtering:**
```
Use SN-Create-Record on sn_now_assist_skill_config:
  - skill: "<qa_skill_sys_id>"
  - name: "kb_filter"
  - config_type: "knowledge_filter"
  - value: "workflow_state=published^valid_to>=javascript:gs.now()"
  - active: true
```

### Step 4: Configure LLM Parameters

Set up the generative AI parameters for response generation.

**MCP Approach:**
```
Use SN-Create-Record on sn_gen_ai_config:
  - name: "Now Assist Q&A LLM Config"
  - description: "LLM parameters for Now Assist Q&A responses"
  - active: true
  - llm_provider: "now_llm"
  - model: "default"
  - temperature: 0.3
  - max_tokens: 400
  - top_p: 0.9
  - frequency_penalty: 0.1
  - presence_penalty: 0.1
```

**REST Approach:**
```
POST /api/now/table/sn_gen_ai_config
Body: {
  "name": "Now Assist Q&A LLM Config",
  "active": true,
  "llm_provider": "now_llm",
  "temperature": 0.3,
  "max_tokens": 400,
  "top_p": 0.9
}
```

Link LLM config to skill:
```
Use SN-Create-Record on sn_now_assist_skill_config:
  - skill: "<qa_skill_sys_id>"
  - name: "llm_config"
  - config_type: "gen_ai_config"
  - value: "<gen_ai_config_sys_id>"
  - active: true
```

### Step 5: Configure System Prompts

System prompts guide LLM behavior for Q&A responses.

**MCP Approach:**
```
Use SN-Create-Record on sn_now_assist_skill_config:
  - skill: "<qa_skill_sys_id>"
  - name: "system_prompt"
  - config_type: "prompt"
  - value: |
      You are an IT support assistant for {company_name}. Your role is to help agents
      find answers to technical questions using the provided knowledge base content.

      Guidelines:
      - Only answer based on the provided context. Do not make up information.
      - If the context does not contain a clear answer, say "I don't have enough
        information to answer this question" and suggest creating a knowledge article.
      - Always cite the source knowledge article by title.
      - Keep answers concise and actionable, using bullet points for steps.
      - If the question involves a specific incident, reference relevant fields.
      - Never reveal internal system details, credentials, or sensitive data.
  - active: true
```

**Prompt template variables:**

| Variable | Description | Example |
|----------|-------------|---------|
| {company_name} | Customer organization name | Acme Corp |
| {user_name} | Current user's name | John Smith |
| {user_role} | Current user's primary role | ITIL Agent |
| {context_record} | Current record being viewed | INC0012345 |
| {knowledge_context} | Retrieved knowledge content | (injected by RAG) |
| {conversation_history} | Previous turns in dialogue | (auto-populated) |

### Step 6: Configure Now Assist Panel

Set up where and how the Now Assist panel appears.

**MCP Approach:**
```
Use SN-Create-Record on sn_now_assist_panel_config:
  - name: "Agent Workspace Q&A Panel"
  - description: "Now Assist Q&A panel for IT agent workspace"
  - active: true
  - context: "agent_workspace"
  - skills: "<qa_skill_sys_id>"
  - position: "right_sidebar"
  - auto_open: false
  - show_feedback: true
  - show_sources: true
  - max_conversation_turns: 10
  - greeting_message: "Hi! I can help you find answers from our knowledge base. What would you like to know?"
```

**REST Approach:**
```
POST /api/now/table/sn_now_assist_panel_config
Body: {
  "name": "Agent Workspace Q&A Panel",
  "active": true,
  "context": "agent_workspace",
  "skills": "<qa_skill_sys_id>",
  "position": "right_sidebar",
  "show_feedback": true,
  "show_sources": true
}
```

### Step 7: Configure Conversation Context

Set up how conversation context is managed for multi-turn dialogues.

**MCP Approach:**
```
Use SN-Create-Record on sn_now_assist_skill_config:
  - skill: "<qa_skill_sys_id>"
  - name: "context_config"
  - config_type: "context"
  - value: '{
      "max_history_turns": 5,
      "include_record_context": true,
      "record_fields": ["short_description", "description", "priority", "category", "assignment_group"],
      "context_window_tokens": 3000,
      "clear_on_record_change": true
    }'
  - active: true
```

### Step 8: Set Up Response Quality Guardrails

**MCP Approach:**
```
Use SN-Create-Record on sn_now_assist_skill_config:
  - skill: "<qa_skill_sys_id>"
  - name: "guardrails"
  - config_type: "safety"
  - value: '{
      "require_knowledge_grounding": true,
      "min_confidence_score": 0.65,
      "block_pii_in_response": true,
      "max_response_length": 500,
      "prohibited_topics": ["salary", "termination", "legal_advice"],
      "fallback_message": "I am not able to answer this question. Please contact your IT service desk for assistance.",
      "enable_content_filtering": true
    }'
  - active: true
```

### Step 9: Activate and Deploy

**MCP Approach:**
```
Use SN-Update-Record on sn_now_assist_skill:
  - sys_id: "<qa_skill_sys_id>"
  - status: "published"
  - active: true
```

Verify configuration is complete:
```
Use SN-Query-Table on sn_now_assist_skill_config:
  - query: skill=<qa_skill_sys_id>^active=true
  - fields: name,config_type,active
  - limit: 20
```

Verify panel is active:
```
Use SN-Query-Table on sn_now_assist_panel_config:
  - query: skills=<qa_skill_sys_id>^active=true
  - fields: name,context,position,active
```

### Step 10: Monitor and Tune Response Quality

**Query feedback data:**
```
Use SN-Query-Table on sn_now_assist_feedback:
  - query: skill=<qa_skill_sys_id>^sys_created_on>javascript:gs.daysAgo(7)
  - fields: sys_id,query,response,rating,feedback_text,user
  - limit: 50
  - orderBy: sys_created_on
  - orderDirection: desc
```

**Analyze negative feedback patterns:**
```
Use SN-Query-Table on sn_now_assist_feedback:
  - query: skill=<qa_skill_sys_id>^rating<3
  - fields: query,response,rating,feedback_text
  - limit: 20
```

**Adjust based on feedback:**
```
Use SN-Update-Record on sn_gen_ai_config:
  - sys_id: "<gen_ai_config_sys_id>"
  - temperature: 0.2
  - max_tokens: 500
```

## Tool Usage

| Tool | Purpose | When to Use |
|------|---------|-------------|
| SN-Query-Table | Find existing skills, configs, feedback | Discovery and monitoring |
| SN-Create-Record | Create skills, configs, panel settings | Initial setup |
| SN-Update-Record | Tune LLM params, activate skills | Optimization and deployment |
| SN-Get-Table-Schema | Discover config table fields | Understanding available settings |

## Best Practices

1. **Start with a single knowledge base** and expand sources incrementally as quality is validated
2. **Use low temperature** (0.2-0.4) for Q&A to keep responses factual and grounded
3. **Write specific system prompts** that define the assistant's role, boundaries, and response format
4. **Enable citation display** so users can verify answers against source material
5. **Set confidence thresholds** conservatively (0.65+) and adjust based on feedback
6. **Include record context** when the Q&A skill is used alongside incidents or cases
7. **Limit conversation history** to 5-7 turns to manage token usage and context relevance
8. **Block PII in responses** to prevent accidental exposure of sensitive data
9. **Monitor feedback weekly** and address patterns of negative ratings promptly
10. **Test with real user queries** from support tickets to validate response quality before launch

## Troubleshooting

| Issue | Cause | Resolution |
|-------|-------|------------|
| Now Assist panel not visible | Panel config inactive or wrong context | Verify sn_now_assist_panel_config.active=true and context matches UI |
| Responses are generic/unhelpful | Knowledge sources not linked or empty | Check skill_config knowledge_base entries and verify KB has published articles |
| Hallucinated answers | Temperature too high or no grounding requirement | Lower temperature, set require_knowledge_grounding=true |
| Response cut off mid-sentence | max_tokens too low | Increase max_tokens in sn_gen_ai_config (400-600 recommended) |
| Slow response time | Too many knowledge sources or large context window | Reduce search sources, lower context_window_tokens |
| Skill not triggering | Skill status is draft or inactive | Publish and activate the skill |
| Feedback not collected | show_feedback disabled on panel | Set show_feedback=true in panel config |
| Wrong knowledge base searched | KB filter conditions too broad or missing | Add specific kb_knowledge_base filter in knowledge_filter config |

## Examples

### Example 1: IT Agent Q&A in Workspace

Configure Now Assist Q&A for ITSM agents:
- **Skill:** Agent workspace context, linked to IT Knowledge Base and resolved incidents
- **System Prompt:** IT support assistant, answers from KB only, cites sources, suggests escalation paths
- **LLM Config:** Temperature 0.3, max 400 tokens, now_llm provider
- **Panel:** Right sidebar, auto-open disabled, feedback enabled, shows 3 source citations
- **Context:** Include incident short_description, description, priority, category from viewed record
- **Guardrails:** Require knowledge grounding, block PII, min confidence 0.7

### Example 2: Employee Self-Service Q&A

Configure Now Assist for employee portal self-service:
- **Skill:** Employee portal context, linked to IT FAQ KB and HR Policy KB
- **System Prompt:** Friendly employee assistant, provides step-by-step guidance, offers catalog links
- **LLM Config:** Temperature 0.4, max 500 tokens for more detailed self-service instructions
- **Panel:** Embedded in portal search, greeting message, max 5 conversation turns
- **Fallback:** If confidence below 0.6, suggest creating an incident or browsing catalog
- **Guardrails:** Block salary/termination topics, require KB grounding, content filtering enabled

### Example 3: CSM Agent Q&A for Customer Support

Configure Now Assist for customer service management agents:
- **Skill:** Agent workspace context for CSM, linked to product KB and customer solutions KB
- **System Prompt:** Customer support specialist, professional tone, includes troubleshooting steps
- **LLM Config:** Temperature 0.2 for precise technical answers, max 400 tokens
- **Context:** Include case short_description, product, account, priority from current case
- **Panel:** Right sidebar with auto-open on case creation, feedback and sources visible
- **Guardrails:** Prohibit sharing internal pricing, SLA details, or customer data from other accounts

## Related Skills

- `genai/ai-search-rag` - AI Search configuration that powers Q&A knowledge retrieval
- `genai/skill-kit-custom` - Creating custom Now Assist skills beyond Q&A
- `genai/flow-generation` - Flows that can be triggered from Q&A fallback actions
- `knowledge/article-management` - Managing knowledge content quality for better Q&A
