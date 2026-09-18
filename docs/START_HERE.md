# Resume Toolkit：Agent 入口

把仓库链接和下面这段话一起交给支持读取 GitHub 仓库、运行本地命令的 Agent：

> 请先读取仓库根目录的 AGENTS.md、README.md 和
> skills/resume-workflow/SKILL.md，再按其中的流程帮我制作或修改简历。
> 先判断我是从零开始还是修改已有简历，并在开始写内容前确认目标岗位、地区、
> 语言、格式、页数和截止时间。所有经历、数字、日期、工具和结果都要记录来源；
> 不确定的事实先询问，不要自行补写。完成后运行构建和检查，并报告生成文件、
> 页数、文字提取结果和仍需我确认的问题。

## 两种入口

### 从零开始

在仓库根目录运行：

~~~bash
npm ci
npm run doctor
npm run init
~~~

然后让 Agent 读取 private/profile-intake.md 和 private/evidence-ledger.md，
根据你的材料完成中英文 JSON。

### 修改已有简历

把原始简历、项目材料和批注放在 Git 忽略的 private/source/ 中，
保留原始文件不做覆盖。Agent 应先提取事实并建立证据台账，再修改
private/resume-en.json 和 private/resume-zh.json。

## 常用命令

~~~bash
npm run init                 # 创建 private 工作区，不覆盖已有文件
npm run doctor               # 检查本机依赖
npm run build:duplex        # 中文第一页、英文第二页的双面打印 PDF
npm run smoke                # 构建并检查仓库内的中英文示例
~~~

二维码是可选扩展。只有在语言 JSON 的 x_resumeSystem.qrCodes 中明确填写
标签和 URL 时才会生成；没有这个字段时，简历不会出现二维码。

