import { transferableAbortController } from 'node:util';
import {
  builder,
  faker,
  http,
  HttpResponse,
  renderWithProviders,
  screen,
  startMockServer,
  userEvent,
} from 'tests/test-utils';

import SalesRepresentative from './SalesRepresentative';

const { server } = startMockServer();
const buildRep = builder(() => ({
  id: faker.number.int(),
  name: faker.person.fullName(),
  email: faker.internet.email(),
  phone: faker.phone.number(),
}));
const props = { companyId: '42', token: 'buyer-token' };

describe('Assigned sales representative', () => {
  beforeEach(() => {
    // Use Node's AbortController with Node fetch in the JSDOM test environment.
    vi.stubGlobal('AbortController', transferableAbortController().constructor);
    vi.stubEnv('VITE_ASSETS_ABSOLUTE_PATH', 'https://portal.example.com/');
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });
  it('shows the assigned contact with email and telephone actions', async () => {
    const rep = buildRep({
      name: 'Jordan Lee',
      email: 'jordan@example.com',
      phone: '(512) 555-0120',
    });
    server.use(
      http.get('*/api/company-sales-reps', ({ request }) => {
        expect(new URL(request.url).searchParams.get('companyId')).toBe('42');
        expect(request.headers.get('Authorization')).toBe('Bearer buyer-token');
        return HttpResponse.json({ representatives: [rep] });
      }),
    );
    renderWithProviders(<SalesRepresentative {...props} />);
    expect(await screen.findByRole('heading', { name: 'Jordan Lee' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Email Jordan Lee' })).toHaveAttribute(
      'href',
      'mailto:jordan@example.com',
    );
    expect(screen.getByRole('link', { name: '(512) 555-0120' })).toHaveAttribute(
      'href',
      'tel:5125550120',
    );
  });

  it('uses the saved email without inventing a missing phone number', async () => {
    const rep = buildRep({ phone: '' });
    server.use(
      http.get('*/api/company-sales-reps', () => HttpResponse.json({ representatives: [rep] })),
    );
    renderWithProviders(<SalesRepresentative {...props} />);
    expect(await screen.findByRole('heading', { name: rep.name })).toBeVisible();
    expect(screen.getAllByRole('link')).toHaveLength(2);
    expect(screen.getByRole('link', { name: rep.email })).toHaveAttribute(
      'href',
      `mailto:${rep.email}`,
    );
  });

  it('explains an unassigned company without showing another company contact', async () => {
    server.use(
      http.get('*/api/company-sales-reps', () => HttpResponse.json({ representatives: [] })),
    );
    renderWithProviders(<SalesRepresentative {...props} />);
    expect(await screen.findByText(/has not been assigned/)).toBeVisible();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('allows a buyer to retry a failed contact lookup', async () => {
    server.use(http.get('*/api/company-sales-reps', () => new HttpResponse(null, { status: 502 })));
    renderWithProviders(<SalesRepresentative {...props} />);
    const retry = await screen.findByRole('button', { name: 'Try again' });
    const rep = buildRep({ phone: '' });
    server.use(
      http.get('*/api/company-sales-reps', () => HttpResponse.json({ representatives: [rep] })),
    );
    await userEvent.click(retry);
    expect(await screen.findByRole('heading', { name: rep.name })).toBeVisible();
  });

  it('does not show contacts when signed out', () => {
    renderWithProviders(<SalesRepresentative companyId="42" token="" />);
    expect(screen.queryByRole('region')).not.toBeInTheDocument();
  });
});
