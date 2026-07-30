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

  async importBills() {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = '.csv';
    input.onchange = async (e) => {
      const text = await e.target.files[0].text();
      const rows = Utils.parseCSV(text);
      for (const r of rows) {
        await DB.put('transactions', {
          date: r.date || Utils.todayStr(), type: r.type || 'expense',
          amount: parseFloat(r.amount) || 0, title: r.title || '导入账单',
          category: r.category, channel: r.channel, note: r.note
        });
      }
      this.render(); Modules.overview.render();
      UI.toast('导入成功', 'success');
    };
    input.click();
  }
};
