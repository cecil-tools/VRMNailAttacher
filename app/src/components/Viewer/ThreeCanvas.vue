<template>
  <div
    class="three-canvas-container"
    @dragover.prevent="onDragOver"
    @dragleave.prevent="onDragLeave"
    @drop.prevent="onDrop"
  >
    <!-- WebGL Canvas Host -->
    <div ref="canvasHost" class="canvas-host"></div>

    <!-- Drag & Drop Overlay -->
    <div v-if="isDragging" class="drag-overlay">
      <div class="drag-overlay__content">
        <span class="drag-overlay__icon">📂</span>
        <p class="drag-overlay__text">VRM ファイルをここにドロップしてください</p>
      </div>
    </div>

    <!-- Loading Indicator -->
    <div v-if="isLoading" class="loading-overlay">
      <div class="loading-card">
        <div class="loading-spinner"></div>
        <p class="loading-card__message">{{ loadingMessage || '読み込み中...' }}</p>
        <div class="loading-bar">
          <div class="loading-bar__fill" :style="{ width: loadingProgress + '%' }"></div>
        </div>
        <span class="loading-card__percent">{{ loadingProgress }}%</span>
      </div>
    </div>

    <!-- Viewport Controls Overlay (Floating) -->
    <div class="viewport-toolbar">
      <!-- Target Focus Group -->
      <div class="toolbar-group">
        <button
          class="toolbar-btn"
          :class="{ 'toolbar-btn--active': currentFocus === 'hands' }"
          title="両手・ネイルフォーカス"
          @click="changeFocus('hands')"
        >
          <span>💅 手元</span>
        </button>
        <button
          class="toolbar-btn"
          :class="{ 'toolbar-btn--active': currentFocus === 'fingertip' }"
          title="選択中の指先を拡大フォーカス"
          @click="changeFocus('fingertip')"
        >
          <span>☝️ 指先</span>
        </button>
        <button
          class="toolbar-btn"
          :class="{ 'toolbar-btn--active': currentFocus === 'leftHand' }"
          title="左手フォーカス"
          @click="changeFocus('leftHand')"
        >
          <span>👈 左手</span>
        </button>
        <button
          class="toolbar-btn"
          :class="{ 'toolbar-btn--active': currentFocus === 'rightHand' }"
          title="右手フォーカス"
          @click="changeFocus('rightHand')"
        >
          <span>👉 右手</span>
        </button>
        <button
          class="toolbar-btn"
          :class="{ 'toolbar-btn--active': currentFocus === 'upper' }"
          title="上半身"
          @click="changeFocus('upper')"
        >
          <span>上半身</span>
        </button>
        <button
          class="toolbar-btn"
          :class="{ 'toolbar-btn--active': currentFocus === 'full' }"
          title="全身"
          @click="changeFocus('full')"
        >
          <span>全身</span>
        </button>
      </div>

      <div class="toolbar-divider"></div>

      <!-- View Angle Group (Normal vs Top) -->
      <div class="toolbar-group">
        <button
          class="toolbar-btn"
          :class="{ 'toolbar-btn--active': currentAngle === 'normal' }"
          title="斜め正面アングル"
          @click="changeAngle('normal')"
        >
          <span>👁 斜め</span>
        </button>
        <button
          class="toolbar-btn"
          :class="{ 'toolbar-btn--active': currentAngle === 'top' }"
          title="選択部位を真上から見下ろす（俯瞰）"
          @click="changeAngle('top')"
        >
          <span>🔝 真上</span>
        </button>
      </div>

      <div class="toolbar-divider"></div>

      <div class="toolbar-group">
        <button
          class="toolbar-btn"
          :class="{ 'toolbar-btn--active': currentPose === 'tpose' }"
          title="標準 T-Pose"
          @click="setPose('tpose')"
        >
          <span>🧍 Tポーズ</span>
        </button>
        <button
          class="toolbar-btn"
          :class="{ 'toolbar-btn--active': currentPose === 'nail' }"
          title="手開きリラックスポーズ"
          @click="setPose('nail')"
        >
          <span>👐 手開き</span>
        </button>
      </div>

      <div class="toolbar-divider"></div>

      <div class="toolbar-group">
        <button
          class="toolbar-btn"
          :class="{ 'toolbar-btn--active': gridVisible }"
          title="グリッド表示切り替え"
          @click="toggleGrid"
        >
          <span>🌐 グリッド</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Vue, Ref } from 'vue-property-decorator';
import * as THREE from 'three';
import { SceneManager, FocusTarget, ViewAngle, CameraPreset } from '@/modules/three/SceneManager';
import { VRMLoader } from '@/modules/vrm/VRMLoader';
import { VRM } from '@pixiv/three-vrm';
import { NailModelLoader, LoadedNailAsset } from '@/modules/nail/NailModelLoader';
import { NailAttacher } from '@/modules/nail/NailAttacher';
import {
  FingerId,
  ALL_FINGER_IDS,
  FINGER_DEFINITIONS,
  getOppositeFinger,
  NailTransform,
  TextureApplyScope,
  CustomTextureItem,
  NailMaterialType,
  NailMToonParams
} from '@/modules/nail/types';
import { VRMExporter, VRMExportOptions } from '@/modules/vrm/VRMExporter';

@Component
export default class ThreeCanvas extends Vue {
  @Ref('canvasHost') readonly canvasHost!: HTMLElement;

  private sceneManager: SceneManager | null = null;
  private vrmLoader: VRMLoader = new VRMLoader();
  private nailModelLoader: NailModelLoader = new NailModelLoader();
  private nailAttacher: NailAttacher = new NailAttacher();
  private loadedNailAssets: Map<FingerId, LoadedNailAsset> | null = null;

  private isDragging = false;
  private currentFocus: FocusTarget = 'hands';
  private currentAngle: ViewAngle = 'normal';
  private currentPose: 'tpose' | 'nail' = 'tpose';
  private gridVisible = true;

  get isLoading(): boolean {
    return this.$store.state.isLoading;
  }

  get loadingProgress(): number {
    return this.$store.state.loadingProgress;
  }

  get loadingMessage(): string {
    return this.$store.state.loadingMessage;
  }

  mounted() {
    this.initThree();
  }

  beforeDestroy() {
    this.cleanup();
  }

  private initThree() {
    if (!this.canvasHost) return;
    this.sceneManager = new SceneManager(this.canvasHost);

    // アニメーションループ内での VRM 更新コールバック
    this.sceneManager.onUpdate((delta) => {
      if (this.vrmLoader.currentVRM) {
        this.vrmLoader.currentVRM.update(delta);
      }
    });

    // 初期カメラを現在のフォーカス（手元）とアングル（通常）に設定
    this.sceneManager.updateCamera(this.currentFocus, this.currentAngle);
  }

  public async loadModelFromUrl(url: string, name: string): Promise<VRM | null> {
    if (!this.sceneManager) return null;

    try {
      this.$store.commit('setLoading', {
        isLoading: true,
        progress: 0,
        message: `${name} を読み込み中...`
      });

      // 既存のネイルとモデルをアンロード
      this.nailAttacher.detachAll();
      if (this.vrmLoader.currentVRM) {
        this.sceneManager.scene.remove(this.vrmLoader.currentVRM.scene);
        this.vrmLoader.unload();
      }

      const vrm = await this.vrmLoader.loadFromUrl(url, (progress) => {
        this.$store.commit('setLoading', {
          isLoading: true,
          progress,
          message: `${name} を読み込み中...`
        });
      });

      // 初期値は T-Pose を適用してシーンに追加
      this.currentPose = 'tpose';
      this.vrmLoader.applyTPose(vrm);
      this.sceneManager.scene.add(vrm.scene);
      this.sceneManager.setVRM(vrm);

      console.log('[DEBUG] VRM loaded:', name);
      console.log('[DEBUG] vrm.scene visible:', vrm.scene.visible, 'children:', vrm.scene.children.length);
      console.log('[DEBUG] camera pos:', this.sceneManager.camera.position.toArray());
      console.log('[DEBUG] controls target:', this.sceneManager.controls.target.toArray());

      // メタ情報をストアに登録
      const meta = this.vrmLoader.extractMeta(vrm);
      this.$store.commit('setModel', { name, meta });

      // ネイルが有効化されていた場合は新モデルへ再アタッチ
      if (this.$store.state.nail?.isAttached) {
        await this.attachNails();
      }

      this.$emit('vrm-loaded', { vrm, meta });
      return vrm;
    } catch (err: any) {
      console.error('VRM load error:', err);
      alert('VRMモデルの読み込みに失敗しました: ' + (err.message || '不明なエラー'));
      return null;
    } finally {
      this.$store.commit('setLoading', { isLoading: false });
    }
  }

  public async loadModelFromFile(file: File): Promise<VRM | null> {
    if (!this.sceneManager) return null;

    try {
      this.$store.commit('setLoading', {
        isLoading: true,
        progress: 0,
        message: `${file.name} を読み込み中...`
      });

      this.nailAttacher.detachAll();
      if (this.vrmLoader.currentVRM) {
        this.sceneManager.scene.remove(this.vrmLoader.currentVRM.scene);
        this.vrmLoader.unload();
      }

      const vrm = await this.vrmLoader.loadFromFile(file, (progress) => {
        this.$store.commit('setLoading', {
          isLoading: true,
          progress,
          message: `${file.name} を読み込み中...`
        });
      });

      // 初期値は T-Pose を適用してシーンに追加
      this.currentPose = 'tpose';
      this.vrmLoader.applyTPose(vrm);
      this.sceneManager.scene.add(vrm.scene);
      this.sceneManager.setVRM(vrm);

      const meta = this.vrmLoader.extractMeta(vrm);
      this.$store.commit('setModel', { name: file.name, meta });

      if (this.$store.state.nail?.isAttached) {
        await this.attachNails();
      }

      this.$emit('vrm-loaded', { vrm, meta });
      return vrm;
    } catch (err: any) {
      console.error('VRM file load error:', err);
      alert('VRMモデルの読み込みに失敗しました: ' + (err.message || '不明なエラー'));
      return null;
    } finally {
      this.$store.commit('setLoading', { isLoading: false });
    }
  }

  /**
   * ネイルチップ 3D モデルを読み込み、現在の VRM の指先へ自動装着
   */
  public async attachNails(): Promise<boolean> {
    const vrm = this.vrmLoader.currentVRM;
    if (!vrm) return false;

    try {
      this.$store.commit('nail/setLoading', true);

      // 初回のみモデルを全指一括読み込み
      if (!this.loadedNailAssets) {
        const initialTexId = this.$store.state.nail?.selectedTextureId || undefined;
        this.loadedNailAssets = await this.nailModelLoader.loadAllFingers(initialTexId);

        // モーフターゲット名の抽出
        let morphNames: string[] = [];
        for (const asset of this.loadedNailAssets.values()) {
          if (asset.morphTargetNames.length > 0) {
            morphNames = asset.morphTargetNames;
            break;
          }
        }
        this.$store.commit('nail/setAvailableMorphNames', morphNames);
      }

      // ボーンへアタッチ
      console.log('[DEBUG] attachNails calling attachAll...');
      this.nailAttacher.attachAll(
        vrm,
        this.loadedNailAssets,
        this.$store.state.nail.configs,
        this.nailModelLoader.getPreset()
      );
      console.log('[DEBUG] attachNails finished. isAttached:', this.nailAttacher.isAttached());

      // 各指のテクスチャを復元・適用
      await this.restoreFingerTextures();

      this.$store.commit('nail/setAttached', true);
      return true;
    } catch (err: any) {
      console.error('Failed to attach nails:', err);
      alert('ネイルの装着に失敗しました: ' + (err.message || '不明なエラー'));
      return false;
    } finally {
      this.$store.commit('nail/setLoading', false);
    }
  }

  /**
   * テクスチャIDから THREE.Texture を解決（プリセットまたはカスタムテクスチャ）
   */
  public async resolveTexture(textureId: string): Promise<THREE.Texture | null> {
    const preset = this.nailModelLoader.getPreset();
    const presetTex = preset.textures.find((t) => t.id === textureId);
    if (presetTex) {
      return await this.nailModelLoader.loadPresetTexture(presetTex);
    }
    const customList: CustomTextureItem[] = this.$store.state.nail.customTextures || [];
    const customTex = customList.find((c) => c.id === textureId);
    if (customTex) {
      return await this.nailModelLoader.loadTextureFromDataUrl(customTex.dataUrl, customTex.id);
    }
    return null;
  }

  /**
   * 保存されている各指のテクスチャ設定を 3D メッシュへ復元
   */
  public async restoreFingerTextures(): Promise<void> {
    if (!this.loadedNailAssets) return;
    const fingerTextures: Record<FingerId, string> = this.$store.state.nail.fingerTextures || {};
    const textureToFingers = new Map<string, FingerId[]>();
    for (const fid of ALL_FINGER_IDS) {
      const texId = fingerTextures[fid] || this.$store.state.nail.selectedTextureId || 'cheek';
      const list = textureToFingers.get(texId);
      if (list) {
        list.push(fid);
      } else {
        textureToFingers.set(texId, [fid]);
      }
    }

    for (const [texId, fingerIds] of textureToFingers.entries()) {
      const texture = await this.resolveTexture(texId);
      if (texture) {
        this.nailModelLoader.applyTextureToFingers(this.loadedNailAssets, fingerIds, texture);
      }
    }
  }

  /**
   * テクスチャを切り替える（全指一括 または 選択指＋対称同期）
   */
  public async changeTexture(textureId: string, scope?: TextureApplyScope): Promise<void> {
    if (!this.loadedNailAssets) return;
    const targetScope = scope || this.$store.state.nail.textureApplyScope || 'all';
    const texture = await this.resolveTexture(textureId);
    if (!texture) {
      console.warn(`[ThreeCanvas] Texture not found for id: ${textureId}`);
      return;
    }

    if (targetScope === 'all') {
      this.nailModelLoader.applyLoadedTextureToAll(this.loadedNailAssets, texture);
      this.$store.commit('nail/setAllFingerTextures', textureId);
    } else {
      const selFinger = this.getCurrentTargetFingerId();
      const targetFingerIds: FingerId[] = [selFinger];
      if (this.$store.state.nail.symmetrySync) {
        targetFingerIds.push(getOppositeFinger(selFinger));
      }
      this.nailModelLoader.applyTextureToFingers(this.loadedNailAssets, targetFingerIds, texture);
      this.$store.commit('nail/setFingerTexture', {
        fingerId: selFinger,
        textureId
      });
    }
  }

  /**
   * 全ネイルチップをデタッチ
   */
  public detachNails(): void {
    this.nailAttacher.detachAll();
    this.$store.commit('nail/setAttached', false);
  }

  /**
   * ネイルのマテリアル種別（mtoon / standard）を切り替え
   */
  public setNailMaterialType(type: NailMaterialType, params?: NailMToonParams): void {
    if (this.loadedNailAssets) {
      this.nailModelLoader.setMaterialType(this.loadedNailAssets, type, params);
    }
  }

  /**
   * 指定指のトランスフォーム変更を 3D メッシュへ反映
   */
  public updateNailTransform(payload: { fingerId: FingerId; key?: keyof NailTransform; value?: number }): void {
    const { fingerId } = payload;
    const configs = this.$store.state.nail.configs;
    const targetConfig = configs[fingerId];
    if (targetConfig) {
      this.nailAttacher.updateTransform(fingerId, targetConfig.transform);
    }

    // 左右対称同期
    if (this.$store.state.nail.symmetrySync) {
      const oppId = getOppositeFinger(fingerId);
      const oppConfig = configs[oppId];
      if (oppConfig) {
        this.nailAttacher.updateTransform(oppId, oppConfig.transform);
      }
    }
  }

  /**
   * 全指のトランスフォームを一括反映
   */
  public updateAllNailTransforms(): void {
    const configs = this.$store.state.nail.configs;
    for (const id of ALL_FINGER_IDS) {
      const cfg = configs[id];
      if (cfg) {
        this.nailAttacher.updateTransform(id, cfg.transform);
      }
    }
  }

  /**
   * 指定指のモーフウェイトを 3D メッシュへ反映
   */
  public updateNailMorph(payload: { fingerId: FingerId; name?: string; value?: number }): void {
    const { fingerId } = payload;
    const configs = this.$store.state.nail.configs;
    const targetConfig = configs[fingerId];
    if (targetConfig) {
      this.nailAttacher.updateMorphs(fingerId, targetConfig.morphs);
    }

    if (this.$store.state.nail.symmetrySync) {
      const oppId = getOppositeFinger(fingerId);
      const oppConfig = configs[oppId];
      if (oppConfig) {
        this.nailAttacher.updateMorphs(oppId, oppConfig.morphs);
      }
    }
  }

  /**
   * 現在選択中の指先または指定の指先へカメラをフォーカス
   */
  public focusFinger(fingerId?: FingerId): void {
    const targetFingerId: FingerId = fingerId || this.getCurrentTargetFingerId();
    this.currentFocus = 'fingertip';
    const worldPos = this.getFingerTipPosition(targetFingerId);
    if (worldPos && this.sceneManager) {
      this.sceneManager.focusOnPoint(worldPos);
    }
  }

  private getCurrentTargetFingerId(): FingerId {
    const sel = this.$store.state.nail?.selectedFinger as string;
    if (sel && (sel.startsWith('left') || sel.startsWith('right'))) {
      return sel as FingerId;
    }
    return 'leftIndex';
  }

  public getFingerTipPosition(fingerId: FingerId): THREE.Vector3 | null {
    // 1. ネイルが装着されていればそのアンカー位置
    const attachedPos = this.nailAttacher.getFingerTipWorldPosition(fingerId);
    if (attachedPos) return attachedPos;

    // 2. ネイル未装着時はVRMのDistalボーン位置
    const vrm = this.vrmLoader.currentVRM;
    if (!vrm) return null;
    const def = FINGER_DEFINITIONS[fingerId];
    const boneNode = vrm.humanoid?.getNormalizedBoneNode(def.vrmBoneName as any)
      || vrm.humanoid?.getRawBoneNode(def.vrmBoneName as any);
    if (boneNode) {
      boneNode.updateWorldMatrix(true, false);
      const pos = new THREE.Vector3();
      boneNode.getWorldPosition(pos);
      return pos;
    }
    return null;
  }

  public setPose(pose: 'tpose' | 'nail') {
    this.currentPose = pose;
    const vrm = this.vrmLoader.currentVRM;
    if (!vrm) return;

    if (pose === 'tpose') {
      this.vrmLoader.applyTPose(vrm);
    } else {
      this.vrmLoader.applyNailInspectionPose(vrm);
    }

    // ポーズ変更に合わせてカメラターゲットを新ボーン位置に追従
    this.$nextTick(() => {
      if (this.sceneManager) {
        if (this.currentFocus === 'fingertip') {
          this.focusFinger();
        } else {
          this.sceneManager.updateCamera();
        }
      }
    });
  }

  public changeFocus(focus: FocusTarget) {
    this.currentFocus = focus;
    if (focus === 'fingertip') {
      this.focusFinger();
    } else if (this.sceneManager) {
      this.sceneManager.updateCamera(focus, this.currentAngle);
    }
  }

  public changeAngle(angle: ViewAngle) {
    this.currentAngle = angle;
    if (this.currentFocus === 'fingertip') {
      this.focusFinger();
    } else if (this.sceneManager) {
      this.sceneManager.updateCamera(this.currentFocus, angle);
    }
  }

  public changeCamera(preset: CameraPreset) {
    if (preset === 'top') {
      this.changeAngle('top');
    } else {
      this.changeFocus(preset as FocusTarget);
    }
  }

  public toggleGrid() {
    if (this.sceneManager) {
      this.gridVisible = this.sceneManager.toggleGrid();
    }
  }

  // ドラッグ＆ドロップ処理
  private onDragOver() {
    this.isDragging = true;
  }

  private onDragLeave() {
    this.isDragging = false;
  }

  private onDrop(e: DragEvent) {
    this.isDragging = false;
    const files = e.dataTransfer?.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    if (file.name.toLowerCase().endsWith('.vrm')) {
      this.loadModelFromFile(file);
    } else {
      alert('VRM形式（.vrm）のファイルをドロップしてください。');
    }
  }

  public getCurrentVRM(): VRM | null {
    return this.vrmLoader.currentVRM;
  }

  public getAttachedNailCount(): number {
    return this.nailAttacher.getAllAttached().size;
  }

  /**
   * 現在のVRMアバターとネイルを統合したVRMファイルをエクスポート
   */
  public async exportVRM(options?: VRMExportOptions): Promise<Blob> {
    const vrm = this.vrmLoader.currentVRM;
    if (!vrm) {
      throw new Error('VRMモデルが読み込まれていません。');
    }

    const rawBuffer = this.vrmLoader.originalRawBuffer;
    if (!rawBuffer) {
      throw new Error('元モデルのバイナリバッファが見つかりません。');
    }

    // エクスポート計算時は一時的にTポーズにしてボーン基準の相対座標を正確に計算
    const previousPose = this.currentPose;
    if (previousPose !== 'tpose') {
      this.vrmLoader.applyTPose(vrm);
      vrm.scene.updateMatrixWorld(true);
    }

    try {
      const attachedNails = this.nailAttacher.getAllAttached();
      const meta = this.$store.state.currentMeta;
      const exportOptions: VRMExportOptions = {
        avatarTitle: options?.avatarTitle || meta?.title,
        avatarAuthors: options?.avatarAuthors || meta?.authors,
        avatarVersion: options?.avatarVersion || meta?.version,
        materialType: options?.materialType || this.$store.state.nail?.materialType || 'mtoon',
        mtoonParams: options?.mtoonParams,
      };

      const exportedBlob = await VRMExporter.exportVRM(
        rawBuffer,
        vrm,
        attachedNails,
        exportOptions
      );

      return exportedBlob;
    } finally {
      // ポーズを元に戻す
      if (previousPose === 'nail') {
        this.vrmLoader.applyNailInspectionPose(vrm);
        vrm.scene.updateMatrixWorld(true);
      }
    }
  }


  private cleanup() {
    this.nailAttacher.detachAll();
    if (this.vrmLoader.currentVRM && this.sceneManager) {
      this.sceneManager.scene.remove(this.vrmLoader.currentVRM.scene);
      this.vrmLoader.unload();
    }
    if (this.sceneManager) {
      this.sceneManager.dispose();
      this.sceneManager = null;
    }
  }
}
</script>

<style lang="scss" scoped>
.three-canvas-container {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
  background-color: #131418;
}

.canvas-host {
  width: 100%;
  height: 100%;
}

/* Drag & Drop Overlay */
.drag-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(255, 101, 132, 0.2);
  border: 3px dashed $accent-pink;
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
  pointer-events: none;

  &__content {
    background: $bg-secondary;
    padding: $space-lg $space-xl;
    border-radius: $radius-lg;
    text-align: center;
    box-shadow: $shadow-lg;
  }

  &__icon {
    font-size: 3rem;
    display: block;
    margin-bottom: $space-sm;
  }

  &__text {
    font-size: $font-size-base;
    font-weight: 600;
    color: $text-primary;
  }
}

/* Loading Overlay */
.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(18, 19, 22, 0.75);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 60;
}

.loading-card {
  background: $bg-secondary;
  border: 1px solid $border-medium;
  border-radius: $radius-lg;
  padding: $space-xl;
  width: 320px;
  text-align: center;
  box-shadow: $shadow-lg;

  &__message {
    font-size: $font-size-sm;
    font-weight: 500;
    margin: $space-md 0 $space-sm;
    color: $text-primary;
  }

  &__percent {
    font-size: $font-size-xs;
    color: $text-muted;
    font-weight: 600;
  }
}

.loading-spinner {
  width: 36px;
  height: 36px;
  border: 3px solid rgba(255, 101, 132, 0.2);
  border-top-color: $accent-pink;
  border-radius: 50%;
  margin: 0 auto;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.loading-bar {
  width: 100%;
  height: 6px;
  background: $bg-tertiary;
  border-radius: $radius-full;
  overflow: hidden;
  margin-bottom: $space-xs;

  &__fill {
    height: 100%;
    background: $accent-gradient;
    transition: width 0.2s ease;
  }
}

/* Floating Viewport Toolbar */
.viewport-toolbar {
  position: absolute;
  bottom: $space-lg;
  left: 50%;
  transform: translateX(-50%);
  background: $bg-glass;
  backdrop-filter: blur(12px);
  border: 1px solid $border-subtle;
  border-radius: $radius-full;
  padding: 6px 12px;
  display: flex;
  align-items: center;
  gap: $space-sm;
  box-shadow: $shadow-md;
  z-index: 20;
}

.toolbar-group {
  display: flex;
  align-items: center;
  gap: 4px;
}

.toolbar-divider {
  width: 1px;
  height: 16px;
  background-color: $border-subtle;
  margin: 0 4px;
}

.toolbar-btn {
  padding: 6px 12px;
  border-radius: $radius-full;
  font-size: $font-size-xs;
  font-weight: 500;
  color: $text-secondary;
  background: transparent;
  transition: all $transition-fast;

  &:hover {
    color: $text-primary;
    background: rgba(255, 255, 255, 0.08);
  }

  &--active {
    color: #ffffff;
    background: rgba(255, 101, 132, 0.25);
    border: 1px solid rgba(255, 101, 132, 0.4);

    &:hover {
      background: rgba(255, 101, 132, 0.35);
    }
  }
}
</style>
