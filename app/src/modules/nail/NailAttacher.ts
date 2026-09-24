import * as THREE from 'three';
import { VRM } from '@pixiv/three-vrm';
import {
  FingerId,
  FINGER_DEFINITIONS,
  ALL_FINGER_IDS,
  NailTransform,
  FingerNailConfig
} from './types';
import { LoadedNailAsset } from './NailModelLoader';
import { BoneDetector } from './BoneDetector';

export interface AttachedFingerNail {
  fingerId: FingerId;
  boneNode: THREE.Object3D;
  anchorNode: THREE.Group;
  offsetNode: THREE.Group;
  nailAsset: LoadedNailAsset;
}

export class NailAttacher {
  private attachedMap: Map<FingerId, AttachedFingerNail> = new Map();
  private currentVRM: VRM | null = null;

  /**
   * VRM モデルに対して全ネイルをアタッチする
   */
  public attachAll(
    vrm: VRM,
    nailAssets: Map<FingerId, LoadedNailAsset>,
    configs: Record<FingerId, FingerNailConfig>
  ): void {
    // 既存のネイルをクリーンアップ
    this.detachAll();
    this.currentVRM = vrm;

    const boneInfos = BoneDetector.detectAllFingers(vrm);

    for (const fingerId of ALL_FINGER_IDS) {
      const asset = nailAssets.get(fingerId);
      const boneInfo = boneInfos.get(fingerId);
      const config = configs[fingerId];

      if (!asset || !boneInfo) {
        console.warn(`[NailAttacher] Missing asset or bone for finger: ${fingerId}`);
        continue;
      }

      const boneNode = boneInfo.boneNode;
      const side = FINGER_DEFINITIONS[fingerId].side;
      const isThumb = FINGER_DEFINITIONS[fingerId].type === 'thumb';

      // 1. Anchor のワールド姿勢（基底ベクトル）を算出
      // +Z: 指先方向 (Forward), +Y: 背側法線 (Up), +X: 横幅 (Side)
      const fwd = boneInfo.direction.clone().normalize();
      const dorsal = boneInfo.upDirection.clone().normalize();
      // Gram-Schmidt で fwd に直交する Up ベクトルを生成
      const up = dorsal.clone().sub(fwd.clone().multiplyScalar(dorsal.dot(fwd))).normalize();
      // 右手系座標系 (Side = Up x Forward)
      const sideVec = new THREE.Vector3().crossVectors(up, fwd).normalize();

      const rotMatrix = new THREE.Matrix4().makeBasis(sideVec, up, fwd);
      const targetWorldQuat = new THREE.Quaternion().setFromRotationMatrix(rotMatrix);

      // 先端位置 (ボーン起点 + 前方オフセット + 背側高さオフセット)
      // ネイルの根元(Y=0)が甘皮付近(関節〜指先の約50%)に配置され、先端(12mm)が指先へ伸びるように調整
      const forwardOffset = boneInfo.length * (isThumb ? 0.45 : 0.52);
      const heightOffset = isThumb ? 0.003 : 0.0025;
      const targetWorldPos = boneInfo.worldPosition.clone()
        .addScaledVector(fwd, forwardOffset)
        .addScaledVector(up, heightOffset);

      // 親指の場合の角度微調整
      if (isThumb) {
        const thumbTilt = THREE.MathUtils.degToRad(side === 'left' ? -25 : 25);
        targetWorldQuat.multiply(new THREE.Quaternion().setFromAxisAngle(fwd, thumbTilt));
      }

      // 2. boneNode のローカル空間への座標変換
      boneNode.updateWorldMatrix(true, false);
      const anchorNode = new THREE.Group();
      anchorNode.name = `nail_anchor_${fingerId}`;

      const localPos = targetWorldPos.clone();
      boneNode.worldToLocal(localPos);
      anchorNode.position.copy(localPos);

      const boneWorldQuat = new THREE.Quaternion();
      boneNode.getWorldQuaternion(boneWorldQuat);
      const localQuat = boneWorldQuat.clone().invert().multiply(targetWorldQuat);
      anchorNode.quaternion.copy(localQuat);

      // 3. Offset Node の作成 (ユーザーによるスライダー微調整用)
      const offsetNode = new THREE.Group();
      offsetNode.name = `nail_offset_${fingerId}`;

      // 4. ネイルモデルの配置
      // MDollnail モデル（+Y: 根元→先端, +Z: 背側法線, +X: 幅）を
      // Anchor（+Z: 先端方向, +Y: 背側法線, +X: 幅方向）に正しくアライメント
      const modelRoot = asset.root;
      modelRoot.rotation.set(-Math.PI / 2, 0, Math.PI);

      offsetNode.add(modelRoot);
      anchorNode.add(offsetNode);
      boneNode.add(anchorNode);

      const attached: AttachedFingerNail = {
        fingerId,
        boneNode,
        anchorNode,
        offsetNode,
        nailAsset: asset
      };

      this.attachedMap.set(fingerId, attached);

      // 初期のトランスフォームとモーフを反映
      if (config) {
        this.updateTransform(fingerId, config.transform);
        this.updateMorphs(fingerId, config.morphs);
        this.setVisible(fingerId, config.visible);
      }
    }
  }

  /**
   * 指定した指のトランスフォーム（位置・回転・スケール）を更新
   */
  public updateTransform(fingerId: FingerId, transform: NailTransform): void {
    const attached = this.attachedMap.get(fingerId);
    if (!attached) return;

    const { offsetNode } = attached;

    // 位置 (mm -> m 単位変換)
    // +Z: 先端方向, +X: 左右幅方向, +Y: 爪表面の浮き沈み
    offsetNode.position.set(
      transform.offsetSide * 0.001,
      transform.offsetHeight * 0.001,
      transform.offsetForward * 0.001
    );

    // 回転 (度数法 deg -> rad)
    offsetNode.rotation.set(
      THREE.MathUtils.degToRad(transform.pitch),
      THREE.MathUtils.degToRad(transform.yaw),
      THREE.MathUtils.degToRad(transform.roll)
    );

    // スケール
    const sx = Math.max(0.01, transform.scaleAll * transform.scaleWidth);
    const sy = Math.max(0.01, transform.scaleAll * transform.scaleThickness);
    const sz = Math.max(0.01, transform.scaleAll * transform.scaleLength);
    offsetNode.scale.set(sx, sy, sz);
  }

  /**
   * 指定した指のブレンドシェイプ（モーフ）ウェイトを更新
   */
  public updateMorphs(fingerId: FingerId, morphs: Record<string, number>): void {
    const attached = this.attachedMap.get(fingerId);
    if (!attached || !attached.nailAsset.mesh) return;

    const mesh = attached.nailAsset.mesh;
    if (!mesh.morphTargetDictionary || !mesh.morphTargetInfluences) return;

    for (const [name, weight] of Object.entries(morphs)) {
      const index = mesh.morphTargetDictionary[name];
      if (index !== undefined) {
        mesh.morphTargetInfluences[index] = weight;
      }
    }
  }

  /**
   * 単一指のネイル表示/非表示を切り替え
   */
  public setVisible(fingerId: FingerId, visible: boolean): void {
    const attached = this.attachedMap.get(fingerId);
    if (attached) {
      attached.anchorNode.visible = visible;
    }
  }

  /**
   * 全ネイルの表示/非表示を一括切り替え
   */
  public setAllVisible(visible: boolean): void {
    for (const attached of this.attachedMap.values()) {
      attached.anchorNode.visible = visible;
    }
  }

  /**
   * 指定した指のワールド位置（カメラフォーカス等に使用）を取得
   */
  public getFingerTipWorldPosition(fingerId: FingerId): THREE.Vector3 | null {
    const attached = this.attachedMap.get(fingerId);
    if (!attached) return null;

    attached.anchorNode.updateWorldMatrix(true, false);
    const pos = new THREE.Vector3();
    attached.anchorNode.getWorldPosition(pos);
    return pos;
  }

  /**
   * 全てのアタッチ済みネイルをシーンから除去
   */
  public detachAll(): void {
    for (const attached of this.attachedMap.values()) {
      if (attached.anchorNode.parent) {
        attached.anchorNode.parent.remove(attached.anchorNode);
      }
    }
    this.attachedMap.clear();
    this.currentVRM = null;
  }

  public getAttached(fingerId: FingerId): AttachedFingerNail | undefined {
    return this.attachedMap.get(fingerId);
  }

  public isAttached(): boolean {
    return this.attachedMap.size > 0;
  }
}
