import {
  NailProfileData,
  NailProfileAvatarMeta,
  FingerId,
  FingerNailConfig,
  GlobalScale,
  NailMaterialType,
  ALL_FINGER_IDS,
  createDefaultFingerConfig,
  createDefaultTransform,
  DEFAULT_MTOON_PARAMS,
  RYUKI_PRESET
} from './types';
import { NailState } from '@/store/modules/nail';

const LOCAL_STORAGE_KEY_PREFIX = 'vrm_nail_profile:';
const AUTO_SAVE_KEY_PREFIX = 'vrm_nail_profile_auto:';

export interface ParseResult {
  success: boolean;
  profile?: NailProfileData;
  error?: string;
  isAvatarMismatch?: boolean;
}

export class NailProfileManager {
  /**
   * 現在のVuexステートからプロファイルオブジェクトを生成
   */
  public static createProfile(
    avatar: NailProfileAvatarMeta,
    nailState: NailState,
    presetId: string = RYUKI_PRESET.id
  ): NailProfileData {
    // configsのディープコピー
    const configsCopy: Partial<Record<FingerId, FingerNailConfig>> = {};
    for (const fid of ALL_FINGER_IDS) {
      const orig = nailState.configs[fid];
      if (orig) {
        configsCopy[fid] = {
          visible: orig.visible,
          transform: { ...orig.transform },
          morphs: { ...orig.morphs }
        };
      } else {
        configsCopy[fid] = createDefaultFingerConfig();
      }
    }

    // fingerTexturesのディープコピー
    const fingerTexturesCopy: Partial<Record<FingerId, string>> = {};
    for (const fid of ALL_FINGER_IDS) {
      fingerTexturesCopy[fid] = nailState.fingerTextures[fid] || nailState.selectedTextureId || 'cheek';
    }

    // customTextures（Base64画像データを含む）のコピー
    const customTexturesCopy = (nailState.customTextures || []).map((ct) => ({
      id: ct.id,
      name: ct.name,
      dataUrl: ct.dataUrl,
      createdAt: ct.createdAt
    }));

    const globalScaleCopy: GlobalScale = {
      scaleAll: nailState.globalScale.scaleAll ?? 1.0,
      scaleLength: nailState.globalScale.scaleLength ?? 1.0,
      scaleWidth: nailState.globalScale.scaleWidth ?? 1.0,
      scaleThickness: nailState.globalScale.scaleThickness ?? 1.0
    };

    return {
      format: 'VRMNailProfile',
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      avatar: {
        name: avatar.name || 'Unnamed Avatar',
        version: avatar.version,
        authors: avatar.authors,
        vrmFormatVersion: avatar.vrmFormatVersion
      },
      nail: {
        presetId,
        autoMeshFit: nailState.autoMeshFit ?? true,
        symmetrySync: nailState.symmetrySync ?? true,
        globalScale: globalScaleCopy,
        materialType: nailState.materialType || 'mtoon',
        mtoonParams: nailState.mtoonParams ? { ...nailState.mtoonParams } : { ...DEFAULT_MTOON_PARAMS },
        texture: {
          selectedTextureId: nailState.selectedTextureId,
          fingerTextures: fingerTexturesCopy,
          customTextures: customTexturesCopy
        },
        configs: configsCopy
      }
    };
  }

  /**
   * プロファイルをJSONファイルとしてダウンロード保存
   */
  public static exportProfileAsJsonFile(profile: NailProfileData, fileName?: string): void {
    const jsonStr = JSON.stringify(profile, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const safeName = (fileName || profile.avatar.name || 'avatar')
      .replace(/[\\/:*?"<>| \s]/g, '_')
      .toLowerCase();
    const downloadName = `${safeName}_nail_config.json`;

    const a = document.createElement('a');
    a.href = url;
    a.download = downloadName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * JSON文字列をパース＆バリデーションしてプロファイルオブジェクトを取得
   */
  public static parseAndValidateProfileJson(
    jsonText: string,
    currentAvatarName?: string
  ): ParseResult {
    try {
      const obj = JSON.parse(jsonText);
      if (!obj || typeof obj !== 'object') {
        return { success: false, error: 'JSONフォーマットが不正です。' };
      }

      // フォーマット検証
      if (obj.format !== 'VRMNailProfile') {
        return { success: false, error: '無効なネイル設定ファイルです (format mismatch)。' };
      }

      if (!obj.nail || typeof obj.nail !== 'object') {
        return { success: false, error: 'ネイル設定データが含まれていません。' };
      }

      const avatar = obj.avatar || { name: 'Unknown' };
      const nail = obj.nail;

      // 欠損値のフォールバック補完
      const safeGlobalScale: GlobalScale = {
        scaleAll: typeof nail.globalScale?.scaleAll === 'number' ? nail.globalScale.scaleAll : 1.0,
        scaleLength: typeof nail.globalScale?.scaleLength === 'number' ? nail.globalScale.scaleLength : 1.0,
        scaleWidth: typeof nail.globalScale?.scaleWidth === 'number' ? nail.globalScale.scaleWidth : 1.0,
        scaleThickness: typeof nail.globalScale?.scaleThickness === 'number' ? nail.globalScale.scaleThickness : 1.0
      };

      const safeConfigs: Partial<Record<FingerId, FingerNailConfig>> = {};
      const rawConfigs = nail.configs || {};
      for (const fid of ALL_FINGER_IDS) {
        const rawCfg = rawConfigs[fid];
        if (rawCfg) {
          const rawT = rawCfg.transform || {};
          const defT = createDefaultTransform();
          safeConfigs[fid] = {
            visible: typeof rawCfg.visible === 'boolean' ? rawCfg.visible : true,
            transform: {
              offsetForward: typeof rawT.offsetForward === 'number' ? rawT.offsetForward : defT.offsetForward,
              offsetSide: typeof rawT.offsetSide === 'number' ? rawT.offsetSide : defT.offsetSide,
              offsetHeight: typeof rawT.offsetHeight === 'number' ? rawT.offsetHeight : defT.offsetHeight,
              pitch: typeof rawT.pitch === 'number' ? rawT.pitch : defT.pitch,
              yaw: typeof rawT.yaw === 'number' ? rawT.yaw : defT.yaw,
              roll: typeof rawT.roll === 'number' ? rawT.roll : defT.roll,
              scaleAll: typeof rawT.scaleAll === 'number' ? rawT.scaleAll : defT.scaleAll,
              scaleLength: typeof rawT.scaleLength === 'number' ? rawT.scaleLength : defT.scaleLength,
              scaleWidth: typeof rawT.scaleWidth === 'number' ? rawT.scaleWidth : defT.scaleWidth,
              scaleThickness: typeof rawT.scaleThickness === 'number' ? rawT.scaleThickness : defT.scaleThickness
            },
            morphs: typeof rawCfg.morphs === 'object' && rawCfg.morphs !== null ? { ...rawCfg.morphs } : {}
          };
        } else {
          safeConfigs[fid] = createDefaultFingerConfig();
        }
      }

      const safeTexture = {
        selectedTextureId: nail.texture?.selectedTextureId || 'cheek',
        fingerTextures: nail.texture?.fingerTextures || {},
        customTextures: Array.isArray(nail.texture?.customTextures) ? nail.texture.customTextures : []
      };

      const validatedProfile: NailProfileData = {
        format: 'VRMNailProfile',
        version: obj.version || '1.0.0',
        exportedAt: obj.exportedAt || new Date().toISOString(),
        avatar: {
          name: avatar.name || 'Unnamed',
          version: avatar.version,
          authors: avatar.authors,
          vrmFormatVersion: avatar.vrmFormatVersion
        },
        nail: {
          presetId: nail.presetId || RYUKI_PRESET.id,
          autoMeshFit: typeof nail.autoMeshFit === 'boolean' ? nail.autoMeshFit : true,
          symmetrySync: typeof nail.symmetrySync === 'boolean' ? nail.symmetrySync : true,
          globalScale: safeGlobalScale,
          materialType: (nail.materialType === 'standard' ? 'standard' : 'mtoon') as NailMaterialType,
          mtoonParams: nail.mtoonParams ? { ...DEFAULT_MTOON_PARAMS, ...nail.mtoonParams } : { ...DEFAULT_MTOON_PARAMS },
          texture: safeTexture,
          configs: safeConfigs
        }
      };

      const isAvatarMismatch = Boolean(
        currentAvatarName &&
        validatedProfile.avatar.name &&
        validatedProfile.avatar.name.toLowerCase().trim() !== currentAvatarName.toLowerCase().trim()
      );

      return {
        success: true,
        profile: validatedProfile,
        isAvatarMismatch
      };
    } catch (e: any) {
      return {
        success: false,
        error: `JSONの解析中にエラーが発生しました: ${e.message || '構文エラー'}`
      };
    }
  }

  /**
   * LocalStorage にプロファイルを保存
   */
  public static saveToLocalStorage(profile: NailProfileData, isAutoSave = false): boolean {
    try {
      const prefix = isAutoSave ? AUTO_SAVE_KEY_PREFIX : LOCAL_STORAGE_KEY_PREFIX;
      const key = prefix + (profile.avatar.name || 'default');
      const dataStr = JSON.stringify(profile);
      localStorage.setItem(key, dataStr);
      return true;
    } catch (e) {
      console.error('[NailProfileManager] LocalStorage save failed:', e);
      return false;
    }
  }

  /**
   * LocalStorage から指定アバターのプロファイルを読み込み
   */
  public static loadFromLocalStorage(avatarName: string, isAutoSave = false): NailProfileData | null {
    try {
      const prefix = isAutoSave ? AUTO_SAVE_KEY_PREFIX : LOCAL_STORAGE_KEY_PREFIX;
      const key = prefix + avatarName;
      const dataStr = localStorage.getItem(key);
      if (!dataStr) return null;

      const res = this.parseAndValidateProfileJson(dataStr, avatarName);
      return res.success && res.profile ? res.profile : null;
    } catch (e) {
      console.error('[NailProfileManager] LocalStorage load failed:', e);
      return null;
    }
  }

  /**
   * 指定アバターの保存済みプロファイルが存在するか
   */
  public static hasSavedProfile(avatarName: string, isAutoSave = false): boolean {
    const prefix = isAutoSave ? AUTO_SAVE_KEY_PREFIX : LOCAL_STORAGE_KEY_PREFIX;
    return localStorage.getItem(prefix + avatarName) !== null;
  }

  /**
   * 指定アバターの保存データを削除
   */
  public static removeLocalStorageProfile(avatarName: string, isAutoSave = false): void {
    const prefix = isAutoSave ? AUTO_SAVE_KEY_PREFIX : LOCAL_STORAGE_KEY_PREFIX;
    localStorage.removeItem(prefix + avatarName);
  }
}
