---
name: itsm-kb-generation
version: 1.0.0
description: Generate knowledge articles from resolved incidents and problems, structured with symptoms, cause, resolution, and workaround sections
author: Happy Technologies LLC
tags: [itsm, knowledge, kb-generation, incident, problem, resolution, workaround, self-service]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp:
    - SN-Query-Table
    - SN-Get-Record
    - SN-Create-Record
    - SN-Update-Record
    - SN-NL-Search
    - SN-Execute-Background-Script
  rest:
    - /api/now/table/incident
    - /api/now/table/problem
    - /api/now/table/kb_knowledge
    - /api/now/table/kb_knowledge_base
    - /api/now/table/kb_category
    - /api/now/table/sys_journal_field
  native:
    - Bash
complexity: intermediate
estimated_time: 15-30 minutes
---

# ITSM Knowledge Article Generation

## Overview

This skill provides a structured approach to generating knowledge articles from resolved IT service management incidents and problems. It covers:

- Identifying incidents and problems suitable for knowledge article creation
- Extracting symptom descriptions, diagnostic steps, and resolution procedures from case history
- Structuring articles with standardized Symptom/Cause/Resolution/Workaround format
- Checking for duplicate or overlapping existing knowledge articles
- Publishing articles to the appropriate knowledge base and category
- Linking generated articles back to source incidents and problems

**When to use:** When resolved incidents or confirmed problems contain reusable resolution knowledge that would benefit the service desk, end users, or future incident handlers. Particularly valuable for recurring issues, complex resolutions, or newly discovered problems.

**Plugin required:** `com.glideapp.knowledge` (Knowledge Management)

## Prerequisites

- **Roles:** `knowledge_admin`, `knowledge_manager`, `knowledge`, or `itil` with knowledge write access
- **Access:** Read access to `incident`, `problem`, `sys_journal_field`; write access to `kb_knowledge`
- **Knowledge:** Familiarity with knowledge management lifecycle, article quality standards, and the organization's KB taxonomy
- **Plugins:** `com.glideapp.knowledge` must be activated

## Procedure

### Step 1: Identify KB-Worthy Incidents

Find resolved incidents that are strong candidates for knowledge articles.

**Using MCP:**
```
Tool: SN-Execute-Background-Script
Parameters:
  description: Find resolved incidents suitable for knowledge article creation
  script: |
    gs.info('=== KB CANDIDATE IDENTIFICATION ===');

    // Find recurring incidents (same short_description appearing 3+ times)
    gs.info('\n--- RECURRING INCIDENTS ---');
    var ga = new GlideAggregate('incident');
    ga.addQuery('state', 'IN', '6,7'); // Resolved or Closed
    ga.addQuery('sys_created_on', '>=', gs.daysAgo(90));
    ga.addQuery('close_notes', '!=', '');
    ga.addAggregate('COUNT');
    ga.groupBy('short_description');
    ga.orderByAggregate('COUNT', 'DESC');
    ga.setLimit(20);
    ga.query();

    while (ga.next()) {
      var count = parseInt(ga.getAggregate('COUNT'));
      if (count >= 3) {
        // Check if KB article already exists
        var kb = new GlideRecord('kb_knowledge');
        kb.addQuery('short_description', 'LIKE', ga.short_description.toString().substring(0, 30));
        kb.addQuery('workflow_state', 'published');
        kb.setLimit(1);
        kb.query();

        var hasKB = kb.hasNext() ? 'YES' : 'NO';
        gs.info('Count: ' + count + ' | KB Exists: ' + hasKB + ' | Subject: ' + ga.short_description);
      }
    }

    // Find incidents with detailed close notes
    gs.info('\n--- INCIDENTS WITH DETAILED RESOLUTIONS ---');
    var detailed = new GlideRecord('incident');
    detailed.addQuery('state', 'IN', '6,7');
    detailed.addQuery('sys_created_on', '>=', gs.daysAgo(30));
    detailed.addQuery('close_notes', '!=', '');
    detailed.addQuery('close_notes.char_length', '>', 100);
    detailed.orderByDesc('resolved_at');
    detailed.setLimit(15);
    detailed.query();

    while (detailed.next()) {
      gs.info(detailed.number + ': ' + detailed.short_description + ' | Close Notes Length: ' + detailed.close_notes.toString().length);
    }
```

### Step 2: Identify KB-Worthy Problems

Find confirmed problems with known errors or workarounds.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: problem
  query: state=4^ORknown_error=true^workaroundISNOTEMPTY^ORfixISNOTEMPTY
  fields: sys_id,number,short_description,description,root_cause,workaround,fix,known_error,state,related_incidents
  limit: 20
```

**Using REST API:**
```bash
GET /api/now/table/problem?sysparm_query=state=4^ORknown_error=true^workaroundISNOTEMPTY^ORfixISNOTEMPTY&sysparm_fields=sys_id,number,short_description,description,root_cause,workaround,fix,known_error,state,related_incidents&sysparm_display_value=true&sysparm_limit=20
```

### Step 3: Extract Resolution Content from the Source Record

Pull the full case history to build article content.

**Using MCP (for an incident):**
```
Tool: SN-Get-Record
Parameters:
  table_name: incident
  sys_id: [incident_sys_id]
  fields: sys_id,number,short_description,description,category,subcategory,close_code,close_notes,cmdb_ci,business_service,priority,impact
```

```
Tool: SN-Query-Table
Parameters:
  table_name: sys_journal_field
  query: element_id=[incident_sys_id]^name=incident^element=work_notes^ORDERBYsys_created_on
  fields: value,sys_created_by,sys_created_on
  limit: 30
```

**Using REST API:**
```bash
GET /api/now/table/incident/[incident_sys_id]?sysparm_fields=sys_id,number,short_description,description,category,subcategory,close_code,close_notes,cmdb_ci,business_service&sysparm_display_value=true

GET /api/now/table/sys_journal_field?sysparm_query=element_id=[incident_sys_id]^name=incident^element=work_notes^ORDERBYsys_created_on&sysparm_fields=value,sys_created_by,sys_created_on&sysparm_limit=30
```

### Step 4: Check for Existing Articles

Avoid duplicates by searching for existing knowledge on the topic.

**Using MCP:**
```
Tool: SN-NL-Search
Parameters:
  table_name: kb_knowledge
  query: "[keywords from incident short_description]"
  fields: sys_id,number,short_description,workflow_state,sys_updated_on
  limit: 10
```

**Using REST API:**
```bash
GET /api/now/table/kb_knowledge?sysparm_query=short_descriptionLIKE[keyword]^ORtextLIKE[keyword]^workflow_stateINpublished,draft&sysparm_fields=sys_id,number,short_description,workflow_state,sys_updated_on&sysparm_display_value=true&sysparm_limit=10
```

### Step 5: Identify the Target Knowledge Base and Category

Find the appropriate KB and category for the article.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: kb_knowledge_base
  query: active=true^titleLIKEIT^ORtitleLIKEService Desk^ORtitleLIKETechnical
  fields: sys_id,title,description,owner
  limit: 5
```

```
Tool: SN-Query-Table
Parameters:
  table_name: kb_category
  query: kb_knowledge_base=[kb_sys_id]^active=true^ORDERBYlabel
  fields: sys_id,label,parent_id,full_category
  limit: 30
```

### Step 6: Create the Knowledge Article

Generate the article with standardized structure.

**Using MCP:**
```
Tool: SN-Create-Record
Parameters:
  table_name: kb_knowledge
  data:
    kb_knowledge_base: [kb_sys_id]
    kb_category: [category_sys_id]
    short_description: "[Clear, searchable title]"
    text: |
      <h2>Symptoms</h2>
      <p>Users may experience the following symptoms:</p>
      <ul>
        <li>[Symptom 1 - observable behavior]</li>
        <li>[Symptom 2 - error messages seen]</li>
        <li>[Symptom 3 - affected functionality]</li>
      </ul>
      <p><strong>Affected Systems:</strong> [CI/Service names]</p>
      <p><strong>Error Messages:</strong></p>
      <pre>[Exact error message text if applicable]</pre>

      <h2>Cause</h2>
      <p>[Explanation of what causes this issue]</p>
      <p><strong>Root Cause:</strong> [Technical root cause from problem record if available]</p>
      <p><strong>Contributing Factors:</strong></p>
      <ul>
        <li>[Factor 1]</li>
        <li>[Factor 2]</li>
      </ul>

      <h2>Resolution</h2>
      <p>Follow these steps to resolve the issue:</p>
      <ol>
        <li>[Step 1 with specific instructions]</li>
        <li>[Step 2 with specific instructions]</li>
        <li>[Step 3 with specific instructions]</li>
        <li>[Step 4 - verification step]</li>
      </ol>
      <p><strong>Expected Result:</strong> [What the user should see after applying the fix]</p>

      <h2>Workaround</h2>
      <p>If the resolution above is not immediately available, use this temporary workaround:</p>
      <ol>
        <li>[Workaround step 1]</li>
        <li>[Workaround step 2]</li>
      </ol>
      <p><strong>Limitations:</strong> [Any limitations of the workaround]</p>

      <h2>Additional Information</h2>
      <p><strong>Applies To:</strong> [Product/Service versions, OS versions, etc.]</p>
      <p><strong>Related Articles:</strong></p>
      <ul>
        <li>[KB Number] - [Related Article Title]</li>
      </ul>
      <p><strong>Source:</strong> Generated from [INC/PRB number]</p>
    workflow_state: draft
    valid_to: 2027-12-31
    source: [incident_or_problem_number]
    author: [current_user_sys_id]
```

**Using REST API:**
```bash
POST /api/now/table/kb_knowledge
Content-Type: application/json

{
  "kb_knowledge_base": "[kb_sys_id]",
  "kb_category": "[category_sys_id]",
  "short_description": "[Title]",
  "text": "<h2>Symptoms</h2>...",
  "workflow_state": "draft",
  "source": "[INC/PRB number]"
}
```

### Step 7: Link the Article to Source Records

Associate the new article with the source incident or problem.

**Using MCP:**
```
Tool: SN-Update-Record
Parameters:
  table_name: incident
  sys_id: [incident_sys_id]
  data:
    work_notes: "Knowledge article KB[number] created from this incident resolution. Article is in draft state pending review."
```

### Step 8: Bulk Article Generation from Resolved Incidents

Generate multiple article candidates at once.

**Using MCP:**
```
Tool: SN-Execute-Background-Script
Parameters:
  description: Generate KB article drafts from top recurring resolved incidents
  script: |
    gs.info('=== BULK KB ARTICLE GENERATION ===');

    var kbBase = '[kb_sys_id]';
    var category = '[category_sys_id]';

    // Find top recurring resolved incidents without KB articles
    var ga = new GlideAggregate('incident');
    ga.addQuery('state', 'IN', '6,7');
    ga.addQuery('sys_created_on', '>=', gs.daysAgo(90));
    ga.addQuery('close_notes', '!=', '');
    ga.addAggregate('COUNT');
    ga.groupBy('short_description');
    ga.addHaving('COUNT', '>', 3);
    ga.orderByAggregate('COUNT', 'DESC');
    ga.setLimit(10);
    ga.query();

    while (ga.next()) {
      var subject = ga.short_description.toString();

      // Check for existing KB
      var existingKB = new GlideRecord('kb_knowledge');
      existingKB.addQuery('short_description', 'LIKE', subject.substring(0, 30));
      existingKB.addQuery('workflow_state', 'published');
      existingKB.setLimit(1);
      existingKB.query();

      if (existingKB.hasNext()) {
        gs.info('SKIP (exists): ' + subject);
        continue;
      }

      // Get the best resolution from the most recent incident
      var inc = new GlideRecord('incident');
      inc.addQuery('short_description', subject);
      inc.addQuery('state', 'IN', '6,7');
      inc.addQuery('close_notes', '!=', '');
      inc.orderByDesc('resolved_at');
      inc.setLimit(1);
      inc.query();

      if (inc.next()) {
        gs.info('CANDIDATE: ' + subject + ' | Source: ' + inc.number + ' | Occurrences: ' + ga.getAggregate('COUNT'));
        gs.info('  Close Notes: ' + inc.close_notes.toString().substring(0, 200));
      }
    }
```

## Tool Usage

### MCP Tools Reference

| Tool | When to Use |
|------|-------------|
| `SN-Query-Table` | Query incidents, problems, existing KB articles, categories |
| `SN-Get-Record` | Retrieve full incident/problem record details |
| `SN-Create-Record` | Create new knowledge articles |
| `SN-Update-Record` | Link articles to source records, update article content |
| `SN-NL-Search` | Semantic search for existing articles to avoid duplicates |
| `SN-Execute-Background-Script` | Bulk candidate identification and article generation |

### REST API Reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/now/table/incident` | GET | Query resolved incidents |
| `/api/now/table/problem` | GET | Query confirmed problems |
| `/api/now/table/kb_knowledge` | GET/POST | Search and create KB articles |
| `/api/now/table/kb_knowledge_base` | GET | Find target knowledge bases |
| `/api/now/table/kb_category` | GET | Find target categories |
| `/api/now/table/sys_journal_field` | GET | Extract work notes for article content |

## Best Practices

- **Symptom-First Writing:** Lead with observable symptoms so users searching for help can quickly identify if the article matches their issue
- **Include Error Messages:** Document exact error messages verbatim for search accuracy
- **Separate Resolution from Workaround:** Clearly distinguish the permanent fix from temporary workarounds
- **Add Verification Steps:** Include how to confirm the resolution worked so users do not close prematurely
- **Cite Sources:** Reference the source incident or problem number for traceability and future updates
- **Draft First, Review Second:** Always create articles in draft state for peer review before publishing
- **Set Expiration:** Assign `valid_to` dates to trigger periodic reviews and prevent stale content
- **Use Searchable Titles:** Write titles that match how users would describe the problem, not how IT categorizes it

## Troubleshooting

### Close Notes Too Sparse for Article

**Cause:** Agents did not document resolution steps in detail
**Solution:** Review work notes for step-by-step diagnostic and resolution actions. Combine close notes with work note details.

### Duplicate Article Detected

**Cause:** Similar KB article already exists with slightly different title
**Solution:** Update the existing article instead of creating a new one. Merge content from the new resolution into the existing article.

### Article Not Searchable

**Cause:** Title or content does not match user search patterns
**Solution:** Add common keywords and error messages to the article text. Use meta tags for alternative search terms.

### Article Stuck in Draft

**Cause:** Knowledge approval workflow requires specific reviewer actions
**Solution:** Check the knowledge workflow configuration. Ensure the assigned reviewer has the `knowledge_manager` role. Manually advance the workflow state if testing.

## Examples

### Example 1: VPN Connection Issue Article

```
# 1. Get resolved VPN incidents
Tool: SN-Query-Table
Parameters:
  table_name: incident
  query: state=6^short_descriptionLIKEVPN^close_notesISNOTEMPTY^ORDERBYDESCresolved_at
  fields: number,short_description,description,close_notes,category
  limit: 10

# 2. Check for existing KB
Tool: SN-NL-Search
Parameters:
  table_name: kb_knowledge
  query: "VPN connection troubleshooting"
  fields: number,short_description,workflow_state
  limit: 5

# 3. Create the article
Tool: SN-Create-Record
Parameters:
  table_name: kb_knowledge
  data:
    short_description: "VPN Connection Fails - Troubleshooting Guide"
    text: "<h2>Symptoms</h2>..."
    workflow_state: draft
```

### Example 2: Article from Known Error

```
# 1. Get problem details
Tool: SN-Get-Record
Parameters:
  table_name: problem
  sys_id: [problem_sys_id]
  fields: number,short_description,root_cause,workaround,fix,known_error

# 2. Create KB with workaround
Tool: SN-Create-Record
Parameters:
  table_name: kb_knowledge
  data:
    short_description: "[Problem title] - Known Issue and Workaround"
    text: "<h2>Symptoms</h2>...<h2>Workaround</h2>[workaround from problem]"
    workflow_state: draft
```

### Example 3: KB Coverage Gap Report

```
Tool: SN-Execute-Background-Script
Parameters:
  description: Report on top incident categories without KB coverage
  script: |
    var ga = new GlideAggregate('incident');
    ga.addQuery('state', 'IN', '6,7');
    ga.addQuery('sys_created_on', '>=', gs.daysAgo(90));
    ga.addAggregate('COUNT');
    ga.groupBy('category');
    ga.groupBy('subcategory');
    ga.orderByAggregate('COUNT', 'DESC');
    ga.setLimit(15);
    ga.query();

    gs.info('=== KB COVERAGE GAP REPORT ===');
    while (ga.next()) {
      var cat = ga.category.getDisplayValue();
      var subcat = ga.subcategory.getDisplayValue();
      var count = ga.getAggregate('COUNT');

      var kb = new GlideAggregate('kb_knowledge');
      kb.addQuery('workflow_state', 'published');
      kb.addQuery('kb_category.label', 'LIKE', cat);
      kb.addAggregate('COUNT');
      kb.query();
      kb.next();
      var articleCount = kb.getAggregate('COUNT');

      gs.info(cat + ' > ' + subcat + ' | Incidents: ' + count + ' | KB Articles: ' + articleCount);
    }
```

## Related Skills

- `itsm/incident-summarization` - Summarize incidents before converting to KB
- `itsm/chat-reply-recommendation` - Reference generated KB articles in chat replies
- `itsm/email-recommendation` - Reference KB articles in email responses
- `hrsd/kb-generation` - HR-specific knowledge article generation
- `knowledge/article-generation` - General knowledge management skills

## References

- [ServiceNow Knowledge Management](https://docs.servicenow.com/bundle/utah-it-service-management/page/product/knowledge-management/concept/c_KnowledgeManagement.html)
- [Knowledge Article Lifecycle](https://docs.servicenow.com/bundle/utah-it-service-management/page/product/knowledge-management/concept/c_KnowledgeArticleLifecycle.html)
- [Problem Management](https://docs.servicenow.com/bundle/utah-it-service-management/page/product/problem-management/concept/c_ProblemManagement.html)
