/**
 * 模块5：读书笔记
 */
Modules.reading = {
  currentImages: [],

  async init() {
    document.getElementById('readingSearch').addEventListener('input', Utils.debounce(() => this.render()));
  },

  async render() {
    const all = await DB.getAll('readingNotes');
    const kw = document.getElementById('readingSearch').value.trim().toLowerCase();
    const tag = document.getElementById('readingTagFilter').value;
    const book = document.getElementById('readingBookFilter').value;

    let list = all.filter(r => !r.archived);
    if (kw) list = list.filter(r => (r.title + r.content + r.bookName).toLowerCase().includes(kw));
    if (tag !== 'all') list = list.filter(r => (r.tags || []).includes(tag));
    if (book !== 'all') list = list.filter(r => r.bookName === book);
    list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    // 更新书籍下拉
    const books = [...new Set(all.map(r => r.bookName).filter(Boolean))];
    const sel = document.getElementById('readingBookFilter');
    const cur = sel.value;
    sel.innerHTML = '<option value="all">全部书籍</option>' + books.map(b => `<option value="${Utils.escapeHtml(b)}">${Utils.escapeHtml(b)}</option>`).join('');
    sel.value = books.includes(cur) ? cur : 'all';

    const el = document.getElementById('readingGrid');
    el.innerHTML = list.length === 0
      ? '<p class="empty-hint">📚 暂无读书笔记，开始记录吧</p>'
      : list.map(r => this.renderCard(r)).join('');
  },

  renderCard(r) {
    return `
      <div class="reading-card" draggable="true" ondragstart="Modules.reading.dragStart(event, '${r.id}')" ondrop="Modules.reading.drop(event, '${r.id}')" ondragover="Modules.reading.allowDrop(event)">
        <div class="rc-book">${Utils.escapeHtml(r.bookName || '未分类书籍')}</div>
        <div class="rc-title">${Utils.escapeHtml(r.title || '无标题')}</div>
        <div class="rc-content">${Utils.escapeHtml(r.content || '').substring(0, 120)}${r.content?.length > 120 ? '...' : ''}</div>
        <div class="rc-tags">${(r.tags || []).map(t => `<span class="rc-tag">${Utils.escapeHtml(t)}</span>`).join('')}</div>
        ${r.images?.length ? `<div class="rc-images">${r.images.map(img => `<img src="${img}" alt="笔记图片">`).join('')}</div>` : ''}
        <div class="card-actions">
          <button class="btn btn-sm btn-outline" onclick="Modules.reading.edit('${r.id}')">✏️ 编辑</button>
          <button class="btn btn-sm btn-outline" onclick="Modules.reading.toggleFavorite('${r.id}')">${r.favorite ? '⭐ 已收藏' : '☆ 收藏'}</button>
          <button class="btn btn-sm btn-outline" onclick="Modules.reading.exportOne('${r.id}', 'md')">📄 MD</button>
          <button class="btn btn-sm btn-outline" onclick="Modules.reading.exportOne('${r.id}', 'txt')">📄 文本</button>
          <button class="btn btn-sm btn-danger-outline" onclick="Modules.reading.del('${r.id}')">🗑️ 删除</button>
        </div>
      </div>
    `;
  },

  dragStart(e, id) { e.dataTransfer.setData('text/plain', id); },
  allowDrop(e) { e.preventDefault(); },
  async drop(e, targetId) {
    e.preventDefault();
    const sourceId = e.dataTransfer.getData('text/plain');
    if (sourceId === targetId) return;
    const all = await DB.getAll('readingNotes');
    const sourceIdx = all.findIndex(r => r.id === sourceId);
    const targetIdx = all.findIndex(r => r.id === targetId);
    if (sourceIdx < 0 || targetIdx < 0) return;
    const [moved] = all.splice(sourceIdx, 1);
    all.splice(targetIdx, 0, moved);
    for (let i = 0; i < all.length; i++) {
      all[i].order = i;
      await DB.put('readingNotes', all[i]);
    }
    this.render();
  },

  async showAddDialog(editItem = null) {
    this.currentImages = editItem?.images ? [...editItem.images] : [];
    const defaultRemind = editItem?.remindTime || (await DB.getSettings('readingReminderTime', '21:00'));
    UI.showCustomModal(
      editItem ? '编辑笔记' : '新增读书笔记',
      `
        <div class="form-group"><label>书名</label><input id="read-book" value="${editItem ? Utils.escapeHtml(editItem.bookName || '') : ''}"></div>
        <div class="form-group"><label>笔记标题</label><input id="read-title" value="${editItem ? Utils.escapeHtml(editItem.title || '') : ''}"></div>
        <div class="form-group"><label>正文内容</label><textarea id="read-content" rows="6">${editItem ? Utils.escapeHtml(editItem.content || '') : ''}</textarea></div>
        <div class="form-group">
          <label>分类标签</label>
          <select id="read-tags" multiple size="3" style="min-height:80px">
            <option value="书籍名称" ${editItem?.tags?.includes('书籍名称') ? 'selected' : ''}>书籍名称</option>
            <option value="书籍类型" ${editItem?.tags?.includes('书籍类型') ? 'selected' : ''}>书籍类型</option>
            <option value="摘抄金句" ${editItem?.tags?.includes('摘抄金句') ? 'selected' : ''}>摘抄金句</option>
            <option value="读后感悟" ${editItem?.tags?.includes('读后感悟') ? 'selected' : ''}>读后感悟</option>
            <option value="章节备注" ${editItem?.tags?.includes('章节备注') ? 'selected' : ''}>章节备注</option>
          </select>
          <input id="read-custom-tags" placeholder="自定义标签，用逗号分隔" value="${editItem?.tags?.filter(t => !['书籍名称','书籍类型','摘抄金句','读后感悟','章节备注'].includes(t)).join(',') || ''}">
        </div>
        <div class="form-group">
          <label>图片导入</label>
          <input type="file" id="read-images" multiple accept="image/*" onchange="Modules.reading.handleImages(this)">
          <div id="read-image-preview" style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap">${this.currentImages.map(img => `<img src="${img}" style="width:60px;height:60px;object-fit:cover;border-radius:6px">`).join('')}</div>
        </div>
        <div class="form-group"><label>书籍来源链接</label><input id="read-source" value="${editItem?.sourceUrl || ''}" placeholder="可选"></div>
        <div class="form-group"><label>阅读打卡提醒时间</label><input type="time" id="read-remind" value="${defaultRemind}"></div>
      `,
      `<div class="modal-actions">
        <button class="btn btn-outline" onclick="UI.closeModal()">取消</button>
        <button class="btn btn-primary" onclick="Modules.reading.save('${editItem?.id || ''}')">保存</button>
      </div>`
    );
  },

  async handleImages(input) {
    for (const file of input.files) {
      const base64 = await DB.saveImage(file);
      this.currentImages.push(base64);
    }
    document.getElementById('read-image-preview').innerHTML = this.currentImages.map(img =>
      `<div style="position:relative"><img src="${img}" style="width:60px;height:60px;object-fit:cover;border-radius:6px"><button onclick="Modules.reading.removeImage('${img}')" style="position:absolute;top:-4px;right:-4px;background:#D4786E;color:#fff;border:none;border-radius:50%;width:18px;height:18px;font-size:10px;cursor:pointer">×</button></div>`
    ).join('');
  },

  async removeImage(img) {
    this.currentImages = this.currentImages.filter(i => i !== img);
    document.getElementById('read-image-preview').innerHTML = this.currentImages.map(img =>
      `<div style="position:relative"><img src="${img}" style="width:60px;height:60px;object-fit:cover;border-radius:6px"><button onclick="Modules.reading.removeImage('${img}')" style="position:absolute;top:-4px;right:-4px;background:#D4786E;color:#fff;border:none;border-radius:50%;width:18px;height:18px;font-size:10px;cursor:pointer">×</button></div>`
    ).join('');
  },

  async save(id) {
    const bookName = document.getElementById('read-book').value.trim();
    const title = document.getElementById('read-title').value.trim();
    const content = document.getElementById('read-content').value.trim();
    if (!bookName && !title && !content && this.currentImages.length === 0) { UI.toast('请填写至少一项内容'); return; }

    const tags = Array.from(document.getElementById('read-tags').selectedOptions).map(o => o.value);
    const custom = document.getElementById('read-custom-tags').value.split(',').map(t => t.trim()).filter(Boolean);
    tags.push(...custom);

    const item = id ? await DB.get('readingNotes', id) : {};
    item.bookName = bookName;
    item.title = title;
    item.content = content;
    item.tags = tags;
    item.images = this.currentImages;
    item.sourceUrl = document.getElementById('read-source').value;
    item.remindTime = document.getElementById('read-remind').value;
    if (item.remindTime) await DB.setSettings('readingReminderTime', item.remindTime);

    await DB.put('readingNotes', item);
    UI.closeModal(); UI.toast('笔记已保存', 'success');
    this.render(); Modules.overview.render();
  },

  async edit(id) { const r = await DB.get('readingNotes', id); if (r) await this.showAddDialog(r); },

  async del(id) {
    if (!confirm('确定删除该笔记？')) return;
    await DB.delete('readingNotes', id); this.render(); Modules.overview.render();
  },

  async toggleFavorite(id) {
    const r = await DB.get('readingNotes', id);
    r.favorite = !r.favorite; await DB.put('readingNotes', r); this.render();
  },

  async search() { this.render(); },

  async showNewBook() {
    UI.showCustomModal(
      '新建书单',
      `
        <div class="form-group"><label>书名</label><input id="booklist-name"></div>
        <div class="form-group"><label>作者</label><input id="booklist-author"></div>
        <div class="form-group"><label>状态</label>
          <select id="booklist-status"><option value="想读">想读</option><option value="在读">在读</option><option value="已读">已读</option></select>
        </div>
      `,
      `<div class="modal-actions">
        <button class="btn btn-outline" onclick="UI.closeModal()">取消</button>
        <button class="btn btn-primary" onclick="Modules.reading.saveBookList()">保存</button>
      </div>`
    );
  },

  async saveBookList() {
    const name = document.getElementById('booklist-name').value.trim();
    if (!name) { UI.toast('请输入书名'); return; }
    await DB.put('readingNotes', {
      bookName: name, title: '书单：' + name,
      content: `作者：${document.getElementById('booklist-author').value}\n状态：${document.getElementById('booklist-status').value}`,
      tags: ['书籍名称']
    });
    UI.closeModal(); UI.toast('书单已保存', 'success'); this.render();
  },

  async exportOne(id, fmt) {
    const r = await DB.get('readingNotes', id);
    let content = '';
    if (fmt === 'md') {
      content = `# ${r.title || '读书笔记'}\n\n**书名**：${r.bookName || '-'}\n\n**标签**：${(r.tags || []).join(', ')}\n\n${r.content || ''}\n`;
    } else {
      content = `书名：${r.bookName || '-'}\n标题：${r.title || '-'}\n标签：${(r.tags || []).join(', ')}\n\n${r.content || ''}`;
    }
    Utils.downloadFile(content, `${r.bookName || 'note'}-${Utils.todayStr()}.${fmt}`, 'text/plain');
  },

  async exportBook(bookName, fmt) {
    const all = await DB.getAll('readingNotes');
    const notes = all.filter(r => r.bookName === bookName && !r.archived);
    let content = `# 《${bookName}》读书笔记\n\n`;
    for (const r of notes) {
      content += `## ${r.title || '无标题'}\n\n${r.content || ''}\n\n---\n\n`;
    }
    Utils.downloadFile(content, `${bookName}-${Utils.todayStr()}.${fmt === 'md' ? 'md' : 'txt'}`, 'text/plain');
  }
};
