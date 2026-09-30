<template>
  <div class="morph-control">
    <div class="control-group">
      <div class="control-group__header">
        <span class="control-group__title">形状モーフ（Blendshape）</span>
        <button class="btn-text-reset" @click="resetMorphs">リセット</button>
      </div>

      <div v-if="morphList.length === 0" class="morph-empty">
        利用可能なモーフターゲットがありません
      </div>

      <div
        v-for="morph in morphList"
        :key="morph.name"
        class="slider-row"
      >
        <label class="slider-label" :title="morph.name">{{ morph.label }}:</label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          :value="getMorphValue(morph.name)"
          @input="onMorphInput(morph.name, $event)"
        />
        <span class="slider-val">{{ getMorphValue(morph.name).toFixed(2) }}</span>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';
import { FingerId } from '@/modules/nail/types';

interface MorphItem {
  name: string;
  label: string;
}

const MORPH_LABELS: Record<string, string> = {
  flat: 'フラット (平坦)',
  curl: 'カーブ (全体の丸み)',
  curl_front: '先端カーブ',
  curl_back: '根元カーブ'
};

@Component
export default class MorphControl extends Vue {
  get currentFingerId(): FingerId {
    const sel = this.$store.state.nail.selectedFinger as string;
    return (sel.startsWith('left') || sel.startsWith('right')) ? (sel as FingerId) : 'leftIndex';
  }

  get availableMorphNames(): string[] {
    return this.$store.state.nail.availableMorphNames || [];
  }

  get morphList(): MorphItem[] {
    return this.availableMorphNames.map((name) => ({
      name,
      label: MORPH_LABELS[name] || name
    }));
  }

  private getMorphValue(name: string): number {
    const cfg = this.$store.getters['nail/currentFingerConfig'];
    return (cfg && cfg.morphs && cfg.morphs[name] !== undefined) ? cfg.morphs[name] : 0;
  }

  private onMorphInput(name: string, e: Event) {
    const target = e.target as HTMLInputElement;
    const value = parseFloat(target.value);
    if (isNaN(value)) return;

    this.$store.commit('nail/updateFingerMorph', {
      fingerId: this.currentFingerId,
      morphName: name,
      value
    });
    this.$emit('morph-change', {
      fingerId: this.currentFingerId,
      name,
      value
    });
  }

  private resetMorphs() {
    for (const morph of this.morphList) {
      this.$store.commit('nail/updateFingerMorph', {
        fingerId: this.currentFingerId,
        morphName: morph.name,
        value: 0
      });
    }
    this.$emit('morph-reset', this.currentFingerId);
  }
}
</script>

<style lang="scss" scoped>
.morph-control {
  display: flex;
  flex-direction: column;
}

.control-group {
  background: #ffffff;
  border: 1px solid $border-subtle;
  border-radius: $radius-lg;
  padding: $space-sm $space-md;
  box-shadow: 0 2px 10px rgba(230, 140, 165, 0.06);

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: $space-xs;
  }

  &__title {
    font-size: $font-size-xs;
    font-weight: 700;
    color: $text-secondary;
  }
}

.btn-text-reset {
  background: transparent;
  border: none;
  font-size: 11px;
  font-weight: 600;
  color: $accent-pink;
  cursor: pointer;
  padding: 0;

  &:hover {
    text-decoration: underline;
  }
}

.morph-empty {
  font-size: 11px;
  color: $text-muted;
  padding: 8px 0;
  text-align: center;
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
  color: $text-secondary;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: 500;
}

input[type='range'] {
  flex: 1;
}

.slider-val {
  width: 44px;
  text-align: right;
  font-size: 11px;
  font-family: monospace;
  color: $text-primary;
  font-weight: 600;
}
</style>
