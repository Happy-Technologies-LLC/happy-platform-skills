---
name: spoke-generation
version: 1.0.0
description: Generate Integration Hub spokes for connecting external services including spoke actions, connection aliases, data transformations, error handling, and REST/SOAP integrations
author: Happy Technologies LLC
tags: [genai, spoke, integration-hub, connection-alias, REST, SOAP, actions, data-transformation]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp:
    - SN-Query-Table
    - SN-Create-Record
    - SN-Update-Record
    - SN-Get-Table-Schema
  rest:
    - /api/now/table/sys_spoke
    - /api/now/table/sys_hub_action_type_definition
    - /api/now/table/sys_connection_alias
    - /api/now/table/sys_alias_credential
    - /api/now/table/sys_hub_action_input
    - /api/now/table/sys_hub_action_output
    - /api/now/table/sys_hub_rest_step
    - /api/now/table/sys_hub_script_step
    - /api/now/table/sys_hub_flow_input
  native:
    - Bash
complexity: advanced
estimated_time: 45-90 minutes
---

# Integration Hub Spoke Generation

## Overview

This skill covers generating ServiceNow Integration Hub spokes for connecting to external services:

- Creating spoke containers to organize related integration actions
- Building spoke actions with REST, SOAP, and scripted steps
- Configuring connection aliases for secure credential management
- Defining action inputs and outputs with proper data typing
- Implementing data transformations between ServiceNow and external formats
- Adding error handling and retry logic for resilient integrations
- Packaging spokes for deployment across instances

**When to use:** When building reusable integrations with external APIs, creating custom connectors for third-party services, or packaging integration logic into deployable spokes.

## Prerequisites

- **Roles:** `integration_admin`, `flow_designer`, or `admin`
- **Plugins:** `com.glide.hub.flow_designer` (Flow Designer), `com.glide.hub.integration` (Integration Hub)
- **Access:** sys_spoke, sys_hub_action_type_definition, sys_connection_alias tables
- **Knowledge:** REST/SOAP API fundamentals, JSON/XML data formats, OAuth and basic authentication
- **Related Skills:** `genai/flow-generation` for consuming spokes in flows

## Procedure

### Step 1: Analyze the Integration Requirements

Parse the integration request to identify:
- **External service**: What system or API to connect to (Slack, Jira, Salesforce, custom REST)
- **Operations**: What actions the spoke should support (create, read, update, delete, query)
- **Authentication**: How to authenticate (OAuth 2.0, Basic Auth, API Key, mutual TLS)
- **Data format**: Request/response format (JSON, XML, form-encoded)
- **Error handling**: Expected error codes and retry behavior

### Step 2: Query Existing Spokes for Patterns

**MCP Approach:**
```
Use SN-Query-Table on sys_spoke:
  - query: active=true
  - fields: sys_id,name,description,scope,logo,active
  - limit: 20
```

Query existing spoke actions:
```
Use SN-Query-Table on sys_hub_action_type_definition:
  - query: spoke=<spoke_sys_id>^active=true
  - fields: sys_id,name,description,action_type,inputs,outputs
  - limit: 20
```

**REST Approach:**
```
GET /api/now/table/sys_spoke
  ?sysparm_query=active=true
  &sysparm_fields=sys_id,name,description,scope,active
  &sysparm_limit=20
```

### Step 3: Create the Spoke Record

**MCP Approach:**
```
Use SN-Create-Record on sys_spoke:
  - name: "Acme CRM Spoke"
  - description: "Integration spoke for Acme CRM REST API - supports contacts, deals, and activities"
  - scope: "x_acme_crm"
  - logo: ""
  - active: true
  - version: "1.0.0"
```

**REST Approach:**
```
POST /api/now/table/sys_spoke
Body: {
  "name": "Acme CRM Spoke",
  "description": "Integration spoke for Acme CRM REST API - supports contacts, deals, and activities",
  "scope": "x_acme_crm",
  "active": true,
  "version": "1.0.0"
}
```

### Step 4: Create Connection Alias

Connection aliases provide secure, reusable credential storage.

**Connection Alias Types:**

| Type | Value | Use Case |
|------|-------|----------|
| HTTP Connection | http_connection | REST/SOAP API credentials |
| JDBC Connection | jdbc_connection | Database connections |
| LDAP Connection | ldap_connection | Directory services |
| Custom | custom | Non-standard authentication |

**MCP Approach:**
```
Use SN-Create-Record on sys_connection_alias:
  - name: "Acme CRM API"
  - connection_type: "http_connection"
  - description: "Connection alias for Acme CRM REST API"
  - active: true
  - scope: "x_acme_crm"
  - spoke: "<spoke_sys_id>"
```

**REST Approach:**
```
POST /api/now/table/sys_connection_alias
Body: {
  "name": "Acme CRM API",
  "connection_type": "http_connection",
  "description": "Connection alias for Acme CRM REST API",
  "active": true,
  "scope": "x_acme_crm",
  "spoke": "<spoke_sys_id>"
}
```

**Configure Credential (Basic Auth):**
```
Use SN-Create-Record on sys_alias_credential:
  - connection_alias: "<connection_alias_sys_id>"
  - type: "basic_auth"
  - user_name: "${connection.username}"
  - password: "${connection.password}"
  - active: true
```

**Configure Credential (OAuth 2.0):**
```
Use SN-Create-Record on sys_alias_credential:
  - connection_alias: "<connection_alias_sys_id>"
  - type: "oauth2"
  - oauth_profile: "<oauth_profile_sys_id>"
  - active: true
```

### Step 5: Create Spoke Actions

Each action represents an operation the spoke can perform.

**MCP Approach:**
```
Use SN-Create-Record on sys_hub_action_type_definition:
  - name: "Create Contact"
  - description: "Creates a new contact in Acme CRM"
  - spoke: "<spoke_sys_id>"
  - action_type: "custom"
  - category: "x_acme_crm"
  - access: "public"
  - active: true
  - annotation: "Creates a contact record in external CRM system"
```

```
Use SN-Create-Record on sys_hub_action_type_definition:
  - name: "Get Contact"
  - description: "Retrieves a contact by ID from Acme CRM"
  - spoke: "<spoke_sys_id>"
  - action_type: "custom"
  - category: "x_acme_crm"
  - access: "public"
  - active: true
```

```
Use SN-Create-Record on sys_hub_action_type_definition:
  - name: "Search Contacts"
  - description: "Searches contacts in Acme CRM by criteria"
  - spoke: "<spoke_sys_id>"
  - action_type: "custom"
  - category: "x_acme_crm"
  - access: "public"
  - active: true
```

**REST Approach:**
```
POST /api/now/table/sys_hub_action_type_definition
Body: {
  "name": "Create Contact",
  "description": "Creates a new contact in Acme CRM",
  "spoke": "<spoke_sys_id>",
  "action_type": "custom",
  "category": "x_acme_crm",
  "access": "public",
  "active": true
}
```

### Step 6: Define Action Inputs

**MCP Approach:**
```
Use SN-Create-Record on sys_hub_action_input:
  - action_type: "<create_contact_action_sys_id>"
  - name: "first_name"
  - label: "First Name"
  - type: "string"
  - mandatory: true
  - order: 100
```

```
Use SN-Create-Record on sys_hub_action_input:
  - action_type: "<create_contact_action_sys_id>"
  - name: "last_name"
  - label: "Last Name"
  - type: "string"
  - mandatory: true
  - order: 200
```

```
Use SN-Create-Record on sys_hub_action_input:
  - action_type: "<create_contact_action_sys_id>"
  - name: "email"
  - label: "Email Address"
  - type: "string"
  - mandatory: true
  - order: 300
```

```
Use SN-Create-Record on sys_hub_action_input:
  - action_type: "<create_contact_action_sys_id>"
  - name: "company_id"
  - label: "Company ID"
  - type: "string"
  - mandatory: false
  - order: 400
```

**REST Approach:**
```
POST /api/now/table/sys_hub_action_input
Body: {
  "action_type": "<create_contact_action_sys_id>",
  "name": "email",
  "label": "Email Address",
  "type": "string",
  "mandatory": true,
  "order": 300
}
```

### Step 7: Add REST Steps to Actions

REST steps define the actual HTTP calls to external services.

**MCP Approach:**
```
Use SN-Create-Record on sys_hub_rest_step:
  - action_type: "<create_contact_action_sys_id>"
  - name: "Call Create Contact API"
  - order: 100
  - connection_alias: "<connection_alias_sys_id>"
  - http_method: "POST"
  - resource_path: "/api/v2/contacts"
  - content_type: "application/json"
  - request_body: '{
      "first_name": "${inputs.first_name}",
      "last_name": "${inputs.last_name}",
      "email": "${inputs.email}",
      "company_id": "${inputs.company_id}"
    }'
  - headers: '[{"name":"Accept","value":"application/json"}]'
```

**REST Approach:**
```
POST /api/now/table/sys_hub_rest_step
Body: {
  "action_type": "<create_contact_action_sys_id>",
  "name": "Call Create Contact API",
  "order": 100,
  "connection_alias": "<connection_alias_sys_id>",
  "http_method": "POST",
  "resource_path": "/api/v2/contacts",
  "content_type": "application/json",
  "request_body": "{\"first_name\":\"${inputs.first_name}\",\"last_name\":\"${inputs.last_name}\",\"email\":\"${inputs.email}\"}"
}
```

**GET Request Example:**
```
Use SN-Create-Record on sys_hub_rest_step:
  - action_type: "<get_contact_action_sys_id>"
  - name: "Call Get Contact API"
  - order: 100
  - connection_alias: "<connection_alias_sys_id>"
  - http_method: "GET"
  - resource_path: "/api/v2/contacts/${inputs.contact_id}"
  - content_type: "application/json"
  - headers: '[{"name":"Accept","value":"application/json"}]'
```

### Step 8: Define Action Outputs

**MCP Approach:**
```
Use SN-Create-Record on sys_hub_action_output:
  - action_type: "<create_contact_action_sys_id>"
  - name: "contact_id"
  - label: "Contact ID"
  - type: "string"
  - order: 100
```

```
Use SN-Create-Record on sys_hub_action_output:
  - action_type: "<create_contact_action_sys_id>"
  - name: "status_code"
  - label: "HTTP Status Code"
  - type: "integer"
  - order: 200
```

```
Use SN-Create-Record on sys_hub_action_output:
  - action_type: "<create_contact_action_sys_id>"
  - name: "response_body"
  - label: "Response Body"
  - type: "string"
  - order: 300
```

### Step 9: Add Error Handling with Script Steps

**MCP Approach:**
```
Use SN-Create-Record on sys_hub_script_step:
  - action_type: "<create_contact_action_sys_id>"
  - name: "Handle Response"
  - order: 200
  - script: |
      (function execute(inputs, outputs) {
        var statusCode = inputs.rest_step_status_code;
        var responseBody = inputs.rest_step_response_body;

        if (statusCode == 201) {
          var response = JSON.parse(responseBody);
          outputs.contact_id = response.id;
          outputs.status_code = statusCode;
        } else if (statusCode == 409) {
          throw new Error('Contact already exists: ' + responseBody);
        } else if (statusCode == 429) {
          throw new Error('Rate limit exceeded. Retry after cooldown.');
        } else {
          throw new Error('API error ' + statusCode + ': ' + responseBody);
        }
      })(inputs, outputs);
```

### Step 10: Test and Publish the Spoke

**MCP Approach:**
```
Use SN-Update-Record on sys_spoke:
  - sys_id: "<spoke_sys_id>"
  - active: true
```

Verify all actions are properly configured:
```
Use SN-Query-Table on sys_hub_action_type_definition:
  - query: spoke=<spoke_sys_id>
  - fields: sys_id,name,active,action_type
  - limit: 50
```

Verify connection alias is available:
```
Use SN-Query-Table on sys_connection_alias:
  - query: spoke=<spoke_sys_id>
  - fields: sys_id,name,connection_type,active
```

## Tool Usage

| Tool | Purpose | When to Use |
|------|---------|-------------|
| SN-Query-Table | Find existing spokes and actions | Pattern discovery and validation |
| SN-Create-Record | Create spokes, actions, inputs, outputs, steps | Building spoke components |
| SN-Update-Record | Modify spoke settings, activate spokes | Editing and publishing |
| SN-Get-Table-Schema | Discover spoke table fields | Understanding available configurations |

## Best Practices

1. **One spoke per external service** -- avoid mixing multiple APIs in a single spoke
2. **Use connection aliases** for all credentials -- never hardcode secrets in scripts or REST steps
3. **Define comprehensive inputs/outputs** with clear labels and proper data types
4. **Always add error handling** -- parse HTTP status codes and provide meaningful error messages
5. **Implement retry logic** for transient failures (429, 503) using script steps
6. **Use pagination** for search/list actions to handle large result sets
7. **Version your API paths** in resource_path to support API evolution
8. **Log integration calls** for debugging with appropriate verbosity levels
9. **Test with mock data** before connecting to production external services
10. **Document rate limits** and throttling behavior in the spoke description

## Troubleshooting

| Issue | Cause | Resolution |
|-------|-------|------------|
| Connection test fails | Invalid credentials or URL in connection alias | Verify connection alias configuration and test connectivity |
| 401 Unauthorized | OAuth token expired or invalid credentials | Refresh OAuth token or update credential record |
| 403 Forbidden | API key lacks required permissions | Check external service permissions for the integration user |
| REST step timeout | External service slow or unreachable | Increase timeout on REST step or check network connectivity |
| Response parsing error | Unexpected response format from API | Add defensive JSON parsing in script step with try/catch |
| Action not visible in Flow Designer | Action access set to private or spoke inactive | Set access to "public" and verify spoke is active |
| Input data truncated | String field length limits | Use multi-line text type for large payloads |

## Examples

### Example 1: Slack Notification Spoke

Generate a spoke for sending Slack messages:
- **Action 1:** Send Message -- POST to /api/chat.postMessage with channel, text, attachments
- **Action 2:** Create Channel -- POST to /api/conversations.create with name, is_private
- **Action 3:** Upload File -- POST to /api/files.upload with channels, file content
- **Connection:** OAuth 2.0 with Slack Bot Token
- **Error Handling:** Handle rate limits (429), channel not found (channel_not_found)

### Example 2: Jira Integration Spoke

Generate a spoke for Jira Cloud operations:
- **Action 1:** Create Issue -- POST to /rest/api/3/issue with project, summary, description, issuetype
- **Action 2:** Get Issue -- GET /rest/api/3/issue/{issueKey} returning status, assignee, priority
- **Action 3:** Add Comment -- POST to /rest/api/3/issue/{issueKey}/comment with body
- **Action 4:** Transition Issue -- POST to /rest/api/3/issue/{issueKey}/transitions
- **Connection:** Basic Auth with API token, base URL configurable per instance

### Example 3: Custom REST API Spoke

Generate a spoke for a custom internal microservice:
- **Action 1:** Submit Order -- POST /api/v1/orders with line items, customer, shipping address
- **Action 2:** Check Order Status -- GET /api/v1/orders/{orderId} returning status, tracking number
- **Action 3:** Cancel Order -- DELETE /api/v1/orders/{orderId} with reason
- **Connection:** API Key authentication via custom header
- **Data Transform:** Map ServiceNow catalog variables to API request format

## Related Skills

- `genai/flow-generation` - Flow Designer flows that consume spoke actions
- `genai/playbook-generation` - Playbooks that call spoke actions as activities
- `catalog/approval-workflows` - Approval flows that may trigger external notifications
- `admin/connection-management` - Connection alias and credential configuration
