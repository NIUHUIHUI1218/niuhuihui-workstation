/**
 * 模块9：月经日期记录
 */
Modules.period = {
  currentDate: new Date(),
  selectingStart: true,

  async render() {
    const records = await DB.getAll('periodRecords');
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();
    document.getElementById('calendarTitle').textContent = `${year}年${month + 1}月`;

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const grid = document.getElementById('calendarGrid');
    let html = '';
    const weekdays = ['日','一','二','三','四','五','六'];
    weekdays.forEach(w => html += `<div class="calendar-weekday">${w}</div>`);
    for (let i = 0; i < firstDay; i++) html += '<div></div>';

    const today = Utils.todayStr();
    const nextPeriod = await this.predictNextPeriod();

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const rec = this.findRecordForDate(records, dateStr);
      let cls = '';
      if (rec) {
        if (dateStr === rec.startDate) cls = 'started';
        else if (dateStr === rec.endDate) cls = 'ended';
        else cls = 'active';
      } else if (dateStr === nextPeriod) {
        cls = 'predicted';
      }
      if (dateStr === today) cls += ' today';
      html += `<div class="calendar-cell ${cls}" onclick="Modules.period.clickDate('${dateStr}')">
        <span>${d}</span>
        ${rec?.painLevel ? `<span class="cell-note">痛${rec.painLevel}</span>` : ''}
      </div>`;
    }
    grid.innerHTML = html;

    // 统计
    const stats = this.calcStats(records);
    document.getElementById('pstat-avgCycle').textContent = stats.avgCycle ? stats.avgCycle + '天' : '--天';
    document.getElementById('pstat-avgDuration').textContent = stats.avgDuration ? stats.avgDuration + '天' : '--天';
    document.getElementById('pstat-nextDate').textContent = nextPeriod ? Utils.formatDate(nextPeriod) : '--';

    // 历史
    const history = records.slice().sort((a, b) => (b.startDate > a.startDate ? 1 : -1));
    document.getElementById('periodHistoryList').innerHTML = history.length === 0
      ? '<p class="empty-hint">暂无记录</p>'
      : history.map(r => `
        <div class="body-record">
          <span>${r.startDate} ~ ${r.endDate || '未结束'} (${r.duration || '--'}天) 量${r.flowLevel || '-'} 痛${r.painLevel || '-'}</span>
          <button class="btn btn-sm" onclick="Modules.period.delRecord('${r.id}')">删除</button>
        </div>
      `).join('');
  },

  findRecordForDate(records, dateStr) {
    return records.find(r => r.startDate <= dateStr && r.endDate >= dateStr);
  },

  async predictNextPeriod() {
    const records = await DB.getAll('periodRecords');
    if (records.length === 0) return null;
    const stats = this.calcStats(records);
    if (!stats.avgCycle) return null;
    const last = records.slice().sort((a, b) => (b.startDate > a.startDate ? 1 : -1))[0];
    const d = new Date(last.startDate);
    d.setDate(d.getDate() + stats.avgCycle);
    return Utils.dateStr(d);
  },

  calcStats(records) {
    if (records.length === 0) return { avgCycle: 0, avgDuration: 0 };
    const sorted = records.slice().sort((a, b) => (a.startDate > b.startDate ? 1 : -1));
    let cycles = [];
    for (let i = 1; i < sorted.length; i++) {
      cycles.push(Utils.daysBetween(sorted[i - 1].startDate, sorted[i].startDate));
    }
    const avgCycle = cycles.length ? Math.round(cycles.reduce((s, c) => s + c, 0) / cycles.length) : 0;
    const durations = records.map(r => parseInt(r.duration) || 0).filter(d => d > 0);
    const avgDuration = durations.length ? Math.round(durations.reduce((s, d) => s + d, 0) / durations.length) : 0;
    return { avgCycle, avgDuration };
  },

  prevMonth() { this.currentDate.setMonth(this.currentDate.getMonth() - 1); this.render(); },
  nextMonth() { this.currentDate.setMonth(this.currentDate.getMonth() + 1); this.render(); },

  clickDate(dateStr) {
    this.selectedDate = dateStr;
    this.markPeriod(dateStr);
  },

  async markPeriod(preselectDate = null) {
    const records = await DB.getAll('periodRecords');
    const existing = records.find(r => r.startDate === (preselectDate || this.selectedDate));
    UI.showCustomModal(
      '标记经期',
      `
        <div class="form-group"><label>日期</label><input type="date" id="p-start" value="${preselectDate || this.selectedDate || Utils.todayStr()}"></div>
        <div class="form-group"><label>经期结束日期（可选）</label><input type="date" id="p-end" value="${existing?.endDate || ''}"></div>
        <div class="form-group"><label>持续天数</label><input type="number" id="p-duration" value="${existing?.duration || ''}"></div>
        <div class="form-group"><label>经量等级</label>
          <select id="p-flow"><option value="">-</option><option value="少" ${existing?.flowLevel === '少' ? 'selected' : ''}>少</option><option value="中" ${existing?.flowLevel === '中' ? 'selected' : ''}>中</option><option value="多" ${existing?.flowLevel === '多' ? 'selected' : ''}>多</option></select>
        </div>
        <div class="form-group"><label>痛经程度</label>
          <select id="p-pain"><option value="">-</option><option value="1" ${existing?.painLevel === '1' ? 'selected' : ''}>1 轻微</option><option value="2" ${existing?.painLevel === '2' ? 'selected' : ''}>2 中等</option><option value="3" ${existing?.painLevel === '3' ? 'selected' : ''}>3 严重</option></select>
        </div>
        <div class="form-group"><label>身体不适备注</label><textarea id="p-note">${existing?.notes || ''}</textarea></div>
      `,
      `<div class="modal-actions">
        <button class="btn btn-outline" onclick="UI.closeModal()">取消</button>
        <button class="btn btn-primary" onclick="Modules.period.saveRecord('${existing?.id || ''}')">保存</button>
      </div>`
    );
  },

  async saveRecord(id) {
    const start = document.getElementById('p-start').value;
    if (!start) return;
    const end = document.getElementById('p-end').value;
    const duration = parseInt(document.getElementById('p-duration').value) || (end ? Utils.daysBetween(start, end) + 1 : 0);
    const item = id ? await DB.get('periodRecords', id) : {};
    item.startDate = start;
    item.endDate = end;
    item.duration = duration;
    item.flowLevel = document.getElementById('p-flow').value;
    item.painLevel = document.getElementById('p-pain').value;
    item.notes = document.getElementById('p-note').value;
    await DB.put('periodRecords', item);
    UI.closeModal(); UI.toast('已保存', 'success');
    this.render(); Modules.overview.render();
  },

  async delRecord(id) {
    if (!confirm('确定删除该记录？')) return;
    await DB.delete('periodRecords', id); this.render(); Modules.overview.render();
  },

  async exportPeriod() {
    const records = await DB.getAll('periodRecords');
    const csv = 'startDate,endDate,duration,flowLevel,painLevel,notes\n' +
      records.map(r => [r.startDate, r.endDate, r.duration, r.flowLevel, r.painLevel, r.notes].join(',')).join('\n');
    Utils.downloadFile(csv, `period-${Utils.todayStr()}.csv`, 'text/csv');
  },

  async clearAll() {
    if (!confirm('⚠️ 确定清空所有经期记录？')) return;
    await DB.clear('periodRecords');
    this.render(); Modules.overview.render();
    UI.toast('已清空', 'warning');
  }
};

/**
 * 模块10：资讯推送
 */
Modules.news = {
  podcastFilter: 'today',
  financeTag: 'all',

  async init() {
    document.querySelectorAll('#page-news .nfilter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#page-news .nfilter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.podcastFilter = btn.dataset.filter;
        this.renderPodcast();
      });
    });
    document.querySelectorAll('#page-news .ntag-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#page-news .ntag-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.financeTag = btn.dataset.tag;
        this.renderFinance();
      });
    });
  },

  async render() {
    await this.renderPodcast();
    await this.renderCoffee();
    await this.renderFinance();
  },

  async renderPodcast() {
    const all = await DB.getAll('newsPodcast');
    let list = all.slice().sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
    const today = Utils.todayStr();
    if (this.podcastFilter === 'today') {
      const todayList = list.filter(i => i.pubDate?.startsWith(today));
      // 如果今日内容不足10条，用最近内容补足
      list = todayList.length >= 10 ? todayList : [...todayList, ...list.filter(i => !i.pubDate?.startsWith(today))].slice(0, 10);
    } else {
      list = list.slice(0, 30);
    }
    if (this.podcastFilter === 'unlistened') list = list.filter(i => i.status !== 'read');
    if (this.podcastFilter === 'fav') list = list.filter(i => i.favorite);

    document.getElementById('newsList-podcast').innerHTML = list.length === 0
      ? '<p class="empty-hint">暂无播客节目</p>'
      : list.map(i => `
        <div class="news-item">
          <div class="ni-title">${Utils.escapeHtml(i.title)}</div>
          <div class="ni-desc">${Utils.escapeHtml(i.description?.substring(0, 100) || '')}</div>
          <div class="ni-meta"><span>${i.pubDate}</span><span>${i.isToday ? '今日新更' : '往期节目'}</span></div>
          ${i.audioUrl ? `<audio controls src="${i.audioUrl}"></audio>` : ''}
          <div class="ec-actions" style="margin-top:8px">
            <button class="btn btn-sm btn-outline" onclick="Modules.news.setStatus('newsPodcast', '${i.id}', 'read')">已收听</button>
            <button class="btn btn-sm btn-outline" onclick="Modules.news.toggleFav('newsPodcast', '${i.id}')">${i.favorite ? '⭐' : '☆'} 收藏</button>
            <a class="btn btn-sm btn-outline" href="${i.link}" target="_blank">🔗 原文</a>
            <button class="btn btn-sm btn-danger-outline" onclick="Modules.news.del('newsPodcast', '${i.id}')">删除</button>
          </div>
        </div>
      `).join('');
  },

  async renderCoffee() {
    const all = await DB.getAll('newsCoffee');
    const list = all.slice().sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate)).slice(0, 50);
    document.getElementById('newsList-coffee').innerHTML = list.length === 0
      ? '<p class="empty-hint">暂无早咖啡内容</p>'
      : list.map(i => `
        <div class="news-item">
          <div class="ni-title">${Utils.escapeHtml(i.title)}</div>
          <div class="ni-desc">${Utils.escapeHtml(i.description?.substring(0, 120) || '')}</div>
          <div class="ni-meta"><span>${i.pubDate}</span></div>
          ${i.audioUrl ? `<audio controls src="${i.audioUrl}"></audio>` : ''}
          <div class="form-group" style="margin-top:8px">
            <textarea id="coffee-note-${i.id}" rows="2" placeholder="记录阅读重点、感悟" onblur="Modules.news.saveCoffeeNote('${i.id}')">${i.notes || ''}</textarea>
          </div>
          <div class="ec-actions">
            <button class="btn btn-sm btn-outline" onclick="Modules.news.setStatus('newsCoffee', '${i.id}', 'read')">已读</button>
            <a class="btn btn-sm btn-outline" href="${i.link}" target="_blank">🔗 原文</a>
            <button class="btn btn-sm btn-danger-outline" onclick="Modules.news.del('newsCoffee', '${i.id}')">删除</button>
          </div>
        </div>
      `).join('');
  },

  async saveCoffeeNote(id) {
    const i = await DB.get('newsCoffee', id);
    i.notes = document.getElementById('coffee-note-' + id).value;
    await DB.put('newsCoffee', i);
  },

  async renderFinance() {
    const all = await DB.getAll('newsFinance');
    let list = all.slice().sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
    if (this.financeTag !== 'all') list = list.filter(i => (i.tags || []).includes(this.financeTag));
    const kw = document.getElementById('financeSearch').value.trim().toLowerCase();
    if (kw) list = list.filter(i => (i.title + i.description).toLowerCase().includes(kw));

    document.getElementById('newsList-finance').innerHTML = list.length === 0
      ? '<p class="empty-hint">暂无财经新闻</p>'
      : list.map(i => `
        <div class="news-item">
          <div class="ni-title">${Utils.escapeHtml(i.title)}</div>
          <div class="ni-desc">${Utils.escapeHtml(i.description?.substring(0, 120) || '')}</div>
          <div class="ni-meta"><span>${i.pubDate}</span><span>${(i.tags || []).map(t => `<span class="tag-pill">${t}</span>`).join('')}</span></div>
          <div class="ec-actions" style="margin-top:8px">
            <button class="btn btn-sm btn-outline" onclick="Modules.news.setStatus('newsFinance', '${i.id}', 'read')">已读</button>
            <button class="btn btn-sm btn-outline" onclick="Modules.news.toggleFav('newsFinance', '${i.id}')">${i.favorite ? '⭐' : '☆'} 收藏</button>
            <a class="btn btn-sm btn-outline" href="${i.link}" target="_blank">🔗 原文</a>
            <button class="btn btn-sm btn-danger-outline" onclick="Modules.news.del('newsFinance', '${i.id}')">删除</button>
          </div>
        </div>
      `).join('');
  },

  async setStatus(store, id, status) {
    const i = await DB.get(store, id);
    i.status = status; await DB.put(store, i);
    this.render(); Modules.overview.render();
  },

  async toggleFav(store, id) {
    const i = await DB.get(store, id);
    i.favorite = !i.favorite; await DB.put(store, i);
    this.render();
  },

  async del(store, id) {
    if (!confirm('确定删除？')) return;
    await DB.delete(store, id); this.render(); Modules.overview.render();
  },

  showAddDialog(section) {
    UI.showCustomModal(
      '手动录入资讯',
      `
        <div class="form-group"><label>标题</label><input id="news-title"></div>
        <div class="form-group"><label>简介</label><textarea id="news-desc" rows="3"></textarea></div>
        <div class="form-group"><label>链接</label><input id="news-link"></div>
        <div class="form-group"><label>音频链接（可选）</label><input id="news-audio"></div>
        ${section === 'finance' ? '<div class="form-group"><label>标签（用逗号分隔）</label><input id="news-tags" placeholder="政策,股市,汇率,理财"></div>' : ''}
      `,
      `<div class="modal-actions">
        <button class="btn btn-outline" onclick="UI.closeModal()">取消</button>
        <button class="btn btn-primary" onclick="Modules.news.saveManual('${section}')">保存</button>
      </div>`
    );
  },

  async saveManual(section) {
    const storeMap = { podcast: 'newsPodcast', coffee: 'newsCoffee', finance: 'newsFinance' };
    const store = storeMap[section];
    const title = document.getElementById('news-title').value.trim();
    if (!title) { UI.toast('请输入标题'); return; }
    await DB.put(store, {
      source: 'manual',
      title, description: document.getElementById('news-desc').value,
      link: document.getElementById('news-link').value,
      audioUrl: document.getElementById('news-audio').value,
      tags: section === 'finance' ? document.getElementById('news-tags').value.split(',').map(t => t.trim()).filter(Boolean) : [],
      pubDate: Utils.formatDateTime(new Date()),
      status: 'unread'
    });
    UI.closeModal(); UI.toast('已保存', 'success');
    this.render(); Modules.overview.render();
  },

  async refreshNews() {
    UI.toast('正在刷新资讯...');
    try {
      const res = await fetch('data/news.json');
      if (!res.ok) { UI.toast('暂无自动资讯数据', 'warning'); return; }
      const data = await res.json();
      for (const key of ['podcast', 'coffee', 'finance']) {
        const store = 'news' + key[0].toUpperCase() + key.slice(1);
        if (data[key]) {
          for (const item of data[key]) {
            const exists = (await DB.getAll(store)).find(e => e.title === item.title && e.source === 'auto');
            if (!exists) await DB.put(store, { ...item, source: 'auto', status: 'unread', createdAt: Date.now() });
          }
        }
      }
      this.render();
      UI.toast('资讯已更新', 'success');
    } catch (e) { UI.toast('刷新失败', 'error'); console.error(e); }
  },

  async exportNews() {
    const all = {
      podcast: await DB.getAll('newsPodcast'),
      coffee: await DB.getAll('newsCoffee'),
      finance: await DB.getAll('newsFinance')
    };
    Utils.downloadFile(JSON.stringify(all, null, 2), `news-${Utils.todayStr()}.json`);
  },

  async clearNews() {
    if (!confirm('确定清空全部资讯？')) return;
    await DB.clear('newsPodcast'); await DB.clear('newsCoffee'); await DB.clear('newsFinance');
    this.render(); Modules.overview.render();
  }
};
