import { FacturX } from "../src";
import { readFileSync } from "node:fs";

/**
const xml = readFileSync('./factur-x/example.xml', 'utf-8')
console.log(FacturX.fromXML(xml));
*/
const pdf = readFileSync("./zugferd/zugferd_2p1_EXTENDED_Kostenrechnung.pdf");
(async () => {
  const facturX = await FacturX.fromPDF(pdf);
  console.log(facturX.profile);
  console.log(facturX.data.transaction);
})();
