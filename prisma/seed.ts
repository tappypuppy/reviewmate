import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const assignments = [
  {
    code: "9-6",
    title: "【提出課題①】LengthBasedExampleSelector",
    description: `ここに課題文の全文を記載してください。

例：
この課題では、LengthBasedExampleSelectorを実装します。

【要件】
1. 入力文字列の長さに基づいて適切な例を選択する
2. 最大トークン数を超えないように例を選択する
3. 選択された例を返す

【評価基準】
- 要件1〜3をすべて満たしていること
- コードが動作すること`,
  },
  // 他の課題を追加する場合はここに追加
];

async function main() {
  console.log("Seeding assignments...");

  for (const data of assignments) {
    // 既存チェック（codeで検索）
    const existing = await prisma.assignment.findFirst({
      where: { code: data.code },
    });

    if (existing) {
      console.log(`Skipped (exists): ${data.code}`);
      continue;
    }

    const result = await prisma.assignment.create({ data });
    console.log(`Created: ${result.code} - ${result.title}`);
  }

  console.log("Seeding completed.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
