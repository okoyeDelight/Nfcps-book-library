'use client';

import ReadV3 from './ReadV3';
import GrowthDiscovery from './GrowthDiscovery';
import type { ReaderBook } from './ReaderExperience';

type ReaderRecord = { book: ReaderBook; progress: number; lastOpened: number };

export default function ReadV4({ current, onSettings }: { current: ReaderRecord | null; onSettings: () => void }) {
    return (
        <>
            <ReadV3 current={current} onSettings={onSettings} />
            <GrowthDiscovery />
        </>
    );
}
