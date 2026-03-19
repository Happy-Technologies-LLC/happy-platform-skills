---
name: smart-assessment
version: 1.0.0
description: Configure smart assessments with AI-assisted response suggestions, covering assessment design, metric types, scoring models, conditional logic, result analysis, and integration with GRC and HR modules
author: Happy Technologies LLC
tags: [admin, assessment, survey, scoring, metrics, ai-assisted, grc, hr, risk, compliance]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp:
    - SN-Query-Table
    - SN-Create-Record
    - SN-Update-Record
    - SN-Read-Record
    - SN-Execute-Background-Script
    - SN-Discover-Table-Schema
  rest:
    - /api/now/table/asmt_metric
    - /api/now/table/asmt_assessment
    - /api/now/table/asmt_metric_result
    - /api/now/table/asmt_metric_type
    - /api/now/table/asmt_metric_category
    - /api/now/table/asmt_assessment_instance
    - /api/now/table/asmt_assessment_instance_question
  native:
    - Bash
complexity: intermediate
estimated_time: 20-40 minutes
---

# Smart Assessment Configuration

## Overview

This skill covers configuring ServiceNow Assessments with smart, AI-assisted capabilities. It covers:

- Designing assessment questionnaires with multiple metric types (scale, boolean, choice, text)
- Configuring scoring models and weight distribution across categories
- Building conditional logic to show/hide questions based on previous responses
- Setting up AI-assisted response suggestions that pre-populate answers from historical data
- Analyzing assessment results with aggregate scoring and benchmarking
- Integrating assessments with GRC risk profiles, HR talent reviews, and vendor evaluations

**When to use:**
- Creating risk assessments for GRC compliance evaluations
- Building vendor assessment questionnaires for TPRM programs
- Designing employee engagement or satisfaction surveys
- Configuring security self-assessments for departmental compliance checks
- Setting up maturity model assessments for capability evaluations

## Prerequisites

- **Roles:** `assessment_admin`, `assessment_creator`, or `admin`
- **Plugins:** `com.snc.assessment` (Assessment Designer), optionally `com.sn_grc` for GRC integration
- **Access:** Read/write access to asmt_metric, asmt_assessment, asmt_metric_result tables
- **Knowledge:** Understanding of assessment design principles, scoring methodologies, and the business domain being assessed

## Key Assessment Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `asmt_metric` | Assessment questions/metrics | name, metric_type, category, order, weight, mandatory, condition, description, scale_definition |
| `asmt_assessment` | Assessment definitions | name, description, state, due_date, assessment_type, scoring_type, source_table, category |
| `asmt_metric_result` | Individual responses/results | metric, assessment_instance, value, string_value, actual_value, scored_value, notes |
| `asmt_metric_type` | Metric type definitions | name, data_type, scale, choices, validation |
| `asmt_metric_category` | Question categories/sections | name, assessment, order, weight, description |
| `asmt_assessment_instance` | Assessment instances (assigned) | assessment, user, state, due_date, score, percent_answered, taken_on |
| `asmt_assessment_instance_question` | Per-question instance data | instance, metric, response, score, skipped |

## Procedure

### Step 1: Design the Assessment Structure

Plan the assessment with categories, metrics, and scoring before creation.

**Assessment design framework:**

| Component | Design Decision | Options |
|-----------|----------------|---------|
| Assessment Type | What is being assessed? | Risk, Compliance, Satisfaction, Maturity, Vendor |
| Scoring Type | How are results calculated? | Weighted average, Sum, Maximum, Custom formula |
| Scale | What response format? | 1-5 Likert, 1-10 numeric, Yes/No, Multiple choice |
| Categories | How are questions grouped? | By domain, by control family, by topic area |
| Weighting | How important is each section? | Equal weight, risk-based, custom percentages |

### Step 2: Create the Assessment Definition

**Using MCP (Claude Code/Desktop):**
```
Tool: SN-Create-Record
Parameters:
  table_name: asmt_assessment
  fields:
    name: "Vendor Security Assessment 2026"
    description: "Annual security posture assessment for critical and high-tier vendors. Covers access control, data protection, incident response, and business continuity."
    state: draft
    assessment_type: vendor
    scoring_type: weighted_average
    source_table: core_company
    anonymous: false
    allow_retake: false
    introduction: "This assessment evaluates your organization's security controls and practices. Please answer all questions accurately based on your current capabilities."
    due_date: 2026-06-30
```

**Using REST API:**
```bash
POST /api/now/table/asmt_assessment
Content-Type: application/json

{
  "name": "Vendor Security Assessment 2026",
  "description": "Annual security posture assessment for critical and high-tier vendors.",
  "state": "draft",
  "assessment_type": "vendor",
  "scoring_type": "weighted_average",
  "source_table": "core_company",
  "due_date": "2026-06-30"
}
```

### Step 3: Create Assessment Categories

Group questions into logical sections with weighting.

**Using MCP:**
```
Tool: SN-Create-Record
Parameters:
  table_name: asmt_metric_category
  fields:
    name: "Access Control"
    assessment: [assessment_sys_id]
    order: 100
    weight: 25
    description: "Evaluate identity management, authentication, authorization, and access review practices"
```

**Create additional categories:**
```
Tool: SN-Create-Record
Parameters:
  table_name: asmt_metric_category
  fields:
    name: "Data Protection"
    assessment: [assessment_sys_id]
    order: 200
    weight: 30
    description: "Assess data classification, encryption, backup, and data handling procedures"
```

```
Tool: SN-Create-Record
Parameters:
  table_name: asmt_metric_category
  fields:
    name: "Incident Response"
    assessment: [assessment_sys_id]
    order: 300
    weight: 25
    description: "Review incident detection, response procedures, notification timelines, and recovery capabilities"
```

```
Tool: SN-Create-Record
Parameters:
  table_name: asmt_metric_category
  fields:
    name: "Business Continuity"
    assessment: [assessment_sys_id]
    order: 400
    weight: 20
    description: "Evaluate disaster recovery, redundancy, and operational resilience"
```

### Step 4: Create Assessment Metrics (Questions)

Build individual questions with appropriate metric types.

**Scale metric (1-5 Likert):**
```
Tool: SN-Create-Record
Parameters:
  table_name: asmt_metric
  fields:
    name: "Multi-factor authentication is enforced for all privileged access"
    metric_type: scale
    category: [access_control_category_sys_id]
    order: 110
    weight: 15
    mandatory: true
    scale_definition: "1=Not Implemented,2=Partially Implemented,3=Implemented but Not Enforced,4=Implemented and Enforced,5=Implemented, Enforced, and Audited"
    description: "Rate the maturity of MFA implementation for privileged accounts including admin, root, and service accounts."
    ai_suggestion_enabled: true
```

**Boolean metric (Yes/No):**
```
Tool: SN-Create-Record
Parameters:
  table_name: asmt_metric
  fields:
    name: "Does your organization maintain a documented incident response plan?"
    metric_type: boolean
    category: [incident_response_category_sys_id]
    order: 310
    weight: 10
    mandatory: true
    description: "A documented IRP should include roles, communication procedures, and escalation paths."
```

**Choice metric (Multiple choice):**
```
Tool: SN-Create-Record
Parameters:
  table_name: asmt_metric
  fields:
    name: "What is your data encryption standard for data at rest?"
    metric_type: choice
    category: [data_protection_category_sys_id]
    order: 210
    weight: 12
    mandatory: true
    choices: "AES-256,AES-128,DES/3DES,No encryption,Other"
    scored_choices: "AES-256=5,AES-128=4,DES/3DES=2,No encryption=0,Other=1"
```

**Text metric (Open-ended):**
```
Tool: SN-Create-Record
Parameters:
  table_name: asmt_metric
  fields:
    name: "Describe your data breach notification process and timeline"
    metric_type: text
    category: [incident_response_category_sys_id]
    order: 320
    weight: 0
    mandatory: false
    description: "Include notification timeline, regulatory requirements, and communication channels."
    max_length: 2000
```

### Step 5: Configure Conditional Logic

Show or hide questions based on previous responses.

**Using MCP:**
```
Tool: SN-Update-Record
Parameters:
  table_name: asmt_metric
  sys_id: [follow_up_question_sys_id]
  data:
    condition: "javascript: current.metric == '[parent_metric_sys_id]' && current.value < 3"
    condition_description: "Show only if MFA maturity is rated below 3 (Implemented)"
```

### Step 6: Enable AI-Assisted Response Suggestions

Configure smart suggestions that pre-populate answers based on historical data.

**Using MCP:**
```
Tool: SN-Execute-Background-Script
Parameters:
  script: |
    // Enable AI suggestions for assessment metrics
    var assessmentSysId = '[assessment_sys_id]';

    var metric = new GlideRecord('asmt_metric');
    metric.addQuery('category.assessment', assessmentSysId);
    metric.addQuery('metric_type', 'IN', 'scale,choice,boolean');
    metric.query();

    var updated = 0;
    while (metric.next()) {
      // Check for historical responses to generate suggestions
      var history = new GlideAggregate('asmt_metric_result');
      history.addQuery('metric', metric.sys_id.toString());
      history.addAggregate('COUNT');
      history.addAggregate('AVG', 'actual_value');
      history.query();

      if (history.next()) {
        var responseCount = parseInt(history.getAggregate('COUNT'));
        var avgValue = parseFloat(history.getAggregate('AVG', 'actual_value')) || 0;

        if (responseCount >= 5) {
          metric.ai_suggestion_enabled = true;
          metric.ai_suggestion_confidence = Math.min(responseCount / 50, 1.0);
          metric.ai_suggested_value = Math.round(avgValue);
          metric.update();
          updated++;
        }
      }
    }

    gs.info('AI suggestions enabled for ' + updated + ' metrics based on historical response data.');
  description: "Assessment: Enable AI response suggestions from historical data"
```

### Step 7: Analyze Assessment Results

Generate scoring summaries and benchmarking data.

**Using MCP:**
```
Tool: SN-Execute-Background-Script
Parameters:
  script: |
    var assessmentName = 'Vendor Security Assessment 2026';
    var analysis = {
      assessment: assessmentName,
      generated_date: new GlideDateTime().toString(),
      summary: { total_instances: 0, completed: 0, in_progress: 0, not_started: 0, avg_score: 0 },
      by_category: {},
      score_distribution: { excellent: 0, good: 0, fair: 0, poor: 0 },
      lowest_scoring_metrics: [],
      highest_scoring_metrics: []
    };

    // Get assessment
    var asmt = new GlideRecord('asmt_assessment');
    asmt.addQuery('name', assessmentName);
    asmt.query();
    if (!asmt.next()) { gs.info('Assessment not found'); return; }

    // Instance statistics
    var inst = new GlideRecord('asmt_assessment_instance');
    inst.addQuery('assessment', asmt.sys_id.toString());
    inst.query();
    var scores = [];
    while (inst.next()) {
      analysis.summary.total_instances++;
      var state = inst.state.toString();
      if (state == 'complete') { analysis.summary.completed++; scores.push(parseFloat(inst.score.toString()) || 0); }
      else if (state == 'wip') analysis.summary.in_progress++;
      else analysis.summary.not_started++;
    }

    if (scores.length > 0) {
      var total = 0;
      for (var i = 0; i < scores.length; i++) {
        total += scores[i];
        if (scores[i] >= 80) analysis.score_distribution.excellent++;
        else if (scores[i] >= 60) analysis.score_distribution.good++;
        else if (scores[i] >= 40) analysis.score_distribution.fair++;
        else analysis.score_distribution.poor++;
      }
      analysis.summary.avg_score = Math.round(total / scores.length);
    }

    // Category scores
    var cat = new GlideRecord('asmt_metric_category');
    cat.addQuery('assessment', asmt.sys_id.toString());
    cat.query();
    while (cat.next()) {
      var catResults = new GlideAggregate('asmt_metric_result');
      catResults.addQuery('metric.category', cat.sys_id.toString());
      catResults.addAggregate('AVG', 'actual_value');
      catResults.query();
      if (catResults.next()) {
        analysis.by_category[cat.name.toString()] = {
          avg_score: Math.round(parseFloat(catResults.getAggregate('AVG', 'actual_value')) || 0),
          weight: cat.weight.toString() + '%'
        };
      }
    }

    gs.info('ASSESSMENT ANALYSIS:\n' + JSON.stringify(analysis, null, 2));
  description: "Assessment: Analyze results with scoring and benchmarking"
```

## Tool Usage

| Operation | MCP Tool | REST Endpoint |
|-----------|----------|---------------|
| Create Assessment | SN-Create-Record | POST /api/now/table/asmt_assessment |
| Create Categories | SN-Create-Record | POST /api/now/table/asmt_metric_category |
| Create Metrics | SN-Create-Record | POST /api/now/table/asmt_metric |
| Query Results | SN-Query-Table | GET /api/now/table/asmt_metric_result |
| Query Instances | SN-Query-Table | GET /api/now/table/asmt_assessment_instance |
| Update Metrics | SN-Update-Record | PATCH /api/now/table/asmt_metric |
| Result Analysis | SN-Execute-Background-Script | POST /api/now/table/sys_trigger |
| Schema Discovery | SN-Discover-Table-Schema | GET /api/now/table/sys_dictionary |

## Best Practices

- **Question Clarity:** Write questions that are unambiguous and can be answered consistently by different respondents
- **Balanced Scoring:** Calibrate scale definitions so that the middle score represents a reasonable baseline, not perfection
- **Mandatory vs. Optional:** Make core compliance questions mandatory; keep supplemental context questions optional
- **Category Weighting:** Align category weights to organizational risk priorities; update annually based on risk appetite changes
- **AI Suggestion Threshold:** Only enable AI suggestions when at least 5 historical responses exist for reliable averages
- **Conditional Efficiency:** Use conditional logic to reduce assessment length; only show follow-up questions when relevant
- **Pilot Testing:** Test assessments with a small group before broad deployment to identify confusing questions
- **Anonymity Considerations:** Employee engagement surveys should be anonymous; vendor assessments should not be
- **Version Management:** Create new assessment versions rather than modifying active ones mid-cycle

## Troubleshooting

### Assessment Score Not Calculating

**Symptom:** Completed assessment instances show a score of 0 or null
**Cause:** Metric weights may not sum correctly, or the scoring type is misconfigured
**Solution:** Verify that category weights sum to 100%. Check that individual metric weights within each category are set. Ensure `scoring_type` on the assessment is not set to "none".

### Conditional Questions Always Hidden

**Symptom:** Follow-up questions never appear regardless of parent response
**Cause:** Condition script references the wrong metric sys_id or uses incorrect value comparison
**Solution:** Verify the `condition` field uses the correct parent metric sys_id. Test with explicit values first, then add dynamic logic.

### AI Suggestions Show Outdated Data

**Symptom:** Suggested responses reflect old assessment cycles rather than current standards
**Cause:** AI suggestions are pulling from all historical results including outdated assessments
**Solution:** Filter historical data by date range or assessment version when calculating suggestions. Update `ai_suggested_value` when standards change.

### Metric Results Not Linking to GRC

**Symptom:** Assessment results do not appear in GRC risk or compliance modules
**Cause:** Assessment `source_table` may not match the GRC profile table, or the integration mapping is missing
**Solution:** Verify the assessment's `source_table` is set to the GRC profile table (e.g., `sn_grc_profile`). Check for integration business rules between assessment and GRC modules.

## Examples

### Example 1: NIST CSF Maturity Assessment

**Scenario:** Create a cybersecurity maturity assessment aligned to NIST Cybersecurity Framework

**Categories (weighted):**
- Identify (20%) - Asset management, risk assessment, governance
- Protect (25%) - Access control, awareness, data security
- Detect (20%) - Anomalies, monitoring, detection processes
- Respond (20%) - Response planning, communications, analysis
- Recover (15%) - Recovery planning, improvements, communications

**Scale:** 1=Initial, 2=Managed, 3=Defined, 4=Quantitatively Managed, 5=Optimizing

### Example 2: Employee Engagement Survey

**Scenario:** Quarterly pulse survey with AI-suggested benchmarks

```
Tool: SN-Create-Record
Parameters:
  table_name: asmt_assessment
  fields:
    name: "Q1 2026 Employee Engagement Pulse"
    assessment_type: survey
    scoring_type: weighted_average
    source_table: sys_user
    anonymous: true
    allow_retake: false
    due_date: 2026-03-31
```

**Result Analysis:** Average score 3.8/5.0. Lowest category: Work-Life Balance (3.2). Highest: Team Collaboration (4.3). AI suggests targeting work-life balance initiatives based on declining trend.

## Related Skills

- `grc/risk-assessment-summarization` - Analyze risk assessment results
- `grc/tprm-issue-summarization` - TPRM assessments and vendor evaluations
- `hrsd/sentiment-analysis` - Complement assessments with sentiment data
- `admin/workflow-creation` - Automate assessment distribution and follow-up
- `reporting/executive-dashboard` - Build assessment result dashboards
