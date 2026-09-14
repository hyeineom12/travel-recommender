import type { Submission } from "./types";

/**
 * 데모용 다른 참여자 4명의 입력.
 * 서로 취향·예산·체력이 겹치기도 하고 갈리기도 하도록 구성했다.
 */
export const DEMO_SUBMISSIONS: Submission[] = [
  {
    // 도심·전망 선호, 예산 여유 있음
    memberId: "yunjin",
    picks: ["osaka_castle", "shinsaibashi", "kuromon", "harukas", "rikuro"],
    must: "harukas",
    veto: "usj",
    budget: 320000,
    walkLimit: 7,
    activeMin: 480,
  },
  {
    // 체험·베이 지역 선호, 많이 못 걸음
    memberId: "joeun",
    picks: ["kaiyukan", "tempozan", "glico", "ichiran", "namba_parks"],
    must: "kaiyukan",
    veto: "tennoji_zoo",
    budget: 280000,
    walkLimit: 5,
    activeMin: 360,
  },
  {
    // 문화·자연 선호, 체력 좋고 예산 넉넉함
    memberId: "minseo",
    picks: ["nakazaki", "amemura", "nmao", "science_museum", "sumiyoshi"],
    must: "nakazaki",
    veto: null,
    budget: 400000,
    walkLimit: 9,
    activeMin: 540,
  },
  {
    // 신세카이·레트로 선호, 예산이 가장 빠듯함
    memberId: "doyun",
    picks: ["daruma", "tsutenkaku", "shinsekai", "tennoji_zoo", "donki_umeda"],
    must: "daruma",
    veto: "nmao",
    budget: 150000,
    walkLimit: 6,
    activeMin: 420,
  },
];

/** 데모에서 '나'의 기본값 — 사용자가 바꾼다 */
export const MY_DEFAULT: Submission = {
  memberId: "me",
  picks: [],
  must: null,
  veto: null,
  budget: 300000,
  walkLimit: 6,
  activeMin: 480,
};
