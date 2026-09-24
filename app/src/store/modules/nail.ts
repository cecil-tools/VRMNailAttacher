import { Module } from 'vuex';
import { RootState } from '../index';
import {
  FingerId,
  FingerSelection,
  FingerNailConfig,
  NailTransform,
  ALL_FINGER_IDS,
  createDefaultFingerConfig,
  createDefaultTransform
} from '@/modules/nail/types';

export interface NailState {
  isAttached: boolean;
  isLoading: boolean;
  selectedFinger: FingerSelection;
  symmetrySync: boolean;
  configs: Record<FingerId, FingerNailConfig>;
  availableMorphNames: string[];
}

function getOppositeFinger(fingerId: FingerId): FingerId {
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

function createInitialConfigs(): Record<FingerId, FingerNailConfig> {
  const configs: Partial<Record<FingerId, FingerNailConfig>> = {};
  for (const id of ALL_FINGER_IDS) {
    configs[id] = createDefaultFingerConfig();
  }
  return configs as Record<FingerId, FingerNailConfig>;
}

export const nailModule: Module<NailState, RootState> = {
  namespaced: true,
  state: {
    isAttached: false,
    isLoading: false,
    selectedFinger: 'leftIndex',
    symmetrySync: true,
    configs: createInitialConfigs(),
    availableMorphNames: ['flat', 'curl', 'curl_front', 'curl_back']
  },
  getters: {
    activeConfig: (state) => (fingerId: FingerId): FingerNailConfig => {
      return state.configs[fingerId];
    },
    currentFingerConfig: (state): FingerNailConfig => {
      const fid: FingerId = (state.selectedFinger === 'all' || state.selectedFinger === 'leftAll' || state.selectedFinger === 'rightAll')
        ? 'leftIndex'
        : state.selectedFinger;
      return state.configs[fid];
    }
  },
  mutations: {
    setAttached(state, attached: boolean) {
      state.isAttached = attached;
    },
    setLoading(state, loading: boolean) {
      state.isLoading = loading;
    },
    setSelectedFinger(state, selection: FingerSelection) {
      state.selectedFinger = selection;
    },
    setSymmetrySync(state, sync: boolean) {
      state.symmetrySync = sync;
    },
    setAvailableMorphNames(state, names: string[]) {
      state.availableMorphNames = names;
    },
    updateFingerTransform(
      state,
      payload: { fingerId: FingerId; transform: Partial<NailTransform>; skipSymmetry?: boolean }
    ) {
      const { fingerId, transform, skipSymmetry } = payload;
      const target = state.configs[fingerId];
      if (!target) return;

      Object.assign(target.transform, transform);

      // 左右対称同期
      if (state.symmetrySync && !skipSymmetry) {
        const oppositeId = getOppositeFinger(fingerId);
        const opposite = state.configs[oppositeId];
        if (opposite) {
          const mirroredTransform: Partial<NailTransform> = { ...transform };
          if (transform.offsetSide !== undefined) {
            mirroredTransform.offsetSide = -transform.offsetSide;
          }
          if (transform.yaw !== undefined) {
            mirroredTransform.yaw = -transform.yaw;
          }
          if (transform.roll !== undefined) {
            mirroredTransform.roll = -transform.roll;
          }
          Object.assign(opposite.transform, mirroredTransform);
        }
      }
    },
    updateFingerMorph(
      state,
      payload: { fingerId: FingerId; morphName: string; value: number }
    ) {
      const { fingerId, morphName, value } = payload;
      const target = state.configs[fingerId];
      if (!target) return;

      target.morphs = {
        ...target.morphs,
        [morphName]: value
      };

      if (state.symmetrySync) {
        const oppositeId = getOppositeFinger(fingerId);
        const opposite = state.configs[oppositeId];
        if (opposite) {
          opposite.morphs = {
            ...opposite.morphs,
            [morphName]: value
          };
        }
      }
    },
    setFingerVisible(state, payload: { fingerId: FingerId; visible: boolean }) {
      const target = state.configs[payload.fingerId];
      if (target) {
        target.visible = payload.visible;
      }
    },
    applyTransformToAllFingers(state, transform: Partial<NailTransform>) {
      for (const id of ALL_FINGER_IDS) {
        const target = state.configs[id];
        if (target) {
          Object.assign(target.transform, transform);
        }
      }
    },
    resetFingerTransform(state, fingerId?: FingerId) {
      if (fingerId) {
        state.configs[fingerId].transform = createDefaultTransform();
        if (state.symmetrySync) {
          const opp = getOppositeFinger(fingerId);
          state.configs[opp].transform = createDefaultTransform();
        }
      } else {
        for (const id of ALL_FINGER_IDS) {
          state.configs[id].transform = createDefaultTransform();
          state.configs[id].morphs = {};
        }
      }
    }
  }
};
