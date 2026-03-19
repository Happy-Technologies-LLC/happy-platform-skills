---
name: resume-skill-extraction
version: 1.0.0
description: Extract skills, qualifications, and experience from resume data within ServiceNow talent management, mapping to competency frameworks and job requirements
author: Happy Technologies LLC
tags: [hrsd, resume, skills, talent-management, competency, extraction, recruiting]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp:
    - SN-Query-Table
    - SN-NL-Search
    - SN-Get-Record
    - SN-Update-Record
  rest:
    - /api/now/table/sn_hr_core_profile
    - /api/now/table/sn_hr_tm_candidate
    - /api/now/table/sn_hr_tm_candidate_application
    - /api/now/table/sn_hr_tm_job_requisition
    - /api/now/table/sn_hr_tm_skill
    - /api/now/table/sn_hr_tm_competency
    - /api/now/table/sn_hr_tm_qualification
    - /api/now/table/sys_attachment
    - /api/now/table/cmn_department
  native:
    - Bash
complexity: advanced
estimated_time: 10-20 minutes
---

# Resume Skill Extraction

## Overview

This skill extracts structured skill, qualification, and experience data from resume information stored in ServiceNow's talent management modules. It helps you:

- Parse and extract skills, certifications, and qualifications from candidate records
- Map extracted skills to organizational competency frameworks
- Compare candidate qualifications against job requisition requirements
- Identify skill gaps and strengths relative to target positions
- Populate talent profile records with structured skill data
- Support bulk extraction for talent pipeline analysis

**When to use:** When recruiters or HR talent teams need to systematically extract and categorize skills from candidate applications, match candidates to open requisitions, or build competency profiles for workforce planning.

## Prerequisites

- **Roles:** `sn_hr_tm.recruiter`, `sn_hr_tm.hiring_manager`, or `sn_hr_core.manager`
- **Plugins:** `com.sn_hr_service_delivery` (HR Service Delivery), `com.sn_hr_talent_management` (Talent Management)
- **Access:** Read/write access to `sn_hr_tm_candidate`, `sn_hr_tm_skill`, `sn_hr_tm_competency`, and `sn_hr_tm_job_requisition`
- **Knowledge:** Understanding of your organization's competency framework and job family structure

## Procedure

### Step 1: Retrieve Candidate Record

Fetch the candidate profile that contains resume data and application details.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_hr_tm_candidate
  query: number=[candidate_number]
  fields: sys_id,number,first_name,last_name,email,phone,source,stage,resume_text,resume_content,current_title,current_employer,years_experience,education_level,location,skills_summary
  limit: 1
```

**Using REST API:**
```bash
GET /api/now/table/sn_hr_tm_candidate?sysparm_query=number=[candidate_number]&sysparm_fields=sys_id,number,first_name,last_name,email,phone,source,stage,resume_text,resume_content,current_title,current_employer,years_experience,education_level,location,skills_summary&sysparm_display_value=true&sysparm_limit=1
```

### Step 2: Retrieve Resume Attachment

If the resume is stored as an attachment rather than in a text field, fetch the attachment metadata.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_attachment
  query: table_name=sn_hr_tm_candidate^table_sys_id=[candidate_sys_id]^content_typeLIKEpdf^ORcontent_typeLIKEdoc^ORcontent_typeLIKEtext
  fields: sys_id,file_name,content_type,size_bytes,sys_created_on
  limit: 5
```

**Using REST API:**
```bash
GET /api/now/table/sys_attachment?sysparm_query=table_name=sn_hr_tm_candidate^table_sys_id=[candidate_sys_id]&sysparm_fields=sys_id,file_name,content_type,size_bytes,sys_created_on&sysparm_limit=5

# Download attachment content:
GET /api/now/attachment/{attachment_sys_id}/file
```

### Step 3: Retrieve Target Job Requisition

Fetch the job requisition to understand required skills and qualifications for comparison.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_hr_tm_job_requisition
  query: number=[requisition_number]
  fields: sys_id,number,title,description,department,location,job_family,required_skills,preferred_skills,minimum_education,minimum_experience,competencies,status,hiring_manager
  limit: 1
```

**Using REST API:**
```bash
GET /api/now/table/sn_hr_tm_job_requisition?sysparm_query=number=[requisition_number]&sysparm_fields=sys_id,number,title,description,department,location,job_family,required_skills,preferred_skills,minimum_education,minimum_experience,competencies,status,hiring_manager&sysparm_display_value=true&sysparm_limit=1
```

### Step 4: Fetch Organizational Competency Framework

Retrieve the competency definitions that skills should be mapped to.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_hr_tm_competency
  query: active=true^job_familyLIKE[target_job_family]
  fields: sys_id,name,description,category,proficiency_levels,job_family,required_level,active
  limit: 50
```

**Using REST API:**
```bash
GET /api/now/table/sn_hr_tm_competency?sysparm_query=active=true^job_familyLIKEEngineering&sysparm_fields=sys_id,name,description,category,proficiency_levels,job_family,required_level&sysparm_display_value=true&sysparm_limit=50
```

### Step 5: Retrieve Existing Skill Taxonomy

Pull the organization's skill taxonomy to map extracted skills to standardized entries.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_hr_tm_skill
  query: active=true
  fields: sys_id,name,category,skill_type,description,active
  limit: 200
```

**Using REST API:**
```bash
GET /api/now/table/sn_hr_tm_skill?sysparm_query=active=true&sysparm_fields=sys_id,name,category,skill_type,description&sysparm_display_value=true&sysparm_limit=200
```

### Step 6: Extract and Categorize Skills from Resume

Parse the resume text and categorize extracted information:

```
=== SKILL EXTRACTION RESULTS ===

Candidate: John Martinez (CND0004521)
Current: Senior DevOps Engineer at TechCorp
Experience: 8 years

--- Technical Skills ---
| Skill               | Proficiency | Years | Matched Taxonomy Entry |
|---------------------|-------------|-------|------------------------|
| Kubernetes           | Expert      | 5     | SKL0001234 - Kubernetes |
| AWS (EC2, S3, Lambda)| Expert      | 6     | SKL0001201 - AWS Cloud  |
| Terraform            | Advanced    | 4     | SKL0001256 - Terraform  |
| Python               | Advanced    | 7     | SKL0001102 - Python     |
| Jenkins/CI-CD        | Expert      | 6     | SKL0001189 - CI/CD      |
| Docker               | Expert      | 5     | SKL0001233 - Docker     |
| Ansible              | Intermediate| 2     | SKL0001267 - Ansible    |

--- Certifications ---
| Certification                        | Date    | Mapped Qualification |
|--------------------------------------|---------|----------------------|
| AWS Solutions Architect Professional | 2024-06 | QAL0000456           |
| Certified Kubernetes Administrator   | 2023-11 | QAL0000489           |
| HashiCorp Terraform Associate        | 2025-01 | QAL0000512           |

--- Education ---
| Degree                    | Institution          | Year |
|---------------------------|----------------------|------|
| B.S. Computer Science     | State University     | 2018 |
| M.S. Information Systems  | Tech University      | 2021 |

--- Soft Skills ---
- Team Leadership (managed team of 6)
- Cross-functional collaboration
- Incident management and on-call coordination
- Technical documentation and knowledge sharing

--- Unmapped Skills (New to Taxonomy) ---
- Pulumi (Infrastructure as Code - no taxonomy match)
- Backstage (Developer Portal - no taxonomy match)
```

### Step 7: Compare Against Job Requirements

Match extracted skills against the target requisition:

```
=== SKILL GAP ANALYSIS ===

Requisition: REQ0002345 - Staff Site Reliability Engineer
Department: Platform Engineering

--- Required Skills Match ---
| Required Skill      | Status  | Candidate Level | Required Level |
|---------------------|---------|-----------------|----------------|
| Kubernetes           | MATCH   | Expert          | Advanced       |
| Cloud Platform (AWS) | MATCH   | Expert          | Advanced       |
| CI/CD Pipelines      | MATCH   | Expert          | Intermediate   |
| Python or Go         | PARTIAL | Python-Advanced | Advanced       |
| Monitoring (Datadog) | GAP     | Not found       | Intermediate   |

--- Preferred Skills Match ---
| Preferred Skill      | Status  | Candidate Level |
|----------------------|---------|-----------------|
| Terraform/IaC        | MATCH   | Advanced        |
| Incident Response    | MATCH   | Experienced     |
| Service Mesh (Istio) | GAP     | Not found       |

--- Competency Alignment ---
| Competency              | Required Level | Assessed Level | Status |
|-------------------------|----------------|----------------|--------|
| Infrastructure Design   | Level 4        | Level 4        | MET    |
| Automation Engineering  | Level 4        | Level 5        | EXCEEDS|
| Observability           | Level 3        | Level 2        | GAP    |
| Leadership              | Level 3        | Level 3        | MET    |

Overall Match Score: 82% (Strong Candidate)
Key Gaps: Monitoring/Observability tooling, Service Mesh
Key Strengths: Infrastructure automation, Cloud architecture, CI/CD
```

### Step 8: Update Candidate Record with Extracted Skills

Write the structured skill data back to the candidate profile.

**Using MCP:**
```
Tool: SN-Update-Record
Parameters:
  table_name: sn_hr_tm_candidate
  sys_id: [candidate_sys_id]
  data:
    skills_summary: "Kubernetes(Expert), AWS(Expert), Terraform(Advanced), Python(Advanced), Docker(Expert), CI/CD(Expert), Ansible(Intermediate)"
    education_level: "Masters"
    years_experience: 8
```

**Using REST API:**
```bash
PATCH /api/now/table/sn_hr_tm_candidate/[candidate_sys_id]
Content-Type: application/json
{
  "skills_summary": "Kubernetes(Expert), AWS(Expert), Terraform(Advanced), Python(Advanced), Docker(Expert), CI/CD(Expert), Ansible(Intermediate)",
  "education_level": "Masters",
  "years_experience": 8
}
```

## Tool Usage

### MCP Tools Reference

| Tool | When to Use |
|------|-------------|
| `SN-Query-Table` | Query candidates, requisitions, skills taxonomy, competencies |
| `SN-NL-Search` | Natural language search for matching candidates or roles |
| `SN-Get-Record` | Retrieve full candidate record with resume content |
| `SN-Update-Record` | Write extracted skill data back to candidate profiles |

### REST API Reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/now/table/sn_hr_tm_candidate` | GET/PATCH | Candidate records and resume data |
| `/api/now/table/sn_hr_tm_job_requisition` | GET | Job requisition requirements |
| `/api/now/table/sn_hr_tm_skill` | GET | Organizational skill taxonomy |
| `/api/now/table/sn_hr_tm_competency` | GET | Competency framework definitions |
| `/api/now/table/sn_hr_tm_qualification` | GET | Certification and qualification records |
| `/api/now/table/sys_attachment` | GET | Resume file attachments |

## Best Practices

- **Normalize skill names:** Map variations (e.g., "k8s", "Kube", "Kubernetes") to the single canonical taxonomy entry
- **Preserve original text:** Keep the raw extracted text alongside normalized mappings for audit purposes
- **Handle multi-format resumes:** Support PDF, DOCX, and plain text; extraction quality varies by format
- **Validate certifications:** Cross-reference certification claims with known certification bodies and expiry dates
- **Use proficiency indicators:** Infer proficiency from context (years of use, project complexity, leadership role) rather than self-reported levels alone
- **Respect data privacy:** Resume data is PII; limit extraction results to authorized recruiting personnel
- **Update taxonomy regularly:** Flag unmapped skills for taxonomy administrators to review and potentially add

## Troubleshooting

### "Resume text field is empty"

**Cause:** Resume may be stored only as an attachment, not parsed into the text field
**Solution:** Query `sys_attachment` for the candidate record and download the file content via the attachment API

### "No matching skills in taxonomy"

**Cause:** Organization's skill taxonomy may not cover all technical domains
**Solution:** Record unmapped skills separately and flag them for taxonomy expansion; do not discard unmatched skills

### "Candidate application not linked to requisition"

**Cause:** The application record may use a different reference field
**Solution:** Query `sn_hr_tm_candidate_application` with `candidate=[candidate_sys_id]` to find the linking record and requisition reference

### "Competency framework returns empty"

**Cause:** Competencies may not be tagged by job family or may use a different categorization
**Solution:** Query without the `job_family` filter and manually match competencies based on description and category

## Examples

### Example 1: Single Candidate Screening

**Input:** "Extract skills from candidate CND0004521 for requisition REQ0002345"

**Steps:**
1. Query `sn_hr_tm_candidate` for resume data
2. Query `sn_hr_tm_job_requisition` for requirements
3. Fetch skill taxonomy from `sn_hr_tm_skill`
4. Extract and categorize skills from resume text
5. Run gap analysis against requisition
6. Update candidate record with structured data

### Example 2: Bulk Pipeline Analysis

**Input:** "Extract skills from all candidates applying to Engineering requisitions"

```
Tool: SN-Query-Table
Parameters:
  table_name: sn_hr_tm_candidate_application
  query: job_requisition.departmentLIKEEngineering^status=active
  fields: sys_id,candidate,job_requisition,status,applied_date,stage
  limit: 50
```

Then iterate through each candidate to extract and compare skills.

### Example 3: Internal Mobility Skill Assessment

**Input:** "Assess current employee's skills for an internal transfer"

```
Tool: SN-Query-Table
Parameters:
  table_name: sn_hr_core_profile
  query: user=[employee_sys_id]
  fields: sys_id,user,department,job_title,skills,certifications,education,years_in_role
  limit: 1
```

Compare the employee's existing profile skills against the target role requirements using the same gap analysis framework.

## Related Skills

- `hrsd/persona-assistant` - Personalized HR guidance for internal mobility
- `hrsd/case-summarization` - Summarize HR cases related to talent processes
- `hrsd/sentiment-analysis` - Assess candidate experience sentiment
- `knowledge/duplicate-detection` - Detect duplicate candidate profiles
- `reporting/trend-analysis` - Analyze skill demand trends across requisitions
