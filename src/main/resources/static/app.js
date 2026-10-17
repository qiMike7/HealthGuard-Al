/* 枚举标签与语言管理由 i18n.js 提供（enumLabels / t / setLanguage / toggleLanguage） */

const routes = [
    { key: "dashboard", icon: "🏥" },
    { key: "profile", icon: "👤" },
    { key: "records", icon: "📋" },
    { key: "alerts", icon: "🚨" },
    { key: "register", icon: "🩺" },
    { key: "imports", icon: "📄" },
    { key: "visualization", icon: "📊" },
    { key: "ai", icon: "🤖" }
];

const routeMeta = {
    dashboard: { subtitle: "" },
    profile: { subtitle: "" },
    records: { subtitle: "" },
    alerts: { subtitle: "" },
    register: { subtitle: "" },
    imports: { subtitle: "" },
    visualization: { subtitle: "" },
    ai: { subtitle: "" }
};

const state = {
    session: null,
    authMode: "login",
    route: "dashboard",
    pendingRecordModal: false,
    pendingTriage: false,
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
    register: {
        recordId: "",
        loading: false,
        triage: null,
        orders: {
            items: [],
            page: 1,
            size: 10,
            totalItems: 0,
            totalPages: 1,
            status: ""
        },
        stats: null
    },
    visualization: null,
    importResult: null,
    ai: {
        loading: false,
        messages: [],
        focusRecordId: ""
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
    document.addEventListener("keydown", handleKeydown);
    window.addEventListener("hashchange", handleHashRoute);
    elements.modalBackdrop.addEventListener("click", (event) => {
        if (event.target === elements.modalBackdrop) {
            closeModal();
        }
    });
}

/* AI 医生对话输入框：回车发送、Shift+回车换行 */
function handleKeydown(event) {
    const target = event.target;
    if (!target || target.name !== "question" || !target.closest) {
        return;
    }
    const form = target.closest("#aiChatForm");
    if (form && event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        form.requestSubmit();
    }
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
        if (state.pendingRecordModal) {
            state.pendingRecordModal = false;
            openRecordModal();
        }
        if (state.pendingTriage) {
            state.pendingTriage = false;
            await runTriage();
        }
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
        case "register":
            await loadRegisterData();
            break;
        case "visualization":
            await Promise.all([loadVisualization(), loadDashboard().catch(() => {})]);
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

async function loadRegisterData() {
    await loadProfileDetail().catch(() => {});
    await Promise.all([loadRegistrationOrders(), loadRegistrationStats(), loadDashboard().catch(() => {})]);
}

async function loadRegistrationOrders() {
    const params = new URLSearchParams({
        page: String(state.register.orders.page),
        size: String(state.register.orders.size)
    });
    if (state.register.orders.status) {
        params.set("status", state.register.orders.status);
    }
    const data = await api(`/api/registration/orders?${params.toString()}`);
    Object.assign(state.register.orders, data);
}

async function loadRegistrationStats() {
    state.register.stats = await api("/api/registration/stats");
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
    const displayName = state.session?.displayName || state.session?.username || "";
    const avatarChar = displayName.trim().charAt(0) || "👤";
    elements.app.innerHTML = `
        <div class="app-shell">
            <header class="topnav">
                <div class="topnav-brand" data-action="navigate" data-route="dashboard" title="${escapeHtml(t("home.backHome"))}">
                    <span class="topnav-logo">🏥</span>
                    <div class="topnav-brand-text">
                        <strong>${escapeHtml(t("brand"))}</strong>
                        <span>${escapeHtml(t("brandSub"))}</span>
                    </div>
                </div>
                <nav class="topnav-links">
                    ${routes.map((item) => `
                        <button class="topnav-link ${item.key === state.route ? "active" : ""}" type="button"
                                data-action="navigate" data-route="${item.key}">
                            <span class="nav-icon">${item.icon}</span>
                            <span>${escapeHtml(t(`nav.${item.key}`))}</span>
                        </button>
                    `).join("")}
                </nav>
                <div class="topnav-user">
                    <button class="lang-switch" type="button" data-action="toggle-language" aria-label="switch language">🌐 ${escapeHtml(t("langBtn"))}</button>
                    <div class="topnav-user-chip">
                        <span class="topnav-avatar">${escapeHtml(avatarChar)}</span>
                        <span>${escapeHtml(displayName)}</span>
                    </div>
                    <button class="topnav-logout" type="button" data-action="logout">${escapeHtml(t("logout"))}</button>
                </div>
            </header>
            <main class="app-main">
                ${state.route === "dashboard" ? "" : `
                <div class="topbar">
                    <div>
                        <h2>${escapeHtml(t(`meta.${state.route}`))}</h2>
                        ${meta.subtitle ? `<p>${escapeHtml(meta.subtitle)}</p>` : ""}
                    </div>
                    <div class="topbar-actions">
                        <button class="btn-secondary" type="button" data-action="navigate" data-route="dashboard">← ${escapeHtml(t("home.backHome"))}</button>
                    </div>
                </div>`}
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
        const iconMap = { PDF: "📕", DOC: "📘", DOCX: "📘", PNG: "🖼️", JPG: "🖼️", JPEG: "🖼️", BMP: "🖼️", TXT: "📝" };
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
            const acceptedTypes = [".pdf", ".doc", ".docx", ".png", ".jpg", ".jpeg", ".bmp", ".txt"];
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
        case "register":
            return renderRegisterPage();
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

/* 首页问候语中的今日日期（跟随界面语言） */
function formatToday() {
    const locale = langState.lang === "en" ? "en-US" : "zh-CN";
    return new Date().toLocaleDateString(locale, { year: "numeric", month: "long", day: "numeric", weekday: "long" });
}

function renderDashboardPage() {
    const dashboard = state.dashboard;
    if (!dashboard) {
        return renderEmpty(t("dashLoading"));
    }

    const displayName = state.session?.displayName || state.session?.username || "";
    const features = [
        { route: "imports", tint: "tint-purple", icon: "📥", title: t("home.fImportsTitle"), line1: t("home.fImportsLine1"), line2: t("home.fImportsLine2") },
        { route: "register", tint: "tint-blue", icon: "🩺", title: t("home.fRegisterTitle"), line1: t("home.fRegisterLine1"), line2: t("home.fRegisterLine2") },
        { route: "alerts", tint: "tint-amber", icon: "🚨", title: t("home.fAlertsTitle"), line1: t("home.fAlertsLine1"), line2: t("home.fAlertsLine2") },
        { route: "profile", tint: "tint-green", icon: "🗂️", title: t("home.fProfileTitle"), line1: t("home.fProfileLine1"), line2: t("home.fProfileLine2") }
    ];
    const quickTiles = [
        { route: "ai", icon: "🤖", label: t("home.qDoctor") },
        { route: "records", icon: "📋", label: t("home.qRecords") },
        { route: "visualization", icon: "📊", label: t("home.qViz") },
        { action: "goto-record-create", icon: "✏️", label: t("home.qCreate") },
        { action: "export-data", icon: "💾", label: t("home.qExport") },
        { action: "about-app", icon: "ℹ️", label: t("home.qAbout") }
    ];
    const registration = dashboard.upcomingRegistration;

    return `
        <div class="page-grid home-grid">
            <section class="home-hero">
                <div class="hero-body">
                    <div class="hero-welcome">👋 ${escapeHtml(t("home.welcome"))}</div>
                    <h1 class="hero-greeting">Hi，${escapeHtml(displayName)}</h1>
                    <p class="hero-sub">${escapeHtml(formatToday())} · ${escapeHtml(t("home.heroTip"))}</p>
                    <div class="hero-actions">
                        <button class="hero-btn hero-btn-solid" type="button" data-action="navigate" data-route="ai">🤖 ${escapeHtml(t("home.heroAiBtn"))}</button>
                        <button class="hero-btn" type="button" data-action="goto-record-create">📋 ${escapeHtml(t("home.heroRecordBtn"))}</button>
                    </div>
                    ${registration ? `
                    <div class="hero-reminder">
                        <span class="hero-reminder-icon">📅</span>
                        <div class="hero-reminder-text">
                            <strong>${escapeHtml(t("home.reminderTitle"))}${registration.upcomingCount > 1 ? escapeHtml(t("home.reminderMore", { count: registration.upcomingCount })) : ""}</strong>
                            <span>${escapeHtml(t("home.reminderBody", {
                                dept: registration.departmentName || "-",
                                doctor: registration.doctorName ? ` · ${registration.doctorName}` : "",
                                date: formatDate(registration.appointmentDate),
                                period: registration.periodLabel || ""
                            }))}</span>
                        </div>
                        <button class="hero-reminder-btn" type="button" data-action="navigate" data-route="register">${escapeHtml(t("home.reminderGo"))} →</button>
                    </div>` : ""}
                </div>
                <div class="hero-mascot" aria-hidden="true"><span>🩺</span></div>
                <div class="hero-stats">
                    <button class="hero-stat" type="button" data-action="navigate" data-route="profile">
                        <span>📑 ${escapeHtml(t("dashProfile"))}</span>
                        <strong>${dashboard.profileCompletionScore ?? 0}%</strong>
                    </button>
                    <button class="hero-stat" type="button" data-action="navigate" data-route="records">
                        <span>💊 ${escapeHtml(t("dashRecords"))}</span>
                        <strong>${dashboard.totalRecords ?? 0}</strong>
                    </button>
                    <button class="hero-stat ${(dashboard.pendingAlerts ?? 0) > 0 ? "hero-stat-warn" : ""}" type="button" data-action="navigate" data-route="alerts">
                        <span>⚠️ ${escapeHtml(t("dashPendingAlerts"))}</span>
                        <strong>${dashboard.pendingAlerts ?? 0}</strong>
                    </button>
                    <button class="hero-stat" type="button" data-action="navigate" data-route="records">
                        <span>🩺 ${escapeHtml(t("dashLatestRisk"))}</span>
                        <strong>${dashboard.latestRiskLevel ? enumLabels.riskLevel[dashboard.latestRiskLevel] : escapeHtml(t("dashNone"))}</strong>
                    </button>
                </div>
            </section>

            ${!dashboard.profileExists ? `
                <div class="callout">
                    ${escapeHtml(t("dashProfileMissing"))}
                    <button class="mini-btn" type="button" data-action="navigate" data-route="profile" style="margin-left:10px;">${escapeHtml(t("home.qProfile"))}</button>
                </div>
            ` : ""}

            <section class="home-section">
                <div class="section-head">
                    <h3>${escapeHtml(t("home.featureTitle"))}</h3>
                    <span class="home-section-hint">${escapeHtml(t("home.featureHint"))}</span>
                </div>
                <div class="feature-grid">
                    ${features.map((item) => `
                        <button class="feature-card ${item.tint}" type="button" data-action="navigate" data-route="${item.route}">
                            <span class="feature-icon">${item.icon}</span>
                            <strong class="feature-title">${escapeHtml(item.title)}</strong>
                            <span class="feature-line">${escapeHtml(item.line1)}</span>
                            <span class="feature-line">${escapeHtml(item.line2)}</span>
                            <span class="feature-go">${escapeHtml(t("home.fGo"))} →</span>
                        </button>
                    `).join("")}
                </div>
            </section>

            <section class="panel home-quick">
                <div class="section-head"><h3>${escapeHtml(t("home.quickTitle"))}</h3></div>
                <div class="quick-grid">
                    ${quickTiles.map((tile) => `
                        <button class="quick-tile" type="button" ${tile.route ? `data-action="navigate" data-route="${tile.route}"` : `data-action="${tile.action}"`}>
                            <span class="quick-icon">${tile.icon}</span>
                            <span>${escapeHtml(tile.label)}</span>
                        </button>
                    `).join("")}
                </div>
            </section>

            <section class="home-section">
                <div class="section-head"><h3>${escapeHtml(t("home.activityTitle"))}</h3></div>
                <div class="activity-grid">
                    <section class="table-shell">
                        <div class="section-head">
                            <h3>${escapeHtml(t("dashRecentRecords"))}</h3>
                            <button class="mini-btn" type="button" data-action="navigate" data-route="records">${escapeHtml(t("home.viewAll"))} →</button>
                        </div>
                        ${renderRecordsTable(dashboard.recentRecords || [], false)}
                    </section>
                    <div class="activity-side">
                        <section class="panel">
                            <div class="section-head">
                                <h3>${escapeHtml(t("dashRecentAlerts"))}</h3>
                                <button class="mini-btn" type="button" data-action="navigate" data-route="alerts">${escapeHtml(t("home.viewAll"))} →</button>
                            </div>
                            ${renderAlertFeed((dashboard.recentAlerts || []).slice(0, 2))}
                        </section>
                    </div>
                </div>
            </section>
        </div>
    `;
}

/* 风险分布进度条（首页健康动态区复用） */
function renderRiskBars(dashboard) {
    const total = dashboard.totalRecords || 0;
    return `
        <div class="risk-bars">
            ${["LOW", "MEDIUM", "HIGH", "CRITICAL"].map((level) => {
                const count = dashboard.riskDistribution?.[level] ?? 0;
                const width = total > 0 ? Math.max((count / total) * 100, count > 0 ? 6 : 0) : 0;
                return `
                    <div class="risk-bar">
                        <div class="risk-bar-head">
                            <strong>${enumLabels.riskLevel[level]}</strong>
                            <span class="home-section-hint">${count} ${escapeHtml(t("dashCountSuffix"))}</span>
                        </div>
                        <div class="risk-track"><span style="width:${width}%"></span></div>
                    </div>
                `;
            }).join("")}
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
    const byName = { "体重": "trendMetric.weight", "收缩压": "trendMetric.systolic", "空腹血糖": "trendMetric.glucose", "低密度脂蛋白": "trendMetric.ldl", "谷丙转氨酶": "trendMetric.alt", "风险分数": "trendMetric.risk" };
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

/* 必填/选填标签：计入档案完整度的字段标必填，其余标选填 */
function fieldTag(required) {
    return `<em class="field-tag ${required ? "req" : "opt"}">${escapeHtml(t(required ? "fields.req" : "fields.opt"))}</em>`;
}

function renderProfileFields(profile) {
    return `
        <label class="form-field">
            <span class="field-label">${escapeHtml(t("fields.fullName"))}${fieldTag(true)}</span>
            <input name="fullName" type="text" value="${escapeAttr(profile.fullName || "")}" required>
        </label>
        <label class="form-field">
            <span class="field-label">${escapeHtml(t("fields.gender"))}${fieldTag(true)}</span>
            <select name="gender">
                <option value="">${escapeHtml(t("fields.select"))}</option>
                ${renderSelectOptions(enumLabels.gender, profile.gender || "")}
            </select>
        </label>
        <label class="form-field">
            <span class="field-label">${escapeHtml(t("fields.age"))}${fieldTag(true)}</span>
            <input name="age" type="number" min="1" max="120" value="${escapeAttr(profile.age ?? "")}">
        </label>
        <label class="form-field">
            <span class="field-label">${escapeHtml(t("fields.birthDate"))}${fieldTag(true)}</span>
            <input name="birthDate" type="date" value="${escapeAttr(profile.birthDate || "")}">
        </label>
        <label class="form-field">
            <span class="field-label">${escapeHtml(t("fields.bloodType"))}${fieldTag(true)}</span>
            <select name="bloodType">
                <option value="">${escapeHtml(t("fields.select"))}</option>
                ${renderSelectOptions(enumLabels.bloodType, profile.bloodType || "")}
            </select>
        </label>
        <label class="form-field">
            <span class="field-label">${escapeHtml(t("fields.phone"))}${fieldTag(true)}</span>
            <input name="phone" type="text" value="${escapeAttr(profile.phone || "")}">
        </label>
        <label class="form-field">
            <span class="field-label">${escapeHtml(t("fields.height"))}${fieldTag(true)}</span>
            <input name="heightCm" type="number" step="0.01" min="50" max="250" value="${escapeAttr(profile.heightCm ?? "")}">
        </label>
        <label class="form-field">
            <span class="field-label">${escapeHtml(t("fields.weight"))}${fieldTag(true)}</span>
            <input name="weightKg" type="number" step="0.01" min="20" max="300" value="${escapeAttr(profile.weightKg ?? "")}">
        </label>
        <label class="form-field full-span"><span class="field-label">${escapeHtml(t("fields.familyHistory"))}${fieldTag(false)}</span><textarea name="familyHistory">${escapeHtml(profile.familyHistory || "")}</textarea></label>
        <label class="form-field full-span"><span class="field-label">${escapeHtml(t("fields.chronic"))}${fieldTag(true)}</span><textarea name="chronicDiseases">${escapeHtml(profile.chronicDiseases || "")}</textarea></label>
        <label class="form-field full-span"><span class="field-label">${escapeHtml(t("fields.allergies"))}${fieldTag(false)}</span><textarea name="allergies">${escapeHtml(profile.allergies || "")}</textarea></label>
        <label class="form-field full-span"><span class="field-label">${escapeHtml(t("fields.medications"))}${fieldTag(true)}</span><textarea name="currentMedications">${escapeHtml(profile.currentMedications || "")}</textarea></label>
        <label class="form-field full-span"><span class="field-label">${escapeHtml(t("fields.surgery"))}${fieldTag(false)}</span><textarea name="surgeryHistory">${escapeHtml(profile.surgeryHistory || "")}</textarea></label>
        <label class="form-field">
            <span class="field-label">${escapeHtml(t("fields.emergencyContact"))}${fieldTag(false)}</span>
            <input name="emergencyContact" type="text" value="${escapeAttr(profile.emergencyContact || "")}">
        </label>
        <label class="form-field">
            <span class="field-label">${escapeHtml(t("fields.emergencyPhone"))}${fieldTag(false)}</span>
            <input name="emergencyContactPhone" type="text" value="${escapeAttr(profile.emergencyContactPhone || "")}">
        </label>
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

function renderRegisterPage() {
    const detail = state.profileDetail || {};
    const records = detail.recentRecords || [];
    return `
        <div class="page-grid">
            <section class="panel">
                <div class="section-head"><h3>${escapeHtml(t("register.title"))}</h3></div>
                <p class="muted-text">${escapeHtml(t("register.hint"))}</p>
                <div class="toolbar">
                    <label>
                        ${escapeHtml(t("register.recordLabel"))}
                        <select id="registerRecordSelect">
                            <option value="">${escapeHtml(t("register.recordDefault"))}</option>
                            ${records.map((record) => `
                                <option value="${record.id}" ${String(record.id) === String(state.register.recordId) ? "selected" : ""}>
                                    ${formatDate(record.recordDate)} · ${enumLabels.riskLevel[record.riskLevel] || escapeHtml(t("aiNotEvaluated"))}
                                </option>
                            `).join("")}
                        </select>
                    </label>
                    <button class="btn" type="button" data-action="run-triage" ${state.register.loading ? "disabled" : ""}>
                        ${state.register.loading ? escapeHtml(t("register.running")) : escapeHtml(t("register.runBtn"))}
                    </button>
                </div>
            </section>
            <section class="panel">
                <div class="section-head"><h3>${escapeHtml(t("register.primaryDept"))}</h3></div>
                ${state.register.triage ? renderTriageResult(state.register.triage) : renderEmpty(t("register.resultEmpty"))}
            </section>
            ${renderRegisterSlots(state.register.triage)}
            ${renderOrdersSection()}
            ${renderRegisterStats(state.register.stats)}
        </div>
    `;
}

function renderTriageResult(triage) {
    const candidates = triage.candidateDepartments || [];
    return `
        <div class="page-grid">
            ${triage.emergencyNotice ? `<div class="callout danger"><strong>${escapeHtml(t("register.emergencyTitle"))}</strong>：${escapeHtml(triage.emergencyNotice)}</div>` : ""}
            <div class="two-column">
                <div class="card">
                    <span class="muted-text">${escapeHtml(t("register.primaryDept"))}</span>
                    <strong style="font-size:18px;">${escapeHtml(triage.primaryDepartment || "-")}</strong>
                    <div class="table-actions">
                        ${renderUrgencyBadge(triage.urgency)}
                        <span class="badge medium">${escapeHtml(t("register.source"))}: ${escapeHtml(enumLabels.triageSource[triage.triageSource] || triage.triageSource || "-")}</span>
                    </div>
                </div>
                <div class="card">
                    <span class="muted-text">${escapeHtml(t("register.confidence"))}</span>
                    <strong>${formatConfidence(triage.confidence)}</strong>
                </div>
            </div>
            ${triage.primaryReason ? `<div class="callout">${escapeHtml(triage.primaryReason)}</div>` : ""}
            ${candidates.length ? `
                <div>
                    <div class="section-head"><h4>${escapeHtml(t("register.candidatesTitle"))}</h4></div>
                    <div class="feed-list">
                        ${candidates.map((c) => `
                            <div class="feed-item">
                                <div class="table-actions">${renderSourceTag(c.source)}<strong>${escapeHtml(c.department)}</strong></div>
                                <p>${escapeHtml(c.reason || "")}</p>
                            </div>
                        `).join("")}
                    </div>
                </div>
            ` : ""}
            ${(triage.reasons || []).length ? `
                <div>
                    <div class="section-head"><h4>${escapeHtml(t("register.reasonsTitle"))}</h4></div>
                    <ul class="clean-list">${triage.reasons.map((r) => `<li>${escapeHtml(r)}</li>`).join("")}</ul>
                </div>
            ` : ""}
            ${triage.aiReason ? `
                <div>
                    <div class="section-head"><h4>${escapeHtml(t("register.aiReasonTitle"))}</h4></div>
                    <div class="ai-answer">${escapeHtml(triage.aiReason)}</div>
                </div>
            ` : ""}
            ${(triage.checkupSuggestions || []).length ? `
                <div>
                    <div class="section-head"><h4>${escapeHtml(t("register.checkupTitle"))}</h4></div>
                    <div class="chip-list">${triage.checkupSuggestions.map((s) => `<span class="chip">${escapeHtml(s)}</span>`).join("")}</div>
                </div>
            ` : ""}
            ${(triage.precautions || []).length ? `
                <div>
                    <div class="section-head"><h4>${escapeHtml(t("register.precautionsTitle"))}</h4></div>
                    <ul class="clean-list">${triage.precautions.map((s) => `<li>${escapeHtml(s)}</li>`).join("")}</ul>
                </div>
            ` : ""}
            <div class="callout danger">${escapeHtml(triage.disclaimer || t("register.disclaimerLabel"))}</div>
        </div>
    `;
}

function renderRegisterSlots(triage) {
    if (!triage) {
        return "";
    }
    const slots = triage.availableSlots || [];
    if (!slots.length) {
        return `<section class="panel"><div class="section-head"><h3>${escapeHtml(t("register.slotsTitle"))}</h3></div>${renderEmpty(t("register.noSlots"))}</section>`;
    }
    const orderId = triage.orderId;
    return `
        <section class="panel">
            <div class="section-head"><h3>${escapeHtml(t("register.slotsTitle"))}</h3></div>
            ${slots.map((dept) => `
                <div class="dept-slot-block">
                    <div class="section-head">
                        <h4>${escapeHtml(dept.departmentName)}</h4>
                        ${dept.visitNotice ? `<span class="muted-text">${escapeHtml(t("register.noticeTitle"))}：${escapeHtml(dept.visitNotice)}</span>` : ""}
                    </div>
                    <div class="slot-grid">
                        ${(dept.doctors || []).map((doc) => `
                            <div class="slot-card">
                                <div class="slot-doctor"><strong>${escapeHtml(doc.doctorName)}</strong> <span class="badge low">${escapeHtml(doc.titleLabel || enumLabels.doctorTitle[doc.title] || "")}</span></div>
                                <div class="muted-text">${escapeHtml(doc.hospitalName || "")}</div>
                                <div class="muted-text">${escapeHtml(t("register.feeLabel"))}: ${formatMetric(doc.registrationFee)}</div>
                                <div class="slot-options">
                                    ${(doc.slots || []).map((s) => `
                                        <button class="slot-btn" type="button" data-action="book-slot" data-order-id="${orderId}" data-slot-id="${s.slotId}" data-fee="${doc.registrationFee ?? ""}">
                                            <span>${formatDate(s.date)}</span>
                                            <span>${escapeHtml(enumLabels.slotPeriod[s.period] || s.periodLabel || "")}</span>
                                            <span class="slot-remain">${escapeHtml(t("register.remainingLabel"))} ${s.remaining}</span>
                                        </button>
                                    `).join("")}
                                </div>
                            </div>
                        `).join("")}
                    </div>
                </div>
            `).join("")}
        </section>
    `;
}

function renderOrdersSection() {
    return `
        <section class="table-shell">
            <div class="section-head"><h3>${escapeHtml(t("register.ordersTitle"))}</h3></div>
            <div class="toolbar">
                <label>
                    ${escapeHtml(t("alertsStatusFilter"))}
                    <select id="registerOrderStatusFilter">
                        <option value="">${escapeHtml(t("alertsAllStatus"))}</option>
                        ${renderSelectOptions(enumLabels.registrationStatus, state.register.orders.status)}
                    </select>
                </label>
            </div>
            ${renderOrdersTable(state.register.orders.items)}
            ${renderPagination(state.register.orders, "register-orders")}
        </section>
    `;
}

function renderOrdersTable(items) {
    // 只展示真实挂号单（已预约/已完成/已取消），隐藏分诊产生的 RECOMMENDED 草稿空白单
    const visible = (items || []).filter((order) => order.status !== "RECOMMENDED");
    if (!visible.length) {
        return renderEmpty(t("register.ordersEmpty"));
    }
    return `
        <div class="table-wrapper">
            <table>
                <thead>
                <tr>
                    <th>${escapeHtml(t("register.colDept"))}</th>
                    <th>${escapeHtml(t("register.colDoctor"))}</th>
                    <th>${escapeHtml(t("register.colHospital"))}</th>
                    <th>${escapeHtml(t("register.colDate"))}</th>
                    <th>${escapeHtml(t("register.colUrgency"))}</th>
                    <th>${escapeHtml(t("register.colStatus"))}</th>
                    <th>${escapeHtml(t("register.colActions"))}</th>
                </tr>
                </thead>
                <tbody>
                ${visible.map((order) => `
                    <tr>
                        <td>${escapeHtml(order.departmentName || "-")}</td>
                        <td>${escapeHtml(order.doctorName || "-")}${order.doctorTitleLabel ? ` <span class="muted-text">${escapeHtml(order.doctorTitleLabel)}</span>` : ""}</td>
                        <td>${escapeHtml(order.hospitalName || "-")}</td>
                        <td>${formatDate(order.appointmentDate)}${order.periodLabel ? ` <span class="muted-text">${escapeHtml(order.periodLabel)}</span>` : ""}</td>
                        <td>${renderUrgencyBadge(order.urgency)}</td>
                        <td>${renderRegistrationStatusBadge(order.status)}${order.feedbackRating ? ` <span class="muted-text">★${order.feedbackRating}</span>` : ""}</td>
                        <td>
                            <div class="table-actions">
                                ${order.status === "REGISTERED" ? `
                                    <button class="mini-btn" type="button" data-action="complete-order" data-id="${order.id}">${escapeHtml(t("register.completeBtn"))}</button>
                                    <button class="mini-btn danger" type="button" data-action="cancel-order" data-id="${order.id}">${escapeHtml(t("register.cancelBtn"))}</button>
                                ` : ""}
                                ${order.status === "COMPLETED" && !order.feedbackRating ? `
                                    <button class="mini-btn warning" type="button" data-action="open-order-feedback" data-id="${order.id}">${escapeHtml(t("register.feedbackBtn"))}</button>
                                ` : ""}
                                ${order.status === "RECOMMENDED" ? `<span class="muted-text">${escapeHtml(t("register.slotsTitle"))} ↑</span>` : ""}
                            </div>
                        </td>
                    </tr>
                `).join("")}
                </tbody>
            </table>
        </div>
    `;
}

function renderRegisterStats(stats) {
    if (!stats) {
        return "";
    }
    const accuracyText = stats.feedbackCount > 0 ? `${Number(stats.accuracyRate || 0).toFixed(1)}%` : "-";
    return `
        <section class="panel">
            <div class="section-head"><h3>${escapeHtml(t("register.statsTitle"))}</h3></div>
            <div class="two-column">
                <div class="card"><span class="muted-text">${escapeHtml(t("register.accuracy"))}</span><strong>${accuracyText}</strong></div>
                <div class="card"><span class="muted-text">${escapeHtml(t("register.avgRating"))}</span><strong>${formatMetric(stats.averageRating)} / 5</strong></div>
            </div>
            <div class="chip-list">
                <span class="chip">${escapeHtml(t("register.statTotal"))}: ${stats.total}</span>
                <span class="chip">${escapeHtml(t("register.statRecommended"))}: ${stats.recommended}</span>
                <span class="chip">${escapeHtml(t("register.statRegistered"))}: ${stats.registered}</span>
                <span class="chip">${escapeHtml(t("register.statCompleted"))}: ${stats.completed}</span>
                <span class="chip">${escapeHtml(t("register.statCancelled"))}: ${stats.cancelled}</span>
            </div>
            ${(stats.departmentDistribution || []).length ? `
                <div class="section-head"><h4>${escapeHtml(t("register.deptDistTitle"))}</h4></div>
                <div class="chip-list">${stats.departmentDistribution.map((d) => `<span class="chip">${escapeHtml(d.label)} · ${d.count}</span>`).join("")}</div>
            ` : ""}
        </section>
    `;
}

function renderUrgencyBadge(urgency) {
    if (!urgency) {
        return '<span class="badge low">-</span>';
    }
    const classNameMap = { EMERGENCY: "critical", URGENT: "high", ROUTINE: "low" };
    return `<span class="badge ${classNameMap[urgency] || "low"}">${escapeHtml(enumLabels.urgency[urgency] || urgency)}</span>`;
}

function renderRegistrationStatusBadge(status) {
    if (!status) {
        return '<span class="badge low">-</span>';
    }
    const classNameMap = { RECOMMENDED: "medium", REGISTERED: "high", COMPLETED: "low", CANCELLED: "low" };
    return `<span class="badge ${classNameMap[status] || "low"}">${escapeHtml(enumLabels.registrationStatus[status] || status)}</span>`;
}

function renderSourceTag(source) {
    if (!source) {
        return "";
    }
    const classNameMap = { RULE: "medium", AI: "high", BOTH: "low" };
    const label = source === "BOTH" ? t("register.basisBoth") : source === "AI" ? t("register.basisAi") : t("register.basisRule");
    return `<span class="badge ${classNameMap[source] || "low"}">${escapeHtml(label)}</span>`;
}

function formatConfidence(value) {
    if (value == null) {
        return "-";
    }
    const number = Number(value);
    if (!Number.isFinite(number)) {
        return "-";
    }
    return `${Math.round(number * 100)}%`;
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
                            <input id="importFileInput" name="file" type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.bmp,.txt" required>
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
                ${renderImportQuickTriage(result)}
            </div>
        </section>
    `;
}

function renderImportQuickTriage(result) {
    const record = result.archivedRecord;
    if (!record) {
        return "";
    }
    const level = record.riskLevel;
    if (level !== "HIGH" && level !== "CRITICAL") {
        return "";
    }
    const riskLabel = enumLabels.riskLevel[level] || level;
    return `
        <div class="card import-quick-triage">
            <div class="callout danger">
                <strong>🚨 ${escapeHtml(t("importsQuickTriageTitle"))}</strong>
                <p>${escapeHtml(t("importsQuickTriageHint", { risk: riskLabel }))}</p>
                <div class="table-actions">
                    <button class="btn" type="button" data-action="triage-imported-record" data-id="${record.id}">🏥 ${escapeHtml(t("importsQuickTriageBtn"))}</button>
                </div>
            </div>
        </div>
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
            ${state.dashboard ? `
            <section class="panel">
                <div class="section-head">
                    <h3>${escapeHtml(t("dashRiskDist"))}</h3>
                    <button class="btn-ghost" type="button" data-action="refresh-dashboard">${escapeHtml(t("dashRefresh"))}</button>
                </div>
                ${renderRiskBars(state.dashboard)}
            </section>` : ""}
            <section class="table-shell">
                <div class="section-head"><h3>${escapeHtml(t("vizRecent"))}</h3></div>
                ${renderRecordsTable(visualization.latestRecords || [], false)}
            </section>
        </div>
    `;
}

function renderAiPage() {
    const detail = state.profileDetail;
    const messages = state.ai.messages || [];
    return `
        <div class="page-grid">
            <div class="callout danger">
                ${escapeHtml(t("aiDisclaimer"))}
            </div>
            <section class="panel chat-panel">
                <div class="chat-head">
                    <div class="chat-doctor">
                        <span class="chat-avatar">🩺</span>
                        <div class="chat-doctor-text">
                            <h3>${escapeHtml(t("aiDoctorTitle"))}</h3>
                            <p>${escapeHtml(t("aiDoctorSub"))}</p>
                        </div>
                    </div>
                    <div class="chat-tools">
                        <select id="aiFocusRecord" title="${escapeAttr(t("aiFocusRecord"))}">
                            <option value="">${escapeHtml(t("aiDefaultRecord"))}</option>
                            ${(detail.recentRecords || []).map((record) => `
                                <option value="${record.id}" ${String(state.ai.focusRecordId) === String(record.id) ? "selected" : ""}>
                                    ${formatDate(record.recordDate)} · ${enumLabels.riskLevel[record.riskLevel] || escapeHtml(t("aiNotEvaluated"))}
                                </option>
                            `).join("")}
                        </select>
                        <button class="mini-btn" type="button" data-action="ai-reset" ${messages.length ? "" : "disabled"}>🧹 ${escapeHtml(t("aiReset"))}</button>
                    </div>
                </div>

                <div class="chat-thread" id="chatThread">
                    <div class="chat-msg chat-msg-bot">
                        <span class="chat-bubble-avatar">🩺</span>
                        <div class="chat-bubble">${escapeHtml(t("aiGreeting"))}</div>
                    </div>
                    ${messages.map((msg) => `
                        <div class="chat-msg ${msg.role === "user" ? "chat-msg-user" : "chat-msg-bot"}">
                            ${msg.role === "user" ? "" : `<span class="chat-bubble-avatar">🩺</span>`}
                            <div class="chat-bubble">${escapeHtml(msg.content)}</div>
                        </div>
                    `).join("")}
                    ${state.ai.loading ? `
                        <div class="chat-msg chat-msg-bot">
                            <span class="chat-bubble-avatar">🩺</span>
                            <div class="chat-bubble chat-typing"><span></span><span></span><span></span></div>
                        </div>
                    ` : ""}
                </div>

                ${!messages.length && !state.ai.loading ? `
                    <div class="chat-quick-questions">
                        ${[t("aiQuick1"), t("aiQuick2"), t("aiQuick3")].map((question) => `
                            <button class="chat-quick-chip" type="button" data-action="ai-quick-question" data-question="${escapeAttr(question)}">💬 ${escapeHtml(question)}</button>
                        `).join("")}
                    </div>
                ` : ""}

                <form id="aiChatForm" class="chat-input-row">
                    <textarea name="question" rows="1" placeholder="${escapeAttr(t("aiInputPlaceholder"))}" ${state.ai.loading ? "disabled" : ""}></textarea>
                    <button class="btn chat-send-btn" type="submit" ${state.ai.loading ? "disabled" : ""}>${state.ai.loading ? escapeHtml(t("aiWaitting")) : `➤ ${escapeHtml(t("aiSend"))}`}</button>
                </form>
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
                    <th>${escapeHtml(t("recordsLipids"))}</th>
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
                        <td>${formatMetric(record.cholesterolTotal)} / ${formatMetric(record.ldlCholesterol)}</td>
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
            case "goto-record-create":
                if (window.location.hash === "#records") {
                    openRecordModal();
                } else {
                    state.pendingRecordModal = true;
                    window.location.hash = "records";
                }
                break;
            case "ai-reset":
                state.ai.messages = [];
                render();
                break;
            case "ai-quick-question":
                await sendAiChat(button.dataset.question);
                break;
            case "export-data":
                await exportHealthData();
                break;
            case "about-app":
                showAboutModal();
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
            case "run-triage":
                await runTriage();
                break;
            case "triage-imported-record":
                state.register.recordId = id;
                state.register.triage = null;
                state.pendingTriage = true;
                window.location.hash = "register";
                break;
            case "book-slot":
                await bookSlot(Number(button.dataset.orderId), Number(button.dataset.slotId), button.dataset.fee);
                break;
            case "confirm-book-slot":
                closeModal();
                await performBooking(Number(button.dataset.orderId), Number(button.dataset.slotId), button.dataset.fee);
                break;
            case "mock-pay-confirm":
                closeModal();
                showToast(t("pay.success"));
                break;
            case "cancel-order":
                await cancelOrder(Number(id));
                break;
            case "complete-order":
                await completeOrder(Number(id));
                break;
            case "open-order-feedback":
                openFeedbackModal(findOrderById(Number(id)));
                break;
            case "register-orders-prev":
                state.register.orders.page -= 1;
                await loadRegistrationOrders();
                render();
                break;
            case "register-orders-next":
                state.register.orders.page += 1;
                await loadRegistrationOrders();
                render();
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
            case "aiChatForm":
                event.preventDefault();
                await submitAi(event.target);
                break;
            case "feedbackForm":
                event.preventDefault();
                await submitFeedback(event.target);
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
        if (event.target.id === "registerRecordSelect") {
            state.register.recordId = event.target.value;
        }
        if (event.target.id === "registerOrderStatusFilter") {
            state.register.orders.status = event.target.value;
            state.register.orders.page = 1;
            await loadRegistrationOrders();
            render();
        }
        if (event.target.id === "aiFocusRecord") {
            state.ai.focusRecordId = event.target.value;
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
    state.ai.messages = [];
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
    state.ai.messages = [];
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
        ["systolicPressure", "diastolicPressure", "heartRate"],
        ["weightKg", "waistCircumferenceCm", "fastingBloodSugar", "postprandialBloodSugar", "bodyTemperature", "bloodOxygen", "cholesterolTotal", "triglyceride", "ldlCholesterol", "hdlCholesterol", "alt", "ast", "creatinine", "uricAcid", "bloodUreaNitrogen", "hemoglobin", "whiteBloodCell"]
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
    const textarea = form.querySelector("textarea[name='question']");
    const question = textarea ? textarea.value.trim() : "";
    if (!question || state.ai.loading) {
        return;
    }
    if (textarea) {
        textarea.value = "";
    }
    await sendAiChat(question);
}

/* AI 医生多轮对话：携带会话历史请求后端，回复后追加到消息列表 */
async function sendAiChat(question) {
    state.ai.messages = [...(state.ai.messages || []), { role: "user", content: question }];
    state.ai.loading = true;
    render();
    scrollChatToBottom();
    try {
        const payload = {
            focusRecordId: state.ai.focusRecordId ? Number(state.ai.focusRecordId) : null,
            messages: state.ai.messages.slice(-20).map((item) => ({ role: item.role, content: item.content }))
        };
        const response = await api("/api/ai/chat", { method: "POST", body: JSON.stringify(payload) });
        state.ai.messages = [...state.ai.messages, { role: "assistant", content: response.reply || t("aiEmptyReply") }];
    } catch (error) {
        state.ai.messages = [...state.ai.messages, { role: "assistant", content: `⚠️ ${error.message || t("toastRequestFailed")}` }];
    } finally {
        state.ai.loading = false;
        render();
        scrollChatToBottom();
    }
}

function scrollChatToBottom() {
    requestAnimationFrame(() => {
        const thread = document.getElementById("chatThread");
        if (thread) {
            thread.scrollTop = thread.scrollHeight;
        }
    });
}

/* 一键导出健康数据（档案 + 总览 + 洞察 + 近期记录）为 JSON 文件 */
async function exportHealthData() {
    await Promise.all([
        loadProfileDetail().catch(() => {}),
        loadDashboard().catch(() => {})
    ]);
    const detail = state.profileDetail || {};
    const payload = {
        exportedAt: new Date().toISOString(),
        user: state.session?.displayName || state.session?.username || "",
        profile: detail.profile || null,
        trends: detail.trends || [],
        personalizedSuggestions: detail.personalizedSuggestions || [],
        summary: state.dashboard,
        records: detail.recentRecords || []
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `healthguard-data-${todayString()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast(t("home.exportDone"));
}

/* 关于本系统弹窗：功能导览与免责声明 */
function showAboutModal() {
    openModal(`
        <div class="section-head">
            <h3>ℹ️ ${escapeHtml(t("home.aboutTitle"))}</h3>
            <button class="btn-ghost" type="button" data-action="close-modal">${escapeHtml(t("modalClose"))}</button>
        </div>
        <div class="about-body">
            <p class="about-brand"><strong>${escapeHtml(t("brand"))}</strong> · ${escapeHtml(t("brandSub"))}</p>
            <p>${escapeHtml(t("home.aboutDesc"))}</p>
            <ul class="clean-list">
                <li>${escapeHtml(t("home.aboutPoint1"))}</li>
                <li>${escapeHtml(t("home.aboutPoint2"))}</li>
                <li>${escapeHtml(t("home.aboutPoint3"))}</li>
            </ul>
            <div class="callout danger">${escapeHtml(t("aiDisclaimer"))}</div>
        </div>
    `);
}

async function runTriage() {
    state.register.loading = true;
    render();
    try {
        const payload = { recordId: state.register.recordId ? Number(state.register.recordId) : null };
        state.register.triage = await api("/api/triage/recommend", {
            method: "POST",
            body: JSON.stringify(payload)
        });
        state.register.loading = false;
        state.register.orders.page = 1;
        await Promise.all([loadRegistrationOrders(), loadRegistrationStats(), loadDashboard().catch(() => {})]);
        render();
        showToast(t("register.toastTriageDone"));
    } catch (error) {
        state.register.loading = false;
        throw error;
    }
}

async function bookSlot(orderId, slotId, fee) {
    // 本分区已预约过（存在进行中的挂号单）：再次点击先弹提示，由用户选择继续预约或退出
    const hasActiveBooking = state.register.stats && Number(state.register.stats.registered) > 0;
    if (hasActiveBooking) {
        showAlreadyBookedModal(orderId, slotId, fee);
        return;
    }
    await performBooking(orderId, slotId, fee);
}

async function performBooking(orderId, slotId, fee) {
    await api("/api/registration/orders", {
        method: "POST",
        body: JSON.stringify({ orderId, slotId })
    });
    state.register.orders.page = 1;
    // 预约成功：清空分诊结果与号源选择区，避免残留
    state.register.triage = null;
    state.register.recordId = "";
    await Promise.all([loadRegistrationOrders(), loadRegistrationStats(), loadDashboard().catch(() => {})]);
    render();
    showWechatPayModal(fee);
}

/* 已存在进行中预约时的确认弹窗：继续预约 / 退出 */
function showAlreadyBookedModal(orderId, slotId, fee) {
    openModal(`
        <div class="already-booked">
            <div class="section-head">
                <h3>ℹ️ ${escapeHtml(t("register.alreadyBookedTitle"))}</h3>
                <button class="btn-ghost" type="button" data-action="close-modal">${escapeHtml(t("modalClose"))}</button>
            </div>
            <div class="callout">${escapeHtml(t("register.alreadyBookedDesc"))}</div>
            <div class="table-actions already-booked-actions">
                <button class="btn" type="button" data-action="confirm-book-slot" data-order-id="${orderId}" data-slot-id="${slotId}" data-fee="${fee ?? ""}">${escapeHtml(t("register.alreadyBookedContinue"))}</button>
                <button class="btn-ghost" type="button" data-action="close-modal">${escapeHtml(t("register.alreadyBookedExit"))}</button>
            </div>
        </div>
    `);
}

/* 挂号成功后的虚拟微信支付弹窗（仅演示，二维码不可真实扫码） */
function showWechatPayModal(fee) {
    const amount = (fee === undefined || fee === null || fee === "") ? null : Number(fee);
    const amountText = Number.isFinite(amount) ? `¥ ${amount.toFixed(2)}` : "¥ 0.00";
    openModal(`
        <div class="wxpay">
            <div class="wxpay-head">
                <span class="wxpay-logo">💬</span>
                <div class="wxpay-head-text">
                    <strong>${escapeHtml(t("pay.title"))}</strong>
                    <span>${escapeHtml(t("pay.sub"))}</span>
                </div>
                <button class="btn-ghost" type="button" data-action="close-modal">${escapeHtml(t("modalClose"))}</button>
            </div>
            <div class="wxpay-amount">${escapeHtml(t("pay.amount"))}<strong>${escapeHtml(amountText)}</strong></div>
            <div class="wxpay-qr">${renderFakeQr(`${orderIdSeed()}|${amountText}`)}</div>
            <div class="wxpay-tip">${escapeHtml(t("pay.scanTip"))}</div>
            <button class="btn wxpay-confirm" type="button" data-action="mock-pay-confirm">${escapeHtml(t("pay.confirmBtn"))}</button>
            <div class="wxpay-watermark">${escapeHtml(t("pay.virtual"))}</div>
        </div>
    `);
}

function orderIdSeed() {
    const first = (state.register.orders.items || [])[0];
    return first ? first.id : Date.now();
}

/* 生成一个“看起来像二维码”的确定性 SVG（含三个定位角），非真实可扫码 */
function renderFakeQr(seed) {
    const n = 25;
    let h = 2166136261 >>> 0;
    const text = String(seed);
    for (let i = 0; i < text.length; i++) {
        h ^= text.charCodeAt(i);
        h = Math.imul(h, 16777619) >>> 0;
    }
    const rand = () => {
        h = (Math.imul(h, 1664525) + 1013904223) >>> 0;
        return h / 4294967296;
    };
    const finderLocal = (x, y) => {
        let lx;
        let ly;
        if (x < 7 && y < 7) { lx = x; ly = y; }
        else if (x >= n - 7 && y < 7) { lx = x - (n - 7); ly = y; }
        else { lx = x; ly = y - (n - 7); }
        const border = lx === 0 || lx === 6 || ly === 0 || ly === 6;
        const core = lx >= 2 && lx <= 4 && ly >= 2 && ly <= 4;
        return border || core;
    };
    const inFinder = (x, y) =>
        (x < 7 && y < 7) || (x >= n - 7 && y < 7) || (x < 7 && y >= n - 7);
    let rects = "";
    for (let y = 0; y < n; y++) {
        for (let x = 0; x < n; x++) {
            const on = inFinder(x, y) ? finderLocal(x, y) : rand() > 0.5;
            if (on) {
                rects += `<rect x="${x}" y="${y}" width="1" height="1"/>`;
            }
        }
    }
    return `<svg viewBox="0 0 ${n} ${n}" class="wxpay-qr-svg" shape-rendering="crispEdges" xmlns="http://www.w3.org/2000/svg"><rect width="${n}" height="${n}" fill="#ffffff"/><g fill="#0b1a12">${rects}</g></svg>`;
}

async function cancelOrder(id) {
    if (!window.confirm(t("register.cancelConfirm"))) {
        return;
    }
    await api(`/api/registration/orders/${id}/cancel`, { method: "PATCH" });
    await Promise.all([loadRegistrationOrders(), loadRegistrationStats(), loadDashboard().catch(() => {})]);
    render();
    showToast(t("register.toastCancelled"));
}

async function completeOrder(id) {
    if (!window.confirm(t("register.completeConfirm"))) {
        return;
    }
    await api(`/api/registration/orders/${id}/complete`, { method: "PATCH" });
    await Promise.all([loadRegistrationOrders(), loadRegistrationStats(), loadDashboard().catch(() => {})]);
    render();
    showToast(t("register.toastCompleted"));
}

function findOrderById(id) {
    return state.register.orders.items.find((item) => item.id === id) || null;
}

function openFeedbackModal(order) {
    if (!order) {
        showToast(t("register.ordersEmpty"), true);
        return;
    }
    openModal(`
        <div class="section-head">
            <h3>${escapeHtml(t("register.feedbackTitle"))}</h3>
            <button class="btn-ghost" type="button" data-action="close-modal">${escapeHtml(t("modalClose"))}</button>
        </div>
        <form id="feedbackForm" class="page-grid" data-order-id="${order.id}">
            <div class="muted-text">${escapeHtml(order.departmentName || "")}${order.doctorName ? ` · ${escapeHtml(order.doctorName)}` : ""}</div>
            <label class="form-field">
                ${escapeHtml(t("register.feedbackRatingLabel"))}
                <select name="rating">
                    <option value="5">★★★★★ (5)</option>
                    <option value="4">★★★★ (4)</option>
                    <option value="3" selected>★★★ (3)</option>
                    <option value="2">★★ (2)</option>
                    <option value="1">★ (1)</option>
                </select>
            </label>
            <label class="form-field">
                ${escapeHtml(t("register.feedbackCommentLabel"))}
                <textarea name="comment"></textarea>
            </label>
            <button class="btn" type="submit">${escapeHtml(t("register.feedbackSave"))}</button>
        </form>
    `);
}

async function submitFeedback(form) {
    const orderId = form.dataset.orderId;
    await api(`/api/registration/orders/${orderId}/feedback`, {
        method: "POST",
        body: JSON.stringify(formToJson(form, ["rating"]))
    });
    closeModal();
    await Promise.all([loadRegistrationOrders(), loadRegistrationStats(), loadDashboard().catch(() => {})]);
    render();
    showToast(t("register.toastFeedbackOk"));
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
        <label class="form-field"><span>${escapeHtml(t("recFieldTriglyceride"))}</span><input name="triglyceride" type="number" step="0.01" min="0.1" max="30" value="${escapeAttr(record.triglyceride ?? "")}"></label>
        <label class="form-field"><span>${escapeHtml(t("recFieldLdl"))}</span><input name="ldlCholesterol" type="number" step="0.01" min="0.1" max="15" value="${escapeAttr(record.ldlCholesterol ?? "")}"></label>
        <label class="form-field"><span>${escapeHtml(t("recFieldHdl"))}</span><input name="hdlCholesterol" type="number" step="0.01" min="0.1" max="10" value="${escapeAttr(record.hdlCholesterol ?? "")}"></label>
        <label class="form-field"><span>${escapeHtml(t("recFieldAlt"))}</span><input name="alt" type="number" step="1" min="1" max="2000" value="${escapeAttr(record.alt ?? "")}"></label>
        <label class="form-field"><span>${escapeHtml(t("recFieldAst"))}</span><input name="ast" type="number" step="1" min="1" max="2000" value="${escapeAttr(record.ast ?? "")}"></label>
        <label class="form-field"><span>${escapeHtml(t("recFieldCreatinine"))}</span><input name="creatinine" type="number" step="0.1" min="10" max="2000" value="${escapeAttr(record.creatinine ?? "")}"></label>
        <label class="form-field"><span>${escapeHtml(t("recFieldUricAcid"))}</span><input name="uricAcid" type="number" step="0.1" min="50" max="1500" value="${escapeAttr(record.uricAcid ?? "")}"></label>
        <label class="form-field"><span>${escapeHtml(t("recFieldBun"))}</span><input name="bloodUreaNitrogen" type="number" step="0.01" min="1" max="50" value="${escapeAttr(record.bloodUreaNitrogen ?? "")}"></label>
        <label class="form-field"><span>${escapeHtml(t("recFieldHemoglobin"))}</span><input name="hemoglobin" type="number" step="0.1" min="30" max="260" value="${escapeAttr(record.hemoglobin ?? "")}"></label>
        <label class="form-field"><span>${escapeHtml(t("recFieldWbc"))}</span><input name="whiteBloodCell" type="number" step="0.01" min="0.1" max="150" value="${escapeAttr(record.whiteBloodCell ?? "")}"></label>
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
    state.ai = { loading: false, messages: [], focusRecordId: "" };
    state.register = {
        recordId: "",
        loading: false,
        triage: null,
        orders: { items: [], page: 1, size: 10, totalItems: 0, totalPages: 1, status: "" },
        stats: null
    };
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
