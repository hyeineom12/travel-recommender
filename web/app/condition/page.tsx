"use client";
import { useRouter } from "next/navigation";
import { useTrip } from "@/components/store";
import { Body, Card, Footer, Notice, Screen, SectionTitle, Slider, TopBar, won } from "@/components/ui";

const WALK_LABEL = ["3km · 많이 못 걸어요", "5km · 적당히", "7km · 꽤 걸어도 괜찮아요", "10km · 하루 종일 걸어도 돼요"];
const WALK_VALUE = [3, 5, 7, 10];

export default function Condition() {
  const router = useRouter();
  const { state, setMine } = useTrip();
  const { budget, walkLimit } = state.mine;
  const walkIdx = Math.max(0, WALK_VALUE.indexOf(walkLimit) >= 0 ? WALK_VALUE.indexOf(walkLimit) : 1);

  const submit = () => {
    router.push("/waiting");
  };

  return (
    <Screen>
      <TopBar title="내 조건 입력" subtitle="이것도 다른 사람에게 안 보여요" back="/pick" />
      <Body>
        <Notice tone="info">
          예산과 체력은 <b>말하기 어려운 정보</b>라 비공개로 받아요.
          결과에는 반영되지만 누가 얼마를 적었는지는 끝까지 공개되지 않아요.
        </Notice>

        <Card>
          <SectionTitle hint="항공·숙박 제외">이번 여행에 쓸 수 있는 돈</SectionTitle>
          <div className="mt-2 text-[26px] font-bold tabular-nums">{won(budget)}</div>
          <p className="mb-2 text-[11.5px] text-ink-500">현지에서 쓸 활동비와 식비예요.</p>
          <Slider value={budget} min={100000} max={500000} step={10000}
            onChange={(v) => setMine({ budget: v })} left="10만원" right="50만원" />
          <p className="mt-2 text-[11px] leading-relaxed text-ink-300">
            그룹 예산은 가장 빠듯한 분에게 맞춰요. 그래야 아무도 무리하지 않아요.
          </p>
        </Card>

        <Card>
          <SectionTitle>하루에 얼마나 걸을 수 있나요</SectionTitle>
          <div className="mt-2 text-[18px] font-bold">{WALK_LABEL[walkIdx]}</div>
          <div className="mt-2">
            <Slider value={walkIdx} min={0} max={3} step={1}
              onChange={(i) => setMine({ walkLimit: WALK_VALUE[i] })} left="조금만" right="많이" />
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-ink-300">
            지도 좌표로 실제 걷는 거리를 계산해서, 한계를 넘으면 일부를 자유 선택으로 돌려요.
          </p>
        </Card>

        <Card>
          <SectionTitle>하루 활동 시간</SectionTitle>
          <div className="mt-2 text-[18px] font-bold">{Math.round(state.mine.activeMin / 60)}시간</div>
          <div className="mt-2">
            <Slider value={state.mine.activeMin} min={300} max={600} step={60}
              onChange={(v) => setMine({ activeMin: v })} left="5시간" right="10시간" />
          </div>
        </Card>
      </Body>
      <Footer>
        <button onClick={submit} className="btn-primary w-full">입력 마치기</button>
      </Footer>
    </Screen>
  );
}
