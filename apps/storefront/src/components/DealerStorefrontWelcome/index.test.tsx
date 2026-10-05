import { fireEvent, render, screen } from '@testing-library/react';
import { faker } from 'tests/test-utils';

import { CompanyIdentityCard } from '@/components/layout/CompanyIdentity';

import { DealerWelcomeMount } from '.';

let host: HTMLDivElement;
let original: HTMLHeadingElement;
beforeEach(() => {
  host = document.createElement('div');
  host.className = 'dealer-home';
  const workspace = document.createElement('section');
  workspace.className = 'workspace';
  const welcome = document.createElement('div');
  welcome.className = 'welcome';
  original = document.createElement('h1');
  original.textContent = 'Ready for the next job.';
  welcome.append(original);
  workspace.append(welcome);
  host.append(workspace);
  document.body.append(host);
});
afterEach(() => {
  host.remove();
});

it('adds the authenticated buyer and company logo to the storefront workspace', () => {
  const name = faker.person.fullName();
  const companyName = faker.company.name();
  const openInvoices = vi.fn();
  render(
    <DealerWelcomeMount
      enabled
      canViewInvoices
      onViewInvoices={openInvoices}
      name={name}
      identity={
        <CompanyIdentityCard
          companyId={faker.string.numeric(8)}
          companyName={companyName}
          source="https://example.com/companylogo.png"
        />
      }
    />,
  );
  expect(screen.getByRole('heading', { name: `Welcome back, ${name}.` })).toBeVisible();
  expect(screen.getByRole('img', { name: `${companyName} logo` })).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'View invoices' }));
  expect(openInvoices).toHaveBeenCalledOnce();
  expect(original).not.toBeVisible();
});

it('removes personal identity and restores the original workspace when authentication ends', () => {
  const name = faker.person.fullName();
  const { rerender } = render(<DealerWelcomeMount enabled name={name} identity={null} />);
  rerender(<DealerWelcomeMount enabled={false} name={name} identity={null} />);
  expect(screen.queryByRole('region', { name: 'Your dealer workspace' })).not.toBeInTheDocument();
  expect(original).toBeVisible();
});

it('does not show a personalized workspace before authentication completes', () => {
  render(<DealerWelcomeMount enabled={false} name={faker.person.fullName()} identity={null} />);
  expect(screen.queryByRole('region', { name: 'Your dealer workspace' })).not.toBeInTheDocument();
  expect(original).toBeVisible();
});

it('leaves guest and non-dealer pages alone', () => {
  host.remove();
  render(<DealerWelcomeMount enabled name={faker.person.fullName()} identity={null} />);
  expect(screen.queryByRole('region', { name: 'Your dealer workspace' })).not.toBeInTheDocument();
});

it('updates the buyer name when the current identity changes', () => {
  const firstName = faker.person.fullName();
  const nextName = faker.person.fullName();
  const { rerender } = render(<DealerWelcomeMount enabled name={firstName} identity={null} />);
  rerender(<DealerWelcomeMount enabled name={nextName} identity={null} />);
  expect(
    screen.queryByRole('heading', { name: `Welcome back, ${firstName}.` }),
  ).not.toBeInTheDocument();
  expect(screen.getByRole('heading', { name: `Welcome back, ${nextName}.` })).toBeVisible();
});

it('omits the invoice shortcut when the buyer lacks access', () => {
  render(<DealerWelcomeMount enabled name={faker.person.fullName()} identity={null} />);
  expect(screen.queryByRole('button', { name: 'View invoices' })).not.toBeInTheDocument();
});
