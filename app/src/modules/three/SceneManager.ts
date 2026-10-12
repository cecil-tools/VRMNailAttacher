import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { VRM } from '@pixiv/three-vrm';

export type FocusTarget = 'fingertip' | 'hands' | 'leftHand' | 'rightHand' | 'upper' | 'full';
export type ViewAngle = 'normal' | 'top';
export type CameraPreset = FocusTarget | 'top'; // 互換用

export class SceneManager {
  private container: HTMLElement;
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  public controls: OrbitControls;
  public gridHelper: THREE.GridHelper;

  private clock: THREE.Clock;
  private animationFrameId: number | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private updateCallbacks: Array<(delta: number) => void> = [];

  public currentVRM: VRM | null = null;
  public currentFocus: FocusTarget = 'leftHand';
  public currentAngle: ViewAngle = 'top';

  constructor(container: HTMLElement) {
    this.container = container;
    this.clock = new THREE.Clock();

    // 1. Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xfaf0f4);

    // 2. Camera
    const aspect = container.clientWidth / (container.clientHeight || 1);
    this.camera = new THREE.PerspectiveCamera(40, aspect, 0.005, 50.0);
    this.camera.position.set(0, 1.25, 1.6);

    // 3. Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    // 4. Controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.target.set(0, 1.15, 0);
    this.controls.minDistance = 0.01;
    this.controls.maxDistance = 15.0;
    this.controls.maxPolarAngle = Math.PI / 2 + 0.2;

    // 5. Lights
    this.setupLights();

    // 6. Grid Helper
    this.gridHelper = new THREE.GridHelper(10, 20, 0xff7597, 0xf0d5de);
    this.gridHelper.position.y = 0;
    this.scene.add(this.gridHelper);

    // 7. Auto Resize
    this.setupResizeObserver();

    // 8. Start Loop
    this.startLoop();
  }

  private setupLights(): void {
    // Ambient Light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    this.scene.add(ambientLight);

    // Main Key Light
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
    keyLight.position.set(1.5, 2.5, 2.0);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    this.scene.add(keyLight);

    // Fill Light
    const fillLight = new THREE.DirectionalLight(0xbad7f2, 0.6);
    fillLight.position.set(-2.0, 1.5, 1.0);
    this.scene.add(fillLight);

    // Rim / Back Light
    const rimLight = new THREE.DirectionalLight(0xffe3e3, 0.8);
    rimLight.position.set(0, 2.0, -2.5);
    this.scene.add(rimLight);
  }

  private setupResizeObserver(): void {
    this.resizeObserver = new ResizeObserver(() => {
      this.handleResize();
    });
    this.resizeObserver.observe(this.container);
  }

  public handleResize(): void {
    if (!this.container) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    if (width === 0 || height === 0) return;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  public setVRM(vrm: VRM | null): void {
    this.currentVRM = vrm;
    this.updateCamera();
  }

  /**
   * ボーンのワールド位置を取得（VRMがある場合は動的取得、ない場合はデフォルト値）
   */
  public getBoneWorldPosition(boneName: 'leftHand' | 'rightHand' | 'head' | 'hips'): THREE.Vector3 {
    const pos = new THREE.Vector3();
    if (this.currentVRM && this.currentVRM.humanoid) {
      const rawNode = this.currentVRM.humanoid.getRawBoneNode(boneName);
      if (rawNode) {
        rawNode.updateWorldMatrix(true, false);
        rawNode.getWorldPosition(pos);
        return pos;
      }
    }

    // デフォルト位置（アバター未読み込み時フォールバック）
    switch (boneName) {
      case 'leftHand':
        return pos.set(-0.55, 1.25, 0);
      case 'rightHand':
        return pos.set(0.55, 1.25, 0);
      case 'head':
        return pos.set(0, 1.35, 0);
      case 'hips':
        return pos.set(0, 0.8, 0);
    }
  }

  /**
   * 部位（FocusTarget）とアングル（ViewAngle）に基づき、カメラ位置とターゲットを最適化
   */
  public updateCamera(focus?: FocusTarget, angle?: ViewAngle): void {
    if (focus) this.currentFocus = focus;
    if (angle) this.currentAngle = angle;

    const isTop = this.currentAngle === 'top';

    switch (this.currentFocus) {
      case 'leftHand': {
        const handPos = this.getBoneWorldPosition('leftHand');
        // 手首（leftHandボーン）から手の中心・指先側（+X方向）へオフセット
        const targetPos = new THREE.Vector3(handPos.x + 0.08, handPos.y, handPos.z);
        this.controls.target.copy(targetPos);
        if (isTop) {
          // 左手の真上（すべての指が収まる距離）
          this.camera.position.set(targetPos.x, targetPos.y + 0.42, targetPos.z + 0.001);
        } else {
          // 左手の斜め正面アップ
          this.camera.position.set(targetPos.x, targetPos.y + 0.10, targetPos.z + 0.42);
        }
        break;
      }
      case 'rightHand': {
        const handPos = this.getBoneWorldPosition('rightHand');
        // 手首（rightHandボーン）から手の中心・指先側（-X方向）へオフセット
        const targetPos = new THREE.Vector3(handPos.x - 0.08, handPos.y, handPos.z);
        this.controls.target.copy(targetPos);
        if (isTop) {
          // 右手の真上（すべての指が収まる距離）
          this.camera.position.set(targetPos.x, targetPos.y + 0.42, targetPos.z + 0.001);
        } else {
          // 右手の斜め正面アップ
          this.camera.position.set(targetPos.x, targetPos.y + 0.10, targetPos.z + 0.42);
        }
        break;
      }
      case 'hands': {
        const leftPos = this.getBoneWorldPosition('leftHand');
        const rightPos = this.getBoneWorldPosition('rightHand');
        const centerPos = new THREE.Vector3().addVectors(leftPos, rightPos).multiplyScalar(0.5);
        this.controls.target.copy(centerPos);

        const handDist = leftPos.distanceTo(rightPos);
        if (isTop) {
          // 両手の真上（手の距離に応じて高さを自動調整）
          const height = Math.max(0.65, handDist * 0.9);
          this.camera.position.set(centerPos.x, centerPos.y + height, centerPos.z + 0.001);
        } else {
          // 両手の正面斜めアップ
          const dist = Math.max(0.65, handDist * 0.85);
          this.camera.position.set(centerPos.x, centerPos.y + 0.12, centerPos.z + dist);
        }
        break;
      }
      case 'upper': {
        const headPos = this.getBoneWorldPosition('head');
        const targetY = headPos.y * 0.85;
        this.controls.target.set(0, targetY, 0);
        if (isTop) {
          this.camera.position.set(0, headPos.y + 1.2, 0.05);
        } else {
          this.camera.position.set(0, targetY + 0.05, 1.5);
        }
        break;
      }
      case 'full': {
        this.controls.target.set(0, 0.9, 0);
        if (isTop) {
          this.camera.position.set(0, 3.2, 0.05);
        } else {
          this.camera.position.set(0, 1.0, 2.8);
        }
        break;
      }
      case 'fingertip': {
        const targetPos = this.controls.target;
        const distance = 0.24;
        if (isTop) {
          this.camera.position.set(targetPos.x, targetPos.y + distance, targetPos.z + 0.001);
        } else {
          this.camera.position.set(
            targetPos.x,
            targetPos.y + distance * 0.35,
            targetPos.z + distance * 0.92
          );
        }
        break;
      }
    }

    this.controls.update();
  }

  /**
   * 既存の呼び出しとの互換用
   */
  public setCameraPreset(preset: CameraPreset): void {
    if (preset === 'top') {
      this.updateCamera(this.currentFocus, 'top');
    } else {
      this.updateCamera(preset, this.currentAngle);
    }
  }

  /**
   * 指定したワールド座標（指先など）へカメラターゲットと位置をズームフォーカス
   */
  public focusOnPoint(targetPosition: THREE.Vector3, distance = 0.24): void {
    this.currentFocus = 'fingertip';
    this.controls.target.copy(targetPosition);
    const isTop = this.currentAngle === 'top';
    if (isTop) {
      this.camera.position.set(targetPosition.x, targetPosition.y + distance, targetPosition.z + 0.001);
    } else {
      this.camera.position.set(
        targetPosition.x,
        targetPosition.y + distance * 0.35,
        targetPosition.z + distance * 0.92
      );
    }
    this.controls.update();
  }

  /**
   * ネイルフォト用に手元と爪全体（およびフェイス周り）が美しく中央に収まるようカメラを自動フォーカス
   */
  public focusOnHand(hand: 'right' | 'left' | 'both' | 'face' = 'right', vrm?: any): void {
    if (!vrm || !vrm.humanoid) {
      this.updateCamera(hand === 'left' ? 'leftHand' : 'rightHand', 'normal');
      return;
    }

    // 最新のボーン姿勢行列を同期
    if (vrm.scene) {
      vrm.scene.updateMatrixWorld(true);
    }

    const getHandBounds = (side: 'right' | 'left') => {
      const wristNode = vrm.humanoid.getNormalizedBoneNode(side === 'left' ? 'leftHand' : 'rightHand')
        || vrm.humanoid.getRawBoneNode(side === 'left' ? 'leftHand' : 'rightHand');
      if (!wristNode) return null;
      wristNode.updateWorldMatrix(true, false);
      const wristPos = new THREE.Vector3();
      wristNode.getWorldPosition(wristPos);

      const fingerBones = side === 'left' ? [
        'leftThumbDistal',
        'leftIndexDistal',
        'leftMiddleDistal',
        'leftRingDistal',
        'leftLittleDistal'
      ] : [
        'rightThumbDistal',
        'rightIndexDistal',
        'rightMiddleDistal',
        'rightRingDistal',
        'rightLittleDistal'
      ];

      const box = new THREE.Box3();
      box.expandByPoint(wristPos);

      let foundFingers = false;
      for (const boneName of fingerBones) {
        const bone = vrm.humanoid.getNormalizedBoneNode(boneName as any)
          || vrm.humanoid.getRawBoneNode(boneName as any);
        if (bone) {
          bone.updateWorldMatrix(true, false);
          const p = new THREE.Vector3();
          bone.getWorldPosition(p);
          box.expandByPoint(p);
          foundFingers = true;
        }
      }

      if (foundFingers) {
        // 末節骨(Distal)の先にある爪・指先（約2.5cm〜3cm）を考慮してバウンディングボックス上端を拡張
        box.max.y += 0.03;
      } else {
        // フォールバック: 手首から上方12cm
        box.expandByPoint(wristPos.clone().add(new THREE.Vector3(0, 0.12, 0)));
      }

      const center = new THREE.Vector3();
      box.getCenter(center);
      return { box, center };
    };

    if (hand === 'face') {
      const rData = getHandBounds('right');
      const lData = getHandBounds('left');
      const combinedBox = new THREE.Box3();
      if (rData) combinedBox.union(rData.box);
      if (lData) combinedBox.union(lData.box);

      const headNode = vrm.humanoid.getNormalizedBoneNode('head')
        || vrm.humanoid.getRawBoneNode('head');
      if (headNode) {
        headNode.updateWorldMatrix(true, false);
        const headPos = new THREE.Vector3();
        headNode.getWorldPosition(headPos);
        combinedBox.expandByPoint(headPos);
        combinedBox.expandByPoint(new THREE.Vector3(headPos.x, headPos.y + 0.12, headPos.z));
      }

      if (!combinedBox.isEmpty()) {
        const faceCenter = new THREE.Vector3();
        combinedBox.getCenter(faceCenter);
        this.controls.target.copy(faceCenter);

        const height = combinedBox.max.y - combinedBox.min.y;
        const width = combinedBox.max.x - combinedBox.min.x;
        const distance = Math.max(0.60, Math.max(height * 2.1, width * 1.5));

        this.camera.position.set(
          faceCenter.x,
          faceCenter.y + distance * 0.02,
          faceCenter.z + distance * 0.999
        );
        this.controls.update();
        return;
      }
    }

    if (hand === 'both') {
      const rData = getHandBounds('right');
      const lData = getHandBounds('left');
      if (rData && lData) {
        const combinedBox = new THREE.Box3();
        combinedBox.union(rData.box);
        combinedBox.union(lData.box);

        const bothCenter = new THREE.Vector3();
        combinedBox.getCenter(bothCenter);
        this.controls.target.copy(bothCenter);

        const height = combinedBox.max.y - combinedBox.min.y;
        const width = combinedBox.max.x - combinedBox.min.x;
        // 両手の幅と高さが余裕を持って収まる距離（最小0.62m）
        const distance = Math.max(0.62, Math.max(height * 2.4, width * 1.5));

        this.camera.position.set(
          bothCenter.x,
          bothCenter.y + distance * 0.02,
          bothCenter.z + distance * 0.999
        );
        this.controls.update();
        return;
      }
    }

    const handData = getHandBounds(hand === 'left' ? 'left' : 'right');
    if (!handData) {
      this.updateCamera(hand === 'left' ? 'leftHand' : 'rightHand', 'normal');
      return;
    }

    const { center, box } = handData;
    this.controls.target.copy(center);

    // 手のサイズに応じた最適な撮影距離（手と爪が上下左右に十分な余白をもって美しく収まる距離）
    const handHeight = box.max.y - box.min.y;
    // FOV 40° において手（約20cm）がフレーム高さの約50〜55%を占める距離（上下に約20〜25%ずつの優雅なマージンを確保）
    const distance = Math.max(0.48, handHeight * 2.3);

    this.camera.position.set(
      center.x,
      center.y + distance * 0.02,
      center.z + distance * 0.999
    );
    this.controls.update();
  }

  /**
   * 画面キャプチャ撮影（スナップショット）を実行
   * @param options.transparent true の場合は透過PNGとして背景を描画しない
   * @param options.hideGrid true の場合はグリッドを一時的に非表示にして撮影
   */
  public async captureScreenshot(options: {
    transparent?: boolean;
    hideGrid?: boolean;
  } = {}): Promise<{ dataUrl: string; blob: Blob }> {
    const origBackground = this.scene.background;
    const origGridVisible = this.gridHelper.visible;

    try {
      if (options.transparent) {
        this.scene.background = null;
      }
      if (options.hideGrid !== false) {
        this.gridHelper.visible = false;
      }

      // 撮影用に同期レンダリング
      this.renderer.render(this.scene, this.camera);

      // toBlob & toDataURL
      const dataUrl = this.renderer.domElement.toDataURL('image/png');
      const blob = await new Promise<Blob>((resolve, reject) => {
        this.renderer.domElement.toBlob((b) => {
          if (b) resolve(b);
          else reject(new Error('Failed to generate image blob'));
        }, 'image/png');
      });

      return { dataUrl, blob };
    } finally {
      // 復元
      this.scene.background = origBackground;
      this.gridHelper.visible = origGridVisible;
      this.renderer.render(this.scene, this.camera);
    }
  }

  public toggleGrid(visible?: boolean): boolean {
    if (visible !== undefined) {
      this.gridHelper.visible = visible;
    } else {
      this.gridHelper.visible = !this.gridHelper.visible;
    }
    return this.gridHelper.visible;
  }

  public onUpdate(callback: (delta: number) => void): void {
    this.updateCallbacks.push(callback);
  }

  public removeUpdate(callback: (delta: number) => void): void {
    this.updateCallbacks = this.updateCallbacks.filter((cb) => cb !== callback);
  }

  private startLoop(): void {
    const animate = () => {
      this.animationFrameId = requestAnimationFrame(animate);
      const delta = this.clock.getDelta();

      this.controls.update();

      for (const cb of this.updateCallbacks) {
        cb(delta);
      }

      this.renderer.render(this.scene, this.camera);
    };
    animate();
  }

  public dispose(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    this.controls.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement && this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
  }
}
