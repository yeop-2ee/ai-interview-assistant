# Frontend

Next.js 기반 AI 면접 어시스턴트 프론트엔드입니다.

## 기술 스택

| 기술 | 버전 |
|------|------|
| Next.js | 16.2.1 |
| React | 19.2.4 |
| TypeScript | 5.x |
| Tailwind CSS | 4.x |
| MediaPipe Tasks Vision | 0.10.34 |
| jsPDF | 4.2.1 |

## 폴더 구조

```
src/
├── app/
│   ├── page.tsx          # 홈 (메인 랜딩)
│   ├── login/            # 로그인 (일반 / 관리자)
│   ├── signup/           # 회원가입
│   ├── setup/            # 면접 유형·스타일·난이도 설정
│   ├── upload/           # 이력서·자소서 업로드 + AI 분석
│   ├── interview/        # 실시간 AI 화상 면접
│   ├── report/           # 결과 리포트 + PDF 다운로드
│   ├── profile/          # 면접 기록 조회·삭제
│   └── admin/            # 전공지식 DB 관리 (관리자 전용)
├── components/           # 공통 UI 컴포넌트
├── hooks/                # 커스텀 훅 (얼굴분석, 카메라, 질문관리)
├── lib/                  # SSE 스트림 유틸리티
└── types/                # 타입 선언
```

## 환경변수 설정

`.env.local` 파일을 생성합니다.

```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
NEXT_PUBLIC_MEDIA_API=http://localhost:4000
```

## 설치 및 실행

```bash
npm install
npm run dev   # http://localhost:3000
```

### 빌드

```bash
npm run build
npm start
```

## 인증 및 세션 관리

로그인 성공 시 서버에서 발급받은 세션 토큰을 `localStorage`에 저장합니다.

| 키 | 설명 |
|----|------|
| `isLoggedIn` | 로그인 여부 (`"true"`) |
| `userName` | 사용자 이름 |
| `userEmail` | 사용자 이메일 |
| `userRole` | 역할 (`"user"` \| `"admin"`) |
| `sessionToken` | 서버 발급 UUID 세션 토큰 (7일 유효) |

- 보호 API 호출 시 `Navbar.tsx`의 **`authFetch`** 유틸리티를 사용합니다.
- `authFetch`는 자동으로 `x-session-token` 헤더를 추가하고, 401 응답 시 로컬 스토리지를 초기화하고 로그인 페이지로 이동합니다.
- 다른 기기에서 로그인하면 기존 세션이 서버에서 만료되어 다음 API 호출 시 자동 로그아웃됩니다.

## 주요 기능

- **이력서 업로드**: PDF / DOCX 드래그&드롭 → AI 요약 카드 + 학과 관련성 검사
- **실시간 면접**: 카메라·마이크 장치 선택, 화면 레이아웃 선택, 90초 답변 녹음
- **STT 검토**: 녹음 → 텍스트 변환 → 수정·재답변 가능
- **얼굴 분석**: MediaPipe로 시선 방향·눈 깜빡임 실시간 감지 (200ms 주기)
- **결과 리포트**: 종합 점수, 영역별 점수, 질문별 피드백, PDF 다운로드
- **면접 결과 이메일 발송**: 결과 리포트를 이메일로 전송
