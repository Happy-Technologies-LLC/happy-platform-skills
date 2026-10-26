---
name: acl-management
version: 1.0.2
description: Complete access control list management - understanding ACL structure, creating/modifying ACLs, troubleshooting permission issues, and debugging techniques
author: Happy Technologies LLC
tags: [security, acl, access-control, permissions, authorization, rbac]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp:
    - SN-Query-Table
    - SN-Create-Record
    - SN-Update-Record
    - SN-Execute-Background-Script
    - SN-Discover-Table-Schema
    - SN-Get-Table-Schema
  rest:
    - /api/now/table/sys_security_acl
    - /api/now/table/sys_security_acl_role
    - /api/now/table/sys_user_has_role
    - /api/now/table/sys_user_grmember
  native:
    - Bash
complexity: advanced
estimated_time: 30-60 minutes
---

# ACL Management

## Overview

Access Control Lists (ACLs) are the foundation of ServiceNow security. This skill covers:

- Understanding ACL structure and inheritance hierarchy
- Creating new ACLs for tables, fields, and records
- Modifying existing ACL rules safely
- Troubleshooting permission issues
- ACL debugging techniques and tools
- Best practices for role-based access control

**When to use:**
- Setting up security for new tables or applications
- Troubleshooting "access denied" issues
- Implementing field-level security
- Auditing and reviewing existing permissions
- Implementing row-level security (query conditions)

## Prerequisites

- **Roles:** `security_admin` or `admin`
- **Access:** sys_security_acl, sys_security_acl_role tables
- **Knowledge:** Understanding of ServiceNow roles and user groups
- **Plugins:** Core platform (ACLs are built-in)

## ACL Fundamentals

### ACL Hierarchy

```
                    ┌─────────────────┐
                    │  Table ACL (*)  │  ← Broadest
                    │  incident.*     │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │  Table.Field    │  ← Field-specific
                    │  incident.state │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │ Table.None      │  ← Row-level
                    │ (with script)   │
                    └─────────────────┘  ← Most specific
```

### ACL Operations

| Operation | Purpose | Common Use |
|-----------|---------|------------|
| `read` | View records/fields | List, form display |
| `write` | Modify records/fields | Form editing |
| `create` | Insert new records | New record creation |
| `delete` | Remove records | Record deletion |
| `execute` | Run scripts/actions | UI actions, processors |

### ACL Evaluation Order

1. **Most specific wins:** Field ACL > Table ACL
2. **First match:** Evaluation stops at first matching ACL
3. **Deny by default:** No matching ACL = access denied
4. **Admin bypass:** Admin role bypasses most ACLs

## Procedure

### Phase 1: Understanding Existing ACLs

#### 1.1 Query ACLs for a Table

**Find all ACLs for a specific table:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_security_acl
  query: nameLIKEincident
  fields: name,operation,type,condition,script,active
  limit: 50
```

**Find ACLs by operation type:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_security_acl
  query: name=incident^operation=write
  fields: name,operation,admin_overrides,condition,script,active
  limit: 20
```

#### 1.2 Discover ACL Structure

**Get the ACL table schema:**
```
Tool: SN-Get-Table-Schema
Parameters:
  table_name: sys_security_acl
```

**Key ACL Fields:**

| Field | Type | Purpose |
|-------|------|---------|
| `name` | String | Table.field or Table.* |
| `operation` | Choice | read, write, create, delete, execute |
| `type` | Choice | record, client_callable_script_include |
| `condition` | Condition | Filter conditions for row-level security |
| `script` | Script | Advanced condition logic |
| `admin_overrides` | Boolean | Allow admin bypass |
| `active` | Boolean | ACL is enforced |
| `advanced` | Boolean | Uses script conditions |

#### 1.3 Check ACL Role Requirements

**Find roles required for an ACL:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_security_acl_role
  query: acl.name=incident.*^acl.operation=write
  fields: acl.name,acl.operation,role.name
  limit: 20
```

### Phase 2: Creating New ACLs

#### 2.1 Create Table-Level ACL

**Create read ACL for custom table:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_security_acl
  data:
    name: "u_custom_table.*"
    operation: read
    type: record
    admin_overrides: true
    active: true
    description: "Read access to custom table"
```

**Add role requirement:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_security_acl_role
  data:
    acl: [acl_sys_id]
    role: [role_sys_id]
```

#### 2.2 Create Field-Level ACL

**Protect a sensitive field:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_security_acl
  data:
    name: "u_custom_table.ssn_number"
    operation: read
    type: record
    admin_overrides: true
    active: true
    description: "Restrict SSN field to authorized users only"
```

**Add multiple role requirements:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_user_role
  query: nameINhr_admin,security_admin
  fields: sys_id,name
  limit: 10
```

Then for each role:
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_security_acl_role
  data:
    acl: [field_acl_sys_id]
    role: [hr_admin_role_sys_id]
```

#### 2.3 Create Row-Level ACL (Condition-Based)

**Users can only see their own records:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_security_acl
  data:
    name: "u_custom_table"
    operation: read
    type: record
    condition: "opened_by=javascript:gs.getUserID()"
    admin_overrides: true
    active: true
    description: "Users can only read their own records"
```

#### 2.4 Create Script-Based ACL

**Complex logic requiring script:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_security_acl
  data:
    name: "u_custom_table"
    operation: write
    type: record
    advanced: true
    script: |
      // Allow write if user is the owner OR is in the assigned group
      var userId = gs.getUserID();
      var userGroups = gs.getUser().getMyGroups();

      if (current.owner == userId) {
        answer = true;
      } else if (userGroups.indexOf(current.assignment_group.toString()) >= 0) {
        answer = true;
      } else {
        answer = false;
      }
    admin_overrides: true
    active: true
    description: "Allow write for owner or group members"
```

### Phase 3: Modifying ACLs Safely

#### 3.1 Deactivate Before Major Changes

**Deactivate ACL temporarily:**
```
Tool: SN-Update-Record
Parameters:
  table_name: sys_security_acl
  sys_id: [acl_sys_id]
  data:
    active: false
```

**Make changes:**
```
Tool: SN-Update-Record
Parameters:
  table_name: sys_security_acl
  sys_id: [acl_sys_id]
  data:
    condition: "state!=6^ORassigned_to=javascript:gs.getUserID()"
    description: "Updated condition - users can access non-closed or own records"
```

**Reactivate after testing:**
```
Tool: SN-Update-Record
Parameters:
  table_name: sys_security_acl
  sys_id: [acl_sys_id]
  data:
    active: true
```

#### 3.2 Add/Remove Role Requirements

**Add a new role requirement:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_security_acl_role
  data:
    acl: [acl_sys_id]
    role: [new_role_sys_id]
```

**Remove a role requirement:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_security_acl_role
  query: acl=[acl_sys_id]^role=[role_sys_id]
  fields: sys_id

# Then delete the record using SN-Update-Record or background script
```

### Phase 4: Troubleshooting Permission Issues

#### 4.1 Identify the Blocking ACL

**Enable ACL Debugging (Session-Based):**
```
Tool: SN-Execute-Background-Script
Parameters:
  script: |
    // This enables debug output for the session
    // Run manually: Navigate to User menu > Impersonate > Check security
    gs.info('To debug ACLs:');
    gs.info('1. Navigate to System Security > Debugging');
    gs.info('2. Or add ?sysparm_security_debug=true to URL');
    gs.info('3. Or impersonate user and check security diagnostics');
  description: "ACL debugging instructions"
```

**Check user's roles:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_user_has_role
  query: user=[user_sys_id]^role.name!=snc_internal
  fields: role.name,granted_by,inherited
  limit: 50
```

**Check user's groups:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_user_grmember
  query: user=[user_sys_id]
  fields: group.name,group.sys_id
  limit: 50
```

#### 4.2 Trace ACL Evaluation

**Find which ACL applies:**
```
Tool: SN-Execute-Background-Script
Parameters:
  script: |
    var table = 'incident';
    var operation = 'write';
    var fieldName = 'state'; // or '*' for table-level

    var acl = new GlideRecord('sys_security_acl');
    acl.addQuery('name', 'CONTAINS', table);
    acl.addQuery('operation', operation);
    acl.addQuery('active', true);
    acl.orderBy('name');
    acl.query();

    gs.info('ACLs for ' + table + '.' + fieldName + ' (' + operation + '):');
    while (acl.next()) {
      var roles = [];
      var roleGr = new GlideRecord('sys_security_acl_role');
      roleGr.addQuery('acl', acl.sys_id);
      roleGr.query();
      while (roleGr.next()) {
        roles.push(roleGr.role.name.toString());
      }

      gs.info(acl.name + ' - Roles: [' + roles.join(', ') + '] - Condition: ' + acl.condition);
    }
  description: "Trace ACL evaluation for table/operation"
```

#### 4.3 Test User Access

**Check if user has required roles:**
```
Tool: SN-Execute-Background-Script
Parameters:
  script: |
    var userId = '[user_sys_id]';
    var requiredRoles = ['itil', 'incident_manager'];

    var user = new GlideRecord('sys_user');
    user.get(userId);

    gs.info('Checking roles for: ' + user.user_name);

    for (var i = 0; i < requiredRoles.length; i++) {
      var hasRole = new GlideRecord('sys_user_has_role');
      hasRole.addQuery('user', userId);
      hasRole.addQuery('role.name', requiredRoles[i]);
      hasRole.query();

      if (hasRole.hasNext()) {
        gs.info('  HAS: ' + requiredRoles[i]);
      } else {
        gs.warn('  MISSING: ' + requiredRoles[i]);
      }
    }
  description: "Check user role membership"
```

#### 4.4 Common Permission Issues

**Issue: User can see table but not specific records**
```
# Check for row-level ACL conditions
Tool: SN-Query-Table
Parameters:
  table_name: sys_security_acl
  query: name=[table_name]^operation=read^conditionISNOTEMPTY
  fields: name,condition,script
```

**Issue: User can read but not write**
```
# Compare read vs write ACLs
Tool: SN-Query-Table
Parameters:
  table_name: sys_security_acl
  query: nameLIKE[table_name]^operationINread,write
  fields: name,operation,condition
  limit: 20
```

**Issue: Field is read-only unexpectedly**
```
# Check field-level ACLs
Tool: SN-Query-Table
Parameters:
  table_name: sys_security_acl
  query: name=[table_name].[field_name]^operation=write
  fields: name,operation,condition,active
```

### Phase 5: ACL Debugging Tools

#### 5.1 Security Diagnostic Tool

**Run security diagnostic for a record:**
```
Tool: SN-Execute-Background-Script
Parameters:
  script: |
    var table = 'incident';
    var sysId = '[record_sys_id]';
    var userId = '[user_sys_id]';

    // Impersonate and check access
    var gr = new GlideRecord(table);
    gr.get(sysId);

    var canRead = gr.canRead();
    var canWrite = gr.canWrite();
    var canDelete = gr.canDelete();

    gs.info('Security Diagnostic for ' + table + '/' + sysId);
    gs.info('  Can Read: ' + canRead);
    gs.info('  Can Write: ' + canWrite);
    gs.info('  Can Delete: ' + canDelete);

    // Check field-level access
    var elements = ['state', 'priority', 'assigned_to'];
    for (var i = 0; i < elements.length; i++) {
      var field = elements[i];
      gs.info('  Field ' + field + ' - canRead: ' + gr[field].canRead() +
              ', canWrite: ' + gr[field].canWrite());
    }
  description: "Run security diagnostic on record"
```

#### 5.2 ACL Rule Analyzer

**Analyze all ACLs for conflicts:**
```
Tool: SN-Execute-Background-Script
Parameters:
  script: |
    var table = 'incident';
    var analysis = {
      table_acls: [],
      field_acls: [],
      potential_conflicts: []
    };

    var acl = new GlideRecord('sys_security_acl');
    acl.addQuery('name', 'STARTSWITH', table);
    acl.addQuery('active', true);
    acl.orderBy('name');
    acl.query();

    while (acl.next()) {
      var aclInfo = {
        name: acl.name.toString(),
        operation: acl.operation.toString(),
        has_condition: acl.condition.toString() !== '',
        has_script: acl.advanced.toString() === 'true'
      };

      if (acl.name.toString().indexOf('.') === -1 ||
          acl.name.toString().endsWith('.*')) {
        analysis.table_acls.push(aclInfo);
      } else {
        analysis.field_acls.push(aclInfo);
      }
    }

    // Check for potential issues
    if (analysis.table_acls.length === 0) {
      analysis.potential_conflicts.push('No table-level ACLs - may be too open or rely on inheritance');
    }

    gs.info('ACL Analysis for ' + table + ':\n' + JSON.stringify(analysis, null, 2));
  description: "Analyze ACLs for conflicts and issues"
```

#### 5.3 Role Elevation Check

**Find users with potentially dangerous role combinations:**
```
Tool: SN-Execute-Background-Script
Parameters:
  script: |
    var dangerousCombos = [
      ['admin', 'maint'],
      ['security_admin', 'personalize_dictionary'],
      ['admin', 'soap']
    ];

    var findings = [];

    for (var i = 0; i < dangerousCombos.length; i++) {
      var combo = dangerousCombos[i];

      var users = new GlideRecord('sys_user');
      users.addQuery('active', true);
      users.query();

      while (users.next()) {
        var hasAll = true;
        for (var j = 0; j < combo.length; j++) {
          var roleCheck = new GlideRecord('sys_user_has_role');
          roleCheck.addQuery('user', users.sys_id);
          roleCheck.addQuery('role.name', combo[j]);
          roleCheck.query();
          if (!roleCheck.hasNext()) {
            hasAll = false;
            break;
          }
        }

        if (hasAll) {
          findings.push({
            user: users.user_name.toString(),
            roles: combo
          });
        }
      }
    }

    if (findings.length > 0) {
      gs.warn('Users with dangerous role combinations:');
      gs.info(JSON.stringify(findings, null, 2));
    } else {
      gs.info('No dangerous role combinations found');
    }
  description: "Find users with dangerous role combinations"
```

## Best Practices

### Design Principles

1. **Principle of Least Privilege:** Grant minimum access needed
2. **Role-Based Access:** Use roles, not individual users
3. **Inherit When Possible:** Use table-level ACLs as baseline
4. **Document Everything:** Add descriptions to all ACLs
5. **Test Thoroughly:** Verify with multiple user roles

### Common Patterns

**Pattern 1: Owner + Group Access**
```javascript
// Condition for owner or group member access
opened_by=javascript:gs.getUserID()^ORassignment_group.memberSOME=javascript:gs.getUserID()
```

**Pattern 2: Hierarchical Access**
```javascript
// Managers can see their team's records
var mgr = new GlideRecord('sys_user');
mgr.addQuery('manager', gs.getUserID());
mgr.query();
var users = [gs.getUserID()];
while (mgr.next()) users.push(mgr.sys_id.toString());
answer = gs.getUser().getID() in users.join(',').split(',');
```

**Pattern 3: Time-Based Access**
```javascript
// Only allow access during business hours
var now = new GlideDateTime();
var hour = now.getLocalTime().getHourOfDay();
answer = (hour >= 8 && hour < 18);
```

## Tool Usage Summary

| Operation | MCP Tool | REST Endpoint |
|-----------|----------|---------------|
| Query ACLs | SN-Query-Table | GET /sys_security_acl |
| Create ACL | SN-Create-Record | POST /sys_security_acl |
| Update ACL | SN-Update-Record | PATCH /sys_security_acl |
| Add Role | SN-Create-Record | POST /sys_security_acl_role |
| Debug ACL | SN-Execute-Background-Script | POST /sys.scripts.do |
| Check Schema | SN-Get-Table-Schema | GET /sys_dictionary |

## Troubleshooting

### ACL Not Being Evaluated

**Symptom:** Changes to ACL have no effect
**Cause:** ACL cache not cleared or ACL inactive
**Solution:**
```
Tool: SN-Execute-Background-Script
Parameters:
  script: |
    // Clear ACL cache
    GlideAccessControl.reset();
    gs.info('ACL cache cleared');
  description: "Clear ACL cache"
```

### Admin Can't Access Record

**Symptom:** Admin role blocked from record
**Cause:** ACL has admin_overrides=false
**Solution:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_security_acl
  query: name=[table]^admin_overrides=false
  fields: name,operation,admin_overrides
```

### Script ACL Always Fails

**Symptom:** Script-based ACL never grants access
**Cause:** Script error or incorrect answer variable
**Solution:**
- Verify script sets `answer = true` or `answer = false`
- Check for script errors in syslog
- Ensure `advanced = true` is set

### Role Not Granting Access

**Symptom:** User has role but still denied
**Cause:** ACL requires multiple roles (AND) or condition fails
**Solution:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_security_acl_role
  query: acl=[acl_sys_id]
  fields: role.name
```
All listed roles are required (AND logic by default).

## Examples

### Example 1: Secure a Custom Table

```
# Step 1: Create table-level read ACL
Tool: SN-Create-Record
Parameters:
  table_name: sys_security_acl
  data:
    name: "u_employee_data.*"
    operation: read
    type: record
    admin_overrides: true
    active: true
    description: "Base read access to employee data"

# Step 2: Add role requirement
Tool: SN-Create-Record
Parameters:
  table_name: sys_security_acl_role
  data:
    acl: [step1_sys_id]
    role: [hr_user_role_sys_id]

# Step 3: Create write ACL (more restrictive)
Tool: SN-Create-Record
Parameters:
  table_name: sys_security_acl
  data:
    name: "u_employee_data.*"
    operation: write
    type: record
    admin_overrides: true
    active: true
    description: "Write access to employee data - HR admins only"

# Step 4: Add admin role requirement
Tool: SN-Create-Record
Parameters:
  table_name: sys_security_acl_role
  data:
    acl: [step3_sys_id]
    role: [hr_admin_role_sys_id]
```

### Example 2: Field-Level SSN Protection

```
# Protect SSN field - only security cleared users
Tool: SN-Create-Record
Parameters:
  table_name: sys_security_acl
  data:
    name: "u_employee_data.ssn"
    operation: read
    type: record
    admin_overrides: false
    active: true
    description: "SSN access restricted - security clearance required"

# Add special role
Tool: SN-Create-Record
Parameters:
  table_name: sys_security_acl_role
  data:
    acl: [ssn_acl_sys_id]
    role: [security_cleared_role_sys_id]
```

## Related Skills

- `security/audit-compliance` - Auditing ACL changes
- `security/incident-response` - Responding to access violations
- `security/data-classification` - Identifying what needs protection
- `admin/user-provisioning` - Managing user roles

## References

- [ServiceNow ACL Documentation](https://docs.servicenow.com/bundle/utah-platform-administration/page/administer/security/concept/access-control-rules.html)
- [ACL Debugging](https://docs.servicenow.com/bundle/utah-platform-administration/page/administer/security/task/debug-access-control-rules.html)
- [Security Best Practices](https://developer.servicenow.com/dev.do#!/guides/utah/now-platform/security-best-practices)
- [Role-Based Access Control](https://www.nist.gov/news-events/news/2010/06/nist-releases-guidelines-role-based-access-control)
