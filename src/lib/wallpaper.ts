import type { CSSProperties } from "react";
import type { Theme, Wallpaper, WallpaperPreset } from "../types";

export interface WallpaperPresetDefinition {
  id: WallpaperPreset;
  name: string;
  note: string;
  background: string;
  size?: string;
}

export const WALLPAPER_PRESETS: WallpaperPresetDefinition[] = [
  {
    id: "paper",
    name: "奶油纸",
    note: "默认的米色网点纸",
    background:
      "radial-gradient(var(--dot) 0.85px, transparent 0.85px), linear-gradient(180deg, var(--surface), var(--surface))",
    size: "22px 22px, auto",
  },
  {
    id: "sage",
    name: "鼠尾草",
    note: "柔和的浅绿网格",
    background:
      "linear-gradient(90deg, color-mix(in srgb, var(--line) 58%, transparent) 1px, transparent 1px), linear-gradient(color-mix(in srgb, var(--line) 58%, transparent) 1px, transparent 1px), linear-gradient(135deg, #edf1e5, #e2ead7)",
    size: "34px 34px, 34px 34px, auto",
  },
  {
    id: "dawn",
    name: "晨光",
    note: "暖橙与奶油渐变",
    background:
      "radial-gradient(circle at 84% 0%, rgba(221, 103, 73, 0.2), transparent 22rem), linear-gradient(135deg, #f6e3d3, #fbf5e9 56%, #efe8d8)",
  },
  {
    id: "dusk",
    name: "暮色",
    note: "深绿夜色，适合深色主题",
    background:
      "radial-gradient(circle at 88% 10%, rgba(221, 103, 73, 0.23), transparent 24rem), linear-gradient(145deg, #1c302a, #111b17)",
  },
];

function preset(id: WallpaperPreset): WallpaperPresetDefinition {
  return WALLPAPER_PRESETS.find((item) => item.id === id) ?? WALLPAPER_PRESETS[0];
}

function overlay(theme: Theme, dim: number, strong = false): string {
  const amount = Math.min(80, Math.max(0, dim)) / 100;
  if (theme !== "light") {
    const alpha = strong ? 0.58 + amount * 0.25 : 0.34 + amount * 0.3;
    const base = theme === "whale" ? "5, 17, 31" : "16, 22, 19";
    return `rgba(${base}, ${Math.min(0.9, alpha)})`;
  }
  const alpha = strong ? 0.55 + amount * 0.35 : 0.16 + amount * 0.35;
  return `rgba(248, 246, 239, ${Math.min(0.82, alpha)})`;
}

export function wallpaperStyle(wallpaper: Wallpaper, theme: Theme): CSSProperties {
  if (wallpaper.preset === "custom" && wallpaper.dataUrl) {
    return {
      "--wallpaper-image": `url("${wallpaper.dataUrl}")`,
      "--wallpaper-size": "cover",
      "--wallpaper-repeat": "no-repeat",
      "--wallpaper-overlay": overlay(theme, wallpaper.dim, true),
    } as CSSProperties;
  }

  const def = preset(wallpaper.preset === "custom" ? "paper" : wallpaper.preset);
  return {
    "--wallpaper-image": def.background,
    "--wallpaper-size": def.size ?? "auto",
    "--wallpaper-repeat": "repeat",
    "--wallpaper-overlay":
      wallpaper.preset === "paper"
        ? "transparent"
        : overlay(theme, wallpaper.dim, wallpaper.preset === "dusk"),
  } as CSSProperties;
}

export async function imageFileToWallpaper(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("请选择图片文件。");
  }
  if (file.size > 20 * 1024 * 1024) {
    throw new Error("图片不能超过 20 MB。");
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("图片读取失败，请换一张试试。"));
      image.src = objectUrl;
    });

    const maxWidth = 1600;
    const maxHeight = 1200;
    const scale = Math.min(1, maxWidth / image.naturalWidth, maxHeight / image.naturalHeight);
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("当前设备无法处理这张图片。");

    context.fillStyle = "#f4f1e8";
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.82);
    if (dataUrl.length > 2_300_000) {
      return canvas.toDataURL("image/jpeg", 0.68);
    }
    return dataUrl;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
