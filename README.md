<div align="center">
  <img src="docs/app-icon.png" width="88" alt="课序图标" />
  <h1>课序 · ClassFlow</h1>
  <p><strong>把一学期，排得明明白白。</strong></p>
  <p>一款本地优先的大学课表：周 / 日视图、课程管理、今日提醒、ICS 日历导出与离线 PWA。</p>

  <p>
    <a href="https://lcymxm.github.io/classflow/"><strong>在线使用 →</strong></a>
    &nbsp;·&nbsp;
    <a href="#本地运行">本地运行</a>
    &nbsp;·&nbsp;
    <a href="#功能">功能</a>
    &nbsp;·&nbsp;
    <a href="#隐私与数据">数据</a>
  </p>

  <p>
    <a href="https://github.com/lcymxm/classflow/actions/workflows/deploy.yml"><img src="https://github.com/lcymxm/classflow/actions/workflows/deploy.yml/badge.svg" alt="Deploy" /></a>
    <img src="https://img.shields.io/badge/license-MIT-1d2b27" alt="MIT License" />
    <img src="https://img.shields.io/badge/React-19-1d2b27" alt="React 19" />
    <img src="https://img.shields.io/badge/offline-ready-c5634b" alt="Offline ready" />
  </p>
</div>

![每周课表](docs/screenshot-week.png)

> 截图使用内置示例课表。首次打开时，你可以直接试用，也可以一键清空，从自己的第一门课开始。

## 功能

- **周课表 / 日课表**：一周七天、每日最多 14 节，按真实时间轴排列。
- **课程管理**：课程名、老师、地点、备注、颜色；一门课支持多个上课时间段。
- **周次与单双周**：每门课可设置第 1–30 周中的范围，并支持每周 / 单周 / 双周。
- **今日视图**：当天课程、下一节课、倒计时、本周负担与最忙的一天。
- **学期设置**：学期名称、开学第一周、总周数、是否显示周末。
- **作息设置**：每天 6–14 节，每节开始 / 结束时间可调整，课表自动换算。
- **冲突提示**：同一时段两门课会自动并排显示，并标记时间冲突。
- **备份与迁移**：JSON 完整备份 / 导入；ICS 导出可导入 Google、Apple、Outlook 日历。
- **打印 / PDF**：一键打印当前课表，适合贴在桌前。
- **浅色 / 深色主题**，移动端适配，PWA 离线可用。
- **本地优先**：没有账号、没有后端、没有统计；数据只保存在你的浏览器里。

### 日视图

![日视图](docs/screenshot-day.png)

### 课程库

![课程库](docs/screenshot-library.png)

<p align="center">
  <img src="docs/screenshot-mobile.png" width="320" alt="手机端日视图" />
</p>

## 在线使用

打开 **<https://lcymxm.github.io/classflow/>** 即可。

支持「添加到主屏幕」：在桌面 Chrome / Edge 地址栏右侧点安装图标，或在手机浏览器菜单中选择「添加到主屏幕」。第一次打开后，断网也能继续查看课表。

## 本地运行

需要 Node.js 22.12+ 与 pnpm。

```bash
pnpm install
pnpm dev
```

打开 <http://127.0.0.1:5173>。

构建与预览：

```bash
pnpm build
pnpm preview
```

运行测试：

```bash
pnpm test
```

## 快捷键

| 按键 | 作用 |
| --- | --- |
| `N` | 新建课程 |
| `←` / `→` | 切换上一周 / 下一周 |
| `T` | 回到当前周 |
| `Esc` | 关闭弹窗 / 收起手机端导航 |

## 隐私与数据

- 所有课程、学期设置和主题偏好保存在 **localStorage**。
- 不发起任何账号、分析或同步请求，不加载外部字体和图标。
- 换设备前，请到「设置 → 数据与备份 → 导出课表备份」导出 JSON，再在新设备导入。
- 清理浏览器站点数据会同时清除课表；建议定期导出备份。

## 技术栈

- **React 19 + TypeScript + Vite 8**
- 原生 CSS，无 UI 框架；自定义响应式课表与对话框
- 自写 Service Worker + Web App Manifest，实现离线与安装
- Vitest 单元测试：日期 / 周次 / 重叠布局 / 导入校验 / ICS 导出
- GitHub Actions 自动构建并部署到 GitHub Pages

## 目录

```text
classflow/
├─ src/
│  ├─ components/       # 课表、课程、设置、弹窗等界面
│  ├─ lib/              # 日期、课程规则、存储、备份与 ICS
│  ├─ data/             # 内置示例数据
│  ├─ test/             # Vitest 测试
│  ├─ App.tsx
│  └─ styles.css
├─ public/              # favicon、PWA manifest、Service Worker、图标
├─ docs/                # README 截图
├─ .github/workflows/   # GitHub Pages 自动部署
└─ vite.config.ts
```

## 部署

仓库已配置 GitHub Actions。推送到 `main` 后会自动跑测试、构建并发布到 GitHub Pages：

```text
.github/workflows/deploy.yml
```

如果你 fork 了本项目，请在自己的仓库中：

1. 打开 **Settings → Pages**；
2. 将 Source 设为 **GitHub Actions**；
3. 推送一次 `main`，或在 Actions 中手动运行 `Deploy to GitHub Pages`。

`vite.config.ts` 使用相对 `base`，因此部署在任意子路径都可以正常工作。

## 说明

- 内置课表只是示例，可在页面顶部「清空示例」。
- 周次按「开学第一周的周一」自动计算；设置里选择任意日期都会对齐到那一周的周一。
- 课程冲突目前只会提示并并排展示，不会自动调整课程时间。
- 这是个人课表工具，不包含教务系统登录或自动抓取课表功能。

## License

[MIT](LICENSE) © 2026 [lcymxm](https://github.com/lcymxm)

---

如果课序让你的学期清楚了一点点，欢迎点一个 Star。
