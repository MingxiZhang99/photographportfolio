import { useState, useCallback, useEffect, useRef } from 'react';
import { FaceCategory } from './data/portfolioData';
import { RubiksCube3D } from './components/RubiksCube3D';
import {
  KineticTransitionOverlay,
  createCategorySlam,
  WordSlamState,
} from './components/KineticTransitionOverlay';
import { FullscreenGalleryViewer } from './components/FullscreenGalleryViewer';
import { DarkRoomFlashlightIntro } from './components/DarkRoomFlashlightIntro';
import { AboutMeModal } from './components/AboutMeModal';

// 固定三面正交立体视角：同时完整呈现左前 (HUMAN)、右前 (ANIMAL) 与顶面 (LANDSCAPE)
const FIXED_ISOMETRIC_ROTATION = { x: -28, y: -45, z: 0 };

// 点击对应面或文字时，将该面精确旋转至正对屏幕（正面）的 3D 欧拉角
const FRONT_FACE_ROTATIONS: Record<
  FaceCategory,
  { x: number; y: number; z: number }
> = {
  human: { x: 0, y: 0, z: 0 },
  animal: { x: 0, y: -90, z: 0 },
  landscape: { x: -90, y: 0, z: 0 },
};

export default function App() {
  const [isRoomLit, setIsRoomLit] = useState(false);
  const [isAboutMeOpen, setIsAboutMeOpen] = useState(false);
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>(() => ({
    x: typeof window !== 'undefined' ? Math.round(window.innerWidth * 0.5) : 640,
    y: typeof window !== 'undefined' ? Math.round(window.innerHeight * 0.52) : 420,
  }));

  const [rotation, setRotation] = useState(FIXED_ISOMETRIC_ROTATION);
  const [activeCategory, setActiveCategory] = useState<FaceCategory | null>(null);
  const [activePlateIndex, setActivePlateIndex] = useState<number>(0);

  // 阶段一：魔方将所选面旋转至正面（对应 3D 白色立体字同步旋转并滑行至魔方正下方）
  const [turningCategory, setTurningCategory] = useState<FaceCategory | null>(
    null
  );
  // 阶段二：魔方正下方的 3D 白色立体字无缝接力悬浮放大并冲出屏幕（合并原先重复的 zoomingCategory 状态）
  const [rushingCategory, setRushingCategory] = useState<FaceCategory | null>(
    null
  );

  // 全屏黑白 3D 立体字冲出屏幕动效状态
  const [activeSlam, setActiveSlam] = useState<WordSlamState | null>(null);
  const transitionTimersRef = useRef<number[]>([]);

  const clearTransitionTimers = useCallback(() => {
    transitionTimersRef.current.forEach((id) => window.clearTimeout(id));
    transitionTimersRef.current = [];
  }, []);

  // 全局追踪鼠标手电筒坐标，使黑灯状态下照到的魔方与 3D 文字产生实时动态阴影与受光反馈
  useEffect(() => {
    if (isRoomLit) return;

    const handlePointerMove = (e: PointerEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        setMousePos({
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
        });
      }
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('touchmove', handleTouchMove);
    };
  }, [isRoomLit]);

  // 点击魔方任意一面的图片或中心摄像头：
  // 1. 先将该面的魔方旋转至正面 (0ms -> 460ms)，同时对应的 3D 白色立体字同步旋转回正并滑动至魔方正下方；
  // 2. 随后正下方的白色 3D 立体字无缝接力悬浮放大冲出屏幕 (460ms -> 1220ms)；
  // 3. 紧接着切换进入对应图片集展示 (1040ms)。
  const handleOpenFaceGallery = useCallback(
    (category: FaceCategory, plateIdx: number = 0) => {
      if (turningCategory || rushingCategory) return;
      clearTransitionTimers();

      const targetIdx = plateIdx === 4 ? 0 : plateIdx;

      // 第一步：将魔方对应面旋转至正面，对应 3D 白色立体字同步旋转滑行至魔方正下方
      setTurningCategory(category);
      setRotation(FRONT_FACE_ROTATIONS[category]);

      // 第二步：魔方转到正面后，正下方的白色 3D 立体字悬浮放大冲出屏幕
      const timerRush = window.setTimeout(() => {
        setTurningCategory(null);
        setRushingCategory(category);
        const slam = createCategorySlam(category, 'tabletop');
        setActiveSlam(slam);
      }, 460);

      // 第三步：白色立体字冲出屏幕瞬间，切换进入全屏图片集
      const timerOpenGallery = window.setTimeout(() => {
        setActiveCategory(category);
        setActivePlateIndex(targetIdx);
        setRushingCategory(null);
      }, 1040);

      // 清理全屏立体字冲击层
      const timerClearSlam = window.setTimeout(() => {
        setActiveSlam(null);
      }, 1240);

      transitionTimersRef.current.push(
        timerRush,
        timerOpenGallery,
        timerClearSlam
      );
    },
    [turningCategory, rushingCategory, clearTransitionTimers]
  );

  // 从大图检视返回 3D 魔方，触发统一的黑白 3D 立体字冲击动效并复位魔方三面视角
  const handleCloseToCube = useCallback(() => {
    clearTransitionTimers();
    if (activeCategory) {
      const slam = createCategorySlam(activeCategory, 'center');
      setActiveSlam(slam);
      const timer = window.setTimeout(() => {
        setActiveSlam((prev) => (prev?.key === slam.key ? null : prev));
      }, 780);
      transitionTimersRef.current.push(timer);
    }
    setActiveCategory(null);
    setTurningCategory(null);
    setRushingCategory(null);
    setRotation(FIXED_ISOMETRIC_ROTATION);
  }, [activeCategory, clearTransitionTimers]);

  // 左右箭头切换图片（无序号动效）
  const handlePlateChangeInGallery = useCallback((newIdx: number) => {
    setActivePlateIndex(newIdx);
  }, []);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#FFFFFF] text-[#090614] flex items-center justify-center select-none">
      {/* 中央 27 块独立 3D 立体魔方与白棚墙角桌面空间 */}
      <main className="relative z-10 w-full h-full flex items-center justify-center bg-[#FFFFFF]">
        <RubiksCube3D
          rotation={rotation}
          onRotationChange={setRotation}
          onSelectFaceAndTile={handleOpenFaceGallery}
          onOpenAboutMe={() => setIsAboutMeOpen(true)}
          turningCategory={turningCategory}
          rushingCategory={rushingCategory}
          flashlightPos={!isRoomLit ? mousePos : null}
        />
      </main>

      {/* 点击放大后的全屏大片检视与左右箭头切换 */}
      {activeCategory && (
        <FullscreenGalleryViewer
          category={activeCategory}
          plateIndex={activePlateIndex}
          onChangePlate={handlePlateChangeInGallery}
          onCloseToCube={handleCloseToCube}
        />
      )}

      {/* 点击 ABOUT ME 后弹出的无背景 3D 立体文字墙自我介绍层 */}
      <AboutMeModal
        isOpen={isAboutMeOpen}
        onClose={() => setIsAboutMeOpen(false)}
      />

      {/* 桌面 3D 黑白立体字悬浮放大冲出屏幕动效层 */}
      <KineticTransitionOverlay activeSlam={activeSlam} />

      {/* 黑灯手电筒透光遮罩层：手电筒照到哪里就真实显示底下的完整 3D 魔方页内容与动态阴影，点击顶部灯泡后全亮 */}
      {!isRoomLit && (
        <DarkRoomFlashlightIntro
          mousePos={mousePos}
          onLightTurnedOn={() => setIsRoomLit(true)}
        />
      )}
    </div>
  );
}
