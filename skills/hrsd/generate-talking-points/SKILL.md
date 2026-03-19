---
name: generate-talking-points
version: 1.0.0
description: Generate manager talking points for employee reviews, 1:1 meetings, and performance discussions based on talent profiles, goals, feedback, and performance metrics
author: Happy Technologies LLC
tags: [hrsd, talent, performance, talking-points, review, goals, feedback, manager, one-on-one]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp:
    - SN-Query-Table
    - SN-Natural-Language-Search
    - SN-Execute-Background-Script
    - SN-Discover-Table-Schema
    - SN-Read-Record
  rest:
    - /api/now/table/sn_hr_talent_profile
    - /api/now/table/sn_hr_talent_goal
    - /api/now/table/sn_hr_talent_review
    - /api/now/table/sn_hr_core_case
    - /api/now/table/sn_hr_talent_feedback
    - /api/now/table/sys_user
  native:
    - Bash
complexity: intermediate
estimated_time: 15-30 minutes
---

# Generate Manager Talking Points

## Overview

This skill produces structured talking points for managers preparing for employee performance discussions. It covers:

- Pulling employee talent profiles with skills, competencies, and career aspirations
- Aggregating goal progress data including completion rates and milestone tracking
- Collecting peer feedback, self-assessments, and prior review ratings
- Synthesizing performance metrics into actionable discussion topics
- Generating conversation frameworks for reviews, 1:1s, and development planning sessions

**When to use:**
- Before annual or mid-year performance reviews
- Preparing for regular 1:1 meetings with direct reports
- When onboarding as a new manager and needing team context
- During talent calibration sessions requiring evidence-based discussion
- Before career development conversations or promotion discussions

## Prerequisites

- **Roles:** `sn_hr_talent.manager`, `sn_hr_core.manager`, `sn_hr_talent.admin`, or `admin`
- **Plugins:** `com.sn_hr_talent` (Talent Management), `com.sn_hr_core` (HR Core)
- **Access:** Read access to sn_hr_talent_profile, sn_hr_talent_goal, sn_hr_talent_review, sn_hr_talent_feedback tables
- **Knowledge:** Understanding of your organization's performance rating scale, competency framework, and review cycle cadence

## Key Talent Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `sn_hr_talent_profile` | Employee talent profiles | user, skills, competencies, career_interests, potential_rating, risk_of_loss, last_review_date |
| `sn_hr_talent_goal` | Employee goals and objectives | user, short_description, category, status, percent_complete, due_date, weight, metric_value |
| `sn_hr_talent_review` | Performance review records | user, review_cycle, overall_rating, reviewer, state, comments, review_date |
| `sn_hr_talent_feedback` | Peer and manager feedback | user, feedback_type, provider, content, rating, created_on |
| `sys_user` | Employee profile | name, title, department, manager, location, date_joined |

## Procedure

### Step 1: Retrieve Employee Talent Profile

Query the employee's talent profile for skills, competencies, and career data.

**Using MCP (Claude Code/Desktop):**
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_hr_talent_profile
  query: user=[employee_sys_id]
  fields: sys_id,user,skills,competencies,career_interests,potential_rating,risk_of_loss,strengths,development_areas,last_review_date,current_role_tenure
  limit: 1
```

**Using REST API:**
```bash
GET /api/now/table/sn_hr_talent_profile?sysparm_query=user=[employee_sys_id]&sysparm_fields=sys_id,user,skills,competencies,career_interests,potential_rating,risk_of_loss,strengths,development_areas,last_review_date&sysparm_limit=1&sysparm_display_value=true
```

### Step 2: Gather Goal Progress

Query the employee's current goals and completion status.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_hr_talent_goal
  query: user=[employee_sys_id]^active=true^ORDERBYDESCdue_date
  fields: sys_id,short_description,category,status,percent_complete,due_date,weight,metric_value,metric_target,comments,created_on
  limit: 20
```

**Using REST API:**
```bash
GET /api/now/table/sn_hr_talent_goal?sysparm_query=user=[employee_sys_id]^active=true^ORDERBYDESCdue_date&sysparm_fields=sys_id,short_description,category,status,percent_complete,due_date,weight,metric_value,metric_target,comments&sysparm_limit=20&sysparm_display_value=true
```

### Step 3: Collect Feedback and Reviews

Pull peer feedback and prior review ratings.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_hr_talent_feedback
  query: user=[employee_sys_id]^ORDERBYDESCsys_created_on
  fields: sys_id,feedback_type,provider,content,rating,sys_created_on
  limit: 20
```

**Using REST API:**
```bash
GET /api/now/table/sn_hr_talent_feedback?sysparm_query=user=[employee_sys_id]^ORDERBYDESCsys_created_on&sysparm_fields=sys_id,feedback_type,provider,content,rating,sys_created_on&sysparm_limit=20&sysparm_display_value=true
```

**Pull prior review history:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_hr_talent_review
  query: user=[employee_sys_id]^ORDERBYDESCreview_date
  fields: sys_id,review_cycle,overall_rating,reviewer,state,comments,review_date,strengths_noted,areas_for_improvement
  limit: 5
```

### Step 4: Generate Talking Points

**Build structured talking points from aggregated data:**
```
Tool: SN-Execute-Background-Script
Parameters:
  script: |
    var empSysId = '[employee_sys_id]'; // Replace with target employee
    var talkingPoints = {
      generated_date: new GlideDateTime().toString(),
      employee: {},
      goal_summary: { total: 0, on_track: 0, at_risk: 0, completed: 0, avg_completion: 0 },
      strengths: [],
      development_areas: [],
      feedback_themes: { positive: [], constructive: [] },
      review_history: [],
      discussion_topics: [],
      suggested_questions: []
    };

    // Employee info
    var user = new GlideRecord('sys_user');
    user.get(empSysId);
    talkingPoints.employee = {
      name: user.name.toString(),
      title: user.title.toString(),
      department: user.department.getDisplayValue(),
      manager: user.manager.getDisplayValue(),
      tenure: user.date_joined ? gs.dateDiff(user.date_joined.toString(), new GlideDateTime().toString(), true) + ' days' : 'Unknown'
    };

    // Goal progress
    var goals = new GlideRecord('sn_hr_talent_goal');
    goals.addQuery('user', empSysId);
    goals.addQuery('active', true);
    goals.query();
    var completionTotal = 0;
    while (goals.next()) {
      talkingPoints.goal_summary.total++;
      var pct = parseInt(goals.percent_complete.toString()) || 0;
      completionTotal += pct;
      if (pct >= 100) talkingPoints.goal_summary.completed++;
      else if (pct >= 50) talkingPoints.goal_summary.on_track++;
      else talkingPoints.goal_summary.at_risk++;
    }
    if (talkingPoints.goal_summary.total > 0) {
      talkingPoints.goal_summary.avg_completion = Math.round(completionTotal / talkingPoints.goal_summary.total);
    }

    // Talent profile
    var profile = new GlideRecord('sn_hr_talent_profile');
    profile.addQuery('user', empSysId);
    profile.query();
    if (profile.next()) {
      talkingPoints.strengths = profile.strengths.toString().split(',').map(function(s) { return s.trim(); }).filter(Boolean);
      talkingPoints.development_areas = profile.development_areas.toString().split(',').map(function(s) { return s.trim(); }).filter(Boolean);
    }

    // Feedback themes
    var fb = new GlideRecord('sn_hr_talent_feedback');
    fb.addQuery('user', empSysId);
    fb.addQuery('sys_created_on', '>=', gs.monthsAgo(6));
    fb.query();
    while (fb.next()) {
      var content = fb.content.toString().substring(0, 200);
      var rating = parseInt(fb.rating.toString()) || 3;
      if (rating >= 4) talkingPoints.feedback_themes.positive.push(content);
      else if (rating <= 2) talkingPoints.feedback_themes.constructive.push(content);
    }

    // Review history
    var review = new GlideRecord('sn_hr_talent_review');
    review.addQuery('user', empSysId);
    review.orderByDesc('review_date');
    review.setLimit(3);
    review.query();
    while (review.next()) {
      talkingPoints.review_history.push({
        cycle: review.review_cycle.getDisplayValue(),
        rating: review.overall_rating.getDisplayValue(),
        date: review.review_date.toString()
      });
    }

    // Generate discussion topics based on data
    if (talkingPoints.goal_summary.at_risk > 0)
      talkingPoints.discussion_topics.push('Address ' + talkingPoints.goal_summary.at_risk + ' at-risk goals and identify blockers');
    if (talkingPoints.goal_summary.completed > 0)
      talkingPoints.discussion_topics.push('Recognize completion of ' + talkingPoints.goal_summary.completed + ' goals');
    if (talkingPoints.development_areas.length > 0)
      talkingPoints.discussion_topics.push('Review progress on development areas: ' + talkingPoints.development_areas.join(', '));
    if (talkingPoints.feedback_themes.constructive.length > 0)
      talkingPoints.discussion_topics.push('Discuss constructive feedback themes (' + talkingPoints.feedback_themes.constructive.length + ' items)');

    // Suggested questions
    talkingPoints.suggested_questions = [
      'What accomplishments are you most proud of this period?',
      'What obstacles are slowing your progress on current goals?',
      'How can I better support your development in [development_area]?',
      'Where do you see yourself in the next 12-18 months?',
      'What skills would you like to develop next?'
    ];

    gs.info('MANAGER TALKING POINTS:\n' + JSON.stringify(talkingPoints, null, 2));
  description: "Talent: Generate manager talking points for performance discussion"
```

### Step 5: Search for Context by Theme

**Using Natural Language Search for additional context:**
```
Tool: SN-Natural-Language-Search
Parameters:
  table_name: sn_hr_talent_feedback
  query: "recent positive feedback about leadership and collaboration for [employee_name]"
  limit: 10
```

## Tool Usage

| Operation | MCP Tool | REST Endpoint |
|-----------|----------|---------------|
| Query Talent Profile | SN-Query-Table | GET /api/now/table/sn_hr_talent_profile |
| Query Goals | SN-Query-Table | GET /api/now/table/sn_hr_talent_goal |
| Query Feedback | SN-Query-Table | GET /api/now/table/sn_hr_talent_feedback |
| Query Reviews | SN-Query-Table | GET /api/now/table/sn_hr_talent_review |
| Search by Theme | SN-Natural-Language-Search | N/A |
| Generate Summary | SN-Execute-Background-Script | POST /api/now/table/sys_trigger |
| Schema Discovery | SN-Discover-Table-Schema | GET /api/now/table/sys_dictionary |

## Best Practices

- **Data Privacy:** Never share raw peer feedback verbatim with the employee; synthesize into themes to protect contributor confidentiality
- **Balanced View:** Always include both strengths and development areas to avoid recency bias or halo effect
- **Goal Alignment:** Frame goal discussions in context of team and organizational objectives
- **Evidence-Based:** Ground every talking point in specific data (goal metrics, feedback quotes, review ratings) rather than impressions
- **Forward-Looking:** Dedicate at least 40% of talking points to future development, not just backward-looking performance assessment
- **Calibration Context:** Before reviews, check how the employee's ratings compare to team and department averages
- **Cultural Sensitivity:** Adapt talking point tone and structure to organizational culture and individual communication preferences
- **Follow-Up Tracking:** Document agreed-upon action items from the discussion as new goals or tasks

## Troubleshooting

### Talent Profile Returns No Data

**Symptom:** Query returns no talent profile for a known employee
**Cause:** Talent profiles may not be auto-created; they require manager or HR action to initialize
**Solution:** Check if the employee has an HR profile in `sn_hr_core_profile` instead. Some organizations use a different profile table or the talent module may not be fully deployed.

### Goal Completion Percentages Are All Zero

**Symptom:** All goals show 0% completion even though progress has been made
**Cause:** Goal tracking may use milestone-based completion rather than percentage, or updates are tracked in a related task table
**Solution:** Check for a `sn_hr_talent_goal_task` or `sn_hr_talent_milestone` table that feeds completion. Query `sys_db_object` with `nameLIKEgoal` for related tables.

### Feedback Content Is Encrypted or Restricted

**Symptom:** Feedback content field returns empty or encoded values
**Cause:** HR feedback may be protected by field-level encryption or ACLs restricting manager access
**Solution:** Verify the querying user has `sn_hr_talent.manager` role. Check if encryption is applied via `sys_dictionary` encryption attribute on the content field.

## Examples

### Example 1: Annual Review Preparation

**Scenario:** Manager preparing for annual performance review

```
Tool: SN-Query-Table
Parameters:
  table_name: sn_hr_talent_goal
  query: user=[employee_sys_id]^active=true^due_dateONThis year@javascript:gs.beginningOfThisYear()@javascript:gs.endOfThisYear()
  fields: short_description,status,percent_complete,weight,metric_value,metric_target
  limit: 15
```

**Generated Talking Points:**
- **Opening:** "Thank you for your contributions this year. Let us review your progress and plan ahead."
- **Goal Progress:** 8 goals set, 5 completed (63%), 2 on track, 1 at risk (Q4 revenue target at 35%)
- **Strengths (from feedback):** Consistently recognized for cross-team collaboration and technical mentorship
- **Development Areas:** Presentation skills (noted in 3 feedback entries), delegation (self-identified)
- **Rating Context:** Last review: Exceeds Expectations. Current trajectory: Meets/Exceeds
- **Discussion Questions:** "The Q4 revenue goal is behind; what support do you need to close the gap?"
- **Development Plan:** Recommend public speaking workshop; consider stretch assignment leading next all-hands

### Example 2: Weekly 1:1 Quick Prep

**Scenario:** Manager needs a quick context refresh before a 30-minute 1:1

```
Tool: SN-Natural-Language-Search
Parameters:
  table_name: sn_hr_talent_feedback
  query: "recent feedback for [employee_name] in the last two weeks"
  limit: 5
```

**Generated Quick Notes:**
- **Goal Check-in:** API migration project at 70% (was 55% last week); on track for March deadline
- **Recent Feedback:** Positive note from QA lead about improved test coverage documentation
- **Open Item from Last 1:1:** Employee requested training budget for cloud certification
- **Suggested Opener:** "Great progress on the API migration. How is the new testing approach working out?"

## Related Skills

- `hrsd/case-summarization` - HR case context for performance discussions
- `hrsd/sentiment-analysis` - Employee sentiment analysis
- `hrsd/resume-skill-extraction` - Skills inventory for development planning
- `hrsd/persona-assistant` - HR persona-based assistance
- `admin/workflow-creation` - Automate review cycle workflows
