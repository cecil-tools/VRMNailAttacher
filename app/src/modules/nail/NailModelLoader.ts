import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import {
  FingerId,
  FINGER_DEFINITIONS,
  ALL_FINGER_IDS,
  NailPreset,
  DEFAULT_NAIL_PRESET,
  NailTextureOption
} from './types';

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
        // マテリアルをクローンしてテクスチャや色設定が干渉しないようにする
        if (Array.isArray(mesh.material)) {
          mesh.material = mesh.material.map((m) => {
            const cloned = m.clone();
            this.normalizeNailMaterial(cloned);
            return cloned;
          });
        } else if (mesh.material) {
          mesh.material = mesh.material.clone();
          this.normalizeNailMaterial(mesh.material);
        }
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
   * 単一のアセットにテクスチャを適用
   */
  public applyTextureToAsset(asset: LoadedNailAsset, texture: THREE.Texture): void {
    if (!asset.mesh) return;
    const materials = Array.isArray(asset.mesh.material)
      ? asset.mesh.material
      : [asset.mesh.material];

    for (const mat of materials) {
      if ('map' in mat) {
        (mat as THREE.MeshStandardMaterial).map = texture;
        this.normalizeNailMaterial(mat);
      }
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
   * 指定した指のアセット群にテクスチャを適用
   */
  public applyTextureToFingers(
    assets: Map<FingerId, LoadedNailAsset>,
    fingerIds: FingerId[],
    texture: THREE.Texture
  ): void {
    for (const id of fingerIds) {
      const asset = assets.get(id);
      if (asset) {
        this.applyTextureToAsset(asset, texture);
      }
    }
  }

  /**
   * プリセットテクスチャをロード
   */
  public async loadPresetTexture(textureOption: NailTextureOption): Promise<THREE.Texture> {
    return this.loadTexture(textureOption.fileName);
  }

  /**
   * 全アセットにロード済みテクスチャを適用
   */
  public applyLoadedTextureToAll(
    assets: Map<FingerId, LoadedNailAsset>,
    texture: THREE.Texture
  ): void {
    for (const asset of assets.values()) {
      this.applyTextureToAsset(asset, texture);
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
  }
}

