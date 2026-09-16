import { findPlace } from "./places";
import type {
  ConsensusResult,
  MemberSatisfaction,
  Place,
  Selection,
  Strategy,
  Submission,
} from "./types";

/* ══════════════ 거리 · 이동 ══════════════ */

/** 두 좌표 사이 직선거리(km). 도심 규모에서는 등장방형 근사로 충분하다 */
export function distKm(a: Place, b: Place): number {
  const kx = Math.cos((((a.lat + b.lat) / 2) * Math.PI) / 180);
  const dx = (a.lng - b.lng) * kx * 111;
  const dy = (a.lat - b.lat) * 111;
  return Math.sqrt(dx * dx + dy * dy);
}

/** 실제 도보 경로는 직선보다 길다. 도심 가로망 보정 계수 */
const DETOUR = 1.35;
/** 도보 속도 (km/h) */
const WALK_KMH = 4.2;
/** 1.2km를 넘으면 대중교통을 탄다고 본다 */
const TRANSIT_THRESHOLD_KM = 1.2;
const TRANSIT_KMH = 18;
/** 대중교통 이용 시 고정 대기·환승 시간(분) */
const TRANSIT_OVERHEAD = 8;

export interface Move {
  km: number;
  min: number;
  mode: "walk" | "transit";
  /** 실제로 걷는 거리 — 체력 제약은 이 값으로 따진다 */
  walkKm: number;
}

export function travel(a: Place, b: Place): Move {
  const km = distKm(a, b) * DETOUR;
  if (km <= TRANSIT_THRESHOLD_KM) {
    return { km, min: Math.round((km / WALK_KMH) * 60), mode: "walk", walkKm: km };
  }
  // 대중교통을 타도 역까지 걷는 거리는 남는다
  const accessWalk = 0.7;
  return {
    km,
    min: Math.round((km / TRANSIT_KMH) * 60) + TRANSIT_OVERHEAD,
    mode: "transit",
    walkKm: accessWalk,
  };
}

/* ══════════════ 만족도 ══════════════ */

/** 만족도 항목별 가중치. 실험으로 보정할 값 */
export const WEIGHTS = {
  pick: 0.35,
  must: 0.30,
  budget: 0.15,
  walk: 0.10,
  veto: 0.10,
};

/**
 * 개인 만족도.
 * 예산·체력은 '여유가 있으면 만족'이 아니라 '한계를 넘지 않으면 만족'으로 본다.
 * 한계 안에서는 많이 쓸수록(=많이 볼수록) 오히려 만족이 올라간다.
 */
export function satisfactionOf(
  sub: Submission,
  chosen: Selection[],
  costPerPerson: number,
  walkPerDay: number
): MemberSatisfaction {
  const joinable = chosen.filter(
    (s) => s.tier === "core" || s.participants.includes(sub.memberId)
  );
  const ids = new Set(joinable.map((s) => s.place.id));

  const hit = sub.picks.filter((p) => ids.has(p)).length;
  const pickRate = sub.picks.length ? hit / sub.picks.length : 0;
  const mustKept = sub.must ? ids.has(sub.must) : true;
  const vetoKept = sub.veto ? !ids.has(sub.veto) : true;

  const budgetUse = sub.budget ? costPerPerson / sub.budget : 1;
  const walkUse = sub.walkLimit ? walkPerDay / sub.walkLimit : 1;

  // 한계를 넘으면 급격히 떨어지고, 안에서는 활용할수록 올라간다
  const withinScore = (use: number) => (use > 1 ? Math.max(0, 1 - (use - 1) * 2) : 0.55 + use * 0.45);

  const score =
    WEIGHTS.pick * pickRate +
    WEIGHTS.must * (mustKept ? 1 : 0) +
    WEIGHTS.budget * withinScore(budgetUse) +
    WEIGHTS.walk * withinScore(walkUse) +
    WEIGHTS.veto * (vetoKept ? 1 : 0);

  return { memberId: sub.memberId, pickRate, mustKept, budgetUse, walkUse, vetoKept, score };
}

/* ══════════════ 그룹 지표 ══════════════ */

export function gini(values: number[]): number {
  if (values.length === 0) return 0;
  const v = [...values].sort((a, b) => a - b);
  const n = v.length;
  const sum = v.reduce((s, x) => s + x, 0);
  if (sum === 0) return 0;
  let cum = 0;
  v.forEach((x, i) => (cum += (i + 1) * x));
  return (2 * cum) / (n * sum) - (n + 1) / n;
}

export function stdev(values: number[]): number {
  if (values.length === 0) return 0;
  const m = values.reduce((s, x) => s + x, 0) / values.length;
  return Math.sqrt(values.reduce((s, x) => s + (x - m) ** 2, 0) / values.length);
}

/* ══════════════ 합의 ══════════════ */

export interface ConsensusInput {
  submissions: Submission[];
  nights: number;
  /** 하루에 넣을 수 있는 장소 수 상한 */
  slotsPerDay?: number;
  strategy: Strategy;
  /** 부분 동행(옵션 일정)을 허용할 것인가 — 연구의 두 번째 요인 */
  allowPartial?: boolean;
}

/**
 * 고른 장소들의 카테고리 분포를 그 사람의 취향으로 본다.
 * 직접 고르지 않은 장소에도 취향만큼의 부분 효용을 주어야
 * 사람마다 값이 달라지고 전략 간 비교가 성립한다.
 */
function categoryTaste(sub: Submission): Partial<Record<string, number>> {
  const counts: Record<string, number> = {};
  sub.picks.forEach((id) => {
    const p = findPlace(id);
    if (p) counts[p.category] = (counts[p.category] ?? 0) + 1;
  });
  const total = sub.picks.length || 1;
  const out: Record<string, number> = {};
  Object.entries(counts).forEach(([k, v]) => (out[k] = v / total));
  return out;
}

/** 개인 효용 (0~1) */
export function utilityOf(place: Place, sub: Submission, taste = categoryTaste(sub)): number {
  if (sub.veto === place.id) return 0;
  if (sub.must === place.id) return 1;

  // 직접 고른 곳은 높게, 안 고른 곳은 (내 취향 + 장소의 보편적 매력)만큼
  let u = sub.picks.includes(place.id)
    ? 0.85
    : 0.08 + 0.42 * (taste[place.category] ?? 0) + 0.38 * place.popularity;

  // 1인 예산에서 이 장소 하나가 차지하는 비중이 크면 부담스럽다
  const share = sub.budget ? place.cost / sub.budget : 0;
  if (share > 0.25) u *= Math.max(0.25, 1 - (share - 0.25) * 2);

  // 체류가 길면 체력 여유가 적은 사람에게 부담
  if (place.stayMin > 120 && sub.activeMin < 450) u *= 0.8;

  return Math.max(0, Math.min(1, u));
}

/** 전략별 장소 점수. 값이 클수록 먼저 채택된다 */
function scorePlace(place: Place, subs: Submission[], strategy: Strategy): number {
  const utils = subs.map((s) => utilityOf(place, s));

  switch (strategy) {
    case "average":
      return utils.reduce((a, b) => a + b, 0) / utils.length;
    case "least_misery":
      // 가장 불만인 사람을 우선 고려하되, 평균도 약하게 반영해 동점을 가른다
      return Math.min(...utils) * 0.8 + (utils.reduce((a, b) => a + b, 0) / utils.length) * 0.2;
    case "fairness": {
      const mean = utils.reduce((a, b) => a + b, 0) / utils.length;
      // 평균이 높으면서 편차가 작은 장소를 선호한다
      return mean - 0.7 * stdev(utils);
    }
  }
}

export function buildConsensus(input: ConsensusInput): ConsensusResult {
  const { submissions: subs, nights, strategy } = input;
  const allowPartial = input.allowPartial ?? true;
  const days = nights + 1;
  // 하루에 '고른 장소'를 넣을 자리. 식사·카페는 배치 단계에서 따로 채우므로 적게 잡는다.
  const slotsPerDay = input.slotsPerDay ?? 3;
  const capacity = days * slotsPerDay;

  // 1. 예산 하드 제약 — 가장 낮은 상한
  const groupBudget = Math.min(...subs.map((s) => s.budget));
  const groupWalk = Math.min(...subs.map((s) => s.walkLimit));

  // 2. 후보 수집 (누군가 고른 곳만)
  const candidateIds = new Set<string>();
  subs.forEach((s) => s.picks.forEach((p) => candidateIds.add(p)));

  const vetoed = new Set(subs.map((s) => s.veto).filter(Boolean) as string[]);

  const selections: Selection[] = [];
  const excluded: Selection[] = [];

  const makeSel = (place: Place, tier: Selection["tier"], participants: string[]): Selection => ({
    place,
    votes: subs.filter((s) => s.picks.includes(place.id)).length,
    mustOf: subs.find((s) => s.must === place.id)?.memberId ?? null,
    tier,
    participants,
  });

  // 3. 거부된 장소 제외
  candidateIds.forEach((id) => {
    if (vetoed.has(id)) {
      const place = findPlace(id);
      if (place) excluded.push({ ...makeSel(place, "option", []), excluded: "veto" });
    }
  });

  const alive = [...candidateIds].filter((id) => !vetoed.has(id)).map((id) => findPlace(id)).filter((p): p is Place => !!p);

  // 4. 각자의 '꼭'을 먼저 확정
  const allIds = new Set<string>();
  subs.forEach((s) => {
    if (!s.must || vetoed.has(s.must)) return;
    const place = findPlace(s.must);
    if (!place || allIds.has(place.id)) return;
    allIds.add(place.id);
    selections.push(makeSel(place, "core", subs.map((x) => x.memberId)));
  });

  // 5. 나머지를 전략 점수 순으로 채운다
  const rest = alive
    .filter((p) => !allIds.has(p.id))
    .map((p) => ({ place: p, score: scorePlace(p, subs, strategy) }))
    .sort((a, b) => b.score - a.score);

  let cost = selections.reduce((s, x) => s + x.place.cost, 0);
  const options: Place[] = [];

  for (const { place } of rest) {
    // 자리가 찼으면 코어로는 못 넣지만, 원하는 사람이 있으면 자유시간 일정으로 돌린다
    if (selections.filter((s) => s.tier === "core").length >= capacity) {
      const wants = subs.filter((s) => s.picks.includes(place.id) && place.cost <= s.budget * 0.5);
      if (allowPartial && wants.length > 0 && options.length < capacity) {
        selections.push(makeSel(place, "option", wants.map((s) => s.memberId)));
        options.push(place);
        continue;
      }
      excluded.push({ ...makeSel(place, "option", []), excluded: "time" });
      continue;
    }
    // 전원이 감당 가능한가
    if (cost + place.cost <= groupBudget) {
      selections.push(makeSel(place, "core", subs.map((s) => s.memberId)));
      cost += place.cost;
      continue;
    }
    // 전원은 안 되지만 일부는 가능한가 → 옵션
    if (allowPartial) {
      const canJoin = subs
        .filter((s) => cost + place.cost <= s.budget)
        .map((s) => s.memberId);
      const wants = subs.filter((s) => s.picks.includes(place.id)).map((s) => s.memberId);
      const participants = canJoin.filter((id) => wants.includes(id));
      if (participants.length > 0) {
        selections.push(makeSel(place, "option", participants));
        continue;
      }
    }
    excluded.push({ ...makeSel(place, "option", []), excluded: "budget" });
  }

  const core = selections.filter((s) => s.tier === "core");
  const optionSels = selections.filter((s) => s.tier === "option");
  const coreCost = core.reduce((s, x) => s + x.place.cost, 0);

  // 6. 걷기 부담 추정 — 코어 장소를 지역별로 묶었을 때의 하루 평균
  const walkPerDay = estimateWalkPerDay(core.map((s) => s.place), days);

  // 7. 만족도
  const satisfaction = subs.map((s) => satisfactionOf(s, selections, coreCost, walkPerDay));
  const scores = satisfaction.map((s) => s.score);

  return {
    strategy,
    selections,
    core,
    options: optionSels,
    excluded,
    satisfaction,
    metrics: {
      mean: scores.reduce((a, b) => a + b, 0) / scores.length,
      min: Math.min(...scores),
      std: stdev(scores),
      gini: gini(scores),
      mustKeptRate: satisfaction.filter((s) => s.mustKept).length / satisfaction.length,
      perPersonCost: coreCost,
    },
  };
}

/** 장소들을 하루치로 나눴을 때 하루 평균 도보 거리 */
export function estimateWalkPerDay(places: Place[], days: number): number {
  if (places.length < 2) return 0;
  const sorted = [...places].sort((a, b) => a.lng - b.lng || a.lat - b.lat);
  let walk = 0;
  for (let i = 1; i < sorted.length; i++) walk += travel(sorted[i - 1], sorted[i]).walkKm;
  return walk / Math.max(1, days);
}
