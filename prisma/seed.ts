import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const banks = [
    { code: "002", name: "산업은행" },
    { code: "003", name: "IBK기업은행" },
    { code: "004", name: "KB국민은행" },
    { code: "005", name: "외환은행" },
    { code: "007", name: "수협은행" },
    { code: "011", name: "NH농협은행" },
    { code: "012", name: "단위농협" },
    { code: "020", name: "우리은행" },
    { code: "023", name: "SC제일은행" },
    { code: "026", name: "신한은행" },
    { code: "027", name: "한국씨티은행" },
    { code: "030", name: "수협중앙회" },
    { code: "031", name: "iM뱅크" },
    { code: "032", name: "부산은행" },
    { code: "034", name: "광주은행" },
    { code: "035", name: "제주은행" },
    { code: "037", name: "전북은행" },
    { code: "039", name: "경남은행" },
    { code: "045", name: "새마을금고" },
    { code: "048", name: "신협" },
    { code: "050", name: "상호저축은행" },
    { code: "064", name: "산림조합" },
    { code: "071", name: "우체국" },
    { code: "081", name: "KEB하나은행" },
    { code: "088", name: "신한은행" },
    { code: "089", name: "케이뱅크" },
    { code: "090", name: "카카오뱅크" },
    { code: "092", name: "토스뱅크" },
  ];

  for (const bank of banks) {
    await prisma.brokerageCompany.upsert({
      where: { code: bank.code },
      update: { name: bank.name },
      create: {
        code: bank.code,
        name: bank.name,
        financialCode: "B",
      },
    });
  }

  console.log(`✅ 은행 데이터 ${banks.length}건 입력 완료`);

  const securities = [
    { code: "218", name: "KB증권" },
    { code: "227", name: "KTB투자증권" },
    { code: "238", name: "미래에셋" },
    { code: "240", name: "삼성증권" },
    { code: "243", name: "한국투자증권" },
    { code: "247", name: "NH투자증권" },
    { code: "256", name: "이베스트투자증권" },
    { code: "261", name: "교보증권" },
    { code: "262", name: "하이투자증권" },
    { code: "263", name: "HMC증권" },
    { code: "264", name: "키움증권" },
    { code: "266", name: "SK증권" },
    { code: "267", name: "대신증권" },
    { code: "269", name: "한화투자증권" },
    { code: "270", name: "하나증권" },
    { code: "271", name: "토스증권" },
    { code: "278", name: "신한투자증권" },
    { code: "279", name: "동부증권" },
    { code: "280", name: "유진투자증권" },
    { code: "287", name: "메리츠종합금융증권" },
  ];

  for (const sec of securities) {
    await prisma.brokerageCompany.upsert({
      where: { code: sec.code },
      update: { name: sec.name },
      create: {
        code: sec.code,
        name: sec.name,
        financialCode: "C",
      },
    });
  }

  console.log(`✅ 증권사 데이터 ${securities.length}건 입력 완료`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
