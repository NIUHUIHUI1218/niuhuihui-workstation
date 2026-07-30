/**
 * GitHub Actions 抓取脚本：岗位招聘 + 面试题库
 * 抓取公开招聘 RSS / API 以及面试题库 RSS
 */
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function fetchWithRetry(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 20000 });
      if (res.ok) return await res.text();
    } catch (e) { console.warn(`retry ${i + 1}/${retries}: ${url}`); }
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
    if (title) items.push({ title, link, description });
  }
  return items;
}

function extractSalary(title, desc) {
  const text = title + ' ' + desc;
  const m = text.match(/(\d{2,5})\s*[-~]\s*(\d{2,5})/);
  if (m) return (parseInt(m[1]) + parseInt(m[2])) / 2 * (text.includes('年') ? 1 : 12);
  const single = text.match(/(\d{2,5})[Kk]/);
  if (single) return parseInt(single[1]) * 1000;
  return 0;
}

function extractSkills(desc) {
  const skills = [];
  const keywords = ['JavaScript', 'Python', 'Java', 'React', 'Vue', 'Node.js', 'SQL', 'Excel', 'PPT', '英语', '外贸', '运营', '产品', '设计', '数据分析', 'AI', 'Go', 'Rust'];
  for (const k of keywords) {
    if (desc.toLowerCase().includes(k.toLowerCase())) skills.push(k);
  }
  return skills;
}

async function fetchJobs() {
  const urls = [
    process.env.JOBS_RSS_1 || 'https://www.zhaopin.com/rss/feed',
    process.env.JOBS_RSS_2 || 'https://www.lagou.com/rss/feed'
  ];
  const all = [];
  for (const url of urls) {
    const xml = await fetchWithRetry(url);
    if (xml) {
      all.push(...parseRSS(xml).map(i => ({
        title: i.title, company: '招聘平台', salary: extractSalary(i.title, i.description),
        requirements: i.description, skills: extractSkills(i.description), link: i.link,
        createdAt: Date.now()
      })));
    }
  }
  return all.slice(0, 20);
}

async function fetchInterview() {
  const urls = [
    process.env.INTERVIEW_RSS_1 || 'https://www.example.com/interview/general/rss',
    process.env.INTERVIEW_RSS_2 || 'https://www.example.com/interview/workplace/rss'
  ];
  const all = [];
  const categories = ['通用面试', '职场通用', '行业专项'];
  for (let idx = 0; idx < urls.length; idx++) {
    const xml = await fetchWithRetry(urls[idx]);
    if (xml) {
      all.push(...parseRSS(xml).map(i => ({
        source: 'auto', category: categories[idx] || '通用面试',
        question: i.title, answer: i.description,
        tags: [], createdAt: Date.now()
      })));
    }
  }
  return all.slice(0, 30);
}

(async () => {
  const jobs = await fetchJobs();
  const questions = await fetchInterview();
  fs.writeFileSync(path.join(DATA_DIR, 'jobs.json'), JSON.stringify({ jobs, fetchedAt: new Date().toISOString() }, null, 2));
  fs.writeFileSync(path.join(DATA_DIR, 'interview.json'), JSON.stringify({ questions, fetchedAt: new Date().toISOString() }, null, 2));
  console.log(`jobs fetched: jobs=${jobs.length}, questions=${questions.length}`);
})();
