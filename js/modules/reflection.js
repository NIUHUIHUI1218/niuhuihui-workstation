/**
 * 模块6：每日感悟
 */
Modules.reflection = {
  async render() {
    const all = await DB.getAll('reflections');
    const kw = document.getElementById('reflectionSearch').value.trim().toLowerCase();
    let list = all.slice().sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    if (kw) list = list.filter(r => (r.content + r.videoUrl).toLowerCase().includes(kw));

    const el = document.getElementById('reflectionList');
    el.innerHTML = list.length === 0
      ? '<p class="empty-hint">暂无感悟，记录今日心情吧</p>'
      : list.map(r => this.renderCard(r)).join('');
  },

  renderCard(r) {
    let media = '';
    if (r.type === 'image' && r.imageUrl) media = `<div class="rc-media"><img src="${r.imageUrl}" alt="感悟图片"></div>`;
    if (r.type === 'video' && r.videoUrl) {
      const embed = r.videoUrl.includes('bilibili') ? r.videoUrl :
        r.videoUrl.includes('youtube') ? r.videoUrl.replace('watch?v=', 'embed/') : '';
      media = `<div class="rc-media"><iframe src="${embed || r.videoUrl}" allowfullscreen></iframe></div>`;
    }
    return `
      <div class="reflection-card">
        <div class="rc-date">${Utils.formatDateTime(r.createdAt)}</div>
        <div class="rc-text">${Utils.escapeHtml(r.content || '')}</div>
        ${media}
        <div class="card-actions" style="margin-top:10px">
          <button class="btn btn-sm btn-outline" onclick="Modules.reflection.edit('${r.id}')">✏️ 编辑</button>
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
            <option value="image" ${editItem?.type === 'image' ? 'selected' : ''}>图片上传</option>
            <option value="video" ${editItem?.type === 'video' ? 'selected' : ''}>外部视频链接</option>
          </select>
        </div>
        <div class="form-group"><label>内容</label><textarea id="ref-content" rows="5">${editItem ? Utils.escapeHtml(editItem.content || '') : ''}</textarea></div>
        <div class="form-group" id="ref-image-group" style="${editItem?.type === 'image' ? 'display:block' : 'display:none'}">
          <label>图片</label>
          <input type="file" id="ref-image" accept="image/*" onchange="Modules.reflection.handleImage(this)">
          <div id="ref-image-preview">${editItem?.imageUrl ? `<img src="${editItem.imageUrl}" style="max-width:120px;border-radius:8px;margin-top:8px">` : ''}</div>
        </div>
        <div class="form-group" id="ref-video-group" style="${editItem?.type === 'video' ? 'display:block' : 'display:none'}">
          <label>视频链接</label><input id="ref-video" value="${editItem?.videoUrl || ''}">
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
    UI.closeModal(); UI.toast('感悟已保存', 'success');
    this.render();
  },

  async edit(id) { const r = await DB.get('reflections', id); if (r) this.showAddDialog(r); },
  async del(id) { if (!confirm('确定删除？')) return; await DB.delete('reflections', id); this.render(); }
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
