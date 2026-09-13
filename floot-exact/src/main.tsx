import React from 'react';
import { createRoot } from 'react-dom/client';
import ProductShell from '../../appdeploy-live/src/ProductShell';
import WatchExperience from '../../appdeploy-live/src/WatchExperienceV3';
import AppInstall from '../../appdeploy-live/src/AppInstall';
import { LiveChurchLens } from '../../appdeploy-live/src/ScriptureLens';
import { NfcpsAccountProvider } from '../../appdeploy-live/src/AccountSync';

import '../../appdeploy-live/styles/global.css';
import '../../appdeploy-live/styles/circulation.css';
import '../../appdeploy-live/styles/branding.css';
import '../../appdeploy-live/styles/pulse.css';
import '../../appdeploy-live/styles/home-v3.css';
import '../../appdeploy-live/styles/premium-v4.css';
import '../../appdeploy-live/styles/moments.css';
import '../../appdeploy-live/styles/reader.css';
import '../../appdeploy-live/styles/promo.css';
import '../../appdeploy-live/styles/watch.css';
import '../../appdeploy-live/styles/app-shell.css';
import '../../appdeploy-live/styles/product-v5.css';
import '../../appdeploy-live/styles/immersive-v6.css';
import '../../appdeploy-live/styles/living-sanctuary-v2.css';
import '../../appdeploy-live/styles/ui-v2.css';
import '../../appdeploy-live/styles/v45-fixes.css';
import '../../appdeploy-live/styles/concept-v3.css';
import '../../appdeploy-live/styles/watch-shorts-v2.css';
import '../../appdeploy-live/styles/scripture-lens.css';
import '../../appdeploy-live/styles/scripture-lens-auto.css';
import '../../appdeploy-live/styles/account-sync.css';
import '../../appdeploy-live/styles/account-board.css';
import '../../appdeploy-live/styles/books-v49.css';
import '../../appdeploy-live/styles/apple-ui.css';
import '../../appdeploy-live/styles/reader-flip.css';
import '../../appdeploy-live/styles/navigation-safety.css';
import '../../appdeploy-live/styles/spatial-home.css';

function WatchPage() {
  React.useEffect(() => {
    document.title = 'NFCPS WATCH · Watch what builds your faith';
    const theme = document.querySelector('meta[name="theme-color"]');
    theme?.setAttribute('content', '#030605');
  }, []);
  return <><AppInstall/><WatchExperience/><LiveChurchLens/></>;
}

function isWatchPath(pathname: string) {
  const path = pathname.toLowerCase().replace(/\/+$/, '') || '/';
  return path === '/watch' || path.endsWith('/watch') || path.includes('/watch/');
}

function RootApp() {
  const watch = isWatchPath(window.location.pathname);
  React.useEffect(() => {
    if (!watch) {
      document.title = 'NFCPS One · NFCPS UNIZIK';
      const theme = document.querySelector('meta[name="theme-color"]');
      theme?.setAttribute('content', '#04110d');
    }
  }, [watch]);
  return <NfcpsAccountProvider>{watch ? <WatchPage/> : <ProductShell/>}</NfcpsAccountProvider>;
}

const target = document.getElementById('nfcps-exact-root') || document.getElementById('root');
if (!target) throw new Error('NFCPS One root element is missing.');
createRoot(target).render(<RootApp/>);
