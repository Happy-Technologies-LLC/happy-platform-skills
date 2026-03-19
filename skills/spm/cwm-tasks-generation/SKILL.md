---
name: cwm-tasks-generation
version: 1.0.0
description: Generate task breakdowns from requirements or user stories with structured task lists, dependencies, assignments, and effort estimates
author: Happy Technologies LLC
tags: [spm, cwm, tasks, project, work-breakdown, wbs, estimation, dependencies, planning]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp:
    - SN-Query-Table
    - SN-Create-Record
    - SN-Update-Record
    - SN-Read-Record
    - SN-Get-Table-Schema
  rest:
    - /api/now/table/pm_project
    - /api/now/table/pm_project_task
    - /api/now/table/planned_task
    - /api/now/table/pm_resource_plan
    - /api/now/table/sys_user_group
    - /api/now/table/sys_user
  native:
    - Bash
complexity: intermediate
estimated_time: 20-45 minutes
---

# CWM Task Generation

## Overview

This skill covers generating structured task breakdowns from requirements, user stories, or high-level project descriptions in ServiceNow CWM:

- Decomposing requirements into hierarchical work breakdown structures (WBS)
- Creating project tasks with effort estimates, durations, and skill requirements
- Defining task dependencies (finish-to-start, start-to-start, finish-to-finish)
- Assigning tasks to team members based on skills and availability
- Setting milestones and phase gates at appropriate project checkpoints
- Generating parallel workstreams where tasks can execute concurrently

**When to use:** When starting a new project phase, converting approved requirements into executable tasks, breaking down epics or user stories, or restructuring a project plan for replanning.

## Prerequisites

- **Roles:** `project_manager`, `program_manager`, or `admin`
- **Plugins:** `com.snc.project_management` (Project Portfolio Management) or CWM workspace
- **Access:** Write access to `pm_project_task`, `planned_task` tables
- **Data:** An existing project record and defined requirements or user stories
- **Related Skills:** `spm/cwm-doc-generation` for status reporting, `spm/acceptance-criteria` for defining done criteria

## Procedure

### Step 1: Analyze the Source Requirements

Review the input requirements or user stories to identify work components.

**MCP Approach:**
```
Tool: SN-Read-Record
Parameters:
  table_name: pm_project
  sys_id: [PROJECT_SYS_ID]
  fields: sys_id,number,short_description,description,planned_start_date,planned_end_date,project_manager,methodology
```

If requirements are stored as stories or demand items:
```
Tool: SN-Query-Table
Parameters:
  table_name: rm_story
  query: product=[PROJECT_SYS_ID]^state!=cancelled
  fields: sys_id,number,short_description,description,acceptance_criteria,story_points,priority
  limit: 50
```

**Decomposition Framework:**

| Requirement Type | Decomposition Approach |
|-----------------|----------------------|
| Epic / Feature | Break into user stories, then tasks |
| User Story | Break into implementation tasks (design, build, test, deploy) |
| Technical Requirement | Break into analysis, implementation, validation tasks |
| Business Process | Break into process steps, each becoming a task |
| Integration | Break into design, develop, test, certify tasks |

### Step 2: Define Work Breakdown Structure

Create the hierarchical task structure with parent-child relationships.

```
PROJECT: [Project Name]
|
+-- Phase 1: [Phase Name]
|   +-- WP 1.1: [Work Package]
|   |   +-- Task 1.1.1: [Task]
|   |   +-- Task 1.1.2: [Task]
|   +-- WP 1.2: [Work Package]
|   |   +-- Task 1.2.1: [Task]
|   +-- Milestone: [Phase 1 Complete]
|
+-- Phase 2: [Phase Name]
|   +-- WP 2.1: [Work Package]
|   ...
```

### Step 3: Create Phase Tasks

Build the top-level phase containers.

**MCP Approach:**
```
Tool: SN-Create-Record
Parameters:
  table_name: pm_project_task
  data:
    project: [PROJECT_SYS_ID]
    short_description: "Phase 1: Requirements and Design"
    description: "Gather detailed requirements, create solution design, and obtain stakeholder approval"
    state: pending
    priority: 2
    planned_start_date: "2026-04-01"
    planned_end_date: "2026-04-30"
    top_task: true
    wbs: "1"
```

**REST Approach:**
```
POST /api/now/table/pm_project_task
Body: {
  "project": "[PROJECT_SYS_ID]",
  "short_description": "Phase 1: Requirements and Design",
  "description": "Gather detailed requirements, create solution design, and obtain stakeholder approval",
  "state": "pending",
  "priority": "2",
  "planned_start_date": "2026-04-01",
  "planned_end_date": "2026-04-30",
  "top_task": "true",
  "wbs": "1"
}
```

### Step 4: Create Work Package and Leaf Tasks

Build detailed tasks under each phase.

**MCP Approach:**
```
Tool: SN-Create-Record
Parameters:
  table_name: pm_project_task
  data:
    project: [PROJECT_SYS_ID]
    parent: [PHASE_TASK_SYS_ID]
    short_description: "Conduct stakeholder interviews"
    description: "Schedule and conduct interviews with 8 key stakeholders to gather requirements for the new system"
    state: pending
    priority: 2
    planned_start_date: "2026-04-01"
    planned_end_date: "2026-04-05"
    estimated_work_duration: "3 days"
    assigned_to: [USER_SYS_ID]
    assignment_group: [GROUP_SYS_ID]
    wbs: "1.1"
    skill: "Business Analysis"
```

**REST Approach:**
```
POST /api/now/table/pm_project_task
Body: {
  "project": "[PROJECT_SYS_ID]",
  "parent": "[PHASE_TASK_SYS_ID]",
  "short_description": "Conduct stakeholder interviews",
  "state": "pending",
  "planned_start_date": "2026-04-01",
  "planned_end_date": "2026-04-05",
  "estimated_work_duration": "3 days",
  "assigned_to": "[USER_SYS_ID]",
  "wbs": "1.1"
}
```

**Standard Task Templates per Requirement Type:**

| User Story Task | Est. Effort | Skills Needed |
|----------------|-------------|---------------|
| Requirements Analysis | 4-8 hrs | Business Analyst |
| Solution Design | 8-16 hrs | Architect/Tech Lead |
| Implementation/Build | 16-40 hrs | Developer |
| Unit Testing | 4-8 hrs | Developer |
| Integration Testing | 8-16 hrs | QA Engineer |
| User Acceptance Testing | 4-8 hrs | BA + End Users |
| Documentation | 4-8 hrs | Tech Writer/BA |
| Deployment | 2-4 hrs | DevOps/Admin |

### Step 5: Define Task Dependencies

Create predecessor/successor relationships between tasks.

**MCP Approach:**
```
Tool: SN-Update-Record
Parameters:
  table_name: pm_project_task
  sys_id: [TASK_SYS_ID]
  data:
    predecessor: [PREDECESSOR_TASK_SYS_ID]
    predecessor_type: "FS"
```

**Dependency Types:**

| Type | Code | Meaning | Example |
|------|------|---------|---------|
| Finish-to-Start | FS | B starts after A finishes | Build after Design |
| Start-to-Start | SS | B starts when A starts | Testing starts with Build |
| Finish-to-Finish | FF | B finishes when A finishes | Documentation finishes with Build |
| Start-to-Finish | SF | B finishes when A starts | Rarely used |

**Common Dependency Patterns:**
```
Requirements Analysis (FS) -> Solution Design (FS) -> Implementation
Implementation (FS) -> Unit Testing (FS) -> Integration Testing
Integration Testing (FS) -> UAT (FS) -> Deployment
Documentation (SS) -> Implementation (parallel start)
```

### Step 6: Set Milestones

Create milestone tasks at key project checkpoints.

**MCP Approach:**
```
Tool: SN-Create-Record
Parameters:
  table_name: pm_project_task
  data:
    project: [PROJECT_SYS_ID]
    parent: [PHASE_TASK_SYS_ID]
    short_description: "MILESTONE: Design Review Approved"
    state: pending
    milestone: true
    planned_end_date: "2026-04-15"
    duration: "0"
    predecessor: [DESIGN_TASK_SYS_ID]
    wbs: "1.5"
```

**Recommended Milestones:**

| Milestone | Trigger | Gate Criteria |
|-----------|---------|---------------|
| Requirements Approved | All requirements reviewed | Sign-off from sponsor |
| Design Complete | Architecture and design reviewed | Technical review passed |
| Development Complete | All features built | Code review passed, unit tests green |
| Testing Complete | All test cycles done | No P1/P2 defects open |
| Go-Live Ready | Deployment validated | Stakeholder approval obtained |

### Step 7: Estimate Effort and Duration

Apply estimation techniques to each task.

**Estimation Methods:**

| Method | When to Use | Approach |
|--------|------------|----------|
| Analogous | Similar past project exists | Compare to historical task durations |
| Parametric | Quantifiable work units | Multiply unit count by per-unit effort |
| Three-Point | Uncertainty is high | (Optimistic + 4*Likely + Pessimistic) / 6 |
| Expert Judgment | Novel or complex work | Consult SME for estimate |

**Apply estimates to tasks:**
```
Tool: SN-Update-Record
Parameters:
  table_name: pm_project_task
  sys_id: [TASK_SYS_ID]
  data:
    estimated_work_duration: "16 hours"
    planned_start_date: "2026-04-07"
    planned_end_date: "2026-04-09"
    work_notes: "Estimate based on three-point: Opt=12h, Likely=16h, Pess=24h. PERT=16.3h"
```

### Step 8: Assign Resources

Match tasks to team members based on skills and availability.

**MCP Approach:**
```
Tool: SN-Query-Table
Parameters:
  table_name: pm_resource_plan
  query: project=[PROJECT_SYS_ID]^state=active
  fields: sys_id,resource,role,planned_hours,actual_hours,remaining_hours,start_date,end_date
  limit: 30
```

```
Tool: SN-Update-Record
Parameters:
  table_name: pm_project_task
  sys_id: [TASK_SYS_ID]
  data:
    assigned_to: [USER_SYS_ID]
    assignment_group: [GROUP_SYS_ID]
```

### Step 9: Validate the Task Breakdown

Review the generated task structure for completeness and feasibility.

**Validation Checklist:**
```
TASK BREAKDOWN VALIDATION:
- [ ] All requirements have corresponding tasks
- [ ] No orphan tasks (every task has a parent or is top-level)
- [ ] Dependencies form a valid DAG (no circular dependencies)
- [ ] Critical path identified and reasonable
- [ ] All tasks have effort estimates
- [ ] All tasks have assigned resources
- [ ] Milestones placed at phase boundaries
- [ ] Resource loading does not exceed capacity
- [ ] Buffer/contingency included (10-20% of total effort)
- [ ] Task descriptions are clear and actionable
```

**MCP Approach to verify:**
```
Tool: SN-Query-Table
Parameters:
  table_name: pm_project_task
  query: project=[PROJECT_SYS_ID]^assigned_to=NULL^milestone=false
  fields: number,short_description,wbs,state
  limit: 100
```

### Step 10: Generate Task Summary Report

Produce a summary of the generated task breakdown.

```
=== TASK BREAKDOWN SUMMARY ===
Project: [number] - [name]
Generated: [date]

STRUCTURE:
Phases: [count]
Work Packages: [count]
Tasks: [count]
Milestones: [count]

EFFORT SUMMARY:
Total Estimated Effort: [hours] hours
Total Duration: [days] business days
Critical Path Duration: [days] business days

RESOURCE ALLOCATION:
| Resource | Role | Allocated Hours | Utilization |
|----------|------|----------------|-------------|
| [name] | [role] | [hours] | [%] |

DEPENDENCY MAP:
[Task A] -> [Task B] -> [Task C] (Critical Path)
[Task D] -> [Task E] (Parallel Stream)

MILESTONES:
| Milestone | Date | Dependencies |
|-----------|------|-------------|
| [name] | [date] | [predecessor tasks] |
```

## Tool Usage

| Tool | Purpose | When to Use |
|------|---------|-------------|
| SN-Query-Table | Find existing tasks, resources, requirements | Discovery and validation |
| SN-Create-Record | Create project tasks and milestones | Building the task breakdown |
| SN-Update-Record | Set dependencies, assign resources, update estimates | Task configuration |
| SN-Read-Record | Get project details and individual task records | Context gathering |
| SN-Get-Table-Schema | Discover pm_project_task fields | Initial setup |

## Best Practices

1. **Decompose to 8-40 hour tasks** -- tasks smaller than 8 hours create overhead, larger than 40 hours lack visibility
2. **Use verb-noun naming** -- "Design database schema" not "Database schema"
3. **Include all work types** -- do not forget testing, documentation, deployment, and review tasks
4. **Add buffer tasks** -- include 10-20% contingency for unknowns
5. **Define "done" criteria** -- each task should have clear completion criteria
6. **Minimize dependencies** -- the fewer dependencies, the more scheduling flexibility
7. **Identify critical path** -- know which tasks directly impact the project end date
8. **Balance resource loading** -- avoid over-allocating any single team member
9. **Review with the team** -- validate estimates and assignments with the people doing the work
10. **Version your breakdown** -- save baseline before making changes for comparison

## Troubleshooting

| Issue | Cause | Resolution |
|-------|-------|------------|
| Tasks not rolling up to parent | Parent reference not set | Verify `parent` field on child tasks points to correct parent sys_id |
| Duration calculation incorrect | Work calendar not configured | Check project work schedule; verify business days vs calendar days |
| Circular dependency error | Task A depends on B which depends on A | Review dependency chain; remove or restructure circular references |
| Resource over-allocation | Same person assigned overlapping tasks | Stagger task dates or reassign to balance workload |
| WBS numbering gaps | Tasks created out of order | Re-sequence WBS numbers after all tasks are created |
| Milestone showing duration | Duration field not set to zero | Update milestone tasks to set `duration=0` and `milestone=true` |

## Examples

### Example 1: Web Application Development

**Requirement:** "Build a customer self-service portal with account management, ticket submission, and knowledge base search."

**Generated Breakdown:**
```
Phase 1: Design (2 weeks)
  1.1 UX Research & Wireframes - 24h - UX Designer
  1.2 Technical Architecture - 16h - Architect
  1.3 API Design - 12h - Tech Lead
  1.4 Design Review - MILESTONE

Phase 2: Development (4 weeks)
  2.1 Account Management Module - 40h - Developer A
  2.2 Ticket Submission Module - 32h - Developer B
  2.3 KB Search Integration - 24h - Developer A
  2.4 UI Implementation - 40h - Frontend Dev
  2.5 Code Complete - MILESTONE

Phase 3: Testing (2 weeks)
  3.1 Integration Testing - 24h - QA Engineer
  3.2 UAT Execution - 16h - BA + Users
  3.3 Performance Testing - 12h - QA Engineer
  3.4 Test Complete - MILESTONE

Phase 4: Deployment (1 week)
  4.1 Production Setup - 8h - DevOps
  4.2 Data Migration - 12h - DBA
  4.3 Go-Live - MILESTONE
```

### Example 2: System Integration Project

**Requirement:** "Integrate ServiceNow ITSM with Jira for bi-directional incident synchronization."

**Generated Breakdown:**
```
Phase 1: Analysis (1 week)
  1.1 Map field mappings SN <-> Jira - 8h - BA
  1.2 Define sync rules and conflict resolution - 8h - Tech Lead
  1.3 Requirements Signed Off - MILESTONE

Phase 2: Build (3 weeks)
  2.1 Configure IntegrationHub spoke - 16h - Developer
  2.2 Build SN-to-Jira sync flow - 24h - Developer
  2.3 Build Jira-to-SN webhook handler - 24h - Developer
  2.4 Error handling and retry logic - 12h - Developer
  2.5 Integration Complete - MILESTONE

Phase 3: Validate (1 week)
  3.1 End-to-end sync testing - 16h - QA
  3.2 Edge case and error testing - 8h - QA
  3.3 Validation Complete - MILESTONE

Phase 4: Rollout (3 days)
  4.1 Production configuration - 4h - Admin
  4.2 Historical data sync - 8h - Developer
  4.3 Go-Live - MILESTONE
```

## Related Skills

- `spm/cwm-doc-generation` - Generate status reports from project data
- `spm/acceptance-criteria` - Define acceptance criteria for tasks
- `spm/agile-story-generation` - Generate user stories from requirements
- `spm/project-insights` - Analyze project performance metrics
- `spm/planning-summarization` - Summarize planning data
