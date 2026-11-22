import { EasterEggId, EasterEggMeta, PlatformKind } from './types';

export const PHYSICS = {
  PLATFORM_HEIGHT: 2.2,
  MIN_JUMP_DIST: 1.25,
  MAX_JUMP_DIST: 13.8,
  MAX_CHARGE_TIME: 1.48,     // 秒，满蓄力时间
  PERFECT_RADIUS: 0.56,      // 命中靶心判定半径
  FOOT_TOLERANCE: 0.14,      // 落脚容错
  TIP_MARGIN: 0.68,          // 边缘失衡翻倒宽度
  GRAVITY: 42,
  MIN_GAP: 4.5,              // 平台中心最小间距
  MAX_GAP: 9.8,              // 平台中心最大间距
  MAX_PLATFORMS_KEEP: 11,    // 场景中最多保留的历史平台数量
};

export const CAMERA_CONFIG = {
  // 相机位于左前上方 (-X, +Y, +Z)，确保 +X 指向屏幕右上 (↗)，-Z 指向屏幕左上 (↖)
  OFFSET_X: -20,
  OFFSET_Y: 23.5,
  OFFSET_Z: 20,
  BASE_FRUSTUM: 17.5,
  MOBILE_FRUSTUM: 22.5,
  LERP_SPEED: 4.8,
};

export const STORAGE_KEYS = {
  BEST_SCORE: 'santa_hop_best_score_v1',
  UNLOCKED_EGGS: 'santa_hop_eggs_v1',
  SKIN: 'santa_hop_skin_v1',
};

export const NORMAL_PLATFORM_POOL: PlatformKind[] = [
  'gift_red',
  'gift_green',
  'gift_blue',
  'cake',
  'gingerbread',
  'candycane',
  'cocoa',
  'sweater',
];

export const EGG_PLATFORM_POOL: PlatformKind[] = [
  'egg_mystery_box',
  'egg_gramophone',
  'egg_tree',
  'egg_snowman',
  'egg_fireplace',
  'egg_wish_star',
];

export const EASTER_EGGS: Record<EasterEggId, EasterEggMeta> = {
  mystery_box: {
    id: 'mystery_box',
    emoji: '🎁',
    name: '神秘圣诞盲盒',
    hint: '在发光的“？”金色礼盒上原地停留 1.4 秒，礼盒将会砰地弹开！',
    rewardText: '+15分 & 圣诞护盾祝福',
    stayLabel: '礼盒在轻轻颤动...',
  },
  gramophone: {
    id: 'gramophone',
    emoji: '🎵',
    name: '派对黑胶留声机',
    hint: '跳上复古圣诞留声机并停留 1.4 秒，开启霓虹派对与圣诞乐章！',
    rewardText: '+20分 & 全场霓虹派对灯',
    stayLabel: '正在放下唱针...',
  },
  christmas_tree: {
    id: 'christmas_tree',
    emoji: '🎄',
    name: '星光圣诞树奇迹',
    hint: '跳上雪松圣诞树台座停留 1.2 秒，逐层点亮七彩彩灯与树顶金星！',
    rewardText: '+25分 & 星尘祈愿礼花',
    stayLabel: '正在点亮圣诞彩灯...',
  },
  sleepy_snowman: {
    id: 'sleepy_snowman',
    emoji: '⛄',
    name: '打瞌睡的雪人嘉宾',
    hint: '跳上雪人冰台把它轻轻震醒，它会开心地为你抛帽子撒雪花！',
    rewardText: '+15分 & 欢呼雪球礼花',
    stayLabel: '雪人正在揉眼睛...',
  },
  warm_fireplace: {
    id: 'warm_fireplace',
    emoji: '🔥',
    name: '壁炉与圣诞袜',
    hint: '在温暖壁炉台上停留 1.4 秒烤烤火，圣诞袜会掉出双倍星星糖！',
    rewardText: '+20分 & 接下来3跳双倍得分',
    stayLabel: '烤火暖身中...',
  },
  santa_sleigh: {
    id: 'santa_sleigh',
    emoji: '🛷',
    name: '驯鹿雪橇飞跃夜空',
    hint: '达成 3 连 PERFECT、总分突破 45 分，或在许愿星台上停留召唤圣诞雪橇！',
    rewardText: '+30分 & 3D 驯鹿雪橇划破银河',
    stayLabel: '正在向圣诞夜空许愿...',
  },
};

export const EGG_LIST: EasterEggMeta[] = [
  EASTER_EGGS.mystery_box,
  EASTER_EGGS.gramophone,
  EASTER_EGGS.christmas_tree,
  EASTER_EGGS.sleepy_snowman,
  EASTER_EGGS.warm_fireplace,
  EASTER_EGGS.santa_sleigh,
];

export function getRankTitle(score: number): string {
  if (score >= 220) return '👑 圣诞夜传奇大魔法师';
  if (score >= 140) return '🛷 驯鹿雪橇领航员';
  if (score >= 85) return '🎄 星光派对超级明星';
  if (score >= 45) return '🎁 姜饼跳跃达人';
  if (score >= 20) return '⛄ 圣诞小精灵学徒';
  return '❄️ 雪夜派对初体验';
}
