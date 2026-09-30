<template>
  <div class="global-scale-control">
    <div class="control-group">
      <div class="control-group__header">
        <div class="header-left">
          <span class="control-icon">📏</span>
          <span class="control-group__title">全指一括サイズ調整</span>
        </div>
        <button
          class="btn-reset-mini"
          title="全指のスケール倍率を 1.0x にリセット"
          @click="resetAllScales"
        >
          <span>↺ 1.0x</span>
        </button>
      </div>

      <!-- Main Slider: 全体サイズ -->
      <div class="slider-row slider-row--main">
        <label class="slider-label">全体サイズ:</label>
        <div class="slider-wrapper">
          <input
            type="range"
            min="0.3"
            max="2.5"
            step="0.01"
            :value="globalScale.scaleAll"
            @input="onInput('scaleAll', $event)"
          />
        </div>
        <span class="slider-val highlight">{{ globalScale.scaleAll.toFixed(2) }}x</span>
      </div>

      <!-- Quick Step Buttons -->
      <div class="quick-step-buttons">
        <button class="btn-step" @click="stepScale('scaleAll', -0.05)" title="-0.05">-0.05</button>
        <button class="btn-step" @click="stepScale('scaleAll', -0.01)" title="-0.01">-0.01</button>
        <button class="btn-step btn-step--default" @click="setScale('scaleAll', 1.0)" title="標準 (1.00x)">1.00x</button>
        <button class="btn-step" @click="stepScale('scaleAll', +0.01)" title="+0.01">+0.01</button>
        <button class="btn-step" @click="stepScale('scaleAll', +0.05)" title="+0.05">+0.05</button>
      </div>

      <!-- Accordion Toggle for Detailed Scales -->
      <div class="details-toggle-row">
        <button class="btn-details-toggle" @click="showDetails = !showDetails">
          <span>{{ showDetails ? '▲ 詳細比率 (長さ・幅・厚み) を閉じる' : '▼ 詳細比率 (長さ・幅・厚み) を開く' }}</span>
        </button>
      </div>

      <!-- Detailed Scales (Expandable) -->
      <div v-show="showDetails" class="detailed-controls">
        <div class="slider-row">
          <label class="slider-label">長さ倍率:</label>
          <div class="slider-wrapper">
            <input
              type="range"
              min="0.4"
              max="2.0"
              step="0.01"
              :value="globalScale.scaleLength"
              @input="onInput('scaleLength', $event)"
            />
          </div>
          <span class="slider-val">{{ globalScale.scaleLength.toFixed(2) }}x</span>
        </div>

        <div class="slider-row">
          <label class="slider-label">幅倍率:</label>
          <div class="slider-wrapper">
            <input
              type="range"
              min="0.4"
              max="2.0"
              step="0.01"
              :value="globalScale.scaleWidth"
              @input="onInput('scaleWidth', $event)"
            />
          </div>
          <span class="slider-val">{{ globalScale.scaleWidth.toFixed(2) }}x</span>
        </div>

        <div class="slider-row">
          <label class="slider-label">厚み倍率:</label>
          <div class="slider-wrapper">
            <input
              type="range"
              min="0.4"
              max="2.0"
              step="0.01"
              :value="globalScale.scaleThickness"
              @input="onInput('scaleThickness', $event)"
            />
          </div>
          <span class="slider-val">{{ globalScale.scaleThickness.toFixed(2) }}x</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';
import { GlobalScale } from '@/store/modules/nail';

@Component
export default class GlobalScaleControl extends Vue {
  private showDetails = false;

  get globalScale(): GlobalScale {
    return this.$store.state.nail?.globalScale || {
      scaleAll: 1.0,
      scaleLength: 1.0,
      scaleWidth: 1.0,
      scaleThickness: 1.0
    };
  }

  private onInput(key: keyof GlobalScale, e: Event) {
    const target = e.target as HTMLInputElement;
    const value = parseFloat(target.value);
    if (isNaN(value)) return;

    this.setScale(key, value);
  }

  private setScale(key: keyof GlobalScale, value: number) {
    const clamped = Math.max(0.1, Math.min(3.0, Math.round(value * 100) / 100));
    this.$store.commit('nail/updateGlobalScale', { key, value: clamped });
    this.$emit('global-scale-change', { key, value: clamped });
  }

  private stepScale(key: keyof GlobalScale, delta: number) {
    const current = this.globalScale[key];
    this.setScale(key, current + delta);
  }

  private resetAllScales() {
    this.$store.commit('nail/resetGlobalScale');
    this.$emit('reset-global-scale');
  }
}
</script>

<style lang="scss" scoped>
.global-scale-control {
  display: flex;
  flex-direction: column;
}

.control-group {
  background: #ffffff;
  border: 1px solid rgba(255, 117, 151, 0.25);
  border-radius: $radius-lg;
  padding: $space-sm $space-md;
  box-shadow: 0 4px 14px rgba(230, 140, 165, 0.08);

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: $space-xs;
  }

  &__title {
    font-size: $font-size-xs;
    font-weight: 700;
    color: $accent-pink;
  }
}

.header-left {
  display: flex;
  align-items: center;
  gap: 6px;
}

.control-icon {
  font-size: 14px;
}

.btn-reset-mini {
  padding: 3px 10px;
  font-size: 10px;
  font-weight: 600;
  background: $bg-tertiary;
  border: 1px solid $border-subtle;
  border-radius: $radius-full;
  color: $text-secondary;
  cursor: pointer;
  transition: all $transition-fast;

  &:hover {
    background: #ffffff;
    border-color: $accent-pink;
    color: $accent-pink;
  }
}

.slider-row {
  display: flex;
  align-items: center;
  gap: $space-sm;
  height: 28px;

  &--main {
    height: 32px;
  }
}

.slider-label {
  width: 90px;
  font-size: 11px;
  color: $text-secondary;
  white-space: nowrap;
  font-weight: 600;
}

.slider-wrapper {
  flex: 1;
  display: flex;
  align-items: center;
}

.slider-val {
  width: 44px;
  text-align: right;
  font-size: 11px;
  font-family: monospace;
  color: $text-primary;
  font-weight: 600;

  &.highlight {
    color: $accent-pink;
    font-weight: 700;
    font-size: 12px;
  }
}

.quick-step-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 4px;
  margin-top: 2px;
  margin-bottom: $space-xs;
}

.btn-step {
  padding: 2px 7px;
  font-size: 10px;
  font-family: monospace;
  background: $bg-tertiary;
  border: 1px solid $border-subtle;
  border-radius: $radius-full;
  color: $text-secondary;
  cursor: pointer;
  transition: all $transition-fast;

  &:hover {
    background: #ffffff;
    border-color: $accent-pink;
    color: $accent-pink;
  }

  &--default {
    color: $accent-pink;
    border-color: rgba(255, 117, 151, 0.4);
    font-weight: 600;

    &:hover {
      background: rgba(255, 117, 151, 0.12);
      color: $accent-pink;
    }
  }
}

.details-toggle-row {
  display: flex;
  justify-content: center;
  margin-top: 4px;
}

.btn-details-toggle {
  background: transparent;
  border: none;
  font-size: 10px;
  font-weight: 600;
  color: $text-muted;
  cursor: pointer;
  padding: 3px 10px;
  border-radius: $radius-full;
  transition: all $transition-fast;

  &:hover {
    color: $accent-pink;
    background: rgba(255, 117, 151, 0.08);
  }
}

.detailed-controls {
  margin-top: $space-xs;
  padding-top: $space-xs;
  border-top: 1px dashed $border-subtle;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
</style>
