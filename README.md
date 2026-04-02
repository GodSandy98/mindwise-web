# MindWise Web

MindWise 学生心理测评系统的前端管理平台，基于 React + TypeScript 构建。

## 功能概览

- **用户认证**：手机号登录，支持教师注册
- **权限管理**：超级管理员 / 管理员教师 / 班主任三级权限
- **学生管理**：查看学生列表、详情及各指标得分
- **答卷提交**：逐题作答，支持进度保存
- **得分分析**：班级雷达图、学生横向条形图、H/M/L 等级标注
- **报告生成**：基于 LLM 生成个性化心理分析报告

## 技术栈

| 层面 | 选型 |
|------|------|
| 框架 | React 18 + TypeScript |
| 构建 | Vite |
| 样式 | Tailwind CSS |
| 路由 | React Router v7 |
| 请求 | TanStack Query + axios |

## 快速开始

### 环境要求

- Node.js 18+
- 已启动 [mindwise-api](https://github.com/GodSandy98/mindwise-api) 后端服务

### 安装与启动

```bash
# 安装依赖
npm install

# 配置后端地址
echo "VITE_API_BASE_URL=http://localhost:8000" > .env.local

# 启动开发服务器
npm run dev
```

浏览器访问 `http://localhost:5173`。

### 构建生产包

```bash
npm run build
```

## 项目结构

```
src/
├── api/          # axios 封装 + 各模块请求函数
│   ├── client.ts
│   ├── auth.ts
│   ├── students.ts
│   ├── exams.ts
│   ├── answers.ts
│   ├── scores.ts
│   ├── reports.ts
│   ├── indicators.ts
│   ├── classes.ts
│   └── teachers.ts
├── components/   # 通用组件（Navbar、ScoreBar、LevelBadge 等）
├── pages/        # 各页面组件
│   ├── LoginPage.tsx       # 登录
│   ├── RegisterPage.tsx    # 教师注册
│   ├── StudentsPage.tsx    # 学生列表
│   ├── StudentDetailPage.tsx  # 学生得分详情
│   ├── ExamsPage.tsx       # 考试列表
│   ├── ExamScoresPage.tsx  # 班级得分总览
│   ├── SubmitAnswersPage.tsx  # 答卷提交
│   ├── ReportPage.tsx      # LLM 报告
│   └── AdminPage.tsx       # 管理员控制台
└── main.tsx
```

## 权限说明

| 角色 | 权限 |
|------|------|
| `super_admin` | 所有功能 + 管理教师账号 |
| `admin_teacher` | 查看所有学生数据 + 生成报告 |
| `class_teacher` | 仅查看本班学生数据（需分配班级） |

超级管理员账号由后端 `mindwise-api/tools/seed_super_admin.py` 脚本创建。

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `VITE_API_BASE_URL` | 后端 API 地址 | `http://localhost:8000` |
