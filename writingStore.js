// writingStore.js — the one place that reads and writes Brainstorm data on the
// phone (AsyncStorage). Screens call these instead of touching keys directly.
//
//   pp.goal.v1        weekly goal  { type, wordTarget, timeTarget, sessionTarget }
//   pp.dailyGoals.v1  { 'YYYY-MM-DD': { type: 'word'|'time', target } | { skipped: true } }
//   pp.sessions.v1    [session, ...] newest first — every session, with its text
//
// A session:
//   { id, day, startedAt, endedAt, hour, seconds, words, finalWords, text,
//     blockedPastes, dailyGoal, pct, appRating, selfRating }

import { useEffect, useState } from 'react';
import { AppState, Share } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { dayKey, msUntilMidnight, outcomeLabel, finalRating, parseDayKey } from './writingLogic';

export const WEEKLY_GOAL_KEY = 'pp.goal.v1';
export const DAILY_GOALS_KEY = 'pp.dailyGoals.v1';
export const SESSIONS_KEY = 'pp.sessions.v1';

async function readJSON(key, fallback) {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export async function loadAll() {
  const [weeklyGoal, dailyGoals, sessions] = await Promise.all([
    readJSON(WEEKLY_GOAL_KEY, null),
    readJSON(DAILY_GOALS_KEY, {}),
    readJSON(SESSIONS_KEY, []),
  ]);
  return { weeklyGoal, dailyGoals, sessions };
}

export async function saveWeeklyGoal(goal) {
  await AsyncStorage.setItem(WEEKLY_GOAL_KEY, JSON.stringify(goal));
}

export async function saveDailyGoal(goal, key = dayKey()) {
  const all = await readJSON(DAILY_GOALS_KEY, {});
  all[key] = { ...goal, setAt: new Date().toISOString() };
  await AsyncStorage.setItem(DAILY_GOALS_KEY, JSON.stringify(all));
  return all;
}

export async function saveSession(session) {
  const list = await readJSON(SESSIONS_KEY, []);
  const i = list.findIndex((s) => s.id === session.id);
  if (i >= 0) list[i] = { ...list[i], ...session };
  else list.unshift(session);
  await AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify(list));
  return list;
}

export async function deleteSession(id) {
  const list = (await readJSON(SESSIONS_KEY, [])).filter((s) => s.id !== id);
  await AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify(list));
  return list;
}

// "Send to myself": opens the phone's share sheet so the writer can email,
// text, or save it to Notes/Drive — whatever they use. No account needed.
export function shareWriting(sessions, title = 'My writing — Pen Parentis') {
  const list = Array.isArray(sessions) ? sessions : [sessions];
  const body = list
    .slice()
    .reverse()
    .map((s) => {
      const when = parseDayKey(s.day).toDateString();
      const rating = finalRating(s) ? ` · ${outcomeLabel(finalRating(s))}` : '';
      return `${when} · ${s.finalWords ?? s.words} words · ${Math.round((s.seconds || 0) / 60)} min${rating}\n\n${s.text || ''}`;
    })
    .join('\n\n— — —\n\n');
  return Share.share({ title, message: body }).catch(() => {});
}

// Returns today's key and re-renders the component when the clock passes
// 12am (or when the app comes back to the foreground on a new day). That's
// what makes "What's your goal today?" reset at midnight.
export function useToday() {
  const [today, setToday] = useState(dayKey());
  useEffect(() => {
    let timer;
    const arm = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        setToday(dayKey());
        arm();
      }, msUntilMidnight() + 1000);
    };
    arm();
    const sub = AppState.addEventListener('change', (st) => {
      if (st === 'active') {
        setToday(dayKey());
        arm();
      }
    });
    return () => {
      clearTimeout(timer);
      sub.remove();
    };
  }, []);
  return today;
}
