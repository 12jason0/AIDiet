import { PrismaClient } from "@prisma/client";

// 재사용 가능한 Prisma 인스턴스 (개발 환경에서 핫리로드 고려)
export const prisma = globalThis.__prisma || new PrismaClient();
if (!globalThis.__prisma) {
    globalThis.__prisma = prisma;
}

export default prisma;


