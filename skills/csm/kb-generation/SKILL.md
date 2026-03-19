---
name: kb-generation
version: 1.0.0
description: Generate knowledge articles from resolved CSM cases with customer-facing language, structured content, screenshot placeholders, and FAQ sections
author: Happy Technologies LLC
tags: [csm, knowledge, kb-generation, case-resolution, customer-facing, faq, documentation]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp:
    - SN-NL-Search
    - SN-Query-Table
    - SN-Read-Record
    - SN-Create-Record
    - SN-Update-Record
    - SN-Execute-Background-Script
  rest:
    - /api/now/table/sn_customerservice_case
    - /api/now/table/interaction
    - /api/now/table/csm_consumer
    - /api/now/table/kb_knowledge
    - /api/now/table/kb_knowledge_base
    - /api/now/table/kb_category
    - /api/now/table/sys_journal_field
    - /api/now/table/kb_feedback
  native:
    - Bash
complexity: intermediate
estimated_time: 15-30 minutes
---

# Knowledge Article Generation from CSM Cases

## Overview

This skill generates polished knowledge base articles from resolved customer service cases. It transforms internal case resolution data into customer-facing documentation that can deflect future cases and empower self-service. It covers:

- Extracting resolution steps, root cause, and workarounds from resolved CSM cases
- Structuring articles with customer-friendly language, removing internal jargon
- Inserting screenshot placeholders with descriptive alt text for visual guidance
- Generating FAQ sections based on common follow-up questions from similar cases
- Categorizing and tagging articles for optimal searchability
- Publishing articles through the knowledge workflow for review and approval

**When to use:** After resolving a CSM case that addresses a common or recurring issue, when knowledge gaps are identified during case handling, or during periodic knowledge harvesting from closed case data.

**Value proposition:** Converts tribal knowledge locked in case resolutions into reusable self-service content. Reduces case volume by enabling customers to find answers independently and ensures consistent resolution guidance across the support team.

## Prerequisites

- **Plugins:** Customer Service Management (`com.sn_customerservice`), Knowledge Management (`com.glideapp.knowledge`)
- **Roles:** `knowledge_admin`, `knowledge_manager`, or `knowledge` (for article creation); `sn_customerservice_agent` (for case access)
- **Access:** Read access to `sn_customerservice_case`, `interaction`, `csm_consumer`, `sys_journal_field`; read/write access to `kb_knowledge`, `kb_knowledge_base`, `kb_category`
- **Knowledge:** Understanding of your organization's knowledge base structure, article templates, and publishing workflows

## Procedure

### Step 1: Identify Candidate Cases for KB Generation

Query resolved cases that are good candidates for knowledge articles based on frequency, category, and resolution quality.

**Using MCP (Claude Code/Desktop):**
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_customerservice_case
  query: state=3^resolution_codeISNOTEMPTY^closed_atONLast 30 days@javascript:gs.beginningOfLast30Days()@javascript:gs.endOfLast30Days()^ORDERBYDESCclosed_at
  fields: sys_id,number,short_description,category,subcategory,resolution_code,resolved_by,product,close_notes,opened_at,closed_at
  limit: 20
```

**Using REST API:**
```bash
GET /api/now/table/sn_customerservice_case?sysparm_query=state=3^resolution_codeISNOTEMPTY^closed_atONLast 30 days@javascript:gs.beginningOfLast30Days()@javascript:gs.endOfLast30Days()^ORDERBYDESCclosed_at&sysparm_fields=sys_id,number,short_description,category,subcategory,resolution_code,resolved_by,product,close_notes,opened_at,closed_at&sysparm_limit=20&sysparm_display_value=true
```

### Step 2: Extract Full Resolution Details from the Case

Retrieve the complete case record including close notes, work notes, and resolution information.

**Using MCP:**
```
Tool: SN-Read-Record
Parameters:
  table_name: sn_customerservice_case
  sys_id: [case_sys_id]
  fields: sys_id,number,short_description,description,state,category,subcategory,resolution_code,close_notes,cause,product,contact_type,opened_at,closed_at,resolved_by
```

Then retrieve work notes for step-by-step resolution context:
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_journal_field
  query: element_id=[case_sys_id]^elementINwork_notes,comments^ORDERBYsys_created_on
  fields: sys_id,element,value,sys_created_on,sys_created_by
  limit: 30
```

**Using REST API:**
```bash
GET /api/now/table/sn_customerservice_case/{case_sys_id}?sysparm_fields=sys_id,number,short_description,description,state,category,subcategory,resolution_code,close_notes,cause,product,contact_type,opened_at,closed_at,resolved_by&sysparm_display_value=true

GET /api/now/table/sys_journal_field?sysparm_query=element_id=[case_sys_id]^elementINwork_notes,comments^ORDERBYsys_created_on&sysparm_fields=sys_id,element,value,sys_created_on,sys_created_by&sysparm_limit=30
```

### Step 3: Find Similar Resolved Cases for FAQ Generation

Query related cases to identify common follow-up questions and alternative resolutions.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_customerservice_case
  query: category=[case_category]^subcategory=[case_subcategory]^state=3^sys_id!=[case_sys_id]^ORDERBYDESCclosed_at
  fields: sys_id,number,short_description,close_notes,resolution_code,description
  limit: 10
```

**Using REST API:**
```bash
GET /api/now/table/sn_customerservice_case?sysparm_query=category=[case_category]^subcategory=[case_subcategory]^state=3^sys_id!=[case_sys_id]^ORDERBYDESCclosed_at&sysparm_fields=sys_id,number,short_description,close_notes,resolution_code,description&sysparm_limit=10&sysparm_display_value=true
```

### Step 4: Check for Existing Knowledge Articles

Search for duplicate or related articles to avoid redundancy.

**Using MCP:**
```
Tool: SN-NL-Search
Parameters:
  query: [case_short_description]
  table: kb_knowledge
  limit: 5
```

**Using REST API:**
```bash
GET /api/now/table/kb_knowledge?sysparm_query=short_descriptionLIKE[key_terms]^workflow_stateINpublished,draft&sysparm_fields=sys_id,number,short_description,workflow_state,sys_view_count,kb_knowledge_base&sysparm_limit=5&sysparm_display_value=true
```

### Step 5: Identify the Target Knowledge Base and Category

Determine where the article should be published.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: kb_knowledge_base
  query: active=true
  fields: sys_id,title,description,owner,kb_version
  limit: 10
```

```
Tool: SN-Query-Table
Parameters:
  table_name: kb_category
  query: kb_knowledge_base=[kb_sys_id]^active=true
  fields: sys_id,label,parent_id,full_category
  limit: 20
```

**Using REST API:**
```bash
GET /api/now/table/kb_knowledge_base?sysparm_query=active=true&sysparm_fields=sys_id,title,description,owner&sysparm_limit=10&sysparm_display_value=true

GET /api/now/table/kb_category?sysparm_query=kb_knowledge_base=[kb_sys_id]^active=true&sysparm_fields=sys_id,label,parent_id,full_category&sysparm_limit=20&sysparm_display_value=true
```

### Step 6: Generate and Create the Knowledge Article

Compose the article with customer-facing language and create it in ServiceNow.

**Using MCP:**
```
Tool: SN-Create-Record
Parameters:
  table_name: kb_knowledge
  fields:
    short_description: "How to Resolve Online Return Processing Errors"
    kb_knowledge_base: [kb_sys_id]
    kb_category: [category_sys_id]
    text: |
      <h2>Problem</h2>
      <p>When attempting to process a return through the online portal, you may encounter an error message stating "Unable to process return" or the page may time out during submission.</p>

      <h2>Cause</h2>
      <p>This issue occurs when the browser session expires during the return process, typically after being idle for more than 15 minutes on the return form.</p>

      <h2>Resolution</h2>
      <ol>
        <li>Clear your browser cache and cookies for the portal domain</li>
        <li>Log out and log back in to establish a fresh session</li>
        <li>Navigate to <strong>My Orders > Returns</strong></li>
        <!-- [SCREENSHOT: Navigation to Returns page showing My Orders menu] -->
        <li>Select the order containing the item(s) to return</li>
        <li>Click <strong>Start Return</strong> and complete the form within 10 minutes</li>
        <!-- [SCREENSHOT: Start Return button highlighted on the order detail page] -->
        <li>Submit the return request and note the confirmation number</li>
        <!-- [SCREENSHOT: Return confirmation page with confirmation number] -->
      </ol>

      <h2>If the Issue Persists</h2>
      <p>If you continue to experience errors after following the steps above:</p>
      <ul>
        <li>Try using a different browser (Chrome, Firefox, or Edge recommended)</li>
        <li>Disable browser extensions that may interfere with the portal</li>
        <li>Contact support with your order number and the error message</li>
      </ul>

      <h2>Frequently Asked Questions</h2>
      <p><strong>Q: Will I lose my return information if the page times out?</strong></p>
      <p>A: Yes, you will need to re-enter the return details. The system does not save partial return submissions.</p>

      <p><strong>Q: Can I process returns through the mobile app instead?</strong></p>
      <p>A: Yes, the mobile app maintains a longer session and is recommended for complex returns with multiple items.</p>

      <p><strong>Q: How long does the return take to process after submission?</strong></p>
      <p>A: Returns are typically processed within 3-5 business days. You will receive an email confirmation when the return is approved.</p>
    workflow_state: draft
    article_type: text
    valid_to: "2027-03-19"
    source: case_resolution
```

**Using REST API:**
```bash
POST /api/now/table/kb_knowledge
Content-Type: application/json

{
  "short_description": "How to Resolve Online Return Processing Errors",
  "kb_knowledge_base": "[kb_sys_id]",
  "kb_category": "[category_sys_id]",
  "text": "<h2>Problem</h2><p>When attempting to process a return...</p>",
  "workflow_state": "draft",
  "article_type": "text",
  "source": "case_resolution"
}
```

### Step 7: Link the Article to the Source Case

Associate the new article with the originating case for traceability.

**Using MCP:**
```
Tool: SN-Create-Record
Parameters:
  table_name: m2m_kb_task
  fields:
    kb_knowledge: [article_sys_id]
    task: [case_sys_id]
```

**Using REST API:**
```bash
POST /api/now/table/m2m_kb_task
Content-Type: application/json

{
  "kb_knowledge": "[article_sys_id]",
  "task": "[case_sys_id]"
}
```

## Tool Usage

### MCP Tools Reference

| Tool | When to Use |
|------|-------------|
| `SN-NL-Search` | Find existing KB articles semantically matching the case topic |
| `SN-Query-Table` | Query resolved cases, work notes, KB bases, and categories |
| `SN-Read-Record` | Retrieve full case details by sys_id |
| `SN-Create-Record` | Create the KB article and case-article association |
| `SN-Update-Record` | Update article content or workflow state |
| `SN-Execute-Background-Script` | Batch-generate articles from multiple resolved cases |

### REST API Reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/now/table/sn_customerservice_case` | GET | Query resolved cases for article candidates |
| `/api/now/table/sys_journal_field` | GET | Retrieve work notes with resolution steps |
| `/api/now/table/kb_knowledge` | GET/POST/PATCH | Search, create, and update knowledge articles |
| `/api/now/table/kb_knowledge_base` | GET | List available knowledge bases |
| `/api/now/table/kb_category` | GET | Browse knowledge categories |
| `/api/now/table/kb_feedback` | GET | Check article feedback for improvement |

## Best Practices

- **Use customer-facing language:** Replace internal jargon, case references, and technical shorthand with clear language the customer can follow
- **Structure consistently:** Use Problem > Cause > Resolution > FAQ format for all generated articles
- **Include screenshot placeholders:** Mark visual guidance locations with `<!-- [SCREENSHOT: description] -->` for content teams to fill in
- **Generate FAQs from case patterns:** Analyze similar resolved cases to build FAQ sections that address common follow-up questions
- **Set expiration dates:** Add `valid_to` dates to trigger periodic review and ensure article accuracy
- **Avoid exposing internal details:** Never include agent names, internal escalation paths, or system architecture details in customer-facing articles
- **Tag with products and versions:** Use metadata fields to associate articles with specific products and versions for targeted search results
- **Submit as draft:** Always create articles in draft state for review before publishing to maintain quality standards

## Troubleshooting

### "Article content is too technical"

**Cause:** Work notes often contain technical shorthand intended for internal teams.
**Solution:** Post-process the generated text to replace technical terms. Use a glossary mapping (e.g., "GlideRecord" -> "database query", "BR" -> "automated rule") before composing the article.

### "Duplicate article detected"

**Cause:** A knowledge article covering the same topic already exists.
**Solution:** Compare the existing article with the new resolution. If the new case provides additional context, update the existing article rather than creating a duplicate.

### "No close notes available"

**Cause:** The resolving agent did not populate close notes on the case.
**Solution:** Fall back to work notes to reconstruct the resolution steps. Filter work notes for resolution-related content by looking for keywords like "resolved", "fixed", "solution", "workaround".

### "FAQ section is empty"

**Cause:** No similar cases found to extract common questions from.
**Solution:** Generate generic FAQs based on the article category (e.g., "How long does this take?", "What if this doesn't work?", "Who do I contact for help?").

## Examples

### Example 1: Generate Article from a Single Resolved Case

**Scenario:** Case CS0045678 resolved a recurring login issue.

```
Tool: SN-Read-Record
Parameters:
  table_name: sn_customerservice_case
  sys_id: [case_sys_id]
  fields: number,short_description,description,close_notes,resolution_code,category,product
```

**Generated article structure:**
- Title: "How to Fix Login Failures After Password Reset"
- Problem: Description of the login error symptoms
- Cause: Password policy sync delay between identity provider and portal
- Resolution: Step-by-step fix with screenshot placeholders
- FAQ: 3 questions from 8 similar resolved cases

### Example 2: Batch Generate Articles from Case Category

**Scenario:** Generate articles for all resolved cases in the "Billing" category from the last 30 days.

```
Tool: SN-Query-Table
Parameters:
  table_name: sn_customerservice_case
  query: category=billing^state=3^closed_atONLast 30 days@javascript:gs.beginningOfLast30Days()@javascript:gs.endOfLast30Days()^close_notesISNOTEMPTY
  fields: sys_id,number,short_description,close_notes,resolution_code
  limit: 50
```

Group cases by subcategory, then generate one consolidated article per subcategory covering the most common resolutions.

### Example 3: Enrich Existing Article with New Case Data

**Scenario:** An existing KB article needs updated resolution steps based on a newly resolved case.

```
Tool: SN-Query-Table
Parameters:
  table_name: kb_knowledge
  query: number=KB0045123
  fields: sys_id,short_description,text,workflow_state
  limit: 1
```

```
Tool: SN-Update-Record
Parameters:
  table_name: kb_knowledge
  sys_id: [article_sys_id]
  fields:
    text: [updated_html_content_with_new_resolution_steps]
    workflow_state: draft
```

## Related Skills

- `csm/case-summarization` - Summarize cases for context before KB generation
- `csm/resolution-notes` - Generate structured resolution notes on case closure
- `csm/suggested-steps` - Generate resolution steps that can seed KB content
- `knowledge/content-recommendation` - Recommend existing articles to avoid duplication
- `knowledge/article-optimization` - Optimize article searchability and quality
