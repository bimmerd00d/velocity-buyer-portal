import { InvoiceListNode } from '@/types/invoice';

interface InvoicePage {
  edges: InvoiceListNode[];
  totalCount: number;
  pageInfo: { hasNextPage: boolean };
}

interface CreditSummary {
  limit: number;
  outstanding: number;
  remaining: number;
  pastDue: number;
  unpaidCount: number;
  currency: string;
}

export function summarizeCredit(
  limit: number,
  currency: string,
  invoices: InvoiceListNode[],
  companyId: number,
  nowSeconds: number,
): CreditSummary {
  if (!Number.isFinite(limit) || limit < 0 || !/^[A-Z]{3}$/.test(currency)) {
    throw new Error('Company credit settings are unavailable');
  }

  const fractionDigits =
    new Intl.NumberFormat('en', {
      style: 'currency',
      currency,
    }).resolvedOptions().maximumFractionDigits ?? 2;
  const scale = 10 ** fractionDigits;
  const toMinorUnits = (amount: number): number => {
    const scaled = amount * scale;
    if (
      !Number.isSafeInteger(Math.round(scaled)) ||
      Math.abs(scaled - Math.round(scaled)) > 0.000001
    ) {
      throw new Error('Currency amount has invalid precision');
    }
    return Math.round(scaled);
  };
  const limitMinor = toMinorUnits(limit);
  let outstandingMinor = 0;
  let pastDueMinor = 0;
  let unpaidCount = 0;

  invoices.forEach(({ node }) => {
    if (Number(node.companyInfo?.companyId) !== companyId) {
      throw new Error('Invoice company does not match the selected company');
    }

    const balance = Number(node.openBalance?.value);
    if (
      node.openBalance?.value == null ||
      node.openBalance.value === '' ||
      !Number.isFinite(balance) ||
      balance < 0
    ) {
      throw new Error('Invoice balance or currency is unavailable');
    }

    if (node.status === 2 && balance !== 0) throw new Error('Paid invoice has an unpaid balance');

    if (node.status !== 2 && balance > 0) {
      if (node.openBalance.code !== currency) {
        throw new Error('Invoice currency does not match company credit');
      }
      const dueDate = Number(node.dueDate);
      if (!Number.isFinite(dueDate) || dueDate <= 0) {
        throw new Error('Invoice due date is unavailable');
      }
      const balanceMinor = toMinorUnits(balance);
      outstandingMinor += balanceMinor;
      unpaidCount += 1;
      if (dueDate < nowSeconds) {
        pastDueMinor += balanceMinor;
      }
    }
  });

  return {
    limit,
    outstanding: outstandingMinor / scale,
    remaining: (limitMinor - outstandingMinor) / scale,
    pastDue: pastDueMinor / scale,
    unpaidCount,
    currency,
  };
}

export function validateInvoicePage(value: unknown): InvoicePage {
  if (!value || typeof value !== 'object' || !('invoices' in value)) {
    throw new Error('Invoice response is unavailable');
  }

  const { invoices } = value as { invoices?: Partial<InvoicePage> };
  if (
    !invoices ||
    !Array.isArray(invoices.edges) ||
    !Number.isInteger(invoices.totalCount) ||
    !invoices.pageInfo ||
    typeof invoices.pageInfo.hasNextPage !== 'boolean'
  ) {
    throw new Error('Invoice response is incomplete');
  }

  return invoices as InvoicePage;
}
