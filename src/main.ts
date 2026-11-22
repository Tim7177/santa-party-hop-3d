import './style.css';
import { EGG_LIST, getRankTitle } from './game/constants';
import { GameEngine } from './game/GameEngine';
import { CharacterSkin, EasterEggMeta, FloatingMessage, GameSnapshot } from './game/types';

// DOM 引用
const canvasContainer = document.getElementById('canvas-container')!;
const floatingLayer = document.getElementById('floating-layer')!;
const toastContainer = document.getElementById('toast-container')!;

const hudEl = document.getElementById('hud')!;
const bottomHudEl = document.getElementById('bottom-hud')!;
const tutorialHintEl = document.getElementById('tutorial-hint')!;
const powerBarWrapEl = document.getElementById('power-bar-wrap')!;
const powerBarFillEl = document.getElementById('power-bar-fill')!;

const scoreValueEl = document.getElementById('score-value')!;
const hudBestEl = document.getElementById('hud-best')!;
const comboBadgeEl = document.getElementById('combo-badge')!;
const comboTextEl = document.getElementById('combo-text')!;
const buffListEl = document.getElementById('buff-list')!;
const eggProgressEl = document.getElementById('egg-progress')!;
const startEggCountEl = document.getElementById('start-egg-count')!;

const stayHintEl = document.getElementById('stay-hint')!;
const stayCircleEl = document.getElementById('stay-circle') as unknown as SVGCircleElement;
const stayEmojiEl = document.getElementById('stay-emoji')!;
const stayLabelEl = document.getElementById('stay-label')!;

const startScreenEl = document.getElementById('start-screen')!;
const gameoverScreenEl = document.getElementById('gameover-screen')!;
const eggModalEl = document.getElementById('egg-modal')!;
const eggGridEl = document.getElementById('egg-grid')!;

const rankBadgeEl = document.getElementById('rank-badge')!;
const finalScoreEl = document.getElementById('final-score')!;
const finalBestEl = document.getElementById('final-best')!;
const finalComboEl = document.getElementById('final-combo')!;
const finalJumpsEl = document.getElementById('final-jumps')!;
const finalEggsEl = document.getElementById('final-eggs')!;
const newRecordTagEl = document.getElementById('new-record-tag')!;
const assistNoteEl = document.getElementById('assist-note')!;

const btnStart = document.getElementById('btn-start')!;
const btnRestart = document.getElementById('btn-restart')!;
const btnHome = document.getElementById('btn-home')!;
const btnOpenEggs = document.getElementById('btn-open-eggs')!;
const btnGoEggs = document.getElementById('btn-go-eggs')!;
const btnHudEggs = document.getElementById('btn-eggs')!;
const btnCloseEggs = document.getElementById('btn-close-eggs')!;
const btnGuide = document.getElementById('btn-guide')!;
const btnBgm = document.getElementById('btn-bgm')!;
const btnSfx = document.getElementById('btn-sfx')!;
const bgmIconEl = document.getElementById('bgm-icon')!;
const sfxIconEl = document.getElementById('sfx-icon')!;
const skinButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('.skin-item'));

let lastScore = 0;
let latestSnapshot: GameSnapshot | null = null;
let isModalOpen = false;
let isSpaceDown = false;
let activePointerId: number | null = null;

// 渲染飘字
function spawnFloatingText(msg: FloatingMessage): void {
  const el = document.createElement('div');
  el.className = 'float-msg';
  el.style.left = `${msg.screenX}%`;
  el.style.top = `${msg.screenY}%`;
  if (msg.scale && msg.scale !== 1) {
    el.style.fontSize = `${msg.scale}em`;
  }

  const main = document.createElement('div');
  main.className = 'float-main';
  main.textContent = msg.text;
  if (msg.color) main.style.color = msg.color;
  el.appendChild(main);

  if (msg.subtext) {
    const sub = document.createElement('div');
    sub.className = 'float-sub';
    sub.textContent = msg.subtext;
    el.appendChild(sub);
  }

  floatingLayer.appendChild(el);
  window.setTimeout(() => {
    el.remove();
  }, 1250);
}

// 渲染顶部彩蛋横幅
function showEggToast(egg: EasterEggMeta, isNew: boolean, extraDetail?: string): void {
  const toast = document.createElement('div');
  toast.className = 'egg-toast';
  toast.innerHTML = `
    <div class="toast-emoji">${egg.emoji}</div>
    <div class="toast-body">
      <div class="toast-tag">${isNew ? '🎉 解锁全新圣诞彩蛋！' : '✨ 圣诞派对彩蛋触发！'}</div>
      <div class="toast-title">${egg.name}</div>
      <div class="toast-desc">${extraDetail || egg.rewardText}</div>
    </div>
  `;
  toastContainer.appendChild(toast);

  window.setTimeout(() => {
    toast.classList.add('leaving');
    window.setTimeout(() => toast.remove(), 380);
  }, 3600);
}

// 渲染彩蛋图鉴网格
function renderEggGallery(): void {
  const unlocked = new Set(latestSnapshot?.unlockedEggs ?? []);
  eggGridEl.innerHTML = '';

  for (const egg of EGG_LIST) {
    const isUnlocked = unlocked.has(egg.id);
    const card = document.createElement('div');
    card.className = `egg-card ${isUnlocked ? 'unlocked' : 'locked'}`;
    card.innerHTML = `
      <div class="egg-card-top">
        <div class="egg-card-icon">${egg.emoji}</div>
        <div>
          <div class="egg-card-name">${egg.name}</div>
          <div class="egg-card-status">${isUnlocked ? '✅ 已发现' : '🔒 尚未发现'}</div>
        </div>
      </div>
      <div class="egg-card-hint">${egg.hint}</div>
      <div class="egg-card-reward">奖励：${egg.rewardText}</div>
    `;
    eggGridEl.appendChild(card);
  }
}

function updateHudFromSnapshot(s: GameSnapshot): void {
  latestSnapshot = s;

  // 分数跳动微动画
  scoreValueEl.textContent = String(s.score);
  if (s.score !== lastScore && s.score > 0) {
    scoreValueEl.classList.remove('bump');
    void scoreValueEl.offsetWidth;
    scoreValueEl.classList.add('bump');
    window.setTimeout(() => scoreValueEl.classList.remove('bump'), 160);
  }
  lastScore = s.score;

  hudBestEl.textContent = String(s.bestScore);

  const eggRatio = `${s.unlockedEggs.length}/${EGG_LIST.length}`;
  eggProgressEl.textContent = eggRatio;
  startEggCountEl.textContent = eggRatio;

  // 连击徽章
  if (s.combo >= 2) {
    comboBadgeEl.classList.remove('hidden');
    comboTextEl.textContent = `PERFECT ×${s.combo}`;
  } else {
    comboBadgeEl.classList.add('hidden');
  }

  // Buff 标签列表
  buffListEl.innerHTML = '';
  if (s.buffs.shield) {
    const p = document.createElement('div');
    p.className = 'buff-pill';
    p.textContent = '🛡️ 圣诞护盾生效中';
    buffListEl.appendChild(p);
  }
  if (s.buffs.doubleScoreJumps > 0) {
    const p = document.createElement('div');
    p.className = 'buff-pill fire';
    p.textContent = `🔥 暖冬双倍分 (剩 ${s.buffs.doubleScoreJumps} 跳)`;
    buffListEl.appendChild(p);
  }
  if (s.buffs.partyLightsTimer > 0.2) {
    const p = document.createElement('div');
    p.className = 'buff-pill party';
    p.textContent = '🎵 霓虹派对时光';
    buffListEl.appendChild(p);
  }

  // 首次游玩指引在跳出第 2 步后淡出
  if (s.jumps >= 2) {
    tutorialHintEl.classList.add('fade-out');
  } else {
    tutorialHintEl.classList.remove('fade-out');
  }

  // 根据游戏阶段切换主屏幕与 HUD 显隐
  const inGame = s.phase !== 'menu' && s.phase !== 'gameover';
  hudEl.classList.toggle('hidden', s.phase === 'menu');
  bottomHudEl.classList.toggle('hidden', !inGame);
  startScreenEl.classList.toggle('hidden', s.phase !== 'menu');
  if (s.phase !== 'gameover') {
    gameoverScreenEl.classList.add('hidden');
  }

  if (isModalOpen) {
    renderEggGallery();
  }
}

// 初始化 3D 游戏引擎
const engine = new GameEngine(canvasContainer, {
  onStateChange: updateHudFromSnapshot,
  onFloatingText: spawnFloatingText,
  onEggUnlocked: (egg, isNew, extraDetail) => {
    showEggToast(egg, isNew, extraDetail);
  },
  onStayProgress: (visible, progress, emoji, label) => {
    stayHintEl.classList.toggle('hidden', !visible);
    if (visible) {
      stayEmojiEl.textContent = emoji;
      stayLabelEl.textContent = label;
      const circumference = 2 * Math.PI * 18; // r = 18 => 113.097
      stayCircleEl.style.strokeDashoffset = String(circumference * (1 - progress));
    }
  },
  onChargeProgress: (ratio, charging) => {
    powerBarWrapEl.classList.toggle('visible', charging);
    powerBarFillEl.style.width = `${Math.round(ratio * 100)}%`;
  },
  onGameOver: (snapshot, isNewRecord) => {
    rankBadgeEl.textContent = getRankTitle(snapshot.score);
    finalScoreEl.textContent = String(snapshot.score);
    finalBestEl.textContent = String(snapshot.bestScore);
    finalComboEl.textContent = String(snapshot.maxCombo);
    finalJumpsEl.textContent = String(snapshot.jumps);
    finalEggsEl.textContent = `${snapshot.unlockedEggs.length}/${EGG_LIST.length}`;
    newRecordTagEl.classList.toggle('hidden', !isNewRecord);
    assistNoteEl.classList.toggle('hidden', !snapshot.usedAssist);
    gameoverScreenEl.classList.remove('hidden');
  },
});

// 同步保存的主角皮肤选中态
function syncSkinUI(activeSkin: CharacterSkin): void {
  skinButtons.forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.skin === activeSkin);
  });
}
syncSkinUI(engine.getSkin());

// ==================== UI 按钮绑定 ====================

skinButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    const skin = btn.dataset.skin as CharacterSkin;
    engine.audio.unlock();
    engine.setSkin(skin);
    syncSkinUI(skin);
  });
});

btnStart.addEventListener('click', () => {
  engine.startGame();
});

btnRestart.addEventListener('click', () => {
  engine.startGame();
});

btnHome.addEventListener('click', () => {
  engine.returnToMenu();
});

function openEggModal(): void {
  isModalOpen = true;
  renderEggGallery();
  eggModalEl.classList.remove('hidden');
}

function closeEggModal(): void {
  isModalOpen = false;
  eggModalEl.classList.add('hidden');
}

btnOpenEggs.addEventListener('click', openEggModal);
btnGoEggs.addEventListener('click', openEggModal);
btnHudEggs.addEventListener('click', (e) => {
  e.stopPropagation();
  openEggModal();
});
btnCloseEggs.addEventListener('click', closeEggModal);
eggModalEl.addEventListener('click', (e) => {
  if (e.target === eggModalEl) closeEggModal();
});

btnGuide.addEventListener('click', (e) => {
  e.stopPropagation();
  const next = !engine.isAssistEnabled();
  engine.setAssistEnabled(next);
  btnGuide.classList.toggle('active', next);
  spawnFloatingText({
    text: next ? '✨ 星尘指引：已开启' : '✨ 星尘指引：已关闭',
    subtext: next ? '蓄力将显示预测轨迹（休闲探索模式）' : '已切回原汁原味纯享模式',
    color: '#80ffdb',
    scale: 0.72,
    screenX: 50,
    screenY: 24,
  });
});

btnBgm.addEventListener('click', (e) => {
  e.stopPropagation();
  const next = !engine.audio.isBgmEnabled();
  engine.audio.setBgmEnabled(next);
  btnBgm.classList.toggle('active', next);
  bgmIconEl.textContent = next ? '🎶' : '🔇';
});

btnSfx.addEventListener('click', (e) => {
  e.stopPropagation();
  const next = !engine.audio.isSfxEnabled();
  engine.audio.setSfxEnabled(next);
  btnSfx.classList.toggle('active', next);
  sfxIconEl.textContent = next ? '🔔' : '🔕';
});

// ==================== 核心蓄力与松开交互（鼠标 / 触屏 / 空格键） ====================

function canTriggerJumpInput(): boolean {
  if (isModalOpen) return false;
  if (!latestSnapshot) return false;
  return latestSnapshot.phase === 'idle' || latestSnapshot.phase === 'charging';
}

canvasContainer.addEventListener('pointerdown', (e) => {
  if (e.button !== 0 && e.pointerType === 'mouse') return;
  if (!canTriggerJumpInput()) return;
  if (activePointerId !== null) return;
  e.preventDefault();
  activePointerId = e.pointerId;
  canvasContainer.setPointerCapture(e.pointerId);
  engine.startCharge();
});

function handlePointerEnd(e: PointerEvent): void {
  if (activePointerId === null || e.pointerId !== activePointerId) return;
  activePointerId = null;
  if (canvasContainer.hasPointerCapture(e.pointerId)) {
    canvasContainer.releasePointerCapture(e.pointerId);
  }
  engine.releaseCharge();
}

canvasContainer.addEventListener('pointerup', handlePointerEnd);
canvasContainer.addEventListener('pointercancel', handlePointerEnd);
canvasContainer.addEventListener('contextmenu', (e) => e.preventDefault());

window.addEventListener('keydown', (e) => {
  if (e.code === 'Escape' && isModalOpen) {
    closeEggModal();
    return;
  }

  if (e.code === 'Space') {
    e.preventDefault();
    if (e.repeat) return;

    if (isModalOpen) return;
    if (latestSnapshot?.phase === 'gameover') {
      engine.startGame();
      return;
    }
    if (latestSnapshot?.phase === 'menu') {
      engine.startGame();
      return;
    }
    if (canTriggerJumpInput() && !isSpaceDown) {
      isSpaceDown = true;
      engine.startCharge();
    }
  }
});

window.addEventListener('keyup', (e) => {
  if (e.code === 'Space' && isSpaceDown) {
    e.preventDefault();
    isSpaceDown = false;
    engine.releaseCharge();
  }
});

window.addEventListener('blur', () => {
  if (isSpaceDown || activePointerId !== null) {
    isSpaceDown = false;
    activePointerId = null;
    engine.releaseCharge();
  }
});
