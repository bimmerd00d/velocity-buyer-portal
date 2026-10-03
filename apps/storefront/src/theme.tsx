import { ReactNode, useContext } from 'react';
import * as materialMultiLanguages from '@mui/material/locale';
import { createTheme, ThemeProvider } from '@mui/material/styles';

import { CustomStyleContext } from './shared/customStyleButton';
import { BROWSER_LANG } from './constants';

type LangMapType = {
  [index: string]: string;
};

const MUI_LANG_MAP: LangMapType = {
  en: 'enUS',
  zh: 'zhCN',
  fr: 'frFR',
  nl: 'nlNL',
  de: 'deDE',
  it: 'itIT',
  es: 'esES',
};

type MaterialMultiLanguagesType = {
  [K: string]: materialMultiLanguages.Localization;
};

type Props = {
  children?: ReactNode;
};

function B3ThemeProvider({ children }: Props) {
  const {
    state: {
      portalStyle: { backgroundColor = '', primaryColor = '' },
    },
  } = useContext(CustomStyleContext);

  const theme = (lang: string) =>
    createTheme(
      {
        shape: { borderRadius: 6 },
        typography: {
          fontFamily: '"Barlow", "Arial", sans-serif',
          button: { fontWeight: 700, textTransform: 'none' },
        },
        palette: {
          background: {
            default: backgroundColor || '#F3F5F5',
          },
          primary: {
            main: primaryColor || '#176573',
          },
        },
      },
      (materialMultiLanguages as MaterialMultiLanguagesType)[MUI_LANG_MAP[lang] || 'enUS'],
    );

  return <ThemeProvider theme={theme(BROWSER_LANG)}>{children}</ThemeProvider>;
}

export default B3ThemeProvider;
