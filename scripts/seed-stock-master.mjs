import fs from 'fs';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

const { PrismaClient } = require(resolve(__dirname, '../src/generated/prisma/index.js'));

const prisma = new PrismaClient();
const buf = fs.readFileSync('c:/Users/SP250513/Downloads/KRX_DATA.csv');

let text;
try {
  const iconv = require('iconv-lite');
  text = iconv.decode(buf, 'cp949');
} catch {
  text = buf.toString('utf8');
}

const lines = text.split('\n').filter(l => l.trim());
const dataLines = lines.slice(1);

const marketMap = { '코스닥': 'KOSDAQ', '유가': 'KOSPI', '코넥스': 'KONEX' };

const records = dataLines.map(line => {
  const cols = line.split(',');
  const name = cols[0]?.trim();
  const marketRaw = cols[1]?.trim();
  const tickerRaw = cols[2]?.trim();
  if (!name || !marketRaw || !tickerRaw) return null;
  const market = marketMap[marketRaw] ?? marketRaw;
  const ticker = tickerRaw.padStart(6, '0');
  return { ticker, name, market, country: 'KR' };
}).filter(Boolean);

console.log('총 데이터 수:', records.length);
console.log('샘플:', JSON.stringify(records.slice(0, 3), null, 2));

const result = await prisma.stockMaster.createMany({
  data: records,
  skipDuplicates: true,
});
console.log('삽입 완료:', result.count, '건');
await prisma.$disconnect();
