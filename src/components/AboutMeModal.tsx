import React, { useEffect, useState, useRef } from 'react';
import { X, Camera } from 'lucide-react';
import defaultDreamcorePortrait from '../assets/images/dreamcore_human_1_1790632743309.jpg';

interface AboutMeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// 默认示例摄影师肖像照（柔和梦核光影视觉艺术家肖像，支持点击替换为您自己的照片）
const DEFAULT_PORTRAIT_URL = defaultDreamcorePortrait;

/**
 * 构建无背景悬浮 3D 立体字块的多层深黑实体侧壁与空间投射阴影：
 * - 确保在彻底去掉背景卡片框后，无论文字后方是深色 3D 魔方还是纯白桌面/墙面，
 *   纯白 (#FFFFFF) 与青绿 (#2DD4BF) 文字都具备强烈的 3D 建筑厚度感与 100% 清晰辨识度。
 */
function build3DWallTextShadow(
  extrudeColor: string,
  dirX: number,
  dirY: number,
  layers: number = 8
): string {
  const shadows: string[] = [];
  for (let i = 1; i <= layers; i++) {
    shadows.push(
      `${(dirX * i).toFixed(1)}px ${(dirY * i).toFixed(1)}px 0px ${extrudeColor}`
    );
  }
  shadows.push(
    `${(dirX * (layers + 3)).toFixed(1)}px ${(dirY * (layers + 4)).toFixed(
      1
    )}px 14px rgba(0, 0, 0, 0.72)`,
    '0px 4px 22px rgba(0, 0, 0, 0.55)'
  );
  return shadows.join(', ');
}

/**
 * 点击桌面 ABOUT ME 后直接悬浮于 3D 魔方前方的【无背景框 · 77.jpg 折角立体文字墙 + 中央个人肖像嵌入装置】：
 * - 完全去除背景卡片框与毛玻璃底板，100% 透明镂空，透过文字墙缝隙可直接看到后方的 3D 魔方与白棚空间；
 * - 采用【艺术感多批次渐进浮现动效】：不同区域的关键词与字符按 6 个艺术批次、不同时间交错破雾对焦浮现，呈现一个个、一批批从三维空间中生长凝聚的雕塑感。
 */
export const AboutMeModal: React.FC<AboutMeModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [mouseTilt, setMouseTilt] = useState({ x: 0, y: 0 });
  const [portraitSrc, setPortraitSrc] = useState<string>(DEFAULT_PORTRAIT_URL);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // 中脊宽度与 30° 等轴测垂直落差（确保左翼 /、中央肖像与中脊 \、右翼 / 严丝合缝）
  const centerWidth = 256;
  const tan30 = Math.tan((30 * Math.PI) / 180); // 0.57735
  const rightWingDropY = Math.round(centerWidth * tan30); // ~148px

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const nx = (e.clientX / window.innerWidth - 0.5) * 2;
    const ny = (e.clientY / window.innerHeight - 0.5) * 2;
    setMouseTilt({
      x: Math.round(ny * -6 * 10) / 10,
      y: Math.round(nx * 8 * 10) / 10,
    });
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPortraitSrc(url);
  };

  const leftWhiteShadow = build3DWallTextShadow('#080A0F', -1.1, 1.4, 8);
  const leftTealShadow = build3DWallTextShadow('#062825', -1.1, 1.4, 8);
  const centerGreyShadow = build3DWallTextShadow('#07090E', 1.0, 1.5, 8);
  const centerTealShadow = build3DWallTextShadow('#052220', 1.0, 1.5, 8);
  const rightWhiteShadow = build3DWallTextShadow('#080A0F', 1.2, 1.4, 8);
  const rightTealShadow = build3DWallTextShadow('#062825', 1.2, 1.4, 8);
  const roofShadow = build3DWallTextShadow('#080A0F', -0.9, 1.5, 7);
  const floorShadow = build3DWallTextShadow('#07090E', -0.6, 1.1, 4);

  return (
    <div
      onClick={onClose}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setMouseTilt({ x: 0, y: 0 })}
      className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden select-none scene-perspective"
      style={{
        // 完全去掉背景卡片框，仅保留全屏完全透明交互层，直接看到后方的 3D 魔方
        backgroundColor: 'transparent',
      }}
    >
      {/* 右上角悬浮关闭按钮（无背景框，点击它或点击文字墙外部空白处均可返回魔方） */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        aria-label="Close About Me wall"
        className="fixed top-7 right-7 z-50 flex items-center justify-center w-11 h-11 rounded-full bg-[#090B10]/90 hover:bg-[#161922] border border-white/30 hover:border-[#2DD4BF] text-white hover:text-[#2DD4BF] transition-all duration-200 cursor-pointer wall-emerge-roof"
        style={{
          animationDelay: '120ms',
          boxShadow: '0 10px 28px rgba(0, 0, 0, 0.45)',
        }}
      >
        <X className="w-5 h-5" />
      </button>

      {/* 隐藏的本地照片上传 Input（允许用户随时将中央示例照片替换为自己的照片） */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handlePhotoUpload}
        className="hidden"
      />

      {/* ====================================================================
          核心：无任何背景框、直接悬浮在魔方前方的【77.jpg 3D 折角立体文字墙 + 正中央个人照片】
          每个关键词分批、错峰渐进浮现（第 1 批核心肖像与天际线 -> 第 2 批顶层折角巨字 -> 第 3 批青绿灵魂词 -> 第 4 批四大摄影母题 -> 第 5 批底座立体字 -> 第 6 批地面宣言逐行浮现）
         ==================================================================== */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative preserve-3d transition-transform duration-200 ease-out"
        style={{
          transform: `rotateX(${mouseTilt.x}deg) rotateY(${mouseTilt.y}deg)`,
        }}
      >
        <div className="relative scale-[0.60] sm:scale-[0.80] md:scale-[0.94] lg:scale-[1.04] origin-center preserve-3d">
          {/* 锚点原点 (0,0) 为左翼 (/) 与中脊 (\) 交汇的顶部垂直折角顶点 */}
          <div
            className="relative preserve-3d"
            style={{
              width: centerWidth,
              height: 360,
              transform: 'translate(-10px, -24px)',
            }}
          >
            {/* --------------------------------------------------------------
                平面 0：顶部等轴测屋顶平铺立体字（第 1 批渐进浮现：110ms -> 210ms）
               -------------------------------------------------------------- */}
            <div
              className="absolute left-0 top-0 pointer-events-none select-none"
              style={{
                transformOrigin: 'left bottom',
                transform:
                  'translate(4px, -6px) rotate(30deg) skewX(-30deg) scaleY(0.866)',
              }}
            >
              <div
                className="font-sans font-black uppercase text-[#FFFFFF] tracking-[-0.02em] leading-[0.82]"
                style={{
                  fontSize: '56px',
                  WebkitTextStroke: '1.5px #07090E',
                  textShadow: roofShadow,
                }}
              >
                <div
                  className="wall-emerge-roof"
                  style={{ animationDelay: '110ms' }}
                >
                  VISUAL
                </div>
                <div
                  className="tracking-[0.04em] wall-emerge-roof"
                  style={{ animationDelay: '210ms' }}
                >
                  ARTIST
                </div>
              </div>
            </div>

            {/* --------------------------------------------------------------
                平面 1：左翼上扬 3D 立体字墙 (Left Wing `/`, skewY(-30deg))
                紧贴中央肖像与中脊左侧折线 (x = 0)
               -------------------------------------------------------------- */}
            <div
              className="absolute right-full top-0 flex flex-col items-end text-right pr-[5px] select-none pointer-events-none"
              style={{
                width: 330,
                transformOrigin: 'right top',
                transform: 'skewY(-30deg) scaleX(0.88)',
              }}
            >
              {/* Row 1: 纯白 3D 立体巨字（第 2 批先锋：310ms） */}
              <div
                className="font-sans font-black uppercase text-[#FFFFFF] leading-[0.84] tracking-[-0.04em] wall-emerge-left"
                style={{
                  animationDelay: '310ms',
                  fontSize: '88px',
                  WebkitTextStroke: '1.8px #07090E',
                  textShadow: leftWhiteShadow,
                }}
              >
                LI
              </div>

              {/* Row 2: 青绿 3D 立体巨字（第 3 批左侧灵魂主词：670ms） */}
              <div
                className="font-sans font-black uppercase text-[#2DD4BF] leading-[0.84] tracking-[-0.04em] wall-emerge-left"
                style={{
                  animationDelay: '670ms',
                  fontSize: '88px',
                  WebkitTextStroke: '1.8px #051F1D',
                  textShadow: leftTealShadow,
                }}
              >
                FRA
              </div>

              {/* Row 3 & 4: 纯白紧凑关键词（第 4 批左右交替浮现：890ms & 1110ms） */}
              <div
                className="font-sans font-black uppercase text-[#FFFFFF] leading-[0.94] tracking-[-0.02em] mt-[3px] wall-emerge-left"
                style={{
                  animationDelay: '890ms',
                  fontSize: '36px',
                  WebkitTextStroke: '1.2px #07090E',
                  textShadow: build3DWallTextShadow('#080A0F', -0.8, 1.1, 6),
                }}
              >
                HUMAN·
              </div>
              <div
                className="font-sans font-black uppercase text-[#FFFFFF] leading-[0.94] tracking-[-0.02em] wall-emerge-left"
                style={{
                  animationDelay: '1110ms',
                  fontSize: '36px',
                  WebkitTextStroke: '1.2px #07090E',
                  textShadow: build3DWallTextShadow('#080A0F', -0.8, 1.1, 6),
                }}
              >
                ANIMAL·
              </div>

              {/* Row 5: 青绿 3D 立体大字（第 5 批底座左翼：1330ms） */}
              <div
                className="font-sans font-black uppercase text-[#2DD4BF] leading-[0.84] tracking-[-0.04em] mt-[3px] wall-emerge-left"
                style={{
                  animationDelay: '1330ms',
                  fontSize: '84px',
                  WebkitTextStroke: '1.8px #051F1D',
                  textShadow: leftTealShadow,
                }}
              >
                RAW.
              </div>
            </div>

            {/* --------------------------------------------------------------
                平面 2：中央下倾主折面 (Center Spine `\`, skewY(30deg))
                - 顶部为 "GHT" 立体字（逐字阶梯浮现）
                - 正中间嵌入【我的照片 (3D Isometric Portrait Frame)】（第 1 批 0ms 率先破雾浮现）
                - 底部为 "2026" 立体字（逐字阶梯浮现）
               -------------------------------------------------------------- */}
            <div
              className="absolute left-0 top-0 flex flex-col items-stretch select-none"
              style={{
                width: centerWidth,
                transformOrigin: 'left top',
                transform: 'skewY(30deg)',
              }}
            >
              {/* 中脊顶部：与左翼 "LI"、右翼 "LAB" 拼合为 "LI-GHT-LAB"（第 2 批逐字浮现：390ms / 445ms / 500ms） */}
              <div
                className="font-sans font-black uppercase text-[#D5DCDD] leading-[0.84] tracking-[0.01em] flex justify-between px-[3px] pointer-events-none"
                style={{
                  fontSize: '88px',
                  WebkitTextStroke: '1.8px #07090E',
                  textShadow: centerGreyShadow,
                }}
              >
                <span
                  className="inline-block wall-emerge-spine"
                  style={{ animationDelay: '390ms' }}
                >
                  G
                </span>
                <span
                  className="inline-block wall-emerge-spine"
                  style={{ animationDelay: '445ms' }}
                >
                  H
                </span>
                <span
                  className="inline-block wall-emerge-spine"
                  style={{ animationDelay: '500ms' }}
                >
                  T
                </span>
              </div>

              {/* ============================================================
                  文字墙正中间：3D 立体个人肖像相框 (第 1 批核心：0ms 率先对焦浮现)
                 ============================================================ */}
              <div
                className="relative my-[6px] mx-[4px] group pointer-events-auto wall-emerge-portrait"
                style={{ animationDelay: '0ms' }}
              >
                {/* 照片背后的 3D 建筑体块侧壁厚度与深邃投影 */}
                <div
                  className="absolute inset-0 rounded-[4px] pointer-events-none"
                  style={{
                    transform: 'translate(9px, 11px)',
                    backgroundColor: '#07090E',
                    border: '1.5px solid #2DD4BF',
                    boxShadow: '10px 16px 32px rgba(0, 0, 0, 0.78)',
                  }}
                />
                <div
                  className="absolute inset-0 rounded-[4px] pointer-events-none"
                  style={{
                    transform: 'translate(4.5px, 5.5px)',
                    backgroundColor: '#182026',
                    border: '1px solid rgba(255,255,255,0.28)',
                  }}
                />

                {/* 肖像主画面容器 */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  title="Click to replace with your own portrait photo"
                  className="relative w-full h-[152px] rounded-[4px] overflow-hidden bg-[#0B0E14] border-[2.5px] border-white cursor-pointer"
                  style={{
                    boxShadow:
                      'inset 0 0 22px rgba(0, 0, 0, 0.65), 0 0 18px rgba(45, 212, 191, 0.35)',
                  }}
                >
                  <img
                    src={portraitSrc}
                    alt="Photographer Portrait"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover object-center contrast-115 saturate-90 group-hover:scale-105 transition-transform duration-300"
                  />

                  {/* 顶部与底部微弱胶片暗角 + 青绿取景框角标 */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/25 pointer-events-none" />

                  {/* 四角精密光学取景准星 */}
                  <span className="absolute top-1.5 left-1.5 w-2.5 h-2.5 border-t-2 border-l-2 border-[#2DD4BF] pointer-events-none" />
                  <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 border-t-2 border-r-2 border-[#2DD4BF] pointer-events-none" />
                  <span className="absolute bottom-1.5 left-1.5 w-2.5 h-2.5 border-b-2 border-l-2 border-[#2DD4BF] pointer-events-none" />
                  <span className="absolute bottom-1.5 right-1.5 w-2.5 h-2.5 border-b-2 border-r-2 border-[#2DD4BF] pointer-events-none" />

                  {/* 底部极简英文身份微标 + 悬停替换照片提示 */}
                  <div className="absolute bottom-1.5 inset-x-2.5 flex items-center justify-between text-[10px] font-mono-tabular tracking-[0.18em] text-white uppercase">
                    <span className="text-[#2DD4BF] font-bold">
                      SELF // PORTRAIT
                    </span>
                    <span className="flex items-center gap-1 bg-black/70 px-1.5 py-0.5 rounded text-[9px] text-white/90 opacity-85 group-hover:opacity-100 group-hover:text-[#2DD4BF] transition-opacity">
                      <Camera className="w-2.5 h-2.5" />
                      PHOTO
                    </span>
                  </div>
                </div>
              </div>

              {/* 中脊底部：与左翼 "RAW."、右翼 "EYE" 拼合为 "RAW. - 2026 - EYE"（第 5 批逐字浮现：1410ms ~ 1545ms） */}
              <div
                className="font-sans font-black uppercase text-[#20A89A] leading-[0.84] tracking-[0.01em] flex justify-between px-[3px] pointer-events-none"
                style={{
                  fontSize: '84px',
                  WebkitTextStroke: '1.8px #051F1D',
                  textShadow: centerTealShadow,
                }}
              >
                <span
                  className="inline-block wall-emerge-spine"
                  style={{ animationDelay: '1410ms' }}
                >
                  2
                </span>
                <span
                  className="inline-block wall-emerge-spine"
                  style={{ animationDelay: '1455ms' }}
                >
                  0
                </span>
                <span
                  className="inline-block wall-emerge-spine"
                  style={{ animationDelay: '1500ms' }}
                >
                  2
                </span>
                <span
                  className="inline-block wall-emerge-spine"
                  style={{ animationDelay: '1545ms' }}
                >
                  6
                </span>
              </div>
            </div>

            {/* --------------------------------------------------------------
                平面 3：右翼上扬 3D 立体字墙 (Right Wing `/`, skewY(-30deg))
                紧贴中央肖像与中脊右侧折线 (left: centerWidth, top: rightWingDropY)
               -------------------------------------------------------------- */}
            <div
              className="absolute flex flex-col items-start text-left pl-[5px] select-none pointer-events-none"
              style={{
                left: centerWidth,
                top: rightWingDropY,
                width: 350,
                transformOrigin: 'left top',
                transform: 'skewY(-30deg) scaleX(0.88)',
              }}
            >
              {/* Row 1: 纯白 3D 立体巨字（第 2 批右翼收尾：570ms） */}
              <div
                className="font-sans font-black uppercase text-[#FFFFFF] leading-[0.84] tracking-[-0.03em] wall-emerge-right"
                style={{
                  animationDelay: '570ms',
                  fontSize: '88px',
                  WebkitTextStroke: '1.8px #07090E',
                  textShadow: rightWhiteShadow,
                }}
              >
                LAB
              </div>

              {/* Row 2: 青绿 3D 立体巨字（第 3 批右侧灵魂主词：780ms） */}
              <div
                className="font-sans font-black uppercase text-[#2DD4BF] leading-[0.84] tracking-[-0.04em] wall-emerge-right"
                style={{
                  animationDelay: '780ms',
                  fontSize: '88px',
                  WebkitTextStroke: '1.8px #051F1D',
                  textShadow: rightTealShadow,
                }}
              >
                SOUL
              </div>

              {/* Row 3 & 4: 纯白与青绿紧凑关键词（第 4 批左右交替浮现：1000ms & 1220ms） */}
              <div
                className="font-sans font-black uppercase text-[#FFFFFF] leading-[0.94] tracking-[-0.01em] mt-[3px] wall-emerge-right"
                style={{
                  animationDelay: '1000ms',
                  fontSize: '36px',
                  WebkitTextStroke: '1.2px #07090E',
                  textShadow: build3DWallTextShadow('#080A0F', 0.9, 1.1, 6),
                }}
              >
                ·EMOTION
              </div>
              <div
                className="font-sans font-black uppercase text-[#2DD4BF] leading-[0.94] tracking-[-0.02em] wall-emerge-right"
                style={{
                  animationDelay: '1220ms',
                  fontSize: '36px',
                  WebkitTextStroke: '1.2px #051F1D',
                  textShadow: build3DWallTextShadow('#062825', 0.9, 1.1, 6),
                }}
              >
                ·LANDSCAPE
              </div>

              {/* Row 5: 青绿 3D 立体大字（第 5 批底座右翼：1620ms） */}
              <div
                className="font-sans font-black uppercase text-[#2DD4BF] leading-[0.84] tracking-[-0.03em] mt-[3px] wall-emerge-right"
                style={{
                  animationDelay: '1620ms',
                  fontSize: '84px',
                  WebkitTextStroke: '1.8px #051F1D',
                  textShadow: rightTealShadow,
                }}
              >
                EYE
              </div>
            </div>

            {/* --------------------------------------------------------------
                平面 4：底部等轴测地面平铺纯英文小字（第 6 批逐行渐进浮现：1720ms ~ 2020ms）
               -------------------------------------------------------------- */}
            <div
              className="absolute pointer-events-none select-none"
              style={{
                left: -4,
                top: 326,
                transformOrigin: 'left top',
                transform: 'rotate(30deg) skewX(-30deg) scaleY(0.866)',
              }}
            >
              <div
                className="font-sans font-black uppercase text-[#FFFFFF] text-[15px] leading-[1.2] tracking-[0.06em] whitespace-nowrap space-y-[2px]"
                style={{
                  WebkitTextStroke: '0.8px #07090E',
                  textShadow: floorShadow,
                }}
              >
                <div
                  className="wall-emerge-floor"
                  style={{ animationDelay: '1720ms' }}
                >
                  INDEPENDENT PHOTOGRAPHER
                </div>
                <div
                  className="wall-emerge-floor"
                  style={{ animationDelay: '1820ms' }}
                >
                  STILLNESS · GEOMETRY · WILDERNESS
                </div>
                <div
                  className="wall-emerge-floor"
                  style={{ animationDelay: '1920ms' }}
                >
                  3X3X3 OPTICAL CUBE ARCHIVE
                </div>
                <div
                  className="text-[#2DD4BF] wall-emerge-floor"
                  style={{ animationDelay: '2020ms' }}
                >
                  ORASEAIR@GMAIL.COM
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
