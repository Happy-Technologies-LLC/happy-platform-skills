---
name: hr-kb-generation
version: 1.0.0
description: Generate HR knowledge articles from resolved cases, covering HR policy documentation, benefits FAQs, and onboarding guides
author: Happy Technologies LLC
tags: [hrsd, knowledge, kb-generation, hr-cases, policy, benefits, onboarding, self-service]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp:
    - SN-Query-Table
    - SN-Get-Record
    - SN-Create-Record
    - SN-Update-Record
    - SN-Execute-Background-Script
    - SN-NL-Search
  rest:
    - /api/now/table/sn_hr_core_case
    - /api/now/table/sn_hr_core_task
    - /api/now/table/sn_hr_le_case_type
    - /api/now/table/kb_knowledge
    - /api/now/table/kb_knowledge_base
    - /api/now/table/kb_category
  native:
    - Bash
complexity: intermediate
estimated_time: 15-30 minutes
---

# HR Knowledge Article Generation

## Overview

This skill provides a structured approach to generating knowledge articles from resolved HR service delivery cases. It covers:

- Identifying frequently asked HR questions from resolved case data
- Extracting resolution patterns to create reusable knowledge content
- Generating HR policy documentation articles from case outcomes
- Creating benefits FAQ articles based on common employee inquiries
- Building onboarding guide articles from new-hire case patterns
- Publishing and categorizing articles in the HR knowledge base

**When to use:** When HR teams want to reduce case volume by converting repeated inquiries into self-service knowledge articles, or when policies change and documentation needs to be updated based on recent case handling patterns.

**Plugin required:** `com.sn_hr_core` (HR Service Delivery Core)

## Prerequisites

- **Roles:** `sn_hr_core.admin`, `sn_hr_core.manager`, `knowledge_admin`, or `knowledge_manager`
- **Access:** Read access to `sn_hr_core_case`, `sn_hr_core_task`; write access to `kb_knowledge`
- **Knowledge:** Familiarity with HR case types, knowledge base structure, and article lifecycle
- **Plugins:** `com.sn_hr_core` and `com.glideapp.knowledge` must be activated

## Procedure

### Step 1: Identify High-Volume HR Case Topics

Find resolved HR cases grouped by topic or case type to discover candidates for knowledge articles.

**Using MCP:**
```
Tool: SN-Execute-Background-Script
Parameters:
  description: Identify top HR case topics for knowledge article generation
  script: |
    gs.info('=== HR CASE TOPIC ANALYSIS ===');

    // Top case types by volume
    gs.info('\n--- Top HR Case Types (Last 90 Days, Resolved) ---');
    var ga = new GlideAggregate('sn_hr_core_case');
    ga.addQuery('state', 'closed_complete');
    ga.addQuery('sys_created_on', '>=', gs.daysAgo(90));
    ga.addAggregate('COUNT');
    ga.groupBy('hr_service');
    ga.orderByAggregate('COUNT', 'DESC');
    ga.setLimit(15);
    ga.query();

    while (ga.next()) {
      gs.info('Service: ' + ga.hr_service.getDisplayValue() + ' | Cases: ' + ga.getAggregate('COUNT'));
    }

    // Frequent short descriptions (common questions)
    gs.info('\n--- Most Repeated Case Subjects ---');
    var subj = new GlideAggregate('sn_hr_core_case');
    subj.addQuery('state', 'closed_complete');
    subj.addQuery('sys_created_on', '>=', gs.daysAgo(90));
    subj.addAggregate('COUNT');
    subj.groupBy('short_description');
    subj.orderByAggregate('COUNT', 'DESC');
    subj.setLimit(20);
    subj.query();

    while (subj.next()) {
      var count = parseInt(subj.getAggregate('COUNT'));
      if (count >= 3) {
        gs.info('Subject: ' + subj.short_description + ' | Count: ' + count);
      }
    }
```

### Step 2: Retrieve Resolution Details for a Topic

Pull resolved cases for a specific topic to extract resolution content.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_hr_core_case
  query: state=closed_complete^short_descriptionLIKE[topic_keyword]^ORDERBYDESCclosed_at
  fields: sys_id,number,short_description,description,close_notes,resolution_code,hr_service,subject_person,opened_at,closed_at
  limit: 15
```

**Using REST API:**
```bash
GET /api/now/table/sn_hr_core_case?sysparm_query=state=closed_complete^short_descriptionLIKE[topic_keyword]^ORDERBYDESCclosed_at&sysparm_fields=sys_id,number,short_description,description,close_notes,resolution_code,hr_service,subject_person,opened_at,closed_at&sysparm_display_value=true&sysparm_limit=15
```

### Step 3: Review HR Case Types for Categorization

Understand the HR case type taxonomy for proper article categorization.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_hr_le_case_type
  query: active=true^ORDERBYname
  fields: sys_id,name,description,hr_service,topic_category,active
  limit: 50
```

**Using REST API:**
```bash
GET /api/now/table/sn_hr_le_case_type?sysparm_query=active=true^ORDERBYname&sysparm_fields=sys_id,name,description,hr_service,topic_category,active&sysparm_display_value=true&sysparm_limit=50
```

### Step 4: Check Existing Knowledge Base and Categories

Identify the HR knowledge base and available categories before creating articles.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: kb_knowledge_base
  query: titleLIKEHR^ORtitleLIKEHuman Resources
  fields: sys_id,title,description,active,owner
  limit: 5
```

```
Tool: SN-Query-Table
Parameters:
  table_name: kb_category
  query: kb_knowledge_base=[kb_sys_id]^active=true^ORDERBYlabel
  fields: sys_id,label,parent_id,full_category
  limit: 50
```

### Step 5: Generate the Knowledge Article

Create a knowledge article based on the extracted resolution patterns.

**Using MCP (Policy Documentation example):**
```
Tool: SN-Create-Record
Parameters:
  table_name: kb_knowledge
  data:
    kb_knowledge_base: [kb_sys_id]
    kb_category: [category_sys_id]
    short_description: "How to Request Parental Leave"
    text: |
      <h2>Overview</h2>
      <p>This article explains the process for requesting parental leave, including eligibility, duration, and required documentation.</p>

      <h2>Eligibility</h2>
      <ul>
        <li>Full-time employees who have been employed for at least 12 months</li>
        <li>Part-time employees working 20+ hours per week for at least 12 months</li>
      </ul>

      <h2>Leave Duration</h2>
      <p>Eligible employees may take up to 12 weeks of parental leave within the first year of a qualifying event (birth, adoption, foster placement).</p>

      <h2>How to Submit a Request</h2>
      <ol>
        <li>Navigate to the HR Service Portal</li>
        <li>Select "Leave of Absence" from the catalog</li>
        <li>Choose "Parental Leave" as the leave type</li>
        <li>Enter the expected start date and duration</li>
        <li>Upload supporting documentation</li>
        <li>Submit the request for manager approval</li>
      </ol>

      <h2>Required Documentation</h2>
      <ul>
        <li>Medical certification (for birth-related leave)</li>
        <li>Adoption or foster placement documentation</li>
        <li>Completed Leave Request Form (HR-201)</li>
      </ul>

      <h2>Frequently Asked Questions</h2>
      <p><strong>Q: Can I extend my parental leave?</strong></p>
      <p>A: Extensions may be available. Contact your HR Business Partner at least 2 weeks before your scheduled return date.</p>

      <p><strong>Q: Is parental leave paid?</strong></p>
      <p>A: The first 6 weeks are fully paid. Weeks 7-12 are at 60% base pay. Check your benefits summary for details.</p>
    workflow_state: draft
    valid_to: 2027-12-31
    author: [current_user_sys_id]
```

**Using REST API:**
```bash
POST /api/now/table/kb_knowledge
Content-Type: application/json

{
  "kb_knowledge_base": "[kb_sys_id]",
  "kb_category": "[category_sys_id]",
  "short_description": "How to Request Parental Leave",
  "text": "<h2>Overview</h2><p>...</p>",
  "workflow_state": "draft",
  "valid_to": "2027-12-31"
}
```

### Step 6: Generate Benefits FAQ Article

Create FAQ-style articles for common benefits inquiries.

**Using MCP:**
```
Tool: SN-Execute-Background-Script
Parameters:
  description: Extract benefits-related questions from resolved HR cases for FAQ generation
  script: |
    gs.info('=== BENEFITS FAQ EXTRACTION ===');

    var gr = new GlideRecord('sn_hr_core_case');
    gr.addQuery('state', 'closed_complete');
    gr.addQuery('hr_service.name', 'LIKE', 'Benefits');
    gr.addQuery('sys_created_on', '>=', gs.daysAgo(180));
    gr.orderByDesc('sys_created_on');
    gr.setLimit(30);
    gr.query();

    var faqEntries = {};
    while (gr.next()) {
      var question = gr.short_description.toString();
      var answer = gr.close_notes.toString();
      if (question && answer) {
        if (!faqEntries[question]) {
          faqEntries[question] = answer;
          gs.info('Q: ' + question);
          gs.info('A: ' + answer);
          gs.info('---');
        }
      }
    }
```

### Step 7: Generate Onboarding Guide

Build onboarding content from new-hire case patterns.

**Using MCP:**
```
Tool: SN-Execute-Background-Script
Parameters:
  description: Identify common onboarding topics from new-hire HR cases
  script: |
    gs.info('=== ONBOARDING GUIDE TOPICS ===');

    var ga = new GlideAggregate('sn_hr_core_case');
    ga.addQuery('state', 'closed_complete');
    ga.addQuery('hr_service.name', 'LIKE', 'Onboarding');
    ga.addQuery('sys_created_on', '>=', gs.daysAgo(180));
    ga.addAggregate('COUNT');
    ga.groupBy('short_description');
    ga.orderByAggregate('COUNT', 'DESC');
    ga.setLimit(15);
    ga.query();

    gs.info('--- Top Onboarding Questions ---');
    while (ga.next()) {
      gs.info('Topic: ' + ga.short_description + ' | Cases: ' + ga.getAggregate('COUNT'));
    }

    // Also check onboarding tasks for common task types
    gs.info('\n--- Common Onboarding Tasks ---');
    var tasks = new GlideAggregate('sn_hr_core_task');
    tasks.addQuery('parent.hr_service.name', 'LIKE', 'Onboarding');
    tasks.addAggregate('COUNT');
    tasks.groupBy('short_description');
    tasks.orderByAggregate('COUNT', 'DESC');
    tasks.setLimit(10);
    tasks.query();

    while (tasks.next()) {
      gs.info('Task: ' + tasks.short_description + ' | Count: ' + tasks.getAggregate('COUNT'));
    }
```

## Tool Usage

### MCP Tools Reference

| Tool | When to Use |
|------|-------------|
| `SN-Query-Table` | Query HR cases, case types, knowledge bases, categories |
| `SN-Get-Record` | Retrieve specific case or article details |
| `SN-Create-Record` | Create new knowledge articles |
| `SN-Update-Record` | Update article content, state, or metadata |
| `SN-Execute-Background-Script` | Bulk analysis of case patterns, FAQ extraction |
| `SN-NL-Search` | Natural language queries like "resolved benefits cases this quarter" |

### REST API Reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/now/table/sn_hr_core_case` | GET | Query resolved HR cases |
| `/api/now/table/sn_hr_core_task` | GET | Query HR case tasks |
| `/api/now/table/sn_hr_le_case_type` | GET | List HR case types |
| `/api/now/table/kb_knowledge` | GET/POST | Create and query knowledge articles |
| `/api/now/table/kb_knowledge_base` | GET | Find HR knowledge bases |
| `/api/now/table/kb_category` | GET | List knowledge categories |

## Best Practices

- **Mine Closed Cases:** Focus on cases with `state=closed_complete` and clear `close_notes` for the best content source material
- **Anonymize Content:** Remove employee names, IDs, and personal details before publishing; use generic examples
- **Use Consistent Structure:** Standardize article format with Overview, Eligibility, Process, FAQ, and Related Links sections
- **Set Review Dates:** Assign `valid_to` dates aligned with annual policy review cycles
- **Tag Appropriately:** Use HR service categories as article tags for improved search and self-service relevance
- **Draft First:** Always create articles in `draft` state for HR team review before publishing

## Troubleshooting

### No Resolved Cases Found for Topic

**Cause:** Query filters too restrictive or cases closed with different terminology
**Solution:** Broaden the keyword search. Use `LIKE` operator or `SN-NL-Search` for flexible matching. Check `resolution_code` values.

### Knowledge Base Not Found

**Cause:** HR knowledge base not configured or uses a non-standard name
**Solution:** Query `kb_knowledge_base` without filters to list all available knowledge bases. Create one if needed via HR administration.

### Article Not Appearing in Portal

**Cause:** Article still in `draft` state or not assigned to a user-facing knowledge base
**Solution:** Update `workflow_state` to `published`. Verify the knowledge base is configured for the HR Service Portal.

### Duplicate Articles Created

**Cause:** Similar resolved cases generated overlapping content
**Solution:** Search existing articles before creating new ones. Merge duplicate articles by consolidating content into one and retiring the other.

## Examples

### Example 1: PTO Policy Article from Case Data

```
# 1. Find resolved PTO cases
Tool: SN-Query-Table
Parameters:
  table_name: sn_hr_core_case
  query: state=closed_complete^short_descriptionLIKEPTO^ORshort_descriptionLIKEtime off
  fields: number,short_description,close_notes,hr_service
  limit: 20

# 2. Create the KB article
Tool: SN-Create-Record
Parameters:
  table_name: kb_knowledge
  data:
    kb_knowledge_base: [hr_kb_sys_id]
    short_description: "PTO Policy and Request Process"
    text: "[Generated content from case analysis]"
    workflow_state: draft
```

### Example 2: Benefits Open Enrollment FAQ

```
Tool: SN-Query-Table
Parameters:
  table_name: sn_hr_core_case
  query: state=closed_complete^short_descriptionLIKEenrollment^ORshort_descriptionLIKEbenefits
  fields: number,short_description,description,close_notes
  limit: 25
```

### Example 3: Bulk Article Gap Analysis

```
Tool: SN-Execute-Background-Script
Parameters:
  description: Find HR topics with high case volume but no knowledge articles
  script: |
    var ga = new GlideAggregate('sn_hr_core_case');
    ga.addQuery('state', 'closed_complete');
    ga.addQuery('sys_created_on', '>=', gs.daysAgo(90));
    ga.addAggregate('COUNT');
    ga.groupBy('short_description');
    ga.orderByAggregate('COUNT', 'DESC');
    ga.setLimit(20);
    ga.query();

    gs.info('=== TOPICS NEEDING KB ARTICLES ===');
    while (ga.next()) {
      var topic = ga.short_description.toString();
      var count = parseInt(ga.getAggregate('COUNT'));
      if (count < 3) continue;

      // Check if KB article exists
      var kb = new GlideRecord('kb_knowledge');
      kb.addQuery('short_description', 'LIKE', topic.substring(0, 30));
      kb.addQuery('workflow_state', 'published');
      kb.setLimit(1);
      kb.query();

      if (!kb.hasNext()) {
        gs.info('NO ARTICLE: "' + topic + '" | Cases: ' + count);
      }
    }
```

## Related Skills

- `hrsd/email-recommendation` - Generate HR email responses referencing KB articles
- `hrsd/sidebar-summarization` - Summarize HR case context for article creation
- `knowledge/article-generation` - General knowledge article creation
- `hrsd/case-summarization` - Summarize HR cases before converting to KB content

## References

- [ServiceNow HR Service Delivery](https://docs.servicenow.com/bundle/utah-hr-service-delivery/page/product/human-resources/concept/c_HRServiceDelivery.html)
- [Knowledge Management](https://docs.servicenow.com/bundle/utah-it-service-management/page/product/knowledge-management/concept/c_KnowledgeManagement.html)
- [HR Knowledge Best Practices](https://docs.servicenow.com/bundle/utah-hr-service-delivery/page/product/human-resources/concept/hr-knowledge-management.html)
