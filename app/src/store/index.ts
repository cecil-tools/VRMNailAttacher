import Vue from 'vue';
import Vuex from 'vuex';
import { VRMModelMeta } from '@/modules/vrm/VRMLoader';

Vue.use(Vuex);

export interface PresetModel {
  id: string;
  name: string;
  path: string;
  version: '0.x' | '1.0';
}

export interface RootState {
  currentModelName: string | null;
  currentMeta: VRMModelMeta | null;
  isLoading: boolean;
  loadingProgress: number;
  loadingMessage: string;
  presetModels: PresetModel[];
  cameraPreset: 'full' | 'upper' | 'hands' | 'leftHand' | 'rightHand' | 'top';
  showGrid: boolean;
}

export default new Vuex.Store<RootState>({
  state: {
    currentModelName: null,
    currentMeta: null,
    isLoading: false,
    loadingProgress: 0,
    loadingMessage: '',
    cameraPreset: 'hands',
    showGrid: true,
    presetModels: [
      {
        id: 'vrm-1.0-aki',
        name: 'Aki (VRM 1.0)',
        path: process.env.BASE_URL + 'models/vrm/1.0/aki.vrm',
        version: '1.0'
      },
      {
        id: 'vrm-1.0-jitome',
        name: 'Jitome (VRM 1.0)',
        path: process.env.BASE_URL + 'models/vrm/1.0/jitome.vrm',
        version: '1.0'
      },
      {
        id: 'vrm-1.0-pee',
        name: 'Pee (VRM 1.0)',
        path: process.env.BASE_URL + 'models/vrm/1.0/pee.vrm',
        version: '1.0'
      },
      {
        id: 'vrm-0.x-default',
        name: 'Default (VRM 0.x)',
        path: process.env.BASE_URL + 'models/vrm/0.x/default.vrm',
        version: '0.x'
      },
      {
        id: 'vrm-0.x-jitome',
        name: 'Jitome (VRM 0.x)',
        path: process.env.BASE_URL + 'models/vrm/0.x/jitome.vrm',
        version: '0.x'
      }
    ]
  },
  getters: {
    hasModel: (state) => state.currentModelName !== null,
    activeMeta: (state) => state.currentMeta
  },
  mutations: {
    setModel(state, payload: { name: string; meta: VRMModelMeta }) {
      state.currentModelName = payload.name;
      state.currentMeta = payload.meta;
    },
    clearModel(state) {
      state.currentModelName = null;
      state.currentMeta = null;
    },
    setLoading(state, payload: { isLoading: boolean; progress?: number; message?: string }) {
      state.isLoading = payload.isLoading;
      state.loadingProgress = payload.progress ?? 0;
      state.loadingMessage = payload.message || '';
    },
    setCameraPreset(state, preset: 'full' | 'upper' | 'hands' | 'leftHand' | 'rightHand' | 'top') {
      state.cameraPreset = preset;
    },
    setShowGrid(state, show: boolean) {
      state.showGrid = show;
    }
  },
  actions: {},
  modules: {}
});
