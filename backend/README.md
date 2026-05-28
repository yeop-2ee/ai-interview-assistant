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
| nodemailer | 8.0.8 |
| pdf-parse | 1.1.4 |
| mammoth | 1.12.0 |

## 환경변수 설정

`backend/.env` 파일을 생성합니다.

```env
DATABASE_URL=postgresql://user:password@localhost:5432/ai_interview
AI_SERVER_URL=http://localhost:5050
MEDIA_SERVER_URL=http://localhost:4000
PORT=3001

# 이메일 전송 (nodemailer + Gmail SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@gmail.com
SMTP_PASS=your_app_password
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

## 인증 방식 (세션 토큰)

로그인 시 서버에서 UUID 세션 토큰을 생성해 DB에 저장하고 클라이언트에 반환합니다.

- **이중 로그인 방지**: 새 기기에서 로그인하면 기존 토큰을 덮어써 이전 기기 세션이 자동 만료됩니다.
- **세션 만료**: 토큰은 로그인 시점부터 **7일** 후 자동 만료됩니다.
- **보호 라우트**: `/reports`, `/admin`, `/knowledge` 요청 시 `x-session-token` 헤더가 필요합니다.

```
# 요청 예시
GET /reports?email=user@example.com
x-session-token: <UUID>
```

## 이메일 전송 (nodemailer)

면접 결과를 이메일로 발송하는 기능에 **nodemailer**를 사용합니다.  
Gmail SMTP를 기본으로 사용하며, 앱 비밀번호 설정이 필요합니다.

- Gmail → Google 계정 → 보안 → 2단계 인증 활성화 → 앱 비밀번호 발급
- 발급한 앱 비밀번호를 `SMTP_PASS`에 입력

## API 엔드포인트

| Method | Path | 인증 필요 | 설명 |
|--------|------|-----------|------|
| POST | `/auth/signup` | X | 회원가입 |
| POST | `/auth/login` | X | 로그인 (세션 토큰 발급) |
| POST | `/auth/logout` | X | 로그아웃 (세션 토큰 삭제) |
| DELETE | `/auth/user` | X | 회원탈퇴 |
| POST | `/upload/resume` | X | 이력서 업로드 |
| POST | `/upload/coverletter` | X | 자소서 업로드 |
| GET | `/reports` | O | 면접 기록 목록 |
| POST | `/reports` | O | 리포트 저장 |
| DELETE | `/reports/:id` | O | 리포트 삭제 |
| GET | `/knowledge` | O | 전공지식 조회 |
| POST | `/knowledge` | O | 전공지식 등록 (관리자) |
| DELETE | `/knowledge/:id` | O | 전공지식 삭제 (관리자) |
| GET | `/admin/surveys` | O | 설문 통계 조회 (관리자) |
| GET | `/admin/users` | O | 사용자 목록 (관리자) |
| PATCH | `/admin/users/:id/role` | O | 역할 변경 (관리자) |
| DELETE | `/admin/users/:id` | O | 사용자 삭제 (관리자) |
| POST | `/email/send` | X | 면접 결과 이메일 발송 |
