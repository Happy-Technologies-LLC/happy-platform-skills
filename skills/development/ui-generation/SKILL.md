---
name: ui-generation
version: 1.0.0
description: Generate ServiceNow UI components from natural language descriptions including client scripts, data binding, event handlers, UI pages, UI macros, and experience pages for Service Portal and UI Builder
author: Happy Technologies LLC
tags: [development, ui, client-scripts, data-binding, event-handlers, experience-pages, service-portal, widgets, genai]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp:
    - SN-Query-Table
    - SN-Create-Record
    - SN-Update-Record
    - SN-Get-Table-Schema
  rest:
    - /api/now/table/sys_ui_page
    - /api/now/table/sys_ui_script
    - /api/now/table/sys_script_client
    - /api/now/table/sys_ui_macro
    - /api/now/table/sp_widget
    - /api/now/table/sp_instance
    - /api/now/table/sys_ux_page_registry
    - /api/now/table/sys_ux_data_broker_transform
    - /api/now/table/sys_ux_event
  native:
    - Bash
complexity: advanced
estimated_time: 20-45 minutes
---

# UI Generation from Natural Language

## Overview

This skill covers generating ServiceNow UI components from natural language descriptions:

- Creating client scripts (onChange, onLoad, onSubmit, onCellEdit) for forms and lists
- Building data binding configurations for UI Builder and Service Portal widgets
- Generating event handler logic for user interactions
- Creating UI Pages with Jelly/HTML templates and processing scripts
- Building Service Portal widgets with AngularJS controllers and HTML templates
- Generating UI Builder experience pages with data resources and event mappings
- Producing UI macros for reusable form decorations and formatters

**When to use:** When developers or citizen developers need to create UI components from business requirements described in plain language, or when rapidly prototyping form behaviors, portal widgets, or workspace pages.

## Prerequisites

- **Roles:** `admin`, `personalize_form`, or `sp_admin` (for Service Portal widgets)
- **Plugins:** `com.glide.ui.ui_page` (UI Pages), `com.glide.service-portal` (Service Portal), `com.sn_ui_builder` (UI Builder)
- **Access:** Write access to `sys_script_client`, `sys_ui_page`, `sp_widget`, `sys_ux_page_registry` tables
- **Knowledge:** JavaScript fundamentals, GlideForm API, AngularJS basics (for Service Portal), UI Builder concepts
- **Related Skills:** `development/client-scripts` for client script patterns, `catalog/ui-policies` for catalog form behavior

## Procedure

### Step 1: Parse the Natural Language Description

Analyze the user request to identify:
- **Component type**: Client script, UI page, Service Portal widget, UI Builder page, UI macro
- **Target table/form**: Which table or form the component applies to
- **Behavior**: What should happen (show/hide fields, validate data, fetch records, render UI)
- **Trigger**: What event initiates the behavior (field change, form load, button click, page load)
- **Data dependencies**: What data the component needs to read or write

### Step 2: Query Existing Components for Patterns

**MCP Approach:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_script_client
  query: table=incident^active=true^typeLIKEonChange
  fields: sys_id,name,table,type,field_name,script,active,ui_type
  limit: 10
```

**REST Approach:**
```
GET /api/now/table/sys_script_client
  ?sysparm_query=table=incident^active=true^typeLIKEonChange
  &sysparm_fields=sys_id,name,table,type,field_name,script,active,ui_type
  &sysparm_limit=10
```

### Step 3: Generate Client Scripts

Translate natural language to GlideForm API calls. Common patterns:

**onChange -- Show/Hide Fields:**

**MCP Approach:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_script_client
  data:
    name: "Show VPN fields when category is Network"
    table: incident
    type: onChange
    field_name: category
    ui_type: 0
    active: true
    script: |
      function onChange(control, oldValue, newValue, isLoading) {
        if (isLoading) return;
        var isNetwork = (newValue == 'network');
        g_form.setVisible('u_vpn_type', isNetwork);
        g_form.setVisible('u_network_segment', isNetwork);
        if (isNetwork) {
          g_form.setMandatory('u_vpn_type', true);
        } else {
          g_form.setMandatory('u_vpn_type', false);
        }
      }
```

**REST Approach:**
```
POST /api/now/table/sys_script_client
Body: {
  "name": "Show VPN fields when category is Network",
  "table": "incident",
  "type": "onChange",
  "field_name": "category",
  "ui_type": "0",
  "active": "true",
  "script": "function onChange(control, oldValue, newValue, isLoading) { ... }"
}
```

### Step 4: Generate onLoad Scripts for Form Initialization

**MCP Approach:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_script_client
  data:
    name: "Initialize priority banner on form load"
    table: incident
    type: onLoad
    ui_type: 0
    active: true
    script: |
      function onLoad() {
        var priority = g_form.getValue('priority');
        if (priority == '1') {
          g_form.showFieldMsg('priority', 'Critical incident - follow P1 procedures', 'error');
          g_form.setReadOnly('category', true);
          g_form.setReadOnly('subcategory', true);
        }
      }
```

### Step 5: Generate onSubmit Validation Scripts

**MCP Approach:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_script_client
  data:
    name: "Validate resolution notes before close"
    table: incident
    type: onSubmit
    ui_type: 0
    active: true
    script: |
      function onSubmit() {
        var state = g_form.getValue('state');
        if (state == '6') {
          var resolution = g_form.getValue('close_notes');
          if (!resolution || resolution.trim().length < 20) {
            g_form.showFieldMsg('close_notes', 'Resolution notes must be at least 20 characters', 'error');
            return false;
          }
        }
        return true;
      }
```

### Step 6: Generate Service Portal Widgets

**MCP Approach:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sp_widget
  data:
    name: "Team Incident Dashboard"
    id: "team-incident-dashboard"
    template: |
      <div class="panel panel-default">
        <div class="panel-heading"><h3>{{c.data.title}}</h3></div>
        <div class="panel-body">
          <div ng-repeat="inc in c.data.incidents track by inc.sys_id">
            <div class="alert alert-{{inc.priorityClass}}">
              <strong>{{inc.number}}</strong> - {{inc.short_description}}
              <span class="pull-right badge">{{inc.state}}</span>
            </div>
          </div>
          <p ng-if="c.data.incidents.length === 0">No open incidents.</p>
        </div>
      </div>
    client_script: |
      api.controller = function($scope) {
        var c = this;
      };
    server_script: |
      (function() {
        data.title = "My Team's Open Incidents";
        var gr = new GlideRecord('incident');
        gr.addQuery('assignment_group', gs.getUser().getMyGroups());
        gr.addActiveQuery();
        gr.orderByDesc('priority');
        gr.setLimit(20);
        gr.query();
        data.incidents = [];
        while (gr.next()) {
          data.incidents.push({
            sys_id: gr.getUniqueValue(),
            number: gr.getValue('number'),
            short_description: gr.getValue('short_description'),
            state: gr.getDisplayValue('state'),
            priority: gr.getValue('priority'),
            priorityClass: {'1':'danger','2':'warning','3':'info','4':'success'}[gr.getValue('priority')] || 'default'
          });
        }
      })();
```

**REST Approach:**
```
POST /api/now/table/sp_widget
Body: {
  "name": "Team Incident Dashboard",
  "id": "team-incident-dashboard",
  "template": "<div class='panel panel-default'>...</div>",
  "client_script": "api.controller = function($scope) { var c = this; };",
  "server_script": "(function() { ... })();"
}
```

### Step 7: Generate UI Builder Experience Pages

**MCP Approach:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_ux_page_registry
  data:
    title: "Executive Incident Overview"
    path: /executive-incident-overview
    description: "Executive dashboard showing incident metrics and trends"
    category: workspace
    active: true
```

Configure data resources for the page:
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_ux_data_broker_transform
  data:
    name: "Incident Metrics Data Resource"
    page: "<page_sys_id>"
    table: incident
    query: "active=true^priority<=2"
    fields: "number,short_description,priority,state,assigned_to,sys_created_on"
    max_rows: 50
```

### Step 8: Generate Event Handlers

Configure UI Builder event-to-action mappings:

**MCP Approach:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_ux_event
  data:
    name: "Row Click Navigate to Record"
    page: "<page_sys_id>"
    component: "<component_sys_id>"
    event_name: "click"
    action_type: "navigate"
    action_config: {
      "route": "/record/incident/${sys_id}",
      "target": "_self"
    }
```

### Step 9: Generate UI Macros for Form Decorations

**MCP Approach:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_ui_macro
  data:
    name: "sla_countdown_banner"
    description: "Displays a countdown timer for SLA breach on incident form"
    xml: |
      <?xml version="1.0" encoding="utf-8"?>
      <j:jelly trim="false" xmlns:j="jelly:core" xmlns:g="glide">
        <g:evaluate var="jvar_sla_info" expression="
          var sla = new GlideRecord('task_sla');
          sla.addQuery('task', current.sys_id);
          sla.addQuery('has_breached', false);
          sla.addActiveQuery();
          sla.orderBy('planned_end_time');
          sla.setLimit(1);
          sla.query();
          sla.next() ? sla.getDisplayValue('planned_end_time') : 'N/A';
        "/>
        <div style="background:#fff3cd;padding:10px;border-radius:4px;margin-bottom:10px;">
          <strong>SLA Target:</strong> ${jvar_sla_info}
        </div>
      </j:jelly>
```

### Step 10: Validate and Test Generated Components

**MCP Approach:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_script_client
  query: sys_id=<created_sys_id>
  fields: sys_id,name,table,type,active,sys_updated_on
  limit: 1
```

Verify no script syntax errors by checking the `sys_update_xml` table for recent update records:
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_update_xml
  query: name=sys_script_client_<sys_id>^ORDERBYDESCsys_created_on
  fields: sys_id,name,action,sys_created_on
  limit: 1
```

## Tool Usage

| Tool | Purpose | When to Use |
|------|---------|-------------|
| SN-Query-Table | Find existing UI components for patterns | Pattern discovery, validation |
| SN-Create-Record | Create client scripts, widgets, UI pages | Building new UI components |
| SN-Update-Record | Modify scripts, templates, configurations | Iterating on generated components |
| SN-Get-Table-Schema | Discover field names for data binding | Understanding form fields and data model |

## Best Practices

1. **Always set `ui_type` correctly** -- use `0` for Desktop, `1` for Mobile/Service Portal, `2` for Both
2. **Use `g_form` API methods** rather than direct DOM manipulation for client scripts
3. **Minimize server calls** in client scripts -- use GlideAjax for async server lookups
4. **Scope client scripts appropriately** -- avoid global scope pollution with IIFEs
5. **Test on multiple browsers** -- avoid browser-specific JavaScript features
6. **Include null checks** in all generated onChange handlers for empty field values
7. **Use `isLoading` guard** in onChange scripts to prevent execution during form load
8. **Set widgets to read-only** during server calls to prevent double-submission
9. **Follow accessibility standards** -- include ARIA labels and keyboard navigation in custom widgets
10. **Version control** -- always associate UI components with an update set before creation

## Troubleshooting

| Issue | Cause | Resolution |
|-------|-------|------------|
| Client script not firing | Wrong `type` or `field_name` value | Verify type matches event and field_name matches column name |
| g_form undefined error | Script running outside form context | Ensure script is attached to correct table and ui_type |
| Widget data not loading | Server script GlideRecord query error | Check table permissions and query syntax in server script |
| UI page blank | Jelly syntax error in XML | Validate XML structure and check for unescaped characters |
| Event handler not responding | Component ID mismatch | Verify component sys_id in event configuration |
| Form fields not hiding | Field name vs label mismatch | Use column name (e.g., `u_vpn_type`) not label |

## Examples

### Example 1: Natural Language to Client Script

**Input:** "When someone selects 'Hardware' as the category on the incident form, make the model and serial number fields mandatory and show a message to fill them in."

**Generated:** onChange client script on `incident.category` that calls `g_form.setMandatory()` and `g_form.showFieldMsg()` for `u_model` and `u_serial_number` when `newValue == 'hardware'`.

### Example 2: Natural Language to Service Portal Widget

**Input:** "Create a widget that shows the logged-in user's open requests with status bars showing percentage complete."

**Generated:** Service Portal widget with server script querying `sc_req_item` for the current user, client-side AngularJS rendering with Bootstrap progress bars, and click-to-navigate functionality.

### Example 3: Natural Language to UI Builder Page

**Input:** "Build a workspace page that shows a chart of incidents by priority and a list of my team's open incidents below it."

**Generated:** UI Builder page registration with two data resources (aggregation for chart, list for table), a bar chart component bound to priority aggregation, and a data table component with row-click navigation.

## Related Skills

- `development/client-scripts` - In-depth client script development patterns
- `development/ui-actions` - UI action buttons and links
- `catalog/ui-policies` - Catalog-specific UI policies
- `development/scripted-rest-apis` - Backend APIs for widget data
- `genai/flow-generation` - Flow Designer automation for UI-triggered processes
