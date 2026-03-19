---
name: skill-kit-custom
version: 1.0.0
description: Create custom Now Assist skills using Skill Kit including skill input/output definition, prompt configuration, skill testing with ATF, deployment, and building custom AI capabilities
author: Happy Technologies LLC
tags: [genai, skill-kit, now-assist, custom-skills, prompts, ATF, testing, deployment, AI-capabilities]
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
    - /api/now/table/sn_now_assist_skill_input
    - /api/now/table/sn_now_assist_skill_output
    - /api/now/table/sn_now_assist_skill_prompt
    - /api/now/table/sn_gen_ai_config
    - /api/now/table/sys_atf_test
    - /api/now/table/sys_atf_step
    - /api/now/table/sn_now_assist_skill_test
    - /api/now/table/sys_hub_action_type_definition
  native:
    - Bash
complexity: advanced
estimated_time: 60-120 minutes
---

# Custom Now Assist Skills with Skill Kit

## Overview

This skill covers creating custom Now Assist skills using the Skill Kit framework:

- Designing custom skills with defined inputs, outputs, and processing logic
- Building prompt templates with dynamic variable injection
- Configuring skill triggers and invocation contexts
- Implementing multi-step skills with chained LLM calls
- Testing skills with Automated Test Framework (ATF) integration
- Deploying and versioning custom skills across instances
- Building specialized AI capabilities (summarization, classification, generation, extraction)

**When to use:** When the built-in Now Assist skills do not meet your requirements and you need custom AI capabilities such as domain-specific summarization, automated classification, content generation, or data extraction.

## Prerequisites

- **Roles:** `now_assist_admin`, `admin`, `atf_test_designer` (for testing)
- **Plugins:** `sn_now_assist` (Now Assist), `com.snc.generative_ai_controller` (Generative AI Controller), `sn_gen_ai` (Generative AI), `com.snc.atf` (ATF for testing)
- **Access:** sn_now_assist_skill, sn_now_assist_skill_input, sn_now_assist_skill_output, sys_atf_test tables
- **Knowledge:** Prompt engineering, LLM capabilities and limitations, ATF testing
- **Related Skills:** `genai/now-assist-qa` for Q&A configuration, `genai/ai-search-rag` for RAG integration

## Procedure

### Step 1: Design the Custom Skill

Define the skill's purpose and interface before implementation.

**Skill design checklist:**
- **Purpose:** What specific AI capability does this skill provide?
- **Trigger:** How is the skill invoked (automatic, user-initiated, API)?
- **Inputs:** What data does the skill need (record fields, user input, context)?
- **Processing:** What LLM operations are performed (summarize, classify, generate, extract)?
- **Outputs:** What results does the skill produce (text, structured data, actions)?
- **Context:** Where does the skill run (agent workspace, portal, mobile, API)?

**Common custom skill patterns:**

| Pattern | Description | Example Use Case |
|---------|-------------|-----------------|
| Summarization | Condense long text into key points | Incident summarization, meeting notes |
| Classification | Categorize input into predefined labels | Ticket routing, sentiment analysis |
| Generation | Create new content from instructions | Email drafts, knowledge articles |
| Extraction | Pull structured data from unstructured text | Entity extraction, field population |
| Translation | Convert between formats or languages | Technical to plain language |
| Recommendation | Suggest actions based on context | Resolution suggestions, next best action |

### Step 2: Create the Custom Skill Record

**MCP Approach:**
```
Use SN-Create-Record on sn_now_assist_skill:
  - name: "Incident Root Cause Analyzer"
  - description: "Analyzes incident description, work notes, and related records to suggest probable root causes"
  - skill_type: "custom"
  - context: "agent_workspace"
  - active: true
  - status: "draft"
  - category: "itsm"
  - invocation_type: "user_initiated"
  - target_table: "incident"
  - version: "1.0.0"
```

**REST Approach:**
```
POST /api/now/table/sn_now_assist_skill
Body: {
  "name": "Incident Root Cause Analyzer",
  "description": "Analyzes incident details to suggest probable root causes",
  "skill_type": "custom",
  "context": "agent_workspace",
  "active": true,
  "status": "draft",
  "category": "itsm",
  "invocation_type": "user_initiated",
  "target_table": "incident"
}
```

**Invocation types:**

| Type | Value | Description |
|------|-------|-------------|
| User Initiated | user_initiated | User clicks a button or menu item |
| Automatic | automatic | Triggered on record events |
| API | api | Called via REST API or script |
| Contextual | contextual | Triggered based on workspace context |

### Step 3: Define Skill Inputs

Inputs define what data the skill receives for processing.

**MCP Approach:**
```
Use SN-Create-Record on sn_now_assist_skill_input:
  - skill: "<skill_sys_id>"
  - name: "incident_description"
  - label: "Incident Description"
  - type: "string"
  - source: "record_field"
  - source_field: "description"
  - source_table: "incident"
  - mandatory: true
  - order: 100
```

```
Use SN-Create-Record on sn_now_assist_skill_input:
  - skill: "<skill_sys_id>"
  - name: "work_notes"
  - label: "Work Notes"
  - type: "string"
  - source: "record_field"
  - source_field: "work_notes"
  - source_table: "incident"
  - mandatory: false
  - order: 200
```

```
Use SN-Create-Record on sn_now_assist_skill_input:
  - skill: "<skill_sys_id>"
  - name: "category"
  - label: "Category"
  - type: "string"
  - source: "record_field"
  - source_field: "category"
  - source_table: "incident"
  - mandatory: true
  - order: 300
```

```
Use SN-Create-Record on sn_now_assist_skill_input:
  - skill: "<skill_sys_id>"
  - name: "affected_ci"
  - label: "Affected CI"
  - type: "reference"
  - source: "record_field"
  - source_field: "cmdb_ci"
  - source_table: "incident"
  - mandatory: false
  - order: 400
```

**Input source types:**

| Source | Value | Description |
|--------|-------|-------------|
| Record Field | record_field | Value from the target record |
| User Input | user_input | Prompted from user at invocation |
| Context | context | Derived from workspace context |
| Static | static | Hardcoded value |
| Computed | computed | Calculated via script |

**REST Approach:**
```
POST /api/now/table/sn_now_assist_skill_input
Body: {
  "skill": "<skill_sys_id>",
  "name": "incident_description",
  "label": "Incident Description",
  "type": "string",
  "source": "record_field",
  "source_field": "description",
  "source_table": "incident",
  "mandatory": true,
  "order": 100
}
```

### Step 4: Define Skill Outputs

Outputs define what the skill returns after processing.

**MCP Approach:**
```
Use SN-Create-Record on sn_now_assist_skill_output:
  - skill: "<skill_sys_id>"
  - name: "root_cause_summary"
  - label: "Root Cause Summary"
  - type: "string"
  - display_type: "rich_text"
  - order: 100
```

```
Use SN-Create-Record on sn_now_assist_skill_output:
  - skill: "<skill_sys_id>"
  - name: "confidence_score"
  - label: "Confidence Score"
  - type: "decimal"
  - display_type: "badge"
  - order: 200
```

```
Use SN-Create-Record on sn_now_assist_skill_output:
  - skill: "<skill_sys_id>"
  - name: "suggested_category"
  - label: "Suggested Category"
  - type: "string"
  - display_type: "text"
  - order: 300
```

```
Use SN-Create-Record on sn_now_assist_skill_output:
  - skill: "<skill_sys_id>"
  - name: "related_kb_articles"
  - label: "Related Knowledge Articles"
  - type: "string"
  - display_type: "link_list"
  - order: 400
```

**Output display types:**

| Display Type | Value | Description |
|-------------|-------|-------------|
| Plain Text | text | Simple text display |
| Rich Text | rich_text | Formatted HTML/markdown |
| Badge | badge | Color-coded label |
| Link List | link_list | Clickable reference links |
| JSON | json | Structured data display |
| Action Button | action | Clickable action trigger |

### Step 5: Configure Skill Prompts

Prompts are the core of the skill -- they instruct the LLM on what to do.

**MCP Approach:**
```
Use SN-Create-Record on sn_now_assist_skill_prompt:
  - skill: "<skill_sys_id>"
  - name: "root_cause_analysis_prompt"
  - prompt_type: "system"
  - order: 100
  - template: |
      You are an expert IT incident analyst. Your task is to analyze incident
      information and determine the most probable root cause.

      Analyze the following incident details:

      Category: {category}
      Description: {incident_description}
      Work Notes: {work_notes}
      Affected CI: {affected_ci}

      Provide your analysis in the following format:

      ## Root Cause Summary
      [2-3 sentence summary of the most likely root cause]

      ## Contributing Factors
      - [Factor 1]
      - [Factor 2]
      - [Factor 3]

      ## Confidence Level
      [High/Medium/Low] - [Brief justification]

      ## Recommended Actions
      1. [Action 1]
      2. [Action 2]
      3. [Action 3]

      ## Suggested Category
      [If the incident appears miscategorized, suggest the correct category]

      Guidelines:
      - Base your analysis only on the provided information
      - If insufficient data, state what additional information would help
      - Consider common patterns for the given category
      - Prioritize actionable recommendations
  - active: true
```

**Multi-step prompt (chained LLM call):**
```
Use SN-Create-Record on sn_now_assist_skill_prompt:
  - skill: "<skill_sys_id>"
  - name: "extract_entities_prompt"
  - prompt_type: "preprocessing"
  - order: 50
  - template: |
      Extract the following entities from the incident description:

      Description: {incident_description}

      Return a JSON object with:
      {
        "affected_systems": ["list of systems mentioned"],
        "error_codes": ["any error codes found"],
        "timestamps": ["any times/dates mentioned"],
        "user_actions": ["what the user was doing when the issue occurred"]
      }
  - active: true
```

**Prompt types:**

| Type | Value | Order | Description |
|------|-------|-------|-------------|
| Preprocessing | preprocessing | 1-49 | Extract/transform inputs before main analysis |
| System | system | 50-99 | Main system instructions for the LLM |
| User | user | 100+ | Dynamic user context injection |
| Postprocessing | postprocessing | 200+ | Format/validate LLM output |

### Step 6: Configure LLM Settings for the Skill

**MCP Approach:**
```
Use SN-Create-Record on sn_gen_ai_config:
  - name: "Root Cause Analyzer LLM Config"
  - description: "LLM parameters optimized for root cause analysis"
  - active: true
  - llm_provider: "now_llm"
  - model: "default"
  - temperature: 0.2
  - max_tokens: 800
  - top_p: 0.9
  - frequency_penalty: 0.2
  - presence_penalty: 0.1
```

Link to skill:
```
Use SN-Create-Record on sn_now_assist_skill_config:
  - skill: "<skill_sys_id>"
  - name: "llm_config"
  - config_type: "gen_ai_config"
  - value: "<gen_ai_config_sys_id>"
  - active: true
```

**Temperature guidelines by skill type:**

| Skill Type | Temperature | Rationale |
|------------|-------------|-----------|
| Summarization | 0.1-0.3 | Factual accuracy is critical |
| Classification | 0.0-0.2 | Deterministic categorization |
| Root Cause Analysis | 0.2-0.4 | Balanced reasoning with accuracy |
| Content Generation | 0.5-0.7 | Creative but coherent output |
| Email Drafting | 0.4-0.6 | Professional tone with variation |
| Code Generation | 0.1-0.3 | Syntactic correctness required |

### Step 7: Create ATF Tests for the Skill

Automated testing ensures skill quality across updates.

**Create ATF Test:**

**MCP Approach:**
```
Use SN-Create-Record on sys_atf_test:
  - name: "Test - Root Cause Analyzer Skill"
  - description: "Validates the root cause analyzer skill produces expected output format and quality"
  - active: true
  - test_type: "automated"
  - category: "now_assist_skill"
```

**Create Test Steps:**

**Step 1 -- Set up test incident:**
```
Use SN-Create-Record on sys_atf_step:
  - test: "<atf_test_sys_id>"
  - order: 100
  - step_type: "create_record"
  - table: "incident"
  - description: "Create test incident with known root cause pattern"
  - step_config: '{
      "table": "incident",
      "fields": {
        "short_description": "Email server not responding since 2AM",
        "description": "Users reporting inability to send or receive emails. Exchange server shows high CPU utilization. Error code 0x80040115 in Outlook clients. Issue started after scheduled maintenance window at 2AM.",
        "category": "email",
        "priority": 2,
        "cmdb_ci": "<email_server_ci_sys_id>"
      }
    }'
```

**Step 2 -- Invoke the skill:**
```
Use SN-Create-Record on sys_atf_step:
  - test: "<atf_test_sys_id>"
  - order: 200
  - step_type: "invoke_now_assist_skill"
  - description: "Execute root cause analyzer skill on test incident"
  - step_config: '{
      "skill": "<skill_sys_id>",
      "record_table": "incident",
      "record_sys_id": "${test_incident_sys_id}"
    }'
```

**Step 3 -- Validate output format:**
```
Use SN-Create-Record on sys_atf_step:
  - test: "<atf_test_sys_id>"
  - order: 300
  - step_type: "validate_output"
  - description: "Verify skill output contains required sections"
  - step_config: '{
      "assertions": [
        {"field": "root_cause_summary", "operator": "is_not_empty"},
        {"field": "root_cause_summary", "operator": "contains", "value": "Root Cause"},
        {"field": "confidence_score", "operator": "greater_than", "value": 0},
        {"field": "confidence_score", "operator": "less_than_or_equal", "value": 1}
      ]
    }'
```

**Step 4 -- Clean up test data:**
```
Use SN-Create-Record on sys_atf_step:
  - test: "<atf_test_sys_id>"
  - order: 400
  - step_type: "delete_record"
  - description: "Remove test incident"
  - step_config: '{
      "table": "incident",
      "sys_id": "${test_incident_sys_id}"
    }'
```

**REST Approach:**
```
POST /api/now/table/sys_atf_test
Body: {
  "name": "Test - Root Cause Analyzer Skill",
  "description": "Validates root cause analyzer skill output",
  "active": true
}
```

### Step 8: Create Skill Test Cases

Dedicated skill test cases for quality validation.

**MCP Approach:**
```
Use SN-Create-Record on sn_now_assist_skill_test:
  - skill: "<skill_sys_id>"
  - name: "Network Incident Root Cause"
  - description: "Tests root cause analysis for network-related incidents"
  - test_input: '{
      "incident_description": "Multiple users in Building A unable to access network resources. Switch in MDF room showing amber lights on ports 1-24. Issue started after power fluctuation at 3PM.",
      "category": "network",
      "work_notes": "Checked switch logs - multiple port flaps detected. UPS battery backup depleted during power event.",
      "affected_ci": "SW-BLDGA-MDF-01"
    }'
  - expected_output_contains: "power"
  - expected_confidence_min: 0.7
  - active: true
```

```
Use SN-Create-Record on sn_now_assist_skill_test:
  - skill: "<skill_sys_id>"
  - name: "Software Crash Root Cause"
  - description: "Tests root cause analysis for application crash incidents"
  - test_input: '{
      "incident_description": "CRM application crashing with OutOfMemoryError after latest patch deployment. Heap dump shows memory leak in report generation module.",
      "category": "software",
      "work_notes": "Application team confirmed new patch v2.4.1 deployed yesterday. No issues on staging environment.",
      "affected_ci": "APP-CRM-PROD-01"
    }'
  - expected_output_contains: "memory"
  - expected_confidence_min: 0.8
  - active: true
```

### Step 9: Deploy and Activate the Skill

**MCP Approach:**
```
Use SN-Update-Record on sn_now_assist_skill:
  - sys_id: "<skill_sys_id>"
  - status: "published"
  - active: true
  - version: "1.0.0"
```

Verify all components are in place:
```
Use SN-Query-Table on sn_now_assist_skill_input:
  - query: skill=<skill_sys_id>^active=true
  - fields: name,type,source,mandatory
  - limit: 20
```

```
Use SN-Query-Table on sn_now_assist_skill_output:
  - query: skill=<skill_sys_id>
  - fields: name,type,display_type
  - limit: 20
```

```
Use SN-Query-Table on sn_now_assist_skill_prompt:
  - query: skill=<skill_sys_id>^active=true
  - fields: name,prompt_type,order
  - limit: 10
```

### Step 10: Monitor Skill Performance

**Query skill execution logs:**
```
Use SN-Query-Table on sn_now_assist_skill_execution:
  - query: skill=<skill_sys_id>^sys_created_on>javascript:gs.daysAgo(7)
  - fields: sys_id,status,execution_time,input_tokens,output_tokens,error_message
  - limit: 50
  - orderBy: sys_created_on
  - orderDirection: desc
```

**Track feedback:**
```
Use SN-Query-Table on sn_now_assist_feedback:
  - query: skill=<skill_sys_id>^rating<3
  - fields: query,response,rating,feedback_text
  - limit: 20
```

**Monitor token usage:**
```
Use SN-Query-Table on sn_now_assist_skill_execution:
  - query: skill=<skill_sys_id>^sys_created_on>javascript:gs.daysAgo(30)
  - fields: input_tokens,output_tokens,execution_time
  - limit: 100
```

## Tool Usage

| Tool | Purpose | When to Use |
|------|---------|-------------|
| SN-Query-Table | Find existing skills, test results, feedback | Discovery and monitoring |
| SN-Create-Record | Create skills, inputs, outputs, prompts, tests | Building skill components |
| SN-Update-Record | Modify prompts, activate skills, version updates | Iteration and deployment |
| SN-Get-Table-Schema | Discover skill table fields | Understanding available configurations |

## Best Practices

1. **Design inputs carefully** -- only include fields that are genuinely needed for the LLM task
2. **Use structured prompt templates** with clear sections and output format specifications
3. **Keep temperature low** for analytical skills (classification, extraction) and moderate for generative skills
4. **Write comprehensive ATF tests** covering edge cases, empty inputs, and expected failure modes
5. **Version your skills** using semantic versioning (major.minor.patch)
6. **Use preprocessing prompts** to extract entities before the main analysis prompt
7. **Set max_tokens appropriately** -- too low truncates output, too high wastes tokens
8. **Include postprocessing** to validate and format LLM output before displaying to users
9. **Monitor token usage** to manage costs and identify optimization opportunities
10. **Iterate on prompts** based on feedback -- small prompt changes can significantly impact quality

## Troubleshooting

| Issue | Cause | Resolution |
|-------|-------|------------|
| Skill not appearing in Now Assist | Status is draft or skill inactive | Publish and activate the skill |
| Inputs not populated | Source field mapping incorrect | Verify source_field and source_table match target record |
| Output format inconsistent | Prompt template lacks explicit format instructions | Add structured output format with examples in prompt |
| ATF test fails intermittently | LLM non-determinism at higher temperatures | Lower temperature or use fuzzy assertions |
| Skill execution timeout | Prompt too large or chained LLM calls too many | Reduce input size, simplify prompt chain |
| Empty output returned | LLM config not linked or inactive | Verify gen_ai_config is active and linked to skill |
| Confidence score always low | Insufficient context in inputs | Add more relevant input fields or knowledge context |
| Prompt injection vulnerability | User input not sanitized | Add input validation in preprocessing step |

## Examples

### Example 1: Incident Summarization Skill

Create a custom skill to summarize incident history:
- **Inputs:** short_description, description, work_notes, comments, state, priority
- **Prompt:** Summarize incident timeline, key actions taken, current status in 3-5 bullet points
- **Outputs:** summary (rich_text), key_dates (text), next_action (text)
- **LLM Config:** Temperature 0.2, max 400 tokens
- **Tests:** Network incident with 10+ work notes, simple incident with minimal notes

### Example 2: Ticket Classification Skill

Create a custom skill for automated ticket categorization:
- **Inputs:** short_description, description, caller_id.department
- **Prompt:** Classify into category/subcategory from predefined taxonomy, return JSON
- **Outputs:** suggested_category (text), suggested_subcategory (text), confidence (badge)
- **LLM Config:** Temperature 0.0, max 200 tokens for deterministic classification
- **Tests:** 10+ test cases covering each category with known correct classifications

### Example 3: Resolution Notes Generator

Create a custom skill to generate resolution documentation:
- **Inputs:** short_description, description, work_notes, close_code, resolved_by
- **Prompt:** Generate professional resolution notes documenting the problem, investigation steps, root cause, and fix applied
- **Outputs:** resolution_notes (rich_text), knowledge_candidate (text), reusable_solution (text)
- **LLM Config:** Temperature 0.4, max 600 tokens for structured but readable output
- **Tests:** Hardware failure, software bug, user error scenarios with expected resolution patterns

## Related Skills

- `genai/now-assist-qa` - Q&A skill configuration that complements custom skills
- `genai/ai-search-rag` - RAG configuration for knowledge-grounded custom skills
- `genai/flow-generation` - Flows that can trigger custom skills as actions
- `genai/playbook-generation` - Playbooks that incorporate custom skill invocations
- `development/atf-testing` - ATF framework for comprehensive skill testing
