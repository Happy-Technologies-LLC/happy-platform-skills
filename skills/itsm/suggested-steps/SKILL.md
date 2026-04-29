---
name: itsm-suggested-steps
version: 1.0.0
description: Generate suggested resolution steps for incidents based on category, symptoms, historical similar tickets, and knowledge base articles
author: Happy Technologies LLC
tags: [itsm, incident, resolution, suggested-steps, knowledge-base, similar-tickets, troubleshooting]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp:
    - SN-NL-Search
    - SN-Query-Table
    - SN-Update-Record
    - SN-Add-Work-Notes
    - SN-Get-Table-Schema
  rest:
    - /api/now/table/incident
    - /api/now/table/kb_knowledge
    - /api/now/table/sn_si_incident
    - /api/now/table/change_request
    - /api/now/table/problem
  native:
    - Bash
complexity: intermediate
estimated_time: 10-20 minutes
---

# Suggested Resolution Steps

## Overview

This skill generates actionable resolution steps for incidents by analyzing the incident's category, symptoms, and description, then cross-referencing with historical similar tickets, knowledge base articles, and related changes or problems. It provides agents with a structured troubleshooting plan.

- Analyze incident description and symptoms to identify the issue domain
- Search knowledge base for relevant articles with verified solutions
- Find historically similar incidents and extract their successful resolution paths
- Check for related changes or known problems that may be causing the issue
- Generate a ranked, step-by-step resolution plan with confidence levels
- Provide fallback escalation guidance when no confident resolution is found

**When to use:** When an agent picks up an incident and needs guidance on how to resolve it, especially for unfamiliar issue types or when standard runbooks do not apply.

## Prerequisites

- **Roles:** `itil` or `incident_manager`
- **Plugins:** `com.snc.incident` (Incident Management), `com.glide.knowledge` (Knowledge Management)
- **Access:** Read on `incident`, `kb_knowledge`, `sn_si_incident`, `change_request`, `problem`
- **Knowledge:** Basic understanding of incident categories and your organization's technology stack
- **Data:** Historical resolved incidents and published knowledge base articles

## Procedure

### Step 1: Analyze the Target Incident

Retrieve the incident and extract key diagnostic information.

**Using MCP (Claude Code/Desktop):**
```
Tool: SN-Query-Table
Parameters:
  table_name: incident
  query: number=[incident_number]
  fields: sys_id,number,short_description,description,category,subcategory,priority,impact,urgency,cmdb_ci,assignment_group,caller_id,contact_type,state
  limit: 1
```

**Using REST API:**
```bash
GET /api/now/table/incident?sysparm_query=number=[incident_number]&sysparm_fields=sys_id,number,short_description,description,category,subcategory,priority,impact,urgency,cmdb_ci,assignment_group,caller_id,contact_type,state&sysparm_limit=1
```

Extract from the incident:
- **Primary symptoms**: What is broken or not working
- **Error messages**: Any specific error codes or messages mentioned
- **Affected system**: The CI, application, or service impacted
- **User environment**: Operating system, browser, location, connection type
- **Trigger event**: What changed or happened before the issue started

### Step 2: Search Knowledge Base for Solutions

Query published KB articles matching the incident's symptoms and category.

**Using MCP:**
```
Tool: SN-NL-Search
Parameters:
  table_name: kb_knowledge
  query: "[incident short_description keywords] [category]"
  fields: sys_id,number,short_description,text,kb_category,rating,sys_view_count,workflow_state
  limit: 10
```

**Using REST API:**
```bash
GET /api/now/table/kb_knowledge?sysparm_query=workflow_state=published^active=true^short_descriptionLIKE[keyword1]^ORshort_descriptionLIKE[keyword2]^ORtextLIKE[keyword1]&sysparm_fields=sys_id,number,short_description,text,kb_category,rating,sys_view_count&sysparm_limit=10
```

Rank KB articles by relevance:

| Rank | Article | Relevance | Rating | Views |
|------|---------|-----------|--------|-------|
| 1 | KB0012345 | 92% - exact symptom match | 4.5/5 | 1,240 |
| 2 | KB0012350 | 78% - related category | 4.2/5 | 890 |
| 3 | KB0012367 | 65% - partial keyword match | 3.8/5 | 450 |

### Step 3: Find Similar Historical Incidents

Query resolved incidents with similar descriptions for proven resolution paths.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: incident
  query: state=6^category=[category]^short_descriptionLIKE[primary_keyword]^resolved_atONLast 180 days@javascript:gs.daysAgoStart(180)@javascript:gs.daysAgoEnd(0)
  fields: sys_id,number,short_description,close_notes,close_code,resolution_code,resolved_by,category,subcategory,assignment_group
  limit: 15
```

**Using REST API:**
```bash
GET /api/now/table/incident?sysparm_query=state=6^category=[category]^short_descriptionLIKE[primary_keyword]^resolved_atONLast 180 days@javascript:gs.daysAgoStart(180)@javascript:gs.daysAgoEnd(0)&sysparm_fields=sys_id,number,short_description,close_notes,close_code,resolution_code,resolved_by,category,subcategory,assignment_group&sysparm_limit=15
```

Analyze close_notes from similar incidents to extract common resolution steps.

### Step 4: Check for Related Changes and Problems

Determine if a recent change or known problem is causing or related to the incident.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: change_request
  query: cmdb_ci=[incident_cmdb_ci]^stateINimplemented,review^end_dateONLast 7 days@javascript:gs.daysAgoStart(7)@javascript:gs.daysAgoEnd(0)
  fields: sys_id,number,short_description,state,end_date,type,risk
  limit: 5
```

```
Tool: SN-Query-Table
Parameters:
  table_name: problem
  query: active=true^cmdb_ci=[incident_cmdb_ci]^ORcategory=[incident_category]
  fields: sys_id,number,short_description,known_error,workaround,state
  limit: 5
```

**Using REST API:**
```bash
GET /api/now/table/change_request?sysparm_query=cmdb_ci=[incident_cmdb_ci]^stateINimplemented,review^end_dateONLast 7 days@javascript:gs.daysAgoStart(7)@javascript:gs.daysAgoEnd(0)&sysparm_fields=sys_id,number,short_description,state,end_date,type,risk&sysparm_limit=5

GET /api/now/table/problem?sysparm_query=active=true^cmdb_ci=[incident_cmdb_ci]^ORcategory=[incident_category]&sysparm_fields=sys_id,number,short_description,known_error,workaround,state&sysparm_limit=5
```

### Step 5: Check Incident Intelligence Data

If available, retrieve AI-generated insights from the incident intelligence table.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_si_incident
  query: incident=[incident_sys_id]
  fields: sys_id,incident,similar_incidents,suggested_resolution,root_cause_analysis
  limit: 1
```

**Using REST API:**
```bash
GET /api/now/table/sn_si_incident?sysparm_query=incident=[incident_sys_id]&sysparm_fields=sys_id,incident,similar_incidents,suggested_resolution,root_cause_analysis&sysparm_limit=1
```

### Step 6: Generate Resolution Steps

Compile findings into a structured resolution plan:

```
=== SUGGESTED RESOLUTION STEPS ===
Incident: INC0067890
Issue: Outlook not syncing emails on Windows 11 laptop
Category: Software > Email

RELATED FINDINGS:
- KB Article: KB0012345 - "Outlook Sync Issues on Windows 11" (92% match)
- Similar Incidents: 14 resolved in last 90 days (avg resolution: 45 min)
- Recent Change: CHG0045678 - Exchange server patch applied 3 days ago
- Known Problem: None

RESOLUTION PLAN:

Step 1: Verify Connectivity (Confidence: HIGH)
  Action: Confirm user has network/internet access. Test by opening a browser.
  Source: Standard troubleshooting baseline
  Est. Time: 2 minutes

Step 2: Restart Outlook in Safe Mode (Confidence: HIGH)
  Action: Close Outlook. Run "outlook.exe /safe" from Run dialog.
  Check if syncing resumes in safe mode.
  Source: KB0012345 (Step 1)
  Est. Time: 3 minutes

Step 3: Clear Outlook Cache (Confidence: HIGH)
  Action: Close Outlook. Navigate to %localappdata%\Microsoft\Outlook\
  Delete .ost file. Reopen Outlook to rebuild cache.
  Source: KB0012345 (Step 3), INC0067001 close notes
  Est. Time: 10 minutes

Step 4: Check Exchange Connectivity (Confidence: MEDIUM)
  Action: Run "Test-OutlookConnectivity" in PowerShell or use
  Microsoft Remote Connectivity Analyzer. Verify autodiscover is working.
  Source: 8/14 similar incidents resolved at this step
  Est. Time: 5 minutes

Step 5: Review Recent Change Impact (Confidence: MEDIUM)
  Action: Check if CHG0045678 (Exchange patch) introduced compatibility
  issues. Contact Exchange team if Steps 1-4 do not resolve.
  Source: Change correlation
  Est. Time: 10 minutes

ESCALATION PATH:
If Steps 1-5 do not resolve: Escalate to Messaging Team (Exchange Support)
with diagnostic results from each step documented in work notes.
```

### Step 7: Post Resolution Steps to Incident

Write the suggested steps as a work note on the incident.

**Using MCP:**
```
Tool: SN-Add-Work-Notes
Parameters:
  sys_id: [incident_sys_id]
  work_notes: "[generated resolution plan from Step 6]"
```

**Using REST API:**
```bash
PATCH /api/now/table/incident/{sys_id}
Content-Type: application/json

{
  "work_notes": "[generated resolution plan from Step 6]"
}
```

### Step 8: Track Resolution Effectiveness

After the incident is resolved, compare the actual resolution with suggested steps:

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: incident
  query: sys_id=[incident_sys_id]^state=6
  fields: sys_id,number,close_notes,close_code,resolution_code
  limit: 1
```

Track metrics:
- **Step accuracy**: Which suggested step actually resolved the issue
- **Step sequence**: Did the agent follow the suggested order or skip ahead
- **Time savings**: Resolution time with suggestions vs. baseline
- **Coverage**: Percentage of incidents where suggestions were applicable

## Tool Usage

| Tool | Purpose | When to Use |
|------|---------|-------------|
| `SN-NL-Search` | Natural language search for KB articles and incidents | Symptom-based discovery |
| `SN-Query-Table` | Structured queries for incidents, KB, changes, problems | Core data gathering |
| `SN-Update-Record` | Update incident with resolution steps | Applying suggestions |
| `SN-Add-Work-Notes` | Post resolution plan as work notes | Agent guidance |
| `SN-Get-Table-Schema` | Explore table fields and relationships | Setup and discovery |

## Best Practices

1. **Rank steps by confidence** -- put the most likely fix first to minimize resolution time
2. **Cite sources** -- reference KB article numbers and similar incident numbers for credibility
3. **Include time estimates** -- agents need to know how long each step will take for SLA planning
4. **Provide escalation paths** -- always include a fallback when suggested steps do not resolve
5. **Check for recent changes** -- many incidents are caused by recent changes; always correlate
6. **Limit to 5-7 steps** -- more than 7 steps overwhelms agents; break complex issues into phases
7. **Use plain language** -- write steps for the agent's skill level, not for experts
8. **Update KB when gaps found** -- if no KB article covers the issue, flag for knowledge creation
9. **Validate with close_notes** -- compare suggested steps against actual resolutions to improve over time

## Troubleshooting

### "No similar incidents found"

**Cause:** The issue is novel, or search keywords are too specific
**Solution:** Broaden the search by using category alone without keywords, or search by CI. Consider searching problem records for known errors.

### "KB articles are outdated"

**Cause:** Articles reference old software versions or deprecated procedures
**Solution:** Flag the article for review by the knowledge manager. Prefer steps from recent similar incidents over old KB articles.

### "Suggested steps do not match the actual issue"

**Cause:** Incident description is vague or misleading
**Solution:** Recommend the agent gather more information from the caller before proceeding. Add a "Step 0: Verify symptoms with caller" to the resolution plan.

### "Too many similar incidents, hard to determine best resolution"

**Cause:** Common issue type with multiple valid resolution paths
**Solution:** Group similar incidents by close_code and resolution_code. Rank resolution paths by frequency (most common = highest confidence).

## Examples

### Example 1: VPN Connection Failure

**Incident:** INC0067891 - "Cannot connect to VPN, error 812"

**Suggested Steps:**
1. Verify VPN client version is 4.10+ (KB0034567, HIGH confidence)
2. Check if user credentials are expired in Active Directory (INC0065432 pattern, HIGH)
3. Test alternative VPN gateway endpoint (KB0034570, MEDIUM)
4. Clear VPN client cache and re-authenticate (5/12 similar incidents, MEDIUM)
5. Escalate to Network Operations with error 812 diagnostic logs (fallback)

### Example 2: SAP Login Issue

**Incident:** INC0067892 - "SAP GUI showing 'No logon possible' error"

**Suggested Steps:**
1. Check SAP system status on monitoring dashboard (standard check, HIGH)
2. Verify user is not locked in SU01 transaction (KB0089012, HIGH)
3. Check if recent CHG0055123 (SAP kernel update) affected logon parameters (change correlation, MEDIUM)
4. Reset SAP user password and unlock account (7/9 similar incidents, HIGH)
5. Escalate to SAP Basis team with SU53 authorization trace (fallback)

### Example 3: Novel Issue with No KB Coverage

**Incident:** INC0067893 - "New procurement tool showing blank screen after latest update"

**Suggested Steps:**
1. Clear browser cache and try incognito mode (standard web troubleshooting, MEDIUM)
2. Test with alternative browser (Chrome/Edge/Firefox) (standard, MEDIUM)
3. No KB articles found -- flag for knowledge gap (knowledge/gap-analysis)
4. Check recent deployment: CHG0055200 "Procurement v3.2 release" (change correlation, HIGH)
5. Escalate to Application Support with browser console errors (fallback)

**Note:** Suggested resolution plan has lower confidence due to no KB coverage and no similar historical incidents. Recommend creating a KB article after resolution.

## Related Skills

- `itsm/case-auto-resolve` - Auto-resolve when suggested steps have very high confidence
- `itsm/predict-assignment` - Route to correct group before generating steps
- `itsm/incident-triage` - Triage and prioritize before resolution
- `knowledge/article-generation` - Create KB articles from successful resolutions
- `knowledge/content-recommendation` - Alternative approach to finding relevant KB content
- `itsm/incident-sentiment` - Check sentiment to prioritize which incidents get suggestions first
