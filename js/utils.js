/**
 * 牛慧慧专属一体化工作台 - 通用工具函数
 */

// 全局模块容器，必须在所有 module 脚本之前声明
// 使用 window 属性确保跨脚本绝对可访问
window.Modules = window.Modules || {};
const Modules = window.Modules;

const Utils = {
  generateId(prefix = '') {
    return prefix + Date.now().toString(36) + Math.random().toString(36).substr(2, 6);
  },

  todayStr() {
    return new Date().toISOString().split('T')[0];
  },

  dateStr(d = new Date()) {
    return d.toISOString().split('T')[0];
  },

  formatDate(date, showWeek = false) {
    const d = new Date(date);
    const weekdays = ['周日','周一','周二','周三','周四','周五','周六'];
    const s = `${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日`;
    return showWeek ? s + ' ' + weekdays[d.getDay()] : s;
  },

  formatDateTime(date) {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  },

  isToday(dateStr) {
    return this.dateStr(new Date(dateStr)) === this.todayStr();
  },

  isThisMonth(dateStr) {
    const now = new Date();
    const d = new Date(dateStr);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  },

  formatMoney(amount) {
    return '¥' + Number(amount || 0).toFixed(2);
  },

  escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, m => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    })[m]);
  },

  debounce(fn, ms = 300) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), ms);
    };
  },

  // 从数组中按日期倒序取最近 N 天
  lastNDays(n) {
    const days = [];
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      days.push(this.dateStr(d));
    }
    return days;
  },

  // 下载 JSON/文本文件
  downloadFile(content, filename, type = 'application/json') {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  // 解析 CSV
  parseCSV(text) {
    const lines = text.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    return lines.slice(1).map(line => {
      const vals = line.split(',');
      const obj = {};
      headers.forEach((h, i) => obj[h] = vals[i] ? vals[i].trim() : '');
      return obj;
    });
  },

  // 请求通知权限
  async requestNotification() {
    if (!('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied') return false;
    const p = await Notification.requestPermission();
    return p === 'granted';
  },

  // 发送浏览器通知
  notify(title, body) {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'granted') {
      new Notification(title, { body, icon: '🐮' });
    }
  },

  // 播放提示音
  playAlarm() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = 880; osc.type = 'sine';
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      osc.start(); osc.stop(ctx.currentTime + 0.5);
    } catch (e) { console.error(e); }
  },

  // 简单的 RSS 解析器（XML -> 对象数组）
  parseRSS(xmlText) {
    const parser = new DOMParser();
    const xml = parser.parseFromString(xmlText, 'text/xml');
    const items = Array.from(xml.querySelectorAll('item')).map(item => ({
      title: item.querySelector('title')?.textContent || '',
      description: item.querySelector('description')?.textContent || '',
      link: item.querySelector('link')?.textContent || '',
      pubDate: item.querySelector('pubDate')?.textContent || '',
      enclosure: item.querySelector('enclosure')?.getAttribute('url') || ''
    }));
    return items;
  },

  // 对象数组去重（基于 key）
  uniqueBy(arr, key) {
    const seen = new Set();
    return arr.filter(item => {
      const v = item[key];
      if (seen.has(v)) return false;
      seen.add(v); return true;
    });
  },

  // ============ 账单导入解析器 ============

  // 智能检测 CSV 来源平台
  detectBillSource(headers) {
    const h = headers.map(x => x.toLowerCase().replace(/[（(]\S+[)）]/g, '').trim());
    const joined = h.join(' ');

    if (joined.includes('交易时间') && joined.includes('收/支') && joined.includes('交易订单号')) return 'alipay';
    if (joined.includes('交易时间') && joined.includes('收/支') && joined.includes('交易单号') && !joined.includes('交易订单号')) return 'wechat';
    if (joined.includes('交易日期') && joined.includes('收支') && joined.includes('摘要')) return 'bank';

    // 兼容工作台自身格式
    if (joined.includes('date') && joined.includes('type') && joined.includes('amount')) return 'workstation';
    return null;
  },

  // 解析支付宝账单 CSV
  parseAlipayCSV(text) {
    const lines = text.trim().split(/\r?\n/);
    if (lines.length < 2) return [];
    const headers = this.parseCSVLine(lines[0]);
    const results = [];

    for (let i = 1; i < lines.length; i++) {
      const row = this.parseCSVLine(lines[i]);
      if (row.length < 5) continue;
      const map = {};
      headers.forEach((h, idx) => { map[h.trim().replace(/[（(]\S+[)）]/g, '').trim()] = (row[idx] || '').trim(); });

      const time = map['交易时间'] || map['交易日期'] || '';
      const date = time.split(' ')[0] || time;
      if (!date || date.length < 8) continue;

      const typeRaw = map['收/支'] || map['收支'] || '';
      const type = (typeRaw.includes('收入') || typeRaw.includes('入')) ? 'income' : 'expense';
      const amount = parseFloat((map['金额'] || '0').replace(/[¥,，\s]/g, '')) || 0;
      if (amount === 0) continue;

      const title = map['商品说明'] || map['商品'] || map['交易对方'] || map['对方'] || '支付宝账单';
      const channel = '支付宝';
      const category = this.autoCategory(title, type);
      const note = map['备注'] || '';
      const txId = map['交易订单号'] || map['商户订单号'] || '';

      results.push({
        date: date.replace(/\//g, '-'),
        type, amount, title, category, channel, note,
        source: 'alipay',
        platformTxId: txId
      });
    }
    return results;
  },

  // 解析微信账单 CSV
  parseWechatCSV(text) {
    const lines = text.trim().split(/\r?\n/);
    if (lines.length < 2) return [];

    // 微信账单开头可能有多行表头信息
    let headerIdx = 0;
    for (let i = 0; i < Math.min(lines.length, 10); i++) {
      if (lines[i].includes('交易时间') && (lines[i].includes('收/支') || lines[i].includes('收支'))) {
        headerIdx = i; break;
      }
    }

    const headers = this.parseCSVLine(lines[headerIdx]);
    const results = [];

    for (let i = headerIdx + 1; i < lines.length; i++) {
      const row = this.parseCSVLine(lines[i]);
      if (row.length < 5) continue;
      const map = {};
      headers.forEach((h, idx) => { map[h.trim().replace(/[（(]\S+[)）]/g, '').trim()] = (row[idx] || '').trim(); });

      const time = map['交易时间'] || '';
      const date = time.split(' ')[0] || time;
      if (!date || date.length < 8) continue;

      const typeRaw = map['收/支'] || map['收支'] || '';
      const type = (typeRaw.includes('收入') || typeRaw.includes('入')) ? 'income' : 'expense';
      const amount = parseFloat((map['金额'] || '0').replace(/[¥￥,，\s]/g, '')) || 0;
      if (amount === 0) continue;

      const title = map['商品'] || map['商品说明'] || map['交易对方'] || map['商户'] || '微信账单';
      const channel = '微信';
      const category = this.autoCategory(title, type);
      const note = map['备注'] || map['交易类型'] || '';
      const txId = map['交易单号'] || map['商户单号'] || '';

      results.push({
        date: date.replace(/\//g, '-'),
        type, amount, title, category, channel, note,
        source: 'wechat',
        platformTxId: txId
      });
    }
    return results;
  },

  // 解析银行账单 CSV
  parseBankCSV(text) {
    const lines = text.trim().split(/\r?\n/);
    if (lines.length < 2) return [];
    const headers = this.parseCSVLine(lines[0]);
    const results = [];

    for (let i = 1; i < lines.length; i++) {
      const row = this.parseCSVLine(lines[i]);
      if (row.length < 4) continue;
      const map = {};
      headers.forEach((h, idx) => { map[h.trim().replace(/[（(]\S+[)）]/g, '').trim()] = (row[idx] || '').trim(); });

      const date = map['交易日期'] || map['日期'] || map['记账日期'] || '';
      if (!date || date.length < 8) continue;

      const amountIn = parseFloat((map['收入金额'] || map['贷方金额'] || '0').replace(/[,，\s]/g, '')) || 0;
      const amountOut = parseFloat((map['支出金额'] || map['借方金额'] || '0').replace(/[,，\s]/g, '')) || 0;
      const amount = amountIn || amountOut;
      const type = amountIn > 0 ? 'income' : 'expense';
      if (amount === 0) continue;

      const title = map['摘要'] || map['交易摘要'] || map['对方户名'] || map['交易对方'] || '银行账单';
      const channel = '银行卡';
      const category = this.autoCategory(title, type);
      const note = map['备注'] || '';

      results.push({
        date: date.replace(/\//g, '-'),
        type, amount, title, category, channel, note,
        source: 'bank',
        platformTxId: ''
      });
    }
    return results;
  },

  // 处理 CSV 行（兼容引号内的逗号）
  parseCSVLine(line) {
    const result = [];
    let current = '', inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        result.push(current); current = '';
      } else {
        current += ch;
      }
    }
    result.push(current);
    return result;
  },

  // 智能分类
  autoCategory(title, type) {
    if (type === 'income') {
      if (/工资|薪资|奖金|报销|津贴|兼职|稿费/.test(title)) return '工资';
      if (/理财|基金|股票|收益|利息|分红/.test(title)) return '理财';
      if (/红包|转账|退款/.test(title)) return '红包';
      return '收入';
    }

    const rules = [
      ['餐饮', /餐饮|美食|外卖|饭|餐|食堂|餐厅|美团|饿了么|奶茶|咖啡|水果|零食|超市|便利店/],
      ['交通', /交通|打车|滴滴|地铁|公交|高铁|火车|机票|加油|停车|ETC|高速|充电/],
      ['购物', /购物|淘宝|京东|拼多多|天猫|唯品会|抖音|快手|小红书|服装|鞋|包|饰品|数码|电器|家居|日用品/],
      ['住房', /房租|房贷|水电|燃气|物业|维修|装修|家居/],
      ['娱乐', /娱乐|电影|KTV|游戏|旅游|景点|酒店|演出|音乐|会员|视频|音乐|阅读/],
      ['医疗', /医院|药|门诊|体检|医保|挂号/],
      ['教育', /教育|书|培训|课程|学习|考试/],
      ['通讯', /通讯|话费|流量|宽带|网络/],
      ['转账', /转账|汇款|消费/],
    ];

    for (const [cat, re] of rules) {
      if (re.test(title)) return cat;
    }
    return '其他';
  },

  // ============ Excel 账单解析器 ============

  // 从 ArrayBuffer 读取 Excel 并转为二维数组
  parseExcelToRows(arrayBuffer) {
    if (typeof XLSX === 'undefined') {
      console.error('[账单导入] XLSX 库未加载');
      return null;
    }
    try {
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) return null;
      const sheet = workbook.Sheets[sheetName];
      return XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false });
    } catch (e) {
      console.error('[账单导入] Excel 解析失败:', e);
      return null;
    }
  },

  // 从二维数组（Excel 行）中解析账单
  parseBillRows(rows, source = null) {
    if (!rows || rows.length < 2) return { source: 'unknown', items: [] };
    const headers = rows[0].map(h => String(h || '').trim());
    const hstr = headers.join(' ');
    const hlower = headers.map(h => h.toLowerCase().replace(/[（(]\S+[)）]/g, '').trim());

    // 检测或使用指定来源
    let detectedSource = source;
    if (!detectedSource || detectedSource === 'auto') {
      if (/交易时间/.test(hstr) && /收\/支/.test(hstr) && /交易订单号/.test(hstr)) detectedSource = 'alipay';
      else if (/交易时间/.test(hstr) && /收\/支/.test(hstr) && /交易单号/.test(hstr)) detectedSource = 'wechat';
      else if (/交易日期/.test(hstr) && /收支/.test(hstr) && /摘要/.test(hstr)) detectedSource = 'bank';
      else if (/date/i.test(hstr) && /type/i.test(hstr) && /amount/i.test(hstr)) detectedSource = 'workstation';
    }

    if (!detectedSource) {
      // 自动尝试各种格式
      const csvText = [headers.join(',')].concat(
        rows.slice(1).map(r => r.map(c => '"' + String(c || '').replace(/"/g, '""') + '"').join(','))
      ).join('\n');
      for (const fmt of ['alipay', 'wechat', 'bank']) {
        const items = this['parse' + fmt.charAt(0).toUpperCase() + fmt.slice(1) + 'CSV'](csvText);
        if (items.length > 0) return { source: fmt, items };
      }
      return { source: 'unknown', items: [] };
    }

    // 根据来源调用对应解析逻辑
    return this._parseRowsBySource(rows, headers, hlower, detectedSource);
  },

  // 按来源解析行数据
  _parseRowsBySource(rows, headers, hlower, source) {
    const mapRow = (row) => {
      const map = {};
      headers.forEach((h, idx) => { map[hlower[idx]] = String(row[idx] || '').trim(); });
      return map;
    };

    const results = [];

    if (source === 'alipay') {
      for (let i = 1; i < rows.length; i++) {
        const map = mapRow(rows[i]);
        const time = map['交易时间'] || map['交易日期'] || '';
        const date = time.split(' ')[0] || time;
        if (!date || date.length < 8) continue;
        const typeRaw = map['收/支'] || map['收支'] || '';
        const type = (typeRaw.includes('收入') || typeRaw.includes('入')) ? 'income' : 'expense';
        const amount = parseFloat((map['金额'] || '0').replace(/[¥,，\s]/g, '')) || 0;
        if (amount === 0) continue;
        results.push({
          date: date.replace(/\//g, '-'),
          type, amount,
          title: map['商品说明'] || map['商品'] || map['交易对方'] || map['对方'] || '支付宝账单',
          category: this.autoCategory(map['商品说明'] || map['商品'] || map['交易对方'] || '', type),
          channel: '支付宝', note: map['备注'] || '',
          source: 'alipay', platformTxId: map['交易订单号'] || map['商户订单号'] || ''
        });
      }
    } else if (source === 'wechat') {
      // 微信可能有表头行，找到真正的表头
      let startRow = 0;
      for (let i = 0; i < Math.min(rows.length, 10); i++) {
        const line = rows[i].map(c => String(c || '')).join('');
        if (line.includes('交易时间') && (line.includes('收/支') || line.includes('收支'))) {
          startRow = i; break;
        }
      }
      const wxHeaders = rows[startRow].map(h => String(h || '').trim()).map(h => h.replace(/[（(]\S+[)）]/g, '').trim());
      const wxLower = wxHeaders.map(h => h.toLowerCase());

      const wxMapRow = (row) => {
        const map = {};
        wxHeaders.forEach((h, idx) => { map[wxLower[idx]] = String(row[idx] || '').trim(); });
        return map;
      };

      for (let i = startRow + 1; i < rows.length; i++) {
        const map = wxMapRow(rows[i]);
        const time = map['交易时间'] || '';
        const date = time.split(' ')[0] || time;
        if (!date || date.length < 8) continue;
        const typeRaw = map['收/支'] || map['收支'] || '';
        const type = (typeRaw.includes('收入') || typeRaw.includes('入')) ? 'income' : 'expense';
        const amount = parseFloat((map['金额'] || '0').replace(/[¥￥,，\s]/g, '')) || 0;
        if (amount === 0) continue;
        const title = map['商品'] || map['商品说明'] || map['交易对方'] || map['商户'] || '微信账单';
        results.push({
          date: date.replace(/\//g, '-'),
          type, amount, title,
          category: this.autoCategory(title, type),
          channel: '微信', note: map['备注'] || map['交易类型'] || '',
          source: 'wechat', platformTxId: map['交易单号'] || map['商户单号'] || ''
        });
      }
    } else if (source === 'bank') {
      for (let i = 1; i < rows.length; i++) {
        const map = mapRow(rows[i]);
        const date = map['交易日期'] || map['日期'] || map['记账日期'] || '';
        if (!date || date.length < 8) continue;
        const amountIn = parseFloat((map['收入金额'] || map['贷方金额'] || '0').replace(/[,，\s]/g, '')) || 0;
        const amountOut = parseFloat((map['支出金额'] || map['借方金额'] || '0').replace(/[,，\s]/g, '')) || 0;
        const amount = amountIn || amountOut;
        const type = amountIn > 0 ? 'income' : 'expense';
        if (amount === 0) continue;
        const title = map['摘要'] || map['交易摘要'] || map['对方户名'] || map['交易对方'] || '银行账单';
        results.push({
          date: date.replace(/\//g, '-'),
          type, amount, title,
          category: this.autoCategory(title, type),
          channel: '银行卡', note: map['备注'] || '',
          source: 'bank', platformTxId: ''
        });
      }
    } else if (source === 'workstation') {
      for (let i = 1; i < rows.length; i++) {
        const map = mapRow(rows[i]);
        const date = map['date'] || '';
        if (!date) continue;
        const amount = parseFloat(map['amount'] || '0') || 0;
        if (amount === 0) continue;
        results.push({
          date, type: map['type'] || 'expense', amount,
          title: map['title'] || '导入账单',
          category: map['category'] || this.autoCategory(map['title'] || '', map['type'] || 'expense'),
          channel: map['channel'] || '', note: map['note'] || '',
          source: 'workstation', platformTxId: ''
        });
      }
    }

    return { source, items: results };
  },

  // 统一账单解析入口（支持 CSV 文本和 Excel ArrayBuffer）
  parseBillCSV(text, source = null) {
    const lines = text.trim().split(/\r?\n/);
    if (lines.length < 2) return { source: 'unknown', items: [] };

    const headers = this.parseCSVLine(lines[0]);

    // 如果明确指定了来源
    if (source === 'alipay') return { source: 'alipay', items: this.parseAlipayCSV(text) };
    if (source === 'wechat') return { source: 'wechat', items: this.parseWechatCSV(text) };
    if (source === 'bank') return { source: 'bank', items: this.parseBankCSV(text) };

    // 自动检测
    const detected = this.detectBillSource(headers);
    if (detected === 'alipay') return { source: 'alipay', items: this.parseAlipayCSV(text) };
    if (detected === 'wechat') return { source: 'wechat', items: this.parseWechatCSV(text) };
    if (detected === 'bank') return { source: 'bank', items: this.parseBankCSV(text) };
    if (detected === 'workstation') return { source: 'workstation', items: this.parseCSV(text) };

    // 尝试逐个格式解析，看哪个能产生有效结果
    for (const fmt of ['alipay', 'wechat', 'bank']) {
      const items = this['parse' + fmt.charAt(0).toUpperCase() + fmt.slice(1) + 'CSV'](text);
      if (items.length > 0) return { source: fmt, items };
    }

    return { source: 'unknown', items: [] };
  },

  // 日期差天数
  daysBetween(a, b) {
    const da = new Date(a), db = new Date(b);
    return Math.round((db - da) / (1000 * 60 * 60 * 24));
  },

  // 滚动到某个模块
  scrollToModule(name) {
    document.querySelectorAll('.module-page').forEach(p => p.classList.remove('active'));
    document.getElementById('page-' + name)?.classList.add('active');
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.querySelector(`.nav-item[data-module="${name}"]`)?.classList.add('active');
    if (window.innerWidth <= 768) {
      document.getElementById('sidebar').classList.remove('open');
      document.getElementById('navOverlay').classList.remove('active');
    }
  }
};
