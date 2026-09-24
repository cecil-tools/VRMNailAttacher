import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { VRM, VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';

export interface VRMModelMeta {
  title: string;
  version?: string;
  authors?: string;
  contactInformation?: string;
  thumbnailUrl?: string;
  vrmFormatVersion: '0.x' | '1.0' | 'unknown';
}

export class VRMLoader {
  private loader: GLTFLoader;
  public currentVRM: VRM | null = null;
  private currentObjectUrl: string | null = null;

  constructor() {
    this.loader = new GLTFLoader();
    this.loader.register((parser) => new VRMLoaderPlugin(parser));
  }

  /**
   * URL または Blob URL から VRM を読み込む
   */
  public async loadFromUrl(
    url: string,
    onProgress?: (progress: number) => void
  ): Promise<VRM> {
    return new Promise((resolve, reject) => {
      this.loader.load(
        url,
        (gltf) => {
          const vrm = gltf.userData.vrm as VRM;
          if (!vrm) {
            reject(new Error('VRM データの読み込みに失敗しました。'));
            return;
          }

          // VRM 0.x の向き補正
          VRMUtils.rotateVRM0(vrm);

          // メモリ上の重複結合最適化等
          VRMUtils.removeUnnecessaryVertices(gltf.scene);
          VRMUtils.removeUnnecessaryJoints(gltf.scene);

          // 影の受光・投影設定
          vrm.scene.traverse((obj) => {
            if ((obj as THREE.Mesh).isMesh) {
              obj.castShadow = true;
              obj.receiveShadow = true;
            }
          });

          this.currentVRM = vrm;
          resolve(vrm);
        },
        (progress) => {
          if (onProgress && progress.total > 0) {
            onProgress(Math.round((progress.loaded / progress.total) * 100));
          }
        },
        (error) => {
          reject(error);
        }
      );
    });
  }

  /**
   * File オブジェクトから VRM を読み込む
   */
  public async loadFromFile(
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<VRM> {
    if (this.currentObjectUrl) {
      URL.revokeObjectURL(this.currentObjectUrl);
      this.currentObjectUrl = null;
    }
    const url = URL.createObjectURL(file);
    this.currentObjectUrl = url;
    return this.loadFromUrl(url, onProgress);
  }

  /**
   * VRM のメタデータ（タイトル・作者・バージョン）を正規化して抽出
   */
  public extractMeta(vrm: VRM): VRMModelMeta {
    const rawMeta = vrm.meta as any;
    if (!rawMeta) {
      return {
        title: 'Unknown Avatar',
        vrmFormatVersion: 'unknown'
      };
    }

    // VRM 1.0 vs 0.x
    const isV1 = rawMeta.metaVersion === '1' || ('name' in rawMeta && 'authors' in rawMeta);

    return {
      title: isV1 ? rawMeta.name || 'Unnamed Avatar' : rawMeta.title || 'Unnamed Avatar',
      version: rawMeta.version || '',
      authors: isV1
        ? Array.isArray(rawMeta.authors)
          ? rawMeta.authors.join(', ')
          : rawMeta.authors || ''
        : rawMeta.author || '',
      contactInformation: rawMeta.contactInformation || '',
      thumbnailUrl: rawMeta.thumbnailImage ? rawMeta.thumbnailImage.src : undefined,
      vrmFormatVersion: isV1 ? '1.0' : '0.x'
    };
  }

  /**
   * ネイル作業に適したポーズ（両腕を少し前・下に下ろし、指をリラックスして伸ばすポーズ）を設定
   */
  public applyNailInspectionPose(vrm: VRM): void {
    if (!vrm.humanoid) return;

    // 腕を自然に下ろして少し前へ
    const leftUpperArm = vrm.humanoid.getNormalizedBoneNode('leftUpperArm');
    const rightUpperArm = vrm.humanoid.getNormalizedBoneNode('rightUpperArm');
    if (leftUpperArm) leftUpperArm.rotation.set(0.1, 0, 1.15);
    if (rightUpperArm) rightUpperArm.rotation.set(0.1, 0, -1.15);

    const leftLowerArm = vrm.humanoid.getNormalizedBoneNode('leftLowerArm');
    const rightLowerArm = vrm.humanoid.getNormalizedBoneNode('rightLowerArm');
    if (leftLowerArm) leftLowerArm.rotation.set(0.4, -0.2, 0.4);
    if (rightLowerArm) rightLowerArm.rotation.set(0.4, 0.2, -0.4);

    const leftHand = vrm.humanoid.getNormalizedBoneNode('leftHand');
    const rightHand = vrm.humanoid.getNormalizedBoneNode('rightHand');
    if (leftHand) leftHand.rotation.set(0, 0, 0);
    if (rightHand) rightHand.rotation.set(0, 0, 0);

    // 指ボーンをリセットしてまっすぐ伸ばす
    const fingerBones = [
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
    ];

    for (const boneName of fingerBones) {
      const bone = vrm.humanoid.getNormalizedBoneNode(boneName as any);
      if (bone) {
        bone.rotation.set(0, 0, 0);
      }
    }
  }

  /**
   * 前のVRMモデルの解放
   */
  public unload(vrm?: VRM): void {
    const target = vrm || this.currentVRM;
    if (!target) return;

    VRMUtils.deepDispose(target.scene);

    if (this.currentVRM === target) {
      this.currentVRM = null;
    }
    if (this.currentObjectUrl) {
      URL.revokeObjectURL(this.currentObjectUrl);
      this.currentObjectUrl = null;
    }
  }
}
