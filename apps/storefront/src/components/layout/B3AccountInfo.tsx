import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ExpandMore } from '@mui/icons-material';
import { Box, Button, Menu, MenuItem } from '@mui/material';

import { useB3Lang } from '@/lib/lang';
import { useAppSelector } from '@/store';
import { disableLogoutButton } from '@/utils/basicConfig';

interface B3AccountInfoProps {
  closeSidebar?: (x: boolean) => void;
}

export default function B3AccountInfo({ closeSidebar }: B3AccountInfoProps) {
  const firstName = useAppSelector(({ company }) => company.customer.firstName);
  const lastName = useAppSelector(({ company }) => company.customer.lastName);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const navigate = useNavigate();
  const b3Lang = useB3Lang();
  const name = [firstName, lastName].filter(Boolean).join(' ') || 'Your account';
  const initials =
    [firstName, lastName]
      .filter(Boolean)
      .map((part) => Array.from(part.trim())[0] || '')
      .join('')
      .toLocaleUpperCase() || 'V';

  const identity = (
    <>
      <span className="dealer-user-initials" aria-hidden="true">
        {initials}
      </span>
      <span className="dealer-user-label">
        <span>{name}</span>
        <small>Your account</small>
      </span>
    </>
  );

  return (
    <Box className="dealer-account-user">
      {disableLogoutButton ? (
        <Box className="dealer-user-trigger">{identity}</Box>
      ) : (
        <Button
          className="dealer-user-trigger"
          aria-label={`${name}, account menu`}
          aria-haspopup="menu"
          aria-expanded={Boolean(anchor)}
          aria-controls={anchor ? 'dealer-user-menu' : undefined}
          onClick={(event) => setAnchor(event.currentTarget)}
          endIcon={<ExpandMore />}
        >
          {identity}
        </Button>
      )}
      <Menu
        id="dealer-user-menu"
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
      >
        <MenuItem
          onClick={() => {
            setAnchor(null);
            navigate('/login?loginFlag=loggedOutLogin');
            closeSidebar?.(false);
          }}
        >
          {b3Lang('global.button.logout')}
        </MenuItem>
      </Menu>
    </Box>
  );
}
