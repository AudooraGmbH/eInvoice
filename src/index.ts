import { PDFDict, PDFDocument, PDFName, PDFString, PDFStream, PDFRawStream, decodePDFRawStream } from "pdf-lib";
import Data from "./types/data";
import { DOCUMENT_TYPES } from "./types/documentTypes";
import { XMLDocument } from "./xml";

const FACTUR_X_FILENAMES = ["factur-x.xml", "factur\\055x\\056xml", "zugferd-invoice.xml", "zugferd\\055invoice\\056xml", "ZUGFeRD-invoice.xml", "ZUGFeRD\\055invoice\\056xml", "xrechnung.xml", "xrechnung\\056xml"].map(
  (name) => PDFString.of(name).toString(),
);

export class EInvoice {
  public data: Data;

  private _raw: any;
  public pdf: PDFDocument | undefined;

  constructor(data: Data) {
    this.data = data;
  }

  get profile() {
    const profileId = this._raw.getText("/rsm:CrossIndustryInvoice/rsm:ExchangedDocumentContext/ram:GuidelineSpecifiedDocumentContextParameter/ram:ID/text()")
    if (!profileId) {
      throw new Error("missing profile identifier");
    }

    switch (profileId) {
      case "urn:factur-x.eu:1p0:minimum":
        return "minimum";
      case "urn:factur-x.eu:1p0:basicwl":
        return "basicwl";
      case "urn:factur-x.eu:1p0:basic":
      case "urn:cen.eu:en16931:2017:compliant:factur-x.eu:1p0:basic":
      case "urn:cen.eu:en16931:2017#conformant#urn:factur-x.eu:1p0:basic":
        return "basic";
      case "urn:cen.eu:en16931:2017":
        return "en16931";
      case "urn:factur-x.eu:1p0:extended":
      case "urn:cen.eu:en16931:2017:compliant:factur-x.eu:1p0:extended":
      case "urn:cen.eu:en16931:2017#conformant#urn:factur-x.eu:1p0:extended":
        return "extended";
    }

    throw new Error(`unknown profile: ${profileId}`);
  }

  get xml(): XMLDocument | undefined {
    if (this._raw && this._raw instanceof XMLDocument) {
      return this._raw;
    }
    return undefined;
  }

  public static async fromPDF(bytes: string | Uint8Array | ArrayBuffer): Promise<EInvoice> {
    const pdf = await PDFDocument.load(bytes);

    // Search for xml-attachment in embedded files
    for (const [_, object] of pdf.context.enumerateIndirectObjects()) {
      if (object instanceof PDFDict && FACTUR_X_FILENAMES.includes(object.lookupMaybe(PDFName.of("F"), PDFString)?.toString() ?? "")) {
        const stream = object.lookup(PDFName.of("EF"), PDFDict).lookup(PDFName.of("F"), PDFStream) as PDFRawStream;
        const data = decodePDFRawStream(stream).decode();

        const instance = this.fromXML(Buffer.from(data));
        instance.pdf = pdf;

        return instance;
      }
    }

    throw new Error("could not find xml-attachment in pdf");
  }

  public static fromXML(xml: string | Buffer): EInvoice {
    const doc = new XMLDocument(xml);

    const meta = {
      businessProcessType: doc.getText("/rsm:CrossIndustryInvoice/rsm:ExchangedDocumentContext/ram:BusinessProcessSpecifiedDocumentContext/ram:ID/text()") ?? "A1",
      specificationProfile: doc.getRequiredIdentifier("/rsm:CrossIndustryInvoice/rsm:ExchangedDocumentContext/ram:GuidelineSpecifiedDocumentContextParameter/ram:ID/text()"),
    };

    const documentId = doc.getRequiredIdentifier("/rsm:CrossIndustryInvoice/rsm:ExchangedDocument/ram:ID/text()");
    const documentType = doc.getRequiredCode("/rsm:CrossIndustryInvoice/rsm:ExchangedDocument/ram:TypeCode/text()");
    const documentDate = doc.getRequiredDate("/rsm:CrossIndustryInvoice/rsm:ExchangedDocument/ram:IssueDateTime/udt:DateTimeString/text()");
    const notes = doc.getNodes("/rsm:CrossIndustryInvoice/rsm:ExchangedDocument/ram:IncludedNote").map((node) => ({
      text: node.getRequiredText("/ram:IncludedNote/ram:Content/text()"),
      code: node.getText("/ram:IncludedNote/ram:SubjectCode/text()"),
    }));
    const buyerReference = doc.getText("/rsm:CrossIndustryInvoice/rsm:SupplyChainTradeTransaction/ram:ApplicableHeaderTradeAgreement/ram:BuyerReference/text()");

    const seller = doc
      .getNodes("/rsm:CrossIndustryInvoice/rsm:SupplyChainTradeTransaction/ram:ApplicableHeaderTradeAgreement/ram:SellerTradeParty")
      ?.map((node) => {
        const postalAddress = node
          .getNodes("/ram:SellerTradeParty/ram:PostalTradeAddress")
          ?.map((node) => ({
            address: [
              node.getText("/ram:PostalTradeAddress/ram:LineOne/text()"),
              node.getText("/ram:PostalTradeAddress/ram:LineTwo/text()"),
              node.getText("/ram:PostalTradeAddress/ram:LineThree/text()"),
            ],
            postCode: node.getText("/ram:PostalTradeAddress/ram:PostcodeCode/text()"),
            city: node.getText("/ram:PostalTradeAddress/ram:CityName/text()"),
            countryCode: node.getRequiredCode("/ram:PostalTradeAddress/ram:CountryID/text()"),
            countrySubdivision: node.getCode("/ram:PostalTradeAddress/ram:CountrySubDivisionName/text()"),
          }))
          .at(0);

        if (!postalAddress) {
          throw new Error("XML contains invalid Seller Postal Address");
        }

        const taxRegistrations =
          node.getNodes("/ram:SellerTradeParty/ram:SpecifiedTaxRegistration")?.map((node) => ({
            type: node.getRequiredIdentifier("string(/ram:SpecifiedTaxRegistration/ram:ID/@schemeID)"),
            value: node.getIdentifier("/ram:SpecifiedTaxRegistration/ram:ID/text()"),
          })) || [];

        return {
          sellerId: node.getIdentifier("/ram:SellerTradeParty/ram:ID/text()"),
          sellerName: node.getRequiredText("/ram:SellerTradeParty/ram:Name/text()"),
          postalAddress,
          taxRegistrations,
        };
      })
      .at(0);

    const buyer = doc
      .getNodes("/rsm:CrossIndustryInvoice/rsm:SupplyChainTradeTransaction/ram:ApplicableHeaderTradeAgreement/ram:BuyerTradeParty")
      ?.map((node) => {
        const postalAddress = node
          .getNodes("/ram:BuyerTradeParty/ram:PostalTradeAddress")
          ?.map((node) => ({
            address: [
              node.getText("/ram:PostalTradeAddress/ram:LineOne/text()"),
              node.getText("/ram:PostalTradeAddress/ram:LineTwo/text()"),
              node.getText("/ram:PostalTradeAddress/ram:LineThree/text()"),
            ],
            postCode: node.getText("/ram:PostalTradeAddress/ram:PostcodeCode/text()"),
            city: node.getText("/ram:PostalTradeAddress/ram:CityName/text()"),
            countryCode: node.getRequiredCode("/ram:PostalTradeAddress/ram:CountryID/text()"),
            countrySubdivision: node.getCode("/ram:PostalTradeAddress/ram:CountrySubDivisionName/text()"),
          }))
          .at(0);

        if (!postalAddress) {
          throw new Error("XML contains invalid Buyer Postal Address");
        }

        const taxRegistrations =
          node.getNodes("/ram:BuyerTradeParty/ram:SpecifiedTaxRegistration")?.map((node) => ({
            type: node.getRequiredIdentifier("string(/ram:SpecifiedTaxRegistration/ram:ID/@schemeID)"),
            value: node.getIdentifier("/ram:SpecifiedTaxRegistration/ram:ID/text()"),
          })) || [];

        return {
          buyerId: node.getIdentifier("/ram:BuyerTradeParty/ram:ID/text()"),
          buyerName: node.getRequiredText("/ram:BuyerTradeParty/ram:Name/text()"),
          postalAddress,
          taxRegistrations,
        };
      })
      .at(0);

    const transaction: Data["transaction"] = {
      currency: doc.getRequiredCode("/rsm:CrossIndustryInvoice/rsm:SupplyChainTradeTransaction/ram:ApplicableHeaderTradeSettlement/ram:InvoiceCurrencyCode/text()"),
      totalGross: parseFloat(doc.getCode("/rsm:CrossIndustryInvoice/rsm:SupplyChainTradeTransaction/ram:ApplicableHeaderTradeSettlement/ram:SpecifiedTradeSettlementHeaderMonetarySummation/ram:GrandTotalAmount/text()") ?? ""),
      totalNet: parseFloat(doc.getCode("/rsm:CrossIndustryInvoice/rsm:SupplyChainTradeTransaction/ram:ApplicableHeaderTradeSettlement/ram:SpecifiedTradeSettlementHeaderMonetarySummation/ram:LineTotalAmount/text()") ?? ""),
      totalVat: parseFloat(doc.getRequiredCode("/rsm:CrossIndustryInvoice/rsm:SupplyChainTradeTransaction/ram:ApplicableHeaderTradeSettlement/ram:SpecifiedTradeSettlementHeaderMonetarySummation/ram:TaxTotalAmount/text()")),
      totalPrepaid: parseFloat(doc.getCode("/rsm:CrossIndustryInvoice/rsm:SupplyChainTradeTransaction/ram:ApplicableHeaderTradeSettlement/ram:SpecifiedTradeSettlementHeaderMonetarySummation/ram:TotalPrepaidAmount/text()") ?? ""),
      totalPayable: parseFloat(doc.getCode("/rsm:CrossIndustryInvoice/rsm:SupplyChainTradeTransaction/ram:ApplicableHeaderTradeSettlement/ram:SpecifiedTradeSettlementHeaderMonetarySummation/ram:DuePayableAmount/text()") ?? ""),
      paymentReference: doc.getCode("/rsm:CrossIndustryInvoice/rsm:SupplyChainTradeTransaction/ram:ApplicableHeaderTradeSettlement/ram:PaymentReference/text()"),
      taxes: doc.getNodes("/rsm:CrossIndustryInvoice/rsm:SupplyChainTradeTransaction/ram:ApplicableHeaderTradeSettlement/ram:ApplicableTradeTax").map((node) => ({
        taxType: "VAT",
        taxPercent: parseFloat(node.getRequiredCode("/ram:ApplicableTradeTax/ram:RateApplicablePercent/text()")),
        taxAmount: parseFloat(node.getRequiredCode("/ram:ApplicableTradeTax/ram:CalculatedAmount/text()")),
        totalNet: parseFloat(node.getRequiredCode("/ram:ApplicableTradeTax/ram:BasisAmount/text()")),
      })),
      positions: doc.getNodes("/rsm:CrossIndustryInvoice/rsm:SupplyChainTradeTransaction/ram:IncludedSupplyChainTradeLineItem").map((node) => ({
        lineId: node.getRequiredCode("/ram:IncludedSupplyChainTradeLineItem/ram:AssociatedDocumentLineDocument/ram:LineID/text()"),
        gtin: node.getCode("/ram:IncludedSupplyChainTradeLineItem/ram:SpecifiedTradeProduct/ram:GlobalID/text()"),
        name: node.getRequiredText("/ram:IncludedSupplyChainTradeLineItem/ram:SpecifiedTradeProduct/ram:Name/text()"),
        description: node.getText("/ram:IncludedSupplyChainTradeLineItem/ram:SpecifiedTradeProduct/ram:Description/text()"),
        quantity: parseFloat(node.getRequiredCode("/ram:IncludedSupplyChainTradeLineItem/ram:SpecifiedLineTradeDelivery/ram:BilledQuantity/text()")),
        unitCode: node.getRequiredCode("/ram:IncludedSupplyChainTradeLineItem/ram:SpecifiedLineTradeDelivery/ram:BilledQuantity/@unitCode"),
        grossItemPrice: parseFloat(node.getCode("/ram:IncludedSupplyChainTradeLineItem/ram:GrossPriceProductTradePrice/ram:ChargeAmount/text()") ?? ""),
        netItemPrice: parseFloat(node.getCode("/ram:IncludedSupplyChainTradeLineItem/ram:NetPriceProductTradePrice/ram:ChargeAmount/text()") ?? ""),
        total: parseFloat(node.getRequiredCode("/ram:IncludedSupplyChainTradeLineItem/ram:SpecifiedLineTradeSettlement/ram:SpecifiedTradeSettlementLineMonetarySummation/ram:LineTotalAmount/text()")),
      })),
    }

    // Sanity Checks
    if (!Object.values<string>(DOCUMENT_TYPES).includes(documentType)) {
      throw new Error("XML contains invalid Invoice type code: " + documentType);
    }
    if (!seller) {
      throw new Error("XML is missing Seller Entity");
    }
    if (!buyer) {
      throw new Error("XML is missing Buyer Entity");
    }

    const out: Data = {
      meta,
      documentId,
      documentType: documentType as DOCUMENT_TYPES,
      documentDate,
      notes,
      buyerReference,
      seller,
      buyer,
      transaction,
    };

    const instance = new EInvoice(out);
    instance._raw = doc;

    return instance;
  }
}
