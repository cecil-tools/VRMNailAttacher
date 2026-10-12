import fs from 'fs';
import path from 'path';
import * as THREE from 'three';

/**
 * VRMC_vrm_animation-1.0 準拠の GLB バイナリ (.vrma) を構築する
 */
export function createVRMAFile(poseName, boneRotationsEuler) {
  // hips をルートボーンとして常に含める（three-vrm-animation の hipsParent 参照に必須）
  const rotations = {
    hips: new THREE.Euler(0, 0, 0),
    ...boneRotationsEuler
  };

  const boneNames = Object.keys(rotations);
  const nodes = [];
  const humanBones = {};
  const channels = [];
  const samplers = [];

  const bufferParts = [];
  let byteOffset = 0;

  // 1. Time accessor: 1 float [0.0]
  const timeBytes = new Float32Array([0.0]);
  bufferParts.push(Buffer.from(timeBytes.buffer));
  const timeByteOffset = byteOffset;
  byteOffset += timeBytes.byteLength;

  const accessors = [
    {
      bufferView: 0,
      byteOffset: timeByteOffset,
      componentType: 5126, // FLOAT
      count: 1,
      type: 'SCALAR',
      min: [0.0],
      max: [0.0]
    }
  ];

  boneNames.forEach((boneName, nodeIndex) => {
    nodes.push({ name: boneName });
    humanBones[boneName] = { node: nodeIndex };

    const euler = rotations[boneName];
    const q = new THREE.Quaternion().setFromEuler(euler);
    const quatBytes = new Float32Array([q.x, q.y, q.z, q.w]);

    const quatByteOffset = byteOffset;
    bufferParts.push(Buffer.from(quatBytes.buffer));
    byteOffset += quatBytes.byteLength;

    const accessorIndex = accessors.length;
    accessors.push({
      bufferView: 0,
      byteOffset: quatByteOffset,
      componentType: 5126, // FLOAT
      count: 1,
      type: 'VEC4'
    });

    const samplerIndex = samplers.length;
    samplers.push({
      input: 0, // time accessor
      output: accessorIndex,
      interpolation: 'LINEAR'
    });

    channels.push({
      sampler: samplerIndex,
      target: {
        node: nodeIndex,
        path: 'rotation'
      }
    });
  });

  const binBuffer = Buffer.concat(bufferParts);
  const padLength = (4 - (binBuffer.length % 4)) % 4;
  const paddedBinBuffer = padLength > 0
    ? Buffer.concat([binBuffer, Buffer.alloc(padLength, 0)])
    : binBuffer;

  const rootNodeIndices = nodes.map((_, idx) => idx);

  const gltf = {
    asset: {
      version: '2.0',
      generator: 'VRMNailAttacher VRMA Pose Generator'
    },
    extensionsUsed: ['VRMC_vrm_animation'],
    extensions: {
      VRMC_vrm_animation: {
        specVersion: '1.0',
        humanoid: {
          humanBones: humanBones
        }
      }
    },
    scenes: [{ nodes: rootNodeIndices }],
    scene: 0,
    nodes: nodes,
    animations: [
      {
        name: poseName,
        channels: channels,
        samplers: samplers
      }
    ],
    buffers: [
      {
        byteLength: paddedBinBuffer.length
      }
    ],
    bufferViews: [
      {
        buffer: 0,
        byteOffset: 0,
        byteLength: binBuffer.length
      }
    ],
    accessors: accessors
  };

  const jsonString = JSON.stringify(gltf);
  const jsonBuffer = Buffer.from(jsonString, 'utf8');
  const jsonPadLength = (4 - (jsonBuffer.length % 4)) % 4;
  const paddedJsonBuffer = jsonPadLength > 0
    ? Buffer.concat([jsonBuffer, Buffer.alloc(jsonPadLength, 0x20)]) // Pad with spaces
    : jsonBuffer;

  const headerLength = 12;
  const jsonChunkHeaderLength = 8;
  const binChunkHeaderLength = 8;
  const totalLength =
    headerLength +
    jsonChunkHeaderLength +
    paddedJsonBuffer.length +
    binChunkHeaderLength +
    paddedBinBuffer.length;

  const glbBuffer = Buffer.alloc(totalLength);
  let offset = 0;

  // Header: magic (0x46546C67), version (2), totalLength
  glbBuffer.writeUInt32LE(0x46546c67, offset); offset += 4;
  glbBuffer.writeUInt32LE(2, offset); offset += 4;
  glbBuffer.writeUInt32LE(totalLength, offset); offset += 4;

  // JSON Chunk
  glbBuffer.writeUInt32LE(paddedJsonBuffer.length, offset); offset += 4;
  glbBuffer.writeUInt32LE(0x4e4f534a, offset); offset += 4; // "JSON"
  paddedJsonBuffer.copy(glbBuffer, offset); offset += paddedJsonBuffer.length;

  // BIN Chunk
  glbBuffer.writeUInt32LE(paddedBinBuffer.length, offset); offset += 4;
  glbBuffer.writeUInt32LE(0x004e4942, offset); offset += 4; // "BIN\0"
  paddedBinBuffer.copy(glbBuffer, offset);

  return glbBuffer;
}

// 指ポーズヘルパー関数
function makeFingers(side, style = 'graceful') {
  const isRight = side === 'right';
  const sign = isRight ? 1 : -1;
  const prefix = isRight ? 'right' : 'left';

  if (style === 'claw') {
    // 猫の手・ガオ〜ポーズ（全指を鉤爪状に曲げて爪を正面に向ける）
    return {
      [`${prefix}ThumbMetacarpal`]: new THREE.Euler(0.2, sign * 0.1, -sign * 0.1),
      [`${prefix}ThumbProximal`]: new THREE.Euler(0.0, 0.0, sign * 0.5),
      [`${prefix}ThumbDistal`]: new THREE.Euler(0.0, 0.0, sign * 0.6),

      [`${prefix}IndexProximal`]: new THREE.Euler(0.0, 0.0, sign * 0.8),
      [`${prefix}IndexIntermediate`]: new THREE.Euler(0.0, 0.0, sign * 1.1),
      [`${prefix}IndexDistal`]: new THREE.Euler(0.0, 0.0, sign * 0.6),

      [`${prefix}MiddleProximal`]: new THREE.Euler(0.0, 0.0, sign * 0.85),
      [`${prefix}MiddleIntermediate`]: new THREE.Euler(0.0, 0.0, sign * 1.15),
      [`${prefix}MiddleDistal`]: new THREE.Euler(0.0, 0.0, sign * 0.65),

      [`${prefix}RingProximal`]: new THREE.Euler(0.0, 0.0, sign * 0.8),
      [`${prefix}RingIntermediate`]: new THREE.Euler(0.0, 0.0, sign * 1.1),
      [`${prefix}RingDistal`]: new THREE.Euler(0.0, 0.0, sign * 0.6),

      [`${prefix}LittleProximal`]: new THREE.Euler(0.0, 0.0, sign * 0.75),
      [`${prefix}LittleIntermediate`]: new THREE.Euler(0.0, 0.0, sign * 1.05),
      [`${prefix}LittleDistal`]: new THREE.Euler(0.0, 0.0, sign * 0.55),
    };
  }

  if (style === 'spread') {
    // 指先を綺麗に放射状に広げたオープンハンド
    return {
      [`${prefix}ThumbMetacarpal`]: new THREE.Euler(0.2, sign * 0.2, -sign * 0.15),
      [`${prefix}ThumbProximal`]: new THREE.Euler(0.0, 0.0, sign * 0.15),
      [`${prefix}ThumbDistal`]: new THREE.Euler(0.0, 0.0, sign * 0.10),

      [`${prefix}IndexProximal`]: new THREE.Euler(0.10, sign * 0.12, sign * 0.18),
      [`${prefix}IndexIntermediate`]: new THREE.Euler(0.0, 0.0, sign * 0.20),
      [`${prefix}IndexDistal`]: new THREE.Euler(0.0, 0.0, sign * 0.10),

      [`${prefix}MiddleProximal`]: new THREE.Euler(0.0, 0.0, sign * 0.18),
      [`${prefix}MiddleIntermediate`]: new THREE.Euler(0.0, 0.0, sign * 0.22),
      [`${prefix}MiddleDistal`]: new THREE.Euler(0.0, 0.0, sign * 0.12),

      [`${prefix}RingProximal`]: new THREE.Euler(-0.08, -sign * 0.10, sign * 0.20),
      [`${prefix}RingIntermediate`]: new THREE.Euler(0.0, 0.0, sign * 0.22),
      [`${prefix}RingDistal`]: new THREE.Euler(0.0, 0.0, sign * 0.12),

      [`${prefix}LittleProximal`]: new THREE.Euler(-0.16, -sign * 0.18, sign * 0.22),
      [`${prefix}LittleIntermediate`]: new THREE.Euler(0.0, 0.0, sign * 0.22),
      [`${prefix}LittleDistal`]: new THREE.Euler(0.0, 0.0, sign * 0.12),
    };
  }

  if (style === 'cupped') {
    // すくい手（指同士が揃い、優しく内側にカーブ）
    return {
      [`${prefix}ThumbMetacarpal`]: new THREE.Euler(0.12, sign * 0.08, -sign * 0.08),
      [`${prefix}ThumbProximal`]: new THREE.Euler(0.0, 0.0, sign * 0.15),
      [`${prefix}ThumbDistal`]: new THREE.Euler(0.0, 0.0, sign * 0.12),

      [`${prefix}IndexProximal`]: new THREE.Euler(0.02, 0.0, sign * 0.25),
      [`${prefix}IndexIntermediate`]: new THREE.Euler(0.0, 0.0, sign * 0.32),
      [`${prefix}IndexDistal`]: new THREE.Euler(0.0, 0.0, sign * 0.16),

      [`${prefix}MiddleProximal`]: new THREE.Euler(0.0, 0.0, sign * 0.28),
      [`${prefix}MiddleIntermediate`]: new THREE.Euler(0.0, 0.0, sign * 0.35),
      [`${prefix}MiddleDistal`]: new THREE.Euler(0.0, 0.0, sign * 0.18),

      [`${prefix}RingProximal`]: new THREE.Euler(-0.02, 0.0, sign * 0.26),
      [`${prefix}RingIntermediate`]: new THREE.Euler(0.0, 0.0, sign * 0.33),
      [`${prefix}RingDistal`]: new THREE.Euler(0.0, 0.0, sign * 0.16),

      [`${prefix}LittleProximal`]: new THREE.Euler(-0.04, 0.0, sign * 0.22),
      [`${prefix}LittleIntermediate`]: new THREE.Euler(0.0, 0.0, sign * 0.30),
      [`${prefix}LittleDistal`]: new THREE.Euler(0.0, 0.0, sign * 0.14),
    };
  }

  if (style === 'lipTouch') {
    // 人差し指を伸ばして唇に当て、他指を軽く丸める
    return {
      [`${prefix}ThumbMetacarpal`]: new THREE.Euler(0.25, sign * 0.15, -sign * 0.10),
      [`${prefix}ThumbProximal`]: new THREE.Euler(0.0, 0.0, sign * 0.45),
      [`${prefix}ThumbDistal`]: new THREE.Euler(0.0, 0.0, sign * 0.35),

      [`${prefix}IndexProximal`]: new THREE.Euler(0.05, 0.0, sign * 0.12),
      [`${prefix}IndexIntermediate`]: new THREE.Euler(0.0, 0.0, sign * 0.14),
      [`${prefix}IndexDistal`]: new THREE.Euler(0.0, 0.0, sign * 0.08),

      [`${prefix}MiddleProximal`]: new THREE.Euler(0.0, 0.0, sign * 0.65),
      [`${prefix}MiddleIntermediate`]: new THREE.Euler(0.0, 0.0, sign * 0.85),
      [`${prefix}MiddleDistal`]: new THREE.Euler(0.0, 0.0, sign * 0.45),

      [`${prefix}RingProximal`]: new THREE.Euler(-0.04, 0.0, sign * 0.70),
      [`${prefix}RingIntermediate`]: new THREE.Euler(0.0, 0.0, sign * 0.90),
      [`${prefix}RingDistal`]: new THREE.Euler(0.0, 0.0, sign * 0.50),

      [`${prefix}LittleProximal`]: new THREE.Euler(-0.08, 0.0, sign * 0.70),
      [`${prefix}LittleIntermediate`]: new THREE.Euler(0.0, 0.0, sign * 0.90),
      [`${prefix}LittleDistal`]: new THREE.Euler(0.0, 0.0, sign * 0.50),
    };
  }

  // デフォルト: graceful（優美なネイルサロン風カール）
  return {
    [`${prefix}ThumbMetacarpal`]: new THREE.Euler(0.15, sign * 0.10, -sign * 0.10),
    [`${prefix}ThumbProximal`]: new THREE.Euler(0.0, 0.0, sign * 0.18),
    [`${prefix}ThumbDistal`]: new THREE.Euler(0.0, 0.0, sign * 0.15),

    [`${prefix}IndexProximal`]: new THREE.Euler(0.04, sign * 0.04, sign * 0.28),
    [`${prefix}IndexIntermediate`]: new THREE.Euler(0.0, 0.0, sign * 0.38),
    [`${prefix}IndexDistal`]: new THREE.Euler(0.0, 0.0, sign * 0.18),

    [`${prefix}MiddleProximal`]: new THREE.Euler(0.0, 0.0, sign * 0.32),
    [`${prefix}MiddleIntermediate`]: new THREE.Euler(0.0, 0.0, sign * 0.42),
    [`${prefix}MiddleDistal`]: new THREE.Euler(0.0, 0.0, sign * 0.20),

    [`${prefix}RingProximal`]: new THREE.Euler(-0.04, -sign * 0.04, sign * 0.30),
    [`${prefix}RingIntermediate`]: new THREE.Euler(0.0, 0.0, sign * 0.40),
    [`${prefix}RingDistal`]: new THREE.Euler(0.0, 0.0, sign * 0.18),

    [`${prefix}LittleProximal`]: new THREE.Euler(-0.08, -sign * 0.08, sign * 0.25),
    [`${prefix}LittleIntermediate`]: new THREE.Euler(0.0, 0.0, sign * 0.35),
    [`${prefix}LittleDistal`]: new THREE.Euler(0.0, 0.0, sign * 0.15),
  };
}

// 腕ポーズの左右反転ヘルパー
function mirrorArm(rightPose) {
  const left = {};
  if (rightPose.rightUpperArm) {
    const r = rightPose.rightUpperArm;
    left.leftUpperArm = new THREE.Euler(r.x, -r.y, -r.z);
  }
  if (rightPose.rightLowerArm) {
    const r = rightPose.rightLowerArm;
    left.leftLowerArm = new THREE.Euler(r.x, -r.y, -r.z);
  }
  if (rightPose.rightHand) {
    const r = rightPose.rightHand;
    left.leftHand = new THREE.Euler(r.x, -r.y, -r.z);
  }
  return left;
}

// リラックス腕
const relaxLeftArm = {
  leftUpperArm: new THREE.Euler(0.0, -0.1, -1.25),
  leftLowerArm: new THREE.Euler(0.0, -0.2, 0.0),
  leftHand: new THREE.Euler(0.0, 0.0, 0.0),
};
const relaxRightArm = {
  rightUpperArm: new THREE.Euler(0.0, 0.1, 1.25),
  rightLowerArm: new THREE.Euler(0.0, 0.2, 0.0),
  rightHand: new THREE.Euler(0.0, 0.0, 0.0),
};

// ディレクトリ作成
const posesDir = path.resolve('public/models/poses');
if (!fs.existsSync(posesDir)) {
  fs.mkdirSync(posesDir, { recursive: true });
}

// ==========================================
// 1. 基本ポーズ（右・左・両手サロン）
// ==========================================
const rightPhotoPose = {
  ...relaxLeftArm,
  rightUpperArm: new THREE.Euler(-0.30, 0.40, 1.30),
  rightLowerArm: new THREE.Euler(0.00, 1.70, 0.00),
  rightHand: new THREE.Euler(-1.97, 0.42, 1.38),
  ...makeFingers('right', 'graceful'),
  ...makeFingers('left', 'cupped'),
};

const leftPhotoPose = {
  ...relaxRightArm,
  leftUpperArm: new THREE.Euler(-0.30, -0.40, -1.30),
  leftLowerArm: new THREE.Euler(0.00, -1.70, 0.00),
  leftHand: new THREE.Euler(-1.97, -0.42, -1.38),
  ...makeFingers('left', 'graceful'),
  ...makeFingers('right', 'cupped'),
};

const bothPhotoPose = {
  rightUpperArm: new THREE.Euler(-0.30, 0.40, 1.30),
  rightLowerArm: new THREE.Euler(0.00, 1.70, 0.00),
  rightHand: new THREE.Euler(-1.97, 0.42, 1.38),
  ...makeFingers('right', 'graceful'),
  leftUpperArm: new THREE.Euler(-0.30, -0.40, -1.30),
  leftLowerArm: new THREE.Euler(0.00, -1.70, 0.00),
  leftHand: new THREE.Euler(-1.97, -0.42, -1.38),
  ...makeFingers('left', 'graceful'),
};

// ==========================================
// 2. サロン・両手見せ系
// ==========================================

// 2-1. 両手すくい見せ (sipposenail 09 / 表紙)
// 胸の前で両手を並べ、手の甲をカメラに向けて全10指を優雅に見せる王道サロンポーズ
const salonCuppedPose = {
  rightUpperArm: new THREE.Euler(-0.38, 0.35, 1.15),
  rightLowerArm: new THREE.Euler(0.0, 1.55, 0.0),
  rightHand: new THREE.Euler(-1.85, 0.35, 1.25),
  ...makeFingers('right', 'cupped'),

  leftUpperArm: new THREE.Euler(-0.38, -0.35, -1.15),
  leftLowerArm: new THREE.Euler(0.0, -1.55, 0.0),
  leftHand: new THREE.Euler(-1.85, -0.35, -1.25),
  ...makeFingers('left', 'cupped'),
};

// 2-2. デコルテ重ね (sipposenail 26)
// 胸元で両腕を交差させ、左右の手がデコルテに沿って並ぶ
const salonChestCrossPose = {
  rightUpperArm: new THREE.Euler(-0.45, 0.55, 1.05),
  rightLowerArm: new THREE.Euler(0.0, 1.85, 0.0),
  rightHand: new THREE.Euler(-1.60, 0.50, 0.95),
  ...makeFingers('right', 'spread'),

  leftUpperArm: new THREE.Euler(-0.35, -0.45, -1.15),
  leftLowerArm: new THREE.Euler(0.0, -1.75, 0.0),
  leftHand: new THREE.Euler(-1.55, -0.40, -0.90),
  ...makeFingers('left', 'spread'),
};

// 2-3. 口元重ね (sipposenail 08)
// 口元・顎下で両手を水平に重ね、ささやくような可愛い仕草
const salonMouthOverlapPose = {
  rightUpperArm: new THREE.Euler(-0.55, 0.45, 1.15),
  rightLowerArm: new THREE.Euler(0.0, 2.05, 0.0),
  rightHand: new THREE.Euler(-1.80, 0.40, 1.15),
  ...makeFingers('right', 'graceful'),

  leftUpperArm: new THREE.Euler(-0.50, -0.40, -1.20),
  leftLowerArm: new THREE.Euler(0.0, -1.95, 0.0),
  leftHand: new THREE.Euler(-1.75, -0.35, -1.10),
  ...makeFingers('left', 'graceful'),
};

// ==========================================
// 3. フェイス＆チーク系
// ==========================================

// 3-1. 輪郭フレーム (sipposenail 02)
// 両手を広げて顔の輪郭を包み込み、小顔効果とネイルを両立
const faceFramePose = {
  head: new THREE.Euler(0.05, 0.0, 0.0),
  rightUpperArm: new THREE.Euler(-0.65, 0.30, 0.95),
  rightLowerArm: new THREE.Euler(0.0, 2.15, 0.0),
  rightHand: new THREE.Euler(-1.75, 0.30, 1.45),
  ...makeFingers('right', 'spread'),

  leftUpperArm: new THREE.Euler(-0.65, -0.30, -0.95),
  leftLowerArm: new THREE.Euler(0.0, -2.15, 0.0),
  leftHand: new THREE.Euler(-1.75, -0.30, -1.45),
  ...makeFingers('left', 'spread'),
};

// 3-2. 両手ほおづえ (sipposenail 17)
// 顎・頬を両手で包み込む
const faceCheekRestPose = {
  head: new THREE.Euler(-0.05, 0.0, 0.0),
  rightUpperArm: new THREE.Euler(-0.70, 0.25, 0.85),
  rightLowerArm: new THREE.Euler(0.0, 2.25, 0.0),
  rightHand: new THREE.Euler(-1.60, 0.20, 1.35),
  ...makeFingers('right', 'cupped'),

  leftUpperArm: new THREE.Euler(-0.70, -0.25, -0.85),
  leftLowerArm: new THREE.Euler(0.0, -2.25, 0.0),
  leftHand: new THREE.Euler(-1.60, -0.20, -1.35),
  ...makeFingers('left', 'cupped'),
};

// 3-3. チークタッチ (sipposenail 12)
// 右手で頬に優しく触れ、左手は胸元に添える
const faceCheekTouchPose = {
  head: new THREE.Euler(0.02, 0.06, -0.08),
  rightUpperArm: new THREE.Euler(-0.60, 0.30, 0.95),
  rightLowerArm: new THREE.Euler(0.0, 2.10, 0.0),
  rightHand: new THREE.Euler(-1.70, 0.25, 1.40),
  ...makeFingers('right', 'graceful'),

  leftUpperArm: new THREE.Euler(-0.25, -0.30, -1.25),
  leftLowerArm: new THREE.Euler(0.0, -1.45, 0.0),
  leftHand: new THREE.Euler(-1.50, -0.30, -0.90),
  ...makeFingers('left', 'graceful'),
};

// 3-4. あご下トライアングル (sipposenail 10/11)
// 顎の下で両手の指先を合わせるキュートなポーズ
const faceTrianglePose = {
  head: new THREE.Euler(0.04, 0.0, 0.0),
  rightUpperArm: new THREE.Euler(-0.50, 0.35, 1.05),
  rightLowerArm: new THREE.Euler(0.0, 1.95, 0.0),
  rightHand: new THREE.Euler(-1.55, 0.45, 1.15),
  ...makeFingers('right', 'graceful'),

  leftUpperArm: new THREE.Euler(-0.50, -0.35, -1.05),
  leftLowerArm: new THREE.Euler(0.0, -1.95, 0.0),
  leftHand: new THREE.Euler(-1.55, -0.45, -1.15),
  ...makeFingers('left', 'graceful'),
};

// ==========================================
// 4. キュート・仕草系
// ==========================================

// 4-1. にゃんこ・ガオ〜 (sipposenail 24)
// 両手を前に構えて指先を鉤爪状に曲げ、全10指のネイルを正面にアピール
const cuteCatClawPose = {
  head: new THREE.Euler(0.05, 0.0, 0.0),
  rightUpperArm: new THREE.Euler(-0.40, 0.30, 1.15),
  rightLowerArm: new THREE.Euler(0.0, 1.80, 0.0),
  rightHand: new THREE.Euler(-1.85, 0.35, 1.30),
  ...makeFingers('right', 'claw'),

  leftUpperArm: new THREE.Euler(-0.40, -0.30, -1.15),
  leftLowerArm: new THREE.Euler(0.0, -1.80, 0.0),
  leftHand: new THREE.Euler(-1.85, -0.35, -1.30),
  ...makeFingers('left', 'claw'),
};

// 4-2. お祈り (sipposenail 04)
// 胸の前で両手を合わせる
const cutePrayerPose = {
  head: new THREE.Euler(0.05, 0.0, 0.0),
  rightUpperArm: new THREE.Euler(-0.45, 0.25, 1.05),
  rightLowerArm: new THREE.Euler(0.0, 1.95, 0.0),
  rightHand: new THREE.Euler(-1.50, 0.15, 1.55),
  ...makeFingers('right', 'cupped'),

  leftUpperArm: new THREE.Euler(-0.45, -0.25, -1.05),
  leftLowerArm: new THREE.Euler(0.0, -1.95, 0.0),
  leftHand: new THREE.Euler(-1.50, -0.15, -1.55),
  ...makeFingers('left', 'cupped'),
};

// 4-3. リップタッチ (sipposenail 25)
// 人差し指を唇に当てるあざと可愛い仕草
const cuteLipTouchPose = {
  head: new THREE.Euler(0.04, 0.08, -0.06),
  rightUpperArm: new THREE.Euler(-0.55, 0.35, 1.00),
  rightLowerArm: new THREE.Euler(0.0, 2.15, 0.0),
  rightHand: new THREE.Euler(-1.75, 0.30, 1.35),
  ...makeFingers('right', 'lipTouch'),
  ...relaxLeftArm,
  ...makeFingers('left', 'cupped'),
};

// 全ポーズマップ
const allPoseDefinitions = [
  { name: 'NailPhotoRight', filename: 'nail_photo_right.vrma', data: rightPhotoPose },
  { name: 'NailPhotoLeft', filename: 'nail_photo_left.vrma', data: leftPhotoPose },
  { name: 'NailPhotoBoth', filename: 'nail_photo_both.vrma', data: bothPhotoPose },
  { name: 'SalonCupped', filename: 'salon_cupped.vrma', data: salonCuppedPose },
  { name: 'SalonChestCross', filename: 'salon_chest_cross.vrma', data: salonChestCrossPose },
  { name: 'SalonMouthOverlap', filename: 'salon_mouth_overlap.vrma', data: salonMouthOverlapPose },
  { name: 'FaceFrame', filename: 'face_frame.vrma', data: faceFramePose },
  { name: 'FaceCheekRest', filename: 'face_cheek_rest.vrma', data: faceCheekRestPose },
  { name: 'FaceCheekTouch', filename: 'face_cheek_touch.vrma', data: faceCheekTouchPose },
  { name: 'FaceTriangle', filename: 'face_triangle.vrma', data: faceTrianglePose },
  { name: 'CuteCatClaw', filename: 'cute_cat_claw.vrma', data: cuteCatClawPose },
  { name: 'CutePrayer', filename: 'cute_prayer.vrma', data: cutePrayerPose },
  { name: 'CuteLipTouch', filename: 'cute_lip_touch.vrma', data: cuteLipTouchPose }
];

console.log(`Generating ${allPoseDefinitions.length} VRMC_vrm_animation-1.0 pose files...`);

for (const pose of allPoseDefinitions) {
  const vrmaBuffer = createVRMAFile(pose.name, pose.data);
  const outPath = path.join(posesDir, pose.filename);
  fs.writeFileSync(outPath, vrmaBuffer);
  console.log(`✓ ${pose.filename} (${vrmaBuffer.length} bytes)`);
}

console.log('All VRMA poses generated successfully!');
