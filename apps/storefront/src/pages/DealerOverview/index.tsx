import { useContext } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { GlobalContext } from '@/shared/global';
import { getAllowedRoutesWithoutComponent } from '@/shared/routeList';
import { getB2BAllOrders, getB2BQuotesList } from '@/shared/service/b2b';
import { CustomerOrderNode } from '@/shared/service/b2b/graphql/orders';
import { useAppSelector } from '@/store';

import CompanyCreditSummary from '../Invoice/CompanyCreditSummary';

import SalesRepresentative from './SalesRepresentative';

interface RecentOrders {
  totalCount: number;
  edges: CustomerOrderNode[];
}

export default function DealerOverview() {
  const { state } = useContext(GlobalContext);
  const token = useAppSelector(({ company }) => company.tokens.B2BToken);
  const customer = useAppSelector(({ company }) => company.customer);
  const company = useAppSelector(({ company: account }) => account.companyInfo);
  const permissions = useAppSelector(({ company: account }) => account.permissions);
  const represented = useAppSelector(({ b2bFeatures }) => b2bFeatures.masqueradeCompany);
  const allowed = getAllowedRoutesWithoutComponent(state).map(({ path }) => path);
  const canOrders = allowed.includes('/orders');
  const canQuotes = allowed.includes('/quotes');
  const companyId = represented.isAgenting ? represented.id : company.id;
  const companyName = represented.isAgenting ? represented.companyName : company.companyName;
  const scope = [customer.id, companyId, represented.isAgenting, permissions];
  const orders = useQuery<RecentOrders>({
    queryKey: ['dealer-overview-orders', ...scope],
    queryFn: () =>
      getB2BAllOrders({
        first: 3,
        offset: 0,
        orderBy: '-createdAt',
        isShowMy: 1,
        companyIds: [Number(companyId)],
      }),
    enabled: canOrders && Boolean(companyId),
    staleTime: 0,
    gcTime: 0,
    retry: false,
  });
  const quotes = useQuery<{ totalCount: number }>({
    queryKey: ['dealer-overview-quotes', ...scope],
    queryFn: () => getB2BQuotesList({ first: 1, offset: 0, orderBy: '-createdAt', status: 1 }),
    enabled: canQuotes && Boolean(companyId),
    staleTime: 0,
    gcTime: 0,
    retry: false,
  });

  return (
    <div className="dealer-overview">
      <p className="dealer-overview-intro">
        Welcome, {customer.firstName || 'buyer'}. Here’s what’s happening at{' '}
        {companyName || 'your company'}.
      </p>
      <section className="dealer-overview-banner">
        <div>
          <h2>Keep the next job moving.</h2>
          <p>Your purchasing activity, company credit, and dealer tools in one place.</p>
        </div>
        {allowed.includes('/shoppingLists') && (
          <Link className="dealer-overview-action light" to="/shoppingLists">
            Open shopping lists
          </Link>
        )}
      </section>
      <div className="dealer-overview-metrics">
        {canOrders && (
          <Link className="dealer-overview-metric" to="/orders">
            <span>Your orders</span>
            <strong>{orders.isError ? 'Unavailable' : (orders.data?.totalCount ?? '—')}</strong>
            <small>View your purchasing history</small>
          </Link>
        )}
        {canQuotes && (
          <Link className="dealer-overview-metric" to="/quotes">
            <span>Open quotes</span>
            <strong>{quotes.isError ? 'Unavailable' : (quotes.data?.totalCount ?? '—')}</strong>
            <small>Review your available proposals</small>
          </Link>
        )}
      </div>
      {allowed.includes('/invoice') && <CompanyCreditSummary />}
      {canOrders && (
        <section className="dealer-overview-surface">
          <div className="dealer-overview-heading">
            <h2>Recent orders</h2>
            <Link to="/orders">View orders</Link>
          </div>
          {orders.isPending && (
            <p className="dealer-overview-empty" role="status">
              Loading your orders…
            </p>
          )}
          {orders.isError && (
            <p className="dealer-overview-empty" role="status">
              Orders are temporarily unavailable.{' '}
              <button type="button" onClick={() => orders.refetch()}>
                Try again
              </button>
            </p>
          )}
          {orders.data?.edges.length === 0 && (
            <p className="dealer-overview-empty">
              Your purchases will appear here when an order is placed.
            </p>
          )}
          {orders.data?.edges.map(({ node: order }) => (
            <div className="dealer-overview-order" key={order.orderId}>
              <div>
                <Link to={`/orderDetail/${order.orderId}`}>Order {order.orderId}</Link>
                <p>{order.poNumber || order.referenceNumber || 'No purchase reference'}</p>
                <span className="dealer-overview-tag">{order.customStatus || order.status}</span>
              </div>
              <div className="dealer-overview-total">
                {order.totalIncTax !== undefined && order.currencyCode
                  ? new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: order.currencyCode,
                    }).format(order.totalIncTax)
                  : '—'}
                <small>
                  {new Date(order.createdAt * 1000).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </small>
              </div>
            </div>
          ))}
        </section>
      )}
      <SalesRepresentative companyId={String(companyId || '')} token={token} />
      <section className="dealer-overview-resources">
        <div>
          <h2>Ready for the next installation?</h2>
          <p>Job checklists, buyer training, and brand assets for your team.</p>
        </div>
        <Link className="dealer-overview-action" to="/dealer-resources">
          Explore dealer resources
        </Link>
      </section>
    </div>
  );
}
