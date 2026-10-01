import React, { useState, useEffect } from 'react';
import { CUBE_FACES, FaceCategory } from '../data/portfolioData';
import {
  Tabletop3DWordCanvas,
  FlashlightWordShadow,
} from './Tabletop3DWordCanvas';
import {
  AboutMeBalloonCanvas,
  PortfolioBalloonCanvas,
} from './AboutMeBalloonCanvas';
import { TriCameraRig3DCanvas } from './TriCameraRig3DCanvas';

interface RubiksCube3DProps {
  rotation: { x: number; y: number; z: number };
  onRotationChange?: (rot: { x: number; y: number; z: number }) => void;
  onSelectFaceAndTile: (category: FaceCategory, plateIndex: number) => void;
  onOpenAboutMe: () => void;
  turningCategory?: FaceCategory | null;
  rushingCategory?: FaceCategory | null;
  flashlightPos?: { x: number; y: number } | null;
}

export const RubiksCube3D: React.FC<RubiksCube3DProps> = ({
  onSelectFaceAndTile,
  onOpenAboutMe,
  turningCategory = null,
  rushingCategory = null,
  flashlightPos,
}) => {
  // 追踪当前鼠标悬停在哪个 3D 摄像头/镜头上（左边卡片机 CCD 'human' / 右边带闪光灯单反 'animal' / 上面长焦镜头 'landscape'）
  const [hoveredCameraCategory, setHoveredCameraCategory] =
    useState<FaceCategory | null>(null);

  const [cubeSize, setCubeSize] = useState(258);
  const [viewport, setViewport] = useState({
    w: typeof window !== 'undefined' ? window.innerWidth : 1280,
    h: typeof window !== 'undefined' ? window.innerHeight : 800,
  });

  useEffect(() => {
    const updateSize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      setViewport({ w, h });
      const minDim = Math.min(w, h);
      if (minDim < 640) {
        setCubeSize(162);
      } else if (minDim < 920) {
        setCubeSize(214);
      } else {
        setCubeSize(258);
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // 3D 三向相机云台的垂直中心基准偏移
  const cubeCenterOffsetY = Math.round(cubeSize * 0.04);

  /**
   * 判断某个相机的镜头光晕与对应投影单词是否处于激活状态：
   * - 常态下不出现；
   * - 仅当鼠标悬停在该相机/镜头上（hoveredCameraCategory === category），
   *   或用户点击了该相机正在转正/放大（turningCategory / rushingCategory）时才激活！
   */
  const isCategoryCameraActive = (category: FaceCategory): boolean => {
    return (
      hoveredCameraCategory === category ||
      turningCategory === category ||
      rushingCategory === category
    );
  };

  // =========================================================================
  // 三个 3D 摄像头镜头前口的精确屏幕坐标：
  // 1. 左边卡片机 CCD 镜头口 (leftLensOrigin)
  // 2. 右边带闪光灯单反镜头口 (rightLensOrigin)
  // 3. 上面白色长焦大炮镜头口 (topLensOrigin)
  // =========================================================================
  const leftLensOriginX = -Math.round(cubeSize * 0.56);
  const leftLensOriginY = cubeCenterOffsetY + Math.round(cubeSize * 0.11);

  const rightLensOriginX = Math.round(cubeSize * 0.68);
  const rightLensOriginY = cubeCenterOffsetY + Math.round(cubeSize * 0.13);

  const topLensOriginX = -Math.round(cubeSize * 0.08);
  const topLensOriginY = cubeCenterOffsetY - Math.round(cubeSize * 0.86);

  // 页面最上方视觉中心位置：PORTFOLIO（与 ABOUT ME 同款 3D 红色充气气球字体）
  const portfolioWordY = -Math.min(
    Math.round(viewport.h * 0.39),
    Math.round(cubeSize * 1.46)
  );

  // 顶部白色长焦镜头悬停投影的 LANDSCAPE 位置：位于长焦镜头上方、PORTFOLIO 正下方，绝不重合
  const topWallWordY = Math.max(
    portfolioWordY + Math.round(cubeSize * 0.58),
    cubeCenterOffsetY - Math.round(cubeSize * 1.05)
  );

  // 左边卡片机 CCD 与右边单反悬停投影的 HUMAN / ANIMAL 位置
  const leftTableWordX = -Math.round(cubeSize * 0.88);
  const leftTableWordY = cubeCenterOffsetY + Math.round(cubeSize * 0.72);

  const rightTableWordX = Math.round(cubeSize * 0.88);
  const rightTableWordY = cubeCenterOffsetY + Math.round(cubeSize * 0.72);

  // 点击任意一个 3D 相机时，该相机旋转至正对屏幕，对应文字同步旋转平移至【正下方】的目标 Y 坐标
  const frontBottomWordY = cubeCenterOffsetY + Math.round(cubeSize * 0.79);

  // ABOUT ME 放置在三脚架正下方的纯白桌面更靠下的位置
  const aboutMeWordY = Math.min(
    Math.round(viewport.h * 0.45),
    cubeCenterOffsetY + Math.round(cubeSize * 1.48)
  );

  // =========================================================================
  // 黑灯手电筒模式下的实时动态方向阴影与受光计算
  // =========================================================================
  const screenCenterX = viewport.w / 2;
  const screenCenterY = viewport.h / 2;

  const computeFlashlightWordShadow = (
    wordOffsetX: number,
    wordOffsetY: number
  ): FlashlightWordShadow | null => {
    if (!flashlightPos) return null;
    const wordScreenX = screenCenterX + wordOffsetX;
    const wordScreenY = screenCenterY + wordOffsetY;
    const vx = wordScreenX - flashlightPos.x;
    const vy = wordScreenY - flashlightPos.y;
    const dist = Math.hypot(vx, vy);
    const intensity = Math.max(0, Math.min(1, 1 - dist / 260));
    return {
      dx: Math.max(-32, Math.min(32, vx * 0.16)),
      dy: Math.max(-32, Math.min(32, vy * 0.16)),
      intensity,
    };
  };

  const rigFlashlightShadow = (() => {
    if (!flashlightPos) return null;
    const rigScreenX = screenCenterX;
    const rigScreenY = screenCenterY + cubeCenterOffsetY;
    const vx = rigScreenX - flashlightPos.x;
    const vy = rigScreenY - flashlightPos.y;
    const dist = Math.hypot(vx, vy);
    const intensity = Math.max(0, Math.min(1, 1 - dist / 340));
    return {
      dx: Math.max(-48, Math.min(48, vx * 0.22)),
      dy: Math.max(-48, Math.min(48, vy * 0.22)),
      intensity,
    };
  })();

  /**
   * 渲染三个 3D 相机镜头在鼠标悬停/点击转正时：
   * 1) 镜头口首先发出的【光学星芒光晕 (animate-camera-lens-halo)】；
   * 2) 从镜头射出的【锥形体积投影光束 + 桌面/墙面白色聚光晕】；
   * 3) 悬浮在光束中的【全息发光边框预览画框】（参照参考图样式，伴随不规则频闪出现后稳定）。
   */
  const renderCameraBeamsAndLensHalos = () => {
    const svgSize = 1800;
    const svgCenter = svgSize / 2;

    const spotlights: Array<{
      id: FaceCategory;
      lensX: number;
      lensY: number;
      targetX: number;
      targetY: number;
      haloWidth: number;
      haloHeight: number;
      haloRotateDeg: number;
      holoX: number;
      holoY: number;
      holoSkewY: number;
    }> = [
      {
        id: 'human',
        lensX: leftLensOriginX,
        lensY: leftLensOriginY,
        targetX: turningCategory === 'human' ? 0 : leftTableWordX,
        targetY:
          turningCategory === 'human' ? frontBottomWordY : leftTableWordY,
        haloWidth: Math.round(cubeSize * 1.48),
        haloHeight: Math.round(cubeSize * 0.72),
        haloRotateDeg: turningCategory === 'human' ? 0 : 25.2,
        holoX: -Math.round(cubeSize * 1.02),
        holoY: cubeCenterOffsetY + Math.round(cubeSize * 0.14),
        holoSkewY: 14,
      },
      {
        id: 'animal',
        lensX: rightLensOriginX,
        lensY: rightLensOriginY,
        targetX: turningCategory === 'animal' ? 0 : rightTableWordX,
        targetY:
          turningCategory === 'animal' ? frontBottomWordY : rightTableWordY,
        haloWidth: Math.round(cubeSize * 1.48),
        haloHeight: Math.round(cubeSize * 0.72),
        haloRotateDeg: turningCategory === 'animal' ? 0 : -25.2,
        holoX: Math.round(cubeSize * 1.06),
        holoY: cubeCenterOffsetY + Math.round(cubeSize * 0.16),
        holoSkewY: -14,
      },
      {
        id: 'landscape',
        lensX: topLensOriginX,
        lensY: topLensOriginY,
        targetX: 0,
        targetY:
          turningCategory === 'landscape' ? frontBottomWordY : topWallWordY,
        haloWidth: Math.round(cubeSize * 1.92),
        haloHeight: Math.round(cubeSize * 0.66),
        haloRotateDeg: 0,
        holoX: 0,
        holoY: topWallWordY - Math.round(cubeSize * 0.24),
        holoSkewY: 0,
      },
    ];

    const activeSpotlights = spotlights.filter(({ id }) =>
      isCategoryCameraActive(id)
    );

    if (activeSpotlights.length === 0) return null;

    return (
      <div
        className="absolute pointer-events-none flex items-center justify-center z-15"
        style={{
          width: svgSize,
          height: svgSize,
        }}
      >
        {/* 1. 悬停相机时，该相机镜头前口首先亮起的【强烈光学光晕环 (Lens Optical Halo Bloom)】 */}
        {activeSpotlights.map(({ id, lensX, lensY }) => (
          <div
            key={`lens-mouth-halo-${id}`}
            className="absolute pointer-events-none flex items-center justify-center animate-camera-lens-halo"
            style={{
              left: svgCenter + lensX,
              top: svgCenter + lensY,
              width: Math.round(cubeSize * 0.46),
              height: Math.round(cubeSize * 0.46),
              marginLeft: -Math.round(cubeSize * 0.23),
              marginTop: -Math.round(cubeSize * 0.23),
            }}
          >
            <div
              className="w-full h-full rounded-full"
              style={{
                background:
                  'radial-gradient(circle, rgba(255,255,255,1) 0%, rgba(255,250,225,0.88) 28%, rgba(255,244,210,0.42) 56%, rgba(255,255,255,0) 76%)',
                boxShadow: '0 0 42px 14px rgba(255, 252, 235, 0.92)',
              }}
            />
          </div>
        ))}

        {/* 2. 打在桌面与墙面上的明亮纯白/暖白聚光灯【光晕底座】 */}
        {activeSpotlights.map(
          ({ id, targetX, targetY, haloWidth, haloHeight, haloRotateDeg }) => (
            <div
              key={`white-halo-${id}`}
              className={`absolute pointer-events-none flex items-center justify-center ${
                turningCategory === id ? '' : 'animate-projector-beam-flicker'
              }`}
              style={{
                left: svgCenter + targetX,
                top: svgCenter + targetY,
                width: haloWidth,
                height: haloHeight,
                transform: `translate(-50%, -50%) rotate(${haloRotateDeg}deg)`,
                transition:
                  'left 460ms cubic-bezier(0.22, 1, 0.36, 1), top 460ms cubic-bezier(0.22, 1, 0.36, 1), transform 460ms cubic-bezier(0.22, 1, 0.36, 1)',
              }}
            >
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  background:
                    'radial-gradient(ellipse at center, #FFFFFF 0%, rgba(255, 253, 245, 0.95) 44%, rgba(255, 250, 235, 0.62) 70%, rgba(255, 255, 255, 0) 100%)',
                  filter: 'blur(18px)',
                }}
              />
              <div
                className="absolute w-[82%] h-[76%] rounded-full"
                style={{
                  background:
                    'radial-gradient(ellipse at center, #FFFFFF 0%, #FFFFFF 60%, rgba(255, 255, 255, 0) 100%)',
                  boxShadow: '0 0 68px 24px rgba(255, 253, 244, 0.94)',
                  filter: 'blur(8px)',
                }}
              />
            </div>
          )
        )}

        {/* 3. 从三个 3D 摄像头镜头射向对应单词与全息画框的锥形体积光束 */}
        <svg
          width={svgSize}
          height={svgSize}
          viewBox={`0 0 ${svgSize} ${svgSize}`}
          className="absolute inset-0 pointer-events-none overflow-visible"
        >
          <defs>
            {activeSpotlights.map(({ id, lensX, lensY, targetX, targetY }) => (
              <React.Fragment key={`beam-defs-${id}`}>
                <linearGradient
                  id={`table-beam-outer-${id}`}
                  x1={svgCenter + lensX}
                  y1={svgCenter + lensY}
                  x2={svgCenter + targetX + 0.5}
                  y2={svgCenter + targetY}
                  gradientUnits="userSpaceOnUse"
                >
                  <stop offset="0%" stopColor="#FFFDF5" stopOpacity="0.96" />
                  <stop offset="32%" stopColor="#FFFBEB" stopOpacity="0.72" />
                  <stop offset="75%" stopColor="#FFFFFF" stopOpacity="0.46" />
                  <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
                </linearGradient>

                <linearGradient
                  id={`table-beam-core-${id}`}
                  x1={svgCenter + lensX}
                  y1={svgCenter + lensY}
                  x2={svgCenter + targetX + 0.5}
                  y2={svgCenter + targetY}
                  gradientUnits="userSpaceOnUse"
                >
                  <stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
                  <stop offset="48%" stopColor="#FFFDF7" stopOpacity="0.86" />
                  <stop offset="88%" stopColor="#FFFFFF" stopOpacity="0.52" />
                  <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
                </linearGradient>
              </React.Fragment>
            ))}
          </defs>

          {activeSpotlights.map(({ id, lensX, lensY, targetX, targetY }) => {
            const x1 = svgCenter + lensX;
            const y1 = svgCenter + lensY;
            const x2 = svgCenter + targetX;
            const y2 = svgCenter + targetY;

            const dx = x2 - x1;
            const dy = y2 - y1;
            const len = Math.hypot(dx, dy) || 1;
            const nx = -dy / len;
            const ny = dx / len;

            const lensRadius = 11;
            const outerSpread = Math.round(cubeSize * 0.62);
            const coreSpread = Math.round(cubeSize * 0.32);

            const outerPath = [
              `M ${x1 - nx * lensRadius} ${y1 - ny * lensRadius}`,
              `L ${x2 - nx * outerSpread} ${y2 - ny * outerSpread}`,
              `Q ${x2 + (dx / len) * 55} ${y2 + (dy / len) * 55} ${
                x2 + nx * outerSpread
              } ${y2 + ny * outerSpread}`,
              `L ${x1 + nx * lensRadius} ${y1 + ny * lensRadius}`,
              'Z',
            ].join(' ');

            const corePath = [
              `M ${x1 - nx * (lensRadius * 0.55)} ${
                y1 - ny * (lensRadius * 0.55)
              }`,
              `L ${x2 - nx * coreSpread} ${y2 - ny * coreSpread}`,
              `Q ${x2 + (dx / len) * 35} ${y2 + (dy / len) * 35} ${
                x2 + nx * coreSpread
              } ${y2 + ny * coreSpread}`,
              `L ${x1 + nx * (lensRadius * 0.55)} ${
                y1 + ny * (lensRadius * 0.55)
              }`,
              'Z',
            ].join(' ');

            return (
              <g
                key={`spotlight-cone-${id}`}
                className={
                  turningCategory === id ? '' : 'animate-projector-beam-flicker'
                }
              >
                <path
                  d={outerPath}
                  fill={`url(#table-beam-outer-${id})`}
                  style={{ filter: 'blur(15px)' }}
                />
                <path
                  d={corePath}
                  fill={`url(#table-beam-core-${id})`}
                  style={{ filter: 'blur(8px)' }}
                />
              </g>
            );
          })}
        </svg>

        {/* 4. 参照参考图：悬停时从镜头投射在半空中的【发光全息梦核预览画框】（随频闪出现后稳定） */}
        {!turningCategory &&
          activeSpotlights.map(({ id, holoX, holoY, holoSkewY }) => {
            const face = CUBE_FACES[id];
            const previewPlate = face.plates[0];
            const frameW =
              id === 'landscape'
                ? Math.round(cubeSize * 0.54)
                : Math.round(cubeSize * 0.44);
            const frameH =
              id === 'landscape'
                ? Math.round(cubeSize * 0.36)
                : Math.round(cubeSize * 0.52);

            return (
              <div
                key={`holo-preview-${id}`}
                className="absolute pointer-events-none animate-projector-word-flicker"
                style={{
                  left: svgCenter + holoX,
                  top: svgCenter + holoY,
                  width: frameW,
                  height: frameH,
                  marginLeft: -frameW / 2,
                  marginTop: -frameH / 2,
                  transform: `skewY(${holoSkewY}deg)`,
                  border: '2px solid #FFFBEB',
                  boxShadow:
                    '0 0 22px rgba(255, 250, 225, 0.92), inset 0 0 16px rgba(255, 250, 225, 0.55)',
                  backgroundColor: 'rgba(255, 255, 255, 0.18)',
                }}
              >
                <img
                  src={previewPlate.src}
                  alt={face.label}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover opacity-80"
                  style={{
                    filter: `${previewPlate.cssFilter} brightness(1.06)`,
                  }}
                />
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background:
                      'linear-gradient(135deg, rgba(255,253,240,0.28) 0%, transparent 60%, rgba(255,248,220,0.22) 100%)',
                  }}
                />
              </div>
            );
          })}
      </div>
    );
  };

  // 判断三个单词各自是否应当显示
  const showHumanWord =
    isCategoryCameraActive('human') &&
    (!turningCategory || turningCategory === 'human') &&
    (!rushingCategory || rushingCategory === 'human');

  const showAnimalWord =
    isCategoryCameraActive('animal') &&
    (!turningCategory || turningCategory === 'animal') &&
    (!rushingCategory || rushingCategory === 'animal');

  const showLandscapeWord =
    isCategoryCameraActive('landscape') &&
    (!turningCategory || turningCategory === 'landscape') &&
    (!rushingCategory || rushingCategory === 'landscape');

  return (
    <div className="relative w-full h-full flex items-center justify-center scene-perspective bg-[#E6E9F0] overflow-hidden">
      {/* ====================================================================
          1. 背后的【3D 墙角结构 + 悬空分离深槽空隙 + 下沉式独立纯白桌面】
         ==================================================================== */}
      <svg
        viewBox="0 0 1000 1000"
        preserveAspectRatio="none"
        className="absolute inset-0 w-full h-full pointer-events-none"
      >
        <defs>
          <linearGradient id="left-wall-grad" x1="0%" y1="20%" x2="100%" y2="85%">
            <stop offset="0%" stopColor="#F2F4F8" />
            <stop offset="68%" stopColor="#E5E8F1" />
            <stop offset="100%" stopColor="#D5D9E5" />
          </linearGradient>

          <linearGradient id="right-wall-grad" x1="0%" y1="85%" x2="100%" y2="20%">
            <stop offset="0%" stopColor="#CAD0DE" />
            <stop offset="32%" stopColor="#DCE0EC" />
            <stop offset="100%" stopColor="#EEF0F6" />
          </linearGradient>

          <linearGradient id="corner-ao-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#C4C9D6" stopOpacity="0" />
            <stop offset="48%" stopColor="#B8BECD" stopOpacity="0.48" />
            <stop offset="52%" stopColor="#ADB4C4" stopOpacity="0.64" />
            <stop offset="100%" stopColor="#C4C9D6" stopOpacity="0" />
          </linearGradient>

          <linearGradient id="gap-void-left" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#181A22" stopOpacity="0.55" />
            <stop offset="35%" stopColor="#090A0F" stopOpacity="0.92" />
            <stop offset="100%" stopColor="#030406" stopOpacity="1" />
          </linearGradient>
          <linearGradient id="gap-void-right" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#14161E" stopOpacity="0.62" />
            <stop offset="35%" stopColor="#07080C" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#020305" stopOpacity="1" />
          </linearGradient>
        </defs>

        <polygon
          points="0,0 500,0 500,566 0,696"
          fill="url(#left-wall-grad)"
        />
        <polygon
          points="500,0 1000,0 1000,696 500,566"
          fill="url(#right-wall-grad)"
        />
        <rect
          x="476"
          y="0"
          width="48"
          height="566"
          fill="url(#corner-ao-grad)"
        />
        <line
          x1="500"
          y1="0"
          x2="500"
          y2="566"
          stroke="#B8BFCE"
          strokeWidth="1.3"
        />

        <polyline
          points="0,692 500,562 1000,692"
          fill="none"
          stroke="rgba(4, 5, 8, 0.72)"
          strokeWidth="14"
          style={{ filter: 'blur(5px)' }}
        />
        <polygon
          points="0,686 500,556 500,567 0,697"
          fill="url(#gap-void-left)"
        />
        <polygon
          points="500,556 1000,686 1000,697 500,567"
          fill="url(#gap-void-right)"
        />
        <polyline
          points="0,695 500,565 1000,695"
          fill="none"
          stroke="#020305"
          strokeWidth="4.5"
          style={{ filter: 'blur(1px)' }}
        />

        <polygon
          points="0,696 500,566 1000,696 1000,1000 0,1000"
          fill="#FFFFFF"
        />
        <polyline
          points="0,696 500,566 1000,696"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="2"
        />
      </svg>

      {/* ====================================================================
          2. 三个摄像头在悬停/转正时射出的【镜头光晕 + 白色体积光束 + 全息预览框】
         ==================================================================== */}
      {!rushingCategory && renderCameraBeamsAndLensHalos()}

      {/* ====================================================================
          3. 三脚架底座放置在桌面上的深邃【接触阴影】 + 手电筒照射时的实时动态偏移阴影
         ==================================================================== */}
      <div
        className="absolute pointer-events-none"
        style={{
          width: cubeSize * 1.15,
          height: cubeSize * 0.34,
          transform: `translate(${
            rigFlashlightShadow ? rigFlashlightShadow.dx * 0.55 : 0
          }px, ${
            cubeCenterOffsetY +
            cubeSize * 0.65 +
            (rigFlashlightShadow ? rigFlashlightShadow.dy * 0.45 : 0)
          }px)`,
          background:
            'radial-gradient(ellipse at center, rgba(6, 7, 10, 0.88) 0%, rgba(10, 12, 16, 0.52) 48%, transparent 78%)',
          filter: 'blur(6px)',
        }}
      />
      <div
        className="absolute pointer-events-none rounded-full"
        style={{
          width: cubeSize * 1.68,
          height: cubeSize * 0.46,
          transform: `translate(${
            rigFlashlightShadow ? rigFlashlightShadow.dx * 1.05 : 0
          }px, ${
            cubeCenterOffsetY +
            cubeSize * 0.68 +
            (rigFlashlightShadow ? rigFlashlightShadow.dy * 0.85 : 0)
          }px)`,
          background:
            'radial-gradient(ellipse at center, rgba(8, 10, 14, 0.48) 0%, rgba(14, 16, 22, 0.22) 55%, transparent 82%)',
          filter: 'blur(14px)',
        }}
      />

      {/* ====================================================================
          4. 核心 3D 模型：三向相机光学云台 (TriCameraRig3DCanvas)
             - 左边：复古银色卡片机 CCD ('human')
             - 右边：带外置闪光灯的复古单反 ('animal')
             - 上面：白色长焦大炮镜头 ('landscape')
             - 底部：三脚架与弯曲电缆
         ==================================================================== */}
      <div
        className="relative z-10 flex items-center justify-center"
        style={{
          transform: `translateY(${cubeCenterOffsetY}px)`,
        }}
      >
        <TriCameraRig3DCanvas
          cubeSize={cubeSize}
          hoveredCategory={hoveredCameraCategory}
          turningCategory={turningCategory}
          rushingCategory={rushingCategory}
          onHoverCamera={setHoveredCameraCategory}
          onClickCamera={(cat) => onSelectFaceAndTile(cat, 0)}
        />
      </div>

      {/* ====================================================================
          5. 页面最上方 PORTFOLIO 充气气球字 + 摄像头投影单词层 + 底部 ABOUT ME 充气气球字
         ==================================================================== */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-20">
        {/* 页面最上方视觉中心：PORTFOLIO（与 ABOUT ME 100% 同款 3D 红色充气气球膨胀字体，与下方 LANDSCAPE 完全错开不重合） */}
        <div
          className="absolute flex items-center justify-center pointer-events-none transition-opacity duration-300"
          style={{
            transform: `translate3d(0px, ${portfolioWordY}px, 0px)`,
            opacity: turningCategory || rushingCategory ? 0 : 1,
          }}
        >
          <PortfolioBalloonCanvas
            cubeSize={cubeSize}
            flashlightShadow={computeFlashlightWordShadow(0, portfolioWordY)}
          />
        </div>

        {/* 左边卡片机 CCD 悬停投影：HUMAN（点击时从左前斜置 25.2° 旋转平移至模型正下方 0° 水平位置） */}
        <div
          className="absolute flex items-center justify-center pointer-events-none"
          style={{
            willChange: 'transform',
            transform:
              turningCategory === 'human' || rushingCategory === 'human'
                ? `translate3d(0px, ${frontBottomWordY}px, 0px) rotate(-25.2deg)`
                : `translate3d(${leftTableWordX}px, ${leftTableWordY}px, 0px) rotate(0deg)`,
            transition: 'transform 460ms cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        >
          <div
            className={
              !showHumanWord
                ? 'opacity-0 invisible'
                : turningCategory === 'human' || rushingCategory === 'human'
                ? 'opacity-100 visible'
                : 'visible animate-projector-word-flicker'
            }
          >
            <Tabletop3DWordCanvas
              category="human"
              word="HUMAN"
              variant="left-table"
              cubeSize={cubeSize}
              flashlightShadow={computeFlashlightWordShadow(
                turningCategory === 'human' ? 0 : leftTableWordX,
                turningCategory === 'human'
                  ? frontBottomWordY
                  : leftTableWordY
              )}
              isTurningToFront={turningCategory === 'human'}
              isRushingOut={rushingCategory === 'human'}
            />
          </div>
        </div>

        {/* 右边带闪光灯单反悬停投影：ANIMAL（点击时从右前斜置 -25.2° 旋转平移至模型正下方 0° 水平位置） */}
        <div
          className="absolute flex items-center justify-center pointer-events-none"
          style={{
            willChange: 'transform',
            transform:
              turningCategory === 'animal' || rushingCategory === 'animal'
                ? `translate3d(0px, ${frontBottomWordY}px, 0px) rotate(25.2deg)`
                : `translate3d(${rightTableWordX}px, ${rightTableWordY}px, 0px) rotate(0deg)`,
            transition: 'transform 460ms cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        >
          <div
            className={
              !showAnimalWord
                ? 'opacity-0 invisible'
                : turningCategory === 'animal' || rushingCategory === 'animal'
                ? 'opacity-100 visible'
                : 'visible animate-projector-word-flicker'
            }
          >
            <Tabletop3DWordCanvas
              category="animal"
              word="ANIMAL"
              variant="right-table"
              cubeSize={cubeSize}
              flashlightShadow={computeFlashlightWordShadow(
                turningCategory === 'animal' ? 0 : rightTableWordX,
                turningCategory === 'animal'
                  ? frontBottomWordY
                  : rightTableWordY
              )}
              isTurningToFront={turningCategory === 'animal'}
              isRushingOut={rushingCategory === 'animal'}
            />
          </div>
        </div>

        {/* 顶部白色长焦镜头悬停投影：LANDSCAPE（位于长焦镜头上方、PORTFOLIO 下方；点击时随长焦镜头转正同步移动到正下方） */}
        <div
          className="absolute flex items-center justify-center pointer-events-none"
          style={{
            willChange: 'transform',
            transform:
              turningCategory === 'landscape' || rushingCategory === 'landscape'
                ? `translate3d(0px, ${frontBottomWordY}px, 0px) rotate(0deg)`
                : `translate3d(0px, ${topWallWordY}px, 0px) rotate(0deg)`,
            transition: 'transform 460ms cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        >
          <div
            className={
              !showLandscapeWord
                ? 'opacity-0 invisible'
                : turningCategory === 'landscape' ||
                  rushingCategory === 'landscape'
                ? 'opacity-100 visible'
                : 'visible animate-projector-word-flicker'
            }
          >
            <Tabletop3DWordCanvas
              category="landscape"
              word="LANDSCAPE"
              variant="top-wall"
              cubeSize={cubeSize}
              flashlightShadow={computeFlashlightWordShadow(
                0,
                turningCategory === 'landscape'
                  ? frontBottomWordY
                  : topWallWordY
              )}
              isTurningToFront={turningCategory === 'landscape'}
              isRushingOut={rushingCategory === 'landscape'}
            />
          </div>
        </div>

        {/* 正下方纯白桌面上的：ABOUT ME（3D 红色充气亮面气球立体字 + 悬停原地膨胀扩大特效） */}
        <div
          className="absolute flex items-center justify-center pointer-events-none transition-opacity duration-300"
          style={{
            transform: `translate3d(0px, ${aboutMeWordY}px, 0px)`,
            opacity: turningCategory || rushingCategory ? 0 : 1,
          }}
        >
          <AboutMeBalloonCanvas
            cubeSize={cubeSize}
            onClick={onOpenAboutMe}
            flashlightShadow={computeFlashlightWordShadow(0, aboutMeWordY)}
          />
        </div>
      </div>
    </div>
  );
};
