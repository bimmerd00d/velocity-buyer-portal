import { shallowEqual } from 'react-redux';
import { useQuery } from '@tanstack/react-query';

import { permissionLevels } from '@/constants';
import { getInvoiceList } from '@/shared/service/b2b';
import B3Request from '@/shared/service/request/b3Fetch';
import { useAppSelector } from '@/store';
import { CustomerRole, LoginTypes } from '@/types';
import { InvoiceListNode } from '@/types/invoice';
import { b2bPermissionsMap } from '@/utils/b3CheckPermissions/config';

import { summarizeCredit, validateInvoicePage } from './creditMath';

interface Props {
  compact?: boolean;
}

interface CreditConfig {
  creditEnabled?: boolean | null;
  creditHold?: boolean | null;
  availableCredit?: number | null;
  creditCurrency?: string | null;
}

const PAGE_SIZE = 50;

async function readCreditConfig(isAgenting: boolean): Promise<CreditConfig> {
  // Read the same fields as the shared service, adding the agent flag and suppressing disabled-store snackbars.
  let result;
  try {
    result = await B3Request.graphqlB2B(
      {
        query: `query GetDealerCompanyCreditConfig {
          companyCreditConfig(isMasqueradingCompany: ${isAgenting}) {
            creditEnabled creditHold availableCredit creditCurrency
          }
        }`,
      },
      true,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/company credit is not enabled/i.test(message)) return { creditEnabled: false };
    throw error;
  }

  const response = result as
    | { companyCreditConfig?: CreditConfig | null; errMsg?: string }
    | undefined;
  if (response?.errMsg && /company credit is not enabled/i.test(response.errMsg)) {
    return { creditEnabled: false };
  }
  const config = response?.companyCreditConfig;
  if (!config) throw new Error('Company credit settings are unavailable');
  return config;
}

async function readAllInvoices(
  companyId: number,
  offset = 0,
  all: InvoiceListNode[] = [],
): Promise<InvoiceListNode[]> {
  const page = validateInvoicePage(
    await getInvoiceList({
      q: '',
      first: PAGE_SIZE,
      offset,
      orderBy: '-invoice_number',
      companyIds: [companyId],
    }),
  );
  const result = [...all, ...page.edges];
  const nextOffset = offset + page.edges.length;

  if (!page.pageInfo.hasNextPage && nextOffset === page.totalCount) return result;
  if (!page.edges.length || nextOffset >= page.totalCount) {
    throw new Error('Invoice pagination is incomplete');
  }
  return readAllInvoices(companyId, nextOffset, result);
}

function formatMoney(amount: number, currency: string): string {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount);
}

export default function CompanyCreditSummary({ compact = false }: Props) {
  const {
    companyId,
    selectedCompanyId,
    agentCompanyId,
    isAgenting,
    role,
    loginType,
    token,
    permissions,
  } = useAppSelector(
    ({ company, b2bFeatures }) => ({
      companyId: Number(company.companyInfo.id),
      selectedCompanyId: Number(company.companyHierarchyInfo.selectCompanyHierarchyId),
      agentCompanyId: Number(b2bFeatures.masqueradeCompany.id),
      isAgenting: b2bFeatures.masqueradeCompany.isAgenting,
      role: company.customer.role,
      loginType: company.customer.loginType,
      token: company.tokens.B2BToken,
      permissions: company.permissions,
    }),
    shallowEqual,
  );

  const activeCompanyId =
    role === CustomerRole.SUPER_ADMIN && isAgenting ? agentCompanyId : companyId;
  const invoicePermission = permissions.some(
    ({ code, permissionLevel }) =>
      code === b2bPermissionsMap.getInvoicesPermission &&
      Number(permissionLevel) >= permissionLevels.COMPANY,
  );
  const canRead =
    Boolean(token) &&
    loginType !== LoginTypes.WAITING_LOGIN &&
    Number.isInteger(activeCompanyId) &&
    activeCompanyId > 0 &&
    (!selectedCompanyId || selectedCompanyId === activeCompanyId) &&
    invoicePermission &&
    (role !== CustomerRole.SUPER_ADMIN || isAgenting) &&
    role !== CustomerRole.GUEST &&
    role !== CustomerRole.B2C;

  const creditQuery = useQuery({
    queryKey: ['dealer-credit-config', activeCompanyId, isAgenting, token],
    queryFn: () => readCreditConfig(isAgenting),
    enabled: canRead,
    retry: false,
    gcTime: 0,
    staleTime: 0,
  });

  const credit = creditQuery.data;
  const invoicesQuery = useQuery({
    queryKey: ['dealer-credit-invoices', activeCompanyId, isAgenting, token],
    queryFn: () => readAllInvoices(activeCompanyId),
    enabled: canRead && credit?.creditEnabled === true,
    retry: false,
    gcTime: 0,
    staleTime: 0,
  });

  if (!canRead || credit?.creditEnabled === false) return null;

  let content;
  if (creditQuery.isError || invoicesQuery.isError || (credit && credit.creditEnabled !== true)) {
    content = <p className="dealer-credit-state">Company credit is unavailable right now.</p>;
  } else if (creditQuery.isPending || invoicesQuery.isPending) {
    content = <p className="dealer-credit-state">Loading company credit…</p>;
  } else {
    try {
      const summary = summarizeCredit(
        credit?.availableCredit == null ? NaN : Number(credit.availableCredit),
        credit?.creditCurrency || '',
        invoicesQuery.data || [],
        activeCompanyId,
        Date.now() / 1000,
      );
      const usedPercent =
        summary.limit > 0 ? Math.min((summary.outstanding / summary.limit) * 100, 100) : 0;
      content = (
        <>
          <div className="dealer-credit-metrics">
            {!compact && (
              <div className="dealer-credit-metric">
                <span>Configured credit limit</span>
                <strong>{formatMoney(summary.limit, summary.currency)}</strong>
                <small>Per-order company purchase setting</small>
              </div>
            )}
            <div className="dealer-credit-metric">
              <span>Outstanding invoices</span>
              <strong>{formatMoney(summary.outstanding, summary.currency)}</strong>
              <small>{summary.unpaidCount} unpaid invoices</small>
            </div>
            <div className="dealer-credit-metric dealer-credit-remaining">
              <span>Remaining credit</span>
              <strong>{formatMoney(summary.remaining, summary.currency)}</strong>
              <small>Configured limit less unpaid balances</small>
            </div>
            {!compact && (
              <div className="dealer-credit-metric">
                <span>Past due</span>
                <strong>{formatMoney(summary.pastDue, summary.currency)}</strong>
                <small>Included in outstanding invoices</small>
              </div>
            )}
          </div>
          <div
            className="dealer-credit-bar"
            role="meter"
            aria-label="Company credit used"
            aria-valuemin={0}
            aria-valuemax={summary.limit}
            aria-valuenow={Math.min(summary.outstanding, summary.limit)}
            aria-valuetext={`${formatMoney(summary.outstanding, summary.currency)} of ${formatMoney(summary.limit, summary.currency)} used`}
          >
            <span style={{ width: `${usedPercent}%` }} />
          </div>
          <p className="dealer-credit-note">
            Remaining credit is an informational calculation. The configured amount is a per-order
            purchase setting; unpaid invoices do not change checkout limits.
            {credit?.creditHold && ' Company credit is currently on hold.'}
          </p>
        </>
      );
    } catch {
      content = <p className="dealer-credit-state">Company credit is unavailable right now.</p>;
    }
  }

  return (
    <section
      className={`dealer-credit-summary${compact ? ' dealer-credit-compact' : ''}`}
      aria-label="Company credit summary"
    >
      <h2>Company credit</h2>
      {content}
    </section>
  );
}
