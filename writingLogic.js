// writingLogic.js — pure functions behind goals, sessions, ratings and the
// personalized Home screen. No React Native imports here on purpose, so this
// file can be unit-tested with plain Node and reused by every screen.

// ---------------------------------------------------------------------------
// Dates. Everything is local time, so "today" resets at 12am on the phone.
// ---------------------------------------------------------------------------

export function dayKey(date = new Date()) {
  const d = new Date(date);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export function parseDayKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

// Monday 00:00 of the week containing `date`.
export function startOfWeek(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() + ((day === 0 ? -6 : 1) - day));
  d.setHours(0, 0, 0, 0);
  return d;
}

// The 7 day keys Mon..Sun of the current week.
export function weekDayKeys(date = new Date()) {
  const start = startOfWeek(date);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return dayKey(d);
  });
}

export function msUntilMidnight(now = new Date()) {
  const next = new Date(now);
  next.setHours(24, 0, 0, 0);
  return next.getTime() - now.getTime();
}

export function hourLabel(h) {
  const hr = ((Math.round(h) % 24) + 24) % 24;
  if (hr === 0) return '12am';
  if (hr === 12) return '12pm';
  return hr < 12 ? `${hr}am` : `${hr - 12}pm`;
}

export function partOfDay(h) {
  if (h >= 4 && h < 8) return 'early morning';
  if (h >= 8 && h < 12) return 'morning';
  if (h >= 12 && h < 17) return 'afternoon';
  if (h >= 17 && h < 22) return 'evening';
  return 'late night';
}

export function greetingFor(h) {
  if (h >= 4 && h < 12) return 'Good morning';
  if (h >= 12 && h < 17) return 'Good afternoon';
  if (h >= 17 && h < 22) return 'Good evening';
  return 'Still up';
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// ---------------------------------------------------------------------------
// Words and pasting.
// ---------------------------------------------------------------------------

export function countWords(text) {
  const t = (text || '').trim();
  return t ? t.split(/\s+/).length : 0;
}

// More characters than this arriving in a single keystroke is treated as a
// paste and rejected. A swiped or autocompleted word is well under this; a
// pasted paragraph is well over it.
export const PASTE_CHAR_LIMIT = 30;

export function looksLikePaste(prevText, nextText) {
  return nextText.length - prevText.length > PASTE_CHAR_LIMIT;
}

// ---------------------------------------------------------------------------
// Ratings. Four outcomes — "Something came up" is folded into "None of it".
// ---------------------------------------------------------------------------

export const OUTCOMES = [
  { key: 'exceeded', label: 'Exceeded' },
  { key: 'met', label: 'Met' },
  { key: 'some', label: 'Some of it' },
  { key: 'none', label: 'None of it', sub: 'Something came up — that still counts as showing up' },
];

export function outcomeLabel(key) {
  return OUTCOMES.find((o) => o.key === key)?.label ?? '—';
}

// At or above this % of today's goal the writer rates themselves; below it
// the app records its own rating.
export const SELF_RATE_THRESHOLD = 50;

export function appRatingFor(pct) {
  if (pct == null) return null;
  if (pct >= 110) return 'exceeded';
  if (pct >= 100) return 'met';
  if (pct > 0) return 'some';
  return 'none';
}

export function canSelfRate(pct) {
  // No daily goal set → nothing for the app to measure against, so the
  // writer rates themselves.
  return pct == null || pct >= SELF_RATE_THRESHOLD;
}

// The rating that counts: the writer's own if they gave one, else the app's.
export function finalRating(session) {
  return session.selfRating || session.appRating || null;
}

// ---------------------------------------------------------------------------
// Goals and progress.
// ---------------------------------------------------------------------------

// Daily goal: { type: 'word' | 'time', target: number } or { skipped: true }.
// Weekly goal: { type: 'word' | 'time' | 'both' | 'sessions', wordTarget,
//                timeTarget, sessionTarget }.

export function summarize(sessions) {
  let words = 0;
  let seconds = 0;
  for (const s of sessions) {
    words += s.words || 0;
    seconds += s.seconds || 0;
  }
  return { words, minutes: Math.floor(seconds / 60), seconds, count: sessions.length };
}

export function sessionsOnDay(sessions, key) {
  return sessions.filter((s) => s.day === key);
}

export function sessionsThisWeek(sessions, date = new Date()) {
  const keys = new Set(weekDayKeys(date));
  return sessions.filter((s) => keys.has(s.day));
}

export function dailyPct(goal, summary) {
  if (!goal || goal.skipped || !goal.target) return null;
  const done = goal.type === 'time' ? summary.seconds / 60 : summary.words;
  return Math.round((done / goal.target) * 100);
}

export function weeklyPct(goal, summary) {
  if (!goal) return 0;
  const parts = [];
  if ((goal.type === 'word' || goal.type === 'both') && goal.wordTarget) parts.push(summary.words / goal.wordTarget);
  if ((goal.type === 'time' || goal.type === 'both') && goal.timeTarget) parts.push(summary.seconds / 60 / goal.timeTarget);
  if (goal.type === 'sessions' && goal.sessionTarget) parts.push(summary.count / goal.sessionTarget);
  if (!parts.length) return 0;
  return Math.round((parts.reduce((a, b) => a + b, 0) / parts.length) * 100);
}

export function describeWeeklyGoal(goal) {
  if (!goal) return '';
  if (goal.type === 'word') return `${(goal.wordTarget || 0).toLocaleString()} words this week`;
  if (goal.type === 'time') return `${goal.timeTarget || 0} minutes this week`;
  if (goal.type === 'sessions') return `${goal.sessionTarget || 0} sessions this week`;
  return `${(goal.wordTarget || 0).toLocaleString()} words & ${goal.timeTarget || 0} minutes this week`;
}

export function describeDailyGoal(goal) {
  if (!goal) return 'No goal set yet';
  if (goal.skipped) return 'No goal today';
  return goal.type === 'time' ? `${goal.target} minutes today` : `${goal.target.toLocaleString()} words today`;
}

// One entry per day of this week, for the chart.
export function weekChartData(sessions, dailyGoals, date = new Date()) {
  const today = dayKey(date);
  const labels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  return weekDayKeys(date).map((key, i) => {
    const sum = summarize(sessionsOnDay(sessions, key));
    const goal = dailyGoals[key] || null;
    const pct = dailyPct(goal, sum);
    const future = key > today;
    let status = 'nogoal';
    if (future) status = 'future';
    else if (pct != null) status = appRatingFor(pct);
    return { key, label: labels[i], isToday: key === today, pct, status, ...sum };
  });
}

// ---------------------------------------------------------------------------
// Personalization — the Home screen learns after 10 and 100 sessions.
// ---------------------------------------------------------------------------

export const TIER_LEARNING = 10;
export const TIER_DEEP = 100;

function median(nums) {
  if (!nums.length) return null;
  const a = [...nums].sort((x, y) => x - y);
  const mid = Math.floor(a.length / 2);
  return a.length % 2 ? a[mid] : (a[mid - 1] + a[mid]) / 2;
}

export function streakDays(sessions, date = new Date()) {
  const days = new Set(sessions.map((s) => s.day));
  const d = new Date(date);
  // Today not written yet doesn't break a streak that ran through yesterday.
  if (!days.has(dayKey(d))) d.setDate(d.getDate() - 1);
  let n = 0;
  while (days.has(dayKey(d))) {
    n += 1;
    d.setDate(d.getDate() - 1);
  }
  return n;
}

export function longestStreak(sessions) {
  const keys = [...new Set(sessions.map((s) => s.day))].sort();
  let best = 0;
  let run = 0;
  let prev = null;
  for (const k of keys) {
    const d = parseDayKey(k);
    if (prev) {
      const gap = Math.round((d.getTime() - prev.getTime()) / 86400000);
      run = gap === 1 ? run + 1 : 1;
    } else run = 1;
    best = Math.max(best, run);
    prev = d;
  }
  return best;
}

export function suggestedDailyGoal(sessions, type = 'word') {
  // Median of the last 14 days that had any writing, rounded to a friendly number.
  const byDay = {};
  for (const s of sessions) {
    byDay[s.day] = byDay[s.day] || { words: 0, seconds: 0 };
    byDay[s.day].words += s.words || 0;
    byDay[s.day].seconds += s.seconds || 0;
  }
  const recent = Object.keys(byDay).sort().slice(-14).map((k) => byDay[k]);
  if (recent.length < 3) return null;
  if (type === 'time') {
    const m = median(recent.map((d) => d.seconds / 60));
    return Math.max(5, Math.round(m / 5) * 5);
  }
  const m = median(recent.map((d) => d.words));
  return Math.max(50, Math.round(m / 50) * 50);
}

export function buildInsights(sessions, dailyGoals = {}, now = new Date()) {
  const hour = now.getHours();
  const total = sessions.length;
  const today = dayKey(now);
  const todaySum = summarize(sessionsOnDay(sessions, today));
  const todayGoal = dailyGoals[today] || null;
  const todayPct = dailyPct(todayGoal, todaySum);
  const streak = streakDays(sessions, now);

  const tier = total >= TIER_DEEP ? 'deep' : total >= TIER_LEARNING ? 'learning' : 'new';
  const lines = [];
  let headline = `${greetingFor(hour)}.`;

  if (tier === 'new') {
    headline = total === 0 ? `${greetingFor(hour)}. Welcome in.` : `${greetingFor(hour)}.`;
    if (todaySum.count) lines.push(`${todaySum.words.toLocaleString()} words so far today.`);
    else lines.push('Set a small goal for today and write toward it — even ten minutes counts.');
    const left = TIER_LEARNING - total;
    lines.push(`${left} more session${left === 1 ? '' : 's'} and this screen starts learning your rhythm.`);
    return { tier, headline, lines, streak, todaySum, todayGoal, todayPct, total };
  }

  const hours = sessions.map((s) => s.hour).filter((h) => typeof h === 'number');
  const usual = median(hours);
  const avgWords = Math.round(summarize(sessions).words / total);
  const usualPart = usual != null ? partOfDay(usual) : null;

  if (streak > 1) headline = `${greetingFor(hour)}. Day ${streak} of your streak.`;

  // What to say depends on *when* they opened the app.
  if (todaySum.count) {
    const goalBit = todayPct != null ? ` — ${todayPct}% of today's goal` : '';
    lines.push(`${todaySum.words.toLocaleString()} words already today${goalBit}.`);
  } else if (usual != null && Math.abs(hour - usual) <= 1) {
    lines.push(`This is usually when you write (${hourLabel(usual)}). The page is ready.`);
  } else if (usual != null && hour > usual) {
    lines.push(`You usually write around ${hourLabel(usual)}. There's still time for a short one.`);
  } else if (usual != null) {
    lines.push(`Early start — you usually write around ${hourLabel(usual)}.`);
  }

  const PLURAL = {
    'early morning': 'Early mornings', morning: 'Mornings', afternoon: 'Afternoons',
    evening: 'Evenings', 'late night': 'Late nights',
  };
  if (usualPart) lines.push(`${PLURAL[usualPart]} are your time — about ${avgWords.toLocaleString()} words a session.`);

  if (tier === 'deep') {
    const lifetime = summarize(sessions).words;
    const byWeekday = Array(7).fill(0);
    for (const s of sessions) byWeekday[parseDayKey(s.day).getDay()] += s.words || 0;
    const best = byWeekday.indexOf(Math.max(...byWeekday));

    const last7 = [];
    const prev7 = [];
    for (let i = 0; i < 14; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      (i < 7 ? last7 : prev7).push(dayKey(d));
    }
    const wLast = summarize(sessions.filter((s) => last7.includes(s.day))).words;
    const wPrev = summarize(sessions.filter((s) => prev7.includes(s.day))).words;

    lines.push(`${lifetime.toLocaleString()} words across ${total} sessions. ${WEEKDAYS[best]}s are your strongest day.`);
    if (wPrev > 0) {
      const change = Math.round(((wLast - wPrev) / wPrev) * 100);
      if (change >= 10) lines.push(`Up ${change}% on the week before.`);
      else if (change <= -10) lines.push(`A quieter week than the last — that's allowed.`);
    }
    const best_streak = longestStreak(sessions);
    if (best_streak > streak) lines.push(`Longest streak so far: ${best_streak} days.`);
  }

  return { tier, headline, lines, streak, todaySum, todayGoal, todayPct, total, usualHour: usual };
}
