<template>
  <div class="finger-selector">
    <!-- Hand Side Tabs -->
    <div class="hand-tabs">
      <button
        class="hand-tab"
        :class="{ 'hand-tab--active': activeHand === 'left' }"
        @click="selectHand('left')"
      >
        <span>👈 左手</span>
      </button>
      <button
        class="hand-tab"
        :class="{ 'hand-tab--active': activeHand === 'right' }"
        @click="selectHand('right')"
      >
        <span>👉 右手</span>
      </button>
    </div>

    <!-- Fingers Button Grid -->
    <div class="finger-grid">
      <button
        v-for="finger in currentHandFingers"
        :key="finger.id"
        class="finger-btn"
        :class="{ 'finger-btn--active': selectedFinger === finger.id }"
        @click="selectFinger(finger.id)"
      >
        <span class="finger-btn__icon">💅</span>
        <span class="finger-btn__name">{{ finger.shortLabel }}</span>
      </button>
    </div>

    <!-- Options: Symmetry Link & Focus -->
    <div class="selector-options">
      <label class="toggle-control" title="左手・右手の調整値を自動的にミラーリング反映します">
        <input
          type="checkbox"
          :checked="symmetrySync"
          @change="onToggleSymmetry"
        />
        <span class="toggle-control__label">🔗 左右対称ミラーリング</span>
      </label>

      <button
        class="btn-focus-tip"
        title="選択中の指先を画面中央にフォーカス"
        @click="$emit('focus-finger', selectedFinger)"
      >
        <span>🔍 指先にフォーカス</span>
      </button>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';
import { FingerId, HandSide, FINGER_DEFINITIONS } from '@/modules/nail/types';

interface FingerItem {
  id: FingerId;
  shortLabel: string;
}

@Component
export default class FingerSelector extends Vue {
  private activeHand: HandSide = 'left';

  get selectedFinger(): FingerId {
    const sel = this.$store.state.nail.selectedFinger;
    if (sel.startsWith('right')) {
      return sel as FingerId;
    }
    return sel as FingerId;
  }

  get symmetrySync(): boolean {
    return this.$store.state.nail.symmetrySync;
  }

  get currentHandFingers(): FingerItem[] {
    const isLeft = this.activeHand === 'left';
    return [
      { id: isLeft ? 'leftThumb' : 'rightThumb', shortLabel: '親指' },
      { id: isLeft ? 'leftIndex' : 'rightIndex', shortLabel: '人差指' },
      { id: isLeft ? 'leftMiddle' : 'rightMiddle', shortLabel: '中指' },
      { id: isLeft ? 'leftRing' : 'rightRing', shortLabel: '薬指' },
      { id: isLeft ? 'leftLittle' : 'rightLittle', shortLabel: '小指' }
    ];
  }

  mounted() {
    // 現在選択中の指に合わせてタブの初期値を同期
    const current = this.$store.state.nail.selectedFinger as string;
    if (current.startsWith('right')) {
      this.activeHand = 'right';
    } else {
      this.activeHand = 'left';
    }
  }

  private selectHand(hand: HandSide) {
    this.activeHand = hand;
    // 手を切り替えたら同等の指を選択（例: 左手人差指 -> 右手人差指）
    const current = this.selectedFinger;
    const def = FINGER_DEFINITIONS[current];
    const targetId: FingerId = (hand === 'left'
      ? `left${capitalize(def.type)}`
      : `right${capitalize(def.type)}`) as FingerId;

    this.selectFinger(targetId);
  }

  private selectFinger(fingerId: FingerId) {
    this.$store.commit('nail/setSelectedFinger', fingerId);
    this.$emit('select-finger', fingerId);
  }

  private onToggleSymmetry(e: Event) {
    const target = e.target as HTMLInputElement;
    this.$store.commit('nail/setSymmetrySync', target.checked);
  }
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
</script>

<style lang="scss" scoped>
.finger-selector {
  display: flex;
  flex-direction: column;
  gap: $space-sm;
}

.hand-tabs {
  display: flex;
  gap: 4px;
  background: $bg-tertiary;
  padding: 4px;
  border-radius: $radius-full;
  border: 1px solid $border-subtle;
}

.hand-tab {
  flex: 1;
  padding: 6px 12px;
  background: transparent;
  border: none;
  border-radius: $radius-full;
  color: $text-secondary;
  font-size: $font-size-xs;
  font-weight: 600;
  cursor: pointer;
  transition: all $transition-fast;

  &:hover {
    color: $accent-pink;
  }

  &--active {
    background: #ffffff;
    color: $accent-pink;
    font-weight: 700;
    box-shadow: 0 2px 8px rgba(230, 140, 165, 0.18);
  }
}

.finger-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 4px;
}

.finger-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px 4px;
  background: $bg-tertiary;
  border: 1px solid $border-subtle;
  border-radius: $radius-md;
  color: $text-secondary;
  cursor: pointer;
  transition: all $transition-fast;

  &:hover {
    background: #ffffff;
    border-color: $border-medium;
    color: $text-primary;
    transform: translateY(-1px);
    box-shadow: $shadow-sm;
  }

  &--active {
    background: #ffffff;
    border-color: $accent-pink;
    color: $accent-pink;
    font-weight: 700;
    box-shadow: 0 3px 12px rgba(255, 117, 151, 0.28);
    transform: translateY(-1px);
  }

  &__icon {
    font-size: 1.1rem;
    transition: transform $transition-fast;
  }

  &:hover &__icon {
    transform: scale(1.1);
  }

  &__name {
    font-size: 10px;
    letter-spacing: -0.02em;
  }
}

.selector-options {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: $space-xs;
  padding: 0 2px;
}

.toggle-control {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  font-size: $font-size-xs;
  color: $text-secondary;

  input[type='checkbox'] {
    accent-color: $accent-pink;
    cursor: pointer;
  }

  &__label {
    user-select: none;
    font-weight: 500;
  }
}

.btn-focus-tip {
  padding: 5px 12px;
  font-size: 11px;
  font-weight: 600;
  background: #ffffff;
  border: 1px solid $border-medium;
  border-radius: $radius-full;
  color: $accent-pink;
  cursor: pointer;
  transition: all $transition-fast;
  box-shadow: $shadow-sm;

  &:hover {
    background: $bg-tertiary;
    border-color: $accent-pink;
    transform: translateY(-1px);
  }
}
</style>
