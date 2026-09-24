import * as THREE from 'three';
import { VRM, VRMHumanBoneName } from '@pixiv/three-vrm';
import { FingerId, FINGER_DEFINITIONS, ALL_FINGER_IDS } from './types';

export interface FingerBoneInfo {
  fingerId: FingerId;
  boneName: string;
  boneNode: THREE.Object3D;
  parentBoneNode: THREE.Object3D | null;
  worldPosition: THREE.Vector3;
  worldQuaternion: THREE.Quaternion;
  estimatedTipPosition: THREE.Vector3;
  direction: THREE.Vector3;
  upDirection: THREE.Vector3;
  length: number;
}

export class BoneDetector {
  /**
   * VRM モデルから指定した指のボーンノードを検出する
   */
  public static detectFingerBone(vrm: VRM, fingerId: FingerId): THREE.Object3D | null {
    const def = FINGER_DEFINITIONS[fingerId];
    if (!vrm.humanoid) return null;

    // 1. RawBoneNode（実際のレンダリング・スケルトン階層にあるボーン）を最優先で取得
    let rawBone = vrm.humanoid.getRawBoneNode(def.vrmBoneName as VRMHumanBoneName);
    if (rawBone) return rawBone;

    if (def.fallbackBoneNames) {
      for (const fallback of def.fallbackBoneNames) {
        rawBone = vrm.humanoid.getRawBoneNode(fallback as VRMHumanBoneName);
        if (rawBone) return rawBone;
      }
    }

    // 2. NormalizedBoneNode をフォールバックとして取得
    let bone = vrm.humanoid.getNormalizedBoneNode(def.vrmBoneName as VRMHumanBoneName);
    if (bone) return bone;

    if (def.fallbackBoneNames) {
      for (const fallback of def.fallbackBoneNames) {
        bone = vrm.humanoid.getNormalizedBoneNode(fallback as VRMHumanBoneName);
        if (bone) return bone;
      }
    }

    return null;
  }

  /**
   * 全 10 指のボーン情報を一括検出・幾何情報を算出
   */
  public static detectAllFingers(vrm: VRM): Map<FingerId, FingerBoneInfo> {
    const map = new Map<FingerId, FingerBoneInfo>();

    for (const fingerId of ALL_FINGER_IDS) {
      const def = FINGER_DEFINITIONS[fingerId];
      const boneNode = this.detectFingerBone(vrm, fingerId);
      if (!boneNode) continue;

      boneNode.updateWorldMatrix(true, false);
      const worldPos = new THREE.Vector3();
      const worldQuat = new THREE.Quaternion();
      boneNode.getWorldPosition(worldPos);
      boneNode.getWorldQuaternion(worldQuat);

      const parentNode = boneNode.parent;
      let length = 0.016; // デフォルト目安: 1.6cm
      const dir = new THREE.Vector3();

      if (parentNode) {
        parentNode.updateWorldMatrix(true, false);
        const parentPos = new THREE.Vector3();
        parentNode.getWorldPosition(parentPos);
        dir.subVectors(worldPos, parentPos);
        const dist = dir.length();
        if (dist > 0.002) {
          length = dist * 0.75; // 末節骨の長さの目安
          dir.normalize();
        }
      }

      // もし親ボーンとの距離から方向が取れなかった場合のフォールバック
      if (dir.lengthSq() < 0.01) {
        if (def.side === 'left') {
          dir.set(1, 0, 0);
        } else {
          dir.set(-1, 0, 0);
        }
      }

      // 手ボーンから背側（爪の表面）の法線ベクトルを推定
      const dorsalDir = new THREE.Vector3(0, 1, 0);
      const handBoneName: VRMHumanBoneName = def.side === 'left' ? 'leftHand' : 'rightHand';
      const handNode = vrm.humanoid.getRawBoneNode(handBoneName);
      if (handNode) {
        handNode.updateWorldMatrix(true, false);
        const handQuat = new THREE.Quaternion();
        handNode.getWorldQuaternion(handQuat);
        dorsalDir.applyQuaternion(handQuat).normalize();
      }

      // 指先推定位置
      const estimatedTipPos = worldPos.clone().addScaledVector(dir, length);

      map.set(fingerId, {
        fingerId,
        boneName: def.vrmBoneName,
        boneNode,
        parentBoneNode: parentNode,
        worldPosition: worldPos,
        worldQuaternion: worldQuat,
        estimatedTipPosition: estimatedTipPos,
        direction: dir,
        upDirection: dorsalDir,
        length
      });
    }

    return map;
  }
}
