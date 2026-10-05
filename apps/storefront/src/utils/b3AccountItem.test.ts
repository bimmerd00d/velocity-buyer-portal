import { CustomerRole } from '@/types';

import { b2bJumpPath } from './b3CheckPermissions/b2bPermissionPath';
import { openPageByClick } from './b3AccountItem';

const options = {
  role: CustomerRole.ADMIN,
  isRegisterAndLogin: true,
  isAgenting: false,
  authorizedPages: '/account-overview',
};

it.each([
  CustomerRole.ADMIN,
  CustomerRole.SENIOR_BUYER,
  CustomerRole.JUNIOR_BUYER,
  CustomerRole.CUSTOM_ROLE,
])('defaults company buyer role %s to overview', (role) => {
  expect(b2bJumpPath(role)).toBe('/account-overview');
});

it('keeps the sales representative company dashboard as its entry point', () => {
  expect(b2bJumpPath(CustomerRole.SUPER_ADMIN)).toBe('/dashboard');
});

it.each(['/account.php', 'https://dealers.velocity-stack.net/account.php', '/account-overview'])(
  'opens overview for generic account entry %s',
  (href) => {
    expect(openPageByClick({ ...options, href })).toBe('/account-overview');
  },
);

it.each(['/orders', '/invoice', '/quotes', '/shoppingLists', '/account-overview'])(
  'preserves explicit portal destination %s',
  (path) => {
    expect(openPageByClick({ ...options, href: `/account.php#${path}` })).toBe(path);
  },
);

it.each([
  ['/orders', '/orders'],
  ['/account.php?action=order_status', '/orders'],
  ['/account.php?action=address_book', '/addresses'],
  ['/account.php?action=account_details', '/accountSettings'],
  ['/account.php#/invoice?invoiceId=123', '/invoice?invoiceId=123'],
])('preserves direct account action %s', (href, expected) => {
  expect(openPageByClick({ ...options, href })).toBe(expected);
});

it('requires login for guest account entry', () => {
  expect(openPageByClick({ ...options, role: CustomerRole.GUEST, href: '/account.php' })).toBe(
    '/login',
  );
});
