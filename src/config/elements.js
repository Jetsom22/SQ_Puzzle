/**
 * 속성(Element) 정의
 * ------------------------------------------------------------
 * - 새 속성 추가: ELEMENTS 에 항목 추가 → ELEMENT_CHART.strongAgainst 에 상성 관계 추가.
 *   (UI 색상/아이콘, 손패 생성, AI, 보드 랜덤 생성이 모두 이 목록을 기준으로 동작)
 * - key  : 보드 레이아웃 문자열(boards.js)에서 해당 속성 블록을 "고정 배치"할 때 쓰는 한 글자
 * - icon : ui/icons.js 의 아이콘 id (없으면 name 첫 글자로 표시)
 */
export const ELEMENTS = [
  { id: 'fire',  key: 'F', name: '불',   color: '#e0474c', icon: 'fire' },
  { id: 'water', key: 'W', name: '물',   color: '#2f80e4', icon: 'water' },
  { id: 'wind',  key: 'A', name: '바람', color: '#6cad2f', icon: 'wind' },
  { id: 'earth', key: 'E', name: '땅',   color: '#ee9b2d', icon: 'earth' },
];

/**
 * 속성 상성표
 * - strongAgainst[공격 속성] = [유리한 대상 속성...]
 * - 기획서: 불 → 바람 → 땅 → 물 → 불
 * - 유리: 추가 데미지 +20%, 상대가 유리: 받는 피해 -20%
 */
export const ELEMENT_CHART = {
  strongAgainst: {
    fire: ['wind'],
    wind: ['earth'],
    earth: ['water'],
    water: ['fire'],
  },
  advantageDamageBonus: 0.2,
  advantageDamageReduction: 0.2,
};
