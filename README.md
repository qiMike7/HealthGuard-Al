# 个人健康管理与疾病预警系统

一个基于 Spring Boot 的个人与家庭健康管理系统，围绕“健康档案管理、健康记录沉淀、风险评估预警、趋势追踪分析、AI 辅助咨询”五个核心方向构建，适合课程设计、毕业设计原型、健康管理类系统演示，以及 AI + 医疗健康方向的功能扩展示例。

## 1. 项目目的与意义

### 1.1 项目目的

本项目希望解决“健康数据分散、难持续记录、难形成趋势判断、缺少直观预警反馈”的问题，给个人和家庭成员提供一个可持续记录、可回顾、可分析的轻量级健康管理平台。

### 1.2 项目意义

- 对用户侧：帮助个人或家庭建立持续记录健康指标的习惯，及时识别风险变化。
- 对产品侧：将档案、记录、预警、趋势、AI 咨询串联为完整闭环，体现健康管理系统的产品思路。
- 对教学侧：适合作为 Spring Boot 全栈课程设计或毕业设计的展示项目，结构清晰，便于讲解。
- 对扩展侧：后续可以继续接入登录鉴权、消息通知、云数据库、图表组件、第三方设备数据接入等能力。

## 2. 核心功能

### 2.1 健康总览

- 展示成员总数、记录总数、待处理预警数、高风险记录数。
- 统计风险等级分布。
- 展示最近健康记录与最近预警，方便首页快速进入详情。

### 2.2 成员档案管理

- 支持本人、父母、配偶、子女等家庭成员分别建档。
- 支持维护性别、年龄、出生日期、血型、职业、联系方式、慢病史、过敏史、用药史、手术史、运动习惯、健康目标等信息。
- 支持新增、编辑、删除成员档案。

### 2.3 健康记录管理

- 支持录入体重、腰围、血压、空腹血糖、餐后血糖、体温、血氧、胆固醇、睡眠、运动、步数、饮水、情绪、压力、症状、用药记录等指标。
- 支持按成员和风险等级筛选。
- 列表分页展示，每页最多 10 条数据。

### 2.4 风险评估与预警

- 系统会在健康记录保存后，结合 BMI、血压、血糖、血氧、血脂、睡眠、活动量、压力、情绪等指标计算风险分数与风险等级。
- 自动生成预警信息，包括预警标题、指标说明、建议、严重级别、处理状态。
- 支持预警状态维护与删除。
- 预警列表分页展示，每页最多 10 条数据。

### 2.5 成员详情页

- 支持点击成员姓名进入档案详情。
- 展示成员基础信息、最新健康快照、近期趋势、个性化建议、最近预警、近期记录。
- 近期记录和趋势分析帮助用户从单次指标转向连续变化判断。

### 2.6 AI 健康咨询

- 在成员详情页中手动点击“生成 AI 分析”后，基于该成员档案、最新记录、趋势与建议构建上下文，调用 DeepSeek 生成中文分析结果。
- AI 结果用于健康管理辅助参考，不替代医生诊断。
- 系统启动后 AI 功能默认处于可用状态，只要本地已配置有效 API Key；但不会自动分析，仍然需要用户手动触发。

### 2.7 列表分页优化

- 成员列表分页展示，每页最多 10 条。
- 健康记录列表分页展示，每页最多 10 条。
- 预警列表分页展示，每页最多 10 条。
- 避免长表格撑满页面，提升课程演示和实际操作的可读性。

### 2.8 智能分诊与辅助挂号

在健康档案、记录沉淀与风险预警的基础上，新增“智能分诊 + 挂号辅助决策”闭环：

- 体检报告入档并产生异常预警后，可对指定健康记录发起一键智能分诊。
- 采用**规则引擎 + DeepSeek 双通道**交叉验证：确定性规则引擎（复用风险评估阈值）作为防 AI 幻觉的兜底，DeepSeek 以结构化 JSON 输出科室推荐、检查建议与就诊须知；AI 关闭或调用失败时自动降级为 `RULE_ONLY`，不阻断流程。
- 融合编排会标注每个推荐科室的依据来源（规则 / AI / 规则+AI 一致）与置信度；规则命中急诊（如血压 ≥180/120、血氧 <90）时无条件置顶紧急提醒。
- 推荐科室后展示 Mock 号源（医院 → 医生 → 日期 / 上午下午），支持预约（号源扣减）、取消（号源回补）、完成就诊与推荐准确性评价。
- 提供推荐准确率、平均评分与科室 / 状态分布统计，形成反馈闭环。
- 科室知识库、医院、医生、号源均为首次启动幂等种子数据（`triage.seed.enabled`），不构成真实号源承诺。
- 分诊与挂号建议仅供参考，不构成医疗诊断；用户上下文发送前做脱敏处理（不含姓名等身份信息）。

## 3. 功能分层设计

项目采用比较标准的 Spring Boot 分层结构，便于维护与讲解。

### 3.1 表现层

对应目录：

- `src/main/resources/static/`
- `src/main/resources/static/index.html`
- `src/main/resources/static/app.js`
- `src/main/resources/static/styles.css`

职责：

- 展示首页仪表盘、成员档案、健康记录、预警中心、成员详情、AI 分析面板。
- 通过 `fetch` 调用后端 REST API。
- 负责筛选、分页、弹窗、表单交互、提示消息等前端逻辑。

### 3.2 接口层

对应目录：

- `src/main/java/com/example/selfhealthcare/controller/`

核心控制器：

- `DashboardController`：提供首页汇总数据。
- `UserProfileController`：提供成员档案管理与成员详情、AI 咨询接口。
- `HealthRecordController`：提供健康记录增删改查。
- `HealthAlertController`：提供预警查询、状态更新、删除。

职责：

- 接收前端请求。
- 参数校验与路由分发。
- 返回结构化 DTO 数据给前端。

### 3.3 业务层

对应目录：

- `src/main/java/com/example/selfhealthcare/service/`

核心服务：

- `UserProfileService`：成员档案的新增、修改、查询、删除。
- `HealthRecordService`：健康记录保存、更新、删除，并联动风险评估。
- `RiskAssessmentService`：根据健康指标计算风险等级、风险分数和预警草案。
- `HealthAlertService`：预警列表查询、状态维护、删除。
- `ProfileInsightService`：聚合成员详情、近期记录、趋势卡片、个性化建议、AI 上下文。
- `DashboardService`：汇总仪表盘指标、风险分布、最近记录、最近预警。
- `DeepSeekConsultationService`：封装 DeepSeek 调用逻辑，生成 AI 咨询结果。

职责：

- 封装业务规则。
- 串联多个实体与仓储。
- 避免控制器直接处理复杂业务逻辑。

### 3.4 数据访问层

对应目录：

- `src/main/java/com/example/selfhealthcare/repository/`

核心仓储：

- `UserProfileRepository`
- `HealthRecordRepository`
- `HealthAlertRepository`

职责：

- 基于 Spring Data JPA 访问 H2 文件数据库。
- 提供成员、记录、预警的增删改查与部分派生查询能力。

### 3.5 领域模型层

对应目录：

- `src/main/java/com/example/selfhealthcare/domain/`
- `src/main/java/com/example/selfhealthcare/dto/`
- `src/main/java/com/example/selfhealthcare/exception/`

职责：

- `domain`：定义实体和枚举，如成员、健康记录、预警、风险等级等。
- `dto`：定义接口请求与响应模型，隔离实体和接口结构。
- `exception`：统一异常与错误响应。

### 3.6 初始化配置层

对应目录：

- `src/main/java/com/example/selfhealthcare/config/DataInitializer.java`

职责：

- 系统首次启动时自动写入演示数据，方便直接展示项目效果。
- 当前会初始化多位家庭成员和多条健康记录，便于展示趋势、预警和 AI 分析。

## 4. 技术路线

### 4.1 后端技术路线

- 使用 `Spring Boot 3.5.11` 作为应用基础框架。
- 使用 `Spring MVC` 提供 RESTful API。
- 使用 `Spring Data JPA` 实现面向实体的数据访问。
- 使用 `H2 文件数据库` 实现零门槛本地运行和演示。
- 使用 `RestClient` 对接 DeepSeek API，完成 AI 咨询。

### 4.2 前端技术路线

- 使用 `HTML + CSS + Vanilla JavaScript` 实现前端界面。
- 不引入大型前端框架，便于课程答辩时展示完整原理。
- 通过模块化函数组织页面状态、弹窗、分页、筛选、详情加载和 AI 交互逻辑。

### 4.3 业务技术路线

整体链路如下：

`成员建档 -> 录入健康记录 -> 系统计算风险 -> 自动生成预警 -> 聚合详情与趋势 -> 用户手动触发 AI 分析`

这条路线体现了健康管理系统从“数据采集”到“风险识别”再到“辅助决策”的完整闭环。

### 4.4 AI 集成路线

项目采用“手动触发 AI”的策略：

- 系统启动时可以默认启用 AI 能力。
- 用户点击成员详情中的“生成 AI 分析”按钮时，系统再调用 DeepSeek。
- AI 输入上下文由成员档案、最新记录、趋势、建议和补充问题共同构成。
- AI 输出结果用于健康分析辅助，不自动代替系统规则判断。

这样可以兼顾体验、可控性和演示效果。

## 5. 关键业务流程

### 5.1 成员档案流程

1. 前端填写成员档案表单。
2. `UserProfileController` 接收请求。
3. `UserProfileService` 完成实体保存。
4. 返回成员响应 DTO 给前端列表和详情页。

### 5.2 健康记录与预警流程

1. 前端录入健康记录。
2. `HealthRecordService` 保存记录。
3. `RiskAssessmentService` 根据指标计算风险分数与等级。
4. 根据评估结果自动生成 `HealthAlert`。
5. 前端可在预警中心查看并处理。

### 5.3 成员详情分析流程

1. 用户点击成员姓名。
2. 前端请求 `/api/profiles/{id}/detail`。
3. `ProfileInsightService` 聚合成员基础信息、最近记录、最近预警、趋势卡片、个性化建议。
4. 返回结构化详情数据，供详情页展示。

### 5.4 AI 咨询流程

1. 用户在成员详情页填写可选问题并点击“生成 AI 分析”。
2. 前端调用 `/api/profiles/{id}/ai-consultation`。
3. `DeepSeekConsultationService` 调用 `ProfileInsightService` 组装上下文。
4. 系统向 DeepSeek 发送请求并返回中文分析结果。
5. 前端展示分析时间和回答内容。

## 6. 项目目录结构

```text
Springboot_SelfHealthCare
├─ src
│  ├─ main
│  │  ├─ java/com/example/selfhealthcare
│  │  │  ├─ config
│  │  │  ├─ controller
│  │  │  ├─ domain
│  │  │  ├─ dto
│  │  │  ├─ exception
│  │  │  ├─ repository
│  │  │  └─ service
│  │  └─ resources
│  │     ├─ static
│  │     └─ application.properties
│  └─ test
├─ config
│  └─ application.properties   # 本地可选配置，默认已加入 .gitignore
├─ data                        # H2 文件数据库目录
├─ start-app.bat
├─ pom.xml
└─ README.md
```

## 7. 运行方式

### 7.1 方式一：一键启动

双击项目根目录下的 [start-app.bat](./start-app.bat)。

该脚本会：

- 检查 Java 环境
- 启动 Spring Boot 服务
- 等待服务就绪后自动打开浏览器

### 7.2 方式二：命令行启动

在项目根目录执行：

```powershell
.\mvnw.cmd spring-boot:run
```

或先打包后运行：

```powershell
.\mvnw.cmd package -DskipTests
java -jar target\self-health-care-0.0.1-SNAPSHOT.jar
```

启动后访问：

- 系统首页：`http://localhost:8081`
- H2 控制台：`http://localhost:8081/h2-console`

## 8. AI 配置说明

### 8.1 推荐方式：本地配置文件

为了让服务启动后默认具备 AI 能力，推荐在项目根目录新建本地配置文件：

`config/application.properties`

示例：

```properties
deepseek.enabled=true
deepseek.api-key=你的DeepSeekKey
```

说明：

- 该文件已加入 `.gitignore`，不会上传到 GitHub。
- 本地存在该文件时，服务启动后即可直接使用 AI 分析功能。
- AI 不会自动分析，仍然需要用户手动点击“生成 AI 分析”。

### 8.2 备用方式：环境变量

```powershell
$env:DEEPSEEK_ENABLED="true"
$env:DEEPSEEK_API_KEY="你的DeepSeekKey"
.\mvnw.cmd spring-boot:run
```

### 8.3 安全说明

- 公开仓库中不保存真实 API Key。
- AI 咨询仅用于辅助分析，不替代医生诊断。
- 建议在演示环境和生产环境分开管理 AI Key。

## 9. H2 数据库说明

- JDBC URL：`jdbc:h2:file:./data/self-health-care`
- User Name：`sa`
- Password：留空

说明：

- 使用文件数据库是为了方便本地演示和课程展示。
- `data/` 目录默认不建议提交到 GitHub。
- 首次启动时系统会自动写入演示数据。

## 10. 主要接口

### 10.1 仪表盘

- `GET /api/dashboard`：仪表盘汇总数据

### 10.2 成员档案

- `GET /api/profiles`：成员档案列表
- `GET /api/profiles/{id}`：成员基础信息
- `GET /api/profiles/{id}/detail`：成员详情
- `POST /api/profiles`：新增成员档案
- `PUT /api/profiles/{id}`：修改成员档案
- `DELETE /api/profiles/{id}`：删除成员档案

### 10.3 健康记录

- `GET /api/records`：健康记录列表
- `POST /api/records`：新增健康记录
- `PUT /api/records/{id}`：修改健康记录
- `DELETE /api/records/{id}`：删除健康记录

### 10.4 预警管理

- `GET /api/alerts`：预警列表
- `PUT /api/alerts/{id}/status`：更新预警状态
- `DELETE /api/alerts/{id}`：删除预警

### 10.5 AI 咨询

- `POST /api/profiles/{id}/ai-consultation`：成员 AI 健康咨询

### 10.6 智能分诊

- `POST /api/triage/recommend`：对指定健康记录发起智能分诊（body 可省 `recordId`，默认取最新一条），返回双通道融合推荐与可预约号源
- `GET /api/triage/departments`：科室知识库列表（含就诊须知）

### 10.7 辅助挂号

- `POST /api/registration/orders`：基于推荐单确认医生 / 号源（号源扣减）
- `GET /api/registration/orders`：分页查询我的挂号单（可按 `status` 过滤）
- `GET /api/registration/orders/{id}`：挂号单详情
- `PATCH /api/registration/orders/{id}/cancel`：取消预约（号源回补）
- `PATCH /api/registration/orders/{id}/complete`：标记完成就诊
- `POST /api/registration/orders/{id}/feedback`：提交推荐准确性评价（1-5 星）
- `GET /api/registration/stats`：推荐准确率 / 平均评分 / 科室与状态分布统计

## 11. 测试与验证

项目已验证：

```powershell
.\mvnw.cmd test
```

结果为 `BUILD SUCCESS`。

前端脚本也可检查：

```powershell
node --check src\main\resources\static\app.js
```

## 12. 当前版本说明

- 版本号：`v1.0.1`
- 版本主题：分页优化 + 默认本地 AI 启用 + README 文档重构

详细版本说明见 [RELEASE_NOTES.md](./RELEASE_NOTES.md)。
