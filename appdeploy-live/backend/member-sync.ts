import { createHash, randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import { db, error, json, requireAuth } from '@appdeploy/sdk';

type MemberSyncRecord = {
    version: number;
    snapshot: Record<string, unknown>;
    updatedAt: string;
};

type AccountRecord = {
    userId: string;
    name: string;
    email: string;
    emailKey: string;
    salt: string;
    passwordHash: string;
    createdAt: string;
    updatedAt: string;
};

type SessionRecord = {
    userId: string;
    name: string;
    email: string;
    emailKey: string;
    expiresAt: string;
    createdAt: string;
};

const SESSION_DAYS = 90;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const hashKey = (value: string) => createHash('sha256').update(value).digest('hex');
const normalizeEmail = (value: unknown) => String(value || '').trim().toLowerCase().slice(0, 180);
const normalizeName = (value: unknown) => String(value || '').trim().replace(/\s+/g, ' ').slice(0, 100);
const accountTable = (emailKey: string) => `nfcps_account_${emailKey.slice(0, 48)}`;
const sessionTable = (token: string) => `nfcps_session_${hashKey(token).slice(0, 48)}`;
const syncTable = (userId: string) => `member_sync_${userId.replace(/[^A-Za-z0-9_-]/g, '_')}`;

async function firstRecord<T>(table: string) {
    const { items } = await db.list<T>(table, { limit: 1 });
    return items[0] || null;
}

async function readAccount(emailKey: string) {
    return firstRecord<AccountRecord>(accountTable(emailKey));
}

const makePasswordHash = (password: string, salt: string) => scryptSync(password, salt, 64).toString('hex');

const passwordMatches = (password: string, account: AccountRecord) => {
    try {
        const expected = Buffer.from(account.passwordHash, 'hex');
        const actual = Buffer.from(makePasswordHash(password, account.salt), 'hex');
        return expected.length === actual.length && timingSafeEqual(expected, actual);
    } catch {
        return false;
    }
};

async function issueSession(account: AccountRecord) {
    const token = randomBytes(32).toString('base64url');
    const now = Date.now();
    const session: SessionRecord = {
        userId: account.userId,
        name: account.name,
        email: account.email,
        emailKey: account.emailKey,
        createdAt: new Date(now).toISOString(),
        expiresAt: new Date(now + SESSION_DAYS * 86400000).toISOString(),
    };
    const [id] = await db.add(sessionTable(token), [session]);
    if (!id) throw new Error('Could not create account session.');
    return token;
}

async function validateSession(rawToken: unknown) {
    const token = String(rawToken || '').trim();
    if (token.length < 32 || token.length > 180) return null;
    const current = await firstRecord<SessionRecord>(sessionTable(token));
    if (!current) return null;
    if (Date.parse(current.expiresAt) <= Date.now()) {
        await db.delete(sessionTable(token), [current.id]);
        return null;
    }
    return current;
}

async function removeSession(rawToken: unknown) {
    const token = String(rawToken || '').trim();
    if (!token) return;
    const current = await firstRecord<SessionRecord>(sessionTable(token));
    if (current) await db.delete(sessionTable(token), [current.id]);
}

async function readMember(userId: string) {
    return firstRecord<MemberSyncRecord>(syncTable(userId));
}

async function saveMember(userId: string, rawSnapshot: unknown) {
    if (!rawSnapshot || typeof rawSnapshot !== 'object' || Array.isArray(rawSnapshot)) {
        return error('Invalid sync snapshot.', 400);
    }
    const snapshot = rawSnapshot as Record<string, unknown>;
    const bytes = new TextEncoder().encode(JSON.stringify(snapshot)).byteLength;
    if (bytes > 220000) {
        return error('Your synced library is too large for one update. Keep fewer very large notes and try again.', 413);
    }
    const updatedAt = new Date().toISOString();
    const record: MemberSyncRecord = { version: 1, snapshot, updatedAt };
    const current = await readMember(userId);
    if (current) {
        const [ok] = await db.update(syncTable(userId), [{ id: current.id, record }]);
        if (!ok) return error('Could not update your NFCPS cloud copy.', 500);
    } else {
        const [id] = await db.add(syncTable(userId), [record]);
        if (!id) return error('Could not create your NFCPS cloud copy.', 500);
    }
    return json({ snapshot, updatedAt });
}

const accountUser = (record: Pick<AccountRecord | SessionRecord, 'userId' | 'name' | 'email'>) => ({
    userId: record.userId,
    name: record.name,
    email: record.email,
    scope: 'nfcps_account',
});

export const memberSyncRoutes = {
    'POST /api/nfcps-account/create': [async (ctx) => {
        const body = (ctx.body || {}) as { name?: unknown; email?: unknown; password?: unknown };
        const name = normalizeName(body.name);
        const email = normalizeEmail(body.email);
        const password = String(body.password || '');
        if (name.length < 2) return error('Enter your name.', 400);
        if (!emailPattern.test(email)) return error('Enter a valid email address.', 400);
        if (password.length < 8 || password.length > 128) return error('Use a password with at least 8 characters.', 400);

        const emailKey = hashKey(email);
        const existing = await readAccount(emailKey);
        if (existing) {
            if (!passwordMatches(password, existing)) return error('An account already uses this email. Sign in instead.', 409);
            const sessionToken = await issueSession(existing);
            return json({ user: accountUser(existing), sessionToken, created: false });
        }

        const now = new Date().toISOString();
        const salt = randomBytes(16).toString('hex');
        const account: AccountRecord = {
            userId: randomUUID(),
            name,
            email,
            emailKey,
            salt,
            passwordHash: makePasswordHash(password, salt),
            createdAt: now,
            updatedAt: now,
        };
        const [id] = await db.add(accountTable(emailKey), [account]);
        if (!id) return error('Could not create your NFCPS One account.', 500);
        const sessionToken = await issueSession(account);
        return json({ user: accountUser(account), sessionToken, created: true }, 201);
    }],

    'POST /api/nfcps-account/sign-in': [async (ctx) => {
        const body = (ctx.body || {}) as { email?: unknown; password?: unknown };
        const email = normalizeEmail(body.email);
        const password = String(body.password || '');
        if (!emailPattern.test(email) || !password) return error('Enter your email and password.', 400);
        const account = await readAccount(hashKey(email));
        if (!account || !passwordMatches(password, account)) return error('Email or password is incorrect.', 401);
        const sessionToken = await issueSession(account);
        return json({ user: accountUser(account), sessionToken });
    }],

    'POST /api/nfcps-account/me': [async (ctx) => {
        const body = (ctx.body || {}) as { sessionToken?: unknown };
        const session = await validateSession(body.sessionToken);
        if (!session) return error('Your NFCPS One session has expired. Sign in again.', 401);
        return json({ user: accountUser(session) });
    }],

    'POST /api/nfcps-account/sign-out': [async (ctx) => {
        const body = (ctx.body || {}) as { sessionToken?: unknown };
        await removeSession(body.sessionToken);
        return json({ signedOut: true });
    }],

    'POST /api/member-sync/get': [async (ctx) => {
        const body = (ctx.body || {}) as { sessionToken?: unknown };
        const session = await validateSession(body.sessionToken);
        if (!session) return error('Sign in to sync this device.', 401);
        const current = await readMember(session.userId);
        return json({ snapshot: current?.snapshot || null, updatedAt: current?.updatedAt || null });
    }],

    'POST /api/member-sync/save': [async (ctx) => {
        const body = (ctx.body || {}) as { sessionToken?: unknown; snapshot?: unknown };
        const session = await validateSession(body.sessionToken);
        if (!session) return error('Sign in to sync this device.', 401);
        return saveMember(session.userId, body.snapshot);
    }],

    'GET /api/member-sync': [requireAuth(), async (ctx) => {
        const current = await readMember(ctx.user!.userId);
        return json({ snapshot: current?.snapshot || null, updatedAt: current?.updatedAt || null });
    }],

    'PUT /api/member-sync': [requireAuth(), async (ctx) => {
        const body = (ctx.body || {}) as { snapshot?: unknown };
        return saveMember(ctx.user!.userId, body.snapshot);
    }],
};
