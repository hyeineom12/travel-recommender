"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTrip } from "@/components/store";
import { MEMBERS } from "@/lib/places";
import { Avatar, Body, Card, Notice, Screen, SectionTitle, TopBar } from "@/components/ui";

export default function Waiting() {
  const router = useRouter();
  const { set } = useTrip();
  const [doneCount, setDone] = useState(1);

  useEffect(() => {
    if (doneCount >= MEMBERS.length) {
      const t = setTimeout(() => {
        set({ submitted: true });
        router.push("/result");
      }, 900);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setDone((c) => c + 1), 700);
    return () => clearTimeout(t);
  }, [doneCount, router, set]);

  return (
    <Screen>
      <TopBar title="의견을 모으고 있어요" />
      <Body className="justify-center">
        <Card>
          <SectionTitle hint={`${doneCount}/${MEMBERS.length}명`}>참여 현황</SectionTitle>
          <div className="mt-4 space-y-3">
            {MEMBERS.map((m, i) => {
              const ok = i < doneCount;
              return (
                <div key={m.id} className="flex items-center gap-3">
                  <Avatar name={m.name} color={ok ? m.color : "#d6dae4"} size={34} />
                  <span className={`flex-1 text-[13.5px] font-semibold ${ok ? "" : "text-ink-300"}`}>
                    {m.name}{m.id === "me" && " (나)"}
                  </span>
                  <span className={`chip ${ok ? "bg-emerald-50 text-emerald-700" : "bg-surface text-ink-300"}`}>
                    {ok ? "완료" : "입력 중"}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-surface">
            <div className="h-full rounded-full bg-brand-600 transition-all duration-500"
              style={{ width: `${(doneCount / MEMBERS.length) * 100}%` }} />
          </div>
        </Card>

        <Notice tone="info">
          누가 무엇을 골랐는지는 <b>결과에서도 공개되지 않아요.</b> 몇 명이 겹쳤는지만 보여드려요.
        </Notice>
      </Body>
    </Screen>
  );
}
