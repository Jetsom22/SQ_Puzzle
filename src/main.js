import { App } from './ui/App.js';

/** 1920x1080 스테이지를 창 크기에 맞춰 레터박스 스케일 */
const stage = document.getElementById('stage');
function fit() {
  const k = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
  stage.style.transform = `scale(${k})`;
  stage.style.left = `${(window.innerWidth - 1920 * k) / 2}px`;
  stage.style.top = `${(window.innerHeight - 1080 * k) / 2}px`;
}
window.addEventListener('resize', fit);
fit();

window.app = new App(stage);
