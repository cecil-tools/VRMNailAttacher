import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { FingerId, FINGER_DEFINITIONS, ALL_FINGER_IDS } from './types';

export interface LoadedNailAsset {
  fingerId: FingerId;
  root: THREE.Group;
  mesh: THREE.Mesh | null;
  morphTargetDictionary: Record<string, number>;
  morphTargetNames: string[];
}

export class NailModelLoader {
  private loader: GLTFLoader;
  private cache: Map<string, THREE.Group> = new Map();
  private basePath: string;

  constructor(basePath: string = (process.env.BASE_URL || '/') + 'models/nail/MDollnail/glb/') {
    this.loader = new GLTFLoader();
    this.basePath = basePath;
  }

  /**
   * 単一の指用ネイルモデルを読み込んで独立したインスタンスを返す
   */
  public async loadNailForFinger(fingerId: FingerId): Promise<LoadedNailAsset> {
    const def = FINGER_DEFINITIONS[fingerId];
    const url = this.basePath + def.modelFileName;

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
   * 全 10 指のネイルモデルを一括で並列ロード
   */
  public async loadAllFingers(): Promise<Map<FingerId, LoadedNailAsset>> {
    const map = new Map<FingerId, LoadedNailAsset>();
    const promises = ALL_FINGER_IDS.map(async (fingerId) => {
      const asset = await this.loadNailForFinger(fingerId);
      map.set(fingerId, asset);
    });

    await Promise.all(promises);
    return map;
  }

  public clearCache(): void {
    this.cache.clear();
  }
}
