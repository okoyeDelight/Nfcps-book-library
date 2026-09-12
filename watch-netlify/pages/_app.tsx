import type { AppProps } from 'next/app';
import '../styles/frontdoor.css';
import '../styles/watch-cleanup.css';

export default function App({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}
