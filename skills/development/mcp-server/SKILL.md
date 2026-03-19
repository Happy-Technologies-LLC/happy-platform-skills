---
name: mcp-server
version: 1.0.0
description: Set up ServiceNow as an MCP (Model Context Protocol) server defining tool capabilities, authentication, resource endpoints, and integration patterns for AI agents
author: Happy Technologies LLC
tags: [development, mcp, model-context-protocol, ai, integration, api, agents, tools, authentication]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp:
    - SN-Query-Table
    - SN-Create-Record
    - SN-Update-Record
    - SN-Get-Table-Schema
    - SN-Read-Record
  rest:
    - /api/now/table/sys_script_include
    - /api/now/table/sys_rest_api
    - /api/now/table/sys_rest_api_resource
    - /api/now/table/sys_properties
    - /api/now/table/sys_oauth_entity
    - /api/now/table/sys_scope
    - /api/now/table/sys_security_acl
  native:
    - Bash
complexity: expert
estimated_time: 60-120 minutes
---

# ServiceNow as MCP Server

## Overview

This skill covers setting up ServiceNow as a Model Context Protocol (MCP) server, enabling AI agents to interact with ServiceNow through a standardized protocol:

- Understanding MCP architecture and how ServiceNow fits as a tool provider
- Defining tool capabilities that expose ServiceNow operations to AI agents
- Configuring authentication and authorization for secure agent access
- Building resource endpoints that agents can discover and interact with
- Implementing input validation and output formatting for agent consumption
- Setting up logging, rate limiting, and monitoring for MCP interactions
- Testing MCP tool definitions with AI agent platforms

**When to use:** When enabling AI agents (Claude, ChatGPT, Cursor, etc.) to interact with ServiceNow data and operations through the MCP standard, building a ServiceNow integration for AI-powered workflows, or creating a standardized API layer for multi-agent orchestration.

## Prerequisites

- **Roles:** `admin`, `rest_api_explorer`, `web_service_admin`
- **Plugins:** `com.glide.rest` (REST API), `com.snc.oauth` (OAuth 2.0)
- **Access:** Write access to `sys_rest_api`, `sys_script_include`, `sys_properties`, `sys_oauth_entity` tables
- **Knowledge:** REST API design, OAuth 2.0, JSON Schema, MCP specification concepts
- **Related Skills:** `development/scripted-rest-apis` for REST API development, `security/acl-management` for access control

## Procedure

### Step 1: Understand MCP Architecture

The Model Context Protocol defines a standard interface for AI agents to discover and use tools. ServiceNow acts as the MCP server, exposing capabilities that agents can invoke.

```
MCP ARCHITECTURE:

[AI Agent (Client)]
       |
       | MCP Protocol (JSON-RPC 2.0)
       |
[MCP Server (ServiceNow)]
       |
       +-- Tools: Operations the agent can perform
       |     +-- query_records: Search ServiceNow tables
       |     +-- create_record: Create new records
       |     +-- update_record: Modify existing records
       |     +-- run_flow: Trigger Flow Designer flows
       |
       +-- Resources: Data the agent can read
       |     +-- incident://INC0010001: Incident record
       |     +-- kb://KB0010001: Knowledge article
       |     +-- cmdb://ci/server001: Configuration item
       |
       +-- Prompts: Predefined interaction templates
             +-- incident-triage: Guide incident categorization
             +-- change-risk: Assess change request risk
```

### Step 2: Design the Tool Schema

Define the MCP tools that expose ServiceNow operations.

**Tool Definition Format (MCP Standard):**
```json
{
  "name": "sn_query_records",
  "description": "Query ServiceNow records from any table using encoded query syntax. Returns matching records with specified fields.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "table": {
        "type": "string",
        "description": "ServiceNow table name (e.g., incident, change_request, sys_user)"
      },
      "query": {
        "type": "string",
        "description": "Encoded query string (e.g., priority=1^state=2)"
      },
      "fields": {
        "type": "string",
        "description": "Comma-separated list of fields to return"
      },
      "limit": {
        "type": "integer",
        "description": "Maximum records to return (default 10, max 100)",
        "default": 10
      }
    },
    "required": ["table"]
  }
}
```

**Core Tool Definitions:**

| Tool Name | Purpose | Required Params | Optional Params |
|-----------|---------|----------------|-----------------|
| sn_query_records | Search records | table | query, fields, limit, order_by |
| sn_read_record | Get single record | table, sys_id | fields |
| sn_create_record | Create record | table, data | |
| sn_update_record | Update record | table, sys_id, data | |
| sn_get_schema | Get table schema | table | |
| sn_run_flow | Trigger a flow | flow_id, inputs | |
| sn_search_kb | Search knowledge base | query | kb_id, limit |
| sn_add_comment | Add work note/comment | table, sys_id, text | type (work_note/comment) |

### Step 3: Create the Scripted REST API

Build the REST API endpoints that implement MCP tool operations.

**MCP Approach:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_rest_api
  data:
    name: "MCP Server API"
    api_id: "mcp_server"
    namespace: "x_mcp"
    short_description: "Model Context Protocol server endpoint for AI agent integration"
    active: true
    requires_authentication: true
```

**REST Approach:**
```
POST /api/now/table/sys_rest_api
Body: {
  "name": "MCP Server API",
  "api_id": "mcp_server",
  "namespace": "x_mcp",
  "short_description": "Model Context Protocol server endpoint for AI agent integration",
  "active": "true",
  "requires_authentication": "true"
}
```

### Step 4: Create Resource Endpoints

Build API resources for each MCP tool capability.

**MCP Approach:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_rest_api_resource
  data:
    rest_api: [REST_API_SYS_ID]
    name: "Tools List"
    resource_path: "/tools/list"
    http_method: "GET"
    short_description: "Return list of available MCP tools and their schemas"
    script: |
      (function process(/*RESTAPIRequest*/ request, /*RESTAPIResponse*/ response) {
        var tools = [];
        tools.push({
          name: 'sn_query_records',
          description: 'Query ServiceNow records from any table',
          inputSchema: {
            type: 'object',
            properties: {
              table: { type: 'string', description: 'Table name' },
              query: { type: 'string', description: 'Encoded query' },
              fields: { type: 'string', description: 'Fields to return' },
              limit: { type: 'integer', description: 'Max results', default: 10 }
            },
            required: ['table']
          }
        });
        // Add more tool definitions...
        response.setBody({ tools: tools });
      })(request, response);
```

**Tool Execution Endpoint:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_rest_api_resource
  data:
    rest_api: [REST_API_SYS_ID]
    name: "Tools Call"
    resource_path: "/tools/call"
    http_method: "POST"
    short_description: "Execute an MCP tool with provided arguments"
    script: |
      (function process(/*RESTAPIRequest*/ request, /*RESTAPIResponse*/ response) {
        var body = request.body.data;
        var toolName = body.name;
        var args = body.arguments || {};

        var handler = new x_mcp.MCPToolHandler();
        var result = handler.execute(toolName, args);

        response.setBody({
          content: [{
            type: 'text',
            text: JSON.stringify(result)
          }]
        });
      })(request, response);
```

### Step 5: Implement the Tool Handler

Create a Script Include to handle MCP tool execution.

**MCP Approach:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_script_include
  data:
    name: "MCPToolHandler"
    api_name: "x_mcp.MCPToolHandler"
    script: |
      var MCPToolHandler = Class.create();
      MCPToolHandler.prototype = {
        initialize: function() {},

        execute: function(toolName, args) {
          switch(toolName) {
            case 'sn_query_records':
              return this._queryRecords(args);
            case 'sn_read_record':
              return this._readRecord(args);
            case 'sn_create_record':
              return this._createRecord(args);
            case 'sn_update_record':
              return this._updateRecord(args);
            case 'sn_get_schema':
              return this._getSchema(args);
            default:
              return { error: 'Unknown tool: ' + toolName };
          }
        },

        _queryRecords: function(args) {
          var gr = new GlideRecord(args.table);
          if (!gr.canRead()) return { error: 'Access denied to table: ' + args.table };
          if (args.query) gr.addEncodedQuery(args.query);
          gr.setLimit(Math.min(args.limit || 10, 100));
          gr.query();
          var results = [];
          var fields = args.fields ? args.fields.split(',') : null;
          while (gr.next()) {
            var record = {};
            if (fields) {
              fields.forEach(function(f) {
                record[f.trim()] = gr.getDisplayValue(f.trim());
              });
            } else {
              record.sys_id = gr.getUniqueValue();
              record.display_value = gr.getDisplayValue();
            }
            results.push(record);
          }
          return { records: results, count: results.length };
        },

        _readRecord: function(args) {
          var gr = new GlideRecord(args.table);
          if (!gr.canRead()) return { error: 'Access denied' };
          if (gr.get(args.sys_id)) {
            var record = {};
            var fields = args.fields ? args.fields.split(',') : null;
            if (fields) {
              fields.forEach(function(f) {
                record[f.trim()] = gr.getDisplayValue(f.trim());
              });
            }
            return { record: record };
          }
          return { error: 'Record not found' };
        },

        type: 'MCPToolHandler'
      };
    access: "public"
    active: true
```

### Step 6: Configure Authentication

Set up OAuth 2.0 for secure agent authentication.

**MCP Approach:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_oauth_entity
  query: type=client^active=true
  fields: sys_id,name,client_id,redirect_url,token_lifetime,refresh_token_lifetime
  limit: 10
```

**Create OAuth Application:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_oauth_entity
  data:
    name: "MCP Agent OAuth Client"
    type: "client"
    client_id: "mcp_agent_client"
    redirect_url: "https://agent.example.com/callback"
    token_lifetime: 1800
    refresh_token_lifetime: 86400
    active: true
    comments: "OAuth client for MCP-compliant AI agents"
```

**Authentication Flow:**
```
1. Agent requests access token:
   POST /oauth_token.do
   grant_type=client_credentials
   client_id=mcp_agent_client
   client_secret=[secret]

2. Agent includes token in MCP requests:
   Authorization: Bearer [access_token]

3. ServiceNow validates token and applies user context
```

### Step 7: Implement Access Controls

Configure ACLs and rate limits for MCP endpoints.

**Table-Level Access Control:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_security_acl
  query: name=sys_rest_api^operation=execute
  fields: sys_id,name,operation,condition,role
  limit: 10
```

**Rate Limiting Configuration:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_properties
  data:
    name: "x_mcp.rate_limit.per_minute"
    value: "60"
    description: "Maximum MCP API calls per minute per client"
    type: "integer"
```

**Access Control Matrix:**

| Tool | Minimum Role | Table ACL Check | Rate Limit |
|------|-------------|----------------|------------|
| sn_query_records | itil | Table read ACL | 60/min |
| sn_read_record | itil | Table read ACL | 60/min |
| sn_create_record | itil | Table create ACL | 30/min |
| sn_update_record | itil | Table write ACL | 30/min |
| sn_get_schema | itil | None | 10/min |
| sn_run_flow | flow_operator | Flow ACL | 10/min |

### Step 8: Implement Input Validation

Add validation to prevent misuse and ensure data quality.

```
VALIDATION RULES:

Table Name Validation:
- Must exist in sys_db_object
- Must not be in blocklist (sys_user_password, sys_certificate, etc.)
- Must be accessible to the authenticated user

Query Validation:
- Maximum query length: 2000 characters
- No script injection (block javascript: in queries for non-admin)
- Validate encoded query syntax

Field Validation:
- Fields must exist on the target table
- Sensitive fields filtered (password, token, secret fields)

Limit Validation:
- Maximum 100 records per query
- Default 10 if not specified

Data Validation (create/update):
- Validate field types match expected values
- Enforce mandatory field requirements
- Sanitize string inputs
```

### Step 9: Set Up Logging and Monitoring

Configure logging for all MCP interactions.

**MCP Approach:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_properties
  data:
    name: "x_mcp.logging.enabled"
    value: "true"
    description: "Enable logging for all MCP API interactions"
    type: "boolean"
```

**Log Entry Structure:**
```
MCP INTERACTION LOG:
- Timestamp: [ISO 8601]
- Client ID: [OAuth client]
- Tool: [tool_name]
- Arguments: [sanitized args]
- Response Status: [success/error]
- Response Time: [ms]
- Records Affected: [count]
- User Context: [authenticated user]
```

### Step 10: Test MCP Integration

Validate the MCP server with agent platforms.

**Test Tool Listing:**
```bash
curl -X GET https://[instance].service-now.com/api/x_mcp/mcp_server/tools/list \
  -H "Authorization: Bearer [token]" \
  -H "Accept: application/json"
```

**Test Tool Execution:**
```bash
curl -X POST https://[instance].service-now.com/api/x_mcp/mcp_server/tools/call \
  -H "Authorization: Bearer [token]" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "sn_query_records",
    "arguments": {
      "table": "incident",
      "query": "priority=1^state=2",
      "fields": "number,short_description,priority,state",
      "limit": 5
    }
  }'
```

**MCP Client Configuration (claude_desktop_config.json):**
```json
{
  "mcpServers": {
    "servicenow": {
      "url": "https://[instance].service-now.com/api/x_mcp/mcp_server",
      "transport": "streamable-http",
      "headers": {
        "Authorization": "Bearer [token]"
      }
    }
  }
}
```

## Tool Usage

| Tool | Purpose | When to Use |
|------|---------|-------------|
| SN-Create-Record | Create REST APIs, resources, script includes | Building MCP server components |
| SN-Update-Record | Modify API configurations, update scripts | Iterating on MCP implementation |
| SN-Query-Table | Find existing APIs, ACLs, OAuth configs | Discovery and validation |
| SN-Get-Table-Schema | Discover table fields for tool schemas | Schema generation |
| SN-Read-Record | Review specific API or script details | Debugging and verification |

## Best Practices

1. **Follow MCP specification strictly** -- ensure tool schemas match the MCP JSON Schema format
2. **Use OAuth 2.0 client credentials** for server-to-server agent authentication
3. **Implement table allowlisting** -- explicitly define which tables agents can access
4. **Never expose sensitive tables** -- block access to credential, certificate, and password tables
5. **Rate limit aggressively** -- AI agents can generate high request volumes
6. **Log all interactions** -- maintain audit trail for security and debugging
7. **Return display values** -- agents work better with human-readable data
8. **Implement pagination** -- use cursor-based pagination for large result sets
9. **Version your API** -- include version in resource path for backward compatibility
10. **Test with multiple agent platforms** -- ensure compatibility across Claude, ChatGPT, etc.

## Troubleshooting

| Issue | Cause | Resolution |
|-------|-------|------------|
| 401 Unauthorized | OAuth token expired or invalid | Refresh token; verify client credentials; check token lifetime |
| 403 Forbidden | User lacks table or API ACL | Verify roles assigned to OAuth user; check table ACLs |
| Tool not found | Tool name mismatch between client and server | Verify tool names in tools/list response match client configuration |
| Empty results | Query syntax incorrect or no matching records | Test query in ServiceNow directly; check encoded query syntax |
| Timeout on large queries | Query returns too many records | Reduce limit; add more specific query conditions |
| Script error in tool handler | Runtime exception in Script Include | Check system logs (syslog); add error handling in handler scripts |

## Examples

### Example 1: Basic Read-Only MCP Server

**Scenario:** Set up a minimal MCP server for read-only incident querying.

Tools exposed:
- `sn_query_incidents` - Search incidents
- `sn_read_incident` - Get incident details
- `sn_search_kb` - Search knowledge base

### Example 2: Full ITSM MCP Server

**Scenario:** Complete ITSM MCP server with create/update capabilities.

Tools exposed:
- Query: incidents, changes, problems, CIs
- Create: incidents, change requests
- Update: incident state, assignment, priority
- Actions: add work notes, trigger flows
- Knowledge: search and retrieve KB articles

### Example 3: Scoped MCP Server for HR

**Scenario:** Department-scoped MCP server for HR service delivery.

Tools exposed:
- `hr_query_cases` - Search HR cases (filtered to requester's own cases)
- `hr_create_case` - Submit new HR case
- `hr_search_policies` - Search HR policy knowledge base
- `hr_check_benefits` - Query benefits enrollment status

Access controls:
- Only hr_case table accessible
- Users can only see their own cases
- Create limited to specific case categories

## Related Skills

- `development/scripted-rest-apis` - Building REST APIs in ServiceNow
- `security/acl-management` - Configuring access control lists
- `admin/application-scope` - Scoped application development
- `genai/build-agent` - Building AI agents that consume MCP tools
- `genai/skill-kit-custom` - Custom Now Assist skill development
