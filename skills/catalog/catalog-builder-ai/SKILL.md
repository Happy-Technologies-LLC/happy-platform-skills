---
name: catalog-builder-ai
version: 1.0.0
description: AI-assisted catalog builder that generates catalog items, refines content, configures variables, sets up fulfillment workflows, and manages catalog categories from natural language descriptions
author: Happy Technologies LLC
tags: [catalog, service-catalog, catalog-items, variables, fulfillment, workflows, genai, content-generation]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp:
    - SN-Query-Table
    - SN-Create-Record
    - SN-Update-Record
    - SN-Get-Table-Schema
    - SN-Get-Record
  rest:
    - /api/now/table/sc_cat_item
    - /api/now/table/sc_category
    - /api/now/table/item_option_new
    - /api/now/table/sc_cat_item_category
    - /api/now/table/sc_cat_item_delivery_plan
    - /api/now/table/sc_cat_item_content
    - /api/sn_sc/servicecatalog/items
    - /api/now/table/sys_hub_flow
    - /api/now/table/catalog_ui_policy
    - /api/now/table/catalog_script_client
  native:
    - Bash
complexity: advanced
estimated_time: 30-60 minutes
---

# AI-Assisted Catalog Builder

## Overview

This skill provides an AI-driven approach to building ServiceNow Service Catalog items from natural language descriptions:

- Generating catalog item records with refined titles, descriptions, and metadata from brief user prompts
- Creating and configuring catalog variables (text, reference, select, checkbox, multi-row variable sets)
- Setting up fulfillment workflows using Flow Designer or execution plans
- Configuring catalog UI policies and client scripts for dynamic form behavior
- Organizing items into categories and subcategories
- Generating user-facing content with clear instructions and help text
- Setting up approval rules and pricing configurations

**When to use:** When service owners or catalog administrators need to rapidly create catalog items from business descriptions, or when standardizing catalog item quality through AI-assisted content generation.

## Prerequisites

- **Roles:** `catalog_admin`, `catalog_manager`, or `admin`
- **Plugins:** `com.glideapp.servicecatalog` (Service Catalog), `com.glide.hub.flow_designer` (Flow Designer)
- **Access:** Write access to `sc_cat_item`, `item_option_new`, `sc_category`, `catalog_ui_policy`
- **Knowledge:** Service Catalog concepts, variable types, fulfillment process design
- **Related Skills:** `catalog/item-creation` for manual item creation, `catalog/variable-management` for variable details, `catalog/approval-workflows` for approvals

## Procedure

### Step 1: Parse the Natural Language Request

Analyze the user's description to extract:
- **Service name**: What the catalog item provides
- **Target audience**: Who will request this item (all users, IT staff, managers)
- **Required information**: What data needs to be collected (variables)
- **Fulfillment process**: What happens after submission (approvals, tasks, automation)
- **Cost/pricing**: Whether the item has a price or is free
- **Category placement**: Where the item belongs in the catalog hierarchy

**Example Input:** "Create a catalog item for requesting a new laptop. Users should pick between Mac and Windows, choose a size, provide business justification, and get manager approval. IT should get a task to procure and configure it."

### Step 2: Identify or Create the Catalog Category

**MCP Approach:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sc_category
  query: title=Hardware
  fields: sys_id,title,description,parent,active,icon
  limit: 5
```

If the category does not exist, create it:
```
Tool: SN-Create-Record
Parameters:
  table_name: sc_category
  data:
    title: "Hardware"
    description: "Hardware procurement and provisioning requests"
    parent: "<parent_category_sys_id>"
    active: true
    icon: "fa-laptop"
```

**REST Approach:**
```
GET /api/now/table/sc_category?sysparm_query=title=Hardware&sysparm_fields=sys_id,title,description,parent,active&sysparm_limit=5

POST /api/now/table/sc_category
Body: {
  "title": "Hardware",
  "description": "Hardware procurement and provisioning requests",
  "parent": "<parent_category_sys_id>",
  "active": "true"
}
```

### Step 3: Generate the Catalog Item Record

**MCP Approach:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sc_cat_item
  data:
    name: "New Laptop Request"
    short_description: "Request a new laptop for business use"
    description: |
      <p>Use this form to request a new laptop computer. Available options include
      Mac and Windows configurations in standard and premium tiers.</p>
      <h4>What you will need:</h4>
      <ul>
        <li>Your preferred operating system (Mac or Windows)</li>
        <li>Screen size preference</li>
        <li>Business justification for the request</li>
      </ul>
      <h4>What happens next:</h4>
      <ol>
        <li>Your manager will review and approve the request</li>
        <li>IT Procurement will order the hardware (3-5 business days)</li>
        <li>IT Support will configure and deliver the laptop (1-2 business days)</li>
      </ol>
    category: "<category_sys_id>"
    active: true
    availability: on_desktop_and_mobile
    order: 100
    delivery_time: "5 business days"
    price: "0"
    billable: false
    workflow: "<flow_sys_id>"
```

**REST Approach:**
```
POST /api/now/table/sc_cat_item
Body: {
  "name": "New Laptop Request",
  "short_description": "Request a new laptop for business use",
  "description": "<p>Use this form to request a new laptop...</p>",
  "category": "<category_sys_id>",
  "active": "true",
  "availability": "on_desktop_and_mobile",
  "delivery_time": "5 business days"
}
```

### Step 4: Create Catalog Variables

Generate variables based on the information requirements identified in Step 1.

**Select Box Variable -- Operating System:**

**MCP Approach:**
```
Tool: SN-Create-Record
Parameters:
  table_name: item_option_new
  data:
    cat_item: "<cat_item_sys_id>"
    name: "os_preference"
    question_text: "Operating System"
    type: 3
    mandatory: true
    order: 100
    tooltip: "Select your preferred operating system"
    default_value: ""
    choice_table: ""
    choice_field: ""
```

Then create the choices:
```
Tool: SN-Create-Record
Parameters:
  table_name: question_choice
  data:
    question: "<variable_sys_id>"
    text: "MacOS (MacBook Pro)"
    value: "mac"
    order: 100
```

**Reference Variable -- Cost Center:**
```
Tool: SN-Create-Record
Parameters:
  table_name: item_option_new
  data:
    cat_item: "<cat_item_sys_id>"
    name: "cost_center"
    question_text: "Cost Center"
    type: 8
    mandatory: true
    order: 300
    reference: "cmn_cost_center"
    reference_qual: "active=true"
```

**Multi-Line Text -- Business Justification:**
```
Tool: SN-Create-Record
Parameters:
  table_name: item_option_new
  data:
    cat_item: "<cat_item_sys_id>"
    name: "business_justification"
    question_text: "Business Justification"
    type: 2
    mandatory: true
    order: 400
    tooltip: "Explain why you need this laptop (minimum 50 characters)"
```

**Common variable types reference:**

| Type Code | Type Name | Use Case |
|-----------|-----------|----------|
| 1 | Yes/No | Boolean toggles |
| 2 | Multi-line text | Descriptions, justifications |
| 3 | Multiple choice | Select from predefined options |
| 5 | Select box | Dropdown selection |
| 6 | Single-line text | Short text input |
| 7 | CheckBox | Multi-select toggles |
| 8 | Reference | Link to another table record |
| 9 | Date | Date picker |
| 10 | Date/Time | Date and time picker |
| 14 | IP Address | Network configuration |
| 18 | Lookup select box | Dynamic lookup |
| 20 | Container start | Variable grouping |
| 24 | Masked | Passwords, secrets |

### Step 5: Configure Catalog UI Policies

**MCP Approach:**
```
Tool: SN-Create-Record
Parameters:
  table_name: catalog_ui_policy
  data:
    catalog_item: "<cat_item_sys_id>"
    short_description: "Show accessories when laptop type selected"
    applies_to: "item"
    active: true
    on_load: true
    reverse_if_false: true
    conditions: "os_preference=mac"
    script_false: ""
    script_true: ""
```

### Step 6: Configure Catalog Client Scripts

**MCP Approach:**
```
Tool: SN-Create-Record
Parameters:
  table_name: catalog_script_client
  data:
    cat_item: "<cat_item_sys_id>"
    name: "Validate business justification length"
    type: onSubmit
    active: true
    ui_type: 0
    script: |
      function onSubmit() {
        var justification = g_form.getValue('business_justification');
        if (justification && justification.length < 50) {
          g_form.showFieldMsg('business_justification',
            'Please provide a more detailed justification (at least 50 characters)', 'error');
          return false;
        }
        return true;
      }
```

### Step 7: Set Up the Fulfillment Flow

**MCP Approach:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_hub_flow
  data:
    name: "Laptop Request Fulfillment"
    description: "Handles approval and task creation for laptop requests"
    trigger_type: "SERVICE_CATALOG"
    table: "sc_req_item"
    status: "draft"
    run_as: "system"
```

Then add approval and task creation actions as described in `genai/flow-generation`.

### Step 8: Link Fulfillment Flow to Catalog Item

**MCP Approach:**
```
Tool: SN-Update-Record
Parameters:
  table_name: sc_cat_item
  sys_id: "<cat_item_sys_id>"
  data:
    workflow: "<flow_sys_id>"
```

**REST Approach:**
```
PATCH /api/now/table/sc_cat_item/<cat_item_sys_id>
Body: {
  "workflow": "<flow_sys_id>"
}
```

### Step 9: Refine Content with AI

Enhance the generated catalog item content:

1. **Title optimization**: Make it action-oriented ("Request a New Laptop" vs "Laptop")
2. **Description enrichment**: Add clear expectations, timeline, and requirements
3. **Variable help text**: Generate contextual tooltip text for each variable
4. **Confirmation message**: Create a post-submission confirmation message

**MCP Approach:**
```
Tool: SN-Update-Record
Parameters:
  table_name: sc_cat_item
  sys_id: "<cat_item_sys_id>"
  data:
    sc_template: |
      Thank you for your laptop request. Your order {{number}} has been submitted.
      Expected delivery: {{delivery_time}}.
      Your manager will be notified for approval shortly.
```

### Step 10: Validate and Publish

Verify the complete catalog item configuration:

**MCP Approach:**
```
Tool: SN-Query-Table
Parameters:
  table_name: item_option_new
  query: cat_item=<cat_item_sys_id>^ORDERBYorder
  fields: name,question_text,type,mandatory,order,active
  limit: 50
```

Check for completeness:
- All required variables present and correctly typed
- UI policies configured for conditional logic
- Fulfillment flow linked and published
- Category assignment correct
- Item set to active

## Tool Usage

| Tool | Purpose | When to Use |
|------|---------|-------------|
| SN-Query-Table | Find categories, existing items, variable patterns | Discovery and validation |
| SN-Create-Record | Create items, variables, UI policies, flows | Building catalog components |
| SN-Update-Record | Refine content, link flows, activate items | Iteration and publishing |
| SN-Get-Table-Schema | Discover variable types and field options | Understanding available configurations |
| SN-Get-Record | Retrieve single item or variable details | Detailed inspection |

## Best Practices

1. **Use action-oriented item names** -- "Request a New Laptop" is clearer than "Laptop"
2. **Write descriptions for end users** -- avoid technical jargon, explain the process
3. **Set delivery time expectations** -- always provide realistic fulfillment timelines
4. **Make only essential fields mandatory** -- too many mandatory fields reduce adoption
5. **Group related variables** using container start/end for visual organization
6. **Add help text to every variable** -- reduce support tickets with clear guidance
7. **Test the ordering experience** -- impersonate an end user to verify the flow
8. **Use reference qualifiers** to limit reference variable results to relevant records
9. **Configure mobile availability** when appropriate for field workers
10. **Create in a scoped update set** before modifying production catalog

## Troubleshooting

| Issue | Cause | Resolution |
|-------|-------|------------|
| Item not visible in catalog | Inactive or missing category assignment | Check `active=true` and `sc_cat_item_category` records |
| Variables not showing on form | Wrong `cat_item` reference or inactive | Verify variable's `cat_item` matches item sys_id |
| Fulfillment flow not triggering | Flow not linked or in draft status | Update `sc_cat_item.workflow` and publish the flow |
| UI policy not applying | Condition syntax error or wrong scope | Test conditions manually, verify `applies_to` field |
| Variable choices missing | Choices linked to wrong question | Verify `question_choice.question` references correct variable |
| Price not displaying | `price` field format incorrect | Use decimal format: "1299.99" |

## Examples

### Example 1: Software License Request

**Input:** "Create a catalog item for requesting software licenses. Users pick the software from a list, enter the number of licenses, provide justification, and it needs director approval for items over $500."

**Generated components:** Catalog item with reference variable to `u_software_catalog`, integer variable for quantity, multi-line text for justification, conditional approval flow based on calculated cost.

### Example 2: New Hire Onboarding Bundle

**Input:** "Build a catalog item for new hire onboarding. HR fills in the start date, department, manager, required equipment, and building access. It should create tasks for IT, Facilities, and HR."

**Generated components:** Catalog item with date, reference (department, manager), multi-checkbox (equipment), and select box (building) variables. Fulfillment flow creates parallel tasks for three groups.

### Example 3: Conference Room Booking

**Input:** "Make a catalog item for booking conference rooms with date, time, room selection, attendee count, and AV requirements."

**Generated components:** Catalog item with date/time variables, reference to `cmn_location` with room qualifier, integer for attendees, checkbox group for AV options (projector, video conferencing, whiteboard).

## Related Skills

- `catalog/item-creation` - Manual catalog item creation patterns
- `catalog/variable-management` - Detailed variable configuration
- `catalog/approval-workflows` - Approval rule configuration
- `catalog/request-fulfillment` - Fulfillment process design
- `genai/flow-generation` - Flow Designer automation for fulfillment
- `catalog/ui-policies` - Catalog form dynamic behavior
