import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import {
  FingerId,
  FINGER_DEFINITIONS,
  ALL_FINGER_IDS,
  NailPreset,
  DEFAULT_NAIL_PRESET,
  NailTextureOption,
  NailMaterialType,
  NailMToonParams
} from './types';
import { NailMaterialManager } from './NailMaterialManager';

export interface LoadedNailAsset {
  fingerId: FingerId;
  root: THREE.Group;
  mesh: THREE.Mesh | null;
  morphTargetDictionary: Record<string, number>;
  morphTargetNames: string[];
}

export class NailModelLoader {
  private loader: GLTFLoader;
  private textureLoader: THREE.TextureLoader;
  private cache: Map<string, THREE.Group> = new Map();
  private textureCache: Map<string, THREE.Texture> = new Map();
  private preset: NailPreset;

  // 全ネイルメッシュで共有する単一のマテリアルインスタンス
  private sharedMaterial: THREE.Material | null = null;
  private currentMaterialType: NailMaterialType = 'mtoon';
  private currentMToonParams?: NailMToonParams;
  private currentTexture: THREE.Texture | null = null;

  constructor(preset: NailPreset = DEFAULT_NAIL_PRESET) {
    this.loader = new GLTFLoader();
    this.textureLoader = new THREE.TextureLoader();
    this.preset = preset;
  }

  public getPreset(): NailPreset {
    return this.preset;
  }

  public setPreset(preset: NailPreset): void {
    if (this.preset.id !== preset.id) {
      this.preset = preset;
      this.clearCache();
    }
  }

  public getSharedMaterial(): THREE.Material | null {
    return this.sharedMaterial;
  }

  /**
   * 単一の指用ネイルモデルを読み込んで独立したインスタンスを返す
   */
  public async loadNailForFinger(fingerId: FingerId): Promise<LoadedNailAsset> {
    const def = FINGER_DEFINITIONS[fingerId];
    // preset.fileMap からモデルファイル名を取得（フォールバックとして def.modelFileName）
    const fileName = this.preset.fileMap[def.type] || def.modelFileName;
    const baseUrl = process.env.BASE_URL || '/';
    const url = baseUrl + this.preset.basePath + fileName;

    let baseScene = this.cache.get(url);
    if (!baseScene) {
      const gltf = await this.loader.loadAsync(url);
      baseScene = gltf.scene;
      this.cache.set(url, baseScene);
    }

    // 階層をディープクローン
    const root = baseScene.clone(true);
    let targetMesh: THREE.Mesh | null = null;
    let morphTargetDictionary: Record<string, number> = {};
    const morphTargetNames: string[] = [];

    root.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        if (!targetMesh) {
          targetMesh = mesh;
          if (mesh.morphTargetDictionary) {
            morphTargetDictionary = { ...mesh.morphTargetDictionary };
            morphTargetNames.push(...Object.keys(mesh.morphTargetDictionary));
          }
        }
        // ネイル全体で1つのマテリアルを共有
        if (!this.sharedMaterial) {
          const initialTexture = (mesh.material && 'map' in (mesh.material as any))
            ? (mesh.material as any).map
            : null;
          this.currentTexture = initialTexture;
          this.sharedMaterial = NailMaterialManager.createMaterial(
            this.currentMaterialType,
            this.currentTexture,
            this.currentMToonParams
          );
        }
        mesh.material = this.sharedMaterial;
        // 影の設定
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });

    return {
      fingerId,
      root,
      mesh: targetMesh,
      morphTargetDictionary,
      morphTargetNames
    };
  }

  /**
   * ネイルチップ用マテリアルの標準化
   * 非金属（metalness: 0）、滑らかなトップコート光沢（roughness: 0.2）、純白ベースカラーを設定
   */
  private normalizeNailMaterial(material: THREE.Material): void {
    if ('metalness' in material) {
      (material as THREE.MeshStandardMaterial).metalness = 0.0;
    }
    if ('roughness' in material) {
      (material as THREE.MeshStandardMaterial).roughness = 0.2;
    }
    if ('color' in material) {
      (material as THREE.MeshStandardMaterial).color.set(0xffffff);
    }
    if ('specularIntensity' in material) {
      (material as any).specularIntensity = 1.0;
    }
    if ('specularColor' in material) {
      (material as any).specularColor.set(0xffffff);
    }
    material.needsUpdate = true;
  }

  /**
   * テクスチャファイルを非同期ロード（キャッシュ付き）
   */
  public async loadTexture(relativeFileName: string): Promise<THREE.Texture> {
    const baseUrl = process.env.BASE_URL || '/';
    const url = baseUrl + this.preset.basePath + relativeFileName;

    let texture = this.textureCache.get(url);
    if (!texture) {
      texture = await this.textureLoader.loadAsync(url);
      texture.flipY = false;
      texture.colorSpace = THREE.SRGBColorSpace;
      this.textureCache.set(url, texture);
    }
    return texture;
  }

  /**
   * 単一のアセットにテクスチャを適用（共有マテリアルを更新）
   */
  public applyTextureToAsset(asset: LoadedNailAsset, texture: THREE.Texture): void {
    this.currentTexture = texture;
    if (this.sharedMaterial) {
      NailMaterialManager.updateMaterialTexture(this.sharedMaterial, texture);
    }
    if (asset.mesh && this.sharedMaterial && asset.mesh.material !== this.sharedMaterial) {
      asset.mesh.material = this.sharedMaterial;
    }
  }

  /**
   * DataURL（アップロード画像）からテクスチャを非同期ロード（キャッシュ付き）
   */
  public async loadTextureFromDataUrl(dataUrl: string, cacheKey?: string): Promise<THREE.Texture> {
    const key = cacheKey || dataUrl;
    let texture = this.textureCache.get(key);
    if (!texture) {
      texture = await this.textureLoader.loadAsync(dataUrl);
      texture.flipY = false;
      texture.colorSpace = THREE.SRGBColorSpace;
      this.textureCache.set(key, texture);
    }
    return texture;
  }

  /**
   * 指定した指のアセット群にテクスチャを適用（全ネイル共有マテリアルを更新）
   */
  public applyTextureToFingers(
    assets: Map<FingerId, LoadedNailAsset>,
    _fingerIds: FingerId[],
    texture: THREE.Texture
  ): void {
    this.applyLoadedTextureToAll(assets, texture);
  }

  /**
   * プリセットテクスチャをロード
   */
  public async loadPresetTexture(textureOption: NailTextureOption): Promise<THREE.Texture> {
    return this.loadTexture(textureOption.fileName);
  }

  /**
   * 全アセットにロード済みテクスチャを適用（共有マテリアルのテクスチャを一括更新）
   */
  public applyLoadedTextureToAll(
    assets: Map<FingerId, LoadedNailAsset>,
    texture: THREE.Texture
  ): void {
    this.currentTexture = texture;
    if (this.sharedMaterial) {
      NailMaterialManager.updateMaterialTexture(this.sharedMaterial, texture);
    }
    for (const asset of assets.values()) {
      if (asset.mesh && this.sharedMaterial && asset.mesh.material !== this.sharedMaterial) {
        asset.mesh.material = this.sharedMaterial;
      }
    }
  }

  /**
   * 全アセットに指定のテクスチャを適用
   */
  public async applyTextureToAll(
    assets: Map<FingerId, LoadedNailAsset>,
    textureOption: NailTextureOption
  ): Promise<void> {
    const texture = await this.loadTexture(textureOption.fileName);
    this.applyLoadedTextureToAll(assets, texture);
  }

  /**
   * 全 10 指のネイルモデルを一括で並列ロード
   * プリセットにデフォルトテクスチャが指定されていれば自動適用
   */
  public async loadAllFingers(initialTextureId?: string): Promise<Map<FingerId, LoadedNailAsset>> {
    const map = new Map<FingerId, LoadedNailAsset>();
    const promises = ALL_FINGER_IDS.map(async (fingerId) => {
      const asset = await this.loadNailForFinger(fingerId);
      map.set(fingerId, asset);
    });

    await Promise.all(promises);

    // デフォルトテクスチャの適用
    const targetTextureId = initialTextureId || this.preset.defaultTextureId;
    if (targetTextureId && this.preset.textures.length > 0) {
      const texOpt = this.preset.textures.find((t) => t.id === targetTextureId);
      if (texOpt) {
        await this.applyTextureToAll(map, texOpt);
      }
    }

    return map;
  }

  public clearCache(): void {
    this.cache.clear();
    this.textureCache.clear();
    this.sharedMaterial = null;
    this.currentTexture = null;
  }

  /**
   * 全アセットのマテリアル種別（mtoon / standard）を一括切り替え（共有マテリアルを再生成）
   */
  public setMaterialType(
    assets: Map<FingerId, LoadedNailAsset>,
    type: NailMaterialType,
    params?: NailMToonParams
  ): void {
    this.currentMaterialType = type;
    if (params) this.currentMToonParams = params;
    this.sharedMaterial = NailMaterialManager.createMaterial(
      type,
      this.currentTexture,
      params || this.currentMToonParams
    );
    for (const asset of assets.values()) {
      if (asset.mesh) {
        asset.mesh.material = this.sharedMaterial;
      }
    }
  }
}

