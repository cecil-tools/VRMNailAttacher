<template>
  <div class="nail-control-panel">
    <!-- Header with Toggle -->
    <div class="panel-header">
      <div class="panel-header__info">
        <h3 class="panel-title">ネイルチップ設定</h3>
        <span class="badge" :class="isAttached ? 'badge--success' : 'badge--muted'">
          {{ isAttached ? '装着中 (10本)' : '未装着' }}
        </span>
      </div>

      <label class="switch" title="ネイルの装着 / 解除">
        <input
          type="checkbox"
          :checked="isAttached"
          :disabled="!hasModel || isLoading"
          @change="onToggleAttach"
        />
        <span class="slider round"></span>
      </label>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="panel-loading">
      <span class="spinner-small"></span>
      <span>ネイル 3D モデルを準備中...</span>
    </div>

    <!-- Active Nail Controls -->
    <div v-else-if="isAttached" class="panel-content">
      <!-- Global Scale Controls (全指一括サイズ調整) -->
      <GlobalScaleControl
        @global-scale-change="onGlobalScaleChange"
        @reset-global-scale="onResetGlobalScale"
      />

      <!-- Finger Selector -->
      <FingerSelector
        @select-finger="onSelectFinger"
        @focus-finger="onFocusFinger"
      />

      <!-- Texture Controls -->
      <TextureControl
        @texture-change="onTextureChange"
      />

      <!-- Transform Controls -->
      <TransformControl
        @transform-change="onTransformChange"
        @reset="onResetTransform"
        @apply-all="onApplyAllTransform"
      />

      <!-- Morph Controls -->
      <MorphControl
        @morph-change="onMorphChange"
        @morph-reset="onMorphReset"
      />
    </div>

    <!-- Inactive State Hint -->
    <div v-else class="panel-empty">
      <p class="panel-empty__desc">
        スイッチを ON にすると、アバターの左右 10 本の指先ボーンへネイルチップ 3D モデルを自動装着します。
      </p>
      <button
        class="btn btn--primary btn--full"
        :disabled="!hasModel"
        @click="attachNails"
      >
        <span>💅 ネイルを自動装着する</span>
      </button>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';
import GlobalScaleControl from './GlobalScaleControl.vue';
import FingerSelector from './FingerSelector.vue';
import TextureControl from './TextureControl.vue';
import TransformControl from './TransformControl.vue';
import MorphControl from './MorphControl.vue';
import { FingerId, NailTransform } from '@/modules/nail/types';

@Component({
  components: {
    GlobalScaleControl,
    FingerSelector,
    TextureControl,
    TransformControl,
    MorphControl
  }
})
export default class NailControlPanel extends Vue {
  get hasModel(): boolean {
    return this.$store.getters.hasModel;
  }

  get isAttached(): boolean {
    return this.$store.state.nail?.isAttached || false;
  }

  get isLoading(): boolean {
    return this.$store.state.nail?.isLoading || false;
  }

  private onToggleAttach(e: Event) {
    const target = e.target as HTMLInputElement;
    if (target.checked) {
      this.attachNails();
    } else {
      this.detachNails();
    }
  }

  private attachNails() {
    this.$emit('request-attach');
  }

  private detachNails() {
    this.$emit('request-detach');
  }

  private onSelectFinger(fingerId: FingerId) {
    this.$emit('select-finger', fingerId);
  }

  private onFocusFinger(fingerId: FingerId) {
    this.$emit('focus-finger', fingerId);
  }

  private onTextureChange(textureId: string) {
    this.$emit('texture-change', textureId);
  }

  private onTransformChange(payload: { fingerId: FingerId; key: keyof NailTransform; value: number }) {
    this.$emit('transform-change', payload);
  }

  private onResetTransform(fingerId: FingerId) {
    this.$emit('reset-transform', fingerId);
  }

  private onApplyAllTransform(transform: NailTransform) {
    this.$emit('apply-all-transform', transform);
  }

  private onGlobalScaleChange(payload?: { key: string; value: number }) {
    this.$emit('global-scale-change', payload);
  }

  private onResetGlobalScale() {
    this.$emit('reset-global-scale');
  }

  private onMorphChange(payload: { fingerId: FingerId; name: string; value: number }) {
    this.$emit('morph-change', payload);
  }

  private onMorphReset(fingerId: FingerId) {
    this.$emit('morph-reset', fingerId);
  }
}
</script>

<style lang="scss" scoped>
.nail-control-panel {
  display: flex;
  flex-direction: column;
  gap: $space-md;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;

  &__info {
    display: flex;
    align-items: center;
    gap: $space-sm;
  }
}

.panel-title {
  font-size: $font-size-sm;
  font-weight: 600;
  color: $text-primary;
}

.panel-content {
  display: flex;
  flex-direction: column;
  gap: $space-md;
}

.panel-loading {
  display: flex;
  align-items: center;
  gap: $space-sm;
  padding: $space-md;
  background: $bg-secondary;
  border-radius: $radius-md;
  font-size: $font-size-xs;
  color: $text-muted;
}

.spinner-small {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 101, 132, 0.2);
  border-top-color: $accent-pink;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.panel-empty {
  display: flex;
  flex-direction: column;
  gap: $space-md;

  &__desc {
    font-size: $font-size-xs;
    color: $text-muted;
    line-height: 1.6;
  }
}

/* Switch styling */
.switch {
  position: relative;
  display: inline-block;
  width: 40px;
  height: 22px;

  input {
    opacity: 0;
    width: 0;
    height: 0;
  }
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: $bg-elevated;
  transition: 0.2s;

  &:before {
    position: absolute;
    content: '';
    height: 16px;
    width: 16px;
    left: 3px;
    bottom: 3px;
    background-color: #ffffff;
    transition: 0.2s;
  }

  &.round {
    border-radius: 22px;

    &:before {
      border-radius: 50%;
    }
  }
}

input:checked + .slider {
  background-color: $accent-pink;
}

input:checked + .slider:before {
  transform: translateX(18px);
}

input:disabled + .slider {
  opacity: 0.4;
  cursor: not-allowed;
}
</style>
