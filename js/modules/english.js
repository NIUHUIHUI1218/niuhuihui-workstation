/**
 * 模块4：英语学习（每日口语 / 每日听力 / 单词学习）
 */
Modules.english = {
  sub: 'speaking',
  // 口语状态
  speakingSource: 'auto',
  speakingCat: 'all',
  // 听力状态
  listeningSource: 'auto',
  listeningFilter: 'all',
  listeningCat: 'all',
  // 单词状态
  vocabSource: 'auto',
  vocabFilter: 'all',

  async init() {
    // 主tab切换
    document.querySelectorAll('#page-english .etab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('#page-english .etab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.sub = tab.dataset.sub;
        document.getElementById('english-speaking').style.display = this.sub === 'speaking' ? 'block' : 'none';
        document.getElementById('english-listening').style.display = this.sub === 'listening' ? 'block' : 'none';
        document.getElementById('english-vocab').style.display = this.sub === 'vocab' ? 'block' : 'none';
        this.render();
      });
    });

    // 口语 - 来源切换
    document.querySelectorAll('#english-speaking .stab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('#english-speaking .stab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.speakingSource = tab.dataset.source;
        this.renderSpeaking();
      });
    });
    // 口语 - 工作/日常切换
    document.querySelectorAll('#english-speaking .ecat-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#english-speaking .ecat-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.speakingCat = btn.dataset.cat;
        this.renderSpeaking();
      });
    });

    // 听力 - 来源切换
    document.querySelectorAll('#english-listening .stab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('#english-listening .stab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.listeningSource = tab.dataset.source;
        this.renderListening();
      });
    });
    // 听力 - 工作/日常+状态筛选
    document.querySelectorAll('#english-listening .ecat-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#english-listening .ecat-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.listeningCat = btn.dataset.cat;
        this.renderListening();
      });
    });
    document.querySelectorAll('#english-listening .efilter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#english-listening .efilter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.listeningFilter = btn.dataset.filter;
        this.renderListening();
      });
    });

    // 单词 - 来源切换
    document.querySelectorAll('#english-vocab .stab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('#english-vocab .stab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.vocabSource = tab.dataset.source;
        this.renderVocab();
      });
    });
    // 单词 - 学习状态筛选
    document.querySelectorAll('#english-vocab .efilter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#english-vocab .efilter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.vocabFilter = btn.dataset.filter;
        this.renderVocab();
      });
    });
  },

  async render() {
    if (this.sub === 'speaking') await this.renderSpeaking();
    else if (this.sub === 'listening') await this.renderListening();
    else await this.renderVocab();
  },

  // ========== 口语 ==========
  async renderSpeaking() {
    const all = await DB.getAll('englishSpeaking');
    let list = all.filter(i => i.source === this.speakingSource);
    if (this.speakingCat !== 'all') list = list.filter(i => i.category === this.speakingCat || (this.speakingCat === 'work' && i.category === 'business'));
    list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    const el = document.getElementById('englishList-speaking');
    el.innerHTML = list.length === 0
      ? '<p class="empty-hint">暂无素材，点击"新增素材"或"导入素材"添加</p>'
      : list.map(i => this.renderSpeakingCard(i)).join('');
  },

  renderSpeakingCard(i) {
    const dialogue = (i.dialogue || []).map(line => `
      <div class="line"><span class="speaker ${line.role === 'client' ? 'client' : ''}">${line.role === 'client' ? 'Client' : 'You'}:</span> ${Utils.escapeHtml(line.text)}</div>
    `).join('');
    return `
      <div class="english-card">
        <div class="ec-header">
          <span class="ec-category">${(i.category === 'work' || i.category === 'business') ? '💼 工作' : '🏠 日常'}</span>
          ${i.hot ? '<span class="tag-pill hot">🔥 热门</span>' : ''}
        </div>
        <div class="ec-title">${Utils.escapeHtml(i.title)}</div>
        <div class="ec-content"><div class="ec-dialogue">${dialogue || Utils.escapeHtml(i.content)}</div></div>
        ${i.phrases ? `<div class="ec-phrases"><strong>短语释义：</strong>${Utils.escapeHtml(i.phrases)}</div>` : ''}
        ${i.culturalTips ? `<div class="ec-phrases"><strong>跨文化小贴士：</strong>${Utils.escapeHtml(i.culturalTips)}</div>` : ''}
        ${i.myNotes ? `<div class="ec-phrases"><strong>我的笔记：</strong>${Utils.escapeHtml(i.myNotes)}</div>` : ''}
        <div class="ec-actions">
          <button class="btn btn-sm btn-outline" onclick="Modules.english.addNotes('${i.id}', 'speaking')">📝 笔记</button>
          <button class="btn btn-sm btn-outline" onclick="Modules.english.addToPlan('${i.id}', 'speaking')">📅 加入计划</button>
          <button class="btn btn-sm btn-outline" onclick="Modules.english.markDone('${i.id}', 'speaking')">✅ 完成</button>
          ${i.link ? `<a class="btn btn-sm btn-outline" href="${i.link}" target="_blank">🔗 原文</a>` : ''}
          ${i.source === 'manual' ? `<button class="btn btn-sm btn-outline" onclick="Modules.english.editSpeaking('${i.id}')">✏️ 编辑</button>` : ''}
          <button class="btn btn-sm btn-danger-outline" onclick="Modules.english.del('${i.id}', 'speaking')">🗑️</button>
        </div>
      </div>
    `;
  },

  // ========== 听力 ==========
  async renderListening() {
    const all = await DB.getAll('englishListening');
    let list = all.filter(i => i.source === this.listeningSource);
    if (this.listeningCat !== 'all') list = list.filter(i => i.category === this.listeningCat);
    if (this.listeningFilter !== 'all') list = list.filter(i => i.status === this.listeningFilter || (this.listeningFilter === 'unpracticed' && !i.status));
    list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    const el = document.getElementById('englishList-listening');
    el.innerHTML = list.length === 0
      ? '<p class="empty-hint">暂无素材，点击"新增素材"或"导入素材"添加</p>'
      : list.map(i => this.renderListeningCard(i)).join('');
  },

  renderListeningCard(i) {
    return `
      <div class="english-card listening-card">
        <div class="ec-header">
          <span class="ec-category">${(i.category === 'work' || i.category === 'business') ? '💼 工作' : '🏠 日常'}</span>
          <span class="ec-category ml-8">${i.status === 'done' ? '已完成' : (i.status === 'review' ? '待复习' : '未练习')}</span>
          ${i.hot ? '<span class="tag-pill hot">🔥 热门</span>' : ''}
        </div>
        <div class="ec-title">${Utils.escapeHtml(i.title)}</div>
        <div class="ec-content">${Utils.escapeHtml(i.content || '')}</div>
        ${i.audioUrl ? `<audio class="audio-player" controls src="${i.audioUrl}"></audio>` : ''}
        ${i.exercises ? `<div class="ec-phrases"><strong>课后习题：</strong>${Utils.escapeHtml(i.exercises)}</div>` : ''}
        ${i.myNotes ? `<div class="ec-phrases"><strong>我的笔记：</strong>${Utils.escapeHtml(i.myNotes)}</div>` : ''}
        <div class="ec-actions">
          <button class="btn btn-sm btn-outline" onclick="Modules.english.addNotes('${i.id}', 'listening')">📝 笔记</button>
          <button class="btn btn-sm btn-outline" onclick="Modules.english.addToPlan('${i.id}', 'listening')">📅 计划</button>
          <button class="btn btn-sm btn-outline" onclick="Modules.english.markDone('${i.id}', 'listening')">✅ 完成</button>
          <button class="btn btn-sm btn-outline" onclick="Modules.english.markReview('${i.id}', 'listening')">🔁 复习</button>
          ${i.source === 'manual' ? `<button class="btn btn-sm btn-outline" onclick="Modules.english.editListening('${i.id}')">✏️ 编辑</button>` : ''}
          <button class="btn btn-sm btn-danger-outline" onclick="Modules.english.del('${i.id}', 'listening')">🗑️</button>
        </div>
      </div>
    `;
  },

  // ========== 单词学习 ==========
  async renderVocab() {
    const all = await DB.getAll('englishVocab');
    let list = all.filter(i => i.source === this.vocabSource);
    if (this.vocabFilter !== 'all') list = list.filter(i => i.status === this.vocabFilter || (this.vocabFilter === 'new' && !i.status));
    list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    const el = document.getElementById('englishList-vocab');
    el.innerHTML = list.length === 0
      ? '<p class="empty-hint">暂无单词，点击"新增单词"或"导入单词表"添加</p>'
      : list.map(w => this.renderVocabCard(w)).join('');
  },

  renderVocabCard(w) {
    return `
      <div class="english-card vocab-card">
        <div class="ec-header">
          <span class="ec-category">${w.status === 'mastered' ? '✅ 已掌握' : (w.status === 'learning' ? '📖 学习中' : '🆕 未学')}</span>
          ${w.hot ? '<span class="tag-pill hot">🔥 热门</span>' : ''}
        </div>
        <div class="vocab-word">${Utils.escapeHtml(w.word)} <span class="vocab-phonetic">${Utils.escapeHtml(w.phonetic || '')}</span></div>
        <div class="vocab-definition">${Utils.escapeHtml(w.definition || '')}</div>
        ${w.example ? `<div class="vocab-example">例句：${Utils.escapeHtml(w.example)}</div>` : ''}
        ${w.myNotes ? `<div class="ec-phrases"><strong>笔记：</strong>${Utils.escapeHtml(w.myNotes)}</div>` : ''}
        <div class="ec-actions">
          <button class="btn btn-sm btn-outline" onclick="Modules.english.vocabSetStatus('${w.id}', 'learning')">📖 学习中</button>
          <button class="btn btn-sm btn-outline" onclick="Modules.english.vocabSetStatus('${w.id}', 'mastered')">✅ 已掌握</button>
          <button class="btn btn-sm btn-outline" onclick="Modules.english.addNotes('${w.id}', 'vocab')">📝 笔记</button>
          ${w.source === 'manual' ? `<button class="btn btn-sm btn-outline" onclick="Modules.english.editVocab('${w.id}')">✏️ 编辑</button>` : ''}
          <button class="btn btn-sm btn-danger-outline" onclick="Modules.english.del('${w.id}', 'vocab')">🗑️</button>
        </div>
      </div>
    `;
  },

  // ========== 通用操作 ==========
  getStore(sub) {
    return sub === 'speaking' ? 'englishSpeaking' : sub === 'listening' ? 'englishListening' : 'englishVocab';
  },

  // 导入素材（链接或文件）
  showImportDialog(sub) {
    const subName = sub === 'speaking' ? '口语' : sub === 'listening' ? '听力' : '单词';
    UI.showCustomModal(
      `📥 导入${subName}素材`,
      `
        <div class="form-group">
          <label>导入方式</label>
          <select id="eng-import-type" onchange="Modules.english.toggleImportType()">
            <option value="link">粘贴链接</option>
            <option value="file">上传文件</option>
          </select>
        </div>
        <div class="form-group" id="eng-import-link">
          <label>素材链接</label>
          <input id="eng-import-url" placeholder="粘贴网页链接（如China Daily/BBC/TED页面）">
          <p style="font-size:11px;color:var(--text-muted);margin-top:4px">支持：China Daily, BBC Learning English, TED, B站等</p>
        </div>
        <div class="form-group" id="eng-import-file" style="display:none">
          <label>上传文件</label>
          <input type="file" id="eng-import-file-input" accept=".txt,.csv,.json,.md">
          <p style="font-size:11px;color:var(--text-muted);margin-top:4px">支持 txt/csv/json/md 格式的素材文件</p>
        </div>
        ${sub !== 'vocab' ? `
        <div class="form-group">
          <label>分类</label>
          <select id="eng-import-cat">
            <option value="work">💼 工作</option>
            <option value="daily">🏠 日常</option>
          </select>
        </div>` : ''}
      `,
      `<div class="modal-actions">
        <button class="btn btn-outline" onclick="UI.closeModal()">取消</button>
        <button class="btn btn-primary" onclick="Modules.english.doImport('${sub}')">导入</button>
      </div>`
    );
  },

  toggleImportType() {
    const type = document.getElementById('eng-import-type').value;
    document.getElementById('eng-import-link').style.display = type === 'link' ? 'block' : 'none';
    document.getElementById('eng-import-file').style.display = type === 'file' ? 'block' : 'none';
  },

  async doImport(sub) {
    const type = document.getElementById('eng-import-type').value;
    const cat = document.getElementById('eng-import-cat')?.value || 'daily';
    const store = this.getStore(sub);

    if (type === 'link') {
      const url = document.getElementById('eng-import-url').value.trim();
      if (!url) { UI.toast('请输入链接'); return; }
      await DB.put(store, {
        source: 'manual', category: cat,
        title: '导入素材：' + url.substring(0, 50),
        content: url,
        link: url,
        createdAt: Date.now()
      });
    } else {
      const fileInput = document.getElementById('eng-import-file-input');
      if (!fileInput.files[0]) { UI.toast('请选择文件'); return; }
      const text = await fileInput.files[0].text();
      if (sub === 'vocab') {
        // 简单单词表解析：每行 word,definition,example
        const lines = text.trim().split('\n');
        for (const line of lines) {
          const parts = line.split(',').map(s => s.trim()).filter(Boolean);
          if (parts.length >= 2) {
            await DB.put(store, {
              source: 'manual', word: parts[0], definition: parts[1],
              example: parts[2] || '', status: 'new', createdAt: Date.now()
            });
          }
        }
        UI.toast(`导入了 ${lines.length} 个单词`, 'success');
      } else {
        await DB.put(store, {
          source: 'manual', category: cat,
          title: fileInput.files[0].name.replace(/\.[^.]+$/, ''),
          content: text.substring(0, 5000),
          createdAt: Date.now()
        });
      }
    }
    UI.closeModal();
    UI.toast('导入成功', 'success');
    this.render();
  },

  // 刷新热门素材
  async refreshHot() {
    UI.toast('正在获取热门素材...');
    try {
      const res = await fetch('data/english.json');
      if (!res.ok) { UI.toast('暂无热门素材数据', 'warning'); return; }
      const data = await res.json();
      let count = 0;
      if (data.speaking) {
        for (const item of data.speaking) {
          const exists = (await DB.getAll('englishSpeaking')).find(e => e.title === item.title && e.source === 'auto');
          if (!exists) { await DB.put('englishSpeaking', { ...item, source: 'auto', hot: true, createdAt: Date.now() }); count++; }
        }
      }
      if (data.listening) {
        for (const item of data.listening) {
          const exists = (await DB.getAll('englishListening')).find(e => e.title === item.title && e.source === 'auto');
          if (!exists) { await DB.put('englishListening', { ...item, source: 'auto', hot: true, createdAt: Date.now() }); count++; }
        }
      }
      if (data.vocab) {
        for (const item of data.vocab) {
          const exists = (await DB.getAll('englishVocab')).find(e => e.word === item.word && e.source === 'auto');
          if (!exists) { await DB.put('englishVocab', { ...item, source: 'auto', hot: true, createdAt: Date.now() }); count++; }
        }
      }
      this.render();
      UI.toast(`获取了 ${count} 条新素材`, 'success');
    } catch (e) {
      console.error('refreshHot', e);
      UI.toast('获取热门素材失败，请检查网络', 'error');
    }
  },

  // ========== 新增/编辑弹窗 ==========
  showAddDialog(sub, editItem = null) {
    if (sub === 'speaking') {
      this._showSpeakingDialog(editItem);
    } else if (sub === 'listening') {
      this._showListeningDialog(editItem);
    } else {
      this._showVocabDialog(editItem);
    }
  },

  _showSpeakingDialog(editItem) {
    UI.showCustomModal(
      editItem ? '编辑口语素材' : '新增口语素材',
      `
        <div class="form-group">
          <label>分类</label>
          <select id="eng-cat">
            <option value="work" ${editItem?.category === 'work' ? 'selected' : ''}>💼 工作</option>
            <option value="daily" ${editItem?.category !== 'work' ? 'selected' : ''}>🏠 日常</option>
          </select>
        </div>
        <div class="form-group"><label>标题/场景</label><input id="eng-title" value="${editItem ? Utils.escapeHtml(editItem.title) : ''}"></div>
        <div class="form-group"><label>自身台词（一行一句）</label><textarea id="eng-myLine">${editItem ? Utils.escapeHtml(editItem.myLine || '') : ''}</textarea></div>
        <div class="form-group"><label>对方台词（一行一句）</label><textarea id="eng-partnerLine">${editItem ? Utils.escapeHtml(editItem.partnerLine || '') : ''}</textarea></div>
        <div class="form-group"><label>短语释义</label><textarea id="eng-phrases">${editItem ? Utils.escapeHtml(editItem.phrases || '') : ''}</textarea></div>
        <div class="form-group"><label>跨文化小贴士</label><textarea id="eng-tips">${editItem ? Utils.escapeHtml(editItem.culturalTips || '') : ''}</textarea></div>
        <div class="form-group"><label>外部链接</label><input id="eng-link" value="${editItem?.link || ''}" placeholder="可选"></div>
      `,
      `<div class="modal-actions">
        <button class="btn btn-outline" onclick="UI.closeModal()">取消</button>
        <button class="btn btn-primary" onclick="Modules.english.saveSpeaking('${editItem?.id || ''}')">保存</button>
      </div>`
    );
  },

  _showListeningDialog(editItem) {
    UI.showCustomModal(
      editItem ? '编辑听力素材' : '新增听力素材',
      `
        <div class="form-group">
          <label>分类</label>
          <select id="eng-listen-cat">
            <option value="work" ${editItem?.category === 'work' ? 'selected' : ''}>💼 工作</option>
            <option value="daily" ${editItem?.category !== 'work' ? 'selected' : ''}>🏠 日常</option>
          </select>
        </div>
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
  },

  _showVocabDialog(editItem) {
    UI.showCustomModal(
      editItem ? '编辑单词' : '新增单词',
      `
        <div class="form-group"><label>单词</label><input id="vocab-word" value="${editItem ? Utils.escapeHtml(editItem.word || '') : ''}"></div>
        <div class="form-group"><label>音标</label><input id="vocab-phonetic" value="${editItem ? Utils.escapeHtml(editItem.phonetic || '') : ''}"></div>
        <div class="form-group"><label>释义</label><input id="vocab-definition" value="${editItem ? Utils.escapeHtml(editItem.definition || '') : ''}"></div>
        <div class="form-group"><label>例句</label><textarea id="vocab-example">${editItem ? Utils.escapeHtml(editItem.example || '') : ''}</textarea></div>
      `,
      `<div class="modal-actions">
        <button class="btn btn-outline" onclick="UI.closeModal()">取消</button>
        <button class="btn btn-primary" onclick="Modules.english.saveVocab('${editItem?.id || ''}')">保存</button>
      </div>`
    );
  },

  // ========== 保存方法 ==========
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
    item.link = document.getElementById('eng-link').value;
    await DB.put('englishSpeaking', item);
    UI.closeModal(); UI.toast('保存成功', 'success');
    this.render(); Modules.overview.render();
  },

  async saveListening(id) {
    const title = document.getElementById('eng-listen-title').value.trim();
    if (!title) { UI.toast('请输入标题'); return; }
    const item = id ? await DB.get('englishListening', id) : { source: 'manual' };
    item.title = title;
    item.category = document.getElementById('eng-listen-cat').value;
    item.content = document.getElementById('eng-listen-content').value;
    item.audioUrl = document.getElementById('eng-listen-audio').value;
    item.exercises = document.getElementById('eng-listen-ex').value;
    await DB.put('englishListening', item);
    UI.closeModal(); UI.toast('保存成功', 'success');
    this.render(); Modules.overview.render();
  },

  async saveVocab(id) {
    const word = document.getElementById('vocab-word').value.trim();
    if (!word) { UI.toast('请输入单词'); return; }
    const item = id ? await DB.get('englishVocab', id) : { source: 'manual', status: 'new' };
    item.word = word;
    item.phonetic = document.getElementById('vocab-phonetic').value;
    item.definition = document.getElementById('vocab-definition').value;
    item.example = document.getElementById('vocab-example').value;
    await DB.put('englishVocab', item);
    UI.closeModal(); UI.toast('保存成功', 'success');
    this.render(); Modules.overview.render();
  },

  // ========== 编辑/删除 ==========
  async editSpeaking(id) { const i = await DB.get('englishSpeaking', id); if (i) this.showAddDialog('speaking', i); },
  async editListening(id) { const i = await DB.get('englishListening', id); if (i) this.showAddDialog('listening', i); },
  async editVocab(id) { const i = await DB.get('englishVocab', id); if (i) this.showAddDialog('vocab', i); },

  async del(id, sub) {
    if (!confirm('确定删除？')) return;
    await DB.delete(this.getStore(sub), id);
    this.render(); Modules.overview.render();
  },

  // ========== 笔记/计划/状态 ==========
  async addNotes(id, sub) {
    const store = this.getStore(sub);
    const item = await DB.get(store, id);
    UI.showCustomModal(
      '补充笔记',
      `<div class="form-group"><textarea id="eng-note-input" rows="4">${item.myNotes || ''}</textarea></div>`,
      `<div class="modal-actions">
        <button class="btn btn-outline" onclick="UI.closeModal()">取消</button>
        <button class="btn btn-primary" onclick="Modules.english.saveNotes('${id}', '${sub}')">保存</button>
      </div>`
    );
  },

  async saveNotes(id, sub) {
    const item = await DB.get(this.getStore(sub), id);
    item.myNotes = document.getElementById('eng-note-input').value;
    await DB.put(this.getStore(sub), item);
    UI.closeModal(); UI.toast('笔记已保存', 'success'); this.render();
  },

  async markDone(id, sub) {
    const item = await DB.get(this.getStore(sub), id);
    item.status = 'done'; item.completedAt = Date.now();
    await DB.put(this.getStore(sub), item);
    UI.toast('已标记完成', 'success'); this.render(); Modules.overview.render();
  },

  async markReview(id, sub) {
    const item = await DB.get(this.getStore(sub), id);
    item.status = 'review'; item.reviewDate = Utils.todayStr();
    await DB.put(this.getStore(sub), item);
    UI.toast('已加入复习清单', 'success'); this.render();
  },

  async vocabSetStatus(id, status) {
    const item = await DB.get('englishVocab', id);
    item.status = status;
    await DB.put('englishVocab', item);
    this.renderVocab();
  },

  async addToPlan(id, sub) {
    const item = await DB.get(this.getStore(sub), id);
    const label = sub === 'vocab' ? '单词' : '英语学习';
    await DB.put('plans', {
      type: 'life', title: `${label}：${item.title || item.word}`, status: 'todo',
      date: Utils.todayStr(), category: 'english'
    });
    UI.toast('已加入今日计划', 'success'); Modules.overview.render();
  },

  // ========== 加载自动数据 ==========
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
      if (data.vocab) {
        for (const item of data.vocab) {
          const exists = (await DB.getAll('englishVocab')).find(e => e.word === item.word && e.source === 'auto');
          if (!exists) await DB.put('englishVocab', { ...item, source: 'auto', createdAt: Date.now() });
        }
      }
      this.render();
    } catch (e) { console.error('loadAutoData english', e); }
  }
};
