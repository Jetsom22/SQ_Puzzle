/**
 * 몬스터 정의
 * ------------------------------------------------------------
 * attackInterval : N턴마다 행동 (카운트다운 → 0 이 되면 행동 후 리셋)
 * pattern        : 행동 순서대로 skills.js id 를 나열 (순환)
 * boss           : UI 강조용
 */
export const MONSTERS = {
  hornWolf: {
    name: '호른 울프', element: 'earth', star: 1, level: 1,
    hp: 900, atk: 90, attackInterval: 2,
    pattern: ['bite'],
  },
  furyHornWolf: {
    name: '분노의 호른 울프', element: 'fire', star: 2, level: 3,
    hp: 1300, atk: 110, attackInterval: 3,
    pattern: ['bite', 'howl', 'bite'],
  },
  succubusImp: {
    name: '서큐버스 (정령)', element: 'fire', star: 2, level: 2,
    hp: 950, atk: 95, attackInterval: 2,
    pattern: ['bite', 'drainKiss'],
  },
  windSprite: {
    name: '바람 정령', element: 'wind', star: 1, level: 2,
    hp: 900, atk: 90, attackInterval: 2,
    pattern: ['bite'],
  },
  succubusQueen: {
    name: '서큐버스 퀸', element: 'fire', star: 4, level: 10, boss: true,
    hp: 6000, atk: 150, attackInterval: 3,
    pattern: ['charmStorm', 'darkWorld', 'drainKiss'],
  },
  raidQueen: {
    name: '심연의 서큐버스 퀸', element: 'water', star: 5, level: 30, boss: true,
    hp: 7500, atk: 170, attackInterval: 2,
    pattern: ['bite', 'darkWorld', 'charmStorm', 'drainKiss'],
  },
};
