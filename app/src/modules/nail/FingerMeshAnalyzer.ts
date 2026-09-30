import * as THREE from 'three';
import { VRM } from '@pixiv/three-vrm';
import { FingerId, ALL_FINGER_IDS, FINGER_DEFINITIONS } from './types';
import { FingerBoneInfo } from './BoneDetector';

export interface FingerMeshBounds {
  fingerId: FingerId;
  vertexCount: number;
  fwdMin: number;
  fwdMax: number;
  fwdSpan: number;
  upMin: number;
  upMax: number;
  dorsalSurfaceUp: number; // 爪が生えるエリア（指の中間〜先端）での背側表面高さ
  sideMin: number;
  sideMax: number;
  width: number;
  centerSide: number;
  suggestedOffset: {
    forward: number; // m
    height: number;  // m
    side: number;    // m
    scaleWidth: number;
  };
}

export class FingerMeshAnalyzer {
  /**
   * VRM モデル内の全指先メッシュ幾何情報を一括解析
   */
  public static analyzeAllFingers(
    vrm: VRM,
    boneInfos: Map<FingerId, FingerBoneInfo>
  ): Map<FingerId, FingerMeshBounds> {
    const results = new Map<FingerId, FingerMeshBounds>();

    // 1. VRM 内のすべての SkinnedMesh を収集
    const skinnedMeshes: THREE.SkinnedMesh[] = [];
    vrm.scene.traverse((obj) => {
      if ((obj as THREE.SkinnedMesh).isSkinnedMesh) {
        skinnedMeshes.push(obj as THREE.SkinnedMesh);
      }
    });

    if (skinnedMeshes.length === 0) {
      console.warn('[FingerMeshAnalyzer] No SkinnedMesh found in VRM scene');
      return results;
    }

    // 2. 各指について末節骨に影響を受ける頂点を抽出し解析
    for (const fingerId of ALL_FINGER_IDS) {
      const boneInfo = boneInfos.get(fingerId);
      if (!boneInfo) continue;

      const bounds = this.analyzeSingleFinger(vrm, fingerId, boneInfo, skinnedMeshes);
      if (bounds) {
        results.set(fingerId, bounds);
      }
    }

    return results;
  }

  /**
   * 単一の指について末節骨頂点群を抽出し幾何バウンディングを算出
   */
  public static analyzeSingleFinger(
    vrm: VRM,
    fingerId: FingerId,
    boneInfo: FingerBoneInfo,
    skinnedMeshes: THREE.SkinnedMesh[]
  ): FingerMeshBounds | null {
    const fingerDef = FINGER_DEFINITIONS[fingerId];
    const isThumb = fingerDef.type === 'thumb';
    const boneNode = boneInfo.boneNode;

    // Anchor 座標系の基底ベクトル
    // fwd: 指先方向, up: 背側法線, side: 横幅
    const fwd = boneInfo.direction.clone().normalize();
    const dorsal = boneInfo.upDirection.clone().normalize();
    const up = dorsal.clone().sub(fwd.clone().multiplyScalar(dorsal.dot(fwd))).normalize();
    const sideVec = new THREE.Vector3().crossVectors(up, fwd).normalize();

    boneNode.updateWorldMatrix(true, false);
    const boneWorldPos = boneInfo.worldPosition;

    // 末節骨に対応する頂点（Anchor 座標系: [fwd, up, side]）を収集
    const localCoords: Array<{ fwd: number; up: number; side: number }> = [];

    const tempVec = new THREE.Vector3();
    const boneLocalVec = new THREE.Vector3();
    const worldVec = new THREE.Vector3();
    const relVec = new THREE.Vector3();

    for (const mesh of skinnedMeshes) {
      if (!mesh.skeleton || !mesh.geometry) continue;

      const boneIndex = mesh.skeleton.bones.indexOf(boneNode as THREE.Bone);
      if (boneIndex === -1) continue;

      const posAttr = mesh.geometry.attributes.position;
      const skinIndexAttr = mesh.geometry.attributes.skinIndex;
      const skinWeightAttr = mesh.geometry.attributes.skinWeight;
      if (!posAttr || !skinIndexAttr || !skinWeightAttr) continue;

      // mesh.bindMatrix と skeleton.boneInverses[boneIndex] の合成変換行列
      // vertexBoneLocal = boneInverse * bindMatrix * vertexLocal
      const boneInverse = mesh.skeleton.boneInverses[boneIndex];
      const bindMatrix = mesh.bindMatrix;
      const meshToBoneLocal = new THREE.Matrix4().multiplyMatrices(boneInverse, bindMatrix);

      const vertexCount = posAttr.count;
      for (let i = 0; i < vertexCount; i++) {
        // 当該ボーンのウェイトがあるか確認 (skinIndex / skinWeight は 4要素)
        let isInfluenced = false;
        const w0 = skinWeightAttr.getX(i);
        const w1 = skinWeightAttr.getY(i);
        const w2 = skinWeightAttr.getZ(i);
        const w3 = skinWeightAttr.getW(i);

        const i0 = skinIndexAttr.getX(i);
        const i1 = skinIndexAttr.getY(i);
        const i2 = skinIndexAttr.getZ(i);
        const i3 = skinIndexAttr.getW(i);

        if ((i0 === boneIndex && w0 > 0.15) ||
            (i1 === boneIndex && w1 > 0.15) ||
            (i2 === boneIndex && w2 > 0.15) ||
            (i3 === boneIndex && w3 > 0.15)) {
          isInfluenced = true;
        }

        if (!isInfluenced) continue;

        // 頂点ローカル座標
        tempVec.fromBufferAttribute(posAttr, i);
        // ボーンローカル座標に変換
        boneLocalVec.copy(tempVec).applyMatrix4(meshToBoneLocal);
        // 現在のボーンのワールド変換を適用
        worldVec.copy(boneLocalVec).applyMatrix4(boneNode.matrixWorld);

        // Anchor 空間 (ボーン原点基準、fwd / up / side 軸) へ投影
        relVec.subVectors(worldVec, boneWorldPos);
        const pFwd = relVec.dot(fwd);
        const pUp = relVec.dot(up);
        const pSide = relVec.dot(sideVec);

        localCoords.push({ fwd: pFwd, up: pUp, side: pSide });
      }
    }

    if (localCoords.length < 4) {
      // 頂点が少なすぎる場合は解析不能
      return null;
    }

    // 幾何寸法の算出
    let fwdMin = Infinity;
    let fwdMax = -Infinity;
    let upMin = Infinity;
    let upMax = -Infinity;
    let sideMin = Infinity;
    let sideMax = -Infinity;

    for (const c of localCoords) {
      if (c.fwd < fwdMin) fwdMin = c.fwd;
      if (c.fwd > fwdMax) fwdMax = c.fwd;
      if (c.up < upMin) upMin = c.up;
      if (c.up > upMax) upMax = c.up;
      if (c.side < sideMin) sideMin = c.side;
      if (c.side > sideMax) sideMax = c.side;
    }

    const fwdSpan = fwdMax - fwdMin;
    const width = sideMax - sideMin;
    const centerSide = (sideMin + sideMax) / 2;

    // 爪が生える領域（指先から手前 30%〜75% の区間）における背側表面高さをサンプリング
    const nailZoneFwdMin = fwdMin + fwdSpan * (isThumb ? 0.25 : 0.35);
    const nailZoneFwdMax = fwdMin + fwdSpan * (isThumb ? 0.70 : 0.80);

    let dorsalSurfaceUp = -Infinity;
    for (const c of localCoords) {
      if (c.fwd >= nailZoneFwdMin && c.fwd <= nailZoneFwdMax) {
        if (c.up > dorsalSurfaceUp) {
          dorsalSurfaceUp = c.up;
        }
      }
    }

    // ゾーン内に頂点がなければ全体の upMax を採用
    if (dorsalSurfaceUp === -Infinity) {
      dorsalSurfaceUp = upMax;
    }

    // 推奨オフセットの算出
    // 1. 前後位置: 指の長さ span の比率（人差し指等: 0.46, 親指: 0.36）
    const targetForwardRatio = isThumb ? 0.36 : 0.46;
    const suggestedFwd = fwdMin + fwdSpan * targetForwardRatio;

    // 2. 高さ位置: 背側表面高さ + わずかなマージン (0.2mm)
    const surfaceMargin = 0.0002;
    const suggestedHeight = dorsalSurfaceUp + surfaceMargin;

    // 3. 左右位置: 指の中心
    const suggestedSide = centerSide;

    // 4. 幅スケール: 基準指幅（人差し指: 11.5mm, 親指: 12.5mm）に対する比率
    const baseWidth = isThumb ? 0.0125 : 0.0115;
    const rawScaleWidth = width / baseWidth;
    // 極端な変形を防ぐため 0.85x 〜 1.4x の範囲にクランプ
    const scaleWidth = THREE.MathUtils.clamp(rawScaleWidth, 0.85, 1.4);

    return {
      fingerId,
      vertexCount: localCoords.length,
      fwdMin,
      fwdMax,
      fwdSpan,
      upMin,
      upMax,
      dorsalSurfaceUp,
      sideMin,
      sideMax,
      width,
      centerSide,
      suggestedOffset: {
        forward: suggestedFwd,
        height: suggestedHeight,
        side: suggestedSide,
        scaleWidth
      }
    };
  }
}
