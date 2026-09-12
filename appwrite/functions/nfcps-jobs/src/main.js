const TASKS = [
  { id: 'moments', label: 'NFCPS Moments', cadence: 'every 5 minutes' },
  { id: 'watch-refresh', label: 'NFCPS Watch refresh', cadence: 'every 10 minutes' },
  { id: 'circulation', label: 'Physical-book reminders', cadence: 'hourly' },
];

function taskPlan(now = new Date()) {
  const minute = now.getUTCMinutes();
  return {
    moments: true,
    'watch-refresh': minute % 10 === 0,
    circulation: minute === 0,
  };
}

function payload(now = new Date()) {
  return {
    ok: true,
    service: 'nfcps-one-jobs',
    platform: 'appwrite',
    mode: process.env.NFCPS_JOBS_MODE || 'legacy-shadow',
    timestamp: now.toISOString(),
    plan: taskPlan(now),
    tasks: TASKS,
    note: 'Legacy AppDeploy cron remains authoritative until Appwrite data migration is verified.',
  };
}

export default async ({ req, res, log }) => {
  const trigger = String(req?.headers?.['x-appwrite-trigger'] || 'http');
  const now = new Date();
  const result = payload(now);
  log?.(`[nfcps-jobs] trigger=${trigger} mode=${result.mode} plan=${JSON.stringify(result.plan)}`);

  // This function is intentionally non-mutating in the first migration stage.
  // Once Appwrite data collections are populated and verified, the three jobs
  // are moved here one-by-one without changing the installed Android app.
  return res.json({ ...result, trigger }, 200);
};

export { taskPlan };
