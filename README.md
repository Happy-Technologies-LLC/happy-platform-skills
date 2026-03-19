<p align="center">
  <img src="https://happy-tech.biz/images/logo.svg" alt="Happy ServiceNow AI Skills" width="120" height="120">
</p>

<h1 align="center">Happy ServiceNow AI Skills</h1>

<p align="center">
  <strong>Platform-agnostic AI skills library for ServiceNow</strong><br>
  Works with Claude Code, Claude Desktop, ChatGPT, Cursor, and any agentic AI system
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/happy-servicenow-skills"><img src="https://img.shields.io/npm/v/happy-servicenow-skills.svg?style=flat-square" alt="npm version"></a>
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square" alt="License: MIT"></a>
  <a href="https://skills.sh"><img src="https://img.shields.io/badge/skills.sh-compatible-blue.svg?style=flat-square" alt="skills.sh"></a>
  <a href="https://servicenow.com"><img src="https://img.shields.io/badge/ServiceNow-compatible-green.svg?style=flat-square" alt="ServiceNow"></a>
</p>

<p align="center">
  <a href="https://happy-tech.biz">Website</a> |
  <a href="https://github.com/Happy-Technologies-LLC/happy-servicenow-skills">GitHub</a> |
  <a href="https://www.npmjs.com/package/happy-servicenow-skills">npm</a> |
  <a href="#-available-skills">Skills</a> |
  <a href="#-creating-custom-skills">Contributing</a>
</p>

---

## What Are AI Skills?

**Skills are packaged instructions that teach AI agents how to perform specific tasks.** Unlike MCP tools (which provide *capabilities*), skills provide *knowledge* - the procedures, best practices, and decision logic that make AI agents effective.

```
MCP = The kitchen and ingredients
Skills = The recipes
```

## Quick Start

### Installation

```bash
# npm
npm install happy-servicenow-skills

# skills.sh
npx skills add Happy-Technologies-LLC/happy-servicenow-skills --all
```

### Usage with Claude Code

```bash
# List available skills
npx sn-skills list

# Search for skills
npx sn-skills search "incident"

# Load a skill into your session
npx sn-skills load itsm/incident-triage
```

### Programmatic Usage

```javascript
import { SkillLoader, SkillRegistry } from 'happy-servicenow-skills';

// Load all skills
const registry = new SkillRegistry();
await registry.discover();

// Find skills by tag
const itsmSkills = registry.findByTag('itsm');

// Load a specific skill
const skill = await SkillLoader.load('itsm/incident-triage');
console.log(skill.instructions);
```

---

## Available Skills

### ITSM - IT Service Management (16 skills)

| Skill | Description |
|-------|-------------|
| `itsm/incident-triage` | Automated incident classification and prioritization |
| `itsm/incident-lifecycle` | End-to-end incident management workflow |
| `itsm/incident-summarization` | Comprehensive incident summaries with timeline and impact |
| `itsm/incident-sentiment` | Incident sentiment analysis and escalation risk detection |
| `itsm/major-incident` | P1/Major incident coordination |
| `itsm/major-incident-email` | Major incident email communications |
| `itsm/problem-analysis` | Root cause analysis and known error management |
| `itsm/change-management` | RFC creation, CAB, implementation, PIR |
| `itsm/change-risk-explanation` | Change request risk explanations |
| `itsm/chat-reply-recommendation` | Recommended chat replies for ITSM agents |
| `itsm/email-recommendation` | Professional email responses for IT service cases |
| `itsm/suggested-steps` | AI-generated resolution steps for incidents |
| `itsm/kb-generation` | Generate KB articles from resolved incidents |
| `itsm/release-notes-generation` | Generate release notes from change requests |
| `itsm/case-auto-resolve` | Auto-resolve common cases using pattern matching |
| `itsm/predict-assignment` | Predict assignment group and category |
| `itsm/incident-activity-summarization` | Summarize incident activity streams |
| `itsm/natural-language-queries` | Plain English ServiceNow searches |
| `itsm/quick-reference` | Common operations cheat sheet |

### CSM - Customer Service Management (10 skills)

| Skill | Description |
|-------|-------------|
| `csm/case-summarization` | CSM case summarization with timeline and interactions |
| `csm/chat-recommendation` | Recommended chat responses for CSM agents |
| `csm/email-recommendation` | Professional email responses for customer cases |
| `csm/sentiment-analysis` | Customer sentiment tracking and escalation detection |
| `csm/activity-response` | Contextual activity responses and next actions |
| `csm/resolution-notes` | Comprehensive resolution notes for closing cases |
| `csm/sidebar-summarization` | Sidebar summaries with case context and history |
| `csm/kb-generation` | Generate KB articles from resolved CSM cases |
| `csm/suggested-steps` | Suggested resolution steps for CSM cases |
| `csm/trending-topics` | Trending customer service topics analysis |

### HRSD - HR Service Delivery (10 skills)

| Skill | Description |
|-------|-------------|
| `hrsd/case-summarization` | HR case summarization with COE routing |
| `hrsd/chat-reply-recommendation` | Recommended replies for HR agent chats |
| `hrsd/email-recommendation` | Email recommendations for HR cases |
| `hrsd/resume-skill-extraction` | Extract skills and qualifications from resumes |
| `hrsd/sentiment-analysis` | Employee sentiment analysis and flight risk detection |
| `hrsd/persona-assistant` | Persona-based HR assistance and policy guidance |
| `hrsd/kb-generation` | Generate HR knowledge articles from resolved cases |
| `hrsd/sidebar-summarization` | HR case sidebar discussion summaries |
| `hrsd/health-safety-summarization` | Health & Safety incident summarization |
| `hrsd/generate-talking-points` | Manager talking points for reviews and 1:1s |
| `hrsd/case-summarization-approvals` | Summarize cases/requests for approvers |
| `hrsd/interview-relevance` | Interview note and job description skill matching |

### Development (15 skills)

| Skill | Description |
|-------|-------------|
| `development/business-rules` | Server-side automation scripts |
| `development/client-scripts` | Form manipulation and validation |
| `development/script-includes` | Reusable server-side libraries |
| `development/glide-api-reference` | GlideRecord, GlideAggregate, GlideDateTime |
| `development/debugging-techniques` | Script debugger, logging, troubleshooting |
| `development/notifications` | Email notifications, events, templates |
| `development/ui-actions` | Buttons, context menus, client/server actions |
| `development/scheduled-jobs` | Automated recurring tasks |
| `development/data-import` | Import sets and transform maps |
| `development/scripted-rest-apis` | Custom REST endpoints |
| `development/automated-testing` | ATF and script testing |
| `development/performance-optimization` | Script optimization techniques |
| `development/code-assist` | AI-assisted ServiceNow code generation |
| `development/code-review` | Code review for security and best practices |
| `development/test-generation` | Generate ATF tests from requirements |
| `development/ui-generation` | Generate UI components from descriptions |
| `development/mcp-server` | Configure ServiceNow as an MCP server |

### GenAI Platform (13+ skills)

| Skill | Description |
|-------|-------------|
| `genai/flow-generation` | Generate Flow Designer flows from natural language |
| `genai/playbook-generation` | Generate Process Automation Designer playbooks |
| `genai/playbook-recommendations` | Recommend playbooks based on case context |
| `genai/spoke-generation` | Generate Integration Hub spokes |
| `genai/ai-search-rag` | Configure AI Search with RAG |
| `genai/now-assist-qa` | Configure Now Assist Q&A |
| `genai/skill-kit-custom` | Create custom Now Assist skills |
| `genai/app-generation` | Generate scoped applications from requirements |
| `genai/app-summary` | Summarize existing ServiceNow applications |
| `genai/conversation-evaluator` | Evaluate virtual agent conversation quality |
| `genai/chat-summarization-va` | Summarize virtual agent chat sessions |
| `genai/process-mining-insights` | Process mining insights and optimization |
| `genai/voice-assist` | Configure AI Voice Agents |
| `genai/rpa-bot-generation` | Generate RPA bots from process descriptions |
| `genai/insights-clustering` | Cluster and analyze insights from records |
| `genai/agent-miner` | Mine agent interactions for automation |
| `genai/build-agent` | Build custom AI agents for ServiceNow |
| `genai/detect-conversation-type` | Classify conversation types for routing |
| `genai/ai-lens` | ServiceNow AI Lens for contextual analysis |

### Administration (14 skills)

| Skill | Description |
|-------|-------------|
| `admin/update-set-management` | Configuration tracking and deployment |
| `admin/deployment-workflow` | Instance-to-instance migration |
| `admin/batch-operations` | Bulk record operations |
| `admin/script-execution` | Background script patterns |
| `admin/script-sync` | Local development workflow |
| `admin/user-provisioning` | User lifecycle management |
| `admin/workflow-creation` | Programmatic workflow building |
| `admin/schema-discovery` | Table and field exploration |
| `admin/instance-management` | Multi-instance operations |
| `admin/application-scope` | Scoped app development |
| `admin/configuration-validation` | Catalog item validation |
| `admin/generic-crud-operations` | Universal table operations |
| `admin/task-analysis` | Task trend analysis and bottleneck detection |
| `admin/smart-assessment` | AI-assisted smart assessment configuration |
| `admin/workspace-insights` | Workplace service delivery insights |

### GRC - Governance, Risk & Compliance (7+ skills)

| Skill | Description |
|-------|-------------|
| `grc/issue-action-plan` | Generate GRC issue remediation action plans |
| `grc/issue-summarization` | Summarize GRC issues with compliance context |
| `grc/issue-validator` | Validate GRC issues for completeness |
| `grc/risk-assessment-summarization` | Summarize risk assessments with scoring |
| `grc/risk-event-summarization` | Summarize risk events with impact assessment |
| `grc/control-objective-management` | Manage and assess control objectives |
| `grc/regulatory-alert-analysis` | Analyze regulatory alerts for business impact |
| `grc/suggest-remediation-tasks` | Suggest remediation tasks for GRC issues |
| `grc/tprm-issue-summarization` | Third-party risk management issue summaries |
| `grc/esg-document-intelligence` | ESG data extraction and analysis |

### SecOps - Security Operations (6+ skills)

| Skill | Description |
|-------|-------------|
| `secops/correlation-insights` | Correlate security events and incidents |
| `secops/shift-handover` | Generate SOC shift handover content |
| `secops/post-incident-analysis` | Post-incident review and lessons learned |
| `secops/incident-summarization` | Security incident executive summaries |
| `secops/metrics-analysis` | Security operations metrics (MTTD, MTTR) |
| `secops/vulnerability-deduplication` | Deduplicate vulnerability records |
| `secops/security-recommended-actions` | Recommended actions for security incidents |
| `secops/quality-assessment` | Security incident handling quality assessment |
| `secops/vulnerability-recommended-solution` | Recommend solutions for vulnerable items |

### Knowledge Management (5+ skills)

| Skill | Description |
|-------|-------------|
| `knowledge/duplicate-detection` | Identify duplicate knowledge articles |
| `knowledge/gap-analysis` | Analyze knowledge gaps from incident patterns |
| `knowledge/content-recommendation` | Recommend relevant KB articles |
| `knowledge/article-generation` | Generate KB articles from resolved records |
| `knowledge/gap-grouping` | Group knowledge gaps by topic and priority |
| `knowledge/kb-summarization` | Summarize articles for quick consumption |
| `knowledge/knowledge-graph` | Build and navigate knowledge graphs |

### SPM - Strategic Portfolio Management (5+ skills)

| Skill | Description |
|-------|-------------|
| `spm/agile-story-generation` | Generate user stories with acceptance criteria |
| `spm/acceptance-criteria` | Generate comprehensive acceptance criteria |
| `spm/project-insights` | Project health insights and dashboards |
| `spm/planning-summarization` | Summarize planning items and portfolios |
| `spm/feedback-summarization` | Summarize retrospective and review feedback |
| `spm/cwm-doc-generation` | CWM documentation and insights |
| `spm/cwm-tasks-generation` | Generate task breakdowns from requirements |

### ITOM - IT Operations Management (5 skills)

| Skill | Description |
|-------|-------------|
| `itom/alert-analysis` | Operational alert analysis and pattern recognition |
| `itom/alert-investigation` | Deep alert investigation with CI tracing |
| `itom/service-mapping` | Service map discovery and validation |
| `itom/observability-integration` | Integrate Datadog/Dynatrace/New Relic data |
| `itom/health-log-analytics` | Health log analytics and anomaly detection |

### Procurement & Finance (5+ skills)

| Skill | Description |
|-------|-------------|
| `procurement/invoice-management` | Invoice data extraction and PO matching |
| `procurement/procurement-summarization` | Procurement case and pipeline summaries |
| `procurement/purchase-order-summarization` | Purchase order tracking and summaries |
| `procurement/sourcing-summarization` | Sourcing event and bid comparison summaries |
| `procurement/supplier-recommendation` | Supplier recommendations based on performance |
| `procurement/order-summarization` | Order capture and fulfillment summaries |

### Legal & Contract Management (6 skills)

| Skill | Description |
|-------|-------------|
| `legal/legal-request-triage` | Triage and classify legal requests |
| `legal/legal-matter-summarization` | Legal matter summaries with financial exposure |
| `legal/contract-analysis` | Contract term and risk analysis |
| `legal/contract-obligation-extraction` | Extract obligations from contracts |
| `legal/contract-metadata-extraction` | Extract contract metadata and key dates |
| `legal/contracts-query-enhancer` | Enhance contract search queries |

### Service Catalog (8 skills)

| Skill | Description |
|-------|-------------|
| `catalog/request-fulfillment` | End-to-end request processing |
| `catalog/item-creation` | Catalog item setup |
| `catalog/approval-workflows` | Approval configuration |
| `catalog/variable-management` | Form variables and options |
| `catalog/ui-policies` | Dynamic form behavior |
| `catalog/catalog-item-generation` | Generate catalog items from descriptions |
| `catalog/multi-turn-ordering` | Multi-turn conversational ordering |
| `catalog/approval-summarization` | Summarize approvals with business context |
| `catalog/catalog-builder-ai` | AI-assisted catalog builder |

### CMDB (6+ skills)

| Skill | Description |
|-------|-------------|
| `cmdb/ci-discovery` | Configuration item management |
| `cmdb/relationship-mapping` | CI relationships and dependencies |
| `cmdb/impact-analysis` | Service impact assessment |
| `cmdb/data-quality` | CMDB health and validation |
| `cmdb/cmdb-search-analysis` | Natural language CI search and analysis |
| `cmdb/service-graph-diagnosis` | Service Graph Connector troubleshooting |
| `cmdb/ci-summarization` | Comprehensive CI summaries |

### Security (4 skills)

| Skill | Description |
|-------|-------------|
| `security/incident-response` | Security incident handling |
| `security/acl-management` | Access control configuration |
| `security/audit-compliance` | Compliance monitoring |
| `security/data-classification` | Data sensitivity management |

### Reporting & Analytics (6 skills)

| Skill | Description |
|-------|-------------|
| `reporting/sla-analysis` | SLA performance metrics |
| `reporting/executive-dashboard` | KPI dashboards |
| `reporting/trend-analysis` | Historical trend reporting |
| `reporting/analytics-generation` | Generate analytics dashboards from descriptions |
| `reporting/query-generation` | Generate queries from natural language |
| `reporting/survey-analysis` | Survey response analysis and trends |

### Enterprise Architecture (2 skills)

| Skill | Description |
|-------|-------------|
| `ea/adr-summarization` | Architecture Decision Record summaries |
| `ea/business-app-insights` | Business application health and insights |

### Field Service Management (2+ skills)

| Skill | Description |
|-------|-------------|
| `fsm/work-order-summarization` | Work order summaries with SLA and parts |
| `fsm/sidebar-summarization` | Field technician sidebar summaries |
| `fsm/kb-generation` | Field service knowledge articles |

### Software Asset Management (2+ skills)

| Skill | Description |
|-------|-------------|
| `sam/product-compliance` | Product license compliance summaries |
| `sam/saas-user-resolution` | SaaS user discrepancy resolution |
| `sam/publisher-compliance` | Publisher compliance and audit readiness |
| `sam/recommended-actions` | SAM optimization recommendations |

### Document Intelligence (2 skills)

| Skill | Description |
|-------|-------------|
| `document/document-extraction` | Extract structured data from documents |
| `document/smart-documents` | Smart document management and templates |

### OT Security Management (2 skills)

| Skill | Description |
|-------|-------------|
| `otsm/ot-incident-resolution` | OT incident resolution with safety context |
| `otsm/ot-incident-summarization` | OT incident summaries with device impact |

### Public Sector Digital Services (2 skills)

| Skill | Description |
|-------|-------------|
| `psds/government-case-summarization` | Government case summaries with compliance |
| `psds/chat-summarization` | Public sector chat interaction summaries |

---

## Skill Anatomy

Each skill is a Markdown file with YAML frontmatter:

```markdown
---
name: incident-triage
version: 1.0.0
description: Intelligent incident triage and assignment
author: Happy Technologies LLC
tags: [itsm, incident, triage, assignment]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp: [SN-Query-Table, SN-NL-Search, SN-Assign-Incident]
  rest: [/api/now/table/incident, /api/now/table/sys_user_group]
  native: [Bash, Read, Write]
complexity: intermediate
estimated_time: 5-15 minutes
---

# Incident Triage Skill

## Overview
[What this skill accomplishes]

## Prerequisites
[Required access, permissions, or setup]

## Procedure
[Step-by-step instructions with decision points]

## Tool Usage
[How to use available tools - MCP, REST, or native]

## Best Practices
[ServiceNow and ITIL best practices]

## Troubleshooting
[Common issues and solutions]
```

---

## Platform Compatibility

Skills are designed to work across multiple AI platforms:

| Platform | Tool Access | Notes |
|----------|-------------|-------|
| **Claude Code** | MCP + Native | Full integration with ServiceNow MCP Server |
| **Claude Desktop** | MCP only | Requires MCP server connection |
| **ChatGPT** | REST/Actions | Use REST API procedures |
| **Cursor** | Native + Extensions | IDE-based automation |
| **Custom Agents** | Any | Adapt procedures to available tools |

---

## Integration with ServiceNow MCP Server

These skills are designed to complement the [ServiceNow MCP Server](https://github.com/nickzitzer/mcp-servicenow-nodejs):

```javascript
// When MCP tools are available, skills reference them directly
// Tool: SN-NL-Search
// Query: "active high priority incidents assigned to is empty"

// When MCP is not available, skills provide REST alternatives
// GET /api/now/table/incident?sysparm_query=active=true^priority=1^assigned_toISEMPTY
```

---

## Creating Custom Skills

### Quick Start

```bash
# Copy the template
cp templates/skill-template.md skills/custom/my-skill.md

# Edit your skill
code skills/custom/my-skill.md

# Validate
npm run validate
```

### Skill Specification

See [docs/SKILL_SPEC.md](docs/SKILL_SPEC.md) for the complete skill specification.

### Contributing Skills

1. Fork the repository
2. Create your skill in the appropriate category
3. Run `npm run validate` to ensure it's valid
4. Submit a pull request

---

## Statistics

| Metric | Value |
|--------|-------|
| **Total Skills** | 180+ |
| **Categories** | 23 |
| **Platforms Supported** | 5+ |
| **MCP Tool References** | 60+ |
| **ServiceNow Zurich Patch 6 Coverage** | Comprehensive |

---

## Related Projects

- **[ServiceNow MCP Server](https://github.com/nickzitzer/mcp-servicenow-nodejs)** - MCP server providing 40+ tools for ServiceNow automation
- **[Happy Technologies](https://happy-tech.biz)** - Enterprise AI solutions

---

## License

MIT License - see [LICENSE](LICENSE) for details.

---

## Acknowledgments

- [Anthropic](https://anthropic.com) for Claude and MCP
- [ServiceNow](https://servicenow.com) for the platform
- The agentic AI community

---

<p align="center">
  Built with care by <a href="https://happy-tech.biz">Happy Technologies LLC</a>
</p>
