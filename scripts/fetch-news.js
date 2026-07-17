const fs = require('fs');

async function main() {
  const feedUrl = 'https://www.satsuma-net.jp/cgi-bin/feed.php?siteNew=1&displayCount=15&displayRange=90';
  const res = await fetch(feedUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; SatsumaInfoBot/1.0)'
    }
  });

  console.log('HTTPステータス:', res.status);
  const xml = await res.text();
  console.log('取得した文字数:', xml.length);
  console.log('先頭300文字:', xml.slice(0, 300));

  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    const title = (block.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || '';
    const link = (block.match(/<link>([\s\S]*?)<\/link>/) || [])[1] || '';
    const pubDate = (block.match(/<pubDate>([\s\S]*?)<\/pubDate>/) || [])[1] || '';
    items.push({
      title: title.replace('<![CDATA[', '').replace(']]>', '').trim(),
      link: link.trim(),
      pubDate: pubDate.trim()
    });
  }

  fs.mkdirSync('data', { recursive: true });
  fs.writeFileSync('data/news.json', JSON.stringify(items.slice(0, 10), null, 2));
  console.log(`Saved ${items.length} items`);
}

main().catch(err => { console.error(err); process.exit(1); });
