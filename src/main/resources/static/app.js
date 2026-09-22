/* 枚举标签与语言管理由 i18n.js 提供（enumLabels / t / setLanguage / toggleLanguage） */

const routes = [
    { key: "dashboard", icon: "🏥" },
    { key: "profile", icon: "👤" },
    { key: "records", icon: "📋" },
    { key: "alerts", icon: "🚨" },
    { key: "imports", icon: "📄" },
    { key: "visualization", icon: "📊" },
    { key: "ai", icon: "🤖" }
];

const routeMeta = {
    dashboard: { subtitle: "" },
    profile: { subtitle: "" },
    records: { subtitle: "" },
    alerts: { subtitle: "" },
    imports: { subtitle: "" },
    visualization: { subtitle: "" },
    ai: { subtitle: "" }
};

const state = {
    session: null,
    authMode: "login",
    route: "dashboard",
    dashboard: null,
    profileDetail: {
        profile: null,
        latestRecord: null,
        trends: [],
        personalizedSuggestions: [],
        recentRecords: [],
        recentAlerts: []
    },
    records: {
        items: [],
        page: 1,
        size: 10,
        totalItems: 0,
        totalPages: 1,
        riskLevel: ""
    },
    alerts: {
        items: [],
        page: 1,
        size: 10,
        totalItems: 0,
        totalPages: 1,
        status: "",
        severity: ""
    },
    visualization: null,
    importResult: null,
    ai: {
        loading: false,
        result: null
    }
};

const elements = {};
let toastTimer = null;

document.addEventListener("DOMContentLoaded", () => {
    cacheElements();
    bindEvents();
    bootstrap().catch(handleError);
});

function cacheElements() {
    elements.app = document.getElementById("app");
    elements.toast = document.getElementById("toast");
    elements.modalBackdrop = document.getElementById("modalBackdrop");
    elements.modalPanel = document.getElementById("modalPanel");
}

function bindEvents() {
    document.addEventListener("click", handleClick);
    document.addEventListener("submit", handleSubmit);
    document.addEventListener("change", handleChange);
    window.addEventListener("hashchange", handleHashRoute);
    elements.modalBackdrop.addEventListener("click", (event) => {
        if (event.target === elements.modalBackdrop) {
            closeModal();
        }
    });
}

async function bootstrap() {
    await restoreSession();
    render();
}

async function restoreSession() {
    const session = await api("/api/auth/me", { suppressUnauthorizedRedirect: true });
    if (session?.authenticated) {
        state.session = session;
        syncRoute();
        await loadAllData({ tolerateErrors: true });
    } else {
        state.session = null;
        state.route = "dashboard";
    }
}

async function handleHashRoute() {
    if (!state.session) {
        return;
    }
    syncRoute();
    render();
    try {
        await loadRouteData(state.route);
        render();
    } catch (error) {
        handleError(error);
    }
}

function syncRoute() {
    const rawHash = window.location.hash.replace("#", "");
    state.route = routes.some((item) => item.key === rawHash) ? rawHash : "dashboard";
    if (window.location.hash !== `#${state.route}`) {
        history.replaceState(null, "", `#${state.route}`);
    }
}

async function loadAllData(options = {}) {
    const loaders = [
        loadDashboard,
        loadProfileDetail,
        loadRecords,
        loadAlerts,
        loadVisualization
    ];

    if (!options.tolerateErrors) {
        await Promise.all(loaders.map((loader) => loader()));
        return [];
    }

    const results = await Promise.allSettled(loaders.map((loader) => loader()));
    const failures = results
        .filter((result) => result.status === "rejected")
        .map((result) => result.reason);
    if (failures.length) {
        console.warn("部分数据加载失败", failures);
    }
    return failures;
}

async function loadRouteData(route = state.route) {
    switch (route) {
        case "dashboard":
            await loadDashboard();
            break;
        case "profile":
            await loadProfileDetail();
            break;
        case "records":
            await loadRecords();
            break;
        case "alerts":
            await loadAlerts();
            break;
        case "visualization":
            await loadVisualization();
            break;
        case "ai":
            await loadProfileDetail();
            break;
        default:
            break;
    }
}

async function loadDashboard() {
    state.dashboard = await api("/api/dashboard");
}

async function loadProfileDetail() {
    state.profileDetail = await api("/api/profile/detail");
}

async function loadRecords() {
    const params = new URLSearchParams({
        page: String(state.records.page),
        size: String(state.records.size)
    });
    if (state.records.riskLevel) {
        params.set("riskLevel", state.records.riskLevel);
    }
    const data = await api(`/api/records?${params.toString()}`);
    Object.assign(state.records, data);
}

async function loadAlerts() {
    const params = new URLSearchParams({
        page: String(state.alerts.page),
        size: String(state.alerts.size)
    });
    if (state.alerts.status) {
        params.set("status", state.alerts.status);
    }
    if (state.alerts.severity) {
        params.set("severity", state.alerts.severity);
    }
    const data = await api(`/api/alerts?${params.toString()}`);
    Object.assign(state.alerts, data);
}

async function loadVisualization() {
    state.visualization = await api("/api/visualization");
}

function render() {
    closeModal();
    document.title = state.session ? `${t("brand")} · ${t(`meta.${state.route}`)}` : t("authTitle");
    if (!state.session) {
        document.body.classList.remove("modal-open");
        elements.app.innerHTML = renderAuthPage();
        return;
    }

    const meta = routeMeta[state.route];
    elements.app.innerHTML = `
        <div class="app-shell">
            <aside class="sidebar">
                <div class="brand">
                    <strong>${escapeHtml(t("brand"))}</strong>
                    <span>${escapeHtml(state.session.displayName)}</span>
                </div>
                <nav class="nav-list">
                    ${routes.map((item) => `
                        <button class="nav-item ${item.key === state.route ? "active" : ""}" type="button"
                                data-action="navigate" data-route="${item.key}">
                            <span class="nav-icon">${item.icon}</span>
                            <span>${escapeHtml(t(`nav.${item.key}`))}</span>
                        </button>
                    `).join("")}
                </nav>
                <div style="margin-top:16px;">
                    <button class="btn-ghost" type="button" data-action="logout">${escapeHtml(t("logout"))}</button>
                </div>
            </aside>
            <main class="app-main">
                <div class="topbar">
                    <div>
                        <h2>${escapeHtml(t(`meta.${state.route}`))}</h2>
                        ${meta.subtitle ? `<p>${escapeHtml(meta.subtitle)}</p>` : ""}
                    </div>
                    <div class="topbar-actions">
                        <button class="lang-switch" type="button" data-action="toggle-language" aria-label="switch language">🌐 ${escapeHtml(t("langBtn"))}</button>
                        <div class="muted-text">${escapeHtml(t("currentUser"))}${escapeHtml(state.session.username)}</div>
                    </div>
                </div>
                ${renderCurrentPage()}
            </main>
        </div>
    `;

    if (state.route === "imports") {
        setupImportDropzone();
    }
}

function setupImportDropzone() {
    const dropzone = document.getElementById("importDropzone");
    const fileInput = document.getElementById("importFileInput");
    const nameDisplay = document.getElementById("fileNameDisplay");
    const submitBtn = document.getElementById("importSubmitBtn");
    if (!dropzone || !fileInput || !nameDisplay || !submitBtn) return;

    function showFileName(file) {
        const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
        const ext = file.name.split(".").pop().toUpperCase();
        const iconMap = { PDF: "📕", PNG: "🖼️", JPG: "🖼️", JPEG: "🖼️", BMP: "🖼️", TXT: "📝" };
        const icon = iconMap[ext] || "📎";
        nameDisplay.innerHTML = `<span class="file-icon">${icon}</span><span>${escapeHtml(file.name)}</span><span class="muted-text" style="font-size:12px;">(${sizeMB} MB)</span><button type="button" class="file-clear" title="${escapeHtml(t("importsRemoveFile"))}">&times;</button>`;
        nameDisplay.style.display = "flex";
        submitBtn.disabled = false;
        nameDisplay.querySelector(".file-clear").addEventListener("click", () => {
            fileInput.value = "";
            nameDisplay.style.display = "none";
            nameDisplay.innerHTML = "";
            submitBtn.disabled = true;
        });
    }

    fileInput.addEventListener("change", () => {
        if (fileInput.files.length > 0) {
            showFileName(fileInput.files[0]);
        }
    });

    ["dragenter", "dragover"].forEach((eventName) => {
        dropzone.addEventListener(eventName, (event) => {
            event.preventDefault();
            event.stopPropagation();
            dropzone.classList.add("drag-over");
        });
    });

    ["dragleave", "drop"].forEach((eventName) => {
        dropzone.addEventListener(eventName, (event) => {
            event.preventDefault();
            event.stopPropagation();
            dropzone.classList.remove("drag-over");
        });
    });

    dropzone.addEventListener("drop", (event) => {
        const files = event.dataTransfer?.files;
        if (files && files.length > 0) {
            const acceptedTypes = [".pdf", ".png", ".jpg", ".jpeg", ".bmp", ".txt"];
            const fileName = files[0].name.toLowerCase();
            const isValid = acceptedTypes.some((ext) => fileName.endsWith(ext));
            if (isValid) {
                fileInput.files = files;
                showFileName(files[0]);
            } else {
                showToast(t("importsInvalidType"), true);
            }
        }
    });
}

function renderAuthPage() {
    return `
        <div class="auth-shell">
            <button class="lang-switch lang-switch-fixed" type="button" data-action="toggle-language" aria-label="switch language">🌐 ${escapeHtml(t("langBtn"))}</button>
            <div class="auth-card compact">
                <section class="auth-panel">
                    <h1 class="auth-title">${escapeHtml(t("authTitle"))}</h1>
                    <div class="auth-tabs">
                        <button class="tab-btn ${state.authMode === "login" ? "active" : ""}" type="button"
                                data-action="auth-tab" data-mode="login">${escapeHtml(t("authLogin"))}</button>
                        <button class="tab-btn ${state.authMode === "register" ? "active" : ""}" type="button"
                                data-action="auth-tab" data-mode="register">${escapeHtml(t("authRegister"))}</button>
                    </div>
                    ${state.authMode === "login" ? renderLoginForm() : renderRegisterForm()}
                </section>
            </div>
        </div>
    `;
}

function renderLoginForm() {
    return `
        <form id="loginForm" class="page-grid">
            <label class="form-field">
                ${escapeHtml(t("username"))}
                <input name="username" type="text" maxlength="40" required>
            </label>
            <label class="form-field">
                ${escapeHtml(t("password"))}
                <input name="password" type="password" maxlength="64" required>
            </label>
            <button class="btn" type="submit">${escapeHtml(t("loginSystem"))}</button>
        </form>
    `;
}

function renderRegisterForm() {
    return `
        <form id="registerForm" class="page-grid">
            <label class="form-field">
                ${escapeHtml(t("username"))}
                <input name="username" type="text" maxlength="40" required>
            </label>
            <label class="form-field">
                ${escapeHtml(t("displayName"))}
                <input name="displayName" type="text" maxlength="60" required>
            </label>
            <label class="form-field">
                ${escapeHtml(t("password"))}
                <input name="password" type="password" maxlength="64" required>
            </label>
            <label class="form-field">
                ${escapeHtml(t("confirmPassword"))}
                <input name="confirmPassword" type="password" maxlength="64" required>
            </label>
            <button class="btn" type="submit">${escapeHtml(t("registerEnter"))}</button>
        </form>
    `;
}

function renderCurrentPage() {
    switch (state.route) {
        case "dashboard":
            return renderDashboardPage();
        case "profile":
            return renderProfilePage();
        case "records":
            return renderRecordsPage();
        case "alerts":
            return renderAlertsPage();
        case "imports":
            return renderImportsPage();
        case "visualization":
            return renderVisualizationPage();
        case "ai":
            return renderAiPage();
        default:
            return "";
    }
}

function riskLevelCardClass(level) {
    switch (level) {
        case "LOW":
            return "stat-level-low";
        case "MEDIUM":
            return "stat-level-medium";
        case "HIGH":
            return "stat-level-high";
        case "CRITICAL":
            return "stat-level-critical";
        default:
            return "stat-level-none";
    }
}

function renderDashboardPage() {
    const dashboard = state.dashboard;
    if (!dashboard) {
        return renderEmpty(t("dashLoading"));
    }

    const total = dashboard.totalRecords || 0;
    return `
        <div class="page-grid">
            <div class="stat-grid">
                <div class="stat-card">
                    <span class="stat-icon">📑</span>
                    <span>${escapeHtml(t("dashProfile"))}</span>
                    <strong>${dashboard.profileCompletionScore ?? 0}%</strong>
                </div>
                <div class="stat-card">
                    <span class="stat-icon">💊</span>
                    <span>${escapeHtml(t("dashRecords"))}</span>
                    <strong>${dashboard.totalRecords ?? 0}</strong>
                </div>
                <div class="stat-card ${(dashboard.pendingAlerts ?? 0) > 0 ? "stat-warn" : "stat-calm"}">
                    <span class="stat-icon">⚠️</span>
                    <span>${escapeHtml(t("dashPendingAlerts"))}</span>
                    <strong>${dashboard.pendingAlerts ?? 0}</strong>
                </div>
                <div class="stat-card ${riskLevelCardClass(dashboard.latestRiskLevel)}">
                    <span class="stat-icon">🩺</span>
                    <span>${escapeHtml(t("dashLatestRisk"))}</span>
                    <strong>${dashboard.latestRiskLevel ? enumLabels.riskLevel[dashboard.latestRiskLevel] : escapeHtml(t("dashNone"))}</strong>
                </div>
            </div>

            ${!dashboard.profileExists ? `<div class="callout">${escapeHtml(t("dashProfileMissing"))}</div>` : ""}

            <section class="panel">
                <div class="section-head">
                    <h3>${escapeHtml(t("dashRiskDist"))}</h3>
                    <button class="btn-ghost" type="button" data-action="refresh-dashboard">${escapeHtml(t("dashRefresh"))}</button>
                </div>
                <div class="risk-bars">
                    ${["LOW", "MEDIUM", "HIGH", "CRITICAL"].map((level) => {
                        const count = dashboard.riskDistribution?.[level] ?? 0;
                        const width = total > 0 ? Math.max((count / total) * 100, count > 0 ? 6 : 0) : 0;
                        return `
                            <div class="risk-bar">
                                <div class="risk-bar-head">
                                    <strong>${enumLabels.riskLevel[level]}</strong>
                                    <span class="muted-text">${count} ${escapeHtml(t("dashCountSuffix"))}</span>
                                </div>
                                <div class="risk-track"><span style="width:${width}%"></span></div>
                            </div>
                        `;
                    }).join("")}
                </div>
            </section>

            <div class="two-column">
                <section class="table-shell">
                    <div class="section-head"><h3>${escapeHtml(t("dashRecentRecords"))}</h3></div>
                    ${renderRecordsTable(dashboard.recentRecords || [], false)}
                </section>
                <section class="panel">
                    <div class="section-head"><h3>${escapeHtml(t("dashRecentAlerts"))}</h3></div>
                    ${renderAlertFeed(dashboard.recentAlerts || [])}
                </section>
            </div>
        </div>
    `;
}

function renderProfilePage() {
    const detail = state.profileDetail;
    const profile = detail.profile || {};
    return `
        <div class="page-grid">
            <div class="two-column">
                <section class="panel">
                    <div class="section-head">
                        <h3>${escapeHtml(t("profileTitle"))}</h3>
                        <span class="badge ${profile.completionScore >= 80 ? "low" : profile.completionScore >= 50 ? "medium" : "high"}">
                            ${escapeHtml(t("profileCompleteness", { score: profile.completionScore ?? 0 }))}
                        </span>
                    </div>
                    <form id="profileForm" class="form-grid">
                        ${renderProfileFields(profile)}
                        <div class="full-span">
                            <button class="btn" type="submit">${escapeHtml(t("profileSave"))}</button>
                        </div>
                    </form>
                </section>

                <section class="panel">
                    <div class="section-head"><h3>${escapeHtml(t("profileInsights"))}</h3></div>
                    <div class="detail-grid">
                        <div class="card">
                            <span class="muted-text">${escapeHtml(t("profileLatestDate"))}</span>
                            <strong>${formatDate(detail.latestRecord?.recordDate)}</strong>
                        </div>
                        <div class="card">
                            <span class="muted-text">${escapeHtml(t("profileCurrentRisk"))}</span>
                            <strong>${detail.latestRecord?.riskLevel ? enumLabels.riskLevel[detail.latestRecord.riskLevel] : escapeHtml(t("dashNone"))}</strong>
                        </div>
                    </div>
                    <div class="suggestion-list" style="margin-top:16px;">
                        ${detail.personalizedSuggestions?.length
                            ? detail.personalizedSuggestions.map((item) => `<div class="feed-item">${escapeHtml(item)}</div>`).join("")
                            : `<div class="empty-shell">${escapeHtml(t("profileNoSuggestions"))}</div>`}
                    </div>
                </section>
            </div>

            <section class="panel">
                <div class="section-head"><h3>${escapeHtml(t("profileTrendSummary"))}</h3></div>
                <div class="three-column">
                    ${detail.trends?.length
                        ? detail.trends.map((trend) => `
                            <div class="card">
                                <div class="section-head">
                                    <div>
                                        <h4>${escapeHtml(trendMetricName(trend))}</h4>
                                        <p>${escapeHtml(trendDirectionText(trend.direction))}</p>
                                    </div>
                                    <span class="badge ${trend.direction === "上升" ? "medium" : "low"}">${escapeHtml(trendDirectionText(trend.direction))}</span>
                                </div>
                                <strong>${formatMetric(trend.latestValue, trend.unit)}</strong>
                                <div class="muted-text">${escapeHtml(t("profileVsPrev"))} ${formatSignedMetric(trend.changeValue, trend.unit)}</div>
                                <div class="muted-text" style="margin-top:8px;">${escapeHtml(trend.interpretation)}</div>
                            </div>
                        `).join("")
                        : `<div class="empty-shell full-span">${escapeHtml(t("profileNoTrend"))}</div>`}
                </div>
            </section>
        </div>
    `;
}

/* 指标名按 metricCode 翻译，缺少编码时回退原文 */
function trendMetricName(trend) {
    if (trend.metricCode) {
        const name = t(`trendMetric.${trend.metricCode}`);
        if (name !== `trendMetric.${trend.metricCode}`) {
            return name;
        }
    }
    const byName = { "体重": "trendMetric.weight", "收缩压": "trendMetric.systolic", "空腹血糖": "trendMetric.glucose", "睡眠时长": "trendMetric.sleep", "运动时长": "trendMetric.exercise", "风险分数": "trendMetric.risk" };
    const key = byName[trend.metricName];
    return key ? t(key) : trend.metricName;
}

/* 趋势方向翻译 */
function trendDirectionText(direction) {
    switch (direction) {
        case "上升":
            return t("trendUp");
        case "下降":
            return t("trendDown");
        case "稳定":
        case "平稳":
            return t("trendStable");
        default:
            return direction;
    }
}

function renderProfileFields(profile) {
    return `
        <label class="form-field">
            ${escapeHtml(t("fields.fullName"))}
            <input name="fullName" type="text" value="${escapeAttr(profile.fullName || "")}" required>
        </label>
        <label class="form-field">
            ${escapeHtml(t("fields.gender"))}
            <select name="gender">
                <option value="">${escapeHtml(t("fields.select"))}</option>
                ${renderSelectOptions(enumLabels.gender, profile.gender || "")}
            </select>
        </label>
        <label class="form-field">
            ${escapeHtml(t("fields.age"))}
            <input name="age" type="number" min="1" max="120" value="${escapeAttr(profile.age ?? "")}">
        </label>
        <label class="form-field">
            ${escapeHtml(t("fields.birthDate"))}
            <input name="birthDate" type="date" value="${escapeAttr(profile.birthDate || "")}">
        </label>
        <label class="form-field">
            ${escapeHtml(t("fields.bloodType"))}
            <select name="bloodType">
                <option value="">${escapeHtml(t("fields.select"))}</option>
                ${renderSelectOptions(enumLabels.bloodType, profile.bloodType || "")}
            </select>
        </label>
        <label class="form-field">
            ${escapeHtml(t("fields.phone"))}
            <input name="phone" type="text" value="${escapeAttr(profile.phone || "")}">
        </label>
        <label class="form-field">
            ${escapeHtml(t("fields.email"))}
            <input name="email" type="email" value="${escapeAttr(profile.email || "")}">
        </label>
        <label class="form-field">
            ${escapeHtml(t("fields.occupation"))}
            <input name="occupation" type="text" value="${escapeAttr(profile.occupation || "")}">
        </label>
        <label class="form-field">
            ${escapeHtml(t("fields.height"))}
            <input name="heightCm" type="number" step="0.01" min="50" max="250" value="${escapeAttr(profile.heightCm ?? "")}">
        </label>
        <label class="form-field">
            ${escapeHtml(t("fields.weight"))}
            <input name="weightKg" type="number" step="0.01" min="20" max="300" value="${escapeAttr(profile.weightKg ?? "")}">
        </label>
        <label class="form-field">
            ${escapeHtml(t("fields.smoking"))}
            <select name="smokingStatus">
                <option value="">${escapeHtml(t("fields.select"))}</option>
                ${renderSelectOptions(enumLabels.smokingStatus, profile.smokingStatus || "")}
            </select>
        </label>
        <label class="form-field">
            ${escapeHtml(t("fields.alcohol"))}
            <select name="alcoholUseStatus">
                <option value="">${escapeHtml(t("fields.select"))}</option>
                ${renderSelectOptions(enumLabels.alcoholUseStatus, profile.alcoholUseStatus || "")}
            </select>
        </label>
        <label class="form-field full-span"><span>${escapeHtml(t("fields.familyHistory"))}</span><textarea name="familyHistory">${escapeHtml(profile.familyHistory || "")}</textarea></label>
        <label class="form-field full-span"><span>${escapeHtml(t("fields.chronic"))}</span><textarea name="chronicDiseases">${escapeHtml(profile.chronicDiseases || "")}</textarea></label>
        <label class="form-field full-span"><span>${escapeHtml(t("fields.allergies"))}</span><textarea name="allergies">${escapeHtml(profile.allergies || "")}</textarea></label>
        <label class="form-field full-span"><span>${escapeHtml(t("fields.medications"))}</span><textarea name="currentMedications">${escapeHtml(profile.currentMedications || "")}</textarea></label>
        <label class="form-field full-span"><span>${escapeHtml(t("fields.surgery"))}</span><textarea name="surgeryHistory">${escapeHtml(profile.surgeryHistory || "")}</textarea></label>
        <label class="form-field full-span"><span>${escapeHtml(t("fields.exercise"))}</span><textarea name="exerciseHabit">${escapeHtml(profile.exerciseHabit || "")}</textarea></label>
        <label class="form-field full-span"><span>${escapeHtml(t("fields.goals"))}</span><textarea name="careGoals">${escapeHtml(profile.careGoals || "")}</textarea></label>
        <label class="form-field">
            ${escapeHtml(t("fields.emergencyContact"))}
            <input name="emergencyContact" type="text" value="${escapeAttr(profile.emergencyContact || "")}">
        </label>
        <label class="form-field">
            ${escapeHtml(t("fields.emergencyPhone"))}
            <input name="emergencyContactPhone" type="text" value="${escapeAttr(profile.emergencyContactPhone || "")}">
        </label>
        <label class="form-field full-span"><span>${escapeHtml(t("fields.notes"))}</span><textarea name="notes">${escapeHtml(profile.notes || "")}</textarea></label>
    `;
}

function renderRecordsPage() {
    return `
        <div class="page-grid">
            <section class="table-shell">
                <div class="section-head">
                    <h3>${escapeHtml(t("recordsTitle"))}</h3>
                    <button class="btn" type="button" data-action="open-record-create">${escapeHtml(t("recordsCreate"))}</button>
                </div>
                <div class="toolbar">
                    <label>
                        ${escapeHtml(t("recordsRiskFilter"))}
                        <select id="recordRiskFilter">
                            <option value="">${escapeHtml(t("recordsAllRisk"))}</option>
                            ${renderSelectOptions(enumLabels.riskLevel, state.records.riskLevel)}
                        </select>
                    </label>
                </div>
                ${renderRecordsTable(state.records.items, true)}
                ${renderPagination(state.records, "records")}
            </section>
        </div>
    `;
}

function renderAlertsPage() {
    return `
        <div class="page-grid">
            <section class="table-shell">
                <div class="section-head"><h3>${escapeHtml(t("alertsTitle"))}</h3></div>
                <div class="toolbar">
                    <label>
                        ${escapeHtml(t("alertsStatusFilter"))}
                        <select id="alertStatusFilter">
                            <option value="">${escapeHtml(t("alertsAllStatus"))}</option>
                            ${renderSelectOptions(enumLabels.alertStatus, state.alerts.status)}
                        </select>
                    </label>
                    <label>
                        ${escapeHtml(t("alertsSeverityFilter"))}
                        <select id="alertSeverityFilter">
                            <option value="">${escapeHtml(t("alertsAllSeverity"))}</option>
                            ${renderSelectOptions(enumLabels.alertSeverity, state.alerts.severity)}
                        </select>
                    </label>
                </div>
                ${renderAlertsTable(state.alerts.items)}
                ${renderPagination(state.alerts, "alerts")}
            </section>
        </div>
    `;
}

function renderImportsPage() {
    return `
        <div class="page-grid">
            <section class="panel">
                <div class="section-head"><h3>${escapeHtml(t("importsTitle"))}</h3></div>
                <form id="importForm" class="page-grid">
                    <div class="import-dropzone" id="importDropzone">
                        <div class="upload-icon">📤</div>
                        <p class="upload-hint">${escapeHtml(t("importsHint"))}</p>
                        <div class="file-input-wrapper">
                            <input id="importFileInput" name="file" type="file" accept=".pdf,.png,.jpg,.jpeg,.bmp,.txt" required>
                            <span class="file-select-btn">📁 ${escapeHtml(t("importsChooseFile"))}</span>
                        </div>
                        <div id="fileNameDisplay" class="file-name-display" style="display:none;"></div>
                        <p class="upload-formats">${escapeHtml(t("importsFormats"))}</p>
                    </div>
                    <button class="import-submit-btn" id="importSubmitBtn" type="submit" disabled>🚀 ${escapeHtml(t("importsSubmit"))}</button>
                </form>
            </section>
            ${renderImportResult()}
        </div>
    `;
}

function renderImportResult() {
    const result = state.importResult;
    if (!result) {
        return renderEmpty(t("importsPending"));
    }

    return `
        <section class="panel">
            <div class="section-head"><h3>${escapeHtml(t("importsResultTitle"))}</h3></div>
            <div class="import-result-grid">
                <div class="callout">${escapeHtml(result.disclaimer)}</div>
                <div class="muted-text">${escapeHtml(result.fileName || t("importsUnnamed"))} · ${escapeHtml(result.extractionMethod)}</div>
                <div class="chip-list">
                    ${(result.matchedFields || []).map((field) => `<span class="chip">${escapeHtml(field)}</span>`).join("") || `<span class='muted-text'>${escapeHtml(t("importsNoMatch"))}</span>`}
                </div>
                ${(result.warnings || []).length ? `
                    <div class="callout danger">
                        ${(result.warnings || []).map((item) => `<div>${escapeHtml(item)}</div>`).join("")}
                    </div>
                ` : ""}
                <div class="two-column">
                    <div class="card">
                        <span class="muted-text">${escapeHtml(t("importsProfileName"))}</span>
                        <strong>${escapeHtml(result.profile?.fullName || "-")}</strong>
                    </div>
                    <div class="card">
                        <span class="muted-text">${escapeHtml(t("importsGeneratedFlag"))}</span>
                        <strong>${result.archivedRecord ? escapeHtml(t("importsGenerated")) : escapeHtml(t("importsNotGenerated"))}</strong>
                    </div>
                </div>
                <div class="card">
                    <div class="section-head"><h4>${escapeHtml(t("importsPreview"))}</h4></div>
                    <div class="ai-answer">${escapeHtml(result.extractedTextPreview || "")}</div>
                </div>
            </div>
        </section>
    `;
}

function renderVisualizationPage() {
    const visualization = state.visualization;
    if (!visualization) {
        return renderEmpty(t("vizLoading"));
    }

    return `
        <div class="page-grid">
            <section class="panel">
                <div class="section-head">
                    <h3>${escapeHtml(t("vizTitle"))}</h3>
                    <button class="btn-ghost" type="button" data-action="refresh-visualization">${escapeHtml(t("vizRefresh"))}</button>
                </div>
                <div class="chart-grid">
                    ${(visualization.series || []).length
                        ? visualization.series.map((series) => renderChartCard(series)).join("")
                        : `<div class="empty-shell full-span">${escapeHtml(t("vizEmpty"))}</div>`}
                </div>
            </section>
            <section class="table-shell">
                <div class="section-head"><h3>${escapeHtml(t("vizRecent"))}</h3></div>
                ${renderRecordsTable(visualization.latestRecords || [], false)}
            </section>
        </div>
    `;
}

function renderAiPage() {
    const detail = state.profileDetail;
    return `
        <div class="page-grid">
            <div class="callout danger">
                ${escapeHtml(t("aiDisclaimer"))}
            </div>
            <section class="panel">
                <div class="section-head"><h3>${escapeHtml(t("aiTitle"))}</h3></div>
                <form id="aiForm" class="page-grid">
                    <label class="form-field">
                        ${escapeHtml(t("aiFocusRecord"))}
                        <select name="focusRecordId">
                            <option value="">${escapeHtml(t("aiDefaultRecord"))}</option>
                            ${(detail.recentRecords || []).map((record) => `
                                <option value="${record.id}">
                                    ${formatDate(record.recordDate)} · ${enumLabels.riskLevel[record.riskLevel] || escapeHtml(t("aiNotEvaluated"))}
                                </option>
                            `).join("")}
                        </select>
                    </label>
                    <label class="form-field full-span">
                        ${escapeHtml(t("aiQuestion"))}
                        <textarea name="question" placeholder="${escapeAttr(t("aiPlaceholder"))}"></textarea>
                    </label>
                    <div class="full-span">
                        <button class="btn" type="submit" ${state.ai.loading ? "disabled" : ""}>
                            ${state.ai.loading ? escapeHtml(t("aiAnalyzing")) : escapeHtml(t("aiSubmit"))}
                        </button>
                    </div>
                </form>
            </section>
            <section class="panel">
                <div class="section-head"><h3>${escapeHtml(t("aiResultTitle"))}</h3></div>
                ${state.ai.result ? `
                    <div class="page-grid">
                        <div class="muted-text">${escapeHtml(t("aiModel"))}${escapeHtml(state.ai.result.model || "-")}</div>
                        <div class="ai-answer">${escapeHtml(state.ai.result.answer || "")}</div>
                        <div class="callout danger">${escapeHtml(state.ai.result.disclaimer || "")}</div>
                    </div>
                ` : `<div class="empty-shell">${escapeHtml(t("aiEmpty"))}</div>`}
            </section>
        </div>
    `;
}

function renderRecordsTable(records, withActions) {
    if (!records || records.length === 0) {
        return renderEmpty(t("recordsEmpty"));
    }

    return `
        <div class="table-wrapper">
            <table>
                <thead>
                <tr>
                    <th>${escapeHtml(t("recordsDate"))}</th>
                    <th>${escapeHtml(t("recordsBp"))}</th>
                    <th>${escapeHtml(t("recordsSugar"))}</th>
                    <th>${escapeHtml(t("recordsWeightBmi"))}</th>
                    <th>${escapeHtml(t("recordsSleepExercise"))}</th>
                    <th>${escapeHtml(t("recordsRisk"))}</th>
                    ${withActions ? `<th>${escapeHtml(t("recordsActions"))}</th>` : ""}
                </tr>
                </thead>
                <tbody>
                ${records.map((record) => `
                    <tr>
                        <td>${formatDate(record.recordDate)}</td>
                        <td>${formatBloodPressure(record.systolicPressure, record.diastolicPressure)}</td>
                        <td>${formatBloodSugar(record.fastingBloodSugar, record.postprandialBloodSugar)}</td>
                        <td>${formatMetric(record.weightKg, "kg")} / ${formatMetric(record.bmi)}</td>
                        <td>${formatMetric(record.sleepHours, "h")} / ${formatMetric(record.exerciseMinutes, "min")}</td>
                        <td>${renderBadge(record.riskLevel, "risk")}</td>
                        ${withActions ? `
                            <td>
                                <div class="table-actions">
                                    <button class="mini-btn" type="button" data-action="open-record-edit" data-id="${record.id}">${escapeHtml(t("edit"))}</button>
                                    <button class="mini-btn danger" type="button" data-action="delete-record" data-id="${record.id}">${escapeHtml(t("del"))}</button>
                                </div>
                            </td>
                        ` : ""}
                    </tr>
                `).join("")}
                </tbody>
            </table>
        </div>
    `;
}

function renderAlertsTable(alerts) {
    if (!alerts || alerts.length === 0) {
        return renderEmpty(t("alertsEmpty"));
    }

    return `
        <div class="table-wrapper">
            <table>
                <thead>
                <tr>
                    <th>${escapeHtml(t("alertsDate"))}</th>
                    <th>${escapeHtml(t("alertsColTitle"))}</th>
                    <th>${escapeHtml(t("alertsColIndicator"))}</th>
                    <th>${escapeHtml(t("alertsColSeverity"))}</th>
                    <th>${escapeHtml(t("alertsColStatus"))}</th>
                    <th>${escapeHtml(t("alertsColSuggestion"))}</th>
                    <th>${escapeHtml(t("alertsColActions"))}</th>
                </tr>
                </thead>
                <tbody>
                ${alerts.map((alert) => `
                    <tr>
                        <td>${formatDate(alert.observedDate)}</td>
                        <td>${escapeHtml(alert.title)}</td>
                        <td>${escapeHtml(alert.indicator || "-")}</td>
                        <td>${renderBadge(alert.severity, "severity")}</td>
                        <td>${renderBadge(alert.status, "status")}</td>
                        <td>${escapeHtml(truncate(alert.suggestion, 64))}</td>
                        <td>
                            <div class="table-actions">
                                <button class="mini-btn warning" type="button" data-action="open-alert-status" data-id="${alert.id}">${escapeHtml(t("alertsHandle"))}</button>
                                <button class="mini-btn danger" type="button" data-action="delete-alert" data-id="${alert.id}">${escapeHtml(t("del"))}</button>
                            </div>
                        </td>
                    </tr>
                `).join("")}
                </tbody>
            </table>
        </div>
    `;
}

function renderAlertFeed(alerts) {
    if (!alerts || alerts.length === 0) {
        return renderEmpty(t("alertsFeedEmpty"));
    }
    return `
        <div class="feed-list">
            ${alerts.map((alert) => `
                <div class="feed-item">
                    <div class="table-actions">
                        ${renderBadge(alert.severity, "severity")}
                        ${renderBadge(alert.status, "status")}
                    </div>
                    <h4>${escapeHtml(alert.title)}</h4>
                    <div class="muted-text">${formatDate(alert.observedDate)}</div>
                    <p>${escapeHtml(alert.suggestion || "")}</p>
                </div>
            `).join("")}
        </div>
    `;
}

function renderChartCard(series) {
    const path = buildChartPath(series.points || []);
    const metricLabel = series.metricCode
        ? t(`vizMetric.${series.metricCode}`)
        : series.metricName;
    const hasLabel = metricLabel !== `vizMetric.${series.metricCode}`;
    return `
        <div class="chart-card">
            <div class="section-head">
                <div>
                    <h4>${escapeHtml(hasLabel ? metricLabel : series.metricName)}</h4>
                    <p>${escapeHtml(series.unit || "")}</p>
                </div>
            </div>
            <div class="chart-meta">
                <span>${escapeHtml(t("vizLatest"))} ${formatMetric(series.latestValue, series.unit)}</span>
                <span>${escapeHtml(t("vizAverage"))} ${formatMetric(series.averageValue, series.unit)}</span>
            </div>
            <svg viewBox="0 0 320 160" preserveAspectRatio="none" aria-hidden="true">
                <polyline points="${path}" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"></polyline>
            </svg>
        </div>
    `;
}

function renderPagination(data, prefix) {
    return `
        <div class="pagination">
            <span class="muted-text">${escapeHtml(t("pageInfo", { page: data.page, totalPages: data.totalPages, totalItems: data.totalItems }))}</span>
            <div class="table-actions">
                <button class="btn-ghost" type="button" data-action="${prefix}-prev" ${data.page <= 1 ? "disabled" : ""}>${escapeHtml(t("pagePrev"))}</button>
                <button class="btn-ghost" type="button" data-action="${prefix}-next" ${data.page >= data.totalPages ? "disabled" : ""}>${escapeHtml(t("pageNext"))}</button>
            </div>
        </div>
    `;
}

function renderEmpty(text) {
    return `<div class="empty-shell">${escapeHtml(text)}</div>`;
}

async function handleClick(event) {
    const button = event.target.closest("[data-action]");
    if (!button) {
        return;
    }

    const { action, route, mode, id } = button.dataset;

    try {
        switch (action) {
            case "auth-tab":
                state.authMode = mode;
                render();
                break;
            case "toggle-language":
                toggleLanguage();
                break;
            case "navigate":
                window.location.hash = route;
                break;
            case "logout":
                await api("/api/auth/logout", { method: "POST" });
                resetToAuth();
                break;
            case "refresh-dashboard":
                await loadDashboard();
                render();
                break;
            case "refresh-visualization":
                await loadVisualization();
                render();
                break;
            case "open-record-create":
                openRecordModal();
                break;
            case "open-record-edit":
                openRecordModal(findRecordById(Number(id)));
                break;
            case "delete-record":
                await deleteRecord(Number(id));
                break;
            case "records-prev":
                state.records.page -= 1;
                await loadRecords();
                render();
                break;
            case "records-next":
                state.records.page += 1;
                await loadRecords();
                render();
                break;
            case "open-alert-status":
                openAlertModal(findAlertById(Number(id)));
                break;
            case "delete-alert":
                await deleteAlert(Number(id));
                break;
            case "alerts-prev":
                state.alerts.page -= 1;
                await loadAlerts();
                render();
                break;
            case "alerts-next":
                state.alerts.page += 1;
                await loadAlerts();
                render();
                break;
            case "close-modal":
                closeModal();
                break;
            default:
                break;
        }
    } catch (error) {
        handleError(error);
    }
}

async function handleSubmit(event) {
    try {
        switch (event.target.id) {
            case "loginForm":
                event.preventDefault();
                await submitLogin(event.target);
                break;
            case "registerForm":
                event.preventDefault();
                await submitRegister(event.target);
                break;
            case "profileForm":
                event.preventDefault();
                await submitProfile(event.target);
                break;
            case "recordForm":
                event.preventDefault();
                await submitRecord(event.target);
                break;
            case "alertForm":
                event.preventDefault();
                await submitAlert(event.target);
                break;
            case "importForm":
                event.preventDefault();
                await submitImport(event.target);
                break;
            case "aiForm":
                event.preventDefault();
                await submitAi(event.target);
                break;
            default:
                break;
        }
    } catch (error) {
        handleError(error);
    }
}

async function handleChange(event) {
    try {
        if (event.target.id === "recordRiskFilter") {
            state.records.riskLevel = event.target.value;
            state.records.page = 1;
            await loadRecords();
            render();
        }
        if (event.target.id === "alertStatusFilter") {
            state.alerts.status = event.target.value;
            state.alerts.page = 1;
            await loadAlerts();
            render();
        }
        if (event.target.id === "alertSeverityFilter") {
            state.alerts.severity = event.target.value;
            state.alerts.page = 1;
            await loadAlerts();
            render();
        }
    } catch (error) {
        handleError(error);
    }
}

async function submitLogin(form) {
    const payload = formToJson(form);
    const session = await api("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(payload)
    });
    state.session = session;
    state.importResult = null;
    state.ai.result = null;
    syncRoute();
    await loadAllData({ tolerateErrors: true });
    render();
    showToast(t("toastLoginOk"));
}

async function submitRegister(form) {
    const payload = formToJson(form);
    const session = await api("/api/auth/register", {
        method: "POST",
        body: JSON.stringify(payload)
    });
    state.session = session;
    state.importResult = null;
    state.ai.result = null;
    syncRoute();
    await loadAllData({ tolerateErrors: true });
    render();
    showToast(t("toastRegisterOk"));
}

async function submitProfile(form) {
    await api("/api/profile", {
        method: "PUT",
        body: JSON.stringify(formToJson(form, ["age"], ["heightCm", "weightKg"]))
    });
    await loadAllData({ tolerateErrors: true });
    render();
    showToast(t("toastProfileSaved"));
}

async function submitRecord(form) {
    const formData = formToJson(
        form,
        ["systolicPressure", "diastolicPressure", "heartRate", "exerciseMinutes", "stepsCount", "waterIntakeMl", "stressLevel", "moodScore"],
        ["weightKg", "waistCircumferenceCm", "fastingBloodSugar", "postprandialBloodSugar", "bodyTemperature", "bloodOxygen", "cholesterolTotal", "sleepHours"]
    );
    const recordId = form.dataset.recordId;
    const url = recordId ? `/api/records/${recordId}` : "/api/records";
    const method = recordId ? "PUT" : "POST";
    await api(url, { method, body: JSON.stringify(formData) });
    closeModal();
    await loadAllData({ tolerateErrors: true });
    render();
    showToast(recordId ? t("toastRecordUpdated") : t("toastRecordSaved"));
}

async function submitAlert(form) {
    const alertId = form.dataset.alertId;
    await api(`/api/alerts/${alertId}/status`, {
        method: "PUT",
        body: JSON.stringify(formToJson(form))
    });
    closeModal();
    await loadAllData({ tolerateErrors: true });
    render();
    showToast(t("toastAlertUpdated"));
}

async function submitImport(form) {
    const payload = new FormData(form);
    const result = await api("/api/imports/health-document", {
        method: "POST",
        body: payload,
        isMultipart: true
    });
    state.importResult = result;
    await loadAllData({ tolerateErrors: true });
    render();
    showToast(t("toastImportDone"));
}

async function submitAi(form) {
    state.ai.loading = true;
    render();
    const payload = formToJson(form, ["focusRecordId"]);
    if (!payload.focusRecordId) {
        payload.focusRecordId = null;
    }
    state.ai.result = await api("/api/ai/analysis", {
        method: "POST",
        body: JSON.stringify(payload)
    });
    state.ai.loading = false;
    render();
    showToast(t("toastAiDone"));
}

function openRecordModal(record = null) {
    const recordData = record || {};
    openModal(`
        <div class="section-head">
            <h3>${record ? escapeHtml(t("modalEditRecord")) : escapeHtml(t("modalCreateRecord"))}</h3>
            <button class="btn-ghost" type="button" data-action="close-modal">${escapeHtml(t("modalClose"))}</button>
        </div>
        <form id="recordForm" class="form-grid" data-record-id="${record?.id || ""}">
            ${renderRecordFields(recordData)}
            <div class="full-span">
                <button class="btn" type="submit">${record ? escapeHtml(t("modalSaveChanges")) : escapeHtml(t("modalSaveRecord"))}</button>
            </div>
        </form>
    `);
}

function openAlertModal(alert) {
    if (!alert) {
        showToast(t("toastAlertNotFound"), true);
        return;
    }
    openModal(`
        <div class="section-head">
            <h3>${escapeHtml(t("modalUpdateAlert"))}</h3>
            <button class="btn-ghost" type="button" data-action="close-modal">${escapeHtml(t("modalClose"))}</button>
        </div>
        <form id="alertForm" class="page-grid" data-alert-id="${alert.id}">
            <div class="muted-text">${escapeHtml(alert.title)}</div>
            <label class="form-field">
                ${escapeHtml(t("modalStatus"))}
                <select name="status">
                    ${renderSelectOptions(enumLabels.alertStatus, alert.status)}
                </select>
            </label>
            <label class="form-field">
                ${escapeHtml(t("modalNote"))}
                <textarea name="handledNote">${escapeHtml(alert.handledNote || "")}</textarea>
            </label>
            <button class="btn" type="submit">${escapeHtml(t("modalSaveStatus"))}</button>
        </form>
    `);
}

function renderRecordFields(record = {}) {
    return `
        <label class="form-field"><span>${escapeHtml(t("recFieldDate"))}</span><input name="recordDate" type="date" value="${escapeAttr(record.recordDate || todayString())}" required></label>
        <label class="form-field"><span>${escapeHtml(t("recFieldWeight"))}</span><input name="weightKg" type="number" step="0.01" min="20" max="300" value="${escapeAttr(record.weightKg ?? "")}"></label>
        <label class="form-field"><span>${escapeHtml(t("recFieldWaist"))}</span><input name="waistCircumferenceCm" type="number" step="0.01" min="40" max="200" value="${escapeAttr(record.waistCircumferenceCm ?? "")}"></label>
        <label class="form-field"><span>${escapeHtml(t("recFieldSystolic"))}</span><input name="systolicPressure" type="number" min="40" max="250" value="${escapeAttr(record.systolicPressure ?? "")}"></label>
        <label class="form-field"><span>${escapeHtml(t("recFieldDiastolic"))}</span><input name="diastolicPressure" type="number" min="30" max="180" value="${escapeAttr(record.diastolicPressure ?? "")}"></label>
        <label class="form-field"><span>${escapeHtml(t("recFieldHeartRate"))}</span><input name="heartRate" type="number" min="30" max="220" value="${escapeAttr(record.heartRate ?? "")}"></label>
        <label class="form-field"><span>${escapeHtml(t("recFieldFastingSugar"))}</span><input name="fastingBloodSugar" type="number" step="0.01" min="2" max="30" value="${escapeAttr(record.fastingBloodSugar ?? "")}"></label>
        <label class="form-field"><span>${escapeHtml(t("recFieldPostprandialSugar"))}</span><input name="postprandialBloodSugar" type="number" step="0.01" min="2" max="30" value="${escapeAttr(record.postprandialBloodSugar ?? "")}"></label>
        <label class="form-field"><span>${escapeHtml(t("recFieldTemperature"))}</span><input name="bodyTemperature" type="number" step="0.1" min="34" max="43" value="${escapeAttr(record.bodyTemperature ?? "")}"></label>
        <label class="form-field"><span>${escapeHtml(t("recFieldOxygen"))}</span><input name="bloodOxygen" type="number" step="0.1" min="70" max="100" value="${escapeAttr(record.bloodOxygen ?? "")}"></label>
        <label class="form-field"><span>${escapeHtml(t("recFieldCholesterol"))}</span><input name="cholesterolTotal" type="number" step="0.01" min="2" max="15" value="${escapeAttr(record.cholesterolTotal ?? "")}"></label>
        <label class="form-field"><span>${escapeHtml(t("recFieldSleep"))}</span><input name="sleepHours" type="number" step="0.1" min="0" max="24" value="${escapeAttr(record.sleepHours ?? "")}"></label>
        <label class="form-field"><span>${escapeHtml(t("recFieldExercise"))}</span><input name="exerciseMinutes" type="number" min="0" max="1440" value="${escapeAttr(record.exerciseMinutes ?? "")}"></label>
        <label class="form-field"><span>${escapeHtml(t("recFieldSteps"))}</span><input name="stepsCount" type="number" min="0" max="100000" value="${escapeAttr(record.stepsCount ?? "")}"></label>
        <label class="form-field"><span>${escapeHtml(t("recFieldWater"))}</span><input name="waterIntakeMl" type="number" min="0" max="10000" value="${escapeAttr(record.waterIntakeMl ?? "")}"></label>
        <label class="form-field"><span>${escapeHtml(t("recFieldStress"))}</span><input name="stressLevel" type="number" min="1" max="10" value="${escapeAttr(record.stressLevel ?? "")}"></label>
        <label class="form-field"><span>${escapeHtml(t("recFieldMood"))}</span><input name="moodScore" type="number" min="1" max="10" value="${escapeAttr(record.moodScore ?? "")}"></label>
        <label class="form-field full-span"><span>${escapeHtml(t("recFieldSymptoms"))}</span><textarea name="symptoms">${escapeHtml(record.symptoms || "")}</textarea></label>
        <label class="form-field full-span"><span>${escapeHtml(t("recFieldMedication"))}</span><textarea name="medicationTaken">${escapeHtml(record.medicationTaken || "")}</textarea></label>
        <label class="form-field full-span"><span>${escapeHtml(t("recFieldNotes"))}</span><textarea name="notes">${escapeHtml(record.notes || "")}</textarea></label>
    `;
}

function openModal(html) {
    elements.modalPanel.innerHTML = html;
    elements.modalBackdrop.hidden = false;
    document.body.classList.add("modal-open");
}

function closeModal() {
    elements.modalPanel.innerHTML = "";
    elements.modalBackdrop.hidden = true;
    document.body.classList.remove("modal-open");
}

function findRecordById(id) {
    return state.records.items.find((item) => item.id === id)
        || state.profileDetail.recentRecords.find((item) => item.id === id)
        || state.visualization?.latestRecords?.find((item) => item.id === id)
        || null;
}

function findAlertById(id) {
    return state.alerts.items.find((item) => item.id === id)
        || state.profileDetail.recentAlerts.find((item) => item.id === id)
        || null;
}

async function deleteRecord(id) {
    if (!window.confirm(t("confirmDeleteRecord"))) {
        return;
    }
    await api(`/api/records/${id}`, { method: "DELETE" });
    await loadAllData({ tolerateErrors: true });
    render();
    showToast(t("toastRecordDeleted"));
}

async function deleteAlert(id) {
    if (!window.confirm(t("confirmDeleteAlert"))) {
        return;
    }
    await api(`/api/alerts/${id}`, { method: "DELETE" });
    await loadAllData({ tolerateErrors: true });
    render();
    showToast(t("toastAlertDeleted"));
}

function resetToAuth() {
    state.session = null;
    state.dashboard = null;
    state.visualization = null;
    state.importResult = null;
    state.ai = { loading: false, result: null };
    state.route = "dashboard";
    window.location.hash = "";
    render();
}

async function api(url, options = {}) {
    const config = {
        method: options.method || "GET",
        body: options.body,
        credentials: "same-origin",
        headers: options.isMultipart ? {} : { ...(options.body ? { "Content-Type": "application/json" } : {}) }
    };

    const response = await fetch(url, config);
    if (response.status === 204) {
        return null;
    }

    const text = await response.text();
    const data = text ? safeJsonParse(text) : null;

    if (!response.ok) {
        if (response.status === 401 && !options.suppressUnauthorizedRedirect) {
            resetToAuth();
        }
        const details = data?.details ? Object.values(data.details).join("；") : "";
        const message = data?.message || t("toastRequestFailed");
        throw new Error(details ? `${message}：${details}` : message);
    }

    return data;
}

function formToJson(form, integerFields = [], decimalFields = []) {
    const formData = new FormData(form);
    const payload = {};
    for (const [key, value] of formData.entries()) {
        if (value instanceof File) {
            payload[key] = value;
            continue;
        }
        const normalized = value.trim();
        if (integerFields.includes(key)) {
            payload[key] = normalized ? Number.parseInt(normalized, 10) : null;
        } else if (decimalFields.includes(key)) {
            payload[key] = normalized ? Number.parseFloat(normalized) : null;
        } else {
            payload[key] = normalized || null;
        }
    }
    return payload;
}

function renderSelectOptions(labels, selected) {
    return Object.entries(labels).map(([value, label]) => `
        <option value="${escapeAttr(value)}" ${selected === value ? "selected" : ""}>${escapeHtml(label)}</option>
    `).join("");
}

function renderBadge(value, type) {
    if (!value) {
        return '<span class="badge low">-</span>';
    }
    const labelMap = type === "risk" ? enumLabels.riskLevel : type === "status" ? enumLabels.alertStatus : enumLabels.alertSeverity;
    let className = "low";
    if (value === "MEDIUM" || value === "REVIEWED") {
        className = "medium";
    } else if (value === "HIGH" || value === "PENDING") {
        className = "high";
    } else if (value === "CRITICAL") {
        className = "critical";
    }
    return `<span class="badge ${className}">${escapeHtml(labelMap[value] || value)}</span>`;
}

function buildChartPath(points) {
    if (!points || points.length === 0) {
        return "";
    }
    const values = points.map((item) => Number(item.value));
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const width = 320;
    const height = 160;
    const padding = 16;
    const step = points.length > 1 ? (width - padding * 2) / (points.length - 1) : 0;
    return points.map((item, index) => {
        const x = padding + step * index;
        const y = height - padding - ((Number(item.value) - min) / range) * (height - padding * 2);
        return `${x},${y}`;
    }).join(" ");
}

function formatBloodPressure(systolic, diastolic) {
    if (systolic == null && diastolic == null) {
        return "-";
    }
    return `${systolic ?? "-"} / ${diastolic ?? "-"}`;
}

function formatBloodSugar(fasting, postprandial) {
    if (fasting == null && postprandial == null) {
        return "-";
    }
    return `${escapeHtml(t("bloodSugarFasting"))} ${formatMetric(fasting, "mmol/L")} / ${escapeHtml(t("bloodSugarPostprandial"))} ${formatMetric(postprandial, "mmol/L")}`;
}

function formatMetric(value, unit = "") {
    if (value == null || value === "") {
        return "-";
    }
    const normalized = typeof value === "number" ? value : Number(value);
    const locale = langState.lang === "en" ? "en-US" : "zh-CN";
    const text = Number.isFinite(normalized)
        ? new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(normalized)
        : String(value);
    return unit ? `${text} ${unit}` : text;
}

function formatSignedMetric(value, unit = "") {
    if (value == null || value === "") {
        return "-";
    }
    const number = Number(value);
    const prefix = number > 0 ? "+" : "";
    return `${prefix}${formatMetric(number, unit)}`;
}

function formatDate(value) {
    return value ? String(value).slice(0, 10) : "-";
}

function truncate(value, length) {
    if (!value) {
        return "-";
    }
    return value.length > length ? `${value.slice(0, length)}...` : value;
}

function todayString() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function safeJsonParse(text) {
    try {
        return JSON.parse(text);
    } catch (error) {
        return null;
    }
}

function handleError(error) {
    state.ai.loading = false;
    if (elements.app) {
        render();
    }
    showToast(error.message || t("toastOpFailed"), true);
}

function showToast(message, isError = false) {
    elements.toast.textContent = message;
    elements.toast.style.background = isError ? "rgba(181, 63, 56, 0.96)" : "rgba(102, 187, 106, 0.96)";
    elements.toast.classList.add("visible");
    clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => {
        elements.toast.classList.remove("visible");
    }, 2600);
}

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

function escapeAttr(value) {
    return escapeHtml(value);
}
