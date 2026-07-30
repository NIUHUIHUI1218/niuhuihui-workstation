/**
 * 运动健身模块
 */
Modules.fitness = {
  async render() {
    const items = await DB.getAll('fitness');
    const today = Utils.todayStr();
    const todayItems = items.filter(i => i.date === today);
    const total = todayItems.length;
    const done = todayItems.filter(i => i.status === 'done').length;
    const pct = total ? Math.round(done / total * 100) : 0;

    document.getElementById('fitnessProgressFill').style.width = pct + '%';
    document.getElementById('fitnessProgressText').textContent = `${done}/${total}`;

    document.getElementById('fitnessList').innerHTML = todayItems.length === 0
      ? '<p class="empty-hint">今天还没有运动计划，添加一个吧</p>'
      : todayItems.map(i => this.renderItem(i)).join('');

    // 身体数据
    const records = await DB.getAll('bodyRecords');
    records.sort((a, b) => new Date(b.date) - new Date(a.date));
    const latest = records[0];

    // 统计
    const thisMonthDays = new Set(items.filter(i => i.status === 'done' && Utils.isThisMonth(i.date)).map(i => i.date)).size;
    const todayCals = todayItems.filter(i => i.status === 'done').reduce((s, i) => s + (i.calories || 0), 0);
    const todayMins = todayItems.filter(i => i.status === 'done').reduce((s, i) => s + (i.duration || 0), 0);

    document.getElementById('stat-weight').textContent = latest ? latest.weight + ' kg' : '-- kg';
    document.getElementById('stat-exerciseDays').textContent = thisMonthDays + '天';
    document.getElementById('stat-calories').textContent = todayCals + ' kcal';
    document.getElementById('stat-duration').textContent = todayMins + '分钟';

    const list = document.getElementById('bodyRecords');
    if (records.length === 0) {
      list.innerHTML = '<p class="empty-hint">暂无记录，开始记录吧</p>';
    } else {
      list.innerHTML = records.slice(0, 10).map(r => `
        <div class="body-record">
          <span>${r.date} ${r.weight}kg ${r.bodyFat ? '体脂' + r.bodyFat + '%' : ''}</span>
          <button class="btn btn-sm" onclick="Modules.fitness.delBodyRecord('${r.id}')">删除</button>
        </div>
      `).join('');
    }
  },

  renderItem(i) {
    return `
      <div class="task-item ${i.status === 'done' ? 'done' : ''}">
        <input type="checkbox" class="task-check" ${i.status === 'done' ? 'checked' : ''}
          onchange="Modules.fitness.toggleStatus('${i.id}', this.checked)">
        <div class="task-body">
          <div class="task-title">${Utils.escapeHtml(i.title)}</div>
          <div class="task-meta">
            ${i.duration ? `<span>⏱️ ${i.duration}分钟</span>` : ''}
            ${i.calories ? `<span>🔥 ${i.calories}kcal</span>` : ''}
            ${i.intensity ? `<span>⚡ ${i.intensity}</span>` : ''}
          </div>
        </div>
        <div class="task-actions">
          <button onclick="Modules.fitness.edit('${i.id}')">✏️</button>
          <button onclick="Modules.fitness.del('${i.id}')">🗑️</button>
        </div>
      </div>
    `;
  },

  async toggleStatus(id, checked) {
    const i = await DB.get('fitness', id);
    if (i) { i.status = checked ? 'done' : 'todo'; await DB.put('fitness', i); this.render(); Modules.overview.render(); }
  },

  async edit(id) {
    const i = await DB.get('fitness', id);
    if (i) this.showAddDialog(i);
  },

  async del(id) {
    if (!confirm('确定删除？')) return;
    await DB.delete('fitness', id); this.render(); Modules.overview.render();
  },

  showAddDialog(editItem = null) {
    UI.showCustomModal(
      editItem ? '编辑运动' : '新增运动',
      `
        <div class="form-group"><label>运动项目</label><input id="fit-title" value="${editItem ? Utils.escapeHtml(editItem.title) : ''}"></div>
        <div class="form-group"><label>时长（分钟）</label><input type="number" id="fit-duration" value="${editItem?.duration || ''}"></div>
        <div class="form-group"><label>消耗卡路里（kcal）</label><input type="number" id="fit-calories" value="${editItem?.calories || ''}"></div>
        <div class="form-group">
          <label>强度</label>
          <select id="fit-intensity">
            <option value="">请选择</option>
            <option value="低强度" ${editItem?.intensity === '低强度' ? 'selected' : ''}>低强度</option>
            <option value="中强度" ${editItem?.intensity === '中强度' ? 'selected' : ''}>中强度</option>
            <option value="高强度" ${editItem?.intensity === '高强度' ? 'selected' : ''}>高强度</option>
          </select>
        </div>
        <div class="form-group">
          <label>状态</label>
          <select id="fit-status">
            <option value="todo" ${editItem?.status !== 'done' ? 'selected' : ''}>待完成</option>
            <option value="done" ${editItem?.status === 'done' ? 'selected' : ''}>已完成</option>
          </select>
        </div>
      `,
      `<div class="modal-actions">
        <button class="btn btn-outline" onclick="UI.closeModal()">取消</button>
        <button class="btn btn-primary" onclick="Modules.fitness.save('${editItem?.id || ''}')">保存</button>
      </div>`
    );
  },

  async save(id) {
    const title = document.getElementById('fit-title').value.trim();
    if (!title) { UI.toast('请输入运动项目'); return; }
    const item = id ? await DB.get('fitness', id) : {};
    item.title = title;
    item.duration = parseInt(document.getElementById('fit-duration').value) || 0;
    item.calories = parseInt(document.getElementById('fit-calories').value) || 0;
    item.intensity = document.getElementById('fit-intensity').value;
    item.status = document.getElementById('fit-status').value;
    item.date = Utils.todayStr();
    await DB.put('fitness', item);
    UI.closeModal(); UI.toast('保存成功', 'success');
    this.render(); Modules.overview.render();
  },

  async archiveCompleted() {
    const items = await DB.getAll('fitness');
    for (const i of items) {
      if (i.status === 'done') { i.archived = true; await DB.put('fitness', i); }
    }
    UI.toast('已完成运动已归档'); this.render();
  },

  showBodyRecordDialog(editItem = null) {
    UI.showCustomModal(
      editItem ? '编辑身体数据' : '记录身体数据',
      `
        <div class="form-group"><label>日期</label><input type="date" id="body-date" value="${editItem?.date || Utils.todayStr()}"></div>
        <div class="form-group"><label>体重（kg）</label><input type="number" step="0.1" id="body-weight" value="${editItem?.weight || ''}"></div>
        <div class="form-group"><label>体脂率（%）</label><input type="number" step="0.1" id="body-fat" value="${editItem?.bodyFat || ''}"></div>
        <div class="form-group"><label>备注</label><textarea id="body-note">${editItem?.note || ''}</textarea></div>
      `,
      `<div class="modal-actions">
        <button class="btn btn-outline" onclick="UI.closeModal()">取消</button>
        <button class="btn btn-primary" onclick="Modules.fitness.saveBodyRecord('${editItem?.id || ''}')">保存</button>
      </div>`
    );
  },

  async saveBodyRecord(id) {
    const item = id ? await DB.get('bodyRecords', id) : {};
    item.date = document.getElementById('body-date').value || Utils.todayStr();
    item.weight = parseFloat(document.getElementById('body-weight').value) || 0;
    item.bodyFat = parseFloat(document.getElementById('body-fat').value) || 0;
    item.note = document.getElementById('body-note').value;
    await DB.put('bodyRecords', item);
    UI.closeModal(); UI.toast('记录成功', 'success'); this.render();
  },

  async delBodyRecord(id) {
    if (!confirm('确定删除该记录？')) return;
    await DB.delete('bodyRecords', id); this.render();
  }
};
