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

## 주요 기능

- **이력서 업로드**: PDF / DOCX 드래그&드롭 → AI 요약 카드 + 학과 관련성 검사
- **실시간 면접**: 카메라·마이크 장치 선택, 화면 레이아웃 선택, 90초 답변 녹음
- **STT 검토**: 녹음 → 텍스트 변환 → 수정·재답변 가능
- **얼굴 분석**: MediaPipe로 시선 방향·눈 깜빡임 실시간 감지 (200ms 주기)
- **결과 리포트**: 종합 점수, 영역별 점수, 질문별 피드백, PDF 다운로드
