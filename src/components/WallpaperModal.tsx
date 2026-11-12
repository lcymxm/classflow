import { useRef, useState } from "react";
import { Check, Image, RotateCcw, Upload } from "lucide-react";
import type { ChangeEvent, CSSProperties } from "react";
import type { Theme, Wallpaper, WallpaperPreset } from "../types";
import {
  WALLPAPER_PRESETS,
  imageFileToWallpaper,
  wallpaperStyle,
} from "../lib/wallpaper";
import { Modal } from "./Modal";

interface WallpaperModalProps {
  wallpaper: Wallpaper;
  theme: Theme;
  onClose: () => void;
  onChange: (wallpaper: Wallpaper) => void;
}

export function WallpaperModal({
  wallpaper,
  theme,
  onClose,
  onChange,
}: WallpaperModalProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const selectPreset = (preset: WallpaperPreset) => {
    setError("");
    onChange({ ...wallpaper, preset, dataUrl: "" });
  };

  const upload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const dataUrl = await imageFileToWallpaper(file);
      onChange({
        ...wallpaper,
        preset: "custom",
        dataUrl,
        dim: Math.max(wallpaper.dim, 40),
      });
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "图片处理失败。");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const selectedPreset = wallpaper.preset;

  return (
    <Modal
      className="wallpaper-modal"
      eyebrow="BOARD MOOD"
      title="课表壁纸"
      onClose={onClose}
      footer={
        <>
          <p className="modal-foot-note">壁纸只影响课表区域，不会上传到任何地方</p>
          <span className="modal-foot-spacer" />
          <button
            className="secondary-button"
            type="button"
            onClick={() => onChange({ preset: "paper", dataUrl: "", dim: 16 })}
          >
            <RotateCcw size={14} />
            恢复默认
          </button>
          <button className="primary-button" type="button" onClick={onClose}>
            <Check size={16} />
            完成
          </button>
        </>
      }
    >
      <div className="wallpaper-form">
        {error ? <p className="form-error">{error}</p> : null}

        <div className="wallpaper-preview" style={wallpaperStyle(wallpaper, theme)}>
          <div className="wallpaper-preview-copy">
            <span className="micro-label">PREVIEW</span>
            <strong>你的课表</strong>
            <span>让课表有一点自己的样子。</span>
          </div>
          <span className="wallpaper-preview-chip">周一 · 08:00</span>
        </div>

        <div>
          <div className="settings-pane-head settings-pane-head--tight">
            <span className="field-label">选择预设</span>
          </div>
          <div className="wallpaper-grid">
            {WALLPAPER_PRESETS.map((preset) => (
              <button
                key={preset.id}
                className={`wallpaper-option ${selectedPreset === preset.id ? "is-selected" : ""}`}
                type="button"
                onClick={() => selectPreset(preset.id)}
                aria-pressed={selectedPreset === preset.id}
              >
                <span
                  className="wallpaper-swatch"
                  style={
                    {
                      background: preset.background,
                      backgroundSize: preset.size ?? "auto",
                    } as CSSProperties
                  }
                />
                <span>
                  <strong>{preset.name}</strong>
                  <small>{preset.note}</small>
                </span>
                {selectedPreset === preset.id ? (
                  <span className="wallpaper-check">
                    <Check size={12} />
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        </div>

        <div className="wallpaper-upload-row">
          <div>
            <span className="field-label">自己的图片</span>
            <small className="field-hint">会自动压缩到适合手机的大小，保存在本机。</small>
          </div>
          <button
            className="secondary-button"
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
          >
            <Upload size={15} />
            {busy ? "处理中…" : "上传图片"}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            aria-label="上传课表壁纸"
            onChange={(event) => { void upload(event); }}
          />
        </div>

        {wallpaper.preset === "custom" && wallpaper.dataUrl ? (
          <div className="wallpaper-custom-row">
            <Image size={16} />
            <span>已使用自定义图片</span>
            <button className="text-button" type="button" onClick={() => selectPreset("paper")}>
              移除
            </button>
          </div>
        ) : null}

        <label className="wallpaper-dim">
          <span>
            <strong>遮罩强度</strong>
            <small>图片越花，可以调高一点，让课程内容更清楚。</small>
          </span>
          <input
            type="range"
            min={0}
            max={70}
            value={wallpaper.dim}
            onChange={(event) =>
              onChange({ ...wallpaper, dim: Math.min(70, Math.max(0, Number(event.target.value))) })
            }
          />
          <em>{wallpaper.dim}%</em>
        </label>
      </div>
    </Modal>
  );
}
