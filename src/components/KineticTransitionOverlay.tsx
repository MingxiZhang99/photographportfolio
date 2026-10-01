import React, { useEffect, useRef } from 'react';
import { CUBE_FACES, FaceCategory, FACE_ORDER } from '../data/portfolioData';

export interface WordSlamState {
  word: string;
  category: FaceCategory;
  origin: 'tabletop' | 'center';
  key: number;
}

interface KineticTransitionOverlayProps {
  activeSlam: WordSlamState | null;
}

// 模块级预烘焙高清 3D 立体字离屏画布缓存：
// 将【柔和白背晕 + 3层深炭黑投射阴影 + 22层精钢灰 3D 立体侧壁 + 纯白拉丝顶面】一次性烘焙为 GPU 位图纹理，
// 避免在 scale 放大冲出屏幕过程中每帧重算 25 层矢量 text-shadow 与高斯模糊 filter，实现 60/120 FPS 满帧丝滑放大！
const SLAM_TEXTURE_CACHE = new Map<string, HTMLCanvasElement>();

const LOGICAL_WIDTH = 1120;
const LOGICAL_HEIGHT = 320;

function getOrBakeSlamWordCanvas(word: string): HTMLCanvasElement {
  const existing = SLAM_TEXTURE_CACHE.get(word);
  if (existing) return existing;

  const dpr = Math.min(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1, 2);
  const canvas = document.createElement('canvas');
  canvas.width = LOGICAL_WIDTH * dpr;
  canvas.height = LOGICAL_HEIGHT * dpr;

  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  ctx.save();
  ctx.scale(dpr, dpr);

  const cx = LOGICAL_WIDTH / 2;
  const cy = LOGICAL_HEIGHT / 2 - 14;

  // 1. 底层柔和白色聚光背晕（一次性烘焙至位图，无需运行期 DOM blur(20px)）
  const glowGrad = ctx.createRadialGradient(cx, cy + 10, 10, cx, cy + 10, 420);
  glowGrad.addColorStop(0, 'rgba(255, 255, 255, 0.85)');
  glowGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.34)');
  glowGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = glowGrad;
  ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);

  ctx.font = '900 130px "Arial Black", "Impact", "Syne", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.miterLimit = 2;

  // 2. 紧贴 3D 立体字底部的浓黑舞台/桌面投射阴影（一次性烘焙）
  const stageShadows = [
    { offsetY: 58, blur: 28, alpha: 0.52 },
    { offsetY: 44, blur: 16, alpha: 0.74 },
    { offsetY: 34, blur: 6, alpha: 0.9 },
  ];
  for (const s of stageShadows) {
    ctx.save();
    ctx.shadowColor = `rgba(5, 6, 10, ${s.alpha})`;
    ctx.shadowBlur = s.blur;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = s.offsetY;
    ctx.fillStyle = 'rgba(5, 6, 10, 0.9)';
    ctx.fillText(word, cx, cy);
    ctx.restore();
  }

  // 3. 22 层 90° 垂直精钢灰 3D 立体块侧壁（从底层向上逐层堆叠）
  const totalLayers = 22;
  for (let i = totalLayers; i >= 1; i--) {
    const t = i / totalLayers;
    const lum = i <= 2 ? 228 : Math.round(168 - t * 98);
    const r = Math.max(24, lum - 2);
    const g = Math.max(25, lum);
    const b = Math.min(255, lum + 4);
    const offsetY = i * 1.45;

    ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
    ctx.strokeStyle = `rgb(${r}, ${g}, ${b})`;
    ctx.lineWidth = 2.5;
    ctx.strokeText(word, cx, cy + offsetY);
    ctx.fillText(word, cx, cy + offsetY);
  }

  // 4. 顶层纯白拉丝顶面 + 亮银描边倒角
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = '#E5E7EB';
  ctx.strokeText(word, cx, cy);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(word, cx, cy);

  ctx.restore();

  SLAM_TEXTURE_CACHE.set(word, canvas);
  return canvas;
}

// 浏览器空闲时预热烘焙 HUMAN / ANIMAL / LANDSCAPE 三个全屏冲击立体字纹理，确保首次点击 0ms 瞬发
if (typeof window !== 'undefined') {
  const prewarm = () => {
    FACE_ORDER.forEach((cat) => {
      getOrBakeSlamWordCanvas(CUBE_FACES[cat].label);
    });
  };
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(prewarm);
  } else {
    setTimeout(prewarm, 60);
  }
}

/**
 * 桌面正下方 3D 白色立体字【悬浮放大 + 冲出屏幕】全屏视觉冲击动效层：
 * - 第一阶段魔方转到正面时，对应的 3D 单词同步旋转并平移至魔方正下方（x = 0px, y = 196px, 0deg 水平回正）；
 * - 第二阶段（本组件）直接从魔方正下方的精确像素位置与字号无缝接力起飞，向上悬浮并加速放大冲出屏幕；
 * - 采用预烘焙 GPU 位图纹理 + 纯 transform3d/opacity 硬件加速合成，彻底消除矢量多层阴影重绘卡顿。
 */
export const KineticTransitionOverlay: React.FC<KineticTransitionOverlayProps> = ({
  activeSlam,
}) => {
  const displayCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!activeSlam || !displayCanvasRef.current) return;
    const baked = getOrBakeSlamWordCanvas(activeSlam.word);
    const target = displayCanvasRef.current;
    if (target.width !== baked.width) target.width = baked.width;
    if (target.height !== baked.height) target.height = baked.height;
    const ctx = target.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, target.width, target.height);
      ctx.drawImage(baked, 0, 0);
    }
  }, [activeSlam]);

  if (!activeSlam) return null;

  // 与第一阶段 Tabletop3DWordCanvas 转正后的终点位置（frontBottomWordY - 16px ≈ 196px）精准对齐，实现零跳帧无缝接力
  let startX = '0px';
  let startY = '0px';
  const startRot = '0deg';

  if (activeSlam.origin === 'tabletop') {
    startX = '0px';
    startY = '196px';
  }

  return (
    <div
      key={activeSlam.key}
      className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center overflow-hidden scene-perspective"
    >
      <div
        className="relative flex items-center justify-center preserve-3d animate-tabletop-word-rush"
        style={
          {
            '--start-x': startX,
            '--start-y': startY,
            '--start-rot': startRot,
          } as React.CSSProperties
        }
      >
        <canvas
          ref={displayCanvasRef}
          style={{
            width: LOGICAL_WIDTH,
            height: LOGICAL_HEIGHT,
          }}
          className="block pointer-events-none select-none"
        />
      </div>
    </div>
  );
};

export function createCategorySlam(
  category: FaceCategory,
  origin: 'tabletop' | 'center' = 'tabletop'
): WordSlamState {
  const face = CUBE_FACES[category];
  return {
    word: face.label,
    category,
    origin,
    key: Date.now() + Math.random(),
  };
}
