import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { VRM } from '@pixiv/three-vrm';

export type FocusTarget = 'hands' | 'leftHand' | 'rightHand' | 'upper' | 'full';
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
  public currentFocus: FocusTarget = 'upper';
  public currentAngle: ViewAngle = 'normal';

  constructor(container: HTMLElement) {
    this.container = container;
    this.clock = new THREE.Clock();

    // 1. Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x131418);

    // 2. Camera
    const aspect = container.clientWidth / (container.clientHeight || 1);
    this.camera = new THREE.PerspectiveCamera(40, aspect, 0.1, 50.0);
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
    this.controls.minDistance = 0.05;
    this.controls.maxDistance = 15.0;
    this.controls.maxPolarAngle = Math.PI / 2 + 0.2;

    // 5. Lights
    this.setupLights();

    // 6. Grid Helper
    this.gridHelper = new THREE.GridHelper(10, 20, 0xff6584, 0x2d313f);
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
  private getBoneWorldPosition(boneName: 'leftHand' | 'rightHand' | 'head' | 'hips'): THREE.Vector3 {
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
        this.controls.target.copy(handPos);
        if (isTop) {
          // 左手の真上
          this.camera.position.set(handPos.x, handPos.y + 0.38, handPos.z + 0.001);
        } else {
          // 左手の斜め正面アップ
          this.camera.position.set(handPos.x, handPos.y + 0.06, handPos.z + 0.32);
        }
        break;
      }
      case 'rightHand': {
        const handPos = this.getBoneWorldPosition('rightHand');
        this.controls.target.copy(handPos);
        if (isTop) {
          // 右手の真上
          this.camera.position.set(handPos.x, handPos.y + 0.38, handPos.z + 0.001);
        } else {
          // 右手の斜め正面アップ
          this.camera.position.set(handPos.x, handPos.y + 0.06, handPos.z + 0.32);
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
  public focusOnPoint(targetPosition: THREE.Vector3, distance = 0.16): void {
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
