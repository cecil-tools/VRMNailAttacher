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

export const FINGER_DEFINITIONS: Record<FingerId, FingerDefinition> = {
  leftThumb: {
    id: 'leftThumb',
    label: '左手 親指',
    side: 'left',
    type: 'thumb',
    vrmBoneName: 'leftThumbDistal',
    fallbackBoneNames: ['leftThumbIntermediate', 'leftThumbProximal'],
    modelFileName: 'MD_nail_natural_HandL.Thumb.glb'
  },
  leftIndex: {
    id: 'leftIndex',
    label: '左手 人差し指',
    side: 'left',
    type: 'index',
    vrmBoneName: 'leftIndexDistal',
    fallbackBoneNames: ['leftIndexIntermediate'],
    modelFileName: 'MD_nail_natural_HandL.Index.glb'
  },
  leftMiddle: {
    id: 'leftMiddle',
    label: '左手 中指',
    side: 'left',
    type: 'middle',
    vrmBoneName: 'leftMiddleDistal',
    fallbackBoneNames: ['leftMiddleIntermediate'],
    modelFileName: 'MD_nail_natural_HandL.Middle.glb'
  },
  leftRing: {
    id: 'leftRing',
    label: '左手 薬指',
    side: 'left',
    type: 'ring',
    vrmBoneName: 'leftRingDistal',
    fallbackBoneNames: ['leftRingIntermediate'],
    modelFileName: 'MD_nail_natural_HandL.Ring.glb'
  },
  leftLittle: {
    id: 'leftLittle',
    label: '左手 小指',
    side: 'left',
    type: 'little',
    vrmBoneName: 'leftLittleDistal',
    fallbackBoneNames: ['leftLittleIntermediate'],
    modelFileName: 'MD_nail_natural_HandL.Little.glb'
  },
  rightThumb: {
    id: 'rightThumb',
    label: '右手 親指',
    side: 'right',
    type: 'thumb',
    vrmBoneName: 'rightThumbDistal',
    fallbackBoneNames: ['rightThumbIntermediate', 'rightThumbProximal'],
    modelFileName: 'MD_nail_natural_HandR.Thumb.glb'
  },
  rightIndex: {
    id: 'rightIndex',
    label: '右手 人差し指',
    side: 'right',
    type: 'index',
    vrmBoneName: 'rightIndexDistal',
    fallbackBoneNames: ['rightIndexIntermediate'],
    modelFileName: 'MD_nail_natural_HandR.Index.glb'
  },
  rightMiddle: {
    id: 'rightMiddle',
    label: '右手 中指',
    side: 'right',
    type: 'middle',
    vrmBoneName: 'rightMiddleDistal',
    fallbackBoneNames: ['rightMiddleIntermediate'],
    modelFileName: 'MD_nail_natural_HandR.Middle.glb'
  },
  rightRing: {
    id: 'rightRing',
    label: '右手 薬指',
    side: 'right',
    type: 'ring',
    vrmBoneName: 'rightRingDistal',
    fallbackBoneNames: ['rightRingIntermediate'],
    modelFileName: 'MD_nail_natural_HandR.Ring.glb'
  },
  rightLittle: {
    id: 'rightLittle',
    label: '右手 小指',
    side: 'right',
    type: 'little',
    vrmBoneName: 'rightLittleDistal',
    fallbackBoneNames: ['rightLittleIntermediate'],
    modelFileName: 'MD_nail_natural_HandR.Little.glb'
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
