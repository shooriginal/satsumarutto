const fs = require('fs');

const CATEGORY_KEYWORDS = {
  resident: ['くらし', 'ごみ', '収集', '税', '保険', '年金', '手続き', '防災', '避難', '議会', '募集', '講座', 'お知らせ', '子育て', '保育', '学校', '教育', 'パブリックコメント', '職員採用'],
  migrant: ['移住', '定住', '空き家', '体験宿', '補助金', '支援金', 'UIJターン', '転入'],
  tourism: ['観光', '温泉', 'ホタル', '祭り', 'まつり', 'イベント', '体験', 'グルメ', '特産品', 'フェスタ', '桜', '紅葉', '産業祭'],
  neighbor: ['薩摩川内市', '長島町', '阿久根市', '鹿児島市', '伊佐市', '湧水町', '出水市', '広域', '合同']
};

function detectTags(title) {
  const tags = [];
  for (const [tag, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(kw => title.includes(kw))) tags.push(tag);
  }
  if (tags.length === 0) tags.push('resident');
  return tags;
}

async function main() {
  const feedUrl = 'https://www.satsuma-net.jp/cgi-bin/feed.php?siteNew=1&displayCount=15&displayRange=90';
  const res = await fetch(feedUrl, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SatsumaInfoBot/1.0)' } });
  const xml = await res.text();

  const newItems = [];
  const itemRegex = /<item\b[^>]*>([\s\S]*?)<\/item>/g;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    const title = (block.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || '';
    const link = (block.match(/<link>([\s\S]*?)<\/link>/) || [])[1] || '';
    const pubDate =
      (block.match(/<pubDate>([\s\S]*?)<\/pubDate>/) || [])[1] ||
      (block.match(/<dc:date>([\s\S]*?)<\/dc:date>/) || [])[1] || '';
    const cleanTitle = title.replace('<![CDATA[', '').replace(']]>', '').trim();
    newItems.push({ title: cleanTitle, link: link.trim(), pubDate: pubDate.trim(), tags: detectTags(cleanTitle) });
  }

  // 既存のアーカイブを読み込んで、新しい記事とマージ（同じlinkは新しい内容で上書き）
  const dataPath = 'data/news.json';
  let archive = [];
  if (fs.existsSync(dataPath)) {
    try { archive = JSON.parse(fs.readFileSync(dataPath, 'utf-8')); } catch (e) { archive = []; }
  }
  const byLink = new Map();
  archive.forEach(item => byLink.set(item.link, item));
  newItems.forEach(item => byLink.set(item.link, item));

  let merged = Array.from(byLink.values());
  merged.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
  merged = merged.slice(0, 200); // 際限なく増えないよう上限200件

  fs.mkdirSync('data', { recursive: true });
  fs.writeFileSync(dataPath, JSON.stringify(merged, null, 2));
  console.log(`アーカイブ件数: ${merged.length}（今回取得: ${newItems.length}）`);
}

main().catch(err => { console.error(err); process.exit(1); });
main().catch(err => { console.error(err); process.exit(1); });
