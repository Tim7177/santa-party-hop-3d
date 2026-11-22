import * as THREE from 'three';

interface BurstParticle {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  rotVel: THREE.Vector3;
  life: number;
  maxLife: number;
  gravity: number;
  baseScale: number;
  fadeOut: boolean;
}

interface RippleRing {
  mesh: THREE.Mesh;
  life: number;
  maxLife: number;
  maxScale: number;
}

const FESTIVE_COLORS = [
  0xff4d6d, // 圣诞红
  0xffd166, // 暖星金
  0x2ec4b6, // 松石绿
  0xffffff, // 雪花白
  0xff9f1c, // 糖果橙
  0x80ed99, // 薄荷绿
];

/**
 * 圣诞派对 3D 粒子系统
 * 包含：
 * 1. 全场景景深飘落雪花 (Points 渲染，性能极佳)
 * 2. 蓄力汇聚金尘、落地彩带礼花、音符上升、雪球烟花、壁炉暖光星尘
 * 3. 平台表面扩散涟漪光环（Perfect 金环 / 普通雪环）
 */
export class ParticleSystem {
  private scene: THREE.Scene;

  // 飘雪系统
  private snowPoints: THREE.Points;
  private snowPositions: Float32Array;
  private snowSpeeds: Float32Array;
  private snowCount = 340;
  private snowAnchor = new THREE.Vector3();

  // 瞬态 3D 粒子池
  private particles: BurstParticle[] = [];
  private ripples: RippleRing[] = [];

  // 共享几何体以提升性能
  private boxGeo = new THREE.BoxGeometry(0.14, 0.14, 0.14);
  private octaGeo = new THREE.OctahedronGeometry(0.12);
  private sphereGeo = new THREE.SphereGeometry(0.1, 8, 8);
  private confettiGeo = new THREE.BoxGeometry(0.2, 0.04, 0.12);
  private ringGeo = new THREE.RingGeometry(0.32, 0.52, 32);

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    const { points, positions, speeds } = this.createSnowField();
    this.snowPoints = points;
    this.snowPositions = positions;
    this.snowSpeeds = speeds;
    this.scene.add(this.snowPoints);
  }

  private createSnowField() {
    const positions = new Float32Array(this.snowCount * 3);
    const speeds = new Float32Array(this.snowCount * 2); // [fallSpeed, driftPhase]

    for (let i = 0; i < this.snowCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 46;
      positions[i * 3 + 1] = Math.random() * 28 - 4;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 46;
      speeds[i * 2] = 1.4 + Math.random() * 2.1;
      speeds[i * 2 + 1] = Math.random() * Math.PI * 2;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    // 程序化生成柔和发光圆形雪花贴图
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    const grad = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(0.45, 'rgba(235, 248, 255, 0.85)');
    grad.addColorStop(1, 'rgba(220, 240, 255, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);

    const snowTex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.PointsMaterial({
      size: 11,
      sizeAttenuation: false,
      map: snowTex,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const points = new THREE.Points(geo, mat);
    return { points, positions, speeds };
  }

  /** 跟随相机焦点的雪花锚点 */
  public setSnowAnchor(pos: THREE.Vector3): void {
    this.snowAnchor.copy(pos);
  }

  /** 蓄力时向角色脚底聚拢的金色圣诞星尘 */
  public emitChargeSpark(origin: THREE.Vector3): void {
    const angle = Math.random() * Math.PI * 2;
    const radius = 1.15 + Math.random() * 0.7;
    const startPos = new THREE.Vector3(
      origin.x + Math.cos(angle) * radius,
      origin.y + 0.1 + Math.random() * 0.9,
      origin.z + Math.sin(angle) * radius
    );

    const toCenter = origin.clone().add(new THREE.Vector3(0, 0.35, 0)).sub(startPos);
    toCenter.multiplyScalar(2.6);

    const color = Math.random() > 0.35 ? 0xffe066 : 0xffffff;
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95 });
    const mesh = new THREE.Mesh(this.octaGeo, mat);
    mesh.position.copy(startPos);
    const scale = 0.55 + Math.random() * 0.5;
    mesh.scale.setScalar(scale);
    this.scene.add(mesh);

    this.particles.push({
      mesh,
      vel: toCenter,
      rotVel: new THREE.Vector3(4, 5, 3),
      life: 0,
      maxLife: 0.38,
      gravity: 0,
      baseScale: scale,
      fadeOut: true,
    });
  }

  /** 普通落地雪尘 + 柔和白涟漪 */
  public emitLandingDust(pos: THREE.Vector3): void {
    this.spawnRipple(pos, 0xe8f4ff, 2.2, 0.45);
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 + Math.random() * 0.3;
      const speed = 1.5 + Math.random() * 2.0;
      const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 });
      const mesh = new THREE.Mesh(this.sphereGeo, mat);
      mesh.position.set(pos.x, pos.y + 0.08, pos.z);
      const scale = 0.5 + Math.random() * 0.55;
      mesh.scale.setScalar(scale);
      this.scene.add(mesh);

      this.particles.push({
        mesh,
        vel: new THREE.Vector3(Math.cos(a) * speed, 1.4 + Math.random() * 1.4, Math.sin(a) * speed),
        rotVel: new THREE.Vector3(2, 2, 2),
        life: 0,
        maxLife: 0.48 + Math.random() * 0.2,
        gravity: 7.5,
        baseScale: scale,
        fadeOut: true,
      });
    }
  }

  /** 精准命中靶心：金色雪花星环 + 圣诞派对彩带喷发 */
  public emitPerfectBurst(pos: THREE.Vector3, combo: number): void {
    this.spawnRipple(pos, 0xffd166, 3.2 + Math.min(combo, 5) * 0.3, 0.65);
    this.spawnRipple(pos, 0xffffff, 2.3, 0.48);

    const count = 18 + Math.min(combo * 3, 20);
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const speed = 2.2 + Math.random() * 3.8;
      const color = FESTIVE_COLORS[Math.floor(Math.random() * FESTIVE_COLORS.length)];
      const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1 });
      const geo = i % 2 === 0 ? this.confettiGeo : this.octaGeo;
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(pos.x, pos.y + 0.15, pos.z);
      const scale = 0.7 + Math.random() * 0.65;
      mesh.scale.setScalar(scale);
      this.scene.add(mesh);

      this.particles.push({
        mesh,
        vel: new THREE.Vector3(
          Math.cos(a) * speed,
          4.2 + Math.random() * 3.6,
          Math.sin(a) * speed
        ),
        rotVel: new THREE.Vector3(
          (Math.random() - 0.5) * 14,
          (Math.random() - 0.5) * 14,
          (Math.random() - 0.5) * 14
        ),
        life: 0,
        maxLife: 0.85 + Math.random() * 0.45,
        gravity: 11,
        baseScale: scale,
        fadeOut: true,
      });
    }
  }

  /** 彩蛋触发盛大礼花烟火 */
  public emitCelebrationFireworks(pos: THREE.Vector3, palette: number[] = FESTIVE_COLORS): void {
    this.spawnRipple(pos, 0xffd166, 4.4, 0.85);
    for (let i = 0; i < 36; i++) {
      const a = Math.random() * Math.PI * 2;
      const speed = 2.0 + Math.random() * 5.2;
      const color = palette[Math.floor(Math.random() * palette.length)];
      const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1 });
      const geo = i % 3 === 0 ? this.confettiGeo : i % 3 === 1 ? this.octaGeo : this.boxGeo;
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(pos.x, pos.y + 0.4, pos.z);
      const scale = 0.75 + Math.random() * 0.85;
      mesh.scale.setScalar(scale);
      this.scene.add(mesh);

      this.particles.push({
        mesh,
        vel: new THREE.Vector3(
          Math.cos(a) * speed,
          5.5 + Math.random() * 5.0,
          Math.sin(a) * speed
        ),
        rotVel: new THREE.Vector3(
          (Math.random() - 0.5) * 16,
          (Math.random() - 0.5) * 16,
          (Math.random() - 0.5) * 16
        ),
        life: 0,
        maxLife: 1.05 + Math.random() * 0.55,
        gravity: 12.5,
        baseScale: scale,
        fadeOut: true,
      });
    }
  }

  /** 上升闪烁星尘（用于雪橇尾迹、热可可蒸汽、留声机音符光点、彩蛋平台吸引微光） */
  public emitAmbientSparkle(
    pos: THREE.Vector3,
    color = 0xffe066,
    scale = 0.65,
    upSpeed = 1.6
  ): void {
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 });
    const mesh = new THREE.Mesh(this.octaGeo, mat);
    mesh.position.copy(pos);
    mesh.scale.setScalar(scale);
    this.scene.add(mesh);

    this.particles.push({
      mesh,
      vel: new THREE.Vector3(
        (Math.random() - 0.5) * 0.7,
        upSpeed + Math.random() * 0.8,
        (Math.random() - 0.5) * 0.7
      ),
      rotVel: new THREE.Vector3(3, 5, 2),
      life: 0,
      maxLife: 0.75 + Math.random() * 0.35,
      gravity: -0.4,
      baseScale: scale,
      fadeOut: true,
    });
  }

  private spawnRipple(pos: THREE.Vector3, color: number, maxScale: number, maxLife: number): void {
    const mat = new THREE.MeshBasicMaterial({
      color,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(this.ringGeo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(pos.x, pos.y + 0.04, pos.z);
    this.scene.add(mesh);

    this.ripples.push({ mesh, life: 0, maxLife, maxScale });
  }

  public update(dt: number, elapsed: number): void {
    // 1. 更新飘雪粒子
    const halfSpan = 23;
    for (let i = 0; i < this.snowCount; i++) {
      const idx = i * 3;
      const fallSpeed = this.snowSpeeds[i * 2];
      const phase = this.snowSpeeds[i * 2 + 1];

      this.snowPositions[idx] += Math.sin(elapsed * 0.9 + phase) * 0.65 * dt;
      this.snowPositions[idx + 1] -= fallSpeed * dt;
      this.snowPositions[idx + 2] += Math.cos(elapsed * 0.7 + phase) * 0.45 * dt;

      // 让雪花环绕在当前锚点视野内无缝循环
      if (this.snowPositions[idx + 1] < -5) {
        this.snowPositions[idx + 1] = 22 + Math.random() * 4;
        this.snowPositions[idx] = this.snowAnchor.x + (Math.random() - 0.5) * halfSpan * 2;
        this.snowPositions[idx + 2] = this.snowAnchor.z + (Math.random() - 0.5) * halfSpan * 2;
      }

      if (Math.abs(this.snowPositions[idx] - this.snowAnchor.x) > halfSpan) {
        this.snowPositions[idx] = this.snowAnchor.x + (Math.random() - 0.5) * halfSpan * 2;
      }
      if (Math.abs(this.snowPositions[idx + 2] - this.snowAnchor.z) > halfSpan) {
        this.snowPositions[idx + 2] = this.snowAnchor.z + (Math.random() - 0.5) * halfSpan * 2;
      }
    }
    this.snowPoints.geometry.attributes.position.needsUpdate = true;

    // 2. 更新瞬态 3D 爆发粒子
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;
      if (p.life >= p.maxLife) {
        this.scene.remove(p.mesh);
        (p.mesh.material as THREE.Material).dispose();
        this.particles.splice(i, 1);
        continue;
      }
      const t = p.life / p.maxLife;
      p.vel.y -= p.gravity * dt;
      p.mesh.position.addScaledVector(p.vel, dt);
      p.mesh.rotation.x += p.rotVel.x * dt;
      p.mesh.rotation.y += p.rotVel.y * dt;
      p.mesh.rotation.z += p.rotVel.z * dt;

      const s = p.baseScale * (1 - t * 0.75);
      p.mesh.scale.setScalar(Math.max(0.01, s));

      if (p.fadeOut) {
        (p.mesh.material as THREE.MeshBasicMaterial).opacity = 1 - t;
      }
    }

    // 3. 更新地面扩散涟漪
    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const r = this.ripples[i];
      r.life += dt;
      if (r.life >= r.maxLife) {
        this.scene.remove(r.mesh);
        (r.mesh.material as THREE.Material).dispose();
        this.ripples.splice(i, 1);
        continue;
      }
      const t = r.life / r.maxLife;
      const easeOut = 1 - Math.pow(1 - t, 3);
      r.mesh.scale.setScalar(0.6 + easeOut * r.maxScale);
      (r.mesh.material as THREE.MeshBasicMaterial).opacity = (1 - t) * 0.85;
    }
  }
}
