/**
 * 模块3：记账本
 */
Modules.accounting = {
  txFilter: 'all',

  async init() {
    document.querySelectorAll('#page-accounting .filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#page-accounting .filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.txFilter = btn.dataset.filter;
        this.render();
      });
    });
    document.getElementById('txSearch').addEventListener('input', Utils.debounce(() => this.render()));
  },

  async render() {
    const budget = (await DB.getAll('budget'))[0] || { dailyBudget: 100, monthlyBudget: 3000 };
    const transactions = await DB.getAll('transactions');
    const today = Utils.todayStr();

    const todayExpense = transactions.filter(t => t.date === today && t.type === 'expense').reduce((s, t) => s + (t.amount || 0), 0);
    const todayIncome = transactions.filter(t => t.date === today && t.type === 'income').reduce((s, t) => s + (t.amount || 0), 0);
    const todayBalance = budget.dailyBudget - todayExpense + todayIncome;

    // 本月统计
    const monthIncome = transactions.filter(t => t.type === 'income' && Utils.isThisMonth(t.date)).reduce((s, t) => s + (t.amount || 0), 0);
    const monthExpense = transactions.filter(t => t.type === 'expense' && Utils.isThisMonth(t.date)).reduce((s, t) => s + (t.amount || 0), 0);
    const monthBalance = monthIncome - monthExpense;
    const savingRate = monthIncome > 0 ? ((monthBalance / monthIncome) * 100).toFixed(1) : 0;

    // 累计储蓄（本月结余）
    const monthlySavings = Math.max(0, monthBalance);

    document.getElementById('bc-dailyBudget').textContent = Utils.formatMoney(budget.dailyBudget);
    document.getElementById('bc-todaySpent').textContent = Utils.formatMoney(todayExpense);
    document.getElementById('bc-todayBalance').textContent = Utils.formatMoney(todayBalance);
    document.getElementById('bc-monthlySavings').textContent = Utils.formatMoney(monthlySavings);

    const budgetPct = budget.dailyBudget ? Math.min(100, (todayExpense / budget.dailyBudget) * 100) : 0;
    document.querySelector('.budget-fill').style.width = budgetPct + '%';
    document.getElementById('budgetText').textContent = budgetPct.toFixed(0) + '%';

    document.getElementById('stat-income').textContent = Utils.formatMoney(monthIncome);
    document.getElementById('stat-expense').textContent = Utils.formatMoney(monthExpense);
    document.getElementById('stat-balance').textContent = Utils.formatMoney(monthBalance);
    document.getElementById('stat-savingRate').textContent = savingRate + '%';

    // 近7天支出趋势
    this.drawChart(transactions);

    // 账单列表
    let list = transactions.slice().sort((a, b) => new Date(b.date) - new Date(a.date));
    if (this.txFilter !== 'all') list = list.filter(t => t.type === this.txFilter);
    const kw = document.getElementById('txSearch').value.trim().toLowerCase();
    if (kw) list = list.filter(t => (t.title + t.note + t.channel).toLowerCase().includes(kw));

    const el = document.getElementById('transactionList');
    if (list.length === 0) {
      el.innerHTML = '<p class="empty-hint">还没有记录，开始添加第一笔吧～</p>';
    } else {
      el.innerHTML = list.map(t => `
        <div class="tx-item">
          <div class="tx-left">
            <span class="tx-icon">${t.type === 'income' ? '💵' : (this.iconFor(t.title))}</span>
            <div class="tx-info">
              <div class="tx-title">${Utils.escapeHtml(t.title)} ${t.channel ? `<span class="tag-pill">${t.channel}</span>` : ''}</div>
              <div class="tx-meta">${t.date} · ${Utils.escapeHtml(t.note || '')}</div>
            </div>
          </div>
          <div class="tx-amount ${t.type}">${t.type === 'income' ? '+' : '-'}${Utils.formatMoney(t.amount)}</div>
          <div class="task-actions">
            <button onclick="Modules.accounting.edit('${t.id}')">✏️</button>
            <button onclick="Modules.accounting.del('${t.id}')">🗑️</button>
          </div>
        </div>
      `).join('');
    }
  },

  iconFor(title) {
    const map = {
      '餐饮': '🍜', '交通': '🚗', '购物': '🛍️', '住房': '🏠', '娱乐': '🎬',
      '医疗': '🏥', '教育': '📚', '宠物': '🐶', '通讯': '📱', '红包': '🧧'
    };
    for (const k in map) if (title.includes(k)) return map[k];
    return '🧾';
  },

  drawChart(transactions) {
    const canvas = document.getElementById('expenseChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr; canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const days = Utils.lastNDays(7);
    const data = days.map(day => transactions.filter(t => t.date === day && t.type === 'expense').reduce((s, t) => s + (t.amount || 0), 0));
    const labels = days.map(d => d.slice(5));
    const max = Math.max(...data, 1);

    const w = rect.width, h = rect.height;
    const pad = { top: 20, right: 20, bottom: 30, left: 40 };
    const gw = w - pad.left - pad.right;
    const gh = h - pad.top - pad.bottom;

    ctx.clearRect(0, 0, w, h);

    // 网格
    ctx.strokeStyle = '#F0EBE0'; ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = pad.top + gh * (i / 4);
      ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(w - pad.right, y); ctx.stroke();
    }

    // 折线
    const xFor = i => pad.left + (i / (data.length - 1)) * gw;
    const yFor = v => pad.top + gh - (v / max) * gh;

    ctx.beginPath();
    ctx.strokeStyle = '#8B7BAC'; ctx.lineWidth = 2;
    data.forEach((v, i) => {
      const x = xFor(i), y = yFor(v);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // 点
    data.forEach((v, i) => {
      const x = xFor(i), y = yFor(v);
      ctx.beginPath(); ctx.fillStyle = '#8B7BAC'; ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill();
    });

    // 标签
    ctx.fillStyle = '#7A7568'; ctx.font = '11px sans-serif'; ctx.textAlign = 'center';
    labels.forEach((l, i) => ctx.fillText(l, xFor(i), h - 10));

    // Y轴
    ctx.textAlign = 'right';
    for (let i = 0; i <= 4; i++) {
      const v = (max * (1 - i / 4)).toFixed(0);
      ctx.fillText(v, pad.left - 6, pad.top + gh * (i / 4) + 4);
    }
  },

  showAddDialog(editItem = null) {
    UI.showCustomModal(
      editItem ? '编辑账单' : '记一笔',
      `
        <div class="form-group">
          <label>类型</label>
          <select id="tx-type">
            <option value="expense" ${editItem?.type !== 'income' ? 'selected' : ''}>支出</option>
            <option value="income" ${editItem?.type === 'income' ? 'selected' : ''}>收入</option>
          </select>
        </div>
        <div class="form-group"><label>金额</label><input type="number" step="0.01" id="tx-amount" value="${editItem?.amount || ''}"></div>
        <div class="form-group"><label>名称</label><input id="tx-title" value="${editItem ? Utils.escapeHtml(editItem.title) : ''}" placeholder="如：午餐、工资"></div>
        <div class="form-group">
          <label>分类</label>
          <select id="tx-category">
            <option value="">选择分类</option>
            <option value="餐饮" ${editItem?.category === '餐饮' ? 'selected' : ''}>餐饮</option>
            <option value="交通" ${editItem?.category === '交通' ? 'selected' : ''}>交通</option>
            <option value="购物" ${editItem?.category === '购物' ? 'selected' : ''}>购物</option>
            <option value="住房" ${editItem?.category === '住房' ? 'selected' : ''}>住房</option>
            <option value="娱乐" ${editItem?.category === '娱乐' ? 'selected' : ''}>娱乐</option>
            <option value="医疗" ${editItem?.category === '医疗' ? 'selected' : ''}>医疗</option>
            <option value="教育" ${editItem?.category === '教育' ? 'selected' : ''}>教育</option>
            <option value="通讯" ${editItem?.category === '通讯' ? 'selected' : ''}>通讯</option>
            <option value="工资" ${editItem?.category === '工资' ? 'selected' : ''}>工资</option>
            <option value="理财" ${editItem?.category === '理财' ? 'selected' : ''}>理财</option>
            <option value="其他" ${editItem?.category === '其他' ? 'selected' : ''}>其他</option>
          </select>
        </div>
        <div class="form-group">
          <label>支付渠道</label>
          <select id="tx-channel">
            <option value="">选择渠道</option>
            <option value="微信" ${editItem?.channel === '微信' ? 'selected' : ''}>微信</option>
            <option value="支付宝" ${editItem?.channel === '支付宝' ? 'selected' : ''}>支付宝</option>
            <option value="银行卡" ${editItem?.channel === '银行卡' ? 'selected' : ''}>银行卡</option>
            <option value="现金" ${editItem?.channel === '现金' ? 'selected' : ''}>现金</option>
            <option value="其他" ${editItem?.channel === '其他' ? 'selected' : ''}>其他</option>
          </select>
        </div>
        <div class="form-group"><label>日期</label><input type="date" id="tx-date" value="${editItem?.date || Utils.todayStr()}"></div>
        <div class="form-group"><label>备注</label><input id="tx-note" value="${editItem ? Utils.escapeHtml(editItem.note || '') : ''}"></div>
      `,
      `<div class="modal-actions">
        <button class="btn btn-outline" onclick="UI.closeModal()">取消</button>
        <button class="btn btn-primary" onclick="Modules.accounting.save('${editItem?.id || ''}')">保存</button>
      </div>`
    );
  },

  async save(id) {
    const amount = parseFloat(document.getElementById('tx-amount').value) || 0;
    const title = document.getElementById('tx-title').value.trim();
    if (!amount || !title) { UI.toast('请填写金额和名称'); return; }
    const item = id ? await DB.get('transactions', id) : {};
    item.type = document.getElementById('tx-type').value;
    item.amount = amount;
    item.title = title;
    item.category = document.getElementById('tx-category').value;
    item.channel = document.getElementById('tx-channel').value;
    item.date = document.getElementById('tx-date').value || Utils.todayStr();
    item.note = document.getElementById('tx-note').value;
    await DB.put('transactions', item);
    UI.closeModal(); UI.toast('记账成功', 'success');
    this.render(); Modules.overview.render();
  },

  async edit(id) { const t = await DB.get('transactions', id); if (t) this.showAddDialog(t); },

  async del(id) {
    if (!confirm('确定删除该账单？')) return;
    await DB.delete('transactions', id); this.render(); Modules.overview.render();
  },

  async setBudget() {
    const budget = (await DB.getAll('budget'))[0] || { id: Utils.generateId('budget_'), dailyBudget: 100, monthlyBudget: 3000 };
    UI.showCustomModal(
      '设置预算',
      `
        <div class="form-group"><label>每日预算（元）</label><input type="number" id="bd-daily" value="${budget.dailyBudget}"></div>
        <div class="form-group"><label>每月预算（元）</label><input type="number" id="bd-monthly" value="${budget.monthlyBudget}"></div>
        <div class="form-group"><label>储蓄目标（元/月）</label><input type="number" id="bd-savings" value="${budget.savingsGoal || ''}"></div>
      `,
      `<div class="modal-actions">
        <button class="btn btn-outline" onclick="UI.closeModal()">取消</button>
        <button class="btn btn-primary" onclick="Modules.accounting.saveBudget('${budget.id}')">保存</button>
      </div>`
    );
  },

  async saveBudget(id) {
    await DB.put('budget', {
      id, dailyBudget: parseFloat(document.getElementById('bd-daily').value) || 0,
      monthlyBudget: parseFloat(document.getElementById('bd-monthly').value) || 0,
      savingsGoal: parseFloat(document.getElementById('bd-savings').value) || 0
    });
    UI.closeModal(); UI.toast('预算已保存', 'success'); this.render();
  },

  async exportBills() {
    const tx = await DB.getAll('transactions');
    const csv = ['date,type,amount,title,category,channel,note'].join(',') + '\n' +
      tx.map(t => [t.date, t.type, t.amount, t.title, t.category, t.channel, t.note].join(',')).join('\n');
    Utils.downloadFile(csv, `bills-${Utils.todayStr()}.csv`, 'text/csv');
  },

  // 导入预览数据（临时存储）
  _previewData: null,
  _previewSource: null,

  // ============ 多平台账单导入 ============
  showImportDialog() {
    const platformGuides = {
      alipay: {
        icon: '🔵', name: '支付宝',
        steps: [
          '打开支付宝 App → 我的 → 账单',
          '点击右上角「...」→ 开具交易流水证明',
          '选择时间范围 → 申请 → 填写邮箱',
          '在邮箱中下载解压后的 CSV 或 Excel 文件',
          '将此文件拖入下方区域'
        ],
        color: '#1677FF'
      },
      wechat: {
        icon: '🟢', name: '微信支付',
        steps: [
          '打开微信 → 我 → 服务 → 钱包 → 账单',
          '点击右上角「常见问题」→ 下载账单',
          '选择「用作证明材料」→ 选择时间范围',
          '填写邮箱 → 确认 → 输入支付密码验证',
          '在邮箱中下载解压后的 CSV 或 Excel 文件，拖入下方'
        ],
        color: '#07C160'
      },
      bank: {
        icon: '🏦', name: '银行卡',
        steps: [
          '登录银行 App → 交易明细/账单',
          '选择时间范围 → 导出/下载明细',
          '将下载的 CSV 或 Excel 文件拖入下方区域'
        ],
        color: '#D4380D'
      }
    };

    let guideHTML = '';
    for (const key in platformGuides) {
      const g = platformGuides[key];
      guideHTML += `
        <div class="import-guide-card" data-platform="${key}" onclick="Modules.accounting.selectPlatform('${key}')"
             style="border-left: 3px solid ${g.color}">
          <div class="import-guide-icon">${g.icon}</div>
          <div class="import-guide-body">
            <h4>${g.name}账单导入</h4>
            <ol class="import-steps">
              ${g.steps.map(s => `<li>${s}</li>`).join('')}
            </ol>
          </div>
        </div>
      `;
    }

    UI.showCustomModal(
      '📥 导入平台账单',
      `
        <div class="import-container">
          <p class="import-intro">选择账单来源平台，上传导出的 CSV 文件即可自动识别并导入。</p>
          <div class="import-guides">${guideHTML}</div>
          <div class="import-dropzone" id="importDropzone" style="display:none">
            <div class="dropzone-inner">
              <span class="dropzone-icon">📂</span>
              <p>将 CSV / Excel 文件拖入此处，或点击选择</p>
              <p class="dropzone-hint" id="dropzoneHint">当前平台：--</p>
              <input type="file" id="importFileInput" accept=".csv,.xls,.xlsx" style="display:none">
              <button class="btn btn-outline btn-sm" onclick="document.getElementById('importFileInput').click()">选择文件</button>
            </div>
          </div>
          <div class="import-preview" id="importPreview" style="display:none"></div>
          <div class="import-progress" id="importProgress" style="display:none"></div>
        </div>
      `,
      `<div class="modal-actions">
        <button class="btn btn-outline" onclick="UI.closeModal()">取消</button>
        <button class="btn btn-primary" id="importConfirmBtn" style="display:none" onclick="Modules.accounting.doImport()">确认导入</button>
      </div>`
    );

    // 设置拖放区域
    setTimeout(() => {
      const dropzone = document.getElementById('importDropzone');
      const fileInput = document.getElementById('importFileInput');
      if (!dropzone || !fileInput) return;

      fileInput.onchange = (e) => {
        if (e.target.files[0]) this.handleImportFile(e.target.files[0]);
      };

      dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('dragover'); });
      dropzone.addEventListener('dragleave', () => { dropzone.classList.remove('dragover'); });
      dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
        if (e.dataTransfer.files[0]) this.handleImportFile(e.dataTransfer.files[0]);
      });
    }, 200);
  },

  selectPlatform(platform) {
    this._previewSource = platform;
    document.querySelectorAll('.import-guide-card').forEach(c => c.classList.remove('selected'));
    const card = document.querySelector(`.import-guide-card[data-platform="${platform}"]`);
    if (card) card.classList.add('selected');

    const dropzone = document.getElementById('importDropzone');
    if (dropzone) dropzone.style.display = 'block';

    const hint = document.getElementById('dropzoneHint');
    const names = { alipay: '支付宝', wechat: '微信支付', bank: '银行卡' };
    if (hint) hint.textContent = '当前平台：' + (names[platform] || platform);

    // 清除之前的预览
    const preview = document.getElementById('importPreview');
    if (preview) preview.style.display = 'none';
    const confirmBtn = document.getElementById('importConfirmBtn');
    if (confirmBtn) confirmBtn.style.display = 'none';
  },

  async handleImportFile(file) {
    try {
      const ext = file.name.split('.').pop().toLowerCase();
      let result;

      if (ext === 'xlsx' || ext === 'xls') {
        // Excel 文件解析
        const buffer = await file.arrayBuffer();
        const rows = Utils.parseExcelToRows(buffer);
        if (!rows || rows.length < 2) {
          UI.toast('未能从 Excel 文件中读取到数据，请检查文件内容', 'error');
          return;
        }
        result = Utils.parseBillRows(rows, this._previewSource || 'auto');
      } else {
        // CSV 文件解析
        const text = await file.text();
        result = Utils.parseBillCSV(text, this._previewSource);
      }

      if (result.items.length === 0) {
        console.warn('[账单导入] 未识别到数据:', { source: result.source, fileName: file.name });
        UI.toast('未能从文件中识别到账单数据，请检查文件格式', 'error');
        return;
      }

      this._previewData = result.items;
      this._previewSource = result.source;

      // 显示预览
      const preview = document.getElementById('importPreview');
      const progress = document.getElementById('importProgress');
      if (preview) {
        const incomeItems = result.items.filter(x => x.type === 'income');
        const expenseItems = result.items.filter(x => x.type === 'expense');
        const totalIncome = incomeItems.reduce((s, x) => s + x.amount, 0);
        const totalExpense = expenseItems.reduce((s, x) => s + x.amount, 0);
        const sourceNames = { alipay: '支付宝', wechat: '微信支付', bank: '银行卡', unknown: '未知' };

        preview.innerHTML = `
          <div class="preview-summary">
            <div class="preview-stat">
              <span class="preview-label">识别来源</span>
              <span class="preview-value">${sourceNames[result.source] || result.source}</span>
            </div>
            <div class="preview-stat">
              <span class="preview-label">账单条数</span>
              <span class="preview-value">${result.items.length} 条</span>
            </div>
            <div class="preview-stat income">
              <span class="preview-label">收入合计</span>
              <span class="preview-value">${Utils.formatMoney(totalIncome)}</span>
            </div>
            <div class="preview-stat expense">
              <span class="preview-label">支出合计</span>
              <span class="preview-value">${Utils.formatMoney(totalExpense)}</span>
            </div>
          </div>
          <div class="preview-table-wrap">
            <table class="preview-table">
              <thead><tr><th>日期</th><th>类型</th><th>名称</th><th>金额</th><th>分类</th><th>渠道</th></tr></thead>
              <tbody>
                ${result.items.slice(0, 20).map(x => `
                  <tr>
                    <td>${x.date}</td>
                    <td>${x.type === 'income' ? '💰收入' : '💸支出'}</td>
                    <td title="${Utils.escapeHtml(x.title)}">${Utils.escapeHtml(x.title).substring(0, 15)}${x.title.length > 15 ? '...' : ''}</td>
                    <td class="${x.type}">${x.type === 'income' ? '+' : '-'}${Utils.formatMoney(x.amount)}</td>
                    <td>${x.category}</td>
                    <td><span class="tag-pill">${x.channel}</span></td>
                  </tr>
                `).join('')}
                ${result.items.length > 20 ? `<tr><td colspan="6" style="text-align:center;color:var(--text-muted)">... 还有 ${result.items.length - 20} 条</td></tr>` : ''}
              </tbody>
            </table>
          </div>
        `;
        preview.style.display = 'block';
      }

      if (progress) progress.style.display = 'none';
      const confirmBtn = document.getElementById('importConfirmBtn');
      if (confirmBtn) {
        confirmBtn.style.display = 'inline-block';
        confirmBtn.textContent = `确认导入 ${result.items.length} 条账单`;
      }

      UI.toast(`识别到 ${result.items.length} 条账单`, 'success');
    } catch (e) {
      console.error('导入文件解析失败:', e);
      UI.toast('文件解析失败，请检查文件格式', 'error');
    }
  },

  async doImport() {
    if (!this._previewData || this._previewData.length === 0) {
      UI.toast('没有可导入的数据', 'error');
      return;
    }

    const confirmBtn = document.getElementById('importConfirmBtn');
    if (confirmBtn) confirmBtn.disabled = true;

    const progress = document.getElementById('importProgress');
    if (progress) {
      progress.style.display = 'block';
      progress.innerHTML = '<div class="progress-bar-wrap"><div class="progress-bar"><div class="progress-fill" id="importProgressFill" style="width:0%"></div></div><span class="progress-text" id="importProgressText">0/' + this._previewData.length + '</span></div>';
    }

    let imported = 0, skipped = 0;
    const total = this._previewData.length;

    // 先获取已有的 platformTxId 用于去重
    const existing = await DB.getAll('transactions');
    const existingTxIds = new Set();
    for (const t of existing) {
      if (t.platformTxId) existingTxIds.add(t.platformTxId);
      // 也按 日期+金额+标题 组合去重
      existingTxIds.add(t.date + '_' + t.amount + '_' + t.title);
    }

    for (let i = 0; i < this._previewData.length; i++) {
      const item = this._previewData[i];
      const dedupKey = item.date + '_' + item.amount + '_' + item.title;

      if (item.platformTxId && existingTxIds.has(item.platformTxId)) {
        skipped++; continue;
      }
      if (existingTxIds.has(dedupKey)) {
        skipped++; continue;
      }

      await DB.put('transactions', {
        date: item.date, type: item.type, amount: item.amount,
        title: item.title, category: item.category, channel: item.channel,
        note: item.note, platformTxId: item.platformTxId, source: item.source
      });

      if (item.platformTxId) existingTxIds.add(item.platformTxId);
      existingTxIds.add(dedupKey);
      imported++;

      // 更新进度
      if (progress && i % 5 === 0) {
        const pct = Math.round((i / total) * 100);
        const fill = document.getElementById('importProgressFill');
        const text = document.getElementById('importProgressText');
        if (fill) fill.style.width = pct + '%';
        if (text) text.textContent = i + '/' + total;
      }
    }

    if (progress) {
      const fill = document.getElementById('importProgressFill');
      const text = document.getElementById('importProgressText');
      if (fill) fill.style.width = '100%';
      if (text) text.textContent = total + '/' + total;
    }

    UI.closeModal();
    this._previewData = null;
    this._previewSource = null;

    let msg = `✅ 成功导入 ${imported} 条`;
    if (skipped > 0) msg += `，跳过 ${skipped} 条重复`;
    UI.toast(msg, 'success');

    this.render();
    if (Modules.overview && Modules.overview.render) Modules.overview.render();
  }
};
