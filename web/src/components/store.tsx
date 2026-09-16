"use client";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { DEMO_SUBMISSIONS, MY_DEFAULT } from "@/lib/demo";
import { buildConsensus } from "@/lib/consensus";
import { buildSchedule } from "@/lib/schedule";
import { makeCustomPlace, setCustomPlaces, type CustomPlaceInput } from "@/lib/places";
import type { Place, Strategy, Submission } from "@/lib/types";

export interface AppState {
  nights: number;
  mine: Submission;
  submitted: boolean;
  strategy: Strategy;
  allowPartial: boolean;
  /** 사용자가 직접 추가한 장소 */
  customPlaces: Place[];
}

const INITIAL: AppState = {
  nights: 3,
  mine: MY_DEFAULT,
  submitted: false,
  strategy: "fairness",
  allowPartial: true,
  customPlaces: [],
};

const KEY = "gatiga-v1";

interface Ctx {
  state: AppState;
  set: (p: Partial<AppState>) => void;
  setMine: (p: Partial<Submission>) => void;
  /** 직접 추가한 장소를 등록하고 만들어진 장소를 돌려준다 */
  addPlace: (input: CustomPlaceInput) => Place;
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

  const addPlace = (input: CustomPlaceInput) => {
    const place = makeCustomPlace(input);
    setState((s) => ({ ...s, customPlaces: [...s.customPlaces, place] }));
    return place;
  };

  // 추가된 장소는 consensus·schedule이 id로 찾을 수 있어야 하므로 계산 전에 등록한다.
  setCustomPlaces(state.customPlaces);

  const submissions = useMemo(() => [state.mine, ...DEMO_SUBMISSIONS], [state.mine]);

  const consensus = useMemo(
    () => buildConsensus({
      submissions, nights: state.nights,
      strategy: state.strategy, allowPartial: state.allowPartial,
    }),
    [submissions, state.nights, state.strategy, state.allowPartial, state.customPlaces]
  );

  const schedule = useMemo(() => {
    const vetoed = new Set(submissions.map((s) => s.veto).filter(Boolean) as string[]);
    return buildSchedule(consensus.selections, state.nights + 1, {
      considerBags: true, fillMeals: true, vetoed,
    });
  }, [consensus, state.nights, submissions]);

  return (
    <C.Provider value={{ state, set, setMine, addPlace, reset, ready, submissions, consensus, schedule }}>
      {children}
    </C.Provider>
  );
}

export function useTrip() {
  const ctx = useContext(C);
  if (!ctx) throw new Error("useTrip must be used inside TripProvider");
  return ctx;
}
