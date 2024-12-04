import { DOCUMENT_TYPES } from "./documentTypes";

export default interface ProfileBasic {
  meta: {
    businessProcessType: string; // BT-23
    specificationProfile: string; // BT-24
  };
  documentId: string; // BT-1
  documentDate: Date; // BT-2
  documentType: DOCUMENT_TYPES; // BT-3
  notes?: { text: string; code?: string }[]; // BG-1
  buyerReference?: string;
  seller: {
    sellerId?: string; // BT-29
    sellerName: string; // BT-27
    postalAddress: {
      address?: (string | undefined)[]; // BT-35 BT-36 BT-162
      postCode?: string; // BT-38
      city?: string; // BT-37
      countryCode: string; // BT-40
      countrySubdivision?: string; // BT-39
    };
    taxRegistrations: {
      type: string; // BT-31-0
      value?: string; // BT-31
    }[];
  };
  buyer: {
    buyerId?: string; // BT-46
    buyerName: string; // BT-44
    postalAddress: {
      address?: (string | undefined)[]; // BT-50 BT-51 BT-163
      postCode?: string; // BT-53
      city?: string; // BT-52
      countryCode: string; // BT-55
      countrySubdivision?: string; // BT-54
    };
    taxRegistrations: {
      type: string; // BT-48-0
      value?: string; // BT-48
    }[];
  };
  transaction?: {
    currency: string; // BT-5
    totalGross: number; // BT-112
    totalNet: number; // BT-106
    totalVat: number; // BT-110 BT-111
    totalPrepaid: number; // BT-113
    totalPayable: number; // BT-115
    paymentReference?: string; // BT-83
    taxes?: {
      taxType: "VAT"; // BT-118-0
      taxPercent: number; // BT-119
      taxAmount: number; // BT-117
      totalNet: number; // BT-116
    }[];
    positions?: {
      lineId: string; // BT-126
      gtin?: string; // BT-157
      name: string; // BT-153
      description?: string; // BT-154
      quantity: number; // BT-129
      unitCode: string; // BT-129
      grossItemPrice?: number; // BT-148
      netItemPrice?: number; // BT-146
      total: number; // BT-131
    }[];
  };
}
