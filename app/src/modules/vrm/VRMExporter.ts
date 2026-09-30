import * as THREE from 'three';
import { VRM } from '@pixiv/three-vrm';
import {
  FingerId,
  FINGER_DEFINITIONS,
  ALL_FINGER_IDS,
  NailMaterialType,
  NailMToonParams,
  DEFAULT_MTOON_PARAMS
} from '../nail/types';
import { AttachedFingerNail } from '../nail/NailAttacher';

export interface VRMExportOptions {
  fileName?: string;
  avatarTitle?: string;
  avatarVersion?: string;
  avatarAuthors?: string;
  materialType?: NailMaterialType;
  mtoonParams?: NailMToonParams;
}

interface ImageExportCache {
  bufferViewIndex: number;
  imageIndex: number;
  textureIndex: number;
}

/**
 * VRM のオリジナルバイナリ（GLB）を保持したまま、
 * ネイルチップのジオメトリ・テクスチャ情報を末節骨（Distal Phalanges）の子ノードとして追記パッキングするエクスポータ
 */
export class VRMExporter {
  /**
   * 現在の VRM と装着中のネイル情報を統合し、新しい VRM ファイル（Blob）を生成
   */
  public static async exportVRM(
    originalBuffer: ArrayBuffer,
    vrm: VRM,
    attachedNails: Map<FingerId, AttachedFingerNail>,
    options: VRMExportOptions = {}
  ): Promise<Blob> {
    if (!originalBuffer || originalBuffer.byteLength < 12) {
      throw new Error('元 VRM ファイルのバイナリデータが存在しません。');
    }

    // 1. GLB ヘッダー & チャンクのアンパック
    const dataView = new DataView(originalBuffer);
    const magic = dataView.getUint32(0, true);
    if (magic !== 0x46546c67) {
      throw new Error('指定されたバッファは有効な GLB/VRM 形式ではありません。');
    }

    const jsonChunkLength = dataView.getUint32(12, true);
    const jsonChunkType = dataView.getUint32(16, true);
    if (jsonChunkType !== 0x4e4f534a) {
      throw new Error('GLB Chunk 0 が JSON ではありません。');
    }

    const jsonBytes = new Uint8Array(originalBuffer, 20, jsonChunkLength);
    const gltf = JSON.parse(new TextDecoder().decode(jsonBytes));

    const binChunkHeaderOffset = 20 + jsonChunkLength;
    let originalBinBytes = new Uint8Array(0);
    let originalBinLength = 0;

    if (binChunkHeaderOffset < originalBuffer.byteLength) {
      originalBinLength = dataView.getUint32(binChunkHeaderOffset, true);
      originalBinBytes = new Uint8Array(
        originalBuffer,
        binChunkHeaderOffset + 8,
        originalBinLength
      );
    }

    // 2. メタデータの更新（指定があれば）
    if (options.avatarTitle) {
      if (gltf.extensions?.VRMC_vrm?.meta) {
        gltf.extensions.VRMC_vrm.meta.name = options.avatarTitle;
        if (options.avatarAuthors) gltf.extensions.VRMC_vrm.meta.authors = [options.avatarAuthors];
      } else if (gltf.extensions?.VRM?.meta) {
        gltf.extensions.VRM.meta.title = options.avatarTitle;
        if (options.avatarAuthors) gltf.extensions.VRM.meta.author = options.avatarAuthors;
        if (options.avatarVersion) gltf.extensions.VRM.meta.version = options.avatarVersion;
      }
    }

    // 3. バイナリ追加用バッファビルダーの準備
    const appendedBinChunks: Uint8Array[] = [];
    let currentBinOffset = originalBinLength;

    function appendBin(data: Uint8Array, alignment = 4): { offset: number; length: number } {
      const pad = (alignment - (currentBinOffset % alignment)) % alignment;
      if (pad > 0) {
        appendedBinChunks.push(new Uint8Array(pad));
        currentBinOffset += pad;
      }
      const offset = currentBinOffset;
      appendedBinChunks.push(data);
      currentBinOffset += data.byteLength;
      return { offset, length: data.byteLength };
    }

    // glTF 構造の初期化
    if (!gltf.buffers) gltf.buffers = [];
    if (gltf.buffers.length === 0) gltf.buffers.push({ byteLength: 0 });
    if (!gltf.bufferViews) gltf.bufferViews = [];
    if (!gltf.accessors) gltf.accessors = [];
    if (!gltf.images) gltf.images = [];
    if (!gltf.textures) gltf.textures = [];
    if (!gltf.materials) gltf.materials = [];
    if (!gltf.meshes) gltf.meshes = [];
    if (!gltf.nodes) gltf.nodes = [];

    // MToon 拡張の対応判定
    const isVRM1 = !!gltf.extensions?.VRMC_vrm;
    const isVRM0 = !!gltf.extensions?.VRM;
    const useMToon = (options.materialType ?? 'mtoon') === 'mtoon';

    if (useMToon && isVRM1) {
      if (!gltf.extensionsUsed) gltf.extensionsUsed = [];
      if (!gltf.extensionsUsed.includes('VRMC_materials_mtoon')) {
        gltf.extensionsUsed.push('VRMC_materials_mtoon');
      }
    }
    if (useMToon && isVRM0) {
      if (!gltf.extensions.VRM) gltf.extensions.VRM = {};
      if (!gltf.extensions.VRM.materialProperties) {
        gltf.extensions.VRM.materialProperties = [];
      }
    }

    // 4. テクスチャ画像の抽出・キャッシュ
    const textureCache = new Map<string, ImageExportCache>();

    async function getOrCreateTexture(texture: THREE.Texture): Promise<number> {
      const cacheKey = (texture.image && (texture.image.src || texture.image.currentSrc)) || texture.uuid;
      const cached = textureCache.get(cacheKey);
      if (cached) {
        return cached.textureIndex;
      }

      const pngBytes = await VRMExporter.textureToPngBytes(texture);
      const { offset, length } = appendBin(pngBytes, 4);

      const bufferViewIndex = gltf.bufferViews.length;
      gltf.bufferViews.push({
        buffer: 0,
        byteOffset: offset,
        byteLength: length
      });

      const imageIndex = gltf.images.length;
      gltf.images.push({
        bufferView: bufferViewIndex,
        mimeType: 'image/png',
        name: `NailTexture_${imageIndex}`
      });

      const textureIndex = gltf.textures.length;
      gltf.textures.push({
        source: imageIndex
      });

      textureCache.set(cacheKey, { bufferViewIndex, imageIndex, textureIndex });
      return textureIndex;
    }

    // 5. 各指のネイルをシリアライズしてボーンの子ノードに登録
    for (const fingerId of ALL_FINGER_IDS) {
      const attached = attachedNails.get(fingerId);
      if (!attached) continue;

      const fingerDef = FINGER_DEFINITIONS[fingerId];
      const boneNodeIndex = VRMExporter.findBoneNodeIndex(gltf, fingerDef.vrmBoneName, attached.boneNode);
      if (boneNodeIndex === -1) {
        console.warn(`[VRMExporter] Bone node not found in glTF for: ${fingerDef.vrmBoneName}`);
        continue;
      }

      const mesh = attached.nailAsset.mesh;
      if (!mesh || !mesh.geometry) continue;

      // 5.1 相対ローカル Transform の算出（M_rel = M_bone^(-1) * M_mesh）
      mesh.updateWorldMatrix(true, false);
      attached.boneNode.updateWorldMatrix(true, false);

      const invBoneMatrix = new THREE.Matrix4().copy(attached.boneNode.matrixWorld).invert();
      const relMatrix = new THREE.Matrix4().multiplyMatrices(invBoneMatrix, mesh.matrixWorld);

      const localPos = new THREE.Vector3();
      const localQuat = new THREE.Quaternion();
      const localScale = new THREE.Vector3();
      relMatrix.decompose(localPos, localQuat, localScale);

      // 5.2 ジオメトリのバイナリ化
      const geom = mesh.geometry;
      const posAttr = geom.attributes.position as THREE.BufferAttribute;
      const normAttr = geom.attributes.normal as THREE.BufferAttribute;
      const uvAttr = geom.attributes.uv as THREE.BufferAttribute;
      const indexAttr = geom.index;

      if (!posAttr || !indexAttr) continue;

      // POSITION (VEC3, FLOAT 5126)
      const posBytes = new Uint8Array(posAttr.array.buffer, posAttr.array.byteOffset, posAttr.array.byteLength);
      const posBin = appendBin(posBytes, 4);
      const posBvIndex = gltf.bufferViews.length;
      gltf.bufferViews.push({
        buffer: 0,
        byteOffset: posBin.offset,
        byteLength: posBin.length,
        target: 34962
      });

      const posMin = [Infinity, Infinity, Infinity];
      const posMax = [-Infinity, -Infinity, -Infinity];
      for (let i = 0; i < posAttr.count; i++) {
        const x = posAttr.getX(i);
        const y = posAttr.getY(i);
        const z = posAttr.getZ(i);
        if (x < posMin[0]) posMin[0] = x;
        if (y < posMin[1]) posMin[1] = y;
        if (z < posMin[2]) posMin[2] = z;
        if (x > posMax[0]) posMax[0] = x;
        if (y > posMax[1]) posMax[1] = y;
        if (z > posMax[2]) posMax[2] = z;
      }

      const posAccIndex = gltf.accessors.length;
      gltf.accessors.push({
        bufferView: posBvIndex,
        byteOffset: 0,
        componentType: 5126,
        count: posAttr.count,
        type: 'VEC3',
        min: posMin,
        max: posMax
      });

      // NORMAL (VEC3, FLOAT 5126)
      let normAccIndex: number | undefined;
      if (normAttr) {
        const normBytes = new Uint8Array(normAttr.array.buffer, normAttr.array.byteOffset, normAttr.array.byteLength);
        const normBin = appendBin(normBytes, 4);
        const normBvIndex = gltf.bufferViews.length;
        gltf.bufferViews.push({
          buffer: 0,
          byteOffset: normBin.offset,
          byteLength: normBin.length,
          target: 34962
        });
        normAccIndex = gltf.accessors.length;
        gltf.accessors.push({
          bufferView: normBvIndex,
          byteOffset: 0,
          componentType: 5126,
          count: normAttr.count,
          type: 'VEC3'
        });
      }

      // TEXCOORD_0 (VEC2, FLOAT 5126)
      let uvAccIndex: number | undefined;
      if (uvAttr) {
        const uvBytes = new Uint8Array(uvAttr.array.buffer, uvAttr.array.byteOffset, uvAttr.array.byteLength);
        const uvBin = appendBin(uvBytes, 4);
        const uvBvIndex = gltf.bufferViews.length;
        gltf.bufferViews.push({
          buffer: 0,
          byteOffset: uvBin.offset,
          byteLength: uvBin.length,
          target: 34962
        });
        uvAccIndex = gltf.accessors.length;
        gltf.accessors.push({
          bufferView: uvBvIndex,
          byteOffset: 0,
          componentType: 5126,
          count: uvAttr.count,
          type: 'VEC2'
        });
      }

      // INDICES (SCALAR, UNSIGNED_SHORT 5123 or UNSIGNED_INT 5125)
      const is32Bit = indexAttr.array instanceof Uint32Array;
      const indexBytes = new Uint8Array(indexAttr.array.buffer, indexAttr.array.byteOffset, indexAttr.array.byteLength);
      const indexBin = appendBin(indexBytes, is32Bit ? 4 : 2);
      const indexBvIndex = gltf.bufferViews.length;
      gltf.bufferViews.push({
        buffer: 0,
        byteOffset: indexBin.offset,
        byteLength: indexBin.length,
        target: 34963
      });
      const indexAccIndex = gltf.accessors.length;
      gltf.accessors.push({
        bufferView: indexBvIndex,
        byteOffset: 0,
        componentType: is32Bit ? 5125 : 5123,
        count: indexAttr.count,
        type: 'SCALAR'
      });

      // 5.3 マテリアル & テクスチャの解決
      let materialIndex = 0;
      const meshMat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
      let textureIndex: number | undefined;

      if (meshMat && 'map' in meshMat && (meshMat as any).map) {
        const tex = (meshMat as any).map as THREE.Texture;
        textureIndex = await getOrCreateTexture(tex);
      }

      const matName = `NailMaterial_${fingerId}`;
      const matEntry: any = {
        name: matName,
        pbrMetallicRoughness: textureIndex !== undefined
          ? {
              baseColorTexture: { index: textureIndex },
              metallicFactor: 0.0,
              roughnessFactor: 0.2
            }
          : {
              baseColorFactor: [1.0, 1.0, 1.0, 1.0],
              metallicFactor: 0.0,
              roughnessFactor: 0.2
            },
        doubleSided: true
      };

      if (useMToon && isVRM1) {
        const mtoonParams = options.mtoonParams || DEFAULT_MTOON_PARAMS;
        const shadeFactor = mtoonParams.shadeColorFactor || [0.85, 0.85, 0.85];
        const rimFactor = mtoonParams.parametricRimColorFactor || [0.2, 0.2, 0.2];

        const mtoonExt: any = {
          specVersion: '1.0',
          shadeColorFactor: shadeFactor,
          shadingShiftFactor: mtoonParams.shadingShiftFactor ?? 0.0,
          shadingToonyFactor: mtoonParams.shadingToonyFactor ?? 0.9,
          giEqualizationFactor: mtoonParams.giEqualizationFactor ?? 0.9,
          parametricRimColorFactor: rimFactor,
          parametricRimFresnelPowerFactor: mtoonParams.parametricRimFresnelPowerFactor ?? 5.0,
          parametricRimLiftFactor: mtoonParams.parametricRimLiftFactor ?? 0.0,
          outlineWidthMode: mtoonParams.outlineWidthMode || 'none'
        };
        if (textureIndex !== undefined) {
          mtoonExt.shadeMultiplyTexture = { index: textureIndex };
        }
        matEntry.extensions = {
          VRMC_materials_mtoon: mtoonExt
        };
      }

      materialIndex = gltf.materials.length;
      gltf.materials.push(matEntry);

      // VRM 0.x の MToon 定義を materialProperties 配列に追加（gltf.materials と 1-to-1 連動）
      if (useMToon && isVRM0 && gltf.extensions?.VRM?.materialProperties) {
        const mtoonParams = options.mtoonParams || DEFAULT_MTOON_PARAMS;
        const shadeFactor = mtoonParams.shadeColorFactor || [0.85, 0.85, 0.85];
        const rimFactor = mtoonParams.parametricRimColorFactor || [0.2, 0.2, 0.2];

        const mtoonProp: any = {
          name: matName,
          shader: 'VRM/MToon',
          renderQueue: 2000,
          floatProperties: {
            _BlendMode: 0,
            _SrcBlend: 1,
            _DstBlend: 0,
            _ZWrite: 1,
            _Cutoff: 0.5,
            _ShadeShift: mtoonParams.shadingShiftFactor ?? 0.0,
            _ShadeToony: mtoonParams.shadingToonyFactor ?? 0.9,
            _ReceiveShadowRate: 1.0,
            _ShadingGradeRate: 1.0,
            _LightColorAttenuation: 0.0,
            _IndirectLightIntensity: 0.1,
            _RimLightingMix: 1.0,
            _RimFresnelPower: mtoonParams.parametricRimFresnelPowerFactor ?? 5.0,
            _RimLift: mtoonParams.parametricRimLiftFactor ?? 0.0,
            _OutlineWidthMode: 0,
            _OutlineWidth: 0.0
          },
          vectorProperties: {
            _Color: [1.0, 1.0, 1.0, 1.0],
            _ShadeColor: [shadeFactor[0], shadeFactor[1], shadeFactor[2], 1.0],
            _RimColor: [rimFactor[0], rimFactor[1], rimFactor[2], 1.0],
            _OutlineColor: [0.0, 0.0, 0.0, 1.0]
          },
          textureProperties: textureIndex !== undefined ? {
            _MainTex: textureIndex,
            _ShadeTexture: textureIndex
          } : {},
          keywordMap: {
            _MTOON_OUTLINE_NONE: true
          },
          tagMap: {
            RenderType: 'Opaque'
          }
        };
        gltf.extensions.VRM.materialProperties.push(mtoonProp);
      }

      // 5.4 メッシュの追加
      const meshIndex = gltf.meshes.length;
      const attributes: Record<string, number> = {
        POSITION: posAccIndex
      };
      if (normAccIndex !== undefined) attributes.NORMAL = normAccIndex;
      if (uvAccIndex !== undefined) attributes.TEXCOORD_0 = uvAccIndex;

      gltf.meshes.push({
        name: `NailMesh_${fingerId}`,
        primitives: [
          {
            attributes,
            indices: indexAccIndex,
            material: materialIndex
          }
        ]
      });

      // 5.5 ノードの作成とボーンの子ノードへの登録
      const nailNodeIndex = gltf.nodes.length;
      gltf.nodes.push({
        name: `Nail_${fingerId}`,
        mesh: meshIndex,
        translation: [localPos.x, localPos.y, localPos.z],
        rotation: [localQuat.x, localQuat.y, localQuat.z, localQuat.w],
        scale: [localScale.x, localScale.y, localScale.z]
      });

      if (!gltf.nodes[boneNodeIndex].children) {
        gltf.nodes[boneNodeIndex].children = [];
      }
      gltf.nodes[boneNodeIndex].children.push(nailNodeIndex);
    }

    // 6. バッファサイズの確定
    gltf.buffers[0].byteLength = currentBinOffset;

    // 7. GLB の再アセンブル
    const newJsonText = JSON.stringify(gltf);
    const newJsonBytes = new TextEncoder().encode(newJsonText);
    const jsonPad = (4 - (newJsonBytes.length % 4)) % 4;
    const finalJsonLength = newJsonBytes.length + jsonPad;

    const binPad = (4 - (currentBinOffset % 4)) % 4;
    const finalBinLength = currentBinOffset + binPad;

    const totalGlbLength = 12 + 8 + finalJsonLength + 8 + finalBinLength;
    const outputBuffer = new ArrayBuffer(totalGlbLength);
    const outView = new DataView(outputBuffer);
    const outBytes = new Uint8Array(outputBuffer);

    // GLB Header
    outView.setUint32(0, 0x46546c67, true);
    outView.setUint32(4, 2, true);
    outView.setUint32(8, totalGlbLength, true);

    // Chunk 0 (JSON)
    outView.setUint32(12, finalJsonLength, true);
    outView.setUint32(16, 0x4e4f534a, true);
    outBytes.set(newJsonBytes, 20);
    // JSON パディングはスペース 0x20
    for (let i = 0; i < jsonPad; i++) {
      outBytes[20 + newJsonBytes.length + i] = 0x20;
    }

    // Chunk 1 (BIN)
    const outBinHeaderOffset = 20 + finalJsonLength;
    outView.setUint32(outBinHeaderOffset, finalBinLength, true);
    outView.setUint32(outBinHeaderOffset + 4, 0x004e4942, true);

    let writePtr = outBinHeaderOffset + 8;
    outBytes.set(originalBinBytes, writePtr);
    writePtr += originalBinBytes.byteLength;

    for (const chunk of appendedBinChunks) {
      outBytes.set(chunk, writePtr);
      writePtr += chunk.byteLength;
    }
    // BIN パディングはゼロ 0x00
    for (let i = 0; i < binPad; i++) {
      outBytes[writePtr + i] = 0x00;
    }

    return new Blob([outputBuffer], { type: 'model/gltf-binary' });
  }

  /**
   * ボーン名またはノード名から glTF 上のノードインデックスを検索
   */
  private static findBoneNodeIndex(gltf: any, vrmBoneName: string, boneNode: THREE.Object3D): number {
    // 1. VRM 1.0 (VRMC_vrm)
    const vrm1Bones = gltf.extensions?.VRMC_vrm?.humanoid?.humanBones;
    if (vrm1Bones && vrm1Bones[vrmBoneName] && typeof vrm1Bones[vrmBoneName].node === 'number') {
      return vrm1Bones[vrmBoneName].node;
    }

    // 2. VRM 0.x (VRM)
    const vrm0Bones = gltf.extensions?.VRM?.humanoid?.humanBones;
    if (Array.isArray(vrm0Bones)) {
      const found = vrm0Bones.find((b: any) => b.bone === vrmBoneName);
      if (found && typeof found.node === 'number') {
        return found.node;
      }
    }

    // 3. ノード名一致検索
    if (boneNode.name && Array.isArray(gltf.nodes)) {
      const idx = gltf.nodes.findIndex((n: any) => n.name === boneNode.name);
      if (idx !== -1) return idx;
    }

    return -1;
  }

  /**
   * Three.js Texture を PNG バイナリ（Uint8Array）に変換
   */
  private static async textureToPngBytes(texture: THREE.Texture): Promise<Uint8Array> {
    const image = texture.image;
    if (!image) {
      // 1x1 白ピクセルフォールバック
      return new Uint8Array([
        137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 1,
        0, 0, 0, 1, 8, 6, 0, 0, 0, 31, 21, 196, 137, 0, 0, 0, 10, 73, 68, 65, 84,
        120, 156, 99, 0, 1, 0, 0, 5, 0, 1, 13, 10, 45, 180, 0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130
      ]);
    }

    // すでに dataUrl の場合
    if (typeof image.src === 'string' && image.src.startsWith('data:image/')) {
      const base64 = image.src.split(',')[1];
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return bytes;
    }

    // HTMLCanvasElement または HTMLImageElement を Canvas 経由で PNG 化
    const canvas = document.createElement('canvas');
    canvas.width = image.width || image.naturalWidth || 512;
    canvas.height = image.height || image.naturalHeight || 512;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas 2D context を取得できませんでした。');
    }

    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/png');
    });

    if (!blob) {
      throw new Error('テクスチャ画像の PNG 変換に失敗しました。');
    }

    const arrayBuffer = await blob.arrayBuffer();
    return new Uint8Array(arrayBuffer);
  }
}
