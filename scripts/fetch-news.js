/**
 * GitHub Actions 抓取脚本：资讯推送
 * 抓取小宇宙播客、生动早咖啡、每日财经新闻 RSS 源
 */
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function fetchWithRetry(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; NiuHuihuiBot/1.0)' }, timeout: 20000 });
      if (res.ok) return await res.text();
    } catch (e) { console.warn(`fetch retry ${i + 1}/${retries}: ${url}`); }
    await sleep(2000 * (i + 1));
  }
  return null;
}

function parseRSS(xml) {
  const items = [];
  const re = /<item[\s\S]*?<\/item>/gi;
  let m;
  while ((m = re.exec(xml)) !== null) {
    const itemXml = m[0];
    const title = (itemXml.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i) || [])[1]?.trim() || '';
    const link = (itemXml.match(/<link>([\s\S]*?)<\/link>/i) || [])[1]?.trim() || '';
    const descMatch = itemXml.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i);
    const description = descMatch ? descMatch[1].replace(/<[^>]+>/g, '').trim() : '';
    const pubDate = (itemXml.match(/<pubDate>([\s\S]*?)<\/pubDate>/i) || [])[1]?.trim() || '';
    const enclosure = (itemXml.match(/<enclosure[^>]+url="([^"]+)"/i) || [])[1]?.trim() || '';
    if (title) items.push({ title, link, description, pubDate, audioUrl: enclosure });
  }
  return items;
}

function toISODate(pubDate) {
  try {
    const d = new Date(pubDate);
    return isNaN(d) ? new Date().toISOString() : d.toISOString();
  } catch { return new Date().toISOString(); }
}

async function fetchPodcast() {
  // 小宇宙播客示例 RSS（请替换为实际 RSS 地址）
  const url = process.env.PODCAST_RSS || 'https://www.xiaoyuzhoufm.com/podcast/feed/123456';
  const xml = await fetchWithRetry(url);
  if (!xml) return [];
  return parseRSS(xml).map(i => ({
    title: i.title, description: i.description, link: i.link,
    audioUrl: i.audioUrl, pubDate: toISODate(i.pubDate), source: 'auto', isToday: false
  }));
}

async function fetchCoffee() {
  // 生动早咖啡 RSS（请替换为实际地址）
  const url = process.env.COFFEE_RSS || 'https://feed.example.com/morning-coffee';
  const xml = await fetchWithRetry(url);
  if (!xml) return [];
  return parseRSS(xml).map(i => ({
    title: i.title, description: i.description, link: i.link,
    audioUrl: i.audioUrl, pubDate: toISODate(i.pubDate), source: 'auto'
  }));
}

async function fetchFinance() {
  // 多个财经 RSS（增加更多源以确保至少10条）
  const urls = [
    process.env.FINANCE_RSS_1 || 'https://www.cls.cn/rss/finance',
    process.env.FINANCE_RSS_2 || 'https://www.36kr.com/feed',
    process.env.FINANCE_RSS_3 || 'https://rss.cninfo.com.cn/rss',
    process.env.FINANCE_RSS_4 || 'https://feedx.net/rss/caijing.xml'
  ];
  const all = [];
  for (const url of urls) {
    const xml = await fetchWithRetry(url);
    if (xml) {
      all.push(...parseRSS(xml).map(i => ({
        title: i.title, description: i.description, link: i.link,
        pubDate: toISODate(i.pubDate), source: 'auto', tags: detectFinanceTag(i.title + i.description)
      })));
    }
  }
  return all;
}

function detectFinanceTag(text) {
  const tags = [];
  if (/政策|央行|财政|监管/.test(text)) tags.push('政策');
  if (/股市|A股|港股|美股|涨停|指数/.test(text)) tags.push('股市');
  if (/汇率|人民币|美元|欧元|外汇/.test(text)) tags.push('汇率');
  if (/理财|基金|债券|保险|黄金/.test(text)) tags.push('理财');
  return tags;
}

(async () => {
  const today = new Date().toISOString().split('T')[0];
  const podcast = await fetchPodcast();
  const coffee = await fetchCoffee();
  const finance = await fetchFinance();

  // 标记今日新更
  podcast.forEach(p => { if (p.pubDate.startsWith(today)) p.isToday = true; });

  const data = { podcast, coffee, finance, fetchedAt: new Date().toISOString() };
  fs.writeFileSync(path.join(DATA_DIR, 'news.json'), JSON.stringify(data, null, 2));
  console.log(`news fetched: podcast=${podcast.length}, coffee=${coffee.length}, finance=${finance.length}`);
})();
