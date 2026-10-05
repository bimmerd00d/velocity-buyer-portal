import { fireEvent, render, screen } from '@testing-library/react';

import DealerResources from './index';

describe('Dealer resources', () => {
  it('combines the category and search filters and explains an empty result', () => {
    render(<DealerResources />);

    expect(screen.getAllByRole('article')).toHaveLength(6);

    fireEvent.click(screen.getByRole('button', { name: 'Brand assets' }));
    expect(screen.getAllByRole('article')).toHaveLength(2);
    expect(screen.getByText('Velocity Dealer brand kit')).toBeInTheDocument();

    fireEvent.change(screen.getByRole('searchbox', { name: 'Search dealer resources' }), {
      target: { value: 'lockups' },
    });
    expect(screen.getAllByRole('article')).toHaveLength(1);
    expect(screen.getByText('Velocity Dealer brand kit')).toBeInTheDocument();

    fireEvent.change(screen.getByRole('searchbox', { name: 'Search dealer resources' }), {
      target: { value: 'warranty' },
    });
    expect(screen.getByRole('status')).toHaveTextContent('No matching resources');
  });
});
