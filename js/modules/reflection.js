/**
 * 模块6：每日感悟（支持图片/视频 + AI总结）
 */
Modules.reflection = {
  tempImage: '',

  async init() {
    document.getElementById('reflectionSearch').addEventListener('input', Utils.debounce(() => this.render()));
  },

  async render() {
    const all = await DB.getAll('reflections');
    const kw = document.getElementById('reflectionSearch').value.trim().toLowerCase();
    let list = all.slice().sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    if (kw) list = list.filter(r => (r.content + r.videoUrl + (r.aiSummary || '')).toLowerCase().includes(kw));

    const el = document.getElementById('reflectionList');
    el.innerHTML = list.length === 0
      ? '<p class="empty-hint">暂无感悟，记录今日心情吧</p>'
      : list.map(r => this.renderCard(r)).join('');
  },

  renderCard(r) {
    let media = '';
    if (r.type === 'image' && r.imageUrl) {
      media = `<div class="rc-media"><img src="${r.imageUrl}" alt="感悟图片" loading="lazy"></div>`;
    }
    if (r.type === 'video' && r.videoUrl) {
      const embed = r.videoUrl.includes('bilibili') ? r.videoUrl :
        r.videoUrl.includes('youtube') ? r.videoUrl.replace('watch?v=', 'embed/') :
        r.videoUrl.includes('douyin') ? '' : '';
      if (embed) {
        media = `<div class="rc-media"><iframe src="${embed}" allowfullscreen loading="lazy"></iframe></div>`;
      } else {
        media = `<div class="rc-media"><a href="${r.videoUrl}" target="_blank" class="video-link">📹 查看视频</a></div>`;
      }
    }

    // AI 总结和方法论
    let aiSection = '';
    if (r.aiSummary) {
      aiSection = `
        <div class="ref-ai-block">
          <div class="ref-ai-summary">🤖 <strong>AI总结：</strong>${Utils.escapeHtml(r.aiSummary)}</div>
          ${r.aiMethods?.length ? `<div class="ref-ai-methods"><strong>💡 可挪用方法论：</strong>${r.aiMethods.map(m => `<span class="method-tag">${Utils.escapeHtml(m)}</span>`).join('')}</div>` : ''}
        </div>`;
    }

    return `
      <div class="reflection-card">
        <div class="rc-date">${Utils.formatDateTime(r.createdAt)}</div>
        <div class="rc-text">${Utils.escapeHtml(r.content || '')}</div>
        ${media}
        ${aiSection}
        <div class="card-actions" style="margin-top:10px">
          <button class="btn btn-sm btn-outline" onclick="Modules.reflection.edit('${r.id}')">✏️ 编辑</button>
          <button class="btn btn-sm btn-outline" onclick="Modules.reflection.aiAnalyze('${r.id}')">🤖 AI分析</button>
          <button class="btn btn-sm btn-danger-outline" onclick="Modules.reflection.del('${r.id}')">🗑️ 删除</button>
        </div>
      </div>
    `;
  },

  showAddDialog(editItem = null) {
    UI.showCustomModal(
      editItem ? '编辑感悟' : '记录感悟',
      `
        <div class="form-group">
          <label>类型</label>
          <select id="ref-type" onchange="Modules.reflection.toggleType()">
            <option value="text" ${editItem?.type === 'text' || !editItem ? 'selected' : ''}>纯文字</option>
            <option value="image" ${editItem?.type === 'image' ? 'selected' : ''}>图片</option>
            <option value="video" ${editItem?.type === 'video' ? 'selected' : ''}>视频</option>
          </select>
        </div>
        <div class="form-group"><label>内容/感悟</label><textarea id="ref-content" rows="4" placeholder="记录你的感悟...">${editItem ? Utils.escapeHtml(editItem.content || '') : ''}</textarea></div>
        <div class="form-group" id="ref-image-group" style="${editItem?.type === 'image' ? 'display:block' : 'display:none'}">
          <label>上传图片</label>
          <input type="file" id="ref-image" accept="image/*" onchange="Modules.reflection.handleImage(this)">
          <div id="ref-image-preview">${editItem?.imageUrl ? `<img src="${editItem.imageUrl}" style="max-width:120px;border-radius:8px;margin-top:8px">` : ''}</div>
        </div>
        <div class="form-group" id="ref-video-group" style="${editItem?.type === 'video' ? 'display:block' : 'display:none'}">
          <label>视频链接（支持B站/YouTube/抖音等）</label>
          <input id="ref-video" value="${editItem?.videoUrl || ''}" placeholder="粘贴视频链接">
        </div>
        <div class="form-group" id="ref-ai-group" style="${(editItem?.type === 'image' || editItem?.type === 'video') ? 'display:block' : 'display:none'}">
          <label style="display:flex;align-items:center;gap:6px">
            <input type="checkbox" id="ref-ai-auto" ${editItem?.aiSummary ? 'checked' : ''}> 保存时自动AI分析生成总结和方法论
          </label>
          <p style="font-size:11px;color:var(--text-muted);margin-top:4px">需要先在设置中配置AI API Key</p>
        </div>
      `,
      `<div class="modal-actions">
        <button class="btn btn-outline" onclick="UI.closeModal()">取消</button>
        <button class="btn btn-primary" onclick="Modules.reflection.save('${editItem?.id || ''}')">保存</button>
      </div>`
    );
    this.tempImage = editItem?.imageUrl || '';
  },

  toggleType() {
    const type = document.getElementById('ref-type').value;
    document.getElementById('ref-image-group').style.display = type === 'image' ? 'block' : 'none';
    document.getElementById('ref-video-group').style.display = type === 'video' ? 'block' : 'none';
    document.getElementById('ref-ai-group').style.display = (type === 'image' || type === 'video') ? 'block' : 'none';
  },

  async handleImage(input) {
    if (input.files[0]) {
      this.tempImage = await DB.saveImage(input.files[0]);
      document.getElementById('ref-image-preview').innerHTML = `<img src="${this.tempImage}" style="max-width:120px;border-radius:8px;margin-top:8px">`;
    }
  },

  async save(id) {
    const type = document.getElementById('ref-type').value;
    const item = id ? await DB.get('reflections', id) : {};
    item.type = type;
    item.content = document.getElementById('ref-content').value;
    item.imageUrl = type === 'image' ? (this.tempImage || '') : '';
    item.videoUrl = type === 'video' ? document.getElementById('ref-video').value : '';
    item.date = Utils.todayStr();
    if (!id) item.createdAt = Date.now();

    await DB.put('reflections', item);
    UI.closeModal();
    UI.toast('感悟已保存', 'success');

    // 如果选了自动AI分析
    const aiAuto = document.getElementById('ref-ai-auto');
    if (aiAuto && aiAuto.checked && (type === 'image' || type === 'video')) {
      UI.toast('正在AI分析...');
      try {
        await this.doAIAnalysis(item);
      } catch (e) {
        UI.toast('AI分析失败：' + e.message, 'error');
      }
    }

    this.render();
  },

  // 手动触发AI分析
  async aiAnalyze(id) {
    const item = await DB.get('reflections', id);
    if (!item) return;
    if (item.type === 'text') { UI.toast('纯文字感悟不需要AI分析，可以直接写总结'); return; }
    UI.toast('正在AI分析...');
    try {
      await this.doAIAnalysis(item);
      UI.toast('AI分析完成', 'success');
      this.render();
    } catch (e) {
      UI.toast('AI分析失败：' + e.message, 'error');
    }
  },

  async doAIAnalysis(item) {
    const result = await Utils.aiAnalyzeMedia(
      item.type,
      item.videoUrl || item.content,
      item.type === 'image' ? item.imageUrl : null
    );
    if (!result) throw new Error('AI未返回结果');
    // 尝试解析 JSON
    try {
      const json = JSON.parse(result.replace(/```json\n?|```/g, '').trim());
      item.aiSummary = json.summary || '';
      item.aiMethods = json.methods || [];
    } catch (e) {
      // 非 JSON 格式，直接作为总结
      item.aiSummary = result;
      item.aiMethods = [];
    }
    await DB.put('reflections', item);
  },

  async edit(id) {
    const r = await DB.get('reflections', id);
    if (r) this.showAddDialog(r);
  },

  async del(id) {
    if (!confirm('确定删除？')) return;
    await DB.delete('reflections', id); this.render();
  }
};

/**
 * 模块7：内容复盘
 */
Modules.review = {
  async init() {
    document.getElementById('reviewDate').value = Utils.todayStr();
    this.loadToday();
  },

  async loadToday() {
    const today = Utils.todayStr();
    const r = await this.getByDate(today);
    if (r) {
      document.getElementById('review-work').value = r.workReview || '';
      document.getElementById('review-english').value = r.englishReview || '';
      document.getElementById('review-life').value = r.lifeReview || '';
    }
  },

  async getByDate(date) {
    const all = await DB.getAll('reviews');
    return all.find(r => r.date === date);
  },

  async save() {
    const date = document.getElementById('reviewDate').value || Utils.todayStr();
    const existing = await this.getByDate(date);
    const item = existing || {};
    item.date = date;
    item.workReview = document.getElementById('review-work').value;
    item.englishReview = document.getElementById('review-english').value;
    item.lifeReview = document.getElementById('review-life').value;
    item.problems = item.workReview + item.englishReview + item.lifeReview;
    await DB.put('reviews', item);
    UI.toast('复盘已保存', 'success');
    Modules.overview.render();
  },

  async loadHistory() {
    const all = await DB.getAll('reviews');
    all.sort((a, b) => (b.date > a.date ? 1 : -1));
    const el = document.getElementById('reviewHistory');
    el.innerHTML = all.length === 0
      ? '<p class="empty-hint">暂无历史复盘</p>'
      : all.map(r => `
        <div class="review-history-item">
          <strong>${r.date}</strong>
          <div style="margin-top:6px;font-size:13px;color:var(--text-secondary)">
            ${r.workReview ? '<p>💼 ' + Utils.escapeHtml(r.workReview.substring(0, 60)) + '</p>' : ''}
            ${r.englishReview ? '<p>📖 ' + Utils.escapeHtml(r.englishReview.substring(0, 60)) + '</p>' : ''}
            ${r.lifeReview ? '<p>🏠 ' + Utils.escapeHtml(r.lifeReview.substring(0, 60)) + '</p>' : ''}
          </div>
          <button class="btn btn-sm btn-outline" onclick="Modules.review.loadDate('${r.date}')">查看/编辑</button>
        </div>
      `).join('');
  },

  async loadDate(date) {
    document.getElementById('reviewDate').value = date;
    const r = await this.getByDate(date);
    document.getElementById('review-work').value = r?.workReview || '';
    document.getElementById('review-english').value = r?.englishReview || '';
    document.getElementById('review-life').value = r?.lifeReview || '';
    document.getElementById('reviewHistory').scrollIntoView({ behavior: 'smooth' });
  }
};
