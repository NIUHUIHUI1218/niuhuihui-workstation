/**
 * 模块4：英语学习
 */
Modules.english = {
  sub: 'speaking',
  speakingSource: 'auto',
  speakingFilter: 'all',
  listeningSource: 'auto',
  listeningFilter: 'all',

  async init() {
    document.querySelectorAll('#page-english .etab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('#page-english .etab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.sub = tab.dataset.sub;
        document.getElementById('english-speaking').style.display = this.sub === 'speaking' ? 'block' : 'none';
        document.getElementById('english-listening').style.display = this.sub === 'listening' ? 'block' : 'none';
        this.render();
      });
    });

    // 口语源
    document.querySelectorAll('#english-speaking .stab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('#english-speaking .stab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.speakingSource = tab.dataset.source;
        this.render();
      });
    });
    document.querySelectorAll('#english-speaking .efilter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#english-speaking .efilter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.speakingFilter = btn.dataset.filter;
        this.render();
      });
    });

    // 听力源
    document.querySelectorAll('#english-listening .stab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('#english-listening .stab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.listeningSource = tab.dataset.source;
        this.render();
      });
    });
    document.querySelectorAll('#english-listening .efilter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#english-listening .efilter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.listeningFilter = btn.dataset.filter;
        this.render();
      });
    });
  },

  async render() {
    if (this.sub === 'speaking') {
      const all = await DB.getAll('englishSpeaking');
      let list = all.filter(i => i.source === this.speakingSource);
      if (this.speakingFilter !== 'all') list = list.filter(i => i.category === this.speakingFilter);
      list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      const el = document.getElementById('englishList-speaking');
      el.innerHTML = list.length === 0
        ? '<p class="empty-hint">暂无素材，点击上方新增</p>'
        : list.map(i => this.renderSpeakingCard(i)).join('');
    } else {
      const all = await DB.getAll('englishListening');
      let list = all.filter(i => i.source === this.listeningSource);
      if (this.listeningFilter !== 'all') list = list.filter(i => i.status === this.listeningFilter || (this.listeningFilter === 'unpracticed' && !i.status));
      list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      const el = document.getElementById('englishList-listening');
      el.innerHTML = list.length === 0
        ? '<p class="empty-hint">暂无素材，点击上方新增</p>'
        : list.map(i => this.renderListeningCard(i)).join('');
    }
  },

  renderSpeakingCard(i) {
    const dialogue = (i.dialogue || []).map(line => `
      <div class="line"><span class="speaker ${line.role === 'client' ? 'client' : ''}">${line.role === 'client' ? 'Client' : 'You'}:</span> ${Utils.escapeHtml(line.text)}</div>
    `).join('');
    return `
      <div class="english-card">
        <span class="ec-category">${i.category === 'business' ? '商务英语' : '日常英语'}</span>
        <div class="ec-title">${Utils.escapeHtml(i.title)}</div>
        <div class="ec-content">
          <div class="ec-dialogue">${dialogue || Utils.escapeHtml(i.content)}</div>
        </div>
        ${i.phrases ? `<div class="ec-phrases"><strong>短语释义：</strong>${Utils.escapeHtml(i.phrases)}</div>` : ''}
        ${i.culturalTips ? `<div class="ec-phrases"><strong>跨文化小贴士：</strong>${Utils.escapeHtml(i.culturalTips)}</div>` : ''}
        ${i.myNotes ? `<div class="ec-phrases"><strong>我的笔记：</strong>${Utils.escapeHtml(i.myNotes)}</div>` : ''}
        <div class="ec-actions">
          <button class="btn btn-sm btn-outline" onclick="Modules.english.addNotes('${i.id}', 'speaking')">📝 补充笔记</button>
          <button class="btn btn-sm btn-outline" onclick="Modules.english.addToPlan('${i.id}', 'speaking')">📅 加入计划</button>
          <button class="btn btn-sm btn-outline" onclick="Modules.english.markDone('${i.id}', 'speaking')">✅ 标记完成</button>
          ${i.externalLink ? `<a class="btn btn-sm btn-outline" href="${i.externalLink}" target="_blank">🔗 外部链接</a>` : ''}
          ${i.source === 'manual' ? `<button class="btn btn-sm btn-outline" onclick="Modules.english.edit('${i.id}', 'speaking')">✏️ 编辑</button>` : ''}
          <button class="btn btn-sm btn-danger-outline" onclick="Modules.english.del('${i.id}', 'speaking')">🗑️ 删除</button>
        </div>
      </div>
    `;
  },

  renderListeningCard(i) {
    return `
      <div class="english-card listening-card">
        <span class="ec-category">${i.status === 'done' ? '已完成' : (i.status === 'review' ? '待复习' : '未练习')}</span>
        <div class="ec-title">${Utils.escapeHtml(i.title)}</div>
        <div class="ec-content">${Utils.escapeHtml(i.content || '')}</div>
        ${i.audioUrl ? `<audio class="audio-player" controls src="${i.audioUrl}"></audio>` : ''}
        ${i.exercises ? `<div class="ec-phrases"><strong>课后习题：</strong>${Utils.escapeHtml(i.exercises)}</div>` : ''}
        ${i.myNotes ? `<div class="ec-phrases"><strong>我的笔记：</strong>${Utils.escapeHtml(i.myNotes)}</div>` : ''}
        <div class="ec-actions">
          <button class="btn btn-sm btn-outline" onclick="Modules.english.addNotes('${i.id}', 'listening')">📝 补充笔记</button>
          <button class="btn btn-sm btn-outline" onclick="Modules.english.addToPlan('${i.id}', 'listening')">📅 加入计划</button>
          <button class="btn btn-sm btn-outline" onclick="Modules.english.markDone('${i.id}', 'listening')">✅ 标记完成</button>
          <button class="btn btn-sm btn-outline" onclick="Modules.english.markReview('${i.id}', 'listening')">🔁 待复习</button>
          ${i.source === 'manual' ? `<button class="btn btn-sm btn-outline" onclick="Modules.english.edit('${i.id}', 'listening')">✏️ 编辑</button>` : ''}
          <button class="btn btn-sm btn-danger-outline" onclick="Modules.english.del('${i.id}', 'listening')">🗑️ 删除</button>
        </div>
      </div>
    `;
  },

  showAddDialog(sub, editItem = null) {
    if (sub === 'speaking') {
      const manualOnly = editItem?.source === 'manual';
      UI.showCustomModal(
        editItem ? '编辑口语素材' : '新增口语素材',
        `
          <div class="form-group">
            <label>分类</label>
            <select id="eng-cat">
              <option value="business" ${editItem?.category !== 'daily' ? 'selected' : ''}>商务英语</option>
              <option value="daily" ${editItem?.category === 'daily' ? 'selected' : ''}>日常英语</option>
            </select>
          </div>
          <div class="form-group"><label>标题/场景</label><input id="eng-title" value="${editItem ? Utils.escapeHtml(editItem.title) : ''}"></div>
          <div class="form-group"><label>自身台词</label><textarea id="eng-myLine" placeholder="一行一句">${editItem ? Utils.escapeHtml(editItem.myLine || '') : ''}</textarea></div>
          <div class="form-group"><label>对方台词</label><textarea id="eng-partnerLine" placeholder="一行一句">${editItem ? Utils.escapeHtml(editItem.partnerLine || '') : ''}</textarea></div>
          <div class="form-group"><label>短语释义</label><textarea id="eng-phrases">${editItem ? Utils.escapeHtml(editItem.phrases || '') : ''}</textarea></div>
          <div class="form-group"><label>跨文化小贴士</label><textarea id="eng-tips">${editItem ? Utils.escapeHtml(editItem.culturalTips || '') : ''}</textarea></div>
          <div class="form-group"><label>外部链接</label><input id="eng-link" value="${editItem?.externalLink || ''}" placeholder="可选"></div>
        `,
        `<div class="modal-actions">
          <button class="btn btn-outline" onclick="UI.closeModal()">取消</button>
          <button class="btn btn-primary" onclick="Modules.english.saveSpeaking('${editItem?.id || ''}')">保存</button>
        </div>`
      );
    } else {
      UI.showCustomModal(
        editItem ? '编辑听力素材' : '新增听力素材',
        `
          <div class="form-group"><label>标题</label><input id="eng-listen-title" value="${editItem ? Utils.escapeHtml(editItem.title) : ''}"></div>
          <div class="form-group"><label>听力原文/说明</label><textarea id="eng-listen-content">${editItem ? Utils.escapeHtml(editItem.content || '') : ''}</textarea></div>
          <div class="form-group"><label>音频链接</label><input id="eng-listen-audio" value="${editItem?.audioUrl || ''}"></div>
          <div class="form-group"><label>课后习题</label><textarea id="eng-listen-ex">${editItem ? Utils.escapeHtml(editItem.exercises || '') : ''}</textarea></div>
        `,
        `<div class="modal-actions">
          <button class="btn btn-outline" onclick="UI.closeModal()">取消</button>
          <button class="btn btn-primary" onclick="Modules.english.saveListening('${editItem?.id || ''}')">保存</button>
        </div>`
      );
    }
  },

  async saveSpeaking(id) {
    const title = document.getElementById('eng-title').value.trim();
    if (!title) { UI.toast('请输入标题'); return; }
    const myLine = document.getElementById('eng-myLine').value.trim();
    const partnerLine = document.getElementById('eng-partnerLine').value.trim();
    const dialogue = [];
    const myLines = myLine.split('\n').filter(Boolean);
    const partnerLines = partnerLine.split('\n').filter(Boolean);
    const max = Math.max(myLines.length, partnerLines.length);
    for (let i = 0; i < max; i++) {
      if (myLines[i]) dialogue.push({ role: 'you', text: myLines[i] });
      if (partnerLines[i]) dialogue.push({ role: 'client', text: partnerLines[i] });
    }
    const item = id ? await DB.get('englishSpeaking', id) : { source: 'manual' };
    item.title = title;
    item.category = document.getElementById('eng-cat').value;
    item.content = myLine + '\n' + partnerLine;
    item.myLine = myLine;
    item.partnerLine = partnerLine;
    item.dialogue = dialogue;
    item.phrases = document.getElementById('eng-phrases').value;
    item.culturalTips = document.getElementById('eng-tips').value;
    item.externalLink = document.getElementById('eng-link').value;
    await DB.put('englishSpeaking', item);
    UI.closeModal(); UI.toast('保存成功', 'success');
    this.render(); Modules.overview.render();
  },

  async saveListening(id) {
    const title = document.getElementById('eng-listen-title').value.trim();
    if (!title) { UI.toast('请输入标题'); return; }
    const item = id ? await DB.get('englishListening', id) : { source: 'manual' };
    item.title = title;
    item.content = document.getElementById('eng-listen-content').value;
    item.audioUrl = document.getElementById('eng-listen-audio').value;
    item.exercises = document.getElementById('eng-listen-ex').value;
    await DB.put('englishListening', item);
    UI.closeModal(); UI.toast('保存成功', 'success');
    this.render(); Modules.overview.render();
  },

  async edit(id, sub) {
    const item = await DB.get(sub === 'speaking' ? 'englishSpeaking' : 'englishListening', id);
    if (item) this.showAddDialog(sub, item);
  },

  async del(id, sub) {
    if (!confirm('确定删除？')) return;
    await DB.delete(sub === 'speaking' ? 'englishSpeaking' : 'englishListening', id);
    this.render(); Modules.overview.render();
  },

  async addNotes(id, sub) {
    const store = sub === 'speaking' ? 'englishSpeaking' : 'englishListening';
    const item = await DB.get(store, id);
    UI.showCustomModal(
      '补充笔记',
      `<div class="form-group"><textarea id="eng-note-input">${item.myNotes || ''}</textarea></div>`,
      `<div class="modal-actions">
        <button class="btn btn-outline" onclick="UI.closeModal()">取消</button>
        <button class="btn btn-primary" onclick="Modules.english.saveNotes('${id}', '${sub}')">保存</button>
      </div>`
    );
  },

  async saveNotes(id, sub) {
    const store = sub === 'speaking' ? 'englishSpeaking' : 'englishListening';
    const item = await DB.get(store, id);
    item.myNotes = document.getElementById('eng-note-input').value;
    await DB.put(store, item);
    UI.closeModal(); UI.toast('笔记已保存', 'success'); this.render();
  },

  async markDone(id, sub) {
    const store = sub === 'speaking' ? 'englishSpeaking' : 'englishListening';
    const item = await DB.get(store, id);
    item.status = 'done'; item.completedAt = Date.now();
    await DB.put(store, item);
    UI.toast('已标记完成', 'success'); this.render(); Modules.overview.render();
  },

  async markReview(id, sub) {
    const store = sub === 'speaking' ? 'englishSpeaking' : 'englishListening';
    const item = await DB.get(store, id);
    item.status = 'review';
    item.reviewDate = Utils.todayStr();
    await DB.put(store, item);
    UI.toast('已加入复习清单', 'success'); this.render();
  },

  async addToPlan(id, sub) {
    const store = sub === 'speaking' ? 'englishSpeaking' : 'englishListening';
    const item = await DB.get(store, id);
    await DB.put('plans', {
      type: 'life', title: `英语学习：${item.title}`, status: 'todo',
      date: Utils.todayStr(), category: 'english'
    });
    UI.toast('已加入今日计划', 'success'); Modules.overview.render();
  },

  // 收藏抓取素材
  async favorite(id, sub) {
    const store = sub === 'speaking' ? 'englishSpeaking' : 'englishListening';
    const item = await DB.get(store, id);
    item.favorite = !item.favorite;
    await DB.put(store, item);
    this.render();
  },

  // 加载 GitHub Actions 抓取的自动素材
  async loadAutoData() {
    try {
      const res = await fetch('data/english.json');
      if (!res.ok) return;
      const data = await res.json();
      if (data.speaking) {
        for (const item of data.speaking) {
          const exists = (await DB.getAll('englishSpeaking')).find(e => e.title === item.title && e.source === 'auto');
          if (!exists) await DB.put('englishSpeaking', { ...item, source: 'auto', createdAt: Date.now() });
        }
      }
      if (data.listening) {
        for (const item of data.listening) {
          const exists = (await DB.getAll('englishListening')).find(e => e.title === item.title && e.source === 'auto');
          if (!exists) await DB.put('englishListening', { ...item, source: 'auto', createdAt: Date.now() });
        }
      }
      this.render();
    } catch (e) { console.error('loadAutoData english', e); }
  }
};
