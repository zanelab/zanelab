<!-- 来源: jiushiwon/wg-skills @ 3b93743 (Apache-2.0)，有修改；详见 ../NOTICE.md -->
# Electron 桌面端规范

> 合并转写自 wg-skills 的 5 个技能：`electron-react-skill`、`electron-vue-init-skill`（源仓库
> 未收录实体，仅 README 引用）、`electron-dev-restart`、`xterm-js-rendering-pitfalls`、
> `electron-native-abi-fix`。规则实质保留原文，触发词/frontmatter/与规则无关的叙述已剥离。

## 一、Electron + React 项目架构（electron-react-skill）

三层架构：**Main Process（Node.js）**——数据库连接（MySQL/PG/MongoDB/Redis）、SSH/SFTP 会话管理、系统能力（文件/剪切板/通知/托盘）、IPC Handler；**Preload Script（桥接层）**——`contextBridge.exposeInMainWorld`；**Renderer Process（React）**——UI 组件（React + CSS）、状态管理（Context/Hooks）、IPC Invoke。

安全边界：渲染进程不直接触碰 Node 能力，一切经 contextBridge 暴露的受控 API；状态管理注意「全应用一致 + 跨组件感知」的状态（主题/当前用户/当前连接）放全局 store，不放组件 `useState`（见 xterm 坑 2）。

## 二、Electron + Vue 骨架（electron-vue-init-skill）

源仓库未收录该技能实体（私有仓库引用，未收录）；index 映射保留占位——被 electron 相关技能引用时标注「（源仓库私有技能，未收录）」。

## 三、主进程改动必须彻底重启（electron-dev-restart）

**铁律：改 `electron/main/*` 或 `electron/preload/*` 后，必须彻底退出当前 Electron 进程并重启。** Electron 主进程/preload 无 HMR——vite 只热更 renderer。

典型症状（改了代码但运行中行为像旧代码）：改 `ipcMain.handle('xxx')` 后 GUI 调用仍报 `No handler registered`；改 preload 别名后报 `api.xxx is not a function`；`out/main/index.js` 里能看到新字符串但 GUI 行为不变；electron-vite 控制台没报错但行为不变。

**第一步 · 先验证新代码是否进了运行中的 Electron**：检查构建产物（如 `out/main/index.js`）里有没有新加的字符串——产物有新代码而运行时旧行为 = 进程没重启。

**第二步 · 真正重启**：Windows / Git Bash 下杀干净——`MSYS_NO_PATHCONV=1` **必加**（否则 `/F` `/T` 被 MSYS 当路径转换报「无效参数」）；`/T` **必加**（杀进程树：pnpm/uvicorn 会 fork 子进程，只杀父进程端口不释放）；杀完**轮询等端口真正释放**再起新进程。推荐用项目自带 `start.bat` 一键重启。

**第三步 · 构建不跑也是坑**：改完源码未重新构建就重启，跑的还是旧产物——先 build 再 restart。

## 四、xterm.js 渲染四大坑（xterm-js-rendering-pitfalls）

适用：Electron + SSH/本地终端，底层 `@xterm/xterm` 6.x + `@xterm/addon-fit`。四个坑都源于「xterm 是 canvas 渲染」+「CSS 变量和 React state 的盲区」。

### 坑 1：fontFamily 传 `var(--font-mono)` → vi 越界、gg/G 失效

现象：终端字符排到视口外；vi `gg`/`G` 看着没反应。根因：xterm 用 canvas `ctx.font` 渲染文字，**`ctx.font` 不支持 CSS 变量**——字体解析失败回退默认，字符宽度测量错误。修法：传具体字体名（如 `'JetBrains Mono', monospace`），主题色可以用 CSS 变量（走 theme 对象），字体名不行。

### 坑 2：主题切换不生效（state 孤岛）

现象：`<html data-theme="dark">` 切了，其他 UI 跟随深色，xterm 画布仍白色。根因：`useTheme()` 每个调用方各自 `useState`，主题切换不跨组件传播——`ThemeToggle` 自己变 dark，`SshTerminal` 的 state 还是 light，其 effect 不触发。修复（架构级 lift state up）：**任何需要「全应用一致 + 跨组件感知」的状态（主题、当前用户、当前连接）都不能放 `useState`，必须放全局 store**。

### 坑 3：canvas 重绘需 `term.refresh()`

直接改 `term.options.theme` 后部分场景画布不重绘——需要显式 `term.refresh(0, term.rows - 1)`。

### 坑 4：PTY 尺寸在字体加载完成前 fit → rows/cols 偏大 → 远端 vi 越界

现象：vi 打开文档后命令行排在视口外，输不进退不出；单屏正好放下时不踩，内容多/窗口变化时必踩。根因：PTY 经 `TIOCSWINSZ` 把窗口尺寸告诉远端 shell，vi 据此排版；首屏 `fit()` 在 web 字体未加载完成时按 fallback 字体计算，**rows 偏大**；`document.fonts.ready` 在字体 404/极慢时**不 resolve**。修复（多重兜底校正）：fit 前等字体（带超时兜底，不能只依赖 `fonts.ready`）、resize 时重新 fit + 同步 PTY 尺寸。

## 五、原生模块故障排查与修复（electron-native-abi-fix）

### 5.1 先翻译报错（照着报错改代码必错）

典型症状：`No handler registered for '<channel>'` 但 `ipcMain.handle` 确实存在；日志 `was compiled against a different Node.js version using NODE_MODULE_VERSION X`；`require('electron')` 返回**字符串**而不是对象；`electron --version` 与 `package.json` 不一致；`npm install` 卡在 `node-gyp` / `gyp ERR` / `MSB####`；换 Node 版本或重装依赖后 Electron 起不来。

### 5.2 侦察本机硬约束（决定方案可行性）

① 有没有 MSVC/VS——没有就**不能** node-gyp 本地编译，只能靠官方预编译；② Electron 版本与 ABI（`NODE_MODULE_VERSION` 对应关系）；③ 代理变量——本机代理常对 GitHub 返回 502，`unset HTTP_PROXY/HTTPS_PROXY` 直连反而通；④ npmmirror 的 `-/binary` 镜像不托管老版本 Electron 预编译（查得到、下不到）；⑤ `ELECTRON_RUN_AS_NODE` 写进系统环境变量会让所有 Electron 应用退化成 node。

### 5.3 修复决策

**优先降级包**，其次升级 Electron。流程：查该包是否为目标 ABI 提供预编译 → 安装（必须 `--ignore-scripts`）→ 手动拉取 Electron 版预编译。

⚠️ **必踩副作用**：`--ignore-scripts` 会弄丢 Electron 二进制——**这类项目不要用全局 `--ignore-scripts` 装包；确需跳过，装完立刻检查 `node_modules/electron/dist/` 是否还在**。

诊断脚本：源仓库 `scripts/diag-native.cjs`（源仓库有配套脚本，路径即此处，用途：一键侦察 Electron/ABI/环境约束）。

## 六、源文件对照

| 章节 | 源技能 |
|------|--------|
| 一 | vibeCoding/frontend/electron/electron-react-skill |
| 二 | vibeCoding/frontend/electron/electron-vue-init-skill（私有，未收录实体） |
| 三 | vibeCoding/frontend/electron/electron-dev-restart |
| 四 | vibeCoding/frontend/electron/xterm-js-rendering-pitfalls |
| 五 | others/electron-native-abi-fix |
