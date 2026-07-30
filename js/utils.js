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

  // 标准字段 → 可能的表头别名（支持微信/支付宝/银行/自定义格式）
  BILL_FIELD_ALIASES: {
    date: ['交易时间','交易日期','交易创建时间','付款时间','最近修改时间','date','时间','记账日期','日期','transaction date','transaction time','created time','支付时间','账单时间','消费日期','购货日期','订单日期','成交日期'],
    type: ['收/支','收支','类型','type','收入/支出','收付','transaction type','income/expense','资金流向','资金状态','收付款状态','支出/收入','收入/支出','收支类型','类型type'],
    amount: ['金额','金额（元）','金额(元)','金额（人民币）','金额(人民币)','交易金额','amount','money','price','amount(元)','总额','实付金额','金额元','价钱','费用','value','数值','合计','小计','金额（含优惠）','实付','支付金额','消费金额','订单金额'],
    amountIn: ['收入金额','收入','贷方金额','贷方','入账金额','来账金额','income','收入额','收入（元）'],
    amountOut: ['支出金额','支出','借方金额','借方','出账金额','去账金额','expense','支出额','支出（元）','消费'],
    title: ['商品说明','商品名称','商品','交易对方','对方','商户','摘要','交易摘要','对方户名','title','description','merchant','counterparty','交易备注','商品/服务','对方账号','名称','项目','用途','消费项目','购买内容','商品描述','交易内容','事由'],
    channel: ['支付方式','支付渠道','channel','payment method','payment','支付工具','账户','收/付款方式','支付途径','付款方式'],
    note: ['备注','交易类型','note','memo','附言','用途','说明','备注信息','备注说明'],
    txId: ['交易订单号','交易单号','交易号','商户订单号','商户单号','transaction id','order id','流水号','交易流水号','订单号','订单编号','编号']
  },

  // 标准化表头：去空格、去括号内文字、去货币符号、统一连接符、小写
  normalizeBillHeader(h) {
    return String(h || '').trim()
      .replace(/[（(].*?[)）]/g, '')
      .replace(/[￥¥$€£]/g, '')
      .replace(/[\s/_\-]+/g, '')
      .toLowerCase();
  },

  // 为表头建立标准字段映射
  buildBillFieldMap(headers) {
    const map = {}; // 标准字段名 -> 列索引
    const aliases = this.BILL_FIELD_ALIASES;
    const normalizedHeaders = headers.map(h => this.normalizeBillHeader(h));

    for (const [field, names] of Object.entries(aliases)) {
      if (map[field] !== undefined) continue;
      for (const name of names) {
        const normName = this.normalizeBillHeader(name);
        if (!normName) continue;
        // 1. 完全匹配
        let idx = normalizedHeaders.indexOf(normName);
        if (idx >= 0) { map[field] = idx; break; }
        // 2. 包含匹配（如 "金额" 能匹配 "金额元"）
        idx = normalizedHeaders.findIndex(h => h && (h.includes(normName) || normName.includes(h)));
        if (idx >= 0) { map[field] = idx; break; }
      }
    }
    return { map, normalizedHeaders };
  },

  // 判断一行是否是账单表头（宽松匹配：有日期+金额相关列即可）
  isBillHeaderRow(row) {
    if (!row || row.length < 2) return false;
    const headers = row.map(c => String(c || '').trim());
    const { map } = this.buildBillFieldMap(headers);
    const hasDate = map.date !== undefined;
    const hasMoney = map.amount !== undefined || map.amountIn !== undefined || map.amountOut !== undefined;
    return hasDate && hasMoney;
  },

  // 智能解析日期为 yyyy-mm-dd
  parseBillDate(value) {
    if (!value) return '';
    const s = String(value).trim();
    // 1. 2024-01-01 / 2024/01/01 / 2024.01.01 / 2024年01月01日
    let m = s.match(/(\d{4})[-/.年](\d{1,2})[-/.月](\d{1,2})/);
    if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
    // 2. 2024-01-01 12:34:56
    m = s.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (m) return `${m[1]}-${m[2]}-${m[3]}`;
    // 3. 20240101
    m = s.match(/(\d{4})(\d{2})(\d{2})/);
    if (m) return `${m[1]}-${m[2]}-${m[3]}`;
    // 4. Excel 序列号日期（数字）
    if (/^\d+(\.\d+)?$/.test(s) && parseFloat(s) > 30000 && parseFloat(s) < 60000) {
      const excelEpoch = new Date(Date.UTC(1899, 11, 30));
      const d = new Date(excelEpoch.getTime() + parseFloat(s) * 86400000);
      if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
    }
    // 5. 尝试通用解析
    const d = new Date(s);
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
    return '';
  },

  // 智能解析金额（返回绝对值）
  parseBillAmount(value) {
    if (!value && value !== 0) return 0;
    const s = String(value).trim();
    // 匹配数字，包括括号表示负数
    const m = s.match(/\(?([0-9,，.]+)\)?/);
    if (!m) return 0;
    let num = m[1].replace(/[,，]/g, '');
    if (s.includes('(') || s.includes(')')) num = '-' + num;
    if (s.startsWith('-')) num = '-' + Math.abs(parseFloat(num));
    const v = parseFloat(num) || 0;
    return Math.abs(v);
  },

  // 智能解析类型
  parseBillType(value, amountIn, amountOut) {
    // 优先根据独立收入/支出列判断
    if (amountIn > 0) return 'income';
    if (amountOut > 0) return 'expense';
    if (!value) return 'expense';
    const s = String(value).trim();
    if (/收入|转入|退款|红包|收款|入账|来账|贷方|\+/.test(s)) return 'income';
    if (/支出|转出|消费|付款|转账|取现|去账|借方|-/.test(s)) return 'expense';
    return 'expense';
  },

  // 根据表头和内容检测数据来源
  detectBillSource(headers, rows) {
    const hstr = headers.join(' ');
    if (/支付宝|alipay|交易订单号|资金状态/.test(hstr)) return 'alipay';
    if (/微信|wechat|微信支付|商户单号|当前状态/.test(hstr)) return 'wechat';
    if (/摘要|借方|贷方|对方户名/.test(hstr)) return 'bank';
    // 从数据内容推断
    for (let i = 1; i < Math.min(rows.length, 30); i++) {
      const line = rows[i].map(c => String(c || '')).join(' ');
      if (/支付宝/.test(line)) return 'alipay';
      if (/微信支付|微信红包/.test(line)) return 'wechat';
    }
    return 'unknown';
  },

  // 极简表格解析：支持 2-4 列的自定义记账表（日期/标题/金额[/类型]）
  parseSimpleBillRows(rows) {
    const results = [];
    // 先找第一个非空行作为表头，或直接用第一行
    let startIdx = 0;
    for (let i = 0; i < Math.min(rows.length, 5); i++) {
      if (rows[i] && rows[i].some(c => String(c || '').trim())) { startIdx = i; break; }
    }
    const headerRow = rows[startIdx];
    const colCount = headerRow ? headerRow.length : 0;
    if (colCount < 2 || colCount > 6) return { source: 'simple', items: [] };

    // 推断列角色：先试第0列日期、最后一列金额
    const dateIdx = 0;
    const amountIdx = colCount - 1;
    const titleIdx = colCount >= 3 ? 1 : -1;
    const typeIdx = colCount >= 4 ? 2 : -1;

    let parsedCount = 0;
    for (let i = startIdx + 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length < Math.min(colCount, 2)) continue;
      if (row.every(c => c === '' || c === null || c === undefined)) continue;

      const date = this.parseBillDate(row[dateIdx]);
      if (!date) continue;

      const amountVal = row[amountIdx];
      let amount = this.parseBillAmount(amountVal);
      // 极简表格支持正负号：负数表示支出，正数表示收入
      const rawStr = String(amountVal || '');
      if (amount === 0) continue;
      if (rawStr.startsWith('-') || rawStr.includes('(')) {
        // 已经是按绝对值解析，这里不需要额外处理
      }

      let type = 'expense';
      if (typeIdx >= 0) {
        type = this.parseBillType(row[typeIdx], 0, 0);
      } else {
        type = rawStr.startsWith('-') || rawStr.includes('(') ? 'expense' : 'income';
        // 如果没有类型列且金额为正，默认支出（除非明确是收入关键词）
        if (type === 'income' && !/(收入|退款|收款|红包|转入|工资|奖金)/.test(rawStr)) {
          type = 'expense';
        }
      }

      const title = titleIdx >= 0 ? String(row[titleIdx] || '').trim() : (type === 'income' ? '收入' : '支出');
      if (!title) continue;

      results.push({
        date, type, amount,
        title,
        category: this.autoCategory(title, type),
        purpose: this.detectPurpose(title, '', '导入'),
        channel: '导入',
        note: '',
        source: 'simple',
        platformTxId: ''
      });
      parsedCount++;
    }

    if (parsedCount > 0) {
      console.log('[账单导入] 极简表格解析成功:', { count: parsedCount, colCount });
    }
    return { source: 'simple', items: results };
  },

  // 检测字符串是否包含乱码（替换字符或连续问号）
  hasGarbledText(str) {
    if (!str) return false;
    const s = String(str);
    if (/\uFFFD/.test(s)) return true; // Unicode 替换字符
    if (/\?{3,}/.test(s)) return true; // 连续3个以上问号
    return false;
  },

  // 基于内容模式解析（不依赖表头文字，适用于乱码/特殊编码文件）
  parsePatternBasedRows(rows) {
    const results = [];
    if (!rows || rows.length < 2) return { source: 'pattern', items: [] };

    // 扫描所有行，统计哪些列最常见日期格式和金额格式
    const dateColCounts = {};
    const amountColCounts = {};
    const sampleRows = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length < 2) continue;
      let rowHasDate = false;
      let rowHasAmount = false;
      let dateCol = -1;
      let amountCol = -1;

      for (let c = 0; c < row.length; c++) {
        const val = String(row[c] || '').trim();
        if (!val) continue;
        if (this.parseBillDate(val)) {
          rowHasDate = true; dateCol = c;
          dateColCounts[c] = (dateColCounts[c] || 0) + 1;
        }
        if (this.parseBillAmount(val) > 0 && !this.parseBillDate(val)) {
          // 避免同一单元格既是日期又是金额被重复计数
          rowHasAmount = true; amountCol = c;
          amountColCounts[c] = (amountColCounts[c] || 0) + 1;
        }
      }

      if (rowHasDate && rowHasAmount && dateCol !== amountCol) {
        sampleRows.push({ idx: i, dateCol, amountCol, row });
      }
    }

    if (sampleRows.length < 1) return { source: 'pattern', items: [] };

    // 找出最常见的日期列和金额列
    const dateIdx = Object.entries(dateColCounts).sort((a, b) => b[1] - a[1])[0][0];
    const amountIdx = Object.entries(amountColCounts).sort((a, b) => b[1] - a[1])[0][0];
    const dateColNum = parseInt(dateIdx, 10);
    const amountColNum = parseInt(amountIdx, 10);

    // 标题列：找同时包含日期和金额的数据行中，除日期/金额列外最长的文本列
    const textColScores = {};
    for (const s of sampleRows.slice(0, 30)) {
      for (let c = 0; c < s.row.length; c++) {
        if (c === dateColNum || c === amountColNum) continue;
        const val = String(s.row[c] || '').trim();
        if (val.length > 2 && !this.parseBillDate(val) && this.parseBillAmount(val) === 0) {
          textColScores[c] = (textColScores[c] || 0) + val.length;
        }
      }
    }
    const titleColNum = Object.entries(textColScores).sort((a, b) => b[1] - a[1])[0]?.[0];

    console.log('[账单导入] 模式解析推断列:', { dateColNum, amountColNum, titleColNum, sampleCount: sampleRows.length });

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length <= Math.max(dateColNum, amountColNum)) continue;
      const dateVal = row[dateColNum];
      const amountVal = row[amountColNum];
      const date = this.parseBillDate(dateVal);
      const amount = this.parseBillAmount(amountVal);
      if (!date || amount === 0) continue;

      // 跳过表头行本身（表头通常解析不出日期）
      if (this.parseBillDate(dateVal) && this.parseBillAmount(amountVal) > 0) {
        const rawStr = String(amountVal || '');
        let type = rawStr.startsWith('-') || rawStr.includes('(') ? 'expense' : 'income';
        if (type === 'income' && !/(收入|退款|收款|红包|转入|工资|奖金)/.test(rawStr)) type = 'expense';

        const title = titleColNum !== undefined ? String(row[titleColNum] || '').trim() : (type === 'income' ? '收入' : '支出');
        if (!title) continue;

        results.push({
          date, type, amount, title,
          category: this.autoCategory(title, type),
          purpose: this.detectPurpose(title, '', '导入'),
          channel: '导入', note: '',
          source: 'pattern', platformTxId: ''
        });
      }
    }

    return { source: 'pattern', items: results };
  },

  // 从二维数组解析账单（统一入口）
  parseBillRows(rows, source = null) {
    console.log('[账单导入] 开始解析，总行数:', rows ? rows.length : 0);
    if (!rows || rows.length < 2) {
      return { source: 'unknown', items: [], debug: { reason: '数据行数不足', rows: rows ? rows.length : 0 } };
    }

    // 检测乱码
    let garbledCount = 0;
    for (let i = 0; i < Math.min(rows.length, 10); i++) {
      const row = rows[i];
      if (!row) continue;
      for (const c of row) {
        if (this.hasGarbledText(c)) { garbledCount++; break; }
      }
    }
    const hasGarbled = garbledCount >= 2;
    if (hasGarbled) {
      console.warn('[账单导入] 检测到文件存在乱码，将尝试基于内容模式解析');
    }

    // 1. 定位真正的表头行（兼容微信/支付宝/银行前导说明）
    let headerIdx = -1;
    for (let i = 0; i < Math.min(rows.length, 50); i++) {
      if (this.isBillHeaderRow(rows[i])) { headerIdx = i; break; }
    }
    if (headerIdx === -1) {
      // 输出更易读的前10行日志
      const preview = rows.slice(0, 10).map((r, idx) =>
        `  行${idx}: [${r.map(c => JSON.stringify(String(c || ''))).join(', ')}]`
      ).join('\n');
      console.warn('[账单导入] 未找到表头行，前10行内容:\n' + preview);

      // Fallback：尝试把第一个长度>=2的非空行当作表头
      for (let i = 0; i < Math.min(rows.length, 50); i++) {
        const row = rows[i];
        if (row && row.length >= 2 && row.some(c => String(c || '').trim())) {
          const headers = row.map(c => String(c || '').trim());
          const { map } = this.buildBillFieldMap(headers);
          if (map.date !== undefined && (map.amount !== undefined || map.amountIn !== undefined || map.amountOut !== undefined)) {
            headerIdx = i;
            console.log('[账单导入] Fallback 找到表头行:', i, headers);
            break;
          }
        }
      }

      if (headerIdx === -1) {
        // 尝试：极简表格（2-6列：日期/标题/金额[/类型]）
        const simple = this.parseSimpleBillRows(rows);
        if (simple.items.length > 0) return simple;

        // 最后尝试：基于日期+金额模式的列推断（乱码文件救命方案）
        const pattern = this.parsePatternBasedRows(rows);
        if (pattern.items.length > 0) return pattern;

        return { source: 'unknown', items: [], debug: { reason: '未找到表头行', hasGarbled, preview: rows.slice(0, 10) } };
      }
    }

    const headers = rows[headerIdx].map(h => String(h || '').trim());
    const { map: fieldMap, normalizedHeaders } = this.buildBillFieldMap(headers);

    console.log('[账单导入] 表头定位成功:', { headerIdx, headers, fieldMap, normalizedHeaders });

    if (fieldMap.date === undefined) {
      console.warn('[账单导入] 表头缺少日期字段');
      return { source: 'unknown', items: [], debug: { reason: '缺少日期字段', headers, normalizedHeaders } };
    }

    // 2. 检测数据来源
    const detectedSource = (source && source !== 'auto') ? source : this.detectBillSource(headers, rows);
    console.log('[账单导入] 检测到来源:', detectedSource);

    // 3. 逐行解析
    const results = [];
    for (let i = headerIdx + 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0) continue;
      if (row.every(c => c === '' || c === null || c === undefined)) continue;

      const get = (field) => fieldMap[field] !== undefined ? row[fieldMap[field]] : undefined;

      const date = this.parseBillDate(get('date'));
      if (!date) continue;

      let amount = 0;
      let amountIn = 0;
      let amountOut = 0;

      // 独立的收入/支出列：要求两列都存在且指向不同列
      const hasSeparateInOut = fieldMap.amountIn !== undefined && fieldMap.amountOut !== undefined
        && fieldMap.amountIn !== fieldMap.amountOut;

      if (hasSeparateInOut) {
        amountIn = this.parseBillAmount(get('amountIn'));
        amountOut = this.parseBillAmount(get('amountOut'));
        amount = amountIn || amountOut;
      } else if (fieldMap.amount !== undefined) {
        amount = this.parseBillAmount(get('amount'));
      }

      if (amount === 0) continue;

      const type = hasSeparateInOut
        ? (amountIn > 0 ? 'income' : 'expense')
        : this.parseBillType(get('type'), amountIn, amountOut);

      const titleRaw = get('title') || get('note') || '';
      const title = String(titleRaw).trim() || (detectedSource === 'alipay' ? '支付宝账单' : detectedSource === 'wechat' ? '微信账单' : '导入账单');

      results.push({
        date,
        type,
        amount,
        title,
        category: this.autoCategory(title, type),
        purpose: this.detectPurpose(title, String(get('note') || ''), String(get('channel') || detectedSource)),
        channel: String(get('channel') || (detectedSource === 'alipay' ? '支付宝' : detectedSource === 'wechat' ? '微信' : '银行卡')).trim(),
        note: String(get('note') || '').trim(),
        source: detectedSource,
        platformTxId: String(get('txId') || '').trim()
      });
    }

    console.log('[账单导入] 解析完成:', { source: detectedSource, count: results.length, debug: { headers, fieldMap, totalRows: rows.length - headerIdx - 1 } });
    return { source: detectedSource, items: results, debug: { headers, fieldMap, totalRows: rows.length - headerIdx - 1 } };
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

  // CSV 文本转二维数组
  csvToRows(text) {
    const lines = text.trim().split(/\r?\n/);
    return lines.map(line => this.parseCSVLine(line));
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

  // 智能检测用途（从标题和备注中推断）
  detectPurpose(title, note, channel) {
    const text = (title + ' ' + (note || '')).toLowerCase();
    const purposes = [
      { keywords: /外卖|美团|饿了么|点餐|取餐/, purpose: '外卖点餐' },
      { keywords: /买菜|蔬菜|水果|生鲜|超市|便利店|日杂/, purpose: '日用品采购' },
      { keywords: /地铁|公交|打车|滴滴|高铁|火车|机票|飞机|加油|停车/, purpose: '交通出行' },
      { keywords: /房租|房贷|物业|水电|燃气|暖气/, purpose: '住房费用' },
      { keywords: /淘宝|京东|拼多多|天猫|抖音|快手|小红书|购物/, purpose: '线上购物' },
      { keywords: /服装|鞋|包|衣服|裤子|裙子|化妆品|护肤品/, purpose: '服饰美妆' },
      { keywords: /医院|药|门诊|体检|医保/, purpose: '医疗健康' },
      { keywords: /外卖|餐厅|饭店|食堂|吃饭|午餐|晚餐|早餐|小吃/, purpose: '餐饮' },
      { keywords: /奶茶|咖啡|茶饮|星巴克|瑞幸|喜茶/, purpose: '饮品甜点' },
      { keywords: /电影|KTV|演出|演唱会|游戏|旅游|景点|酒店/, purpose: '休闲娱乐' },
      { keywords: /书|课程|培训|学习|考试|报名/, purpose: '学习提升' },
      { keywords: /话费|宽带|流量|网络|套餐/, purpose: '通讯网络' },
      { keywords: /理财|基金|股票|保险|黄金/, purpose: '投资理财' },
      { keywords: /转账|汇款|红包/, purpose: '转账红包' },
      { keywords: /数码|手机|电脑|耳机|平板|电器/, purpose: '数码电器' },
      { keywords: /宠物|猫|狗|猫粮|狗粮/, purpose: '宠物' },
      { keywords: /运动|健身|瑜伽|游泳/, purpose: '运动健身' },
      { keywords: /理发|美容|美甲|spa|按摩/, purpose: '美容美发' },
    ];
    for (const { keywords, purpose } of purposes) {
      if (keywords.test(text)) return purpose;
    }
    return '日常消费';
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

  // 统一账单解析入口（支持 CSV 文本）
  parseBillCSV(text, source = null) {
    const rows = this.csvToRows(text);
    return this.parseBillRows(rows, source);
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
  },

  // ============ AI 助手（支持 OpenAI 兼容 API） ============
  // 从 settings 获取 AI 配置
  async getAIConfig() {
    return {
      enabled: await DB.getSettings('aiEnabled', false),
      apiKey: await DB.getSettings('aiApiKey', ''),
      apiUrl: await DB.getSettings('aiApiUrl', 'https://api.deepseek.com/v1/chat/completions'),
      model: await DB.getSettings('aiModel', 'deepseek-chat')
    };
  },

  // 调用 AI 接口
  async callAI(messages, options = {}) {
    const config = await this.getAIConfig();
    if (!config.enabled || !config.apiKey) {
      throw new Error('AI未配置，请在设置中配置API Key');
    }
    try {
      const res = await fetch(config.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + config.apiKey
        },
        body: JSON.stringify({
          model: config.model,
          messages,
          temperature: options.temperature || 0.7,
          max_tokens: options.maxTokens || 2000
        })
      });
      if (!res.ok) {
        const err = await res.text();
        throw new Error('AI调用失败: ' + res.status + ' ' + err.substring(0, 100));
      }
      const data = await res.json();
      return data.choices?.[0]?.message?.content || '';
    } catch (e) {
      console.error('[AI] 调用失败:', e);
      throw e;
    }
  },

  // AI 分析图片内容并生成总结和方法论
  async aiAnalyzeMedia(type, content, imageBase64 = null) {
    let prompt = '';
    if (type === 'image' && imageBase64) {
      prompt = `请分析这张图片的内容，然后：
1. 用简洁的语言（1-2句话）总结图片中的核心内容或主题
2. 从内容中提炼出1-2个可复用的思维模型或方法论（每个用一句话概括）
请用以下JSON格式回复：
{
  "summary": "图片内容总结",
  "methods": ["方法论1", "方法论2"]
}`;
      const messages = [
        { role: 'user', content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: imageBase64 } }
        ]}
      ];
      return await this.callAI(messages, { maxTokens: 1000 });
    } else if (type === 'video' && content) {
      prompt = `请根据以下视频链接/描述："${content}"，完成以下任务：
1. 用简洁的语言（1-2句话）推断并总结该视频可能的核心内容
2. 从内容中提炼出1-2个可复用的思维模型或方法论（每个用一句话概括）
请用以下JSON格式回复：
{
  "summary": "视频内容总结",
  "methods": ["方法论1", "方法论2"]
}`;
      return await this.callAI([{ role: 'user', content: prompt }], { maxTokens: 1000 });
    }
    return null;
  },

  // AI 分析岗位JD并总结技能和思维
  async aiAnalyzeJD(jobTitle, company, requirements) {
    const prompt = `请根据以下岗位信息分析需要学习的技能和思维：

岗位：${jobTitle}
公司：${company}
JD要求：${requirements}

请输出：
1. 该岗位需要的核心技术/硬技能（列举3-5项）
2. 需要的思维方式和软技能（列举3-5项）
3. 建议的学习路径或资源方向（简要说明）

请用以下JSON格式回复：
{
  "hardSkills": ["技能1", "技能2", ...],
  "softSkills": ["思维方式1", "思维方式2", ...],
  "learningPath": "建议的学习路径"
}`;
    return await this.callAI([{ role: 'user', content: prompt }], { maxTokens: 1500 });
  }
};
