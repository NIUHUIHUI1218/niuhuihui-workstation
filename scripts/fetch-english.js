/**
 * GitHub Actions 抓取脚本：英语学习素材
 * 来源：BBC Learning English, VOA, China Daily, TED, YouTube热门等
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

// ========== 口语素材抓取 ==========
async function fetchSpeaking() {
  const urls = [
    { url: process.env.BBC_RSS || 'https://www.bbc.co.uk/learningenglish/english/features/6-minute-english/rss', cat: 'daily' },
    { url: process.env.BUSINESS_EN_RSS || 'https://www.example.com/business-english/rss', cat: 'work' },
    { url: process.env.CHINADAILY_RSS || 'https://www.example.com/chinadaily-english/rss', cat: 'work' },
  ];
  const all = [];
  for (const { url, cat } of urls) {
    const xml = await fetchWithRetry(url);
    if (xml) {
      const items = parseRSS(xml).map(i => ({
        source: 'auto', category: cat,
        title: i.title,
        content: i.description,
        dialogue: parseDialogue(i.description),
        phrases: extractPhrases(i.description),
        culturalTips: cat === 'work' ? '商务场景常用表达，注意语气正式得体' : '日常口语，注意语音语调和自然表达',
        link: i.link,
        hot: true,
        createdAt: Date.now(), pubDate: toDate(i.pubDate)
      }));
      all.push(...items);
    }
  }
  // 生成一些预置热门口语素材（作为后备）
  if (all.length < 5) {
    all.push(...generateFallbackSpeaking());
  }
  return all.slice(0, 15);
}

function generateFallbackSpeaking() {
  const templates = [
    { title: '商务会议开场白', category: 'work', dialogue: [
      { role: 'you', text: "Good morning everyone, let's get started with today's agenda." },
      { role: 'client', text: "Sure, I'd like to go over the quarterly report first." }
    ], phrases: "get started: 开始; go over: 回顾/检查; quarterly report: 季度报告" },
    { title: '面试自我介绍', category: 'work', dialogue: [
      { role: 'you', text: "Tell me about yourself and your professional background." },
      { role: 'client', text: "I have five years of experience in digital marketing, specializing in content strategy and social media management." }
    ], phrases: "professional background: 职业背景; specializing in: 专攻于" },
    { title: '餐厅点餐', category: 'daily', dialogue: [
      { role: 'you', text: "Hi, I'd like to order the grilled salmon with a side salad, please." },
      { role: 'client', text: "Excellent choice! Would you like any drinks with that?" }
    ], phrases: "I'd like to order: 我想点; side salad: 配菜沙拉" },
    { title: '问路指路', category: 'daily', dialogue: [
      { role: 'you', text: "Excuse me, could you tell me how to get to the nearest subway station?" },
      { role: 'client', text: "Sure, just go straight for two blocks, then turn left at the traffic light." }
    ], phrases: "how to get to: 怎么去; go straight: 直走; turn left: 左转" },
    { title: '客户电话沟通', category: 'work', dialogue: [
      { role: 'you', text: "I'm calling to follow up on the proposal we sent last week." },
      { role: 'client', text: "Thanks for following up. We've reviewed it and have a few questions." }
    ], phrases: "follow up on: 跟进; proposal: 提案" },
    { title: '旅行订酒店', category: 'daily', dialogue: [
      { role: 'you', text: "I'd like to check in. I have a reservation under the name Wang." },
      { role: 'client', text: "Let me look that up. Yes, a deluxe room for three nights, is that correct?" }
    ], phrases: "check in: 入住; reservation: 预订; deluxe room: 豪华房" },
  ];
  return templates.map(t => ({
    source: 'auto', category: t.category, title: t.title,
    dialogue: t.dialogue, phrases: t.phrases,
    hot: true, createdAt: Date.now()
  }));
}

// ========== 听力素材抓取 ==========
async function fetchListening() {
  const urls = [
    { url: process.env.VOA_RSS || 'https://learningenglish.voanews.com/rss/learning-english-words-and-their-stories.xml', cat: 'daily' },
    { url: process.env.BBC_LISTEN_RSS || 'https://www.bbc.co.uk/learningenglish/english/features/the-english-we-speak/rss', cat: 'daily' },
    { url: process.env.TED_RSS || 'https://www.example.com/ted-talks/rss', cat: 'work' },
  ];
  const all = [];
  for (const { url, cat } of urls) {
    const xml = await fetchWithRetry(url);
    if (xml) {
      const items = parseRSS(xml).map(i => ({
        source: 'auto', category: cat, title: i.title, content: i.description,
        audioUrl: i.audioUrl || i.link,
        exercises: generateExercise(i.description),
        hot: true, createdAt: Date.now(), pubDate: toDate(i.pubDate)
      }));
      all.push(...items);
    }
  }
  if (all.length < 5) {
    all.push(...generateFallbackListening());
  }
  return all.slice(0, 15);
}

function generateFallbackListening() {
  return [
    { title: 'TED: The Power of Vulnerability', category: 'work', content: 'Brené Brown discusses how vulnerability is the birthplace of innovation and creativity.', audioUrl: '', exercises: '听后回答：What is the main message of this talk?' },
    { title: 'BBC: The English We Speak - "A Piece of Cake"', category: 'daily', content: 'Learn what "a piece of cake" really means and how to use it in British English.', audioUrl: '', exercises: '请用 "a piece of cake" 造3个句子' },
    { title: 'VOA: Business English - Negotiation Skills', category: 'work', content: 'Key phrases and strategies for successful business negotiations in English.', audioUrl: '', exercises: '学习并练习商务谈判中的常用句型' },
    { title: 'BBC: 6 Minute English - Climate Change', category: 'daily', content: 'Discussion about climate change vocabulary and environmental terms.', audioUrl: '', exercises: '听后列出5个环境相关词汇' },
    { title: 'TED: How Great Leaders Inspire Action', category: 'work', content: 'Simon Sinek explains the Golden Circle concept.', audioUrl: '', exercises: 'What is the Golden Circle? How does it apply to leadership?' },
  ].map(i => ({ ...i, source: 'auto', hot: true, createdAt: Date.now() }));
}

// ========== 单词素材抓取 ==========
async function fetchVocab() {
  // 生成热门商务和日常核心单词
  const workWords = [
    { word: 'synergy', phonetic: '/ˈsɪnədʒi/', definition: '协同效应，合作产生的额外价值', example: 'The synergy between the two teams led to a breakthrough in the project.' },
    { word: 'leverage', phonetic: '/ˈlevərɪdʒ/', definition: '杠杆作用；利用', example: 'We need to leverage our existing resources to expand into new markets.' },
    { word: 'streamline', phonetic: '/ˈstriːmlaɪn/', definition: '精简，使效率更高', example: 'The new software will streamline our workflow significantly.' },
    { word: 'benchmark', phonetic: '/ˈbentʃmɑːrk/', definition: '基准，标杆', example: 'We use industry benchmarks to measure our performance.' },
    { word: 'stakeholder', phonetic: '/ˈsteɪkhoʊldər/', definition: '利益相关者', example: 'All stakeholders need to be informed about the policy changes.' },
    { word: 'scalable', phonetic: '/ˈskeɪləbl/', definition: '可扩展的', example: 'We need a scalable solution that can grow with the company.' },
    { word: 'pivot', phonetic: '/ˈpɪvət/', definition: '转变方向，调整策略', example: 'The startup decided to pivot from B2C to B2B.' },
    { word: 'agile', phonetic: '/ˈædʒaɪl/', definition: '敏捷的，灵活的', example: 'Our team follows agile methodology for faster delivery.' },
    { word: 'ROI', phonetic: '/ɑːr oʊ aɪ/', definition: '投资回报率(Return on Investment)', example: 'We achieved a 30% ROI on our digital marketing campaign.' },
    { word: 'deliverable', phonetic: '/dɪˈlɪvərəbl/', definition: '可交付成果', example: 'The project deliverables are due by the end of this week.' },
  ];
  const dailyWords = [
    { word: 'resilient', phonetic: '/rɪˈzɪliənt/', definition: '有韧性的，能迅速恢复的', example: 'She is remarkably resilient in the face of challenges.' },
    { word: 'eloquent', phonetic: '/ˈeləkwənt/', definition: '雄辩的，有口才的', example: 'His eloquent speech moved everyone in the audience.' },
    { word: 'benevolent', phonetic: '/bəˈnevələnt/', definition: '仁慈的，善意的', example: 'The benevolent donor supported many local charities.' },
    { word: 'whimsical', phonetic: '/ˈwɪmzɪkl/', definition: '异想天开的，古怪的', example: 'The artist is known for her whimsical style.' },
    { word: 'profound', phonetic: '/prəˈfaʊnd/', definition: '深刻的，意义深远的', example: 'The book had a profound impact on my understanding of history.' },
    { word: 'versatile', phonetic: '/ˈvɜːrsətl/', definition: '多才多艺的，多功能的', example: 'She is a versatile performer who can sing, dance, and act.' },
    { word: 'subtle', phonetic: '/ˈsʌtl/', definition: '微妙的，精细的', example: 'There is a subtle difference between confidence and arrogance.' },
    { word: 'meticulous', phonetic: '/məˈtɪkjələs/', definition: '一丝不苟的，极其仔细的', example: 'The meticulous editor caught every single typo.' },
    { word: 'nostalgia', phonetic: '/nɑːˈstældʒə/', definition: '怀旧，乡愁', example: 'The old song filled her with a sense of nostalgia.' },
    { word: 'serendipity', phonetic: '/ˌserənˈdɪpəti/', definition: '意外发现的好运，巧合', example: 'Meeting her was pure serendipity.' },
  ];
  return [...workWords, ...dailyWords].map(w => ({
    ...w, source: 'auto', status: 'new', hot: true, createdAt: Date.now()
  }));
}

// ========== 辅助函数 ==========
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

// ========== 主流程 ==========
(async () => {
  const speaking = await fetchSpeaking();
  const listening = await fetchListening();
  const vocab = await fetchVocab();
  const data = { speaking, listening, vocab, fetchedAt: new Date().toISOString() };
  fs.writeFileSync(path.join(DATA_DIR, 'english.json'), JSON.stringify(data, null, 2));
  console.log(`english fetched: speaking=${speaking.length}, listening=${listening.length}, vocab=${vocab.length}`);
})();
