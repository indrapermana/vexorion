import json
from pathlib import Path

path = Path('/Users/indra/Documents/work/vexorion/workspace/VexorionERP/Postman/VexorionERP.Local.postman_environment.json')
values = [
    ('baseUrl', 'http://localhost:5000', 'default'),
    ('token', '', 'secret'),
    ('refreshToken', '', 'secret'),
    ('tenantId', '00000000-0000-0000-0000-000000000001', 'default'),
    ('id', '00000000-0000-0000-0000-000000000001', 'default'),
    ('accountId', '00000000-0000-0000-0000-000000000001', 'default'),
    ('categoryId', '00000000-0000-0000-0000-000000000001', 'default'),
    ('companyId', '00000000-0000-0000-0000-000000000001', 'default'),
    ('userId', '00000000-0000-0000-0000-000000000001', 'default'),
    ('roleId', '00000000-0000-0000-0000-000000000001', 'default'),
    ('customerId', '00000000-0000-0000-0000-000000000001', 'default'),
    ('customerPaymentId', '00000000-0000-0000-0000-000000000001', 'default'),
    ('supplierId', '00000000-0000-0000-0000-000000000001', 'default'),
    ('productId', '00000000-0000-0000-0000-000000000001', 'default'),
    ('warehouseId', '00000000-0000-0000-0000-000000000001', 'default'),
    ('departmentId', '00000000-0000-0000-0000-000000000001', 'default'),
    ('employeeId', '00000000-0000-0000-0000-000000000001', 'default'),
    ('fiscalPeriodId', '00000000-0000-0000-0000-000000000001', 'default'),
    ('identifierId', '00000000-0000-0000-0000-000000000001', 'default'),
    ('importType', 'product', 'default'),
    ('inventoryAdjustmentId', '00000000-0000-0000-0000-000000000001', 'default'),
    ('inventoryAdjustmentLineId', '00000000-0000-0000-0000-000000000001', 'default'),
    ('inventoryBalanceId', '00000000-0000-0000-0000-000000000001', 'default'),
    ('invoiceId', '00000000-0000-0000-0000-000000000001', 'default'),
    ('invoiceLineId', '00000000-0000-0000-0000-000000000001', 'default'),
    ('journalEntryId', '00000000-0000-0000-0000-000000000001', 'default'),
    ('salesOrderId', '00000000-0000-0000-0000-000000000001', 'default'),
    ('salesOrderLineId', '00000000-0000-0000-0000-000000000001', 'default'),
    ('purchaseOrderId', '00000000-0000-0000-0000-000000000001', 'default'),
    ('purchaseOrderLineId', '00000000-0000-0000-0000-000000000001', 'default'),
    ('salesInvoiceId', '00000000-0000-0000-0000-000000000001', 'default'),
    ('salesInvoiceLineId', '00000000-0000-0000-0000-000000000001', 'default'),
    ('purchaseInvoiceId', '00000000-0000-0000-0000-000000000001', 'default'),
    ('purchaseInvoiceLineId', '00000000-0000-0000-0000-000000000001', 'default'),
    ('receiptId', '00000000-0000-0000-0000-000000000001', 'default'),
    ('shipmentId', '00000000-0000-0000-0000-000000000001', 'default'),
    ('shiftId', '00000000-0000-0000-0000-000000000001', 'default'),
    ('stockCountId', '00000000-0000-0000-0000-000000000001', 'default'),
    ('stockCountLineId', '00000000-0000-0000-0000-000000000001', 'default'),
    ('stockTransferId', '00000000-0000-0000-0000-000000000001', 'default'),
    ('stockTransferLineId', '00000000-0000-0000-0000-000000000001', 'default'),
    ('taxCodeId', '00000000-0000-0000-0000-000000000001', 'default'),
    ('vendorPaymentId', '00000000-0000-0000-0000-000000000001', 'default'),
    ('generatedDocumentId', '00000000-0000-0000-0000-000000000001', 'default'),
    ('sourceEntityId', '00000000-0000-0000-0000-000000000001', 'default'),
    ('sourceType', 'SalesOrder', 'default'),
    ('importJobId', '00000000-0000-0000-0000-000000000001', 'default'),
    ('email', 'admin@vexorion.local', 'default'),
    ('password', 'ChangeMe123', 'secret'),
]

data = {
    'id': '0d6c7bc7-9ae8-4ea2-971b-7fbf50204c58',
    'name': 'VexorionERP Local',
    'values': [
        {'key': key, 'value': value, 'type': typ, 'enabled': True}
        for key, value, typ in values
    ],
    '_postman_variable_scope': 'environment',
    '_postman_exported_at': '2026-05-04T00:00:00.000Z',
    '_postman_exported_using': 'GitHub Copilot GPT-5.3-Codex'
}

path.write_text(json.dumps(data, indent=2), encoding='utf-8')
print(path)
print(len(data['values']))
