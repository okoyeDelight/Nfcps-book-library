'use client';

import { useEffect, useState } from 'react';

const LAUNCH_KEY = 'nfcps-launch-seen-v3';

export default function LaunchExperience() {
    const [visible, setVisible] = useState(false);
    const [leaving, setLeaving] = useState(false);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        try {
            if (sessionStorage.getItem(LAUNCH_KEY) === '1') return;
            sessionStorage.setItem(LAUNCH_KEY, '1');
        } catch {
            // Continue even when storage is unavailable.
        }

        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        document.documentElement.classList.add('nfcps-launching');
        setVisible(true);

        const exitTimer = window.setTimeout(
            () => setLeaving(true),
            reducedMotion ? 120 : 1120,
        );
        const hideTimer = window.setTimeout(
            () => {
                setVisible(false);
                document.documentElement.classList.remove('nfcps-launching');
            },
            reducedMotion ? 260 : 1540,
        );

        return () => {
            window.clearTimeout(exitTimer);
            window.clearTimeout(hideTimer);
            document.documentElement.classList.remove('nfcps-launching');
        };
    }, []);

    if (!visible) return null;

    return (
        <div
            className={leaving ? 'nfcps-launch is-leaving' : 'nfcps-launch'}
            aria-hidden='true'
        >
            <div className='nfcps-launch-stage'>
                <div className='nfcps-launch-mark-shell'>
                    <img src='/resources/nfcps-logo.png' alt='' />
                </div>
                <div className='nfcps-launch-copy'>
                    <strong>NFCPS One</strong>
                    <span>Christ, the Therapy for All.</span>
                </div>
            </div>
        </div>
    );
}
