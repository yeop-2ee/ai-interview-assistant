# Backend

Express + TypeScript + Prisma 기반 API 서버입니다. (포트 3001)

## 기술 스택

| 기술 | 버전 | 용도 |
|------|------|------|
| Node.js | 18+ | 런타임 |
| Express | 5.2.1 | HTTP 서버 |
| TypeScript | 6.x | 타입 안전성 |
| Prisma ORM | 7.6.0 | DB 모델링 및 쿼리 |
| PostgreSQL | - | 데이터베이스 |
| bcrypt | 6.0.0 | 비밀번호 해싱 |
| nodemailer | 8.0.8 | 이메일 전송 |
| pdf-parse | 1.1.4 | PDF 이력서 파싱 |
| mammoth | 1.12.0 | DOCX 이력서 파싱 |

## 환경변수 설정

`backend/.env` 파일을 생성합니다. (`backend/.env.example` 참고)

```env
PORT=3001
DATABASE_URL=postgresql://user:password@localhost:5432/ai_interview
AI_SERVER_URL=http://localhost:5050
MEDIA_SERVER_URL=http://localhost:4000

# 이메일 전송 (nodemailer + Gmail SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@gmail.com
SMTP_PASS=your_app_password
```

> **JWT_SECRET은 사용하지 않습니다.** 세션 토큰은 DB에 직접 저장하는 방식으로 관리합니다.

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

JWT를 사용하지 않고, **UUID 세션 토큰을 DB에 저장**하는 방식으로 인증합니다.

- **발급**: 로그인 / 회원가입 성공 시 UUID 토큰 생성 → DB 저장 → 클라이언트 반환
- **이중 로그인 방지**: 새 기기에서 로그인하면 기존 토큰을 덮어써 이전 기기 세션이 자동 만료
- **세션 만료**: 토큰은 발급 시점부터 **7일** 후 자동 만료
- **인증 방법**: 보호된 API 호출 시 `x-session-token` 헤더에 토큰 포함

```
GET /reports?email=user@example.com
x-session-token: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

## 이메일 전송 (nodemailer)

면접 완료 후 설문 응답과 함께 결과를 이메일로 발송하는 기능에 **nodemailer**를 사용합니다.

### 동작 방식

1. 면접 종료 후 사용자가 이메일 수신에 동의하면 주소 입력
2. `POST /email/send-results` 호출
3. 설문 응답은 이메일 동의 여부와 무관하게 **항상 DB에 저장**
4. 이메일 주소가 있을 경우에만 nodemailer로 HTML 메일 발송

### Gmail 앱 비밀번호 발급 방법

1. Google 계정 → **보안** → **2단계 인증** 활성화
2. **앱 비밀번호** 생성 (앱: 메일, 기기: Windows 컴퓨터 등)
3. 발급된 16자리 비밀번호를 `SMTP_PASS`에 입력

> SMTP 환경변수가 설정되지 않으면 이메일 전송을 건너뛰고 설문 저장만 진행합니다.

## API 엔드포인트

| Method | Path | 인증 필요 | 설명 |
|--------|------|:---------:|------|
| POST | `/auth/signup` | | 회원가입 (세션 토큰 발급) |
| POST | `/auth/login` | | 로그인 (세션 토큰 발급) |
| POST | `/auth/logout` | | 로그아웃 (세션 토큰 삭제) |
| DELETE | `/auth/user` | | 회원탈퇴 |
| POST | `/upload/resume` | | 이력서 업로드 (PDF/DOCX) |
| POST | `/upload/coverletter` | | 자소서 업로드 |
| GET | `/reports` | ✓ | 내 면접 기록 목록 |
| POST | `/reports` | ✓ | 리포트 저장 |
| DELETE | `/reports/:id` | ✓ | 리포트 삭제 |
| GET | `/knowledge` | ✓ | 전공지식 조회 |
| POST | `/knowledge` | ✓ | 전공지식 등록 (관리자) |
| DELETE | `/knowledge/:id` | ✓ | 전공지식 삭제 (관리자) |
| GET | `/admin/surveys` | ✓ | 설문 통계 조회 (관리자) |
| GET | `/admin/users` | ✓ | 사용자 목록 (관리자) |
| PATCH | `/admin/users/:id/role` | ✓ | 역할 변경 (관리자) |
| DELETE | `/admin/users/:id` | ✓ | 사용자 삭제 (관리자) |
| POST | `/email/send-results` | | 면접 결과 이메일 발송 + 설문 DB 저장 |
