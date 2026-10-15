import * as THREE from 'three';
import { VRM } from '@pixiv/three-vrm';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { VRMAnimationLoaderPlugin, createVRMAnimationClip, VRMAnimation } from '@pixiv/three-vrm-animation';

export type PoseCategory = 'all' | 'salon' | 'face' | 'cute' | 'basic';

export type PoseType =
  | 'tpose'
  | 'nail'
  | 'photoRight'
  | 'photoLeft'
  | 'photoBoth'
  | 'salonCupped'
  | 'salonChestCross'
  | 'salonMouthOverlap'
  | 'faceFrame'
  | 'faceCheekRest'
  | 'faceCheekTouch'
  | 'faceTriangle'
  | 'cuteCatClaw'
  | 'cutePrayer'
  | 'cuteLipTouch';

export interface PoseInfo {
  id: PoseType;
  labelKey: string;
  category: PoseCategory;
  icon: string;
  cameraFocus: 'right' | 'left' | 'both' | 'face';
}

export const POSE_LIST: PoseInfo[] = [
  // サロン・両手見せ系
  { id: 'salonCupped', labelKey: 'poses.salonCupped', category: 'salon', icon: '', cameraFocus: 'both' },
  { id: 'salonChestCross', labelKey: 'poses.salonChestCross', category: 'salon', icon: '', cameraFocus: 'both' },
  { id: 'salonMouthOverlap', labelKey: 'poses.salonMouthOverlap', category: 'salon', icon: '', cameraFocus: 'both' },
  { id: 'photoBoth', labelKey: 'poses.photoBoth', category: 'salon', icon: '', cameraFocus: 'both' },
  { id: 'photoRight', labelKey: 'poses.photoRight', category: 'salon', icon: '', cameraFocus: 'right' },
  { id: 'photoLeft', labelKey: 'poses.photoLeft', category: 'salon', icon: '', cameraFocus: 'left' },

  // フェイス＆チーク系
  { id: 'faceFrame', labelKey: 'poses.faceFrame', category: 'face', icon: '', cameraFocus: 'face' },
  { id: 'faceCheekRest', labelKey: 'poses.faceCheekRest', category: 'face', icon: '', cameraFocus: 'face' },
  { id: 'faceCheekTouch', labelKey: 'poses.faceCheekTouch', category: 'face', icon: '', cameraFocus: 'face' },
  { id: 'faceTriangle', labelKey: 'poses.faceTriangle', category: 'face', icon: '', cameraFocus: 'face' },

  // キュート・仕草系
  { id: 'cuteCatClaw', labelKey: 'poses.cuteCatClaw', category: 'cute', icon: '', cameraFocus: 'both' },
  { id: 'cutePrayer', labelKey: 'poses.cutePrayer', category: 'cute', icon: '', cameraFocus: 'both' },
  { id: 'cuteLipTouch', labelKey: 'poses.cuteLipTouch', category: 'cute', icon: '', cameraFocus: 'face' },

  // 基本
  { id: 'nail', labelKey: 'poses.nail', category: 'basic', icon: '', cameraFocus: 'right' },
  { id: 'tpose', labelKey: 'poses.tpose', category: 'basic', icon: '', cameraFocus: 'both' },
];

export class VRMPoseManager {
  private loader: GLTFLoader;
  private animationCache: Map<string, VRMAnimation> = new Map();
  private currentMixer: THREE.AnimationMixer | null = null;
  private currentAction: THREE.AnimationAction | null = null;
  private currentPoseType: PoseType = 'tpose';

  constructor() {
    this.loader = new GLTFLoader();
    this.loader.register((parser) => new VRMAnimationLoaderPlugin(parser));
  }

  /**
   * .vrma アニメーションファイルを読み込み、キャッシュする
   */
  public async loadVRMA(url: string): Promise<VRMAnimation | null> {
    const cached = this.animationCache.get(url);
    if (cached) {
      return cached;
    }

    try {
      const gltf = await this.loader.loadAsync(url);
      const vrmAnimations: VRMAnimation[] | undefined = gltf.userData.vrmAnimations;
      if (vrmAnimations && vrmAnimations.length > 0) {
        const anim = vrmAnimations[0];
        this.animationCache.set(url, anim);
        return anim;
      }
      return null;
    } catch (err) {
      console.error(`[VRMPoseManager] Failed to load VRMA: ${url}`, err);
      return null;
    }
  }

  /**
   * ポーズを適用する
   */
  public async applyPose(vrm: VRM, poseType: PoseType): Promise<void> {
    this.currentPoseType = poseType;

    // 既存のアニメーションを停止・解除
    this.stopAnimation(vrm);

    if (poseType === 'tpose') {
      this.resetToTPose(vrm);
      return;
    }

    if (poseType === 'nail') {
      // 作業用の手開きポーズ（ボーン直指定）
      this.applyNailInspectionPose(vrm);
      return;
    }

    // VRMA ファイル名のマッピング
    const vrmaFileMap: Partial<Record<PoseType, string>> = {
      photoRight: 'nail_photo_right.vrma',
      photoLeft: 'nail_photo_left.vrma',
      photoBoth: 'nail_photo_both.vrma',
      salonCupped: 'salon_cupped.vrma',
      salonChestCross: 'salon_chest_cross.vrma',
      salonMouthOverlap: 'salon_mouth_overlap.vrma',
      faceFrame: 'face_frame.vrma',
      faceCheekRest: 'face_cheek_rest.vrma',
      faceCheekTouch: 'face_cheek_touch.vrma',
      faceTriangle: 'face_triangle.vrma',
      cuteCatClaw: 'cute_cat_claw.vrma',
      cutePrayer: 'cute_prayer.vrma',
      cuteLipTouch: 'cute_lip_touch.vrma',
    };

    const fileName = vrmaFileMap[poseType];
    if (!fileName) return;

    const vrmaFile = `${process.env.BASE_URL || ''}models/poses/${fileName}`;

    // 先に T-Pose にリセットしてから VRMA をバインド
    this.resetToTPose(vrm);

    const vrmAnim = await this.loadVRMA(vrmaFile);
    if (!vrmAnim) {
      console.warn(`[VRMPoseManager] VRMA not loaded: ${vrmaFile}`);
      return;
    }

    // VRMC_vrm_animation を対象 VRM インスタンス用の AnimationClip に変換
    const clip = createVRMAnimationClip(vrmAnim, vrm);
    clip.name = poseType;

    const mixer = new THREE.AnimationMixer(vrm.scene);
    const action = mixer.clipAction(clip);
    action.setLoop(THREE.LoopOnce, 1);
    action.clampWhenFinished = true;
    action.play();

    // 静止ポーズとして t=0 を評価・適用
    mixer.setTime(0);
    mixer.update(0);
    vrm.update(0);

    this.currentMixer = mixer;
    this.currentAction = action;
  }

  /**
   * フレーム毎の更新（アニメーション進行時用）
   */
  public update(delta: number): void {
    if (this.currentMixer) {
      this.currentMixer.update(delta);
    }
  }

  /**
   * アニメーションを停止しミキサーを解放
   */
  public stopAnimation(vrm: VRM): void {
    if (this.currentAction) {
      this.currentAction.stop();
      this.currentAction = null;
    }
    if (this.currentMixer) {
      this.currentMixer.stopAllAction();
      this.currentMixer.uncacheRoot(vrm.scene);
      this.currentMixer = null;
    }
  }

  /**
   * T-Pose に完全リセット
   */
  public resetToTPose(vrm: VRM): void {
    if (!vrm.humanoid) return;
    const allBones = [
      'hips', 'spine', 'chest', 'upperChest', 'neck', 'head',
      'leftShoulder', 'leftUpperArm', 'leftLowerArm', 'leftHand',
      'rightShoulder', 'rightUpperArm', 'rightLowerArm', 'rightHand',
      'leftUpperLeg', 'leftLowerLeg', 'leftFoot', 'leftToes',
      'rightUpperLeg', 'rightLowerLeg', 'rightFoot', 'rightToes',
      'leftThumbMetacarpal', 'leftThumbProximal', 'leftThumbDistal',
      'leftIndexProximal', 'leftIndexIntermediate', 'leftIndexDistal',
      'leftMiddleProximal', 'leftMiddleIntermediate', 'leftMiddleDistal',
      'leftRingProximal', 'leftRingIntermediate', 'leftRingDistal',
      'leftLittleProximal', 'leftLittleIntermediate', 'leftLittleDistal',
      'rightThumbMetacarpal', 'rightThumbProximal', 'rightThumbDistal',
      'rightIndexProximal', 'rightIndexIntermediate', 'rightIndexDistal',
      'rightMiddleProximal', 'rightMiddleIntermediate', 'rightMiddleDistal',
      'rightRingProximal', 'rightRingIntermediate', 'rightRingDistal',
      'rightLittleProximal', 'rightLittleIntermediate', 'rightLittleDistal'
    ] as const;

    for (const boneName of allBones) {
      const bone = vrm.humanoid.getNormalizedBoneNode(boneName as any);
      if (bone) {
        bone.rotation.set(0, 0, 0);
      }
    }
  }

  /**
   * ネイル編集作業用の手開きポーズ
   */
  private applyNailInspectionPose(vrm: VRM): void {
    if (!vrm.humanoid) return;
    this.resetToTPose(vrm);

    const rawMeta = vrm.meta as any;
    const isV1 = rawMeta?.metaVersion === '1' || ('name' in (rawMeta || {}) && 'authors' in (rawMeta || {}));

    const leftUpperArm = vrm.humanoid.getNormalizedBoneNode('leftUpperArm');
    const rightUpperArm = vrm.humanoid.getNormalizedBoneNode('rightUpperArm');
    const leftLowerArm = vrm.humanoid.getNormalizedBoneNode('leftLowerArm');
    const rightLowerArm = vrm.humanoid.getNormalizedBoneNode('rightLowerArm');

    if (isV1) {
      if (leftUpperArm) leftUpperArm.rotation.set(0.0, -0.25, -1.05);
      if (rightUpperArm) rightUpperArm.rotation.set(0.0, 0.25, 1.05);
      if (leftLowerArm) leftLowerArm.rotation.set(0.0, -0.65, 0.0);
      if (rightLowerArm) rightLowerArm.rotation.set(0.0, 0.65, 0.0);
    } else {
      if (leftUpperArm) leftUpperArm.rotation.set(0.0, -0.25, 1.05);
      if (rightUpperArm) rightUpperArm.rotation.set(0.0, 0.25, -1.05);
      if (leftLowerArm) leftLowerArm.rotation.set(0.0, -0.65, 0.0);
      if (rightLowerArm) rightLowerArm.rotation.set(0.0, 0.65, 0.0);
    }
  }

  public getCurrentPose(): PoseType {
    return this.currentPoseType;
  }
}
