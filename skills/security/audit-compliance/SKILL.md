---
name: audit-compliance
version: 1.0.3
description: Comprehensive audit trail analysis, user activity tracking, compliance reporting, and anomaly detection for ServiceNow environments
author: Happy Technologies LLC
tags: [security, audit, compliance, monitoring, anomaly-detection, soc, governance]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp:
    - SN-Query-Table
    - SN-Natural-Language-Search
    - SN-Execute-Background-Script
    - SN-Create-Record
    - SN-Discover-Table-Schema
  rest:
    - /api/now/table/sys_audit
    - /api/now/table/syslog
    - /api/now/table/sys_audit_delete
    - /api/now/table/sysevent
  native:
    - Bash
complexity: advanced
estimated_time: 30-60 minutes
---

# Audit and Compliance

## Overview

This skill covers comprehensive audit and compliance capabilities in ServiceNow:

- Querying sys_audit table for configuration and data changes
- Tracking user activity across the platform
- Generating compliance reports for regulatory requirements
- Detecting anomalous patterns indicating security threats
- Building audit dashboards and alerts

**When to use:**
- Regular compliance audits (SOX, HIPAA, PCI-DSS, GDPR)
- Security investigations
- User activity forensics
- Change tracking and accountability
- Anomaly detection and alerting

## Prerequisites

- **Roles:** `security_admin`, `audit_admin`, or `admin`
- **Access:** sys_audit, syslog, sys_audit_delete tables
- **Knowledge:** Understanding of compliance frameworks applicable to your organization
- **Related Skills:** `security/incident-response` for handling detected anomalies

## Key Audit Tables

| Table | Purpose | Retention |
|-------|---------|-----------|
| `sys_audit` | Field-level change tracking | Configurable |
| `sys_audit_delete` | Deleted record tracking | Configurable |
| `syslog` | System and script logging | 7-90 days |
| `sysevent` | System events and triggers | Configurable |
| `syslog_transaction` | Transaction-level logging | 7 days |

## Procedure

### Phase 1: Audit Trail Queries

#### 1.1 Query Recent Changes to Critical Tables

**Identify changes to user accounts:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_audit
  query: tablename=sys_user^sys_created_onONLast 24 hours
  fields: documentkey,fieldname,oldvalue,newvalue,user,sys_created_on
  limit: 200
```

**Track role assignments:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_audit
  query: tablename=sys_user_has_role^sys_created_onONLast 7 days
  fields: documentkey,fieldname,oldvalue,newvalue,user,sys_created_on
  limit: 100
```

**Monitor ACL changes:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_audit
  query: tablename=sys_security_acl^sys_created_onONLast 30 days
  fields: documentkey,fieldname,oldvalue,newvalue,user,sys_created_on
  limit: 100
```

#### 1.2 Encoded Audit Queries

**Using an encoded query:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_audit
  query: tablename=sys_user^fieldnameINuser_name,roles,active,locked_out^newvalueLIKEadmin^sys_created_on>=javascript:gs.daysAgoStart(7)^NQtablename=sys_user^fieldnameINuser_name,roles,active,locked_out^oldvalueLIKEadmin^sys_created_on>=javascript:gs.daysAgoStart(7)
  limit: 50
```

**Finding password changes:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_audit
  query: fieldnameLIKEpassword^sys_created_on>=javascript:gs.hoursAgo(24)
  limit: 100
```

### Phase 2: User Activity Tracking

#### 2.1 Login Activity Analysis

**Query login events:**
```
Tool: SN-Query-Table
Parameters:
  table_name: syslog
  query: messageLIKElogin^sys_created_onONLast 24 hours
  fields: level,message,source,sys_created_on
  limit: 500
```

**Failed login attempts:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_audit
  query: tablename=sys_user^fieldname=failed_attempts^sys_created_onONLast 24 hours
  fields: documentkey,oldvalue,newvalue,user,sys_created_on
  limit: 100
```

#### 2.2 User Session Analysis

**Query active sessions:**
```
Tool: SN-Query-Table
Parameters:
  table_name: v_user_session
  query: statusISNOTEMPTY
  fields: user,status,last_activity,client_ip,browser
  limit: 100
```

**Identify concurrent sessions (potential account sharing):**
```
Tool: SN-Execute-Background-Script
Parameters:
  script: |
    var users = {};
    var gr = new GlideRecord('v_user_session');
    gr.addQuery('status', 'active');
    gr.query();
    while (gr.next()) {
      var userId = gr.user.toString();
      if (!users[userId]) users[userId] = [];
      users[userId].push({
        ip: gr.client_ip.toString(),
        browser: gr.browser.toString()
      });
    }

    for (var uid in users) {
      if (users[uid].length > 1) {
        var userGr = new GlideRecord('sys_user');
        userGr.get(uid);
        gs.info('CONCURRENT SESSIONS: ' + userGr.user_name +
                ' has ' + users[uid].length + ' active sessions from: ' +
                JSON.stringify(users[uid]));
      }
    }
  description: "Audit: Identify users with concurrent sessions"
```

#### 2.3 Privileged User Monitoring

**Track admin user activities:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_audit
  query: userLIKEadmin^sys_created_onONLast 7 days^tablenameNOT INsyslog,sys_cache,sys_email
  fields: tablename,fieldname,oldvalue,newvalue,user,sys_created_on
  limit: 500
```

**Monitor impersonation usage:**
```
Tool: SN-Query-Table
Parameters:
  table_name: syslog
  query: messageLIKEimpersonat^sys_created_onONLast 30 days
  fields: level,message,source,sys_created_on
  limit: 100
```

### Phase 3: Compliance Report Generation

#### 3.1 SOX Compliance Report

**Generate user access review data:**
```
Tool: SN-Execute-Background-Script
Parameters:
  script: |
    var report = [];

    // Get all active users with sensitive roles
    var sensitiveRoles = ['admin', 'security_admin', 'itil', 'catalog_admin'];
    var userRoles = new GlideRecord('sys_user_has_role');
    userRoles.addQuery('role.name', 'IN', sensitiveRoles.join(','));
    userRoles.addQuery('user.active', true);
    userRoles.orderBy('user');
    userRoles.query();

    while (userRoles.next()) {
      report.push({
        user_name: userRoles.user.user_name.toString(),
        user_email: userRoles.user.email.toString(),
        role: userRoles.role.name.toString(),
        granted_date: userRoles.sys_created_on.toString(),
        granted_by: userRoles.sys_created_by.toString(),
        last_login: userRoles.user.last_login_time.toString(),
        manager: userRoles.user.manager.name.toString()
      });
    }

    gs.info('SOX User Access Report: ' + JSON.stringify(report, null, 2));
  description: "Compliance: Generate SOX user access report"
```

#### 3.2 Data Access Audit Report

**Track access to sensitive tables:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_audit
  query: tablenameINsys_user,customer_account,hr_core_profile,ast_license^sys_created_onONLast 30 days
  fields: tablename,documentkey,fieldname,user,sys_created_on
  limit: 1000
```

#### 3.3 Configuration Change Report

**Generate configuration change summary:**
```
Tool: SN-Execute-Background-Script
Parameters:
  script: |
    var configTables = [
      'sys_script', 'sys_script_include', 'sys_ui_policy',
      'sys_ui_action', 'sys_security_acl', 'sys_properties',
      'sys_scheduled_job', 'wf_workflow', 'wf_activity'
    ];

    var changes = {};
    var audit = new GlideRecord('sys_audit');
    audit.addQuery('tablename', 'IN', configTables.join(','));
    audit.addQuery('sys_created_on', '>=', gs.daysAgo(30));
    audit.query();

    while (audit.next()) {
      var table = audit.tablename.toString();
      if (!changes[table]) changes[table] = { insert: 0, update: 0, delete: 0 };

      if (audit.reason.toString().indexOf('INSERT') >= 0) changes[table].insert++;
      else if (audit.reason.toString().indexOf('DELETE') >= 0) changes[table].delete++;
      else changes[table].update++;
    }

    gs.info('CONFIGURATION CHANGE REPORT (Last 30 Days):');
    for (var tbl in changes) {
      gs.info(tbl + ': ' + JSON.stringify(changes[tbl]));
    }
  description: "Compliance: Generate configuration change report"
```

### Phase 4: Anomaly Detection Patterns

#### 4.1 Brute Force Detection

**Identify potential brute force attacks:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_audit
  query: tablename=sys_user^fieldname=failed_attempts^newvalueGT3^sys_created_onONLast 1 hours
  fields: documentkey,oldvalue,newvalue,user,sys_created_on
  limit: 50
```

**Create alert for brute force pattern:**
```
Tool: SN-Execute-Background-Script
Parameters:
  script: |
    var threshold = 5;
    var timeWindow = 3600000; // 1 hour in ms
    var now = new GlideDateTime();
    var hourAgo = new GlideDateTime();
    hourAgo.subtract(timeWindow);

    var audit = new GlideRecord('sys_audit');
    audit.addQuery('tablename', 'sys_user');
    audit.addQuery('fieldname', 'failed_attempts');
    audit.addQuery('sys_created_on', '>=', hourAgo);
    audit.orderBy('documentkey');
    audit.query();

    var userAttempts = {};
    while (audit.next()) {
      var userId = audit.documentkey.toString();
      var newVal = parseInt(audit.newvalue.toString()) || 0;
      if (newVal > threshold) {
        userAttempts[userId] = newVal;
      }
    }

    // Create security incidents for each
    for (var uid in userAttempts) {
      var userGr = new GlideRecord('sys_user');
      userGr.get(uid);

      gs.warn('ANOMALY DETECTED: Brute force attempt on user: ' +
              userGr.user_name + ' (' + userAttempts[uid] + ' failed attempts)');

      // Optional: Create security incident
      // var si = new GlideRecord('sn_si_incident');
      // si.initialize();
      // si.short_description = 'Potential brute force attack: ' + userGr.user_name;
      // si.insert();
    }
  description: "Anomaly: Detect brute force login attempts"
```

#### 4.2 Off-Hours Activity Detection

**Find admin activity outside business hours:**
```
Tool: SN-Execute-Background-Script
Parameters:
  script: |
    // Business hours: 8 AM - 6 PM, Monday-Friday
    var businessStart = 8;
    var businessEnd = 18;

    var audit = new GlideRecord('sys_audit');
    audit.addQuery('sys_created_on', '>=', gs.daysAgo(7));
    audit.addEncodedQuery('userLIKEadmin^ORuserLIKEsystem');
    audit.query();

    var offHoursActivity = [];
    while (audit.next()) {
      var created = new GlideDateTime(audit.sys_created_on.toString());
      var hour = created.getLocalTime().getHourOfDay();
      var dayOfWeek = created.getDayOfWeek();

      // Check if outside business hours (1=Sunday, 7=Saturday)
      if (dayOfWeek == 1 || dayOfWeek == 7 || hour < businessStart || hour >= businessEnd) {
        offHoursActivity.push({
          user: audit.user.toString(),
          table: audit.tablename.toString(),
          field: audit.fieldname.toString(),
          time: created.toString()
        });
      }
    }

    if (offHoursActivity.length > 0) {
      gs.warn('OFF-HOURS ACTIVITY DETECTED: ' + offHoursActivity.length + ' actions');
      gs.info(JSON.stringify(offHoursActivity.slice(0, 20), null, 2));
    }
  description: "Anomaly: Detect off-hours admin activity"
```

#### 4.3 Bulk Data Access Detection

**Identify unusual data access patterns:**
```
Tool: SN-Execute-Background-Script
Parameters:
  script: |
    var threshold = 100; // More than 100 records accessed in 10 minutes
    var sensitiveTables = ['sys_user', 'customer_account', 'hr_core_profile', 'ast_contract'];

    var audit = new GlideRecord('sys_audit');
    audit.addQuery('tablename', 'IN', sensitiveTables.join(','));
    audit.addQuery('sys_created_on', '>=', gs.minutesAgo(10));
    audit.query();

    var userAccess = {};
    while (audit.next()) {
      var user = audit.user.toString();
      var table = audit.tablename.toString();
      var key = user + '::' + table;

      if (!userAccess[key]) userAccess[key] = { user: user, table: table, count: 0 };
      userAccess[key].count++;
    }

    for (var k in userAccess) {
      if (userAccess[k].count > threshold) {
        gs.warn('BULK ACCESS DETECTED: ' + userAccess[k].user +
                ' accessed ' + userAccess[k].count + ' records in ' +
                userAccess[k].table);
      }
    }
  description: "Anomaly: Detect bulk data access patterns"
```

#### 4.4 Privilege Escalation Detection

**Monitor for unauthorized role changes:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_audit
  query: tablename=sys_user_has_role^sys_created_onONLast 24 hours
  fields: documentkey,oldvalue,newvalue,user,reason,sys_created_on
  limit: 100
```

**Alert on sensitive role grants:**
```
Tool: SN-Execute-Background-Script
Parameters:
  script: |
    var sensitiveRoles = ['admin', 'security_admin', 'maint', 'personalize_dictionary'];

    var audit = new GlideRecord('sys_audit');
    audit.addQuery('tablename', 'sys_user_has_role');
    audit.addQuery('reason', 'LIKE', 'INSERT');
    audit.addQuery('sys_created_on', '>=', gs.daysAgo(1));
    audit.query();

    while (audit.next()) {
      // Get the role record
      var roleRec = new GlideRecord('sys_user_has_role');
      if (roleRec.get(audit.documentkey)) {
        var roleName = roleRec.role.name.toString();

        if (sensitiveRoles.indexOf(roleName) >= 0) {
          var userName = roleRec.user.user_name.toString();
          var grantedBy = audit.user.toString();

          gs.warn('PRIVILEGE ESCALATION: ' + userName +
                  ' granted ' + roleName + ' role by ' + grantedBy);
        }
      }
    }
  description: "Anomaly: Detect sensitive role grants"
```

### Phase 5: Deleted Record Tracking

**Query deleted records:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_audit_delete
  query: sys_created_onONLast 7 days
  fields: tablename,documentkey,display_name,deleted_by,sys_created_on
  limit: 100
```

**Track deleted sensitive records:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_audit_delete
  query: tablenameINsys_user,sys_user_has_role,sys_security_acl^sys_created_onONLast 30 days
  fields: tablename,documentkey,display_name,deleted_by,sys_created_on
  limit: 100
```

## Compliance Framework Mappings

### SOX Controls

| Control | Audit Query |
|---------|-------------|
| User Access Reviews | Query sys_user_has_role changes |
| Segregation of Duties | Query conflicting role assignments |
| Change Management | Query sys_update_set and sys_update_xml |
| Audit Trail Integrity | Verify sys_audit retention |

### HIPAA Requirements

| Requirement | Implementation |
|-------------|----------------|
| Access Controls | ACL audit + role tracking |
| Audit Controls | sys_audit + syslog retention |
| Integrity Controls | Change tracking on PHI tables |
| Transmission Security | SSL/TLS verification |

### PCI-DSS Requirements

| Requirement | Audit Approach |
|-------------|----------------|
| 10.1 - Audit trails | sys_audit enabled on all tables |
| 10.2 - Log events | syslog captures system events |
| 10.3 - Audit content | documentkey, user, timestamp captured |
| 10.7 - Log retention | Configure sys_audit retention |

## Tool Usage Summary

| Operation | MCP Tool | REST Endpoint |
|-----------|----------|---------------|
| Query Audit | SN-Query-Table | GET /sys_audit |
| NL Search | SN-Natural-Language-Search | N/A |
| Complex Analysis | SN-Execute-Background-Script | POST /sys.scripts.do |
| Schema Discovery | SN-Discover-Table-Schema | GET /sys_dictionary |
| Create Alert | SN-Create-Record | POST /sn_si_incident |

## Best Practices

- **Retention Policies:** Configure appropriate retention for sys_audit (minimum 1 year for compliance)
- **Table Auditing:** Enable auditing on all sensitive tables via sys_dictionary.audit=true
- **Real-Time Alerts:** Create business rules for critical changes (role grants, ACL changes)
- **Scheduled Reports:** Automate compliance report generation weekly/monthly
- **Baseline Behavior:** Establish normal activity patterns before anomaly detection
- **Log Integrity:** Protect audit tables with strict ACLs (read-only for most users)

## Troubleshooting

### Audit Records Missing

**Symptom:** Expected changes not appearing in sys_audit
**Cause:** Auditing not enabled for the table or field
**Solution:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_dictionary
  query: name=[table_name]^element=[field_name]
  fields: name,element,audit
```
Enable auditing: set `audit=true` on the dictionary record.

### Query Performance Issues

**Symptom:** Audit queries timing out
**Cause:** Large audit table without proper indexing
**Solution:**
1. Use date range filters (always include sys_created_on)
2. Limit result sets appropriately
3. Consider archived audit data for historical queries

### Compliance Report Gaps

**Symptom:** Missing data in compliance reports
**Cause:** Retention policy deleted historical records
**Solution:**
1. Review sys_properties for audit retention settings
2. Extend retention before next cleanup
3. Consider external archival for long-term compliance

## Examples

### Example 1: Weekly Security Audit Report

```
Tool: SN-Execute-Background-Script
Parameters:
  script: |
    var report = {
      generated: new GlideDateTime().toString(),
      period: 'Last 7 days',
      summary: {
        total_changes: 0,
        user_changes: 0,
        role_changes: 0,
        acl_changes: 0,
        failed_logins: 0
      },
      anomalies: []
    };

    // Count total changes
    var audit = new GlideAggregate('sys_audit');
    audit.addQuery('sys_created_on', '>=', gs.daysAgo(7));
    audit.addAggregate('COUNT');
    audit.query();
    if (audit.next()) {
      report.summary.total_changes = parseInt(audit.getAggregate('COUNT'));
    }

    // Count by category
    var categories = {
      'sys_user': 'user_changes',
      'sys_user_has_role': 'role_changes',
      'sys_security_acl': 'acl_changes'
    };

    for (var table in categories) {
      audit = new GlideAggregate('sys_audit');
      audit.addQuery('tablename', table);
      audit.addQuery('sys_created_on', '>=', gs.daysAgo(7));
      audit.addAggregate('COUNT');
      audit.query();
      if (audit.next()) {
        report.summary[categories[table]] = parseInt(audit.getAggregate('COUNT'));
      }
    }

    gs.info('WEEKLY SECURITY AUDIT REPORT:\n' + JSON.stringify(report, null, 2));
  description: "Generate weekly security audit report"
```

### Example 2: User Activity Timeline

```
Tool: SN-Query-Table
Parameters:
  table_name: sys_audit
  query: user=john.doe^sys_created_onONLast 30 days
  fields: tablename,fieldname,oldvalue,newvalue,sys_created_on
  limit: 500
  orderBy: sys_created_on
  orderByDesc: true
```

## Related Skills

- `security/incident-response` - Handling detected security incidents
- `security/acl-management` - Access control configuration
- `security/data-classification` - Identifying sensitive data
- `admin/update-set-management` - Tracking configuration changes

## References

- [ServiceNow Auditing](https://docs.servicenow.com/bundle/utah-platform-administration/page/administer/security/concept/c_Auditing.html)
- [SOX Compliance](https://www.sarbanes-oxley-101.com/)
- [HIPAA Security Rule](https://www.hhs.gov/hipaa/for-professionals/security/index.html)
- [PCI-DSS Requirements](https://www.pcisecuritystandards.org/)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)
