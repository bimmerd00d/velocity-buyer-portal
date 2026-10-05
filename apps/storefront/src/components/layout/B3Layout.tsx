import { ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Box } from '@mui/material';

import { useMobile } from '@/hooks/useMobile';
import { useB3Lang } from '@/lib/lang';
import { DynamicallyVariableContext } from '@/shared/dynamicallyVariable';
import { getIsTokenGotoPage, routes } from '@/shared/routes';
import { useAppSelector } from '@/store';

import B3Dialog from '../B3Dialog';
import CompanyCredit from '../CompanyCredit';

import B3CloseAppButton from './B3CloseAppButton';
import B3DemoNotice from './B3DemoNotice';
import B3Logo from './B3Logo';
import B3MainHeader from './B3MainHeader';
import B3MobileLayout from './B3MobileLayout';
import B3Nav from './B3Nav';
import CompanyIdentity from './CompanyIdentity';

const SPECIAL_PATH_TEXTS = {
  '/purchased-products': 'global.purchasedProducts.title',
  '/orders': 'global.orders.title',
  '/company-orders': 'global.companyOrders.title',
} as const;

export default function B3Layout({ children }: { children: ReactNode }) {
  const [isMobile] = useMobile();

  const location = useLocation();

  const [title, setTitle] = useState<string>('');

  const b3Lang = useB3Lang();

  const emailAddress = useAppSelector(({ company }) => company.customer.emailAddress);
  const customerId = useAppSelector(({ company }) => company.customer.id);

  const {
    state: { globalMessageDialog },
    dispatch,
  } = useContext(DynamicallyVariableContext);

  const navigate = useNavigate();

  useEffect(() => {
    if ((!emailAddress || !customerId) && !getIsTokenGotoPage(location.pathname)) {
      navigate('/login');
    }
  }, [emailAddress, customerId, location, navigate]);

  useEffect(() => {
    const itemsRoutes = routes.find((item) => item.path === location.pathname);
    if (itemsRoutes && location.pathname !== '/quoteDraft') {
      const foundPath = Object.entries(SPECIAL_PATH_TEXTS).find(
        ([specialPath]) => specialPath === location.pathname,
      );
      if (foundPath) {
        setTitle(b3Lang(foundPath[1]));
      } else {
        setTitle(itemsRoutes.pageTitle || b3Lang(itemsRoutes.idLang));
      }
    } else {
      setTitle('');
    }
    dispatch({
      type: 'common',
      payload: {
        tipMessage: {
          msgs: [],
        },
      },
    });
    // disabling as dispatch is not necessary in the deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location]);

  const messageDialogClose = () => {
    dispatch({
      type: 'common',
      payload: {
        globalMessageDialog: {
          open: false,
          title: '',
          message: '',
          cancelText: 'Cancel',
        },
      },
    });
  };

  const overflowStyle = useMemo(() => {
    const overflowXHiddenPage = ['/invoice', '/quotes', '/company-orders', '/orders'];
    if (overflowXHiddenPage.includes(location.pathname)) {
      return {
        overflowX: 'hidden',
      };
    }

    return {};
  }, [location]);

  return (
    <Box>
      {isMobile ? (
        <B3MobileLayout title={title}>{children}</B3MobileLayout>
      ) : (
        <Box id="app-mainPage-layout" className="dealer-account">
          <Box component="header" className="dealer-account-header">
            <Box className="dealer-account-masthead">
              <B3Logo />
              <Box className="dealer-account-tools">
                <B3MainHeader title="" />
              </Box>
              <B3CloseAppButton />
            </Box>
          </Box>
          <Box className="dealer-account-body">
            <Box component="aside" className="dealer-account-sidebar" sx={{ displayPrint: 'none' }}>
              <Box component="p" className="dealer-account-eyebrow">
                Dealer workspace
              </Box>
              <CompanyIdentity />
              <B3Nav />
            </Box>
            <Box className="dealer-account-content" sx={{ ...overflowStyle }}>
              {title && (
                <Box component="h1" className="dealer-account-title">
                  {title}
                </Box>
              )}
              <CompanyCredit />
              <Box component="main">{children}</Box>
            </Box>
          </Box>
          <B3DemoNotice />
        </Box>
      )}

      <B3Dialog
        isOpen={globalMessageDialog.open}
        title={globalMessageDialog.title}
        leftSizeBtn={globalMessageDialog.cancelText}
        rightSizeBtn={globalMessageDialog.saveText}
        handleLeftClick={globalMessageDialog.cancelFn || messageDialogClose}
        handRightClick={globalMessageDialog.saveFn}
        showRightBtn={!!globalMessageDialog.saveText}
      >
        <Box
          sx={{
            display: 'flex',
            justifyContent: isMobile ? 'center' : 'start',
            width: isMobile ? '100%' : '450px',
            height: '100%',
          }}
        >
          {globalMessageDialog.message}
        </Box>
      </B3Dialog>
    </Box>
  );
}
