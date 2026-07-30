/**
 * 模块5：读书笔记（左右布局：左书单/右笔记）
 */
Modules.reading = {
  currentImages: [],
  selectedBook: null,  // 当前选中的书名

  async init() {
    this.refreshBooks();
  },

  async render() {
    await this.refreshBooks();
    if (this.selectedBook) this.renderNotes();
  },

  // 刷新左侧书单
  async refreshBooks() {
    const all = await DB.getAll('readingNotes');
    const books = [...new Set(all.filter(r => r.bookName).map(r => r.bookName))];
    books.sort();
    const el = document.getElementById('readingBookList');
    if (books.length === 0) {
      el.innerHTML = '<p class="empty-hint">暂无书单</p>';
    } else {
      el.innerHTML = books.map(b => `
        <div class="reading-book-item ${this.selectedBook === b ? 'active' : ''}" onclick="Modules.reading.selectBook('${Utils.escapeHtml(b).replace(/'/g, "\\'")}')">
          <span class="book-icon">📖</span>
          <span class="book-name">${Utils.escapeHtml(b)}</span>
          <span class="book-count">${all.filter(r => r.bookName === b).length}条</span>
        </div>
      `).join('');
    }
  },

  // 选中一本书
  selectBook(bookName) {
    this.selectedBook = bookName;
    document.getElementById('readingSearch').value = '';
    document.getElementById('readingNoteBookTitle').textContent = '📝 ' + bookName;
    this.refreshBooks();
    this.renderNotes();
  },

  // 渲染右侧笔记列表
  async renderNotes() {
    if (!this.selectedBook) return;
    const all = await DB.getAll('readingNotes');
    const kw = (document.getElementById('readingSearch').value || '').trim().toLowerCase();
    let list = all.filter(r => r.bookName === this.selectedBook);
    if (kw) list = list.filter(r => (r.title + r.content).toLowerCase().includes(kw));
    list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    const el = document.getElementById('readingNotesList');
    if (list.length === 0) {
      el.innerHTML = '<p class="empty-hint">暂无笔记，点击上方"新增笔记"开始记录</p>';
    } else {
      el.innerHTML = list.map(r => this.renderNoteCard(r)).join('');
    }
  },

  // 渲染一条笔记（仅显示一行摘要）
  renderNoteCard(r) {
    const preview = (r.content || '').substring(0, 80) + (r.content?.length > 80 ? '...' : '');
    return `
      <div class="reading-note-item" onclick="Modules.reading.viewNote('${r.id}')">
        <div class="rni-header">
          <span class="rni-title">${Utils.escapeHtml(r.title || '无标题')}</span>
          <span class="rni-date">${Utils.formatDateTime(r.createdAt)}</span>
        </div>
        <div class="rni-preview">${Utils.escapeHtml(preview)}</div>
        ${r.images?.length ? `<div class="rni-images">${r.images.slice(0, 3).map(img => `<img src="${img}" alt="图片">`).join('')}${r.images.length > 3 ? `<span>+${r.images.length - 3}</span>` : ''}</div>` : ''}
        <div class="rni-tags">${(r.tags || []).map(t => `<span class="rc-tag">${Utils.escapeHtml(t)}</span>`).join('')}</div>
        <div class="rni-actions" onclick="event.stopPropagation()">
          <button class="btn btn-sm btn-outline" onclick="Modules.reading.edit('${r.id}')">✏️ 编辑</button>
          <button class="btn btn-sm btn-danger-outline" onclick="Modules.reading.del('${r.id}')">🗑️ 删除</button>
        </div>
      </div>
    `;
  },

  // 查看笔记详情
  async viewNote(id) {
    const r = await DB.get('readingNotes', id);
    if (!r) return;
    UI.showCustomModal(
      '📝 ' + Utils.escapeHtml(r.title || '读书笔记'),
      `
        <div style="margin-bottom:8px;color:var(--cyan);font-weight:600">📖 ${Utils.escapeHtml(r.bookName || '')}</div>
        <div style="margin-bottom:12px;font-size:13px;color:var(--text-muted)">${Utils.formatDateTime(r.createdAt)}</div>
        <div style="line-height:1.7;white-space:pre-wrap;margin-bottom:12px">${Utils.escapeHtml(r.content || '')}</div>
        ${r.tags?.length ? `<div style="margin-bottom:8px">${r.tags.map(t => `<span class="rc-tag">${Utils.escapeHtml(t)}</span>`).join('')}</div>` : ''}
        ${r.images?.length ? `<div style="display:flex;gap:8px;flex-wrap:wrap">${r.images.map(img => `<img src="${img}" style="max-width:200px;border-radius:8px">`).join('')}</div>` : ''}
      `,
      `<div class="modal-actions">
        <button class="btn btn-outline" onclick="UI.closeModal()">关闭</button>
        <button class="btn btn-outline" onclick="UI.closeModal();Modules.reading.edit('${id}')">✏️ 编辑</button>
        <button class="btn btn-outline" onclick="UI.closeModal();Modules.reading.exportOne('${id}','md')">📄 导出MD</button>
      </div>`
    );
  },

  // 新增/编辑笔记弹窗
  showAddDialog(editItem = null) {
    this.currentImages = editItem?.images ? [...editItem.images] : [];
    const defaultBook = editItem?.bookName || this.selectedBook || '';
    UI.showCustomModal(
      editItem ? '编辑笔记' : '新增读书笔记',
      `
        <div class="form-group"><label>书名</label><input id="read-book" value="${editItem ? Utils.escapeHtml(editItem.bookName || '') : Utils.escapeHtml(defaultBook)}" placeholder="必填"></div>
        <div class="form-group"><label>笔记标题</label><input id="read-title" value="${editItem ? Utils.escapeHtml(editItem.title || '') : ''}" placeholder="可选"></div>
        <div class="form-group"><label>正文内容</label><textarea id="read-content" rows="6" placeholder="在这里输入你的读书笔记...">${editItem ? Utils.escapeHtml(editItem.content || '') : ''}</textarea></div>
        <div class="form-group">
          <label>分类标签（可多选）</label>
          <select id="read-tags" multiple size="3" style="min-height:80px;width:100%">
            <option value="摘抄金句" ${editItem?.tags?.includes('摘抄金句') ? 'selected' : ''}>摘抄金句</option>
            <option value="读后感悟" ${editItem?.tags?.includes('读后感悟') ? 'selected' : ''}>读后感悟</option>
            <option value="章节备注" ${editItem?.tags?.includes('章节备注') ? 'selected' : ''}>章节备注</option>
            <option value="行动清单" ${editItem?.tags?.includes('行动清单') ? 'selected' : ''}>行动清单</option>
          </select>
          <input id="read-custom-tags" placeholder="自定义标签，用逗号分隔" value="${editItem?.tags?.filter(t => !['摘抄金句','读后感悟','章节备注','行动清单'].includes(t)).join(',') || ''}" style="margin-top:6px">
        </div>
        <div class="form-group">
          <label>图片</label>
          <input type="file" id="read-images" multiple accept="image/*" onchange="Modules.reading.handleImages(this)">
          <div id="read-image-preview" style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap">${this.currentImages.map(img => `<img src="${img}" style="width:60px;height:60px;object-fit:cover;border-radius:6px">`).join('')}</div>
        </div>
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

  removeImage(img) {
    this.currentImages = this.currentImages.filter(i => i !== img);
    document.getElementById('read-image-preview').innerHTML = this.currentImages.map(img =>
      `<div style="position:relative"><img src="${img}" style="width:60px;height:60px;object-fit:cover;border-radius:6px"><button onclick="Modules.reading.removeImage('${img}')" style="position:absolute;top:-4px;right:-4px;background:#D4786E;color:#fff;border:none;border-radius:50%;width:18px;height:18px;font-size:10px;cursor:pointer">×</button></div>`
    ).join('');
  },

  async save(id) {
    const bookName = document.getElementById('read-book').value.trim();
    const title = document.getElementById('read-title').value.trim();
    const content = document.getElementById('read-content').value.trim();
    if (!bookName) { UI.toast('请输入书名'); return; }
    if (!content && this.currentImages.length === 0) { UI.toast('请输入内容或上传图片'); return; }

    const tags = Array.from(document.getElementById('read-tags').selectedOptions).map(o => o.value);
    const custom = document.getElementById('read-custom-tags').value.split(',').map(t => t.trim()).filter(Boolean);
    tags.push(...custom);

    const item = id ? await DB.get('readingNotes', id) : {};
    item.bookName = bookName;
    item.title = title;
    item.content = content;
    item.tags = tags;
    item.images = this.currentImages;
    item.createdAt = item.createdAt || Date.now();

    await DB.put('readingNotes', item);
    UI.closeModal(); UI.toast('笔记已保存', 'success');

    if (!this.selectedBook) this.selectedBook = bookName;
    this.render(); Modules.overview.render();
  },

  async edit(id) {
    const r = await DB.get('readingNotes', id);
    if (r) await this.showAddDialog(r);
  },

  async del(id) {
    if (!confirm('确定删除该笔记？')) return;
    await DB.delete('readingNotes', id);
    this.render(); Modules.overview.render();
  },

  // 新建书单
  showNewBook() {
    UI.showCustomModal(
      '📖 新建书单',
      `
        <div class="form-group"><label>书名</label><input id="booklist-name" placeholder="输入书籍名称"></div>
        <div class="form-group"><label>作者</label><input id="booklist-author" placeholder="可选"></div>
        <div class="form-group"><label>状态</label>
          <select id="booklist-status"><option value="想读">想读</option><option value="在读">在读</option><option value="已读">已读</option></select>
        </div>
      `,
      `<div class="modal-actions">
        <button class="btn btn-outline" onclick="UI.closeModal()">取消</button>
        <button class="btn btn-primary" onclick="Modules.reading.saveBook()">创建书单</button>
      </div>`
    );
  },

  async saveBook() {
    const name = document.getElementById('booklist-name').value.trim();
    if (!name) { UI.toast('请输入书名'); return; }
    // 检查是否已有此书
    const all = await DB.getAll('readingNotes');
    if (all.some(r => r.bookName === name && r.tags?.includes('书籍名称'))) {
      UI.toast('该书单已存在', 'warning'); return;
    }
    await DB.put('readingNotes', {
      bookName: name,
      title: '书单：' + name,
      content: `作者：${document.getElementById('booklist-author').value || '未知'}\n状态：${document.getElementById('booklist-status').value}`,
      tags: ['书籍名称'],
      createdAt: Date.now()
    });
    UI.closeModal(); UI.toast('书单已创建', 'success');
    this.selectedBook = name;
    this.render();
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
  }
};
