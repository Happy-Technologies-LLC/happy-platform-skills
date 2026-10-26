---
name: automated-testing
version: 1.1.0
description: Comprehensive Automated Test Framework (ATF) guide for creating, managing, and executing automated tests in ServiceNow
author: Happy Technologies LLC
tags: [development, testing, atf, automation, quality, tdd, ci-cd]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp:
    - SN-Create-Record
    - SN-Query-Table
    - SN-Update-Record
    - SN-Execute-Background-Script
    - SN-Get-Table-Schema
    - SN-Run-ATF-Test
    - SN-Run-ATF-Suite
    - SN-Get-CICD-Progress
    - SN-Get-ATF-Results
    - SN-Get-ATF-Test-Logs
  rest:
    - /api/now/table/sys_atf_test
    - /api/now/table/sys_atf_test_suite
    - /api/now/table/sys_atf_step
    - /api/now/table/sys_atf_test_result
    - /api/now/table/sys_atf_step_config
    - /api/sn_cicd/tests/run_test
    - /api/sn_cicd/testsuite/run
    - /api/sn_cicd/progress/{progress_id}
    - /api/sn_cicd/tests/test/results/{result_id}
    - /api/sn_cicd/tests/test/results/{result_id}/logs
    - /api/sn_cicd/testsuite/results/{result_id}
  native:
    - Bash
    - Read
complexity: advanced
estimated_time: 30-60 minutes
---

# Automated Test Framework (ATF)

## Overview

The Automated Test Framework (ATF) is ServiceNow's native testing solution for validating platform functionality. This skill covers:

- Creating test suites and organizing tests
- Building tests with various step types (Server, Client, UI)
- Writing assertions and validations
- Managing test data setup and cleanup
- Implementing parameterized tests
- Running tests and suites with the ATF tools (CI/CD REST API) and reading results and logs
- Analyzing test results and failures
- Integrating ATF with CI/CD pipelines
- Best practices for maintainable, reliable tests

**When to use:** Before deploying changes to production, during development (TDD), after upgrades, and as part of regression testing.

**Who should use this:** Developers, QA engineers, and administrators who need to ensure platform reliability.

## Prerequisites

- **Roles:** `atf_test_admin` (full access) or `atf_test_designer` (create/edit tests)
- **Plugins:** Automated Test Framework (com.snc.automated_testing); CI/CD REST API (`com.glide.continuousdelivery`) to run tests with the ATF tools
- **Running tests:** `sn_cicd.sys_ci_automation` or `admin` role for the MCP user, and `sn_atf.runner.enabled` = `true` (see Step 7.1)
- **Access:** sys_atf_test, sys_atf_test_suite, sys_atf_step tables
- **Knowledge:** Basic understanding of ServiceNow scripting (GlideRecord, client scripts)
- **Related Skills:** `admin/script-execution`, `admin/update-set-management`

## ATF Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Test Suite                              │
│  (Groups related tests, runs in sequence or parallel)        │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │   Test 1    │  │   Test 2    │  │   Test 3    │          │
│  │ (Scenario)  │  │ (Scenario)  │  │ (Scenario)  │          │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘          │
│         │                │                │                  │
│  ┌──────▼──────┐  ┌──────▼──────┐  ┌──────▼──────┐          │
│  │   Steps     │  │   Steps     │  │   Steps     │          │
│  │ 1. Setup    │  │ 1. Setup    │  │ 1. Setup    │          │
│  │ 2. Action   │  │ 2. Action   │  │ 2. Action   │          │
│  │ 3. Assert   │  │ 3. Assert   │  │ 3. Assert   │          │
│  │ 4. Cleanup  │  │ 4. Cleanup  │  │ 4. Cleanup  │          │
│  └─────────────┘  └─────────────┘  └─────────────┘          │
└─────────────────────────────────────────────────────────────┘
```

## Key Tables

| Table | Purpose |
|-------|---------|
| `sys_atf_test_suite` | Test suite containers |
| `sys_atf_test` | Individual test definitions |
| `sys_atf_step` | Test steps within tests |
| `sys_atf_step_config` | Step type configurations |
| `sys_atf_test_result` | Test execution results |
| `sys_atf_step_result` | Individual step results |
| `sys_atf_parameter` | Test parameters |
| `sys_atf_variable` | Test variables (runtime data) |
| `sys_atf_test_suite_test` | Suite-to-test relationships |

## Procedure

### Phase 1: Create Test Suite

#### Step 1.1: Create the Test Suite

Organize related tests into a suite for easier management and execution.

**Using MCP:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_atf_test_suite
  data:
    name: "Incident Management Tests"
    description: "Comprehensive tests for incident creation, assignment, resolution, and closure workflows"
    active: true
    run_parallel: false
    application: [app_sys_id]  # Optional: for scoped apps
```

**Using REST API:**
```bash
POST /api/now/table/sys_atf_test_suite
Content-Type: application/json

{
  "name": "Incident Management Tests",
  "description": "Comprehensive tests for incident creation, assignment, resolution, and closure workflows",
  "active": "true",
  "run_parallel": "false"
}
```

#### Step 1.2: Query Existing Test Suites

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_atf_test_suite
  query: active=true
  fields: sys_id,name,description,run_parallel,sys_updated_on
  limit: 50
```

### Phase 2: Create Tests

#### Step 2.1: Create a Basic Test

Each test represents a specific scenario to validate.

**Using MCP:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_atf_test
  data:
    name: "Create P1 Incident and Verify Auto-Assignment"
    description: "Tests that P1 incidents are automatically assigned to the Critical Incidents team"
    active: true
    type: test_script  # test_script, browser, quick_start
```

**Test Types:**
| Type | Value | Description |
|------|-------|-------------|
| Server Side | test_script | Server-side JavaScript tests |
| Browser | browser | Client-side UI tests |
| Quick Start | quick_start | Guided test creation |

#### Step 2.2: Add Test to Suite

Link the test to your test suite.

**Using MCP:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_atf_test_suite_test
  data:
    test_suite: [suite_sys_id]
    test: [test_sys_id]
    order: 100  # Execution order (100, 200, 300...)
```

### Phase 3: Create Test Steps

#### Step 3.1: Server-Side Test Steps

Server-side steps execute GlideRecord operations and server-side JavaScript.

**Step: Create Record**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_atf_step
  data:
    test: [test_sys_id]
    order: 100
    active: true
    step_config: [step_config_sys_id]  # "Record - Insert"
    inputs:
      table: incident
      fields:
        short_description: "ATF Test - Server Outage P1"
        description: "Automated test incident for validation"
        priority: 1
        category: hardware
        subcategory: server
    outputs:
      record: inserted_incident  # Variable name for reference
```

**Step: Query Records**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_atf_step
  data:
    test: [test_sys_id]
    order: 200
    active: true
    step_config: [step_config_sys_id]  # "Record - Query"
    inputs:
      table: incident
      query: number=${inserted_incident.number}
    outputs:
      record: queried_incident
```

**Step: Update Record**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_atf_step
  data:
    test: [test_sys_id]
    order: 300
    active: true
    step_config: [step_config_sys_id]  # "Record - Update"
    inputs:
      record: ${inserted_incident}
      fields:
        state: 2  # In Progress
        assigned_to: [user_sys_id]
        work_notes: "ATF: Assigning for testing"
```

**Step: Run Server-Side Script**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_atf_step
  data:
    test: [test_sys_id]
    order: 400
    active: true
    step_config: [step_config_sys_id]  # "Run Server Side Script"
    inputs:
      script: |
        // Custom server-side validation
        var gr = new GlideRecord('incident');
        gr.get('${inserted_incident.sys_id}');

        // Store result for assertion
        outputs.actual_state = gr.state.toString();
        outputs.assigned_group = gr.assignment_group.getDisplayValue();
        outputs.is_valid = (gr.state == 2);
    outputs:
      actual_state: actual_state
      assigned_group: assigned_group
      is_valid: is_valid
```

#### Step 3.2: Client-Side Test Steps

Client-side steps test UI behavior and client scripts.

**Step: Open Form**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_atf_step
  data:
    test: [test_sys_id]
    order: 100
    active: true
    step_config: [step_config_sys_id]  # "Open a new form"
    inputs:
      table: incident
```

**Step: Set Field Value**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_atf_step
  data:
    test: [test_sys_id]
    order: 200
    active: true
    step_config: [step_config_sys_id]  # "Set field value"
    inputs:
      field: priority
      value: 1 - Critical
```

**Step: Click Button**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_atf_step
  data:
    test: [test_sys_id]
    order: 300
    active: true
    step_config: [step_config_sys_id]  # "Click a button"
    inputs:
      button_name: Submit
```

**Step: Validate Field State**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_atf_step
  data:
    test: [test_sys_id]
    order: 400
    active: true
    step_config: [step_config_sys_id]  # "Field state validation"
    inputs:
      field: caller_id
      is_mandatory: true
      is_visible: true
      is_readonly: false
```

#### Step 3.3: UI Test Steps

UI steps interact with the ServiceNow interface.

**Step: Open Record**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_atf_step
  data:
    test: [test_sys_id]
    order: 100
    active: true
    step_config: [step_config_sys_id]  # "Open an existing record"
    inputs:
      table: incident
      sys_id: ${inserted_incident.sys_id}
```

**Step: Navigate to Module**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_atf_step
  data:
    test: [test_sys_id]
    order: 100
    active: true
    step_config: [step_config_sys_id]  # "Navigate to a module"
    inputs:
      module: Incident > Create New
```

### Phase 4: Assertions and Validations

#### Step 4.1: Basic Assertions

**Assert Field Value**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_atf_step
  data:
    test: [test_sys_id]
    order: 500
    active: true
    step_config: [step_config_sys_id]  # "Verify field value"
    inputs:
      record: ${inserted_incident}
      field: state
      expected_value: 2
      operator: =
```

**Assert Record Exists**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_atf_step
  data:
    test: [test_sys_id]
    order: 500
    active: true
    step_config: [step_config_sys_id]  # "Verify record exists"
    inputs:
      table: incident
      query: number=${inserted_incident.number}^active=true
```

**Assert Record Count**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_atf_step
  data:
    test: [test_sys_id]
    order: 500
    active: true
    step_config: [step_config_sys_id]  # "Verify record count"
    inputs:
      table: task
      query: parent=${inserted_incident.sys_id}
      expected_count: 3
      operator: >=
```

#### Step 4.2: Custom Script Assertions

For complex validations, use script assertions.

**Run Server-Side Script with Assertions**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_atf_step
  data:
    test: [test_sys_id]
    order: 500
    active: true
    step_config: [step_config_sys_id]  # "Run Server Side Script"
    inputs:
      script: |
        // Complex assertion logic
        var testPassed = true;
        var messages = [];

        // Get the incident
        var gr = new GlideRecord('incident');
        gr.get('${inserted_incident.sys_id}');

        // Assertion 1: State validation
        if (gr.state != 2) {
          testPassed = false;
          messages.push('Expected state 2, got ' + gr.state);
        }

        // Assertion 2: Assignment validation
        if (gr.assignment_group.nil()) {
          testPassed = false;
          messages.push('Assignment group should not be empty for P1');
        }

        // Assertion 3: SLA attached
        var sla = new GlideRecord('task_sla');
        sla.addQuery('task', gr.sys_id);
        sla.query();
        if (!sla.hasNext()) {
          testPassed = false;
          messages.push('Expected SLA to be attached to P1 incident');
        }

        // Set outputs
        outputs.test_passed = testPassed;
        outputs.validation_messages = messages.join('; ');

        // This will fail the step if assertions fail
        if (!testPassed) {
          throw new Error('Assertions failed: ' + outputs.validation_messages);
        }
```

#### Step 4.3: Assertion Operators

| Operator | Description | Example |
|----------|-------------|---------|
| `=` | Equals | state = 2 |
| `!=` | Not equals | state != 7 |
| `<` | Less than | priority < 3 |
| `<=` | Less or equal | priority <= 2 |
| `>` | Greater than | age > 0 |
| `>=` | Greater or equal | count >= 1 |
| `contains` | String contains | description contains "error" |
| `starts with` | String prefix | number starts with "INC" |
| `ends with` | String suffix | email ends with "@company.com" |
| `is empty` | Null or empty | assigned_to is empty |
| `is not empty` | Has value | caller_id is not empty |

### Phase 5: Test Data Management

#### Step 5.1: Setup Test Data

Create test data at the beginning of each test.

**Using Data Setup Step**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_atf_step
  data:
    test: [test_sys_id]
    order: 10
    active: true
    step_config: [step_config_sys_id]  # "Run Server Side Script"
    description: "Setup: Create test data"
    inputs:
      script: |
        // Create test user
        var user = new GlideRecord('sys_user');
        user.initialize();
        user.user_name = 'atf_test_user_' + gs.generateGUID().substring(0, 8);
        user.first_name = 'ATF';
        user.last_name = 'Test User';
        user.email = user.user_name + '@test.example.com';
        user.active = true;
        outputs.test_user_sys_id = user.insert();
        outputs.test_user_name = user.user_name;

        // Create test group
        var group = new GlideRecord('sys_user_group');
        group.initialize();
        group.name = 'ATF Test Group ' + gs.generateGUID().substring(0, 8);
        group.active = true;
        outputs.test_group_sys_id = group.insert();
        outputs.test_group_name = group.name;

        gs.info('ATF: Created test user ' + outputs.test_user_name);
        gs.info('ATF: Created test group ' + outputs.test_group_name);
```

#### Step 5.2: Cleanup Test Data

Always clean up test data to prevent accumulation.

**Using Cleanup Step (End of Test)**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_atf_step
  data:
    test: [test_sys_id]
    order: 9999
    active: true
    step_config: [step_config_sys_id]  # "Run Server Side Script"
    description: "Cleanup: Remove test data"
    inputs:
      script: |
        // Cleanup test incident
        if ('${inserted_incident.sys_id}') {
          var inc = new GlideRecord('incident');
          if (inc.get('${inserted_incident.sys_id}')) {
            inc.deleteRecord();
            gs.info('ATF: Cleaned up test incident');
          }
        }

        // Cleanup test user
        if ('${test_user_sys_id}') {
          var user = new GlideRecord('sys_user');
          if (user.get('${test_user_sys_id}')) {
            user.deleteRecord();
            gs.info('ATF: Cleaned up test user');
          }
        }

        // Cleanup test group
        if ('${test_group_sys_id}') {
          var group = new GlideRecord('sys_user_group');
          if (group.get('${test_group_sys_id}')) {
            group.deleteRecord();
            gs.info('ATF: Cleaned up test group');
          }
        }
```

#### Step 5.3: Reusable Data Setup (Data Broker)

For tests that need consistent data across multiple scenarios:

**Query Step Config for Data Broker**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_atf_step_config
  query: nameLIKEData Broker
  fields: sys_id,name,description,category
```

### Phase 6: Parameterized Tests

#### Step 6.1: Create Test Parameters

Parameters allow running the same test with different inputs.

**Using MCP:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_atf_parameter
  data:
    test: [test_sys_id]
    name: priority_value
    label: "Priority Value"
    default_value: 3
    type: integer
    hint: "Incident priority (1-5)"
```

**Create Multiple Parameters:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_atf_parameter
  data:
    test: [test_sys_id]
    name: category
    label: "Category"
    default_value: software
    type: string
    hint: "Incident category"

# Additional parameter
Tool: SN-Create-Record
Parameters:
  table_name: sys_atf_parameter
  data:
    test: [test_sys_id]
    name: expected_sla_minutes
    label: "Expected SLA (minutes)"
    default_value: 60
    type: integer
    hint: "Expected SLA resolution time"
```

#### Step 6.2: Use Parameters in Steps

Reference parameters using the ${} syntax.

**Using Parameters in Record Insert**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_atf_step
  data:
    test: [test_sys_id]
    order: 100
    active: true
    step_config: [step_config_sys_id]
    description: "Create incident with parameterized values"
    inputs:
      table: incident
      fields:
        short_description: "ATF Parameterized Test"
        priority: ${priority_value}
        category: ${category}
```

**Using Parameters in Assertions**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_atf_step
  data:
    test: [test_sys_id]
    order: 500
    active: true
    step_config: [step_config_sys_id]
    description: "Verify SLA meets expected time"
    inputs:
      script: |
        var sla = new GlideRecord('task_sla');
        sla.addQuery('task', '${inserted_incident.sys_id}');
        sla.query();

        if (sla.next()) {
          var plannedMinutes = sla.planned_end_time.dateNumericValue() -
                               sla.start_time.dateNumericValue();
          plannedMinutes = plannedMinutes / (1000 * 60);

          outputs.actual_sla_minutes = Math.round(plannedMinutes);
          outputs.expected_sla_minutes = ${expected_sla_minutes};

          if (plannedMinutes > ${expected_sla_minutes}) {
            throw new Error('SLA ' + plannedMinutes + ' mins exceeds expected ' +
                          ${expected_sla_minutes} + ' mins');
          }
        }
```

### Phase 7: Running Tests

Run tests with the ATF tools (happy-platform-mcp 6.1.0+), which call the CI/CD REST API (`/api/sn_cicd`). Do not start runs from background or scheduled scripts. `SN-Run-ATF-Test` and `SN-Run-ATF-Suite` execute tests on the instance (tests can create, change, or roll back data); the other three tools only read.

#### Step 7.1: Preflight

1. The CI/CD REST API plugin is active:
```
Tool: SN-Query-Table
Parameters:
  table_name: v_plugin
  query: id=com.glide.continuousdelivery
  fields: id,name,active
```

2. The MCP user has `sn_cicd.sys_ci_automation` or `admin`:
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_user_has_role
  query: user.user_name=[mcp_user]^role.name=sn_cicd.sys_ci_automation^ORrole.name=admin
  fields: role.name
```

3. ATF execution is enabled. `sn_atf.runner.enabled` is `false` by default on PDIs, and runs then fail with `ATF_RUNNER_DISABLED`:
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_properties
  query: name=sn_atf.runner.enabled
  fields: sys_id,name,value
```
If it is `false`, setting it to `true` is a configuration change: get approval, record the original value, set it with `SN-Update-Record`, and restore the original value when testing ends. Do not enable it on production instances.

UI steps also need an open Client Test Runner or `run_in_cloud: true`.

#### Step 7.2: Run a Test or Suite

**Run one test:**
```
Tool: SN-Run-ATF-Test
Parameters:
  test_sys_id: [test_sys_id]   # or test_name (must match exactly one test)
  capture_node_logs: true      # required for SN-Get-ATF-Test-Logs later
  wait: true                   # default; polls until finished or timeout_seconds
  timeout_seconds: 45          # default 45, max 600
```

**Run a suite:**
```
Tool: SN-Run-ATF-Suite
Parameters:
  test_suite_sys_id: [suite_sys_id]   # or test_suite_name
  browser_name: chrome                # optional, for UI steps
  wait: true
  timeout_seconds: 120
```

`status` is `successful`, `failed`, `canceled`, `timeout`, `unknown`, or `started` (with `wait: false`). Suite results carry `counts` (passed, failed, errored, skipped) and `tests`, one row per test with `test_name`, `status`, `output`, and a `link` to its `sys_atf_test_result` record (capped at 200 rows; `tests_truncated` marks more).

#### Step 7.3: Continue a Run That Timed Out

`status: "timeout"` is not a failure: the run keeps going on the instance. Never start it again; continue with the returned `progress_id`:
```
Tool: SN-Get-CICD-Progress
Parameters:
  progress_id: [progress_id]
  wait: true
  timeout_seconds: 120
```
Repeat while `timed_out: true`. When `finished` is true, pass `results.id` to Step 7.4. Handle `status: "unknown"` (run started, progress unreadable) the same way.

#### Step 7.4: Read Results

```
Tool: SN-Get-ATF-Results
Parameters:
  result_id: [results.id]
  result_type: suite   # or test
```
For a suite, read each test's outcome from `tests`; the `sys_id` in a failing row's `link` is its test result, used for logs (Step 7.5) and step results (Step 8.2).

#### Step 7.5: Read Test Logs

Logs exist only when the run used `capture_node_logs: true` (an `SN-Run-ATF-Test` option); otherwise the tool returns `logs: []` with a note.
```
Tool: SN-Get-ATF-Test-Logs
Parameters:
  result_id: [test_result_sys_id]
  pattern: error|fail   # optional regex, matched case-insensitively
  limit: 100
```

#### Step 7.6: Run Errors

| Error code | Cause | Fix |
|------------|-------|-----|
| `CICD_PLUGIN_INACTIVE` | `/api/sn_cicd` missing (HTTP 400/404 or a non-JSON page) | Activate "CI/CD REST API" (`com.glide.continuousdelivery`) under System Definition > Plugins, with approval |
| `CICD_ROLE_MISSING` | HTTP 403 | Grant `sn_cicd.sys_ci_automation` (or `admin`) to the MCP user |
| `ATF_RUNNER_DISABLED` | HTTP 400 "Start ATF test Failed with the given test ID" | Set `sn_atf.runner.enabled` to `true` (Step 7.1) and restore it afterwards; if already `true`, check that the test or suite id exists and is active |
| `CICD_UNAUTHORIZED` | HTTP 401 | Fix the instance credentials the MCP server uses |

#### Step 7.7: Scheduled and Role-Based Runs

- **Recurring runs:** use ATF's built-in suite scheduling or a CI pipeline (Phase 9), not a scheduled script.
- **Run as another user:** runs execute as the MCP user; add an Impersonate step inside the test (see Example 2).

### Phase 8: Test Results Analysis

#### Step 8.1: Query Test Results

For one run, use `SN-Get-ATF-Results` (Step 7.4). For history:

**Get Latest Test Results:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_atf_test_result
  query: test=[test_sys_id]^ORDERBYDESCsys_created_on
  fields: sys_id,status,start_time,end_time,duration,message
  limit: 10
```

**Get Suite Execution Results:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_atf_test_suite_result
  query: test_suite=[suite_sys_id]^ORDERBYDESCsys_created_on
  fields: sys_id,status,start_time,end_time,test_count,pass_count,fail_count,skip_count
  limit: 5
```

#### Step 8.2: Analyze Failed Steps

**Get Step-Level Results for Failed Test:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_atf_step_result
  query: test_result=[test_result_sys_id]^status=failure
  fields: sys_id,step_config,status,message,output
  limit: 50
```

#### Step 8.3: Aggregate Test Metrics

**Using MCP:**
```
Tool: SN-Execute-Background-Script
Parameters:
  script: |
    // Aggregate test metrics for the last 7 days
    var startDate = gs.daysAgo(7);

    var metrics = {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      error: 0,
      passRate: 0,
      avgDuration: 0
    };

    var ga = new GlideAggregate('sys_atf_test_result');
    ga.addQuery('sys_created_on', '>', startDate);
    ga.addAggregate('COUNT');
    ga.addAggregate('COUNT', 'status');
    ga.addAggregate('AVG', 'duration');
    ga.groupBy('status');
    ga.query();

    while (ga.next()) {
      var status = ga.status.toString();
      var count = parseInt(ga.getAggregate('COUNT'));
      metrics.total += count;

      if (status === 'success') metrics.passed = count;
      else if (status === 'failure') metrics.failed = count;
      else if (status === 'skipped') metrics.skipped = count;
      else metrics.error += count;
    }

    metrics.passRate = metrics.total > 0 ?
      Math.round((metrics.passed / metrics.total) * 100) : 0;

    gs.info('ATF Metrics (Last 7 Days): ' + JSON.stringify(metrics, null, 2));
  description: Generate ATF test metrics
```

### Phase 9: CI/CD Integration

#### Step 9.1: REST API for CI/CD

The ATF tools wrap these CI/CD REST API endpoints, which pipelines can call directly. Run parameters go in the query string.

| Endpoint | Returns |
|----------|---------|
| `POST /api/sn_cicd/testsuite/run?test_suite_sys_id=[suite_sys_id]` (or `test_suite_name`) | `result.links.progress.id` |
| `POST /api/sn_cicd/tests/run_test?test_sys_id=[test_sys_id]` | `result.links.progress.id` |
| `GET /api/sn_cicd/progress/[progress_id]` | `result.status` (`0` pending, `1` running, `2` successful, `3` failed, `4` canceled) and `result.links.results.id` |
| `GET /api/sn_cicd/testsuite/results/[result_id]` | `test_suite_status`, `rolledup_test_success_count`, `rolledup_test_failure_count`, `rolledup_test_error_count`, `rolledup_test_skip_count` |
| `GET /api/sn_cicd/tests/test/results/[result_id]` | `test_status`, `output` |
| `GET /api/sn_cicd/tests/test/results/[result_id]/logs?sysparm_regex=error` | Logs captured by a run with `capture_node_logs` |

**Using now-sdk:** `now-sdk cicd` wraps the same API:
```bash
now-sdk cicd testsuite run --test-suite-name "My Test Suite"
now-sdk cicd test run --test-name "My Test"
now-sdk cicd test logs --result-id <result_id> --pattern 'error|fail'
```

#### Step 9.2: Integration with Jenkins

**Jenkins Pipeline Example:**
```groovy
pipeline {
  agent any

  environment {
    SN_INSTANCE = 'https://dev123.service-now.com'
    SN_CREDENTIALS = credentials('servicenow-api')
  }

  stages {
    stage('Run ATF Tests') {
      steps {
        script {
          // Start test suite
          def response = httpRequest(
            url: "${SN_INSTANCE}/api/sn_cicd/testsuite/run?test_suite_sys_id=${params.TEST_SUITE_ID}",
            httpMode: 'POST',
            authentication: 'servicenow-api'
          )

          def run = readJSON text: response.content
          env.PROGRESS_ID = run.result.links.progress.id
        }
      }
    }

    stage('Wait for Results') {
      steps {
        script {
          def progress
          timeout(time: 30, unit: 'MINUTES') {
            while (true) {
              sleep 30
              def response = httpRequest(
                url: "${SN_INSTANCE}/api/sn_cicd/progress/${env.PROGRESS_ID}",
                authentication: 'servicenow-api'
              )
              progress = readJSON(text: response.content).result
              if (!(progress.status.toString() in ['0', '1'])) break  // 0 pending, 1 running
            }
          }
          env.PROGRESS_STATUS = progress.status.toString()
          env.RESULT_ID = progress.links?.results?.id ?: ''
        }
      }
    }

    stage('Evaluate Results') {
      steps {
        script {
          if (!env.RESULT_ID) {
            error "ATF run ended without results (progress status ${env.PROGRESS_STATUS})"
          }
          def response = httpRequest(
            url: "${SN_INSTANCE}/api/sn_cicd/testsuite/results/${env.RESULT_ID}",
            authentication: 'servicenow-api'
          )
          def results = readJSON(text: response.content).result

          if (env.PROGRESS_STATUS != '2' || results.test_suite_status != 'success') {
            error "ATF tests failed: ${results.rolledup_test_failure_count} failed, ${results.rolledup_test_error_count} errored"
          }
        }
      }
    }
  }
}
```

#### Step 9.3: Integration with GitHub Actions

**GitHub Actions Workflow:**
```yaml
name: ServiceNow ATF Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  atf-tests:
    runs-on: ubuntu-latest

    steps:
      - name: Run ATF Test Suite
        id: run-tests
        run: |
          RESPONSE=$(curl -s -X POST \
            -u "${{ secrets.SN_USERNAME }}:${{ secrets.SN_PASSWORD }}" \
            "${{ vars.SN_INSTANCE }}/api/sn_cicd/testsuite/run?test_suite_sys_id=${{ vars.ATF_SUITE_ID }}")

          PROGRESS_ID=$(echo "$RESPONSE" | jq -r '.result.links.progress.id')
          echo "progress_id=$PROGRESS_ID" >> $GITHUB_OUTPUT

      - name: Wait for Completion
        id: wait
        timeout-minutes: 30
        run: |
          STATUS=0
          while [ "$STATUS" = "0" ] || [ "$STATUS" = "1" ]; do  # 0 pending, 1 running
            sleep 30
            RESPONSE=$(curl -s \
              -u "${{ secrets.SN_USERNAME }}:${{ secrets.SN_PASSWORD }}" \
              "${{ vars.SN_INSTANCE }}/api/sn_cicd/progress/${{ steps.run-tests.outputs.progress_id }}")
            STATUS=$(echo "$RESPONSE" | jq -r '.result.status')
            echo "Progress: $(echo "$RESPONSE" | jq -r '.result.status_label')"
          done
          echo "status=$STATUS" >> $GITHUB_OUTPUT
          echo "result_id=$(echo "$RESPONSE" | jq -r '.result.links.results.id // empty')" >> $GITHUB_OUTPUT

      - name: Get Results
        run: |
          RESPONSE=$(curl -s \
            -u "${{ secrets.SN_USERNAME }}:${{ secrets.SN_PASSWORD }}" \
            "${{ vars.SN_INSTANCE }}/api/sn_cicd/testsuite/results/${{ steps.wait.outputs.result_id }}")

          SUITE_STATUS=$(echo "$RESPONSE" | jq -r '.result.test_suite_status')
          PASS=$(echo "$RESPONSE" | jq -r '.result.rolledup_test_success_count')
          FAIL=$(echo "$RESPONSE" | jq -r '.result.rolledup_test_failure_count')
          ERRORED=$(echo "$RESPONSE" | jq -r '.result.rolledup_test_error_count')

          echo "Results: $PASS passed, $FAIL failed, $ERRORED errored"

          if [ "${{ steps.wait.outputs.status }}" != "2" ] || [ "$SUITE_STATUS" != "success" ]; then
            echo "::error::ATF tests failed"
            exit 1
          fi
```

### Phase 10: Advanced Patterns

#### Step 10.1: Page Object Pattern for UI Tests

Create reusable step configurations for common UI operations.

**Query Available Step Configs:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_atf_step_config
  query: active=true
  fields: sys_id,name,category,description
  limit: 100
```

**Common Step Configs:**
| Category | Step Config | Purpose |
|----------|------------|---------|
| Record | Record - Insert | Create new record |
| Record | Record - Query | Find existing record |
| Record | Record - Update | Modify record |
| Record | Record - Delete | Remove record |
| Form | Open a new form | Navigate to new form |
| Form | Open an existing record | Navigate to record |
| Form | Set field value | Populate field |
| Form | Click a button | Trigger button action |
| Assertion | Verify field value | Assert field content |
| Script | Run Server Side Script | Execute custom logic |

#### Step 10.2: Test Data Factory Pattern

Create a script include for generating test data.

**Using MCP:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_script_include
  data:
    name: ATFTestDataFactory
    api_name: global.ATFTestDataFactory
    active: true
    client_callable: false
    description: "Factory for creating consistent ATF test data"
    script: |
      var ATFTestDataFactory = Class.create();
      ATFTestDataFactory.prototype = {

        initialize: function() {
          this.createdRecords = [];
        },

        createTestIncident: function(options) {
          options = options || {};

          var gr = new GlideRecord('incident');
          gr.initialize();
          gr.short_description = options.short_description ||
            'ATF Test Incident ' + gs.generateGUID().substring(0, 8);
          gr.description = options.description || 'Created by ATF Test';
          gr.priority = options.priority || 3;
          gr.category = options.category || 'software';
          gr.caller_id = options.caller_id || gs.getUserID();

          var sysId = gr.insert();
          this.createdRecords.push({ table: 'incident', sys_id: sysId });

          return sysId;
        },

        createTestUser: function(options) {
          options = options || {};
          var username = 'atf_' + gs.generateGUID().substring(0, 8);

          var gr = new GlideRecord('sys_user');
          gr.initialize();
          gr.user_name = options.user_name || username;
          gr.first_name = options.first_name || 'ATF';
          gr.last_name = options.last_name || 'User';
          gr.email = options.email || username + '@test.example.com';
          gr.active = true;

          var sysId = gr.insert();
          this.createdRecords.push({ table: 'sys_user', sys_id: sysId });

          return sysId;
        },

        createTestGroup: function(options) {
          options = options || {};

          var gr = new GlideRecord('sys_user_group');
          gr.initialize();
          gr.name = options.name || 'ATF Group ' + gs.generateGUID().substring(0, 8);
          gr.active = true;

          var sysId = gr.insert();
          this.createdRecords.push({ table: 'sys_user_group', sys_id: sysId });

          return sysId;
        },

        cleanup: function() {
          // Delete in reverse order to handle dependencies
          for (var i = this.createdRecords.length - 1; i >= 0; i--) {
            var record = this.createdRecords[i];
            var gr = new GlideRecord(record.table);
            if (gr.get(record.sys_id)) {
              gr.deleteRecord();
            }
          }
          this.createdRecords = [];
        },

        type: 'ATFTestDataFactory'
      };
```

**Using Factory in Test:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_atf_step
  data:
    test: [test_sys_id]
    order: 10
    step_config: [run_script_config_sys_id]
    description: "Setup: Create test data using factory"
    inputs:
      script: |
        var factory = new ATFTestDataFactory();

        // Create test data
        outputs.incident_sys_id = factory.createTestIncident({
          priority: 1,
          short_description: 'Critical Server Issue'
        });

        outputs.user_sys_id = factory.createTestUser({
          first_name: 'Test',
          last_name: 'Admin'
        });

        // Store factory for cleanup
        outputs.factory = factory;
```

#### Step 10.3: Conditional Test Execution

Skip tests based on conditions.

**Using MCP:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_atf_step
  data:
    test: [test_sys_id]
    order: 5
    step_config: [run_script_config_sys_id]
    description: "Pre-check: Verify test prerequisites"
    inputs:
      script: |
        // Check if required plugin is active
        var plugin = new GlideRecord('v_plugin');
        plugin.addQuery('id', 'com.snc.change_management');
        plugin.addQuery('state', 'active');
        plugin.query();

        if (!plugin.hasNext()) {
          // Skip this test if plugin not installed
          outputs.skip_test = true;
          outputs.skip_reason = 'Change Management plugin not active';

          // This will mark test as skipped, not failed
          stepResult.setStatus('skipped');
          stepResult.setMessage('Prerequisites not met: ' + outputs.skip_reason);
        }
```

## Common Step Configurations

**Query All Available Step Types:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_atf_step_config
  query: active=true
  fields: sys_id,name,category,description,inputs
  limit: 200
```

**Essential Step Configs:**
| sys_id (varies) | Name | Category |
|-----------------|------|----------|
| Record - Insert | Create a new record | Record |
| Record - Query | Query for records | Record |
| Record - Update | Update a record | Record |
| Record - Delete | Delete a record | Record |
| Open a new form | Open empty form | Form |
| Open an existing record | Open by sys_id | Form |
| Set field value | Set form field | Form |
| Click a button | Button interaction | Form |
| Run Server Side Script | Custom server code | Script |
| Impersonate | Change user context | Security |
| Verify field value | Assert field equals | Assertion |
| Log Message | Write to output | Debug |
| Wait | Pause execution | Flow |

## Tool Usage Summary

| Operation | MCP Tool | Purpose |
|-----------|----------|---------|
| Create Test Suite | SN-Create-Record | Create sys_atf_test_suite |
| Create Test | SN-Create-Record | Create sys_atf_test |
| Create Step | SN-Create-Record | Create sys_atf_step |
| Add Parameters | SN-Create-Record | Create sys_atf_parameter |
| Query Results | SN-Query-Table | Read sys_atf_test_result history |
| Run Test | SN-Run-ATF-Test | Execute one test via sn_cicd |
| Run Suite | SN-Run-ATF-Suite | Execute a suite via sn_cicd |
| Continue Run | SN-Get-CICD-Progress | Wait on a run that timed out |
| Read Result | SN-Get-ATF-Results | Test or suite outcome, per-test rows |
| Read Logs | SN-Get-ATF-Test-Logs | Logs of a run with capture_node_logs |
| Get Step Configs | SN-Query-Table | List sys_atf_step_config |
| Update Test | SN-Update-Record | Modify test properties |

## Best Practices

### Test Design
- **Single Responsibility:** Each test should validate one specific scenario
- **Independence:** Tests should not depend on other tests' execution order
- **Isolation:** Use unique test data to prevent conflicts with other tests
- **Cleanup:** Always clean up test data, even on test failure
- **Naming:** Use descriptive names: `[Feature]_[Scenario]_[ExpectedResult]`

### Test Data
- **Generate Unique Data:** Use GUIDs or timestamps in test data names
- **Avoid Production Data:** Never reference real user data in tests
- **Minimal Data:** Create only the data needed for the test
- **Data Factory Pattern:** Use script includes for consistent data creation

### Assertions
- **Specific Assertions:** Assert specific values, not just "not empty"
- **Multiple Checks:** Validate all critical aspects of the outcome
- **Meaningful Messages:** Include context in assertion failure messages
- **Negative Testing:** Test that invalid operations are correctly rejected

### Performance
- **Limit Queries:** Use setLimit() and efficient queries
- **Batch Operations:** Group similar operations together
- **Avoid UI Tests When Possible:** Server-side tests are faster and more reliable
- **Parallel Suites:** Run independent test suites in parallel

### Maintenance
- **Version Control:** Include tests in update sets
- **Documentation:** Add descriptions to tests and steps
- **Refactoring:** Update tests when requirements change
- **Regular Execution:** Run tests frequently to catch issues early

## Troubleshooting

### Test Fails to Start

**Symptom:** A run tool returns `ATF_RUNNER_DISABLED`, or the run stays `pending` until `timeout`
**Causes:**
- `sn_atf.runner.enabled` is `false` (the PDI default)
- UI steps with no open Client Test Runner and no `run_in_cloud: true`
**Solution:** Run the Step 7.1 preflight. For UI steps, open a Client Test Runner or set `run_in_cloud: true`. Continue a pending run with `SN-Get-CICD-Progress`; do not start it again.

### UI Tests Fail Randomly

**Symptom:** Same UI test passes and fails intermittently
**Causes:**
- Timing issues with page load
- DOM changes between runs
- Browser version differences
**Solution:**
- Add Wait steps before UI interactions
- Use stable element selectors
- Specify browser version in test configuration

### Step Variables Not Resolved

**Symptom:** `${variable}` appears literally in output
**Causes:**
- Variable not set by previous step
- Typo in variable name
- Step order incorrect
**Solution:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_atf_variable
  query: test=[test_sys_id]
  fields: name,step,value
```

### Test Data Not Cleaned Up

**Symptom:** Test data accumulates in instance
**Causes:**
- Cleanup step not added
- Cleanup step failed before completing
- Test halted before cleanup
**Solution:**
- Use try-finally pattern in cleanup scripts
- Create scheduled cleanup job for orphaned data:

```
Tool: SN-Execute-Background-Script
Parameters:
  script: |
    // Clean up orphaned ATF test data
    var tables = ['incident', 'sys_user', 'sys_user_group'];
    var cutoff = gs.daysAgo(1);  // Older than 1 day

    tables.forEach(function(table) {
      var gr = new GlideRecord(table);
      gr.addQuery('short_description', 'STARTSWITH', 'ATF');
      gr.addQuery('sys_created_on', '<', cutoff);
      gr.query();

      var count = 0;
      while (gr.next()) {
        gr.deleteRecord();
        count++;
      }

      if (count > 0) {
        gs.info('Cleaned up ' + count + ' orphaned records from ' + table);
      }
    });
  description: Clean orphaned ATF test data
```

### CI/CD Pipeline Timeout

**Symptom:** Pipeline fails waiting for test completion
**Causes:**
- Test suite takes too long
- ServiceNow instance performance issues
- Network connectivity problems
**Solution:**
- Bound the wait (Jenkins `timeout`, Actions `timeout-minutes`); a timed-out wait does not stop the run, so check its progress before starting another
- Split large suites into smaller ones
- Use parallel test execution

## Examples

### Example 1: Complete Incident Lifecycle Test

```
Tool: SN-Create-Record (Test)
Parameters:
  table_name: sys_atf_test
  data:
    name: "Incident_Lifecycle_CreateToClose"
    description: "Validates complete incident workflow from creation to closure"
    active: true

# Step 1: Create Incident
Tool: SN-Create-Record
Parameters:
  table_name: sys_atf_step
  data:
    test: [test_sys_id]
    order: 100
    step_config: [record_insert_config]
    inputs:
      table: incident
      fields:
        short_description: ATF Lifecycle Test
        priority: 3
        category: software
    outputs:
      record: test_incident

# Step 2: Assert Created
Tool: SN-Create-Record
Parameters:
  table_name: sys_atf_step
  data:
    test: [test_sys_id]
    order: 200
    step_config: [verify_field_config]
    inputs:
      record: ${test_incident}
      field: state
      expected_value: 1
      operator: =

# Step 3: Assign Incident
Tool: SN-Create-Record
Parameters:
  table_name: sys_atf_step
  data:
    test: [test_sys_id]
    order: 300
    step_config: [record_update_config]
    inputs:
      record: ${test_incident}
      fields:
        state: 2
        assigned_to: [admin_sys_id]

# Step 4: Resolve Incident
Tool: SN-Create-Record
Parameters:
  table_name: sys_atf_step
  data:
    test: [test_sys_id]
    order: 400
    step_config: [record_update_config]
    inputs:
      record: ${test_incident}
      fields:
        state: 6
        resolution_code: Solved (Permanently)
        resolution_notes: ATF Test Resolution

# Step 5: Assert Resolved
Tool: SN-Create-Record
Parameters:
  table_name: sys_atf_step
  data:
    test: [test_sys_id]
    order: 500
    step_config: [verify_field_config]
    inputs:
      record: ${test_incident}
      field: state
      expected_value: 6

# Step 6: Cleanup
Tool: SN-Create-Record
Parameters:
  table_name: sys_atf_step
  data:
    test: [test_sys_id]
    order: 9999
    step_config: [record_delete_config]
    inputs:
      record: ${test_incident}
```

### Example 2: Role-Based Access Test

```
# Test that ITIL users can update incidents but not delete them

# Step 1: Create test incident as admin
Tool: SN-Create-Record
Parameters:
  table_name: sys_atf_step
  data:
    test: [test_sys_id]
    order: 100
    step_config: [record_insert_config]
    inputs:
      table: incident
      fields:
        short_description: ATF RBAC Test
    outputs:
      record: test_incident

# Step 2: Impersonate ITIL user
Tool: SN-Create-Record
Parameters:
  table_name: sys_atf_step
  data:
    test: [test_sys_id]
    order: 200
    step_config: [impersonate_config]
    inputs:
      user: [itil_user_sys_id]

# Step 3: Update should succeed
Tool: SN-Create-Record
Parameters:
  table_name: sys_atf_step
  data:
    test: [test_sys_id]
    order: 300
    step_config: [run_script_config]
    inputs:
      script: |
        var gr = new GlideRecord('incident');
        gr.get('${test_incident.sys_id}');
        gr.work_notes = 'ITIL user update test';
        var result = gr.update();

        if (!result) {
          throw new Error('ITIL user should be able to update incidents');
        }
        outputs.update_succeeded = true;

# Step 4: Delete should fail
Tool: SN-Create-Record
Parameters:
  table_name: sys_atf_step
  data:
    test: [test_sys_id]
    order: 400
    step_config: [run_script_config]
    inputs:
      script: |
        var gr = new GlideRecord('incident');
        gr.get('${test_incident.sys_id}');

        try {
          var deleted = gr.deleteRecord();
          if (deleted) {
            throw new Error('ITIL user should NOT be able to delete incidents');
          }
        } catch (e) {
          // Expected - delete should fail
          outputs.delete_blocked = true;
        }

# Step 5: Stop impersonation
Tool: SN-Create-Record
Parameters:
  table_name: sys_atf_step
  data:
    test: [test_sys_id]
    order: 500
    step_config: [impersonate_config]
    inputs:
      stop_impersonation: true

# Step 6: Cleanup as admin
Tool: SN-Create-Record
Parameters:
  table_name: sys_atf_step
  data:
    test: [test_sys_id]
    order: 9999
    step_config: [record_delete_config]
    inputs:
      record: ${test_incident}
```

## Related Skills

- `admin/script-execution` - Background script patterns for ATF
- `admin/update-set-management` - Version control for tests
- `admin/deployment-workflow` - Deploy tests between instances
- `security/acl-management` - Test ACL configurations
- `development/fluent-sdk` - Define ATF tests in code; now-sdk 4.14 Fluent adds reusable tests (`isReusable`, `atf.executeTest`)

## References

- [ATF Documentation](https://docs.servicenow.com/bundle/utah-application-development/page/administer/auto-test-framework/concept/automated-test-framework.html)
- [ATF API Reference](https://developer.servicenow.com/dev.do#!/reference/api/utah/server/sn_atf-namespace)
- [CI/CD Integration](https://docs.servicenow.com/bundle/utah-application-development/page/build/cicd-api/concept/c_CICDIntegration.html)
- [Test Design Best Practices](https://developer.servicenow.com/dev.do#!/learn/learning-plans/utah/new_to_servicenow/app_store_learnv2_atf_utah_automated_test_framework)
