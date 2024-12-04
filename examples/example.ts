import { EInvoice } from "../src";
import { readFileSync } from "node:fs";

/**
const xml = readFileSync('./factur-x/example.xml', 'utf-8')
console.log(FacturX.fromXML(xml));
*/
const pdf = readFileSync("./zugferd/zugferd_2p1_EXTENDED_Kostenrechnung.pdf");
(async () => {
  const eInvoice = await EInvoice.fromPDF(pdf);
  console.log(eInvoice.profile);
  console.log(eInvoice.data.transaction);
})();
