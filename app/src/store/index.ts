import Vue from 'vue';
import Vuex from 'vuex';

Vue.use(Vuex);

export interface RootState {
  currentModelName: string | null;
  isLoading: boolean;
  loadingMessage: string;
}

export default new Vuex.Store<RootState>({
  state: {
    currentModelName: null,
    isLoading: false,
    loadingMessage: ''
  },
  getters: {
    hasModel: (state) => state.currentModelName !== null
  },
  mutations: {
    setModelName(state, name: string | null) {
      state.currentModelName = name;
    },
    setLoading(state, payload: { isLoading: boolean; message?: string }) {
      state.isLoading = payload.isLoading;
      state.loadingMessage = payload.message || '';
    }
  },
  actions: {},
  modules: {}
});
