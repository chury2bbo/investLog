import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env') });

import pg from 'pg';

const banks = [
  { code: "002", name: "산업은행" },
  { code: "003", name: "*IBK기업은행" },
  { code: "004", name: "*KB국민은행" },
  { code: "005", name: "외환은행" },
  { code: "007", name: "수협은행" },
  { code: "011", name: "*NH농협은행" },
  { code: "012", name: "단위농협" },
  { code: "020", name: "*우리은행" },
  { code: "023", name: "*SC제일은행" },
  { code: "026", name: "*신한은행" },
  { code: "027", name: "한국씨티은행" },
  { code: "030", name: "수협중앙회" },
  { code: "031", name: "*iM뱅크" },
  { code: "032", name: "*부산은행" },
  { code: "034", name: "광주은행" },
  { code: "035", name: "제주은행" },
  { code: "037", name: "전북은행" },
  { code: "039", name: "*경남은행" },
  { code: "045", name: "새마을금고" },
  { code: "048", name: "신협" },
  { code: "050", name: "상호저축은행" },
  { code: "064", name: "산림조합" },
  { code: "071", name: "*우체국" },
  { code: "081", name: "*KEB하나은행" },
  { code: "088", name: "신한은행" },
  { code: "089", name: "*케이뱅크" },
  { code: "090", name: "카카오뱅크" },
  { code: "092", name: "*토스뱅크" },
];

async function main() {
  const client = new pg.Client({ connectionString: process.env.DIRECT_URL });
  await client.connect();

  let inserted = 0;
  for (const b of banks) {
    await client.query(
      `INSERT INTO "BrokerageCompany" (code, name, "financialCode", "createdAt")
       VALUES ($1, $2, 'B', NOW())
       ON CONFLICT (code) DO NOTHING`,
      [b.code, b.name]
    );
    inserted++;
  }

  console.log('삽입 완료:', inserted, '건');
  await client.end();
}

main().catch(e => { console.error(e.message); process.exit(1); });
