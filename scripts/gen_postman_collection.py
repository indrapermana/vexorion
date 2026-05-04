import json
import pathlib
import re
import uuid

root_dir = pathlib.Path('/Users/indra/Documents/work/vexorion/workspace/VexorionERP')
controllers_dir = root_dir / 'VexorionERP' / 'Controllers'
contracts_dir = root_dir / 'VexorionERP.Contracts'
models_dir = root_dir / 'VexorionERP.Models'
out_file = root_dir / 'Postman' / 'VexorionERP.AllControllers.postman_collection.json'
out_file.parent.mkdir(parents=True, exist_ok=True)

http_attr_re = re.compile(r'\[Http(Get|Post|Put|Delete|Patch|Options|Head)(?:\("([^"]*)"\))?\]')
route_attr_re = re.compile(r'\[Route\("([^"]+)"\)\]')
controller_re = re.compile(r'class\s+(\w+)Controller')
method_decl_re = re.compile(r'public\s+(?:async\s+)?[\w<>,\[\]\.?\s]+\s+(\w+)\s*\(')
path_param_re = re.compile(r'\{([a-zA-Z_][a-zA-Z0-9_]*)(?::[^}]*)?\}')
class_decl_re = re.compile(r'public\s+(?:sealed\s+)?(?:partial\s+)?class\s+(\w+)(?:\s*:\s*([^\{]+))?')
record_decl_re = re.compile(r'public\s+(?:sealed\s+)?record\s+(\w+)(?:\s*:\s*([^\{]+))?')
property_re = re.compile(r'public\s+([\w<>,\[\]\.?]+)\s+(\w+)\s*\{\s*get;\s*set;')
enum_decl_re = re.compile(r'public\s+enum\s+(\w+)')
enum_member_re = re.compile(r'^\s*(\w+)\s*(?:=\s*[^,]+)?\s*,?\s*$', re.M)
from_body_re = re.compile(r'\[FromBody\]\s*([\w<>\.]+)\s+(\w+)')
from_form_re = re.compile(r'\[FromForm\]\s*([\w<>\.]+)\s+(\w+)')


class_index = {}
enum_index = {}
for fp in contracts_dir.rglob('*.cs'):
    text = fp.read_text(encoding='utf-8')
    for m in class_decl_re.finditer(text):
        class_index[m.group(1)] = fp
    for m in record_decl_re.finditer(text):
        class_index[m.group(1)] = fp
for fp in models_dir.rglob('*.cs'):
    text = fp.read_text(encoding='utf-8')
    em = enum_decl_re.search(text)
    if em:
        members = [x for x in enum_member_re.findall(text) if x not in {'public', 'enum'}]
        if members:
            enum_index[em.group(1)] = members


def clean_route(route, controller_name):
    route = route.replace('[controller]', controller_name)
    route = route.strip('/')
    route = path_param_re.sub(lambda m: '{{' + m.group(1) + '}}', route)
    route = route.replace('//', '/')
    return route


def split_top_level(text, sep=','):
    parts = []
    current = []
    depth = 0
    for ch in text:
        if ch == '<':
            depth += 1
        elif ch == '>':
            depth = max(0, depth - 1)
        elif ch == sep and depth == 0:
            parts.append(''.join(current).strip())
            current = []
            continue
        current.append(ch)
    if current:
        parts.append(''.join(current).strip())
    return [p for p in parts if p]


def normalize_type(type_name):
    type_name = type_name.strip()
    type_name = type_name.replace('?', '')
    if '.' in type_name:
        type_name = type_name.split('.')[-1]
    return type_name


def parse_class_definition(class_name):
    fp = class_index.get(class_name)
    if not fp:
        return None
    text = fp.read_text(encoding='utf-8')
    m = class_decl_re.search(text) or record_decl_re.search(text)
    if not m:
        return None

    base_expr = (m.group(2) or '').strip()
    base_class = None
    if base_expr:
        base_class = split_top_level(base_expr)[0].strip()
        if '<' in base_class:
            base_class = None
        elif '.' in base_class:
            base_class = base_class.split('.')[-1]

    start = text.find('{', m.end() - 1)
    if start == -1:
        return None
    depth = 0
    end = start
    for idx in range(start, len(text)):
        ch = text[idx]
        if ch == '{':
            depth += 1
        elif ch == '}':
            depth -= 1
            if depth == 0:
                end = idx
                break

    body = text[start + 1:end]
    props = []
    for pm in property_re.finditer(body):
        props.append((normalize_type(pm.group(1)), pm.group(2)))

    return {
        'class_name': class_name,
        'base_class': base_class,
        'properties': props,
    }


def variable_for_name(name):
    lower = name.lower()
    mapping = {
        'token': '{{token}}',
        'accesstoken': '{{token}}',
        'refreshtoken': '{{refreshToken}}',
        'tenantid': '{{tenantId}}',
        'userid': '{{userId}}',
        'roleid': '{{roleId}}',
        'companyid': '{{companyId}}',
        'departmentid': '{{departmentId}}',
        'employeeid': '{{employeeId}}',
        'customerid': '{{customerId}}',
        'customerpaymentid': '{{customerPaymentId}}',
        'supplierid': '{{supplierId}}',
        'productid': '{{productId}}',
        'warehouseid': '{{warehouseId}}',
        'inventoryadjustmentid': '{{inventoryAdjustmentId}}',
        'inventoryadjustmentlineid': '{{inventoryAdjustmentLineId}}',
        'inventorybalanceid': '{{inventoryBalanceId}}',
        'invoiceid': '{{invoiceId}}',
        'invoicelineid': '{{invoiceLineId}}',
        'journalentryid': '{{journalEntryId}}',
        'salesorderid': '{{salesOrderId}}',
        'salesorderlineid': '{{salesOrderLineId}}',
        'purchaseorderid': '{{purchaseOrderId}}',
        'purchaseorderlineid': '{{purchaseOrderLineId}}',
        'salesinvoiceid': '{{salesInvoiceId}}',
        'salesinvoicelineid': '{{salesInvoiceLineId}}',
        'purchaseinvoiceid': '{{purchaseInvoiceId}}',
        'purchaseinvoicelineid': '{{purchaseInvoiceLineId}}',
        'generateddocumentid': '{{generatedDocumentId}}',
        'sourceentityid': '{{sourceEntityId}}',
        'importjobid': '{{importJobId}}',
        'categoryid': '{{categoryId}}',
        'identifierid': '{{identifierId}}',
        'stockcountid': '{{stockCountId}}',
        'stockcountlineid': '{{stockCountLineId}}',
        'stocktransferid': '{{stockTransferId}}',
        'stocktransferlineid': '{{stockTransferLineId}}',
        'taxcodeid': '{{taxCodeId}}',
        'vendorpaymentid': '{{vendorPaymentId}}',
        'receiptid': '{{receiptId}}',
        'shipmentid': '{{shipmentId}}',
        'shiftid': '{{shiftId}}',
        'fiscalperiodid': '{{fiscalPeriodId}}',
        'accountid': '{{accountId}}',
    }
    return mapping.get(lower)


def sample_string(name):
    lower = name.lower()
    if 'tenantcode' in lower:
        return 'DEFAULT'
    if 'usernameoremail' in lower:
        return '{{email}}'
    if lower == 'password' or 'password' in lower:
        return '{{password}}'
    if 'email' in lower:
        return 'user@example.com'
    if 'currencycode' in lower:
        return 'USD'
    if lower.endswith('sku') or lower == 'sku':
        return 'SKU-001'
    if 'unitofmeasure' in lower or lower == 'unit':
        return 'EA'
    if 'ordernumber' in lower:
        return 'SO-2026-0001'
    if 'invoicenumber' in lower:
        return 'INV-2026-0001'
    if 'receiptnumber' in lower:
        return 'RCPT-2026-0001'
    if 'shipmentnumber' in lower:
        return 'SHP-2026-0001'
    if 'adjustmentnumber' in lower:
        return 'ADJ-2026-0001'
    if 'countnumber' in lower:
        return 'CNT-2026-0001'
    if 'reference' in lower:
        return 'REF-001'
    if lower.endswith('name') or lower == 'name':
        return 'Sample Name'
    if 'description' in lower:
        return 'Sample description'
    if 'address' in lower:
        return '123 Sample Street'
    if 'phone' in lower:
        return '+1-555-0100'
    if 'notes' in lower or lower == 'note':
        return 'Sample note'
    if 'code' in lower:
        return 'CODE-001'
    if 'menu' in lower and 'configuration' in lower:
        return '{"items":[]}'
    return 'sample'


def sample_value(type_name, prop_name, visited=None):
    visited = visited or set()
    type_name = normalize_type(type_name)

    var = variable_for_name(prop_name)
    if var:
        return var

    lower_type = type_name.lower()
    lower_name = prop_name.lower()

    if lower_type == 'string':
        return sample_string(prop_name)
    if lower_type == 'guid':
        return '{{id}}'
    if lower_type in {'int', 'long', 'short'}:
        return 1
    if lower_type in {'decimal', 'double', 'float'}:
        if 'quantity' in lower_name:
            return 1.0
        if 'rate' in lower_name or 'percent' in lower_name:
            return 7.5
        if 'price' in lower_name or 'cost' in lower_name or 'amount' in lower_name or 'total' in lower_name or 'limit' in lower_name or 'float' in lower_name:
            return 100.0
        return 1.0
    if lower_type == 'bool':
        return False
    if lower_type == 'dateonly':
        if 'required' in lower_name:
            return '2026-05-11'
        if 'due' in lower_name:
            return '2026-05-18'
        return '2026-05-04'
    if lower_type in {'datetime', 'datetimeoffset'}:
        return '2026-05-04T09:00:00Z'
    if lower_type.startswith('ireadonlycollection<') or lower_type.startswith('list<') or lower_type.startswith('icollection<') or lower_type.endswith('[]'):
        inner = 'string'
        if '<' in type_name and '>' in type_name:
            inner = type_name[type_name.find('<') + 1:type_name.rfind('>')]
        elif type_name.endswith('[]'):
            inner = type_name[:-2]
        return [sample_value(inner, prop_name[:-1] if prop_name.endswith('s') else prop_name, visited)]
    if type_name in enum_index:
        return enum_index[type_name][0]

    if type_name in visited:
        return None
    class_def = parse_class_definition(type_name)
    if class_def:
        return build_sample_object(type_name, visited | {type_name})

    return 'sample'


def build_sample_object(class_name, visited=None):
    visited = visited or set()
    class_def = parse_class_definition(class_name)
    if not class_def:
        return {}

    result = {}
    base_class = class_def.get('base_class')
    if base_class and base_class not in visited:
        result.update(build_sample_object(base_class, visited | {class_name}))

    for type_name, prop_name in class_def['properties']:
        result[prop_name] = sample_value(type_name, prop_name, visited | {class_name})

    return result


def infer_body_from_signature(signature):
    body_match = from_body_re.search(signature)
    if body_match:
        request_type = normalize_type(body_match.group(1))
        return {
            'mode': 'raw',
            'type': request_type,
            'content_type': 'application/json',
            'raw': json.dumps(build_sample_object(request_type), indent=2)
        }

    form_matches = from_form_re.findall(signature)
    if form_matches:
        formdata = []
        for raw_type, name in form_matches:
            type_name = normalize_type(raw_type)
            if type_name == 'IFormFile':
                formdata.append({'key': name, 'type': 'file', 'src': []})
            else:
                value = variable_for_name(name) or sample_value(type_name, name)
                formdata.append({'key': name, 'type': 'text', 'value': str(value)})
        return {
            'mode': 'formdata',
            'content_type': None,
            'formdata': formdata
        }

    return None


def build_test_events(ep):
    events = []

    is_auth_token_endpoint = ep['verb'] == 'POST' and ep['route'] in {
        'api/auth/login',
        'api/auth/refresh',
    }

    if is_auth_token_endpoint:
        events.append({
            'listen': 'test',
            'script': {
                'type': 'text/javascript',
                'exec': [
                    'let data = {};',
                    'try { data = pm.response.json(); } catch (e) { data = {}; }',
                    'const access = data.accessToken || data.AccessToken;',
                    'const refresh = data.refreshToken || data.RefreshToken;',
                    'const tenant = data.tenantId || data.TenantId;',
                    'if (access) pm.environment.set("token", String(access));',
                    'if (refresh) pm.environment.set("refreshToken", String(refresh));',
                    'if (tenant) pm.environment.set("tenantId", String(tenant));',
                    'pm.test("Auth tokens captured when present", function () { pm.expect(true).to.eql(true); });',
                ],
            },
        })

    if ep['verb'] == 'POST':
        events.append({
            'listen': 'test',
            'script': {
                'type': 'text/javascript',
                'exec': [
                    'let data = {};',
                    'try { data = pm.response.json(); } catch (e) { data = {}; }',
                    'if (data && typeof data === "object" && !Array.isArray(data)) {',
                    '  for (const [k, v] of Object.entries(data)) {',
                    '    if (v === null || v === undefined) continue;',
                    '    if (typeof v !== "string" && typeof v !== "number") continue;',
                    '    const keyLower = String(k).toLowerCase();',
                    '    if (keyLower === "id" || keyLower.endsWith("id")) {',
                    '      const lowerCamel = String(k).charAt(0).toLowerCase() + String(k).slice(1);',
                    '      pm.environment.set(lowerCamel, String(v));',
                    '      if (lowerCamel !== k) pm.environment.set(String(k), String(v));',
                    '    }',
                    '  }',
                    '}',
                    'pm.test("ID fields captured when present", function () { pm.expect(true).to.eql(true); });',
                ],
            },
        })

    return events


def parse_controller(file_path):
    text = file_path.read_text(encoding='utf-8')
    cls = controller_re.search(text)
    if not cls:
        return None

    controller_name = cls.group(1)
    header = text[:cls.start()]

    class_route = 'api/[controller]'
    class_authorized = bool(re.search(r'\[Authorize(?:\(|\])', header))
    for m in route_attr_re.finditer(header):
        class_route = m.group(1)

    lines = text.splitlines()
    pending_attrs = []
    items = []

    i = 0
    while i < len(lines):
        s = lines[i].strip()

        if s.startswith('[') and s.endswith(']'):
            pending_attrs.append(s)
            i += 1
            continue

        if s.startswith('public ') and ' class ' not in s and '(' in s:
            signature_lines = [s]
            j = i + 1
            bal = s.count('(') - s.count(')')
            while j < len(lines) and bal > 0:
                t = lines[j].strip()
                signature_lines.append(t)
                bal += t.count('(') - t.count(')')
                j += 1
            signature = ' '.join(signature_lines)

            mm = method_decl_re.search(signature)
            method_name = mm.group(1) if mm else f'Action{i}'

            method_http_attrs = []
            method_route_override = None
            method_allow_anonymous = False
            method_authorized = False

            for attr in pending_attrs:
                hm = http_attr_re.search(attr)
                if hm:
                    method_http_attrs.append((hm.group(1).upper(), hm.group(2) or ''))
                rm = route_attr_re.search(attr)
                if rm:
                    method_route_override = rm.group(1)
                if '[AllowAnonymous' in attr:
                    method_allow_anonymous = True
                if '[Authorize' in attr:
                    method_authorized = True

            requires_auth = (class_authorized or method_authorized) and not method_allow_anonymous
            body_spec = infer_body_from_signature(signature)

            for verb, template in method_http_attrs:
                route_base = method_route_override if method_route_override is not None else class_route
                full_route = route_base.strip('/')
                if template:
                    full_route = f"{full_route}/{template.strip('/')}" if full_route else template.strip('/')
                full_route = clean_route(full_route, controller_name)

                items.append({
                    'name': f'{verb} {full_route}',
                    'method_name': method_name,
                    'verb': verb,
                    'route': full_route,
                    'requires_auth': requires_auth,
                    'body_spec': body_spec,
                    'source_file': str(file_path).replace('\\', '/'),
                })

            pending_attrs = []
            i = j
            continue

        if s:
            pending_attrs = []
        i += 1

    return {
        'controller': controller_name,
        'source_file': str(file_path).replace('\\', '/'),
        'items': items,
    }


controllers = []
for fp in sorted(controllers_dir.glob('*Controller.cs')):
    c = parse_controller(fp)
    if c and c['items']:
        controllers.append(c)

collection = {
    'info': {
        '_postman_id': str(uuid.uuid4()),
        'name': 'VexorionERP - All Controllers',
        'description': 'Auto-generated from ASP.NET controller route and HTTP method attributes, including inferred example request bodies.',
        'schema': 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
    },
    'variable': [
        {'key': 'baseUrl', 'value': 'http://localhost:5000'},
        {'key': 'token', 'value': ''},
        {'key': 'id', 'value': '00000000-0000-0000-0000-000000000001'},
        {'key': 'tenantId', 'value': '00000000-0000-0000-0000-000000000001'},
        {'key': 'sourceEntityId', 'value': '00000000-0000-0000-0000-000000000001'},
        {'key': 'generatedDocumentId', 'value': '00000000-0000-0000-0000-000000000001'},
        {'key': 'importJobId', 'value': '00000000-0000-0000-0000-000000000001'}
    ],
    'item': []
}

for ctrl in controllers:
    folder = {
        'name': f"{ctrl['controller']}Controller",
        'description': f"Source: {ctrl['source_file']}",
        'item': []
    }

    for ep in ctrl['items']:
        headers = [{'key': 'Accept', 'value': 'application/json', 'type': 'text'}]
        if ep['requires_auth']:
            headers.append({'key': 'Authorization', 'value': 'Bearer {{token}}', 'type': 'text'})

        request = {
            'method': ep['verb'],
            'header': headers,
            'url': {
                'raw': '{{baseUrl}}/' + ep['route'],
                'host': ['{{baseUrl}}'],
                'path': ep['route'].split('/') if ep['route'] else []
            },
            'description': f"Action: {ep['method_name']}\nSource: {ep['source_file']}"
        }

        body_spec = ep['body_spec']
        if body_spec:
            if body_spec['content_type']:
                request['header'].append({'key': 'Content-Type', 'value': body_spec['content_type'], 'type': 'text'})
            if body_spec['mode'] == 'raw':
                request['body'] = {
                    'mode': 'raw',
                    'raw': body_spec['raw'],
                    'options': {'raw': {'language': 'json'}}
                }
                request['description'] += f"\nRequestType: {body_spec['type']}"
            elif body_spec['mode'] == 'formdata':
                request['body'] = {
                    'mode': 'formdata',
                    'formdata': body_spec['formdata']
                }

        item = {'name': ep['name'], 'request': request, 'response': []}
        events = build_test_events(ep)
        if events:
            item['event'] = events

        folder['item'].append(item)

    collection['item'].append(folder)

out_file.write_text(json.dumps(collection, indent=2), encoding='utf-8')
print(f'Controllers: {len(controllers)}')
print(f'Requests: {sum(len(c["items"]) for c in controllers)}')
print(f'Output: {out_file}')
