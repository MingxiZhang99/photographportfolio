import React, { useEffect, useRef } from 'react';
import { FaceCategory } from '../data/portfolioData';

export interface FlashlightWordShadow {
  dx: number;
  dy: number;
  intensity: number;
}

interface Tabletop3DWordCanvasProps {
  category: FaceCategory;
  word: string;
  variant: 'left-table' | 'right-table' | 'top-wall';
  cubeSize: number;
  flashlightShadow?: FlashlightWordShadow | null;
  isTurningToFront?: boolean;
  isRushingOut?: boolean;
}

interface CachedWordBitmaps {
  width: number;
  height: number;
  shadowData: ImageData;
  blockData: ImageData;
}

// 模块级内存位图缓存：确保每个 3D 单词在同尺寸下只执行一次像素级生成，后续悬停/点击 0ms 零延迟复用
const WORD_BITMAP_CACHE = new Map<string, CachedWordBitmaps>();

/**
 * 魔方中心摄像头投射出的【真 3D 白色实体立体字】：
 * - 平时隐藏，仅当鼠标悬停在魔方面中心摄像头（或点击面转正）时显现；
 * - 点击面时，随魔方转正同步旋转回正并滑行至魔方正下方，随后无缝交接给全屏放大冲击层；
 * - 使用模块级 ImageData 缓存与纯 GPU 合成层（transform3d + opacity），彻底消除主线程重复计算与掉帧。
 */
export const Tabletop3DWordCanvas: React.FC<Tabletop3DWordCanvasProps> = ({
  word,
  variant,
  cubeSize,
  flashlightShadow = null,
  isTurningToFront = false,
  isRushingOut = false,
}) => {
  const shadowCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const blockCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const scaleFactor = cubeSize / 248;

  const baseWidth =
    variant === 'top-wall'
      ? Math.round(430 * scaleFactor)
      : Math.round(295 * scaleFactor);
  const baseHeight =
    variant === 'top-wall'
      ? Math.round(148 * scaleFactor)
      : Math.round(152 * scaleFactor);

  const displayWidth = Math.max(200, baseWidth);
  const displayHeight = Math.max(105, baseHeight);

  useEffect(() => {
    let isCancelled = false;

    const render3DBlockWord = () => {
      if (isCancelled) return;
      const shadowCanvas = shadowCanvasRef.current;
      const blockCanvas = blockCanvasRef.current;
      if (!shadowCanvas || !blockCanvas) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.round(displayWidth * dpr);
      const height = Math.round(displayHeight * dpr);
      const cacheKey = `${word}-${variant}-${width}x${height}-${dpr}`;

      const shadowCtx = shadowCanvas.getContext('2d');
      const blockCtx = blockCanvas.getContext('2d');
      if (!shadowCtx || !blockCtx) return;

      // 命中缓存时直接写入 GPU 画布，跳过所有像素级循环
      const cached = WORD_BITMAP_CACHE.get(cacheKey);
      if (cached) {
        if (shadowCanvas.width !== cached.width) shadowCanvas.width = cached.width;
        if (shadowCanvas.height !== cached.height) shadowCanvas.height = cached.height;
        if (blockCanvas.width !== cached.width) blockCanvas.width = cached.width;
        if (blockCanvas.height !== cached.height) blockCanvas.height = cached.height;
        shadowCtx.putImageData(cached.shadowData, 0, 0);
        blockCtx.putImageData(cached.blockData, 0, 0);
        return;
      }

      shadowCanvas.width = width;
      shadowCanvas.height = height;
      blockCanvas.width = width;
      blockCanvas.height = height;

      shadowCtx.clearRect(0, 0, width, height);
      blockCtx.clearRect(0, 0, width, height);

      // 1. 离屏掩模画布：绘制经过三维桌面/墙面透视矩阵变换的粗体字母顶面
      const maskCanvas = document.createElement('canvas');
      maskCanvas.width = width;
      maskCanvas.height = height;
      const maskCtx = maskCanvas.getContext('2d');
      if (!maskCtx) return;

      maskCtx.save();
      maskCtx.translate(width / 2, height / 2 - 5 * dpr * scaleFactor);

      if (variant === 'left-table') {
        maskCtx.rotate((25.2 * Math.PI) / 180);
        maskCtx.transform(1, 0, -0.32, 0.8, 0, 0);
      } else if (variant === 'right-table') {
        maskCtx.rotate((-25.2 * Math.PI) / 180);
        maskCtx.transform(1, 0, 0.32, 0.8, 0, 0);
      } else {
        maskCtx.transform(1, 0, 0, 0.88, 0, 0);
      }

      const fontSize =
        variant === 'top-wall'
          ? Math.round(50 * dpr * scaleFactor)
          : Math.round(54 * dpr * scaleFactor);

      maskCtx.font = `900 ${fontSize}px "Arial Black", "Impact", "Syne", sans-serif`;
      maskCtx.textAlign = 'center';
      maskCtx.textBaseline = 'middle';
      maskCtx.lineJoin = 'round';
      maskCtx.miterLimit = 2;

      maskCtx.lineWidth = Math.max(2, 2.6 * dpr * scaleFactor);
      maskCtx.strokeStyle = '#FFFFFF';
      maskCtx.strokeText(word, 0, 0);

      maskCtx.fillStyle = '#FFFFFF';
      maskCtx.fillText(word, 0, 0);
      maskCtx.restore();

      const maskData = maskCtx.getImageData(0, 0, width, height).data;

      // 2. 在底层 shadowCanvas 上绘制纯黑多层桌面投射阴影
      const shadowBaseOffsetX =
        variant === 'left-table'
          ? -6.5 * dpr * scaleFactor
          : variant === 'right-table'
          ? 6.5 * dpr * scaleFactor
          : 0;
      const shadowBaseOffsetY = 17.5 * dpr * scaleFactor;

      shadowCtx.save();
      shadowCtx.filter = `blur(${Math.max(4, Math.round(6.5 * dpr))}px)`;
      shadowCtx.globalAlpha = 0.52;
      shadowCtx.drawImage(
        maskCanvas,
        shadowBaseOffsetX * 1.28,
        shadowBaseOffsetY * 1.24
      );
      shadowCtx.restore();

      shadowCtx.save();
      shadowCtx.filter = `blur(${Math.max(2, Math.round(3 * dpr))}px)`;
      shadowCtx.globalAlpha = 0.72;
      shadowCtx.drawImage(
        maskCanvas,
        shadowBaseOffsetX * 0.92,
        shadowBaseOffsetY * 0.95
      );
      shadowCtx.restore();

      const shadowImg = shadowCtx.getImageData(0, 0, width, height);
      const sData = shadowImg.data;
      for (let i = 0; i < sData.length; i += 4) {
        if (sData[i + 3] > 0) {
          sData[i] = 6;
          sData[i + 1] = 8;
          sData[i + 2] = 12;
        }
      }
      shadowCtx.putImageData(shadowImg, 0, 0);

      // 3. 在顶层 blockCanvas 上逐层构建 3D 实体灰银侧壁 + 纯白顶盖
      const blockImageData = blockCtx.createImageData(width, height);
      const out = blockImageData.data;

      const extrudeDepth = Math.max(12, Math.round(16 * dpr * scaleFactor));
      const dirX =
        variant === 'left-table'
          ? -0.24
          : variant === 'right-table'
          ? 0.24
          : 0.0;
      const dirY = 1.0;

      for (let layer = extrudeDepth; layer >= 1; layer--) {
        const ox = Math.round(layer * dirX);
        const oy = Math.round(layer * dirY);
        const depthRatio = layer / extrudeDepth;

        const baseSideLum = Math.round(198 - depthRatio * 96);

        for (let y = 0; y < height; y++) {
          const srcY = y - oy;
          if (srcY < 0 || srcY >= height) continue;
          const rowOffset = y * width;
          const srcRowOffset = srcY * width;

          for (let x = 0; x < width; x++) {
            const srcX = x - ox;
            if (srcX < 0 || srcX >= width) continue;

            const mAlpha = maskData[(srcRowOffset + srcX) * 4 + 3];
            if (mAlpha > 24) {
              const idx = (rowOffset + x) * 4;

              const prevX = Math.max(0, srcX - 1);
              const nextX = Math.min(width - 1, srcX + 1);
              const nAlphaL = maskData[(srcRowOffset + prevX) * 4 + 3];
              const nAlphaR = maskData[(srcRowOffset + nextX) * 4 + 3];
              const horizGrad = (nAlphaR - nAlphaL) / 255;

              const sideShade = Math.round(horizGrad * 18);
              const bandHighlight = layer <= 2 ? 22 : 0;

              const lum = Math.max(
                68,
                Math.min(242, baseSideLum + sideShade + bandHighlight)
              );

              out[idx] = Math.max(60, lum - 2);
              out[idx + 1] = lum;
              out[idx + 2] = Math.min(255, lum + 4);
              out[idx + 3] = 255;
            }
          }
        }
      }

      // 4. 覆盖顶层 3D 字母正表面（纯白顶面 + 边缘倒角）
      for (let y = 0; y < height; y++) {
        const vRatio = y / height;
        const rowOffset = y * width;

        for (let x = 0; x < width; x++) {
          const i = rowOffset + x;
          const idx = i * 4;
          const alpha = maskData[idx + 3];
          if (alpha === 0) continue;

          const topA = y > 0 ? maskData[(i - width) * 4 + 3] : 0;
          const botA = y < height - 1 ? maskData[(i + width) * 4 + 3] : 0;
          const leftA = x > 0 ? maskData[(i - 1) * 4 + 3] : 0;
          const rightA = x < width - 1 ? maskData[(i + 1) * 4 + 3] : 0;

          const isTopLeftBevel = topA < 190 || leftA < 190;
          const isBottomRightBevel = botA < 190 || rightA < 190;

          let topLum = Math.round(255 - vRatio * 7);
          if (isTopLeftBevel) {
            topLum = 255;
          } else if (isBottomRightBevel) {
            topLum = 228;
          }

          const edgeAlpha = Math.min(255, alpha * 1.15);
          if (out[idx + 3] === 0) {
            out[idx] = topLum - 1;
            out[idx + 1] = topLum;
            out[idx + 2] = Math.min(255, topLum + 2);
            out[idx + 3] = Math.round(edgeAlpha);
          } else {
            const blend = edgeAlpha / 255;
            out[idx] = Math.round(
              (topLum - 1) * blend + out[idx] * (1 - blend)
            );
            out[idx + 1] = Math.round(
              topLum * blend + out[idx + 1] * (1 - blend)
            );
            out[idx + 2] = Math.round(
              Math.min(255, topLum + 2) * blend + out[idx + 2] * (1 - blend)
            );
            out[idx + 3] = 255;
          }
        }
      }

      blockCtx.putImageData(blockImageData, 0, 0);

      WORD_BITMAP_CACHE.set(cacheKey, {
        width,
        height,
        shadowData: shadowImg,
        blockData: blockImageData,
      });
    };

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(render3DBlockWord);
    } else {
      render3DBlockWord();
    }

    return () => {
      isCancelled = true;
    };
  }, [word, variant, cubeSize, displayWidth, displayHeight, scaleFactor]);

  // 手电筒照射下的实时动态阴影偏移与暖黄受光高光
  const flDx = flashlightShadow ? flashlightShadow.dx : 0;
  const flDy = flashlightShadow ? flashlightShadow.dy : 0;
  const flIntensity = flashlightShadow ? flashlightShadow.intensity : 0;

  const shadowTransform = isRushingOut
    ? `translate3d(${flDx * 0.7}px, ${14 + flDy * 0.7}px, 0px) scale(1.12)`
    : isTurningToFront
    ? `translate3d(${flDx * 0.7}px, ${10 + flDy * 0.7}px, 0px) scale(1.06)`
    : `translate3d(${flDx * 0.65}px, ${flDy * 0.65}px, 0px) scale(${
        1 + flIntensity * 0.04
      })`;

  const blockTransform = isRushingOut
    ? 'translate3d(0px, -48px, 0px) scale(1.2)'
    : isTurningToFront
    ? 'translate3d(0px, -16px, 0px) scale(1.08)'
    : 'translate3d(0px, 0px, 0px) scale(1)';

  // 仅在黑灯手电筒照亮时才启用动态 drop-shadow；转正阶段直接使用底层独立 shadowCanvas 图层，避免触发重度 CPU/GPU 滤镜重绘
  const blockFilter = (() => {
    if (flIntensity <= 0.02) return 'none';
    const sX = Math.round(flDx * 0.95);
    const sY = Math.round(flDy * 0.95);
    const sBlur = Math.round(4 + (1 - flIntensity) * 6);
    const rimX = Math.round(-flDx * 0.18);
    const rimY = Math.round(-flDy * 0.18);
    return `drop-shadow(${sX}px ${sY}px ${sBlur}px rgba(2, 3, 6, ${(
      0.86 * flIntensity
    ).toFixed(2)})) drop-shadow(${rimX}px ${rimY}px 4px rgba(255, 243, 162, ${(
      0.72 * flIntensity
    ).toFixed(2)}))`;
  })();

  return (
    <div
      className="relative flex items-center justify-center pointer-events-none select-none"
      style={{
        width: displayWidth,
        height: displayHeight,
      }}
    >
      {/* 底层：留在桌面上的黑色投射阴影（独立 GPU 图层） */}
      <canvas
        ref={shadowCanvasRef}
        style={{
          width: displayWidth,
          height: displayHeight,
          transform: shadowTransform,
          opacity: isRushingOut ? 0 : isTurningToFront ? 0.58 : 1,
          willChange: 'transform, opacity',
          transition: isRushingOut
            ? 'none'
            : 'transform 440ms cubic-bezier(0.22, 1, 0.36, 1), opacity 280ms ease',
        }}
        className="absolute inset-0 z-10 block pointer-events-none select-none"
      />

      {/* 顶层：3D 实体立体块文字（独立 GPU 图层，进入阶段二时 0ms 瞬时无缝交接给全屏冲击层） */}
      <canvas
        ref={blockCanvasRef}
        style={{
          width: displayWidth,
          height: displayHeight,
          transform: blockTransform,
          opacity: isRushingOut ? 0 : 1,
          filter: blockFilter,
          willChange: 'transform, opacity',
          transition: isRushingOut
            ? 'none'
            : 'transform 440ms cubic-bezier(0.22, 1, 0.36, 1), opacity 160ms ease',
        }}
        className="relative z-20 block pointer-events-none select-none"
      />
    </div>
  );
};
