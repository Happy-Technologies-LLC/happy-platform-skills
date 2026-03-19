---
name: resolution-notes
version: 1.0.0
description: Generate comprehensive resolution notes for closing CSM cases including issue summary, root cause analysis, steps taken, resolution details, and preventive measures
author: Happy Technologies LLC
tags: [csm, resolution, notes, case-closure, root-cause, documentation]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp:
    - SN-NL-Search
    - SN-Query-Table
    - SN-Read-Record
  rest:
    - /api/now/table/sn_customerservice_case
    - /api/now/table/sys_journal_field
    - /api/now/table/sn_customerservice_task
    - /api/now/table/interaction
    - /api/now/table/sys_email
    - /api/now/table/kb_knowledge
    - /api/now/table/sn_customerservice_sla
    - /api/now/table/customer_account
  native:
    - Bash
complexity: intermediate
estimated_time: 5-15 minutes
---

# Resolution Notes

## Overview

This skill generates comprehensive, well-structured resolution notes for closing Customer Service Management (CSM) cases. It helps you:

- Summarize the original issue reported by the customer with relevant context
- Document all diagnostic steps taken and investigation findings
- Identify and document the root cause of the issue
- Describe the resolution applied and its verification
- Outline preventive measures and recommendations to avoid recurrence
- Produce clean, professional documentation suitable for customer communication, knowledge base articles, and audit trails

**When to use:** When a CSM agent is ready to resolve or close a case and needs to create thorough resolution documentation. Also useful for post-incident reviews, knowledge base article creation, and compliance auditing.

## Prerequisites

- **Roles:** `sn_customerservice_agent`, `sn_customerservice_manager`, or `csm_admin`
- **Access:** Read access to `sn_customerservice_case`, `sys_journal_field`, `sn_customerservice_task`, `interaction`, `sys_email`, `kb_knowledge`, `sn_customerservice_sla`, and `customer_account` tables; write access to case `resolution_notes` and `close_notes` fields
- **Knowledge:** Understanding of CSM case resolution codes, closure requirements, and your organization's documentation standards

## Procedure

### Step 1: Retrieve Complete Case Details

Fetch the full case record including all resolution-relevant fields.

**Using MCP (Claude Code/Desktop):**
```
Tool: SN-Read-Record
Parameters:
  table_name: sn_customerservice_case
  sys_id: [case_sys_id]
  fields: number,short_description,description,state,priority,urgency,impact,category,subcategory,contact,account,consumer,product,asset,assigned_to,assignment_group,opened_at,opened_by,resolved_at,resolved_by,closed_at,closed_by,resolution_code,resolution_notes,close_notes,escalation,severity,sla_due,contact_type,reassignment_count,reopen_count,cause,business_duration,calendar_duration,made_sla
```

**Using REST API:**
```bash
GET /api/now/table/sn_customerservice_case/{case_sys_id}?sysparm_fields=number,short_description,description,state,priority,urgency,impact,category,subcategory,contact,account,consumer,product,asset,assigned_to,assignment_group,opened_at,opened_by,resolved_at,resolved_by,closed_at,resolution_code,resolution_notes,close_notes,escalation,severity,reassignment_count,reopen_count,cause,business_duration,calendar_duration,made_sla&sysparm_display_value=true
```

### Step 2: Collect All Work Notes (Investigation Trail)

Retrieve the complete work note history to reconstruct the investigation and resolution timeline.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_journal_field
  query: element_id=<case_sys_id>^element=work_notes^ORDERBYsys_created_on
  fields: sys_id,value,sys_created_on,sys_created_by
  limit: 100
```

**Using REST API:**
```bash
GET /api/now/table/sys_journal_field?sysparm_query=element_id=<case_sys_id>^element=work_notes^ORDERBYsys_created_on&sysparm_fields=value,sys_created_on,sys_created_by&sysparm_limit=100
```

### Step 3: Review Related Tasks and Their Outcomes

Check child tasks for additional resolution details and completed actions.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_customerservice_task
  query: parent=<case_sys_id>^ORDERBYsys_created_on
  fields: sys_id,number,short_description,state,assigned_to,assignment_group,opened_at,closed_at,close_notes,work_notes
  limit: 20
```

**Using REST API:**
```bash
GET /api/now/table/sn_customerservice_task?sysparm_query=parent=<case_sys_id>^ORDERBYsys_created_on&sysparm_fields=number,short_description,state,assigned_to,assignment_group,opened_at,closed_at,close_notes&sysparm_limit=20&sysparm_display_value=true
```

### Step 4: Review Customer Communications

Retrieve customer-facing communications to confirm resolution acknowledgment.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_journal_field
  query: element_id=<case_sys_id>^element=comments^ORDERBYDESCsys_created_on
  fields: value,sys_created_on,sys_created_by
  limit: 20
```

```
Tool: SN-Query-Table
Parameters:
  table_name: sys_email
  query: instance=<case_sys_id>^ORDERBYDESCsys_created_on
  fields: sys_id,subject,type,body_text,sys_created_on,sys_created_by
  limit: 10
```

**Using REST API:**
```bash
GET /api/now/table/sys_journal_field?sysparm_query=element_id=<case_sys_id>^element=comments^ORDERBYDESCsys_created_on&sysparm_fields=value,sys_created_on,sys_created_by&sysparm_limit=20

GET /api/now/table/sys_email?sysparm_query=instance=<case_sys_id>^ORDERBYDESCsys_created_on&sysparm_fields=subject,type,body_text,sys_created_on&sysparm_limit=10&sysparm_display_value=true
```

### Step 5: Check SLA Performance

Retrieve SLA data to document whether resolution met service level targets.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_customerservice_sla
  query: task=<case_sys_id>
  fields: sla,stage,has_breached,planned_end_time,end_time,business_duration,percentage,business_percentage
  limit: 10
```

**Using REST API:**
```bash
GET /api/now/table/sn_customerservice_sla?sysparm_query=task=<case_sys_id>&sysparm_fields=sla,stage,has_breached,planned_end_time,end_time,business_duration,percentage&sysparm_limit=10&sysparm_display_value=true
```

### Step 6: Search for Related KB Articles

Check if a KB article exists for this issue or if one should be created.

**Using MCP:**
```
Tool: SN-NL-Search
Parameters:
  query: [short_description + resolution keywords]
  table: kb_knowledge
  limit: 5
```

```
Tool: SN-Query-Table
Parameters:
  table_name: kb_knowledge
  query: workflow_state=published^short_descriptionLIKE[key_terms]
  fields: number,short_description,text,kb_category,sys_updated_on
  limit: 5
```

**Using REST API:**
```bash
GET /api/now/table/kb_knowledge?sysparm_query=workflow_state=published^short_descriptionLIKE<key_terms>&sysparm_fields=number,short_description,kb_category&sysparm_limit=5&sysparm_display_value=true
```

### Step 7: Check for Similar Open Cases

Identify if other open cases might benefit from this resolution.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_customerservice_case
  query: category=[category]^subcategory=[subcategory]^stateNOT IN6,7,8^sys_id!=<case_sys_id>^short_descriptionLIKE[key_terms]
  fields: number,short_description,state,assigned_to,account
  limit: 10
```

**Using REST API:**
```bash
GET /api/now/table/sn_customerservice_case?sysparm_query=category=<category>^subcategory=<subcategory>^stateNOT IN6,7,8^sys_id!=<case_sys_id>^short_descriptionLIKE<key_terms>&sysparm_fields=number,short_description,state,assigned_to,account&sysparm_limit=10&sysparm_display_value=true
```

### Step 8: Generate Resolution Notes

Assemble all gathered information into comprehensive resolution documentation.

**Resolution Notes Structure:**

```
=== RESOLUTION NOTES ===
Case: [number]
Resolved By: [agent_name] | Resolution Date: [resolved_at]
Resolution Code: [resolution_code]

1. ISSUE SUMMARY
   Customer [contact_name] from [account_name] reported [short_description]
   on [opened_at]. The issue affected [product/service] and was categorized
   as [category]/[subcategory] with [priority] priority.

   Detailed Description:
   [description - summarized]

   Impact:
   - Business Impact: [impact description]
   - Users Affected: [scope]
   - Duration of Impact: [from opened_at to resolved_at]

2. INVESTIGATION TIMELINE
   [date_1] - Case created via [contact_type]. Initial triage performed.
   [date_2] - [investigation action and finding]
   [date_3] - [investigation action and finding]
   [date_4] - [escalation if applicable]
   [date_5] - Root cause identified.
   [date_6] - Fix applied and verified.

3. ROOT CAUSE
   [Detailed root cause description]

   Contributing Factors:
   - [factor_1]
   - [factor_2]

4. RESOLUTION
   Resolution Code: [Solved Permanently / Workaround / Not Reproducible /
                      Duplicate / etc.]

   Resolution Details:
   [Step-by-step description of the fix applied]

   Verification:
   - [How the fix was verified]
   - [Customer confirmation of resolution - date and method]

5. STEPS TAKEN
   1. [step_1 with date]
   2. [step_2 with date]
   3. [step_3 with date]
   ...

   Steps Attempted But Unsuccessful:
   1. [failed_step_1 - reason it did not work]
   2. [failed_step_2 - reason it did not work]

6. RELATED TASKS
   - [task_number]: [description] - [outcome]
   - [task_number]: [description] - [outcome]

7. SLA PERFORMANCE
   - Response SLA: [Met/Breached] ([actual] vs [target])
   - Resolution SLA: [Met/Breached] ([actual] vs [target])
   - Business Duration: [duration]
   - Calendar Duration: [duration]
   - Reassignment Count: [count]

8. PREVENTIVE MEASURES
   - [recommendation_1 - e.g., "Apply patch X to all production servers"]
   - [recommendation_2 - e.g., "Update monitoring to detect this condition"]
   - [recommendation_3 - e.g., "Add this scenario to runbook Y"]

9. KNOWLEDGE BASE
   - Existing KB Referenced: [KB number and title, if applicable]
   - KB Article Recommended: [Yes/No]
     If Yes: [suggested article title and key content points]

10. RELATED CASES
    - Similar Open Cases: [list of case numbers that may benefit]
    - Previously Resolved: [case numbers with same root cause]
```

**Close Notes (shorter summary for the close_notes field):**

```
Issue: [one-line description]
Root Cause: [one-line root cause]
Resolution: [one-line resolution description]
Preventive Action: [one-line preventive measure]
KB Reference: [KB number or "N/A"]
Customer Confirmed: [Yes/No - date]
```

## Tool Usage

### MCP Tools Reference

| Tool | When to Use |
|------|-------------|
| `SN-NL-Search` | Find related KB articles and similar resolved cases |
| `SN-Query-Table` | Retrieve work notes, tasks, emails, SLA data, similar cases |
| `SN-Read-Record` | Fetch complete case record with all resolution fields |

### REST API Reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/now/table/sn_customerservice_case` | GET | Case details and similar case search |
| `/api/now/table/sys_journal_field` | GET | Work notes and comments history |
| `/api/now/table/sn_customerservice_task` | GET | Related task outcomes |
| `/api/now/table/sys_email` | GET | Email communications and confirmation |
| `/api/now/table/interaction` | GET | Interaction records |
| `/api/now/table/kb_knowledge` | GET | KB article references |
| `/api/now/table/sn_customerservice_sla` | GET | SLA performance data |
| `/api/now/table/customer_account` | GET | Account context |

## Best Practices

- **Be thorough but concise:** Include all relevant details but avoid redundancy; the resolution notes should tell a complete story without being verbose
- **Document root cause accurately:** Distinguish between symptoms, contributing factors, and the actual root cause; this is critical for trend analysis
- **Include failed attempts:** Documenting what did not work is as valuable as documenting what did; it prevents future agents from repeating unsuccessful steps
- **Get customer confirmation:** Always note whether the customer confirmed the resolution and how (email reply, phone call, chat message)
- **Recommend KB articles:** If no KB article exists for this resolution, recommend creating one; if one exists, note if it needs updating
- **Link related cases:** Identify and reference similar cases to help with pattern detection and proactive outreach
- **Use standard resolution codes:** Use the organization's defined resolution codes consistently for accurate reporting
- **Note SLA performance:** Document SLA compliance as it feeds into account health metrics and contractual obligations
- **Write for the future reader:** Resolution notes should be understandable by someone unfamiliar with the case, months or years later
- **Separate internal and customer-facing notes:** Keep detailed technical analysis in work notes; put clean summaries in resolution_notes and close_notes

## Troubleshooting

### "Resolution code options not clear"

**Cause:** Resolution codes vary by organization and CSM configuration
**Solution:** Query the choice list for available codes: `GET /api/now/table/sys_choice?sysparm_query=name=sn_customerservice_case^element=resolution_code&sysparm_fields=label,value`. Common codes include: Solved (Permanently), Solved (Workaround), Not Reproducible, Duplicate, Known Error, User Error, Configuration Change.

### "Cannot find the root cause in work notes"

**Cause:** Root cause may not have been explicitly documented during investigation
**Solution:** Review the full work note timeline and look for the turning point where the issue was understood. Check escalation notes and task close notes for technical details. If root cause is truly unknown, document it as "Root Cause: Undetermined" with the closest hypothesis.

### "Customer did not confirm resolution"

**Cause:** Customer may not have responded to the resolution notification
**Solution:** Check `sys_email` for any bounced resolution emails. Review comments for indirect confirmation. If no confirmation after the standard waiting period, document "Customer confirmation: Not received within [X] day waiting period. Auto-resolved per policy."

### "SLA data shows incorrect breach"

**Cause:** SLA may have been paused incorrectly or the clock was not stopped at resolution
**Solution:** Check the `pause_duration` and `pause_time` fields on the SLA record. Verify the case state transitions in the audit log (`sys_audit` table) to confirm correct SLA stage transitions.

## Examples

### Example 1: Software Bug Resolution

**Scenario:** Resolving a case about a recurring application error.

**Step 1 - Get case and work notes:**
```
Tool: SN-Read-Record
Parameters:
  table_name: sn_customerservice_case
  sys_id: [case_sys_id]
  fields: number,short_description,description,state,priority,category,subcategory,product,contact,account,opened_at,resolved_at,resolution_code,cause,reassignment_count,made_sla,business_duration
```

```
Tool: SN-Query-Table
Parameters:
  table_name: sys_journal_field
  query: element_id=<sys_id>^element=work_notes^ORDERBYsys_created_on
  fields: value,sys_created_on,sys_created_by
  limit: 50
```

**Generated Resolution Notes:**
```
RESOLUTION NOTES - CS0075432

1. ISSUE SUMMARY
   Customer Amy Chen from DataFlow Inc. reported that the reporting
   module throws a "NullPointerException" when generating monthly
   summary reports with more than 10,000 records. Issue began after
   platform upgrade to version 3.4.1. Priority: P2.

2. INVESTIGATION TIMELINE
   Mar 10 - Case created via email. Initial triage by L1 Support.
   Mar 11 - Reproduced in test with 15K record dataset.
   Mar 12 - Identified exception in ReportGenerator.java line 847.
   Mar 13 - Escalated to Engineering (Level 2).
   Mar 14 - Engineering confirmed pagination bug in v3.4.1.
   Mar 17 - Hotfix 3.4.1-HF02 deployed to customer instance.
   Mar 18 - Customer confirmed reports generating successfully.

3. ROOT CAUSE
   A pagination logic error introduced in version 3.4.1 caused a
   null reference when the result set exceeded the default page size
   of 10,000 records. The cursor object was not being re-initialized
   between page iterations.

   Contributing Factors:
   - Insufficient test coverage for large datasets in v3.4.1 release
   - Customer's dataset grew past 10K threshold in February

4. RESOLUTION
   Resolution Code: Solved (Permanently)
   Applied hotfix 3.4.1-HF02 which corrects the pagination cursor
   handling in ReportGenerator.java. Fix verified with 50K record
   dataset in staging before production deployment.

   Verification:
   - Agent verified fix in test environment with 25K records
   - Customer confirmed successful report generation on Mar 18
     via email reply

5. SLA PERFORMANCE
   - Response SLA: Met (2 hours vs 4 hour target)
   - Resolution SLA: Met (6 business days vs 10 day target)
   - Reassignment Count: 1 (L1 to Engineering)

6. PREVENTIVE MEASURES
   - Engineering to add large dataset tests (10K, 50K, 100K) to
     regression suite for reporting module
   - Proactive notification to all customers on v3.4.1 to apply HF02
   - Monitoring alert added for NullPointerException in reporting

7. KNOWLEDGE BASE
   - KB0045678 created: "Reporting Module NullPointerException
     Fix for v3.4.1 - Apply Hotfix HF02"
```

### Example 2: Configuration Issue Close Notes

**Scenario:** Quick resolution for a misconfigured integration.

**Step 1 - Get case:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_customerservice_case
  query: number=CS0076100
  fields: sys_id,number,short_description,state,priority,category,product,contact,account,opened_at,resolution_code
  limit: 1
```

**Generated Close Notes:**
```
Issue: SSO integration failing with "invalid_redirect_uri" error
Root Cause: OAuth redirect URI in customer's identity provider
  configuration contained a trailing slash that did not match the
  registered callback URL
Resolution: Removed trailing slash from IdP redirect URI
  configuration; SSO authentication now working correctly
Preventive Action: Added redirect URI format validation to
  integration setup checklist (KB0045700)
KB Reference: KB0045700 - SSO Integration Redirect URI Configuration
Customer Confirmed: Yes - Mar 19 via email
```

## Related Skills

- `csm/case-summarization` - Summarize the case before writing resolution notes
- `csm/activity-response` - Document investigation activities throughout the case lifecycle
- `csm/sentiment-analysis` - Check customer sentiment to confirm positive resolution outcome
- `csm/email-recommendation` - Generate resolution notification email to the customer
- `knowledge/article-generation` - Create KB articles from resolution findings
