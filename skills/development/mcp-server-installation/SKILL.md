---
name: mcp-server-installation
version: 1.0.0
description: Install and configure Happy Platform MCP for ServiceNow, including npm/source setup, single or multi-instance credentials, agent connection, and smoke testing
author: Happy Technologies LLC
tags: [development, mcp, installation, servicenow, happy-platform-mcp, claude-desktop, agents, configuration, authentication]
platforms: [claude-code, claude-desktop, cursor, any]
tools:
  cli:
    - npx happy-platform-mcp
    - npm install
    - npm install -g happy-platform-mcp
    - git clone
    - curl
  native:
    - Bash
    - Read
    - Write
complexity: intermediate
estimated_time: 10-30 minutes
---

# Happy Platform MCP Installation

## Overview

This skill installs and connects [Happy Platform MCP](https://github.com/Happy-Technologies-LLC/happy-platform-mcp), the ServiceNow Model Context Protocol server used by Happy Platform Skills.

Use it when a user asks to:

- Install `happy-platform-mcp`
- Configure ServiceNow MCP credentials
- Add Happy Platform MCP to Claude Desktop or another MCP-capable agent
- Set up single-instance or multi-instance ServiceNow access
- Verify MCP tools such as `SN-Query-Table`, `SN-NL-Search`, or `SN-Execute-Background-Script`
- Migrate from the older `servicenow-mcp-server` package name

For designing or building a custom MCP server inside ServiceNow, use `development/mcp-server` instead. For ServiceNow metadata-as-code with NowSDK Fluent, use `development/fluent-sdk`.

## Prerequisites

- Node.js 18 or newer
- One or more ServiceNow instances with REST API access
- A ServiceNow user or OAuth client with the roles needed for the intended tools
- An MCP-capable client, such as Claude Desktop or an agent runtime that supports stdio MCP servers
- Permission to edit the local agent MCP configuration

## Procedure

### Step 1: Choose Install Mode

Use npm for most users:

```bash
npx -y happy-platform-mcp
```

Use a global install when the user wants a pinned local command:

```bash
npm install -g happy-platform-mcp
happy-platform-mcp
```

Use source install when developing or debugging the server:

```bash
git clone https://github.com/Happy-Technologies-LLC/happy-platform-mcp.git
cd happy-platform-mcp
npm install
```

If the user has the old package installed, migrate it:

```bash
npm uninstall -g servicenow-mcp-server
npm install -g happy-platform-mcp
```

### Step 2: Configure ServiceNow Credentials

For a single instance, configure environment variables in the MCP client config:

```json
{
  "SERVICENOW_INSTANCE_URL": "https://your-instance.service-now.com",
  "SERVICENOW_USERNAME": "your-username",
  "SERVICENOW_PASSWORD": "your-password"
}
```

For OAuth, add the auth type and client credentials:

```json
{
  "SERVICENOW_INSTANCE_URL": "https://your-instance.service-now.com",
  "SERVICENOW_AUTH_TYPE": "oauth",
  "SERVICENOW_CLIENT_ID": "your-client-id",
  "SERVICENOW_CLIENT_SECRET": "your-client-secret"
}
```

For multi-instance routing from a source install, copy and edit the instance config:

```bash
cp config/servicenow-instances.json.example config/servicenow-instances.json
```

Use this shape:

```json
{
  "instances": [
    {
      "name": "dev",
      "url": "https://dev123456.service-now.com",
      "username": "admin",
      "password": "your-password",
      "default": true
    },
    {
      "name": "prod",
      "url": "https://prod789012.service-now.com",
      "authType": "oauth",
      "grantType": "client_credentials",
      "clientId": "your-oauth-client-id",
      "clientSecret": "your-oauth-client-secret"
    }
  ]
}
```

Never commit real credentials. Keep `.env`, `servicenow-instances.json`, and local agent config files out of shared repositories unless they are sanitized examples.

### Step 3: Connect Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json` on macOS.

For npm-based stdio:

```json
{
  "mcpServers": {
    "happy-platform-mcp": {
      "command": "npx",
      "args": ["-y", "happy-platform-mcp"],
      "env": {
        "SERVICENOW_INSTANCE_URL": "https://your-instance.service-now.com",
        "SERVICENOW_USERNAME": "your-username",
        "SERVICENOW_PASSWORD": "your-password"
      }
    }
  }
}
```

For source-based stdio:

```json
{
  "mcpServers": {
    "happy-platform-mcp": {
      "command": "node",
      "args": ["/absolute/path/to/happy-platform-mcp/src/stdio-server.js"],
      "cwd": "/absolute/path/to/happy-platform-mcp"
    }
  }
}
```

Restart Claude Desktop after editing the file.

### Step 4: Connect Other Agents

Use stdio transport unless the client explicitly asks for HTTP/SSE:

```json
{
  "command": "npx",
  "args": ["-y", "happy-platform-mcp"],
  "env": {
    "SERVICENOW_INSTANCE_URL": "https://your-instance.service-now.com",
    "SERVICENOW_USERNAME": "your-username",
    "SERVICENOW_PASSWORD": "your-password"
  }
}
```

If configuring Codex, Cursor, or another client, inspect that client's current MCP config format first and preserve existing servers. Do not overwrite unrelated MCP entries.

### Step 5: Verify the Server

For source installs using HTTP/SSE transport:

```bash
npm run dev
curl http://localhost:3000/health
curl http://localhost:3000/instances
```

For stdio agent installs, restart the agent and confirm ServiceNow tools are listed. Then run a read-only smoke test:

```json
{
  "tool": "SN-Query-Table",
  "arguments": {
    "table_name": "incident",
    "query": "active=true",
    "fields": "number,short_description,state",
    "limit": 1
  }
}
```

For multi-instance configurations, test explicit routing:

```json
{
  "tool": "SN-Query-Table",
  "arguments": {
    "instance": "dev",
    "table_name": "sys_user",
    "query": "active=true",
    "fields": "user_name,name",
    "limit": 1
  }
}
```

### Step 6: Confirm Skill Integration

After the MCP server is working, use these skills with the live tools:

- `itsm/incident-triage` for incident routing
- `admin/script-execution` for background scripts and fix scripts
- `admin/update-set-management` for update set operations
- `development/fluent-sdk` for hybrid NowSDK plus MCP development

## Best Practices

- Start with a read-only user or a non-production instance, then expand roles as needed.
- Prefer OAuth client credentials for shared production integrations.
- Use clear instance names such as `dev`, `test`, `uat`, and `prod`.
- Keep destructive tools restricted to trusted users and non-production defaults.
- Validate with `SN-Query-Table` before testing create, update, script, or update set tools.
- Keep the MCP package current unless a deployment requires a pinned version.

## Troubleshooting

### Package Command Fails

**Symptom:** `npx happy-platform-mcp` cannot find or start the package.

**Cause:** Node.js is missing, too old, or npm cannot fetch the package.

**Solution:** Verify `node --version` is 18 or newer, then retry with `npx -y happy-platform-mcp`. If needed, install globally with `npm install -g happy-platform-mcp`.

### Agent Does Not Show Tools

**Symptom:** The MCP server appears configured, but no `SN-*` tools are available.

**Cause:** The agent was not restarted, the config JSON is invalid, or the command path is wrong.

**Solution:** Validate the JSON, restart the agent, and use absolute paths for source installs.

### Authentication Fails

**Symptom:** Tools return 401 or invalid credentials errors.

**Cause:** Incorrect username/password, OAuth client details, grant type, or ServiceNow roles.

**Solution:** Verify credentials against the instance URL, confirm the OAuth Application Registry values, and test with a low-risk read query.

### Multi-Instance Routing Fails

**Symptom:** Passing `"instance": "prod"` does not route to the expected instance.

**Cause:** The instance name is missing, misspelled, or the config file is not being loaded from the server working directory.

**Solution:** Check `config/servicenow-instances.json`, ensure exactly one default instance, and set `cwd` to the source repo when using source-based stdio.

## Related Skills

- `development/mcp-server` - Design or build MCP server capabilities
- `development/fluent-sdk` - Use NowSDK Fluent with MCP runtime verification
- `admin/instance-management` - Work across multiple ServiceNow instances
- `admin/script-execution` - Execute server-side scripts through MCP
