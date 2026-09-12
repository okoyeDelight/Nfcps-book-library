import Head from 'next/head';
import ProductShell from '../../appdeploy-live/src/ProductShell';

export default function Home() {
  return (
    <>
      <Head>
        <title>NFCPS One · NFCPS UNIZIK</title>
        <meta name='description' content='NFCPS One — read, watch, borrow and grow with NFCPS UNIZIK.' />
        <meta name='viewport' content='width=device-width, initial-scale=1, viewport-fit=cover' />
        <meta name='theme-color' content='#04110d' />
      </Head>
      <ProductShell />
    </>
  );
}
