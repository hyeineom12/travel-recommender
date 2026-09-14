"use client";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { DEMO_SUBMISSIONS, MY_DEFAULT } from "@/lib/demo";
import { buildConsensus } from "@/lib/consensus";
import { buildSchedule } from "@/lib/schedule";
import type { Strategy, Submission } from "@/lib/types";

export interface AppState {
  nights: number;
  mine: Submission;
  submitted: boolean;
  strategy: Strategy;
  allowPartial: boolean;
}

const INITIAL: AppState = {
  nights: 3,
  mine: MY_DEFAULT,
  submitted: false,
  strategy: "fairness",
  allowPartial: true,
};

const KEY = "gatiga-v1";

interface Ctx {
  state: AppState;
  set: (p: Partial<AppState>) => void;
  setMine: (p: Partial<Submission>) => void;
  reset: () => void;
  ready: boolean;
  submissions: Submission[];
  consensus: ReturnType<typeof buildConsensus>;
  schedule: ReturnType<typeof buildSchedule>;
}

const C = createContext<Ctx | null>(null);

export function TripProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(INITIAL);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(KEY);
      if (raw) setState({ ...INITIAL, ...JSON.parse(raw) });
    } catch { /* 무시 */ }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try { window.localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* 무시 */ }
  }, [state, ready]);

  const set = (p: Partial<AppState>) => setState((s) => ({ ...s, ...p }));
  const setMine = (p: Partial<Submission>) => setState((s) => ({ ...s, mine: { ...s.mine, ...p } }));
  const reset = () => {
    setState(INITIAL);
    try { window.localStorage.removeItem(KEY); } catch { /* 무시 */ }
  };

  const submissions = useMemo(() => [state.mine, ...DEMO_SUBMISSIONS], [state.mine]);

  const consensus = useMemo(
    () => buildConsensus({
      submissions, nights: state.nights,
      strategy: state.strategy, allowPartial: state.allowPartial,
    }),
    [submissions, state.nights, state.strategy, state.allowPartial]
  );

  const schedule = useMemo(() => {
    const vetoed = new Set(submissions.map((s) => s.veto).filter(Boolean) as string[]);
    return buildSchedule(consensus.selections, state.nights + 1, {
      considerBags: true, fillMeals: true, vetoed,
    });
  }, [consensus, state.nights, submissions]);

  return (
    <C.Provider value={{ state, set, setMine, reset, ready, submissions, consensus, schedule }}>
      {children}
    </C.Provider>
  );
}

export function useTrip() {
  const ctx = useContext(C);
  if (!ctx) throw new Error("useTrip must be used inside TripProvider");
  return ctx;
}
