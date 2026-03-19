---
name: article-generation
version: 1.0.0
description: Generate knowledge articles from resolved incidents, problem records, and change implementations with proper KB structure including symptoms, cause, resolution, and related articles
author: Happy Technologies LLC
tags: [knowledge, article, generation, incident, problem, change, authoring, knowledge-management]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp:
    - SN-Query-Table
    - SN-NL-Search
    - SN-Create-Record
    - SN-Update-Record
    - SN-Add-Work-Notes
  rest:
    - /api/now/table/kb_knowledge
    - /api/now/table/kb_knowledge_base
    - /api/now/table/kb_category
    - /api/now/table/incident
    - /api/now/table/problem
    - /api/now/table/change_request
    - /api/now/table/m2m_kb_task
  native:
    - Bash
complexity: advanced
estimated_time: 15-30 minutes
---

# Knowledge Article Generation

## Overview

This skill provides a structured workflow for generating knowledge articles from resolved ServiceNow records including incidents, problem records, and change requests. Well-documented resolutions become reusable knowledge that reduces future resolution time and enables self-service.

This skill helps you:

- Extract resolution details from closed incidents, problems, and changes
- Structure content into a standard KB article format (symptoms, cause, resolution, workaround)
- Assign the article to the correct knowledge base and category
- Check for existing articles to avoid creating duplicates
- Create draft articles ready for knowledge manager review
- Link the source records to the new article for traceability

**When to use:** After resolving recurring incidents, closing problem investigations with root cause, completing change implementations that affect user workflows, or during periodic knowledge harvesting sessions.

## Prerequisites

- **Roles:** `knowledge` or `knowledge_manager` for article creation; `itil` for reading source records
- **Access:** Read access to `incident`, `problem`, `change_request` tables; write access to `kb_knowledge`
- **Plugin:** `com.glideapp.knowledge` (Knowledge Management) activated
- **Knowledge:** Understanding of your organization's KB article templates, knowledge bases, and approval workflows

## Procedure

### Step 1: Identify Source Records for Article Generation

Find resolved incidents, problems, or changes that are good candidates for knowledge articles.

**Criteria for good candidates:**
- Resolved incidents with detailed close notes
- Incidents that recurred 3+ times for the same topic
- Problem records with confirmed root cause
- Change requests with post-implementation procedures

**Using MCP (recurring incidents):**
```
Tool: SN-Query-Table
Parameters:
  table_name: incident
  query: state=6^opened_at>=javascript:gs.daysAgoStart(30)^close_notesISNOTEMPTY^kb_knowledgeISEMPTY
  fields: sys_id,number,short_description,description,close_notes,category,subcategory,cmdb_ci,assignment_group,resolution_code,resolved_by
  limit: 30
```

**Using REST API:**
```bash
GET /api/now/table/incident?sysparm_query=state=6^opened_at>=javascript:gs.daysAgoStart(30)^close_notesISNOTEMPTY^kb_knowledgeISEMPTY&sysparm_fields=sys_id,number,short_description,description,close_notes,category,subcategory,cmdb_ci,assignment_group,resolution_code,resolved_by&sysparm_limit=30
```

**Using MCP (problem records with root cause):**
```
Tool: SN-Query-Table
Parameters:
  table_name: problem
  query: state=4^cause_notesISNOTEMPTY^opened_at>=javascript:gs.daysAgoStart(90)
  fields: sys_id,number,short_description,description,cause_notes,fix_notes,category,subcategory,cmdb_ci,known_error,workaround
  limit: 20
```

**Using REST API:**
```bash
GET /api/now/table/problem?sysparm_query=state=4^cause_notesISNOTEMPTY^opened_at>=javascript:gs.daysAgoStart(90)&sysparm_fields=sys_id,number,short_description,description,cause_notes,fix_notes,category,subcategory,cmdb_ci,known_error,workaround&sysparm_limit=20
```

**Using MCP (change requests with implementation notes):**
```
Tool: SN-Query-Table
Parameters:
  table_name: change_request
  query: state=3^close_notesISNOTEMPTY^type=normal^opened_at>=javascript:gs.daysAgoStart(90)
  fields: sys_id,number,short_description,description,close_notes,implementation_plan,backout_plan,category,cmdb_ci
  limit: 20
```

### Step 2: Check for Existing Articles to Avoid Duplicates

Before creating a new article, verify no existing article covers the same topic.

**Using MCP:**
```
Tool: SN-NL-Search
Parameters:
  table_name: kb_knowledge
  query: "published articles about Outlook calendar sync errors on mobile devices"
  fields: sys_id,number,short_description,kb_knowledge_base,kb_category,workflow_state,sys_updated_on
  limit: 10
```

**Using REST API:**
```bash
GET /api/now/table/kb_knowledge?sysparm_query=workflow_state=published^short_descriptionLIKEoutlook^short_descriptionLIKEcalendar^ORshort_descriptionLIKEsync&sysparm_fields=sys_id,number,short_description,kb_knowledge_base,kb_category,workflow_state,sys_updated_on&sysparm_limit=10
```

If a matching article exists, consider updating it rather than creating a duplicate.

### Step 3: Identify the Target Knowledge Base and Category

Find the appropriate knowledge base and category for the new article.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: kb_knowledge_base
  query: active=true
  fields: sys_id,title,description,kb_version,owner,active
  limit: 20
```

```
Tool: SN-Query-Table
Parameters:
  table_name: kb_category
  query: kb_knowledge_base=[target_kb_sys_id]^active=true
  fields: sys_id,label,parent_id,full_category
  limit: 30
```

**Using REST API:**
```bash
GET /api/now/table/kb_knowledge_base?sysparm_query=active=true&sysparm_fields=sys_id,title,description,kb_version,owner,active&sysparm_limit=20
```

```bash
GET /api/now/table/kb_category?sysparm_query=kb_knowledge_base=[target_kb_sys_id]^active=true&sysparm_fields=sys_id,label,parent_id,full_category&sysparm_limit=30
```

### Step 4: Structure the Article Content

Organize the extracted information into a standard knowledge article format. The article body should follow this template:

**Article Structure Template:**

```html
<h2>Symptoms</h2>
<p>[Describe what the user experiences - error messages, unexpected behavior, inability to perform a task]</p>

<h2>Cause</h2>
<p>[Explain the root cause or contributing factors]</p>

<h2>Resolution</h2>
<ol>
  <li>[Step-by-step resolution instructions]</li>
  <li>[Include screenshots or commands where applicable]</li>
  <li>[Specify expected outcome after each step]</li>
</ol>

<h2>Workaround</h2>
<p>[If a permanent fix is not available, describe temporary workaround]</p>

<h2>Additional Information</h2>
<ul>
  <li>Affected Systems: [CI or service name]</li>
  <li>Source: [INC/PRB/CHG number]</li>
  <li>Related Articles: [KB numbers]</li>
</ul>
```

### Step 5: Create the Draft Knowledge Article

**Using MCP:**
```
Tool: SN-Create-Record
Parameters:
  table_name: kb_knowledge
  data:
    short_description: "How to Resolve Outlook Calendar Sync Errors on Mobile Devices"
    text: "<h2>Symptoms</h2><p>Users report that Outlook calendar events are not syncing to their mobile devices (iOS or Android). Events created on the desktop client do not appear on the mobile app, or events appear with incorrect times.</p><h2>Cause</h2><p>The ActiveSync profile on the mobile device has a stale authentication token, often triggered by a recent password change or multi-factor authentication policy update.</p><h2>Resolution</h2><ol><li>On the mobile device, navigate to Settings > Accounts > Exchange/Outlook</li><li>Remove the existing Exchange account</li><li>Restart the device</li><li>Re-add the Exchange account using current credentials</li><li>Wait 5 minutes for initial sync to complete</li><li>Verify calendar events appear correctly</li></ol><h2>Workaround</h2><p>If re-adding the account does not resolve the issue, use Outlook Web Access (OWA) on the mobile browser as a temporary alternative.</p><h2>Additional Information</h2><ul><li>Affected Systems: Microsoft Exchange, Outlook Mobile</li><li>Source: INC0012345, INC0012678, INC0013001</li><li>Related Articles: KB0010100 - Outlook Desktop Sync Issues</li></ul>"
    kb_knowledge_base: [target_kb_sys_id]
    kb_category: [target_category_sys_id]
    workflow_state: draft
    article_type: text
    valid_to: 2027-03-19
    meta_description: "Resolve Outlook calendar sync errors on iOS and Android mobile devices caused by stale authentication tokens"
```

**Using REST API:**
```bash
POST /api/now/table/kb_knowledge
Content-Type: application/json

{
  "short_description": "How to Resolve Outlook Calendar Sync Errors on Mobile Devices",
  "text": "<h2>Symptoms</h2><p>Users report that Outlook calendar events are not syncing...</p>...",
  "kb_knowledge_base": "[target_kb_sys_id]",
  "kb_category": "[target_category_sys_id]",
  "workflow_state": "draft",
  "article_type": "text",
  "valid_to": "2027-03-19",
  "meta_description": "Resolve Outlook calendar sync errors on mobile devices"
}
```

### Step 6: Link Source Records to the New Article

Create a relationship between the source incident/problem and the new KB article.

**Using MCP:**
```
Tool: SN-Create-Record
Parameters:
  table_name: m2m_kb_task
  data:
    kb_knowledge: [new_article_sys_id]
    task: [source_incident_sys_id]
```

**Using REST API:**
```bash
POST /api/now/table/m2m_kb_task
Content-Type: application/json

{
  "kb_knowledge": "[new_article_sys_id]",
  "task": "[source_incident_sys_id]"
}
```

### Step 7: Generate Article from Problem Record

Problem records provide richer root cause data. Extract cause notes, fix notes, and workarounds.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: problem
  query: number=PRB0005678
  fields: sys_id,number,short_description,description,cause_notes,fix_notes,workaround,category,subcategory,cmdb_ci,related_incidents
  limit: 1
```

Map problem fields to article sections:
- `description` -> Symptoms
- `cause_notes` -> Cause
- `fix_notes` -> Resolution
- `workaround` -> Workaround
- `related_incidents` -> Additional Information references

### Step 8: Generate Article from Change Request

Change implementations often introduce new procedures that users need to know about.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: change_request
  query: number=CHG0009876
  fields: sys_id,number,short_description,description,close_notes,implementation_plan,backout_plan,test_plan,category,cmdb_ci
  limit: 1
```

Map change fields to article sections:
- `description` -> Overview of what changed
- `implementation_plan` -> New procedure steps
- `backout_plan` -> Workaround/rollback instructions
- `test_plan` -> Verification steps

### Step 9: Add Work Notes to Source Record

Document that a knowledge article was generated from the source record.

**Using MCP:**
```
Tool: SN-Add-Work-Notes
Parameters:
  sys_id: [source_record_sys_id]
  work_notes: |
    === KNOWLEDGE ARTICLE GENERATED ===
    Article: KB0015678 - "How to Resolve Outlook Calendar Sync Errors on Mobile Devices"
    Status: Draft (pending review)
    Knowledge Base: IT Support
    Category: Email / Mobile

    Generated from resolution data in this incident.
    Article includes symptoms, root cause, step-by-step resolution, and workaround.
    Linked to 3 related incidents: INC0012345, INC0012678, INC0013001.
```

## Tool Usage

### MCP Tools Reference

| Tool | When to Use |
|------|-------------|
| `SN-Query-Table` | Retrieve source records, KB bases, categories |
| `SN-NL-Search` | Check for existing articles on the topic |
| `SN-Create-Record` | Create new KB article and link records |
| `SN-Update-Record` | Update existing articles with new content |
| `SN-Add-Work-Notes` | Document article creation on source records |

### REST API Reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/now/table/incident` | GET | Retrieve resolved incidents |
| `/api/now/table/problem` | GET | Retrieve problem root cause data |
| `/api/now/table/change_request` | GET | Retrieve change implementation details |
| `/api/now/table/kb_knowledge` | GET/POST | Search and create articles |
| `/api/now/table/kb_knowledge_base` | GET | Find target knowledge base |
| `/api/now/table/kb_category` | GET | Find target category |
| `/api/now/table/m2m_kb_task` | POST | Link articles to source records |

## Best Practices

- **Use Detailed Close Notes:** Articles generated from incidents with thorough close notes produce the best results; encourage agents to write detailed resolutions
- **Follow a Consistent Template:** Always use the Symptoms/Cause/Resolution/Workaround structure for troubleshooting articles
- **Create as Draft:** Never publish directly; always create in `draft` state for knowledge manager review and approval
- **Set Valid-To Dates:** Include an expiration date (typically 12-18 months) to trigger periodic review and updates
- **Include Source References:** Always reference the originating incident, problem, or change number in the article for audit trail
- **Add Meta Descriptions:** Include a concise meta description for improved search visibility
- **Combine Multiple Sources:** When several incidents describe the same issue, synthesize the best resolution steps from all of them
- **Avoid Copy-Paste of Work Notes:** Rewrite technical work notes into user-friendly language suitable for the target audience

## Troubleshooting

### "Created article has empty text field"

**Cause:** The text field requires HTML-formatted content; plain text may not render correctly
**Solution:** Wrap content in HTML tags (`<p>`, `<ol>`, `<h2>`) as shown in the template

### "Cannot create article - missing required fields"

**Cause:** Knowledge base workflow requires fields like `kb_knowledge_base`, `short_description`, and `workflow_state`
**Solution:** Ensure all mandatory fields are populated. Query the `sys_dictionary` table for required fields: `name=kb_knowledge^mandatory=true`

### "Article created but not visible in knowledge portal"

**Cause:** Article is in `draft` state and not yet published through the approval workflow
**Solution:** This is expected behavior. The knowledge manager must review and publish the article. Check the `workflow_state` field

### "Cannot link article to incident - m2m_kb_task creation fails"

**Cause:** The many-to-many table requires valid sys_ids for both the article and the task
**Solution:** Verify both sys_ids exist. The `task` field must reference a record extending the `task` table (incident, problem, change_request)

### "Duplicate article warning from knowledge workflow"

**Cause:** A similar article already exists and the workflow detected potential duplication
**Solution:** Review the existing article. If it covers the same topic, update it instead of creating a new one

## Examples

### Example 1: Article from Recurring Incident

**Source:** 5 incidents about "Printer spooler service stopped" (INC0015001-INC0015005)

**Generated Article:**
- **Title:** "Printer Spooler Service Stops Unexpectedly - Restart Procedure"
- **Symptoms:** Print jobs fail with "Spooler subsystem app has stopped working" error
- **Cause:** Third-party print driver conflict causes spooler crash under high print volume
- **Resolution:** (1) Open Services console, (2) Find Print Spooler, (3) Click Restart, (4) Clear C:\Windows\System32\spool\PRINTERS folder if restart fails, (5) Verify printing
- **Workaround:** Use alternate printer until driver update is applied
- **Category:** Hardware / Printing

### Example 2: Article from Problem Record

**Source:** PRB0005678 - "Intermittent database connection timeouts in CRM application"

**Generated Article:**
- **Title:** "CRM Application Database Connection Timeout Resolution"
- **Symptoms:** Users receive "Connection timeout" errors intermittently during peak hours
- **Cause:** Connection pool exhaustion due to unclosed database connections in the CRM application v3.2.1
- **Resolution:** (1) Apply CRM hotfix v3.2.1a, (2) Increase connection pool max from 50 to 100, (3) Enable connection pool monitoring
- **Workaround:** Restart the CRM application service to reset the connection pool
- **Category:** Software / CRM

### Example 3: Article from Change Request

**Source:** CHG0009876 - "Migrate email from on-premise Exchange to Office 365"

**Generated Article:**
- **Title:** "Accessing Email After Office 365 Migration"
- **Symptoms:** After migration, users need to reconfigure email clients and update mobile device settings
- **Cause:** Migration to cloud-based email service requires updated server settings
- **Resolution:** (1) Open Outlook, (2) Remove old Exchange account, (3) Add new account with email address, (4) Select Office 365 option, (5) Complete authentication with MFA
- **Additional Info:** Links to mobile setup guide, Outlook Web Access URL, FAQ
- **Category:** Email / Configuration

## Related Skills

- `knowledge/duplicate-detection` - Check for existing articles before generating new ones
- `knowledge/gap-analysis` - Identify which topics need articles to prioritize generation
- `knowledge/content-recommendation` - Surface generated articles for future incidents
- `knowledge/gap-grouping` - Group related gaps for bulk article generation
