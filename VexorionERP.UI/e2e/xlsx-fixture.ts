const textEncoder = new TextEncoder()

type ZipEntry = { name: string, content: Uint8Array, crc: number, offset: number }

const uint16 = (value: number) => {
  const bytes = new Uint8Array(2)
  new DataView(bytes.buffer).setUint16(0, value, true)
  return bytes
}

const uint32 = (value: number) => {
  const bytes = new Uint8Array(4)
  new DataView(bytes.buffer).setUint32(0, value >>> 0, true)
  return bytes
}

const combine = (...parts: Uint8Array[]) => {
  const result = new Uint8Array(parts.reduce((length, part) => length + part.length, 0))
  let offset = 0
  for (const part of parts) {
    result.set(part, offset)
    offset += part.length
  }
  return result
}

const crc32 = (content: Uint8Array) => {
  let crc = 0xffffffff
  for (const byte of content) {
    crc ^= byte
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0)
  }
  return (crc ^ 0xffffffff) >>> 0
}

const xmlEscape = (value: string) => value
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;').replaceAll("'", '&apos;')

function createStoredZip(files: Array<{ name: string, content: string }>) {
  const localParts: Uint8Array[] = []
  const entries: ZipEntry[] = []
  let offset = 0

  for (const file of files) {
    const name = textEncoder.encode(file.name)
    const content = textEncoder.encode(file.content)
    const crc = crc32(content)
    const header = combine(
      uint32(0x04034b50), uint16(20), uint16(0), uint16(0), uint16(0), uint16(0x21),
      uint32(crc), uint32(content.length), uint32(content.length), uint16(name.length), uint16(0), name,
    )
    localParts.push(header, content)
    entries.push({ name: file.name, content, crc, offset })
    offset += header.length + content.length
  }

  const centralDirectory = combine(...entries.map((entry) => {
    const name = textEncoder.encode(entry.name)
    return combine(
      uint32(0x02014b50), uint16(20), uint16(20), uint16(0), uint16(0), uint16(0), uint16(0x21),
      uint32(entry.crc), uint32(entry.content.length), uint32(entry.content.length), uint16(name.length),
      uint16(0), uint16(0), uint16(0), uint16(0), uint32(0), uint32(entry.offset), name,
    )
  }))
  const end = combine(
    uint32(0x06054b50), uint16(0), uint16(0), uint16(entries.length), uint16(entries.length),
    uint32(centralDirectory.length), uint32(offset), uint16(0),
  )
  return Buffer.from(combine(...localParts, centralDirectory, end))
}

export function createCustomerImportWorkbook(values: { customerNumber: string, name: string, email: string }) {
  const headers = ['CustomerNumber', 'Name', 'Email', 'PhoneNumber', 'BillingAddress']
  const row = [values.customerNumber, values.name, values.email, '', '']
  const cells = (items: string[], rowNumber: number) => items.map((value, index) => {
    const reference = `${String.fromCharCode(65 + index)}${rowNumber}`
    return `<c r="${reference}" t="inlineStr"><is><t>${xmlEscape(value)}</t></is></c>`
  }).join('')

  return createStoredZip([
    { name: '[Content_Types].xml', content: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>' },
    { name: '_rels/.rels', content: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>' },
    { name: 'xl/workbook.xml', content: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Template" sheetId="1" r:id="rId1"/></sheets></workbook>' },
    { name: 'xl/_rels/workbook.xml.rels', content: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>' },
    { name: 'xl/styles.xml', content: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="1"><xf xfId="0"/></cellXfs></styleSheet>' },
    { name: 'xl/worksheets/sheet1.xml', content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><dimension ref="A1:E2"/><sheetData><row r="1">${cells(headers, 1)}</row><row r="2">${cells(row, 2)}</row></sheetData></worksheet>` },
  ])
}
