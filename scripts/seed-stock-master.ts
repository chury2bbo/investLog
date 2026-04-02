import fs from 'fs';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env') });

import pg from 'pg';

const buf = fs.readFileSync('c:/Users/SP250513/Downloads/KRX_DATA.csv');

let text: string;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const iconv = require('iconv-lite');
  text = iconv.decode(buf, 'cp949');
} catch {
  text = buf.toString('utf8');
}

const lines = text.split('\n').filter(l => l.trim());
const dataLines = lines.slice(1);

const marketMap: Record<string, string> = {
  '코스닥': 'KOSDAQ',
  '유가': 'KOSPI',
  '코넥스': 'KONEX',
};

const records = dataLines.map(line => {
  const cols = line.split(',');
  const name = cols[0]?.trim();
  const marketRaw = cols[1]?.trim();
  const tickerRaw = cols[2]?.trim();
  if (!name || !marketRaw || !tickerRaw) return null;
  const market = marketMap[marketRaw] ?? marketRaw;
  const ticker = tickerRaw.padStart(6, '0');
  return { ticker, name, market };
}).filter((r): r is { ticker: string; name: string; market: string } => r !== null);

console.log('총 데이터 수:', records.length);
console.log('샘플:', records.slice(0, 3));

async function main() {
  const client = new pg.Client({ connectionString: process.env.DIRECT_URL });
  await client.connect();

  let inserted = 0;
  for (const r of records) {
    await client.query(
      `INSERT INTO stock_master (ticker, name, market, country, "updatedAt")
       VALUES ($1, $2, $3, 'KR', NOW())
       ON CONFLICT (ticker) DO NOTHING`,
      [r.ticker, r.name, r.market]
    );
    inserted++;
  }

  console.log('삽입 완료:', inserted, '건');
  await client.end();
}

main().catch(e => { console.error(e.message); process.exit(1); });
