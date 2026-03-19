---
name: hr-email-recommendation
version: 1.0.0
description: Generate recommended email responses for HR cases considering confidentiality, policy references, and empathetic tone
author: Happy Technologies LLC
tags: [hrsd, email, recommendation, hr-cases, communication, confidentiality, policy, empathy]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp:
    - SN-Query-Table
    - SN-Get-Record
    - SN-Update-Record
    - SN-NL-Search
    - SN-Execute-Background-Script
    - SN-Add-Work-Notes
  rest:
    - /api/now/table/sn_hr_core_case
    - /api/now/table/sn_hr_core_task
    - /api/now/table/sn_hr_le_case_type
    - /api/now/table/kb_knowledge
    - /api/now/table/sys_email
  native:
    - Bash
complexity: intermediate
estimated_time: 10-20 minutes
---

# HR Email Recommendation

## Overview

This skill provides a structured approach to generating recommended email responses for HR service delivery cases. It covers:

- Analyzing HR case context to understand the employee's inquiry or concern
- Referencing applicable HR policies and knowledge articles in responses
- Maintaining appropriate confidentiality and data privacy standards
- Crafting responses with empathetic, professional, and inclusive tone
- Handling sensitive topics such as leave of absence, accommodations, and performance management
- Generating follow-up emails for multi-step HR processes

**When to use:** When HR agents need assistance drafting email replies that are policy-compliant, appropriately empathetic, and tailored to the specific case context. Particularly useful for complex or sensitive topics where tone and accuracy are critical.

**Plugin required:** `com.sn_hr_core` (HR Service Delivery Core)

## Prerequisites

- **Roles:** `sn_hr_core.case_writer`, `sn_hr_core.manager`, or `sn_hr_core.admin`
- **Access:** Read access to `sn_hr_core_case`, `sn_hr_core_task`, `kb_knowledge`; write access to case work notes and comments
- **Knowledge:** Familiarity with HR policies, employee data privacy requirements (GDPR, HIPAA where applicable), and organizational communication standards
- **Plugins:** `com.sn_hr_core` must be activated

## Procedure

### Step 1: Retrieve HR Case Context

Pull the full case details to understand the employee's inquiry.

**Using MCP:**
```
Tool: SN-Get-Record
Parameters:
  table_name: sn_hr_core_case
  sys_id: [case_sys_id]
  fields: sys_id,number,short_description,description,state,priority,hr_service,subject_person,subject_person.name,subject_person.department,opened_by,opened_at,comments_and_work_notes,close_notes,resolution_code
```

**Using REST API:**
```bash
GET /api/now/table/sn_hr_core_case/[case_sys_id]?sysparm_fields=sys_id,number,short_description,description,state,priority,hr_service,subject_person,opened_by,opened_at,comments_and_work_notes,close_notes,resolution_code&sysparm_display_value=true
```

### Step 2: Review Case Communication History

Check previous emails and comments to maintain conversation continuity.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_email
  query: instance=sn_hr_core_case^target=[case_sys_id]^ORDERBYDESCsys_created_on
  fields: sys_id,type,subject,body_text,recipients,sys_created_on,watermark
  limit: 10
```

**Using REST API:**
```bash
GET /api/now/table/sys_email?sysparm_query=instance=sn_hr_core_case^target=[case_sys_id]^ORDERBYDESCsys_created_on&sysparm_fields=sys_id,type,subject,body_text,recipients,sys_created_on&sysparm_display_value=true&sysparm_limit=10
```

### Step 3: Identify the HR Case Type and Policies

Determine the case type to reference appropriate policies.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_hr_le_case_type
  query: sys_id=[case_type_sys_id]
  fields: sys_id,name,description,hr_service,topic_category
  limit: 1
```

### Step 4: Find Relevant Knowledge Articles

Search for policy documentation and FAQ articles related to the case topic.

**Using MCP:**
```
Tool: SN-NL-Search
Parameters:
  table_name: kb_knowledge
  query: "[case topic or keyword from short_description]"
  fields: sys_id,number,short_description,text,kb_knowledge_base,kb_category,workflow_state
  limit: 5
```

**Using REST API:**
```bash
GET /api/now/table/kb_knowledge?sysparm_query=workflow_state=published^short_descriptionLIKE[topic_keyword]^ORtextLIKE[topic_keyword]&sysparm_fields=sys_id,number,short_description,text,kb_category&sysparm_display_value=true&sysparm_limit=5
```

### Step 5: Generate the Email Response

Compose the recommended email based on case context, policy references, and appropriate tone.

**Email Template Structure:**

```
Subject: Re: [Case Number] - [Short Description]

Dear [Employee First Name],

[OPENING - Empathetic acknowledgment]
Thank you for reaching out regarding [topic]. I understand this is important to you, and I want to make sure we provide you with clear guidance.

[BODY - Policy reference and guidance]
Based on our [Policy Name], [specific guidance relevant to the inquiry].

[Key details]:
- [Detail 1]
- [Detail 2]
- [Detail 3]

[NEXT STEPS - Clear action items]
Here are the next steps:
1. [Action item 1]
2. [Action item 2]
3. [Action item 3]

[KNOWLEDGE REFERENCE - Self-service link]
For additional information, please review: [KB Article Title] (KB[number])

[CLOSING - Supportive and available]
Please don't hesitate to reach out if you have additional questions. We're here to support you.

Best regards,
[Agent Name]
[HR Team / Department]
```

### Step 6: Apply Confidentiality Guidelines

Before sending, validate the email against confidentiality requirements.

**Confidentiality Checklist:**

| Check | Description | Action |
|-------|-------------|--------|
| PII Minimization | Only include necessary personal information | Remove SSN, salary details, medical info from email body |
| Need-to-Know | Ensure recipients have legitimate need for the information | Verify CC list is appropriate |
| Sensitive Topics | Flag medical, disciplinary, or legal content | Use secure communication channels if needed |
| Data Residency | Respect regional data privacy laws | Ensure reply complies with GDPR/CCPA requirements |
| Audit Trail | Document communication in case record | Add work notes with email summary |

**Using MCP:**
```
Tool: SN-Execute-Background-Script
Parameters:
  description: Check for sensitive data patterns in email draft
  script: |
    gs.info('=== EMAIL CONFIDENTIALITY CHECK ===');

    var emailDraft = '[paste email draft text here]';

    // Check for common PII patterns
    var patterns = {
      'SSN Pattern': /\b\d{3}-\d{2}-\d{4}\b/,
      'Salary/Dollar Amount': /\$[\d,]+(\.\d{2})?/,
      'Date of Birth': /\b(DOB|date of birth|born on)\b/i,
      'Medical Terms': /\b(diagnosis|medical condition|disability|FMLA|ADA)\b/i,
      'Account Numbers': /\b(account|routing)\s*#?\s*\d{6,}\b/i
    };

    for (var label in patterns) {
      if (patterns[label].test(emailDraft)) {
        gs.info('WARNING: ' + label + ' detected - review before sending');
      }
    }

    gs.info('Confidentiality check complete.');
```

### Step 7: Document and Attach the Recommendation

Save the recommended response as a work note and optionally send.

**Using MCP:**
```
Tool: SN-Add-Work-Notes
Parameters:
  table_name: sn_hr_core_case
  sys_id: [case_sys_id]
  work_notes: |
    === RECOMMENDED EMAIL RESPONSE ===
    Generated based on case context and HR policy references.

    Subject: Re: [Case Number] - [Topic]

    [Full email text]

    === REFERENCES ===
    Policy: [Policy Name]
    KB Article: KB[number] - [Title]

    === CONFIDENTIALITY REVIEW ===
    Status: Passed / Requires Review
    Notes: [Any flagged items]
```

**Using REST API:**
```bash
PATCH /api/now/table/sn_hr_core_case/[case_sys_id]
Content-Type: application/json

{
  "work_notes": "=== RECOMMENDED EMAIL RESPONSE ===\n[Full email text]\n\n=== REFERENCES ===\nPolicy: [Policy Name]\nKB Article: KB[number]"
}
```

## Tool Usage

### MCP Tools Reference

| Tool | When to Use |
|------|-------------|
| `SN-Get-Record` | Retrieve full HR case context |
| `SN-Query-Table` | Query case history, emails, case types, KB articles |
| `SN-NL-Search` | Find relevant knowledge articles by topic |
| `SN-Update-Record` | Update case with recommended response |
| `SN-Add-Work-Notes` | Document the recommendation in case work notes |
| `SN-Execute-Background-Script` | Confidentiality checks, bulk response generation |

### REST API Reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/now/table/sn_hr_core_case` | GET/PATCH | Read case context and update with response |
| `/api/now/table/sn_hr_core_task` | GET | Review related case tasks |
| `/api/now/table/sn_hr_le_case_type` | GET | Identify case type and policies |
| `/api/now/table/kb_knowledge` | GET | Find relevant knowledge articles |
| `/api/now/table/sys_email` | GET | Review communication history |

## Best Practices

- **Lead with Empathy:** Start every response by acknowledging the employee's situation before providing policy guidance
- **Reference Policies:** Always cite the specific policy or article supporting your guidance; avoid vague statements
- **Keep It Confidential:** Never include sensitive personal data in email; use secure channels for medical, legal, or disciplinary information
- **Use Plain Language:** Avoid HR jargon; write at a reading level accessible to all employees
- **Provide Next Steps:** Every email should end with clear, actionable next steps for the employee
- **Maintain Consistency:** Use approved templates and language to ensure consistent messaging across the HR team

## Troubleshooting

### Case Context Insufficient for Response

**Cause:** Case description lacks detail or has only a brief subject line
**Solution:** Review case comments and work notes for additional context. Check related tasks for more information. Consider requesting clarification from the employee.

### No Relevant Knowledge Articles Found

**Cause:** KB not populated for the specific topic or search terms too specific
**Solution:** Broaden the search query. Check alternative knowledge bases. Flag the gap for the knowledge management team.

### Email Contains Sensitive Data

**Cause:** Case involves medical, legal, or disciplinary matters
**Solution:** Use the confidentiality checklist. Route sensitive communications through secure channels. Consider scheduling a private meeting instead of email for highly sensitive topics.

### Tone Not Appropriate for Situation

**Cause:** Template language too formal for a simple inquiry or too casual for a serious matter
**Solution:** Adjust tone based on case severity and topic. Use empathetic language for personal matters and professional language for process inquiries.

## Examples

### Example 1: Benefits Enrollment Response

```
# 1. Get case details
Tool: SN-Get-Record
Parameters:
  table_name: sn_hr_core_case
  sys_id: [case_sys_id]
  fields: number,short_description,description,hr_service,subject_person.name

# 2. Find relevant KB article
Tool: SN-NL-Search
Parameters:
  table_name: kb_knowledge
  query: "benefits open enrollment deadlines"
  fields: number,short_description,text
  limit: 3

# 3. Draft response
# "Dear [Name], Thank you for reaching out about benefits enrollment.
# The open enrollment period runs from [date] to [date]..."
```

### Example 2: Leave of Absence Response

```
Tool: SN-Get-Record
Parameters:
  table_name: sn_hr_core_case
  sys_id: [case_sys_id]
  fields: number,short_description,description,hr_service,subject_person.name,subject_person.department
```

### Example 3: Onboarding Welcome Email

```
Tool: SN-Execute-Background-Script
Parameters:
  description: Generate onboarding welcome email template
  script: |
    var caseGr = new GlideRecord('sn_hr_core_case');
    caseGr.get('[case_sys_id]');

    var person = caseGr.subject_person.getRefRecord();
    var name = person.first_name.toString();
    var dept = person.department.getDisplayValue();
    var startDate = caseGr.getValue('opened_at');

    gs.info('=== RECOMMENDED ONBOARDING EMAIL ===');
    gs.info('Subject: Welcome to ' + dept + ' - Your First Week Guide');
    gs.info('');
    gs.info('Dear ' + name + ',');
    gs.info('');
    gs.info('Welcome to the team! We are excited to have you join ' + dept + '.');
    gs.info('Here is what you can expect during your first week:');
    gs.info('');
    gs.info('Day 1: Orientation and system access setup');
    gs.info('Day 2: Team introductions and role overview');
    gs.info('Day 3-5: Training modules and onboarding tasks');
    gs.info('');
    gs.info('Please review our New Employee Guide (KB0012345) for detailed information.');
```

## Related Skills

- `hrsd/kb-generation` - Create knowledge articles referenced in email responses
- `hrsd/sidebar-summarization` - Summarize case context for email drafting
- `hrsd/case-summarization` - Comprehensive case summaries for complex responses
- `itsm/email-recommendation` - Email generation patterns for IT service cases

## References

- [ServiceNow HR Service Delivery](https://docs.servicenow.com/bundle/utah-hr-service-delivery/page/product/human-resources/concept/c_HRServiceDelivery.html)
- [HR Case Management](https://docs.servicenow.com/bundle/utah-hr-service-delivery/page/product/human-resources/concept/c_HRCaseManagement.html)
- [Email Notifications](https://docs.servicenow.com/bundle/utah-platform-administration/page/administer/notification/concept/c_EmailNotifications.html)
