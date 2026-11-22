import * as THREE from 'three';
import { AudioManager } from './AudioManager';
import { buildCharacter, CharacterRig } from './CharacterBuilder';
import {
  CAMERA_CONFIG,
  EASTER_EGGS,
  EGG_PLATFORM_POOL,
  NORMAL_PLATFORM_POOL,
  PHYSICS,
  STORAGE_KEYS,
} from './constants';
import { ParticleSystem } from './ParticleSystem';
import { createPlatform } from './PlatformBuilder';
import { SleighEffect } from './SleighEffect';
import {
  ActiveBuffs,
  CharacterSkin,
  EasterEggId,
  GameCallbacks,
  GamePhase,
  GameSnapshot,
  JumpDirection,
  PlatformEntity,
  PlatformKind,
} from './types';

interface PlatformDropAnim {
  platform: PlatformEntity;
  elapsed: number;
  duration: number;
  startY: number;
}

interface PlatformBounceAnim {
  platform: PlatformEntity;
  scaleY: number;
  velY: number;
}

export class GameEngine {
  private container: HTMLElement;
  private callbacks: GameCallbacks;
  public audio: AudioManager;

  // Three.js 核心对象
  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private renderer: THREE.WebGLRenderer;
  private dirLight: THREE.DirectionalLight;
  private partyLightA: THREE.PointLight;
  private partyLightB: THREE.PointLight;
  private particles: ParticleSystem;
  private sleigh: SleighEffect;

  // 角色与平台
  private skin: CharacterSkin = 'santa';
  private character!: CharacterRig;
  private platforms: PlatformEntity[] = [];
  private nextPlatformId = 1;
  private currentIdx = 0; // 当前站立的平台索引
  private nextDirection: JumpDirection = 'x';
  private dropAnims: PlatformDropAnim[] = [];
  private bounceAnims: PlatformBounceAnim[] = [];

  // 可选星尘辅助预测线
  private assistEnabled = false;
  private guideGroup: THREE.Group;
  private guideDots: THREE.Mesh[] = [];
  private guideTargetRing: THREE.Mesh;

  // 游戏核心状态
  private phase: GamePhase = 'menu';
  private score = 0;
  private bestScore = 0;
  private combo = 0;
  private maxCombo = 0;
  private jumps = 0;
  private usedAssistInRun = false;
  private sleighMilestoneTriggered = false;
  private unlockedEggs = new Set<EasterEggId>();
  private buffs: ActiveBuffs = {
    shield: false,
    doubleScoreJumps: 0,
    partyLightsTimer: 0,
  };

  // 蓄力与跳跃物理状态
  private chargeTime = 0;
  private chargeSparkTimer = 0;
  private jumpStartPos = new THREE.Vector3();
  private jumpDirVec = new THREE.Vector3(1, 0, 0);
  private jumpDist = 0;
  private jumpPeak = 3;
  private jumpElapsed = 0;
  private jumpDuration = 0.5;
  private landingSquash = 0; // 落地弹性动画进度

  // 失足跌落物理状态
  private fallMode: 'tip' | 'drop' = 'drop';
  private fallVel = new THREE.Vector3();
  private fallAxis = new THREE.Vector3(1, 0, 0);
  private fallAngle = 0;
  private fallTimer = 0;

  // 彩蛋停留检测状态
  private stayTimer = 0;
  private stayPlatformId = -1;

  // 相机追踪与菜单展示
  private camTarget = new THREE.Vector3(0, 0, 0);
  private camDesiredTarget = new THREE.Vector3(0, 0, 0);
  private ambientSparkleTimer = 0;
  private clock = new THREE.Clock();
  private elapsed = 0;
  private rafId = 0;

  constructor(container: HTMLElement, callbacks: GameCallbacks) {
    this.container = container;
    this.callbacks = callbacks;
    this.audio = new AudioManager();

    this.loadPersistentState();

    // 1. 场景 & 圣诞冬夜背景
    this.scene = new THREE.Scene();
    this.scene.background = this.createWinterSkyTexture();
    this.scene.fog = new THREE.FogExp2(0x16213e, 0.0085);

    // 2. 正交等距微缩视角相机
    const aspect = container.clientWidth / Math.max(1, container.clientHeight);
    const frustum = this.computeFrustumSize();
    this.camera = new THREE.OrthographicCamera(
      (-frustum * aspect) / 2,
      (frustum * aspect) / 2,
      frustum / 2,
      -frustum / 2,
      -60,
      140
    );

    // 3. 抗锯齿高质量渲染器
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    container.appendChild(this.renderer.domElement);

    // 4. 圣诞暖金氛围光照系统
    const hemiLight = new THREE.HemisphereLight(0xbcd8ff, 0x3a2645, 0.85);
    this.scene.add(hemiLight);

    const ambientLight = new THREE.AmbientLight(0xffe6cc, 0.32);
    this.scene.add(ambientLight);

    this.dirLight = new THREE.DirectionalLight(0xfff1d6, 1.55);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.width = 2048;
    this.dirLight.shadow.mapSize.height = 2048;
    this.dirLight.shadow.camera.near = 2;
    this.dirLight.shadow.camera.far = 75;
    const d = 18;
    this.dirLight.shadow.camera.left = -d;
    this.dirLight.shadow.camera.right = d;
    this.dirLight.shadow.camera.top = d;
    this.dirLight.shadow.camera.bottom = -d;
    this.dirLight.shadow.bias = -0.0005;
    this.scene.add(this.dirLight);
    this.scene.add(this.dirLight.target);

    // 柔和月光冷蓝边缘补光
    const rimLight = new THREE.DirectionalLight(0x74b9ff, 0.55);
    rimLight.position.set(16, 12, -16);
    this.scene.add(rimLight);

    // 留声机派对动态彩灯（平时关闭）
    this.partyLightA = new THREE.PointLight(0xff4d6d, 0, 26);
    this.partyLightB = new THREE.PointLight(0x2ec4b6, 0, 26);
    this.scene.add(this.partyLightA, this.partyLightB);

    // 5. 特效系统 & 驯鹿雪橇
    this.particles = new ParticleSystem(this.scene);
    this.sleigh = new SleighEffect(this.scene);

    // 6. 可选星尘轨迹指引器
    const guide = this.createAssistGuide();
    this.guideGroup = guide.group;
    this.guideDots = guide.dots;
    this.guideTargetRing = guide.ring;
    this.scene.add(this.guideGroup);

    // 7. 远景装饰星光点阵背景
    this.addDistantStars();

    // 8. 初始化主角与初始场景（主菜单展示世界）
    this.setSkin(this.skin);
    this.setupInitialStage();
    this.emitSnapshot();

    window.addEventListener('resize', this.handleResize);
    this.animate();
  }

  private loadPersistentState(): void {
    try {
      const savedBest = localStorage.getItem(STORAGE_KEYS.BEST_SCORE);
      if (savedBest) this.bestScore = Math.max(0, parseInt(savedBest, 10) || 0);

      const savedEggs = localStorage.getItem(STORAGE_KEYS.UNLOCKED_EGGS);
      if (savedEggs) {
        const arr = JSON.parse(savedEggs) as EasterEggId[];
        arr.forEach((id) => {
          if (EASTER_EGGS[id]) this.unlockedEggs.add(id);
        });
      }

      const savedSkin = localStorage.getItem(STORAGE_KEYS.SKIN) as CharacterSkin | null;
      if (savedSkin === 'santa' || savedSkin === 'snowman' || savedSkin === 'reindeer') {
        this.skin = savedSkin;
      }
    } catch {
      // 忽略存储异常
    }
  }

  private savePersistentState(): void {
    try {
      localStorage.setItem(STORAGE_KEYS.BEST_SCORE, String(this.bestScore));
      localStorage.setItem(STORAGE_KEYS.UNLOCKED_EGGS, JSON.stringify([...this.unlockedEggs]));
      localStorage.setItem(STORAGE_KEYS.SKIN, this.skin);
    } catch {
      // ignore
    }
  }

  private createWinterSkyTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    const grad = ctx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, '#09152b');
    grad.addColorStop(0.45, '#14244a');
    grad.addColorStop(0.78, '#262452');
    grad.addColorStop(1, '#3b2548');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    // 淡淡极光波带
    const aurora = ctx.createRadialGradient(360, 140, 20, 360, 140, 240);
    aurora.addColorStop(0, 'rgba(72, 219, 177, 0.16)');
    aurora.addColorStop(0.55, 'rgba(116, 185, 255, 0.08)');
    aurora.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = aurora;
    ctx.fillRect(0, 0, 512, 512);

    // 底部暖圣诞壁炉散景光晕
    const warmGlow = ctx.createRadialGradient(130, 460, 20, 130, 460, 260);
    warmGlow.addColorStop(0, 'rgba(255, 166, 77, 0.15)');
    warmGlow.addColorStop(1, 'rgba(255, 166, 77, 0)');
    ctx.fillStyle = warmGlow;
    ctx.fillRect(0, 0, 512, 512);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  private addDistantStars(): void {
    const count = 140;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 140;
      positions[i * 3 + 1] = -25 + Math.random() * 55;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 140;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xffe8b6,
      size: 3.6,
      sizeAttenuation: false,
      transparent: true,
      opacity: 0.55,
    });
    const stars = new THREE.Points(geo, mat);
    this.scene.add(stars);
  }

  private createAssistGuide() {
    const group = new THREE.Group();
    group.visible = false;
    const dots: THREE.Mesh[] = [];
    const dotGeo = new THREE.SphereGeometry(0.11, 10, 10);
    for (let i = 0; i < 12; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0xfff3b0,
        transparent: true,
        opacity: 0.8 - i * 0.04,
      });
      const dot = new THREE.Mesh(dotGeo, mat);
      group.add(dot);
      dots.push(dot);
    }

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.32, 0.48, 28),
      new THREE.MeshBasicMaterial({
        color: 0xff4d6d,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.92,
        depthWrite: false,
      })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.08;
    group.add(ring);

    return { group, dots, ring };
  }

  private computeFrustumSize(): number {
    const w = this.container.clientWidth;
    const h = Math.max(1, this.container.clientHeight);
    const aspect = w / h;
    // 竖屏设备略拉大视锥，避免左右两个平台超出屏幕
    return aspect < 0.85 ? CAMERA_CONFIG.MOBILE_FRUSTUM : CAMERA_CONFIG.BASE_FRUSTUM;
  }

  private handleResize = (): void => {
    const w = this.container.clientWidth;
    const h = Math.max(1, this.container.clientHeight);
    const aspect = w / h;
    const frustum = this.computeFrustumSize();

    this.camera.left = (-frustum * aspect) / 2;
    this.camera.right = (frustum * aspect) / 2;
    this.camera.top = frustum / 2;
    this.camera.bottom = -frustum / 2;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  // ==================== 对外控制 API ====================

  public getSkin(): CharacterSkin {
    return this.skin;
  }

  public setSkin(skin: CharacterSkin): void {
    this.skin = skin;
    this.savePersistentState();

    const prevPos = this.character ? this.character.root.position.clone() : new THREE.Vector3();
    const prevRotY = this.character ? this.character.root.rotation.y : Math.PI / 2;

    if (this.character) {
      this.scene.remove(this.character.root);
    }
    this.character = buildCharacter(skin);
    this.character.root.position.copy(prevPos);
    this.character.root.rotation.y = prevRotY;
    this.character.shieldRing.visible = this.buffs.shield;
    this.scene.add(this.character.root);
  }

  public setAssistEnabled(enabled: boolean): void {
    this.assistEnabled = enabled;
    if (enabled && (this.phase === 'idle' || this.phase === 'charging' || this.phase === 'jumping')) {
      this.usedAssistInRun = true;
    }
    if (!enabled) {
      this.guideGroup.visible = false;
    }
    this.emitSnapshot();
  }

  public isAssistEnabled(): boolean {
    return this.assistEnabled;
  }

  public startGame(): void {
    this.audio.unlock();
    this.resetRunState();
    this.phase = 'idle';
    this.setupInitialStage();
    this.emitSnapshot();
  }

  public returnToMenu(): void {
    this.audio.stopCharge();
    this.resetRunState();
    this.phase = 'menu';
    this.setupInitialStage();
    this.emitSnapshot();
  }

  private resetRunState(): void {
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.jumps = 0;
    this.usedAssistInRun = this.assistEnabled;
    this.sleighMilestoneTriggered = false;
    this.buffs = {
      shield: false,
      doubleScoreJumps: 0,
      partyLightsTimer: 0,
    };
    this.chargeTime = 0;
    this.stayTimer = 0;
    this.stayPlatformId = -1;
    this.landingSquash = 0;
    this.guideGroup.visible = false;
    this.callbacks.onStayProgress(false, 0, '🎁', '');
    this.callbacks.onChargeProgress(0, false);
  }

  /** 开始按压蓄力 */
  public startCharge(): void {
    if (this.phase !== 'idle') return;
    this.audio.unlock();
    this.phase = 'charging';
    this.chargeTime = 0;
    this.chargeSparkTimer = 0;
    if (this.assistEnabled) {
      this.usedAssistInRun = true;
    }

    // 取消正在进行的彩蛋停留进度
    this.resetStayProgress();
    this.audio.startCharge();
    this.emitSnapshot();
  }

  /** 松手起跳 */
  public releaseCharge(): void {
    if (this.phase !== 'charging') return;

    const ratio = Math.min(1, this.chargeTime / PHYSICS.MAX_CHARGE_TIME);
    this.jumpDist = PHYSICS.MIN_JUMP_DIST + ratio * (PHYSICS.MAX_JUMP_DIST - PHYSICS.MIN_JUMP_DIST);
    this.jumpDuration = 0.43 + ratio * 0.21;
    this.jumpPeak = 2.6 + this.jumpDist * 0.22;
    this.jumpElapsed = 0;

    // 计算起跳方向：从角色当前脚底指向下一个平台中心的水平方向（经典跳一跳精准纠偏）
    const nextPlat = this.platforms[this.currentIdx + 1];
    this.jumpStartPos.set(this.character.root.position.x, 0, this.character.root.position.z);
    if (nextPlat) {
      const dx = nextPlat.center.x - this.jumpStartPos.x;
      const dz = nextPlat.center.z - this.jumpStartPos.z;
      const len = Math.hypot(dx, dz);
      if (len > 0.01) {
        this.jumpDirVec.set(dx / len, 0, dz / len);
      }
    }

    // 让角色面向起跳方向
    this.character.root.rotation.y = Math.atan2(this.jumpDirVec.x, this.jumpDirVec.z);

    // 释放平台弹簧回弹
    const currPlat = this.platforms[this.currentIdx];
    if (currPlat) {
      this.triggerPlatformBounce(currPlat, currPlat.visualGroup.scale.y);
    }

    // 重置蓄力表现
    this.character.chargeRing.material.opacity = 0;
    this.guideGroup.visible = false;
    this.callbacks.onChargeProgress(0, false);

    this.audio.playJump();
    this.phase = 'jumping';
    this.emitSnapshot();
  }

  // ==================== 平台生成与场景管理 ====================

  private clearPlatforms(): void {
    for (const p of this.platforms) {
      this.scene.remove(p.group);
    }
    this.platforms = [];
    this.dropAnims = [];
    this.bounceAnims = [];
    this.currentIdx = 0;
    this.nextPlatformId = 1;
  }

  private setupInitialStage(): void {
    this.clearPlatforms();

    // 起点放一个温馨大号星光圣诞树或红金礼物盒，打造绝佳圣诞第一印象！
    const startPlat = createPlatform(
      this.nextPlatformId++,
      'gift_red',
      new THREE.Vector3(0, 0, 0),
      1.12
    );
    this.scene.add(startPlat.group);
    this.platforms.push(startPlat);

    // 菜单模式下第一眼就能看见旁边闪闪发光的圣诞树彩蛋台座！
    this.nextDirection = 'x';
    const secondPos = new THREE.Vector3(5.8, 0, 0);
    const secondPlat = createPlatform(
      this.nextPlatformId++,
      'egg_tree',
      secondPos,
      1.0
    );
    this.scene.add(secondPlat.group);
    this.platforms.push(secondPlat);

    // 放置角色在起点中心：主菜单面向镜头展示外观，游玩时面向下一块平台
    this.character.root.position.set(0, 0, 0);
    this.character.tiltGroup.rotation.set(0, 0, 0);
    this.character.squashGroup.scale.set(1, 1, 1);
    this.character.root.rotation.y = this.phase === 'menu' ? -Math.PI * 0.25 : Math.PI / 2;
    this.character.shieldRing.visible = this.buffs.shield;
    this.character.chargeRing.material.opacity = 0;

    this.updateCameraDesiredTarget(true);
  }

  private spawnNextPlatform(): void {
    const curr = this.platforms[this.currentIdx];

    // 交替或随机挑选前进方向（+X 右上 或 -Z 左上）
    if (this.jumps === 1) {
      this.nextDirection = 'z';
    } else {
      this.nextDirection = Math.random() < 0.5 ? 'x' : 'z';
    }

    // 随分数递增略微拉开最大间距与缩小普通平台尺寸，平滑提升挑战性
    const difficulty = Math.min(1, this.score / 120);
    const minGap = PHYSICS.MIN_GAP + difficulty * 0.4;
    const maxGap = Math.min(PHYSICS.MAX_GAP, 7.6 + difficulty * 2.2);
    const gap = minGap + Math.random() * (maxGap - minGap);

    const pos = curr.center.clone();
    if (this.nextDirection === 'x') {
      pos.x += gap;
    } else {
      pos.z -= gap;
    }

    const kind = this.pickNextPlatformKind();
    const isEgg = kind.startsWith('egg_');
    const sizeScale = isEgg ? 1.0 : Math.max(0.76, 1.06 - difficulty * 0.25 + (Math.random() - 0.5) * 0.14);

    const plat = createPlatform(this.nextPlatformId++, kind, pos, sizeScale);
    // 入场轻盈弹落动画
    plat.group.position.y = 5.5;
    this.scene.add(plat.group);
    this.platforms.push(plat);
    this.dropAnims.push({
      platform: plat,
      elapsed: 0,
      duration: 0.42,
      startY: 5.5,
    });

    // 清理过远的历史平台，保持 60fps 流畅
    while (this.platforms.length > PHYSICS.MAX_PLATFORMS_KEEP && this.currentIdx > 3) {
      const old = this.platforms.shift();
      if (old) {
        this.scene.remove(old.group);
        this.currentIdx--;
      }
    }
  }

  private pickNextPlatformKind(): PlatformKind {
    const prevKind = this.platforms[this.platforms.length - 1]?.kind;

    // 保证玩家在前几步就能密集体验到不同的圣诞派对彩蛋！
    const stepsAfterStart = this.jumps;
    const shouldSpawnEgg =
      stepsAfterStart === 2 ||
      stepsAfterStart === 5 ||
      (stepsAfterStart > 5 && stepsAfterStart % 3 === 0) ||
      (stepsAfterStart > 6 && Math.random() < 0.28);

    if (shouldSpawnEgg && !prevKind?.startsWith('egg_')) {
      // 优先挑选玩家还没解锁过图鉴的彩蛋平台！
      const uncollected = EGG_PLATFORM_POOL.filter((k) => {
        const eggId = this.kindToEggId(k);
        return eggId && !this.unlockedEggs.has(eggId);
      });
      const pool = uncollected.length > 0 ? uncollected : EGG_PLATFORM_POOL;
      return pool[Math.floor(Math.random() * pool.length)];
    }

    // 避免连续出现完全相同的普通平台
    const candidates = NORMAL_PLATFORM_POOL.filter((k) => k !== prevKind);
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  private kindToEggId(kind: PlatformKind): EasterEggId | undefined {
    const map: Partial<Record<PlatformKind, EasterEggId>> = {
      egg_mystery_box: 'mystery_box',
      egg_gramophone: 'gramophone',
      egg_tree: 'christmas_tree',
      egg_snowman: 'sleepy_snowman',
      egg_fireplace: 'warm_fireplace',
      egg_wish_star: 'santa_sleigh',
    };
    return map[kind];
  }

  private triggerPlatformBounce(plat: PlatformEntity, fromScaleY: number): void {
    const existing = this.bounceAnims.find((b) => b.platform.id === plat.id);
    if (existing) {
      existing.scaleY = fromScaleY;
      existing.velY = 3.2;
    } else {
      this.bounceAnims.push({ platform: plat, scaleY: fromScaleY, velY: 3.2 });
    }
  }

  // ==================== 落地碰撞判定与彩蛋核心逻辑 ====================

  private resolveLanding(): void {
    const px = this.character.root.position.x;
    const pz = this.character.root.position.z;
    const currPlat = this.platforms[this.currentIdx];
    const nextPlat = this.platforms[this.currentIdx + 1];

    const outNext = nextPlat ? this.getOutsideDistance(px, pz, nextPlat) : 999;
    const outCurr = currPlat ? this.getOutsideDistance(px, pz, currPlat) : 999;

    // 1. 成功跳上目标平台！
    if (nextPlat && outNext <= PHYSICS.FOOT_TOLERANCE) {
      this.currentIdx++;
      this.jumps++;
      this.landingSquash = 1.0;
      this.triggerPlatformBounce(nextPlat, 0.88);

      const distToCenter = Math.hypot(px - nextPlat.center.x, pz - nextPlat.center.z);
      const isPerfect = distToCenter <= PHYSICS.PERFECT_RADIUS;

      let baseGain = 1;
      if (isPerfect) {
        this.combo++;
        this.maxCombo = Math.max(this.maxCombo, this.combo);
        baseGain = this.combo * 2;
      } else {
        this.combo = 0;
        baseGain = 1;
      }

      // 检查壁炉双倍得分 Buff
      let multiplier = 1;
      if (this.buffs.doubleScoreJumps > 0) {
        multiplier = 2;
        this.buffs.doubleScoreJumps--;
      }
      const totalGain = baseGain * multiplier;
      this.addScore(totalGain);

      const screenPos = this.worldToScreenPercent(this.character.root.position, 2.3);

      if (isPerfect) {
        this.audio.playPerfect(this.combo);
        this.particles.emitPerfectBurst(this.character.root.position, this.combo);
        this.callbacks.onFloatingText({
          text: `+${totalGain}`,
          subtext: multiplier > 1 ? `PERFECT ×${this.combo} · 🔥×2` : `PERFECT ×${this.combo}`,
          color: '#ffd166',
          scale: Math.min(1.45, 1.05 + this.combo * 0.08),
          screenX: screenPos.x,
          screenY: screenPos.y,
        });
      } else {
        this.audio.playLand();
        this.particles.emitLandingDust(this.character.root.position);
        this.callbacks.onFloatingText({
          text: `+${totalGain}`,
          subtext: multiplier > 1 ? '🔥 双倍暖冬' : undefined,
          color: multiplier > 1 ? '#ff9f1c' : '#ffffff',
          scale: 1,
          screenX: screenPos.x,
          screenY: screenPos.y,
        });
      }

      // 触发隐藏里程碑彩蛋：3连 Perfect 或 分数首次突破 45 分召唤 3D 驯鹿雪橇！
      if (
        (!this.sleigh.isActive() && isPerfect && this.combo >= 3 && this.combo % 3 === 0) ||
        (!this.sleighMilestoneTriggered && this.score >= 45)
      ) {
        if (this.score >= 45) this.sleighMilestoneTriggered = true;
        this.triggerSleighEasterEgg();
      }

      // 如果新落地的平台是彩蛋平台，启动停留检测！
      if (nextPlat.easterEgg && !nextPlat.eggTriggered) {
        this.stayPlatformId = nextPlat.id;
        this.stayTimer = 0;
      }

      // 生成下一个平台并让主角转向面对它
      this.spawnNextPlatform();
      const upcoming = this.platforms[this.currentIdx + 1];
      if (upcoming) {
        const dx = upcoming.center.x - px;
        const dz = upcoming.center.z - pz;
        this.character.root.rotation.y = Math.atan2(dx, dz);
      }

      this.phase = 'idle';
      this.updateCameraDesiredTarget(false);
      this.emitSnapshot();
      return;
    }

    // 2. 原地轻跳仍落在当前平台上（安全容错，不死不加分）
    if (currPlat && outCurr <= PHYSICS.FOOT_TOLERANCE) {
      this.landingSquash = 0.7;
      this.triggerPlatformBounce(currPlat, 0.93);
      this.audio.playLand();
      this.particles.emitLandingDust(this.character.root.position);
      this.phase = 'idle';
      this.emitSnapshot();
      return;
    }

    // 3. 失足了！检查是否持有「圣诞护盾」祝福
    if (this.buffs.shield) {
      this.buffs.shield = false;
      this.character.shieldRing.visible = false;
      this.audio.playShieldSave();

      // 把角色安全救回更近的那个平台中心（如果更靠近目标平台，甚至贴心救到当前平台继续尝试）
      const safePlat = currPlat;
      this.character.root.position.set(safePlat.center.x, 0, safePlat.center.z);
      this.character.tiltGroup.rotation.set(0, 0, 0);
      this.character.squashGroup.scale.set(1, 1, 1);
      this.particles.emitCelebrationFireworks(this.character.root.position, [0xffe066, 0xffffff, 0x80ffdb]);

      const sp = this.worldToScreenPercent(this.character.root.position, 2.5);
      this.callbacks.onFloatingText({
        text: '🛡️ 圣诞护盾救回！',
        subtext: '虚惊一场，继续跳跃吧~',
        color: '#80ffdb',
        scale: 1.15,
        screenX: sp.x,
        screenY: sp.y,
      });

      // 重新朝向下一块平台
      if (nextPlat) {
        const dx = nextPlat.center.x - safePlat.center.x;
        const dz = nextPlat.center.z - safePlat.center.z;
        this.character.root.rotation.y = Math.atan2(dx, dz);
      }
      this.phase = 'idle';
      this.emitSnapshot();
      return;
    }

    // 4. 判定是边缘摇晃翻倒（喜剧演出）还是直接踏空坠落
    const nearNext = nextPlat && outNext <= PHYSICS.TIP_MARGIN;
    const nearCurr = currPlat && outCurr <= PHYSICS.TIP_MARGIN;

    this.audio.playFall();
    this.phase = 'falling';
    this.fallTimer = 0;
    this.fallAngle = 0;

    if (nearNext || nearCurr) {
      this.fallMode = 'tip';
      const refPlat = nearNext ? nextPlat! : currPlat!;
      const awayX = px - refPlat.center.x;
      const awayZ = pz - refPlat.center.z;
      const len = Math.max(0.01, Math.hypot(awayX, awayZ));
      const nx = awayX / len;
      const nz = awayZ / len;
      // 翻倒旋转轴 = up × away = (0,1,0) × (nx,0,nz) = (nz, 0, -nx)
      this.fallAxis.set(nz, 0, -nx).normalize();
      this.fallVel.set(nx * 2.4, 0.8, nz * 2.4);
    } else {
      this.fallMode = 'drop';
      this.fallAxis.set(this.jumpDirVec.z, 0, -this.jumpDirVec.x).normalize();
      this.fallVel.set(this.jumpDirVec.x * 2.2, -1.5, this.jumpDirVec.z * 2.2);
    }

    this.emitSnapshot();
  }

  /**
   * 计算水平点 (px, pz) 超出平台顶面边界的距离：
   * <= 0 表示完全在顶面内，> 0 表示超出边界的欧氏距离
   */
  private getOutsideDistance(px: number, pz: number, plat: PlatformEntity): number {
    const dx = px - plat.center.x;
    const dz = pz - plat.center.z;
    if (plat.shape === 'cylinder') {
      return Math.hypot(dx, dz) - plat.radius;
    }
    const overX = Math.max(0, Math.abs(dx) - plat.halfWidth);
    const overZ = Math.max(0, Math.abs(dz) - plat.halfDepth);
    if (overX === 0 && overZ === 0) {
      return -Math.min(plat.halfWidth - Math.abs(dx), plat.halfDepth - Math.abs(dz));
    }
    return Math.hypot(overX, overZ);
  }

  private addScore(delta: number): void {
    this.score += delta;
    if (this.score > this.bestScore) {
      this.bestScore = this.score;
      this.savePersistentState();
    }
  }

  // ==================== 彩蛋激活与演出 ====================

  private resetStayProgress(): void {
    this.stayTimer = 0;
    this.stayPlatformId = -1;
    this.callbacks.onStayProgress(false, 0, '🎁', '');
  }

  private activatePlatformEasterEgg(plat: PlatformEntity): void {
    if (!plat.easterEgg || plat.eggTriggered) return;
    plat.eggTriggered = true;
    plat.onTriggerEgg?.();
    this.resetStayProgress();

    const eggId = plat.easterEgg;
    const meta = EASTER_EGGS[eggId];
    const isNew = !this.unlockedEggs.has(eggId);
    if (isNew) {
      this.unlockedEggs.add(eggId);
      this.savePersistentState();
    }

    let bonus = 15;
    let detail = meta.rewardText;

    switch (eggId) {
      case 'mystery_box': {
        bonus = 15;
        this.audio.playEggFanfare();
        this.particles.emitCelebrationFireworks(plat.center, [0xffd166, 0xff4d6d, 0xffffff, 0x80ffdb]);
        if (!this.buffs.shield) {
          this.buffs.shield = true;
          this.character.shieldRing.visible = true;
          detail = '+15分 · 获得「圣诞护盾」免死1次！';
        } else {
          bonus = 25;
          detail = '已有护盾，转化为 +25 幸运暴击分！';
        }
        break;
      }

      case 'gramophone': {
        bonus = 20;
        this.buffs.partyLightsTimer = 14; // 14 秒全场彩色霓虹派对光效！
        this.audio.playGramophoneMelody();
        this.particles.emitCelebrationFireworks(plat.center, [0xff4d6d, 0x4cc9f0, 0xffd166, 0xc77dff]);
        detail = '+20分 · 霓虹派对灯效已开启！';
        break;
      }

      case 'christmas_tree': {
        bonus = 25;
        this.audio.playEggFanfare();
        this.particles.emitCelebrationFireworks(
          plat.center.clone().add(new THREE.Vector3(0.9, 1.5, -0.9)),
          [0xffd166, 0x80ed99, 0xff4d6d, 0x4cc9f0]
        );
        detail = '+25分 · 圣诞树七彩奇迹点亮！';
        break;
      }

      case 'sleepy_snowman': {
        bonus = 15;
        this.audio.playEggFanfare();
        this.particles.emitCelebrationFireworks(
          plat.center.clone().add(new THREE.Vector3(0.85, 0.85, -0.85)),
          [0xffffff, 0x90e0ef, 0xffd166, 0xff4d6d]
        );
        detail = '+15分 · 小雪人醒来为你欢呼！';
        break;
      }

      case 'warm_fireplace': {
        bonus = 20;
        this.buffs.doubleScoreJumps += 3;
        this.audio.playEggFanfare();
        this.particles.emitCelebrationFireworks(plat.center, [0xff9f1c, 0xffd166, 0xff4d6d, 0xffffff]);
        detail = '+20分 · 接下来 3 跳得分翻倍！';
        break;
      }

      case 'santa_sleigh': {
        bonus = 30;
        this.sleigh.launch(this.camDesiredTarget);
        this.audio.playSleighBells();
        this.particles.emitCelebrationFireworks(plat.center, [0xffe066, 0x4cc9f0, 0xffffff, 0xff5c8a]);
        detail = '+30分 · 驯鹿雪橇正掠过圣诞夜空！';
        break;
      }
    }

    this.addScore(bonus);
    const sp = this.worldToScreenPercent(plat.center, 2.8);
    this.callbacks.onFloatingText({
      text: `${meta.emoji} +${bonus}`,
      subtext: meta.name,
      color: '#ffe066',
      scale: 1.35,
      screenX: sp.x,
      screenY: sp.y,
    });

    this.callbacks.onEggUnlocked(meta, isNew, detail);
    this.emitSnapshot();
  }

  /** 连击 / 分数里程碑自动召唤 3D 驯鹿雪橇彩蛋 */
  private triggerSleighEasterEgg(): void {
    const eggId: EasterEggId = 'santa_sleigh';
    const meta = EASTER_EGGS[eggId];
    const isNew = !this.unlockedEggs.has(eggId);
    if (isNew) {
      this.unlockedEggs.add(eggId);
      this.savePersistentState();
    }

    this.sleigh.launch(this.camDesiredTarget);
    this.audio.playSleighBells();
    this.addScore(30);

    const sp = this.worldToScreenPercent(this.character.root.position, 3.2);
    this.callbacks.onFloatingText({
      text: '🛷 +30 驯鹿雪橇！',
      subtext: '圣诞老人从夜空撒下祝福~',
      color: '#ffe066',
      scale: 1.35,
      screenX: sp.x,
      screenY: sp.y,
    });

    this.callbacks.onEggUnlocked(meta, isNew, '+30分 · 驯鹿雪橇掠过圣诞夜空！');
    this.emitSnapshot();
  }

  // ==================== 相机、投影与主循环 ====================

  private updateCameraDesiredTarget(snapImmediately: boolean): void {
    const curr = this.platforms[this.currentIdx];
    const next = this.platforms[this.currentIdx + 1];
    if (curr && next) {
      this.camDesiredTarget.set(
        (curr.center.x + next.center.x) * 0.5,
        0,
        (curr.center.z + next.center.z) * 0.5
      );
    } else if (curr) {
      this.camDesiredTarget.copy(curr.center);
    }

    if (snapImmediately) {
      this.camTarget.copy(this.camDesiredTarget);
    }
  }

  private worldToScreenPercent(worldPos: THREE.Vector3, yOffset = 2): { x: number; y: number } {
    const v = worldPos.clone();
    v.y += yOffset;
    v.project(this.camera);
    return {
      x: Math.max(12, Math.min(88, (v.x * 0.5 + 0.5) * 100)),
      y: Math.max(14, Math.min(82, (-v.y * 0.5 + 0.5) * 100)),
    };
  }

  private emitSnapshot(): void {
    this.callbacks.onStateChange({
      phase: this.phase,
      score: this.score,
      bestScore: this.bestScore,
      combo: this.combo,
      maxCombo: this.maxCombo,
      jumps: this.jumps,
      usedAssist: this.usedAssistInRun,
      buffs: { ...this.buffs },
      unlockedEggs: [...this.unlockedEggs],
    });
  }

  private updateAssistGuide(ratio: number): void {
    if (!this.assistEnabled || this.phase !== 'charging') {
      this.guideGroup.visible = false;
      return;
    }

    const nextPlat = this.platforms[this.currentIdx + 1];
    const start = new THREE.Vector3(this.character.root.position.x, 0, this.character.root.position.z);
    const dir = new THREE.Vector3(1, 0, 0);
    if (nextPlat) {
      const dx = nextPlat.center.x - start.x;
      const dz = nextPlat.center.z - start.z;
      const len = Math.max(0.01, Math.hypot(dx, dz));
      dir.set(dx / len, 0, dz / len);
    }

    const dist = PHYSICS.MIN_JUMP_DIST + ratio * (PHYSICS.MAX_JUMP_DIST - PHYSICS.MIN_JUMP_DIST);
    const peak = 2.6 + dist * 0.22;

    this.guideGroup.visible = true;
    const n = this.guideDots.length;
    for (let i = 0; i < n; i++) {
      const t = (i + 1) / (n + 1);
      const x = start.x + dir.x * dist * t;
      const z = start.z + dir.z * dist * t;
      const y = 4 * peak * t * (1 - t);
      this.guideDots[i].position.set(x, y, z);
    }
    this.guideTargetRing.position.set(start.x + dir.x * dist, 0.06, start.z + dir.z * dist);
  }

  private animate = (): void => {
    this.rafId = requestAnimationFrame(this.animate);
    const dt = Math.min(0.05, this.clock.getDelta());
    this.elapsed += dt;

    // 1. 更新平台入场弹落动画
    for (let i = this.dropAnims.length - 1; i >= 0; i--) {
      const anim = this.dropAnims[i];
      anim.elapsed += dt;
      const t = Math.min(1, anim.elapsed / anim.duration);
      // 柔和的回弹曲线 (EaseOutBack 类似触感)
      const ease = 1 - Math.pow(1 - t, 3);
      anim.platform.group.position.y = anim.startY * (1 - ease);
      if (t >= 1) {
        anim.platform.group.position.y = 0;
        this.triggerPlatformBounce(anim.platform, 0.92);
        this.dropAnims.splice(i, 1);
      }
    }

    // 2. 更新平台弹性压缩回弹
    for (let i = this.bounceAnims.length - 1; i >= 0; i--) {
      const b = this.bounceAnims[i];
      const force = (1 - b.scaleY) * 95;
      b.velY += force * dt;
      b.velY *= Math.pow(0.06, dt);
      b.scaleY += b.velY * dt;
      b.platform.visualGroup.scale.y = b.scaleY;

      if (Math.abs(1 - b.scaleY) < 0.002 && Math.abs(b.velY) < 0.02) {
        b.platform.visualGroup.scale.y = 1;
        this.bounceAnims.splice(i, 1);
      }
    }

    // 3. 更新所有平台自身圣诞动画 & 彩蛋平台吸引微光
    this.ambientSparkleTimer += dt;
    const shouldSparkle = this.ambientSparkleTimer >= 0.35;
    if (shouldSparkle) this.ambientSparkleTimer = 0;

    for (const p of this.platforms) {
      p.update?.(dt, this.elapsed, p.eggTriggered);
      if (shouldSparkle && p.easterEgg && !p.eggTriggered) {
        const sparkPos = p.center.clone().add(
          new THREE.Vector3((Math.random() - 0.5) * 2.4, 0.25, (Math.random() - 0.5) * 2.4)
        );
        this.particles.emitAmbientSparkle(sparkPos, 0xffe066, 0.45, 1.35);
      }
      // 热可可杯飘散白色热气
      if (shouldSparkle && p.kind === 'cocoa') {
        const steamPos = p.center.clone().add(
          new THREE.Vector3((Math.random() - 0.5) * 1.1, 0.1, (Math.random() - 0.5) * 1.1)
        );
        this.particles.emitAmbientSparkle(steamPos, 0xffffff, 0.38, 1.1);
      }
    }

    // 4. 更新角色护盾光环旋转 + 帽子微摆
    if (this.character.shieldRing.visible) {
      this.character.shieldRing.rotation.y += dt * 2.4;
      this.character.shieldRing.position.y = 0.88 + Math.sin(this.elapsed * 3.5) * 0.08;
    }
    if (this.character.pomPom && this.phase === 'idle') {
      this.character.pomPom.rotation.z = Math.sin(this.elapsed * 3.2) * 0.07 - 0.08;
    }

    // 5. 各阶段核心逻辑更新
    if (this.phase === 'menu') {
      // 主菜单背景：优雅的微缩展示缓慢呼吸视角 + 主角原地快乐小律动
      this.character.squashGroup.scale.y = 1 + Math.sin(this.elapsed * 3.5) * 0.03;
      this.character.squashGroup.scale.x = 1 - Math.sin(this.elapsed * 3.5) * 0.015;
      this.character.squashGroup.scale.z = 1 - Math.sin(this.elapsed * 3.5) * 0.015;
    } else if (this.phase === 'idle') {
      // 落地弹性恢复
      if (this.landingSquash > 0) {
        this.landingSquash = Math.max(0, this.landingSquash - dt * 5.5);
        const s = Math.sin(this.landingSquash * Math.PI);
        const sy = 1 - s * 0.2;
        const sxz = 1 / Math.sqrt(sy);
        this.character.squashGroup.scale.set(sxz, sy, sxz);
      } else {
        // 待机轻微呼吸感
        const b = Math.sin(this.elapsed * 3.2) * 0.025;
        this.character.squashGroup.scale.set(1 - b * 0.5, 1 + b, 1 - b * 0.5);
      }

      // 彩蛋停留计时器推进！
      const currPlat = this.platforms[this.currentIdx];
      if (
        currPlat &&
        currPlat.id === this.stayPlatformId &&
        currPlat.easterEgg &&
        !currPlat.eggTriggered &&
        currPlat.stayDuration !== undefined
      ) {
        this.stayTimer += dt;
        const progress = Math.min(1, this.stayTimer / Math.max(0.05, currPlat.stayDuration));
        const meta = EASTER_EGGS[currPlat.easterEgg];
        this.callbacks.onStayProgress(true, progress, meta.emoji, meta.stayLabel);

        if (this.stayTimer >= currPlat.stayDuration) {
          this.activatePlatformEasterEgg(currPlat);
        }
      }
    } else if (this.phase === 'charging') {
      this.chargeTime = Math.min(PHYSICS.MAX_CHARGE_TIME, this.chargeTime + dt);
      const ratio = this.chargeTime / PHYSICS.MAX_CHARGE_TIME;

      // 角色优雅下压（体积守恒）
      const charScaleY = 1 - ratio * 0.48;
      const charScaleXZ = 1 / Math.sqrt(charScaleY);
      this.character.squashGroup.scale.set(charScaleXZ, charScaleY, charScaleXZ);

      // 满蓄力时极轻微抖动提醒
      if (ratio >= 0.99) {
        this.character.tiltGroup.rotation.z = Math.sin(this.elapsed * 42) * 0.05;
      } else {
        this.character.tiltGroup.rotation.z = 0;
      }

      // 当前平台随角色一起弹性下沉
      const currPlat = this.platforms[this.currentIdx];
      if (currPlat) {
        const platScaleY = 1 - ratio * 0.24;
        currPlat.visualGroup.scale.y = platScaleY;
        const sinkY = (platScaleY - 1) * PHYSICS.PLATFORM_HEIGHT;
        this.character.root.position.y = sinkY;
      }

      // 脚底蓄力光环脉动收缩
      const ringMat = this.character.chargeRing.material as THREE.MeshBasicMaterial;
      ringMat.opacity = 0.35 + ratio * 0.55;
      const pulse = 1.65 - ratio * 0.72 + Math.sin(this.elapsed * 16) * 0.06;
      this.character.chargeRing.scale.setScalar(pulse);
      this.character.chargeRing.rotation.z += dt * 3;

      // 汇聚金色圣诞星尘粒子
      this.chargeSparkTimer += dt;
      if (this.chargeSparkTimer >= 0.055) {
        this.chargeSparkTimer = 0;
        this.particles.emitChargeSpark(this.character.root.position);
      }

      this.audio.updateCharge(ratio);
      this.callbacks.onChargeProgress(ratio, true);
      this.updateAssistGuide(ratio);
    } else if (this.phase === 'jumping') {
      this.jumpElapsed += dt;
      const t = Math.min(1, this.jumpElapsed / this.jumpDuration);

      // 抛物线运动
      const x = this.jumpStartPos.x + this.jumpDirVec.x * this.jumpDist * t;
      const z = this.jumpStartPos.z + this.jumpDirVec.z * this.jumpDist * t;
      const y = 4 * this.jumpPeak * t * (1 - t);
      this.character.root.position.set(x, y, z);

      // 起跳时纵向拉伸 -> 空中舒展还原
      const stretch = Math.sin(t * Math.PI) * 0.2;
      const sy = 1 + stretch;
      const sxz = 1 / Math.sqrt(sy);
      this.character.squashGroup.scale.set(sxz, sy, sxz);

      // 360° 空中前空翻！在角色局部坐标系中角色始终朝 +Z，绕局部 +X 轴旋转就是帅气的前空翻！
      const flipEase = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      this.character.tiltGroup.rotation.set(flipEase * Math.PI * 2, 0, 0);

      if (t >= 1) {
        this.character.root.position.set(
          this.jumpStartPos.x + this.jumpDirVec.x * this.jumpDist,
          0,
          this.jumpStartPos.z + this.jumpDirVec.z * this.jumpDist
        );
        this.character.tiltGroup.rotation.set(0, 0, 0);
        this.character.squashGroup.scale.set(1, 1, 1);
        this.resolveLanding();
      }
    } else if (this.phase === 'falling') {
      this.fallTimer += dt;
      if (this.fallMode === 'tip') {
        // 先绕脚底边缘向外侧倾倒，再加速坠入雪夜
        this.fallAngle = Math.min(Math.PI * 0.85, this.fallAngle + dt * 5.2);
        this.character.root.quaternion.setFromAxisAngle(this.fallAxis, this.fallAngle);
        if (this.fallTimer > 0.2) {
          this.fallVel.y -= PHYSICS.GRAVITY * dt;
          this.character.root.position.addScaledVector(this.fallVel, dt);
        } else {
          this.character.root.position.x += this.fallVel.x * dt * 0.35;
          this.character.root.position.z += this.fallVel.z * dt * 0.35;
        }
      } else {
        this.fallVel.y -= PHYSICS.GRAVITY * dt;
        this.character.root.position.addScaledVector(this.fallVel, dt);
        this.character.tiltGroup.rotation.x += dt * 4.5;
      }

      if (this.fallTimer >= 0.82) {
        this.phase = 'gameover';
        this.character.root.quaternion.identity();
        const isNewRecord = this.score > 0 && this.score >= this.bestScore;
        this.emitSnapshot();
        this.callbacks.onGameOver(
          {
            phase: 'gameover',
            score: this.score,
            bestScore: this.bestScore,
            combo: this.combo,
            maxCombo: this.maxCombo,
            jumps: this.jumps,
            usedAssist: this.usedAssistInRun,
            buffs: { ...this.buffs },
            unlockedEggs: [...this.unlockedEggs],
          },
          isNewRecord
        );
      }
    }

    // 6. 留声机派对动态彩灯效果
    if (this.buffs.partyLightsTimer > 0) {
      this.buffs.partyLightsTimer = Math.max(0, this.buffs.partyLightsTimer - dt);
      if (this.buffs.partyLightsTimer === 0) {
        this.emitSnapshot();
      }
      const fade = Math.min(1, this.buffs.partyLightsTimer / 2);
      const hueA = (this.elapsed * 0.35) % 1;
      const hueB = (hueA + 0.45) % 1;
      this.partyLightA.color.setHSL(hueA, 0.9, 0.6);
      this.partyLightB.color.setHSL(hueB, 0.9, 0.6);
      this.partyLightA.intensity = 3.2 * fade;
      this.partyLightB.intensity = 2.8 * fade;
      this.partyLightA.position.set(
        this.camTarget.x + Math.cos(this.elapsed * 2.2) * 8,
        7,
        this.camTarget.z + Math.sin(this.elapsed * 2.2) * 8
      );
      this.partyLightB.position.set(
        this.camTarget.x - Math.cos(this.elapsed * 2.2) * 8,
        6,
        this.camTarget.z - Math.sin(this.elapsed * 2.2) * 8
      );
    } else {
      this.partyLightA.intensity = 0;
      this.partyLightB.intensity = 0;
    }

    // 7. 相机与阴影光源平滑跟随
    this.camTarget.lerp(this.camDesiredTarget, 1 - Math.exp(-CAMERA_CONFIG.LERP_SPEED * dt));

    if (this.phase === 'menu') {
      // 主菜单轻微缓慢环视微缩圣诞世界，并将焦点偏下方，让 3D 主角与圣诞树 100% 呈现在卡片上方的黄金舞台！
      const sway = Math.sin(this.elapsed * 0.45) * 2.8;
      const menuFocusY = -4.6;
      this.camera.position.set(
        this.camTarget.x + CAMERA_CONFIG.OFFSET_X + sway,
        CAMERA_CONFIG.OFFSET_Y + menuFocusY,
        this.camTarget.z + CAMERA_CONFIG.OFFSET_Z + sway * 0.5
      );
      this.camera.lookAt(this.camTarget.x, menuFocusY + 0.4, this.camTarget.z);
    } else {
      this.camera.position.set(
        this.camTarget.x + CAMERA_CONFIG.OFFSET_X,
        CAMERA_CONFIG.OFFSET_Y,
        this.camTarget.z + CAMERA_CONFIG.OFFSET_Z
      );
      this.camera.lookAt(this.camTarget.x, 0.4, this.camTarget.z);
    }

    // 方向光和投影区域同步跟随相机焦点，永不丢阴影！
    this.dirLight.position.set(this.camTarget.x - 10, 24, this.camTarget.z + 14);
    this.dirLight.target.position.copy(this.camTarget);
    this.dirLight.target.updateMatrixWorld();

    // 8. 更新雪花粒子与驯鹿雪橇
    this.particles.setSnowAnchor(this.camTarget);
    this.particles.update(dt, this.elapsed);
    this.sleigh.update(dt, this.elapsed, this.particles);

    this.renderer.render(this.scene, this.camera);
  };

  public dispose(): void {
    cancelAnimationFrame(this.rafId);
    window.removeEventListener('resize', this.handleResize);
    this.audio.stopCharge();
    this.renderer.dispose();
  }
}
