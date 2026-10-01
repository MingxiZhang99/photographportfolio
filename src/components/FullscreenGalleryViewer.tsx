import React, { useEffect, useState, useCallback } from 'react';
import { X } from 'lucide-react';
import { CUBE_FACES, FaceCategory, PhotoPlate } from '../data/portfolioData';

interface FullscreenGalleryViewerProps {
  category: FaceCategory;
  plateIndex: number;
  onChangePlate: (newIndex: number) => void;
  onCloseToCube: () => void;
}

interface CorridorFrameItem {
  bayIndex: number;
  side: 'left' | 'right';
  plate: PhotoPlate;
  objectPosition: string;
  cropScale: number;
  aspectType: 'portrait' | 'landscape' | 'square';
}

// 走廊空间几何常量（单位：px）
const CORRIDOR_HALF_W = 350; // 左右展墙距中心轴线的半宽（总宽 700px）
const CORRIDOR_HALF_H = 265; // 天花板与地面距中心视平线的半高（总高 530px）
const BAY_SPACING_Z = 470; // 每一跨展位沿走廊纵深方向的间距
const VISIBLE_BAYS_BEHIND = 2; // 身后保留渲染的展位跨数
const VISIBLE_BAYS_AHEAD = 11; // 前方纵深渲染的展位跨数（延伸超过 5000px 形成无限走廊透视）

const CROP_VARIATIONS = [
  { pos: '50% 50%', scale: 1.0, aspect: 'portrait' as const },
  { pos: '36% 42%', scale: 1.16, aspect: 'landscape' as const },
  { pos: '64% 38%', scale: 1.18, aspect: 'square' as const },
  { pos: '42% 62%', scale: 1.15, aspect: 'portrait' as const },
  { pos: '58% 54%', scale: 1.14, aspect: 'landscape' as const },
  { pos: '48% 30%', scale: 1.2, aspect: 'portrait' as const },
];

/**
 * 极简 3D 无限摄影展长廊（Zero-Text 3D Infinite Exhibition Corridor）：
 * - 零文字、零多余控件模块：完全去除所有标题、编号、参数栏、模式切换器与纸片折页效果；
 * - 真实三维美术馆长廊空间：两侧高挑美术馆白墙悬挂装裱摄影画框（配吊画钢丝与顶光洗墙射灯），地面铺设向无限远处延伸的深红丝绒展览地毯（Red Exhibition Carpet）；
 * - 交互体验：
 *   1. 点击走廊深处（或红地毯前方 / 滚轮向前 / 方向键上）：镜头平稳向前漫步深入走廊，两侧悬挂的画作依次掠过并从远方不断延展生成（无限走廊）；
 *   2. 点击两侧墙面任意一幅悬挂的画作：在走廊空间中将该画框平滑拉近至眼前凝视，再次点击即放回墙面。
 */
export const FullscreenGalleryViewer: React.FC<FullscreenGalleryViewerProps> = ({
  category,
  plateIndex,
  onChangePlate,
  onCloseToCube,
}) => {
  const face = CUBE_FACES[category];
  const basePlates = face.plates;

  // 当前在无限走廊中向前迈进的步数索引（可无限递增）
  const [walkStep, setWalkStep] = useState<number>(() => Math.max(0, plateIndex));

  // 当前被点击拉近端详的画作（null 表示正常漫步在走廊中）
  const [inspectedFrame, setInspectedFrame] = useState<{
    bayIndex: number;
    side: 'left' | 'right';
  } | null>(null);

  // 鼠标轻微移动时的第一人称视角微偏转（模拟真实走在展厅里的自然目光环视）
  const [lookTilt, setLookTilt] = useState<{ yaw: number; pitch: number }>({
    yaw: 0,
    pitch: 0,
  });

  // 同步当前漫步步数对应的图片索引至父组件（置于 useEffect 中避免在状态更新纯函数内触发父组件 setState）
  useEffect(() => {
    onChangePlate(walkStep % basePlates.length);
  }, [walkStep, basePlates.length, onChangePlate]);

  // 往前走一步（点击走廊深处或红地毯前方）
  const stepForward = useCallback(() => {
    if (inspectedFrame) {
      setInspectedFrame(null);
      return;
    }
    setWalkStep((prev) => prev + 1);
  }, [inspectedFrame]);

  // 往后退一步（滚轮向后或方向键向下）
  const stepBackward = useCallback(() => {
    if (inspectedFrame) {
      setInspectedFrame(null);
      return;
    }
    setWalkStep((prev) => Math.max(0, prev - 1));
  }, [inspectedFrame]);

  // 键盘与鼠标滚轮漫步支持
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (inspectedFrame) {
          setInspectedFrame(null);
        } else {
          onCloseToCube();
        }
        return;
      }
      if (e.key === 'ArrowUp' || e.key === 'ArrowRight' || e.key === 'w' || e.key === 'W') {
        stepForward();
      } else if (
        e.key === 'ArrowDown' ||
        e.key === 'ArrowLeft' ||
        e.key === 's' ||
        e.key === 'S'
      ) {
        stepBackward();
      }
    };

    let lastWheelTime = 0;
    const handleWheel = (e: WheelEvent) => {
      const now = performance.now();
      if (now - lastWheelTime < 320) return;
      if (Math.abs(e.deltaY) < 18) return;
      lastWheelTime = now;
      if (e.deltaY > 0) {
        stepForward();
      } else {
        stepBackward();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('wheel', handleWheel, { passive: true });
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('wheel', handleWheel);
    };
  }, [inspectedFrame, onCloseToCube, stepForward, stepBackward]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const nx = (e.clientX / window.innerWidth - 0.5) * 2;
    const ny = (e.clientY / window.innerHeight - 0.5) * 2;
    setLookTilt({
      yaw: nx * 4.2,
      pitch: -ny * 2.6,
    });
  };

  // 根据任意展位跨号 bayIndex 与左/右墙生成对应的悬挂画作数据（无限循环不重样）
  const getFrameForBay = (
    bayIndex: number,
    side: 'left' | 'right'
  ): CorridorFrameItem => {
    const rawIdx = bayIndex * 2 + (side === 'left' ? 0 : 1);
    const plate = basePlates[((rawIdx % basePlates.length) + basePlates.length) % basePlates.length];
    const variation =
      CROP_VARIATIONS[((rawIdx % CROP_VARIATIONS.length) + CROP_VARIATIONS.length) % CROP_VARIATIONS.length];

    return {
      bayIndex,
      side,
      plate,
      objectPosition: rawIdx < basePlates.length ? plate.objectPosition : variation.pos,
      cropScale:
        rawIdx < basePlates.length
          ? plate.cropScale
          : Math.max(plate.cropScale, variation.scale),
      aspectType: variation.aspect,
    };
  };

  const startBay = Math.max(0, walkStep - VISIBLE_BAYS_BEHIND);
  const endBay = walkStep + VISIBLE_BAYS_AHEAD;
  const visibleBays: number[] = [];
  for (let b = startBay; b <= endBay; b++) {
    visibleBays.push(b);
  }

  // 摄像机当前所在的 Z 轴深度（往前走时走廊整体向 +Z 移动经过摄像机）
  const cameraZ = walkStep * BAY_SPACING_Z;

  // 地毯与墙面纹理随步伐无缝循环的偏移量（模 BAY_SPACING_Z）
  const patternPhaseZ = cameraZ % BAY_SPACING_Z;

  return (
    <div
      onMouseMove={handleMouseMove}
      onClick={stepForward}
      className="fixed inset-0 z-30 overflow-hidden bg-[#EAE7E1] select-none cursor-pointer"
      style={{
        perspective: '980px',
        perspectiveOrigin: '50% 50%',
      }}
    >
      {/* 右上角唯一极简无字关闭图标（点击返回 3D 镜头页） */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (inspectedFrame) {
            setInspectedFrame(null);
          } else {
            onCloseToCube();
          }
        }}
        aria-label="Close exhibition"
        className="fixed top-6 right-6 z-50 flex items-center justify-center w-11 h-11 bg-black/75 hover:bg-black text-white/90 hover:text-white border border-white/20 transition-all duration-200 cursor-pointer"
      >
        <X className="w-5 h-5" />
      </button>

      {/* ====================================================================
          3D 无限摄影展长廊世界容器（支持第一人称微环视）
         ==================================================================== */}
      <div
        className="relative w-full h-full flex items-center justify-center"
        style={{
          transformStyle: 'preserve-3d',
          transform: `rotateX(${lookTilt.pitch.toFixed(2)}deg) rotateY(${lookTilt.yaw.toFixed(2)}deg)`,
          transition: 'transform 180ms ease-out',
        }}
      >
        {/* ==================================================================
            1. 固定的 6000px 超长走廊建筑壳体（天花板、左右美术馆展墙、地面与正中央红地毯）
               内部纹理通过 patternPhaseZ 与相机步伐严格同步，营造无穷尽延伸感
           ================================================================== */}
        <div
          className="absolute pointer-events-none"
          style={{
            width: 0,
            height: 0,
            transformStyle: 'preserve-3d',
          }}
        >
          {/* A. 走廊地面底层（美术馆浅暖灰石材地面 + 正中央贯穿无限远处的红地毯） */}
          <div
            style={{
              position: 'absolute',
              width: CORRIDOR_HALF_W * 2,
              height: 6200,
              left: -CORRIDOR_HALF_W,
              top: -3100,
              transform: `translate3d(0px, ${CORRIDOR_HALF_H}px, -2450px) rotateX(90deg)`,
              transformStyle: 'preserve-3d',
              background:
                'linear-gradient(90deg, #D5D0C8 0%, #E5E1DA 18%, #EAE6DF 82%, #D5D0C8 100%)',
              boxShadow: 'inset 0 0 90px rgba(0, 0, 0, 0.28)',
            }}
          >
            {/* 地面两侧石材分缝（随步伐移动） */}
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `repeating-linear-gradient(180deg, rgba(0,0,0,0.08) 0px, rgba(0,0,0,0.08) 2px, transparent 2px, transparent ${BAY_SPACING_Z}px)`,
                backgroundPosition: `0px ${patternPhaseZ}px`,
                transition: 'background-position 780ms cubic-bezier(0.22, 1, 0.36, 1)',
              }}
            />

            {/* 正中央：无限延伸的摄影展红色丝绒地毯 (Red Exhibition Carpet Runner) */}
            <div
              style={{
                position: 'absolute',
                left: '50%',
                top: 0,
                width: 320,
                height: '100%',
                transform: 'translateX(-50%)',
                background:
                  'linear-gradient(90deg, #4A070C 0%, #7A0F18 4%, #B81D2A 7%, #8E111B 11%, #9E1622 22%, #B11B28 50%, #9E1622 78%, #8E111B 89%, #B81D2A 93%, #7A0F18 96%, #4A070C 100%)',
                boxShadow:
                  '0 0 28px rgba(0, 0, 0, 0.42), inset 0 0 36px rgba(45, 3, 8, 0.55)',
              }}
            >
              {/* 红地毯丝绒织物纹理与展览分节压条（随前进动画同步向后流动） */}
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage: `
                    repeating-linear-gradient(180deg, rgba(255, 215, 160, 0.22) 0px, rgba(60, 4, 10, 0.45) 4px, transparent 4px, transparent ${BAY_SPACING_Z}px),
                    repeating-linear-gradient(180deg, rgba(255, 255, 255, 0.03) 0px, rgba(0, 0, 0, 0.05) 6px, transparent 6px, transparent 14px)
                  `,
                  backgroundPosition: `0px ${patternPhaseZ}px, 0px ${patternPhaseZ}px`,
                  transition:
                    'background-position 780ms cubic-bezier(0.22, 1, 0.36, 1)',
                }}
              />
            </div>
          </div>

          {/* B. 走廊天花板（美术馆挑高顶棚 + 中央嵌入式线型暖白轨道灯带） */}
          <div
            style={{
              position: 'absolute',
              width: CORRIDOR_HALF_W * 2,
              height: 6200,
              left: -CORRIDOR_HALF_W,
              top: -3100,
              transform: `translate3d(0px, ${-CORRIDOR_HALF_H}px, -2450px) rotateX(-90deg)`,
              background:
                'linear-gradient(90deg, #CFCBC3 0%, #E7E4DD 22%, #F4F2EE 50%, #E7E4DD 78%, #CFCBC3 100%)',
              boxShadow: 'inset 0 0 110px rgba(0, 0, 0, 0.26)',
            }}
          >
            {/* 天花板横向建筑梁缝与洗墙灯槽 */}
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `repeating-linear-gradient(180deg, rgba(0,0,0,0.12) 0px, rgba(0,0,0,0.12) 3px, transparent 3px, transparent ${BAY_SPACING_Z}px)`,
                backgroundPosition: `0px ${patternPhaseZ}px`,
                transition:
                  'background-position 780ms cubic-bezier(0.22, 1, 0.36, 1)',
              }}
            />
            {/* 天花板两侧嵌入式美术馆洗墙灯轨 */}
            <div
              className="absolute top-0 bottom-0 left-[44px] w-[8px]"
              style={{
                background: '#FFFDF9',
                boxShadow: '0 0 26px 8px rgba(255, 248, 232, 0.85)',
              }}
            />
            <div
              className="absolute top-0 bottom-0 right-[44px] w-[8px]"
              style={{
                background: '#FFFDF9',
                boxShadow: '0 0 26px 8px rgba(255, 248, 232, 0.85)',
              }}
            />
          </div>

          {/* C. 左侧无限延伸美术馆白墙 */}
          <div
            style={{
              position: 'absolute',
              width: 6200,
              height: CORRIDOR_HALF_H * 2,
              left: -3100,
              top: -CORRIDOR_HALF_H,
              transform: `translate3d(${-CORRIDOR_HALF_W}px, 0px, -2450px) rotateY(90deg)`,
              background:
                'linear-gradient(180deg, #E2DFD7 0%, #F5F3EF 18%, #F8F7F4 78%, #DDD9D0 96%, #3A3532 96.5%, #24201E 100%)',
              boxShadow: 'inset 0 0 95px rgba(0, 0, 0, 0.18)',
            }}
          >
            {/* 顶部挂画轨道线 (Picture Rail) */}
            <div
              className="absolute left-0 right-0 top-[26px] h-[3px]"
              style={{
                background:
                  'linear-gradient(180deg, #9E988E 0%, #D8D4CC 50%, #7A746B 100%)',
              }}
            />
          </div>

          {/* D. 右侧无限延伸美术馆白墙 */}
          <div
            style={{
              position: 'absolute',
              width: 6200,
              height: CORRIDOR_HALF_H * 2,
              left: -3100,
              top: -CORRIDOR_HALF_H,
              transform: `translate3d(${CORRIDOR_HALF_W}px, 0px, -2450px) rotateY(-90deg)`,
              background:
                'linear-gradient(180deg, #E2DFD7 0%, #F5F3EF 18%, #F8F7F4 78%, #DDD9D0 96%, #3A3532 96.5%, #24201E 100%)',
              boxShadow: 'inset 0 0 95px rgba(0, 0, 0, 0.18)',
            }}
          >
            {/* 顶部挂画轨道线 (Picture Rail) */}
            <div
              className="absolute left-0 right-0 top-[26px] h-[3px]"
              style={{
                background:
                  'linear-gradient(180deg, #9E988E 0%, #D8D4CC 50%, #7A746B 100%)',
              }}
            />
          </div>
        </div>

        {/* ==================================================================
            2. 随步伐前进的 3D 画廊世界层：两侧墙面悬挂的立体的摄影画框与射灯光束
           ================================================================== */}
        <div
          className="absolute"
          style={{
            width: 0,
            height: 0,
            transformStyle: 'preserve-3d',
            transform: `translate3d(0px, 0px, ${cameraZ}px)`,
            transition: 'transform 780ms cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        >
          {visibleBays.map((bayIndex) => {
            const bayZ = -bayIndex * BAY_SPACING_Z - 320;
            const distFromCamera = bayIndex - walkStep;
            // 远端深度雾化衰减，使走廊尽头自然消隐在柔和展厅雾光中
            const depthOpacity =
              distFromCamera < -1
                ? 0
                : distFromCamera > 8
                ? Math.max(0, 1 - (distFromCamera - 8) / 3.2)
                : 1;

            return (
              <React.Fragment key={`corridor-bay-${bayIndex}`}>
                {(['left', 'right'] as const).map((side) => {
                  const frame = getFrameForBay(bayIndex, side);
                  const isLeft = side === 'left';
                  const isInspected =
                    inspectedFrame?.bayIndex === bayIndex &&
                    inspectedFrame?.side === side;

                  // 画框外尺寸（无任何文字，纯正美术馆宽幅卡纸装裱）
                  const frameW =
                    frame.aspectType === 'landscape'
                      ? 286
                      : frame.aspectType === 'square'
                      ? 244
                      : 228;
                  const frameH =
                    frame.aspectType === 'landscape'
                      ? 214
                      : frame.aspectType === 'square'
                      ? 244
                      : 276;

                  // 常态悬挂在左右两侧墙面上；点击某幅画时，该画框从墙面平滑转正并移至走廊中央眼前
                  const wallX = isLeft
                    ? -CORRIDOR_HALF_W + 6
                    : CORRIDOR_HALF_W - 6;
                  const wallRotY = isLeft ? 90 : -90;

                  const targetTransform = isInspected
                    ? `translate3d(0px, -6px, ${-cameraZ + 290}px) rotateY(0deg) scale(1.22)`
                    : `translate3d(${wallX}px, -8px, ${bayZ}px) rotateY(${wallRotY}deg) scale(1)`;

                  return (
                    <div
                      key={`frame-${bayIndex}-${side}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isInspected) {
                          setInspectedFrame(null);
                        } else {
                          setInspectedFrame({ bayIndex, side });
                        }
                      }}
                      style={{
                        position: 'absolute',
                        width: frameW,
                        height: frameH,
                        left: -frameW / 2,
                        top: -frameH / 2,
                        transformStyle: 'preserve-3d',
                        transform: targetTransform,
                        opacity: depthOpacity,
                        transition:
                          'transform 680ms cubic-bezier(0.22, 1, 0.36, 1), opacity 450ms ease',
                      }}
                      className="group cursor-pointer"
                    >
                      {/* 美术馆天花板垂下的两条纤细金属挂画钢丝线（非放大检视时连接顶轨） */}
                      {!isInspected && (
                        <>
                          <div
                            className="pointer-events-none"
                            style={{
                              position: 'absolute',
                              left: '22%',
                              bottom: '100%',
                              width: '1.5px',
                              height: Math.max(0, CORRIDOR_HALF_H - frameH / 2 - 20),
                              background:
                                'linear-gradient(180deg, rgba(110,106,98,0.65) 0%, rgba(140,136,128,0.35) 100%)',
                            }}
                          />
                          <div
                            className="pointer-events-none"
                            style={{
                              position: 'absolute',
                              right: '22%',
                              bottom: '100%',
                              width: '1.5px',
                              height: Math.max(0, CORRIDOR_HALF_H - frameH / 2 - 20),
                              background:
                                'linear-gradient(180deg, rgba(110,106,98,0.65) 0%, rgba(140,136,128,0.35) 100%)',
                            }}
                          />
                        </>
                      )}

                      {/* 墙面顶光洗墙射灯光束光晕（打在画框及其上方墙面） */}
                      {!isInspected && (
                        <div
                          className="pointer-events-none"
                          style={{
                            position: 'absolute',
                            left: '-26%',
                            right: '-26%',
                            top: '-38%',
                            bottom: '-22%',
                            background:
                              'radial-gradient(ellipse at 50% 24%, rgba(255, 250, 236, 0.78) 0%, rgba(255, 247, 226, 0.28) 48%, transparent 76%)',
                            transform: 'translateZ(-2px)',
                          }}
                        />
                      )}

                      {/* 3D 实体画框的立体木框侧边厚度（让走廊侧面看过去每幅画都有真实的凸出盒体厚度，绝非纸片！） */}
                      {/* 朝向走廊入口一侧的画框侧壁厚度 (16px 深胡桃黑木框侧边) */}
                      <div
                        className="pointer-events-none"
                        style={{
                          position: 'absolute',
                          top: 0,
                          bottom: 0,
                          width: 16,
                          left: isLeft ? '100%' : -16,
                          transformOrigin: isLeft ? 'left center' : 'right center',
                          transform: isLeft ? 'rotateY(90deg)' : 'rotateY(-90deg)',
                          background:
                            'linear-gradient(180deg, #2B2624 0%, #171413 50%, #0D0B0A 100%)',
                        }}
                      />
                      {/* 画框底部下沿立体厚度 */}
                      <div
                        className="pointer-events-none"
                        style={{
                          position: 'absolute',
                          left: 0,
                          right: 0,
                          height: 16,
                          top: '100%',
                          transformOrigin: 'top center',
                          transform: 'rotateX(-90deg)',
                          background: '#12100F',
                        }}
                      />

                      {/* 画框正面：深炭黑美术馆实木外框 + 纯白加厚装裱卡纸 (Passepartout Mat) + 摄影作品 */}
                      <div
                        className="relative w-full h-full flex items-center justify-center p-[18px] sm:p-[22px] bg-[#FDFCFA] transition-transform duration-300 group-hover:scale-[1.02]"
                        style={{
                          border: '10px solid #1C1918',
                          boxShadow: isInspected
                            ? '0 36px 90px rgba(0, 0, 0, 0.65), inset 0 0 0 1px rgba(0,0,0,0.18)'
                            : '0 22px 42px rgba(18, 14, 12, 0.36), 0 6px 14px rgba(0, 0, 0, 0.22), inset 0 2px 6px rgba(0,0,0,0.16)',
                        }}
                      >
                        {/* 装裱卡纸内斜切凹槽边 (Beveled Mat Opening) */}
                        <div
                          className="relative w-full h-full overflow-hidden bg-[#ECEAE4]"
                          style={{
                            boxShadow:
                              'inset 2px 2px 5px rgba(0, 0, 0, 0.26), inset -1px -1px 2px rgba(255, 255, 255, 0.85)',
                          }}
                        >
                          <img
                            src={frame.plate.src}
                            alt=""
                            referrerPolicy="no-referrer"
                            draggable={false}
                            className="w-full h-full object-cover pointer-events-none select-none transition-transform duration-500 group-hover:scale-105"
                            style={{
                              objectPosition: frame.objectPosition,
                              transform: `scale(${frame.cropScale})`,
                              filter: frame.plate.cssFilter,
                            }}
                          />
                          {/* 柔和梦核暗角与美术馆防眩光玻璃微反光 */}
                          <div
                            className="absolute inset-0 pointer-events-none"
                            style={{
                              background: `${frame.plate.neonTint}, linear-gradient(135deg, rgba(255,255,255,0.16) 0%, transparent 42%, rgba(0,0,0,0.08) 100%)`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </React.Fragment>
            );
          })}
        </div>

        {/* ==================================================================
            3. 走廊尽头（Vanishing Point）的无限远深处光雾消隐层
               点击此处或走廊深处任意位置即可沿着红地毯不断往前走
           ================================================================== */}
        <div
          className="pointer-events-none fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{
            width: 240,
            height: 220,
            background:
              'radial-gradient(ellipse at 50% 52%, rgba(246, 243, 236, 0.96) 0%, rgba(238, 234, 225, 0.72) 44%, transparent 78%)',
            filter: 'blur(10px)',
          }}
        />
      </div>
    </div>
  );
};
