/* ==================== 国际化 i18n（中文 / English） ==================== */
const I18N = {
  zh: {
    brand: "康鉴AI",
    brandSub: "健康记录 · 预警",
    logout: "退出登录",
    currentUser: "当前用户：",
    langBtn: "English",
    authTitle: "康鉴AI",
    authLogin: "登录",
    authRegister: "注册",
    username: "用户名",
    password: "密码",
    loginSystem: "登录系统",
    displayName: "显示名称",
    confirmPassword: "确认密码",
    registerEnter: "注册并进入",
    nav: { dashboard: "总览", profile: "个人档案", records: "健康记录", alerts: "预警中心", imports: "文档导入", visualization: "数据图表", ai: "AI分析" },
    meta: { dashboard: "健康总览", profile: "个人档案", records: "健康记录", alerts: "预警中心", imports: "文档导入", visualization: "数据图表", ai: "AI分析" },
    enums: {
      gender: { MALE: "男", FEMALE: "女", OTHER: "其他" },
      bloodType: { A: "A型", B: "B型", AB: "AB型", O: "O型", UNKNOWN: "未知" },
      smokingStatus: { NEVER: "从不吸烟", FORMER: "已戒烟", OCCASIONAL: "偶尔吸烟", CURRENT: "经常吸烟" },
      alcoholUseStatus: { NEVER: "不饮酒", OCCASIONAL: "偶尔饮酒", WEEKLY: "每周饮酒", FREQUENT: "频繁饮酒" },
      riskLevel: { LOW: "低风险", MEDIUM: "中风险", HIGH: "高风险", CRITICAL: "极高风险" },
      alertStatus: { PENDING: "待处理", REVIEWED: "已查看", RESOLVED: "已解决" },
      alertSeverity: { LOW: "轻度", MEDIUM: "中度", HIGH: "重度", CRITICAL: "危急" }
    },
    dashLoading: "正在加载总览数据。",
    dashProfile: "档案完整度",
    dashRecords: "健康记录",
    dashPendingAlerts: "待处理预警",
    dashLatestRisk: "最近风险等级",
    dashNone: "暂无",
    dashProfileMissing: "请先完善个人档案。",
    dashRiskDist: "风险分布",
    dashRefresh: "刷新",
    dashCountSuffix: "条",
    dashRecentRecords: "近期记录",
    dashRecentAlerts: "近期预警",
    profileTitle: "个人档案维护",
    profileCompleteness: "完整度 {score}%",
    profileSave: "保存档案",
    profileInsights: "档案洞察",
    profileLatestDate: "最近记录日期",
    profileCurrentRisk: "当前风险等级",
    profileNoSuggestions: "暂无个性化建议。",
    profileTrendSummary: "近期趋势摘要",
    profileVsPrev: "较前次",
    profileNoTrend: "暂无趋势数据，请先录入健康记录。",
    fields: {
      fullName: "姓名", gender: "性别", select: "请选择", age: "年龄", birthDate: "出生日期",
      bloodType: "血型", phone: "手机号", email: "邮箱", occupation: "职业", height: "身高(cm)",
      weight: "体重(kg)", smoking: "吸烟情况", alcohol: "饮酒情况", familyHistory: "家族病史",
      chronic: "慢性病史", allergies: "过敏信息", medications: "当前用药", surgery: "手术史",
      exercise: "运动习惯", goals: "健康目标", emergencyContact: "紧急联系人",
      emergencyPhone: "紧急联系人电话", notes: "备注"
    },
    recordsTitle: "健康记录列表",
    recordsCreate: "新增记录",
    recordsRiskFilter: "风险筛选",
    recordsAllRisk: "全部风险",
    recordsEmpty: "暂无健康记录。",
    recordsDate: "日期",
    recordsBp: "血压",
    recordsSugar: "血糖",
    recordsWeightBmi: "体重 / BMI",
    recordsSleepExercise: "睡眠 /运动",
    recordsRisk: "风险",
    recordsActions: "操作",
    edit: "编辑",
    del: "删除",
    alertsTitle: "预警列表",
    alertsStatusFilter: "处理状态",
    alertsAllStatus: "全部状态",
    alertsSeverityFilter: "严重级别",
    alertsAllSeverity: "全部级别",
    alertsEmpty: "暂无预警信息。",
    alertsFeedEmpty: "暂无预警数据。",
    alertsDate: "日期",
    alertsColTitle: "标题",
    alertsColIndicator: "指标说明",
    alertsColSeverity: "严重级别",
    alertsColStatus: "处理状态",
    alertsColSuggestion: "建议",
    alertsColActions: "操作",
    alertsHandle: "处理",
    importsTitle: "导入健康文档",
    importsHint: "将文件拖到此处，或点击下方按钮选择文件",
    importsChooseFile: "选择文件",
    importsFormats: "支持格式：PDF、PNG、JPG、BMP、TXT",
    importsSubmit: "开始识别并入档",
    importsInvalidType: "不支持的文件格式",
    importsRemoveFile: "移除文件",
    importsPending: "导入结果会显示在这里。",
    importsResultTitle: "最近一次导入结果",
    importsUnnamed: "未命名文件",
    importsNoMatch: "暂无匹配字段",
    importsProfileName: "档案姓名",
    importsGeneratedFlag: "是否生成记录",
    importsGenerated: "已生成",
    importsNotGenerated: "未生成",
    importsPreview: "识别文本预览",
    vizLoading: "正在加载图表数据。",
    vizTitle: "指标趋势图",
    vizRefresh: "刷新图表",
    vizEmpty: "暂无可视化数据，请先录入或导入健康记录。",
    vizRecent: "最近10条记录",
    vizLatest: "最新值",
    vizAverage: "均值",
    aiDisclaimer: "AI分析仅作为健康管理参考，不能替代医生诊断与治疗建议。若出现身体不适症状，请立即就医。",
    aiTitle: "发起 AI分析",
    aiFocusRecord: "关联记录",
    aiDefaultRecord: "默认使用最近一次记录",
    aiNotEvaluated: "未评估",
    aiQuestion: "具体问题",
    aiPlaceholder: "例如：最近血糖和睡眠同时波动，下一步应该重点关注什么？",
    aiAnalyzing: "分析中...",
    aiSubmit: "开始 AI分析",
    aiResultTitle: "分析结果",
    aiModel: "模型：",
    aiEmpty: "尚未发起 AI分析。",
    pageInfo: "第 {page} / {totalPages}页，共 {totalItems}条",
    pagePrev: "上一页",
    pageNext: "下一页",
    modalClose: "关闭",
    modalEditRecord: "编辑健康记录",
    modalCreateRecord: "新增健康记录",
    modalSaveChanges: "保存修改",
    modalSaveRecord: "保存记录",
    modalUpdateAlert: "更新预警状态",
    modalStatus: "处理状态",
    modalNote: "处理说明",
    modalSaveStatus: "保存状态",
    recordFields: {
      date: "日期", weight: "体重(kg)", waist: "腰围(cm)", systolic: "收缩压", diastolic: "舒张压",
      heartRate: "心率", fastingSugar: "空腹血糖", postprandialSugar: "餐后血糖",
      temperature: "体温", oxygen: "血氧(%)", cholesterol: "总胆固醇", sleep: "睡眠时长(h)",
      exercise: "运动时长(min)", steps: "步数", water: "饮水量(ml)", stress: "压力等级",
      mood: "情绪评分", symptoms: "症状", medication: "用药记录", notes: "备注"
    },
    recFieldDate: "日期", recFieldWeight: "体重(kg)", recFieldWaist: "腰围(cm)", recFieldSystolic: "收缩压",
    recFieldDiastolic: "舒张压", recFieldHeartRate: "心率", recFieldFastingSugar: "空腹血糖",
    recFieldPostprandialSugar: "餐后血糖", recFieldTemperature: "体温", recFieldOxygen: "血氧(%)",
    recFieldCholesterol: "总胆固醇", recFieldSleep: "睡眠时长(h)", recFieldExercise: "运动时长(min)",
    recFieldSteps: "步数", recFieldWater: "饮水量(ml)", recFieldStress: "压力等级",
    recFieldMood: "情绪评分", recFieldSymptoms: "症状", recFieldMedication: "用药记录", recFieldNotes: "备注",
    confirmDeleteRecord: "确认删除这条健康记录吗？相关预警也会一起移除。",
    confirmDeleteAlert: "确认删除这条预警信息吗？",
    toast: {
      loginOk: "登录成功", registerOk: "注册成功", profileSaved: "个人档案已保存",
      recordUpdated: "健康记录已更新", recordSaved: "健康记录已保存", alertUpdated: "预警状态已更新",
      importDone: "文档识别与入档已完成", aiDone: "AI分析已生成", alertNotFound: "未找到对应预警",
      recordDeleted: "健康记录已删除", alertDeleted: "预警信息已删除",
      requestFailed: "请求失败", opFailed: "操作失败，请稍后重试"
    },
    toastLoginOk: "登录成功", toastRegisterOk: "注册成功", toastProfileSaved: "个人档案已保存",
    toastRecordUpdated: "健康记录已更新", toastRecordSaved: "健康记录已保存", toastAlertUpdated: "预警状态已更新",
    toastImportDone: "文档识别与入档已完成", toastAiDone: "AI分析已生成", toastAlertNotFound: "未找到对应预警",
    toastRecordDeleted: "健康记录已删除", toastAlertDeleted: "预警信息已删除",
    toastRequestFailed: "请求失败", toastOpFailed: "操作失败，请稍后重试",
    bloodSugarFasting: "空腹",
    bloodSugarPostprandial: "餐后",
    trendUp: "上升",
    trendDown: "下降",
    trendStable: "稳定",
    trendMetric: {
      weight: "体重", "blood-pressure": "收缩压", "glucose-fasting": "空腹血糖",
      sleep: "睡眠时长", exercise: "运动时长", "risk-score": "风险分数",
      systolic: "收缩压", glucose: "空腹血糖", risk: "风险分数"
    },
    vizMetric: {
      weight: "体重", systolic: "收缩压", glucose: "空腹血糖",
      sleep: "睡眠时长", exercise: "运动时长", risk: "风险分数"
    }
  },
  en: {
    brand: "HealthGuard Al",
    brandSub: "Health Records · Alerts",
    logout: "Sign Out",
    currentUser: "Current User: ",
    langBtn: "中文",
    authTitle: "HealthGuard Al",
    authLogin: "Sign In",
    authRegister: "Sign Up",
    username: "Username",
    password: "Password",
    loginSystem: "Sign In",
    displayName: "Display Name",
    confirmPassword: "Confirm Password",
    registerEnter: "Create Account",
    nav: { dashboard: "Overview", profile: "Profile", records: "Health Records", alerts: "Alerts", imports: "Import Documents", visualization: "Data Charts", ai: "AI Analysis" },
    meta: { dashboard: "Health Overview", profile: "Personal Profile", records: "Health Records", alerts: "Alert Center", imports: "Document Import", visualization: "Data Charts", ai: "AI Analysis" },
    enums: {
      gender: { MALE: "Male", FEMALE: "Female", OTHER: "Other" },
      bloodType: { A: "Type A", B: "Type B", AB: "Type AB", O: "Type O", UNKNOWN: "Unknown" },
      smokingStatus: { NEVER: "Never", FORMER: "Former", OCCASIONAL: "Occasional", CURRENT: "Current" },
      alcoholUseStatus: { NEVER: "Never", OCCASIONAL: "Occasional", WEEKLY: "Weekly", FREQUENT: "Frequent" },
      riskLevel: { LOW: "Low Risk", MEDIUM: "Medium Risk", HIGH: "High Risk", CRITICAL: "Critical" },
      alertStatus: { PENDING: "Pending", REVIEWED: "Reviewed", RESOLVED: "Resolved" },
      alertSeverity: { LOW: "Mild", MEDIUM: "Moderate", HIGH: "Severe", CRITICAL: "Critical" }
    },
    dashLoading: "Loading dashboard data...",
    dashProfile: "Profile Completion",
    dashRecords: "Health Records",
    dashPendingAlerts: "Pending Alerts",
    dashLatestRisk: "Latest Risk Level",
    dashNone: "None",
    dashProfileMissing: "Please complete your profile first.",
    dashRiskDist: "Risk Distribution",
    dashRefresh: "Refresh",
    dashCountSuffix: "",
    dashRecentRecords: "Recent Records",
    dashRecentAlerts: "Recent Alerts",
    profileTitle: "Profile Maintenance",
    profileCompleteness: "Completeness {score}%",
    profileSave: "Save Profile",
    profileInsights: "Profile Insights",
    profileLatestDate: "Latest Record Date",
    profileCurrentRisk: "Current Risk Level",
    profileNoSuggestions: "No personalized suggestions yet.",
    profileTrendSummary: "Recent Trend Summary",
    profileVsPrev: "vs. previous",
    profileNoTrend: "No trend data yet. Please add health records first.",
    fields: {
      fullName: "Full Name", gender: "Gender", select: "Please Select", age: "Age", birthDate: "Birth Date",
      bloodType: "Blood Type", phone: "Phone", email: "Email", occupation: "Occupation", height: "Height (cm)",
      weight: "Weight (kg)", smoking: "Smoking", alcohol: "Alcohol Use", familyHistory: "Family Medical History",
      chronic: "Chronic Diseases", allergies: "Allergies", medications: "Current Medications", surgery: "Surgery History",
      exercise: "Exercise Habits", goals: "Health Goals", emergencyContact: "Emergency Contact",
      emergencyPhone: "Emergency Phone", notes: "Notes"
    },
    recordsTitle: "Health Records",
    recordsCreate: "Add Record",
    recordsRiskFilter: "Risk Filter",
    recordsAllRisk: "All Risks",
    recordsEmpty: "No health records yet.",
    recordsDate: "Date",
    recordsBp: "Blood Pressure",
    recordsSugar: "Blood Sugar",
    recordsWeightBmi: "Weight / BMI",
    recordsSleepExercise: "Sleep / Exercise",
    recordsRisk: "Risk",
    recordsActions: "Actions",
    edit: "Edit",
    del: "Delete",
    alertsTitle: "Alert Center",
    alertsStatusFilter: "Status",
    alertsAllStatus: "All Statuses",
    alertsSeverityFilter: "Severity",
    alertsAllSeverity: "All Severities",
    alertsEmpty: "No alerts yet.",
    alertsFeedEmpty: "No alert data.",
    alertsDate: "Date",
    alertsColTitle: "Title",
    alertsColIndicator: "Indicator",
    alertsColSeverity: "Severity",
    alertsColStatus: "Status",
    alertsColSuggestion: "Suggestion",
    alertsColActions: "Actions",
    alertsHandle: "Handle",
    importsTitle: "Import Health Documents",
    importsHint: "Drag files here, or click the button below to choose a file",
    importsChooseFile: "Choose File",
    importsFormats: "Supported formats: PDF, PNG, JPG, BMP, TXT",
    importsSubmit: "Recognize & Import",
    importsInvalidType: "Unsupported file type",
    importsRemoveFile: "Remove file",
    importsPending: "The import result will appear here.",
    importsResultTitle: "Latest Import Result",
    importsUnnamed: "Unnamed file",
    importsNoMatch: "No matched fields",
    importsProfileName: "Profile Name",
    importsGeneratedFlag: "Record Generated",
    importsGenerated: "Yes",
    importsNotGenerated: "No",
    importsPreview: "Recognized Text Preview",
    vizLoading: "Loading chart data...",
    vizTitle: "Indicator Trend Chart",
    vizRefresh: "Refresh Chart",
    vizEmpty: "No data to visualize yet. Please add or import health records first.",
    vizRecent: "Latest 10 records",
    vizLatest: "Latest",
    vizAverage: "Average",
    aiDisclaimer: "AI analysis is for health management reference only and cannot replace diagnosis or treatment advice from a doctor. If you experience any physical discomfort, please seek medical attention immediately.",
    aiTitle: "Start AI Analysis",
    aiFocusRecord: "Related Record",
    aiDefaultRecord: "Uses the latest record by default",
    aiNotEvaluated: "Not evaluated",
    aiQuestion: "Specific Question",
    aiPlaceholder: "e.g. My blood sugar and sleep have been fluctuating recently. What should I focus on next?",
    aiAnalyzing: "Analyzing...",
    aiSubmit: "Start AI Analysis",
    aiResultTitle: "Analysis Result",
    aiModel: "Model: ",
    aiEmpty: "No AI analysis has been started yet.",
    pageInfo: "Page {page} / {totalPages}, {totalItems} items",
    pagePrev: "Previous",
    pageNext: "Next",
    modalClose: "Close",
    modalEditRecord: "Edit Health Record",
    modalCreateRecord: "Add Health Record",
    modalSaveChanges: "Save Changes",
    modalSaveRecord: "Save Record",
    modalUpdateAlert: "Update Alert Status",
    modalStatus: "Status",
    modalNote: "Note",
    modalSaveStatus: "Save Status",
    recordFields: {
      date: "Date", weight: "Weight (kg)", waist: "Waist (cm)", systolic: "Systolic Pressure",
      diastolic: "Diastolic Pressure", heartRate: "Heart Rate", fastingSugar: "Fasting Blood Sugar",
      postprandialSugar: "Postprandial Blood Sugar", temperature: "Body Temperature", oxygen: "Blood Oxygen (%)",
      cholesterol: "Total Cholesterol", sleep: "Sleep Duration (h)", exercise: "Exercise Duration (min)",
      steps: "Steps", water: "Water Intake (ml)", stress: "Stress Level", mood: "Mood Score",
      symptoms: "Symptoms", medication: "Medication", notes: "Notes"
    },
    recFieldDate: "Date", recFieldWeight: "Weight (kg)", recFieldWaist: "Waist (cm)", recFieldSystolic: "Systolic Pressure",
    recFieldDiastolic: "Diastolic Pressure", recFieldHeartRate: "Heart Rate", recFieldFastingSugar: "Fasting Blood Sugar",
    recFieldPostprandialSugar: "Postprandial Blood Sugar", recFieldTemperature: "Body Temperature", recFieldOxygen: "Blood Oxygen (%)",
    recFieldCholesterol: "Total Cholesterol", recFieldSleep: "Sleep Duration (h)", recFieldExercise: "Exercise Duration (min)",
    recFieldSteps: "Steps", recFieldWater: "Water Intake (ml)", recFieldStress: "Stress Level",
    recFieldMood: "Mood Score", recFieldSymptoms: "Symptoms", recFieldMedication: "Medication", recFieldNotes: "Notes",
    confirmDeleteRecord: "Delete this health record? Related alerts will also be removed.",
    confirmDeleteAlert: "Delete this alert?",
    toast: {
      loginOk: "Signed in successfully.", registerOk: "Account created successfully.",
      profileSaved: "Profile saved.", recordUpdated: "Health record updated.",
      recordSaved: "Health record saved.", alertUpdated: "Alert status updated.",
      importDone: "Document recognized and imported.", aiDone: "AI analysis generated.",
      alertNotFound: "Alert not found.", recordDeleted: "Health record deleted.",
      alertDeleted: "Alert deleted.", requestFailed: "Request failed.",
      opFailed: "Operation failed, please try again later."
    },
    toastLoginOk: "Signed in successfully.", toastRegisterOk: "Account created successfully.",
    toastProfileSaved: "Profile saved.", toastRecordUpdated: "Health record updated.",
    toastRecordSaved: "Health record saved.", toastAlertUpdated: "Alert status updated.",
    toastImportDone: "Document recognized and imported.", toastAiDone: "AI analysis generated.",
    toastAlertNotFound: "Alert not found.", toastRecordDeleted: "Health record deleted.",
    toastAlertDeleted: "Alert deleted.", toastRequestFailed: "Request failed.",
    toastOpFailed: "Operation failed, please try again later.",
    bloodSugarFasting: "Fasting",
    bloodSugarPostprandial: "Postprandial",
    trendUp: "Up",
    trendDown: "Down",
    trendStable: "Stable",
    trendMetric: {
      weight: "Weight", "blood-pressure": "Systolic Pressure", "glucose-fasting": "Fasting Blood Sugar",
      sleep: "Sleep Duration", exercise: "Exercise Duration", "risk-score": "Risk Score",
      systolic: "Systolic Pressure", glucose: "Fasting Blood Sugar", risk: "Risk Score"
    },
    vizMetric: {
      weight: "Weight", systolic: "Systolic Pressure", glucose: "Fasting Blood Sugar",
      sleep: "Sleep Duration", exercise: "Exercise Duration", risk: "Risk Score"
    }
  }
};

/* 语言状态：优先读取本地存储，默认中文 */
const langState = {
  lang: (() => {
    try {
      return localStorage.getItem("health-lang") === "en" ? "en" : "zh";
    } catch (error) {
      return "zh";
    }
  })()
};

/* 取当前语言文本，支持 {name} 插值 */
function t(key, params) {
  const lookup = (source) => key.split(".").reduce((obj, part) => (obj && obj[part] !== undefined ? obj[part] : undefined), source);
  let value = lookup(I18N[langState.lang]);
  if (value === undefined) {
    value = lookup(I18N.zh);
  }
  if (typeof value !== "string") {
    return key;
  }
  if (params) {
    value = value.replace(/\{(\w+)\}/g, (match, name) => (name in params ? String(params[name]) : match));
  }
  return value;
}

/* 枚举标签（随语言切换重建，初始按已保存语言） */
let enumLabels = I18N[langState.lang].enums;

/* 设置语言并持久化 */
function setLanguage(lang) {
  langState.lang = lang === "en" ? "en" : "zh";
  try {
    localStorage.setItem("health-lang", langState.lang);
  } catch (error) {
    /* 忽略存储异常 */
  }
  enumLabels = I18N[langState.lang].enums;
  document.documentElement.lang = langState.lang === "zh" ? "zh-CN" : "en";
}

/* 切换语言后立即重绘界面 */
function toggleLanguage() {
  setLanguage(langState.lang === "zh" ? "en" : "zh");
  render();
}

/* 页面加载时应用已保存语言 */
document.documentElement.lang = langState.lang === "zh" ? "zh-CN" : "en";
