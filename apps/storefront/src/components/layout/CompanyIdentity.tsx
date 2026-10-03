import { useState } from 'react';
import { Box, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';

import { useAppSelector } from '@/store';

export function CompanyIdentityCard({
  companyId,
  companyName,
  source = '',
}: {
  companyId: string;
  companyName: string;
  source?: string;
}) {
  const [failedSource, setFailedSource] = useState('');
  if (!companyId) return null;

  return (
    <Box className="dealer-company-identity" aria-label="Current company">
      {source && failedSource !== source ? (
        <img
          src={source}
          alt={`${companyName || 'Company account'} logo`}
          onError={() => setFailedSource(source)}
        />
      ) : (
        <Typography className="dealer-company-name">{companyName || 'Company account'}</Typography>
      )}
      <Typography className="dealer-company-caption">{companyName || 'Company account'}</Typography>
    </Box>
  );
}

export default function CompanyIdentity() {
  const company = useAppSelector(({ company }) => company.companyInfo);
  const { selectCompanyHierarchyId, companyHierarchyList } = useAppSelector(
    ({ company }) => company.companyHierarchyInfo,
  );
  const represented = useAppSelector(({ b2bFeatures }) => b2bFeatures.masqueradeCompany);
  const companyId = String(
    selectCompanyHierarchyId || (represented.isAgenting ? represented.id : company.id) || '',
  );
  const companyName =
    companyHierarchyList.find((item) => String(item.companyId) === companyId)?.companyName ||
    (represented.isAgenting ? represented.companyName : company.companyName) ||
    '';
  const token = useAppSelector(({ company }) => company.tokens.B2BToken);
  const buyerId = useAppSelector(({ company }) => company.customer.id);
  const { data } = useQuery({
    queryKey: ['company-logo', buyerId, companyId],
    enabled: Boolean(token && companyId && buyerId),
    staleTime: 60_000,
    retry: false,
    queryFn: async ({ signal }) => {
      const base = import.meta.env.VITE_ASSETS_ABSOLUTE_PATH || window.location.origin;
      const url = new URL('/api/company-logo', base);
      url.searchParams.set('companyId', companyId);
      const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, signal });
      if (!response.ok) return null;
      const result = await response.json();
      return result.companyId === companyId &&
        typeof result.url === 'string' &&
        result.url.startsWith('https://')
        ? result.url
        : null;
    },
  });
  return (
    <CompanyIdentityCard
      companyId={companyId}
      companyName={companyName}
      source={token ? data || '' : ''}
    />
  );
}
