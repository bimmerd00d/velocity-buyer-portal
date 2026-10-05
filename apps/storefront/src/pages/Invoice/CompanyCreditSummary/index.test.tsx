import { Provider } from 'react-redux';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { buildCompanyStateWith } from 'tests/test-utils';

import { getInvoiceList } from '@/shared/service/b2b';
import B3Request from '@/shared/service/request/b3Fetch';
import { setupStore } from '@/store';
import { CompanyState } from '@/store/slices/company';
import { CustomerRole, LoginTypes } from '@/types';
import { InvoiceListNode } from '@/types/invoice';

import { summarizeCredit } from './creditMath';
import CompanyCreditSummary from '.';

vi.mock('@/shared/service/b2b', () => ({
  getInvoiceList: vi.fn(),
}));
vi.mock('@/shared/service/request/b3Fetch', () => ({ default: { graphqlB2B: vi.fn() } }));

const companyId = 42;

function invoice(balance: string, currency = 'USD', status = 0, dueDate = 1): InvoiceListNode {
  return {
    node: {
      companyInfo: { companyId: String(companyId) },
      openBalance: { code: currency, value: balance },
      status,
      dueDate,
    },
  } as InvoiceListNode;
}

function renderSummary(companyOverrides: Partial<CompanyState> = {}) {
  const company = buildCompanyStateWith({
    companyInfo: { id: String(companyId), companyName: 'Apex', status: 1 },
    customer: { role: CustomerRole.ADMIN, loginType: LoginTypes.GENERAL_LOGIN },
    tokens: { B2BToken: 'signed-in-token' },
    permissions: [{ code: 'get_invoices', permissionLevel: 2 }],
    ...companyOverrides,
  });
  const store = setupStore({ company });
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <Provider store={store}>
        <CompanyCreditSummary />
      </Provider>
    </QueryClientProvider>,
  );
}

describe('company credit calculation', () => {
  it('counts open and partially paid balances, excludes paid invoices, and tracks past due', () => {
    const summary = summarizeCredit(
      25000,
      'USD',
      [invoice('5000'), invoice('1450', 'USD', 1, 200), invoice('0', 'EUR', 2)],
      companyId,
      100,
    );

    expect(summary).toMatchObject({
      limit: 25000,
      outstanding: 6450,
      remaining: 18550,
      pastDue: 5000,
      unpaidCount: 2,
    });
  });

  it('refuses to combine currencies or another company’s invoices', () => {
    expect(() => summarizeCredit(25000, 'USD', [invoice('100', 'EUR')], companyId, 100)).toThrow();
    expect(() => summarizeCredit(25000, 'USD', [invoice('100')], 999, 100)).toThrow();
  });

  it('refuses a missing credit setting or incomplete balance', () => {
    expect(() => summarizeCredit(NaN, 'USD', [], companyId, 100)).toThrow();
    expect(() => summarizeCredit(25000, 'USD', [invoice('bad')], companyId, 100)).toThrow();
  });

  it('adds decimal balances in currency units without floating point drift', () => {
    const summary = summarizeCredit(1, 'USD', [invoice('0.10'), invoice('0.20')], companyId, 100);
    expect(summary.outstanding).toBe(0.3);
    expect(summary.remaining).toBe(0.7);
  });
});

describe('company credit summary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reads every invoice page for the current company', async () => {
    vi.mocked(B3Request.graphqlB2B).mockResolvedValue({
      companyCreditConfig: { creditEnabled: true, availableCredit: 25000, creditCurrency: 'USD' },
    });
    vi.mocked(getInvoiceList)
      .mockResolvedValueOnce({
        invoices: { edges: [invoice('5000')], totalCount: 2, pageInfo: { hasNextPage: true } },
      })
      .mockResolvedValueOnce({
        invoices: {
          edges: [invoice('1450', 'USD', 1)],
          totalCount: 2,
          pageInfo: { hasNextPage: false },
        },
      });

    renderSummary();
    expect(await screen.findByText('$18,550.00')).toBeInTheDocument();
    expect(screen.getAllByText('$6,450.00')).toHaveLength(2);
    expect(getInvoiceList).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        companyIds: [42],
        offset: 0,
        first: 50,
        orderBy: '-invoice_number',
      }),
    );
    expect(getInvoiceList).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        companyIds: [42],
        offset: 1,
        first: 50,
        orderBy: '-invoice_number',
      }),
    );
  });

  it('hides disabled credit and never reads invoices', async () => {
    vi.mocked(B3Request.graphqlB2B).mockResolvedValue({
      companyCreditConfig: { creditEnabled: false },
    });
    renderSummary();
    await waitFor(() =>
      expect(
        screen.queryByRole('region', { name: 'Company credit summary' }),
      ).not.toBeInTheDocument(),
    );
    expect(B3Request.graphqlB2B).toHaveBeenCalledOnce();
    expect(getInvoiceList).not.toHaveBeenCalled();
  });

  it('hides credit when the store reports that company credit is disabled', async () => {
    vi.mocked(B3Request.graphqlB2B).mockRejectedValue(
      new Error('Store company credit is not enabled'),
    );
    renderSummary();
    await waitFor(() =>
      expect(
        screen.queryByRole('region', { name: 'Company credit summary' }),
      ).not.toBeInTheDocument(),
    );
    expect(getInvoiceList).not.toHaveBeenCalled();
  });

  it('shows unavailable after a failed read instead of zero', async () => {
    vi.mocked(B3Request.graphqlB2B).mockRejectedValue(new Error('Network unavailable'));
    renderSummary();
    expect(await screen.findByText('Company credit is unavailable right now.')).toBeInTheDocument();
    expect(screen.queryByText('$0.00')).not.toBeInTheDocument();
  });

  it('does not read company data without company invoice permission', () => {
    renderSummary({ permissions: [{ code: 'get_invoices', permissionLevel: 1 }] });
    expect(B3Request.graphqlB2B).not.toHaveBeenCalled();
    expect(getInvoiceList).not.toHaveBeenCalled();
  });
});
