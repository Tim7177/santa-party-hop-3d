import * as THREE from 'three';
import { PHYSICS } from './constants';
import { EasterEggId, PlatformEntity, PlatformKind, PlatformShape } from './types';

const H = PHYSICS.PLATFORM_HEIGHT;

// 缓存程序化纹理，避免重复创建 Canvas 消耗显存
const textureCache = new Map<string, THREE.CanvasTexture>();

function getOrCreateTexture(key: string, draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void, w = 256, h = 256): THREE.CanvasTexture {
  const existing = textureCache.get(key);
  if (existing) return existing;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  draw(ctx, w, h);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  textureCache.set(key, tex);
  return tex;
}

function makeCandyStripeTexture(): THREE.CanvasTexture {
  return getOrCreateTexture('candy_stripes', (ctx, w, h) => {
    ctx.fillStyle = '#fff9f5';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#e63946';
    for (let i = -h; i < w + h; i += 44) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + 20, 0);
      ctx.lineTo(i + 20 - h, h);
      ctx.lineTo(i - h, h);
      ctx.closePath();
      ctx.fill();
    }
    // 细薄荷绿装饰线
    ctx.strokeStyle = '#2ec4b6';
    ctx.lineWidth = 3;
    for (let i = -h; i < w + h; i += 44) {
      ctx.beginPath();
      ctx.moveTo(i + 26, 0);
      ctx.lineTo(i + 26 - h, h);
      ctx.stroke();
    }
  });
}

function makeSweaterTexture(): THREE.CanvasTexture {
  return getOrCreateTexture('sweater_knit', (ctx, w, h) => {
    ctx.fillStyle = '#1b5e4a';
    ctx.fillRect(0, 0, w, h);
    // 圣诞红菱格条带
    ctx.fillStyle = '#c92a3e';
    ctx.fillRect(0, 88, w, 80);
    // 金色锯齿针织花纹
    ctx.strokeStyle = '#ffd166';
    ctx.lineWidth = 6;
    for (const y of [76, 180]) {
      ctx.beginPath();
      for (let x = 0; x <= w; x += 24) {
        ctx.lineTo(x, y + (x % 48 === 0 ? -10 : 10));
      }
      ctx.stroke();
    }
    // 白色雪花点阵
    ctx.fillStyle = '#fff8ee';
    for (let x = 24; x < w; x += 48) {
      ctx.beginPath();
      ctx.arc(x, 128, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(x - 16, 126, 32, 4);
      ctx.fillRect(x - 2, 112, 4, 32);
    }
  });
}

function makeMysterySideTexture(): THREE.CanvasTexture {
  return getOrCreateTexture('mystery_q', (ctx, w, h) => {
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, '#ffb703');
    grad.addColorStop(1, '#fb8500');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // 内框花边
    ctx.strokeStyle = '#fff3b0';
    ctx.lineWidth = 10;
    ctx.strokeRect(18, 18, w - 36, h - 36);

    // 大问号
    ctx.fillStyle = '#fffdf0';
    ctx.font = 'bold 148px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(130, 45, 0, 0.45)';
    ctx.shadowBlur = 10;
    ctx.fillText('?', w / 2, h / 2 + 8);
  });
}

function makeVinylTexture(): THREE.CanvasTexture {
  return getOrCreateTexture('vinyl_disc', (ctx, w, h) => {
    const cx = w / 2;
    const cy = h / 2;
    ctx.fillStyle = '#1b1d24';
    ctx.fillRect(0, 0, w, h);

    // 唱片沟槽反光圆环
    for (let r = 46; r < 120; r += 6) {
      ctx.strokeStyle = r % 12 === 0 ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.05)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    // 红色圣诞中心标签
    ctx.fillStyle = '#d92638';
    ctx.beginPath();
    ctx.arc(cx, cy, 40, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#ffd166';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(cx, cy, 32, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#ffd166';
    ctx.beginPath();
    ctx.arc(cx, cy, 8, 0, Math.PI * 2);
    ctx.fill();
  });
}

function makeWishStarTopTexture(): THREE.CanvasTexture {
  return getOrCreateTexture('wish_star_top', (ctx, w, h) => {
    const cx = w / 2;
    const cy = h / 2;
    const grad = ctx.createRadialGradient(cx, cy, 8, cx, cy, 128);
    grad.addColorStop(0, '#3a2d7b');
    grad.addColorStop(0.6, '#1f2054');
    grad.addColorStop(1, '#13163b');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // 金色双环星阵
    ctx.strokeStyle = '#ffd166';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(cx, cy, 108, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255, 224, 102, 0.55)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, 90, 0, Math.PI * 2);
    ctx.stroke();

    // 绘制八芒星
    ctx.fillStyle = '#ffe588';
    ctx.beginPath();
    const spikes = 8;
    for (let i = 0; i < spikes * 2; i++) {
      const r = i % 2 === 0 ? 72 : 24;
      const a = (i * Math.PI) / spikes - Math.PI / 2;
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
  });
}

function enableShadows(root: THREE.Object3D): void {
  root.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
    }
  });
}

/** 微妙优雅的顶面中心提示标记，让精准中心跳跃有参考但不突兀 */
function addSubtleCenterDot(container: THREE.Group, color = 0xfff5d6, opacity = 0.35): void {
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.18, 0.27, 24),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = H + 0.015;
  container.add(ring);
}

/**
 * 构建一个 3D 圣诞派对平台实体
 * visualGroup 定位在 group 内部 y = -H，内部所有网格坐标从 y = 0 (底部) 构建到 y = H (顶面)
 * 这样当 visualGroup.scale.y 缩放时，底面固定，顶面弹性下沉！
 */
export function createPlatform(
  id: number,
  kind: PlatformKind,
  position: THREE.Vector3,
  sizeScale = 1.0
): PlatformEntity {
  const group = new THREE.Group();
  group.position.copy(position);

  const visualGroup = new THREE.Group();
  visualGroup.position.y = -H;
  group.add(visualGroup);

  let shape: PlatformShape = 'box';
  let halfWidth = 1.65 * sizeScale;
  let halfDepth = 1.65 * sizeScale;
  let radius = 1.65 * sizeScale;
  let easterEgg: EasterEggId | undefined;
  let stayDuration: number | undefined;
  let update: PlatformEntity['update'];
  let onTriggerEgg: PlatformEntity['onTriggerEgg'];

  switch (kind) {
    case 'gift_red':
    case 'gift_green':
    case 'gift_blue': {
      shape = 'box';
      const w = halfWidth * 2;
      const d = halfDepth * 2;
      const palette =
        kind === 'gift_red'
          ? { box: 0xd62839, ribbon: 0xffd166, lid: 0xe63946 }
          : kind === 'gift_green'
          ? { box: 0x227c5c, ribbon: 0xe63946, lid: 0x2b936e }
          : { box: 0x274c77, ribbon: 0xe9f1f7, lid: 0x356196 };

      const boxMat = new THREE.MeshStandardMaterial({ color: palette.box, roughness: 0.45 });
      const lidMat = new THREE.MeshStandardMaterial({ color: palette.lid, roughness: 0.4 });
      const ribMat = new THREE.MeshStandardMaterial({
        color: palette.ribbon,
        roughness: 0.3,
        metalness: 0.25,
      });

      const base = new THREE.Mesh(new THREE.BoxGeometry(w * 0.94, H - 0.35, d * 0.94), boxMat);
      base.position.y = (H - 0.35) / 2;
      visualGroup.add(base);

      // 稍微凸出的精美礼盒盖
      const lid = new THREE.Mesh(new THREE.BoxGeometry(w, 0.38, d), lidMat);
      lid.position.y = H - 0.19;
      visualGroup.add(lid);

      // 十字丝带
      const ribX = new THREE.Mesh(new THREE.BoxGeometry(w + 0.04, H + 0.02, 0.36), ribMat);
      ribX.position.y = H / 2;
      visualGroup.add(ribX);

      const ribZ = new THREE.Mesh(new THREE.BoxGeometry(0.36, H + 0.02, d + 0.04), ribMat);
      ribZ.position.y = H / 2;
      visualGroup.add(ribZ);

      // 礼盒角上的精致小蝴蝶结（偏角放置不挡落脚）
      const bow = new THREE.Group();
      bow.position.set(halfWidth * 0.56, H + 0.08, -halfDepth * 0.56);
      for (const a of [0.4, -0.4, 2.7, -2.7]) {
        const loop = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.045, 8, 14), ribMat);
        loop.rotation.y = a;
        loop.rotation.x = 0.65;
        bow.add(loop);
      }
      visualGroup.add(bow);
      addSubtleCenterDot(visualGroup, 0xffffff, 0.25);
      break;
    }

    case 'cake': {
      shape = 'cylinder';
      radius = 1.62 * sizeScale;
      halfWidth = radius;
      halfDepth = radius;

      const spongeMat = new THREE.MeshStandardMaterial({ color: 0x6b3e26, roughness: 0.65 });
      const creamMat = new THREE.MeshStandardMaterial({ color: 0xfffaf2, roughness: 0.48 });
      const berryMat = new THREE.MeshStandardMaterial({ color: 0xe63946, roughness: 0.32 });
      const leafMat = new THREE.MeshStandardMaterial({ color: 0x2b9348, roughness: 0.5 });

      const base = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.96, radius, H - 0.28, 32), spongeMat);
      base.position.y = (H - 0.28) / 2;
      visualGroup.add(base);

      // 中间奶油夹心
      const midCream = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.985, radius * 0.985, 0.22, 32), creamMat);
      midCream.position.y = H * 0.45;
      visualGroup.add(midCream);

      // 顶层雪白厚糖霜
      const topFrost = new THREE.Mesh(new THREE.CylinderGeometry(radius * 1.02, radius * 1.02, 0.32, 32), creamMat);
      topFrost.position.y = H - 0.16;
      visualGroup.add(topFrost);

      // 周围滴落奶油球 + 边缘小红草莓点缀
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        const drip = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), creamMat);
        drip.scale.set(1, 1.5, 1);
        drip.position.set(Math.cos(a) * radius * 0.96, H - 0.34 - (i % 2) * 0.14, Math.sin(a) * radius * 0.96);
        visualGroup.add(drip);

        if (i % 2 === 0) {
          const berry = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.24, 10), berryMat);
          berry.position.set(Math.cos(a) * radius * 0.72, H + 0.12, Math.sin(a) * radius * 0.72);
          visualGroup.add(berry);
        }
      }
      // 角落冬青叶装饰
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8), leafMat);
      leaf.scale.set(1.5, 0.35, 0.8);
      leaf.position.set(radius * 0.65, H + 0.04, -radius * 0.35);
      visualGroup.add(leaf);

      addSubtleCenterDot(visualGroup, 0xd62839, 0.25);
      break;
    }

    case 'gingerbread': {
      shape = 'box';
      const w = halfWidth * 2;
      const d = halfDepth * 2;
      const cookieMat = new THREE.MeshStandardMaterial({ color: 0xb56c35, roughness: 0.72 });
      const icingMat = new THREE.MeshStandardMaterial({ color: 0xfff8f0, roughness: 0.45 });
      const candyColors = [0xe63946, 0x2ec4b6, 0xffd166];

      const body = new THREE.Mesh(new THREE.BoxGeometry(w, H - 0.1, d), cookieMat);
      body.position.y = (H - 0.1) / 2;
      visualGroup.add(body);

      // 顶面白色糖霜边框
      const borderTop = new THREE.Mesh(new THREE.BoxGeometry(w + 0.06, 0.16, d + 0.06), icingMat);
      borderTop.position.y = H - 0.08;
      visualGroup.add(borderTop);

      const innerCookie = new THREE.Mesh(new THREE.BoxGeometry(w - 0.36, 0.04, d - 0.36), cookieMat);
      innerCookie.position.y = H - 0.01;
      visualGroup.add(innerCookie);

      // 四周彩糖软糖豆装饰
      for (let i = 0; i < 4; i++) {
        const sx = i % 2 === 0 ? -1 : 1;
        const sz = i < 2 ? -1 : 1;
        const gumdrop = new THREE.Mesh(
          new THREE.SphereGeometry(0.14, 10, 8),
          new THREE.MeshStandardMaterial({ color: candyColors[i % candyColors.length], roughness: 0.25 })
        );
        gumdrop.position.set(sx * (halfWidth - 0.22), H + 0.08, sz * (halfDepth - 0.22));
        visualGroup.add(gumdrop);
      }

      // 侧面糖霜小窗框
      const win = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.75, 0.08), icingMat);
      win.position.set(0, H * 0.48, halfDepth + 0.02);
      visualGroup.add(win);
      const winPane = new THREE.Mesh(
        new THREE.BoxGeometry(0.55, 0.55, 0.1),
        new THREE.MeshStandardMaterial({ color: 0xffd166, emissive: 0xffa62b, emissiveIntensity: 0.55 })
      );
      winPane.position.set(0, H * 0.48, halfDepth + 0.03);
      visualGroup.add(winPane);

      addSubtleCenterDot(visualGroup, 0xfff8f0, 0.35);
      break;
    }

    case 'candycane': {
      shape = 'cylinder';
      radius = 1.48 * sizeScale;
      halfWidth = radius;
      halfDepth = radius;

      const stripeTex = makeCandyStripeTexture();
      const sideMat = new THREE.MeshStandardMaterial({ map: stripeTex, roughness: 0.32 });
      const topMat = new THREE.MeshStandardMaterial({ color: 0xfff8f6, roughness: 0.35 });

      const cyl = new THREE.Mesh(
        new THREE.CylinderGeometry(radius, radius, H, 32),
        [sideMat, topMat, topMat]
      );
      cyl.position.y = H / 2;
      visualGroup.add(cyl);

      // 顶面薄荷旋涡环
      const redRing = new THREE.Mesh(
        new THREE.RingGeometry(radius * 0.56, radius * 0.78, 32),
        new THREE.MeshBasicMaterial({ color: 0xe63946, side: THREE.DoubleSide })
      );
      redRing.rotation.x = -Math.PI / 2;
      redRing.position.y = H + 0.012;
      visualGroup.add(redRing);

      addSubtleCenterDot(visualGroup, 0x2ec4b6, 0.5);
      break;
    }

    case 'cocoa': {
      shape = 'cylinder';
      radius = 1.56 * sizeScale;
      halfWidth = radius;
      halfDepth = radius;

      const mugMat = new THREE.MeshStandardMaterial({ color: 0xc92a3e, roughness: 0.25, metalness: 0.08 });
      const cocoaMat = new THREE.MeshStandardMaterial({ color: 0x4a2511, roughness: 0.22 });
      const marshMat = new THREE.MeshStandardMaterial({ color: 0xfffcf7, roughness: 0.7 });

      const cup = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 0.88, H, 32), mugMat);
      cup.position.y = H / 2;
      visualGroup.add(cup);

      // 马克杯金边
      const rim = new THREE.Mesh(
        new THREE.TorusGeometry(radius, 0.08, 12, 32),
        new THREE.MeshStandardMaterial({ color: 0xffd166, roughness: 0.25, metalness: 0.65 })
      );
      rim.rotation.x = Math.PI / 2;
      rim.position.y = H - 0.02;
      visualGroup.add(rim);

      // 浓香热可可表面
      const liquid = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.92, radius * 0.92, 0.06, 30), cocoaMat);
      liquid.position.y = H - 0.02;
      visualGroup.add(liquid);

      // 马克杯把手
      const handle = new THREE.Mesh(new THREE.TorusGeometry(0.58, 0.13, 12, 20, Math.PI), mugMat);
      handle.rotation.z = -Math.PI / 2;
      handle.position.set(radius * 0.94, H * 0.54, 0);
      visualGroup.add(handle);

      // 浮在边缘的雪白小棉花糖（会轻轻漂浮！）
      const marshmallows: THREE.Mesh[] = [];
      const mOffsets = [
        [0.65, -0.52],
        [-0.7, -0.4],
        [0.45, 0.68],
      ];
      for (const [mx, mz] of mOffsets) {
        const m = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.2, 14), marshMat);
        m.position.set(mx * sizeScale, H + 0.04, mz * sizeScale);
        m.rotation.z = 0.2;
        visualGroup.add(m);
        marshmallows.push(m);
      }

      update = (_dt, elapsed) => {
        marshmallows.forEach((m, i) => {
          m.position.y = H + 0.03 + Math.sin(elapsed * 2.2 + i * 2) * 0.035;
        });
      };

      addSubtleCenterDot(visualGroup, 0xffe8c8, 0.35);
      break;
    }

    case 'sweater': {
      shape = 'box';
      const w = halfWidth * 2;
      const d = halfDepth * 2;
      const knitTex = makeSweaterTexture();
      const sideMat = new THREE.MeshStandardMaterial({ map: knitTex, roughness: 0.85 });
      const topMat = new THREE.MeshStandardMaterial({ color: 0xf4f8fc, roughness: 0.72 });

      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(w, H, d),
        [sideMat, sideMat, topMat, sideMat, sideMat, sideMat]
      );
      mesh.position.y = H / 2;
      visualGroup.add(mesh);

      // 四角立体小雪球装饰
      const pomMat = new THREE.MeshStandardMaterial({ color: 0xd62839, roughness: 0.8 });
      for (const sx of [-1, 1]) {
        for (const sz of [-1, 1]) {
          const pom = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), pomMat);
          pom.position.set(sx * (halfWidth - 0.18), H + 0.08, sz * (halfDepth - 0.18));
          visualGroup.add(pom);
        }
      }
      addSubtleCenterDot(visualGroup, 0x1b5e4a, 0.35);
      break;
    }

    // ==================== 6 大互动彩蛋平台 ====================

    case 'egg_mystery_box': {
      shape = 'box';
      halfWidth = 1.72;
      halfDepth = 1.72;
      easterEgg = 'mystery_box';
      stayDuration = 1.35;

      const w = halfWidth * 2;
      const d = halfDepth * 2;
      const qTex = makeMysterySideTexture();
      const qMat = new THREE.MeshStandardMaterial({
        map: qTex,
        roughness: 0.32,
        emissive: 0x7a4200,
        emissiveIntensity: 0.25,
      });
      const goldMat = new THREE.MeshStandardMaterial({
        color: 0xffe066,
        roughness: 0.22,
        metalness: 0.65,
        emissive: 0x805500,
        emissiveIntensity: 0.22,
      });

      const body = new THREE.Mesh(new THREE.BoxGeometry(w * 0.95, H - 0.24, d * 0.95), qMat);
      body.position.y = (H - 0.24) / 2;
      visualGroup.add(body);

      // 可掀开的顶盖枢纽（铰链在后沿）
      const lidPivot = new THREE.Group();
      lidPivot.position.set(0, H - 0.22, -halfDepth);
      const lidMesh = new THREE.Mesh(new THREE.BoxGeometry(w, 0.24, d), goldMat);
      lidMesh.position.set(0, 0.11, halfDepth);
      lidPivot.add(lidMesh);
      visualGroup.add(lidPivot);

      // 内部藏着的发光魔法星星（触发后升起！）
      const prizeStar = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.42),
        new THREE.MeshStandardMaterial({
          color: 0xfff3b0,
          emissive: 0xffc300,
          emissiveIntensity: 0.9,
          roughness: 0.15,
        })
      );
      prizeStar.position.set(0, H - 0.45, 0);
      prizeStar.visible = false;
      visualGroup.add(prizeStar);

      let openAnim = 0;
      let isOpening = false;
      onTriggerEgg = () => {
        isOpening = true;
        prizeStar.visible = true;
      };

      update = (dt, elapsed, triggered) => {
        if (!triggered) {
          // 未触发时金色微光呼吸 & 偶尔轻轻晃动吸引玩家停留
          qMat.emissiveIntensity = 0.22 + Math.sin(elapsed * 4.5) * 0.14;
          lidPivot.rotation.x = Math.sin(elapsed * 8) * 0.015;
        } else if (isOpening) {
          openAnim = Math.min(1, openAnim + dt * 3.0);
          // 轻微向后震开一缝隙并让内部魔法星星跃出旋转（不把玩家掀翻）
          lidPivot.rotation.x = -Math.sin(openAnim * Math.PI) * 0.22;
          prizeStar.position.set(halfWidth * 0.65, H + 0.55 + Math.sin(elapsed * 4) * 0.18, -halfDepth * 0.65);
          prizeStar.rotation.y += dt * 3.5;
          qMat.emissiveIntensity = 0.45;
        }
      };

      addSubtleCenterDot(visualGroup, 0xffffff, 0.45);
      break;
    }

    case 'egg_gramophone': {
      shape = 'box';
      halfWidth = 1.78;
      halfDepth = 1.78;
      easterEgg = 'gramophone';
      stayDuration = 1.35;

      const w = halfWidth * 2;
      const d = halfDepth * 2;
      const woodMat = new THREE.MeshStandardMaterial({ color: 0x6b2d2c, roughness: 0.45 });
      const brassMat = new THREE.MeshStandardMaterial({
        color: 0xffd166,
        roughness: 0.22,
        metalness: 0.8,
        emissive: 0x553b00,
        emissiveIntensity: 0.18,
      });

      const cabinet = new THREE.Mesh(new THREE.BoxGeometry(w, H - 0.08, d), woodMat);
      cabinet.position.y = (H - 0.08) / 2;
      visualGroup.add(cabinet);

      // 金色描边底脚
      const trim = new THREE.Mesh(new THREE.BoxGeometry(w + 0.08, 0.14, d + 0.08), brassMat);
      trim.position.y = H - 0.12;
      visualGroup.add(trim);

      // 顶面可旋转大黑胶唱片
      const vinyl = new THREE.Mesh(
        new THREE.CylinderGeometry(1.42, 1.42, 0.08, 32),
        new THREE.MeshStandardMaterial({ map: makeVinylTexture(), roughness: 0.25 })
      );
      vinyl.position.y = H - 0.01;
      visualGroup.add(vinyl);

      // 靠后上方角落的复古金色留声机大喇叭（喇叭口朝向镜头 (-X, +Z)）
      const hornGroup = new THREE.Group();
      hornGroup.position.set(halfWidth * 0.64, H, -halfDepth * 0.64);

      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 0.72, 12), brassMat);
      post.position.y = 0.36;
      hornGroup.add(post);

      const hornBell = new THREE.Mesh(
        new THREE.ConeGeometry(0.55, 0.85, 18, 1, true),
        new THREE.MeshStandardMaterial({
          color: 0xffd166,
          roughness: 0.2,
          metalness: 0.82,
          side: THREE.DoubleSide,
        })
      );
      hornBell.position.set(-0.24, 0.94, 0.24);
      hornBell.rotation.set(0.65, 0, 0.85);
      hornGroup.add(hornBell);

      visualGroup.add(hornGroup);

      // 唱针摇臂
      const armPivot = new THREE.Group();
      armPivot.position.set(halfWidth * 0.72, H + 0.14, -halfDepth * 0.72);
      const toneArm = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 1.2), brassMat);
      toneArm.position.set(0, 0, 0.55);
      armPivot.add(toneArm);
      armPivot.rotation.y = -0.3;
      visualGroup.add(armPivot);

      let spinSpeed = 0.45;
      onTriggerEgg = () => {
        spinSpeed = 3.8;
      };

      update = (dt, elapsed, triggered) => {
        vinyl.rotation.y -= dt * spinSpeed;
        if (triggered) {
          armPivot.rotation.y = THREE.MathUtils.lerp(armPivot.rotation.y, 0.28, dt * 4);
          // 喇叭随节拍律动缩放！
          const beat = 1 + Math.abs(Math.sin(elapsed * 8.5)) * 0.16;
          hornGroup.scale.set(beat, beat, beat);
        }
      };
      break;
    }

    case 'egg_tree': {
      shape = 'cylinder';
      radius = 1.92;
      halfWidth = radius;
      halfDepth = radius;
      easterEgg = 'christmas_tree';
      stayDuration = 1.15;

      const snowTopMat = new THREE.MeshStandardMaterial({ color: 0xf4f9ff, roughness: 0.5 });
      const woodBaseMat = new THREE.MeshStandardMaterial({ color: 0x8b5a3c, roughness: 0.65 });
      const ribbonTrimMat = new THREE.MeshStandardMaterial({
        color: 0xd62839,
        roughness: 0.4,
      });
      const goldTrimMat = new THREE.MeshStandardMaterial({
        color: 0xffd166,
        roughness: 0.25,
        metalness: 0.6,
      });

      const base = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 1.04, H - 0.25, 32), woodBaseMat);
      base.position.y = (H - 0.25) / 2;
      visualGroup.add(base);

      // 圣诞树台座红金节庆腰带
      const band = new THREE.Mesh(new THREE.CylinderGeometry(radius * 1.02, radius * 1.03, 0.34, 32), ribbonTrimMat);
      band.position.y = H * 0.44;
      visualGroup.add(band);

      const goldLine = new THREE.Mesh(new THREE.CylinderGeometry(radius * 1.03, radius * 1.03, 0.08, 32), goldTrimMat);
      goldLine.position.y = H * 0.44;
      visualGroup.add(goldLine);

      const snowCap = new THREE.Mesh(new THREE.CylinderGeometry(radius * 1.02, radius * 1.02, 0.28, 32), snowTopMat);
      snowCap.position.y = H - 0.14;
      visualGroup.add(snowCap);

      // 立在台座正后角 (+X, -Z) 的一棵精致三层立体圣诞树（绝不遮挡镜头视线，留出宽敞站立空间）
      const treeGroup = new THREE.Group();
      treeGroup.position.set(0.92, H, -0.92);

      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 0.45, 10), woodBaseMat);
      trunk.position.y = 0.22;
      treeGroup.add(trunk);

      const pineMat = new THREE.MeshStandardMaterial({ color: 0x1b6b46, roughness: 0.65 });
      const tiers = [
        { r: 0.76, h: 0.95, y: 0.85 },
        { r: 0.58, h: 0.82, y: 1.48 },
        { r: 0.38, h: 0.7, y: 2.04 },
      ];
      for (const tier of tiers) {
        const cone = new THREE.Mesh(new THREE.ConeGeometry(tier.r, tier.h, 14), pineMat);
        cone.position.y = tier.y;
        treeGroup.add(cone);
      }

      // 树上彩灯小灯泡（触发前暗淡，触发后逐层绽放五彩光芒！）
      const bulbColors = [0xff4d6d, 0xffd166, 0x4cc9f0, 0x80ed99, 0xff9f1c];
      const bulbs: Array<{ mat: THREE.MeshStandardMaterial; tierIdx: number; phase: number }> = [];
      tiers.forEach((tier, tIdx) => {
        const count = 6 - tIdx;
        for (let i = 0; i < count; i++) {
          const a = (i / count) * Math.PI * 2 + tIdx * 0.5;
          const color = bulbColors[(i + tIdx) % bulbColors.length];
          const bMat = new THREE.MeshStandardMaterial({
            color,
            emissive: color,
            emissiveIntensity: 0.08,
            roughness: 0.2,
          });
          const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), bMat);
          bulb.position.set(
            Math.cos(a) * (tier.r * 0.72),
            tier.y - tier.h * 0.22,
            Math.sin(a) * (tier.r * 0.72)
          );
          treeGroup.add(bulb);
          bulbs.push({ mat: bMat, tierIdx: tIdx, phase: i * 1.1 });
        }
      });

      // 树顶大金星
      const starMat = new THREE.MeshStandardMaterial({
        color: 0xffd166,
        emissive: 0xffbe0b,
        emissiveIntensity: 0.15,
        roughness: 0.15,
        metalness: 0.5,
      });
      const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.24), starMat);
      star.position.y = 2.52;
      treeGroup.add(star);

      visualGroup.add(treeGroup);

      let litTime = 0;
      onTriggerEgg = () => {
        litTime = 0.001;
      };

      update = (dt, elapsed, triggered) => {
        star.rotation.y += dt * (triggered ? 3.2 : 0.6);
        if (triggered) {
          litTime += dt;
          bulbs.forEach((b) => {
            // 逐层从下到上点亮
            if (litTime > b.tierIdx * 0.22) {
              b.mat.emissiveIntensity = 1.1 + Math.sin(elapsed * 7 + b.phase) * 0.45;
            }
          });
          if (litTime > 0.6) {
            starMat.emissiveIntensity = 1.6 + Math.sin(elapsed * 6) * 0.4;
            const s = 1.2 + Math.sin(elapsed * 5) * 0.12;
            star.scale.setScalar(s);
          }
        }
      };

      addSubtleCenterDot(visualGroup, 0xffd166, 0.55);
      break;
    }

    case 'egg_snowman': {
      shape = 'cylinder';
      radius = 1.88;
      halfWidth = radius;
      halfDepth = radius;
      easterEgg = 'sleepy_snowman';
      stayDuration = 0.25; // 跳上去瞬间稍微震一下就醒来欢呼！

      const iceMat = new THREE.MeshStandardMaterial({
        color: 0x90e0ef,
        roughness: 0.22,
        metalness: 0.1,
      });
      const snowMat = new THREE.MeshStandardMaterial({ color: 0xf7fbff, roughness: 0.55 });

      const iceBase = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.96, radius, H - 0.26, 28), iceMat);
      iceBase.position.y = (H - 0.26) / 2;
      visualGroup.add(iceBase);

      const snowPad = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 0.28, 28), snowMat);
      snowPad.position.y = H - 0.14;
      visualGroup.add(snowPad);

      // 靠台座后方 (+X, -Z) 打瞌睡的可爱雪人嘉宾，正脸面向镜头 (-X, +Z)
      const buddy = new THREE.Group();
      buddy.position.set(0.88, H, -0.88);
      buddy.rotation.y = -Math.PI * 0.25;

      const b1 = new THREE.Mesh(new THREE.SphereGeometry(0.42, 16, 14), snowMat);
      b1.position.y = 0.36;
      buddy.add(b1);

      const b2 = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 14), snowMat);
      b2.position.y = 0.86;
      buddy.add(b2);

      const scarfMat = new THREE.MeshStandardMaterial({ color: 0xff4d6d, roughness: 0.6 });
      const scarf = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.07, 10, 18), scarfMat);
      scarf.rotation.x = Math.PI / 2;
      scarf.position.y = 0.66;
      buddy.add(scarf);

      const carrot = new THREE.Mesh(
        new THREE.ConeGeometry(0.05, 0.22, 10),
        new THREE.MeshStandardMaterial({ color: 0xff7b25 })
      );
      carrot.rotation.x = Math.PI / 2;
      carrot.position.set(0, 0.86, 0.34);
      buddy.add(carrot);

      // 会抛起来的蓝礼帽
      const hat = new THREE.Group();
      hat.position.set(0, 1.12, 0);
      const hatMat = new THREE.MeshStandardMaterial({ color: 0x264653, roughness: 0.5 });
      hat.add(new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.05, 16), hatMat));
      const hatTop = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 0.3, 16), hatMat);
      hatTop.position.y = 0.16;
      hat.add(hatTop);
      buddy.add(hat);

      // 树枝小手
      const twigMat = new THREE.MeshStandardMaterial({ color: 0x6b4226 });
      const armL = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.45, 6), twigMat);
      armL.position.set(-0.42, 0.6, 0);
      armL.rotation.z = 0.85;
      buddy.add(armL);
      const armR = armL.clone();
      armR.position.x = 0.42;
      armR.rotation.z = -0.85;
      buddy.add(armR);

      visualGroup.add(buddy);

      let wakeTimer = 0;
      onTriggerEgg = () => {
        wakeTimer = 0.001;
      };

      update = (dt, elapsed, triggered) => {
        if (!triggered) {
          // 瞌睡呼吸起伏 + 歪头晃悠
          buddy.rotation.z = Math.sin(elapsed * 1.8) * 0.12 + 0.08;
          buddy.scale.y = 0.96 + Math.sin(elapsed * 2.2) * 0.04;
        } else {
          wakeTimer += dt;
          // 醒来兴奋蹦跳、挥手、抛帽子！
          buddy.rotation.z = 0;
          buddy.position.y = H + Math.abs(Math.sin(elapsed * 9)) * 0.34;
          armL.rotation.z = 1.4 + Math.sin(elapsed * 12) * 0.55;
          armR.rotation.z = -1.4 - Math.sin(elapsed * 12) * 0.55;
          hat.position.y = 1.12 + Math.abs(Math.sin(elapsed * 6.5)) * 0.48;
          hat.rotation.z = Math.sin(elapsed * 6.5) * 0.35;
        }
      };

      addSubtleCenterDot(visualGroup, 0x00b4d8, 0.45);
      break;
    }

    case 'egg_fireplace': {
      shape = 'box';
      halfWidth = 1.82;
      halfDepth = 1.82;
      easterEgg = 'warm_fireplace';
      stayDuration = 1.35;

      const w = halfWidth * 2;
      const d = halfDepth * 2;
      const brickMat = new THREE.MeshStandardMaterial({ color: 0x9b3b2e, roughness: 0.78 });
      const rugMat = new THREE.MeshStandardMaterial({ color: 0xb52b3b, roughness: 0.85 });
      const woodMat = new THREE.MeshStandardMaterial({ color: 0x5c361d, roughness: 0.65 });

      const base = new THREE.Mesh(new THREE.BoxGeometry(w, H - 0.08, d), brickMat);
      base.position.y = (H - 0.08) / 2;
      visualGroup.add(base);

      // 温暖红地毯顶面
      const floor = new THREE.Mesh(new THREE.BoxGeometry(w, 0.1, d), woodMat);
      floor.position.y = H - 0.04;
      visualGroup.add(floor);

      const rug = new THREE.Mesh(new THREE.BoxGeometry(w * 0.62, 0.04, d * 0.62), rugMat);
      rug.position.set(-0.25, H + 0.015, 0.25);
      visualGroup.add(rug);

      // 后沿迷你壁炉结构（置于后角 +X,-Z 并旋转 45° 正面对准相机展示跃动火光与圣诞袜！）
      const hearth = new THREE.Group();
      hearth.position.set(0.75, H, -0.75);
      hearth.rotation.y = -Math.PI * 0.25;

      const chimney = new THREE.Mesh(new THREE.BoxGeometry(1.55, 1.35, 0.72), brickMat);
      chimney.position.y = 0.67;
      hearth.add(chimney);

      const mantel = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.16, 0.86), woodMat);
      mantel.position.y = 1.38;
      hearth.add(mantel);

      // 深色炉膛洞口
      const firebox = new THREE.Mesh(
        new THREE.BoxGeometry(0.86, 0.72, 0.18),
        new THREE.MeshBasicMaterial({ color: 0x1b0e0a })
      );
      firebox.position.set(0, 0.38, 0.31);
      hearth.add(firebox);

      // 跃动的 3D 暖火焰（三簇叠层火焰）
      const flameGroup = new THREE.Group();
      flameGroup.position.set(0, 0.12, 0.36);
      const outerFlame = new THREE.Mesh(
        new THREE.ConeGeometry(0.24, 0.56, 8),
        new THREE.MeshBasicMaterial({ color: 0xff6b00 })
      );
      outerFlame.position.y = 0.25;
      flameGroup.add(outerFlame);

      const innerFlame = new THREE.Mesh(
        new THREE.ConeGeometry(0.14, 0.38, 8),
        new THREE.MeshBasicMaterial({ color: 0xffea00 })
      );
      innerFlame.position.y = 0.18;
      flameGroup.add(innerFlame);
      hearth.add(flameGroup);

      // 壁炉暖光点光源
      const fireLight = new THREE.PointLight(0xff8c24, 1.4, 7.5);
      fireLight.position.set(0, 0.6, 0.85);
      hearth.add(fireLight);

      // 挂在壁炉边的圣诞红袜子！
      const sock = new THREE.Group();
      sock.position.set(0.65, 1.18, 0.44);
      const sockRed = new THREE.MeshStandardMaterial({ color: 0xe63946, roughness: 0.65 });
      const sockWhite = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.75 });
      const sockCuff = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.1, 0.14), sockWhite);
      sock.add(sockCuff);
      const sockLeg = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.3, 0.12), sockRed);
      sockLeg.position.y = -0.18;
      sock.add(sockLeg);
      const sockFoot = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.14, 0.12), sockRed);
      sockFoot.position.set(0.06, -0.32, 0);
      sock.add(sockFoot);
      hearth.add(sock);

      visualGroup.add(hearth);

      update = (_dt, elapsed, triggered) => {
        const boost = triggered ? 1.45 : 1.0;
        flameGroup.scale.set(
          boost * (0.92 + Math.sin(elapsed * 14) * 0.12),
          boost * (0.9 + Math.cos(elapsed * 17) * 0.2),
          boost
        );
        fireLight.intensity = (triggered ? 2.8 : 1.2) + Math.sin(elapsed * 13) * 0.35;
        if (triggered) {
          sock.rotation.z = Math.sin(elapsed * 9) * 0.28;
        }
      };

      addSubtleCenterDot(visualGroup, 0xffd166, 0.45);
      break;
    }

    case 'egg_wish_star': {
      shape = 'cylinder';
      radius = 1.78;
      halfWidth = radius;
      halfDepth = radius;
      easterEgg = 'santa_sleigh';
      stayDuration = 1.25;

      const velvetMat = new THREE.MeshStandardMaterial({
        color: 0x1d2359,
        roughness: 0.4,
        emissive: 0x121438,
        emissiveIntensity: 0.3,
      });
      const starTopMat = new THREE.MeshStandardMaterial({
        map: makeWishStarTopTexture(),
        roughness: 0.28,
        emissive: 0x2c2266,
        emissiveIntensity: 0.35,
      });

      const cyl = new THREE.Mesh(
        new THREE.CylinderGeometry(radius, radius * 1.04, H, 32),
        [velvetMat, starTopMat, velvetMat]
      );
      cyl.position.y = H / 2;
      visualGroup.add(cyl);

      // 4 颗绕平台边缘漂浮旋转的魔法许愿金星
      const orbitGroup = new THREE.Group();
      orbitGroup.position.y = H + 0.35;
      const starMat = new THREE.MeshStandardMaterial({
        color: 0xffe066,
        emissive: 0xffbe0b,
        emissiveIntensity: 0.9,
        roughness: 0.15,
      });
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2;
        const s = new THREE.Mesh(new THREE.OctahedronGeometry(0.14), starMat);
        s.position.set(Math.cos(a) * (radius + 0.18), 0, Math.sin(a) * (radius + 0.18));
        orbitGroup.add(s);
      }
      visualGroup.add(orbitGroup);

      update = (dt, elapsed, triggered) => {
        orbitGroup.rotation.y += dt * (triggered ? 3.5 : 1.1);
        orbitGroup.position.y = H + 0.38 + Math.sin(elapsed * 3) * 0.14;
        if (triggered) {
          starTopMat.emissiveIntensity = 0.9 + Math.sin(elapsed * 6) * 0.25;
        }
      };
      break;
    }
  }

  enableShadows(visualGroup);

  return {
    id,
    kind,
    shape,
    group,
    visualGroup,
    center: position.clone(),
    halfWidth,
    halfDepth,
    radius,
    easterEgg,
    stayDuration,
    eggTriggered: false,
    update,
    onTriggerEgg,
  };
}
