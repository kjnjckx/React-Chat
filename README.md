# Claude Chatbox — React Sandbox

一个自包含的单 HTML 文件聊天界面，通过 Claude API 实现对话，并支持将可视化内容（图表、交互组件、游戏等）直接嵌入聊天流中渲染。

无需安装任何依赖，无需 Node.js，无需构建工具。下载一个文件，浏览器打开即用。

## 功能

**对话**
- 支持 Anthropic 和 OpenAI 两种 API 格式，兼容各类第三方中转站
- 可自由填写 API 端点、Key、模型名称
- 上下文记忆（当前会话内）
- 图片上传（点击按钮 / Ctrl+V 粘贴 / 多图）
- 聊天记录保存到浏览器 / 导出导入 JSON 文件

**可视化渲染**
- **HTML 模式**：Claude 生成完整 HTML 代码，内嵌 Chart.js / D3 / Canvas / Three.js 等，直接在 iframe 中运行
- **React 模式**：Claude 生成 JSX 代码，通过 Babel 在 iframe 内实时编译运行，预装 React 18 + Recharts + Tailwind CSS
- 下载源码：HTML 模式下载 `.html` 文件，React 模式下载 `.jsx` 文件

**工作原理**

不依赖 Tool Use / Function Calling（兼容性最好），而是通过 System Prompt 约定特殊标记：

```
~~~REACT_VIZ
export default function App() {
  return <div className="p-4">Hello World</div>;
}
~~~
```

前端解析到标记后，提取代码并渲染到 sandboxed iframe 中。

## 快速开始

### 方式一：GitHub Pages（推荐）

1. Fork 本仓库
2. 进入仓库 Settings → Pages → Source 选 `main` 分支 → Save
3. 访问 `https://你的用户名.github.io/仓库名/`
4. 填写 API 配置，开始使用

### 方式二：本地运行

```bash
# 下载文件后，进入所在目录
cd ~/Downloads

# 启动本地服务器（任选一种）
python3 -m http.server 8000
# 或
npx serve .
```

浏览器打开 `http://localhost:8000/index.html`

> ⚠️ **不要直接双击打开**。`file://` 协议下浏览器会阻止 iframe 加载 CDN 脚本，导致可视化白屏。

## API 配置

点击界面右上角「设置」按钮，填写以下信息：

| 字段 | 说明 |
|------|------|
| API 端点 | API 的 Base URL，如 `https://api.anthropic.com` |
| API Key | 你的 API Key |
| 模型名称 | 任意模型标识符，如 `claude-sonnet-4-20250514` |
| API 格式 | 选择 Anthropic 或 OpenAI，必须与你的服务端一致 |

### 常见配置示例

| 平台 | Base URL | 模型名称 | 格式 |
|------|----------|----------|------|
| Anthropic 官方 | `https://api.anthropic.com` | `claude-sonnet-4-20250514` | Anthropic |
| OpenRouter | `https://openrouter.ai/api` | `anthropic/claude-sonnet-4` | Anthropic |
| 自建 One API | `https://your-domain.com` | `claude-sonnet-4-20250514` | Anthropic |
| OpenAI | `https://api.openai.com` | `gpt-4o` | OpenAI |

配置会自动保存到浏览器 localStorage，刷新不丢失。

## React Sandbox 预装环境

React 模式下 iframe 内可用的库：

| 库 | 版本 | 用途 |
|----|------|------|
| React | 18 | UI 框架 |
| ReactDOM | 18 | 渲染 |
| Babel Standalone | 7 | 浏览器内编译 JSX |
| Recharts | 2.12 | 图表（折线图、柱状图、饼图等） |
| Tailwind CSS | 2 | 样式 |
| prop-types | 15 | Recharts 依赖 |

Claude 生成的 JSX 代码只需 `export default` 导出一个函数组件即可渲染：

```jsx
import { useState } from 'react';
import { PieChart, Pie, Cell, Tooltip } from 'recharts';

export default function App() {
  const [data] = useState([
    { name: 'A', value: 400 },
    { name: 'B', value: 300 },
  ]);
  return (
    <div className="p-6">
      <PieChart width={300} height={300}>
        <Pie data={data} dataKey="value" cx="50%" cy="50%">
          <Cell fill="#6d5cff" />
          <Cell fill="#34d399" />
        </Pie>
        <Tooltip />
      </PieChart>
    </div>
  );
}
```

## 聊天记录

设置面板中提供四种方式管理聊天记录：

| 操作 | 说明 |
|------|------|
| 保存到浏览器 | 存入 localStorage，刷新页面后可恢复 |
| 恢复记录 | 从 localStorage 读取并重新渲染对话 |
| 导出 JSON | 下载完整对话为 `.json` 文件 |
| 导入 JSON | 从文件恢复对话 |

> 含大量图片的对话建议用导出 JSON 方式保存，localStorage 有约 5MB 限制。

## 已知限制

- **CORS**：部分第三方中转站不支持浏览器直接调用（缺少 CORS 头），需要通过后端代理或使用支持 CORS 的中转站
- **max_tokens**：默认设置为 131072，如果你的中转站有更低限制，可在代码中搜索 `max_tokens` 修改
- **图标库**：Lucide React 的 UMD 包在 iframe sandbox 中有兼容性问题，已移除。图标改用 emoji 或内联 SVG
- **代码截断**：如果 Claude 生成的代码过长超出 token 限制，闭合标记可能丢失。解析器有容错处理，会尝试渲染已有部分

## 技术架构

```
用户输入
  ↓
调用 API（不带 tools 参数，纯文本请求）
  ↓
Claude 回复（含 ~~~REACT_VIZ / ~~~HTML_VIZ 标记）
  ↓
parseResponse() 解析文本，分离普通文字和代码块
  ↓
├─ 文字 → 渲染为聊天气泡
├─ HTML 代码 → Blob URL → iframe
└─ JSX 代码 → buildReactSandboxHTML() → Blob URL → iframe
                    ↓
              iframe 内部：
              顺序加载 React → ReactDOM → Babel → PropTypes → Recharts
                    ↓
              Babel 编译 JSX → new Function 执行 → ReactDOM 渲染
```

## License

MIT
