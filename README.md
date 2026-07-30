# 牛慧慧专属一体化工作台

一款为「牛慧慧」量身定制的个人一体化工作台，覆盖每日计划、运动健身、记账本、英语学习、读书笔记、每日感悟、内容复盘、求职面试、经期记录、资讯推送等全模块。支持手机端与电脑端自适应，离线可用，云端双向同步。

## 功能概览

| 模块 | 核心能力 |
|------|---------|
| 今日总览 | 汇总全模块当日数据与待处理事项 |
| 每日计划 | 工作/生活双分区，待办/进行中/已完成三态 |
| 运动健身 | 运动计划 + 身体数据记录 |
| 记账本 | 存钱计划四宫格、月度统计、7天支出趋势图 |
| 英语学习 | 每日口语/听力，自动抓取+手动录入 |
| 读书笔记 | 文字+图片双录入、分类归档、导出 |
| 每日感悟 | 文字/图片/视频三种形式 |
| 内容复盘 | 工作/英语/生活三大复盘板块 |
| 找工作 | 求职筛选 + 面试准备（自动抓取+手动录入） |
| 经期记录 | 日历可视化、周期预测、统计 |
| 资讯推送 | 小宇宙播客、生动早咖啡、每日财经新闻 |

## 技术栈

- 纯静态 HTML + CSS + JavaScript，无后端依赖
- IndexedDB 本地存储，离线可用
- GitHub API 云端双向同步（零成本）
- GitHub Pages 免费托管
- GitHub Actions 定时 RSS 抓取

## 部署步骤

### 1. 创建 GitHub 仓库

1. 登录 GitHub，点击右上角 `+` → `New repository`
2. 仓库名称建议：`niuhuihui-workstation`
3. 选择 `Public`（公开仓库免费使用 GitHub Pages 和 Actions）
4. 点击 `Create repository`

### 2. 上传代码

将本项目所有文件上传到仓库根目录：

```bash
git clone https://github.com/你的用户名/niuhuihui-workstation.git
cd niuhuihui-workstation
# 复制本项目全部文件到该目录
git add .
git commit -m "init workstation"
git push origin main
```

### 3. 开启 GitHub Pages

1. 进入仓库 → `Settings` → `Pages`
2. Source 选择 `Deploy from a branch`
3. Branch 选择 `main`，目录选择 `/(root)`
4. 点击 `Save`
5. 稍等片刻，页面会显示永久访问链接，例如：
   `https://你的用户名.github.io/niuhuihui-workstation/`

### 4. 配置 GitHub Actions 自动抓取

1. 进入仓库 → `Settings` → `Secrets and variables` → `Actions`
2. 点击 `New repository secret`，添加以下 Secrets（可选，用于替换默认 RSS 源）：
   - `PODCAST_RSS`：小宇宙播客 RSS 地址
   - `COFFEE_RSS`：生动早咖啡 RSS 地址
   - `FINANCE_RSS_1`、`FINANCE_RSS_2`：财经新闻 RSS 地址
   - `BBC_RSS`、`VOA_RSS`：英语学习 RSS 地址
   - `JOBS_RSS_1`、`JOBS_RSS_2`：招聘岗位 RSS 地址
   - `INTERVIEW_RSS_1`、`INTERVIEW_RSS_2`：面试题库 RSS 地址
3. 进入 `Actions` 页面，启用 Workflows
4. 可手动触发任意 workflow 测试抓取

GitHub Actions 定时任务：
- `Fetch News`：每天北京时间早上 7 点
- `Fetch English Materials`：每天北京时间中午 11 点
- `Fetch Jobs and Interview Materials`：每天北京时间上午 8 点、晚上 8 点

### 5. 配置云端同步

1. 打开部署后的工作台页面
2. 点击左下角 `⚙️ 设置`
3. 填写 GitHub 同步信息：
   - **Personal Access Token**：在 GitHub `Settings` → `Developer settings` → `Personal access tokens` → `Tokens (classic)` 中生成，勾选 `repo` 权限
   - **GitHub 用户名/组织**：你的 GitHub 用户名
   - **仓库名**：`niuhuihui-workstation`
4. 点击 `保存配置` → `立即同步`

配置完成后，系统会每 5 分钟自动同步一次，网络恢复后也会自动同步。

## 使用说明

### 左侧导航

- 电脑端：左侧固定导航栏，完整展示全部模块
- 手机端：顶部菜单按钮一键展开/折叠导航栏

### 各模块操作

- **新增**：点击模块右上角的 `+` 按钮
- **编辑/删除**：每个卡片/条目右侧都有对应按钮
- **完成/归档**：计划、运动、英语学习、面试等模块支持完成标记和归档
- **搜索/筛选**：读书笔记、资讯、账单等模块支持搜索和分类筛选
- **导出**：记账本、读书笔记、经期记录、资讯等支持导出文件

### 定时提醒

所有带时间节点的事项（任务、英语复习、面试复习、经期、资讯、读书、运动）都会在到达时间时：
- 弹窗提醒
- 播放提示音
- 发送浏览器通知（需授权）

提醒时间可在对应模块或设置中配置。

### 离线使用

- 所有数据首先保存在浏览器 IndexedDB 中
- 无网络时可正常查看、编辑、新增
- 恢复网络后自动同步到云端

## 数据安全

- 本地数据：浏览器 IndexedDB
- 云端备份：GitHub 仓库 `data-sync` 分支
- 可手动导出全部数据为 JSON 备份

## 自定义 RSS 源

编辑 `.github/workflows/*.yml` 中的 Secrets，或在 `scripts/fetch-*.js` 中直接修改默认 URL。

## 文件结构

```
.
├── index.html              # 主页面
├── css/
│   └── style.css           # 全部样式
├── js/
│   ├── db.js               # IndexedDB 存储层
│   ├── utils.js            # 工具函数
│   ├── sync.js             # GitHub 云同步
│   ├── app.js              # 主应用控制器
│   └── modules/            # 各模块逻辑
├── data/                   # RSS 抓取数据（GitHub Actions 自动生成）
├── scripts/                # RSS 抓取脚本
├── .github/workflows/      # GitHub Actions 工作流
└── README.md               # 本文件
```

## 费用说明

本项目全程零费用：
- GitHub 仓库：免费
- GitHub Pages：免费
- GitHub Actions：每月 2000 分钟免费额度，本项目定时任务完全够用
- 无域名费、无服务器租赁费、无数据库费用

## 注意事项

1. GitHub Pages 默认使用 HTTPS，访问链接长期有效
2. 首次配置同步后，建议点击一次「立即同步」确认正常
3. 若更换浏览器或设备，只需配置相同的 GitHub 同步信息即可恢复数据
4. 图片上传后会转为 base64 存储，单张图片建议不超过 2MB

## 后续扩展

页面已预留拓展区域，可在 `index.html` 和 `js/app.js` 中继续新增模块。
