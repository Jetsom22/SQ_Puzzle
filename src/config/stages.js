/**
 * 스테이지 정의
 * ------------------------------------------------------------
 * layout    : boards.js 의 id (없으면 rules.board.layout)
 * turnLimit : 제한 턴 (없으면 rules.turn.limit)
 * waves     : 웨이브별 몬스터 id 배열
 * rules     : (선택) 이 스테이지에서만 덮어쓸 규칙 — RULES 와 동일 구조의 부분 객체
 */
export const STAGES = {
  'story-1-1': {
    name: 'Stage 1-1 · Discover a new world',
    layout: 'classic',
    turnLimit: 20,
    waves: [
      ['hornWolf', 'windSprite'],
      ['succubusImp', 'furyHornWolf', 'hornWolf'],
      ['succubusQueen'],
    ],
  },
  'event-center': {
    name: 'Event · Center All Block',
    layout: 'centerAll',
    turnLimit: 15,
    waves: [
      ['windSprite', 'hornWolf', 'succubusImp'],
      ['succubusQueen'],
    ],
  },
  'event-4x4': {
    name: 'Event · 4x4 Battle (좌우 대칭)',
    layout: 'event4x4',
    turnLimit: 15,
    rules: { placement: { rule: 'mirrorH' } },
    waves: [
      ['succubusImp', 'succubusImp'],
      ['succubusQueen'],
    ],
  },
  'raid-6x6': {
    name: 'Raid · 6x6 Boss',
    layout: 'wide6x6',
    turnLimit: 12,
    waves: [['raidQueen']],
  },
};
