---
name: kb-generation
version: 1.0.0
description: Generate field service knowledge articles from completed work orders including repair procedures, parts lists, safety notes, and troubleshooting guides
author: Happy Technologies LLC
tags: [fsm, knowledge, work-order, repair, parts, safety, troubleshooting, field-service, kb]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp:
    - SN-Query-Table
    - SN-Create-Record
    - SN-Read-Record
    - SN-NL-Search
  rest:
    - /api/now/table/wm_order
    - /api/now/table/wm_task
    - /api/now/table/kb_knowledge
    - /api/now/table/kb_knowledge_base
    - /api/now/table/kb_category
    - /api/now/table/alm_asset
    - /api/now/table/cmdb_ci
    - /api/now/table/wm_parts_request
    - /api/now/table/sys_journal_field
  native:
    - Bash
complexity: intermediate
estimated_time: 20-40 minutes
---

# Field Service Knowledge Article Generation

## Overview

This skill covers generating knowledge base articles from completed field service work orders:

- Extracting repair procedures from work order tasks and technician notes
- Compiling parts lists with part numbers, quantities, and sourcing information
- Documenting safety precautions and compliance requirements for specific equipment types
- Creating troubleshooting decision trees from resolution patterns across similar work orders
- Generating equipment-specific maintenance guides from recurring work order data
- Publishing articles to the appropriate knowledge base with proper categorization

**When to use:** When a work order reveals a reusable repair procedure, when recurring equipment issues suggest a knowledge gap, when onboarding new field technicians, or when field service managers want to standardize procedures across the team.

## Prerequisites

- **Roles:** `knowledge_manager`, `knowledge_admin`, `wm_admin`, or `admin`
- **Plugins:** `com.snc.work_management` (FSM), `com.glideapp.knowledge` (Knowledge Management)
- **Access:** Read access to `wm_order`, `wm_task`, `wm_parts_request`, `alm_asset`; Write access to `kb_knowledge`
- **Data:** Completed work orders with populated work notes and task details
- **Related Skills:** `knowledge/article-generation` for general KB article creation, `fsm/work-order-summarization` for work order data extraction

## Procedure

### Step 1: Identify Source Work Orders

Find completed work orders with rich resolution data suitable for knowledge capture.

**MCP Approach:**
```
Tool: SN-Query-Table
Parameters:
  table_name: wm_order
  query: state=closed^close_code=resolved^sys_updated_on>=javascript:gs.daysAgo(30)^ORDERBYDESCsys_updated_on
  fields: sys_id,number,short_description,category,subcategory,cmdb_ci,asset,close_notes,assignment_group,closed_at
  limit: 50
```

**REST Approach:**
```
GET /api/now/table/wm_order
  ?sysparm_query=state=closed^close_code=resolved^sys_updated_on>=javascript:gs.daysAgo(30)^ORDERBYDESCsys_updated_on
  &sysparm_fields=sys_id,number,short_description,category,subcategory,cmdb_ci,asset,close_notes,assignment_group,closed_at
  &sysparm_limit=50
  &sysparm_display_value=true
```

**Selection Criteria for KB-Worthy Work Orders:**

| Criteria | Why It Matters |
|----------|---------------|
| Complex resolution (>2 tasks) | Multi-step procedures benefit from documentation |
| Recurring issue (>3 similar WOs) | Pattern indicates knowledge gap |
| Specialized equipment | Uncommon repairs need documented expertise |
| Safety-critical work | Safety procedures must be formally documented |
| New technician performed | Training opportunity; capture while fresh |

### Step 2: Extract Work Order Task Details

Pull the task-level detail that forms the basis of the repair procedure.

**MCP Approach:**
```
Tool: SN-Query-Table
Parameters:
  table_name: wm_task
  query: work_order=[WO_SYS_ID]^ORDERBYsequence
  fields: sys_id,number,short_description,description,state,assigned_to,actual_work_duration,close_notes,sequence
  limit: 20
```

**REST Approach:**
```
GET /api/now/table/wm_task
  ?sysparm_query=work_order=[WO_SYS_ID]^ORDERBYsequence
  &sysparm_fields=sys_id,number,short_description,description,state,assigned_to,actual_work_duration,close_notes,sequence
  &sysparm_display_value=true
```

### Step 3: Extract Technician Notes

Retrieve work notes containing the technician's observations and actions.

**MCP Approach:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_journal_field
  query: element_id=[WO_SYS_ID]^element=work_notes^ORDERBYsys_created_on
  fields: value,sys_created_on,sys_created_by
  limit: 30
```

Also retrieve task-level notes:
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_journal_field
  query: element_id=[TASK_SYS_ID]^element=work_notes^ORDERBYsys_created_on
  fields: value,sys_created_on,sys_created_by
  limit: 20
```

### Step 4: Retrieve Parts Information

Compile the parts used in the repair.

**MCP Approach:**
```
Tool: SN-Query-Table
Parameters:
  table_name: wm_parts_request
  query: work_order_task.work_order=[WO_SYS_ID]
  fields: sys_id,part,part_number,quantity_requested,quantity_received,state,stockroom
  limit: 30
```

**REST Approach:**
```
GET /api/now/table/wm_parts_request
  ?sysparm_query=work_order_task.work_order=[WO_SYS_ID]
  &sysparm_fields=sys_id,part,part_number,quantity_requested,quantity_received,state,stockroom
  &sysparm_display_value=true
```

### Step 5: Retrieve Asset and Equipment Details

Get the equipment specifications relevant to the repair.

**MCP Approach:**
```
Tool: SN-Read-Record
Parameters:
  table_name: alm_asset
  sys_id: [ASSET_SYS_ID]
  fields: sys_id,display_name,model,model_category,serial_number,manufacturer,asset_tag,location,warranty_expiration
```

```
Tool: SN-Read-Record
Parameters:
  table_name: cmdb_ci
  sys_id: [CI_SYS_ID]
  fields: sys_id,name,sys_class_name,manufacturer,model_id,operational_status,maintenance_schedule
```

### Step 6: Find Similar Work Orders for Pattern Enrichment

Look for related work orders to enrich the knowledge article with additional context.

**MCP Approach:**
```
Tool: SN-Query-Table
Parameters:
  table_name: wm_order
  query: state=closed^cmdb_ci=[CI_SYS_ID]^sys_id!=[CURRENT_WO_SYS_ID]
  fields: sys_id,number,short_description,close_notes,category
  limit: 10
```

```
Tool: SN-NL-Search
Parameters:
  query: "[equipment type] repair [symptom description]"
  table: wm_order
  fields: number,short_description,close_notes
```

### Step 7: Identify the Target Knowledge Base and Category

Find the appropriate knowledge base and category for the article.

**MCP Approach:**
```
Tool: SN-Query-Table
Parameters:
  table_name: kb_knowledge_base
  query: active=true^titleLIKEfield service
  fields: sys_id,title,description,owner
  limit: 5
```

```
Tool: SN-Query-Table
Parameters:
  table_name: kb_category
  query: kb_knowledge_base=[KB_BASE_SYS_ID]^active=true
  fields: sys_id,label,parent_id,full_category
  limit: 50
```

### Step 8: Generate the Knowledge Article

Compose the article with structured sections.

**MCP Approach:**
```
Tool: SN-Create-Record
Parameters:
  table_name: kb_knowledge
  data:
    kb_knowledge_base: [KB_BASE_SYS_ID]
    kb_category: [CATEGORY_SYS_ID]
    short_description: "Repair Procedure: [Equipment Model] - [Issue Description]"
    article_type: "text"
    workflow_state: "draft"
    text: |
      <h2>Overview</h2>
      <p>This article documents the repair procedure for [issue description] on [equipment model/type]. Procedure derived from work order [WO number] completed on [date].</p>

      <h3>Applies To</h3>
      <ul>
        <li>Equipment: [model name and number]</li>
        <li>Manufacturer: [manufacturer]</li>
        <li>Category: [equipment category]</li>
        <li>Serial Number Range: [if applicable]</li>
      </ul>

      <h3>Symptoms</h3>
      <ul>
        <li>[Symptom 1 reported by customer or detected by technician]</li>
        <li>[Symptom 2]</li>
        <li>[Symptom 3]</li>
      </ul>

      <h2>Safety Precautions</h2>
      <div style="border: 2px solid red; padding: 10px; margin: 10px 0;">
        <strong>WARNING:</strong>
        <ul>
          <li>[Safety precaution 1 - e.g., Disconnect power before servicing]</li>
          <li>[Safety precaution 2 - e.g., Wear appropriate PPE]</li>
          <li>[Lockout/Tagout requirements if applicable]</li>
          <li>[Environmental considerations]</li>
        </ul>
        <p>Required PPE: [list of personal protective equipment]</p>
      </div>

      <h2>Tools Required</h2>
      <ul>
        <li>[Tool 1]</li>
        <li>[Tool 2]</li>
        <li>[Specialized equipment if needed]</li>
      </ul>

      <h2>Parts Required</h2>
      <table>
        <tr><th>Part</th><th>Part Number</th><th>Quantity</th><th>Source</th></tr>
        <tr><td>[Part name]</td><td>[Part #]</td><td>[Qty]</td><td>[Stockroom/Vendor]</td></tr>
      </table>

      <h2>Repair Procedure</h2>
      <ol>
        <li><strong>[Step from Task 1]:</strong> [Detailed instruction from technician notes]</li>
        <li><strong>[Step from Task 2]:</strong> [Detailed instruction]</li>
        <li><strong>[Step from Task 3]:</strong> [Detailed instruction]</li>
        <li><strong>Verification:</strong> [How to verify the repair was successful]</li>
      </ol>

      <h2>Troubleshooting</h2>
      <table>
        <tr><th>Symptom</th><th>Possible Cause</th><th>Resolution</th></tr>
        <tr><td>[Symptom]</td><td>[Cause]</td><td>[Fix]</td></tr>
      </table>

      <h2>Estimated Time</h2>
      <p>Total repair time: [actual_work_duration from WO]</p>
      <ul>
        <li>Diagnosis: [time]</li>
        <li>Repair: [time]</li>
        <li>Testing: [time]</li>
      </ul>

      <h2>References</h2>
      <ul>
        <li>Source Work Order: [WO number]</li>
        <li>Technician: [assigned_to]</li>
        <li>Date Performed: [date]</li>
        <li>Related Work Orders: [list]</li>
      </ul>
    author: [CURRENT_USER]
    valid_to: "2027-03-19"
```

### Step 9: Add Keywords and Metadata

Enhance discoverability with keywords and meta information.

**MCP Approach:**
```
Tool: SN-Update-Record
Parameters:
  table_name: kb_knowledge
  sys_id: [KB_ARTICLE_SYS_ID]
  data:
    meta: "[equipment model], [manufacturer], [issue type], [repair type], field service, [category]"
    roles: "wm_agent,wm_dispatcher,wm_admin"
```

### Step 10: Submit for Review and Publication

Submit the article for knowledge manager review.

**MCP Approach:**
```
Tool: SN-Update-Record
Parameters:
  table_name: kb_knowledge
  sys_id: [KB_ARTICLE_SYS_ID]
  data:
    workflow_state: "review"
    work_notes: "Auto-generated from work order [WO number]. Please review procedure accuracy, safety notes, and parts list before publishing."
```

## Tool Usage

| Tool | Purpose | When to Use |
|------|---------|-------------|
| SN-Query-Table | Extract work order, task, parts, and journal data | Data collection from source WOs |
| SN-Create-Record | Create the knowledge article | Article generation |
| SN-Read-Record | Get specific asset or equipment details | Equipment specification lookup |
| SN-NL-Search | Find similar work orders and existing KB articles | Pattern discovery and deduplication |

## Best Practices

1. **Always include safety precautions** -- field service work may involve hazardous conditions
2. **Use actual technician language** -- preserve practical terminology from work notes
3. **Include photos/diagrams** -- reference attachment sys_ids from work orders when available
4. **Add estimated times** -- use actual durations from completed work orders
5. **Cross-reference related articles** -- link to related equipment or procedure articles
6. **Set review cycles** -- articles should be reviewed annually or after significant procedure changes
7. **Include part alternatives** -- note substitute parts when original parts are discontinued
8. **Document failure modes** -- capture what went wrong and how it was diagnosed
9. **Tag equipment models** -- ensure articles are findable by equipment model and manufacturer
10. **Start with draft status** -- always submit for review before publishing

## Troubleshooting

| Issue | Cause | Resolution |
|-------|-------|------------|
| Work notes are empty | Technicians not documenting their work | Extract from close_notes or task descriptions instead; coach technicians on note-taking |
| Parts data incomplete | Parts not tracked through wm_parts_request | Check task work notes for manually documented parts; query alm_consumable |
| Duplicate article created | Similar article already exists | Search KB before creating; use NL-Search to find existing coverage |
| Article too technical | Target audience is junior technicians | Simplify language; add prerequisite skill notes; include glossary |
| Safety notes missing | Source WO did not document safety | Add standard safety notes based on equipment category; consult safety manual |
| Equipment model not found | Asset record incomplete | Look up manufacturer documentation; use CI record as fallback |

## Examples

### Example 1: HVAC Compressor Replacement

**Source:** Work order WO0056789 - HVAC compressor failure at Building A.

```
KB Article: Repair Procedure: Carrier 50XC - Compressor Replacement
Category: HVAC > Compressor

SAFETY: Disconnect power, recover refrigerant per EPA regulations,
wear safety glasses and gloves.

PARTS: 1x Compressor (P/N: 06DA8186), 1x Contactor (P/N: HN52KD024),
Refrigerant R-410A (5 lbs)

PROCEDURE:
1. Recover refrigerant using approved recovery unit
2. Disconnect electrical connections and tag wires
3. Disconnect refrigerant lines (suction and discharge)
4. Remove mounting bolts and extract compressor
5. Install new compressor with new mounting grommets
6. Reconnect refrigerant lines with new copper fittings
7. Reconnect electrical per wiring diagram
8. Evacuate system to 500 microns
9. Charge with R-410A per manufacturer spec
10. Run test cycle and verify superheat/subcool readings

EST. TIME: 4 hours
```

### Example 2: Elevator Door Sensor Repair

**Source:** Multiple work orders for elevator door sensor issues.

```
KB Article: Troubleshooting Guide: Otis Gen2 - Door Sensor Faults
Category: Elevator > Door Systems

TROUBLESHOOTING DECISION TREE:
1. Door not opening -> Check door operator power -> Replace fuse / reset breaker
2. Door opens partially -> Check obstruction sensor alignment -> Realign sensors
3. Door reverses immediately -> Clean sensor lenses -> Replace if cleaning fails
4. Intermittent door faults -> Check wiring harness for damage -> Repair/replace harness

PARTS: Door sensor assembly (P/N: GAA24350BD11), Sensor lens kit (P/N: DCD-500)
```

## Related Skills

- `knowledge/article-generation` - General knowledge article creation
- `fsm/work-order-summarization` - Summarize work order data
- `knowledge/gap-analysis` - Identify knowledge base gaps
- `knowledge/duplicate-detection` - Detect duplicate articles
- `knowledge/content-recommendation` - Recommend related content
