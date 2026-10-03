import { fireEvent, render, screen } from '@testing-library/react';

import { CompanyIdentityCard } from './CompanyIdentity';

describe('Company identity', () => {
  it('changes the displayed logo when the active company changes', () => {
    const { rerender } = render(
      <CompanyIdentityCard
        source="https://example.com/apex.png"
        companyId="13877722"
        companyName="Apex Tuning & Audio"
      />,
    );
    expect(screen.getByRole('img', { name: 'Apex Tuning & Audio logo' })).toBeInTheDocument();
    rerender(
      <CompanyIdentityCard
        source="https://example.com/redline.png"
        companyId="13877723"
        companyName="Redline Car Audio"
      />,
    );
    expect(screen.queryByRole('img', { name: 'Apex Tuning & Audio logo' })).not.toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Redline Car Audio logo' })).toBeInTheDocument();
  });

  it('shows the company name when an image fails', () => {
    render(
      <CompanyIdentityCard
        source="https://example.com/apex.png"
        companyId="13877722"
        companyName="Apex Tuning & Audio"
      />,
    );
    fireEvent.error(screen.getByRole('img'));
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Current company')).toHaveTextContent('Apex Tuning & Audio');
  });

  it('does not borrow another company logo for an unmapped account', () => {
    render(<CompanyIdentityCard companyId="unknown" companyName="New dealer" />);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Current company')).toHaveTextContent('New dealer');
  });

  it('does not show a company card without a company identity', () => {
    render(<CompanyIdentityCard companyId="" companyName="" />);
    expect(screen.queryByLabelText('Current company')).not.toBeInTheDocument();
  });
});
