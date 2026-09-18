# Resume Toolkit

本仓库提供一套本地优先、可由 AI Agent 协助执行的简历工作流和 PDF 工具。可以基于旧简历修改，也可以从空白资料开始；中英文内容分别保存，使用同一套排版引擎导出。

## 能做什么

- 按证据整理个人经历，记录数据来源和待确认事项，不替用户编造事实。
- 从英文或中文 JSON Resume 数据生成 A4 简历 PDF 与 PNG 预览。
- 可配置二维码链接，构建时自动生成 QR SVG；最多两个二维码。
- 检查 JSON Schema、单页输出、PDF 可提取文本和关键字段。
- 提供 `skills/resume-workflow/SKILL.md`，供 Codex 或其他能读取本地文件、运行命令的 Agent 作为工作流说明。

## 环境要求

- Node.js 20 或更高版本
- Typst
- Poppler 命令行工具（`pdftoppm`、`pdfinfo`、`pdftotext`）

本项目已在 macOS 上运行示例验收。中文字体取决于操作系统；若 PDF 缺字，请安装适合的简体中文字体，并在 `templates/resume.typ` 中选择该字体。

macOS 使用 Homebrew 时：

```bash
brew install node typst poppler
```

## 快速开始

```bash
npm ci
npm run smoke
```

`smoke` 会分别生成中英文示例 PDF/PNG，并检查两份 PDF 均为单页且包含样例关键信息。生成文件写入 `dist/`，该目录已被 Git 忽略。

从示例开始建立自己的资料：

```bash
mkdir -p private
cp examples/resume.example.json private/resume-en.json
cp examples/resume.example.zh.json private/resume-zh.json
```

把个人原始材料放在 `private/` 中，参考 `templates/profile-intake.md` 与 Agent 工作流整理内容。`private/` 已在 `.gitignore` 中排除。

构建并检查自己的简历：

```bash
npm run build -- --input private/resume-en.json --output dist/resume-en
npm run check -- --input private/resume-en.json --pdf dist/resume-en.pdf

npm run build -- --input private/resume-zh.json --output dist/resume-zh
npm run check -- --input private/resume-zh.json --pdf dist/resume-zh.pdf
```

每次构建会同时输出 `.pdf` 和 `.png`。PDF 是生成产物；修改 JSON 内容或 Typst 模板后重新生成，不要直接编辑 PDF。

## 数据格式

简历主结构遵循 [JSON Resume](https://jsonresume.org/schema/)。工具扩展保存在 `x_resumeSystem`：

```json
{
  "x_resumeSystem": {
    "language": "en",
    "sectionTitles": {
      "education": "Education",
      "work": "Experience",
      "projects": "Projects",
      "skills": "Skills",
      "links": "Links"
    },
    "qrCodes": [
      { "label": "Portfolio", "url": "https://example.com/en" },
      { "label": "Contact", "url": "https://example.com/contact" }
    ]
  }
}
```

`qrCodes` 是可选项。中文和英文版本可以分别配置对应语言的链接和标签。二维码只编码 JSON 中明确提供的 URL；构建脚本不会替用户推断或联网上传简历。

## 给 AI Agent 使用

Agent 应先读取仓库根目录的 `AGENTS.md` 和 `skills/resume-workflow/SKILL.md`。如果 Agent 支持 Skill 安装，可以将 `skills/resume-workflow/` 放入其 Skills 目录；否则可在打开本仓库时要求它遵循该文件。

工作流涵盖旧简历导入、从零访谈、证据核对、中英文改写、逐条处理批注、构建和渲染验收。Agent 需要在输出中区分已确认事实与待确认内容；不能把估计值写成事实，也不能将个人材料提交到 Git。

## 隐私与 GitHub

本仓库默认作为 Private 仓库分发。GitHub 私有仓库链接只对仓库所有者和被邀请的协作者开放；朋友需要用自己的 GitHub 账号接受邀请后才能克隆。每位使用者应在本地 `private/` 保存个人资料，并且只分享工具代码，不分享个人简历数据。

排版、PDF 导出与二维码生成在本地完成。如果使用云端 AI Agent，原始材料是否会传到模型服务由该 Agent 和服务商的数据设置决定；本工具不承诺云端 Agent 的推理过程离线运行。

仓库中的演示姓名、邮箱、学校、公司、经历和链接均为虚构样例。提交前请检查：

```bash
git status --short
git check-ignore private/resume-en.json
```

不要把真实简历、身份证件、私人联系方式、二维码图像、API 密钥或招聘账号信息放入已跟踪文件。

## 当前边界

- 当前模板为一页 A4 中英文简历，不负责求职网站投递或招聘状态管理。
- 页面是否适合特定行业、ATS 或打印要求，需要由使用者检查并调整。
- Agent 可以起草和修改材料；用户确认最终事实与导出版本。
