/**
 * 플레이어 캐릭터 정의
 * ------------------------------------------------------------
 * element : elements.js 의 id
 * attack  : 기본 공격 방식 { target, ratio } — target 은 skills.js 의 target 규칙과 동일
 *           (예: 멀티 공격 캐릭터 → { target: 'enemyAll', ratio: 0.6 })
 * skill / leaderSkill / passive : skills.js 의 id
 */
export const CHARACTERS = {
  redKnight: {
    name: '레드 나이트', element: 'fire', star: 3,
    hp: 900, atk: 110,
    skill: 'crimsonSlash', leaderSkill: 'flameBanner',
  },
  aquaSage: {
    name: '아쿠아 세이지', element: 'water', star: 3,
    hp: 820, atk: 95,
    skill: 'tidalBlessing',
  },
  jetsomK: {
    name: '인형사 젯솜-K', element: 'wind', star: 3,
    hp: 840, atk: 100,
    skill: 'verdantWeave',
  },
  laclaire: {
    name: '견습 마녀 라클레르', element: 'earth', star: 3,
    hp: 860, atk: 80,
    attack: { target: 'enemyAll', ratio: 0.7 },
    skill: 'harvestScythe',
  },
  dragonDancer: {
    name: '용의 무희', element: 'earth', star: 3,
    hp: 1000, atk: 105,
    skill: 'dragonFist', passive: 'ironBody',
  },
  prismFairy: {
    name: '프리즘 요정', element: 'water', star: 3,
    hp: 760, atk: 100,
    skill: 'rainbowPrism',
  },
};

/** 기본 출전 팀 (5인). leader = members 인덱스 */
export const DEFAULT_TEAM = {
  members: ['redKnight', 'aquaSage', 'jetsomK', 'laclaire', 'dragonDancer'],
  leader: 0,
};
