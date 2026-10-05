import { ReactNode, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import CompanyIdentity from '@/components/layout/CompanyIdentity';
import { isB2BUserSelector, useAppSelector } from '@/store';
import { b2bPermissionsMap } from '@/utils/b3CheckPermissions/config';

import styles from './styles.css?raw';

export function DealerWelcomeMount({
  enabled,
  name,
  identity,
  canViewInvoices = false,
  onViewInvoices,
}: {
  enabled: boolean;
  name: string;
  identity: ReactNode;
  canViewInvoices?: boolean;
  onViewInvoices?: () => void;
}) {
  const [target, setTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!enabled) return undefined;
    // Enhance the signed-in Stencil workspace only. Guest/catalog pages have no target.
    const welcome = document.querySelector<HTMLElement>('.dealer-home .workspace .welcome');
    if (!welcome) return undefined;
    const originals = Array.from(welcome.children).filter(
      (child): child is HTMLElement => child instanceof HTMLElement,
    );
    const visibility = originals.map((child) => child.hidden);
    const mount = document.createElement('div');
    mount.className = 'dealer-storefront-welcome';
    originals.forEach((child) => {
      child.hidden = true;
    });
    welcome.appendChild(mount);
    setTarget(mount);
    return () => {
      mount.remove();
      originals.forEach((child, index) => {
        child.hidden = visibility[index];
      });
      setTarget(null);
    };
  }, [enabled]);

  if (!enabled || !target) return null;
  const initials = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join('');

  return createPortal(
    <>
      <style>{styles}</style>
      <section className="dealer-welcome-panel" aria-label="Your dealer workspace">
        <div className="dealer-welcome-logo">{identity}</div>
        <div className="dealer-welcome-copy">
          <p className="dealer-welcome-label">Your dealer workspace</p>
          <h1>Welcome back{name ? `, ${name}` : ''}.</h1>
          <p className="dealer-welcome-description">Keep the parts, people and paperwork moving.</p>
          <div className="dealer-welcome-bottom">
            <span className="dealer-welcome-user">
              <span className="dealer-welcome-initials" aria-hidden="true">
                {initials || 'V'}
              </span>
              <span>
                Signed in as <strong>{name || 'a company buyer'}</strong>
              </span>
            </span>
            {canViewInvoices && onViewInvoices && (
              <button type="button" onClick={onViewInvoices} className="dealer-welcome-invoices">
                View invoices
              </button>
            )}
          </div>
        </div>
      </section>
    </>,
    target,
  );
}

export default function DealerStorefrontWelcome({
  ready,
  onViewInvoices,
}: {
  ready: boolean;
  onViewInvoices: () => void;
}) {
  const customer = useAppSelector(({ company }) => company.customer);
  const token = useAppSelector(({ company }) => company.tokens.B2BToken);
  const isB2BUser = useAppSelector(isB2BUserSelector);
  const canViewInvoices = useAppSelector(({ company }) =>
    company.permissions.some(
      ({ code, permissionLevel }) =>
        code === b2bPermissionsMap.getInvoicesPermission && Number(permissionLevel) > 0,
    ),
  );
  const name = [customer.firstName, customer.lastName].filter(Boolean).join(' ');
  return (
    <DealerWelcomeMount
      enabled={Boolean(ready && isB2BUser && customer.id && token)}
      name={name}
      identity={<CompanyIdentity />}
      canViewInvoices={canViewInvoices}
      onViewInvoices={onViewInvoices}
    />
  );
}
