import * as THREE from 'three';
import { VRM } from '@pixiv/three-vrm';
import {
  FingerId,
  FINGER_DEFINITIONS,
  ALL_FINGER_IDS,
  NailTransform,
  FingerNailConfig,
  NailPreset,
  DEFAULT_NAIL_PRESET
} from './types';
import { LoadedNailAsset } from './NailModelLoader';
import { BoneDetector } from './BoneDetector';

import { FingerMeshAnalyzer, FingerMeshBounds } from './FingerMeshAnalyzer';

export interface AttachedFingerNail {
  fingerId: FingerId;
  boneNode: THREE.Object3D;
  anchorNode: THREE.Group;
  offsetNode: THREE.Group;
  nailAsset: LoadedNailAsset;
  meshBounds?: FingerMeshBounds;
}

export class NailAttacher {
  private attachedMap: Map<FingerId, AttachedFingerNail> = new Map();
  private currentVRM: VRM | null = null;
  private currentPreset: NailPreset = DEFAULT_NAIL_PRESET;
  private meshBoundsMap: Map<FingerId, FingerMeshBounds> = new Map();

  /**
   * VRM モデルに対して全ネイルをアタッチする
   */
  public attachAll(
    vrm: VRM,
    nailAssets: Map<FingerId, LoadedNailAsset>,
    configs: Record<FingerId, FingerNailConfig>,
    preset: NailPreset = DEFAULT_NAIL_PRESET,
    autoMeshFit = true
  ): void {
    // 既存のネイルをクリーンアップ
    this.detachAll();
    this.currentVRM = vrm;
    this.currentPreset = preset;

    const boneInfos = BoneDetector.detectAllFingers(vrm);
    const alignment = preset.alignment;

    // 指先メッシュの幾何解析を実行（指が太い・細いモデルに合わせて自動調整）
    this.meshBoundsMap = autoMeshFit
      ? FingerMeshAnalyzer.analyzeAllFingers(vrm, boneInfos)
      : new Map();

    for (const fingerId of ALL_FINGER_IDS) {
      const asset = nailAssets.get(fingerId);
      const boneInfo = boneInfos.get(fingerId);
      const config = configs[fingerId];

      if (!asset || !boneInfo) {
        console.warn(`[NailAttacher] Missing asset or bone for finger: ${fingerId}`);
        continue;
      }

      const boneNode = boneInfo.boneNode;
      const fingerDef = FINGER_DEFINITIONS[fingerId];
      const isThumb = fingerDef.type === 'thumb';

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

      // 先端位置の算出: メッシュ解析結果が存在する場合は指表面にフィット、なければボーン比率フォールバック
      const meshBounds = this.meshBoundsMap.get(fingerId);
      let forwardOffset: number;
      let heightOffset: number;
      let sideOffset = 0;

      if (meshBounds) {
        forwardOffset = meshBounds.suggestedOffset.forward;
        heightOffset = meshBounds.suggestedOffset.height;
        sideOffset = meshBounds.suggestedOffset.side;
      } else {
        const fwdRatio = isThumb ? alignment.forwardOffsetRatio.thumb : alignment.forwardOffsetRatio.other;
        const hOffset = isThumb ? alignment.heightOffset.thumb : alignment.heightOffset.other;
        forwardOffset = boneInfo.length * fwdRatio;
        heightOffset = hOffset;
      }

      const targetWorldPos = boneInfo.worldPosition.clone()
        .addScaledVector(fwd, forwardOffset)
        .addScaledVector(up, heightOffset)
        .addScaledVector(sideVec, sideOffset);

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
      // プリセットに応じた初期回転を適用
      const modelRoot = asset.root;
      modelRoot.rotation.set(
        alignment.rotationEuler[0],
        alignment.rotationEuler[1],
        alignment.rotationEuler[2]
      );

      // 根元位置を Anchor 原点に合わせるためのオフセット補正
      if (alignment.originOffsetRatioZ && alignment.originOffsetRatioZ[fingerDef.type]) {
        const offsetZ = alignment.originOffsetRatioZ[fingerDef.type];
        modelRoot.position.set(0, 0, offsetZ);
      } else {
        modelRoot.position.set(0, 0, 0);
      }

      offsetNode.add(modelRoot);
      anchorNode.add(offsetNode);
      boneNode.add(anchorNode);

      const attached: AttachedFingerNail = {
        fingerId,
        boneNode,
        anchorNode,
        offsetNode,
        nailAsset: asset,
        meshBounds
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

  public getAllAttached(): Map<FingerId, AttachedFingerNail> {
    return this.attachedMap;
  }

  public getAttached(fingerId: FingerId): AttachedFingerNail | undefined {
    return this.attachedMap.get(fingerId);
  }

  public isAttached(): boolean {
    return this.attachedMap.size > 0;
  }

  public getMeshBounds(fingerId: FingerId): FingerMeshBounds | undefined {
    return this.meshBoundsMap.get(fingerId);
  }

  public getAllMeshBounds(): Map<FingerId, FingerMeshBounds> {
    return this.meshBoundsMap;
  }
}
