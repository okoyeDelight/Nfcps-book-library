import type { AppProps } from 'next/app';
import '../styles/global.css';
import '../styles/circulation.css';
import '../styles/branding.css';
import '../styles/pulse.css';
import '../styles/home-v3.css';
import '../styles/premium-v4.css';
import '../styles/moments.css';
import '../styles/reader.css';
import '../styles/promo.css';
import '../styles/watch.css';
import '../styles/app-shell.css';
import '../styles/product-v5.css';
import '../styles/immersive-v6.css';
import '../styles/living-sanctuary-v2.css';
import '../styles/ui-v2.css';
import '../styles/v45-fixes.css';
import '../styles/concept-v3.css';
import '../styles/account-sync.css';
import '../styles/account-board.css';
import '../styles/books-v49.css';
import '../styles/apple-ui.css';
import {NfcpsAccountProvider} from '../src/AccountSync';

export default function App({ Component, pageProps }: AppProps) {
    return <NfcpsAccountProvider><Component {...pageProps} /></NfcpsAccountProvider>;
}
