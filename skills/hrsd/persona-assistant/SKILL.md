---
name: persona-assistant
version: 1.0.0
description: Provide persona-based HR assistance tailored to employee role, department, and history with routing to appropriate HR services and personalized policy guidance
author: Happy Technologies LLC
tags: [hrsd, persona, assistant, employee-experience, routing, policy, self-service]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp:
    - SN-Query-Table
    - SN-NL-Search
    - SN-Get-Record
    - SN-Create-Record
    - SN-Add-Work-Notes
  rest:
    - /api/now/table/sn_hr_core_case
    - /api/now/table/sn_hr_core_profile
    - /api/now/table/sn_hr_le_case_type
    - /api/now/table/sn_hr_core_service
    - /api/now/table/sn_hr_sp_content
    - /api/now/table/hr_category
    - /api/now/table/kb_knowledge
    - /api/now/table/cmn_department
    - /api/now/table/sys_user
    - /api/now/table/cmn_location
    - /api/now/table/sn_hr_le_center_of_excellence
  native:
    - Bash
complexity: intermediate
estimated_time: 5-15 minutes
---

# Persona-Based HR Assistant

## Overview

This skill provides personalized HR assistance by adapting responses and service routing based on the employee's role, department, location, tenure, and interaction history. It helps you:

- Identify the employee persona (new hire, manager, executive, remote worker, contractor, etc.)
- Surface role-specific HR services, policies, and self-service options
- Route inquiries to the correct Center of Excellence (COE) based on persona and topic
- Provide location-aware and department-aware policy guidance
- Leverage case history to anticipate needs and avoid redundant information
- Deliver personalized onboarding, benefits, and career development guidance

**When to use:** When an HR agent or virtual agent needs to provide tailored HR assistance that accounts for the employee's full context, or when designing persona-driven service catalog experiences.

## Prerequisites

- **Roles:** `sn_hr_core.case_writer`, `sn_hr_core.agent`, or `sn_hr_core.manager`
- **Plugins:** `com.sn_hr_service_delivery` (HR Service Delivery), `com.sn_hr_service_portal` (HR Service Portal, optional)
- **Access:** Read access to `sn_hr_core_profile`, `sn_hr_core_case`, `sn_hr_le_case_type`, `sn_hr_core_service`, `kb_knowledge`, and `cmn_department`
- **Knowledge:** Familiarity with your organization's HR service catalog, COE structure, and location-specific policy variations

## Procedure

### Step 1: Identify the Employee and Build Profile Context

Retrieve the full employee HR profile to determine persona attributes.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_hr_core_profile
  query: user=[employee_sys_id]
  fields: sys_id,user,department,location,employment_type,hire_date,manager,job_title,cost_center,building,employee_type,benefits_eligible,pay_group,schedule,work_schedule,vip
  limit: 1
```

**Using REST API:**
```bash
GET /api/now/table/sn_hr_core_profile?sysparm_query=user=[employee_sys_id]&sysparm_fields=sys_id,user,department,location,employment_type,hire_date,manager,job_title,cost_center,building,employee_type,benefits_eligible,pay_group,schedule,work_schedule,vip&sysparm_display_value=true&sysparm_limit=1
```

### Step 2: Retrieve User Details and Organizational Context

Get supplementary details from the user record and department hierarchy.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_user
  query: sys_id=[employee_sys_id]
  fields: sys_id,name,email,phone,title,department,location,manager,company,time_zone,preferred_language,roles
  limit: 1
```

```
Tool: SN-Query-Table
Parameters:
  table_name: cmn_department
  query: sys_id=[department_sys_id]
  fields: sys_id,name,parent,dept_head,company,description,business_unit
  limit: 1
```

**Using REST API:**
```bash
GET /api/now/table/sys_user/[employee_sys_id]?sysparm_fields=sys_id,name,email,phone,title,department,location,manager,company,time_zone,preferred_language,roles&sysparm_display_value=true

GET /api/now/table/cmn_department/[department_sys_id]?sysparm_fields=sys_id,name,parent,dept_head,company,business_unit&sysparm_display_value=true
```

### Step 3: Determine Employee Persona

Classify the employee into one or more persona categories based on profile attributes:

```
=== PERSONA CLASSIFICATION ===

Employee: Jane Smith
Determined Persona(s): [Primary] Mid-Career Individual Contributor
                        [Secondary] Remote Worker

--- Persona Rules ---
| Attribute              | Value               | Persona Signal           |
|------------------------|----------------------|--------------------------|
| Tenure                 | 4.8 years            | Established employee     |
| Employment Type        | Full-time            | Regular employee         |
| Job Title              | Senior Engineer      | Individual contributor   |
| Direct Reports         | 0                    | Non-manager              |
| Location               | Remote - US          | Remote worker            |
| Benefits Eligible      | Yes                  | Full benefits access     |
| VIP                    | No                   | Standard service tier    |

--- Persona Categories ---
NEW_HIRE:        hire_date within last 90 days
MANAGER:         has direct reports or manager role
EXECUTIVE:       C-level title or VIP flag
IC_EARLY:        0-2 years tenure, non-manager
IC_MID:          2-7 years tenure, non-manager
IC_SENIOR:       7+ years tenure, non-manager
CONTRACTOR:      employment_type = Contractor
REMOTE_WORKER:   location contains "Remote"
INTERNATIONAL:   location outside primary country
PART_TIME:       schedule indicates part-time
TRANSITIONING:   active transfer or LOA case
```

### Step 4: Retrieve Location-Specific Policies

Fetch HR policies and knowledge articles relevant to the employee's location.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: cmn_location
  query: sys_id=[location_sys_id]
  fields: sys_id,name,country,state,city,time_zone,parent,company
  limit: 1
```

```
Tool: SN-Query-Table
Parameters:
  table_name: kb_knowledge
  query: workflow_state=published^kb_knowledge_base.titleLIKEHR^textLIKE[location_country]^ORshort_descriptionLIKE[location_state]
  fields: sys_id,short_description,number,kb_category,valid_to,text
  limit: 10
```

**Using REST API:**
```bash
GET /api/now/table/kb_knowledge?sysparm_query=workflow_state=published^kb_knowledge_base.titleLIKEHR^short_descriptionLIKECalifornia&sysparm_fields=sys_id,short_description,number,kb_category,valid_to&sysparm_display_value=true&sysparm_limit=10
```

### Step 5: Retrieve Available HR Services for Persona

Fetch HR services applicable to the employee's persona and eligibility.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_hr_core_service
  query: active=true^ORDERBYorder
  fields: sys_id,name,description,category,hr_service_center,active,employee_visible,order
  limit: 50
```

```
Tool: SN-Query-Table
Parameters:
  table_name: sn_hr_le_case_type
  query: active=true^employee_visible=true
  fields: sys_id,name,description,hr_service_center,category,fulfillment_group,sla,confidentiality
  limit: 50
```

**Using REST API:**
```bash
GET /api/now/table/sn_hr_core_service?sysparm_query=active=true^ORDERBYorder&sysparm_fields=sys_id,name,description,category,hr_service_center,employee_visible&sysparm_display_value=true&sysparm_limit=50
```

### Step 6: Check Interaction History and Open Cases

Review the employee's recent HR interactions to provide continuity-aware assistance.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_hr_core_case
  query: subject_person=[employee_sys_id]^active=true^ORDERBYDESCopened_at
  fields: sys_id,number,short_description,state,hr_service,assigned_to,assignment_group,opened_at,priority
  limit: 10
```

**Using REST API:**
```bash
GET /api/now/table/sn_hr_core_case?sysparm_query=subject_person=[employee_sys_id]^active=true^ORDERBYDESCopened_at&sysparm_fields=sys_id,number,short_description,state,hr_service,assigned_to,assignment_group,opened_at,priority&sysparm_display_value=true&sysparm_limit=10
```

### Step 7: Identify Correct COE Routing

Determine which Center of Excellence should handle the inquiry based on persona and topic.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_hr_le_center_of_excellence
  query: active=true
  fields: sys_id,name,description,assignment_group,location,supported_case_types,manager
  limit: 20
```

**Using REST API:**
```bash
GET /api/now/table/sn_hr_le_center_of_excellence?sysparm_query=active=true&sysparm_fields=sys_id,name,description,assignment_group,location,supported_case_types,manager&sysparm_display_value=true&sysparm_limit=20
```

### Step 8: Generate Personalized Assistance Response

Compose a persona-aware response with relevant services, policies, and routing:

```
=== PERSONALIZED HR ASSISTANCE ===

Employee: Jane Smith
Persona: Mid-Career IC | Remote Worker | California
Greeting: "Hi Jane, welcome back to HR Services."

--- Active Cases ---
You have 1 open case:
- HRC0012456: Benefits enrollment question (In Progress, assigned to Sarah Lee)
  Status: Awaiting your response - please check your email

--- Contextual Services (Based on Your Persona) ---

For Remote Workers in California:
1. Home Office Equipment Request
   -> Self-Service: Employee Portal > Workplace > Equipment
   -> COE: Workplace Services

2. California-Specific Leave Policies
   -> KB: KB0067891 - California Paid Family Leave Guide
   -> KB: KB0067903 - CA Sick Leave Requirements
   -> COE: Leave Administration - West Region

3. Remote Work Agreement Renewal
   -> Self-Service: Employee Portal > Workplace > Remote Work
   -> Note: Your agreement expires in 45 days

For Mid-Career Employees (4+ years):
4. Career Development & Internal Mobility
   -> Self-Service: Employee Portal > Career > Job Board
   -> COE: Talent Development

5. Sabbatical Eligibility (5-year tenure milestone approaching)
   -> KB: KB0078234 - Sabbatical Program Guidelines
   -> COE: Benefits Administration

6. Stock Vesting & Equity Questions
   -> Self-Service: Employee Portal > Compensation > Equity
   -> COE: Total Rewards

--- Quick Actions ---
- Update personal information: Portal > Profile > Personal Details
- View pay stubs: Portal > Pay > Pay History
- Request time off: Portal > Time Off > New Request
- Contact your HR partner: [HR_Partner_Name] ([email])

--- Routing Decision ---
Topic: [employee_inquiry]
Recommended COE: [matched_coe]
Assignment Group: [fulfillment_group]
Expected SLA: [sla_target]
```

### Step 9: Create Case if Needed

If the inquiry requires case creation, open it with the persona context pre-populated.

**Using MCP:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sn_hr_core_case
  data:
    subject_person: [employee_sys_id]
    short_description: [inquiry_summary]
    hr_service: [matched_case_type_sys_id]
    contact_type: chat
    priority: 3
    description: "Persona: Mid-Career IC, Remote Worker (CA). Inquiry: [details]. Employee tenure: 4.8 years. Open cases: 1."
```

**Using REST API:**
```bash
POST /api/now/table/sn_hr_core_case
Content-Type: application/json
{
  "subject_person": "[employee_sys_id]",
  "short_description": "[inquiry_summary]",
  "hr_service": "[matched_case_type_sys_id]",
  "contact_type": "chat",
  "priority": "3",
  "description": "Persona: Mid-Career IC, Remote Worker (CA). Inquiry: [details]."
}
```

## Tool Usage

### MCP Tools Reference

| Tool | When to Use |
|------|-------------|
| `SN-Query-Table` | Retrieve profiles, services, policies, cases, COE configuration |
| `SN-NL-Search` | Find relevant KB articles using natural language queries |
| `SN-Get-Record` | Fetch detailed single records for specific lookups |
| `SN-Create-Record` | Create HR cases with persona context pre-populated |
| `SN-Add-Work-Notes` | Document persona classification and routing rationale |

### REST API Reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/now/table/sn_hr_core_profile` | GET | Employee HR profile and persona attributes |
| `/api/now/table/sys_user` | GET | User account details |
| `/api/now/table/cmn_department` | GET | Department hierarchy context |
| `/api/now/table/cmn_location` | GET | Location details for policy matching |
| `/api/now/table/sn_hr_core_service` | GET | Available HR services |
| `/api/now/table/sn_hr_le_case_type` | GET | Case types and eligibility |
| `/api/now/table/sn_hr_le_center_of_excellence` | GET | COE routing configuration |
| `/api/now/table/kb_knowledge` | GET | HR policy knowledge articles |
| `/api/now/table/sn_hr_core_case` | GET/POST | Employee case history and creation |

## Best Practices

- **Cache persona classification:** Store the persona determination so it does not need to be recalculated on every interaction within the same session
- **Layer personas:** Employees often fit multiple personas (e.g., Manager + Remote Worker); combine relevant services from all applicable personas
- **Prioritize active cases:** Always surface open cases first so employees can check status before creating duplicates
- **Use location hierarchy:** When location-specific policies are not found, fall back to state, then country, then global policies
- **Respect VIP handling:** Employees flagged as VIP should receive expedited routing and white-glove service options
- **Adapt language:** Match the communication style to the persona (executives prefer concise summaries; new hires need more guidance)
- **Track persona effectiveness:** Monitor which persona-driven suggestions lead to case creation vs. self-service resolution to refine persona rules
- **Handle contractors carefully:** Contractors have different benefits eligibility, policy access, and service entitlements; always check `employment_type`

## Troubleshooting

### "Employee profile not found"

**Cause:** New hires or contingent workers may not have HR profiles created yet
**Solution:** Fall back to `sys_user` for basic details. Create a minimal persona from user record fields (department, location, title)

### "COE routing returns multiple matches"

**Cause:** Some inquiry topics span multiple COEs (e.g., relocation involves Benefits + Workplace)
**Solution:** Use the primary topic to select the lead COE and note secondary COEs in the case description for collaboration

### "Location-specific policies not available"

**Cause:** KB articles may not be tagged with location metadata
**Solution:** Search by policy topic combined with location keywords in the article text. Check `sn_hr_sp_content` for portal content that may be location-filtered

### "Service catalog shows services employee is not eligible for"

**Cause:** Eligibility rules may be configured at the catalog item level, not in the service record
**Solution:** Check `sn_hr_le_case_type` for `employee_visible` and any associated user criteria records that restrict access

## Examples

### Example 1: New Hire Onboarding Assistance

**Input:** "Help new employee who started 5 days ago"

```
Tool: SN-Query-Table
Parameters:
  table_name: sn_hr_core_profile
  query: user=[new_hire_sys_id]
  fields: sys_id,user,department,location,hire_date,manager,job_title,employment_type,benefits_eligible
  limit: 1
```

**Persona:** NEW_HIRE (tenure < 90 days)

**Personalized Response:**
"Welcome to the team! Here are your priority onboarding tasks:
1. Complete I-9 verification (due within 3 days of hire)
2. Enroll in benefits (30-day enrollment window - deadline: [date])
3. Set up direct deposit (Portal > Pay > Direct Deposit)
4. Complete required training modules (Portal > Learning > My Assignments)
Your HR onboarding contact is [Name] in the Onboarding COE."

### Example 2: Manager Requesting Team Support

**Input:** Manager asks about team leave policies

```
Tool: SN-Query-Table
Parameters:
  table_name: sn_hr_core_profile
  query: manager=[manager_sys_id]
  fields: sys_id,user,department,location,employment_type,hire_date,job_title
  limit: 50
```

**Persona:** MANAGER (has direct reports)

**Personalized Response includes:**
- Manager-specific leave approval tools
- Team absence calendar link
- Policy guidance for managing team leave coverage
- Escalation path for complex leave scenarios (FMLA, ADA)

### Example 3: International Employee Policy Lookup

**Input:** "What benefits am I eligible for?" from employee in Germany

```
Tool: SN-Query-Table
Parameters:
  table_name: kb_knowledge
  query: workflow_state=published^kb_knowledge_base.titleLIKEHR^textLIKEGermany^ORshort_descriptionLIKEEMEA
  fields: sys_id,short_description,number,kb_category
  limit: 10
```

**Persona:** INTERNATIONAL (location: Munich, Germany)

Route to EMEA Benefits COE with Germany-specific policy articles and local HR partner contact.

## Related Skills

- `hrsd/case-summarization` - Summarize case history for persona context
- `hrsd/chat-reply-recommendation` - Generate persona-aware chat replies
- `hrsd/sentiment-analysis` - Incorporate sentiment into persona-based routing
- `hrsd/resume-skill-extraction` - Support internal mobility persona needs
- `catalog/item-creation` - Create persona-specific service catalog items
