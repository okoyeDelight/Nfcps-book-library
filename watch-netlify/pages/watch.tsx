import Head from 'next/head';
import WatchFrontDoor from '../src/WatchFrontDoor';
import { LiveChurchLens } from '../../appdeploy-live/src/ScriptureLens';

export default function WatchPage() {
  return <>
    <Head>
      <title>NFCPS WATCH · Watch what builds your faith</title>
      <meta name='description' content='NFCPS Watch — sermons, worship, prayer, discipleship and revival content for NFCPS UNIZIK.' />
      <meta name='viewport' content='width=device-width, initial-scale=1, viewport-fit=cover' />
      <meta name='theme-color' content='#030605' />
    </Head>
    <WatchFrontDoor />
    <LiveChurchLens />
  </>;
}
