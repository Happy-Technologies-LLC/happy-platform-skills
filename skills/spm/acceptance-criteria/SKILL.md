---
name: acceptance-criteria
version: 1.0.0
description: Generate comprehensive acceptance criteria for user stories and features using Given/When/Then format covering functional requirements, edge cases, and testable conditions
author: Happy Technologies LLC
tags: [spm, agile, acceptance-criteria, bdd, gherkin, testing, quality, user-stories]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp:
    - SN-Query-Table
    - SN-Update-Record
    - SN-Read-Record
    - SN-NL-Search
  rest:
    - /api/now/table/rm_story
    - /api/now/table/rm_epic
    - /api/now/table/rm_sprint
    - /api/now/table/pm_project
    - /api/now/table/pm_project_task
  native:
    - Bash
complexity: intermediate
estimated_time: 10-20 minutes
---

# Acceptance Criteria Generation

## Overview

This skill provides a structured approach to generating comprehensive acceptance criteria for user stories and features in ServiceNow's Agile Development 2.0 module. It covers:

- Writing acceptance criteria in Given/When/Then (Gherkin) format
- Covering happy path, alternative flows, and edge cases
- Addressing functional requirements, validation rules, and error handling
- Defining performance thresholds and security constraints
- Linking criteria to testable conditions for QA readiness
- Updating story records with well-formed acceptance criteria

**When to use:** When product owners or scrum masters need to define clear, testable acceptance criteria before sprint planning or story refinement sessions in ServiceNow SPM.

## Prerequisites

- **Plugins:** `com.snc.sdlc.agile.2.0` (Agile Development 2.0)
- **Roles:** `scrum_user`, `scrum_master`, or `scrum_admin`
- **Access:** Read/write access to `rm_story`, `rm_epic` tables
- **Knowledge:** Understanding of the story's functional requirements and user personas

## Procedure

### Step 1: Retrieve the User Story

Fetch the story record to understand the requirement before writing acceptance criteria.

**Using MCP (Claude Code/Desktop):**
```
Tool: SN-Read-Record
Parameters:
  table_name: rm_story
  sys_id: [story_sys_id]
  fields: sys_id,number,short_description,description,acceptance_criteria,story_points,epic,sprint,state,priority,classification,product,assigned_to
```

If you only have the story number, search first:

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: rm_story
  query: number=STY0010001
  fields: sys_id,number,short_description,description,acceptance_criteria,story_points,epic,sprint,state,priority,classification
  limit: 1
```

**Using REST API:**
```bash
GET /api/now/table/rm_story?sysparm_query=number=STY0010001&sysparm_fields=sys_id,number,short_description,description,acceptance_criteria,story_points,epic,sprint,state,priority,classification&sysparm_limit=1&sysparm_display_value=true
```

### Step 2: Gather Context from the Parent Epic

Understanding the broader feature context helps write more complete acceptance criteria.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: rm_epic
  query: sys_id=[epic_sys_id]
  fields: sys_id,number,short_description,description,state,priority,acceptance_criteria
  limit: 1
```

**Using REST API:**
```bash
GET /api/now/table/rm_epic/[epic_sys_id]?sysparm_fields=sys_id,number,short_description,description,state,priority,acceptance_criteria&sysparm_display_value=true
```

### Step 3: Review Related Stories for Consistency

Query sibling stories under the same epic to ensure criteria are consistent and avoid duplication.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: rm_story
  query: epic=[epic_sys_id]^sys_id!=[story_sys_id]^ORDERBYpriority
  fields: number,short_description,acceptance_criteria,state,story_points
  limit: 20
```

**Using REST API:**
```bash
GET /api/now/table/rm_story?sysparm_query=epic=[epic_sys_id]^sys_id!=[story_sys_id]^ORDERBYpriority&sysparm_fields=number,short_description,acceptance_criteria,state,story_points&sysparm_limit=20&sysparm_display_value=true
```

### Step 4: Generate Acceptance Criteria

Structure the acceptance criteria using these categories:

**Category 1: Happy Path (Required)**
The primary success scenario that the story describes.

```
Scenario: Successful [action]
  Given [precondition describing the initial state]
  And [additional precondition if needed]
  When [action the user performs]
  And [additional action if needed]
  Then [expected observable outcome]
  And [additional outcome or side effect]
```

**Category 2: Alternative Flows (Required)**
Valid but non-default paths through the feature.

```
Scenario: [Action] with [variation]
  Given [precondition with variation]
  When [action with different input or context]
  Then [expected outcome for this variation]
```

**Category 3: Error Handling (Required)**
How the system responds to invalid input or failure conditions.

```
Scenario: [Action] with invalid [input/state]
  Given [precondition]
  When [action with invalid data]
  Then [error message or validation feedback]
  And [system state remains unchanged]
```

**Category 4: Edge Cases (Recommended)**
Boundary conditions, empty states, and extremes.

```
Scenario: [Action] at boundary condition
  Given [boundary precondition]
  When [action at limit]
  Then [expected behavior at boundary]
```

**Category 5: Performance and Security (As Applicable)**
Non-functional requirements that must be testable.

```
Scenario: [Action] performance requirement
  Given [load or data volume condition]
  When [action is performed]
  Then [response time or throughput requirement is met]
```

### Step 5: Validate Criteria Quality

Review each criterion against the quality checklist:

| Quality Check | Description | Pass Criteria |
|--------------|-------------|---------------|
| **Testable** | Can be verified with a clear pass/fail | No ambiguous terms like "quickly" or "user-friendly" |
| **Independent** | Each scenario stands on its own | No dependencies between scenarios |
| **Specific** | Contains concrete values | Uses exact numbers, messages, states |
| **Complete** | Covers all requirement aspects | Happy path + errors + edge cases |
| **Concise** | No redundant scenarios | Each scenario tests a unique condition |
| **Consistent** | Matches story scope | Does not exceed or fall short of the story |

### Step 6: Update the Story Record

Write the finalized acceptance criteria back to the story.

**Using MCP:**
```
Tool: SN-Update-Record
Parameters:
  table_name: rm_story
  sys_id: [story_sys_id]
  fields:
    acceptance_criteria: |
      Scenario: Successful customer search by phone number
        Given I am logged in as a customer service representative
        And I am on the customer search screen
        When I enter a complete phone number "555-0123" in the search field
        And I click the Search button
        Then matching customer records are displayed within 2 seconds
        And results show customer name, account number, and account status
        And results are sorted by relevance with exact matches first

      Scenario: Partial phone number search
        Given I am logged in as a customer service representative
        When I enter a partial phone number "555" in the search field
        And I click the Search button
        Then all customers with phone numbers containing "555" are displayed
        And a maximum of 50 results are shown with pagination

      Scenario: No matching results
        Given I am logged in as a customer service representative
        When I enter a phone number with no matching records
        And I click the Search button
        Then a message "No customers found matching the provided phone number" is displayed
        And the search field retains the entered value

      Scenario: Invalid phone number format
        Given I am logged in as a customer service representative
        When I enter non-numeric characters "abc-defg" in the phone search field
        And I click the Search button
        Then a validation message "Please enter a valid phone number" is displayed
        And no search query is executed

      Scenario: Empty search field submission
        Given I am logged in as a customer service representative
        When I click the Search button without entering a phone number
        Then a validation message "Phone number is required" is displayed

      Scenario: Search performance under load
        Given the customer database contains over 1 million records
        When I search for a phone number
        Then results are returned within 3 seconds
```

**Using REST API:**
```bash
PATCH /api/now/table/rm_story/[story_sys_id]
Content-Type: application/json

{
  "acceptance_criteria": "Scenario: Successful customer search by phone number\n  Given I am logged in as a customer service representative\n  And I am on the customer search screen\n  When I enter a complete phone number \"555-0123\" in the search field\n  And I click the Search button\n  Then matching customer records are displayed within 2 seconds\n  And results show customer name, account number, and account status\n\nScenario: No matching results\n  Given I am logged in as a customer service representative\n  When I enter a phone number with no matching records\n  Then a message \"No customers found\" is displayed"
}
```

### Step 7: Bulk Update Stories Missing Acceptance Criteria

Find stories in the backlog that lack acceptance criteria and need refinement.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: rm_story
  query: epic=[epic_sys_id]^acceptance_criteriaISEMPTY^state=-6
  fields: sys_id,number,short_description,description,story_points,priority
  limit: 25
```

**Using REST API:**
```bash
GET /api/now/table/rm_story?sysparm_query=epic=[epic_sys_id]^acceptance_criteriaISEMPTY^state=-6&sysparm_fields=sys_id,number,short_description,description,story_points,priority&sysparm_limit=25&sysparm_display_value=true
```

## Tool Usage

### MCP Tools Reference

| Tool | When to Use |
|------|-------------|
| `SN-Read-Record` | Retrieve a single story or epic by sys_id |
| `SN-Query-Table` | Query stories, epics, and related records |
| `SN-Update-Record` | Write acceptance criteria back to the story |
| `SN-NL-Search` | Natural language search for stories needing criteria |

### REST API Reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/now/table/rm_story` | GET | Query stories and retrieve acceptance criteria |
| `/api/now/table/rm_story/{sys_id}` | GET | Read a specific story record |
| `/api/now/table/rm_story/{sys_id}` | PATCH | Update acceptance criteria on a story |
| `/api/now/table/rm_epic` | GET | Get epic context for writing criteria |
| `/api/now/table/rm_epic/{sys_id}` | GET | Read specific epic details |

## Best Practices

- **Start with the Happy Path:** Always define the primary success scenario first, then add error and edge cases
- **Use Concrete Values:** Replace vague terms with specific numbers, messages, and states (e.g., "within 2 seconds" not "quickly")
- **One Behavior Per Scenario:** Each Given/When/Then block should test exactly one behavior or condition
- **Avoid Implementation Details:** Criteria describe what the system does, not how it is built internally
- **Include Negative Tests:** Always define what happens with invalid input, unauthorized access, and system errors
- **Cover Boundary Conditions:** Test limits such as empty inputs, maximum lengths, zero quantities, and date boundaries
- **Match Story Scope:** Criteria should not exceed the story's boundary; if they do, the story may need splitting
- **Review with the Team:** Acceptance criteria should be agreed upon by the product owner, developer, and tester

## Troubleshooting

### "Acceptance criteria too vague for testing"

**Cause:** Using subjective language like "user-friendly," "fast," or "intuitive"
**Solution:** Replace with measurable terms: "loads within 2 seconds," "displays validation message," "shows 10 results per page"

### "Story has acceptance criteria but keeps failing QA"

**Cause:** Criteria may be missing edge cases or error handling scenarios
**Solution:** Review criteria against the five categories (happy path, alternatives, errors, edge cases, performance) and add missing scenarios

### "Cannot update acceptance_criteria field"

**Cause:** Field-level ACL restriction or the story is in a locked state (e.g., Closed)
**Solution:** Verify your role includes write access to `rm_story.acceptance_criteria`. Stories in Closed state (`state=7`) cannot be edited without reopening.

### "Acceptance criteria is truncated after save"

**Cause:** The `acceptance_criteria` field may have a character limit
**Solution:** Check the field length in the dictionary (`sys_dictionary`). The default is 4000 characters. For longer criteria, use the description field or attach a document.

## Examples

### Example 1: Login Feature Acceptance Criteria

**Story:** "As a registered user, I want to log in with my email and password so that I can access my dashboard"

**Generated Acceptance Criteria:**

```
Scenario: Successful login with valid credentials
  Given I am on the login page
  And I have a registered account with email "user@example.com"
  When I enter my email "user@example.com" and correct password
  And I click the "Sign In" button
  Then I am redirected to my dashboard
  And my display name appears in the top navigation
  And my last login timestamp is updated

Scenario: Login with incorrect password
  Given I am on the login page
  When I enter my email "user@example.com" and an incorrect password
  And I click the "Sign In" button
  Then an error message "Invalid email or password" is displayed
  And no indication is given whether the email or password was wrong
  And the failed attempt is logged for security auditing

Scenario: Login with unregistered email
  Given I am on the login page
  When I enter an unregistered email "unknown@example.com"
  And I click the "Sign In" button
  Then an error message "Invalid email or password" is displayed

Scenario: Account locked after failed attempts
  Given I have failed login 5 times consecutively
  When I attempt to log in a 6th time
  Then my account is temporarily locked for 30 minutes
  And a message "Account locked. Try again in 30 minutes." is displayed
  And a security notification email is sent to my registered address

Scenario: Login with empty fields
  Given I am on the login page
  When I click "Sign In" without entering email or password
  Then validation messages appear for both required fields
  And no authentication request is sent

Scenario: Session timeout after inactivity
  Given I am logged in
  When I am inactive for 30 minutes
  Then my session expires
  And I am redirected to the login page with message "Session expired"
```

### Example 2: Bulk Criteria Generation for Sprint Backlog

**Scenario:** Generate acceptance criteria for all stories in an upcoming sprint that lack them.

**Step 1 - Find stories without criteria:**
```
Tool: SN-Query-Table
Parameters:
  table_name: rm_story
  query: sprint=[sprint_sys_id]^acceptance_criteriaISEMPTY
  fields: sys_id,number,short_description,description,story_points
  limit: 30
```

**Step 2 - For each story, generate and update:**
```
Tool: SN-Update-Record
Parameters:
  table_name: rm_story
  sys_id: [story_sys_id]
  fields:
    acceptance_criteria: |
      Scenario: [Primary success scenario]
        Given [precondition]
        When [user action]
        Then [expected result]

      Scenario: [Error handling scenario]
        Given [precondition]
        When [invalid action]
        Then [error feedback]
```

**Output Summary:**
```
ACCEPTANCE CRITERIA GENERATION REPORT
Sprint: Sprint 2026-04-A
Stories Updated: 8 of 8

STY0010101 - Add to cart (3 scenarios: happy path, out of stock, max quantity)
STY0010102 - Remove from cart (3 scenarios: single item, last item, undo)
STY0010103 - Update quantity (4 scenarios: increase, decrease, zero, max)
STY0010104 - Apply coupon code (4 scenarios: valid, expired, invalid, stacking)
STY0010105 - View cart total (3 scenarios: with tax, empty cart, multi-currency)
STY0010106 - Save cart for later (3 scenarios: save, restore, expiration)
STY0010107 - Share cart via link (3 scenarios: generate link, access, expired link)
STY0010108 - Cart item availability check (3 scenarios: in stock, limited, unavailable)

Total Scenarios: 26
Stories Ready for Sprint Planning: 8/8
```

## Related Skills

- `spm/agile-story-generation` - Generate user stories from requirements
- `spm/project-insights` - Track project health and velocity metrics
- `spm/planning-summarization` - Summarize sprint and release planning
- `development/automated-testing` - Generate automated test cases from acceptance criteria
- `development/business-rules` - Implement validation rules referenced in criteria
