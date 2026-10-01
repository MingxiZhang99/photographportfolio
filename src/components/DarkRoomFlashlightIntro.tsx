import React, { useState, useEffect, useRef } from 'react';

interface DarkRoomFlashlightIntroProps {
  mousePos: { x: number; y: number };
  onLightTurnedOn: () => void;
}

/**
 * 极简复古 3D 红色暗房/摄影棚钨丝灯泡（逐像素 3D 球面与圆柱法线渲染 + 实时追踪鼠标光源高光）：
 * - 去除繁琐的外壳与遮光板，仅保留极简复古电源吊线 + 3D 暗金黄铜螺口灯座 + 3D 饱满红宝石玻璃泡壳与内部复古发光钨丝；
 * - 灯泡与灯座的 3D 曲面法线实时响应鼠标手电筒坐标 (mousePos)，当鼠标移动时，玻璃球面上的高光月牙、菲涅尔红光边缘与黄铜金属反光随之实时滑动。
 */
const Vintage3DRedBulbCanvas: React.FC<{
  mousePos: { x: number; y: number };
  isHovered: boolean;
  isIgniting: boolean;
}> = ({ mousePos, isHovered, isIgniting }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = 180;
    const H = 220;
    if (canvas.width !== W || canvas.height !== H) {
      canvas.width = W;
      canvas.height = H;
    }

    ctx.clearRect(0, 0, W, H);

    const screenBulbX =
      typeof window !== 'undefined' ? window.innerWidth / 2 : 640;
    const screenBulbY = 76;

    // 计算鼠标手电筒相对于 3D 灯泡中心的实时三维入射光源向量 L = (lx, ly, lz)
    const dxScreen = mousePos.x - screenBulbX;
    const dyScreen = mousePos.y - screenBulbY;
    const distScreen = Math.hypot(dxScreen, dyScreen);
    const proximity = Math.max(0, Math.min(1, 1 - distScreen / 340));

    const rawLx = Math.max(-1.25, Math.min(1.25, dxScreen / 210));
    const rawLy = Math.max(-1.0, Math.min(1.25, dyScreen / 210));
    const rawLz = 0.78;
    const lLen = Math.hypot(rawLx, rawLy, rawLz) || 1;
    const lx = rawLx / lLen;
    const ly = rawLy / lLen;
    const lz = rawLz / lLen;

    // 半程向量 H = normalize(L + V)，其中 V = (0, 0, 1)，用于实时计算跟随鼠标滑动的 3D 球面高光
    const hx = lx;
    const hy = ly;
    const hz = lz + 1.0;
    const hLen = Math.hypot(hx, hy, hz) || 1;
    const nhx = hx / hLen;
    const nhy = hy / hLen;
    const nhz = hz / hLen;

    const cx = W / 2;
    const imgData = ctx.createImageData(W, H);
    const out = imgData.data;

    // 极简复古梨形 G-type / A19 3D 灯泡几何轮廓函数：返回给定 y 行的 3D 截面半径 R(y)
    // y = 0..32: 极简复古电源吊线
    // y = 32..39: 顶部黑胶木绝缘环
    // y = 39..68: 复古暗金黄铜爱迪生螺口灯座 (E27 Brass Socket)
    // y = 68..178: 3D 饱满复古红色玻璃灯泡壳 (3D Ruby Red Glass Bulb)
    const bulbSphereCy = 128;
    const bulbMaxR = 46;

    const getBulbRadiusAtY = (y: number): number => {
      if (y < 68 || y > 174) return 0;
      if (y >= 106) {
        // 下半部至赤道：标准饱满 3D 球体 (y = 106..174, 球心 128, R = 46)
        const dy = y - bulbSphereCy;
        if (Math.abs(dy) >= bulbMaxR) return 0;
        return Math.sqrt(bulbMaxR * bulbMaxR - dy * dy);
      } else {
        // 上半部颈部收束段 (y = 68..106)：从灯座半径 20.5 平滑S型曲线膨胀过渡到球体截面半径 40.3
        const t = (y - 68) / (106 - 68); // 0 -> 1
        const smoothT = t * t * (3 - 2 * t);
        // 微微内凹的经典复古灯泡颈部曲线
        return 20.2 + smoothT * 20.2 - Math.sin(t * Math.PI) * 1.8;
      }
    };

    for (let y = 0; y < H; y++) {
      // 1. 顶部极简电源吊线 (y = 0..32)
      if (y < 32) {
        const cordR = 2.6;
        for (let x = Math.floor(cx - 4); x <= Math.ceil(cx + 4); x++) {
          const dx = x - cx;
          if (Math.abs(dx) > cordR + 0.8) continue;
          const a = Math.max(0, Math.min(1, cordR + 0.6 - Math.abs(dx)));
          const nx = dx / cordR;
          const nz = Math.sqrt(Math.max(0, 1 - nx * nx));
          const diff = Math.max(0, nx * lx + nz * lz);
          const lum = Math.round(22 + diff * (38 + proximity * 32));
          const idx = (y * W + x) * 4;
          out[idx] = lum + 6;
          out[idx + 1] = lum;
          out[idx + 2] = lum;
          out[idx + 3] = Math.round(a * 255);
        }
        continue;
      }

      // 2. 灯座顶部胶木绝缘小环 (y = 32..39)
      if (y >= 32 && y < 39) {
        const capR = 11.5;
        for (
          let x = Math.floor(cx - capR - 2);
          x <= Math.ceil(cx + capR + 2);
          x++
        ) {
          const dx = x - cx;
          const dist = Math.abs(dx);
          if (dist > capR + 0.8) continue;
          const a = Math.max(0, Math.min(1, capR + 0.5 - dist));
          const nx = dx / capR;
          const ny = (y - 35.5) / 6;
          const nz = Math.sqrt(Math.max(0.05, 1 - nx * nx - ny * ny * 0.3));
          const diff = Math.max(0, nx * lx + ny * ly + nz * lz);
          const spec = Math.pow(
            Math.max(0, nx * nhx + ny * nhy + nz * nhz),
            28
          );
          const base = 24 + diff * 36 + spec * 95;
          const idx = (y * W + x) * 4;
          out[idx] = Math.min(255, Math.round(base + 8));
          out[idx + 1] = Math.min(255, Math.round(base));
          out[idx + 2] = Math.min(255, Math.round(base + 2));
          out[idx + 3] = Math.round(a * 255);
        }
        continue;
      }

      // 3. 极简复古 3D 黄铜/暗金螺口灯座 (y = 39..68)
      if (y >= 39 && y < 68) {
        const tY = (y - 39) / 29;
        // 复古螺纹起伏波浪半径
        const threadWave =
          y > 44 && y < 64 ? Math.sin(((y - 44) / 6.2) * Math.PI * 2) * 1.35 : 0;
        const socketR = 20.5 + threadWave;

        for (
          let x = Math.floor(cx - socketR - 2);
          x <= Math.ceil(cx + socketR + 2);
          x++
        ) {
          const dx = x - cx;
          const dist = Math.abs(dx);
          if (dist > socketR + 0.8) continue;
          const a = Math.max(0, Math.min(1, socketR + 0.5 - dist));

          // 3D 圆柱金属法线 + 螺纹纵向法线倾角
          const nx = dx / socketR;
          const ny =
            y > 44 && y < 64
              ? Math.cos(((y - 44) / 6.2) * Math.PI * 2) * 0.36
              : (tY - 0.5) * 0.25;
          const nz = Math.sqrt(Math.max(0.06, 1 - nx * nx - ny * ny * 0.5));

          // 随鼠标光源实时移动的 3D 金属漫反射与高光带
          const ndotl = Math.max(0, nx * lx + ny * ly + nz * lz);
          const ndoth = Math.max(0, nx * nhx + ny * nhy + nz * nhz);
          const spec = Math.pow(ndoth, 34) * (0.85 + proximity * 0.45);
          const anisoBrushed = Math.pow(Math.max(0, 1 - Math.abs(nx - lx * 0.65)), 6) * 0.35;

          // 底部来自红色灯泡的暖红环境反光
          const redUpBounce = Math.max(0, tY - 0.45) * 0.55;

          const metalShade =
            0.18 + ndotl * (0.62 + proximity * 0.25) + anisoBrushed;

          let r = Math.round(148 * metalShade + spec * 245 + redUpBounce * 95);
          let g = Math.round(112 * metalShade + spec * 205 + redUpBounce * 14);
          let b = Math.round(64 * metalShade + spec * 145 + redUpBounce * 12);

          const idx = (y * W + x) * 4;
          out[idx] = Math.min(255, r);
          out[idx + 1] = Math.min(255, g);
          out[idx + 2] = Math.min(255, b);
          out[idx + 3] = Math.round(a * 255);
        }
        continue;
      }

      // 4. 3D 复古红宝石玻璃灯泡本体 (y = 68..174)
      const rRow = getBulbRadiusAtY(y);
      if (rRow <= 0) continue;

      // 计算纵向轮廓斜率 dR/dy 以获得精确的 3D 梨形球面法线 ny
      const rPrev = getBulbRadiusAtY(y - 1) || rRow;
      const rNext = getBulbRadiusAtY(y + 1) || rRow;
      const dRdy = (rNext - rPrev) * 0.5;

      for (
        let x = Math.floor(cx - rRow - 2);
        x <= Math.ceil(cx + rRow + 2);
        x++
      ) {
        const dx = x - cx;
        const absDx = Math.abs(dx);
        if (absDx > rRow + 0.9) continue;

        const edgeAlpha = Math.max(0, Math.min(1, rRow + 0.6 - absDx));

        // 计算精确的 3D 灯泡玻璃表面法线 N = (nx, ny, nz)
        const nxGlass = dx / bulbMaxR;
        let nyGlass: number;
        if (y >= 106) {
          nyGlass = (y - bulbSphereCy) / bulbMaxR;
        } else {
          nyGlass = -dRdy * 0.55 + (y - bulbSphereCy) * 0.008;
        }
        const nzSq = Math.max(0.02, 1 - nxGlass * nxGlass - nyGlass * nyGlass);
        const nzGlass = Math.sqrt(nzSq);
        const nInv = 1 / Math.hypot(nxGlass, nyGlass, nzGlass);
        const nx = nxGlass * nInv;
        const ny = nyGlass * nInv;
        const nz = nzGlass * nInv;

        // --- A. 3D 红宝石玻璃球体体积着色 (Deep Ruby 3D Glass Volume) ---
        // 随鼠标光源方向变化的 3D 漫反射与内部透射光 (Subsurface Red Glow)
        const ndotl = Math.max(0, nx * lx + ny * ly + nz * lz);
        const backScatter = Math.max(0, -nx * lx - ny * ly + nz * 0.5) * 0.25;

        // 真实 3D 玻璃厚度菲涅尔效应：球心通透鲜红，向球体四周边缘呈深邃暗红酒色包裹，最外圈玻璃壁边缘带有微亮红宝石折光环
        const centerTransmit = Math.pow(nz, 0.72);
        const glassWallRim =
          nz > 0.14 && nz < 0.42
            ? Math.sin(((nz - 0.14) / 0.28) * Math.PI) *
              (0.28 + Math.max(0, nx * lx + ny * ly) * 0.45)
            : 0;

        // --- B. 灯泡内部 3D 复古发光钨丝环与玻杆支架 (Internal 3D Glowing Filament) ---
        let filamentGlow = 0;
        // 内部玻璃芯柱 (y = 68..112, x 靠近中心)
        const stemDist = Math.abs(dx);
        if (y >= 68 && y <= 110 && stemDist < 4.5) {
          filamentGlow += (1 - stemDist / 4.5) * 0.22;
        }
        // 内部经典复古拱形钨丝线圈 (马蹄形发光环，中心在 cx, y = 122)
        const filDx = dx / 15.5;
        const filDy = (y - 122) / 21.0;
        const filRingDist = Math.abs(Math.hypot(filDx, filDy) - 1.0);
        if (y >= 98 && y <= 142 && filRingDist < 0.35) {
          const coreWire = Math.pow(Math.max(0, 1 - filRingDist / 0.14), 2.2);
          const wireHalo = Math.pow(Math.max(0, 1 - filRingDist / 0.35), 1.6);
          filamentGlow +=
            coreWire * (isIgniting ? 1.5 : isHovered ? 0.95 : 0.72) +
            wireHalo * (isIgniting ? 0.9 : 0.38);
        }

        // 灯泡中心整体的暖红内部体积辉光
        const innerCoreDist = Math.hypot(dx / 34, (y - 124) / 36);
        const innerCoreGlow =
          Math.pow(Math.max(0, 1 - innerCoreDist), 1.8) *
          (isIgniting ? 1.4 : 0.42 + proximity * 0.22 + (isHovered ? 0.22 : 0));

        // --- C. 随鼠标移动的 3D 球面清漆高光反射 (Dynamic Mouse-Tracked 3D Specular) ---
        const ndoth = Math.max(0, nx * nhx + ny * nhy + nz * nhz);

        // 主高光：锐利的 3D 弧形玻璃镜面高光，随着鼠标移动在玻璃球面上实时游走！
        let primarySpec = 0;
        if (ndoth > 0.952) {
          primarySpec = Math.min(1, (ndoth - 0.952) / 0.016);
        }
        const softSpecHalo = Math.pow(ndoth, 24) * (0.36 + proximity * 0.28);

        // 对侧次级内壁反射月牙高光（真实玻璃球体特有的对角二次内反射，随鼠标反向微移）
        const bounceHx = -lx * 0.65;
        const bounceHy = -ly * 0.65;
        const bounceHz = 0.85;
        const bLen = Math.hypot(bounceHx, bounceHy, bounceHz) || 1;
        const ndothBounce = Math.max(
          0,
          (nx * bounceHx + ny * bounceHy + nz * bounceHz) / bLen
        );
        const secondarySpec =
          ndothBounce > 0.955 && nz < 0.75
            ? Math.min(1, (ndothBounce - 0.955) / 0.018) * 0.52
            : 0;

        // 合成 3D 红色玻璃颜色
        const baseLit =
          (0.18 +
            ndotl * (0.68 + proximity * 0.28) +
            backScatter +
            innerCoreGlow * 0.65) *
            (0.16 + 0.84 * centerTransmit) +
          glassWallRim;

        let r = Math.round(
          38 +
            baseLit * 215 +
            filamentGlow * 255 +
            softSpecHalo * 180 +
            (primarySpec + secondarySpec) * 255
        );
        let g = Math.round(
          2 +
            Math.pow(Math.max(0, baseLit), 2.1) * 26 +
            filamentGlow * 135 +
            softSpecHalo * 55 +
            primarySpec * 235 +
            secondarySpec * 165
        );
        let b = Math.round(
          4 +
            Math.pow(Math.max(0, baseLit), 2.3) * 24 +
            filamentGlow * 68 +
            softSpecHalo * 58 +
            primarySpec * 235 +
            secondarySpec * 165
        );

        if (isIgniting) {
          r = Math.min(255, r + 90);
          g = Math.min(255, g + 140);
          b = Math.min(255, b + 120);
        }

        const idx = (y * W + x) * 4;
        out[idx] = Math.min(255, Math.max(0, r));
        out[idx + 1] = Math.min(255, Math.max(0, g));
        out[idx + 2] = Math.min(255, Math.max(0, b));
        out[idx + 3] = Math.round(edgeAlpha * 255);
      }
    }

    ctx.putImageData(imgData, 0, 0);
  }, [mousePos.x, mousePos.y, isHovered, isIgniting]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: 112,
        height: 138,
      }}
      className="relative z-10 block pointer-events-none select-none transition-transform duration-300 group-hover:scale-105"
    />
  );
};

export const DarkRoomFlashlightIntro: React.FC<DarkRoomFlashlightIntroProps> = ({
  mousePos,
  onLightTurnedOn,
}) => {
  const [isHoveringBulb, setIsHoveringBulb] = useState(false);
  const [isIgniting, setIsIgniting] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);

  const bulbX = typeof window !== 'undefined' ? window.innerWidth / 2 : 640;
  const bulbY = 76;
  const distToBulb = Math.hypot(mousePos.x - bulbX, mousePos.y - bulbY);
  const flashlightProximity = Math.max(0, Math.min(1, 1 - distToBulb / 240));

  const handleBulbClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isIgniting) return;
    setIsIgniting(true);

    setTimeout(() => {
      setIsFadingOut(true);
    }, 440);

    setTimeout(() => {
      onLightTurnedOn();
    }, 860);
  };

  return (
    <div
      className="fixed inset-0 z-40 overflow-hidden pointer-events-none select-none"
      style={{
        opacity: isFadingOut ? 0 : 1,
        transition: 'opacity 420ms ease-out',
      }}
    >
      {/* ====================================================================
          1. 全屏黑灯透视遮罩（在鼠标手电筒位置挖出紧凑小巧、边缘柔和模糊的圆形透光孔，真实显示底下完整 3D 魔方）
         ==================================================================== */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: isIgniting
            ? `radial-gradient(circle 2600px at ${bulbX}px ${bulbY}px, rgba(255, 253, 240, 0) 0%, rgba(255, 251, 225, 0.08) 60%, rgba(255, 255, 255, 0) 100%)`
            : `radial-gradient(
                circle 112px at ${mousePos.x}px ${mousePos.y}px,
                rgba(2, 2, 4, 0.0) 0%,
                rgba(4, 3, 2, 0.04) 30%,
                rgba(8, 7, 3, 0.22) 50%,
                rgba(5, 4, 3, 0.62) 70%,
                rgba(3, 3, 5, 0.91) 86%,
                rgba(2, 2, 4, 0.99) 96%,
                #020204 100%
              )`,
          transition: isIgniting ? 'background 460ms ease-out' : 'none',
        }}
      />

      {/* ====================================================================
          2. 紧凑手电筒光圈内部的【淡淡黄色边缘模糊光效 + 受光高光】
         ==================================================================== */}
      {!isIgniting && (
        <div
          className="fixed pointer-events-none"
          style={{
            left: mousePos.x,
            top: mousePos.y,
            width: 224,
            height: 224,
            transform: 'translate(-50%, -50%)',
          }}
        >
          {/* 第一层：赋予被照亮小圆圈区域真实手电筒淡黄暖色温的柔光滤镜层 */}
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background:
                'radial-gradient(circle, rgba(255, 244, 156, 0.36) 0%, rgba(254, 234, 128, 0.28) 36%, rgba(248, 214, 92, 0.15) 62%, rgba(240, 194, 68, 0.04) 82%, transparent 100%)',
              mixBlendMode: 'multiply',
              filter: 'blur(12px)',
            }}
          />

          {/* 第二层：手电筒中心灯珠高光光晕与边缘模糊黄色光环 */}
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background:
                'radial-gradient(circle, rgba(255, 252, 218, 0.26) 0%, rgba(255, 243, 164, 0.20) 34%, rgba(253, 226, 118, 0.11) 58%, rgba(250, 204, 76, 0.03) 78%, transparent 96%)',
              mixBlendMode: 'screen',
              filter: 'blur(14px)',
            }}
          />

          {/* 第三层：手电筒内圈聚光反光核 */}
          <div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              width: 104,
              height: 104,
              background:
                'radial-gradient(circle, rgba(255, 253, 232, 0.22) 0%, rgba(254, 240, 158, 0.12) 55%, transparent 100%)',
              filter: 'blur(8px)',
            }}
          />
        </div>
      )}

      {/* 点亮灯泡瞬间的全屏柔光爆发过渡 */}
      {isIgniting && (
        <div
          className="fixed inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(circle at 50% 8%, rgba(255, 240, 235, 0.72) 0%, rgba(255, 255, 255, 0.30) 55%, transparent 100%)',
          }}
        />
      )}

      {/* ====================================================================
          3. 屏幕正上方悬挂的【极简复古 3D 红色玻璃灯泡】（表面高光随鼠标光源实时移动）
         ==================================================================== */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center pointer-events-auto">
        <button
          type="button"
          onClick={handleBulbClick}
          onMouseEnter={() => setIsHoveringBulb(true)}
          onMouseLeave={() => setIsHoveringBulb(false)}
          aria-label="Turn on full room light"
          className="group relative flex flex-col items-center bg-transparent border-0 p-0 cursor-pointer focus:outline-none pointer-events-auto"
        >
          {/* 红色 3D 灯泡周围的暗房红微光晕（随鼠标手电筒靠近或悬停而增强） */}
          <div
            className="absolute top-[58%] left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none transition-all duration-300"
            style={{
              width: isIgniting ? 2600 : isHoveringBulb ? 148 : 108,
              height: isIgniting ? 2600 : isHoveringBulb ? 148 : 108,
              background: isIgniting
                ? 'radial-gradient(circle, rgba(255,255,255,0.95) 0%, rgba(255,228,225,0.48) 42%, transparent 100%)'
                : `radial-gradient(circle, rgba(239, 35, 44, ${
                    0.26 +
                    flashlightProximity * 0.36 +
                    (isHoveringBulb ? 0.25 : 0)
                  }) 0%, rgba(185, 16, 24, 0.08) 58%, transparent 100%)`,
              filter: 'blur(12px)',
            }}
          />

          <Vintage3DRedBulbCanvas
            mousePos={mousePos}
            isHovered={isHoveringBulb}
            isIgniting={isIgniting}
          />
        </button>
      </div>
    </div>
  );
};
