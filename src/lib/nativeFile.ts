import { Capacitor } from "@capacitor/core";

export type FileDelivery = "download" | "shared" | "saved";

export interface ExportResult {
  filename: string;
  delivery: FileDelivery;
}

export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform();
}

function downloadInBrowser(filename: string, content: string, type: string): void {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 3000);
}

/**
 * On the web, trigger a normal browser download.
 * Inside the Android app, write the file to the app cache and open the
 * Android share sheet so the backup can be saved to Files / a cloud drive.
 */
export async function deliverTextFile(
  filename: string,
  content: string,
  type: string,
): Promise<FileDelivery> {
  if (!isNativeApp()) {
    downloadInBrowser(filename, content, type);
    return "download";
  }

  const { Filesystem, Directory, Encoding } = await import("@capacitor/filesystem");
  const { Share } = await import("@capacitor/share");
  const cached = await Filesystem.writeFile({
    path: filename,
    data: content,
    directory: Directory.Cache,
    encoding: Encoding.UTF8,
    recursive: true,
  });

  try {
    await Share.share({
      title: filename,
      dialogTitle: "保存或分享课表文件",
      files: [cached.uri],
    });
    return "shared";
  } catch {
    try {
      await Filesystem.writeFile({
        path: filename,
        data: content,
        directory: Directory.Documents,
        encoding: Encoding.UTF8,
        recursive: true,
      });
      return "saved";
    } catch {
      throw new Error("无法保存文件，请使用浏览器版课序导出备份。");
    }
  }
}
