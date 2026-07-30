/**
 * 模块8：找工作
 */
Modules.jobs = {
  sub: 'search',
  interviewSource: 'auto',
  interviewFilter: 'all',

  async init() {
    document.querySelectorAll('#page-jobs .jtab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('#page-jobs .jtab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.sub = tab.dataset.sub;
        document.getElementById('jobs-search').style.display = this.sub === 'search' ? 'block' : 'none';
        document.getElementById('jobs-interview').style.display = this.sub === 'interview' ? 'block' : 'none';
        this.render();
      });
    });
    document.querySelectorAll('#jobs-interview .stab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('#jobs-interview .stab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.interviewSource = tab.dataset.source;
        this.renderInterview();
      });
    });
    document.querySelectorAll('#jobs-interview .ifilter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#jobs-interview .ifilter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.interviewFilter = btn.dataset.filter;
        this.renderInterview();
      });
    });
  },

  async render() {
    if (this.sub === 'search') await this.renderSearch();
    else this.renderInterview();
  },

  async renderSearch() {
    const profile = (await DB.getAll('jobProfile'))[0] || {};
    document.getElementById('currentSkills').value = (profile.currentSkills || []).join(', ');
    document.getElementById('plannedSkills').value = (profile.plannedSkills || []).join(', ');
    document.getElementById('currentSalary').value = profile.currentSalary || '';

    // 技能缺口
    const allJobs = await DB.getAll('jobs');
    const requiredSkills = new Set();
    allJobs.forEach(j => (j.skills || []).forEach(s => requiredSkills.add(s)));
    const mySkills = new Set(profile.currentSkills || []);
    const gaps = [...requiredSkills].filter(s => !mySkills.has(s));
    document.getElementById('skillGapContent').innerHTML = gaps.length === 0
      ? '<p class="empty-hint">技能覆盖良好，继续加油！</p>'
      : `<div class="skill-gap-list">${gaps.map(g => `<span>${Utils.escapeHtml(g)}</span>`).join('')}</div>`;

    // 推荐岗位
    const targetSalary = (profile.currentSalary || 0) * 2;
    const list = allJobs.filter(j => !targetSalary || (j.salary || 0) >= targetSalary).slice(0, 20);
    document.getElementById('jobsList').innerHTML = list.length === 0
      ? '<p class="empty-hint">暂无匹配岗位，可手动添加或等待每日8点自动刷新</p>'
      : list.map(j => `
        <div class="job-card">
          <div class="job-title">${Utils.escapeHtml(j.title)} · ${Utils.escapeHtml(j.company)}</div>
          <div class="job-salary">薪资：${Utils.formatMoney(j.salary)}/月</div>
          <div style="font-size:12px;color:var(--text-secondary);margin-top:4px">要求：${(j.skills || []).map(s => `<span class="tag-pill">${Utils.escapeHtml(s)}</span>`).join('')}</div>
          <div style="margin-top:8px">${j.requirements ? Utils.escapeHtml(j.requirements.substring(0, 120)) : ''}</div>
        </div>
      `).join('');

    // 成长备忘录
    const logs = await DB.getAll('growthLogs');
    logs.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    document.getElementById('growthLog').innerHTML = logs.length === 0
      ? '<p class="empty-hint">开始记录你的学习成长之路</p>'
      : logs.map(l => `
        <div class="growth-item">
          <strong>${Utils.formatDateTime(l.createdAt)}</strong>
          <p>${Utils.escapeHtml(l.content)}</p>
        </div>
      `).join('');
  },

  async renderInterview() {
    const all = await DB.getAll('interviewMaterials');
    let list = all.filter(i => i.source === this.interviewSource);
    if (this.interviewFilter !== 'all') list = list.filter(i => i.category === this.interviewFilter);
    const kw = document.getElementById('interviewSearch').value.trim().toLowerCase();
    if (kw) list = list.filter(i => (i.question + i.answer + i.tags?.join('')).toLowerCase().includes(kw));
    list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    document.getElementById('interviewList').innerHTML = list.length === 0
      ? '<p class="empty-hint">暂无面试素材</p>'
      : list.map(i => `
        <div class="interview-card">
          <span class="ic-category">${Utils.escapeHtml(i.category)}</span>
          <div class="ec-title">${Utils.escapeHtml(i.question)}</div>
          <div class="ec-content">${Utils.escapeHtml(i.answer || '')}</div>
          ${i.tags?.length ? `<div class="rc-tags">${i.tags.map(t => `<span class="rc-tag">${Utils.escapeHtml(t)}</span>`).join('')}</div>` : ''}
          <div class="ec-actions">
            <button class="btn btn-sm btn-outline" onclick="Modules.jobs.interviewAddToPlan('${i.id}')">📅 加入复习</button>
            <button class="btn btn-sm btn-outline" onclick="Modules.jobs.interviewMarkDone('${i.id}')">✅ 已掌握</button>
            ${i.source === 'manual' ? `<button class="btn btn-sm btn-outline" onclick="Modules.jobs.editInterview('${i.id}')">✏️ 编辑</button>` : ''}
            <button class="btn btn-sm btn-danger-outline" onclick="Modules.jobs.delInterview('${i.id}')">🗑️ 删除</button>
          </div>
        </div>
      `).join('');
  },

  async saveProfile() {
    const profile = (await DB.getAll('jobProfile'))[0] || { id: Utils.generateId('profile_') };
    profile.currentSkills = document.getElementById('currentSkills').value.split(',').map(s => s.trim()).filter(Boolean);
    profile.plannedSkills = document.getElementById('plannedSkills').value.split(',').map(s => s.trim()).filter(Boolean);
    profile.currentSalary = parseFloat(document.getElementById('currentSalary').value) || 0;
    await DB.put('jobProfile', profile);
    UI.toast('档案已保存', 'success');
    this.renderSearch();
  },

  async refreshJobs() {
    UI.toast('正在刷新岗位...');
    try {
      const res = await fetch('data/jobs.json');
      if (!res.ok) { UI.toast('暂无自动岗位数据', 'warning'); return; }
      const data = await res.json();
      if (data.jobs) {
        for (const j of data.jobs) {
          const exists = (await DB.getAll('jobs')).find(e => e.title === j.title && e.company === j.company);
          if (!exists) await DB.put('jobs', { ...j, createdAt: Date.now() });
        }
      }
      this.renderSearch();
      UI.toast('岗位已更新', 'success');
    } catch (e) { UI.toast('刷新失败', 'error'); console.error(e); }
  },

  showGrowthDialog() {
    UI.showCustomModal(
      '记录学习成长',
      `<div class="form-group"><textarea id="growth-content" rows="4" placeholder="学习了什么课程/技能，有什么收获"></textarea></div>`,
      `<div class="modal-actions">
        <button class="btn btn-outline" onclick="UI.closeModal()">取消</button>
        <button class="btn btn-primary" onclick="Modules.jobs.saveGrowth()">保存</button>
      </div>`
    );
  },

  async saveGrowth() {
    const content = document.getElementById('growth-content').value.trim();
    if (!content) return;
    await DB.put('growthLogs', { content, createdAt: Date.now() });
    UI.closeModal(); UI.toast('已记录', 'success'); this.renderSearch();
  },

  showInterviewAddDialog(editItem = null) {
    UI.showCustomModal(
      editItem ? '编辑面试素材' : '新增面试素材',
      `
        <div class="form-group">
          <label>分类</label>
          <select id="int-cat">
            <option value="通用面试" ${editItem?.category === '通用面试' ? 'selected' : ''}>通用面试</option>
            <option value="职场通用" ${editItem?.category === '职场通用' ? 'selected' : ''}>职场通用</option>
            <option value="行业专项" ${editItem?.category === '行业专项' ? 'selected' : ''}>行业专项</option>
          </select>
        </div>
        <div class="form-group"><label>问题</label><input id="int-q" value="${editItem ? Utils.escapeHtml(editItem.question) : ''}"></div>
        <div class="form-group"><label>参考回答/笔记</label><textarea id="int-a" rows="4">${editItem ? Utils.escapeHtml(editItem.answer || '') : ''}</textarea></div>
        <div class="form-group"><label>标签（用逗号分隔）</label><input id="int-tags" value="${editItem?.tags?.join(',') || ''}" placeholder="校招、社招、跳槽、初试、复试"></div>
      `,
      `<div class="modal-actions">
        <button class="btn btn-outline" onclick="UI.closeModal()">取消</button>
        <button class="btn btn-primary" onclick="Modules.jobs.saveInterview('${editItem?.id || ''}')">保存</button>
      </div>`
    );
  },

  async saveInterview(id) {
    const q = document.getElementById('int-q').value.trim();
    if (!q) { UI.toast('请输入问题'); return; }
    const item = id ? await DB.get('interviewMaterials', id) : { source: 'manual' };
    item.category = document.getElementById('int-cat').value;
    item.question = q;
    item.answer = document.getElementById('int-a').value;
    item.tags = document.getElementById('int-tags').value.split(',').map(t => t.trim()).filter(Boolean);
    await DB.put('interviewMaterials', item);
    UI.closeModal(); UI.toast('保存成功', 'success');
    this.renderInterview(); Modules.overview.render();
  },

  async editInterview(id) { const i = await DB.get('interviewMaterials', id); if (i) this.showInterviewAddDialog(i); },
  async delInterview(id) { if (!confirm('确定删除？')) return; await DB.delete('interviewMaterials', id); this.renderInterview(); Modules.overview.render(); },

  async interviewAddToPlan(id) {
    const i = await DB.get('interviewMaterials', id);
    await DB.put('plans', { type: 'life', title: `面试复习：${i.question}`, status: 'todo', date: Utils.todayStr() });
    UI.toast('已加入今日计划', 'success'); Modules.overview.render();
  },

  async interviewMarkDone(id) {
    const i = await DB.get('interviewMaterials', id);
    i.status = 'done'; await DB.put('interviewMaterials', i);
    UI.toast('已标记掌握', 'success'); this.renderInterview(); Modules.overview.render();
  },

  showInterviewTags() {
    UI.toast('标签可通过编辑素材自定义添加');
  },

  async startQuiz() {
    const all = await DB.getAll('interviewMaterials');
    if (all.length === 0) { UI.toast('暂无题目'); return; }
    const q = all[Math.floor(Math.random() * all.length)];
    UI.showCustomModal(
      '📝 模拟自测',
      `
        <div class="form-group"><label>题目</label><div style="padding:10px;background:var(--bg-primary);border-radius:8px">${Utils.escapeHtml(q.question)}</div></div>
        <div class="form-group"><label>你的回答</label><textarea id="quiz-answer" rows="4"></textarea></div>
      `,
      `<div class="modal-actions">
        <button class="btn btn-outline" onclick="UI.closeModal()">关闭</button>
        <button class="btn btn-primary" onclick="Modules.jobs.saveQuiz('${q.id}')">保存回答</button>
        <button class="btn btn-primary" onclick="Modules.jobs.startQuiz()">下一题</button>
      </div>`
    );
  },

  async saveQuiz(id) {
    const answer = document.getElementById('quiz-answer').value;
    const item = await DB.get('interviewMaterials', id);
    item.myAnswer = answer;
    item.answeredAt = Date.now();
    await DB.put('interviewMaterials', item);
    UI.toast('回答已保存', 'success');
  },

  // 加载自动抓取素材
  async loadAutoData() {
    try {
      const res = await fetch('data/interview.json');
      if (!res.ok) return;
      const data = await res.json();
      if (data.questions) {
        for (const q of data.questions) {
          const exists = (await DB.getAll('interviewMaterials')).find(e => e.question === q.question && e.source === 'auto');
          if (!exists) await DB.put('interviewMaterials', { ...q, source: 'auto', createdAt: Date.now() });
        }
      }
      this.renderInterview();
    } catch (e) { console.error('loadAutoData interview', e); }
  }
};
