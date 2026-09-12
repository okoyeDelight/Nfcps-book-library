import type { AppProps } from 'next/app';
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
import { NfcpsAccountProvider } from '../../appdeploy-live/src/AccountSync';

export default function App({ Component, pageProps }: AppProps) {
  return <NfcpsAccountProvider><Component {...pageProps} /></NfcpsAccountProvider>;
}
