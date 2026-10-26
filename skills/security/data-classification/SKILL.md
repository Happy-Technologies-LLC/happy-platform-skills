---
name: data-classification
version: 1.0.4
description: Data security and classification - identifying sensitive fields, implementing data masking, PII/PHI discovery, and applying classification labels
author: Happy Technologies LLC
tags: [security, data-classification, pii, phi, masking, privacy, gdpr, compliance]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp:
    - SN-Discover-Table-Schema
    - SN-Query-Table
    - SN-Execute-Background-Script
    - SN-Create-Record
    - SN-Update-Record
    - SN-Get-Table-Schema
  rest:
    - /api/now/table/sys_dictionary
    - /api/now/table/sys_db_object
    - /api/now/table/sys_data_classification
    - /api/now/table/sys_properties
  native:
    - Bash
complexity: expert
estimated_time: 60-120 minutes
---

# Data Classification

## Overview

Data classification is critical for security, compliance, and governance. This skill covers:

- Discovering and identifying sensitive data fields across ServiceNow
- Implementing data masking strategies for PII/PHI protection
- Automated PII/PHI discovery using patterns and heuristics
- Applying classification labels to tables and fields
- Compliance with GDPR, HIPAA, PCI-DSS, and other regulations

**When to use:**
- Initial security assessment of ServiceNow instance
- Preparing for compliance audits (GDPR, HIPAA, SOX, PCI-DSS)
- Implementing data privacy controls
- Setting up data masking for non-production environments
- Creating data governance policies

## Prerequisites

- **Roles:** `admin`, `security_admin`, `data_privacy_admin`
- **Access:** sys_dictionary, sys_db_object, field-level metadata
- **Plugins:** Data Classification (optional), Encryption (for encryption at rest)
- **Knowledge:** Regulatory requirements (GDPR, HIPAA, PCI-DSS)

## Data Classification Framework

### Classification Levels

| Level | Label | Description | Examples |
|-------|-------|-------------|----------|
| 1 | **Public** | No restriction | KB articles, company info |
| 2 | **Internal** | Employee access only | Policies, org charts |
| 3 | **Confidential** | Need-to-know basis | Financial data, HR info |
| 4 | **Restricted** | Strict controls | PII, PHI, credentials |
| 5 | **Secret** | Maximum protection | Encryption keys, SSN |

### Sensitive Data Categories

| Category | Description | Regulations |
|----------|-------------|-------------|
| **PII** | Personally Identifiable Information | GDPR, CCPA |
| **PHI** | Protected Health Information | HIPAA |
| **PCI** | Payment Card Industry Data | PCI-DSS |
| **Financial** | Banking/financial records | SOX, GLBA |
| **Credentials** | Passwords, tokens, keys | All |

## Procedure

### Phase 1: Sensitive Field Discovery

#### 1.1 Automated PII Field Detection

**Scan for common PII field patterns:**
```
Tool: SN-Execute-Background-Script
Parameters:
  script: |
    var piiPatterns = [
      // Name patterns
      { pattern: /^(first|last|middle|full)_?name$/i, category: 'PII', type: 'Name' },
      { pattern: /^name$/i, category: 'PII', type: 'Name' },

      // Contact patterns
      { pattern: /email/i, category: 'PII', type: 'Email' },
      { pattern: /phone|mobile|fax|tel/i, category: 'PII', type: 'Phone' },
      { pattern: /address|street|city|state|zip|postal|country/i, category: 'PII', type: 'Address' },

      // Identity patterns
      { pattern: /ssn|social.*security|sin|national.*id/i, category: 'PII', type: 'National ID' },
      { pattern: /passport/i, category: 'PII', type: 'Passport' },
      { pattern: /driver.*license|licence/i, category: 'PII', type: 'License' },
      { pattern: /dob|birth.*date|date.*birth/i, category: 'PII', type: 'DOB' },

      // Financial patterns
      { pattern: /credit.*card|card.*number|pan|cc_/i, category: 'PCI', type: 'Credit Card' },
      { pattern: /cvv|cvc|security.*code/i, category: 'PCI', type: 'Card Security' },
      { pattern: /bank.*account|account.*number|routing/i, category: 'Financial', type: 'Bank Account' },
      { pattern: /salary|wage|compensation|income/i, category: 'Financial', type: 'Compensation' },

      // Health patterns
      { pattern: /medical|health|diagnosis|treatment|condition/i, category: 'PHI', type: 'Medical' },
      { pattern: /insurance.*id|policy.*number|member.*id/i, category: 'PHI', type: 'Insurance' },
      { pattern: /prescription|medication|drug/i, category: 'PHI', type: 'Medication' },

      // Authentication patterns
      { pattern: /password|passwd|pwd/i, category: 'Credentials', type: 'Password' },
      { pattern: /secret|token|api.*key/i, category: 'Credentials', type: 'Secret' },
      { pattern: /private.*key|cert|certificate/i, category: 'Credentials', type: 'Certificate' }
    ];

    var findings = [];
    var dict = new GlideRecord('sys_dictionary');
    dict.addQuery('internal_type', '!=', 'collection');
    dict.addNullQuery('element').addOrCondition('element', '!=', '');
    dict.query();

    while (dict.next()) {
      var fieldName = dict.element.toString();
      var tableName = dict.name.toString();

      if (!fieldName || fieldName.startsWith('sys_')) continue;

      for (var i = 0; i < piiPatterns.length; i++) {
        if (piiPatterns[i].pattern.test(fieldName)) {
          findings.push({
            table: tableName,
            field: fieldName,
            category: piiPatterns[i].category,
            type: piiPatterns[i].type,
            label: dict.column_label.toString()
          });
          break;
        }
      }
    }

    gs.info('PII FIELD DISCOVERY RESULTS: ' + findings.length + ' potential PII fields found');
    gs.info(JSON.stringify(findings, null, 2));
  description: "Scan instance for potential PII fields"
```

#### 1.2 Discover Table Schema for Sensitive Data

**Deep dive into a specific table:**
```
Tool: SN-Discover-Table-Schema
Parameters:
  table_name: sys_user
  include_inherited: true
```

**Query field details:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_dictionary
  query: name=sys_user^elementISNOTEMPTY
  fields: element,column_label,internal_type,max_length,read_only
  limit: 100
```

#### 1.3 Find Fields with Actual Data

**Sample sensitive field values (masked):**
```
Tool: SN-Execute-Background-Script
Parameters:
  script: |
    var sensitiveFields = [
      { table: 'sys_user', field: 'email', mask: true },
      { table: 'sys_user', field: 'phone', mask: true },
      { table: 'sys_user', field: 'mobile_phone', mask: true },
      { table: 'customer_contact', field: 'email', mask: true }
    ];

    var results = [];

    for (var i = 0; i < sensitiveFields.length; i++) {
      var config = sensitiveFields[i];

      var gr = new GlideRecord(config.table);
      gr.addNotNullQuery(config.field);
      gr.setLimit(5);
      gr.query();

      var samples = [];
      while (gr.next()) {
        var value = gr[config.field].toString();
        if (config.mask && value) {
          // Mask all but first/last 2 characters
          if (value.length > 4) {
            value = value.substring(0, 2) + '***' + value.substring(value.length - 2);
          } else {
            value = '***';
          }
        }
        samples.push(value);
      }

      if (samples.length > 0) {
        results.push({
          table: config.table,
          field: config.field,
          populated: true,
          sample_count: samples.length,
          samples: samples
        });
      }
    }

    gs.info('SENSITIVE FIELD SAMPLE (MASKED):');
    gs.info(JSON.stringify(results, null, 2));
  description: "Sample sensitive field data (masked)"
```

### Phase 2: Data Masking Strategies

#### 2.1 Dynamic Data Masking

**Create masked display business rule:**
```
Tool: SN-Execute-Background-Script
Parameters:
  script: |
    // Example: Create a script include for data masking
    var scriptContent =
      "var DataMasker = Class.create();\n" +
      "DataMasker.prototype = {\n" +
      "  initialize: function() {},\n" +
      "  \n" +
      "  maskEmail: function(email) {\n" +
      "    if (!email) return '';\n" +
      "    var parts = email.split('@');\n" +
      "    if (parts.length != 2) return '***@***';\n" +
      "    var user = parts[0];\n" +
      "    var domain = parts[1];\n" +
      "    if (user.length > 2) {\n" +
      "      user = user.charAt(0) + '***' + user.charAt(user.length-1);\n" +
      "    }\n" +
      "    return user + '@' + domain;\n" +
      "  },\n" +
      "  \n" +
      "  maskPhone: function(phone) {\n" +
      "    if (!phone) return '';\n" +
      "    var digits = phone.replace(/\\D/g, '');\n" +
      "    if (digits.length >= 10) {\n" +
      "      return '***-***-' + digits.slice(-4);\n" +
      "    }\n" +
      "    return '***';\n" +
      "  },\n" +
      "  \n" +
      "  maskSSN: function(ssn) {\n" +
      "    if (!ssn) return '';\n" +
      "    var digits = ssn.replace(/\\D/g, '');\n" +
      "    if (digits.length >= 4) {\n" +
      "      return '***-**-' + digits.slice(-4);\n" +
      "    }\n" +
      "    return '***-**-****';\n" +
      "  },\n" +
      "  \n" +
      "  maskCreditCard: function(cc) {\n" +
      "    if (!cc) return '';\n" +
      "    var digits = cc.replace(/\\D/g, '');\n" +
      "    if (digits.length >= 4) {\n" +
      "      return '****-****-****-' + digits.slice(-4);\n" +
      "    }\n" +
      "    return '****-****-****-****';\n" +
      "  },\n" +
      "  \n" +
      "  type: 'DataMasker'\n" +
      "};";

    gs.info('Data Masker Script Include:\n' + scriptContent);
  description: "Generate data masking script include"
```

#### 2.2 Field-Level Encryption

**Check encryption capabilities:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_properties
  query: nameLIKEencrypt
  fields: name,value,description
  limit: 20
```

**Enable field encryption:**
```
Tool: SN-Execute-Background-Script
Parameters:
  script: |
    // Check if encryption is configured
    var encryptProp = gs.getProperty('glide.security.encryption.module');
    gs.info('Encryption Module: ' + encryptProp);

    // To encrypt a field, update sys_dictionary
    // Set 'encrypt_on_write' = true for the field
    var dict = new GlideRecord('sys_dictionary');
    dict.addQuery('name', 'u_custom_table');
    dict.addQuery('element', 'ssn_field');
    dict.query();

    if (dict.next()) {
      gs.info('Current encryption setting: ' + dict.encrypt_context);
      // dict.encrypt_context = 'system';
      // dict.update();
    }
  description: "Check and configure field encryption"
```

#### 2.3 Role-Based Data Masking

**Create display business rule for masking:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_script
  data:
    name: "Mask Sensitive Data Display"
    table: sys_user
    when: display
    order: 100
    active: true
    script: |
      (function executeRule(current, previous /*null when async*/) {

        // Only mask for non-privileged users
        if (gs.hasRole('security_admin') || gs.hasRole('hr_admin')) {
          return; // Full access
        }

        // Mask email for general users
        if (current.email && !gs.hasRole('itil')) {
          var email = current.email.toString();
          var parts = email.split('@');
          if (parts.length == 2) {
            current.email.setDisplayValue(parts[0].charAt(0) + '***@' + parts[1]);
          }
        }

        // Mask phone for general users
        if (current.phone && !gs.hasRole('hr_user')) {
          var phone = current.phone.toString().replace(/\D/g, '');
          if (phone.length >= 4) {
            current.phone.setDisplayValue('***-***-' + phone.slice(-4));
          }
        }

      })(current, previous);
    description: "Masks sensitive user data based on viewer's roles"
```

### Phase 3: PII/PHI Discovery

#### 3.1 Comprehensive PII Scan

**Run full instance PII scan:**
```
Tool: SN-Execute-Background-Script
Parameters:
  script: |
    var piiReport = {
      scan_date: new GlideDateTime().toString(),
      tables_scanned: 0,
      fields_checked: 0,
      pii_fields_found: [],
      phi_fields_found: [],
      pci_fields_found: [],
      recommendations: []
    };

    // PII field name patterns
    var piiPatterns = [
      /email/i, /phone/i, /mobile/i, /address/i, /zip/i, /postal/i,
      /first.*name/i, /last.*name/i, /birth/i, /dob/i, /ssn/i,
      /social.*security/i, /passport/i, /driver/i, /license/i
    ];

    var phiPatterns = [
      /medical/i, /health/i, /diagnos/i, /treatment/i, /condition/i,
      /prescription/i, /medication/i, /insurance/i, /patient/i
    ];

    var pciPatterns = [
      /credit.*card/i, /card.*number/i, /cvv/i, /cvc/i, /pan/i,
      /expir/i, /bank.*account/i, /routing/i
    ];

    // Get all custom tables
    var tables = new GlideRecord('sys_db_object');
    tables.addQuery('name', 'STARTSWITH', 'u_');
    tables.addOrCondition('name', 'IN', 'sys_user,customer_contact,customer_account,hr_core_profile');
    tables.query();

    while (tables.next()) {
      piiReport.tables_scanned++;
      var tableName = tables.name.toString();

      var dict = new GlideRecord('sys_dictionary');
      dict.addQuery('name', tableName);
      dict.addNotNullQuery('element');
      dict.query();

      while (dict.next()) {
        piiReport.fields_checked++;
        var fieldName = dict.element.toString();
        var fieldLabel = dict.column_label.toString();

        // Check against patterns
        for (var i = 0; i < piiPatterns.length; i++) {
          if (piiPatterns[i].test(fieldName) || piiPatterns[i].test(fieldLabel)) {
            piiReport.pii_fields_found.push({
              table: tableName,
              field: fieldName,
              label: fieldLabel
            });
            break;
          }
        }

        for (var j = 0; j < phiPatterns.length; j++) {
          if (phiPatterns[j].test(fieldName) || phiPatterns[j].test(fieldLabel)) {
            piiReport.phi_fields_found.push({
              table: tableName,
              field: fieldName,
              label: fieldLabel
            });
            break;
          }
        }

        for (var k = 0; k < pciPatterns.length; k++) {
          if (pciPatterns[k].test(fieldName) || pciPatterns[k].test(fieldLabel)) {
            piiReport.pci_fields_found.push({
              table: tableName,
              field: fieldName,
              label: fieldLabel
            });
            break;
          }
        }
      }
    }

    // Generate recommendations
    if (piiReport.pii_fields_found.length > 0) {
      piiReport.recommendations.push('Review PII fields for GDPR/CCPA compliance');
      piiReport.recommendations.push('Implement data masking for non-production environments');
      piiReport.recommendations.push('Create ACLs to restrict PII field access');
    }

    if (piiReport.phi_fields_found.length > 0) {
      piiReport.recommendations.push('Ensure HIPAA BAA is in place with ServiceNow');
      piiReport.recommendations.push('Enable audit logging on all PHI tables');
      piiReport.recommendations.push('Implement PHI encryption at rest');
    }

    if (piiReport.pci_fields_found.length > 0) {
      piiReport.recommendations.push('PCI data should NOT be stored in ServiceNow');
      piiReport.recommendations.push('Consider tokenization for payment data');
      piiReport.recommendations.push('Review PCI-DSS compliance requirements');
    }

    gs.info('PII/PHI/PCI DISCOVERY REPORT:\n' + JSON.stringify(piiReport, null, 2));
  description: "Comprehensive PII/PHI/PCI discovery scan"
```

#### 3.2 Data Content Scanning

**Scan actual data for sensitive patterns:**
```
Tool: SN-Execute-Background-Script
Parameters:
  script: |
    // Regex patterns for detecting sensitive data in content
    var patterns = {
      email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
      phone: /(\+1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g,
      ssn: /\d{3}[-\s]?\d{2}[-\s]?\d{4}/g,
      creditCard: /\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}/g,
      ipv4: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g
    };

    // Tables and fields to scan for embedded PII
    var scanTargets = [
      { table: 'incident', field: 'description' },
      { table: 'incident', field: 'comments' },
      { table: 'sc_req_item', field: 'special_instructions' },
      { table: 'kb_knowledge', field: 'text' }
    ];

    var findings = [];

    for (var i = 0; i < scanTargets.length; i++) {
      var target = scanTargets[i];

      var gr = new GlideRecord(target.table);
      gr.setLimit(100); // Limit for performance
      gr.query();

      while (gr.next()) {
        var content = gr[target.field].toString();

        for (var patternName in patterns) {
          var matches = content.match(patterns[patternName]);
          if (matches && matches.length > 0) {
            findings.push({
              table: target.table,
              field: target.field,
              record: gr.getDisplayValue(),
              sys_id: gr.sys_id.toString(),
              pattern: patternName,
              count: matches.length
            });
          }
        }
      }
    }

    if (findings.length > 0) {
      gs.warn('EMBEDDED PII DETECTED: ' + findings.length + ' records contain potential PII');
      gs.info(JSON.stringify(findings.slice(0, 20), null, 2)); // First 20
    } else {
      gs.info('No embedded PII detected in scanned content');
    }
  description: "Scan record content for embedded PII patterns"
```

### Phase 4: Classification Labels

#### 4.1 Create Classification Labels

**Define classification labels:**
```
Tool: SN-Execute-Background-Script
Parameters:
  script: |
    // Check if data classification table exists
    if (GlideTableDescriptor.isValid('sys_data_classification')) {
      var labels = [
        { name: 'Public', level: 1, description: 'Information that can be freely shared' },
        { name: 'Internal', level: 2, description: 'For internal use only' },
        { name: 'Confidential', level: 3, description: 'Sensitive business information' },
        { name: 'Restricted', level: 4, description: 'PII, PHI, or regulated data' },
        { name: 'Secret', level: 5, description: 'Maximum protection required' }
      ];

      for (var i = 0; i < labels.length; i++) {
        var gr = new GlideRecord('sys_data_classification');
        gr.addQuery('name', labels[i].name);
        gr.query();

        if (!gr.hasNext()) {
          gr.initialize();
          gr.name = labels[i].name;
          gr.level = labels[i].level;
          gr.description = labels[i].description;
          gr.insert();
          gs.info('Created classification: ' + labels[i].name);
        } else {
          gs.info('Classification exists: ' + labels[i].name);
        }
      }
    } else {
      // Use custom table or properties
      gs.info('Data Classification plugin not installed');
      gs.info('Consider using sys_properties or custom table for labels');
    }
  description: "Create data classification labels"
```

#### 4.2 Apply Classifications to Tables

**Store table classifications:**
```
Tool: SN-Execute-Background-Script
Parameters:
  script: |
    // Use sys_properties to store table classifications
    var tableClassifications = {
      'sys_user': 'Restricted',
      'customer_contact': 'Restricted',
      'incident': 'Internal',
      'kb_knowledge': 'Public',
      'hr_core_profile': 'Secret',
      'ast_contract': 'Confidential'
    };

    for (var table in tableClassifications) {
      var propName = 'data.classification.' + table;
      var propValue = tableClassifications[table];

      var prop = new GlideRecord('sys_properties');
      prop.addQuery('name', propName);
      prop.query();

      if (prop.next()) {
        prop.value = propValue;
        prop.update();
        gs.info('Updated: ' + propName + ' = ' + propValue);
      } else {
        prop.initialize();
        prop.name = propName;
        prop.value = propValue;
        prop.description = 'Data classification for ' + table + ' table';
        prop.type = 'string';
        prop.insert();
        gs.info('Created: ' + propName + ' = ' + propValue);
      }
    }
  description: "Apply data classifications to tables"
```

#### 4.3 Field-Level Classification

**Apply classifications to sensitive fields:**
```
Tool: SN-Execute-Background-Script
Parameters:
  script: |
    var fieldClassifications = [
      { table: 'sys_user', field: 'email', classification: 'Restricted', reason: 'PII - Contact' },
      { table: 'sys_user', field: 'phone', classification: 'Restricted', reason: 'PII - Contact' },
      { table: 'sys_user', field: 'home_phone', classification: 'Restricted', reason: 'PII - Contact' },
      { table: 'sys_user', field: 'mobile_phone', classification: 'Restricted', reason: 'PII - Contact' },
      { table: 'hr_core_profile', field: 'ssn', classification: 'Secret', reason: 'PII - National ID' },
      { table: 'hr_core_profile', field: 'date_of_birth', classification: 'Restricted', reason: 'PII - DOB' },
      { table: 'customer_contact', field: 'email', classification: 'Restricted', reason: 'PII - Contact' }
    ];

    for (var i = 0; i < fieldClassifications.length; i++) {
      var fc = fieldClassifications[i];
      var propName = 'data.classification.' + fc.table + '.' + fc.field;

      var prop = new GlideRecord('sys_properties');
      prop.addQuery('name', propName);
      prop.query();

      if (prop.next()) {
        prop.value = fc.classification;
        prop.update();
      } else {
        prop.initialize();
        prop.name = propName;
        prop.value = fc.classification;
        prop.description = fc.reason;
        prop.type = 'string';
        prop.insert();
      }

      gs.info('Classified: ' + fc.table + '.' + fc.field + ' as ' + fc.classification);
    }
  description: "Apply field-level data classifications"
```

### Phase 5: Compliance Reporting

#### 5.1 Generate Classification Report

**Create data classification inventory:**
```
Tool: SN-Execute-Background-Script
Parameters:
  script: |
    var report = {
      generated: new GlideDateTime().toString(),
      summary: {
        total_tables: 0,
        classified_tables: 0,
        total_fields: 0,
        classified_fields: 0
      },
      by_level: {
        'Public': { tables: [], fields: [] },
        'Internal': { tables: [], fields: [] },
        'Confidential': { tables: [], fields: [] },
        'Restricted': { tables: [], fields: [] },
        'Secret': { tables: [], fields: [] }
      },
      unclassified: {
        sensitive_tables: [],
        sensitive_fields: []
      }
    };

    // Get table classifications
    var props = new GlideRecord('sys_properties');
    props.addQuery('name', 'STARTSWITH', 'data.classification.');
    props.query();

    while (props.next()) {
      var propName = props.name.toString();
      var classification = props.value.toString();
      var parts = propName.replace('data.classification.', '').split('.');

      if (parts.length === 1) {
        // Table classification
        report.summary.classified_tables++;
        if (report.by_level[classification]) {
          report.by_level[classification].tables.push(parts[0]);
        }
      } else if (parts.length === 2) {
        // Field classification
        report.summary.classified_fields++;
        if (report.by_level[classification]) {
          report.by_level[classification].fields.push(parts[0] + '.' + parts[1]);
        }
      }
    }

    // Count total tables
    var tables = new GlideAggregate('sys_db_object');
    tables.addAggregate('COUNT');
    tables.query();
    if (tables.next()) {
      report.summary.total_tables = parseInt(tables.getAggregate('COUNT'));
    }

    // Count total fields
    var fields = new GlideAggregate('sys_dictionary');
    fields.addNotNullQuery('element');
    fields.addAggregate('COUNT');
    fields.query();
    if (fields.next()) {
      report.summary.total_fields = parseInt(fields.getAggregate('COUNT'));
    }

    gs.info('DATA CLASSIFICATION REPORT:\n' + JSON.stringify(report, null, 2));
  description: "Generate data classification report"
```

#### 5.2 GDPR Data Map

**Generate GDPR-compliant data map:**
```
Tool: SN-Execute-Background-Script
Parameters:
  script: |
    var gdprMap = {
      generated: new GlideDateTime().toString(),
      data_controller: 'Your Organization Name',
      personal_data_inventory: [],
      lawful_basis: {},
      retention_periods: {},
      third_party_sharing: []
    };

    // Find all PII fields
    var piiFields = [
      { table: 'sys_user', fields: ['first_name', 'last_name', 'email', 'phone', 'mobile_phone', 'home_phone', 'location'] },
      { table: 'customer_contact', fields: ['first_name', 'last_name', 'email', 'phone', 'mobile_phone'] },
      { table: 'hr_core_profile', fields: ['first_name', 'last_name', 'date_of_birth', 'ssn', 'address', 'city', 'state', 'zip'] }
    ];

    for (var i = 0; i < piiFields.length; i++) {
      var tableInfo = piiFields[i];

      // Count records
      var gr = new GlideAggregate(tableInfo.table);
      gr.addAggregate('COUNT');
      gr.query();
      var recordCount = 0;
      if (gr.next()) {
        recordCount = parseInt(gr.getAggregate('COUNT'));
      }

      gdprMap.personal_data_inventory.push({
        table: tableInfo.table,
        fields: tableInfo.fields,
        record_count: recordCount,
        data_subjects: 'Employees/Customers',
        purpose: 'Business operations',
        lawful_basis: 'Legitimate interest / Contract performance'
      });
    }

    // Define retention periods
    gdprMap.retention_periods = {
      'sys_user': 'Duration of employment + 7 years',
      'customer_contact': 'Duration of relationship + 5 years',
      'incident': '3 years after closure',
      'hr_core_profile': 'Duration of employment + 7 years'
    };

    gs.info('GDPR DATA MAP:\n' + JSON.stringify(gdprMap, null, 2));
  description: "Generate GDPR data map"
```

## Tool Usage Summary

| Operation | MCP Tool | REST Endpoint |
|-----------|----------|---------------|
| Discover Schema | SN-Discover-Table-Schema | GET /sys_dictionary |
| Query Fields | SN-Query-Table | GET /sys_dictionary |
| Run Scans | SN-Execute-Background-Script | POST /sys.scripts.do |
| Create Classification | SN-Create-Record | POST /sys_properties |
| Update Classification | SN-Update-Record | PATCH /sys_properties |
| Get Table Info | SN-Get-Table-Schema | GET /sys_dictionary |

## Best Practices

- **Inventory First:** Complete data discovery before implementing controls
- **Risk-Based Approach:** Prioritize highest-risk data (PII, PHI, PCI)
- **Defense in Depth:** Combine ACLs, encryption, masking, and auditing
- **Regular Scans:** Schedule periodic PII discovery scans
- **Document Everything:** Maintain data classification records for audits
- **Non-Prod Masking:** Always mask production data in non-prod environments
- **Least Privilege:** Only grant access to classified data when necessary

## Troubleshooting

### Data Masking Not Applied

**Symptom:** Users see unmasked data
**Cause:** Display business rule not executing
**Solution:** Check business rule order and conditions; verify role checks

### PII Scan Missing Fields

**Symptom:** Known PII fields not detected
**Cause:** Field naming doesn't match patterns
**Solution:** Add custom patterns for organization-specific naming

### Classification Not Persisting

**Symptom:** Classifications reset or missing
**Cause:** Properties not created in correct scope
**Solution:** Verify sys_properties scope and update set capture

### Encryption Performance

**Symptom:** Slow queries on encrypted fields
**Cause:** Encryption prevents index usage
**Solution:** Only encrypt truly sensitive fields; use reference fields for lookups

## Related Skills

- `security/acl-management` - Restricting access to classified data
- `security/audit-compliance` - Auditing access to sensitive data
- `security/incident-response` - Responding to data breaches
- `grc/risk-identification` - Identify risks associated with sensitive data handling

## References

- [GDPR Official Text](https://gdpr.eu/)
- [HIPAA Security Rule](https://www.hhs.gov/hipaa/for-professionals/security/index.html)
- [PCI-DSS Standards](https://www.pcisecuritystandards.org/)
- [NIST Privacy Framework](https://www.nist.gov/privacy-framework)
- [ServiceNow Data Classification](https://docs.servicenow.com/bundle/utah-platform-administration/page/administer/security/concept/data-classification.html)
- [CCPA Requirements](https://oag.ca.gov/privacy/ccpa)
