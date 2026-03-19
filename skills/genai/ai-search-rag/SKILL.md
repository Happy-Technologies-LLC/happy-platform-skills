---
name: ai-search-rag
version: 1.0.0
description: Configure and optimize AI Search with Retrieval Augmented Generation (RAG) including search source configuration, result ranking, answer generation, knowledge source indexing, and search quality tuning
author: Happy Technologies LLC
tags: [genai, ai-search, RAG, retrieval-augmented-generation, knowledge, search-sources, ranking, NLU]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp:
    - SN-Query-Table
    - SN-Create-Record
    - SN-Update-Record
    - SN-Get-Table-Schema
  rest:
    - /api/now/table/sn_ai_search_source
    - /api/now/table/sn_ai_search_profile
    - /api/now/table/sn_ai_search_result_config
    - /api/now/table/sn_ai_search_index
    - /api/now/table/sn_ai_search_field_config
    - /api/now/table/sn_gen_ai_config
    - /api/now/table/kb_knowledge
    - /api/now/table/kb_knowledge_base
    - /api/now/table/sys_cs_ai_search_source
  native:
    - Bash
complexity: advanced
estimated_time: 45-90 minutes
---

# AI Search with RAG Configuration

## Overview

This skill covers configuring and optimizing ServiceNow AI Search with Retrieval Augmented Generation (RAG):

- Creating and configuring search sources (knowledge bases, catalog items, service portal content)
- Setting up search profiles that define search behavior and source priorities
- Configuring result ranking and relevance tuning for quality search results
- Enabling RAG-based answer generation from retrieved knowledge content
- Managing search indexes and field configurations for optimal retrieval
- Tuning search quality through feedback loops and analytics
- Integrating AI Search with Now Assist and Virtual Agent

**When to use:** When setting up AI-powered search across knowledge bases, configuring RAG for generative answers from enterprise content, or optimizing search result quality in ServiceNow.

## Prerequisites

- **Roles:** `admin`, `search_admin`, or `now_assist_admin`
- **Plugins:** `com.snc.ai_search` (AI Search), `com.snc.generative_ai_controller` (Generative AI Controller), `sn_gen_ai` (Generative AI)
- **Access:** sn_ai_search_source, sn_ai_search_profile, sn_gen_ai_config tables
- **Knowledge:** Understanding of search concepts (indexing, ranking, relevance), knowledge management basics
- **Related Skills:** `genai/now-assist-qa` for conversational AI, `knowledge/article-management` for KB content

## Procedure

### Step 1: Assess Available Knowledge Sources

Identify what content should be searchable and available for RAG.

**MCP Approach:**
```
Use SN-Query-Table on kb_knowledge_base:
  - query: active=true
  - fields: sys_id,title,description,kb_version,active,article_count
  - limit: 20
```

Check existing knowledge articles:
```
Use SN-Query-Table on kb_knowledge:
  - query: workflow_state=published^kb_knowledge_base=<kb_sys_id>
  - fields: sys_id,short_description,kb_knowledge_base,workflow_state,sys_updated_on
  - limit: 20
```

**REST Approach:**
```
GET /api/now/table/kb_knowledge_base
  ?sysparm_query=active=true
  &sysparm_fields=sys_id,title,description,active
  &sysparm_limit=20
```

### Step 2: Create Search Sources

Search sources define where AI Search retrieves content from.

**Knowledge Base Search Source:**

**MCP Approach:**
```
Use SN-Create-Record on sn_ai_search_source:
  - name: "IT Knowledge Base"
  - description: "Primary IT support knowledge articles"
  - source_type: "knowledge"
  - source_table: "kb_knowledge"
  - source_condition: "workflow_state=published^kb_knowledge_base=<kb_sys_id>"
  - active: true
  - enable_rag: true
  - rag_content_field: "text"
  - search_fields: "short_description,text,meta"
  - display_fields: "short_description,kb_category,sys_updated_on"
```

**REST Approach:**
```
POST /api/now/table/sn_ai_search_source
Body: {
  "name": "IT Knowledge Base",
  "description": "Primary IT support knowledge articles",
  "source_type": "knowledge",
  "source_table": "kb_knowledge",
  "source_condition": "workflow_state=published",
  "active": true,
  "enable_rag": true,
  "rag_content_field": "text"
}
```

**Catalog Item Search Source:**
```
Use SN-Create-Record on sn_ai_search_source:
  - name: "Service Catalog Items"
  - description: "Available service catalog offerings"
  - source_type: "catalog"
  - source_table: "sc_cat_item"
  - source_condition: "active=true^hide_sp=false"
  - active: true
  - enable_rag: false
  - search_fields: "name,short_description,description"
  - display_fields: "name,short_description,category"
```

**Incident Solutions Search Source:**
```
Use SN-Create-Record on sn_ai_search_source:
  - name: "Resolved Incidents"
  - description: "Previously resolved incidents for pattern matching"
  - source_type: "table"
  - source_table: "incident"
  - source_condition: "state=6^close_notes!=NULL^universal_requestISNOTEMPTY"
  - active: true
  - enable_rag: true
  - rag_content_field: "close_notes"
  - search_fields: "short_description,description,close_notes"
```

### Step 3: Configure Search Profiles

Search profiles control which sources are searched and how results are ranked.

**MCP Approach:**
```
Use SN-Create-Record on sn_ai_search_profile:
  - name: "IT Support Search"
  - description: "Search profile for IT help desk agents and self-service"
  - active: true
  - default_profile: false
  - rag_enabled: true
  - max_results: 10
  - rag_max_sources: 5
  - rag_confidence_threshold: 0.7
  - search_sources: "<kb_source_sys_id>,<catalog_source_sys_id>,<incident_source_sys_id>"
```

**REST Approach:**
```
POST /api/now/table/sn_ai_search_profile
Body: {
  "name": "IT Support Search",
  "description": "Search profile for IT help desk agents and self-service",
  "active": true,
  "rag_enabled": true,
  "max_results": 10,
  "rag_max_sources": 5,
  "rag_confidence_threshold": 0.7
}
```

### Step 4: Configure Search Field Weighting

Field configurations control how different fields contribute to relevance scoring.

**MCP Approach:**
```
Use SN-Create-Record on sn_ai_search_field_config:
  - search_source: "<kb_source_sys_id>"
  - field_name: "short_description"
  - boost_factor: 3.0
  - searchable: true
  - displayable: true
  - order: 100
```

```
Use SN-Create-Record on sn_ai_search_field_config:
  - search_source: "<kb_source_sys_id>"
  - field_name: "text"
  - boost_factor: 1.0
  - searchable: true
  - displayable: false
  - order: 200
```

```
Use SN-Create-Record on sn_ai_search_field_config:
  - search_source: "<kb_source_sys_id>"
  - field_name: "meta"
  - boost_factor: 2.0
  - searchable: true
  - displayable: false
  - order: 300
```

**Boost factor guidelines:**

| Boost Level | Value | Use Case |
|-------------|-------|----------|
| High | 3.0-5.0 | Title, short description -- primary match fields |
| Medium | 1.5-2.5 | Tags, metadata, categories -- supporting match fields |
| Standard | 1.0 | Body text, full content -- broad matching |
| Low | 0.5 | Comments, notes -- supplementary information |

### Step 5: Configure RAG Answer Generation

Set up the generative AI configuration for producing answers from retrieved content.

**MCP Approach:**
```
Use SN-Create-Record on sn_gen_ai_config:
  - name: "AI Search RAG Configuration"
  - description: "Controls how RAG generates answers from search results"
  - active: true
  - llm_provider: "now_llm"
  - model: "default"
  - temperature: 0.3
  - max_tokens: 500
  - system_prompt: "You are a helpful IT support assistant. Answer questions using only the provided context. If the context does not contain enough information, say so clearly. Always cite the source article."
  - context_window: 4000
  - enable_citations: true
  - citation_format: "inline"
```

**REST Approach:**
```
POST /api/now/table/sn_gen_ai_config
Body: {
  "name": "AI Search RAG Configuration",
  "description": "Controls how RAG generates answers from search results",
  "active": true,
  "llm_provider": "now_llm",
  "temperature": 0.3,
  "max_tokens": 500,
  "enable_citations": true
}
```

**Temperature guidelines for RAG:**

| Temperature | Behavior | Use Case |
|-------------|----------|----------|
| 0.0-0.2 | Very factual, deterministic | Policy lookups, compliance answers |
| 0.3-0.5 | Balanced, mostly factual | IT support, troubleshooting guidance |
| 0.6-0.8 | More creative, varied phrasing | Content suggestions, recommendations |
| 0.9-1.0 | Highly creative | Not recommended for RAG |

### Step 6: Set Up Search Index Configuration

Control how content is indexed for optimal retrieval.

**MCP Approach:**
```
Use SN-Create-Record on sn_ai_search_index:
  - search_source: "<kb_source_sys_id>"
  - name: "KB Article Index"
  - index_type: "full_text"
  - active: true
  - rebuild_schedule: "daily"
  - chunk_size: 500
  - chunk_overlap: 50
  - embedding_model: "default"
```

**REST Approach:**
```
POST /api/now/table/sn_ai_search_index
Body: {
  "search_source": "<kb_source_sys_id>",
  "name": "KB Article Index",
  "index_type": "full_text",
  "active": true,
  "rebuild_schedule": "daily",
  "chunk_size": 500,
  "chunk_overlap": 50
}
```

**Chunking strategy guidelines:**

| Content Type | Chunk Size | Overlap | Rationale |
|-------------|------------|---------|-----------|
| Short KB articles | 300-500 | 30-50 | Preserve complete article context |
| Long documentation | 500-800 | 50-100 | Balance context with specificity |
| FAQ content | 200-300 | 20-30 | Keep Q&A pairs together |
| Policy documents | 800-1200 | 100-150 | Maintain section-level context |

### Step 7: Configure Result Ranking

**MCP Approach:**
```
Use SN-Create-Record on sn_ai_search_result_config:
  - search_profile: "<profile_sys_id>"
  - name: "IT Support Ranking"
  - ranking_model: "hybrid"
  - semantic_weight: 0.6
  - keyword_weight: 0.3
  - recency_weight: 0.1
  - personalization: true
  - active: true
```

**Ranking model options:**

| Model | Description | Best For |
|-------|-------------|----------|
| keyword | Traditional keyword/BM25 matching | Exact term searches, error codes |
| semantic | Vector-based semantic similarity | Natural language questions |
| hybrid | Combined keyword + semantic | General-purpose (recommended) |

### Step 8: Integrate with Virtual Agent and Now Assist

Connect AI Search to conversational interfaces.

**Virtual Agent Search Source:**
```
Use SN-Create-Record on sys_cs_ai_search_source:
  - name: "VA AI Search Integration"
  - search_profile: "<profile_sys_id>"
  - active: true
  - auto_summarize: true
  - fallback_action: "transfer_to_agent"
  - confidence_threshold: 0.65
  - max_results_shown: 3
```

**REST Approach:**
```
POST /api/now/table/sys_cs_ai_search_source
Body: {
  "name": "VA AI Search Integration",
  "search_profile": "<profile_sys_id>",
  "active": true,
  "auto_summarize": true,
  "fallback_action": "transfer_to_agent",
  "confidence_threshold": 0.65
}
```

### Step 9: Monitor Search Quality

Query search analytics to understand performance.

**MCP Approach:**
```
Use SN-Query-Table on sn_ai_search_log:
  - query: search_profile=<profile_sys_id>^sys_created_on>javascript:gs.daysAgo(7)
  - fields: sys_id,query_text,result_count,click_through,feedback_score,rag_generated
  - limit: 50
  - orderBy: sys_created_on
  - orderDirection: desc
```

Track RAG answer quality:
```
Use SN-Query-Table on sn_ai_search_feedback:
  - query: search_profile=<profile_sys_id>^rating<3
  - fields: sys_id,query_text,answer_text,rating,feedback_comment
  - limit: 20
```

### Step 10: Tune and Optimize

Based on analytics, adjust search configuration.

**Adjust confidence threshold:**
```
Use SN-Update-Record on sn_ai_search_profile:
  - sys_id: "<profile_sys_id>"
  - rag_confidence_threshold: 0.75
```

**Update field boosting:**
```
Use SN-Update-Record on sn_ai_search_field_config:
  - sys_id: "<field_config_sys_id>"
  - boost_factor: 4.0
```

**Trigger index rebuild:**
```
Use SN-Update-Record on sn_ai_search_index:
  - sys_id: "<index_sys_id>"
  - rebuild_requested: true
```

## Tool Usage

| Tool | Purpose | When to Use |
|------|---------|-------------|
| SN-Query-Table | Find existing sources, profiles, analytics | Discovery and monitoring |
| SN-Create-Record | Create sources, profiles, field configs | Initial setup and expansion |
| SN-Update-Record | Tune ranking, thresholds, rebuild indexes | Optimization and maintenance |
| SN-Get-Table-Schema | Discover configuration fields | Understanding available settings |

## Best Practices

1. **Start with knowledge bases** as the primary RAG source -- they have structured, curated content
2. **Use hybrid ranking** combining semantic and keyword search for best results
3. **Set conservative confidence thresholds** (0.7+) initially and lower only if needed
4. **Keep temperature low** (0.2-0.4) for RAG to maintain factual accuracy
5. **Enable citations** so users can verify answers against source material
6. **Chunk content appropriately** -- too small loses context, too large dilutes relevance
7. **Boost title fields** 3-5x over body text for better result relevance
8. **Monitor click-through rates** and feedback scores to identify quality gaps
9. **Rebuild indexes regularly** after knowledge base updates for fresh content
10. **Test with real user queries** from search logs to validate ranking changes

## Troubleshooting

| Issue | Cause | Resolution |
|-------|-------|------------|
| No search results returned | Search source inactive or no matching content | Verify source is active and content matches source_condition |
| RAG answer is hallucinated | Temperature too high or insufficient context | Lower temperature, increase rag_max_sources, verify content quality |
| Irrelevant results ranked high | Field boost weights misconfigured | Increase boost on title/description, decrease on body text |
| Search is slow | Large index or too many sources searched | Limit source_condition scope, optimize chunk_size, reduce max_results |
| RAG answer missing citations | Citations not enabled in gen AI config | Set enable_citations=true in sn_gen_ai_config |
| Index out of date | Rebuild schedule too infrequent | Trigger manual rebuild or increase rebuild_schedule frequency |
| Duplicate results | Same content indexed from multiple sources | Add source deduplication or narrow source_condition filters |

## Examples

### Example 1: IT Self-Service AI Search

Configure AI Search for employee self-service portal:
- **Sources:** IT Knowledge Base (published articles), Service Catalog (active items), FAQ knowledge base
- **Profile:** Self-service with RAG enabled, max 5 results, confidence threshold 0.7
- **Ranking:** Hybrid model, semantic_weight=0.6, keyword_weight=0.3, recency=0.1
- **RAG Config:** Temperature 0.3, max 500 tokens, inline citations enabled
- **Integration:** Virtual Agent with auto-summarize, fallback to live agent

### Example 2: HR Policy Search with RAG

Configure AI Search for HR policy questions:
- **Sources:** HR Knowledge Base (policy documents), HR Catalog (request forms)
- **Profile:** HR-specific with strict RAG (temperature 0.1 for policy accuracy)
- **Chunking:** 800 tokens with 100 overlap (preserves policy section context)
- **Field Boost:** Policy title 5.0x, section headers 3.0x, body 1.0x
- **Guardrails:** System prompt requires exact policy citations, prohibits paraphrasing legal language

### Example 3: Multi-Source Technical Knowledge Search

Configure AI Search across multiple technical knowledge bases:
- **Sources:** Infrastructure KB, Application KB, Security KB, resolved incidents
- **Profile:** Technical support with high semantic weight (0.7) for natural language queries
- **Chunking:** 500 tokens with 50 overlap for technical articles
- **Ranking:** Boost recent articles (recency_weight=0.2) for evolving tech content
- **Monitoring:** Track low-rated answers weekly, retrain on misses

## Related Skills

- `genai/now-assist-qa` - Conversational AI that consumes AI Search results
- `genai/skill-kit-custom` - Custom skills that can invoke AI Search
- `knowledge/article-management` - Managing the knowledge content that feeds search
- `reporting/dashboard-creation` - Building search analytics dashboards
