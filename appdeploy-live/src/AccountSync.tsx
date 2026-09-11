'use client';

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
    type FormEvent,
    type ReactNode,
} from 'react';
import { Eye, EyeOff, LoaderCircle, LockKeyhole, Mail, ShieldCheck, UserRound, X } from 'lucide-react';
import { api } from '@appdeploy/client';

type AnyObj = Record<string, any>;
type AccountUser = { userId: string; email?: string; name?: string; picture?: string; scope: string };
type SyncState = 'local' | 'syncing' | 'synced' | 'offline' | 'error';
type MemberSnapshot = {
    v: 1;
    profile: { name: string; phone: string };
    reader: AnyObj;
    watch: AnyObj;
    moments: AnyObj;
    circulation: Record<string, string>;
};

type AccountContextValue = {
    user: AccountUser | null;
    signedIn: boolean;
    displayName: string;
    firstName: string;
    initials: string;
    picture?: string;
    status: SyncState;
    lastSyncedAt: string | null;
    notice: string;
    signIn: () => Promise<void>;
    signOut: () => Promise<void>;
    syncNow: (force?: boolean) => Promise<void>;
};

const AccountContext = createContext<AccountContextValue | null>(null);
const CACHE = 'nfcps-account-cache-v2';
const SESSION = 'nfcps-account-session-v1';

const asObj = (value: any): AnyObj => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
const readJson = (key: string, fallback: any) => {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
    } catch {
        return fallback;
    }
};
const cap = (value: any, limit: number) => String(value ?? '').slice(0, limit);
const unionStrings = (a: any, b: any, limit = 400) => Array.from(new Set([
    ...(Array.isArray(a) ? a : []),
    ...(Array.isArray(b) ? b : []),
].map(String))).slice(0, limit);
const unionNums = (a: any, b: any) => Array.from(new Set([
    ...(Array.isArray(a) ? a : []),
    ...(Array.isArray(b) ? b : []),
].map(Number).filter(Number.isFinite))).sort((x, y) => x - y);
const unionObjects = (a: any, b: any, key: string, limit = 160) => {
    const out: any[] = [];
    const seen = new Set<string>();
    for (const item of [...(Array.isArray(a) ? a : []), ...(Array.isArray(b) ? b : [])]) {
        if (!item || typeof item !== 'object') continue;
        const id = String(item[key] ?? '');
        if (!id || seen.has(id)) continue;
        seen.add(id);
        out.push(item);
        if (out.length >= limit) break;
    }
    return out;
};
const pruneMap = (value: any, limit = 120, stringLimit = 1200) => Object.fromEntries(
    Object.entries(asObj(value)).slice(0, limit).map(([key, item]) => [key, typeof item === 'string' ? item.slice(0, stringLimit) : item]),
);
const pruneReader = (value: any) => {
    const items = asObj(asObj(value).items);
    return {
        items: Object.fromEntries(Object.entries(items).slice(0, 80).map(([key, raw]) => {
            const item = asObj(raw);
            return [key, {
                ...item,
                annotations: (Array.isArray(item.annotations) ? item.annotations : []).slice(0, 160),
            }];
        })),
    };
};

const captureSnapshot = (): MemberSnapshot => {
    const circulation: Record<string, string> = {};
    for (let i = 0; i < localStorage.length; i += 1) {
        const key = localStorage.key(i);
        if (!key || !/^nfcps-(loan|wait)-/.test(key)) continue;
        const value = localStorage.getItem(key);
        if (value && Object.keys(circulation).length < 40) circulation[key] = value;
    }
    return {
        v: 1,
        profile: {
            name: cap(localStorage.getItem('nfcps-profile-name') || localStorage.getItem('nfcps-watch-name') || '', 100),
            phone: cap(localStorage.getItem('nfcps-profile-phone') || '', 30),
        },
        reader: pruneReader(readJson('nfcps-reader-v3', readJson('nfcps-reader-v2', { items: {} }))),
        watch: {
            history: (readJson('nfcps-watch-history', []) || []).slice(0, 120),
            later: (readJson('nfcps-watch-later', []) || []).slice(0, 120),
            liked: (readJson('nfcps-watch-liked', []) || []).slice(0, 300),
            subscribed: (readJson('nfcps-watch-subscribed', []) || []).slice(0, 120),
            goals: (readJson('nfcps-watch-goals', []) || []).slice(0, 8),
            notes: pruneMap(readJson('nfcps-watch-notes', {})),
            responses: pruneMap(readJson('nfcps-watch-responses', {}), 120, 500),
            journeys: pruneMap(readJson('nfcps-watch-journeys', {}), 40, 100),
            growthDays: (readJson('nfcps-watch-growth-days', []) || []).slice(0, 400),
            takeaways: (readJson('nfcps-watch-takeaways', []) || []).slice(0, 100),
            progress: pruneMap(readJson('nfcps-watch-progress', {}), 120, 200),
            growthMemory: asObj(readJson('nfcps-watch-growth-memory', {})),
            scriptureSaves: (readJson('nfcps-watch-scripture-saves', []) || []).slice(0, 100),
        },
        moments: asObj(readJson('nfcps-moments-settings', {})),
        circulation,
    };
};

const mergeReader = (local: any, remote: any) => {
    const localItems = asObj(asObj(local).items);
    const remoteItems = asObj(asObj(remote).items);
    const items: AnyObj = {};
    for (const key of new Set([...Object.keys(localItems), ...Object.keys(remoteItems)])) {
        const left = asObj(localItems[key]);
        const right = asObj(remoteItems[key]);
        if (!Object.keys(left).length) {
            items[key] = { ...right, offline: false };
            continue;
        }
        if (!Object.keys(right).length) {
            items[key] = left;
            continue;
        }
        const newer = Number(left.lastOpened || 0) >= Number(right.lastOpened || 0) ? left : right;
        const older = newer === left ? right : left;
        items[key] = {
            ...older,
            ...newer,
            lastOpened: Math.max(Number(left.lastOpened || 0), Number(right.lastOpened || 0)),
            saved: Boolean(left.saved || right.saved),
            bookmarks: unionNums(left.bookmarks, right.bookmarks),
            annotations: unionObjects(left.annotations, right.annotations, 'id', 160),
            offline: Boolean(left.offline),
        };
    }
    return { items };
};

const maxMap = (a: any, b: any) => {
    const out: AnyObj = { ...asObj(b) };
    for (const [key, value] of Object.entries(asObj(a))) {
        const next = Number(value);
        const current = Number(out[key]);
        out[key] = Number.isFinite(next) && Number.isFinite(current) ? Math.max(next, current) : value;
    }
    return out;
};

const mergeGrowthMemory = (a: any, b: any) => {
    const left = asObj(a);
    const right = asObj(b);
    return {
        videos: unionStrings(left.videos, right.videos, 120),
        themes: maxMap(left.themes, right.themes),
        categories: maxMap(left.categories, right.categories),
        scriptures: maxMap(left.scriptures, right.scriptures),
        updatedAt: String(left.updatedAt || right.updatedAt || ''),
    };
};

const mergeSnapshots = (local: MemberSnapshot, remoteRaw: any): MemberSnapshot => {
    const remote = asObj(remoteRaw) as Partial<MemberSnapshot>;
    const localWatch = asObj(local.watch);
    const remoteWatch = asObj(remote.watch);
    const localMoments = asObj(local.moments);
    const remoteMoments = asObj(remote.moments);
    return {
        v: 1,
        profile: {
            name: local.profile.name || cap(asObj(remote.profile).name, 100),
            phone: local.profile.phone || cap(asObj(remote.profile).phone, 30),
        },
        reader: mergeReader(local.reader, remote.reader),
        watch: {
            history: unionObjects(localWatch.history, remoteWatch.history, 'id', 120),
            later: unionObjects(localWatch.later, remoteWatch.later, 'id', 120),
            liked: unionStrings(localWatch.liked, remoteWatch.liked, 300),
            subscribed: unionStrings(localWatch.subscribed, remoteWatch.subscribed, 120),
            goals: unionStrings(localWatch.goals, remoteWatch.goals, 8),
            notes: { ...asObj(remoteWatch.notes), ...asObj(localWatch.notes) },
            responses: { ...asObj(remoteWatch.responses), ...asObj(localWatch.responses) },
            journeys: maxMap(localWatch.journeys, remoteWatch.journeys),
            growthDays: unionStrings(localWatch.growthDays, remoteWatch.growthDays, 400),
            takeaways: unionObjects(localWatch.takeaways, remoteWatch.takeaways, 'videoId', 100),
            progress: { ...asObj(remoteWatch.progress), ...asObj(localWatch.progress) },
            growthMemory: mergeGrowthMemory(localWatch.growthMemory, remoteWatch.growthMemory),
            scriptureSaves: unionObjects(localWatch.scriptureSaves, remoteWatch.scriptureSaves, 'reference', 100),
        },
        moments: Object.keys(localMoments).length ? localMoments : remoteMoments,
        circulation: { ...asObj(remote.circulation), ...local.circulation },
    };
};

const applySnapshot = (snapshot: MemberSnapshot) => {
    if (snapshot.profile.name) {
        localStorage.setItem('nfcps-profile-name', snapshot.profile.name);
        localStorage.setItem('nfcps-watch-name', snapshot.profile.name);
    }
    if (snapshot.profile.phone) localStorage.setItem('nfcps-profile-phone', snapshot.profile.phone);
    if (snapshot.reader && Object.keys(asObj(snapshot.reader.items)).length) {
        localStorage.setItem('nfcps-reader-v3', JSON.stringify(snapshot.reader));
    }
    const watch = asObj(snapshot.watch);
    const pairs: [string, any][] = [
        ['nfcps-watch-history', watch.history || []],
        ['nfcps-watch-later', watch.later || []],
        ['nfcps-watch-liked', watch.liked || []],
        ['nfcps-watch-subscribed', watch.subscribed || []],
        ['nfcps-watch-goals', watch.goals || []],
        ['nfcps-watch-notes', watch.notes || {}],
        ['nfcps-watch-responses', watch.responses || {}],
        ['nfcps-watch-journeys', watch.journeys || {}],
        ['nfcps-watch-growth-days', watch.growthDays || []],
        ['nfcps-watch-takeaways', watch.takeaways || []],
        ['nfcps-watch-progress', watch.progress || {}],
        ['nfcps-watch-growth-memory', watch.growthMemory || {}],
        ['nfcps-watch-scripture-saves', watch.scriptureSaves || []],
    ];
    for (const [key, value] of pairs) localStorage.setItem(key, JSON.stringify(value));
    if (snapshot.moments && Object.keys(snapshot.moments).length) {
        localStorage.setItem('nfcps-moments-settings', JSON.stringify(snapshot.moments));
    }
    for (const [key, value] of Object.entries(snapshot.circulation || {})) {
        if (/^nfcps-(loan|wait)-/.test(key) && value) localStorage.setItem(key, String(value));
    }
    window.dispatchEvent(new Event('nfcps-reader-updated'));
    window.dispatchEvent(new Event('nfcps-circulation-updated'));
    window.dispatchEvent(new Event('nfcps-cloud-applied'));
};

const cleanUser = (value: any): AccountUser => ({
    userId: String(value.userId),
    email: value.email ? String(value.email) : undefined,
    name: value.name ? String(value.name) : undefined,
    picture: value.picture ? String(value.picture) : undefined,
    scope: String(value.scope || 'nfcps_account'),
});
const first = (name: string) => name.trim().replace(/,/g, ' ').split(/\s+/).filter(Boolean)[0] || '';
const initialsFor = (name: string) => name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map(item => item[0]).join('').toUpperCase() || 'N';
const sessionToken = () => {
    try {
        return localStorage.getItem(SESSION) || '';
    } catch {
        return '';
    }
};
const messageFrom = (cause: unknown) => cause instanceof Error ? cause.message : 'Could not complete that request.';

export function NfcpsAccountProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AccountUser | null>(null);
    const [profileName, setProfileName] = useState('');
    const [status, setStatus] = useState<SyncState>('local');
    const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
    const [notice, setNotice] = useState('');
    const [boardOpen, setBoardOpen] = useState(false);
    const [mode, setMode] = useState<'signin' | 'create'>('signin');
    const [formName, setFormName] = useState('');
    const [formEmail, setFormEmail] = useState('');
    const [formPassword, setFormPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [accountBusy, setAccountBusy] = useState(false);
    const [accountError, setAccountError] = useState('');
    const inFlight = useRef(false);
    const lastFingerprint = useRef('');
    const timer = useRef<number | undefined>(undefined);

    useEffect(() => {
        if (!boardOpen || typeof document === 'undefined') return;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && !accountBusy) setBoardOpen(false);
        };
        window.addEventListener('keydown', onKeyDown);
        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener('keydown', onKeyDown);
        };
    }, [boardOpen, accountBusy]);

    const syncNow = useCallback(async (force = true) => {
        if (typeof window === 'undefined') return;
        const token = sessionToken();
        if (!token) {
            setStatus('local');
            return;
        }
        if (!navigator.onLine) {
            setStatus('offline');
            return;
        }
        if (inFlight.current) return;
        const local = captureSnapshot();
        const fingerprint = JSON.stringify(local);
        if (!force && fingerprint === lastFingerprint.current) return;
        inFlight.current = true;
        setStatus('syncing');
        try {
            const remote = await api.post('/api/member-sync/get', { sessionToken: token });
            const merged = mergeSnapshots(local, remote.data?.snapshot);
            applySnapshot(merged);
            const clean = captureSnapshot();
            const saved = await api.post('/api/member-sync/save', { sessionToken: token, snapshot: clean });
            lastFingerprint.current = JSON.stringify(clean);
            setProfileName(clean.profile.name || '');
            setLastSyncedAt(String(saved.data?.updatedAt || new Date().toISOString()));
            setStatus('synced');
            setNotice('');
        } catch (cause) {
            setStatus(navigator.onLine ? 'error' : 'offline');
            setNotice(navigator.onLine ? 'Sync paused. Your device copy is safe.' : 'Offline. Changes will sync when you reconnect.');
        } finally {
            inFlight.current = false;
        }
    }, []);

    const signIn = useCallback(async () => {
        setNotice('');
        setAccountError('');
        setMode('signin');
        const cached = readJson(CACHE, null);
        setFormEmail(cached?.email || '');
        setFormPassword('');
        setBoardOpen(true);
    }, []);

    const signOut = useCallback(async () => {
        const token = sessionToken();
        try {
            await syncNow(true);
        } catch {
            // Keep sign-out available if syncing is temporarily unavailable.
        }
        if (token) {
            try {
                await api.post('/api/nfcps-account/sign-out', { sessionToken: token });
            } catch {
                // Local sign-out still completes.
            }
        }
        localStorage.removeItem(SESSION);
        localStorage.removeItem(CACHE);
        setUser(null);
        setStatus('local');
        setLastSyncedAt(null);
        setNotice('Signed out. Your offline copy stays on this device.');
        window.dispatchEvent(new Event('nfcps-account-changed'));
    }, [syncNow]);

    const submitAccount = async (event: FormEvent) => {
        event.preventDefault();
        const name = formName.trim();
        const email = formEmail.trim().toLowerCase();
        const password = formPassword;
        setAccountError('');
        if (mode === 'create' && name.length < 2) {
            setAccountError('Enter your name.');
            return;
        }
        if (!/^\S+@\S+\.\S+$/.test(email)) {
            setAccountError('Enter a valid email address.');
            return;
        }
        if (password.length < 8) {
            setAccountError('Use at least 8 characters for your password.');
            return;
        }

        setAccountBusy(true);
        try {
            const endpoint = mode === 'create' ? '/api/nfcps-account/create' : '/api/nfcps-account/sign-in';
            const response = await api.post(endpoint, mode === 'create' ? { name, email, password } : { email, password });
            const next = cleanUser(response.data.user);
            localStorage.setItem(SESSION, String(response.data.sessionToken));
            localStorage.setItem(CACHE, JSON.stringify(next));
            setUser(next);
            const existingName = localStorage.getItem('nfcps-profile-name') || localStorage.getItem('nfcps-watch-name') || next.name || name;
            if (existingName) {
                localStorage.setItem('nfcps-profile-name', existingName);
                localStorage.setItem('nfcps-watch-name', existingName);
                setProfileName(existingName);
            }
            setBoardOpen(false);
            setFormPassword('');
            setNotice(response.data.created === true ? 'Account created. Your phone activity is now syncing.' : 'Signed in. Your NFCPS One is syncing.');
            await syncNow(true);
            window.dispatchEvent(new Event('nfcps-account-changed'));
        } catch (cause) {
            setAccountError(messageFrom(cause));
        } finally {
            setAccountBusy(false);
        }
    };

    useEffect(() => {
        if (typeof window === 'undefined') return;
        try {
            setProfileName(localStorage.getItem('nfcps-profile-name') || localStorage.getItem('nfcps-watch-name') || '');
        } catch {
            // Local storage may be unavailable in a restricted browser context.
        }
        let live = true;
        const start = async () => {
            const token = sessionToken();
            if (!token) {
                setStatus('local');
                return;
            }
            const cached = readJson(CACHE, null);
            if (cached && live) setUser(cleanUser(cached));
            if (!navigator.onLine) {
                if (live) setStatus('offline');
                return;
            }
            try {
                const response = await api.post('/api/nfcps-account/me', { sessionToken: token });
                if (!live) return;
                const next = cleanUser(response.data.user);
                setUser(next);
                localStorage.setItem(CACHE, JSON.stringify(next));
                const existingName = localStorage.getItem('nfcps-profile-name') || localStorage.getItem('nfcps-watch-name') || next.name || '';
                if (existingName) {
                    localStorage.setItem('nfcps-profile-name', existingName);
                    localStorage.setItem('nfcps-watch-name', existingName);
                    setProfileName(existingName);
                }
                await syncNow(true);
            } catch (cause) {
                const message = messageFrom(cause).toLowerCase();
                if (message.includes('expired') || message.includes('sign in')) {
                    localStorage.removeItem(SESSION);
                    localStorage.removeItem(CACHE);
                    if (live) {
                        setUser(null);
                        setStatus('local');
                        setNotice('Sign in again to continue cloud sync. Your device copy is safe.');
                    }
                } else if (live) {
                    setStatus(navigator.onLine ? 'error' : 'offline');
                }
            }
        };
        void start();

        const queue = () => {
            if (timer.current) window.clearTimeout(timer.current);
            timer.current = window.setTimeout(() => void syncNow(false), 1200);
        };
        const focus = () => void syncNow(true);
        const visible = () => {
            if (document.visibilityState === 'visible') void syncNow(true);
        };
        const online = () => void syncNow(true);
        const offline = () => {
            if (sessionToken()) setStatus('offline');
        };
        for (const event of ['nfcps-reader-updated', 'nfcps-member-state-changed', 'nfcps-circulation-updated', 'storage']) {
            window.addEventListener(event, queue);
        }
        window.addEventListener('focus', focus);
        window.addEventListener('online', online);
        window.addEventListener('offline', offline);
        document.addEventListener('visibilitychange', visible);
        const scan = window.setInterval(() => {
            if (!sessionToken() || !navigator.onLine) return;
            const now = JSON.stringify(captureSnapshot());
            if (now !== lastFingerprint.current) queue();
        }, 15000);
        return () => {
            live = false;
            if (timer.current) window.clearTimeout(timer.current);
            window.clearInterval(scan);
            for (const event of ['nfcps-reader-updated', 'nfcps-member-state-changed', 'nfcps-circulation-updated', 'storage']) {
                window.removeEventListener(event, queue);
            }
            window.removeEventListener('focus', focus);
            window.removeEventListener('online', online);
            window.removeEventListener('offline', offline);
            document.removeEventListener('visibilitychange', visible);
        };
    }, [syncNow]);

    const displayName = profileName || user?.name || '';
    const value = useMemo<AccountContextValue>(() => ({
        user,
        signedIn: Boolean(user && sessionToken()),
        displayName,
        firstName: first(displayName),
        initials: initialsFor(displayName),
        picture: user?.picture,
        status,
        lastSyncedAt,
        notice,
        signIn,
        signOut,
        syncNow,
    }), [user, displayName, status, lastSyncedAt, notice, signIn, signOut, syncNow]);

    return (
        <AccountContext.Provider value={value}>
            {children}
            {boardOpen && (
                <div className='nfcps-account-gate' onMouseDown={() => !accountBusy && setBoardOpen(false)}>
                    <section className='nfcps-account-board' onMouseDown={event => event.stopPropagation()} role='dialog' aria-modal='true' aria-labelledby='nfcps-account-title'>
                        <header className='nfcps-account-top'>
                            <div className='nfcps-account-identity'>
                                <img src='/resources/nfcps-logo.png' alt='' />
                                <span><strong>NFCPS One</strong><small>Christ, the Therapy for All.</small></span>
                            </div>
                            <button className='nfcps-account-close' onClick={() => setBoardOpen(false)} disabled={accountBusy} aria-label='Close account screen'>
                                <X />
                            </button>
                        </header>

                        <div className='nfcps-account-brand'>
                            <small>{mode === 'signin' ? 'WELCOME BACK' : 'YOUR NFCPS ACCOUNT'}</small>
                            <h2 id='nfcps-account-title'>{mode === 'signin' ? 'Sign in to NFCPS One' : 'Create your account'}</h2>
                            <p>{mode === 'signin' ? 'Pick up your reading, Watch and notes on any device.' : 'Keep your reading, Watch, notes and library activity with you.'}</p>
                        </div>

                        <div className='nfcps-account-tabs' aria-label='Account action'>
                            <button type='button' className={mode === 'signin' ? 'active' : ''} onClick={() => { setMode('signin'); setAccountError(''); }}>Sign in</button>
                            <button type='button' className={mode === 'create' ? 'active' : ''} onClick={() => { setMode('create'); setAccountError(''); }}>Create account</button>
                        </div>

                        <form className='nfcps-account-form' onSubmit={submitAccount}>
                            <div className='nfcps-account-fields'>
                                {mode === 'create' && (
                                    <label className='nfcps-account-field'>
                                        <UserRound />
                                        <span>
                                            <small>Name</small>
                                            <input name='name' value={formName} onChange={event => setFormName(event.target.value)} autoComplete='name' enterKeyHint='next' placeholder='Your name' minLength={2} required />
                                        </span>
                                    </label>
                                )}
                                <label className='nfcps-account-field'>
                                    <Mail />
                                    <span>
                                        <small>Email</small>
                                        <input name='email' type='email' value={formEmail} onChange={event => setFormEmail(event.target.value)} autoComplete='email' inputMode='email' enterKeyHint='next' placeholder='you@example.com' required />
                                    </span>
                                </label>
                                <label className='nfcps-account-field'>
                                    <LockKeyhole />
                                    <span>
                                        <small>Password</small>
                                        <input name='password' type={showPassword ? 'text' : 'password'} value={formPassword} onChange={event => setFormPassword(event.target.value)} autoComplete={mode === 'create' ? 'new-password' : 'current-password'} enterKeyHint='done' placeholder={mode === 'create' ? '8 characters or more' : 'Your password'} minLength={8} required />
                                    </span>
                                    <button type='button' onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                                        {showPassword ? <EyeOff /> : <Eye />}
                                    </button>
                                </label>
                            </div>

                            {mode === 'create' && <p className='nfcps-account-hint'>Use 8 or more characters. Your password is protected before it is stored.</p>}
                            {accountError && <p className='nfcps-account-error' role='alert' aria-live='polite'>{accountError}</p>}

                            <button className='nfcps-account-submit' disabled={accountBusy}>
                                {accountBusy ? <LoaderCircle className='spin' /> : null}
                                {accountBusy ? 'One moment…' : mode === 'signin' ? 'Continue' : 'Create account'}
                            </button>
                        </form>

                        <button type='button' className='nfcps-account-guest' onClick={() => setBoardOpen(false)} disabled={accountBusy}>Continue without an account</button>
                        <div className='nfcps-account-trust'><ShieldCheck /><span><strong>Private sync</strong><small>Your device still works offline.</small></span></div>
                    </section>
                </div>
            )}
        </AccountContext.Provider>
    );
}

export function useNfcpsAccount() {
    const value = useContext(AccountContext);
    if (!value) throw new Error('NfcpsAccountProvider is missing');
    return value;
}

export function AccountAvatar() {
    const { picture, initials } = useNfcpsAccount();
    return picture ? <img className='cx-account-photo' src={picture} alt='' referrerPolicy='no-referrer' /> : <>{initials.slice(0, 1)}</>;
}
