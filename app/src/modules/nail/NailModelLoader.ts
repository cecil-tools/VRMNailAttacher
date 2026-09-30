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
          mesh.material = mesh.material.map((m) => m.clone());
        } else if (mesh.material) {
          mesh.material = mesh.material.clone();
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
        mat.needsUpdate = true;
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
    for (const asset of assets.values()) {
      this.applyTextureToAsset(asset, texture);
    }
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

