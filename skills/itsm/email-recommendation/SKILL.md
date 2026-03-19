---
name: itsm-email-recommendation
version: 1.0.0
description: Generate professional email responses for IT service cases with technical context, resolution steps, and next actions
author: Happy Technologies LLC
tags: [itsm, email, recommendation, incident, communication, resolution, professional, support]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp:
    - SN-Query-Table
    - SN-Get-Record
    - SN-Update-Record
    - SN-NL-Search
    - SN-Add-Work-Notes
    - SN-Execute-Background-Script
  rest:
    - /api/now/table/incident
    - /api/now/table/change_request
    - /api/now/table/kb_knowledge
    - /api/now/table/problem
    - /api/now/table/sys_email
    - /api/now/table/sys_journal_field
  native:
    - Bash
complexity: intermediate
estimated_time: 10-20 minutes
---

# ITSM Email Recommendation

## Overview

This skill provides a structured approach to generating professional email responses for IT service management cases. It covers:

- Analyzing incident, change, or problem context to craft targeted email responses
- Incorporating relevant technical details without overwhelming non-technical recipients
- Referencing knowledge base articles and known workarounds in responses
- Providing clear next steps and expected timelines for resolution
- Generating status update emails for ongoing incidents
- Creating closure notification emails with resolution summaries

**When to use:** When ITSM agents need to send professional, well-structured email responses to end users, stakeholders, or management regarding IT service cases. Particularly useful for complex incidents requiring technical explanation or status updates on high-priority issues.

**Plugin required:** `com.snc.incident` (Incident Management)

## Prerequisites

- **Roles:** `itil`, `incident_manager`, or `admin`
- **Access:** Read access to `incident`, `change_request`, `problem`, `kb_knowledge`, `sys_email`; write access to incident work notes
- **Knowledge:** Familiarity with IT service management processes, SLA requirements, and organizational communication standards
- **Plugins:** `com.snc.incident` must be activated

## Procedure

### Step 1: Retrieve the Case Context

Pull the full record to understand the issue, current state, and stakeholders.

**Using MCP:**
```
Tool: SN-Get-Record
Parameters:
  table_name: incident
  sys_id: [incident_sys_id]
  fields: sys_id,number,short_description,description,state,priority,impact,urgency,category,subcategory,assignment_group,assigned_to,caller_id,caller_id.name,caller_id.email,caller_id.vip,opened_at,resolved_at,close_code,close_notes,business_service,cmdb_ci,sla_due,made_sla
```

**Using REST API:**
```bash
GET /api/now/table/incident/[incident_sys_id]?sysparm_fields=sys_id,number,short_description,description,state,priority,impact,urgency,category,subcategory,assignment_group,assigned_to,caller_id,opened_at,resolved_at,close_code,close_notes,business_service,cmdb_ci,sla_due,made_sla&sysparm_display_value=true
```

### Step 2: Review Communication History

Check previous emails to maintain thread continuity and avoid redundancy.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_email
  query: instance=incident^target=[incident_sys_id]^ORDERBYDESCsys_created_on
  fields: sys_id,type,subject,body_text,recipients,sys_created_on
  limit: 10
```

**Using REST API:**
```bash
GET /api/now/table/sys_email?sysparm_query=instance=incident^target=[incident_sys_id]^ORDERBYDESCsys_created_on&sysparm_fields=sys_id,type,subject,body_text,recipients,sys_created_on&sysparm_display_value=true&sysparm_limit=10
```

### Step 3: Gather Technical Context

Review work notes for diagnostic findings and actions taken.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_journal_field
  query: element_id=[incident_sys_id]^name=incident^element=work_notes^ORDERBYsys_created_on
  fields: value,sys_created_by,sys_created_on
  limit: 20
```

### Step 4: Find Relevant Knowledge Articles

Search for KB articles to reference in the email.

**Using MCP:**
```
Tool: SN-NL-Search
Parameters:
  table_name: kb_knowledge
  query: "[keywords from incident description]"
  fields: sys_id,number,short_description,text
  limit: 5
```

### Step 5: Check for Related Records

Identify related problems, changes, or known errors for context.

**Using MCP:**
```
Tool: SN-Execute-Background-Script
Parameters:
  description: Gather related records for email context
  script: |
    var incId = '[incident_sys_id]';
    var inc = new GlideRecord('incident');
    inc.get(incId);

    gs.info('=== RELATED RECORDS FOR EMAIL CONTEXT ===');

    // Related problem
    if (inc.problem_id && inc.problem_id.toString() !== '') {
      var prob = inc.problem_id.getRefRecord();
      gs.info('Problem: ' + prob.number + ' | ' + prob.short_description + ' | Workaround: ' + prob.workaround);
    }

    // Related changes
    var change = new GlideRecord('change_request');
    change.addQuery('reason', incId);
    change.query();
    while (change.next()) {
      gs.info('Change: ' + change.number + ' | ' + change.short_description + ' | State: ' + change.state.getDisplayValue() + ' | Scheduled: ' + change.start_date);
    }

    // Similar recent incidents (for pattern context)
    var similar = new GlideRecord('incident');
    similar.addQuery('category', inc.category.toString());
    similar.addQuery('state', '6'); // Resolved
    similar.addQuery('sys_id', '!=', incId);
    similar.addQuery('sys_created_on', '>=', gs.daysAgo(30));
    similar.orderByDesc('resolved_at');
    similar.setLimit(5);
    similar.query();

    gs.info('\n--- Similar Resolved Incidents ---');
    while (similar.next()) {
      gs.info(similar.number + ': ' + similar.short_description + ' | Resolution: ' + similar.close_notes.toString().substring(0, 100));
    }
```

### Step 6: Generate the Email Response

Select the appropriate template based on the case state and compose the email.

**Template 1: Initial Acknowledgment**
```
Subject: [INC Number] - Your request has been received: [Short Description]

Dear [Caller Name],

Thank you for contacting IT Support. We have received your request and created incident [INC Number] for tracking.

Issue Summary: [Short Description]
Priority: [Priority Level]
Assigned Team: [Assignment Group]

What happens next:
- Our [Assignment Group] team will review your request within [SLA timeframe]
- You will receive updates as we investigate
- You can check the status anytime at [Service Portal URL]

If you have additional information to share, please reply to this email or update the incident through the service portal.

Best regards,
[Agent Name]
IT Service Desk
Reference: [INC Number]
```

**Template 2: Status Update**
```
Subject: Re: [INC Number] - Status Update: [Short Description]

Dear [Caller Name],

I wanted to provide you with an update on your incident [INC Number].

Current Status: [State]
Investigation Summary:
[Brief technical summary in plain language]

Actions Taken:
1. [Action 1]
2. [Action 2]
3. [Action 3]

Next Steps:
- [What will happen next]
- Expected timeline: [Estimated timeframe]

[If workaround available:]
In the meantime, you can use the following workaround:
[Workaround steps]

Please let us know if you have any questions or if the situation has changed.

Best regards,
[Agent Name]
IT Service Desk
Reference: [INC Number]
```

**Template 3: Resolution Notification**
```
Subject: Re: [INC Number] - Resolved: [Short Description]

Dear [Caller Name],

I am pleased to let you know that your incident [INC Number] has been resolved.

Resolution Summary:
[Clear description of what was done to resolve the issue]

Root Cause:
[Brief explanation of what caused the issue, if known]

What You Should See:
[Description of expected behavior now that the issue is resolved]

Preventive Steps:
[Any recommendations to prevent recurrence]

For future reference, you may find this knowledge article helpful:
[KB Article Title] - [KB Number]

This incident will be automatically closed in [X] business days if no further issues are reported. If you experience the issue again, please reply to this email or reopen the incident through the service portal.

Best regards,
[Agent Name]
IT Service Desk
Reference: [INC Number]
```

**Template 4: Escalation Notification**
```
Subject: Re: [INC Number] - Escalation Notice: [Short Description]

Dear [Caller Name],

I am writing to let you know that your incident [INC Number] has been escalated to our [Specialized Team] team for further investigation.

Reason for Escalation:
[Brief explanation of why escalation is needed]

What This Means:
- A specialist from [Team Name] will be assigned to your case
- They will have full context from our previous investigation
- You may be contacted for additional details

Updated Timeline: [New estimated timeframe]

We understand the urgency and are committed to resolving this as quickly as possible.

Best regards,
[Agent Name]
IT Service Desk
Reference: [INC Number]
```

### Step 7: Document and Send

Save the recommended email as a work note and optionally add as a customer-visible comment.

**Using MCP:**
```
Tool: SN-Add-Work-Notes
Parameters:
  table_name: incident
  sys_id: [incident_sys_id]
  work_notes: |
    === RECOMMENDED EMAIL RESPONSE ===
    Type: [Acknowledgment/Status Update/Resolution/Escalation]
    Recipient: [Caller Name and Email]

    Subject: [Subject line]

    [Full email body]

    === REFERENCES ===
    KB Articles: [KB numbers referenced]
    Related Change: [CHG number if applicable]
    Related Problem: [PRB number if applicable]
```

## Tool Usage

### MCP Tools Reference

| Tool | When to Use |
|------|-------------|
| `SN-Get-Record` | Retrieve full incident/change/problem context |
| `SN-Query-Table` | Query email history, work notes, related records |
| `SN-NL-Search` | Find relevant knowledge articles for email references |
| `SN-Update-Record` | Update incident with email notification details |
| `SN-Add-Work-Notes` | Document the recommended email |
| `SN-Execute-Background-Script` | Gather cross-record context, bulk email generation |

### REST API Reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/now/table/incident` | GET/PATCH | Read incident and update records |
| `/api/now/table/change_request` | GET | Find related changes for context |
| `/api/now/table/problem` | GET | Find related problems and workarounds |
| `/api/now/table/kb_knowledge` | GET | Search for relevant KB articles |
| `/api/now/table/sys_email` | GET | Review communication history |
| `/api/now/table/sys_journal_field` | GET | Extract work notes for technical context |

## Best Practices

- **Plain Language:** Translate technical jargon into language the recipient can understand; save technical details for work notes
- **Be Specific:** Include incident numbers, dates, and concrete next steps rather than vague promises
- **Set Expectations:** Always communicate expected timelines and what the user can expect next
- **Reference Self-Service:** Point users to KB articles and the service portal for future self-resolution
- **Maintain Thread:** Use "Re:" prefix and include the incident number for email thread continuity
- **VIP Awareness:** Check the caller's VIP status and adjust tone and urgency language accordingly
- **Proofread for Tone:** Ensure the email conveys professionalism and empathy, especially for frustrated users

## Troubleshooting

### Email History Not Loading

**Cause:** Emails sent through external systems may not be logged in `sys_email`
**Solution:** Check `sys_journal_field` for comments that may contain email content. Review notification logs for delivery status.

### KB Articles Not Matching

**Cause:** Search terms too specific or KB articles categorized differently
**Solution:** Broaden search terms. Try category-based searching. Use `SN-NL-Search` for semantic matching.

### Email Template Not Fitting the Scenario

**Cause:** Incident state or context does not match standard templates
**Solution:** Combine elements from multiple templates. Customize based on the specific situation. Always include: current status, actions taken, and next steps.

### Recipient Unclear

**Cause:** Caller and affected user may be different people, or multiple stakeholders need updates
**Solution:** Check `caller_id`, `opened_by`, and `watch_list` fields. For major incidents, use the distribution list from the major incident process.

## Examples

### Example 1: Network Outage Status Update

```
# 1. Get incident details
Tool: SN-Get-Record
Parameters:
  table_name: incident
  sys_id: [sys_id]
  fields: number,short_description,state,priority,caller_id.name,business_service,assignment_group

# 2. Get recent diagnostic notes
Tool: SN-Query-Table
Parameters:
  table_name: sys_journal_field
  query: element_id=[sys_id]^name=incident^element=work_notes^ORDERBYDESCsys_created_on
  fields: value,sys_created_by,sys_created_on
  limit: 5

# 3. Draft status update email with technical findings in plain language
```

### Example 2: Resolution Email with KB Reference

```
# 1. Get resolution details
Tool: SN-Get-Record
Parameters:
  table_name: incident
  sys_id: [sys_id]
  fields: number,short_description,close_code,close_notes,caller_id.name

# 2. Find relevant KB article
Tool: SN-NL-Search
Parameters:
  table_name: kb_knowledge
  query: "[resolution topic]"
  fields: number,short_description
  limit: 3
```

### Example 3: Bulk Status Update for Major Incident

```
Tool: SN-Execute-Background-Script
Parameters:
  description: Generate status update for all users affected by major incident
  script: |
    var majorInc = new GlideRecord('incident');
    majorInc.get('[major_incident_sys_id]');

    // Find all child incidents
    var child = new GlideRecord('incident');
    child.addQuery('parent_incident', majorInc.sys_id.toString());
    child.query();

    gs.info('=== MAJOR INCIDENT STATUS UPDATE ===');
    gs.info('Major Incident: ' + majorInc.number + ' | ' + majorInc.short_description);
    gs.info('Affected Users: ' + child.getRowCount());

    gs.info('\n--- RECOMMENDED BULK EMAIL ---');
    gs.info('Subject: [' + majorInc.number + '] Status Update - ' + majorInc.short_description);
    gs.info('Body: We are currently experiencing [issue description]. Our team is actively working on resolution. Current ETA: [timeframe]. We will provide the next update by [time].');
```

## Related Skills

- `itsm/chat-reply-recommendation` - Chat-based response recommendations
- `itsm/incident-summarization` - Summarize incidents for email context
- `itsm/kb-generation` - Create KB articles referenced in emails
- `hrsd/email-recommendation` - HR-specific email recommendations
- `itsm/major-incident` - Major incident communication workflows

## References

- [ServiceNow Incident Management](https://docs.servicenow.com/bundle/utah-it-service-management/page/product/incident-management/concept/c_IncidentManagement.html)
- [Email Notifications](https://docs.servicenow.com/bundle/utah-platform-administration/page/administer/notification/concept/c_EmailNotifications.html)
- [Agent Workspace](https://docs.servicenow.com/bundle/utah-it-service-management/page/product/agent-workspace/concept/agent-workspace.html)
