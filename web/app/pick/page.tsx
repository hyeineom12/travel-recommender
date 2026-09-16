"use client";
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTrip } from "@/components/store";
import { AREAS, CATEGORIES, CATEGORY_MAP, allPlaces, findPlace } from "@/lib/places";
import { Body, Card, Dot, Footer, Notice, Screen, SectionTitle, TopBar, won } from "@/components/ui";
import type { CategoryId, Place } from "@/lib/types";

const LIMIT = 5;

/** 검색 패널을 처음 열었을 때 보여줄 추천 개수 */
const SUGGEST = 6;

/** 이름·지역·카테고리·소개문 어디든 걸리면 결과로 본다 */
function match(p: Place, q: string) {
  const hay = `${p.name} ${p.area} ${CATEGORY_MAP[p.category].label} ${p.blurb}`.toLowerCase();
  return hay.includes(q.trim().toLowerCase());
}

export default function Pick() {
  const router = useRouter();
  const { state, setMine, addPlace } = useTrip();
  const { picks, must, veto } = state.mine;

  const [mode, setMode] = useState<"pick" | "veto">("pick");
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<CategoryId | null>(null);
  const [adding, setAdding] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const pool = useMemo(() => allPlaces(), [state.customPlaces]);

  const results = useMemo(() => {
    const q = query.trim();
    if (!q && !category) return [...pool].sort((a, b) => b.popularity - a.popularity).slice(0, SUGGEST);
    let list = pool;
    if (category) list = list.filter((p) => p.category === category);
    if (q) list = list.filter((p) => match(p, q));
    return list;
  }, [pool, query, category]);

  const openSearch = () => {
    setOpen(true);
    setAdding(false);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const closeSearch = () => {
    setOpen(false);
    setAdding(false);
    setQuery("");
    setCategory(null);
  };

  const toggle = (id: string) => {
    if (mode === "veto") {
      setMine({ veto: veto === id ? null : id, picks: picks.filter((p) => p !== id) });
      return;
    }
    if (veto === id) return;
    if (picks.includes(id)) {
      setMine({ picks: picks.filter((p) => p !== id), must: must === id ? null : must });
    } else if (picks.length < LIMIT) {
      setMine({ picks: [...picks, id] });
    }
  };

  const onAdded = (place: Place) => {
    if (mode === "veto") setMine({ veto: place.id, picks: picks.filter((p) => p !== place.id) });
    else if (picks.length < LIMIT) setMine({ picks: [...picks, place.id] });
    setAdding(false);
    setQuery("");
    setCategory(null);
  };

  const full = mode === "pick" && picks.length >= LIMIT;
  const done = picks.length === LIMIT && !!must;

  return (
    <Screen>
      <TopBar title="가고 싶은 곳 고르기" subtitle={`검색해서 ${LIMIT}곳 고르기`} back="/" />
      <Body>
        <Notice tone="info">
          <b>다른 사람에게 보이지 않아요.</b> 눈치 보지 말고 진짜 가고 싶은 곳을 고르세요.
        </Notice>

        <div className="flex gap-1.5">
          <button onClick={() => setMode("pick")}
            className={`flex-1 rounded-2xl py-2.5 text-[13px] font-semibold transition ${
              mode === "pick" ? "bg-brand-600 text-white" : "bg-surface text-ink-500"}`}>
            가고 싶은 곳 {picks.length}/{LIMIT}
          </button>
          <button onClick={() => setMode("veto")}
            className={`flex-1 rounded-2xl py-2.5 text-[13px] font-semibold transition ${
              mode === "veto" ? "bg-coral-500 text-white" : "bg-surface text-ink-500"}`}>
            빼고 싶은 곳 {veto ? 1 : 0}/1
          </button>
        </div>

        {/* 검색창 — 닫혀 있으면 입력칸 모양의 버튼, 누르면 패널이 열린다 */}
        {!open ? (
          <button onClick={openSearch}
            className="flex w-full items-center gap-2 rounded-2xl border border-black/5 bg-white px-4 py-3 text-left text-[13.5px] text-ink-300 shadow-sm">
            <span aria-hidden>🔍</span>
            {mode === "veto" ? "빼고 싶은 곳 검색" : "가고 싶은 곳 검색"}
          </button>
        ) : (
          <div className="space-y-2.5">
            <div className="flex items-center gap-2">
              <div className="flex flex-1 items-center gap-2 rounded-2xl border border-brand-500 bg-white px-4 py-3">
                <span aria-hidden>🔍</span>
                <input ref={inputRef} value={query} onChange={(e) => setQuery(e.target.value)}
                  placeholder="장소 이름 · 지역으로 검색"
                  className="w-full bg-transparent text-[13.5px] outline-none placeholder:text-ink-300" />
                {query && (
                  <button onClick={() => setQuery("")} aria-label="지우기" className="text-ink-300">×</button>
                )}
              </div>
              <button onClick={closeSearch} className="shrink-0 text-[13px] font-semibold text-ink-500">닫기</button>
            </div>

            {/* 카테고리 — 검색어 대신 여기서 골라도 된다 */}
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
              {CATEGORIES.map((c) => (
                <button key={c.id} onClick={() => setCategory(category === c.id ? null : c.id)}
                  className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold ${
                    category === c.id ? "bg-ink-900 text-white" : "bg-white text-ink-500"}`}>
                  <Dot category={c.id} size={6} />{c.label}
                </button>
              ))}
            </div>

            {adding ? (
              <AddPlaceForm
                initialName={query}
                initialCategory={category}
                onCancel={() => setAdding(false)}
                onSubmit={(input) => onAdded(addPlace(input))}
              />
            ) : (
              <>
                {!query && !category && (
                  <p className="px-1 text-[11.5px] text-ink-500">
                    카테고리를 고르거나 이름으로 검색하세요. 아래는 많이 가는 곳이에요.
                  </p>
                )}

                <div className="space-y-2">
                  {results.map((p) => (
                    <PlaceRow key={p.id} place={p}
                      picked={picks.includes(p.id)} vetoed={veto === p.id} isMust={must === p.id}
                      disabled={full && !picks.includes(p.id) && mode === "pick"}
                      onClick={() => toggle(p.id)} />
                  ))}
                </div>

                {results.length === 0 && (
                  <p className="px-1 py-2 text-[12.5px] text-ink-500">
                    {query ? `"${query.trim()}" 검색 결과가 없어요.` : "이 카테고리에 장소가 없어요."}
                  </p>
                )}

                {/* 없으면 직접 추가 */}
                <button onClick={() => setAdding(true)}
                  className="w-full rounded-2xl border border-dashed border-brand-500/60 bg-brand-50/40 px-4 py-3 text-[13px] font-semibold text-brand-600">
                  {query.trim() ? `"${query.trim()}" 직접 추가하기` : "찾는 곳이 없나요? 직접 추가하기"}
                </button>
              </>
            )}
          </div>
        )}

        {/* 고른 것 */}
        {picks.length > 0 && (
          <Card className="animate-slideup">
            <SectionTitle hint="하나만 고르세요">꼭 가고 싶은 곳</SectionTitle>
            <p className="mt-1 text-[11.5px] text-ink-500">
              여기 고른 한 곳은 다른 사람과 겹치지 않아도 일정에 꼭 들어가요.
            </p>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {picks.map((id) => {
                const p = findPlace(id);
                if (!p) return null;
                return (
                  <span key={id}
                    className={`chip flex items-center gap-1.5 transition ${
                      must === id ? "bg-brand-600 text-white" : "bg-surface text-ink-700"}`}>
                    <button onClick={() => setMine({ must: id })}>
                      {must === id && "★ "}{p.name}
                    </button>
                    <button onClick={() => toggle(id)} aria-label={`${p.name} 빼기`}
                      className="opacity-60">×</button>
                  </span>
                );
              })}
            </div>
          </Card>
        )}

        {veto && (
          <Card>
            <SectionTitle>빼고 싶은 곳</SectionTitle>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              <span className="chip flex items-center gap-1.5 bg-coral-50 text-coral-500">
                {findPlace(veto)?.name ?? veto}
                <button onClick={() => setMine({ veto: null })} aria-label="빼고 싶은 곳 해제"
                  className="opacity-60">×</button>
              </span>
            </div>
          </Card>
        )}
      </Body>
      <Footer>
        <button onClick={() => router.push("/condition")} disabled={!done} className="btn-primary w-full">
          {picks.length < LIMIT
            ? `${LIMIT - picks.length}곳 더 골라주세요`
            : !must ? "꼭 가고 싶은 곳을 골라주세요" : "다음"}
        </button>
      </Footer>
    </Screen>
  );
}

function PlaceRow({ place: p, picked, vetoed, isMust, disabled, onClick }: {
  place: Place; picked: boolean; vetoed: boolean; isMust: boolean; disabled: boolean; onClick: () => void;
}) {
  return (
    <button onClick={onClick} disabled={disabled} className="w-full text-left disabled:opacity-45">
      <Card className={`transition ${
        vetoed ? "border-2 border-coral-500 bg-coral-50/40"
        : picked ? "border-2 border-brand-500" : "border-2 border-transparent hover:bg-surface"}`}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              {isMust && <span className="text-brand-600">★</span>}
              <span className="truncate text-[14px] font-bold">{p.name}</span>
              {p.custom && <span className="chip bg-brand-50 text-brand-600">직접 추가</span>}
            </div>
            <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-ink-500">
              <Dot category={p.category} size={6} />
              {p.area} · {p.stayMin}분
              {p.covered && <span className="chip bg-surface text-ink-500">실내</span>}
            </div>
            <p className="mt-1 text-[11.5px] leading-relaxed text-ink-500">{p.blurb}</p>
          </div>
          <div className="shrink-0 text-right">
            <div className="text-[12px] font-semibold tabular-nums">{p.cost ? won(p.cost) : "무료"}</div>
            {vetoed && <div className="mt-1 text-[10.5px] font-bold text-coral-500">제외</div>}
          </div>
        </div>
      </Card>
    </button>
  );
}

function AddPlaceForm({ initialName, initialCategory, onCancel, onSubmit }: {
  initialName: string;
  initialCategory: CategoryId | null;
  onCancel: () => void;
  onSubmit: (input: { name: string; category: CategoryId; area: string; cost?: number; stayMin?: number }) => void;
}) {
  const [name, setName] = useState(initialName.trim());
  const [category, setCategory] = useState<CategoryId>(initialCategory ?? "landmark");
  const [area, setArea] = useState(AREAS[0]);
  const [cost, setCost] = useState("");
  const [stayMin, setStayMin] = useState("");

  const valid = name.trim().length > 0;
  const field = "w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-[13px] outline-none focus:border-brand-500";

  return (
    <Card className="animate-slideup space-y-3">
      <SectionTitle hint="비워두면 평균값">장소 직접 추가</SectionTitle>
      <p className="text-[11.5px] leading-relaxed text-ink-500">
        위치는 고른 지역의 중심으로 잡혀요. 동선·이동 시간은 대략값으로 계산됩니다.
      </p>

      <label className="block space-y-1">
        <span className="text-[11.5px] font-semibold text-ink-500">이름</span>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="예) 신세카이 츠텐카쿠" className={field} />
      </label>

      <div className="space-y-1">
        <span className="text-[11.5px] font-semibold text-ink-500">카테고리</span>
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((c) => (
            <button key={c.id} onClick={() => setCategory(c.id)}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold ${
                category === c.id ? "bg-ink-900 text-white" : "bg-surface text-ink-500"}`}>
              <Dot category={c.id} size={6} />{c.label}
            </button>
          ))}
        </div>
      </div>

      <label className="block space-y-1">
        <span className="text-[11.5px] font-semibold text-ink-500">지역</span>
        <select value={area} onChange={(e) => setArea(e.target.value)} className={field}>
          {AREAS.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
      </label>

      <div className="flex gap-2">
        <label className="block flex-1 space-y-1">
          <span className="text-[11.5px] font-semibold text-ink-500">1인 예상 비용(원)</span>
          <input value={cost} onChange={(e) => setCost(e.target.value.replace(/[^0-9]/g, ""))}
            inputMode="numeric" placeholder="예) 12000" className={field} />
        </label>
        <label className="block flex-1 space-y-1">
          <span className="text-[11.5px] font-semibold text-ink-500">머무는 시간(분)</span>
          <input value={stayMin} onChange={(e) => setStayMin(e.target.value.replace(/[^0-9]/g, ""))}
            inputMode="numeric" placeholder="예) 60" className={field} />
        </label>
      </div>

      <div className="flex gap-2 pt-1">
        <button onClick={onCancel} className="flex-1 rounded-2xl bg-surface py-2.5 text-[13px] font-semibold text-ink-500">
          취소
        </button>
        <button disabled={!valid}
          onClick={() => onSubmit({
            name, category, area,
            cost: cost ? Number(cost) : undefined,
            stayMin: stayMin ? Number(stayMin) : undefined,
          })}
          className="btn-primary flex-1 disabled:opacity-40">
          추가하고 선택
        </button>
      </div>
    </Card>
  );
}
