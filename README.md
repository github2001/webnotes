# 📝 WebNotes - 网页标注笔记工具

<p align="center">
  <img src="icons/icon128.png" alt="WebNotes Logo" width="128">
</p>

<p align="center">
  <b>WebNotes</b> 是一款 Chrome 扩展，帮助你在网页上高亮文本、添加笔记并本地存储，支持导出为 Markdown 格式。
</p>

---

## ✨ 功能特性

| 功能 | 描述 |
|------|------|
| 🎨 **高亮选中文本** | 支持 5 种高亮颜色（黄、绿、蓝、粉、橙） |
| 📝 **添加笔记注释** | 为高亮文本添加笔记，便于后续查看整理 |
| 💾 **本地存储** | 使用 `chrome.storage` API 安全存储数据 |
| 📤 **导出 Markdown** | 一键导出所有标注和笔记为 Markdown 文件 |
| 🖱️ **右键菜单** | 通过右键菜单快捷高亮和添加笔记 |

---

## 📦 安装方法

### 方式一：Chrome 商店安装（推荐）
1. 访问 [Chrome Web Store](https://chrome.google.com/webstore/) 搜索 **WebNotes**
2. 点击「添加至 Chrome」按钮
3. 安装完成后，WebNotes 图标将出现在工具栏中

### 方式二：手动安装（开发者）
1. 下载或克隆本仓库
2. 打开 Chrome，访问 `chrome://extensions/`
3. 开启右上角「开发者模式」
4. 点击「加载已解压的扩展程序」
5. 选择 WebNotes 项目文件夹

---

## 🚀 使用说明

### 高亮文本
1. 在网页上选中一段文字
2. 按下快捷键 `Ctrl + Shift + H`
3. 或右键选择「高亮选中文本」

### 添加笔记
1. 选中文字后按 `Ctrl + Shift + N`
2. 在弹出的输入框中输入笔记
3. 选择高亮颜色后点击「保存」

### 查看和导出
1. 点击浏览器工具栏的 WebNotes 图标
2. 查看所有已保存的标注和笔记
3. 点击「导出」按钮生成 Markdown 文件

---

## ⌨️ 快捷键

| 快捷键 | 功能 |
|--------|------|
| `Ctrl + Shift + H` | 高亮选中文本 |
| `Ctrl + Shift + N` | 添加笔记 |

---

## 🛠️ 技术栈

- **Chrome Extension Manifest V3** - 扩展配置与权限管理
- **JavaScript (ES6+)** - 核心功能实现
- **chrome.storage API** - 本地数据存储
- **HTML/CSS** - 用户界面

---

## 📁 项目结构

```
WebNotes/
├── manifest.json     # 扩展配置文件
├── background.js     # 后台服务脚本（数据存储/右键菜单）
├── content.js        # 内容脚本（高亮/笔记弹窗）
├── content.css       # 内容样式
├── popup.html        # 弹出页面 HTML
├── popup.js          # 弹出页面逻辑
├── icons/            # 扩展图标
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md         # 项目文档
```

---

## 🤝 贡献指南

欢迎贡献代码！请按以下步骤操作：

1. Fork 本仓库
2. 创建特性分支：`git checkout -b feature/your-feature`
3. 提交更改：`git commit -m 'Add some feature'`
4. 推送到分支：`git push origin feature/your-feature`
5. 提交 Pull Request

### 提交规范
- 保持代码风格一致
- 编写简洁准确的提交信息
- 确保功能充分测试

---

## 📄 许可证

本项目采用 [MIT 许可证](LICENSE)。

---

<p align="center">
  如有问题或建议，欢迎通过 <a href="https://github.com/github2001/webnotes/issues">Issues</a> 反馈！
</p>
