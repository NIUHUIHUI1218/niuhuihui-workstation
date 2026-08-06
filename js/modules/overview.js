/**
 * 模块1：今日总览
 */
Modules.overview = {
  async render() {
    const date = document.getElementById('overviewDate');
    if (date) date.textContent = Utils.formatDate(new Date(), true);

    // 收集各模块数据
    const plans = await DB.getAll('plans');
    const tx = await DB.getAll('transactions');
    const engSpeak = await DB.getAll('englishSpeaking');
    const engListen = await DB.getAll('englishListening');
    const reviews = await DB.getAll('reviews');
    const jobs = await DB.getAll('jobs');
    const interview = await DB.getAll('interviewMaterials');
    const reading = await DB.getAll('readingNotes');
    const newsPodcast = await DB.getAll('newsPodcast');
    const newsCoffee = await DB.getAll('newsCoffee');
    const newsFinance = await DB.getAll('newsFinance');
    const periodRecords = await DB.getAll('periodRecords');
    const fitness = await DB.getAll('fitness');

    const today = Utils.todayStr();
    const plansToday = plans.filter(p => p.date === today || p.repeat === 'daily' || this.isRepeatDay(p));
    const donePlans = plansToday.filter(p => p.status === 'done').length;
    const planRate = plansToday.length ? Math.round(donePlans / plansToday.length * 100) : 0;

    const todayTx = tx.filter(t => t.date === today);
    const todayIncome = todayTx.filter(t => t.type === 'income').reduce((s, t) => s + (t.amount || 0), 0);
    const todayExpense = todayTx.filter(t => t.type === 'expense').reduce((s, t) => s + (t.amount || 0), 0);

    const engDone = engSpeak.filter(e => e.status === 'done').length + engListen.filter(e => e.status === 'done').length;
    const engTotal = engSpeak.length + engListen.length;

    const todayReview = reviews.find(r => r.date === today);

    const jobCount = jobs.length;
    const interviewTodo = interview.filter(i => i.status !== 'done').length;

    const readingTodo = reading.filter(r => !r.archived).length;

    const newsUnread = [...newsPodcast, ...newsCoffee, ...newsFinance].filter(n => n.status !== 'read').length;

    // 经期预警
    const nextPeriod = await Modules.period.predictNextPeriod();
    const periodDays = nextPeriod ? Utils.daysBetween(today, nextPeriod) : null;
    const periodWarning = periodDays !== null && periodDays <= 3;

    // 运动
    const todayFitness = fitness.filter(f => f.date === today);
    const fitnessDone = todayFitness.filter(f => f.status === 'done').length;

    // 卡片数据
    const cards = [
      { icon: '📋', title: '计划完成率', value: planRate + '%', sub: `${donePlans}/${plansToday.length} 完成`, cls: '', jump: 'plans' },
      { icon: '💰', title: '今日收支', value: (todayIncome - todayExpense).toFixed(2), sub: `收+${todayIncome.toFixed(2)} / 支-${todayExpense.toFixed(2)}`, cls: todayExpense > todayIncome ? 'warning' : '', jump: 'accounting' },
      { icon: '🏃', title: '今日运动', value: fitnessDone + '项', sub: `${todayFitness.length} 项计划`, cls: '', jump: 'fitness' },
      { icon: '📖', title: '英语学习', value: engDone + '/' + engTotal, sub: '已完成/全部', cls: '', jump: 'english' },
      { icon: '🔄', title: '今日复盘', value: todayReview ? '已完成' : '未写', sub: todayReview ? '已记录' : '点击去写', cls: todayReview ? '' : 'warning', jump: 'review' },
      { icon: '📚', title: '读书笔记', value: readingTodo + '条', sub: '待整理', cls: readingTodo > 0 ? 'warning' : '', jump: 'reading' },
      { icon: '💼', title: '求职进度', value: jobCount + '岗位', sub: `${interviewTodo} 条面试待学`, cls: interviewTodo > 0 ? 'warning' : '', jump: 'jobs' },
      { icon: '📅', title: '经期预警', value: periodWarning ? periodDays + '天' : '正常', sub: periodWarning ? '预计近期来潮' : '暂无预警', cls: periodWarning ? 'danger' : '', jump: 'period' },
      { icon: '📰', title: '资讯待读', value: newsUnread + '条', sub: '未读/未收听', cls: newsUnread > 0 ? 'warning' : '', jump: 'news' }
    ];

    const grid = document.getElementById('overviewCards');
    grid.innerHTML = cards.map(c => `
      <div class="overview-card ${c.cls}" onclick="Utils.scrollToModule('${c.jump}')">
        <div class="oc-icon">${c.icon}</div>
        <div class="oc-title">${c.title}</div>
        <div class="oc-value">${c.value}</div>
        <div class="oc-sub">${c.sub}</div>
      </div>
    `).join('');

    // 待处理事项列表
    const pending = [];
    plansToday.filter(p => p.status !== 'done').forEach(p => pending.push({ label: `计划：${p.title}`, count: '', jump: 'plans' }));
    if (!todayReview) pending.push({ label: '今日复盘未写', count: '', jump: 'review' });
    if (interviewTodo > 0) pending.push({ label: '面试素材待学习', count: interviewTodo, jump: 'jobs' });
    if (readingTodo > 0) pending.push({ label: '读书笔记待整理', count: readingTodo, jump: 'reading' });
    if (newsUnread > 0) pending.push({ label: '资讯未读', count: newsUnread, jump: 'news' });
    if (periodWarning) pending.push({ label: '经期即将到来', count: periodDays + '天', jump: 'period' });

    const pList = document.getElementById('pendingList');
    if (pending.length === 0) {
      pList.innerHTML = '<p class="empty-hint">暂无待处理事项 🎉</p>';
    } else {
      pList.innerHTML = pending.map(p => `
        <div class="pending-item" onclick="Utils.scrollToModule('${p.jump}')">
          <span class="pi-label">${p.label}</span>
          <span>${p.count ? `<span class="pi-count">${p.count}</span>` : '<span class="pi-jump">去处理 →</span>'}</span>
        </div>
      `).join('');
    }

    // 更新侧边栏徽标
    this.updateBadge('badge-plans', plansToday.filter(p => p.status !== 'done').length);
    this.updateBadge('badge-english', engTotal - engDone);
    this.updateBadge('badge-jobs', interviewTodo);
    this.updateBadge('badge-news', newsUnread);
    this.updateBadge('badge-overview', pending.length);
  },

  isRepeatDay(plan) {
    if (plan.repeat === 'weekly' && plan.date) {
      const d = new Date(plan.date).getDay();
      return d === new Date().getDay();
    }
    return false;
  },

  updateBadge(id, count) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = count;
    el.style.display = count ? 'inline-block' : 'none';
  }
};

/**
 * 模块2：每日计划
 */
Modules.plans = {
  filterSource: 'all',

  async init() {
    document.querySelectorAll('#page-plans .filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#page-plans .filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });
  },

  async render() {
    // 跨日自动延续：把昨天及之前的未完成计划复制一份到今天
    await this.migrateCarryOver();

    const plans = await DB.getAll('plans');
    const today = Utils.todayStr();
    const todayPlans = plans.filter(p => p.date === today || p.repeat === 'daily' || this.isRepeatDay(p));

    const work = todayPlans.filter(p => p.type === 'work');
    const life = todayPlans.filter(p => p.type === 'life');

    document.getElementById('taskList-work').innerHTML = work.map(p => this.renderTask(p)).join('');
    document.getElementById('taskList-life').innerHTML = life.map(p => this.renderTask(p)).join('');

    const total = todayPlans.length;
    const done = todayPlans.filter(p => p.status === 'done').length;
    const pct = total ? Math.round(done / total * 100) : 0;
    document.getElementById('plansProgressFill').style.width = pct + '%';
    document.getElementById('plansProgressText').textContent = `${done}/${total}`;
  },

  renderTask(p) {
    const statusClass = p.status === 'done' ? 'done' : (p.status === 'doing' ? 'doing' : '');
    const progressHtml = p.status === 'doing' ? `
      <input type="number" class="task-progress-input" value="${p.progress || 0}" min="0" max="100"
        onchange="Modules.plans.updateProgress('${p.id}', this.value)">%
    ` : '';
    const carryOverTag = p.carriedFromId ? `<span class="carry-tag" title="来源：${p.originalDate || ''} 延续">↪️ 昨日延续</span>` : '';
    return `
      <div class="task-item ${statusClass}">
        <input type="checkbox" class="task-check" ${p.status === 'done' ? 'checked' : ''}
          onchange="Modules.plans.toggleStatus('${p.id}', this.checked)">
        <div class="task-body">
          <div class="task-title">${Utils.escapeHtml(p.title)} ${carryOverTag}</div>
          <div class="task-meta">
            ${p.deadline ? `<span>⏰ ${p.deadline.replace('T', ' ')}</span>` : ''}
            ${p.repeat ? `<span>🔁 ${p.repeat === 'daily' ? '每日' : '每周'}</span>` : ''}
            ${p.status === 'doing' ? `<span>📊 ${progressHtml}</span>` : ''}
          </div>
        </div>
        <div class="task-actions">
          <button onclick="Modules.plans.edit('${p.id}')" title="编辑">✏️</button>
          <button onclick="Modules.plans.del('${p.id}')" title="删除">🗑️</button>
        </div>
      </div>
    `;
  },

  isRepeatDay(plan) {
    if (plan.repeat === 'weekly' && plan.date) {
      return new Date(plan.date).getDay() === new Date().getDay();
    }
    return false;
  },

  /**
   * 跨日自动延续：每天首次进入页面时，把昨天及之前未完成且非重复的计划
   * 自动复制一份到今天。原计划标记 carryOver=true 避免重复复制。
   */
  async migrateCarryOver() {
    const plans = await DB.getAll('plans');
    const today = Utils.todayStr();
    let migrated = 0;

    for (const p of plans) {
      // 跳过已完成、每天重复、每周重复的
      if (p.status === 'done') continue;
      if (p.repeat === 'daily' || p.repeat === 'weekly') continue;
      // 必须有有效日期，且日期早于今天
      if (!p.date || p.date >= today) continue;
      // 已经为这个原计划生成过副本
      if (p.carryOver) continue;

      // 创建今日副本
      const clone = { ...p };
      delete clone.carryOver;
      delete clone.carriedFromId;
      clone.id = undefined; // 让 DB 重新生成 id
      clone.date = today;
      clone.status = p.status === 'doing' ? 'doing' : 'todo';
      clone.progress = p.progress || 0;
      clone.createdAt = Date.now();
      clone.carriedFromId = p.id;
      clone.originalDate = p.date;
      await DB.put('plans', clone);
      migrated++;

      // 在原计划上标记 carryOver，避免后续重复创建
      p.carryOver = true;
      p.carryOverTo = today;
      await DB.put('plans', p);
    }

    if (migrated > 0) {
      console.log(`[plans] 跨日延续: 为 ${migrated} 个未完成任务创建了今日副本`);
    }
  },

  async toggleStatus(id, checked) {
    const p = await DB.get('plans', id);
    if (!p) return;
    p.status = checked ? 'done' : 'todo';
    if (checked) p.completedAt = Date.now();
    await DB.put('plans', p);
    this.render();
    Modules.overview.render();
  },

  async updateProgress(id, value) {
    const p = await DB.get('plans', id);
    if (!p) return;
    p.progress = Math.max(0, Math.min(100, parseInt(value) || 0));
    p.status = p.progress === 100 ? 'done' : (p.progress > 0 ? 'doing' : 'todo');
    await DB.put('plans', p);
    this.render();
  },

  async edit(id) {
    const p = await DB.get('plans', id);
    if (!p) return;
    this.showAddDialog(p.type, p);
  },

  async del(id) {
    if (!confirm('确定删除该任务？')) return;
    await DB.delete('plans', id);
    this.render();
    Modules.overview.render();
  },

  showAddDialog(type = 'work', editItem = null) {
    const isEdit = !!editItem;
    UI.showCustomModal(
      (isEdit ? '编辑' : '新增') + (type === 'work' ? '工作计划' : '生活计划'),
      `
        <div class="form-group">
          <label>任务名称</label>
          <input id="plan-title" value="${editItem ? Utils.escapeHtml(editItem.title) : ''}">
        </div>
        <div class="form-group">
          <label>状态</label>
          <select id="plan-status">
            <option value="todo" ${editItem?.status === 'todo' ? 'selected' : ''}>待办</option>
            <option value="doing" ${editItem?.status === 'doing' ? 'selected' : ''}>进行中</option>
            <option value="done" ${editItem?.status === 'done' ? 'selected' : ''}>已完成</option>
          </select>
        </div>
        <div class="form-group">
          <label>截止时间</label>
          <input type="datetime-local" id="plan-deadline" value="${editItem?.deadline || ''}">
        </div>
        <div class="form-group">
          <label>重复周期</label>
          <select id="plan-repeat">
            <option value="" ${!editItem?.repeat ? 'selected' : ''}>不重复</option>
            <option value="daily" ${editItem?.repeat === 'daily' ? 'selected' : ''}>每日</option>
            <option value="weekly" ${editItem?.repeat === 'weekly' ? 'selected' : ''}>每周</option>
          </select>
        </div>
        <div class="form-group">
          <label>进度（进行中时有效）</label>
          <input type="number" id="plan-progress" min="0" max="100" value="${editItem?.progress || 0}">
        </div>
      `,
      `<div class="modal-actions">
        <button class="btn btn-outline" onclick="UI.closeModal()">取消</button>
        <button class="btn btn-primary" onclick="Modules.plans.save('${type}', '${editItem?.id || ''}')">保存</button>
      </div>`
    );
  },

  async save(type, id) {
    const title = document.getElementById('plan-title').value.trim();
    if (!title) { UI.toast('请输入任务名称'); return; }
    const status = document.getElementById('plan-status').value;
    const item = id ? await DB.get('plans', id) : {};
    item.type = type;
    item.title = title;
    item.status = status;
    item.deadline = document.getElementById('plan-deadline').value;
    item.repeat = document.getElementById('plan-repeat').value;
    item.progress = parseInt(document.getElementById('plan-progress').value) || 0;
    item.date = Utils.todayStr();
    await DB.put('plans', item);
    UI.closeModal();
    UI.toast('保存成功', 'success');
    this.render();
    Modules.overview.render();
  },

  async archiveCompleted() {
    const plans = await DB.getAll('plans');
    for (const p of plans) {
      if (p.status === 'done') {
        p.archived = true;
        await DB.put('plans', p);
      }
    }
    UI.toast('已完成任务已归档');
    this.render();
  }
};
