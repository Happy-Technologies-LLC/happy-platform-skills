---
name: agile-story-generation
version: 1.0.0
description: Generate user stories from requirements or feature descriptions with acceptance criteria, story point estimation, epic linking, and sprint assignment
author: Happy Technologies LLC
tags: [spm, agile, user-stories, scrum, backlog, sprint, epic, story-points]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp:
    - SN-Query-Table
    - SN-Create-Record
    - SN-Update-Record
    - SN-NL-Search
  rest:
    - /api/now/table/rm_story
    - /api/now/table/rm_epic
    - /api/now/table/rm_sprint
    - /api/now/table/rm_release
    - /api/now/table/pm_project
  native:
    - Bash
complexity: intermediate
estimated_time: 10-30 minutes
---

# Agile Story Generation

## Overview

This skill enables you to generate well-structured user stories from high-level requirements, feature descriptions, or stakeholder requests within ServiceNow's Agile Development 2.0 module. It covers:

- Decomposing features into appropriately sized user stories
- Writing stories in standard "As a / I want / So that" format
- Estimating story points using relative sizing
- Linking stories to epics and assigning to sprints
- Generating acceptance criteria for each story
- Setting priority and classification fields

**When to use:** When product owners, scrum masters, or business analysts need to convert requirements into backlog-ready user stories in ServiceNow SPM.

## Prerequisites

- **Plugins:** `com.snc.sdlc.agile.2.0` (Agile Development 2.0)
- **Roles:** `scrum_user`, `scrum_master`, or `scrum_admin`
- **Access:** Read/write access to `rm_story`, `rm_epic`, `rm_sprint` tables
- **Knowledge:** Understanding of the project's epics, sprint cadence, and team velocity

## Procedure

### Step 1: Identify the Target Epic and Sprint

Query existing epics in the project to determine where the new stories belong.

**Using MCP (Claude Code/Desktop):**
```
Tool: SN-Query-Table
Parameters:
  table_name: rm_epic
  query: product.sys_id=[product_sys_id]^state!=3
  fields: sys_id,number,short_description,state,priority,story_points_total
  limit: 20
```

**Using REST API:**
```bash
GET /api/now/table/rm_epic?sysparm_query=product.sys_id=[product_sys_id]^state!=3&sysparm_fields=sys_id,number,short_description,state,priority,story_points_total&sysparm_limit=20
```

Query active sprints to find the target sprint for assignment:

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: rm_sprint
  query: release.product.sys_id=[product_sys_id]^state=2
  fields: sys_id,number,short_description,start_date,end_date,story_points,capacity
  limit: 5
```

**Using REST API:**
```bash
GET /api/now/table/rm_sprint?sysparm_query=release.product.sys_id=[product_sys_id]^state=2&sysparm_fields=sys_id,number,short_description,start_date,end_date,story_points,capacity&sysparm_limit=5
```

### Step 2: Analyze the Requirement

Break down the feature description into discrete, independently deliverable user stories. Apply the INVEST criteria:

| Criterion | Description | Validation |
|-----------|-------------|------------|
| **I**ndependent | No dependencies on other stories | Can be developed in isolation |
| **N**egotiable | Details can be discussed | Not over-specified |
| **V**aluable | Delivers user/business value | Clear "so that" clause |
| **E**stimable | Team can size it | Well-understood scope |
| **S**mall | Fits in a single sprint | Typically 1-8 story points |
| **T**estable | Clear pass/fail criteria | Has acceptance criteria |

### Step 3: Generate User Stories

For each identified story, create a record in the `rm_story` table.

**Using MCP:**
```
Tool: SN-Create-Record
Parameters:
  table_name: rm_story
  fields:
    short_description: "As a [persona], I want to [action] so that [benefit]"
    description: |
      ## User Story
      **As a** customer service representative
      **I want to** search for customers by phone number
      **So that** I can quickly locate their account during inbound calls

      ## Details
      - Search should support partial phone number matching
      - Results should display customer name, account number, and status
      - Search should return results within 2 seconds

      ## Technical Notes
      - Leverage existing customer API endpoint
      - Index phone_number field for performance
    story_points: 5
    epic: [epic_sys_id]
    sprint: [sprint_sys_id]
    state: -6
    priority: 2
    acceptance_criteria: |
      Given I am logged in as a service representative
      When I enter a phone number (full or partial) in the search field
      Then matching customer records are displayed within 2 seconds

      Given no matching records exist
      When I search for a phone number
      Then a "No results found" message is displayed

      Given multiple matches are found
      When results are displayed
      Then they are sorted by relevance with exact matches first
    product: [product_sys_id]
    assigned_to: [user_sys_id]
    classification: Enhancement
```

**Using REST API:**
```bash
POST /api/now/table/rm_story
Content-Type: application/json

{
  "short_description": "As a customer service rep, I want to search customers by phone number so I can locate accounts quickly",
  "description": "## User Story\n**As a** customer service representative\n**I want to** search for customers by phone number\n**So that** I can quickly locate their account during inbound calls",
  "story_points": 5,
  "epic": "[epic_sys_id]",
  "sprint": "[sprint_sys_id]",
  "state": "-6",
  "priority": 2,
  "acceptance_criteria": "Given I am logged in as a service representative\nWhen I enter a phone number in the search field\nThen matching customer records are displayed within 2 seconds",
  "product": "[product_sys_id]",
  "classification": "Enhancement"
}
```

### Step 4: Estimate Story Points

Use relative sizing based on team velocity and complexity. Apply the modified Fibonacci scale:

| Points | Effort Level | Example |
|--------|-------------|---------|
| 1 | Trivial | Text change, config update |
| 2 | Simple | Single field addition with validation |
| 3 | Small | New UI component with basic logic |
| 5 | Medium | Feature with multiple integration points |
| 8 | Large | Complex feature spanning multiple modules |
| 13 | Very Large | Consider splitting into smaller stories |

**Update story points after estimation:**

**Using MCP:**
```
Tool: SN-Update-Record
Parameters:
  table_name: rm_story
  sys_id: [story_sys_id]
  fields:
    story_points: 5
    blocked: false
```

**Using REST API:**
```bash
PATCH /api/now/table/rm_story/[story_sys_id]
Content-Type: application/json

{
  "story_points": 5,
  "blocked": false
}
```

### Step 5: Validate Sprint Capacity

Before assigning stories, verify the sprint has remaining capacity.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: rm_sprint
  query: sys_id=[sprint_sys_id]
  fields: sys_id,short_description,capacity,story_points,start_date,end_date
  limit: 1
```

Calculate remaining capacity: `remaining = capacity - story_points`. Only assign stories if the total story points of new stories fit within the remaining capacity.

### Step 6: Link Stories to Epic and Verify

Query the epic to confirm all stories are linked correctly:

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: rm_story
  query: epic=[epic_sys_id]^ORDERBYpriority
  fields: number,short_description,story_points,state,sprint,assigned_to,priority
  limit: 50
```

**Using REST API:**
```bash
GET /api/now/table/rm_story?sysparm_query=epic=[epic_sys_id]^ORDERBYpriority&sysparm_fields=number,short_description,story_points,state,sprint,assigned_to,priority&sysparm_limit=50
```

## Tool Usage

### MCP Tools Reference

| Tool | When to Use |
|------|-------------|
| `SN-Query-Table` | Query epics, sprints, existing stories, and products |
| `SN-Create-Record` | Create new user stories in rm_story |
| `SN-Update-Record` | Update story points, assignments, state |
| `SN-NL-Search` | Natural language search for related stories or requirements |

### REST API Reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/now/table/rm_story` | GET | Query existing stories |
| `/api/now/table/rm_story` | POST | Create new story |
| `/api/now/table/rm_story/{sys_id}` | PATCH | Update story fields |
| `/api/now/table/rm_epic` | GET | Query epics for linking |
| `/api/now/table/rm_sprint` | GET | Query sprints for assignment |

## Best Practices

- **One Action Per Story:** Each story should describe a single user action or capability
- **Include Acceptance Criteria:** Every story must have testable acceptance criteria before sprint planning
- **Right-Size Stories:** Aim for 1-8 story points; split anything estimated at 13+
- **Use Personas:** Write stories from the perspective of actual user personas, not generic "user"
- **Avoid Technical Language:** Stories describe what, not how; keep implementation details in tasks
- **Link to Epics:** Always associate stories with their parent epic for traceability
- **Verify Capacity:** Check sprint capacity before assigning stories to avoid overcommitment
- **Set Classification:** Use Enhancement, Defect, or Spike to categorize the story type

## Troubleshooting

### "Epic not found" when linking story

**Cause:** Epic sys_id is incorrect or epic belongs to a different product
**Solution:** Query `rm_epic` with the product filter to find valid epics: `product=[product_sys_id]^state!=3`

### "Sprint capacity exceeded" warning

**Cause:** Adding stories beyond the sprint's configured capacity
**Solution:** Check `capacity` vs `story_points` on the sprint record; consider moving stories to the next sprint

### "Story not appearing on sprint board"

**Cause:** Story is missing the sprint assignment or is in Draft state
**Solution:** Verify the `sprint` field is set and state is at least "Ready" (`state=-5`)

### "Cannot assign story to closed sprint"

**Cause:** Sprint state is Complete (3) or Closed
**Solution:** Query for active sprints with `state=2` and assign to a current or future sprint

## Examples

### Example 1: E-Commerce Feature Decomposition

**Input Requirement:** "Users should be able to manage their shopping cart"

**Generated Stories:**

1. **STY0010001** - "As a shopper, I want to add items to my cart so that I can purchase them later" (3 pts)
2. **STY0010002** - "As a shopper, I want to remove items from my cart so that I can change my mind" (2 pts)
3. **STY0010003** - "As a shopper, I want to update item quantities in my cart so that I can buy multiples" (3 pts)
4. **STY0010004** - "As a shopper, I want to see a cart summary with subtotal so that I know what I'm spending" (5 pts)
5. **STY0010005** - "As a shopper, I want my cart to persist across sessions so that I don't lose my selections" (5 pts)

**Total:** 18 story points across 5 stories

### Example 2: Single Story with Full Detail

**Input:** "Need password reset functionality for mobile app"

```
Tool: SN-Create-Record
Parameters:
  table_name: rm_story
  fields:
    short_description: "As a mobile app user, I want to reset my password from the login screen so that I can regain access to my account"
    story_points: 5
    epic: [auth_epic_sys_id]
    sprint: [current_sprint_sys_id]
    priority: 2
    state: -6
    classification: Enhancement
    acceptance_criteria: |
      Given I am on the mobile login screen
      When I tap "Forgot Password"
      Then I am prompted to enter my registered email address

      Given I enter a valid registered email
      When I submit the reset request
      Then I receive a password reset link via email within 60 seconds

      Given I click the reset link from the email
      When I enter a new password meeting complexity requirements
      Then my password is updated and I can log in with the new credentials

      Given I enter an unregistered email
      When I submit the reset request
      Then I see a generic message (no indication whether email exists)
```

## Related Skills

- `spm/acceptance-criteria` - Detailed acceptance criteria generation
- `spm/project-insights` - Track project health and velocity
- `spm/planning-summarization` - Summarize sprint and release planning
- `spm/feedback-summarization` - Retrospective feedback analysis
- `development/automated-testing` - Generate test cases from stories
