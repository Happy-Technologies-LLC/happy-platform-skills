---
name: rpa-bot-generation
version: 1.0.0
description: Generate RPA bots from process descriptions including bot actions, triggers, error handling, credential management, and integration with ServiceNow RPA Hub
author: Happy Technologies LLC
tags: [genai, rpa, automation, bot, process, robotic, rpa-hub, credential, workflow]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp:
    - SN-Query-Table
    - SN-Create-Record
    - SN-Update-Record
    - SN-Read-Record
    - SN-Execute-Background-Script
    - SN-Discover-Table-Schema
  rest:
    - /api/now/table/sn_rpa_bot
    - /api/now/table/sn_rpa_action
    - /api/now/table/sn_rpa_process
    - /api/now/table/sn_rpa_credential
    - /api/now/table/sn_rpa_trigger
    - /api/now/table/sn_rpa_execution
    - /api/now/table/sn_rpa_robot_group
  native:
    - Bash
complexity: advanced
estimated_time: 30-60 minutes
---

# RPA Bot Generation

## Overview

This skill generates Robotic Process Automation (RPA) bots in ServiceNow RPA Hub from natural language process descriptions. It covers:

- Translating business process descriptions into structured bot definitions
- Creating bot actions for UI automation, data extraction, and system interaction
- Configuring triggers to launch bots from ServiceNow workflows, schedules, or events
- Implementing error handling strategies with retry logic, exception capture, and fallback paths
- Managing credentials securely for bot access to target applications
- Organizing bots into robot groups for workload distribution and high availability
- Monitoring bot execution with performance analytics and failure tracking

**When to use:**
- When automating repetitive manual processes identified in process mining
- Building bots to bridge legacy systems that lack APIs
- When ServiceNow Integration Hub spokes are not available for a target application
- Automating data entry, extraction, or validation across desktop applications
- Creating attended bots for agent-assisted automation scenarios

## Prerequisites

- **Roles:** `sn_rpa.admin`, `sn_rpa.designer`, `sn_rpa.operator`, or `admin`
- **Plugins:** `com.sn_rpa` (RPA Hub), `com.sn_rpa.designer` (RPA Desktop Design Studio)
- **Access:** Read/write access to sn_rpa_bot, sn_rpa_action, sn_rpa_process tables
- **Knowledge:** Understanding of RPA concepts (attended vs. unattended bots, selectors, recording), target application UI structure, and your organization's automation governance framework
- **Infrastructure:** RPA robot machines provisioned with ServiceNow RPA agent installed

## Key RPA Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `sn_rpa_bot` | Bot definitions | name, description, state, bot_type, process, version, owner, robot_group |
| `sn_rpa_action` | Individual bot actions/steps | bot, action_type, order, name, target_application, selector, input_data, output_variable, error_handling |
| `sn_rpa_process` | Business process definitions | name, description, category, owner, state, estimated_savings, complexity |
| `sn_rpa_credential` | Credential vault entries | name, application, credential_type, username, vault_id, rotation_policy |
| `sn_rpa_trigger` | Bot execution triggers | bot, trigger_type, schedule, flow, event, condition |
| `sn_rpa_execution` | Bot execution logs | bot, state, start_time, end_time, duration, status, error_message, robot, transactions_processed |
| `sn_rpa_robot_group` | Robot groupings | name, description, robots, max_concurrent, priority |

## Procedure

### Step 1: Analyze the Process Description

Parse the user's process description to identify:
- **Process scope:** What the bot should automate end-to-end
- **Target applications:** Which systems the bot will interact with
- **Input data:** What data the bot needs to start (spreadsheet, record, queue)
- **Actions:** Sequential steps (click, type, read, navigate, extract, validate)
- **Output:** What the bot produces (updated records, reports, confirmations)
- **Exceptions:** Known error scenarios and expected handling

### Step 2: Create the Process Definition

Register the business process in RPA Hub.

**Using MCP (Claude Code/Desktop):**
```
Tool: SN-Create-Record
Parameters:
  table_name: sn_rpa_process
  fields:
    name: "Invoice Data Entry Automation"
    description: "Automates entry of approved invoice data from ServiceNow into the legacy ERP system. Process handles single invoice entry including vendor lookup, line item entry, and approval submission."
    category: finance
    owner: [process_owner_sys_id]
    state: design
    estimated_savings: 2400
    complexity: medium
    manual_steps: 15
    avg_manual_time_minutes: 12
    volume_per_month: 200
```

**Using REST API:**
```bash
POST /api/now/table/sn_rpa_process
Content-Type: application/json

{
  "name": "Invoice Data Entry Automation",
  "description": "Automates entry of approved invoice data from ServiceNow into the legacy ERP system.",
  "category": "finance",
  "owner": "[process_owner_sys_id]",
  "state": "design",
  "estimated_savings": "2400",
  "complexity": "medium"
}
```

### Step 3: Create the Bot Definition

Define the bot linked to the process.

**Using MCP:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sn_rpa_bot
  fields:
    name: "Invoice Entry Bot"
    description: "Unattended bot that enters approved invoices into the legacy ERP system"
    state: draft
    bot_type: unattended
    process: [process_sys_id]
    version: "1.0"
    owner: [bot_owner_sys_id]
    robot_group: [robot_group_sys_id]
    max_retries: 3
    timeout_minutes: 30
```

**Using REST API:**
```bash
POST /api/now/table/sn_rpa_bot
Content-Type: application/json

{
  "name": "Invoice Entry Bot",
  "description": "Unattended bot for legacy ERP invoice entry",
  "state": "draft",
  "bot_type": "unattended",
  "process": "[process_sys_id]",
  "version": "1.0",
  "max_retries": "3",
  "timeout_minutes": "30"
}
```

### Step 4: Define Bot Actions

Create sequential actions that form the bot's workflow.

**Action 1: Open target application:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sn_rpa_action
  fields:
    bot: [bot_sys_id]
    action_type: open_application
    order: 100
    name: "Launch ERP Application"
    target_application: "SAP GUI"
    input_data: '{"executable_path": "C:\\Program Files\\SAP\\SAPgui\\saplogon.exe", "connection": "PRD"}'
    timeout_seconds: 30
    error_handling: retry
    retry_count: 2
```

**Action 2: Login with managed credentials:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sn_rpa_action
  fields:
    bot: [bot_sys_id]
    action_type: credential_login
    order: 200
    name: "Login to ERP"
    credential: [credential_sys_id]
    selector: '{"username_field": "#txtUser", "password_field": "#txtPassword", "login_button": "#btnLogin"}'
    timeout_seconds: 15
    error_handling: fail
    error_message: "ERP login failed - check credentials in vault"
```

**Action 3: Navigate and enter data:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sn_rpa_action
  fields:
    bot: [bot_sys_id]
    action_type: data_entry
    order: 300
    name: "Enter Invoice Header"
    target_application: "SAP GUI"
    input_data: |
      {
        "transaction": "FB60",
        "fields": {
          "vendor": "{invoice.vendor_number}",
          "invoice_date": "{invoice.invoice_date}",
          "posting_date": "{invoice.posting_date}",
          "amount": "{invoice.total_amount}",
          "currency": "{invoice.currency}",
          "reference": "{invoice.sn_number}"
        }
      }
    timeout_seconds: 20
    error_handling: screenshot_and_fail
```

**Action 4: Validate and submit:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sn_rpa_action
  fields:
    bot: [bot_sys_id]
    action_type: validation
    order: 400
    name: "Validate Entry and Submit"
    input_data: |
      {
        "validation_checks": [
          {"field": "status_bar", "expected": "Document posted", "selector": "#statusBar"},
          {"field": "document_number", "not_empty": true, "selector": "#docNumber"}
        ],
        "on_success": "capture_document_number",
        "on_failure": "screenshot_and_rollback"
      }
    output_variable: erp_document_number
    timeout_seconds: 15
```

**Action 5: Update ServiceNow record:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sn_rpa_action
  fields:
    bot: [bot_sys_id]
    action_type: servicenow_update
    order: 500
    name: "Update Invoice Record in ServiceNow"
    input_data: |
      {
        "table": "ap_invoice",
        "sys_id": "{invoice.sys_id}",
        "fields": {
          "erp_reference": "{erp_document_number}",
          "state": "posted",
          "work_notes": "Bot: Invoice posted to ERP. Document: {erp_document_number}"
        }
      }
```

### Step 5: Configure Credential Management

Set up secure credential storage for bot authentication.

**Using MCP:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sn_rpa_credential
  fields:
    name: "ERP Service Account - Invoice Bot"
    application: "SAP ERP"
    credential_type: username_password
    username: svc_rpa_invoice
    vault_id: [credential_vault_id]
    rotation_policy: 90_days
    owner: [security_team_sys_id]
```

### Step 6: Set Up Bot Triggers

Configure when and how the bot executes.

**Using MCP:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sn_rpa_trigger
  fields:
    bot: [bot_sys_id]
    trigger_type: flow
    flow: [flow_sys_id]
    condition: "invoice.state == 'approved' && invoice.erp_reference == ''"
    description: "Trigger bot when invoice is approved and not yet posted to ERP"
    active: true
    priority: normal
```

**Schedule-based trigger:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sn_rpa_trigger
  fields:
    bot: [bot_sys_id]
    trigger_type: schedule
    schedule: "0 */2 * * 1-5"
    description: "Run every 2 hours on weekdays to process queued invoices"
    active: true
    max_batch_size: 50
```

### Step 7: Monitor Bot Execution

Query execution logs for performance and error tracking.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_rpa_execution
  query: bot=[bot_sys_id]^ORDERBYDESCstart_time
  fields: sys_id,bot,state,start_time,end_time,duration,status,error_message,robot,transactions_processed
  limit: 50
```

**Generate execution analytics:**
```
Tool: SN-Execute-Background-Script
Parameters:
  script: |
    var analytics = {
      period: 'Last 30 days',
      total_executions: 0,
      successful: 0,
      failed: 0,
      avg_duration_seconds: 0,
      total_transactions: 0,
      success_rate: 0,
      common_errors: {},
      time_saved_hours: 0
    };

    var ga = new GlideAggregate('sn_rpa_execution');
    ga.addQuery('start_time', '>=', gs.daysAgo(30));
    ga.addAggregate('COUNT');
    ga.addAggregate('AVG', 'duration');
    ga.addAggregate('SUM', 'transactions_processed');
    ga.query();
    if (ga.next()) {
      analytics.total_executions = parseInt(ga.getAggregate('COUNT'));
      analytics.avg_duration_seconds = Math.round(parseFloat(ga.getAggregate('AVG', 'duration')) || 0);
      analytics.total_transactions = parseInt(ga.getAggregate('SUM', 'transactions_processed')) || 0;
    }

    var success = new GlideAggregate('sn_rpa_execution');
    success.addQuery('start_time', '>=', gs.daysAgo(30));
    success.addQuery('status', 'success');
    success.addAggregate('COUNT');
    success.query();
    if (success.next()) {
      analytics.successful = parseInt(success.getAggregate('COUNT'));
      if (analytics.total_executions > 0)
        analytics.success_rate = Math.round((analytics.successful / analytics.total_executions) * 100);
    }
    analytics.failed = analytics.total_executions - analytics.successful;

    // Estimate time saved (12 min manual per transaction)
    analytics.time_saved_hours = Math.round((analytics.total_transactions * 12) / 60);

    gs.info('RPA EXECUTION ANALYTICS:\n' + JSON.stringify(analytics, null, 2));
  description: "RPA: Generate bot execution analytics for last 30 days"
```

## Tool Usage

| Operation | MCP Tool | REST Endpoint |
|-----------|----------|---------------|
| Create Process | SN-Create-Record | POST /api/now/table/sn_rpa_process |
| Create Bot | SN-Create-Record | POST /api/now/table/sn_rpa_bot |
| Create Actions | SN-Create-Record | POST /api/now/table/sn_rpa_action |
| Create Triggers | SN-Create-Record | POST /api/now/table/sn_rpa_trigger |
| Query Executions | SN-Query-Table | GET /api/now/table/sn_rpa_execution |
| Manage Credentials | SN-Create-Record | POST /api/now/table/sn_rpa_credential |
| Analytics | SN-Execute-Background-Script | POST /api/now/table/sys_trigger |

## Best Practices

- **Process First:** Always document the manual process completely before building the bot; poor process understanding is the top cause of bot failure
- **Modular Actions:** Break bots into small, reusable actions; do not create monolithic bots with 100+ steps
- **Error Screenshots:** Configure screenshot capture on failure for every critical action to aid debugging
- **Credential Rotation:** Use the credential vault with automatic rotation; never hardcode passwords in bot definitions
- **Idempotency:** Design bots to be safely re-runnable; check if work is already done before processing
- **Throttling:** Add delays between actions to avoid overwhelming target applications; respect rate limits
- **Robot Groups:** Distribute workload across multiple robots for high-volume processes
- **Monitoring Alerts:** Set up notifications for bot failures, especially for business-critical processes
- **Version Control:** Increment bot versions for every change; maintain rollback capability
- **Human-in-the-Loop:** For high-risk processes (financial, compliance), add human approval steps before final submission

## Troubleshooting

### Bot Fails to Launch Target Application

**Symptom:** First action fails with "application not found" or "timeout"
**Cause:** Robot machine does not have the target application installed, or the path is incorrect
**Solution:** Verify the executable path on the robot machine. Check that the RPA agent service is running. Ensure the robot user has permission to launch the application.

### Selector Not Found Errors

**Symptom:** Bot cannot locate UI elements in the target application
**Cause:** Application UI changed (update, patch, or dynamic element IDs)
**Solution:** Re-record selectors using RPA Desktop Design Studio. Use stable selectors (name, automationId) over dynamic ones (runtime IDs). Add wait conditions before element interactions.

### Credential Vault Access Denied

**Symptom:** Bot cannot retrieve credentials from the vault
**Cause:** Robot service account lacks vault access, or credential record is inactive
**Solution:** Verify the robot's service account has `sn_rpa.credential_user` role. Check that the credential record state is active and assigned to the correct robot group.

### Bot Execution Queue Backlog

**Symptom:** Bot executions are queuing but not starting
**Cause:** All robots in the group are busy, offline, or at max concurrent execution limit
**Solution:** Check robot availability in `sn_rpa_robot_group`. Increase `max_concurrent` if resources allow. Add more robots to the group for horizontal scaling.

## Examples

### Example 1: Employee Onboarding Bot

**Scenario:** Automate new employee account creation across 3 systems

**Process definition:**
- Input: Approved HR onboarding request from ServiceNow
- Step 1: Create Active Directory account
- Step 2: Create email mailbox in Exchange
- Step 3: Provision access in legacy HR system
- Step 4: Update ServiceNow onboarding task as complete

### Example 2: Report Generation Bot

**Scenario:** Generate and distribute weekly compliance reports from legacy system

```
Tool: SN-Create-Record
Parameters:
  table_name: sn_rpa_bot
  fields:
    name: "Weekly Compliance Report Bot"
    description: "Logs into compliance portal, generates report, downloads PDF, attaches to ServiceNow task"
    bot_type: unattended
    state: draft
    version: "1.0"
```

**Trigger:** Scheduled every Monday at 6:00 AM

## Related Skills

- `genai/flow-generation` - Flow Designer for orchestrating RPA with other automation
- `genai/playbook-generation` - Process Automation playbooks that trigger bots
- `genai/spoke-generation` - Integration Hub spokes as API-first alternative to RPA
- `admin/workflow-creation` - Workflow integration with RPA triggers
- `development/scheduled-jobs` - Scheduling bot executions
