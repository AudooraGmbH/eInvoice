# ZUGFeRD Parser
> A ZUGFeRD / XRechnung / Factur-X / EN-16931 parser/extractor

## Installation

```bash
npm install einvoice
```

## Usage

This library can either extract XML from a container file like a ZUGFeRD-PDF first or work with EN-16931 compliant XML invoices directly

### PDF

```typescript
// the PDF can either be a Buffer (e.g. uploaded through a web-form) or a string
const pdf = readFileSync("./examples/zugferd/zugferd_2p1_EXTENDED_Kostenrechnung.pdf");
const eInvoice = await EInvoice.fromPDF(pdf);

// the eInvoice object now holds the PDF itself, the extracted XML as a xmldom Object, and the parsed data
console.log(eInvoice.data);
// check out the type: src/types/data.ts
```

### XML

```typescript
// XML can also be a Buffer or a string 
const xml = readFileSync("./examples/factur-x/example.xml");
const eInvoice = await EInvoice.fromXML(xml);

console.log(eInvoice.pdf); // will log `undefined`
```

## License
Copyright (C) 2024  Audoora GmbH

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.
