import * as THREE from 'three';
import { ParticleSystem } from './ParticleSystem';

/**
 * 隐藏彩蛋实体：飞跃圣诞夜空的 3D 发光驯鹿雪橇！
 * 沿着横穿当前视野上空的优美弧线飞过，洒落银河星尘与圣诞彩灯
 */
export class SleighEffect {
  private group: THREE.Group;
  private reindeerModels: THREE.Group[] = [];
  private active = false;
  private progress = 0;
  private duration = 4.6;
  private startPos = new THREE.Vector3();
  private endPos = new THREE.Vector3();
  private sparkleAcc = 0;

  constructor(scene: THREE.Scene) {
    this.group = this.buildSleighModel();
    this.group.visible = false;
    scene.add(this.group);
  }

  private buildSleighModel(): THREE.Group {
    const root = new THREE.Group();

    const sleighRed = new THREE.MeshStandardMaterial({
      color: 0xd92638,
      roughness: 0.35,
      emissive: 0x550810,
      emissiveIntensity: 0.35,
    });
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xffd166,
      roughness: 0.25,
      metalness: 0.8,
      emissive: 0xaa7700,
      emissiveIntensity: 0.4,
    });
    const bagMat = new THREE.MeshStandardMaterial({ color: 0x2b9348, roughness: 0.65 });
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });

    // 雪橇本体（沿 +Z 朝前）
    const sleighBody = new THREE.Group();
    const hull = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.55, 1.55), sleighRed);
    hull.position.y = 0.42;
    sleighBody.add(hull);

    const backRest = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.6, 0.22), sleighRed);
    backRest.position.set(0, 0.78, -0.68);
    backRest.rotation.x = -0.22;
    sleighBody.add(backRest);

    // 金色雪橇滑刃
    for (const side of [-0.52, 0.52]) {
      const runner = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 2.0), goldMat);
      runner.position.set(side, 0.06, 0.12);
      sleighBody.add(runner);

      const curl = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.04, 8, 14, Math.PI), goldMat);
      curl.rotation.y = Math.PI / 2;
      curl.position.set(side, 0.26, 1.1);
      sleighBody.add(curl);
    }

    // 满满的礼物袋 + 迷你圣诞老人剪影
    const sack = new THREE.Mesh(new THREE.SphereGeometry(0.45, 12, 10), bagMat);
    sack.position.set(0, 0.85, -0.28);
    sleighBody.add(sack);

    const miniSanta = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.65, 12), sleighRed);
    miniSanta.position.set(0, 0.95, 0.28);
    sleighBody.add(miniSanta);

    const santaHead = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 10), whiteMat);
    santaHead.position.set(0, 1.28, 0.28);
    sleighBody.add(santaHead);

    // 温暖随行点光源照亮雪橇
    const glow = new THREE.PointLight(0xffd670, 2.2, 10);
    glow.position.set(0, 1.0, 0.5);
    sleighBody.add(glow);

    root.add(sleighBody);

    // 前方领航的两只飞行驯鹿
    const furMat = new THREE.MeshStandardMaterial({ color: 0xa46b3e, roughness: 0.55 });
    const noseGlow = new THREE.MeshBasicMaterial({ color: 0xff2e3d });
    const reinMat = new THREE.MeshBasicMaterial({ color: 0xffe066 });

    for (const offset of [
      { x: -0.45, z: 2.3 },
      { x: 0.45, z: 2.55 },
    ]) {
      const deer = new THREE.Group();
      deer.position.set(offset.x, 0.35, offset.z);

      const torso = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.3, 0.72), furMat);
      deer.add(torso);

      const neck = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.36, 0.18), furMat);
      neck.position.set(0, 0.24, 0.3);
      neck.rotation.x = 0.28;
      deer.add(neck);

      const head = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.32), furMat);
      head.position.set(0, 0.42, 0.44);
      deer.add(head);

      const nose = new THREE.Mesh(new THREE.SphereGeometry(0.065, 10, 8), noseGlow);
      nose.position.set(0, 0.43, 0.62);
      deer.add(nose);

      // 鹿角
      for (const s of [-1, 1]) {
        const antler = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.02, 0.28, 6), goldMat);
        antler.position.set(s * 0.1, 0.6, 0.38);
        antler.rotation.z = -s * 0.4;
        deer.add(antler);
      }

      // 金色缰绳连接雪橇
      const rein = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.025, 1.8), reinMat);
      rein.position.set(offset.x * 0.5, 0.58, 1.45);
      root.add(rein);

      root.add(deer);
      this.reindeerModels.push(deer);
    }

    root.scale.setScalar(0.95);
    return root;
  }

  public isActive(): boolean {
    return this.active;
  }

  /** 围绕当前焦点触发一次横穿屏幕夜空的飞行 */
  public launch(anchor: THREE.Vector3): void {
    this.active = true;
    this.progress = 0;
    this.sparkleAcc = 0;
    this.group.visible = true;

    // 相机屏幕向右方向大致为 (+1, 0, +1)，让雪橇从屏幕左上方滑翔到右上方！
    this.startPos.set(anchor.x - 13, 6.2, anchor.z - 15);
    this.endPos.set(anchor.x + 15, 7.2, anchor.z + 11);
  }

  public update(dt: number, elapsed: number, particles: ParticleSystem): void {
    if (!this.active) return;

    this.progress += dt / this.duration;
    if (this.progress >= 1) {
      this.active = false;
      this.group.visible = false;
      return;
    }

    const t = this.progress;
    const pos = new THREE.Vector3().lerpVectors(this.startPos, this.endPos, t);
    // 优雅的弧形滑翔高度波动
    pos.y += Math.sin(t * Math.PI) * 2.2 + Math.sin(elapsed * 4.2) * 0.25;

    const nextPos = new THREE.Vector3().lerpVectors(
      this.startPos,
      this.endPos,
      Math.min(1, t + 0.02)
    );
    nextPos.y += Math.sin(Math.min(1, t + 0.02) * Math.PI) * 2.2;

    this.group.position.copy(pos);
    this.group.lookAt(nextPos);

    // 驯鹿空中轻快跃动
    this.reindeerModels.forEach((deer, idx) => {
      deer.position.y = 0.35 + Math.sin(elapsed * 9 + idx * Math.PI * 0.6) * 0.16;
      deer.rotation.x = Math.cos(elapsed * 9 + idx * Math.PI * 0.6) * 0.18;
    });

    // 洒落金色圣诞星河尾迹
    this.sparkleAcc += dt;
    if (this.sparkleAcc >= 0.04) {
      this.sparkleAcc = 0;
      const trailPos = pos.clone().add(
        new THREE.Vector3(
          (Math.random() - 0.5) * 0.8,
          (Math.random() - 0.5) * 0.5,
          (Math.random() - 0.5) * 0.8
        )
      );
      const colors = [0xffd166, 0xfff3b0, 0xff5c8a, 0x80ffdb];
      const c = colors[Math.floor(Math.random() * colors.length)];
      particles.emitAmbientSparkle(trailPos, c, 0.85, -0.3);
    }
  }
}
