import type { AppProps } from 'next/app';
import '../styles/appdeploy/global.css';
import '../styles/appdeploy/circulation.css';
import '../styles/appdeploy/branding.css';
import '../styles/appdeploy/pulse.css';
import '../styles/appdeploy/home-v3.css';
import '../styles/appdeploy/premium-v4.css';
import '../styles/appdeploy/moments.css';
import '../styles/appdeploy/reader.css';
import '../styles/appdeploy/promo.css';
import '../styles/appdeploy/watch.css';
import '../styles/appdeploy/app-shell.css';
import '../styles/appdeploy/product-v5.css';
import '../styles/appdeploy/immersive-v6.css';
import '../styles/appdeploy/living-sanctuary-v2.css';
import '../styles/appdeploy/ui-v2.css';
import '../styles/appdeploy/v45-fixes.css';
import '../styles/appdeploy/concept-v3.css';
import '../styles/appdeploy/watch-shorts-v2.css';
import '../styles/appdeploy/scripture-lens.css';
import '../styles/appdeploy/scripture-lens-auto.css';
import '../styles/appdeploy/account-sync.css';
import '../styles/appdeploy/account-board.css';
import '../styles/appdeploy/books-v49.css';
import '../styles/appdeploy/apple-ui.css';
import '../styles/appdeploy/reader-flip.css';
import '../styles/appdeploy/navigation-safety.css';
import '../styles/appdeploy/spatial-home.css';
import { NfcpsAccountProvider } from '../../appdeploy-live/src/AccountSync';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <NfcpsAccountProvider>
      <Component {...pageProps} />
    </NfcpsAccountProvider>
  );
}
