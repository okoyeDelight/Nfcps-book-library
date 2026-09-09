import Head from 'next/head';
import WatchExperience from '../src/WatchExperience';
import AppInstall from '../src/AppInstall';
export default function WatchPage(){return <><Head><title>NFCPS WATCH · Watch what builds your faith</title><meta name='description' content='Curated Christian sermons, worship, prayer, discipleship and revival content for NFCPS UNIZIK.'/><meta name='viewport' content='width=device-width, initial-scale=1, viewport-fit=cover'/><meta name='theme-color' content='#05090d'/></Head><AppInstall/><WatchExperience/></>}