import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { FaceCategory } from '../data/portfolioData';

interface TriCameraRig3DCanvasProps {
  cubeSize: number;
  hoveredCategory: FaceCategory | null;
  turningCategory: FaceCategory | null;
  rushingCategory: FaceCategory | null;
  onHoverCamera: (category: FaceCategory | null) => void;
  onClickCamera: (category: FaceCategory) => void;
}

/**
 * 生成带有「OLYMPUS」复古相机铭牌与精细金属拉丝纹理的 CanvasTexture
 */
function createCameraBrandBadgeTexture(
  text: string,
  bgHex: string,
  textHex: string,
  width = 256,
  height = 64
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = bgHex;
    ctx.fillRect(0, 0, width, height);
    ctx.font = '900 30px "Arial Black", "Helvetica Neue", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = textHex;
    ctx.letterSpacing = '3px';
    ctx.fillText(text, width / 2, height / 2 + 1);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

/**
 * 生成外置闪光灯正面的菲涅尔竖条纹磨砂灯罩纹理 (Fresnel Flash Diffuser Texture)
 */
function createFresnelDiffuserTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createLinearGradient(0, 0, 0, 128);
    grad.addColorStop(0, '#FFFDF9');
    grad.addColorStop(0.5, '#F3EFE6');
    grad.addColorStop(1, '#E5DFD3');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 128);

    // 菲涅尔光学竖棱纹与内部灯管暗影
    for (let x = 0; x < 256; x += 6) {
      ctx.fillStyle = x % 12 === 0 ? 'rgba(255,255,255,0.65)' : 'rgba(180,172,160,0.28)';
      ctx.fillRect(x, 6, 3, 116);
    }

    const centerGlow = ctx.createRadialGradient(128, 64, 8, 128, 64, 96);
    centerGlow.addColorStop(0, 'rgba(255, 252, 235, 0.85)');
    centerGlow.addColorStop(1, 'rgba(200, 192, 180, 0.15)');
    ctx.fillStyle = centerGlow;
    ctx.fillRect(0, 0, 256, 128);

    ctx.strokeStyle = 'rgba(120, 115, 108, 0.45)';
    ctx.lineWidth = 4;
    ctx.strokeRect(4, 4, 248, 120);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

/**
 * 参照用户上传图片 1:1 构建的【真 WebGL Three.js 3D 三向光学相机云台模型】：
 * - 底部：深枪灰金属三脚架 + 银灰/深黑分段立柱 + 左侧弯曲黑色快门电源线；
 * - 中央：精密银灰铝合金三通机械云台节点（带正面圆形锁紧旋钮与黑色法兰盘）；
 * - 左侧（对应 HUMAN）：复古银色金属卡片机 CCD（含伸缩多级镜头筒、取景窗、顶盖快门拨盘、橙色挂耳、OLYMPUS 铭牌）；
 * - 右侧（对应 ANIMAL）：带顶部外置闪光灯的复古银黑单反相机（含银色五棱镜军舰部、黑色荔枝皮机身握柄、双机械转盘、36 道防滑棱纹黑镜头、顶部带红灯热靴座与菲涅尔柔光罩的外置闪光灯）；
 * - 顶部（对应 LANDSCAPE）：白色长焦大炮镜头（米白金属镜身、44 道防滑橡胶变焦环、黑色对焦拨杆、黑色遮光罩前口与超大口径多层镀膜前组镜片）。
 */
export const TriCameraRig3DCanvas: React.FC<TriCameraRig3DCanvasProps> = ({
  cubeSize,
  hoveredCategory,
  turningCategory,
  rushingCategory,
  onHoverCamera,
  onClickCamera,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);

  const stateRef = useRef({
    hoveredCategory,
    turningCategory,
    rushingCategory,
    mouseX: 0,
    mouseY: 0,
  });

  useEffect(() => {
    stateRef.current.hoveredCategory = hoveredCategory;
    stateRef.current.turningCategory = turningCategory;
    stateRef.current.rushingCategory = rushingCategory;
  }, [hoveredCategory, turningCategory, rushingCategory]);

  const callbacksRef = useRef({ onHoverCamera, onClickCamera });
  useEffect(() => {
    callbacksRef.current = { onHoverCamera, onClickCamera };
  }, [onHoverCamera, onClickCamera]);

  // 画布尺寸随 cubeSize 自适应放大，留足顶部白炮长焦与底部三脚架空间
  const canvasWidth = Math.round(cubeSize * 2.55);
  const canvasHeight = Math.round(cubeSize * 2.45);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(
      34,
      canvasWidth / canvasHeight,
      0.1,
      100
    );
    camera.position.set(0, 0.22, 9.1);
    camera.lookAt(0, 0.08, 0);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(canvasWidth, canvasHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // =========================================================================
    // 1. 影棚灯光系统（还原参考图的柔和暖白侧逆光 + 顶光 + 冷灰暗部立体层次）
    // =========================================================================
    const ambientLight = new THREE.AmbientLight(0xf3f4f8, 1.35);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0xcbd5e1, 1.25);
    hemiLight.position.set(0, 6, 2);
    scene.add(hemiLight);

    // 主柔光箱（右上前方向）
    const mainDirLight = new THREE.DirectionalLight(0xfffaf0, 2.6);
    mainDirLight.position.set(4.5, 6.5, 5.5);
    mainDirLight.castShadow = true;
    mainDirLight.shadow.mapSize.width = 1024;
    mainDirLight.shadow.mapSize.height = 1024;
    scene.add(mainDirLight);

    // 左侧暖色轮廓光（照亮左边卡片机 CCD 金属机身与白炮左侧边缘）
    const leftRimLight = new THREE.DirectionalLight(0xffedd5, 1.95);
    leftRimLight.position.set(-5.5, 2.8, 3.8);
    scene.add(leftRimLight);

    // 右侧暖色轮廓光（照亮右边单反镜头与闪光灯）
    const rightRimLight = new THREE.DirectionalLight(0xffedd5, 1.85);
    rightRimLight.position.set(5.8, 2.2, 3.2);
    scene.add(rightRimLight);

    // 顶部聚光（照亮长焦白炮与相机顶盖金属细节）
    const topSpotLight = new THREE.DirectionalLight(0xffffff, 1.6);
    topSpotLight.position.set(0, 8, 2);
    scene.add(topSpotLight);

    // =========================================================================
    // 2. PBR 物理材质库（拉丝银铝、米白炮漆、哑光黑橡胶、荔枝纹黑皮、镀膜光学玻璃）
    // =========================================================================
    const brushedSilverMat = new THREE.MeshStandardMaterial({
      color: 0xc8ccd2,
      metalness: 0.78,
      roughness: 0.28,
    });

    const champagneSilverMat = new THREE.MeshStandardMaterial({
      color: 0xbec2c8,
      metalness: 0.72,
      roughness: 0.32,
    });

    const chromeMat = new THREE.MeshStandardMaterial({
      color: 0xeff2f7,
      metalness: 0.94,
      roughness: 0.12,
    });

    const darkGunmetalMat = new THREE.MeshStandardMaterial({
      color: 0x262930,
      metalness: 0.62,
      roughness: 0.42,
    });

    const matteBlackMat = new THREE.MeshStandardMaterial({
      color: 0x17181c,
      metalness: 0.22,
      roughness: 0.76,
    });

    const rubberGripMat = new THREE.MeshStandardMaterial({
      color: 0x121316,
      metalness: 0.08,
      roughness: 0.88,
    });

    const telephotoWhiteMat = new THREE.MeshStandardMaterial({
      color: 0xe6e3dc,
      metalness: 0.16,
      roughness: 0.34,
    });

    const orangeAccentMat = new THREE.MeshStandardMaterial({
      color: 0xea580c,
      metalness: 0.25,
      roughness: 0.35,
      emissive: 0x9a3412,
      emissiveIntensity: 0.35,
    });

    const redAfLightMat = new THREE.MeshStandardMaterial({
      color: 0xdc2626,
      metalness: 0.2,
      roughness: 0.25,
      emissive: 0xef4444,
      emissiveIntensity: 0.65,
    });

    // 三个镜头的光学玻璃材质（支持悬停时独立发光变亮）
    const createLensGlassMat = () =>
      new THREE.MeshPhysicalMaterial({
        color: 0x111927,
        emissive: 0xfffbeb,
        emissiveIntensity: 0.0,
        metalness: 0.15,
        roughness: 0.06,
        clearcoat: 1.0,
        clearcoatRoughness: 0.04,
        reflectivity: 1.0,
      });

    const ccdLensGlassMat = createLensGlassMat();
    const dslrLensGlassMat = createLensGlassMat();
    const teleLensGlassMat = createLensGlassMat();

    const flashDiffuserTex = createFresnelDiffuserTexture();
    const flashDiffuserMat = new THREE.MeshStandardMaterial({
      map: flashDiffuserTex,
      color: 0xffffff,
      emissive: 0xfffbeb,
      emissiveIntensity: 0.18,
      roughness: 0.22,
      metalness: 0.05,
    });

    // =========================================================================
    // 3. 组装总模型根节点 rigRoot
    // =========================================================================
    const rigRoot = new THREE.Group();
    scene.add(rigRoot);

    // 用于射线检测的三个可交互相机分组
    const ccdHitGroup = new THREE.Group();
    const dslrHitGroup = new THREE.Group();
    const teleHitGroup = new THREE.Group();

    // -------------------------------------------------------------------------
    // A. 底部三脚架与中轴立柱 + 左侧弯曲电源线 (Tripod & Central Stand)
    // -------------------------------------------------------------------------
    const tripodGroup = new THREE.Group();
    rigRoot.add(tripodGroup);

    // 底部圆盘底座
    const baseDisc = new THREE.Mesh(
      new THREE.CylinderGeometry(0.54, 0.56, 0.09, 48),
      darkGunmetalMat
    );
    baseDisc.position.set(0, -2.28, 0);
    tripodGroup.add(baseDisc);

    // 下段深灰金属中轴柱
    const lowerColumn = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24, 0.24, 0.96, 48),
      darkGunmetalMat
    );
    lowerColumn.position.set(0, -1.78, 0);
    tripodGroup.add(lowerColumn);

    // 三脚架套环座 (Leg Collar Ring)
    const legCollar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.37, 0.37, 0.22, 48),
      matteBlackMat
    );
    legCollar.position.set(0, -1.32, 0);
    tripodGroup.add(legCollar);

    // 中段银灰金属立柱 + 黑色锁紧环
    const midSilverColumn = new THREE.Mesh(
      new THREE.CylinderGeometry(0.26, 0.26, 0.44, 48),
      champagneSilverMat
    );
    midSilverColumn.position.set(0, -0.96, 0);
    tripodGroup.add(midSilverColumn);

    const upperBlackCollar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.29, 0.29, 0.18, 48),
      matteBlackMat
    );
    upperBlackCollar.position.set(0, -0.66, 0);
    tripodGroup.add(upperBlackCollar);

    // 三根支撑脚（精确复刻参考图：一根朝左前偏中，一根朝左外侧，一根朝右外侧）
    const legAngles = [-1.18, -0.22, 1.08];
    legAngles.forEach((yaw) => {
      const legPivot = new THREE.Group();
      legPivot.position.set(0, -1.32, 0);
      legPivot.rotation.y = yaw;

      const legStrut = new THREE.Mesh(
        new THREE.BoxGeometry(0.13, 1.48, 0.09),
        darkGunmetalMat
      );
      legStrut.position.set(0, -0.52, 0.62);
      legStrut.rotation.x = -0.84; // 向外斜撑约 48°
      legPivot.add(legStrut);

      // 脚垫末端小斜切块
      const legFoot = new THREE.Mesh(
        new THREE.BoxGeometry(0.14, 0.08, 0.18),
        rubberGripMat
      );
      legFoot.position.set(0, -1.0, 1.15);
      legPivot.add(legFoot);

      tripodGroup.add(legPivot);
    });

    // 左侧弯曲黑色电缆线（从三脚架后侧顺着桌面自然蜿蜒向左延伸）
    const cableCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.15, -1.62, -0.18),
      new THREE.Vector3(-0.75, -2.02, -0.25),
      new THREE.Vector3(-1.55, -2.26, -0.12),
      new THREE.Vector3(-2.65, -2.3, 0.18),
      new THREE.Vector3(-4.2, -2.31, 0.35),
    ]);
    const cableGeo = new THREE.TubeGeometry(cableCurve, 40, 0.042, 16, false);
    const cableMesh = new THREE.Mesh(cableGeo, rubberGripMat);
    tripodGroup.add(cableMesh);

    // -------------------------------------------------------------------------
    // B. 中央三通银灰金属机械节点 (Central 3-Way Machined Hub)
    // -------------------------------------------------------------------------
    const hubGroup = new THREE.Group();
    hubGroup.position.set(0, -0.12, 0);
    rigRoot.add(hubGroup);

    // 中央主圆柱体
    const hubCore = new THREE.Mesh(
      new THREE.CylinderGeometry(0.36, 0.36, 0.92, 48),
      champagneSilverMat
    );
    hubGroup.add(hubCore);

    // 上下装饰金属环槽
    const hubTopRing = new THREE.Mesh(
      new THREE.CylinderGeometry(0.38, 0.38, 0.14, 48),
      brushedSilverMat
    );
    hubTopRing.position.set(0, 0.34, 0);
    hubGroup.add(hubTopRing);

    const hubBotRing = new THREE.Mesh(
      new THREE.CylinderGeometry(0.38, 0.38, 0.14, 48),
      brushedSilverMat
    );
    hubBotRing.position.set(0, -0.34, 0);
    hubGroup.add(hubBotRing);

    // 正面突出的圆形银色锁紧旋钮（参考图正中央标志性圆钮）
    const frontKnob = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.2, 0.32, 40),
      brushedSilverMat
    );
    frontKnob.rotation.x = Math.PI / 2;
    frontKnob.position.set(0, -0.02, 0.28);
    hubGroup.add(frontKnob);

    const frontKnobCap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.16, 0.04, 40),
      chromeMat
    );
    frontKnobCap.rotation.x = Math.PI / 2;
    frontKnobCap.position.set(0, -0.02, 0.44);
    hubGroup.add(frontKnobCap);

    // 左右连接黑色机械法兰座
    const leftMountBlock = new THREE.Mesh(
      new THREE.BoxGeometry(0.38, 0.54, 0.46),
      matteBlackMat
    );
    leftMountBlock.position.set(-0.44, -0.02, 0.04);
    leftMountBlock.rotation.y = -0.52;
    hubGroup.add(leftMountBlock);

    const rightMountBlock = new THREE.Mesh(
      new THREE.BoxGeometry(0.38, 0.54, 0.46),
      matteBlackMat
    );
    rightMountBlock.position.set(0.44, -0.02, 0.04);
    rightMountBlock.rotation.y = 0.52;
    hubGroup.add(rightMountBlock);

    // -------------------------------------------------------------------------
    // C. 左边分支：复古银色卡片机 CCD (Compact Silver CCD Camera -> 'human')
    // -------------------------------------------------------------------------
    ccdHitGroup.position.set(-1.18, -0.12, 0.34);
    ccdHitGroup.rotation.y = -0.56; // 朝向左前方
    rigRoot.add(ccdHitGroup);

    // CCD 主机身（拉丝银金属长方体 + 倒角边框）
    const ccdBody = new THREE.Mesh(
      new THREE.BoxGeometry(1.42, 0.96, 0.44),
      brushedSilverMat
    );
    ccdHitGroup.add(ccdBody);

    // CCD 机身背板暗黑边框与顶盖分界线
    const ccdBackPlate = new THREE.Mesh(
      new THREE.BoxGeometry(1.44, 0.92, 0.08),
      matteBlackMat
    );
    ccdBackPlate.position.set(0, 0, -0.2);
    ccdHitGroup.add(ccdBackPlate);

    // CCD 左侧防滑竖条与标志性橙红色挂耳（参考图左端细节）
    const ccdLeftStrip = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.88, 0.46),
      champagneSilverMat
    );
    ccdLeftStrip.position.set(-0.66, 0, 0);
    ccdHitGroup.add(ccdLeftStrip);

    const ccdOrangeTab = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.13, 0.14),
      orangeAccentMat
    );
    ccdOrangeTab.position.set(-0.73, 0.02, 0.08);
    ccdHitGroup.add(ccdOrangeTab);

    // CCD 顶部快门按钮、模式转盘与凸起梯形顶饰
    const ccdTopHump = new THREE.Mesh(
      new THREE.BoxGeometry(0.48, 0.09, 0.34),
      brushedSilverMat
    );
    ccdTopHump.position.set(0.22, 0.51, 0);
    ccdHitGroup.add(ccdTopHump);

    const ccdShutterBtn = new THREE.Mesh(
      new THREE.CylinderGeometry(0.11, 0.11, 0.08, 32),
      chromeMat
    );
    ccdShutterBtn.position.set(-0.34, 0.51, 0.04);
    ccdHitGroup.add(ccdShutterBtn);

    const ccdModeDial = new THREE.Mesh(
      new THREE.CylinderGeometry(0.13, 0.13, 0.06, 32),
      champagneSilverMat
    );
    ccdModeDial.position.set(-0.06, 0.5, -0.04);
    ccdHitGroup.add(ccdModeDial);

    // CCD 左上角 OLYMPUS 铭牌与旁轴小取景窗
    const ccdBadgeMat = new THREE.MeshBasicMaterial({
      map: createCameraBrandBadgeTexture('OLYMPUS', '#C4C8CE', '#23262D'),
    });
    const ccdBadgePlane = new THREE.Mesh(
      new THREE.PlaneGeometry(0.42, 0.1),
      ccdBadgeMat
    );
    ccdBadgePlane.position.set(-0.4, 0.31, 0.225);
    ccdHitGroup.add(ccdBadgePlane);

    // CCD 正面伸缩多级镜头筒 (Telescopic Multi-Ring CCD Lens)
    const ccdLensGroup = new THREE.Group();
    ccdLensGroup.position.set(0.08, -0.03, 0.22);
    ccdLensGroup.rotation.x = Math.PI / 2;
    ccdHitGroup.add(ccdLensGroup);

    // 第 1 级银色外环
    const ccdRing1 = new THREE.Mesh(
      new THREE.CylinderGeometry(0.39, 0.42, 0.12, 48),
      brushedSilverMat
    );
    ccdRing1.position.set(0, 0.06, 0);
    ccdLensGroup.add(ccdRing1);

    // 第 2 级黑银交替环
    const ccdRing2 = new THREE.Mesh(
      new THREE.CylinderGeometry(0.34, 0.36, 0.12, 48),
      matteBlackMat
    );
    ccdRing2.position.set(0, 0.15, 0);
    ccdLensGroup.add(ccdRing2);

    // 第 3 级精密银色前环
    const ccdRing3 = new THREE.Mesh(
      new THREE.CylinderGeometry(0.31, 0.32, 0.1, 48),
      chromeMat
    );
    ccdRing3.position.set(0, 0.22, 0);
    ccdLensGroup.add(ccdRing3);

    // 第 4 级黑色内遮光内筒
    const ccdInnerBaffle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.26, 0.28, 0.08, 48),
      rubberGripMat
    );
    ccdInnerBaffle.position.set(0, 0.25, 0);
    ccdLensGroup.add(ccdInnerBaffle);

    // CCD 核心镀膜光学玻璃镜片
    const ccdGlassMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.21, 0.21, 0.04, 48),
      ccdLensGlassMat
    );
    ccdGlassMesh.position.set(0, 0.27, 0);
    ccdLensGroup.add(ccdGlassMesh);

    // -------------------------------------------------------------------------
    // D. 右边分支：带顶部外置闪光灯的复古银黑单反 (Retro DSLR + Flash -> 'animal')
    // -------------------------------------------------------------------------
    dslrHitGroup.position.set(1.26, -0.14, 0.36);
    dslrHitGroup.rotation.y = 0.54; // 朝向右前方
    rigRoot.add(dslrHitGroup);

    // 单反下半部黑色蒙皮机身
    const dslrBlackBody = new THREE.Mesh(
      new THREE.BoxGeometry(1.56, 0.84, 0.58),
      matteBlackMat
    );
    dslrBlackBody.position.set(0, -0.08, 0);
    dslrHitGroup.add(dslrBlackBody);

    // 单反金属银色顶盖与底板
    const dslrSilverTop = new THREE.Mesh(
      new THREE.BoxGeometry(1.56, 0.22, 0.58),
      brushedSilverMat
    );
    dslrSilverTop.position.set(0, 0.36, 0);
    dslrHitGroup.add(dslrSilverTop);

    const dslrSilverLeftEdge = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 0.86, 0.59),
      brushedSilverMat
    );
    dslrSilverLeftEdge.position.set(-0.66, -0.08, 0);
    dslrHitGroup.add(dslrSilverLeftEdge);

    // 单反中央银色五棱镜军舰部 (Pentaprism Housing) + OLYMPUS 铭牌
    const prismHump = new THREE.Mesh(
      new THREE.BoxGeometry(0.68, 0.24, 0.54),
      brushedSilverMat
    );
    prismHump.position.set(0.02, 0.52, 0.02);
    dslrHitGroup.add(prismHump);

    const dslrBadgeMat = new THREE.MeshBasicMaterial({
      map: createCameraBrandBadgeTexture('OLYMPUS', '#C6CACF', '#181A20'),
    });
    const dslrBadgePlane = new THREE.Mesh(
      new THREE.PlaneGeometry(0.48, 0.11),
      dslrBadgeMat
    );
    dslrBadgePlane.position.set(0.02, 0.5, 0.295);
    dslrHitGroup.add(dslrBadgePlane);

    // 单反顶部双机械转盘（黑色滚花转盘）
    const dslrLeftDial = new THREE.Mesh(
      new THREE.CylinderGeometry(0.17, 0.17, 0.14, 36),
      matteBlackMat
    );
    dslrLeftDial.position.set(-0.44, 0.53, 0.02);
    dslrHitGroup.add(dslrLeftDial);

    const dslrRightDial = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.16, 0.12, 36),
      matteBlackMat
    );
    dslrRightDial.position.set(0.52, 0.52, 0.04);
    dslrHitGroup.add(dslrRightDial);

    // 单反正面大口径黑色专业镜头筒（含 36 道立体橡胶防滑条纹）
    const dslrLensGroup = new THREE.Group();
    dslrLensGroup.position.set(0.08, -0.06, 0.29);
    dslrLensGroup.rotation.x = Math.PI / 2;
    dslrHitGroup.add(dslrLensGroup);

    const dslrLensBase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.46, 0.48, 0.22, 56),
      darkGunmetalMat
    );
    dslrLensBase.position.set(0, 0.11, 0);
    dslrLensGroup.add(dslrLensBase);

    const dslrLensBarrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.45, 0.45, 0.52, 56),
      rubberGripMat
    );
    dslrLensBarrel.position.set(0, 0.46, 0);
    dslrLensGroup.add(dslrLensBarrel);

    // 36 道真实 3D 变焦对焦环凸起条纹
    for (let i = 0; i < 36; i++) {
      const ang = (i / 36) * Math.PI * 2;
      const rib = new THREE.Mesh(
        new THREE.BoxGeometry(0.024, 0.36, 0.024),
        matteBlackMat
      );
      rib.position.set(Math.cos(ang) * 0.452, 0.46, Math.sin(ang) * 0.452);
      rib.rotation.y = -ang;
      dslrLensGroup.add(rib);
    }

    const dslrFrontRim = new THREE.Mesh(
      new THREE.CylinderGeometry(0.44, 0.45, 0.18, 56),
      matteBlackMat
    );
    dslrFrontRim.position.set(0, 0.78, 0);
    dslrLensGroup.add(dslrFrontRim);

    const dslrInnerStep = new THREE.Mesh(
      new THREE.CylinderGeometry(0.35, 0.4, 0.08, 56),
      darkGunmetalMat
    );
    dslrInnerStep.position.set(0, 0.84, 0);
    dslrLensGroup.add(dslrInnerStep);

    const dslrGlassMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.29, 0.29, 0.05, 48),
      dslrLensGlassMat
    );
    dslrGlassMesh.position.set(0, 0.86, 0);
    dslrLensGroup.add(dslrGlassMesh);

    // 单反顶部：外置闪光灯模组 (External Hot-Shoe Flash Unit)
    const flashGroup = new THREE.Group();
    flashGroup.position.set(0.02, 0.68, 0.02);
    dslrHitGroup.add(flashGroup);

    // 闪光灯热靴底座 + 红色对焦辅助灯窗（参考图关键细节）
    const flashFoot = new THREE.Mesh(
      new THREE.BoxGeometry(0.38, 0.24, 0.38),
      matteBlackMat
    );
    flashFoot.position.set(0, 0.08, 0);
    flashGroup.add(flashFoot);

    const redAfWindow = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.09, 0.04),
      redAfLightMat
    );
    redAfWindow.position.set(0.03, 0.08, 0.19);
    flashGroup.add(redAfWindow);

    // 闪光灯主灯头外壳
    const flashHead = new THREE.Mesh(
      new THREE.BoxGeometry(0.98, 0.64, 0.58),
      darkGunmetalMat
    );
    flashHead.position.set(0.02, 0.5, 0.04);
    flashGroup.add(flashHead);

    // 闪光灯左侧铰接转轴圆盖
    const flashSideHinge = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.22, 0.08, 36),
      matteBlackMat
    );
    flashSideHinge.rotation.z = Math.PI / 2;
    flashSideHinge.position.set(-0.49, 0.46, 0.02);
    flashGroup.add(flashSideHinge);

    // 闪光灯正面黑色内凹框与白色菲涅尔发光灯罩
    const flashFrontBezel = new THREE.Mesh(
      new THREE.BoxGeometry(0.76, 0.46, 0.06),
      matteBlackMat
    );
    flashFrontBezel.position.set(0.06, 0.51, 0.31);
    flashGroup.add(flashFrontBezel);

    const flashDiffuserPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(0.68, 0.38),
      flashDiffuserMat
    );
    flashDiffuserPlane.position.set(0.06, 0.51, 0.345);
    flashGroup.add(flashDiffuserPlane);

    // -------------------------------------------------------------------------
    // E. 顶部分支：白色长焦大炮镜头 (Tall White & Black Telephoto Lens -> 'landscape')
    // -------------------------------------------------------------------------
    teleHitGroup.position.set(-0.04, 0.36, 0.02);
    // 还原参考图中长焦镜头略微向左上/前倾的立体姿态
    teleHitGroup.rotation.z = 0.085;
    teleHitGroup.rotation.x = 0.22;
    rigRoot.add(teleHitGroup);

    // 1. 底部黑色金属卡口环
    const teleMount = new THREE.Mesh(
      new THREE.CylinderGeometry(0.36, 0.34, 0.24, 56),
      matteBlackMat
    );
    teleMount.position.set(0, 0.12, 0);
    teleHitGroup.add(teleMount);

    // 2. 下段米白色金属镜身（含对焦距离窗与黑色开关点）
    const teleLowerWhite = new THREE.Mesh(
      new THREE.CylinderGeometry(0.43, 0.39, 0.52, 64),
      telephotoWhiteMat
    );
    teleLowerWhite.position.set(0, 0.48, 0);
    teleHitGroup.add(teleLowerWhite);

    // 镜身黑色拨杆小细节
    const teleSwitch1 = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.12, 0.06),
      matteBlackMat
    );
    teleSwitch1.position.set(-0.36, 0.46, 0.21);
    teleSwitch1.rotation.y = -0.5;
    teleHitGroup.add(teleSwitch1);

    const teleDot = new THREE.Mesh(
      new THREE.SphereGeometry(0.025, 16, 16),
      matteBlackMat
    );
    teleDot.position.set(0.02, 0.38, 0.41);
    teleHitGroup.add(teleDot);

    // 3. 中段宽体黑色防滑橡胶变焦环（含 44 道纵向立体防滑槽）
    const teleZoomRing = new THREE.Mesh(
      new THREE.CylinderGeometry(0.45, 0.435, 0.56, 64),
      rubberGripMat
    );
    teleZoomRing.position.set(0, 0.98, 0);
    teleHitGroup.add(teleZoomRing);

    for (let i = 0; i < 44; i++) {
      const ang = (i / 44) * Math.PI * 2;
      const rib = new THREE.Mesh(
        new THREE.BoxGeometry(0.022, 0.48, 0.022),
        matteBlackMat
      );
      rib.position.set(Math.cos(ang) * 0.448, 0.98, Math.sin(ang) * 0.448);
      rib.rotation.y = -ang;
      teleHitGroup.add(rib);
    }

    // 4. 上段米白色主镜筒（带精细银灰分界凹槽）
    const teleUpperWhite1 = new THREE.Mesh(
      new THREE.CylinderGeometry(0.465, 0.45, 0.42, 64),
      telephotoWhiteMat
    );
    teleUpperWhite1.position.set(0, 1.46, 0);
    teleHitGroup.add(teleUpperWhite1);

    const teleSeamRing = new THREE.Mesh(
      new THREE.CylinderGeometry(0.468, 0.468, 0.03, 64),
      champagneSilverMat
    );
    teleSeamRing.position.set(0, 1.68, 0);
    teleHitGroup.add(teleSeamRing);

    const teleUpperWhite2 = new THREE.Mesh(
      new THREE.CylinderGeometry(0.475, 0.465, 0.36, 64),
      telephotoWhiteMat
    );
    teleUpperWhite2.position.set(0, 1.86, 0);
    teleHitGroup.add(teleUpperWhite2);

    // 5. 顶部黑色前口遮光圈与多层内凹光学镜片
    const teleTopBlackHood = new THREE.Mesh(
      new THREE.CylinderGeometry(0.485, 0.475, 0.24, 64),
      matteBlackMat
    );
    teleTopBlackHood.position.set(0, 2.15, 0);
    teleHitGroup.add(teleTopBlackHood);

    const teleInnerBaffle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.41, 0.45, 0.08, 64),
      darkGunmetalMat
    );
    teleInnerBaffle.position.set(0, 2.24, 0);
    teleHitGroup.add(teleInnerBaffle);

    const teleGlassMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.35, 0.35, 0.04, 56),
      teleLensGlassMat
    );
    teleGlassMesh.position.set(0, 2.26, 0);
    teleHitGroup.add(teleGlassMesh);

    // 为三个相机组内所有 Mesh 标记所属 category，供 Three.js Raycaster 精准识别
    ccdHitGroup.traverse((obj) => {
      obj.userData.category = 'human';
    });
    dslrHitGroup.traverse((obj) => {
      obj.userData.category = 'animal';
    });
    teleHitGroup.traverse((obj) => {
      obj.userData.category = 'landscape';
    });

    const interactableObjects = [ccdHitGroup, dslrHitGroup, teleHitGroup];
    const raycaster = new THREE.Raycaster();
    const pointerNdc = new THREE.Vector2();

    // =========================================================================
    // 4. 鼠标射线检测（悬停与点击任意一个 3D 相机/镜头）
    // =========================================================================
    const getHitCategory = (clientX: number, clientY: number): FaceCategory | null => {
      const rect = renderer.domElement.getBoundingClientRect();
      if (
        clientX < rect.left ||
        clientX > rect.right ||
        clientY < rect.top ||
        clientY > rect.bottom
      ) {
        return null;
      }
      pointerNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      pointerNdc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointerNdc, camera);
      const intersects = raycaster.intersectObjects(interactableObjects, true);
      if (intersects.length > 0) {
        const hitCat = intersects[0].object.userData.category as
          | FaceCategory
          | undefined;
        return hitCat || null;
      }
      return null;
    };

    const handlePointerMove = (e: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      stateRef.current.mouseX = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      stateRef.current.mouseY = ((e.clientY - rect.top) / rect.height - 0.5) * 2;

      if (stateRef.current.turningCategory || stateRef.current.rushingCategory) {
        return;
      }
      const hitCat = getHitCategory(e.clientX, e.clientY);
      renderer.domElement.style.cursor = hitCat ? 'pointer' : 'default';
      if (hitCat !== stateRef.current.hoveredCategory) {
        callbacksRef.current.onHoverCamera(hitCat);
      }
    };

    const handlePointerLeave = () => {
      renderer.domElement.style.cursor = 'default';
      if (
        !stateRef.current.turningCategory &&
        !stateRef.current.rushingCategory &&
        stateRef.current.hoveredCategory !== null
      ) {
        callbacksRef.current.onHoverCamera(null);
      }
    };

    const handleClick = (e: MouseEvent) => {
      if (stateRef.current.turningCategory || stateRef.current.rushingCategory) {
        return;
      }
      const hitCat = getHitCategory(e.clientX, e.clientY);
      if (hitCat) {
        e.stopPropagation();
        callbacksRef.current.onClickCamera(hitCat);
      }
    };

    const domElem = renderer.domElement;
    domElem.addEventListener('pointermove', handlePointerMove);
    domElem.addEventListener('pointerleave', handlePointerLeave);
    domElem.addEventListener('click', handleClick);

    // =========================================================================
    // 5. 60/120 FPS 实时渲染与平滑镜头转正/发光插值循环
    // =========================================================================
    let animFrameId = 0;
    const currentPos = new THREE.Vector3(0, -0.05, 0);
    const currentRot = new THREE.Vector3(0, 0, 0);
    let currentScale = 1.0;

    const animate = () => {
      animFrameId = requestAnimationFrame(animate);

      const {
        hoveredCategory: hov,
        turningCategory: turn,
        rushingCategory: rush,
        mouseX,
        mouseY,
      } = stateRef.current;

      const activeCat = rush || turn || hov;

      // 1) 更新三个镜头玻璃与闪光灯的发光光晕强度
      const targetCcdGlow = activeCat === 'human' ? 2.4 : 0.02;
      const targetDslrGlow = activeCat === 'animal' ? 2.4 : 0.02;
      const targetFlashGlow = activeCat === 'animal' ? 1.65 : 0.18;
      const targetTeleGlow = activeCat === 'landscape' ? 2.4 : 0.02;

      ccdLensGlassMat.emissiveIntensity +=
        (targetCcdGlow - ccdLensGlassMat.emissiveIntensity) * 0.18;
      dslrLensGlassMat.emissiveIntensity +=
        (targetDslrGlow - dslrLensGlassMat.emissiveIntensity) * 0.18;
      flashDiffuserMat.emissiveIntensity +=
        (targetFlashGlow - flashDiffuserMat.emissiveIntensity) * 0.18;
      teleLensGlassMat.emissiveIntensity +=
        (targetTeleGlow - teleLensGlassMat.emissiveIntensity) * 0.18;

      // 2) 计算 3D 云台的目标姿态：
      // - 正常状态：保持参考图的标志性三向角度 + 随鼠标微幅视差呼吸
      // - 点击某个相机后（turningCategory / rushingCategory）：将该相机的镜头精准转正至正对屏幕并推进放大！
      let targetPosX = 0;
      let targetPosY = -0.08;
      let targetPosZ = 0;
      let targetRotX = mouseY * 0.05;
      let targetRotY = mouseX * 0.08;
      let targetRotZ = 0;
      let targetScale = 1.0;

      const focusCat = rush || turn;
      if (focusCat === 'human') {
        // 将左边卡片机 CCD 旋转至正对屏幕中央
        targetRotX = 0;
        targetRotY = 0.56;
        targetRotZ = 0;
        targetPosX = 0.92;
        targetPosY = 0.12;
        targetPosZ = rush ? 2.8 : 0.65;
        targetScale = rush ? 1.65 : 1.08;
      } else if (focusCat === 'animal') {
        // 将右边带闪光灯单反旋转至正对屏幕中央
        targetRotX = 0;
        targetRotY = -0.54;
        targetRotZ = 0;
        targetPosX = -1.02;
        targetPosY = 0.12;
        targetPosZ = rush ? 2.8 : 0.65;
        targetScale = rush ? 1.65 : 1.08;
      } else if (focusCat === 'landscape') {
        // 将顶部白色长焦大炮镜头俯仰转正至正对屏幕中央
        targetRotX = 1.35;
        targetRotY = 0;
        targetRotZ = -0.085;
        targetPosX = 0.04;
        targetPosY = -0.15;
        targetPosZ = rush ? 2.6 : 0.65;
        targetScale = rush ? 1.6 : 1.08;
      }

      const damping = rush ? 0.12 : turn ? 0.14 : 0.1;
      currentPos.x += (targetPosX - currentPos.x) * damping;
      currentPos.y += (targetPosY - currentPos.y) * damping;
      currentPos.z += (targetPosZ - currentPos.z) * damping;

      currentRot.x += (targetRotX - currentRot.x) * damping;
      currentRot.y += (targetRotY - currentRot.y) * damping;
      currentRot.z += (targetRotZ - currentRot.z) * damping;

      currentScale += (targetScale - currentScale) * damping;

      rigRoot.position.copy(currentPos);
      rigRoot.rotation.set(currentRot.x, currentRot.y, currentRot.z);
      rigRoot.scale.setScalar(currentScale);

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animFrameId);
      domElem.removeEventListener('pointermove', handlePointerMove);
      domElem.removeEventListener('pointerleave', handlePointerLeave);
      domElem.removeEventListener('click', handleClick);
      renderer.dispose();
    };
  }, [canvasWidth, canvasHeight]);

  return (
    <div
      ref={mountRef}
      style={{
        width: canvasWidth,
        height: canvasHeight,
      }}
      className="relative flex items-center justify-center select-none"
    />
  );
};
