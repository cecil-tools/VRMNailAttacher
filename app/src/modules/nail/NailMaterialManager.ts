import * as THREE from 'three';
import { MToonMaterial } from '@pixiv/three-vrm';
import { NailMaterialType, NailMToonParams, DEFAULT_MTOON_PARAMS } from './types';

/**
 * ネイルチップのマテリアル（MToon セル調 / Standard 物理ベース調）の
 * 生成、テクスチャ反映、パラメータ管理を一元管理するマネージャークラス
 */
export class NailMaterialManager {
  /**
   * MToon マテリアルを生成
   */
  public static createMToonMaterial(
    texture?: THREE.Texture | null,
    params: NailMToonParams = {}
  ): MToonMaterial {
    const mergedParams: NailMToonParams = { ...DEFAULT_MTOON_PARAMS, ...params };
    const shadeFactor = mergedParams.shadeColorFactor || [0.85, 0.85, 0.85];
    const rimFactor = mergedParams.parametricRimColorFactor || [0.2, 0.2, 0.2];

    const mat = new MToonMaterial({
      color: new THREE.Color(1, 1, 1),
      map: texture || undefined,
      shadeMultiplyTexture: texture || undefined,
      shadeColorFactor: new THREE.Color(shadeFactor[0], shadeFactor[1], shadeFactor[2]),
      shadingShiftFactor: mergedParams.shadingShiftFactor ?? 0.0,
      shadingToonyFactor: mergedParams.shadingToonyFactor ?? 0.9,
      giEqualizationFactor: mergedParams.giEqualizationFactor ?? 0.9,
      parametricRimColorFactor: new THREE.Color(rimFactor[0], rimFactor[1], rimFactor[2]),
      parametricRimFresnelPowerFactor: mergedParams.parametricRimFresnelPowerFactor ?? 5.0,
      parametricRimLiftFactor: mergedParams.parametricRimLiftFactor ?? 0.0,
      outlineWidthMode: mergedParams.outlineWidthMode || 'none',
    });

    mat.name = 'M_Nail_MToon';
    return mat;
  }

  /**
   * Standard (PBR) マテリアルを生成
   */
  public static createStandardMaterial(texture?: THREE.Texture | null): THREE.MeshStandardMaterial {
    const mat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: texture || null,
      metalness: 0.0,
      roughness: 0.2,
      name: 'M_Nail_Standard',
    });
    (mat as any).specularIntensity = 1.0;
    (mat as any).specularColor = new THREE.Color(0xffffff);
    return mat;
  }

  /**
   * 指定した種別のマテリアルを生成
   */
  public static createMaterial(
    type: NailMaterialType = 'mtoon',
    texture?: THREE.Texture | null,
    params?: NailMToonParams
  ): THREE.Material {
    if (type === 'mtoon') {
      return this.createMToonMaterial(texture, params);
    }
    return this.createStandardMaterial(texture);
  }

  /**
   * 既存のマテリアルに新しいテクスチャを反映
   * （MToonMaterial の場合は受光用 map と影用 shadeMultiplyTexture の両方に同期反映）
   */
  public static updateMaterialTexture(material: THREE.Material, texture: THREE.Texture): void {
    if (material instanceof MToonMaterial) {
      material.map = texture;
      material.shadeMultiplyTexture = texture;
      material.needsUpdate = true;
    } else if ('map' in material) {
      (material as THREE.MeshStandardMaterial).map = texture;
      material.needsUpdate = true;
    }
  }

  /**
   * メッシュのマテリアル種別（mtoon / standard）を切り替え
   * （現在設定されているテクスチャ map はそのまま引き継がれます）
   */
  public static switchMeshMaterial(
    mesh: THREE.Mesh,
    targetType: NailMaterialType,
    params?: NailMToonParams
  ): void {
    const currentMat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
    let currentTexture: THREE.Texture | null = null;

    if (currentMat && 'map' in currentMat && (currentMat as any).map) {
      currentTexture = (currentMat as any).map as THREE.Texture;
    }

    const newMat = this.createMaterial(targetType, currentTexture, params);
    mesh.material = newMat;
  }
}
