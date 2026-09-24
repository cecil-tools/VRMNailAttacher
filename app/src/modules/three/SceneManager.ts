import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

export type CameraPreset = 'full' | 'upper' | 'hands' | 'leftHand' | 'rightHand';

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

  constructor(container: HTMLElement) {
    this.container = container;
    this.clock = new THREE.Clock();

    // 1. Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x131418);

    // 2. Camera
    const aspect = container.clientWidth / (container.clientHeight || 1);
    this.camera = new THREE.PerspectiveCamera(40, aspect, 0.1, 50.0);
    this.camera.position.set(0, 1.25, 2.2);

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
    this.controls.target.set(0, 1.1, 0);
    this.controls.minDistance = 0.1;
    this.controls.maxDistance = 15.0;
    this.controls.maxPolarAngle = Math.PI / 2 + 0.1;

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

    // Fill Light (Soft cool light from opposite side)
    const fillLight = new THREE.DirectionalLight(0xbad7f2, 0.6);
    fillLight.position.set(-2.0, 1.5, 1.0);
    this.scene.add(fillLight);

    // Rim / Back Light (Highlights hair & fingers)
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

  public setCameraPreset(preset: CameraPreset): void {
    switch (preset) {
      case 'full':
        this.camera.position.set(0, 1.0, 2.8);
        this.controls.target.set(0, 0.9, 0);
        break;
      case 'upper':
        this.camera.position.set(0, 1.25, 1.6);
        this.controls.target.set(0, 1.2, 0);
        break;
      case 'hands':
        this.camera.position.set(0, 1.2, 1.5);
        this.controls.target.set(0, 1.15, 0);
        break;
      case 'leftHand':
        this.camera.position.set(-0.6, 1.25, 0.45);
        this.controls.target.set(-0.55, 1.2, 0);
        break;
      case 'rightHand':
        this.camera.position.set(0.6, 1.25, 0.45);
        this.controls.target.set(0.55, 1.2, 0);
        break;
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
