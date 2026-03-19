---
name: document-extraction
version: 1.0.0
description: Extract structured data from documents (invoices, forms, contracts) using ServiceNow Document Intelligence with extraction template configuration and validation rules
author: Happy Technologies LLC
tags: [document, extraction, intelligence, ocr, invoice, forms, templates, validation]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp:
    - SN-NL-Search
    - SN-Query-Table
    - SN-Read-Record
    - SN-Update-Record
    - SN-Add-Work-Notes
    - SN-Create-Record
  rest:
    - /api/now/table/sn_doc_intelligence_extraction
    - /api/now/table/sn_doc_template
    - /api/now/table/sys_attachment
    - /api/now/table/sn_doc_intelligence_field_map
    - /api/now/table/sn_doc_intelligence_extraction_result
    - /api/now/table/sn_doc_intelligence_task
    - /api/now/table/ast_contract
  native:
    - Bash
complexity: advanced
estimated_time: 15-30 minutes
---

# Document Extraction

## Overview

This skill provides a structured approach to extracting structured data from documents using ServiceNow Document Intelligence. It helps you:

- Configure and manage extraction templates in `sn_doc_template` for different document types (invoices, contracts, forms, purchase orders)
- Submit documents for extraction via the `sn_doc_intelligence_extraction` pipeline
- Define field mappings in `sn_doc_intelligence_field_map` to map extracted data to ServiceNow table fields
- Review and validate extraction results from `sn_doc_intelligence_extraction_result`
- Set up validation rules to ensure data quality and flag low-confidence extractions
- Handle extraction failures and retrain models for improved accuracy

**When to use:** When you need to process documents at scale (batch invoice processing, contract metadata extraction, form digitization), when manually entering data from documents is error-prone or time-consuming, or when setting up new document processing pipelines.

**Plugin required:** `com.sn_doc_intelligence`

## Prerequisites

- **Roles:** `sn_doc_intelligence_admin`, `sn_doc_intelligence_user`, or `admin`
- **Access:** Read/write access to `sn_doc_intelligence_extraction`, `sn_doc_template`, `sn_doc_intelligence_field_map`, and `sys_attachment` tables
- **Knowledge:** Understanding of the document types to be processed, their field layouts, and the target ServiceNow tables for extracted data
- **Plugin:** Document Intelligence (`com.sn_doc_intelligence`) must be activated
- **Documents:** Source documents must be in supported formats (PDF, PNG, JPG, TIFF)

## Procedure

### Step 1: Review Available Extraction Templates

Check which document extraction templates are already configured in your instance.

**Using MCP (Claude Code/Desktop):**
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_doc_template
  query: active=true
  fields: sys_id,name,description,document_type,target_table,state,extraction_model,confidence_threshold,field_count
  limit: 50
  order_by: name
```

**Using REST API:**
```bash
GET /api/now/table/sn_doc_template?sysparm_query=active=true^ORDERBYname&sysparm_fields=sys_id,name,description,document_type,target_table,state,extraction_model,confidence_threshold,field_count&sysparm_limit=50&sysparm_display_value=true
```

Common template types:

| Document Type | Target Table | Use Case |
|--------------|-------------|----------|
| Invoice | `sn_proc_invoice` | AP invoice processing |
| Purchase Order | `proc_po` | PO data entry |
| Contract | `ast_contract` | Contract metadata extraction |
| W-9 / Tax Form | `core_company` | Vendor tax information |
| ID Document | `sys_user` | Identity verification |
| Insurance Certificate | `ast_contract` | COI tracking |
| Work Order | `wm_order` | Field service documents |

### Step 2: Create or Configure an Extraction Template

If no template exists for your document type, create one.

**Using MCP:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sn_doc_template
  fields:
    name: "Vendor Invoice Template"
    description: "Extracts header and line-item data from vendor invoices for accounts payable processing"
    document_type: invoice
    target_table: sn_proc_invoice
    confidence_threshold: 0.85
    active: true
    state: draft
```

**Using REST API:**
```bash
POST /api/now/table/sn_doc_template
Content-Type: application/json

{
  "name": "Vendor Invoice Template",
  "description": "Extracts header and line-item data from vendor invoices",
  "document_type": "invoice",
  "target_table": "sn_proc_invoice",
  "confidence_threshold": "0.85",
  "active": "true",
  "state": "draft"
}
```

### Step 3: Define Field Mappings

Map document fields to ServiceNow table columns for each extraction template.

**Using MCP:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sn_doc_intelligence_field_map
  fields:
    template: [template_sys_id]
    source_field: "Invoice Number"
    target_table: sn_proc_invoice
    target_field: number
    field_type: string
    required: true
    validation_regex: "^INV-[0-9]{4,10}$"
    order: 100
```

Repeat for each field mapping:

| Source Field (Document) | Target Field (Table) | Type | Required | Validation |
|------------------------|---------------------|------|----------|------------|
| Invoice Number | `number` | String | Yes | Pattern match |
| Invoice Date | `invoice_date` | Date | Yes | Valid date |
| Due Date | `due_date` | Date | Yes | After invoice date |
| Vendor Name | `vendor` | Reference | Yes | Match `core_company` |
| PO Number | `po_number` | String | No | Match `proc_po` |
| Subtotal | `subtotal` | Currency | Yes | Positive number |
| Tax Amount | `tax` | Currency | No | Non-negative |
| Total Amount | `invoice_amount` | Currency | Yes | subtotal + tax |
| Line Item Description | `line_items.description` | String | Yes | Non-empty |
| Line Quantity | `line_items.quantity` | Integer | Yes | Positive integer |
| Line Unit Price | `line_items.unit_price` | Currency | Yes | Positive number |

**Using REST API:**
```bash
POST /api/now/table/sn_doc_intelligence_field_map
Content-Type: application/json

{
  "template": "[template_sys_id]",
  "source_field": "Invoice Number",
  "target_table": "sn_proc_invoice",
  "target_field": "number",
  "field_type": "string",
  "required": "true",
  "validation_regex": "^INV-[0-9]{4,10}$",
  "order": "100"
}
```

### Step 4: Submit Documents for Extraction

Create an extraction request to process a document through the pipeline.

**Using MCP:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sn_doc_intelligence_extraction
  fields:
    template: [template_sys_id]
    source_document: [attachment_sys_id]
    document_type: invoice
    state: submitted
    priority: 3
    requested_by: [user_sys_id]
    short_description: "Extract data from vendor invoice INV-2026-0456"
```

**Using REST API:**
```bash
POST /api/now/table/sn_doc_intelligence_extraction
Content-Type: application/json

{
  "template": "[template_sys_id]",
  "source_document": "[attachment_sys_id]",
  "document_type": "invoice",
  "state": "submitted",
  "priority": "3",
  "requested_by": "[user_sys_id]",
  "short_description": "Extract data from vendor invoice INV-2026-0456"
}
```

For batch processing, submit multiple documents:
```bash
# Iterate over attachments and create extraction records
for attachment_id in [list_of_attachment_sys_ids]; do
  curl -X POST "https://[instance].service-now.com/api/now/table/sn_doc_intelligence_extraction" \
    -H "Content-Type: application/json" \
    -d "{\"template\":\"[template_sys_id]\",\"source_document\":\"$attachment_id\",\"document_type\":\"invoice\",\"state\":\"submitted\"}"
done
```

### Step 5: Monitor Extraction Progress

Track the status of submitted extraction requests.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_doc_intelligence_extraction
  query: state=submitted^ORstate=processing^ORstate=review
  fields: sys_id,number,short_description,state,template,document_type,source_document,confidence_score,sys_created_on,error_message
  limit: 50
  order_by: sys_created_on
```

**Using REST API:**
```bash
GET /api/now/table/sn_doc_intelligence_extraction?sysparm_query=state=submitted^ORstate=processing^ORstate=review^ORDERBYDESCsys_created_on&sysparm_fields=sys_id,number,short_description,state,template,document_type,source_document,confidence_score,sys_created_on,error_message&sysparm_limit=50&sysparm_display_value=true
```

### Step 6: Review Extraction Results

Examine the extracted data and confidence scores for each field.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_doc_intelligence_extraction_result
  query: extraction=[extraction_sys_id]
  fields: sys_id,field_name,extracted_value,confidence_score,validation_status,mapped_field,needs_review
  limit: 100
  order_by: order
```

**Using REST API:**
```bash
GET /api/now/table/sn_doc_intelligence_extraction_result?sysparm_query=extraction=[extraction_sys_id]^ORDERBYorder&sysparm_fields=sys_id,field_name,extracted_value,confidence_score,validation_status,mapped_field,needs_review&sysparm_limit=100&sysparm_display_value=true
```

Evaluate results against thresholds:

| Confidence Level | Action Required |
|-----------------|-----------------|
| >= 0.95 | Auto-accept; no review needed |
| 0.85 - 0.94 | Accept with spot-check |
| 0.70 - 0.84 | Manual review required |
| < 0.70 | Flag for re-extraction or manual entry |

### Step 7: Validate and Correct Extracted Data

For fields that need review, update the extraction results.

**Using MCP:**
```
Tool: SN-Update-Record
Parameters:
  table_name: sn_doc_intelligence_extraction_result
  sys_id: [result_sys_id]
  data:
    extracted_value: "INV-2026-0456"
    validation_status: validated
    needs_review: false
    reviewer_notes: "Corrected invoice number; OCR misread '0' as 'O'"
```

**Using REST API:**
```bash
PATCH /api/now/table/sn_doc_intelligence_extraction_result/[result_sys_id]
Content-Type: application/json

{
  "extracted_value": "INV-2026-0456",
  "validation_status": "validated",
  "needs_review": "false",
  "reviewer_notes": "Corrected invoice number; OCR misread '0' as 'O'"
}
```

### Step 8: Complete Extraction and Populate Target Record

Once all fields are validated, mark the extraction as complete and create or update the target record.

**Using MCP:**
```
Tool: SN-Update-Record
Parameters:
  table_name: sn_doc_intelligence_extraction
  sys_id: [extraction_sys_id]
  data:
    state: completed
    work_notes: "Extraction validated. 12/14 fields auto-accepted (>95% confidence). 2 fields manually corrected. Target record created in sn_proc_invoice."
```

Create the target record with extracted data:
```
Tool: SN-Create-Record
Parameters:
  table_name: sn_proc_invoice
  fields:
    number: "INV-2026-0456"
    vendor: [vendor_sys_id]
    invoice_date: "2026-03-15"
    due_date: "2026-04-14"
    invoice_amount: "15750.00"
    po_number: "PO0012345"
    state: pending
    source: document_intelligence
    work_notes: "Record created via Document Intelligence extraction [extraction_number]"
```

**Using REST API:**
```bash
PATCH /api/now/table/sn_doc_intelligence_extraction/[extraction_sys_id]
Content-Type: application/json

{
  "state": "completed",
  "work_notes": "Extraction validated. Target record created."
}
```

## Tool Usage

### MCP Tools Reference

| Tool | When to Use |
|------|-------------|
| `SN-NL-Search` | Find extraction records or templates by description |
| `SN-Query-Table` | Query templates, extractions, results, and field mappings |
| `SN-Read-Record` | Retrieve a specific extraction or template record |
| `SN-Create-Record` | Create templates, field mappings, and extraction requests |
| `SN-Update-Record` | Update extraction status, validate results, correct data |
| `SN-Add-Work-Notes` | Document extraction outcomes and processing notes |

### REST API Reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/now/table/sn_doc_template` | GET/POST | Query or create extraction templates |
| `/api/now/table/sn_doc_intelligence_field_map` | GET/POST | Query or create field mappings |
| `/api/now/table/sn_doc_intelligence_extraction` | GET/POST/PATCH | Manage extraction requests |
| `/api/now/table/sn_doc_intelligence_extraction_result` | GET/PATCH | Review and correct extraction results |
| `/api/now/table/sys_attachment` | GET | Query document attachments |
| `/api/now/attachment/{sys_id}/file` | GET | Download source documents |

## Best Practices

- **Template per document type:** Create separate templates for each document format; a single template for all invoices will underperform compared to vendor-specific templates for high-volume vendors
- **Set appropriate thresholds:** Start with a confidence threshold of 0.85 and adjust based on error rates; lower thresholds increase throughput but require more manual review
- **Training data:** Provide at least 20-30 sample documents per template for optimal extraction accuracy
- **Validation rules:** Use regex patterns, reference lookups, and cross-field validation (e.g., total = subtotal + tax) to catch extraction errors automatically
- **Batch processing:** Submit documents in batches during off-peak hours to avoid performance impact on the instance
- **Monitor accuracy:** Track extraction accuracy metrics over time; retrain models when accuracy drops below 90%
- **Handle exceptions:** Create extraction tasks in `sn_doc_intelligence_task` for documents that fail extraction, routing them to data entry staff
- **Secure handling:** Ensure document attachments comply with data retention policies; delete temporary extraction artifacts after processing

## Troubleshooting

### "Extraction template not found"

**Cause:** Template is inactive or the document type does not match
**Solution:** Query `sn_doc_template` with `active=true` to see available templates. Verify the `document_type` field matches your submission.

### "Low confidence scores across all fields"

**Cause:** Poor document quality (low resolution, skewed scan, handwritten text) or template mismatch
**Solution:** Check document resolution (minimum 300 DPI for OCR). Verify the document matches the template's expected layout. Consider creating a new template for non-standard formats.

### "Field mapping validation fails"

**Cause:** Extracted value does not match the validation regex or target field type
**Solution:** Review the validation rule in `sn_doc_intelligence_field_map`. Update the regex to accommodate legitimate variations (e.g., different invoice number formats across vendors).

### "Extraction stuck in processing state"

**Cause:** Document Intelligence engine timeout or processing queue backup
**Solution:** Check the `sn_doc_intelligence_extraction` record for error messages. Verify the Document Intelligence engine is running: navigate to Document Intelligence > Dashboard. Re-submit the extraction if needed.

### "Duplicate extraction records"

**Cause:** Same document submitted multiple times
**Solution:** Before submitting, query `sn_doc_intelligence_extraction` with `source_document=[attachment_sys_id]^state!=failed` to check for existing extractions.

## Examples

### Example 1: Invoice Data Extraction

**Input:** PDF invoice from Acme Corp uploaded to ServiceNow

**Process:**
1. Identify template: "Vendor Invoice Template" (sys_id: abc123)
2. Submit extraction with attachment reference
3. Results: 14 fields extracted, average confidence 0.92
4. 2 fields below threshold: PO Number (0.78), Line Description (0.81)
5. Manual review confirms PO Number correct, Line Description corrected
6. Target invoice record created in `sn_proc_invoice`

### Example 2: Contract Metadata Extraction

**Input:** Signed MSA PDF for legal review

**Process:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sn_doc_intelligence_extraction
  fields:
    template: [contract_template_sys_id]
    source_document: [attachment_sys_id]
    document_type: contract
    state: submitted
    short_description: "Extract metadata from Acme Corp MSA"
```

**Fields extracted:** Contract parties, effective date, term length, total value, governing law, auto-renewal flag, notice period. Populates `ast_contract` record automatically.

### Example 3: Batch Processing Tax Forms

**Input:** 50 W-9 forms uploaded for vendor onboarding

**Process:**
1. Query all unprocessed W-9 attachments
2. Submit batch extraction using W-9 template
3. Monitor: 47 extracted successfully, 3 require manual review (handwritten entries)
4. Create vendor records in `core_company` with extracted TIN, legal name, address
5. Route 3 exceptions to data entry team via `sn_doc_intelligence_task`

**Query for batch status:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_doc_intelligence_extraction
  query: template=[w9_template_sys_id]^sys_created_on>=2026-03-19
  fields: sys_id,number,state,confidence_score,error_message
  limit: 50
```

## Related Skills

- `document/smart-documents` - Manage document templates, versioning, and automated generation
- `legal/contract-analysis` - Analyze extracted contract data for risks and terms
- `legal/contract-obligation-extraction` - Extract obligations from contract documents
- `procurement/invoice-management` - Process extracted invoice data through AP workflows
- `admin/data-import` - Bulk import extracted data into ServiceNow tables
