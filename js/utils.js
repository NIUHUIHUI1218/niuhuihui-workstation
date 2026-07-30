/**
 * 牛慧慧专属一体化工作台 - 通用工具函数
 */

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
