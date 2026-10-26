---
name: script-includes
version: 1.0.2
description: Comprehensive guide to developing Script Includes - class-based, client-callable (GlideAjax), inheritance patterns, and best practices
author: Happy Technologies LLC
tags: [development, script-includes, scripting, server-side, classes, reusability]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp:
    - SN-Create-Record
    - SN-Update-Record
    - SN-Query-Table
    - SN-Get-Record
    - SN-Execute-Background-Script
    - SN-Get-Table-Schema
  rest:
    - /api/now/table/sys_script_include
    - /api/now/table/sys_scope
  native:
    - Bash
    - Read
    - Write
complexity: advanced
estimated_time: 45-90 minutes
---

# Script Include Development

## Overview

Script Includes are the foundation of reusable server-side code in ServiceNow. This skill covers:

- Class-based script include architecture
- Client-callable script includes (GlideAjax pattern)
- Extending and inheriting from existing classes
- Prototype patterns and object-oriented design
- Utility libraries and helper functions
- When to use script includes vs business rules
- Scoped vs global considerations
- Design patterns (Singleton, Factory, Strategy)
- Unit testing script includes with ATF

**When to use Script Includes:**
- Reusable logic needed across multiple business rules, workflows, or UI actions
- Complex business logic that needs unit testing
- Client-server communication (GlideAjax)
- Extending or overriding out-of-box functionality
- Creating service layers and APIs

**Who should use this:** Intermediate to advanced ServiceNow developers building maintainable, testable, and reusable code.

## Prerequisites

- **Roles:** `admin`, `scriptinclude_create`, or scoped app developer
- **Knowledge:**
  - JavaScript fundamentals (objects, prototypes, closures)
  - ServiceNow scripting basics (GlideRecord, gs)
  - Basic understanding of OOP concepts
- **Access:** `sys_script_include` table
- **Related Skills:**
  - `admin/script-sync` - Local development workflow
  - `admin/update-set-management` - Track changes
  - `admin/application-scope` - Scoped development

## Table Architecture

### sys_script_include Schema

```
Tool: SN-Get-Table-Schema
Parameters:
  table_name: sys_script_include
```

**Key Fields:**

| Field | Type | Purpose |
|-------|------|---------|
| `name` | String | Class name (must match class definition) |
| `api_name` | String | Full API name (scope.ClassName) |
| `script` | Script | JavaScript class definition |
| `client_callable` | Boolean | Expose via GlideAjax |
| `active` | Boolean | Enable/disable |
| `access` | Choice | public, package_private, private |
| `sys_scope` | Reference | Application scope |
| `description` | String | Documentation |

## Procedure

### Phase 1: Basic Class-Based Script Include

#### Step 1.1: Create a Basic Script Include

**Using MCP:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_script_include
  data:
    name: "IncidentUtils"
    api_name: "global.IncidentUtils"
    description: "Utility methods for incident management"
    active: true
    client_callable: false
    access: "public"
    script: |
      var IncidentUtils = Class.create();
      IncidentUtils.prototype = {
          initialize: function() {
              // Constructor - called when new instance created
          },

          /**
           * Calculate incident priority based on impact and urgency
           * @param {GlideRecord} incidentGR - Incident GlideRecord
           * @returns {Number} Calculated priority (1-5)
           */
          calculatePriority: function(incidentGR) {
              var impact = parseInt(incidentGR.impact);
              var urgency = parseInt(incidentGR.urgency);

              // Priority matrix: Lower number = higher priority
              var priorityMatrix = {
                  '1-1': 1, '1-2': 2, '1-3': 3,
                  '2-1': 2, '2-2': 3, '2-3': 4,
                  '3-1': 3, '3-2': 4, '3-3': 5
              };

              var key = impact + '-' + urgency;
              return priorityMatrix[key] || 4;
          },

          /**
           * Check if incident is a P1 (Critical)
           * @param {GlideRecord} incidentGR - Incident GlideRecord
           * @returns {Boolean} True if P1
           */
          isCritical: function(incidentGR) {
              return incidentGR.priority == 1;
          },

          /**
           * Get assignment group based on category
           * @param {String} category - Incident category
           * @returns {String} sys_id of assignment group
           */
          getAssignmentGroup: function(category) {
              var groupMapping = {
                  'network': 'Network Support',
                  'hardware': 'Hardware Support',
                  'software': 'Software Support',
                  'database': 'Database Team'
              };

              var groupName = groupMapping[category] || 'Service Desk';

              var gr = new GlideRecord('sys_user_group');
              gr.addQuery('name', groupName);
              gr.query();

              if (gr.next()) {
                  return gr.sys_id.toString();
              }
              return '';
          },

          type: 'IncidentUtils'
      };
```

#### Step 1.2: Understanding the Class Structure

**Class.create() Pattern:**
```javascript
var ClassName = Class.create();  // Create class constructor
ClassName.prototype = {          // Define prototype (methods)

    initialize: function(param1, param2) {
        // Constructor - runs when 'new ClassName(p1, p2)' called
        this.param1 = param1;
        this.param2 = param2;
    },

    methodOne: function() {
        // Instance method - has access to 'this'
        return this.param1;
    },

    methodTwo: function(arg) {
        // Another instance method
        return arg + this.param2;
    },

    type: 'ClassName'  // Required: Must match class name
};
```

**Usage in Business Rule or Other Script:**
```javascript
// Create instance
var utils = new IncidentUtils();

// Call methods
var priority = utils.calculatePriority(current);
var isCritical = utils.isCritical(current);
var groupId = utils.getAssignmentGroup(current.category);
```

#### Step 1.3: Constructor Parameters

**Script Include with Constructor:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_script_include
  data:
    name: "IncidentHandler"
    description: "Handles incident operations with configurable options"
    active: true
    client_callable: false
    script: |
      var IncidentHandler = Class.create();
      IncidentHandler.prototype = {
          /**
           * Initialize handler with incident record
           * @param {GlideRecord} incidentGR - The incident to handle
           * @param {Object} options - Configuration options
           */
          initialize: function(incidentGR, options) {
              this.incident = incidentGR;
              this.options = options || {};
              this.log = new GSLog('com.company.incident', 'IncidentHandler');

              // Default options
              this.autoAssign = this.options.autoAssign !== false;
              this.sendNotifications = this.options.sendNotifications !== false;
          },

          /**
           * Process the incident based on its state
           * @returns {Boolean} Success status
           */
          process: function() {
              if (!this.incident || !this.incident.isValidRecord()) {
                  this.log.error('Invalid incident record');
                  return false;
              }

              if (this.autoAssign && this._needsAssignment()) {
                  this._assignToGroup();
              }

              if (this.sendNotifications) {
                  this._notifyStakeholders();
              }

              return true;
          },

          // Private method (convention: prefix with underscore)
          _needsAssignment: function() {
              return this.incident.assignment_group.nil();
          },

          _assignToGroup: function() {
              var utils = new IncidentUtils();
              var groupId = utils.getAssignmentGroup(this.incident.category);
              if (groupId) {
                  this.incident.assignment_group = groupId;
              }
          },

          _notifyStakeholders: function() {
              // Notification logic
              gs.eventQueue('incident.processed', this.incident);
          },

          type: 'IncidentHandler'
      };
```

**Usage:**
```javascript
// With options
var handler = new IncidentHandler(current, {
    autoAssign: true,
    sendNotifications: false
});
handler.process();

// Default options
var handler2 = new IncidentHandler(current);
handler2.process();
```

### Phase 2: Client-Callable Script Includes (GlideAjax)

#### Step 2.1: Create Client-Callable Script Include

Client-callable script includes enable communication between client scripts and the server.

```
Tool: SN-Create-Record
Parameters:
  table_name: sys_script_include
  data:
    name: "IncidentAjax"
    description: "AJAX methods for incident client scripts"
    active: true
    client_callable: true
    access: "public"
    script: |
      var IncidentAjax = Class.create();
      IncidentAjax.prototype = Object.extendsObject(AbstractAjaxProcessor, {

          /**
           * Get incident details for client display
           * Called from client: new GlideAjax('IncidentAjax').addParam('sysparm_name', 'getIncidentDetails')
           */
          getIncidentDetails: function() {
              var incidentId = this.getParameter('sysparm_incident_id');
              var result = {};

              var gr = new GlideRecord('incident');
              if (gr.get(incidentId)) {
                  result.number = gr.number.toString();
                  result.short_description = gr.short_description.toString();
                  result.priority = gr.priority.toString();
                  result.priority_display = gr.priority.getDisplayValue();
                  result.state = gr.state.toString();
                  result.state_display = gr.state.getDisplayValue();
                  result.assigned_to = gr.assigned_to.getDisplayValue();
                  result.assignment_group = gr.assignment_group.getDisplayValue();
              }

              return JSON.stringify(result);
          },

          /**
           * Validate if user can close incident
           * Security check performed server-side
           */
          canCloseIncident: function() {
              var incidentId = this.getParameter('sysparm_incident_id');

              var gr = new GlideRecord('incident');
              if (!gr.get(incidentId)) {
                  return 'false';
              }

              // Check if current user can close
              if (!gr.canWrite()) {
                  return 'false';
              }

              // Check incident state allows closure
              if (gr.state == 6 || gr.state == 7) {  // Already closed/cancelled
                  return 'false';
              }

              // Check if required fields are filled
              if (gr.resolution_code.nil() || gr.close_notes.nil()) {
                  return 'false';
              }

              return 'true';
          },

          /**
           * Get related incidents count
           * Used for UI display without full query
           */
          getRelatedIncidentsCount: function() {
              var callerId = this.getParameter('sysparm_caller_id');
              var excludeId = this.getParameter('sysparm_exclude_id');

              var ga = new GlideAggregate('incident');
              ga.addQuery('caller_id', callerId);
              ga.addQuery('active', true);
              if (excludeId) {
                  ga.addQuery('sys_id', '!=', excludeId);
              }
              ga.addAggregate('COUNT');
              ga.query();

              if (ga.next()) {
                  return ga.getAggregate('COUNT');
              }
              return '0';
          },

          /**
           * Get assignment groups for category (for dropdown)
           */
          getAssignmentGroups: function() {
              var category = this.getParameter('sysparm_category');
              var groups = [];

              // Get groups based on category (simplified example)
              var gr = new GlideRecord('sys_user_group');
              gr.addQuery('active', true);
              gr.addQuery('type', '!=', '');  // Has type defined
              gr.orderBy('name');
              gr.setLimit(50);
              gr.query();

              while (gr.next()) {
                  groups.push({
                      sys_id: gr.sys_id.toString(),
                      name: gr.name.toString()
                  });
              }

              return JSON.stringify(groups);
          },

          /**
           * SECURITY: Define which methods are callable
           * Methods NOT listed here cannot be called from client
           */
          isPublic: function() {
              return true;  // All methods in this class are public
          },

          type: 'IncidentAjax'
      });
```

#### Step 2.2: Client Script Calling GlideAjax

**Client Script (Synchronous - Avoid in Production):**
```javascript
// NOT RECOMMENDED - blocks UI
function getIncidentSync(incidentId) {
    var ga = new GlideAjax('IncidentAjax');
    ga.addParam('sysparm_name', 'getIncidentDetails');
    ga.addParam('sysparm_incident_id', incidentId);
    ga.getXMLWait();  // SYNCHRONOUS - blocks browser

    var answer = ga.getAnswer();
    return JSON.parse(answer);
}
```

**Client Script (Asynchronous - RECOMMENDED):**
```javascript
// RECOMMENDED - non-blocking
function getIncidentAsync(incidentId, callback) {
    var ga = new GlideAjax('IncidentAjax');
    ga.addParam('sysparm_name', 'getIncidentDetails');
    ga.addParam('sysparm_incident_id', incidentId);
    ga.getXMLAnswer(function(answer) {
        var result = JSON.parse(answer);
        callback(result);
    });
}

// Usage in client script
getIncidentAsync(g_form.getValue('sys_id'), function(incident) {
    console.log('Incident: ' + incident.number);
    g_form.setValue('work_notes', 'Related: ' + incident.number);
});
```

**Client Script with Error Handling:**
```javascript
function getIncidentWithErrorHandling(incidentId) {
    var ga = new GlideAjax('IncidentAjax');
    ga.addParam('sysparm_name', 'getIncidentDetails');
    ga.addParam('sysparm_incident_id', incidentId);

    ga.getXML(function(response) {
        // Check for errors
        var answer = response.responseXML.documentElement.getAttribute('answer');

        if (!answer) {
            g_form.addErrorMessage('Error retrieving incident details');
            return;
        }

        try {
            var result = JSON.parse(answer);
            // Process result
            console.log('Got incident: ', result);
        } catch (e) {
            g_form.addErrorMessage('Error parsing response: ' + e.message);
        }
    });
}
```

#### Step 2.3: Securing Client-Callable Methods

**Method-Level Security:**
```javascript
var SecureIncidentAjax = Class.create();
SecureIncidentAjax.prototype = Object.extendsObject(AbstractAjaxProcessor, {

    /**
     * Public method - callable by any user
     */
    getPublicData: function() {
        return JSON.stringify({ status: 'ok' });
    },

    /**
     * Restricted method - requires specific role
     */
    getAdminData: function() {
        // Check role before processing
        if (!gs.hasRole('admin')) {
            return JSON.stringify({ error: 'Access denied' });
        }

        // Process admin-only request
        return JSON.stringify({ adminData: 'sensitive info' });
    },

    /**
     * Method requiring record-level access
     */
    updateIncident: function() {
        var incidentId = this.getParameter('sysparm_incident_id');
        var newValue = this.getParameter('sysparm_value');

        var gr = new GlideRecord('incident');
        if (!gr.get(incidentId)) {
            return JSON.stringify({ error: 'Not found' });
        }

        // Check ACL - does user have write access?
        if (!gr.canWrite()) {
            return JSON.stringify({ error: 'Write access denied' });
        }

        // Safe to update
        gr.short_description = newValue;
        gr.update();

        return JSON.stringify({ success: true });
    },

    /**
     * Control which methods are exposed
     */
    isPublic: function() {
        var methodName = this.getParameter('sysparm_name');
        var publicMethods = ['getPublicData', 'getAdminData', 'updateIncident'];
        return publicMethods.indexOf(methodName) !== -1;
    },

    type: 'SecureIncidentAjax'
});
```

### Phase 3: Extending Existing Classes

#### Step 3.1: Extend Out-of-Box Script Include

**Extending AbstractAjaxProcessor (Most Common):**
```javascript
var MyAjaxProcessor = Class.create();
MyAjaxProcessor.prototype = Object.extendsObject(AbstractAjaxProcessor, {
    // Your methods here
    type: 'MyAjaxProcessor'
});
```

**Extending GlideAjax on Server Side:**
```javascript
var EnhancedIncidentUtils = Class.create();
EnhancedIncidentUtils.prototype = Object.extendsObject(IncidentUtils, {

    initialize: function(incidentGR) {
        // Call parent constructor
        IncidentUtils.prototype.initialize.call(this);
        this.incident = incidentGR;
    },

    /**
     * Override parent method with enhanced logic
     */
    calculatePriority: function(incidentGR) {
        var gr = incidentGR || this.incident;

        // Call parent implementation first
        var basePriority = IncidentUtils.prototype.calculatePriority.call(this, gr);

        // Enhance with additional logic
        if (this._isVIPCaller(gr)) {
            basePriority = Math.max(1, basePriority - 1);  // Increase priority
        }

        return basePriority;
    },

    /**
     * New method specific to enhanced class
     */
    _isVIPCaller: function(incidentGR) {
        var caller = incidentGR.caller_id;
        if (caller.nil()) {
            return false;
        }
        return caller.vip == true;
    },

    /**
     * Get full incident analysis
     */
    getAnalysis: function() {
        return {
            priority: this.calculatePriority(),
            isCritical: this.isCritical(this.incident),
            isVIP: this._isVIPCaller(this.incident)
        };
    },

    type: 'EnhancedIncidentUtils'
});
```

#### Step 3.2: Extend Platform Classes

**Extend RESTMessageV2:**
```javascript
var EnhancedRESTMessage = Class.create();
EnhancedRESTMessage.prototype = Object.extendsObject(sn_ws.RESTMessageV2, {

    initialize: function(messageName, methodName) {
        sn_ws.RESTMessageV2.prototype.initialize.call(this, messageName, methodName);
        this.log = new GSLog('com.company.rest', 'EnhancedRESTMessage');
    },

    /**
     * Execute with automatic retry on failure
     */
    executeWithRetry: function(maxRetries) {
        var retries = maxRetries || 3;
        var lastError = null;

        for (var i = 0; i < retries; i++) {
            try {
                var response = this.execute();
                if (response.getStatusCode() >= 200 && response.getStatusCode() < 300) {
                    return response;
                }
                lastError = 'HTTP ' + response.getStatusCode();
            } catch (e) {
                lastError = e.message;
                this.log.warn('Retry ' + (i + 1) + ' failed: ' + lastError);
            }

            // Wait before retry (exponential backoff)
            if (i < retries - 1) {
                gs.sleep(1000 * Math.pow(2, i));
            }
        }

        throw new Error('All retries failed: ' + lastError);
    },

    /**
     * Execute and parse JSON response
     */
    executeAndParseJSON: function() {
        var response = this.execute();
        var body = response.getBody();

        try {
            return JSON.parse(body);
        } catch (e) {
            this.log.error('Failed to parse JSON: ' + body);
            throw new Error('Invalid JSON response');
        }
    },

    type: 'EnhancedRESTMessage'
});
```

#### Step 3.3: Create Base Class for Custom Hierarchy

**Base Class:**
```javascript
var BaseServiceHandler = Class.create();
BaseServiceHandler.prototype = {

    initialize: function(tableName) {
        this.tableName = tableName;
        this.log = new GSLog('com.company.handlers', this.type);
    },

    /**
     * Get record by sys_id
     * @param {String} sysId - Record sys_id
     * @returns {GlideRecord} Record or null
     */
    getRecord: function(sysId) {
        var gr = new GlideRecord(this.tableName);
        if (gr.get(sysId)) {
            return gr;
        }
        return null;
    },

    /**
     * Abstract method - must be overridden
     */
    process: function(record) {
        throw new Error('process() must be implemented by subclass');
    },

    /**
     * Abstract method - must be overridden
     */
    validate: function(record) {
        throw new Error('validate() must be implemented by subclass');
    },

    /**
     * Common logging method
     */
    logAction: function(action, recordId) {
        this.log.info(action + ' on ' + this.tableName + ': ' + recordId);
    },

    type: 'BaseServiceHandler'
};
```

**Concrete Implementation:**
```javascript
var IncidentServiceHandler = Class.create();
IncidentServiceHandler.prototype = Object.extendsObject(BaseServiceHandler, {

    initialize: function() {
        // Call parent constructor with table name
        BaseServiceHandler.prototype.initialize.call(this, 'incident');
    },

    /**
     * Override abstract method
     */
    process: function(record) {
        if (!this.validate(record)) {
            return false;
        }

        // Incident-specific processing
        this._assignToGroup(record);
        this._calculatePriority(record);
        this.logAction('Processed incident', record.sys_id);

        return true;
    },

    /**
     * Override abstract method
     */
    validate: function(record) {
        if (record.short_description.nil()) {
            this.log.error('Validation failed: missing short description');
            return false;
        }
        return true;
    },

    _assignToGroup: function(record) {
        // Implementation
    },

    _calculatePriority: function(record) {
        // Implementation
    },

    type: 'IncidentServiceHandler'
});
```

### Phase 4: Design Patterns

#### Step 4.1: Singleton Pattern

Use when you need exactly one instance shared across the application.

```javascript
var ConfigurationManager = Class.create();
ConfigurationManager.prototype = {

    initialize: function() {
        this._loadConfiguration();
    },

    _loadConfiguration: function() {
        this.config = {};

        var gr = new GlideRecord('sys_properties');
        gr.addQuery('name', 'STARTSWITH', 'com.company.');
        gr.query();

        while (gr.next()) {
            var key = gr.name.toString().replace('com.company.', '');
            this.config[key] = gr.value.toString();
        }
    },

    get: function(key) {
        return this.config[key];
    },

    set: function(key, value) {
        this.config[key] = value;

        // Persist to database
        var gr = new GlideRecord('sys_properties');
        gr.addQuery('name', 'com.company.' + key);
        gr.query();

        if (gr.next()) {
            gr.value = value;
            gr.update();
        } else {
            gr.initialize();
            gr.name = 'com.company.' + key;
            gr.value = value;
            gr.insert();
        }
    },

    type: 'ConfigurationManager'
};

/**
 * Singleton accessor
 * Usage: var config = ConfigurationManager.getInstance();
 */
ConfigurationManager.getInstance = function() {
    if (!ConfigurationManager._instance) {
        ConfigurationManager._instance = new ConfigurationManager();
    }
    return ConfigurationManager._instance;
};

// Clear singleton (for testing or refresh)
ConfigurationManager.clearInstance = function() {
    ConfigurationManager._instance = null;
};
```

**Usage:**
```javascript
// Get singleton instance
var config = ConfigurationManager.getInstance();

// Use configuration
var apiKey = config.get('api_key');
var timeout = config.get('timeout') || '30000';

// Update configuration
config.set('last_sync', gs.nowDateTime());
```

#### Step 4.2: Factory Pattern

Use when you need to create objects without specifying the exact class.

```javascript
var NotificationFactory = Class.create();
NotificationFactory.prototype = {

    initialize: function() {
        // Register notification types
        this.types = {
            'email': EmailNotification,
            'sms': SMSNotification,
            'slack': SlackNotification,
            'teams': TeamsNotification
        };
    },

    /**
     * Create notification handler based on type
     * @param {String} type - Notification type
     * @param {Object} options - Configuration options
     * @returns {Object} Notification handler
     */
    create: function(type, options) {
        var NotificationClass = this.types[type.toLowerCase()];

        if (!NotificationClass) {
            throw new Error('Unknown notification type: ' + type);
        }

        return new NotificationClass(options);
    },

    /**
     * Register custom notification type
     */
    register: function(type, handlerClass) {
        this.types[type.toLowerCase()] = handlerClass;
    },

    /**
     * Get available types
     */
    getAvailableTypes: function() {
        return Object.keys(this.types);
    },

    type: 'NotificationFactory'
};

// Base notification class
var BaseNotification = Class.create();
BaseNotification.prototype = {
    initialize: function(options) {
        this.options = options || {};
    },
    send: function(recipient, message) {
        throw new Error('send() must be implemented');
    },
    type: 'BaseNotification'
};

// Email implementation
var EmailNotification = Class.create();
EmailNotification.prototype = Object.extendsObject(BaseNotification, {
    send: function(recipient, message) {
        var email = new GlideEmailOutbound();
        email.setSubject(this.options.subject || 'Notification');
        email.setFrom(this.options.from || 'noreply@company.com');
        email.addAddress(recipient);
        email.setBody(message);
        email.send();
        return true;
    },
    type: 'EmailNotification'
});

// SMS implementation
var SMSNotification = Class.create();
SMSNotification.prototype = Object.extendsObject(BaseNotification, {
    send: function(recipient, message) {
        // SMS API integration
        var rest = new sn_ws.RESTMessageV2('SMS_API', 'send');
        rest.setStringParameterNoEscape('to', recipient);
        rest.setStringParameterNoEscape('message', message);
        var response = rest.execute();
        return response.getStatusCode() == 200;
    },
    type: 'SMSNotification'
});
```

**Usage:**
```javascript
var factory = new NotificationFactory();

// Create email notification
var emailHandler = factory.create('email', {
    subject: 'Important Alert',
    from: 'alerts@company.com'
});
emailHandler.send('user@company.com', 'Your incident was updated.');

// Create SMS notification
var smsHandler = factory.create('sms', {});
smsHandler.send('+1234567890', 'P1 Alert: Check your email.');

// Use multiple notification types
var types = ['email', 'slack'];
types.forEach(function(type) {
    var handler = factory.create(type, {});
    handler.send(recipient, message);
});
```

#### Step 4.3: Strategy Pattern

Use when you need interchangeable algorithms.

```javascript
var IncidentAssigner = Class.create();
IncidentAssigner.prototype = {

    initialize: function() {
        this.strategies = {
            'round_robin': new RoundRobinStrategy(),
            'least_busy': new LeastBusyStrategy(),
            'skills_based': new SkillsBasedStrategy(),
            'random': new RandomStrategy()
        };
        this.currentStrategy = 'round_robin';
    },

    /**
     * Set assignment strategy
     */
    setStrategy: function(strategyName) {
        if (!this.strategies[strategyName]) {
            throw new Error('Unknown strategy: ' + strategyName);
        }
        this.currentStrategy = strategyName;
    },

    /**
     * Assign incident using current strategy
     */
    assign: function(incidentGR) {
        var strategy = this.strategies[this.currentStrategy];
        var assignee = strategy.findAssignee(incidentGR);

        if (assignee) {
            incidentGR.assigned_to = assignee;
            return true;
        }
        return false;
    },

    type: 'IncidentAssigner'
};

// Strategy interface
var AssignmentStrategy = Class.create();
AssignmentStrategy.prototype = {
    findAssignee: function(incidentGR) {
        throw new Error('findAssignee() must be implemented');
    },
    type: 'AssignmentStrategy'
};

// Round Robin implementation
var RoundRobinStrategy = Class.create();
RoundRobinStrategy.prototype = Object.extendsObject(AssignmentStrategy, {
    findAssignee: function(incidentGR) {
        var groupId = incidentGR.assignment_group.toString();
        if (!groupId) return null;

        // Get last assigned user for this group
        var lastAssigned = gs.getProperty('round_robin.' + groupId, '');

        // Get all active members
        var members = [];
        var gm = new GlideRecord('sys_user_grmember');
        gm.addQuery('group', groupId);
        gm.addQuery('user.active', true);
        gm.query();

        while (gm.next()) {
            members.push(gm.user.toString());
        }

        if (members.length === 0) return null;

        // Find next user in rotation
        var lastIndex = members.indexOf(lastAssigned);
        var nextIndex = (lastIndex + 1) % members.length;
        var nextUser = members[nextIndex];

        // Save for next rotation
        gs.setProperty('round_robin.' + groupId, nextUser);

        return nextUser;
    },
    type: 'RoundRobinStrategy'
});

// Least Busy implementation
var LeastBusyStrategy = Class.create();
LeastBusyStrategy.prototype = Object.extendsObject(AssignmentStrategy, {
    findAssignee: function(incidentGR) {
        var groupId = incidentGR.assignment_group.toString();
        if (!groupId) return null;

        var leastBusy = null;
        var lowestCount = Infinity;

        var gm = new GlideRecord('sys_user_grmember');
        gm.addQuery('group', groupId);
        gm.addQuery('user.active', true);
        gm.query();

        while (gm.next()) {
            var userId = gm.user.toString();
            var count = this._getOpenIncidentCount(userId);

            if (count < lowestCount) {
                lowestCount = count;
                leastBusy = userId;
            }
        }

        return leastBusy;
    },

    _getOpenIncidentCount: function(userId) {
        var ga = new GlideAggregate('incident');
        ga.addQuery('assigned_to', userId);
        ga.addQuery('active', true);
        ga.addAggregate('COUNT');
        ga.query();

        if (ga.next()) {
            return parseInt(ga.getAggregate('COUNT'));
        }
        return 0;
    },
    type: 'LeastBusyStrategy'
});
```

**Usage:**
```javascript
var assigner = new IncidentAssigner();

// Configure strategy based on system property
var strategy = gs.getProperty('incident.assignment.strategy', 'round_robin');
assigner.setStrategy(strategy);

// Assign incident
if (assigner.assign(current)) {
    gs.info('Assigned to: ' + current.assigned_to.getDisplayValue());
} else {
    gs.warn('No assignee found');
}
```

### Phase 5: Scoped vs Global Script Includes

#### Step 5.1: Global Script Includes

**Characteristics:**
- Available across all scopes
- No namespace prefix required
- Can access all platform APIs
- Risk of naming conflicts

```
Tool: SN-Create-Record
Parameters:
  table_name: sys_script_include
  data:
    name: "GlobalUtils"
    api_name: "global.GlobalUtils"
    sys_scope: "global"
    access: "public"
    script: |
      var GlobalUtils = Class.create();
      GlobalUtils.prototype = {
          initialize: function() {},

          formatDate: function(gdt) {
              // Available to all scopes
              return gdt.getDisplayValue();
          },

          type: 'GlobalUtils'
      };
```

#### Step 5.2: Scoped Script Includes

**Characteristics:**
- Isolated within application scope
- Prefixed with scope name (e.g., `x_company_app.ClassName`)
- Access controlled by `access` field
- Safer namespace management

```
Tool: SN-Create-Record
Parameters:
  table_name: sys_script_include
  data:
    name: "ScopedUtils"
    api_name: "x_company_app.ScopedUtils"
    sys_scope: "[scoped_app_sys_id]"
    access: "public"
    script: |
      var ScopedUtils = Class.create();
      ScopedUtils.prototype = {
          initialize: function() {},

          /**
           * This method is accessible from other scopes
           * because access is 'public'
           */
          publicMethod: function() {
              return 'Accessible anywhere';
          },

          type: 'ScopedUtils'
      };
```

#### Step 5.3: Access Modifiers

| Access Level | Scope Access | Use Case |
|--------------|--------------|----------|
| `public` | All scopes | Shared utilities, APIs |
| `package_private` | Same scope only | Internal helpers |
| `private` | Same scope, no inheritance | Protected utilities |

**Calling Scoped Script Include from Global:**
```javascript
// From global scope, need full API name
var utils = new x_company_app.ScopedUtils();
var result = utils.publicMethod();
```

**Calling Global Script Include from Scoped:**
```javascript
// From scoped app, global is accessible
var globalUtils = new GlobalUtils();
var result = globalUtils.formatDate(new GlideDateTime());
```

### Phase 6: When to Use Script Includes vs Business Rules

#### Decision Matrix

| Scenario | Use Script Include | Use Business Rule |
|----------|-------------------|-------------------|
| Reusable logic (multiple places) | Yes | No |
| Single table, single trigger | No | Yes |
| Client-server communication | Yes (GlideAjax) | No |
| Unit testing required | Yes | Possible but harder |
| Complex algorithm/calculation | Yes | Extract to Script Include |
| Simple field validation | No | Yes |
| Workflow/Flow activity | Yes | N/A |
| Scheduled job logic | Extract to Script Include | N/A |
| Cross-table operations | Yes | Possible |

#### Anti-Patterns to Avoid

**BAD: Duplicating Logic in Business Rules**
```javascript
// Business Rule 1 on Incident
if (current.priority == 1 && current.assignment_group.nil()) {
    current.assignment_group = getDefaultGroup('incident');
}

// Business Rule 2 on Change - DUPLICATE LOGIC!
if (current.priority == 1 && current.assignment_group.nil()) {
    current.assignment_group = getDefaultGroup('change_request');
}
```

**GOOD: Extract to Script Include**
```javascript
// Script Include: AssignmentUtils
var AssignmentUtils = Class.create();
AssignmentUtils.prototype = {
    initialize: function() {},

    ensureAssignment: function(record, tableName) {
        if (record.priority == 1 && record.assignment_group.nil()) {
            record.assignment_group = this.getDefaultGroup(tableName);
        }
    },

    getDefaultGroup: function(tableName) {
        // Lookup logic
    },

    type: 'AssignmentUtils'
};

// Business Rule - Simple delegation
var utils = new AssignmentUtils();
utils.ensureAssignment(current, 'incident');
```

### Phase 7: Unit Testing Script Includes

#### Step 7.1: Create ATF Test for Script Include

```
Tool: SN-Create-Record
Parameters:
  table_name: sys_atf_test
  data:
    name: "Test IncidentUtils - calculatePriority"
    description: "Unit tests for IncidentUtils.calculatePriority method"
    active: true
```

#### Step 7.2: Create Test Steps

**Test Step 1: Test P1 Calculation**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_atf_step
  data:
    test: [test_sys_id]
    order: 100
    step_config: "atf_test_step_config:run_server_side_script"
    description: "Test P1 priority calculation"
    inputs:
      script: |
        (function(outputs, steps, params, stepResult, assertEqual) {
            // Arrange
            var incident = new GlideRecord('incident');
            incident.newRecord();
            incident.impact = 1;
            incident.urgency = 1;

            // Act
            var utils = new IncidentUtils();
            var priority = utils.calculatePriority(incident);

            // Assert
            assertEqual({
                name: 'Priority should be 1 for high impact + high urgency',
                shouldbe: 1,
                value: priority
            });

        })(outputs, steps, params, stepResult, assertEqual);
```

**Test Step 2: Test P3 Calculation**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_atf_step
  data:
    test: [test_sys_id]
    order: 200
    step_config: "atf_test_step_config:run_server_side_script"
    description: "Test P3 priority calculation"
    inputs:
      script: |
        (function(outputs, steps, params, stepResult, assertEqual) {
            // Arrange
            var incident = new GlideRecord('incident');
            incident.newRecord();
            incident.impact = 2;
            incident.urgency = 2;

            // Act
            var utils = new IncidentUtils();
            var priority = utils.calculatePriority(incident);

            // Assert
            assertEqual({
                name: 'Priority should be 3 for medium impact + medium urgency',
                shouldbe: 3,
                value: priority
            });

        })(outputs, steps, params, stepResult, assertEqual);
```

#### Step 7.3: Test Mock Pattern

**Mockable Script Include:**
```javascript
var IncidentService = Class.create();
IncidentService.prototype = {

    initialize: function(dependencies) {
        // Dependency injection for testability
        this.notificationService = dependencies && dependencies.notificationService
            ? dependencies.notificationService
            : new NotificationService();

        this.assignmentUtils = dependencies && dependencies.assignmentUtils
            ? dependencies.assignmentUtils
            : new AssignmentUtils();
    },

    processNewIncident: function(incidentGR) {
        // Assign
        this.assignmentUtils.autoAssign(incidentGR);

        // Notify
        if (incidentGR.priority == 1) {
            this.notificationService.notifyOnCall(incidentGR);
        }

        return true;
    },

    type: 'IncidentService'
};
```

**ATF Test with Mocks:**
```javascript
(function(outputs, steps, params, stepResult, assertEqual) {

    // Create mock notification service
    var mockNotificationService = {
        notifyCalled: false,
        lastIncident: null,
        notifyOnCall: function(incidentGR) {
            this.notifyCalled = true;
            this.lastIncident = incidentGR;
        }
    };

    // Create mock assignment utils
    var mockAssignmentUtils = {
        autoAssign: function(incidentGR) {
            incidentGR.assigned_to = 'mock_user_id';
        }
    };

    // Inject mocks
    var service = new IncidentService({
        notificationService: mockNotificationService,
        assignmentUtils: mockAssignmentUtils
    });

    // Arrange
    var incident = new GlideRecord('incident');
    incident.newRecord();
    incident.priority = 1;
    incident.short_description = 'Test incident';

    // Act
    service.processNewIncident(incident);

    // Assert
    assertEqual({
        name: 'Notification should be called for P1',
        shouldbe: true,
        value: mockNotificationService.notifyCalled
    });

    assertEqual({
        name: 'Incident should be assigned',
        shouldbe: 'mock_user_id',
        value: incident.assigned_to.toString()
    });

})(outputs, steps, params, stepResult, assertEqual);
```

## Tool Usage Summary

### MCP Tools

| Tool | Purpose |
|------|---------|
| `SN-Create-Record` | Create new script includes |
| `SN-Update-Record` | Update existing script includes |
| `SN-Query-Table` | Find script includes |
| `SN-Get-Record` | Get script include details |
| `SN-Get-Record` | Pull script and freshness metadata for local development |
| `SN-Update-Record` | Push a reviewed script after a remote freshness check |
| `SN-Execute-Background-Script` | Test script includes |
| `SN-Get-Table-Schema` | Explore sys_script_include fields |

Happy Platform MCP 6.1 has no automatic watch or synchronization tool. For
local development, retrieve `script`, `sys_updated_on`, and `sys_mod_count` with
`SN-Get-Record`; edit locally; retrieve them again to detect conflicts; then
push only the reviewed `script` field with `SN-Update-Record`. Include the
explicit target `instance` on each call.

### REST API

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/now/table/sys_script_include` | POST | Create script include |
| `/api/now/table/sys_script_include/{id}` | PATCH | Update script include |
| `/api/now/table/sys_script_include` | GET | Query script includes |

## Best Practices

### Code Organization

- **One class per file** - Makes version control cleaner
- **Meaningful names** - `CustomerOrderProcessor` not `Utils2`
- **Consistent naming** - PascalCase for classes, camelCase for methods
- **Private methods** - Prefix with underscore: `_internalMethod`
- **JSDoc comments** - Document all public methods

### Performance

- **Lazy loading** - Don't load dependencies until needed
- **Caching** - Cache expensive lookups (GlideRecord queries)
- **Avoid global state** - Use instance variables or parameters
- **Minimize GlideRecord queries** - Batch where possible

### Security

- **Validate inputs** - Never trust client data in GlideAjax
- **Check permissions** - Use `canRead()`, `canWrite()` before operations
- **Limit exposure** - Only mark methods client_callable when necessary
- **Implement isPublic()** - Whitelist allowed methods

### Testing

- **Write tests first** - TDD improves design
- **Use dependency injection** - Makes mocking easier
- **Test edge cases** - Null values, empty strings, boundary conditions
- **Keep tests fast** - Mock expensive operations

## Troubleshooting

### Script Include Not Found

**Symptom:** `TypeError: ClassName is not a constructor`
**Cause:** Script include not active or name mismatch
**Solution:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_script_include
  query: name=ClassName
  fields: name,api_name,active,sys_scope.name
```
Verify:
1. `active` is true
2. `name` matches class definition exactly
3. Calling from correct scope

### GlideAjax Returns Empty

**Symptom:** `getAnswer()` returns empty or undefined
**Cause:** Method not returning value or not client_callable
**Solution:**
1. Verify `client_callable` is true
2. Verify method returns a value (string)
3. Check `isPublic()` includes your method
4. Check system logs for server errors

### Cannot Extend Class

**Symptom:** Parent methods not available
**Cause:** Incorrect extension syntax
**Solution:**
```javascript
// WRONG
ChildClass.prototype = ParentClass.prototype;

// CORRECT
ChildClass.prototype = Object.extendsObject(ParentClass, {
    // child methods
    type: 'ChildClass'
});
```

### Scoped Class Not Accessible

**Symptom:** Cannot instantiate scoped script include
**Cause:** Access modifier or scope issue
**Solution:**
1. Check `access` field (should be 'public' for cross-scope)
2. Use full API name: `new x_scope.ClassName()`
3. Verify calling code is in allowed scope

## Examples

### Example 1: Complete CRUD Service

```javascript
var CRUDService = Class.create();
CRUDService.prototype = {

    initialize: function(tableName) {
        this.tableName = tableName;
        this.log = new GSLog('com.company.crud', 'CRUDService');
    },

    create: function(data) {
        var gr = new GlideRecord(this.tableName);
        gr.initialize();

        for (var field in data) {
            if (data.hasOwnProperty(field) && gr.isValidField(field)) {
                gr.setValue(field, data[field]);
            }
        }

        var sysId = gr.insert();
        this.log.info('Created ' + this.tableName + ': ' + sysId);
        return sysId;
    },

    read: function(sysId) {
        var gr = new GlideRecord(this.tableName);
        if (gr.get(sysId)) {
            return this._toObject(gr);
        }
        return null;
    },

    update: function(sysId, data) {
        var gr = new GlideRecord(this.tableName);
        if (!gr.get(sysId)) {
            return false;
        }

        for (var field in data) {
            if (data.hasOwnProperty(field) && gr.isValidField(field)) {
                gr.setValue(field, data[field]);
            }
        }

        gr.update();
        this.log.info('Updated ' + this.tableName + ': ' + sysId);
        return true;
    },

    delete: function(sysId) {
        var gr = new GlideRecord(this.tableName);
        if (gr.get(sysId)) {
            gr.deleteRecord();
            this.log.info('Deleted ' + this.tableName + ': ' + sysId);
            return true;
        }
        return false;
    },

    findBy: function(query) {
        var results = [];
        var gr = new GlideRecord(this.tableName);
        gr.addEncodedQuery(query);
        gr.query();

        while (gr.next()) {
            results.push(this._toObject(gr));
        }

        return results;
    },

    _toObject: function(gr) {
        var obj = {};
        var fields = new GlideRecordUtil().getFields(gr);

        for (var i = 0; i < fields.size(); i++) {
            var field = fields.get(i);
            obj[field] = gr.getValue(field);
        }

        return obj;
    },

    type: 'CRUDService'
};
```

### Example 2: Complete GlideAjax Service

```javascript
var FormHelperAjax = Class.create();
FormHelperAjax.prototype = Object.extendsObject(AbstractAjaxProcessor, {

    getUserDetails: function() {
        var userId = this.getParameter('sysparm_user_id');
        var result = { success: false };

        var gr = new GlideRecord('sys_user');
        if (gr.get(userId)) {
            result.success = true;
            result.data = {
                sys_id: gr.sys_id.toString(),
                name: gr.name.toString(),
                email: gr.email.toString(),
                department: gr.department.getDisplayValue(),
                manager: gr.manager.getDisplayValue(),
                phone: gr.phone.toString()
            };
        } else {
            result.error = 'User not found';
        }

        return JSON.stringify(result);
    },

    getCIDetails: function() {
        var ciId = this.getParameter('sysparm_ci_id');
        var result = { success: false };

        var gr = new GlideRecord('cmdb_ci');
        if (gr.get(ciId)) {
            result.success = true;
            result.data = {
                sys_id: gr.sys_id.toString(),
                name: gr.name.toString(),
                sys_class_name: gr.sys_class_name.getDisplayValue(),
                operational_status: gr.operational_status.getDisplayValue(),
                support_group: gr.support_group.getDisplayValue()
            };
        } else {
            result.error = 'CI not found';
        }

        return JSON.stringify(result);
    },

    validateEmail: function() {
        var email = this.getParameter('sysparm_email');
        var result = { valid: false };

        // Basic email regex
        var emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        result.valid = emailPattern.test(email);

        if (result.valid) {
            // Check if email exists in system
            var gr = new GlideRecord('sys_user');
            gr.addQuery('email', email);
            gr.query();
            result.exists = gr.hasNext();
        }

        return JSON.stringify(result);
    },

    isPublic: function() {
        return true;
    },

    type: 'FormHelperAjax'
});
```

## Related Skills

- `admin/script-sync` - Local development and version control
- `admin/update-set-management` - Track script changes
- `admin/application-scope` - Scoped application development
- `admin/script-execution` - Test scripts
- `catalog/variable-management` - Using script includes in catalogs

## References

- [ServiceNow Script Includes](https://docs.servicenow.com/bundle/utah-application-development/page/script/server-scripting/concept/c_ScriptIncludes.html)
- [GlideAjax](https://docs.servicenow.com/bundle/utah-application-development/page/script/ajax/concept/c_GlideAjax.html)
- [Class API](https://docs.servicenow.com/bundle/utah-api-reference/page/app-store/dev_portal/API_reference/Class/concept/c_ClassAPI.html)
- [Scoped Script Includes](https://docs.servicenow.com/bundle/utah-application-development/page/build/applications/concept/c_ScopedScriptIncludes.html)
- [ATF Testing](https://docs.servicenow.com/bundle/utah-application-development/page/administer/auto-test-framework/concept/automated-test-framework.html)
