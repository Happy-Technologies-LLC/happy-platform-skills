---
name: voice-assist
version: 1.0.0
description: Configure AI Voice Agents for ServiceNow including speech-to-text, intent recognition, voice-driven workflows, IVR integration, and conversational AI for voice channels
author: Happy Technologies LLC
tags: [genai, voice, conversational-ai, speech-to-text, ivr, intent, virtual-agent, telephony]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp:
    - SN-Query-Table
    - SN-Create-Record
    - SN-Update-Record
    - SN-Read-Record
    - SN-Execute-Background-Script
    - SN-Discover-Table-Schema
  rest:
    - /api/now/table/sys_cs_topic
    - /api/now/table/interaction
    - /api/now/table/sys_cs_topic_detail
    - /api/now/table/sys_cs_message
    - /api/now/table/sys_cs_intent
    - /api/now/table/sys_cs_context
    - /api/now/table/sys_properties
  native:
    - Bash
complexity: advanced
estimated_time: 30-60 minutes
---

# AI Voice Agent Configuration

## Overview

This skill covers configuring AI-powered Voice Agents in ServiceNow for telephony and voice-driven interactions. It covers:

- Setting up Virtual Agent topics for voice channel compatibility
- Configuring speech-to-text (STT) and text-to-speech (TTS) engine integration
- Designing intent recognition models for voice input with NLU training
- Building voice-specific conversation flows with DTMF fallback support
- Integrating with IVR systems and telephony providers (Twilio, Genesys, Amazon Connect)
- Managing voice interaction records and analytics
- Handling voice-specific challenges: noise, accents, disambiguation, and timeout management

**When to use:**
- When deploying a voice-enabled IT helpdesk or HR service center
- Setting up IVR self-service with AI-driven natural language understanding
- When extending existing Virtual Agent topics to support voice channels
- Building voice-first workflows for field service or hands-free scenarios
- Configuring voice authentication and caller verification

## Prerequisites

- **Roles:** `admin`, `sn_va.topic_admin`, `sn_cs.admin`, or `sn_va.voice_admin`
- **Plugins:** `com.glide.cs.chatbot` (Virtual Agent), `com.sn_va.voice` (Voice), `com.glide.interaction` (Agent Workspace Interaction)
- **Access:** sys_cs_topic, interaction, sys_cs_intent, sys_properties tables
- **Knowledge:** Conversational AI design principles, telephony basics (SIP, DTMF), and your organization's IVR call flow requirements
- **Integrations:** A telephony provider (Twilio, Genesys Cloud, Amazon Connect) configured with ServiceNow

## Key Voice Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `sys_cs_topic` | Virtual Agent conversation topics | name, description, channel, state, nlu_intent, category, order |
| `interaction` | Voice/chat interaction records | number, channel, state, opened_for, assignment_group, duration, disposition, recording_url |
| `sys_cs_topic_detail` | Topic flow step definitions | topic, step_type, prompt_text, order, variable_name, next_step |
| `sys_cs_message` | Conversation messages | interaction, message_type, body, direction, timestamp |
| `sys_cs_intent` | NLU intent definitions | name, description, model, training_phrases, confidence_threshold |
| `sys_cs_context` | Conversation context variables | name, data_type, scope, default_value |
| `sys_properties` | System configuration properties | name, value, description, type |

## Procedure

### Step 1: Verify Voice Plugin and Telephony Setup

Check that voice capabilities are enabled and configured.

**Using MCP (Claude Code/Desktop):**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_properties
  query: nameLIKEva.voice^ORnameLIKEcs.voice^ORnameLIKEtelephony
  fields: name,value,description
  limit: 30
```

**Using REST API:**
```bash
GET /api/now/table/sys_properties?sysparm_query=nameLIKEva.voice^ORnameLIKEcs.voice^ORnameLIKEtelephony&sysparm_fields=name,value,description&sysparm_limit=30
```

### Step 2: Configure Speech-to-Text Settings

Set up STT engine properties for voice input processing.

**Using MCP:**
```
Tool: SN-Update-Record
Parameters:
  table_name: sys_properties
  sys_id: [stt_property_sys_id]
  data:
    value: "google_cloud_speech"
```

**Key STT properties to configure:**

| Property | Purpose | Recommended Value |
|----------|---------|-------------------|
| `sn.va.voice.stt.provider` | STT engine provider | google_cloud_speech, aws_transcribe, azure_speech |
| `sn.va.voice.stt.language` | Primary recognition language | en-US |
| `sn.va.voice.stt.model` | Recognition model type | phone_call (optimized for telephony) |
| `sn.va.voice.stt.profanity_filter` | Filter profanity | true |
| `sn.va.voice.stt.interim_results` | Enable partial results | true |
| `sn.va.voice.tts.provider` | TTS engine provider | google_cloud_tts, aws_polly, azure_speech |
| `sn.va.voice.tts.voice` | TTS voice selection | en-US-Neural2-C (natural voice) |
| `sn.va.voice.tts.speed` | Speech rate | 1.0 (normal speed) |

### Step 3: Create Voice-Enabled Topics

Build Virtual Agent topics optimized for voice interactions.

**Using MCP:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_cs_topic
  fields:
    name: "Password Reset - Voice"
    description: "Voice-optimized password reset flow with caller verification and DTMF fallback"
    channel: voice
    state: draft
    category: it_support
    nlu_intent: password_reset
    greeting_message: "I can help you reset your password. First, I need to verify your identity. Can you please tell me your employee ID?"
```

**Using REST API:**
```bash
POST /api/now/table/sys_cs_topic
Content-Type: application/json

{
  "name": "Password Reset - Voice",
  "description": "Voice-optimized password reset flow with caller verification",
  "channel": "voice",
  "state": "draft",
  "category": "it_support",
  "nlu_intent": "password_reset"
}
```

### Step 4: Design Voice Conversation Flow Steps

Add topic detail steps for the voice conversation.

**Using MCP:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_cs_topic_detail
  fields:
    topic: [topic_sys_id]
    step_type: user_input
    prompt_text: "Please say or enter your employee ID number."
    order: 100
    variable_name: employee_id
    input_type: alphanumeric
    dtmf_enabled: true
    timeout_seconds: 10
    retry_count: 3
    retry_prompt: "I did not catch that. Please say your employee ID again, or press the numbers on your phone keypad."
    no_input_prompt: "Are you still there? Please say your employee ID to continue."
```

**Add verification step:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_cs_topic_detail
  fields:
    topic: [topic_sys_id]
    step_type: script_action
    order: 200
    script: |
      var user = new GlideRecord('sys_user');
      user.addQuery('employee_number', vaInputs.employee_id);
      user.query();
      if (user.next()) {
        vaVars.user_sys_id = user.sys_id.toString();
        vaVars.user_name = user.name.toString();
        vaVars.verified = true;
      } else {
        vaVars.verified = false;
      }
    next_step_success: 300
    next_step_failure: 250
```

**Add confirmation prompt:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_cs_topic_detail
  fields:
    topic: [topic_sys_id]
    step_type: user_input
    prompt_text: "I found your account. Just to confirm, is your name {user_name}? Please say yes or no."
    order: 300
    variable_name: name_confirmed
    input_type: boolean
    dtmf_mapping: "1=yes,2=no"
```

### Step 5: Configure NLU Intent for Voice

Train the NLU model to recognize voice-specific utterances.

**Using MCP:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_cs_intent
  fields:
    name: password_reset
    description: "Intent for password reset requests via voice channel"
    model: default_nlu_model
    confidence_threshold: 0.7
    training_phrases: |
      I need to reset my password
      my password is not working
      I forgot my password
      can you help me change my password
      I am locked out of my account
      password expired
      I cannot log in
      reset password please
      my password does not work anymore
      I need a new password
      help me with my password
      account is locked
```

**Using REST API:**
```bash
POST /api/now/table/sys_cs_intent
Content-Type: application/json

{
  "name": "password_reset",
  "description": "Intent for password reset requests via voice",
  "confidence_threshold": "0.7",
  "training_phrases": "I need to reset my password\nmy password is not working\nI forgot my password\ncan you help me change my password\nI am locked out"
}
```

### Step 6: Set Up IVR Integration

Configure the telephony provider connection.

**Using MCP:**
```
Tool: SN-Execute-Background-Script
Parameters:
  script: |
    // Configure Twilio integration properties
    var props = {
      'sn.va.voice.telephony.provider': 'twilio',
      'sn.va.voice.telephony.account_sid': '[twilio_account_sid]',
      'sn.va.voice.telephony.phone_number': '+18005551234',
      'sn.va.voice.telephony.webhook_url': gs.getProperty('glide.servlet.uri') + 'api/sn_va/voice/webhook',
      'sn.va.voice.telephony.recording_enabled': 'true',
      'sn.va.voice.telephony.max_call_duration': '1800',
      'sn.va.voice.telephony.transfer_number': '+18005555678'
    };

    for (var key in props) {
      var prop = new GlideRecord('sys_properties');
      prop.addQuery('name', key);
      prop.query();
      if (prop.next()) {
        prop.value = props[key];
        prop.update();
      } else {
        prop.initialize();
        prop.name = key;
        prop.value = props[key];
        prop.description = 'Voice agent telephony configuration';
        prop.insert();
      }
    }
    gs.info('Telephony properties configured: ' + Object.keys(props).length + ' properties set.');
  description: "Voice: Configure telephony provider integration properties"
```

### Step 7: Monitor Voice Interactions

Query interaction records for voice channel analytics.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: interaction
  query: channel=voice^ORDERBYDESCsys_created_on
  fields: sys_id,number,channel,state,opened_for,assignment_group,duration,disposition,topic,sys_created_on,close_notes
  limit: 50
```

**Generate voice analytics:**
```
Tool: SN-Execute-Background-Script
Parameters:
  script: |
    var analytics = {
      period: 'Last 30 days',
      total_calls: 0,
      avg_duration_seconds: 0,
      self_service_rate: 0,
      transfer_rate: 0,
      by_disposition: {},
      by_topic: {},
      avg_confidence: 0
    };

    var ga = new GlideAggregate('interaction');
    ga.addQuery('channel', 'voice');
    ga.addQuery('sys_created_on', '>=', gs.daysAgo(30));
    ga.addAggregate('COUNT');
    ga.addAggregate('AVG', 'duration');
    ga.query();
    if (ga.next()) {
      analytics.total_calls = parseInt(ga.getAggregate('COUNT'));
      analytics.avg_duration_seconds = Math.round(parseFloat(ga.getAggregate('AVG', 'duration')) || 0);
    }

    var resolved = new GlideAggregate('interaction');
    resolved.addQuery('channel', 'voice');
    resolved.addQuery('sys_created_on', '>=', gs.daysAgo(30));
    resolved.addQuery('disposition', 'resolved');
    resolved.addAggregate('COUNT');
    resolved.query();
    if (resolved.next() && analytics.total_calls > 0) {
      analytics.self_service_rate = Math.round((parseInt(resolved.getAggregate('COUNT')) / analytics.total_calls) * 100);
    }

    gs.info('VOICE ANALYTICS:\n' + JSON.stringify(analytics, null, 2));
  description: "Voice: Generate voice interaction analytics for the last 30 days"
```

## Tool Usage

| Operation | MCP Tool | REST Endpoint |
|-----------|----------|---------------|
| Query Topics | SN-Query-Table | GET /api/now/table/sys_cs_topic |
| Create Topics | SN-Create-Record | POST /api/now/table/sys_cs_topic |
| Create Flow Steps | SN-Create-Record | POST /api/now/table/sys_cs_topic_detail |
| Configure Intents | SN-Create-Record | POST /api/now/table/sys_cs_intent |
| Query Interactions | SN-Query-Table | GET /api/now/table/interaction |
| Set Properties | SN-Execute-Background-Script | POST /api/now/table/sys_properties |
| Schema Discovery | SN-Discover-Table-Schema | GET /api/now/table/sys_dictionary |

## Best Practices

- **Voice-First Design:** Write prompts for the ear, not the eye; keep responses under 30 words for voice
- **DTMF Fallback:** Always provide keypad input as a fallback for every voice input step
- **Timeout Handling:** Set 8-10 second timeouts with graceful re-prompts; offer agent transfer after 3 failures
- **Confirmation Steps:** Always confirm critical inputs (employee ID, ticket number) before taking action
- **Barge-In Support:** Enable barge-in so callers can interrupt prompts to speed up experienced-user flows
- **Hold Music/Messages:** Configure appropriate hold experiences for agent transfer queues
- **Recording Consent:** Implement call recording consent prompts as required by jurisdiction
- **Error Recovery:** Design every conversation path to have an exit to a live agent; never leave callers in a dead end
- **Accent Adaptation:** Use STT models trained on diverse accents; consider region-specific language models
- **Testing:** Test with real phone calls, not just text simulation; background noise and audio quality differ significantly

## Troubleshooting

### Speech Recognition Accuracy Is Low

**Symptom:** STT frequently misrecognizes caller speech
**Cause:** Default STT model may not be optimized for telephony audio quality (8kHz narrowband)
**Solution:** Switch STT model to `phone_call` or `telephony` variant. Add custom vocabulary for company-specific terms. Check audio codec compatibility (G.711 recommended).

### Caller Gets Stuck in Loop

**Symptom:** Callers report being asked the same question repeatedly
**Cause:** Topic flow step retry logic lacks an exit condition or max-retry transfer
**Solution:** Set `retry_count` to 3 maximum on all input steps. Add an explicit "transfer to agent" step after max retries.

### Voice Topic Not Triggering

**Symptom:** Calls connect but the voice topic does not start
**Cause:** Topic channel filter excludes voice, or the NLU confidence threshold is too high
**Solution:** Verify `channel=voice` on the topic record. Lower NLU confidence threshold to 0.6 for voice (speech recognition introduces noise).

### Integration Webhook Not Receiving Calls

**Symptom:** Telephony provider configured but calls do not reach ServiceNow
**Cause:** Webhook URL is incorrect, firewall blocks inbound traffic, or SSL certificate issue
**Solution:** Verify the webhook URL matches `{instance}/api/sn_va/voice/webhook`. Check network ACLs and certificate validity. Test with the provider's webhook validator tool.

## Examples

### Example 1: IT Helpdesk Voice Agent

**Scenario:** Deploy a voice agent for common IT support requests

**Topics to create:**
1. Password Reset (voice-optimized with MFA verification)
2. VPN Connectivity (guided troubleshooting with yes/no questions)
3. Software Request (capture software name and justification)
4. Incident Status Check (look up by ticket number or caller ID)
5. Agent Transfer (graceful handoff with context)

**Sample interaction:**
- Caller: "I need to reset my password"
- Agent: "I can help with that. For security, I need to verify your identity. Please say your employee ID."
- Caller: "One two three four five"
- Agent: "Thank you. I found your account for John Smith. Is that correct?"
- Caller: "Yes"
- Agent: "A password reset link has been sent to your registered email. You should receive it within 2 minutes. Is there anything else I can help with?"

### Example 2: HR Benefits Voice Self-Service

**Scenario:** Configure voice agent for benefits enrollment questions

```
Tool: SN-Create-Record
Parameters:
  table_name: sys_cs_topic
  fields:
    name: "Benefits Inquiry - Voice"
    description: "Voice self-service for benefits plan information, enrollment status, and coverage details"
    channel: voice
    state: draft
    category: hr_benefits
    nlu_intent: benefits_inquiry
```

## Related Skills

- `genai/playbook-generation` - Process automation for voice workflows
- `genai/flow-generation` - Flow Designer for voice-triggered automation
- `csm/chat-recommendation` - Chat-based recommendations (extend to voice)
- `hrsd/chat-reply-recommendation` - HR chat replies adaptable to voice
- `admin/workflow-creation` - Build workflows triggered by voice interactions
