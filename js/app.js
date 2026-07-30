/**
 * 牛慧慧专属一体化工作台 - 主应用控制器
 */

window.UI = {
  _ready: false,
  currentModule: 'overview',

  init() {
    this.bindNav();
    this.bindMobile();
    document.getElementById('overviewDate').textContent = Utils.formatDate(new Date(), true);
    this.startReminderLoop();
    this.startAutoSync();
  },

  bindNav() {
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', () => {
        const mod = item.dataset.module;
        this.switchModule(mod);
      });
    });
  },

  switchModule(name) {
    this.currentModule = name;
    localStorage.setItem('nhh_currentModule', name);
    Utils.scrollToModule(name);
    const mod = Modules[name];
    if (mod && mod.render) mod.render();
  },

  bindMobile() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('navOverlay');
    document.getElementById('menuToggle').addEventListener('click', () => {
      sidebar.classList.toggle('open');
      overlay.classList.toggle('active');
    });
    overlay.addEventListener('click', () => {
      sidebar.classList.remove('open');
      overlay.classList.remove('active');
    });
    document.getElementById('syncBtn')?.addEventListener('click', async () => {
      UI.toast('正在同步...');
      const res = await Sync.sync();
      UI.toast(res.msg, res.ok ? 'success' : 'error');
    });
    document.getElementById('btnSettings')?.addEventListener('click', () => this.showSettings());
  },

  // 全局弹窗
  showModal(title, html, onConfirm = null, onCancel = null) {
    const modal = document.getElementById('globalModal');
    const content = document.getElementById('modalContent');
    content.innerHTML = `
      <h3>${title}</h3>
      <div class="modal-body">${html}</div>
      <div class="modal-actions">
        <button class="btn btn-outline" id="modalCancel">取消</button>
        <button class="btn btn-primary" id="modalConfirm">确定</button>
      </div>
    `;
    modal.classList.add('active');
    const confirmBtn = document.getElementById('modalConfirm');
    const cancelBtn = document.getElementById('modalCancel');
    confirmBtn.onclick = () => {
      if (onConfirm) onConfirm();
      this.closeModal();
    };
    cancelBtn.onclick = () => {
      if (onCancel) onCancel();
      this.closeModal();
    };
  },

  showCustomModal(title, html, actionsHtml = '') {
    const modal = document.getElementById('globalModal');
    const content = document.getElementById('modalContent');
    content.innerHTML = `<h3>${title}</h3><div class="modal-body">${html}</div>${actionsHtml}`;
    modal.classList.add('active');
  },

  closeModal() {
    document.getElementById('globalModal').classList.remove('active');
  },

  // Toast
  toast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => { toast.remove(); }, 2800);
  },

  // 设置面板
  async showSettings() {
    const aiConfig = await Utils.getAIConfig();
    this.showCustomModal('⚙️ 设置', `
      <div class="settings-section">
        <h4>GitHub 云同步配置</h4>
        <input class="settings-input" id="set-token" type="password" placeholder="Personal Access Token" value="${Sync.token}">
        <input class="settings-input" id="set-owner" placeholder="GitHub 用户名/组织" value="${Sync.owner}">
        <input class="settings-input" id="set-repo" placeholder="仓库名" value="${Sync.repo}">
        <p style="font-size:11px;color:var(--text-muted)">配置后数据将自动备份到仓库 data-sync 分支</p>
      </div>
      <div class="settings-section">
        <h4>🤖 AI 助手配置（可选）</h4>
        <p style="font-size:11px;color:var(--text-muted);margin-bottom:8px">用于每日感悟的图片/视频AI分析、求职JD技能总结。支持 DeepSeek / 通义千问 / OpenAI 兼容API。</p>
        <label style="display:flex;align-items:center;gap:6px;margin-bottom:8px">
          <input type="checkbox" id="set-ai-enabled" ${aiConfig.enabled ? 'checked' : ''}> 启用AI助手
        </label>
        <input class="settings-input" id="set-ai-key" type="password" placeholder="API Key" value="${aiConfig.apiKey}">
        <input class="settings-input" id="set-ai-url" placeholder="API地址（默认DeepSeek）" value="${aiConfig.apiUrl}">
        <input class="settings-input" id="set-ai-model" placeholder="模型名称" value="${aiConfig.model}">
      </div>
      <div class="settings-section">
        <h4>数据管理</h4>
        <button class="btn btn-outline" onclick="UI.exportAllData()">📥 导出全部数据</button>
        <button class="btn btn-outline" onclick="UI.importAllData()">📤 导入数据</button>
        <button class="btn btn-danger-outline" onclick="UI.clearAllData()">🗑️ 清空全部数据</button>
      </div>
    `, `
      <div class="modal-actions">
        <button class="btn btn-outline" onclick="UI.closeModal()">关闭</button>
        <button class="btn btn-primary" onclick="UI.saveSettings()">保存配置</button>
        <button class="btn btn-primary" onclick="UI.testSync()">立即同步</button>
      </div>
    `);
  },

  async saveSettings() {
    const token = document.getElementById('set-token').value.trim();
    const owner = document.getElementById('set-owner').value.trim();
    const repo = document.getElementById('set-repo').value.trim();
    await Sync.saveConfig(token, owner, repo);

    // 保存 AI 配置
    await DB.setSettings('aiEnabled', document.getElementById('set-ai-enabled').checked);
    await DB.setSettings('aiApiKey', document.getElementById('set-ai-key').value.trim());
    await DB.setSettings('aiApiUrl', document.getElementById('set-ai-url').value.trim() || 'https://api.deepseek.com/v1/chat/completions');
    await DB.setSettings('aiModel', document.getElementById('set-ai-model').value.trim() || 'deepseek-chat');

    UI.toast('配置已保存', 'success');
    this.closeModal();
  },

  async testSync() {
    UI.toast('正在同步...');
    const res = await Sync.sync();
    UI.toast(res.msg, res.ok ? 'success' : 'error');
  },

  async exportAllData() {
    const all = await DB.exportAll();
    Utils.downloadFile(JSON.stringify(all, null, 2), `niuhuihui-backup-${Utils.todayStr()}.json`);
  },

  importAllData() {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = '.json';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      const text = await file.text();
      const data = JSON.parse(text);
      await DB.importAll(data, true);
      Object.values(Modules).forEach(m => { if (m.render) m.render(); });
      UI.toast('导入成功', 'success');
    };
    input.click();
  },

  async clearAllData() {
    if (!confirm('⚠️ 确定要清空全部本地数据吗？此操作不可恢复！')) return;
    await DB.importAll({}, true);
    Object.values(Modules).forEach(m => { if (m.render) m.render(); });
    UI.toast('已清空', 'warning');
  },

  // 定时提醒循环
  startReminderLoop() {
    Utils.requestNotification();
    setInterval(() => this.checkReminders(), 30000); // 每 30 秒检查
  },

  async checkReminders() {
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;

    // 计划任务提醒
    const plans = await DB.getAll('plans');
    for (const p of plans) {
      if (p.status === 'done') continue;
      if (p.deadline && p.deadline.includes('T')) {
        const dt = new Date(p.deadline);
        const diff = dt - now;
        if (diff > 0 && diff < 60000 && !p.reminded) {
          this.showReminder(`任务提醒：${p.title}`);
          p.reminded = true; await DB.put('plans', p);
        }
      }
    }

    // 英语复习提醒
    const engSpeak = await DB.getAll('englishSpeaking');
    const engListen = await DB.getAll('englishListening');
    for (const item of engSpeak) {
      if (item.reviewDate === Utils.todayStr() && !item.reviewReminded) {
        this.showReminder(`英语复习：${item.title || '今日待复习素材'}`);
        item.reviewReminded = true; await DB.put('englishSpeaking', item);
      }
    }
    for (const item of engListen) {
      if (item.reviewDate === Utils.todayStr() && !item.reviewReminded) {
        this.showReminder(`英语听力复习：${item.title || '今日待复习素材'}`);
        item.reviewReminded = true; await DB.put('englishListening', item);
      }
    }

    // 面试打卡提醒
    const interview = await DB.getAll('interviewMaterials');
    for (const item of interview) {
      if (item.reviewDate === Utils.todayStr() && !item.reviewReminded) {
        this.showReminder(`面试复习：${item.question || '今日待复习'}`);
        item.reviewReminded = true; await DB.put('interviewMaterials', item);
      }
    }

    // 经期提醒
    const nextPeriod = await Modules.period.predictNextPeriod();
    if (nextPeriod) {
      const days = Utils.daysBetween(Utils.todayStr(), nextPeriod);
      if (days <= 3 && days >= 0) {
        const key = 'periodReminded_' + nextPeriod;
        const reminded = await DB.getSettings(key, false);
        if (!reminded) {
          this.showReminder(`经期提醒：预计 ${Utils.formatDate(nextPeriod)} 来月经，提前做好准备`);
          await DB.setSettings(key, true);
        }
      }
    }

    // 资讯收听提醒
    const newsTime = await DB.getSettings('newsReminderTime', '20:00');
    if (newsTime === timeStr) {
      const key = 'newsReminded_' + Utils.todayStr();
      const reminded = await DB.getSettings(key, false);
      if (!reminded) {
        this.showReminder('资讯提醒：今天的小宇宙播客/早咖啡更新啦，记得收听阅读');
        await DB.setSettings(key, true);
      }
    }

    // 读书打卡提醒
    const readTime = await DB.getSettings('readingReminderTime', '21:00');
    if (readTime === timeStr) {
      const key = 'readingReminded_' + Utils.todayStr();
      const reminded = await DB.getSettings(key, false);
      if (!reminded) {
        this.showReminder('读书提醒：该读书啦，充实今天的自己');
        await DB.setSettings(key, true);
      }
    }

    // 运动提醒
    const fitnessTime = await DB.getSettings('fitnessReminderTime', '18:00');
    if (fitnessTime === timeStr) {
      const key = 'fitnessReminded_' + Utils.todayStr();
      const reminded = await DB.getSettings(key, false);
      if (!reminded) {
        this.showReminder('运动提醒：该运动啦，保持健康体魄');
        await DB.setSettings(key, true);
      }
    }
  },

  showReminder(message) {
    document.getElementById('reminderBody').textContent = message;
    document.getElementById('reminderPopup').style.display = 'flex';
    Utils.playAlarm();
    Utils.notify('牛慧慧工作台', message);
  },

  dismissReminder() {
    document.getElementById('reminderPopup').style.display = 'none';
  },

  async startAutoSync() {
    await Sync.autoSync();
  }
};
const UI = window.UI;

// 全局错误捕获
window.addEventListener('error', (e) => {
  if (e.target && e.target.tagName === 'SCRIPT') {
    console.error('[WorkStation] Script load error:', e.target.src || 'inline script');
  }
  console.error('[WorkStation] Error:', e.message, e.filename, e.lineno);
});

// 应用初始化
document.addEventListener('DOMContentLoaded', async () => {
  console.log('[WorkStation] DOM ready, starting init...');
  try {
    await DB.init();
    console.log('[WorkStation] DB initialized');
    
    await Sync.loadConfig();
    console.log('[WorkStation] Sync config loaded');
    
    UI.init();
    console.log('[WorkStation] UI bound, modules:', Object.keys(Modules).join(', '));
    
    // 加载各模块初始数据
    for (const name in Modules) {
      if (Modules[name].init) {
        try {
          await Modules[name].init();
          console.log('[WorkStation] Module init:', name);
        } catch (e) {
          console.error('[WorkStation] Module init failed:', name, e);
        }
      }
    }
    
    // 加载自动抓取数据（不阻塞渲染）
    try { Modules.english.loadAutoData(); } catch(e) { console.error('[WorkStation] english auto data failed', e); }
    try { Modules.jobs.loadAutoData(); } catch(e) { console.error('[WorkStation] jobs auto data failed', e); }
    try { Modules.news.refreshNews(); } catch(e) { console.error('[WorkStation] news refresh failed', e); }
    
    // 渲染总览
    await Modules.overview.render();
    
    // 恢复上次停留的模块
    const savedModule = localStorage.getItem('nhh_currentModule');
    if (savedModule && Modules[savedModule] && savedModule !== 'overview') {
      UI.switchModule(savedModule);
    }
    
    UI._ready = true;
    console.log('[WorkStation] ✅ System ready - all modules loaded');
    UI.toast('系统就绪 ✓', 'success');
  } catch (e) {
    console.error('[WorkStation] 💥 Init failed:', e.message, e.stack);
    alert('系统初始化失败: ' + e.message + '\n请刷新页面或清除缓存后重试');
  }
});
