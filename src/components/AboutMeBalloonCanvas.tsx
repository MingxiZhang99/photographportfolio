import React, { useEffect, useRef, useState } from 'react';
import { FlashlightWordShadow } from './Tabletop3DWordCanvas';

interface AboutMeBalloonCanvasProps {
  cubeSize: number;
  onClick?: () => void;
  flashlightShadow?: FlashlightWordShadow | null;
}

interface TubePrimitive {
  type: 'segment' | 'arc';
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
  cx?: number;
  cy?: number;
  rx?: number;
  ry?: number;
  startAngle?: number;
  endAngle?: number;
  radius: number;
  letterId: number; // 同一字母的所有笔画共享同一个 letterId，实现玻璃外壳与内部灯芯金属线的自然衔接
}

/**
 * 计算点 (px, py) 到圆头胶囊线段 (x1, y1)-(x2, y2) 的最短距离及线段投影参数
 */
function distToSegmentWithParam(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): { dist: number; along: number; endpointDist: number } {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  const len = Math.sqrt(lenSq) || 1;
  if (lenSq === 0) {
    const d0 = Math.hypot(px - x1, py - y1);
    return { dist: d0, along: 0, endpointDist: d0 };
  }
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lenSq));
  const projX = x1 + t * dx;
  const projY = y1 + t * dy;
  const dist = Math.hypot(px - projX, py - projY);
  const endpointDist = Math.min(
    Math.hypot(px - x1, py - y1),
    Math.hypot(px - x2, py - y2)
  );
  return { dist, along: t * len, endpointDist };
}

/**
 * 多项式平滑并集 (Smooth Minimum SDF)：
 * 用于吹制玻璃灯管外壳以及内部连续金属灯芯线的平滑过渡
 */
function smin(a: number, b: number, k: number): number {
  const h = Math.max(k - Math.abs(a - b), 0.0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
}

// ============================================================================
// 1. "ABOUT ME" 3D 暗红透明玻璃外壳 + 内部金属灯芯线霓虹灯管骨架
// ============================================================================
const ABOUT_ME_TUBES: TubePrimitive[] = [
  // --- 'A' (完整全高大写 A：顶部尖峰 y=-38 至底部基线 y=40 + 中部横杠，letterId: 1) ---
  {
    type: 'segment',
    x1: -356,
    y1: -38,
    x2: -392,
    y2: 40,
    radius: 27.5,
    letterId: 1,
  },
  {
    type: 'segment',
    x1: -356,
    y1: -38,
    x2: -320,
    y2: 40,
    radius: 27.5,
    letterId: 1,
  },
  {
    type: 'segment',
    x1: -379,
    y1: 11,
    x2: -333,
    y2: 11,
    radius: 25.0,
    letterId: 1,
  },

  // --- 'B' (letterId: 2) ---
  {
    type: 'segment',
    x1: -260,
    y1: -38,
    x2: -260,
    y2: 38,
    radius: 28.5,
    letterId: 2,
  },
  {
    type: 'arc',
    cx: -232,
    cy: -19,
    rx: 27,
    ry: 20,
    startAngle: -Math.PI * 0.72,
    endAngle: Math.PI * 0.72,
    radius: 26.0,
    letterId: 2,
  },
  {
    type: 'arc',
    cx: -230,
    cy: 19,
    rx: 29,
    ry: 21,
    startAngle: -Math.PI * 0.72,
    endAngle: Math.PI * 0.72,
    radius: 26.5,
    letterId: 2,
  },

  // --- 'O' (letterId: 3) ---
  {
    type: 'arc',
    cx: -112,
    cy: 1,
    rx: 37,
    ry: 37,
    startAngle: -Math.PI,
    endAngle: Math.PI,
    radius: 29.0,
    letterId: 3,
  },

  // --- 'U' (letterId: 4) ---
  {
    type: 'segment',
    x1: -18,
    y1: -38,
    x2: -18,
    y2: 10,
    radius: 28.0,
    letterId: 4,
  },
  {
    type: 'arc',
    cx: 12,
    cy: 10,
    rx: 30,
    ry: 29,
    startAngle: 0,
    endAngle: Math.PI,
    radius: 28.0,
    letterId: 4,
  },
  {
    type: 'segment',
    x1: 42,
    y1: 10,
    x2: 42,
    y2: -38,
    radius: 28.0,
    letterId: 4,
  },

  // --- 'T' (letterId: 5) ---
  {
    type: 'segment',
    x1: 112,
    y1: -38,
    x2: 112,
    y2: 40,
    radius: 28.5,
    letterId: 5,
  },
  {
    type: 'segment',
    x1: 82,
    y1: -38,
    x2: 142,
    y2: -38,
    radius: 28.0,
    letterId: 5,
  },

  // --- 'M' (letterId: 6) ---
  {
    type: 'segment',
    x1: 210,
    y1: 40,
    x2: 216,
    y2: -34,
    radius: 27.5,
    letterId: 6,
  },
  {
    type: 'segment',
    x1: 218,
    y1: -34,
    x2: 255,
    y2: 18,
    radius: 26.5,
    letterId: 6,
  },
  {
    type: 'segment',
    x1: 255,
    y1: 18,
    x2: 292,
    y2: -34,
    radius: 26.5,
    letterId: 6,
  },
  {
    type: 'segment',
    x1: 294,
    y1: -34,
    x2: 300,
    y2: 40,
    radius: 27.5,
    letterId: 6,
  },

  // --- 'E' (letterId: 7) ---
  {
    type: 'segment',
    x1: 358,
    y1: -36,
    x2: 358,
    y2: 36,
    radius: 28.0,
    letterId: 7,
  },
  {
    type: 'segment',
    x1: 358,
    y1: -38,
    x2: 402,
    y2: -38,
    radius: 26.5,
    letterId: 7,
  },
  {
    type: 'segment',
    x1: 358,
    y1: 0,
    x2: 394,
    y2: 0,
    radius: 25.5,
    letterId: 7,
  },
  {
    type: 'segment',
    x1: 358,
    y1: 38,
    x2: 402,
    y2: 38,
    radius: 26.5,
    letterId: 7,
  },
];

// ============================================================================
// 2. "PORTFOLIO" 3D 暗红透明玻璃外壳 + 内部金属灯芯线霓虹灯管骨架
// ============================================================================
const PORTFOLIO_TUBES: TubePrimitive[] = [
  // --- 'P' (letterId: 101) ---
  {
    type: 'segment',
    x1: -434,
    y1: -38,
    x2: -434,
    y2: 40,
    radius: 27.5,
    letterId: 101,
  },
  {
    type: 'arc',
    cx: -404,
    cy: -14,
    rx: 28,
    ry: 24,
    startAngle: -Math.PI * 0.74,
    endAngle: Math.PI * 0.74,
    radius: 26.0,
    letterId: 101,
  },

  // --- 'O' (letterId: 102) ---
  {
    type: 'arc',
    cx: -295,
    cy: 1,
    rx: 34.5,
    ry: 35.5,
    startAngle: -Math.PI,
    endAngle: Math.PI,
    radius: 27.5,
    letterId: 102,
  },

  // --- 'R' (letterId: 103) ---
  {
    type: 'segment',
    x1: -206,
    y1: -38,
    x2: -206,
    y2: 40,
    radius: 27.5,
    letterId: 103,
  },
  {
    type: 'arc',
    cx: -176,
    cy: -15,
    rx: 27,
    ry: 23,
    startAngle: -Math.PI * 0.74,
    endAngle: Math.PI * 0.74,
    radius: 25.5,
    letterId: 103,
  },
  {
    type: 'segment',
    x1: -176,
    y1: 6,
    x2: -152,
    y2: 39,
    radius: 26.5,
    letterId: 103,
  },

  // --- 'T' (letterId: 104) ---
  {
    type: 'segment',
    x1: -77,
    y1: -38,
    x2: -77,
    y2: 40,
    radius: 27.5,
    letterId: 104,
  },
  {
    type: 'segment',
    x1: -106,
    y1: -38,
    x2: -48,
    y2: -38,
    radius: 27.5,
    letterId: 104,
  },

  // --- 'F' (letterId: 105) ---
  {
    type: 'segment',
    x1: 4,
    y1: -38,
    x2: 4,
    y2: 40,
    radius: 27.5,
    letterId: 105,
  },
  {
    type: 'segment',
    x1: 4,
    y1: -38,
    x2: 48,
    y2: -38,
    radius: 26.5,
    letterId: 105,
  },
  {
    type: 'segment',
    x1: 4,
    y1: 2,
    x2: 40,
    y2: 2,
    radius: 25.5,
    letterId: 105,
  },

  // --- 'O' (letterId: 106) ---
  {
    type: 'arc',
    cx: 131,
    cy: 1,
    rx: 34.5,
    ry: 35.5,
    startAngle: -Math.PI,
    endAngle: Math.PI,
    radius: 27.5,
    letterId: 106,
  },

  // --- 'L' (letterId: 107) ---
  {
    type: 'segment',
    x1: 219,
    y1: -38,
    x2: 219,
    y2: 38,
    radius: 27.5,
    letterId: 107,
  },
  {
    type: 'segment',
    x1: 219,
    y1: 38,
    x2: 262,
    y2: 38,
    radius: 26.5,
    letterId: 107,
  },

  // --- 'I' (letterId: 108) ---
  {
    type: 'segment',
    x1: 315,
    y1: -38,
    x2: 315,
    y2: 40,
    radius: 28.5,
    letterId: 108,
  },

  // --- 'O' (letterId: 109) ---
  {
    type: 'arc',
    cx: 402,
    cy: 1,
    rx: 34.5,
    ry: 35.5,
    startAngle: -Math.PI,
    endAngle: Math.PI,
    radius: 27.5,
    letterId: 109,
  },
];

// 模块级 3D 暗红玻璃灯芯霓虹灯管位图缓存
const NEON_BULB_TUBE_CACHE = new Map<
  string,
  { shadowData: ImageData; tubeData: ImageData }
>();

/**
 * 通用真 3D 复古暗红灯泡同款【透明暗红玻璃外壳 + 内部金属灯芯线】霓虹灯管渲染引擎：
 * - 外壳：与顶部 3D 红宝石灯泡 (Vintage3DRedBulbCanvas) 同款的半透明深邃暗红/酒红玻璃管壁 (Ruby-Dark Red Translucent Glass Shell)，
 *   具备真实玻璃壁厚度菲涅尔折光环 (glassWallRim)、暗红边缘体积吸收与高锐度 3D 曲面玻璃镜面高光；
 * - 内部：沿着每个字母笔画中心轴线清晰可见的【3D 螺旋钨丝/金属灯芯线 (Metallic Filament Wire)】与黄铜电极卡扣支点，
 *   灯芯线发出与暗房红灯泡一致的暖红/暗红霓虹辉光，穿透外部半透明暗红玻璃壳体！
 */
function renderNeonFilamentGlassTubePass(
  shadowCanvas: HTMLCanvasElement,
  tubeCanvas: HTMLCanvasElement,
  baseTubes: TubePrimitive[],
  W: number,
  H: number,
  isEnergized: boolean
) {
  shadowCanvas.width = W;
  shadowCanvas.height = H;
  tubeCanvas.width = W;
  tubeCanvas.height = H;

  const sctx = shadowCanvas.getContext('2d');
  const bctx = tubeCanvas.getContext('2d');
  if (!sctx || !bctx) return;

  const cacheKey = `ruby-filament-neon-v2-${baseTubes.length}-${W}x${H}-${isEnergized ? 'hot' : 'norm'}`;
  const cached = NEON_BULB_TUBE_CACHE.get(cacheKey);
  if (cached) {
    sctx.putImageData(cached.shadowData, 0, 0);
    bctx.putImageData(cached.tubeData, 0, 0);
    return;
  }

  sctx.clearRect(0, 0, W, H);
  bctx.clearRect(0, 0, W, H);

  const cx0 = W / 2;
  const cy0 = H / 2 - 6;

  // 适度收窄玻璃管半径（约为原气球的 0.78 倍），使每个字母孔洞清晰通透，
  // 更好地呈现「外层半透明暗红玻璃管壁 + 中空暗红腔体 + 中心纤细金属灯芯线」的真实比例
  const glassRadiusScale = 0.78;
  const tubes = baseTubes.map((t) => ({
    ...t,
    radius: t.radius * glassRadiusScale,
  }));

  const letterIds = Array.from(new Set(tubes.map((t) => t.letterId)));

  const heightMap = new Float32Array(W * H);
  const alphaMap = new Float32Array(W * H);
  const filamentDistMap = new Float32Array(W * H);
  const filamentPhaseMap = new Float32Array(W * H);
  const mountDistMap = new Float32Array(W * H);

  filamentDistMap.fill(999);
  mountDistMap.fill(999);

  const minPy = Math.max(3, Math.floor(cy0 - 94));
  const maxPy = Math.min(H - 3, Math.ceil(cy0 + 96));
  const minPx = 3;
  const maxPx = W - 3;

  const kSameLetterGlass = 7.8;
  const kSameLetterWire = 3.6;
  const maxDepthRef = 28.0 * glassRadiusScale;

  for (let py = minPy; py < maxPy; py++) {
    const ly = py - cy0;
    for (let px = minPx; px < maxPx; px++) {
      const lx = px - cx0;
      const idx = py * W + px;

      let minSignedGlassDist = 999;
      let bestWireDist = 999;
      let bestWirePhase = 0;
      let bestMountDist = 999;

      for (let li = 0; li < letterIds.length; li++) {
        const lid = letterIds[li];
        let letterGlassDist = 999;
        let letterWireDist = 999;
        let letterPhase = 0;
        let letterMountDist = 999;

        for (let t = 0; t < tubes.length; t++) {
          const tube = tubes[t];
          if (tube.letterId !== lid) continue;

          let d = 999;
          let along = 0;
          let endDist = 999;

          if (tube.type === 'segment') {
            const res = distToSegmentWithParam(
              lx,
              ly,
              tube.x1!,
              tube.y1!,
              tube.x2!,
              tube.y2!
            );
            d = res.dist;
            along = res.along;
            endDist = res.endpointDist;
          } else if (tube.type === 'arc') {
            const dx = lx - tube.cx!;
            const dy = ly - tube.cy!;
            const rx = tube.rx!;
            const ry = tube.ry!;
            const ang = Math.atan2(dy / ry, dx / rx);
            const sAng = Math.min(tube.startAngle!, tube.endAngle!);
            const eAng = Math.max(tube.startAngle!, tube.endAngle!);
            const isFullCircle = eAng - sAng >= Math.PI * 1.98;

            const p1x = Math.cos(sAng) * rx;
            const p1y = Math.sin(sAng) * ry;
            const p2x = Math.cos(eAng) * rx;
            const p2y = Math.sin(eAng) * ry;

            const dEnd1 = Math.hypot(dx - p1x, dy - p1y);
            const dEnd2 = Math.hypot(dx - p2x, dy - p2y);
            endDist = isFullCircle ? 999 : Math.min(dEnd1, dEnd2);

            if (isFullCircle || (ang >= sAng && ang <= eAng)) {
              const ringX = Math.cos(ang) * rx;
              const ringY = Math.sin(ang) * ry;
              d = Math.hypot(dx - ringX, dy - ringY);
              along = (ang - sAng) * ((rx + ry) * 0.5);
            } else {
              d = Math.min(dEnd1, dEnd2);
              along = dEnd1 < dEnd2 ? 0 : (eAng - sAng) * ((rx + ry) * 0.5);
            }
          }

          const signedGlassD = d - tube.radius;
          if (letterGlassDist === 999) {
            letterGlassDist = signedGlassD;
          } else {
            letterGlassDist = smin(
              letterGlassDist,
              signedGlassD,
              kSameLetterGlass
            );
          }

          if (d < letterWireDist) {
            letterPhase = along;
          }
          if (letterWireDist === 999) {
            letterWireDist = d;
          } else {
            letterWireDist = smin(letterWireDist, d, kSameLetterWire);
          }

          if (endDist < letterMountDist) {
            letterMountDist = endDist;
          }
        }

        if (letterGlassDist < minSignedGlassDist) {
          minSignedGlassDist = letterGlassDist;
          bestWireDist = letterWireDist;
          bestWirePhase = letterPhase;
          bestMountDist = letterMountDist;
        }
      }

      if (minSignedGlassDist < 1.5) {
        const aVal = Math.max(0, Math.min(1, (1.1 - minSignedGlassDist) / 1.7));
        alphaMap[idx] = aVal;
        filamentDistMap[idx] = bestWireDist;
        filamentPhaseMap[idx] = bestWirePhase;
        mountDistMap[idx] = bestMountDist;

        // 3D 圆柱玻璃管截面高度场：用于计算精确的 3D 玻璃管曲面法线
        const insideDepth = Math.max(0, -minSignedGlassDist);
        const normalizedDepth = Math.min(1, insideDepth / maxDepthRef);
        const glassCylinderHeight =
          24.5 * Math.pow(Math.sin(normalizedDepth * (Math.PI * 0.5)), 0.52);

        heightMap[idx] = Math.max(0, glassCylinderHeight);
      }
    }
  }

  // 高斯平滑玻璃管表面高度场，确保 3D 圆柱玻璃外壳法线如吹制玻璃般平滑顺畅
  const smoothH = new Float32Array(W * H);
  const tempH = new Float32Array(W * H);
  const kernel = [1, 4, 6, 4, 1];

  const runGaussianPass = (src: Float32Array, dst: Float32Array) => {
    for (let y = minPy; y < maxPy; y++) {
      for (let x = minPx; x < maxPx; x++) {
        let sum = 0;
        for (let k = -2; k <= 2; k++) {
          sum += src[y * W + (x + k)] * kernel[k + 2];
        }
        tempH[y * W + x] = sum / 16;
      }
    }
    for (let y = minPy; y < maxPy; y++) {
      for (let x = minPx; x < maxPx; x++) {
        let sum = 0;
        for (let k = -2; k <= 2; k++) {
          sum += tempH[(y + k) * W + x] * kernel[k + 2];
        }
        dst[y * W + x] = sum / 16;
      }
    }
  };

  runGaussianPass(heightMap, smoothH);
  runGaussianPass(smoothH, smoothH);

  // ============================================================================
  // 1. 绘制玻璃灯管背面的【暗红玻璃透射阴影 + 暗红霓虹灯管环境光晕 (Neon Ruby-Red Aura)】
  // ============================================================================
  const rawShadowMask = document.createElement('canvas');
  rawShadowMask.width = W;
  rawShadowMask.height = H;
  const mctx = rawShadowMask.getContext('2d');

  const rawNeonGlowMask = document.createElement('canvas');
  rawNeonGlowMask.width = W;
  rawNeonGlowMask.height = H;
  const gctx = rawNeonGlowMask.getContext('2d');

  if (mctx && gctx) {
    const shadowMaskImg = mctx.createImageData(W, H);
    const glowMaskImg = gctx.createImageData(W, H);

    for (let i = 0; i < W * H; i++) {
      const a = alphaMap[i];
      if (a > 0.01) {
        // 玻璃外壳投射在白墙/桌面上的深暗红酒色玻璃半透明阴影
        shadowMaskImg.data[i * 4] = 52;
        shadowMaskImg.data[i * 4 + 1] = 8;
        shadowMaskImg.data[i * 4 + 2] = 12;
        shadowMaskImg.data[i * 4 + 3] = Math.round(a * 215);

        // 内部灯芯线向外辐射的暗红/红宝石霓虹辉光
        const wDist = filamentDistMap[i];
        const wireStrength = Math.max(0, 1 - wDist / 16.0);
        glowMaskImg.data[i * 4] = 225;
        glowMaskImg.data[i * 4 + 1] = 18;
        glowMaskImg.data[i * 4 + 2] = 28;
        glowMaskImg.data[i * 4 + 3] = Math.round(
          (a * 0.48 + wireStrength * 0.52) * 255
        );
      }
    }
    mctx.putImageData(shadowMaskImg, 0, 0);
    gctx.putImageData(glowMaskImg, 0, 0);

    // A. 玻璃管立体落影（右下方深酒红半透明玻璃投影）
    sctx.save();
    sctx.filter = 'blur(9px)';
    sctx.globalAlpha = isEnergized ? 0.32 : 0.36;
    sctx.drawImage(rawShadowMask, -8, 12);
    sctx.restore();

    sctx.save();
    sctx.filter = 'blur(4px)';
    sctx.globalAlpha = isEnergized ? 0.34 : 0.4;
    sctx.drawImage(rawShadowMask, -4, 7);
    sctx.restore();

    // B. 与顶部红灯泡完全同色系的暗红/红宝石霓虹漫反射光晕
    sctx.save();
    sctx.filter = isEnergized ? 'blur(18px)' : 'blur(14px)';
    sctx.globalAlpha = isEnergized ? 0.62 : 0.42;
    sctx.drawImage(rawNeonGlowMask, 0, 2);
    sctx.restore();

    sctx.save();
    sctx.filter = 'blur(6px)';
    sctx.globalAlpha = isEnergized ? 0.52 : 0.34;
    sctx.drawImage(rawNeonGlowMask, 0, 0);
    sctx.restore();
  }

  // ============================================================================
  // 2. 逐像素渲染【透明暗红玻璃管外壳 (Ruby Glass Shell) + 内部金属灯芯线 (Metallic Filament Wire)】
  //    完全复刻 Vintage3DRedBulbCanvas 的红宝石/暗红玻璃光学着色与内部钨丝发光方程
  // ============================================================================
  const outImg = bctx.createImageData(W, H);
  const out = outImg.data;

  // 主光源与半程向量（与 Vintage3DRedBulbCanvas 保持一致的 3D 光学高光角度）
  const lx = -0.28;
  const ly = -0.44;
  const lz = 0.853;

  const hx = lx;
  const hy = ly;
  const hz = lz + 1.0;
  const hLen = Math.hypot(hx, hy, hz) || 1;
  const nhx = hx / hLen;
  const nhy = hy / hLen;
  const nhz = hz / hLen;

  // 对侧内壁二次反射向量（玻璃管内壁月牙次级反光）
  const bounceHx = 0.32;
  const bounceHy = 0.38;
  const bounceHz = 0.868;

  const normScale = 23.0;

  for (let y = minPy; y < maxPy; y++) {
    for (let x = minPx; x < maxPx; x++) {
      const idx = y * W + x;
      const edgeAlpha = alphaMap[idx];
      if (edgeAlpha <= 0.005) continue;

      // 计算 3D 圆柱玻璃管外壳的表面法线 N = (nx, ny, nz)
      const dzdx =
        (smoothH[y * W + (x - 1)] - smoothH[y * W + (x + 1)]) * 0.68;
      const dzdy =
        (smoothH[(y - 1) * W + x] - smoothH[(y + 1) * W + x]) * 0.68;
      const normalizedH = Math.min(1, smoothH[idx] / normScale);
      const rawNz = Math.max(0.08, Math.pow(normalizedH, 0.62) * 0.96);
      const invLen = 1 / Math.hypot(dzdx, dzdy, rawNz);

      const nx = dzdx * invLen;
      const ny = dzdy * invLen;
      const nz = rawNz * invLen;

      // --- A. 透明暗红玻璃外壳着色 (Translucent Dark-Ruby Glass Shell) ---
      // 漫反射与暗红玻璃次表面散射 (与灯泡完全相同的深邃暗红酒色基底)
      const ndotl = Math.max(0, nx * lx + ny * ly + nz * lz);
      const backScatter = Math.max(0, -nx * lx - ny * ly + nz * 0.5) * 0.26;

      // 玻璃管壁厚度菲涅尔效应：
      // 管体中心通透半透明，向管壁两侧边缘呈深邃暗红酒色包裹，最外圈玻璃管壁内侧带有微亮红宝石折光环 (glassWallRim)
      const centerTransmit = Math.pow(nz, 0.75);
      const glassWallRim =
        nz > 0.14 && nz < 0.45
          ? Math.sin(((nz - 0.14) / 0.31) * Math.PI) *
            (0.32 + Math.max(0, nx * lx + ny * ly) * 0.46)
          : 0;

      // --- B. 玻璃管内部的 3D 金属灯芯线与黄铜电极支点 (Internal Metallic Filament Wire & Brass Mounts) ---
      const wireDist = filamentDistMap[idx];
      const wirePhase = filamentPhaseMap[idx];
      const mountDist = mountDistMap[idx];

      // 1) 金属灯芯线本体：细金属丝半径约 2.15px，带螺旋钨丝纹理 (helical coil)
      const coilWave = Math.sin(wirePhase * 0.75) * 0.32;
      const effectiveWireDist = Math.max(0, wireDist + coilWave * 0.25);

      // 物理金属丝实心核 (0 ~ 2.2px)
      const metalWireMask =
        wireDist < 2.35
          ? Math.pow(Math.max(0, 1 - effectiveWireDist / 2.25), 1.45)
          : 0;

      // 金属丝表面的高光脊线（体现灯芯是立体金属丝线，具有暖金铜/钨丝高光与暗红金属背阴面）
      const wireSpecular =
        wireDist < 1.35
          ? Math.pow(Math.max(0, 1 - wireDist / 1.35), 2.0) *
            (0.68 + 0.32 * Math.cos(wirePhase * 0.75))
          : 0;

      // 2) 笔画端点处的微型复古暗金黄铜灯芯夹持环/电极支点 (Brass Electrode Mounts)
      const brassMountMask =
        mountDist < 3.6 && wireDist < 3.4
          ? Math.pow(Math.max(0, 1 - mountDist / 3.6), 1.6)
          : 0;

      // 3) 灯芯线发出的暗红/红宝石霓虹电离辉光 (Neon & Incandescent Ruby Filament Glow)
      const tightWireHalo =
        wireDist < 7.5
          ? Math.pow(Math.max(0, 1 - wireDist / 7.5), 1.85)
          : 0;
      const wideTubeNeonGlow =
        wireDist < 17.5
          ? Math.pow(Math.max(0, 1 - wireDist / 17.5), 1.65)
          : 0;

      const filamentGlow =
        metalWireMask * (isEnergized ? 1.48 : 1.08) +
        tightWireHalo * (isEnergized ? 0.88 : 0.56) +
        wideTubeNeonGlow * (isEnergized ? 0.46 : 0.28);

      // --- C. 3D 曲面玻璃管外壳的镜面高光反射 (3D Curved Glass Specular Highlights) ---
      const ndoth = Math.max(0, nx * nhx + ny * nhy + nz * nhz);

      // 主玻璃高光条：沿着每个字母 3D 玻璃管左上方边缘延伸的清亮弧形玻璃反光带
      let primarySpec = 0;
      if (ndoth > 0.946) {
        primarySpec = Math.min(1, (ndoth - 0.946) / 0.018);
      }
      const softSpecHalo = Math.pow(ndoth, 22) * (isEnergized ? 0.42 : 0.32);

      // 对侧次级玻璃管内壁反射高光（真实中空玻璃管特有的右下内壁月牙反光）
      const ndothBounce = Math.max(
        0,
        nx * bounceHx + ny * bounceHy + nz * bounceHz
      );
      const secondarySpec =
        ndothBounce > 0.948 && nz < 0.78
          ? Math.min(1, (ndothBounce - 0.948) / 0.02) * 0.54
          : 0;

      // --- D. 合成【透明暗红玻璃外壳 + 内部金属灯芯线】的 RGB 与真实玻璃透明度 Alpha ---
      // 玻璃外壳暗红底色（与 Vintage3DRedBulbCanvas 行 290-320 保持完全一致的深暗红/红宝石色阶）
      const baseLit =
        (0.16 +
          ndotl * (isEnergized ? 0.74 : 0.62) +
          backScatter +
          wideTubeNeonGlow * 0.58) *
          (0.18 + 0.82 * centerTransmit) +
        glassWallRim;

      // 1) 暗红玻璃基底 + 红宝石霓虹内发光
      let r =
        34 +
        baseLit * 198 +
        filamentGlow * 235 +
        softSpecHalo * 170 +
        (primarySpec + secondarySpec) * 255;

      let g =
        2 +
        Math.pow(Math.max(0, baseLit), 2.15) * 22 +
        tightWireHalo * (isEnergized ? 52 : 30) +
        metalWireMask * (isEnergized ? 148 : 96) +
        wireSpecular * (isEnergized ? 185 : 132) +
        softSpecHalo * 48 +
        primarySpec * 230 +
        secondarySpec * 155;

      let b =
        4 +
        Math.pow(Math.max(0, baseLit), 2.35) * 20 +
        tightWireHalo * (isEnergized ? 34 : 18) +
        metalWireMask * (isEnergized ? 82 : 48) +
        wireSpecular * (isEnergized ? 118 : 74) +
        softSpecHalo * 52 +
        primarySpec * 230 +
        secondarySpec * 155;

      // 2) 叠加端点处的复古暗金黄铜灯芯支架金属质感
      if (brassMountMask > 0.01) {
        const brassR = 168 + ndotl * 65;
        const brassG = 118 + ndotl * 52;
        const brassB = 58 + ndotl * 32;
        r = r * (1 - brassMountMask * 0.75) + brassR * (brassMountMask * 0.75);
        g = g * (1 - brassMountMask * 0.75) + brassG * (brassMountMask * 0.75);
        b = b * (1 - brassMountMask * 0.75) + brassB * (brassMountMask * 0.75);
      }

      // 3) 计算真实中空透明暗红玻璃壳体的不透明度 (Glass Shell Transparency)：
      //    - 玻璃管四周管壁边缘 (nz 较小处) 玻璃厚度大，呈现浓郁深邃的暗红玻璃壁 (opacity ~ 0.90)
      //    - 玻璃管正中腔体 (nz 较大处) 为透明暗红玻璃，透过率为 ~38% (opacity ~ 0.62)，能清澈看到内部悬空的金属灯芯线
      //    - 内部金属灯芯线本体 (metalWireMask) 与玻璃表面高光 (primarySpec) 为实心高不透明度 (opacity -> 1.0)
      const wallThicknessOpacity =
        0.58 + 0.34 * Math.pow(1 - centerTransmit, 1.15) + glassWallRim * 0.22;
      const finalOpacity = Math.min(
        1.0,
        Math.max(
          wallThicknessOpacity,
          metalWireMask * 0.98,
          tightWireHalo * 0.86,
          brassMountMask * 0.95,
          (primarySpec + secondarySpec) * 0.98
        )
      );

      const pIdx = idx * 4;
      out[pIdx] = Math.min(255, Math.max(0, Math.round(r)));
      out[pIdx + 1] = Math.min(255, Math.max(0, Math.round(g)));
      out[pIdx + 2] = Math.min(255, Math.max(0, Math.round(b)));
      out[pIdx + 3] = Math.round(edgeAlpha * finalOpacity * 255);
    }
  }

  bctx.putImageData(outImg, 0, 0);

  NEON_BULB_TUBE_CACHE.set(cacheKey, {
    shadowData: sctx.getImageData(0, 0, W, H),
    tubeData: outImg,
  });
}

/**
 * 桌面底部【ABOUT ME】3D 暗红透明玻璃外壳 + 内部金属灯芯线霓虹灯管组件
 */
export const AboutMeBalloonCanvas: React.FC<AboutMeBalloonCanvasProps> = ({
  cubeSize,
  onClick,
  flashlightShadow,
}) => {
  const shadowCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const normalTubeCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const energizedShadowCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const energizedTubeCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [isHovered, setIsHovered] = useState(false);

  const scale = cubeSize / 248;
  const displayWidth = Math.round(470 * scale);
  const displayHeight = Math.round(142 * scale);

  useEffect(() => {
    if (shadowCanvasRef.current && normalTubeCanvasRef.current) {
      renderNeonFilamentGlassTubePass(
        shadowCanvasRef.current,
        normalTubeCanvasRef.current,
        ABOUT_ME_TUBES,
        940,
        284,
        false
      );
    }
    if (energizedShadowCanvasRef.current && energizedTubeCanvasRef.current) {
      renderNeonFilamentGlassTubePass(
        energizedShadowCanvasRef.current,
        energizedTubeCanvasRef.current,
        ABOUT_ME_TUBES,
        940,
        284,
        true
      );
    }
  }, []);

  const flDx = flashlightShadow ? flashlightShadow.dx : 0;
  const flDy = flashlightShadow ? flashlightShadow.dy : 0;
  const flIntensity = flashlightShadow ? flashlightShadow.intensity : 0;

  const hoverTransform = isHovered
    ? 'translate3d(0px, -2px, 0px) scale3d(1.05, 1.05, 1)'
    : 'translate3d(0px, 0px, 0px) scale3d(1, 1, 1)';

  const shadowTransform = isHovered
    ? `translate3d(${flDx * 0.65}px, ${flDy * 0.65 + 2}px, 0px) scale3d(1.06, 1.06, 1)`
    : `translate3d(${flDx * 0.65}px, ${flDy * 0.65}px, 0px) scale(${
        1 + flIntensity * 0.04
      })`;

  const tubeFilter = (() => {
    const filters: string[] = [];
    if (isHovered) {
      filters.push(
        'drop-shadow(0px 0px 10px rgba(220, 20, 32, 0.45)) brightness(1.06)'
      );
    }
    if (flIntensity > 0.02) {
      const sX = Math.round(flDx * 0.9);
      const sY = Math.round(flDy * 0.9);
      const sBlur = Math.round(4 + (1 - flIntensity) * 6);
      filters.push(
        `drop-shadow(${sX}px ${sY}px ${sBlur}px rgba(18, 3, 6, ${(
          0.82 * flIntensity
        ).toFixed(2)}))`
      );
      const rimX = Math.round(-flDx * 0.16);
      const rimY = Math.round(-flDy * 0.16);
      filters.push(
        `drop-shadow(${rimX}px ${rimY}px 5px rgba(245, 45, 55, ${(
          0.68 * flIntensity
        ).toFixed(2)}))`
      );
    }
    return filters.length > 0 ? filters.join(' ') : 'none';
  })();

  const springTransition =
    'transform 380ms cubic-bezier(0.22, 1, 0.36, 1), opacity 240ms ease, filter 260ms ease';

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      aria-label="Open About Me"
      className="relative flex items-center justify-center p-0 m-0 bg-transparent border-0 cursor-pointer pointer-events-auto focus:outline-none select-none"
      style={{
        width: displayWidth,
        height: displayHeight,
      }}
    >
      <canvas
        ref={shadowCanvasRef}
        style={{
          width: displayWidth,
          height: displayHeight,
          transform: shadowTransform,
          opacity: isHovered ? 0 : 1,
          transition: springTransition,
        }}
        className="absolute inset-0 z-10 block pointer-events-none select-none origin-center"
      />

      <canvas
        ref={energizedShadowCanvasRef}
        style={{
          width: displayWidth,
          height: displayHeight,
          transform: shadowTransform,
          opacity: isHovered ? 1 : 0,
          transition: springTransition,
        }}
        className="absolute inset-0 z-10 block pointer-events-none select-none origin-center"
      />

      <canvas
        ref={normalTubeCanvasRef}
        style={{
          width: displayWidth,
          height: displayHeight,
          transform: hoverTransform,
          opacity: isHovered ? 0 : 1,
          filter: tubeFilter,
          transition: springTransition,
        }}
        className="absolute inset-0 z-20 block pointer-events-none select-none origin-center"
      />

      <canvas
        ref={energizedTubeCanvasRef}
        style={{
          width: displayWidth,
          height: displayHeight,
          transform: hoverTransform,
          opacity: isHovered ? 1 : 0,
          filter: tubeFilter,
          transition: springTransition,
        }}
        className="relative z-20 block pointer-events-none select-none origin-center"
      />
    </button>
  );
};

/**
 * 页面最上方【PORTFOLIO】3D 暗红透明玻璃外壳 + 内部金属灯芯线霓虹灯管组件
 * （与顶部暗房红灯泡及底部 ABOUT ME 同款透明暗红玻璃壳 + 内部金属钨丝灯芯发光模型）
 */
export const PortfolioBalloonCanvas: React.FC<AboutMeBalloonCanvasProps> = ({
  cubeSize,
  flashlightShadow,
}) => {
  const shadowCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const normalTubeCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const energizedShadowCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const energizedTubeCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [isHovered, setIsHovered] = useState(false);

  const scale = cubeSize / 248;
  const displayWidth = Math.round(510 * scale);
  const displayHeight = Math.round(134 * scale);

  useEffect(() => {
    if (shadowCanvasRef.current && normalTubeCanvasRef.current) {
      renderNeonFilamentGlassTubePass(
        shadowCanvasRef.current,
        normalTubeCanvasRef.current,
        PORTFOLIO_TUBES,
        1020,
        268,
        false
      );
    }
    if (energizedShadowCanvasRef.current && energizedTubeCanvasRef.current) {
      renderNeonFilamentGlassTubePass(
        energizedShadowCanvasRef.current,
        energizedTubeCanvasRef.current,
        PORTFOLIO_TUBES,
        1020,
        268,
        true
      );
    }
  }, []);

  const flDx = flashlightShadow ? flashlightShadow.dx : 0;
  const flDy = flashlightShadow ? flashlightShadow.dy : 0;
  const flIntensity = flashlightShadow ? flashlightShadow.intensity : 0;

  const hoverTransform = isHovered
    ? 'translate3d(0px, -2px, 0px) scale3d(1.04, 1.04, 1)'
    : 'translate3d(0px, 0px, 0px) scale3d(1, 1, 1)';

  const shadowTransform = isHovered
    ? `translate3d(${flDx * 0.65}px, ${flDy * 0.65 + 2}px, 0px) scale3d(1.05, 1.05, 1)`
    : `translate3d(${flDx * 0.65}px, ${flDy * 0.65}px, 0px) scale(${
        1 + flIntensity * 0.04
      })`;

  const tubeFilter = (() => {
    const filters: string[] = [];
    if (isHovered) {
      filters.push(
        'drop-shadow(0px 0px 10px rgba(220, 20, 32, 0.45)) brightness(1.06)'
      );
    }
    if (flIntensity > 0.02) {
      const sX = Math.round(flDx * 0.9);
      const sY = Math.round(flDy * 0.9);
      const sBlur = Math.round(4 + (1 - flIntensity) * 6);
      filters.push(
        `drop-shadow(${sX}px ${sY}px ${sBlur}px rgba(18, 3, 6, ${(
          0.82 * flIntensity
        ).toFixed(2)}))`
      );
      const rimX = Math.round(-flDx * 0.16);
      const rimY = Math.round(-flDy * 0.16);
      filters.push(
        `drop-shadow(${rimX}px ${rimY}px 5px rgba(245, 45, 55, ${(
          0.68 * flIntensity
        ).toFixed(2)}))`
      );
    }
    return filters.length > 0 ? filters.join(' ') : 'none';
  })();

  const springTransition =
    'transform 380ms cubic-bezier(0.22, 1, 0.36, 1), opacity 240ms ease, filter 260ms ease';

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="relative flex items-center justify-center pointer-events-auto select-none"
      style={{
        width: displayWidth,
        height: displayHeight,
      }}
    >
      <canvas
        ref={shadowCanvasRef}
        style={{
          width: displayWidth,
          height: displayHeight,
          transform: shadowTransform,
          opacity: isHovered ? 0 : 1,
          transition: springTransition,
        }}
        className="absolute inset-0 z-10 block pointer-events-none select-none origin-center"
      />

      <canvas
        ref={energizedShadowCanvasRef}
        style={{
          width: displayWidth,
          height: displayHeight,
          transform: shadowTransform,
          opacity: isHovered ? 1 : 0,
          transition: springTransition,
        }}
        className="absolute inset-0 z-10 block pointer-events-none select-none origin-center"
      />

      <canvas
        ref={normalTubeCanvasRef}
        style={{
          width: displayWidth,
          height: displayHeight,
          transform: hoverTransform,
          opacity: isHovered ? 0 : 1,
          filter: tubeFilter,
          transition: springTransition,
        }}
        className="absolute inset-0 z-20 block pointer-events-none select-none origin-center"
      />

      <canvas
        ref={energizedTubeCanvasRef}
        style={{
          width: displayWidth,
          height: displayHeight,
          transform: hoverTransform,
          opacity: isHovered ? 1 : 0,
          filter: tubeFilter,
          transition: springTransition,
        }}
        className="relative z-20 block pointer-events-none select-none origin-center"
      />
    </div>
  );
};
