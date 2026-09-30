export type FingerId =
  | 'leftThumb'
  | 'leftIndex'
  | 'leftMiddle'
  | 'leftRing'
  | 'leftLittle'
  | 'rightThumb'
  | 'rightIndex'
  | 'rightMiddle'
  | 'rightRing'
  | 'rightLittle';

export type HandSide = 'left' | 'right';
export type FingerType = 'thumb' | 'index' | 'middle' | 'ring' | 'little';
export type FingerSelection = FingerId | 'all' | 'leftAll' | 'rightAll';

export interface NailTransform {
  // 位置オフセット (mm 単位)
  offsetForward: number;  // 前後 (先端方向 + / 根元方向 -)
  offsetSide: number;     // 左右 (外側 + / 内側 -)
  offsetHeight: number;   // 上下 (浮き + / 沈み -)

  // 回転オフセット (度数法 deg)
  pitch: number;          // 上下傾き
  yaw: number;            // 左右首振り
  roll: number;           // ひねり

  // スケール倍率 (1.0 = 100%)
  scaleAll: number;       // 全体スケール
  scaleLength: number;    // 長さ倍率
  scaleWidth: number;     // 幅倍率
  scaleThickness: number; // 厚み倍率
}

export interface FingerNailConfig {
  visible: boolean;
  transform: NailTransform;
  morphs: Record<string, number>;
}

export interface FingerDefinition {
  id: FingerId;
  label: string;
  side: HandSide;
  type: FingerType;
  vrmBoneName: string;
  fallbackBoneNames?: string[];
  modelFileName: string;
}

export const ALL_FINGER_IDS: FingerId[] = [
  'leftThumb',
  'leftIndex',
  'leftMiddle',
  'leftRing',
  'leftLittle',
  'rightThumb',
  'rightIndex',
  'rightMiddle',
  'rightRing',
  'rightLittle'
];

export interface NailTextureOption {
  id: string;
  label: string;
  fileName: string;
}

export interface NailTemplateOption {
  id: string;
  label: string;
  fileName: string;
  downloadFileName: string;
  description: string;
}

export interface CustomTextureItem {
  id: string;
  name: string;
  dataUrl: string;
  createdAt: number;
}

export type TextureApplyScope = 'all' | 'single';

export interface NailPreset {
  id: string;
  name: string;
  basePath: string;
  fileMap: Record<FingerType, string>;
  alignment: {
    rotationEuler: [number, number, number]; // [x, y, z] ラジアン
    originOffsetRatioZ?: Record<FingerType, number>; // 爪の根元を (0,0,0) に合わせるためのオフセット (m)
    forwardOffsetRatio: { thumb: number; other: number };
    heightOffset: { thumb: number; other: number };
  };
  textures: NailTextureOption[];
  templates: NailTemplateOption[];
  defaultTextureId?: string;
  supportedMorphs: string[];
}

export const RYUKI_PRESET: NailPreset = {
  id: 'ryuki',
  name: 'Ryuki',
  basePath: 'models/nail/Ryuki/',
  fileMap: {
    thumb: 'glb/Thumb.glb',
    index: 'glb/Index.glb',
    middle: 'glb/Middle.glb',
    ring: 'glb/Ring.glb',
    little: 'glb/Little.glb'
  },
  alignment: {
    // -X(先端) -> +Z(指先), +Y(上面) -> +Y(背側), +Z(幅) -> +X(幅)
    rotationEuler: [0, Math.PI / 2, 0],
    originOffsetRatioZ: {
      thumb: 0.0095,
      index: 0.0088,
      middle: 0.0088,
      ring: 0.0086,
      little: 0.0075
    },
    forwardOffsetRatio: { thumb: 0.38, other: 0.52 },
    heightOffset: { thumb: 0.0020, other: 0.0010 }
  },
  textures: [
    { id: 'cheek', label: 'チーク (Cheek)', fileName: 'textures/Texture_Cheek.png' },
    { id: 'french', label: 'フレンチ (French)', fileName: 'textures/Texture_French.png' },
    { id: 'baby_boomers', label: 'ベイビーブーマー (Baby Boomers)', fileName: 'textures/Texture_BabyBoomers.png' },
    { id: 'base', label: 'ベース (Base)', fileName: 'textures/Texture_Base.png' }
  ],
  templates: [
    {
      id: 'base_png',
      label: 'ベーステクスチャ (PNG)',
      fileName: 'textures/Texture_Base.png',
      downloadFileName: 'Ryuki_Nail_Texture_Base.png',
      description: 'ペイント描画の基準となる無地テクスチャ'
    },
    {
      id: 'uv_map',
      label: 'UV展開マップ (PNG)',
      fileName: 'textures/UVmaps.png',
      downloadFileName: 'Ryuki_Nail_UVmaps.png',
      description: '爪のポリゴン境界・UV展開ガイド'
    },
    {
      id: 'psd_template',
      label: '編集用テンプレート (PSD)',
      fileName: 'textures/Texture_PSD.psd',
      downloadFileName: 'Ryuki_Nail_Template.psd',
      description: 'レイヤー分けされたPhotoshop編集元データ'
    }
  ],
  defaultTextureId: 'cheek',
  supportedMorphs: []
};

export const MDOLLNAIL_PRESET: NailPreset = {
  id: 'mdollnail',
  name: 'MDollnail',
  basePath: 'models/nail/MDollnail/',
  fileMap: {
    thumb: 'glb/MD_nail_natural_HandL.Thumb.glb',
    index: 'glb/MD_nail_natural_HandL.Index.glb',
    middle: 'glb/MD_nail_natural_HandL.Middle.glb',
    ring: 'glb/MD_nail_natural_HandL.Ring.glb',
    little: 'glb/MD_nail_natural_HandL.Little.glb'
  },
  alignment: {
    rotationEuler: [-Math.PI / 2, 0, Math.PI],
    forwardOffsetRatio: { thumb: 0.38, other: 0.52 },
    heightOffset: { thumb: 0.0020, other: 0.0010 }
  },
  textures: [],
  templates: [],
  supportedMorphs: ['flat', 'curl', 'curl_front', 'curl_back']
};

export const DEFAULT_NAIL_PRESET = RYUKI_PRESET;

export const FINGER_DEFINITIONS: Record<FingerId, FingerDefinition> = {
  leftThumb: {
    id: 'leftThumb',
    label: '左手 親指',
    side: 'left',
    type: 'thumb',
    vrmBoneName: 'leftThumbDistal',
    fallbackBoneNames: ['leftThumbIntermediate', 'leftThumbProximal'],
    modelFileName: 'Thumb.glb'
  },
  leftIndex: {
    id: 'leftIndex',
    label: '左手 人差し指',
    side: 'left',
    type: 'index',
    vrmBoneName: 'leftIndexDistal',
    fallbackBoneNames: ['leftIndexIntermediate'],
    modelFileName: 'Index.glb'
  },
  leftMiddle: {
    id: 'leftMiddle',
    label: '左手 中指',
    side: 'left',
    type: 'middle',
    vrmBoneName: 'leftMiddleDistal',
    fallbackBoneNames: ['leftMiddleIntermediate'],
    modelFileName: 'Middle.glb'
  },
  leftRing: {
    id: 'leftRing',
    label: '左手 薬指',
    side: 'left',
    type: 'ring',
    vrmBoneName: 'leftRingDistal',
    fallbackBoneNames: ['leftRingIntermediate'],
    modelFileName: 'Ring.glb'
  },
  leftLittle: {
    id: 'leftLittle',
    label: '左手 小指',
    side: 'left',
    type: 'little',
    vrmBoneName: 'leftLittleDistal',
    fallbackBoneNames: ['leftLittleIntermediate'],
    modelFileName: 'Little.glb'
  },
  rightThumb: {
    id: 'rightThumb',
    label: '右手 親指',
    side: 'right',
    type: 'thumb',
    vrmBoneName: 'rightThumbDistal',
    fallbackBoneNames: ['rightThumbIntermediate', 'rightThumbProximal'],
    modelFileName: 'Thumb.glb'
  },
  rightIndex: {
    id: 'rightIndex',
    label: '右手 人差し指',
    side: 'right',
    type: 'index',
    vrmBoneName: 'rightIndexDistal',
    fallbackBoneNames: ['rightIndexIntermediate'],
    modelFileName: 'Index.glb'
  },
  rightMiddle: {
    id: 'rightMiddle',
    label: '右手 中指',
    side: 'right',
    type: 'middle',
    vrmBoneName: 'rightMiddleDistal',
    fallbackBoneNames: ['rightMiddleIntermediate'],
    modelFileName: 'Middle.glb'
  },
  rightRing: {
    id: 'rightRing',
    label: '右手 薬指',
    side: 'right',
    type: 'ring',
    vrmBoneName: 'rightRingDistal',
    fallbackBoneNames: ['rightRingIntermediate'],
    modelFileName: 'Ring.glb'
  },
  rightLittle: {
    id: 'rightLittle',
    label: '右手 小指',
    side: 'right',
    type: 'little',
    vrmBoneName: 'rightLittleDistal',
    fallbackBoneNames: ['rightLittleIntermediate'],
    modelFileName: 'Little.glb'
  }
};

export function createDefaultTransform(): NailTransform {
  return {
    offsetForward: 0,
    offsetSide: 0,
    offsetHeight: 0,
    pitch: 0,
    yaw: 0,
    roll: 0,
    scaleAll: 1.0,
    scaleLength: 1.0,
    scaleWidth: 1.0,
    scaleThickness: 1.0
  };
}

export function createDefaultFingerConfig(): FingerNailConfig {
  return {
    visible: true,
    transform: createDefaultTransform(),
    morphs: {}
  };
}

export function getOppositeFinger(fingerId: FingerId): FingerId {
  const map: Record<FingerId, FingerId> = {
    leftThumb: 'rightThumb',
    leftIndex: 'rightIndex',
    leftMiddle: 'rightMiddle',
    leftRing: 'rightRing',
    leftLittle: 'rightLittle',
    rightThumb: 'leftThumb',
    rightIndex: 'leftIndex',
    rightMiddle: 'leftMiddle',
    rightRing: 'leftRing',
    rightLittle: 'leftLittle'
  };
  return map[fingerId];
}
