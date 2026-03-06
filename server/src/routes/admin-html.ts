export function getAdminHtml(nonce: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Admin Panel</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f1117; color: #e1e4e8; min-height: 100vh; }

  /* ─── Login ──────────────────────────────────────────── */
  .login-container { display: flex; align-items: center; justify-content: center; min-height: 100vh; }
  .login-box { background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 2rem; width: 360px; }
  .login-box h1 { font-size: 1.25rem; margin-bottom: 1.5rem; text-align: center; color: #c9d1d9; }

  /* ─── Forms ──────────────────────────────────────────── */
  .form-group { margin-bottom: 1rem; }
  .form-group label { display: block; font-size: 0.85rem; color: #8b949e; margin-bottom: 0.35rem; }
  .form-group input, .form-group select { width: 100%; padding: 0.5rem 0.75rem; background: #0d1117; border: 1px solid #30363d; border-radius: 6px; color: #c9d1d9; font-size: 0.9rem; }
  .form-group input:focus, .form-group select:focus { outline: none; border-color: #58a6ff; }

  /* ─── Buttons ────────────────────────────────────────── */
  .btn { display: inline-block; padding: 0.5rem 1rem; border: none; border-radius: 6px; font-size: 0.85rem; cursor: pointer; font-weight: 500; }
  .btn-primary { background: #238636; color: #fff; }
  .btn-primary:hover { background: #2ea043; }
  .btn-sm { padding: 0.3rem 0.6rem; font-size: 0.8rem; }
  .btn-danger { background: #da3633; color: #fff; }
  .btn-danger:hover { background: #f85149; }
  .btn-outline { background: transparent; border: 1px solid #30363d; color: #c9d1d9; }
  .btn-outline:hover { border-color: #58a6ff; color: #58a6ff; }
  .btn-warning { background: #d29922; color: #fff; }
  .btn-warning:hover { background: #e3b341; }
  .btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .btn-primary.full-width { width: 100%; padding: 0.6rem; }

  /* ─── Dashboard layout ──────────────────────────────── */
  .dashboard { display: none; max-width: 1200px; margin: 0 auto; padding: 1.5rem; }
  .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0; border-bottom: 1px solid #21262d; padding-bottom: 1rem; }
  .header h1 { font-size: 1.25rem; color: #c9d1d9; }

  /* ─── Tabs ───────────────────────────────────────────── */
  .tab-bar { display: flex; gap: 0; border-bottom: 1px solid #21262d; margin-bottom: 1.5rem; position: sticky; top: 0; background: #0f1117; z-index: 10; padding-top: 1rem; }
  .tab-btn { padding: 0.6rem 1.25rem; background: none; border: none; border-bottom: 2px solid transparent; color: #8b949e; font-size: 0.9rem; cursor: pointer; font-weight: 500; }
  .tab-btn:hover { color: #c9d1d9; }
  .tab-btn.active { color: #58a6ff; border-bottom-color: #58a6ff; }
  .tab-content { display: none; }
  .tab-content.active { display: block; }

  /* ─── Settings sections ─────────────────────────────── */
  .settings-section { background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 1rem 1.25rem; margin-bottom: 1.5rem; }
  .settings-section h2 { font-size: 0.95rem; color: #c9d1d9; margin-bottom: 0.75rem; }
  .setting-row { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.75rem; flex-wrap: wrap; }
  .setting-row label { font-size: 0.85rem; color: #8b949e; min-width: 130px; }
  .setting-row input[type="number"] { width: 80px; padding: 0.3rem 0.5rem; background: #0d1117; border: 1px solid #30363d; border-radius: 6px; color: #c9d1d9; font-size: 0.85rem; }
  .setting-row input[type="number"]:focus { outline: none; border-color: #58a6ff; }
  .setting-row input[type="password"] { width: 240px; padding: 0.3rem 0.5rem; background: #0d1117; border: 1px solid #30363d; border-radius: 6px; color: #c9d1d9; font-size: 0.85rem; }
  .setting-row input[type="password"]:focus { outline: none; border-color: #58a6ff; }
  .allowed-emails-section { margin-top: 0.75rem; }
  .allowed-emails-section .add-row { display: flex; gap: 0.5rem; margin-bottom: 0.75rem; }
  .allowed-emails-section .add-row input { flex: 1; padding: 0.4rem 0.6rem; background: #0d1117; border: 1px solid #30363d; border-radius: 6px; color: #c9d1d9; font-size: 0.85rem; }
  .allowed-emails-section .add-row input:focus { outline: none; border-color: #58a6ff; }
  .email-list { max-height: 240px; overflow-y: auto; }
  .email-item { display: flex; justify-content: space-between; align-items: center; padding: 0.35rem 0.5rem; border-bottom: 1px solid #21262d; font-size: 0.85rem; }
  .email-item:last-child { border-bottom: none; }
  .email-item .email-addr { color: #c9d1d9; }
  .email-empty { color: #8b949e; font-size: 0.85rem; font-style: italic; }

  /* ─── Stats cards ───────────────────────────────────── */
  .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; }
  .stat-card { background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 1rem 1.25rem; }
  .stat-card .label { font-size: 0.8rem; color: #8b949e; margin-bottom: 0.25rem; }
  .stat-card .value { font-size: 1.5rem; font-weight: 600; color: #58a6ff; }

  /* ─── Tables ─────────────────────────────────────────── */
  .table-wrap { overflow-x: auto; }
  table { width: 100%; border-collapse: collapse; background: #161b22; border: 1px solid #30363d; border-radius: 8px; overflow: hidden; }
  th, td { padding: 0.6rem 0.75rem; text-align: left; border-bottom: 1px solid #21262d; font-size: 0.85rem; }
  th { background: #1c2128; color: #8b949e; font-weight: 600; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.04em; }
  td { color: #c9d1d9; }
  tr:last-child td { border-bottom: none; }
  tr:hover td { background: #1c2128; }
  td a { color: #58a6ff; text-decoration: none; cursor: pointer; }
  td a:hover { text-decoration: underline; }

  /* ─── Form controls ─────────────────────────────────── */
  select { background: #0d1117; border: 1px solid #30363d; color: #c9d1d9; padding: 0.25rem 0.4rem; border-radius: 4px; font-size: 0.8rem; }
  .toggle { position: relative; display: inline-block; width: 36px; height: 20px; cursor: pointer; }
  .toggle input { opacity: 0; width: 0; height: 0; }
  .toggle .slider { position: absolute; inset: 0; background: #30363d; border-radius: 20px; transition: 0.2s; }
  .toggle .slider::before { content: ''; position: absolute; width: 14px; height: 14px; left: 3px; bottom: 3px; background: #8b949e; border-radius: 50%; transition: 0.2s; }
  .toggle input:checked + .slider { background: #238636; }
  .toggle input:checked + .slider::before { transform: translateX(16px); background: #fff; }

  /* ─── Filter bars ───────────────────────────────────── */
  .filter-bar { display: flex; gap: 0.5rem; margin-bottom: 1rem; flex-wrap: wrap; align-items: center; }
  .filter-bar input, .filter-bar select { padding: 0.4rem 0.6rem; background: #0d1117; border: 1px solid #30363d; border-radius: 6px; color: #c9d1d9; font-size: 0.85rem; }
  .filter-bar input:focus, .filter-bar select:focus { outline: none; border-color: #58a6ff; }
  .filter-bar input[type="text"], .filter-bar input[type="date"] { min-width: 140px; }

  /* ─── Bulk action bar ───────────────────────────────── */
  .bulk-bar { display: none; align-items: center; gap: 0.75rem; padding: 0.5rem 0.75rem; background: #1c2128; border: 1px solid #30363d; border-radius: 6px; margin-bottom: 1rem; font-size: 0.85rem; flex-wrap: wrap; }
  .bulk-bar.visible { display: flex; }
  .bulk-bar .count { color: #58a6ff; font-weight: 600; }

  /* ─── Pagination ─────────────────────────────────────── */
  .pagination { display: flex; align-items: center; gap: 0.75rem; margin-top: 1rem; font-size: 0.85rem; color: #8b949e; }
  .pagination button { padding: 0.3rem 0.6rem; }

  /* ─── Badge ──────────────────────────────────────────── */
  .badge { display: inline-block; padding: 0.15rem 0.5rem; border-radius: 10px; font-size: 0.75rem; font-weight: 600; }
  .badge-green { background: rgba(35,134,54,0.2); color: #3fb950; }
  .badge-gray { background: rgba(139,148,158,0.2); color: #8b949e; }
  .badge-yellow { background: rgba(210,153,34,0.2); color: #e3b341; }
  .badge-blue { background: rgba(88,166,255,0.15); color: #58a6ff; }
  .badge-red { background: rgba(218,54,51,0.15); color: #f85149; }

  /* ─── Toast ──────────────────────────────────────────── */
  .toast-container { position: fixed; top: 1rem; right: 1rem; z-index: 1000; display: flex; flex-direction: column; gap: 0.5rem; }
  .toast { padding: 0.6rem 1rem; border-radius: 6px; font-size: 0.85rem; animation: fadeIn 0.2s; max-width: 360px; }
  .toast-success { background: #238636; color: #fff; }
  .toast-error { background: #da3633; color: #fff; }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }

  /* ─── Modal ──────────────────────────────────────────── */
  .modal-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 500; align-items: center; justify-content: center; }
  .modal-overlay.active { display: flex; }
  .modal { background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 1.5rem; min-width: 340px; max-width: 500px; width: 90%; max-height: 90vh; overflow-y: auto; }
  .modal h3 { margin-bottom: 1rem; color: #c9d1d9; }
  .modal p { margin-bottom: 1rem; color: #8b949e; font-size: 0.9rem; }
  .modal-actions { display: flex; gap: 0.5rem; justify-content: flex-end; }
  .temp-password { background: #0d1117; border: 1px solid #30363d; padding: 0.75rem; border-radius: 6px; font-family: monospace; font-size: 1rem; color: #58a6ff; word-break: break-all; margin-bottom: 1rem; user-select: all; }
  .error-msg { color: #f85149; font-size: 0.85rem; margin-top: 0.5rem; display: none; }

  /* ─── Detail panel (overlay side panel) ─────────────── */
  .detail-panel { display: none; position: fixed; top: 0; right: 0; width: 600px; max-width: 100vw; height: 100vh; background: #161b22; border-left: 1px solid #30363d; z-index: 400; overflow-y: auto; padding: 1.5rem; }
  .detail-panel.active { display: block; }
  .detail-panel .close-btn { position: absolute; top: 1rem; right: 1rem; background: none; border: none; color: #8b949e; font-size: 1.25rem; cursor: pointer; }
  .detail-panel .close-btn:hover { color: #c9d1d9; }
  .detail-panel h3 { font-size: 1.1rem; margin-bottom: 1rem; color: #c9d1d9; padding-right: 2rem; }
  .detail-panel .section { margin-bottom: 1.5rem; }
  .detail-panel .section h4 { font-size: 0.9rem; color: #8b949e; margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0.04em; }
  .detail-panel .info-grid { display: grid; grid-template-columns: 120px 1fr; gap: 0.3rem 1rem; font-size: 0.85rem; margin-bottom: 1rem; }
  .detail-panel .info-grid .lbl { color: #8b949e; }
  .detail-panel .info-grid .val { color: #c9d1d9; }
  .detail-backdrop { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.3); z-index: 399; }
  .detail-backdrop.active { display: block; }

  /* ─── Danger zone ───────────────────────────────────── */
  .danger-zone { border: 1px solid #da3633; border-radius: 8px; padding: 1rem; margin-top: 1.5rem; }
  .danger-zone h4 { color: #f85149; font-size: 0.9rem; margin-bottom: 0.5rem; }
  .danger-zone p { color: #8b949e; font-size: 0.85rem; margin-bottom: 0.75rem; }

  input[type="checkbox"].row-check { width: 16px; height: 16px; accent-color: #58a6ff; cursor: pointer; }
</style>
</head>
<body>

<!-- ═══ LOGIN ═══════════════════════════════════════════════════ -->
<div id="login" class="login-container">
  <div class="login-box">
    <h1>Admin Panel</h1>
    <form id="loginForm">
      <div class="form-group">
        <label for="secret">Admin Secret</label>
        <input type="password" id="secret" placeholder="Enter admin secret" autocomplete="off" required>
      </div>
      <div id="loginError" class="error-msg"></div>
      <button type="submit" class="btn btn-primary full-width">Sign In</button>
    </form>
  </div>
</div>

<!-- ═══ DASHBOARD ═══════════════════════════════════════════════ -->
<div id="dashboard" class="dashboard">
  <div class="header">
    <h1>Admin Panel</h1>
    <button id="logoutBtn" class="btn btn-outline btn-sm">Sign Out</button>
  </div>

  <div class="tab-bar">
    <button class="tab-btn active" data-tab="tab-dashboard">Dashboard</button>
    <button class="tab-btn" data-tab="tab-users">Users</button>
    <button class="tab-btn" data-tab="tab-investigations">Investigations</button>
    <button class="tab-btn" data-tab="tab-audit">Audit Log</button>
    <button class="tab-btn" data-tab="tab-sessions">Sessions</button>
  </div>

  <!-- ─── Dashboard Tab ──────────────────────────────────── -->
  <div id="tab-dashboard" class="tab-content active">
    <div class="stats" id="statsGrid"></div>

    <div class="settings-section">
      <h2>Server Identity</h2>
      <div class="setting-row">
        <label>Server Name</label>
        <div style="display:flex;gap:8px;align-items:center">
          <input type="text" id="serverNameInput" maxlength="100" style="flex:1">
          <button id="saveServerNameBtn" class="btn btn-primary btn-sm">Save</button>
        </div>
      </div>
    </div>

    <div class="settings-section">
      <h2>Registration Settings</h2>
      <div class="setting-row">
        <label>Registration Mode</label>
        <select id="regModeSelect">
          <option value="invite">Invite Only</option>
          <option value="open">Open</option>
        </select>
      </div>
      <div id="allowedEmailsSection" class="allowed-emails-section">
        <div class="add-row">
          <input type="email" id="newEmailInput" placeholder="user@example.com">
          <button id="addEmailBtn" class="btn btn-primary btn-sm">Add</button>
        </div>
        <div class="email-list" id="emailList"></div>
      </div>
    </div>

    <div class="settings-section">
      <h2>Session Settings</h2>
      <div class="setting-row">
        <label>Session TTL (hours)</label>
        <input type="number" id="sessionTtl" min="1" max="8760" value="24">
        <button id="saveSessionBtn" class="btn btn-primary btn-sm">Save</button>
      </div>
      <div class="setting-row">
        <label>Max sessions/user</label>
        <input type="number" id="maxSessions" min="0" max="1000" value="0">
        <span style="font-size:0.8rem;color:#8b949e;">(0 = unlimited)</span>
      </div>
    </div>

    <div class="settings-section">
      <h2>Data Retention</h2>
      <div class="setting-row">
        <label>Notifications (days)</label>
        <input type="number" id="notifRetention" min="1" max="3650" value="90">
      </div>
      <div class="setting-row">
        <label>Audit log (days)</label>
        <input type="number" id="auditRetention" min="1" max="3650" value="365">
        <button id="saveRetentionBtn" class="btn btn-primary btn-sm">Save</button>
      </div>
    </div>

    <div class="settings-section">
      <h2>Change Admin Secret</h2>
      <div class="setting-row">
        <label>Current secret</label>
        <input type="password" id="currentSecret" placeholder="Current secret" autocomplete="off">
      </div>
      <div class="setting-row">
        <label>New secret</label>
        <input type="password" id="newSecret" placeholder="New secret (min 12 chars)" autocomplete="off">
      </div>
      <div class="setting-row">
        <label>Confirm new secret</label>
        <input type="password" id="confirmSecret" placeholder="Confirm new secret" autocomplete="off">
        <button id="changeSecretBtn" class="btn btn-warning btn-sm">Change Secret</button>
      </div>
    </div>
  </div>

  <!-- ─── Users Tab ──────────────────────────────────────── -->
  <div id="tab-users" class="tab-content">
    <div class="filter-bar">
      <input type="text" id="userSearch" placeholder="Search email/name...">
      <select id="userRoleFilter">
        <option value="">All Roles</option>
        <option value="admin">Admin</option>
        <option value="analyst">Analyst</option>
        <option value="viewer">Viewer</option>
      </select>
      <select id="userActiveFilter">
        <option value="">All Status</option>
        <option value="true">Active</option>
        <option value="false">Disabled</option>
      </select>
      <select id="userSort">
        <option value="created">Created</option>
        <option value="email">Email</option>
        <option value="lastLogin">Last Login</option>
      </select>
      <div style="flex:1;"></div>
      <button id="createUserBtn" class="btn btn-primary btn-sm">Create User</button>
      <button id="exportUsersBtn" class="btn btn-outline btn-sm">Export CSV</button>
    </div>

    <div id="usersBulkBar" class="bulk-bar">
      <span class="count" id="bulkCount">0</span> selected
      <button id="bulkSelectAll" class="btn btn-outline btn-sm">Select All</button>
      <button id="bulkDeselectAll" class="btn btn-outline btn-sm">Deselect All</button>
      <select id="bulkRoleSelect">
        <option value="admin">Admin</option>
        <option value="analyst">Analyst</option>
        <option value="viewer">Viewer</option>
      </select>
      <button id="bulkChangeRole" class="btn btn-outline btn-sm">Change Role</button>
      <button id="bulkEnable" class="btn btn-primary btn-sm">Enable</button>
      <button id="bulkDisable" class="btn btn-danger btn-sm">Disable</button>
    </div>

    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th style="width:30px;"><input type="checkbox" id="userCheckAll" class="row-check"></th>
            <th>Email</th>
            <th>Display Name</th>
            <th>Role</th>
            <th>Active</th>
            <th>Last Login</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody id="usersBody"></tbody>
      </table>
    </div>
  </div>

  <!-- ─── Investigations Tab ─────────────────────────────── -->
  <div id="tab-investigations" class="tab-content">
    <div class="filter-bar">
      <input type="text" id="invSearch" placeholder="Search name...">
      <select id="invStatusFilter">
        <option value="">All Status</option>
        <option value="active">Active</option>
        <option value="closed">Closed</option>
        <option value="archived">Archived</option>
      </select>
    </div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Status</th>
            <th>Creator</th>
            <th>Members</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody id="investigationsBody"></tbody>
      </table>
    </div>
  </div>

  <!-- ─── Audit Log Tab ──────────────────────────────────── -->
  <div id="tab-audit" class="tab-content">
    <div class="filter-bar">
      <select id="auditUserFilter"><option value="">All Users</option></select>
      <select id="auditCategoryFilter">
        <option value="">All Categories</option>
        <option value="admin">admin</option>
        <option value="auth">auth</option>
        <option value="note">note</option>
        <option value="task">task</option>
        <option value="investigation">investigation</option>
        <option value="timeline">timeline</option>
        <option value="whiteboard">whiteboard</option>
        <option value="ioc">ioc</option>
        <option value="chat">chat</option>
        <option value="file">file</option>
      </select>
      <input type="text" id="auditActionFilter" placeholder="Action...">
      <select id="auditFolderFilter"><option value="">All Investigations</option></select>
      <input type="date" id="auditDateFrom">
      <input type="date" id="auditDateTo">
      <input type="text" id="auditSearchFilter" placeholder="Search detail...">
      <button id="auditApplyBtn" class="btn btn-primary btn-sm">Apply</button>
      <button id="auditExportBtn" class="btn btn-outline btn-sm">Export CSV</button>
    </div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Timestamp</th>
            <th>User</th>
            <th>Category</th>
            <th>Action</th>
            <th>Detail</th>
            <th>Investigation</th>
          </tr>
        </thead>
        <tbody id="auditBody"></tbody>
      </table>
    </div>
    <div class="pagination" id="auditPagination">
      <button id="auditPrev" class="btn btn-outline btn-sm" disabled>Prev</button>
      <span id="auditPageInfo">Page 1</span>
      <button id="auditNext" class="btn btn-outline btn-sm">Next</button>
      <select id="auditPageSize">
        <option value="25">25</option>
        <option value="50" selected>50</option>
        <option value="100">100</option>
      </select>
      <span>per page</span>
    </div>
  </div>

  <!-- ─── Sessions Tab ───────────────────────────────────── -->
  <div id="tab-sessions" class="tab-content">
    <div style="margin-bottom:1rem;">
      <button id="forceLogoutAllBtn" class="btn btn-danger btn-sm">Force Logout All Users</button>
    </div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>User Email</th>
            <th>Display Name</th>
            <th>Session Created</th>
            <th>Expires</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody id="sessionsBody"></tbody>
      </table>
    </div>
  </div>
</div>

<!-- ═══ TOASTS ═══════════════════════════════════════════════════ -->
<div class="toast-container" id="toasts"></div>

<!-- ═══ MODALS ═══════════════════════════════════════════════════ -->

<!-- Generic modal (reset password, confirmations) -->
<div id="genericModal" class="modal-overlay">
  <div class="modal">
    <h3 id="modalTitle">Confirm</h3>
    <p id="modalText"></p>
    <div id="modalExtraContent"></div>
    <div class="modal-actions">
      <button id="closeModalBtn" class="btn btn-outline btn-sm">Close</button>
      <button id="confirmModalBtn" class="btn btn-danger btn-sm">Confirm</button>
    </div>
  </div>
</div>

<!-- Create User modal -->
<div id="createUserModal" class="modal-overlay">
  <div class="modal">
    <h3>Create User</h3>
    <div class="form-group">
      <label>Email</label>
      <input type="email" id="newUserEmail" placeholder="user@example.com">
    </div>
    <div class="form-group">
      <label>Display Name</label>
      <input type="text" id="newUserName" placeholder="Display name" maxlength="15">
    </div>
    <div class="form-group">
      <label>Password (min 8 chars)</label>
      <input type="password" id="newUserPassword" placeholder="Password">
    </div>
    <div class="form-group">
      <label>Role</label>
      <select id="newUserRole">
        <option value="analyst">Analyst</option>
        <option value="admin">Admin</option>
        <option value="viewer">Viewer</option>
      </select>
    </div>
    <div class="modal-actions">
      <button id="cancelCreateUser" class="btn btn-outline btn-sm">Cancel</button>
      <button id="submitCreateUser" class="btn btn-primary btn-sm">Create</button>
    </div>
  </div>
</div>

<!-- Purge Confirmation modal -->
<div id="purgeModal" class="modal-overlay">
  <div class="modal">
    <h3 style="color:#f85149;">Purge All Content</h3>
    <p>This will permanently delete ALL content from this investigation. The investigation and its members will be kept.</p>
    <div id="purgeEntityCounts" style="margin-bottom:1rem;font-size:0.85rem;color:#c9d1d9;"></div>
    <div class="form-group">
      <label>Type the investigation name to confirm:</label>
      <input type="text" id="purgeConfirmInput" placeholder="">
    </div>
    <div class="modal-actions">
      <button id="cancelPurge" class="btn btn-outline btn-sm">Cancel</button>
      <button id="confirmPurge" class="btn btn-danger btn-sm" disabled>Purge</button>
    </div>
  </div>
</div>

<!-- ═══ DETAIL PANELS ════════════════════════════════════════════ -->
<div id="detailBackdrop" class="detail-backdrop"></div>
<div id="detailPanel" class="detail-panel">
  <button class="close-btn" id="closeDetailBtn">&times;</button>
  <div id="detailContent"></div>
</div>

<script nonce="${nonce}">
/* ═══════════════════════════════════════════════════════════════
   ADMIN PANEL JS
   ═══════════════════════════════════════════════════════════════ */

var BASE = location.origin;
var token = sessionStorage.getItem('adminToken');

// Cached data for client-side filtering
var allUsers = [];
var allInvestigations = [];

// ─── API helper ──────────────────────────────────────────────

function api(path, opts) {
  opts = opts || {};
  var headers = { 'Content-Type': 'application/json' };
  if (opts.headers) { for (var k in opts.headers) headers[k] = opts.headers[k]; }
  if (token) headers['Authorization'] = 'Bearer ' + token;
  return fetch(BASE + '/admin/api' + path, Object.assign({}, opts, { headers: headers })).then(function(r) {
    if (r.status === 401 && token) { logout(); throw new Error('Session expired'); }
    return r.json().then(function(data) {
      if (!r.ok) throw new Error(data.error || 'Request failed');
      return data;
    });
  });
}

function apiRaw(path) {
  var headers = {};
  if (token) headers['Authorization'] = 'Bearer ' + token;
  return fetch(BASE + '/admin/api' + path, { headers: headers }).then(function(r) {
    if (r.status === 401 && token) { logout(); throw new Error('Session expired'); }
    if (!r.ok) throw new Error('Export failed');
    return r;
  });
}

function toast(msg, type) {
  type = type || 'success';
  var el = document.createElement('div');
  el.className = 'toast toast-' + type;
  el.textContent = msg;
  document.getElementById('toasts').appendChild(el);
  setTimeout(function() { el.remove(); }, 3500);
}

function esc(s) { var d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

function fmtDate(d) { return d ? new Date(d).toLocaleString() : 'Never'; }
function fmtShortDate(d) { return d ? new Date(d).toLocaleDateString() : ''; }

function categoryBadge(cat) {
  var colors = { admin: 'red', auth: 'blue', note: 'green', task: 'yellow', investigation: 'blue' };
  var c = colors[cat] || 'gray';
  return '<span class="badge badge-' + c + '">' + esc(cat) + '</span>';
}

function statusBadge(status) {
  var colors = { active: 'green', closed: 'gray', archived: 'yellow' };
  var c = colors[status] || 'gray';
  return '<span class="badge badge-' + c + '">' + esc(status || 'active') + '</span>';
}

/* ═══ LOGIN / LOGOUT ══════════════════════════════════════════ */

document.getElementById('loginForm').addEventListener('submit', function(e) {
  e.preventDefault();
  var errEl = document.getElementById('loginError');
  errEl.style.display = 'none';
  api('/login', { method: 'POST', body: JSON.stringify({ secret: document.getElementById('secret').value }) })
    .then(function(res) {
      token = res.token;
      sessionStorage.setItem('adminToken', token);
      showDashboard();
    })
    .catch(function(err) {
      errEl.textContent = err.message;
      errEl.style.display = 'block';
    });
});

document.getElementById('logoutBtn').addEventListener('click', function() { logout(); });

function logout() {
  token = null;
  sessionStorage.removeItem('adminToken');
  document.getElementById('dashboard').style.display = 'none';
  document.getElementById('login').style.display = 'flex';
  document.getElementById('secret').value = '';
}

/* ═══ TAB NAVIGATION ══════════════════════════════════════════ */

document.querySelectorAll('.tab-btn').forEach(function(btn) {
  btn.addEventListener('click', function() {
    document.querySelectorAll('.tab-btn').forEach(function(b) { b.classList.remove('active'); });
    document.querySelectorAll('.tab-content').forEach(function(c) { c.classList.remove('active'); });
    btn.classList.add('active');
    document.getElementById(btn.dataset.tab).classList.add('active');

    // Load data for the tab
    var tab = btn.dataset.tab;
    if (tab === 'tab-users') renderUsers();
    if (tab === 'tab-investigations') renderInvestigations();
    if (tab === 'tab-audit') loadAuditLog();
    if (tab === 'tab-sessions') loadSessions();
  });
});

/* ═══ DASHBOARD ═══════════════════════════════════════════════ */

function showDashboard() {
  document.getElementById('login').style.display = 'none';
  document.getElementById('dashboard').style.display = 'block';
  loadAll();
}

function loadAll() {
  loadStats();
  loadSettings();
  loadAllowedEmails();
  loadUsersData();
  loadInvestigationsData();
}

function loadStats() {
  return api('/stats').then(function(s) {
    document.getElementById('statsGrid').innerHTML =
      [['Total Users', s.totalUsers], ['Active Users', s.activeUsers], ['Investigations', s.investigations],
       ['Active Sessions', s.activeSessions], ['Audit Events (24h)', s.auditLogEntries24h]]
        .map(function(a) { return '<div class="stat-card"><div class="label">' + a[0] + '</div><div class="value">' + a[1] + '</div></div>'; }).join('');
  }).catch(function(err) { toast(err.message, 'error'); });
}

/* ═══ SETTINGS ════════════════════════════════════════════════ */

function loadSettings() {
  return api('/settings').then(function(data) {
    document.getElementById('serverNameInput').value = data.serverName || '';
    document.getElementById('regModeSelect').value = data.registrationMode;
    toggleEmailSection(data.registrationMode);
    document.getElementById('sessionTtl').value = data.ttlHours || 24;
    document.getElementById('maxSessions').value = data.maxPerUser || 0;
    document.getElementById('notifRetention').value = data.notificationRetentionDays || 90;
    document.getElementById('auditRetention').value = data.auditLogRetentionDays || 365;
  }).catch(function(err) { toast(err.message, 'error'); });
}

document.getElementById('saveServerNameBtn').addEventListener('click', function() {
  var name = document.getElementById('serverNameInput').value.trim();
  if (!name) { toast('Server name cannot be empty', 'error'); return; }
  api('/settings', { method: 'PATCH', body: JSON.stringify({ serverName: name }) })
    .then(function() { toast('Server name updated'); })
    .catch(function(err) { toast(err.message, 'error'); loadSettings(); });
});

function toggleEmailSection(mode) {
  document.getElementById('allowedEmailsSection').style.display = mode === 'invite' ? '' : 'none';
}

document.getElementById('regModeSelect').addEventListener('change', function() {
  var mode = this.value;
  api('/settings', { method: 'PATCH', body: JSON.stringify({ registrationMode: mode }) })
    .then(function() { toggleEmailSection(mode); toast('Registration mode updated'); })
    .catch(function(err) { toast(err.message, 'error'); loadSettings(); });
});

document.getElementById('saveSessionBtn').addEventListener('click', function() {
  var ttl = parseInt(document.getElementById('sessionTtl').value, 10);
  var max = parseInt(document.getElementById('maxSessions').value, 10);
  if (isNaN(ttl) || ttl < 1) { toast('TTL must be at least 1 hour', 'error'); return; }
  if (isNaN(max) || max < 0) { toast('Max sessions must be 0 or more', 'error'); return; }
  api('/settings', { method: 'PATCH', body: JSON.stringify({ ttlHours: ttl, maxPerUser: max }) })
    .then(function() { toast('Session settings updated'); })
    .catch(function(err) { toast(err.message, 'error'); });
});

document.getElementById('saveRetentionBtn').addEventListener('click', function() {
  var notif = parseInt(document.getElementById('notifRetention').value, 10);
  var audit = parseInt(document.getElementById('auditRetention').value, 10);
  if (isNaN(notif) || notif < 1 || notif > 3650) { toast('Notification retention must be 1-3650 days', 'error'); return; }
  if (isNaN(audit) || audit < 1 || audit > 3650) { toast('Audit log retention must be 1-3650 days', 'error'); return; }
  api('/settings', { method: 'PATCH', body: JSON.stringify({ notificationRetentionDays: notif, auditLogRetentionDays: audit }) })
    .then(function() { toast('Retention settings updated'); })
    .catch(function(err) { toast(err.message, 'error'); });
});

document.getElementById('changeSecretBtn').addEventListener('click', function() {
  var current = document.getElementById('currentSecret').value;
  var newSec = document.getElementById('newSecret').value;
  var confirm = document.getElementById('confirmSecret').value;
  if (!current) { toast('Enter current secret', 'error'); return; }
  if (newSec.length < 12) { toast('New secret must be at least 12 characters', 'error'); return; }
  if (newSec !== confirm) { toast('New secrets do not match', 'error'); return; }
  api('/change-secret', { method: 'POST', body: JSON.stringify({ currentSecret: current, newSecret: newSec }) })
    .then(function() {
      toast('Admin secret changed');
      document.getElementById('currentSecret').value = '';
      document.getElementById('newSecret').value = '';
      document.getElementById('confirmSecret').value = '';
    })
    .catch(function(err) { toast(err.message, 'error'); });
});

/* ═══ ALLOWED EMAILS ══════════════════════════════════════════ */

document.getElementById('addEmailBtn').addEventListener('click', function() { addEmail(); });
document.getElementById('newEmailInput').addEventListener('keydown', function(e) {
  if (e.key === 'Enter') addEmail();
});
document.getElementById('emailList').addEventListener('click', function(e) {
  var btn = e.target.closest('[data-action="remove-email"]');
  if (btn) removeEmail(btn.dataset.email);
});

function loadAllowedEmails() {
  return api('/allowed-emails').then(function(data) {
    var list = document.getElementById('emailList');
    if (data.emails.length === 0) {
      list.innerHTML = '<div class="email-empty">No emails on the allowlist</div>';
      return;
    }
    list.innerHTML = data.emails.map(function(e) {
      return '<div class="email-item"><span class="email-addr">' + esc(e.email) + '</span>' +
        '<button class="btn btn-danger btn-sm" data-action="remove-email" data-email="' + esc(e.email) + '">Remove</button></div>';
    }).join('');
  }).catch(function(err) { toast(err.message, 'error'); });
}

function addEmail() {
  var input = document.getElementById('newEmailInput');
  var email = input.value.trim().toLowerCase();
  if (!email) return;
  api('/allowed-emails', { method: 'POST', body: JSON.stringify({ email: email }) })
    .then(function() { input.value = ''; toast('Email added'); loadAllowedEmails(); })
    .catch(function(err) { toast(err.message, 'error'); });
}

function removeEmail(email) {
  api('/allowed-emails/' + encodeURIComponent(email), { method: 'DELETE' })
    .then(function() { toast('Email removed'); loadAllowedEmails(); })
    .catch(function(err) { toast(err.message, 'error'); });
}

/* ═══ USERS TAB ═══════════════════════════════════════════════ */

function loadUsersData() {
  return api('/users').then(function(data) {
    allUsers = data.users;
    renderUsers();
  }).catch(function(err) { toast(err.message, 'error'); });
}

function getFilteredUsers() {
  var search = document.getElementById('userSearch').value.toLowerCase();
  var roleFilter = document.getElementById('userRoleFilter').value;
  var activeFilter = document.getElementById('userActiveFilter').value;
  var sortBy = document.getElementById('userSort').value;

  var filtered = allUsers.filter(function(u) {
    if (search && u.email.toLowerCase().indexOf(search) === -1 && u.displayName.toLowerCase().indexOf(search) === -1) return false;
    if (roleFilter && u.role !== roleFilter) return false;
    if (activeFilter === 'true' && !u.active) return false;
    if (activeFilter === 'false' && u.active) return false;
    return true;
  });

  filtered.sort(function(a, b) {
    if (sortBy === 'email') return a.email.localeCompare(b.email);
    if (sortBy === 'lastLogin') return (b.lastLoginAt || '').localeCompare(a.lastLoginAt || '');
    return (a.createdAt || '').localeCompare(b.createdAt || '');
  });

  return filtered;
}

function renderUsers() {
  var filtered = getFilteredUsers();
  var tbody = document.getElementById('usersBody');
  tbody.innerHTML = filtered.map(function(u) {
    var lastLogin = u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : 'Never';
    return '<tr>' +
      '<td><input type="checkbox" class="row-check user-check" data-id="' + esc(u.id) + '"></td>' +
      '<td><a data-action="user-detail" data-id="' + esc(u.id) + '">' + esc(u.email) + '</a></td>' +
      '<td>' + esc(u.displayName) + '</td>' +
      '<td><select data-action="role" data-id="' + esc(u.id) + '">' +
        ['admin','analyst','viewer'].map(function(r) { return '<option value="' + r + '"' + (r === u.role ? ' selected' : '') + '>' + r + '</option>'; }).join('') +
      '</select></td>' +
      '<td><label class="toggle"><input type="checkbox" data-action="active" data-id="' + esc(u.id) + '"' + (u.active ? ' checked' : '') + '><span class="slider"></span></label></td>' +
      '<td>' + lastLogin + '</td>' +
      '<td><button class="btn btn-danger btn-sm" data-action="reset" data-id="' + esc(u.id) + '" data-email="' + esc(u.email) + '">Reset PW</button></td>' +
      '</tr>';
  }).join('');
  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="color:#8b949e;font-style:italic;">No users found</td></tr>';
  }
  updateBulkBar();
}

// Filter event listeners
document.getElementById('userSearch').addEventListener('input', function() { renderUsers(); });
document.getElementById('userRoleFilter').addEventListener('change', function() { renderUsers(); });
document.getElementById('userActiveFilter').addEventListener('change', function() { renderUsers(); });
document.getElementById('userSort').addEventListener('change', function() { renderUsers(); });

// Users table event delegation
document.getElementById('usersBody').addEventListener('change', function(e) {
  var el = e.target;
  if (el.dataset.action === 'role') {
    api('/users/' + el.dataset.id, { method: 'PATCH', body: JSON.stringify({ role: el.value }) })
      .then(function() { toast('Role updated'); return loadUsersData(); })
      .catch(function(err) { toast(err.message, 'error'); loadUsersData(); });
  } else if (el.dataset.action === 'active') {
    api('/users/' + el.dataset.id, { method: 'PATCH', body: JSON.stringify({ active: el.checked }) })
      .then(function() { toast(el.checked ? 'User activated' : 'User deactivated'); return loadUsersData(); })
      .catch(function(err) { toast(err.message, 'error'); loadUsersData(); });
  }
  if (el.classList.contains('user-check')) updateBulkBar();
});

document.getElementById('usersBody').addEventListener('click', function(e) {
  var resetBtn = e.target.closest('[data-action="reset"]');
  if (resetBtn) openResetModal(resetBtn.dataset.id, resetBtn.dataset.email);

  var detailLink = e.target.closest('[data-action="user-detail"]');
  if (detailLink) openUserDetail(detailLink.dataset.id);
});

// Check all
document.getElementById('userCheckAll').addEventListener('change', function() {
  var checked = this.checked;
  document.querySelectorAll('.user-check').forEach(function(cb) { cb.checked = checked; });
  updateBulkBar();
});

// ─── Bulk operations ─────────────────────────────────────────

function getSelectedUserIds() {
  var ids = [];
  document.querySelectorAll('.user-check:checked').forEach(function(cb) { ids.push(cb.dataset.id); });
  return ids;
}

function updateBulkBar() {
  var ids = getSelectedUserIds();
  var bar = document.getElementById('usersBulkBar');
  if (ids.length > 0) {
    bar.classList.add('visible');
    document.getElementById('bulkCount').textContent = ids.length;
  } else {
    bar.classList.remove('visible');
  }
}

document.getElementById('bulkSelectAll').addEventListener('click', function() {
  document.querySelectorAll('.user-check').forEach(function(cb) { cb.checked = true; });
  document.getElementById('userCheckAll').checked = true;
  updateBulkBar();
});

document.getElementById('bulkDeselectAll').addEventListener('click', function() {
  document.querySelectorAll('.user-check').forEach(function(cb) { cb.checked = false; });
  document.getElementById('userCheckAll').checked = false;
  updateBulkBar();
});

document.getElementById('bulkChangeRole').addEventListener('click', function() {
  var ids = getSelectedUserIds();
  if (ids.length === 0) return;
  var role = document.getElementById('bulkRoleSelect').value;
  api('/users/bulk', { method: 'POST', body: JSON.stringify({ userIds: ids, action: 'changeRole', role: role }) })
    .then(function(res) { toast('Changed role for ' + res.affected + ' user(s)'); return loadUsersData(); })
    .catch(function(err) { toast(err.message, 'error'); });
});

document.getElementById('bulkEnable').addEventListener('click', function() {
  var ids = getSelectedUserIds();
  if (ids.length === 0) return;
  api('/users/bulk', { method: 'POST', body: JSON.stringify({ userIds: ids, action: 'enable' }) })
    .then(function(res) { toast('Enabled ' + res.affected + ' user(s)'); return loadUsersData(); })
    .catch(function(err) { toast(err.message, 'error'); });
});

document.getElementById('bulkDisable').addEventListener('click', function() {
  var ids = getSelectedUserIds();
  if (ids.length === 0) return;
  api('/users/bulk', { method: 'POST', body: JSON.stringify({ userIds: ids, action: 'disable' }) })
    .then(function(res) { toast('Disabled ' + res.affected + ' user(s)'); return loadUsersData(); })
    .catch(function(err) { toast(err.message, 'error'); });
});

// ─── Create User ─────────────────────────────────────────────

document.getElementById('createUserBtn').addEventListener('click', function() {
  document.getElementById('newUserEmail').value = '';
  document.getElementById('newUserName').value = '';
  document.getElementById('newUserPassword').value = '';
  document.getElementById('newUserRole').value = 'analyst';
  document.getElementById('createUserModal').classList.add('active');
});

document.getElementById('cancelCreateUser').addEventListener('click', function() {
  document.getElementById('createUserModal').classList.remove('active');
});

document.getElementById('submitCreateUser').addEventListener('click', function() {
  var email = document.getElementById('newUserEmail').value.trim();
  var displayName = document.getElementById('newUserName').value.trim();
  var password = document.getElementById('newUserPassword').value;
  var role = document.getElementById('newUserRole').value;
  if (!email) { toast('Email required', 'error'); return; }
  if (!displayName) { toast('Display name required', 'error'); return; }
  if (password.length < 8) { toast('Password must be at least 8 chars', 'error'); return; }
  api('/users', { method: 'POST', body: JSON.stringify({ email: email, displayName: displayName, password: password, role: role }) })
    .then(function() {
      toast('User created');
      document.getElementById('createUserModal').classList.remove('active');
      loadUsersData();
      loadStats();
    })
    .catch(function(err) { toast(err.message, 'error'); });
});

// ─── Export Users ────────────────────────────────────────────

document.getElementById('exportUsersBtn').addEventListener('click', function() {
  apiRaw('/users/export').then(function(r) { return r.blob(); }).then(function(blob) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'users.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  }).catch(function(err) { toast(err.message, 'error'); });
});

// ─── User Detail Panel ──────────────────────────────────────

function openUserDetail(userId) {
  api('/users/' + userId + '/detail').then(function(data) {
    var u = data.user;
    var html = '<h3>' + esc(u.displayName) + '</h3>';
    html += '<div class="info-grid">';
    html += '<span class="lbl">Email</span><span class="val">' + esc(u.email) + '</span>';
    html += '<span class="lbl">Role</span><span class="val">' + esc(u.role) + '</span>';
    html += '<span class="lbl">Active</span><span class="val">' + (u.active ? 'Yes' : 'No') + '</span>';
    html += '<span class="lbl">Last Login</span><span class="val">' + fmtDate(u.lastLoginAt) + '</span>';
    html += '<span class="lbl">Created</span><span class="val">' + fmtDate(u.createdAt) + '</span>';
    html += '</div>';

    // Sessions
    html += '<div class="section"><h4>Active Sessions (' + data.sessions.length + ')</h4>';
    if (data.sessions.length > 0) {
      html += '<button class="btn btn-danger btn-sm" onclick="forceLogoutUser(\\''+esc(userId)+'\\')">Force Logout</button>';
      html += '<table style="margin-top:0.5rem;"><thead><tr><th>Created</th><th>Expires</th></tr></thead><tbody>';
      data.sessions.forEach(function(s) {
        html += '<tr><td>' + fmtDate(s.createdAt) + '</td><td>' + fmtDate(s.expiresAt) + '</td></tr>';
      });
      html += '</tbody></table>';
    } else {
      html += '<p style="color:#8b949e;font-size:0.85rem;">No active sessions</p>';
    }
    html += '</div>';

    // Memberships
    html += '<div class="section"><h4>Investigation Memberships (' + data.memberships.length + ')</h4>';
    if (data.memberships.length > 0) {
      html += '<table><thead><tr><th>Investigation</th><th>Role</th></tr></thead><tbody>';
      data.memberships.forEach(function(m) {
        html += '<tr><td>' + esc(m.folderName || m.folderId) + '</td><td>' + esc(m.role) + '</td></tr>';
      });
      html += '</tbody></table>';
    } else {
      html += '<p style="color:#8b949e;font-size:0.85rem;">No memberships</p>';
    }
    html += '</div>';

    // Recent Activity
    html += '<div class="section"><h4>Recent Activity (' + data.recentActivity.length + ')</h4>';
    if (data.recentActivity.length > 0) {
      html += '<table><thead><tr><th>Time</th><th>Category</th><th>Action</th><th>Detail</th></tr></thead><tbody>';
      data.recentActivity.forEach(function(a) {
        html += '<tr><td style="white-space:nowrap;">' + fmtDate(a.timestamp) + '</td><td>' + categoryBadge(a.category) + '</td><td>' + esc(a.action) + '</td><td>' + esc(a.detail) + '</td></tr>';
      });
      html += '</tbody></table>';
    } else {
      html += '<p style="color:#8b949e;font-size:0.85rem;">No activity</p>';
    }
    html += '</div>';

    document.getElementById('detailContent').innerHTML = html;
    openDetailPanel();
  }).catch(function(err) { toast(err.message, 'error'); });
}

function forceLogoutUser(userId) {
  api('/sessions/user/' + userId, { method: 'DELETE' })
    .then(function(res) { toast('Logged out ' + res.deletedCount + ' session(s)'); openUserDetail(userId); loadSessions(); })
    .catch(function(err) { toast(err.message, 'error'); });
}

/* ═══ RESET PASSWORD MODAL ════════════════════════════════════ */

var resetUserId = null;

function openResetModal(id, email) {
  resetUserId = id;
  document.getElementById('modalTitle').textContent = 'Reset Password';
  document.getElementById('modalText').textContent = 'Reset password for ' + email + '? This will generate a temporary password.';
  document.getElementById('modalExtraContent').innerHTML = '';
  document.getElementById('confirmModalBtn').style.display = '';
  document.getElementById('confirmModalBtn').textContent = 'Reset';
  document.getElementById('confirmModalBtn').onclick = confirmReset;
  document.getElementById('genericModal').classList.add('active');
}

document.getElementById('closeModalBtn').addEventListener('click', function() { closeGenericModal(); });

function closeGenericModal() {
  document.getElementById('genericModal').classList.remove('active');
  resetUserId = null;
}

function confirmReset() {
  if (!resetUserId) return;
  api('/users/' + resetUserId + '/reset-password', { method: 'POST' })
    .then(function(res) {
      document.getElementById('modalText').textContent = 'Temporary password (share securely):';
      document.getElementById('modalExtraContent').innerHTML = '<div class="temp-password">' + esc(res.temporaryPassword) + '</div>';
      document.getElementById('confirmModalBtn').style.display = 'none';
      toast('Password reset');
    })
    .catch(function(err) { toast(err.message, 'error'); closeGenericModal(); });
}

/* ═══ INVESTIGATIONS TAB ══════════════════════════════════════ */

function loadInvestigationsData() {
  return api('/investigations').then(function(data) {
    allInvestigations = data.investigations;
    renderInvestigations();
    // Also populate audit log folder filter
    var sel = document.getElementById('auditFolderFilter');
    sel.innerHTML = '<option value="">All Investigations</option>';
    data.investigations.forEach(function(inv) {
      sel.innerHTML += '<option value="' + esc(inv.id) + '">' + esc(inv.name) + '</option>';
    });
  }).catch(function(err) { toast(err.message, 'error'); });
}

function getFilteredInvestigations() {
  var search = document.getElementById('invSearch').value.toLowerCase();
  var statusFilter = document.getElementById('invStatusFilter').value;

  return allInvestigations.filter(function(inv) {
    if (search && inv.name.toLowerCase().indexOf(search) === -1) return false;
    if (statusFilter && (inv.status || 'active') !== statusFilter) return false;
    return true;
  });
}

function renderInvestigations() {
  var filtered = getFilteredInvestigations();
  var tbody = document.getElementById('investigationsBody');
  tbody.innerHTML = filtered.map(function(inv) {
    var created = fmtShortDate(inv.createdAt);
    return '<tr>' +
      '<td><a data-action="inv-detail" data-id="' + esc(inv.id) + '">' + esc(inv.name) + '</a></td>' +
      '<td>' + statusBadge(inv.status) + '</td>' +
      '<td>' + esc(inv.creatorName) + ' <span style="color:#8b949e">(' + esc(inv.creatorEmail) + ')</span></td>' +
      '<td>' + inv.memberCount + '</td>' +
      '<td>' + created + '</td>' +
      '</tr>';
  }).join('');
  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="color:#8b949e;font-style:italic;">No investigations found</td></tr>';
  }
}

document.getElementById('invSearch').addEventListener('input', function() { renderInvestigations(); });
document.getElementById('invStatusFilter').addEventListener('change', function() { renderInvestigations(); });

document.getElementById('investigationsBody').addEventListener('click', function(e) {
  var link = e.target.closest('[data-action="inv-detail"]');
  if (link) openInvestigationDetail(link.dataset.id);
});

// ─── Investigation Detail Panel ─────────────────────────────

var currentInvId = null;
var currentInvName = null;

function openInvestigationDetail(invId) {
  currentInvId = invId;
  api('/investigations/' + invId + '/detail').then(function(data) {
    var inv = data.investigation;
    currentInvName = inv.name;
    var ec = data.entityCounts;

    var html = '<h3>' + esc(inv.name) + '</h3>';
    html += '<div class="info-grid">';
    html += '<span class="lbl">Status</span><span class="val"><select id="invStatusSelect">';
    ['active','closed','archived'].forEach(function(s) {
      html += '<option value="' + s + '"' + ((inv.status||'active')===s?' selected':'') + '>' + s + '</option>';
    });
    html += '</select></span>';
    html += '<span class="lbl">Creator</span><span class="val">' + esc(inv.creatorName) + ' (' + esc(inv.creatorEmail) + ')</span>';
    html += '<span class="lbl">Created</span><span class="val">' + fmtDate(inv.createdAt) + '</span>';
    if (inv.description) html += '<span class="lbl">Description</span><span class="val">' + esc(inv.description) + '</span>';
    html += '</div>';

    // Entity counts
    html += '<div class="section"><h4>Content</h4>';
    html += '<div class="info-grid">';
    html += '<span class="lbl">Notes</span><span class="val">' + ec.notes + '</span>';
    html += '<span class="lbl">Tasks</span><span class="val">' + ec.tasks + '</span>';
    html += '<span class="lbl">Timeline Events</span><span class="val">' + ec.timelineEvents + '</span>';
    html += '<span class="lbl">Whiteboards</span><span class="val">' + ec.whiteboards + '</span>';
    html += '<span class="lbl">IOCs</span><span class="val">' + ec.standaloneIOCs + '</span>';
    html += '<span class="lbl">Chat Threads</span><span class="val">' + ec.chatThreads + '</span>';
    html += '<span class="lbl">Files</span><span class="val">' + ec.files + '</span>';
    html += '</div></div>';

    // Members
    html += '<div class="section"><h4>Members (' + data.members.length + ')</h4>';
    html += '<div style="margin-bottom:0.5rem;display:flex;gap:0.5rem;align-items:center;">';
    html += '<select id="addMemberUserId">';
    html += '<option value="">Add member...</option>';
    allUsers.forEach(function(u) {
      var isMember = data.members.some(function(m) { return m.userId === u.id; });
      if (!isMember) html += '<option value="' + esc(u.id) + '">' + esc(u.email) + '</option>';
    });
    html += '</select>';
    html += '<select id="addMemberRole"><option value="editor">Editor</option><option value="viewer">Viewer</option><option value="owner">Owner</option></select>';
    html += '<button class="btn btn-primary btn-sm" id="addMemberBtn">Add</button>';
    html += '</div>';
    if (data.members.length > 0) {
      html += '<table><thead><tr><th>User</th><th>Role</th><th>Joined</th><th></th></tr></thead><tbody>';
      data.members.forEach(function(m) {
        html += '<tr>';
        html += '<td>' + esc(m.userEmail || m.userId) + '</td>';
        html += '<td><select data-action="member-role" data-uid="' + esc(m.userId) + '">';
        ['owner','editor','viewer'].forEach(function(r) {
          html += '<option value="' + r + '"' + (r===m.role?' selected':'') + '>' + r + '</option>';
        });
        html += '</select></td>';
        html += '<td>' + fmtShortDate(m.joinedAt) + '</td>';
        html += '<td><button class="btn btn-danger btn-sm" data-action="remove-member" data-uid="' + esc(m.userId) + '">Remove</button></td>';
        html += '</tr>';
      });
      html += '</tbody></table>';
    }
    html += '</div>';

    // Danger Zone
    var totalEntities = ec.notes + ec.tasks + ec.timelineEvents + ec.whiteboards + ec.standaloneIOCs + ec.chatThreads + ec.files;
    html += '<div class="danger-zone"><h4>Danger Zone</h4>';
    html += '<p>Permanently delete all content (' + totalEntities + ' entities) from this investigation.</p>';
    html += '<button class="btn btn-danger btn-sm" id="openPurgeBtn"' + (totalEntities === 0 ? ' disabled' : '') + '>Purge All Content</button>';
    html += '</div>';

    document.getElementById('detailContent').innerHTML = html;
    openDetailPanel();

    // Status change
    document.getElementById('invStatusSelect').addEventListener('change', function() {
      api('/investigations/' + invId, { method: 'PATCH', body: JSON.stringify({ status: this.value }) })
        .then(function() { toast('Status updated'); loadInvestigationsData(); })
        .catch(function(err) { toast(err.message, 'error'); });
    });

    // Add member
    document.getElementById('addMemberBtn').addEventListener('click', function() {
      var uid = document.getElementById('addMemberUserId').value;
      var role = document.getElementById('addMemberRole').value;
      if (!uid) return;
      api('/investigations/' + invId + '/members', { method: 'POST', body: JSON.stringify({ userId: uid, role: role }) })
        .then(function() { toast('Member added'); openInvestigationDetail(invId); })
        .catch(function(err) { toast(err.message, 'error'); });
    });

    // Member role change / remove (delegation on detail content)
    document.getElementById('detailContent').addEventListener('change', function(e) {
      if (e.target.dataset.action === 'member-role') {
        api('/investigations/' + invId + '/members/' + e.target.dataset.uid, { method: 'PATCH', body: JSON.stringify({ role: e.target.value }) })
          .then(function() { toast('Role updated'); })
          .catch(function(err) { toast(err.message, 'error'); openInvestigationDetail(invId); });
      }
    });

    document.getElementById('detailContent').addEventListener('click', function(e) {
      var rmBtn = e.target.closest('[data-action="remove-member"]');
      if (rmBtn) {
        api('/investigations/' + invId + '/members/' + rmBtn.dataset.uid, { method: 'DELETE' })
          .then(function() { toast('Member removed'); openInvestigationDetail(invId); })
          .catch(function(err) { toast(err.message, 'error'); });
      }
    });

    // Purge
    var purgeBtn = document.getElementById('openPurgeBtn');
    if (purgeBtn) {
      purgeBtn.addEventListener('click', function() {
        openPurgeModal(invId, inv.name, ec);
      });
    }
  }).catch(function(err) { toast(err.message, 'error'); });
}

// ─── Purge modal ─────────────────────────────────────────────

function openPurgeModal(invId, invName, ec) {
  document.getElementById('purgeEntityCounts').innerHTML =
    '<strong>This will delete:</strong><br>' +
    ec.notes + ' notes, ' + ec.tasks + ' tasks, ' + ec.timelineEvents + ' timeline events, ' +
    ec.whiteboards + ' whiteboards, ' + ec.standaloneIOCs + ' IOCs, ' + ec.chatThreads + ' chat threads, ' + ec.files + ' files';
  document.getElementById('purgeConfirmInput').value = '';
  document.getElementById('purgeConfirmInput').placeholder = invName;
  document.getElementById('confirmPurge').disabled = true;
  document.getElementById('purgeModal').classList.add('active');

  document.getElementById('purgeConfirmInput').oninput = function() {
    document.getElementById('confirmPurge').disabled = this.value !== invName;
  };

  document.getElementById('confirmPurge').onclick = function() {
    api('/investigations/' + invId + '/content', { method: 'DELETE', body: JSON.stringify({ confirmName: invName }) })
      .then(function(res) {
        toast('Content purged');
        document.getElementById('purgeModal').classList.remove('active');
        openInvestigationDetail(invId);
        loadInvestigationsData();
      })
      .catch(function(err) { toast(err.message, 'error'); });
  };
}

document.getElementById('cancelPurge').addEventListener('click', function() {
  document.getElementById('purgeModal').classList.remove('active');
});

/* ═══ AUDIT LOG TAB ═══════════════════════════════════════════ */

var auditPage = 1;
var auditTotal = 0;

function loadAuditLog() {
  var pageSize = parseInt(document.getElementById('auditPageSize').value, 10);
  var params = 'page=' + auditPage + '&pageSize=' + pageSize;
  var userId = document.getElementById('auditUserFilter').value;
  var category = document.getElementById('auditCategoryFilter').value;
  var action = document.getElementById('auditActionFilter').value.trim();
  var folderId = document.getElementById('auditFolderFilter').value;
  var dateFrom = document.getElementById('auditDateFrom').value;
  var dateTo = document.getElementById('auditDateTo').value;
  var search = document.getElementById('auditSearchFilter').value.trim();

  if (userId) params += '&userId=' + encodeURIComponent(userId);
  if (category) params += '&category=' + encodeURIComponent(category);
  if (action) params += '&action=' + encodeURIComponent(action);
  if (folderId) params += '&folderId=' + encodeURIComponent(folderId);
  if (dateFrom) params += '&dateFrom=' + encodeURIComponent(dateFrom + 'T00:00:00Z');
  if (dateTo) params += '&dateTo=' + encodeURIComponent(dateTo + 'T23:59:59Z');
  if (search) params += '&search=' + encodeURIComponent(search);

  api('/audit-log?' + params).then(function(data) {
    auditTotal = data.total;
    var totalPages = Math.max(1, Math.ceil(data.total / pageSize));
    document.getElementById('auditPageInfo').textContent = 'Page ' + data.page + ' of ' + totalPages + ' (' + data.total + ' entries)';
    document.getElementById('auditPrev').disabled = data.page <= 1;
    document.getElementById('auditNext').disabled = data.page >= totalPages;

    var tbody = document.getElementById('auditBody');
    tbody.innerHTML = data.entries.map(function(e) {
      return '<tr>' +
        '<td style="white-space:nowrap;">' + fmtDate(e.timestamp) + '</td>' +
        '<td>' + esc(e.userEmail || e.userId || '') + '</td>' +
        '<td>' + categoryBadge(e.category) + '</td>' +
        '<td>' + esc(e.action) + '</td>' +
        '<td>' + esc(e.detail) + '</td>' +
        '<td>' + esc(e.folderName || '') + '</td>' +
        '</tr>';
    }).join('');
    if (data.entries.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="color:#8b949e;font-style:italic;">No entries found</td></tr>';
    }
  }).catch(function(err) { toast(err.message, 'error'); });

  // Populate user filter if empty
  if (document.getElementById('auditUserFilter').options.length <= 1) {
    allUsers.forEach(function(u) {
      var opt = document.createElement('option');
      opt.value = u.id;
      opt.textContent = u.email;
      document.getElementById('auditUserFilter').appendChild(opt);
    });
  }
}

document.getElementById('auditApplyBtn').addEventListener('click', function() {
  auditPage = 1;
  loadAuditLog();
});

document.getElementById('auditPrev').addEventListener('click', function() {
  if (auditPage > 1) { auditPage--; loadAuditLog(); }
});

document.getElementById('auditNext').addEventListener('click', function() {
  auditPage++;
  loadAuditLog();
});

document.getElementById('auditPageSize').addEventListener('change', function() {
  auditPage = 1;
  loadAuditLog();
});

document.getElementById('auditExportBtn').addEventListener('click', function() {
  var params = '';
  var userId = document.getElementById('auditUserFilter').value;
  var category = document.getElementById('auditCategoryFilter').value;
  var action = document.getElementById('auditActionFilter').value.trim();
  var folderId = document.getElementById('auditFolderFilter').value;
  var dateFrom = document.getElementById('auditDateFrom').value;
  var dateTo = document.getElementById('auditDateTo').value;
  var search = document.getElementById('auditSearchFilter').value.trim();

  var parts = [];
  if (userId) parts.push('userId=' + encodeURIComponent(userId));
  if (category) parts.push('category=' + encodeURIComponent(category));
  if (action) parts.push('action=' + encodeURIComponent(action));
  if (folderId) parts.push('folderId=' + encodeURIComponent(folderId));
  if (dateFrom) parts.push('dateFrom=' + encodeURIComponent(dateFrom + 'T00:00:00Z'));
  if (dateTo) parts.push('dateTo=' + encodeURIComponent(dateTo + 'T23:59:59Z'));
  if (search) parts.push('search=' + encodeURIComponent(search));
  if (parts.length > 0) params = '?' + parts.join('&');

  apiRaw('/audit-log/export' + params).then(function(r) { return r.blob(); }).then(function(blob) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'audit-log.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  }).catch(function(err) { toast(err.message, 'error'); });
});

/* ═══ SESSIONS TAB ════════════════════════════════════════════ */

function loadSessions() {
  api('/sessions').then(function(data) {
    var tbody = document.getElementById('sessionsBody');
    tbody.innerHTML = data.sessions.map(function(s) {
      return '<tr>' +
        '<td>' + esc(s.userEmail || '') + '</td>' +
        '<td>' + esc(s.userDisplayName || '') + '</td>' +
        '<td>' + fmtDate(s.createdAt) + '</td>' +
        '<td>' + fmtDate(s.expiresAt) + '</td>' +
        '<td><button class="btn btn-danger btn-sm" data-action="force-logout" data-uid="' + esc(s.userId) + '">Force Logout</button></td>' +
        '</tr>';
    }).join('');
    if (data.sessions.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="color:#8b949e;font-style:italic;">No active sessions</td></tr>';
    }
  }).catch(function(err) { toast(err.message, 'error'); });
}

document.getElementById('sessionsBody').addEventListener('click', function(e) {
  var btn = e.target.closest('[data-action="force-logout"]');
  if (btn) {
    api('/sessions/user/' + btn.dataset.uid, { method: 'DELETE' })
      .then(function(res) { toast('Logged out ' + res.deletedCount + ' session(s)'); loadSessions(); loadStats(); })
      .catch(function(err) { toast(err.message, 'error'); });
  }
});

document.getElementById('forceLogoutAllBtn').addEventListener('click', function() {
  document.getElementById('modalTitle').textContent = 'Force Logout All Users';
  document.getElementById('modalText').textContent = 'This will terminate ALL active user sessions. Are you sure?';
  document.getElementById('modalExtraContent').innerHTML = '';
  document.getElementById('confirmModalBtn').style.display = '';
  document.getElementById('confirmModalBtn').textContent = 'Logout All';
  document.getElementById('confirmModalBtn').onclick = function() {
    api('/sessions/all', { method: 'DELETE' })
      .then(function(res) { toast('Logged out ' + res.deletedCount + ' session(s)'); closeGenericModal(); loadSessions(); loadStats(); })
      .catch(function(err) { toast(err.message, 'error'); closeGenericModal(); });
  };
  document.getElementById('genericModal').classList.add('active');
});

/* ═══ DETAIL PANEL ════════════════════════════════════════════ */

function openDetailPanel() {
  document.getElementById('detailPanel').classList.add('active');
  document.getElementById('detailBackdrop').classList.add('active');
}

function closeDetailPanel() {
  document.getElementById('detailPanel').classList.remove('active');
  document.getElementById('detailBackdrop').classList.remove('active');
}

document.getElementById('closeDetailBtn').addEventListener('click', closeDetailPanel);
document.getElementById('detailBackdrop').addEventListener('click', closeDetailPanel);

/* ═══ INIT ════════════════════════════════════════════════════ */

if (token) showDashboard();
</script>
</body>
</html>`;
}
