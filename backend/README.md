# Backend

Express + TypeScript + Prisma 기반 API 서버입니다. (포트 3001)

## 기술 스택

| 기술 | 버전 |
|------|------|
| Node.js | 18+ |
| Express | 5.2.1 |
| TypeScript | 6.x |
| Prisma ORM | 7.6.0 |
| PostgreSQL | - |
| bcrypt | 6.0.0 |
| pdf-parse | 1.1.4 |
| mammoth | 1.12.0 |

## 환경변수 설정

`backend/.env` 파일을 생성합니다.

```env
DATABASE_URL=postgresql://user:password@localhost:5432/ai_interview
JWT_SECRET=your_jwt_secret_here
AI_SERVER_URL=http://localhost:5050
MEDIA_SERVER_URL=http://localhost:4000
PORT=3001
```

## 설치 및 실행

```bash
npm install
npx ts-node src/server.ts   # http://localhost:3001
```

서버 시작 시 DB가 없으면 자동 생성 후 마이그레이션이 실행됩니다.

### 수동 마이그레이션

```bash
npx prisma migrate deploy
npx prisma generate
```

## API 엔드포인트

| Method | Path | 설명 |
|--------|------|------|
| POST | `/auth/signup` | 회원가입 |
| POST | `/auth/login` | 로그인 |
| DELETE | `/auth/me` | 회원탈퇴 |
| POST | `/upload/resume` | 이력서 업로드 |
| POST | `/upload/coverletter` | 자소서 업로드 |
| GET | `/reports` | 면접 기록 목록 |
| GET | `/reports/:id` | 면접 기록 상세 |
| POST | `/reports` | 리포트 저장 |
| DELETE | `/reports/:id` | 리포트 삭제 |
| GET | `/knowledge` | 전공지식 조회 |
| POST | `/knowledge` | 전공지식 등록 (관리자) |
| DELETE | `/knowledge/:id` | 전공지식 삭제 (관리자) |
