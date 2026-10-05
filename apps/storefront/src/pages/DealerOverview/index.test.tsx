import {
  buildB2BFeaturesStateWith,
  buildCompanyStateWith,
  builder,
  faker,
  graphql,
  HttpResponse,
  renderWithProviders,
  screen,
  startMockServer,
  stringContainingAll,
  waitFor,
} from 'tests/test-utils';

import { permissionLevels } from '@/constants';
import { CustomerOrderNode } from '@/shared/service/b2b/graphql/orders';
import { CompanyStatus, CustomerRole, UserTypes } from '@/types';

import DealerOverview from '.';

const { server } = startMockServer();

const buildOrderWith = builder<CustomerOrderNode>(() => ({
  node: {
    orderId: faker.number.int().toString(),
    createdAt: Math.floor(faker.date.past().getTime() / 1000),
    updatedAt: Math.floor(faker.date.recent().getTime() / 1000),
    userId: faker.number.int(),
    status: faker.word.noun(),
    statusCode: faker.number.int(),
    isInvoiceOrder: 'A_0',
  },
}));

const company = buildCompanyStateWith({
  companyInfo: { id: '42', companyName: 'Harbor Audio', status: CompanyStatus.APPROVED },
  customer: {
    id: 91,
    firstName: 'Morgan',
    role: CustomerRole.ADMIN,
    userType: UserTypes.MULTIPLE_B2C,
  },
});

const b2bFeatures = buildB2BFeaturesStateWith({
  masqueradeCompany: { isAgenting: false },
});

const initialGlobalContext = {
  storefrontConfig: { shoppingLists: false, tradeProfessionalApplication: false },
};

describe('Dealer overview', () => {
  it('hides account tools when the buyer lacks their allowed routes', () => {
    const requestOrders = vi.fn();
    server.use(graphql.query('GetAllOrders', requestOrders));

    renderWithProviders(<DealerOverview />, {
      preloadedState: { company, b2bFeatures },
      initialGlobalContext,
    });

    expect(screen.getByText(/Welcome, Morgan/)).toHaveTextContent('Harbor Audio');
    expect(screen.queryByRole('link', { name: /Your orders/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Recent orders' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Open quotes/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Open shopping lists' })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('region', { name: 'Company credit summary' }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Explore dealer resources' })).toHaveAttribute(
      'href',
      '/dealer-resources',
    );
    expect(requestOrders).not.toHaveBeenCalled();
  });

  it('shows live recent order details when the orders route is allowed', async () => {
    const order = buildOrderWith({
      node: {
        orderId: '26118',
        poNumber: 'JOB-42',
        status: 'Shipped',
        totalIncTax: 1280,
        currencyCode: 'USD',
      },
    });
    const requestOrders = vi
      .fn()
      .mockReturnValue(
        HttpResponse.json({ data: { allOrders: { totalCount: 1, edges: [order] } } }),
      );
    server.use(graphql.query('GetAllOrders', ({ query }) => requestOrders(query)));

    renderWithProviders(<DealerOverview />, {
      preloadedState: {
        company: buildCompanyStateWith({
          ...company,
          permissions: [{ code: 'get_orders', permissionLevel: permissionLevels.USER }],
        }),
        b2bFeatures,
      },
      initialGlobalContext,
    });

    expect(await screen.findByRole('link', { name: 'Order 26118' })).toHaveAttribute(
      'href',
      '/orderDetail/26118',
    );
    expect(screen.getByText('JOB-42')).toBeInTheDocument();
    expect(screen.getByText('Shipped')).toBeInTheDocument();
    expect(screen.getByText('$1,280.00')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Your orders/ })).toHaveTextContent('1');
    expect(requestOrders).toHaveBeenCalledWith(
      stringContainingAll('first: 3', 'offset: 0', 'isShowMy: "1"', 'companyIds: [42'),
    );
  });

  it('explains when an allowed buyer has no recent orders', async () => {
    server.use(
      graphql.query('GetAllOrders', () =>
        HttpResponse.json({ data: { allOrders: { totalCount: 0, edges: [] } } }),
      ),
    );

    renderWithProviders(<DealerOverview />, {
      preloadedState: {
        company: buildCompanyStateWith({
          ...company,
          permissions: [{ code: 'get_orders', permissionLevel: permissionLevels.USER }],
        }),
        b2bFeatures,
      },
      initialGlobalContext,
    });

    await waitFor(() => {
      expect(screen.getByText(/Your purchases will appear here/)).toBeInTheDocument();
    });
    expect(screen.getByRole('link', { name: /Your orders/ })).toHaveTextContent('0');
  });
});
