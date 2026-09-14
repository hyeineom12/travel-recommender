"use client";
import Link from "next/link";
import { useTrip } from "@/components/store";
import { MEMBERS } from "@/lib/places";
import { Avatar, Body, Screen } from "@/components/ui";

export default function Home() {
  const { state, reset } = useTrip();
  return (
    <Screen className="bg-gradient-to-b from-brand-600 via-brand-500 to-brand-400 text-white">
      <Body className="flex flex-col justify-between pt-16">
        <div>
          <div className="mb-6 inline-flex rounded-full bg-white/15 px-3 py-1.5 text-[11px] font-semibold">
            캡스톤 프로토타입
          </div>
          <h1 className="text-[30px] font-bold leading-[1.25]">
            가고 싶은 곳 5개만
            <br />
            고르면 돼요
          </h1>
          <p className="mt-4 text-[14px] leading-relaxed text-white/80">
            예산도 체력도 서로에게 보이지 않아요.
            <br />
            아무도 무리하지 않는 일정을 만들어 드릴게요.
          </p>

          <div className="mt-8 rounded-2xl bg-white/12 p-4">
            <div className="text-[12px] text-white/70">이번 여행</div>
            <div className="mt-1 text-[18px] font-bold">오사카 {state.nights}박 {state.nights + 1}일</div>
            <div className="mt-3 flex -space-x-1.5">
              {MEMBERS.map((m) => (
                <span key={m.id} className="rounded-full border-2 border-brand-500">
                  <Avatar name={m.name} color={m.color} size={32} />
                </span>
              ))}
            </div>
            <div className="mt-2 text-[11.5px] text-white/70">
              {MEMBERS.map((m) => m.name).join(", ")} · 5명
            </div>
          </div>

          <div className="mt-4 space-y-2">
            {[
              { t: "혼자 조용히 고르기", d: "남이 뭘 골랐는지 안 보여요" },
              { t: "꼭 가고 싶은 곳 보장", d: "모두 한 곳씩은 반드시 지켜요" },
              { t: "다 같이 vs 원하는 사람만", d: "모든 곳을 함께 갈 필요는 없어요" },
            ].map((f) => (
              <div key={f.t} className="rounded-2xl bg-white/12 px-3.5 py-3">
                <div className="text-[13.5px] font-semibold">{f.t}</div>
                <div className="text-[11.5px] text-white/70">{f.d}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2.5 pt-8">
          <Link href="/pick" className="btn w-full bg-white text-brand-700 hover:bg-white/90">
            시작하기
          </Link>
          <button onClick={reset} className="btn w-full bg-white/10 text-white hover:bg-white/20">
            처음부터 다시하기
          </button>
          <p className="pt-1 text-center text-[11px] text-white/60">
            다른 4명은 이미 입력을 마친 상태예요
          </p>
        </div>
      </Body>
    </Screen>
  );
}
