# HealthGuard AI · 个人健康管理与 AI 疾病预警系统

一个基于 Spring Boot 的个人与家庭健康管理系统，围绕"**档案管理、健康记录沉淀、风险评估预警、趋势可视化、AI 辅助咨询、智能分诊与辅助挂号**"六大方向构建，适合课程设计、毕业设计原型、健康管理类系统演示，以及 AI + 医疗健康方向的功能扩展示例。

## 1. 项目目的与意义

### 1.1 项目目的
解决"健康数据分散、难持续记录、难形成趋势判断、缺少直观预警反馈、就诊时不知道挂哪个科"的问题，为个人与家庭提供一个可持续记录、可回顾、可分析、可行动的轻量级健康管理平台。

### 1.2 项目意义
- **用户侧**：帮助建立持续记录健康指标的习惯，及时识别风险变化，并把"要不要去医院、挂哪个科"变成一键可操作。
- **产品侧**：档案 → 记录 → 预警 → 趋势 → AI 咨询 → 分诊 → 挂号，形成完整闭环。
- **教学侧**：标准 Spring Boot 分层结构，规则引擎 + 大模型双通道融合，便于讲解工程化 AI 集成方式。
- **扩展侧**：可继续接入消息通知、第三方设备数据、真实医院号源、Spring AI / 多模型路由。

## 2. 核心功能

### 2.1 用户与登录
- 注册、登录、退出；密码使用 `spring-security-crypto`（BCrypt）加密存储。
- 会话由后端维护，前端通过 `GET /api/auth/me` 恢复登录态。

### 2.2 健康总览
- 展示成员数、记录数、待处理预警数、高风险记录数、风险等级分布。
- 展示最近健康记录与最近预警，便于首页快速进入详情。

### 2.3 个人 / 家庭成员档案管理
- 支持本人、父母、配偶、子女等家庭成员分别建档。
- 字段包含：性别、出生日期、血型、身高体重、职业、联系方式、慢病史、过敏史、用药史、手术史、吸烟 / 饮酒状况、运动习惯、健康目标等。
- 支持新增、编辑、删除。

### 2.4 健康记录管理
- 覆盖常规化验与生理指标：血压、心率、BMI、腰围、空腹血糖、餐后血糖、糖化血红蛋白、总胆固醇、LDL、HDL、甘油三酯、尿酸、肌酐、尿素氮、ALT/AST、血氧、体温、睡眠、运动、步数、饮水、情绪、压力、症状、用药记录等。
- 支持按风险等级筛选，列表分页展示（默认每页 10 条）。

### 2.5 风险评估与预警
- 保存健康记录后自动结合 BMI、血压、血糖、血脂、血氧、肝肾功能、尿酸、睡眠、活动量、压力、情绪等指标计算风险分数与等级。
- 自动生成预警：标题、指标说明、建议、严重级别（LOW/MEDIUM/HIGH/CRITICAL）、处理状态。
- 支持预警状态维护、删除、按状态 / 严重级别筛选。

### 2.6 趋势与数据可视化
- 成员详情页聚合展示近期趋势卡片与个性化建议。
- `GET /api/visualization` 提供面向图表的时序数据序列，供前端绘制折线 / 面积图。

### 2.7 体检文档导入
- 支持上传 `.docx` 与 `.pdf` 体检报告，由 Apache POI / PDFBox 解析关键指标后自动生成健康记录。
- 接口：`POST /api/imports/health-document`（`multipart/form-data`），单文件 ≤ 10 MB。

### 2.8 AI 健康咨询（DeepSeek）
- 手动触发式分析：`POST /api/ai/analysis` 基于当前用户档案、最新记录、趋势、建议组装上下文，输出中文分析报告。
- 医生式多轮对话：`POST /api/ai/chat` 支持携带上下文的连续问答。
- 通过 `RestClient` 直连 DeepSeek OpenAI 兼容接口，**未引入 Spring AI 框架**。
- 通过 `deepseek.enabled` 开关与 `DEEPSEEK_API_KEY` 环境变量控制；未配置 Key 时接口会返回可读错误。
- AI 仅用于辅助参考，不替代医生诊断；用户上下文发送前做脱敏处理。

### 2.9 智能分诊与辅助挂号（重点）
在原健康管理基础上，形成"体检异常 → 分诊 → 号源 → 挂号 → 反馈"的闭环：

- **双通道融合**：
  - **规则引擎（`TriageRuleService`）**：确定性主干，复用 `RiskAssessmentService` 阈值与医学逻辑做分诊；命中急诊（如血压 ≥ 180/120、血氧 < 90）**无条件置顶**。
  - **AI 通道（`DeepSeekTriageService`）**：以结构化 JSON 输出科室推荐、检查建议、就诊须知。
  - **融合编排（`TriageRecommendationService`）**：AI 不可用时自动降级 `RULE_ONLY`；规则与 AI 冲突时**以规则为安全首选**，AI 结果并列展示；每条推荐标注来源（RULE / AI / RULE+AI）与置信度。
- **号源与挂号**：Mock 号源三级结构（医院 → 医生 → 日期 + 上午/下午），状态机 `RECOMMENDED → REGISTERED → COMPLETED / CANCELLED`，号源扣减与回补严格对应。
- **反馈闭环**：完成就诊后可提交 1-5 星评价，`GET /api/registration/stats` 汇总准确率 / 平均分 / 科室与状态分布。
- **种子数据幂等**：`DataInitializer` 首次启动自动写入 16 科室 + 2 医院 + 医生 + 未来 7 天号源，开关 `triage.seed.enabled=true`，表非空即跳过。
- 所有推荐仅供参考，不构成医疗诊断。

## 3. 功能分层设计

项目采用标准 Spring Boot 分层结构，包路径 `com.example.selfhealthcare`。

### 3.1 表现层
目录：`src/main/resources/static/`
- `index.html` · `app.js` · `styles.css` · `i18n.js`

职责：
- 展示登录、首页仪表盘、档案、记录、预警、可视化、AI 面板、分诊挂号。
- 通过 `fetch` 调用 REST API；负责筛选、分页、弹窗、表单校验、状态保持。
- 纯 Vanilla JS，不依赖前端框架，便于答辩演示完整原理；枚举标签与文案集中在 `i18n.js`。

### 3.2 接口层（Controller，9 个）
目录：`src/main/java/com/example/selfhealthcare/controller/`

| 控制器 | 路由 | 职责 |
|---|---|---|
| `AuthController` | `/api/auth` | 注册 / 登录 / 会话 / 退出 |
| `DashboardController` | `/api/dashboard` | 首页仪表盘汇总 |
| `UserProfileController` | `/api/profile` | 当前登录用户档案读写与详情聚合 |
| `HealthRecordController` | `/api/records` | 健康记录 CRUD + 分页筛选 |
| `HealthAlertController` | `/api/alerts` | 预警列表 / 详情 / 状态更新 / 删除 |
| `AiAnalysisController` | `/api/ai` | AI 分析 + AI 医生对话 |
| `DocumentImportController` | `/api/imports` | 体检报告 docx/pdf 导入 |
| `VisualizationController` | `/api/visualization` | 趋势可视化数据 |
| `TriageController` | `/api/triage` · `/api/registration` | 智能分诊 + 辅助挂号全流程 |

### 3.3 业务层（Service，14 个）
目录：`src/main/java/com/example/selfhealthcare/service/`

| 服务 | 职责 |
|---|---|
| `AuthService` | 注册、登录、密码加密、会话维护 |
| `UserProfileService` | 档案读写与派生字段 |
| `HealthRecordService` | 记录 CRUD 并联动风险评估 |
| `RiskAssessmentService` | 阈值判定、风险分数、预警草案 |
| `HealthAlertService` | 预警查询、状态维护、删除 |
| `ProfileInsightService` | 聚合成员详情、趋势、建议、AI 上下文 |
| `DashboardService` | 仪表盘指标与分布统计 |
| `VisualizationService` | 时序数据序列输出 |
| `DocumentImportService` | POI/PDFBox 解析并落库 |
| `DeepSeekConsultationService` | 封装 AI 分析 / 多轮对话调用链 |
| `TriageRuleService` | 规则引擎分诊（确定性主干） |
| `DeepSeekTriageService` | AI 分诊（结构化 JSON） |
| `TriageRecommendationService` | 双通道融合编排 + 号源查询 |
| `RegistrationService` | 挂号状态机、号源扣减/回补、反馈统计 |

### 3.4 数据访问层（Repository，9 个）
目录：`src/main/java/com/example/selfhealthcare/repository/`

`AppUserRepository` · `UserProfileRepository` · `HealthRecordRepository` · `HealthAlertRepository` · `DepartmentRepository` · `DoctorRepository` · `HospitalRepository` · `RegistrationSlotRepository` · `RegistrationOrderRepository`

职责：基于 Spring Data JPA 访问 **MySQL**，提供派生查询、分页与统计。

### 3.5 领域模型层（Domain / DTO / Exception）
- `domain/`：实体 + 枚举。
  - 实体：`AppUser`、`UserProfile`、`HealthRecord`、`HealthAlert`、`Department`、`Doctor`、`Hospital`、`RegistrationSlot`、`RegistrationOrder`、`BaseEntity`
  - 枚举：`RiskLevel`、`AlertSeverity`、`AlertStatus`、`Gender`、`BloodType`、`SmokingStatus`、`AlcoholUseStatus`、`UrgencyLevel`、`HospitalLevel`、`DoctorTitle`、`SlotPeriod`、`RegistrationStatus`、`TriageSource`
- `dto/`：请求与响应模型（30+），隔离实体与接口结构，返回统一 `PagedResponse`。
- `exception/`：`GlobalExceptionHandler` 统一处理 `NotFoundException`、`BadRequestException`、`UnauthorizedException`、`AiIntegrationException`、`ImportProcessingException`。

### 3.6 初始化配置层
`config/DataInitializer.java`（`CommandLineRunner`）：
- 首次启动写入演示用户 / 家庭档案 / 健康记录 / 预警；
- 幂等填充科室 / 医院 / 医生 / 未来 7 天号源（`triage.seed.enabled=true`，表非空即跳过）。

## 4. 技术路线

### 4.1 后端技术栈
- **Spring Boot 3.5.11**（Java 21）
- **Spring MVC** 提供 RESTful API
- **Spring Data JPA + Hibernate**（`ddl-auto=update`，`open-in-view=false`）
- **MySQL 8.x**：主库 `self_health_care`，测试库 `self_health_care_test`
- **spring-security-crypto**：BCrypt 密码加密
- **Apache POI 5.2.5**：解析 `.docx` 体检报告
- **Apache PDFBox 3.0.5**：解析 `.pdf` 体检报告
- **Spring RestClient**：直连 DeepSeek OpenAI 兼容接口（未引入 Spring AI）

### 4.2 前端技术栈
- HTML + CSS + Vanilla JavaScript，模块化函数组织页面状态、弹窗、分页、筛选、详情加载和 AI 交互。

### 4.3 业务链路
`用户注册登录 → 建档 → 录入 / 导入健康记录 → 计算风险 → 生成预警 → 趋势可视化 → AI 分析 / 对话 → 智能分诊 → 挂号 → 反馈闭环`

### 4.4 AI 集成路线
- 通过 `RestClient` 直接调用 DeepSeek；不引入额外 AI 框架，方便替换模型。
- 上下文由档案 + 最新记录 + 趋势 + 建议共同构成；分诊通道使用结构化 JSON 提示词。
- AI 仅辅助决策，不覆盖规则引擎的急诊置顶、风险等级等硬约束。

## 5. 关键业务流程

### 5.1 登录与用户
1. 前端调用 `POST /api/auth/register` 或 `POST /api/auth/login`；
2. `AuthService` 校验唯一性、BCrypt 比对密码；
3. 建立会话并返回 `AuthSessionResponse`；
4. 后续接口依赖会话识别当前用户。

### 5.2 健康记录与预警
1. 前端录入健康记录 → `HealthRecordService` 保存；
2. `RiskAssessmentService` 计算风险分数与等级；
3. 达到阈值时自动生成 `HealthAlert`；
4. 前端在预警中心查看与处置。

### 5.3 体检文档导入
1. 前端拖拽 / 选择 `.docx` `.pdf` → `POST /api/imports/health-document`；
2. `DocumentImportService` 调用 POI / PDFBox 抽取指标；
3. 生成一条或多条 `HealthRecord` 并联动风险评估。

### 5.4 智能分诊与挂号
1. 用户在预警或记录上点击"一键分诊" → `POST /api/triage/recommend`；
2. `TriageRecommendationService` 并行调用规则引擎与 DeepSeek，按融合策略输出推荐；
3. 前端展示首选科室 + 紧急程度 + 备选 + Mock 号源；
4. `POST /api/registration/orders` 确认挂号 → `RegistrationService` 扣减号源、状态推进；
5. 就诊后 `PATCH /api/registration/orders/{id}/complete` 或 `.../cancel`；
6. `POST /api/registration/orders/{id}/feedback` 提交评分，统计反馈闭环。

## 6. 项目目录结构

```text
HealthGuard-Al
├─ src
│  ├─ main
│  │  ├─ java/com/example/selfhealthcare
│  │  │  ├─ config       # DataInitializer
│  │  │  ├─ controller   # 9 个 REST 控制器
│  │  │  ├─ domain       # 实体 + 枚举
│  │  │  ├─ dto          # 请求 / 响应模型
│  │  │  ├─ exception    # 全局异常处理
│  │  │  ├─ repository   # 9 个 JPA 仓储
│  │  │  ├─ service      # 14 个业务服务
│  │  │  └─ util
│  │  └─ resources
│  │     ├─ static       # index.html / app.js / styles.css / i18n.js
│  │     └─ application.properties
│  └─ test
│     ├─ java/com/example/selfhealthcare
│     └─ resources/application.properties   # 测试库 MySQL self_health_care_test
├─ pom.xml
└─ README.md
```

## 7. 运行方式

### 7.1 前置准备
1. **JDK 21**（`java -version` 检查）；
2. **Maven 3.9+**（项目根目录未内置 `mvnw.cmd`，需本机 Maven 或 IntelliJ 自带 Maven）；
3. **MySQL 8.x** 运行中，并预建数据库与账号：

```sql
CREATE DATABASE IF NOT EXISTS self_health_care
  DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS self_health_care_test
  DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'SpringAI'@'localhost' IDENTIFIED BY '12345';
GRANT ALL PRIVILEGES ON self_health_care.*      TO 'SpringAI'@'localhost';
GRANT ALL PRIVILEGES ON self_health_care_test.* TO 'SpringAI'@'localhost';
FLUSH PRIVILEGES;
```

> 表结构无需手工建：`ddl-auto=update` 会自动创建，`DataInitializer` 会灌入演示数据与号源。

### 7.2 命令行启动
```powershell
mvn spring-boot:run
```

或先打包后运行：
```powershell
mvn package -DskipTests
java -jar target\self-health-care-0.0.1-SNAPSHOT.jar
```

### 7.3 启动后访问
- 系统首页：`http://localhost:8081`
- 数据查看：使用 MySQL Workbench / Navicat / 命令行（**本项目不再提供 H2 Console**）

## 8. AI 配置说明

### 8.1 环境变量（推荐）
`application.properties` 已默认：
```properties
deepseek.enabled=true
deepseek.base-url=https://api.deepseek.com
deepseek.model=deepseek-chat
deepseek.api-key=${DEEPSEEK_API_KEY:}
```

PowerShell 注入 Key：
```powershell
$env:DEEPSEEK_API_KEY="sk-xxxxxxxxxxxx"
mvn spring-boot:run
```

### 8.2 无 Key 时的降级
- AI 分析 / 对话接口返回可读错误；
- 智能分诊自动降级为纯规则模式（`RULE_ONLY`），不影响启动与使用。

### 8.3 安全说明
- 公开仓库不保存真实 API Key，务必通过环境变量注入。
- 推送代码前检查 `application.properties` / `.env` 是否含密钥。
- AI 咨询仅用于辅助分析，不替代医生诊断。

## 9. 数据库说明（MySQL）

| 环境 | JDBC URL | 用户名 | 密码 | ddl-auto |
|---|---|---|---|---|
| 主运行 | `jdbc:mysql://localhost:3306/self_health_care?...` | `SpringAI` | `12345` | `update` |
| 测试 | `jdbc:mysql://localhost:3306/self_health_care_test?...` | `SpringAI` | `12345` | `create-drop` |

公共参数：`useUnicode=true&characterEncoding=utf-8&serverTimezone=Asia/Shanghai&useSSL=false&allowPublicKeyRetrieval=true`

其他配置：
- `spring.jpa.open-in-view=false`（禁用视图绑定，强制 Service 层管理事务）
- `spring.jackson.time-zone=Asia/Shanghai`
- `spring.servlet.multipart.max-file-size=10MB`（体检文档导入上限）

## 10. 主要接口

### 10.1 认证
- `POST /api/auth/register` · `POST /api/auth/login` · `POST /api/auth/logout` · `GET /api/auth/me`

### 10.2 仪表盘
- `GET /api/dashboard`：仪表盘汇总数据

### 10.3 档案
- `GET /api/profile`：当前登录用户档案
- `GET /api/profile/detail`：详情聚合（基础信息 + 趋势 + 建议 + 预警）
- `PUT /api/profile`：新增 / 修改当前档案

### 10.4 健康记录
- `GET /api/records`（分页，可按 `riskLevel` 过滤）· `GET /api/records/{id}`
- `POST /api/records` · `PUT /api/records/{id}` · `DELETE /api/records/{id}`

### 10.5 预警
- `GET /api/alerts`（分页，可按 `status` / `severity` 过滤）· `GET /api/alerts/{id}`
- `PUT /api/alerts/{id}/status` · `DELETE /api/alerts/{id}`

### 10.6 可视化与文档导入
- `GET /api/visualization`：趋势图表数据
- `POST /api/imports/health-document`：`.docx` / `.pdf` 体检报告导入

### 10.7 AI
- `POST /api/ai/analysis`：AI 健康分析
- `POST /api/ai/chat`：AI 医生多轮对话

### 10.8 智能分诊
- `POST /api/triage/recommend`：一键智能分诊（body 可省 `recordId`，默认取最新一条）
- `GET /api/triage/departments`：科室知识库列表（含就诊须知）

### 10.9 辅助挂号
- `POST /api/registration/orders`：基于推荐单确认医生 / 号源（号源扣减）
- `GET /api/registration/orders`（分页，可按 `status` 过滤）· `GET /api/registration/orders/{id}`
- `PATCH /api/registration/orders/{id}/cancel`：取消预约（号源回补）
- `PATCH /api/registration/orders/{id}/complete`：标记完成就诊
- `POST /api/registration/orders/{id}/feedback`：提交推荐准确性评价（1-5 星）
- `GET /api/registration/stats`：推荐准确率 / 平均评分 / 科室与状态分布统计

## 11. 测试与验证

```powershell
mvn test
```

结果为 `BUILD SUCCESS`。测试使用 MySQL `self_health_care_test`（`create-drop`），默认关闭 DeepSeek。

前端脚本可检查：
```powershell
node --check src\main\resources\static\app.js
```

## 12. 当前版本说明

- 版本号：`v1.1.0`
- 版本主题：**数据库迁移至 MySQL** + **智能分诊与辅助挂号** + **体检文档导入** + **可视化 / AI 多轮对话** + **用户登录体系**

> 注意：README 与部署清单曾长期标注"H2 内嵌数据库"，与当前代码不符——`pom.xml` 已完全移除 H2 依赖，两份环境配置均指向 MySQL。本文档已同步修正。
