---
name: interview-relevance
version: 1.0.0
description: Assess interview notes and job descriptions for skill relevance matching. Score candidate-role fit, highlight skill gaps, evaluate competency alignment, and generate structured hiring recommendations
author: Happy Technologies LLC
tags: [hrsd, interview, hiring, talent, skill-matching, candidate-assessment, recruitment, competency]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp:
    - SN-Query-Table
    - SN-Get-Record
    - SN-Create-Record
    - SN-Update-Record
    - SN-NL-Search
  rest:
    - /api/now/table/sn_hr_core_case
    - /api/now/table/sn_hr_core_profile
    - /api/now/table/sys_user
    - /api/now/table/cmn_department
    - /api/now/table/u_job_requisition
    - /api/now/table/u_interview_feedback
    - /api/now/table/u_candidate
    - /api/now/table/assessment_instance
    - /api/now/table/assessment_instance_question
  native:
    - Bash
complexity: advanced
estimated_time: 15-30 minutes
---

# Interview Relevance and Skill Matching

## Overview

This skill assesses interview feedback and job descriptions to evaluate candidate-role fit in ServiceNow HR Service Delivery environments:

- Extracting required skills and competencies from job requisitions and descriptions
- Parsing interview notes to identify demonstrated skills, experience levels, and behavioral indicators
- Scoring candidate-role fit across technical skills, soft skills, and experience criteria
- Highlighting skill gaps between candidate qualifications and role requirements
- Comparing multiple candidates for the same position
- Generating structured hiring recommendations with evidence-based justification
- Tracking interview feedback patterns across hiring panels

**When to use:** When hiring managers, recruiters, or HR business partners need to evaluate candidate-role alignment, compare candidates objectively, or generate structured assessment summaries from interview feedback.

## Prerequisites

- **Roles:** `sn_hr_core.case_writer`, `sn_hr_core.manager`, or `admin`
- **Plugins:** `com.sn_hr_service_delivery` (HR Service Delivery), `com.snc.assessment` (Assessments, optional)
- **Access:** Read/write access to interview feedback tables, job requisition records, and candidate profiles
- **Knowledge:** Competency framework concepts, structured interview evaluation methods
- **Related Skills:** `hrsd/resume-skill-extraction` for resume parsing, `hrsd/sentiment-analysis` for feedback tone

## Procedure

### Step 1: Retrieve the Job Requisition and Requirements

Fetch the job description and required competencies for the target role.

**MCP Approach:**
```
Tool: SN-Query-Table
Parameters:
  table_name: u_job_requisition
  query: number=REQ0001234
  fields: sys_id,number,u_title,u_department,u_location,u_description,u_required_skills,u_preferred_skills,u_experience_years,u_education,u_salary_range,u_hiring_manager,state
  limit: 1
```

**REST Approach:**
```
GET /api/now/table/u_job_requisition
  ?sysparm_query=number=REQ0001234
  &sysparm_fields=sys_id,number,u_title,u_department,u_location,u_description,u_required_skills,u_preferred_skills,u_experience_years,u_education,u_hiring_manager
  &sysparm_display_value=true
  &sysparm_limit=1
```

### Step 2: Parse and Categorize Role Requirements

Extract structured requirements from the job description text:

**Technical Skills** (tools, languages, platforms):
- Parse `u_required_skills` field for explicit skill listings
- Extract technology mentions from `u_description` (e.g., "Java", "ServiceNow", "AWS")
- Categorize as: Required vs Preferred, and by proficiency level expected

**Soft Skills** (communication, leadership, collaboration):
- Identify behavioral competency requirements from description keywords
- Map to standard competency frameworks if configured

**Experience Requirements:**
- Minimum years of experience from `u_experience_years`
- Industry or domain-specific experience from description
- Management or leadership experience indicators

### Step 3: Retrieve Interview Feedback Records

Fetch all interview feedback for the candidate on this requisition.

**MCP Approach:**
```
Tool: SN-Query-Table
Parameters:
  table_name: u_interview_feedback
  query: u_candidate=<candidate_sys_id>^u_requisition=<requisition_sys_id>^ORDERBYu_interview_date
  fields: sys_id,u_candidate,u_interviewer,u_interview_date,u_interview_type,u_overall_rating,u_technical_rating,u_communication_rating,u_culture_fit_rating,u_notes,u_recommendation,u_strengths,u_concerns
  limit: 20
```

**REST Approach:**
```
GET /api/now/table/u_interview_feedback
  ?sysparm_query=u_candidate=<candidate_sys_id>^u_requisition=<requisition_sys_id>^ORDERBYu_interview_date
  &sysparm_fields=sys_id,u_interviewer,u_interview_date,u_interview_type,u_overall_rating,u_technical_rating,u_notes,u_recommendation,u_strengths,u_concerns
  &sysparm_display_value=true
  &sysparm_limit=20
```

### Step 4: Retrieve Candidate Profile

Get the candidate's background information for context.

**MCP Approach:**
```
Tool: SN-Query-Table
Parameters:
  table_name: u_candidate
  query: sys_id=<candidate_sys_id>
  fields: sys_id,u_name,u_email,u_current_title,u_current_company,u_experience_years,u_education,u_skills,u_resume_text,u_source,u_status
  limit: 1
```

### Step 5: Extract Skills from Interview Notes

Parse interview notes to identify demonstrated skills and experience:

**Analysis framework for each interview feedback record:**

1. **Technical skill mentions**: Identify specific technologies, tools, or methodologies mentioned
2. **Experience depth indicators**: Look for keywords like "led", "designed", "implemented", "managed"
3. **Quantified achievements**: Extract metrics (e.g., "reduced downtime by 40%", "managed team of 12")
4. **Behavioral examples**: Identify STAR-format responses (Situation, Task, Action, Result)
5. **Red flags**: Note concerns, gaps, or inconsistencies mentioned by interviewers

### Step 6: Score Candidate-Role Fit

Build a structured scoring matrix:

```
=== SKILL RELEVANCE SCORING ===

Required Technical Skills:
| Skill              | Required Level | Candidate Level | Score | Evidence |
|--------------------|---------------|-----------------|-------|----------|
| ServiceNow Dev     | Expert        | Advanced        | 4/5   | "5 years SN development, built 3 scoped apps" |
| JavaScript         | Advanced      | Advanced        | 5/5   | "Strong JS skills demonstrated in coding exercise" |
| ITIL Framework     | Intermediate  | Basic           | 2/5   | "Familiar with ITIL concepts but no certification" |
| REST API Design    | Advanced      | Advanced        | 4/5   | "Designed RESTful integrations at previous role" |

Preferred Technical Skills:
| Skill              | Desired Level  | Candidate Level | Score | Evidence |
|--------------------|---------------|-----------------|-------|----------|
| Flow Designer      | Intermediate  | Basic           | 2/5   | "Limited exposure, willing to learn" |
| ATF Testing        | Basic         | None            | 0/5   | "No automated testing experience mentioned" |

Soft Skills:
| Competency         | Weight | Score | Evidence |
|--------------------|--------|-------|----------|
| Communication      | High   | 4/5   | "Articulate, clear technical explanations" |
| Problem Solving    | High   | 5/5   | "Excellent analytical approach in case study" |
| Team Collaboration | Medium | 3/5   | "Works well independently, limited team examples" |
| Leadership         | Low    | 3/5   | "Mentored 2 junior developers" |

Overall Fit Score: 78/100
```

### Step 7: Identify Skill Gaps and Development Needs

Highlight areas where the candidate falls short of requirements:

```
=== SKILL GAP ANALYSIS ===

Critical Gaps (Required skills below threshold):
1. ITIL Framework - Candidate: Basic, Required: Intermediate
   - Risk: May struggle with ITSM process alignment
   - Mitigation: ITIL Foundation certification (2-week course)

2. ATF Testing - Candidate: None, Required: Basic (preferred)
   - Risk: Low immediate impact (preferred, not required)
   - Mitigation: On-the-job training, pair with senior developer

No Critical Gaps in Required Technical Skills: PASS
Soft Skill Gaps: None identified
Experience Gap: None (5 years vs 3 years minimum)
```

### Step 8: Compare Multiple Candidates (Optional)

If evaluating multiple candidates for the same role:

**MCP Approach:**
```
Tool: SN-Query-Table
Parameters:
  table_name: u_interview_feedback
  query: u_requisition=<requisition_sys_id>^u_recommendation=hire^ORDERBYDESCu_overall_rating
  fields: u_candidate,u_overall_rating,u_technical_rating,u_communication_rating,u_recommendation
  limit: 50
```

Generate a comparison matrix:
```
=== CANDIDATE COMPARISON ===
Position: Senior ServiceNow Developer (REQ0001234)

| Criterion          | Candidate A  | Candidate B  | Candidate C  |
|--------------------|-------------|-------------|-------------|
| Technical Score     | 78/100      | 85/100      | 72/100      |
| Soft Skills Score   | 82/100      | 70/100      | 88/100      |
| Experience Match    | 90%         | 95%         | 75%         |
| Skill Gaps          | 1 minor     | 0           | 2 moderate  |
| Panel Consensus     | 3/4 Hire    | 4/4 Hire    | 2/4 Hire    |
| Overall Rank        | #2          | #1          | #3          |
```

### Step 9: Generate Hiring Recommendation

Compile findings into an actionable recommendation:

```
=== HIRING RECOMMENDATION ===
Candidate: Alex Chen
Position: Senior ServiceNow Developer (REQ0001234)

RECOMMENDATION: STRONG HIRE

Justification:
- Exceeds technical requirements in 4 of 5 required skill areas
- Demonstrates strong problem-solving through case study performance
- 5 years of relevant experience exceeds 3-year minimum
- Minor gap in ITIL knowledge can be addressed through certification

Panel Summary:
- Phone Screen (Sarah Lee): Hire - "Strong technical foundation"
- Technical Interview (Mike Chen): Strong Hire - "Best coding exercise in this cycle"
- Behavioral Interview (Lisa Park): Hire - "Good cultural fit, collaborative"
- Hiring Manager (Bob Johnson): Hire - "Strong candidate, minor ITIL gap acceptable"

Onboarding Recommendations:
1. Enroll in ITIL Foundation certification within first 30 days
2. Pair with senior developer for ATF testing mentorship
3. Assign initial project in familiar technology stack (JavaScript/REST APIs)

Compensation Recommendation:
- Based on skill assessment: Mid-to-upper range of band ($X - $Y)
- Justification: Above-average technical skills, below-average ITIL knowledge
```

### Step 10: Record the Assessment

Store the structured assessment in ServiceNow.

**MCP Approach:**
```
Tool: SN-Update-Record
Parameters:
  table_name: u_candidate
  sys_id: <candidate_sys_id>
  data:
    u_status: "Recommended"
    u_assessment_summary: "<compiled assessment>"
    u_skill_score: 78
    u_recommendation: "hire"
```

## Tool Usage

| Tool | Purpose | When to Use |
|------|---------|-------------|
| SN-Query-Table | Fetch requisitions, feedback, candidates | Primary data retrieval |
| SN-Get-Record | Retrieve specific requisition or candidate | Detailed record inspection |
| SN-Create-Record | Create assessment records or feedback entries | Recording new evaluations |
| SN-Update-Record | Update candidate status and scores | Saving assessment results |
| SN-NL-Search | Search for similar roles or past hires | Pattern matching for benchmarks |

## Best Practices

1. **Use consistent scoring rubrics** -- define what each score level means before evaluation
2. **Require evidence for scores** -- every rating should reference specific interview observations
3. **Separate required vs preferred skills** -- do not penalize candidates for missing preferred skills
4. **Weight skills by role priority** -- not all skills are equally important for the position
5. **Consider growth potential** -- a candidate with strong fundamentals may outgrow a gap quickly
6. **Avoid bias in language analysis** -- focus on demonstrated skills, not communication style preferences
7. **Include development plan** -- every gap should have a mitigation strategy
8. **Cross-reference interviewer calibration** -- some interviewers consistently rate higher or lower
9. **Maintain confidentiality** -- restrict assessment access to hiring team members only
10. **Document objectively** -- use behavioral evidence rather than subjective impressions

## Troubleshooting

| Issue | Cause | Resolution |
|-------|-------|------------|
| No feedback records found | Custom table name differs | Check actual table name for interview feedback in your instance |
| Skills not parsing from description | Unstructured job description format | Use NL-Search to extract keywords, or request structured input |
| Scores inconsistent across interviewers | No calibration standard | Implement scoring rubric and calibration sessions |
| Candidate profile incomplete | Resume not imported or parsed | Use `hrsd/resume-skill-extraction` skill to populate profile |
| Comparison not meaningful | Different interview panels | Normalize scores based on interviewer calibration data |
| Assessment not saving | Table permissions restricted | Verify write access to candidate and assessment tables |

## Examples

### Example 1: Single Candidate Technical Assessment

**Input:** "Assess interview feedback for candidate Alex Chen against the Senior ServiceNow Developer requisition REQ0001234"

**Steps:** Retrieve requisition requirements, fetch all interview feedback for the candidate, extract skills from notes, build scoring matrix, identify gaps, generate recommendation with evidence.

### Example 2: Panel Consensus Report

**Input:** "Generate a consensus report for all interviewers who assessed candidate ID CAND0005678"

**Steps:** Retrieve all feedback records for the candidate, aggregate scores across interviewers, identify areas of agreement and disagreement, flag any split decisions, generate a unified panel recommendation.

### Example 3: Multi-Candidate Ranking

**Input:** "Compare the top 3 candidates for requisition REQ0001234 and rank them"

**Steps:** Retrieve all candidates with "hire" or "strong hire" recommendations, build comparison matrix across all scoring dimensions, calculate weighted overall scores, generate ranked list with differentiation analysis.

## Related Skills

- `hrsd/resume-skill-extraction` - Extract skills from resumes and CVs
- `hrsd/sentiment-analysis` - Analyze tone and sentiment in feedback
- `hrsd/case-summarization` - General HR case summarization
- `hrsd/persona-assistant` - Persona-based HR assistance
- `knowledge/gap-analysis` - Knowledge gap identification patterns
