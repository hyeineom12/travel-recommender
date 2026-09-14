"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTrip } from "@/components/store";
import { CATEGORIES, PLACES, PLACE_MAP } from "@/lib/places";
import { Body, Card, Dot, Footer, Notice, Screen, SectionTitle, TopBar, won } from "@/components/ui";
import type { CategoryId } from "@/lib/types";

const LIMIT = 5;

export default function Pick() {
  const router = useRouter();
  const { state, setMine } = useTrip();
  const { picks, must, veto } = state.mine;
  const [filter, setFilter] = useState<CategoryId | "all">("all");
  const [mode, setMode] = useState<"pick" | "veto">("pick");

  const list = useMemo(
    () => (filter === "all" ? PLACES : PLACES.filter((p) => p.category === filter)),
    [filter]
  );

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

  const done = picks.length === LIMIT && !!must;

  return (
    <Screen>
      <TopBar title="가고 싶은 곳 고르기" subtitle="오사카 36곳 중에서 5곳" back="/" />
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

        {picks.length > 0 && (
          <Card className="animate-slideup">
            <SectionTitle hint="하나만 고르세요">꼭 가고 싶은 곳</SectionTitle>
            <p className="mt-1 text-[11.5px] text-ink-500">
              여기 고른 한 곳은 다른 사람과 겹치지 않아도 일정에 꼭 들어가요.
            </p>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {picks.map((id) => (
                <button key={id} onClick={() => setMine({ must: id })}
                  className={`chip transition ${must === id ? "bg-brand-600 text-white" : "bg-surface text-ink-700"}`}>
                  {must === id && "★ "}{PLACE_MAP[id].name}
                </button>
              ))}
            </div>
          </Card>
        )}

        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          <button onClick={() => setFilter("all")}
            className={`shrink-0 rounded-full px-3 py-1.5 text-[12px] font-semibold ${
              filter === "all" ? "bg-ink-900 text-white" : "bg-white text-ink-500"}`}>전체</button>
          {CATEGORIES.map((c) => (
            <button key={c.id} onClick={() => setFilter(c.id)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold ${
                filter === c.id ? "bg-ink-900 text-white" : "bg-white text-ink-500"}`}>
              <Dot category={c.id} size={6} />{c.label}
            </button>
          ))}
        </div>

        <div className="space-y-2">
          {list.map((p) => {
            const picked = picks.includes(p.id);
            const vetoed = veto === p.id;
            const isMust = must === p.id;
            return (
              <button key={p.id} onClick={() => toggle(p.id)} className="w-full text-left">
                <Card className={`transition ${
                  vetoed ? "border-2 border-coral-500 bg-coral-50/40"
                  : picked ? "border-2 border-brand-500" : "border-2 border-transparent hover:bg-surface"}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        {isMust && <span className="text-brand-600">★</span>}
                        <span className="truncate text-[14px] font-bold">{p.name}</span>
                      </div>
                      <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-ink-500">
                        <Dot category={p.category} size={6} />
                        {p.area} · {p.stayMin}분
                        {p.covered && <span className="chip bg-surface text-ink-500">실내</span>}
                      </div>
                      <p className="mt-1 text-[11.5px] leading-relaxed text-ink-500">{p.blurb}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-[12px] font-semibold tabular-nums">
                        {p.cost ? won(p.cost) : "무료"}
                      </div>
                      {vetoed && <div className="mt-1 text-[10.5px] font-bold text-coral-500">제외</div>}
                    </div>
                  </div>
                </Card>
              </button>
            );
          })}
        </div>
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
