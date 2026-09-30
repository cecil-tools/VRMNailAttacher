<template>
  <div class="transform-control">
    <!-- Section: Position -->
    <div class="control-group">
      <div class="control-group__header">
        <span class="control-group__title">位置オフセット (mm)</span>
      </div>
      <div class="slider-row">
        <label class="slider-label">前後 (先端/根元):</label>
        <input
          type="range"
          min="-15"
          max="15"
          step="0.1"
          :value="currentTransform.offsetForward"
          @input="onInput('offsetForward', $event)"
        />
        <span class="slider-val">{{ currentTransform.offsetForward.toFixed(1) }}</span>
      </div>
      <div class="slider-row">
        <label class="slider-label">左右 (内外):</label>
        <input
          type="range"
          min="-10"
          max="10"
          step="0.1"
          :value="currentTransform.offsetSide"
          @input="onInput('offsetSide', $event)"
        />
        <span class="slider-val">{{ currentTransform.offsetSide.toFixed(1) }}</span>
      </div>
      <div class="slider-row">
        <label class="slider-label">上下 (浮き/沈み):</label>
        <input
          type="range"
          min="-5"
          max="5"
          step="0.1"
          :value="currentTransform.offsetHeight"
          @input="onInput('offsetHeight', $event)"
        />
        <span class="slider-val">{{ currentTransform.offsetHeight.toFixed(1) }}</span>
      </div>
    </div>

    <!-- Section: Rotation -->
    <div class="control-group">
      <div class="control-group__header">
        <span class="control-group__title">角度オフセット (°)</span>
      </div>
      <div class="slider-row">
        <label class="slider-label">前後傾き (Pitch):</label>
        <input
          type="range"
          min="-45"
          max="45"
          step="0.5"
          :value="currentTransform.pitch"
          @input="onInput('pitch', $event)"
        />
        <span class="slider-val">{{ currentTransform.pitch.toFixed(1) }}°</span>
      </div>
      <div class="slider-row">
        <label class="slider-label">首振り (Yaw):</label>
        <input
          type="range"
          min="-45"
          max="45"
          step="0.5"
          :value="currentTransform.yaw"
          @input="onInput('yaw', $event)"
        />
        <span class="slider-val">{{ currentTransform.yaw.toFixed(1) }}°</span>
      </div>
      <div class="slider-row">
        <label class="slider-label">ひねり (Roll):</label>
        <input
          type="range"
          min="-45"
          max="45"
          step="0.5"
          :value="currentTransform.roll"
          @input="onInput('roll', $event)"
        />
        <span class="slider-val">{{ currentTransform.roll.toFixed(1) }}°</span>
      </div>
    </div>

    <!-- Section: Scale -->
    <div class="control-group">
      <div class="control-group__header">
        <span class="control-group__title">サイズ・スケール倍率</span>
      </div>
      <div class="slider-row">
        <label class="slider-label">全体サイズ:</label>
        <input
          type="range"
          min="0.3"
          max="2.5"
          step="0.05"
          :value="currentTransform.scaleAll"
          @input="onInput('scaleAll', $event)"
        />
        <span class="slider-val">{{ currentTransform.scaleAll.toFixed(2) }}x</span>
      </div>
      <div class="slider-row">
        <label class="slider-label">長さ倍率:</label>
        <input
          type="range"
          min="0.4"
          max="2.0"
          step="0.05"
          :value="currentTransform.scaleLength"
          @input="onInput('scaleLength', $event)"
        />
        <span class="slider-val">{{ currentTransform.scaleLength.toFixed(2) }}x</span>
      </div>
      <div class="slider-row">
        <label class="slider-label">幅倍率:</label>
        <input
          type="range"
          min="0.4"
          max="2.0"
          step="0.05"
          :value="currentTransform.scaleWidth"
          @input="onInput('scaleWidth', $event)"
        />
        <span class="slider-val">{{ currentTransform.scaleWidth.toFixed(2) }}x</span>
      </div>
      <div class="slider-row">
        <label class="slider-label">厚み倍率:</label>
        <input
          type="range"
          min="0.4"
          max="2.0"
          step="0.05"
          :value="currentTransform.scaleThickness"
          @input="onInput('scaleThickness', $event)"
        />
        <span class="slider-val">{{ currentTransform.scaleThickness.toFixed(2) }}x</span>
      </div>
    </div>

    <!-- Actions -->
    <div class="action-buttons">
      <button class="btn btn--secondary btn--sm" @click="resetCurrent">
        <span>↺ この指をリセット</span>
      </button>
      <button class="btn btn--secondary btn--sm" @click="applyToAll">
        <span>全指に適用</span>
      </button>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';
import { FingerId, NailTransform } from '@/modules/nail/types';

@Component
export default class TransformControl extends Vue {
  get currentFingerId(): FingerId {
    const sel = this.$store.state.nail.selectedFinger as string;
    return (sel.startsWith('left') || sel.startsWith('right')) ? (sel as FingerId) : 'leftIndex';
  }

  get currentTransform(): NailTransform {
    const cfg = this.$store.getters['nail/currentFingerConfig'];
    return cfg ? cfg.transform : {
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

  private onInput(key: keyof NailTransform, e: Event) {
    const target = e.target as HTMLInputElement;
    const value = parseFloat(target.value);
    if (isNaN(value)) return;

    this.$store.commit('nail/updateFingerTransform', {
      fingerId: this.currentFingerId,
      transform: { [key]: value }
    });
    this.$emit('transform-change', {
      fingerId: this.currentFingerId,
      key,
      value
    });
  }

  private resetCurrent() {
    this.$store.commit('nail/resetFingerTransform', this.currentFingerId);
    this.$emit('reset', this.currentFingerId);
  }

  private applyToAll() {
    const current = { ...this.currentTransform };
    this.$store.commit('nail/applyTransformToAllFingers', current);
    this.$emit('apply-all', current);
  }
}
</script>

<style lang="scss" scoped>
.transform-control {
  display: flex;
  flex-direction: column;
  gap: $space-md;
}

.control-group {
  background: $bg-secondary;
  border: 1px solid $border-subtle;
  border-radius: $radius-md;
  padding: $space-sm $space-md;

  &__header {
    margin-bottom: $space-xs;
  }

  &__title {
    font-size: $font-size-xs;
    font-weight: 600;
    color: $text-secondary;
  }
}

.slider-row {
  display: flex;
  align-items: center;
  gap: $space-sm;
  height: 28px;
}

.slider-label {
  width: 105px;
  font-size: 11px;
  color: $text-muted;
  white-space: nowrap;
}

input[type='range'] {
  flex: 1;
  height: 4px;
  border-radius: $radius-full;
  background: $bg-elevated;
  accent-color: $accent-pink;
  cursor: pointer;
}

.slider-val {
  width: 44px;
  text-align: right;
  font-size: 11px;
  font-family: monospace;
  color: $text-primary;
}

.action-buttons {
  display: flex;
  gap: $space-sm;
  justify-content: flex-end;
}

.btn--sm {
  padding: 5px 10px;
  font-size: 11px;
}
</style>
