import { useQuery } from '@tanstack/react-query';

interface Representative {
  id: number;
  name: string;
  email: string;
  phone: string;
}

interface Props {
  companyId: string;
  token: string;
}

export default function SalesRepresentative({ companyId, token }: Props) {
  const contacts = useQuery<Representative[]>({
    queryKey: ['dealer-sales-representatives', companyId, token],
    enabled: Boolean(companyId && token),
    staleTime: 0,
    gcTime: 0,
    retry: false,
    queryFn: async ({ signal }) => {
      const base = import.meta.env.VITE_ASSETS_ABSOLUTE_PATH || window.location.origin;
      const url = new URL('/api/company-sales-reps', base);
      url.searchParams.set('companyId', companyId);
      const response = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${token}` },
        signal,
      });
      if (!response.ok) throw new Error('Sales representative unavailable');
      const result = await response.json();
      if (!Array.isArray(result.representatives)) throw new Error('Invalid contacts');
      return result.representatives;
    },
  });

  if (!companyId || !token) return null;

  return (
    <section
      className="dealer-overview-surface dealer-sales-rep"
      aria-labelledby="dealer-rep-title"
    >
      <div className="dealer-overview-heading">
        <div>
          <h2 id="dealer-rep-title">Your sales representative</h2>
          <p>Connect with your account team for product advice, quotes, and order support.</p>
        </div>
        <span className="dealer-sales-rep-label">Your account team</span>
      </div>
      {contacts.isPending && (
        <p className="dealer-overview-empty" role="status">
          Loading your representative…
        </p>
      )}
      {contacts.isError && (
        <p className="dealer-overview-empty" role="status">
          Contact details are temporarily unavailable.{' '}
          <button type="button" onClick={() => contacts.refetch()}>
            Try again
          </button>
        </p>
      )}
      {contacts.data?.length === 0 && (
        <p className="dealer-overview-empty">
          A sales representative has not been assigned to your company yet.
        </p>
      )}
      {contacts.data?.map((rep) => {
        const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rep.email) ? rep.email : '';
        const phone = /^[+\d\s().-]+$/.test(rep.phone) ? rep.phone.replace(/[^+\d]/g, '') : '';
        const name = rep.name || 'Sales representative';
        return (
          <div className="dealer-sales-rep-contact" key={rep.id}>
            <span className="dealer-sales-rep-avatar" aria-hidden="true">
              {name
                .split(/\s+/)
                .slice(0, 2)
                .map((part) => part[0])
                .join('')
                .toUpperCase()}
            </span>
            <div className="dealer-sales-rep-details">
              <h3>{name}</h3>
              <span>Assigned sales representative</span>
              {email && <a href={`mailto:${email}`}>{email}</a>}
              {phone && <a href={`tel:${phone}`}>{rep.phone}</a>}
              {!email && !phone && <p>Contact details have not been added yet.</p>}
            </div>
            {email && (
              <a className="dealer-overview-action" href={`mailto:${email}`}>
                Email {name}
              </a>
            )}
          </div>
        );
      })}
    </section>
  );
}
