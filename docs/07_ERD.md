# 테이블 ERD

> 프로젝트명: AI Interview Assistant  
> 작성일: 2026-04-22  
> 작성자: 이상엽 · 이가영 · 장태윤 · 장예은  
> DBMS: PostgreSQL

---

## ERD 다이어그램

```
┌──────────────────────────────────┐
│              User                │
├──────────────────────────────────┤
│ PK  id           Int             │
│     name         String          │
│ UK  email        String          │
│     password     String          │
│     role         String  "user"  │
│     createdAt    DateTime        │
└──────────────┬───────────────────┘
               │ 1
               │
               │ N  (onDelete: Cascade)
               │
┌──────────────▼───────────────────┐
│         InterviewReport          │
├──────────────────────────────────┤
│ PK  id           Int             │
│ FK  userId       Int  ──► User.id│
│     title        String          │
│     overallScore Int             │
│     scores       Json            │
│     questions    Json            │
│     fullReport   Json?           │
│     createdAt    DateTime        │
└──────────────────────────────────┘


┌──────────────────────────────────┐
│         KnowledgeEntry           │
├──────────────────────────────────┤
│ PK  id           Int             │
│     department   String          │
│     subject      String          │
│     content      String          │
│     registeredBy String  ""      │
│     createdAt    DateTime        │
└──────────────────────────────────┘
```

> **KnowledgeEntry**는 독립 테이블로 다른 테이블과 FK 관계 없음.  
> 면접 질문 생성 시 `department`로 필터링하여 참고 자료로만 활용됩니다.

---

## 관계 정의

| 관계 | 카디널리티 | 설명 |
|------|-----------|------|
| User → InterviewReport | 1 : N | 한 명의 사용자는 여러 리포트를 가질 수 있음 |
| InterviewReport.userId → User.id | N : 1 | FK, onDelete: Cascade |

---

## Prisma Schema

```prisma
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["driverAdapters"]
}

datasource db {
  provider = "postgresql"
}

model User {
  id        Int               @id @default(autoincrement())
  name      String
  email     String            @unique
  password  String
  role      String            @default("user")
  createdAt DateTime          @default(now())
  reports   InterviewReport[]
}

model InterviewReport {
  id           Int      @id @default(autoincrement())
  userId       Int
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  title        String
  overallScore Int
  scores       Json
  questions    Json
  fullReport   Json?
  createdAt    DateTime @default(now())
}

model KnowledgeEntry {
  id             Int      @id @default(autoincrement())
  department     String
  subject        String
  content        String
  registeredBy   String   @default("")
  createdAt      DateTime @default(now())
}
```
