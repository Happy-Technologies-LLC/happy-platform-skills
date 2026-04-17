---
name: incident-triage
version: 1.0.0
description: "Triage, prioritize, and assign ServiceNow incidents using impact/urgency matrix and category-based routing. Use when an alert fires, a ticket lands unassigned, an outage is reported, an escalation is needed, severity must be classified, an on-call team must be paged, or an SLA is at risk."
author: Happy Technologies LLC
tags: [itsm, incident, triage, assignment, priority, itil]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp:
    - SN-NL-Search
    - SN-Query-Table
    - SN-Assign-Incident
    - SN-Update-Record
    - SN-Add-Work-Notes
  native:
    - Bash
complexity: intermediate
estimated_time: 5-15 minutes
---

# Incident Triage

## Procedure

### Step 1: Identify Incidents Requiring Triage

Query for active incidents that are unassigned or in "New" state.

```
Tool: SN-NL-Search
Parameters:
  table_name: incident
  query: "active high priority incidents where assigned to is empty"
  fields: number,short_description,description,impact,urgency,category,priority
  limit: 20
```

### Step 2: Analyze Each Incident

For each incident, determine:

1. **Category** — Match keywords to category:
   - Network: "network", "connectivity", "VPN", "wifi", "firewall"
   - Hardware: "laptop", "monitor", "keyboard", "printer", "device"
   - Software: "application", "crash", "error", "update"
   - Email: "email", "outlook", "mailbox", "calendar"
   - Security: "password", "access", "locked", "breach", "phishing"
   - SAP/ERP: "SAP", "ERP", "finance system", "procurement"

2. **Priority** — Apply the Impact/Urgency matrix:

   | Impact ↓ / Urgency → | High (1) | Medium (2) | Low (3) |
   |----------------------|----------|------------|---------|
   | High (1)             | P1       | P2         | P3      |
   | Medium (2)           | P2       | P3         | P4      |
   | Low (3)              | P3       | P4         | P5      |

3. **Escalation triggers** — Bump to P1 if any apply:
   - Executive mentioned or revenue impact
   - Security breach or phishing confirmed
   - Outage affecting multiple users
   - SLA at risk of breach

### Step 3: Resolve Assignment Group

Map the category to an assignment group:

| Category | Assignment Group |
|----------|------------------|
| Network | Network Operations |
| Hardware | Desktop Support |
| Software | Application Support |
| Email | Messaging Team |
| Security | Security Operations |
| SAP/ERP | ERP Support |
| Unknown | Service Desk L2 |

Look up the group sys_id:

```
Tool: SN-Query-Table
Parameters:
  table_name: sys_user_group
  query: name=Network Operations
  fields: sys_id,name
  limit: 1
```

**Validation checkpoint:** Confirm the query returns exactly one result with a valid `sys_id`. If no group is found, fall back to "Service Desk L2" and note the mismatch in work notes.

### Step 4: Assign the Incident

```
Tool: SN-Assign-Incident
Parameters:
  sys_id: [incident_sys_id]
  assignment_group: Network Operations
  work_notes: "Triage: Assigned to Network Operations based on keyword analysis (VPN connectivity issue). Priority validated as P2 per impact/urgency matrix."
```

**Validation checkpoint:** After assignment, query the incident to confirm `assignment_group` and `state` were updated. If the update failed (permissions, read-only state), log the error in work notes and flag for manual review.

### Step 5: Document Triage Decision

```
Tool: SN-Add-Work-Notes
Parameters:
  sys_id: [incident_sys_id]
  work_notes: "TRIAGE: Category=Network (VPN, connectivity). Impact=2 Urgency=1 → P2. Assigned Network Operations. Next: investigate VPN tunnel status."
```

## Troubleshooting

| Problem | Cause | Fix |
|---------|-------|-----|
| No incidents found | Query too restrictive | Broaden query; check different states |
| Assignment group not found | Name mismatch | Use LIKE operator: `nameLIKENetwork` |
| Insufficient permissions | Missing `itil` role or incident read-only | Verify roles; check incident state |

## Examples

### Network Issue Triage

Incident INC0012345 — "Cannot connect to VPN from home"

- Keywords: "VPN", "connect" → **Network**
- Impact: Medium (single user) / Urgency: High (cannot work) → **P2**
- Assignment: **Network Operations**

```
Tool: SN-Assign-Incident
Parameters:
  sys_id: abc123
  assignment_group: Network Operations
  work_notes: "Triage: VPN connectivity issue assigned to Network Ops. P2 priority."
```

### Security Escalation

Incident INC0012346 — "Suspicious email with attachment clicked"

- Keywords: "suspicious", "email", "clicked" → **Security** → **Escalate to P1**
- Assignment: **Security Operations** — notify security manager

```
Tool: SN-Update-Record
Parameters:
  sys_id: def456
  table_name: incident
  fields: { priority: 1, assignment_group: Security Operations, work_notes: "Triage: Escalated to P1. Phishing indicator. Security Ops notified." }
```