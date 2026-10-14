/**
 * 게임 데이터 집합 — 다른 프로젝트로 변형할 때는 이 파일이 import 하는 모듈만 교체하면 됩니다.
 */
import { ELEMENTS, ELEMENT_CHART } from './elements.js';
import { RULES } from './rules.js';
import { BOARD_LAYOUTS } from './boards.js';
import { SKILLS } from './skills.js';
import { CHARACTERS, DEFAULT_TEAM } from './characters.js';
import { MONSTERS } from './monsters.js';
import { STAGES } from './stages.js';

export const GAME_DATA = {
  elements: ELEMENTS,
  elementChart: ELEMENT_CHART,
  boards: BOARD_LAYOUTS,
  skills: SKILLS,
  characters: CHARACTERS,
  monsters: MONSTERS,
  stages: STAGES,
  defaultTeam: DEFAULT_TEAM,
};

export const DEFAULT_RULES = RULES;
