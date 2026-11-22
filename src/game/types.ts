import * as THREE from 'three';

export type CharacterSkin = 'santa' | 'snowman' | 'reindeer';

export type JumpDirection = 'x' | 'z'; // 'x' => (+1, 0, 0) 右上, 'z' => (0, 0, -1) 左上

export type PlatformShape = 'box' | 'cylinder';

export type PlatformKind =
  | 'gift_red'
  | 'gift_green'
  | 'gift_blue'
  | 'cake'
  | 'gingerbread'
  | 'candycane'
  | 'cocoa'
  | 'sweater'
  // 以下为特殊互动彩蛋平台
  | 'egg_mystery_box'
  | 'egg_gramophone'
  | 'egg_tree'
  | 'egg_snowman'
  | 'egg_fireplace'
  | 'egg_wish_star';

export type EasterEggId =
  | 'mystery_box'
  | 'gramophone'
  | 'christmas_tree'
  | 'sleepy_snowman'
  | 'warm_fireplace'
  | 'santa_sleigh';

export interface EasterEggMeta {
  id: EasterEggId;
  emoji: string;
  name: string;
  hint: string;
  rewardText: string;
  stayLabel: string;
}

export interface PlatformEntity {
  id: number;
  kind: PlatformKind;
  shape: PlatformShape;
  group: THREE.Group;        // 世界坐标定位节点 (y = 0)
  visualGroup: THREE.Group;  // 底部锚点缩放容器 (实现弹性下压)
  center: THREE.Vector3;     // 顶面中心世界坐标 (y = 0)
  halfWidth: number;         // box 半宽 (X方向) 或 cylinder 半径
  halfDepth: number;         // box 半深 (Z方向) 或 cylinder 半径
  radius: number;            // cylinder 半径
  easterEgg?: EasterEggId;
  stayDuration?: number;     // 触发彩蛋需要的停留时间 (秒), 0 表示落地即触发
  eggTriggered: boolean;
  /** 平台自身的持续动画更新 (如火苗摇曳、黑胶旋转、圣诞树彩灯闪烁、雪人打呼噜) */
  update?: (dt: number, elapsed: number, triggered: boolean) => void;
  /** 触发彩蛋时的视觉动画钩子 */
  onTriggerEgg?: () => void;
}

export type GamePhase =
  | 'menu'
  | 'idle'
  | 'charging'
  | 'jumping'
  | 'falling'
  | 'gameover';

export interface ActiveBuffs {
  shield: boolean;         // 圣诞护盾：抵挡一次掉落
  doubleScoreJumps: number;// 暖冬壁炉：接下来 N 跳双倍得分
  partyLightsTimer: number;// 留声机派对彩灯持续秒数
}

export interface GameSnapshot {
  phase: GamePhase;
  score: number;
  bestScore: number;
  combo: number;
  maxCombo: number;
  jumps: number;
  usedAssist: boolean;
  buffs: ActiveBuffs;
  unlockedEggs: EasterEggId[];
}

export interface FloatingMessage {
  text: string;
  subtext?: string;
  color?: string;
  scale?: number;
  screenX: number; // 0~100 vw
  screenY: number; // 0~100 vh
}

export interface GameCallbacks {
  onStateChange: (snapshot: GameSnapshot) => void;
  onFloatingText: (msg: FloatingMessage) => void;
  onEggUnlocked: (egg: EasterEggMeta, isNew: boolean, extraDetail?: string) => void;
  onStayProgress: (visible: boolean, progress: number, emoji: string, label: string) => void;
  onChargeProgress: (ratio: number, charging: boolean) => void;
  onGameOver: (snapshot: GameSnapshot, isNewRecord: boolean) => void;
}
