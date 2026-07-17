const fs = require('fs');

// さつま町の実情に合わせて大幅拡充したキーワード辞書
const CATEGORY_KEYWORDS = {
  resident: [
    // くらし・手続き
    'くらし', 'ごみ', '収集', '水道', '料金', '税', '納期', '軽自動車税', '固定資産税',
    '保険', '国保', '年金', '手続き', '証明', '住民票', 'マイナンバー', 'マイナ',
    '選挙', '投票', '入札', '契約', '例規', '窓口', '申請', 'オンライン申請',
    // 防災・安全
    '防災', '避難', '警報', '注意報', '台風', '地震', '訓練', '消防', '除雪',
    '通行止め', '道路', '橋', '工事',
    // 健康・福祉・子育て・教育
    '健康', '医療', '病院', '休日当番医', '検診', '保育', '保育園', '認定こども園',
    '幼稚園', '学校', '教育', '講座', '生涯学習', '子育て', '児童手当',
    '妊娠', '出産', '結婚', '離婚', 'おくやみ', '介護', '障がい', '障害者',
    '相談', '福祉', 'ボランティア', '社協',
    // 行政・議会
    'パブリックコメント', 'アンケート', 'さつまるVoice', '計画', '振興計画',
    '総合振興計画', '過疎', '職員採用', '採用試験', '議会', '町長', '町政',
    '広報', 'クールビズ', 'ウォームビズ',
    // 産業・仕事（町内事業者・農業振興など）
    '産業', '振興会', '検討会', '品評会', '雇用', '企業誘致', '商品券',
    'プレミアム', '助成', '助勢', '補助金', 'センター', '休館', '閉館'
  ],
  migrant: [
    '移住', '定住', '空き家', '空き家バンク', '体験宿', '住宅取得', '支援金',
    'UIJターン', '二地域', '二拠点', '転入', '転居', '子育て応援サイト'
  ],
  tourism: [
    '観光', '温泉', 'ホタル', 'ホタル舟', '紫尾山', '川内川', '祭り', 'まつり', '祭',
    'イベント', '体験', 'グルメ', '特産品', 'フェスタ', '桜', '紅葉',
    '産業祭', '収穫祭', '公演', 'ミュージカル', '資料館', '歴史資料センター',
    '文化財', '歴史', '偉人', 'ブランド', '薩摩のさつま', '直売所',
    'ちくりん館', 'い～さ市場', '朝市', '館', '竹', 'たけのこ', '筍', '超早掘り',
    '薩摩西郷梅', '梅', 'マンゴー', '黒毛和牛', '黒牛', '焼酎', 'あおし柿',
    '薩摩切子', 'モデルコース', '宗功寺公園', '農業', '茶', 'ブドウ',
    'パッションフルーツ'
  ],
  neighbor: [
    '薩摩川内市', '長島町', '阿久根市', '鹿児島市', '伊佐市', '湧水町',
    '出水市', '霧島市', '南さつま市', '南九州市', '曽於市', '姶良市',
    '広域', '合同', '北薩', '県北', '鹿児島県'
  ]
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
  merged = merged.slice(0, 200);

  fs.mkdirSync('data', { recursive: true });
  fs.writeFileSync(dataPath, JSON.stringify(merged, null, 2));
  console.log(`アーカイブ件数: ${merged.length}（今回取得: ${newItems.length}）`);
}

main().catch(err => { console.error(err); process.exit(1); });
