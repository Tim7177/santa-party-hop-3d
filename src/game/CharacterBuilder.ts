import * as THREE from 'three';
import { CharacterSkin } from './types';

export interface CharacterRig {
  root: THREE.Group;        // 世界位置节点（位于落点表面 y=0）
  tiltGroup: THREE.Group;   // 空中翻转与边缘跌倒倾覆节点
  squashGroup: THREE.Group; // 蓄力压扁/弹性拉伸节点 (原点在脚底 y=0)
  shieldRing: THREE.Group;  // 圣诞护盾光环
  chargeRing: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>;   // 脚下蓄力扩散星环
  pomPom?: THREE.Object3D;  // 帽子毛球/鹿角等细节摆动部件
}

function makeMat(
  color: number,
  roughness = 0.48,
  metalness = 0.05,
  emissive = 0x000000,
  emissiveIntensity = 0
): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness,
    emissive,
    emissiveIntensity,
  });
}

function enableShadows(obj: THREE.Object3D): void {
  obj.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
}

/**
 * 构建精美 Q 版 3D 圣诞派对角色
 * 所有角色底部都精确落在 y = 0，总高约 1.85~2.0，轮廓饱满清晰易于判断落点
 */
export function buildCharacter(skin: CharacterSkin): CharacterRig {
  const root = new THREE.Group();
  const tiltGroup = new THREE.Group();
  const squashGroup = new THREE.Group();

  root.add(tiltGroup);
  tiltGroup.add(squashGroup);

  let pomPom: THREE.Object3D | undefined;

  if (skin === 'santa') {
    pomPom = buildSantaModel(squashGroup);
  } else if (skin === 'snowman') {
    pomPom = buildSnowmanModel(squashGroup);
  } else {
    pomPom = buildReindeerModel(squashGroup);
  }

  enableShadows(squashGroup);

  // 护盾金色魔法光环（平时隐藏）
  const shieldRing = new THREE.Group();
  shieldRing.position.y = 0.9;
  shieldRing.visible = false;

  const haloGeo = new THREE.TorusGeometry(0.76, 0.045, 10, 32);
  const haloMat = new THREE.MeshBasicMaterial({
    color: 0xffdf6b,
    transparent: true,
    opacity: 0.85,
  });
  const haloMesh = new THREE.Mesh(haloGeo, haloMat);
  haloMesh.rotation.x = Math.PI / 2;
  shieldRing.add(haloMesh);

  const haloMesh2 = new THREE.Mesh(
    new THREE.TorusGeometry(0.68, 0.025, 8, 28),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.65 })
  );
  haloMesh2.rotation.x = Math.PI / 2.6;
  shieldRing.add(haloMesh2);

  // 4颗环绕护盾小金星
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2;
    const star = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.09),
      new THREE.MeshBasicMaterial({ color: 0xfff3a8 })
    );
    star.position.set(Math.cos(a) * 0.78, 0, Math.sin(a) * 0.78);
    shieldRing.add(star);
  }
  root.add(shieldRing);

  // 脚下蓄力光环（蓄力时显现并脉动收缩）
  const chargeRingGeo = new THREE.RingGeometry(0.45, 0.62, 32);
  const chargeRingMat = new THREE.MeshBasicMaterial({
    color: 0xffe066,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.0,
    depthWrite: false,
  });
  const chargeRing = new THREE.Mesh(chargeRingGeo, chargeRingMat);
  chargeRing.rotation.x = -Math.PI / 2;
  chargeRing.position.y = 0.03;
  root.add(chargeRing);

  return { root, tiltGroup, squashGroup, shieldRing, chargeRing, pomPom };
}

function buildSantaModel(parent: THREE.Group): THREE.Object3D {
  const redCoat = makeMat(0xd92638, 0.42);
  const whiteFur = makeMat(0xfdf7f0, 0.72);
  const skinMat = makeMat(0xffd2b3, 0.45);
  const beltMat = makeMat(0x231f20, 0.35, 0.2);
  const goldMat = makeMat(0xf7c948, 0.25, 0.75, 0x6b4b00, 0.25);
  const eyeMat = makeMat(0x1f1d24, 0.2);
  const blushMat = makeMat(0xff7a8a, 0.5);

  // 圆润底座白毛边（确保落点剪影非常清晰）
  const baseFur = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.48, 0.18, 24), whiteFur);
  baseFur.position.y = 0.09;
  parent.add(baseFur);

  // 圆滚滚圣诞红大衣身体（经典跳一跳棋子比例）
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.44, 0.82, 24), redCoat);
  body.position.y = 0.56;
  parent.add(body);

  // 黑色皮带 + 金色扣环
  const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.355, 0.385, 0.14, 24), beltMat);
  belt.position.y = 0.44;
  parent.add(belt);

  const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.16, 0.12), goldMat);
  buckle.position.set(0, 0.44, 0.36);
  parent.add(buckle);

  // 脖间白色小绒领
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.075, 12, 24), whiteFur);
  collar.rotation.x = Math.PI / 2;
  collar.position.y = 0.98;
  parent.add(collar);

  // 小手臂
  const armL = new THREE.Mesh(new THREE.CapsuleGeometry(0.085, 0.22, 6, 12), redCoat);
  armL.position.set(-0.37, 0.72, 0.03);
  armL.rotation.z = 0.45;
  parent.add(armL);

  const armR = new THREE.Mesh(new THREE.CapsuleGeometry(0.085, 0.22, 6, 12), redCoat);
  armR.position.set(0.37, 0.72, 0.03);
  armR.rotation.z = -0.45;
  parent.add(armR);

  // Q萌圆头
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.31, 24, 20), skinMat);
  head.position.y = 1.24;
  parent.add(head);

  // 蓬松白胡子
  const beardMain = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 14), whiteFur);
  beardMain.scale.set(1.1, 0.82, 0.7);
  beardMain.position.set(0, 1.09, 0.2);
  parent.add(beardMain);

  const mustacheL = new THREE.Mesh(new THREE.SphereGeometry(0.085, 12, 10), whiteFur);
  mustacheL.scale.set(1.3, 0.75, 0.75);
  mustacheL.position.set(-0.085, 1.18, 0.28);
  parent.add(mustacheL);

  const mustacheR = mustacheL.clone();
  mustacheR.position.x = 0.085;
  parent.add(mustacheR);

  // 小圆红鼻 + 眼睛 + 腮红
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 10), blushMat);
  nose.position.set(0, 1.23, 0.31);
  parent.add(nose);

  const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.036, 10, 10), eyeMat);
  eyeL.position.set(-0.11, 1.29, 0.28);
  parent.add(eyeL);

  const eyeR = eyeL.clone();
  eyeR.position.x = 0.11;
  parent.add(eyeR);

  // 圣诞红帽 + 歪顶毛球
  const hatGroup = new THREE.Group();
  hatGroup.position.set(0, 1.44, 0);
  hatGroup.rotation.z = -0.15;
  hatGroup.rotation.x = -0.06;

  const hatBrim = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.08, 12, 24), whiteFur);
  hatBrim.rotation.x = Math.PI / 2;
  hatGroup.add(hatBrim);

  const hatCone = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.56, 20), redCoat);
  hatCone.position.y = 0.28;
  hatGroup.add(hatCone);

  const pom = new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 12), whiteFur);
  pom.position.set(0.04, 0.57, 0);
  hatGroup.add(pom);

  parent.add(hatGroup);
  return hatGroup;
}

function buildSnowmanModel(parent: THREE.Group): THREE.Object3D {
  const snowMat = makeMat(0xf4f9ff, 0.55);
  const scarfRed = makeMat(0xe63946, 0.6);
  const scarfGold = makeMat(0xffd166, 0.5);
  const carrotMat = makeMat(0xff7b25, 0.45);
  const coalMat = makeMat(0x22252a, 0.35);
  const hatMat = makeMat(0x1f3a52, 0.48);

  // 底部圆润雪球（稍扁站得稳）
  const bottomBall = new THREE.Mesh(new THREE.SphereGeometry(0.46, 24, 18), snowMat);
  bottomBall.scale.set(1, 0.88, 1);
  bottomBall.position.y = 0.4;
  parent.add(bottomBall);

  // 中间身体球
  const midBall = new THREE.Mesh(new THREE.SphereGeometry(0.35, 22, 18), snowMat);
  midBall.position.y = 0.92;
  parent.add(midBall);

  // 煤球纽扣
  for (let i = 0; i < 2; i++) {
    const btn = new THREE.Mesh(new THREE.SphereGeometry(0.048, 10, 10), coalMat);
    btn.position.set(0, 0.84 + i * 0.16, 0.33);
    parent.add(btn);
  }

  // 暖红围巾
  const scarf = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.085, 12, 24), scarfRed);
  scarf.rotation.x = Math.PI / 2;
  scarf.position.y = 1.15;
  parent.add(scarf);

  const scarfTail = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.34, 0.06), scarfRed);
  scarfTail.position.set(0.18, 0.98, 0.26);
  scarfTail.rotation.z = 0.25;
  parent.add(scarfTail);

  const scarfStripe = new THREE.Mesh(new THREE.BoxGeometry(0.135, 0.05, 0.065), scarfGold);
  scarfStripe.position.set(0.21, 0.88, 0.26);
  scarfStripe.rotation.z = 0.25;
  parent.add(scarfStripe);

  // 头部雪球
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.27, 22, 18), snowMat);
  head.position.y = 1.4;
  parent.add(head);

  // 胡萝卜尖鼻子
  const carrot = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.24, 12), carrotMat);
  carrot.rotation.x = Math.PI / 2;
  carrot.position.set(0, 1.4, 0.34);
  parent.add(carrot);

  // 眼睛
  const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.036, 10, 10), coalMat);
  eyeL.position.set(-0.1, 1.46, 0.24);
  parent.add(eyeL);
  const eyeR = eyeL.clone();
  eyeR.position.x = 0.1;
  parent.add(eyeR);

  // 树枝小手
  const twigMat = makeMat(0x6b4226, 0.8);
  const twigL = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.36, 8), twigMat);
  twigL.position.set(-0.42, 0.98, 0);
  twigL.rotation.z = 1.1;
  parent.add(twigL);

  const twigR = twigL.clone();
  twigR.position.x = 0.42;
  twigR.rotation.z = -1.1;
  parent.add(twigR);

  // 迷你圣诞礼帽
  const topHat = new THREE.Group();
  topHat.position.set(0, 1.62, 0);
  topHat.rotation.z = 0.14;

  const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.05, 22), hatMat);
  topHat.add(brim);

  const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.34, 20), hatMat);
  crown.position.y = 0.19;
  topHat.add(crown);

  const ribbon = new THREE.Mesh(new THREE.CylinderGeometry(0.225, 0.225, 0.07, 20), scarfRed);
  ribbon.position.y = 0.07;
  topHat.add(ribbon);

  parent.add(topHat);
  return topHat;
}

function buildReindeerModel(parent: THREE.Group): THREE.Object3D {
  const furBrown = makeMat(0x9c6644, 0.58);
  const bellyTan = makeMat(0xe6ccb2, 0.62);
  const antlerMat = makeMat(0x583101, 0.72);
  const scarfGreen = makeMat(0x2a9d8f, 0.55);
  const redGlowNose = makeMat(0xff2a3c, 0.25, 0.1, 0xff1e2d, 0.75);
  const eyeMat = makeMat(0x1b1a1f, 0.2);
  const goldBell = makeMat(0xffd166, 0.22, 0.8);

  // 蹄底圆盘
  const hoof = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.44, 0.16, 22), antlerMat);
  hoof.position.y = 0.08;
  parent.add(hoof);

  // 身体
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.42, 0.84, 24), furBrown);
  body.position.y = 0.56;
  parent.add(body);

  // 浅棕暖肚子
  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.25, 16, 14), bellyTan);
  belly.scale.set(0.95, 1.25, 0.65);
  belly.position.set(0, 0.56, 0.23);
  parent.add(belly);

  // 松石绿圣诞围巾 + 金色小铃铛
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.08, 12, 24), scarfGreen);
  collar.rotation.x = Math.PI / 2;
  collar.position.y = 0.99;
  parent.add(collar);

  const bell = new THREE.Mesh(new THREE.SphereGeometry(0.08, 14, 12), goldBell);
  bell.position.set(0, 0.92, 0.33);
  parent.add(bell);

  // 头部
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 22, 18), furBrown);
  head.position.y = 1.28;
  parent.add(head);

  // 浅色口鼻
  const snout = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12), bellyTan);
  snout.scale.set(1.15, 0.85, 0.95);
  snout.position.set(0, 1.22, 0.25);
  parent.add(snout);

  // 标志性发光红鼻子！
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.095, 16, 14), redGlowNose);
  nose.position.set(0, 1.26, 0.39);
  parent.add(nose);

  // 眼睛
  const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.038, 10, 10), eyeMat);
  eyeL.position.set(-0.12, 1.35, 0.27);
  parent.add(eyeL);
  const eyeR = eyeL.clone();
  eyeR.position.x = 0.12;
  parent.add(eyeR);

  // 小耳朵
  const earL = new THREE.Mesh(new THREE.SphereGeometry(0.095, 12, 10), furBrown);
  earL.scale.set(1.5, 0.7, 0.55);
  earL.position.set(-0.33, 1.37, 0);
  earL.rotation.z = 0.35;
  parent.add(earL);

  const earR = earL.clone();
  earR.position.x = 0.33;
  earR.rotation.z = -0.35;
  parent.add(earR);

  // 对称小鹿角组
  const antlers = new THREE.Group();
  antlers.position.set(0, 1.54, 0);

  for (const side of [-1, 1]) {
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.042, 0.42, 10), antlerMat);
    stem.position.set(side * 0.18, 0.16, 0);
    stem.rotation.z = -side * 0.38;
    antlers.add(stem);

    const prong = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.028, 0.22, 8), antlerMat);
    prong.position.set(side * 0.29, 0.22, 0.04);
    prong.rotation.z = -side * 0.9;
    antlers.add(prong);
  }

  parent.add(antlers);
  return antlers;
}
