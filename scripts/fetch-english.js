/**
 * GitHub Actions 抓取脚本：英语学习素材
 * 抓取 BBC Learning English、VOA 慢速、商务外贸英语 RSS
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
    const pubDate = (itemXml.match(/<pubDate>([\s\S]*?)<\/pubDate>/i) || [])[1]?.trim() || '';
    const enclosure = (itemXml.match(/<enclosure[^>]+url="([^"]+)"/i) || [])[1]?.trim() || '';
    if (title) items.push({ title, link, description, pubDate, audioUrl: enclosure });
  }
  return items;
}

function toDate(pubDate) {
  try { return new Date(pubDate).toISOString(); } catch { return new Date().toISOString(); }
}

async function fetchSpeaking() {
  const urls = [
    process.env.BBC_RSS || 'https://www.bbc.co.uk/learningenglish/english/features/6-minute-english/rss',
    process.env.BUSINESS_EN_RSS || 'https://www.example.com/business-english/rss'
  ];
  const all = [];
  for (const url of urls) {
    const xml = await fetchWithRetry(url);
    if (xml) {
      all.push(...parseRSS(xml).map(i => ({
        source: 'auto', category: i.title.toLowerCase().includes('business') ? 'business' : 'daily',
        title: i.title,
        content: i.description,
        dialogue: parseDialogue(i.description),
        phrases: extractPhrases(i.description),
        externalLink: i.link,
        createdAt: Date.now(), pubDate: toDate(i.pubDate)
      })));
    }
  }
  return all.slice(0, 10);
}

async function fetchListening() {
  const urls = [
    process.env.VOA_RSS || 'https://learningenglish.voanews.com/rss/learning-english-words-and-their-stories.xml',
    process.env.BBC_LISTEN_RSS || 'https://www.bbc.co.uk/learningenglish/english/features/the-english-we-speak/rss'
  ];
  const all = [];
  for (const url of urls) {
    const xml = await fetchWithRetry(url);
    if (xml) {
      all.push(...parseRSS(xml).map(i => ({
        source: 'auto', title: i.title, content: i.description,
        audioUrl: i.audioUrl || i.link,
        exercises: generateExercise(i.description),
        createdAt: Date.now(), pubDate: toDate(i.pubDate)
      })));
    }
  }
  return all.slice(0, 10);
}

function parseDialogue(text) {
  const dialogue = [];
  const lines = (text || '').split(/\n|\. /);
  for (const line of lines) {
    if (/^(You|A|I|We):/i.test(line)) dialogue.push({ role: 'you', text: line.replace(/^[A-Za-z]+:\s*/, '') });
    else if (/^(Client|B|They|He|She):/i.test(line)) dialogue.push({ role: 'client', text: line.replace(/^[A-Za-z]+:\s*/, '') });
  }
  return dialogue;
}

function extractPhrases(text) {
  return (text || '').split(/\n/).filter(l => l.includes(':') || l.includes('-')).slice(0, 5).join('; ');
}

function generateExercise(text) {
  const words = (text || '').split(/\s+/).filter(w => w.length > 4).slice(0, 5);
  if (words.length === 0) return '';
  return '请听音频并尝试理解以下关键词：' + words.join(', ');
}

(async () => {
  const speaking = await fetchSpeaking();
  const listening = await fetchListening();
  const data = { speaking, listening, fetchedAt: new Date().toISOString() };
  fs.writeFileSync(path.join(DATA_DIR, 'english.json'), JSON.stringify(data, null, 2));
  console.log(`english fetched: speaking=${speaking.length}, listening=${listening.length}`);
})();
