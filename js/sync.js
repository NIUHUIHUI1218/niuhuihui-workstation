/**
 * 牛慧慧专属一体化工作台 - 云端同步层
 * 基于 GitHub API 实现零成本数据云端备份与双向同步
 * 全部数据以 JSON 文件形式存放在 data/sync/ 目录
 * 图片以 base64 形式打包在 JSON 中
 */

const Sync = {
  token: '',
  repo: '',
  owner: '',
  branch: 'data-sync',
  lastSync: 0,
  syncInProgress: false,

  async loadConfig() {
    this.token = await DB.getSettings('githubToken', '');
    this.repo = await DB.getSettings('githubRepo', '');
    this.owner = await DB.getSettings('githubOwner', '');
    this.lastSync = await DB.getSettings('lastSyncAt', 0);
    this.updateUI();
  },

  async saveConfig(token, owner, repo) {
    this.token = token; this.owner = owner; this.repo = repo;
    await DB.setSettings('githubToken', token);
    await DB.setSettings('githubOwner', owner);
    await DB.setSettings('githubRepo', repo);
    this.updateUI();
  },

  isEnabled() {
    return !!(this.token && this.repo && this.owner);
  },

  updateUI() {
    const el = document.getElementById('syncStatus');
    if (el) {
      if (this.isEnabled()) {
        el.textContent = this.lastSync ? `已同步 ${Utils.formatDateTime(this.lastSync)}` : '已配置';
        el.style.color = '#5B9A68';
      } else {
        el.textContent = '离线模式';
        el.style.color = '#A8A394';
      }
    }
  },

  // GitHub API 通用请求
  async ghFetch(path, options = {}) {
    const url = `https://api.github.com/repos/${this.owner}/${this.repo}/contents/${path}`;
    const headers = {
      'Authorization': `token ${this.token}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json'
    };
    const res = await fetch(url, { ...options, headers });
    if (!res.ok) {
      if (res.status === 404) return null;
      throw new Error(`GitHub API ${res.status}: ${await res.text()}`);
    }
    return await res.json();
  },

  // 获取云端 JSON 文件
  async getFile(path) {
    const data = await this.ghFetch(path);
    if (!data) return null;
    try {
      const json = atob(data.content.replace(/\s/g, ''));
      return { content: JSON.parse(json), sha: data.sha };
    } catch (e) {
      console.error('parse cloud file failed', e);
      return null;
    }
  },

  // 写入云端 JSON 文件
  async putFile(path, obj, sha = null, message = 'sync data') {
    const content = btoa(unescape(encodeURIComponent(JSON.stringify(obj))));
    const body = { message, content, branch: this.branch };
    if (sha) body.sha = sha;
    return await this.ghFetch(path, { method: 'PUT', body: JSON.stringify(body) });
  },

  // 确保 data-sync 分支存在
  async ensureBranch() {
    try {
      const branch = await fetch(
        `https://api.github.com/repos/${this.owner}/${this.repo}/git/ref/heads/${this.branch}`,
        { headers: { 'Authorization': `token ${this.token}`, 'Accept': 'application/vnd.github.v3+json' } }
      );
      if (branch.ok) return;
      // 创建 data-sync 分支（基于 main）
      const main = await fetch(
        `https://api.github.com/repos/${this.owner}/${this.repo}/git/ref/heads/main`,
        { headers: { 'Authorization': `token ${this.token}`, 'Accept': 'application/vnd.github.v3+json' } }
      );
      if (!main.ok) return;
      const { object } = await main.json();
      await fetch(
        `https://api.github.com/repos/${this.owner}/${this.repo}/git/refs`,
        {
          method: 'POST',
          headers: { 'Authorization': `token ${this.token}`, 'Accept': 'application/vnd.github.v3+json', 'Content-Type': 'application/json' },
          body: JSON.stringify({ ref: `refs/heads/${this.branch}`, sha: object.sha })
        }
      );
    } catch (e) { console.error('ensureBranch', e); }
  },

  // 拉取云端数据并合并（以云端为准覆盖本地）
  async pull() {
    if (!this.isEnabled()) return { ok: false, msg: '未配置同步' };
    try {
      await this.ensureBranch();
      const file = await this.getFile('data/sync/all-data.json');
      if (file && file.content) {
        await DB.importAll(file.content, true);
        this.lastSync = Date.now();
        await DB.setSettings('lastSyncAt', this.lastSync);
        this.updateUI();
        return { ok: true, msg: '已拉取云端数据' };
      }
      return { ok: true, msg: '云端暂无数据' };
    } catch (e) {
      console.error('pull', e);
      return { ok: false, msg: '拉取失败：' + e.message };
    }
  },

  // 推送本地数据到云端
  async push() {
    if (!this.isEnabled()) return { ok: false, msg: '未配置同步' };
    if (this.syncInProgress) return { ok: false, msg: '同步中...' };
    this.syncInProgress = true;
    try {
      await this.ensureBranch();
      const all = await DB.exportAll();
      const path = 'data/sync/all-data.json';
      const existing = await this.getFile(path);
      await this.putFile(path, all, existing?.sha, `sync ${new Date().toISOString()}`);
      this.lastSync = Date.now();
      await DB.setSettings('lastSyncAt', this.lastSync);
      this.updateUI();
      return { ok: true, msg: '已同步到云端' };
    } catch (e) {
      console.error('push', e);
      return { ok: false, msg: '同步失败：' + e.message };
    } finally {
      this.syncInProgress = false;
    }
  },

  // 双向同步：先拉取再推送
  async sync() {
    const p1 = await this.pull();
    if (!p1.ok) return p1;
    const p2 = await this.push();
    // 刷新所有模块
    Object.values(Modules).forEach(m => { if (m.render) m.render(); });
    return p2;
  },

  // 自动同步（页面加载时）
  async autoSync() {
    await this.loadConfig();
    if (!this.isEnabled()) return;
    const res = await this.pull();
    if (res.ok) {
      Object.values(Modules).forEach(m => { if (m.render) m.render(); });
    }
    // 每 5 分钟自动同步一次
    setInterval(async () => {
      if (navigator.onLine && this.isEnabled()) {
        await this.sync();
      }
    }, 5 * 60 * 1000);
  }
};

// 监听网络恢复后自动同步
window.addEventListener('online', async () => {
  UI.toast('网络已恢复，正在同步...', 'success');
  if (Sync.isEnabled()) {
    await Sync.sync();
  }
});
