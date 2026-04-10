## Resume Upload API

### POST `/upload/resume`

이력서/문서 파일을 업로드하고 텍스트 추출 및 분석 결과를 반환합니다.

- Supported files: `.pdf`, `.docx`
- Max file size: `10MB`

### Request
- Content-Type: `multipart/form-data`

| key | type | required |
|-----|------|----------|
| file | File | O |

### Success Response
```json
{
  "message": "파일 업로드, 텍스트 추출, 분석 성공",
  "originalname": "resume.docx",
  "filename": "saved-file-name",
  "path": "uploads\\saved-file-name",
  "size": 18098,
  "extractedText": "문서 내용...",
  "analysisResult": {
    "summary": "문서 요약",
    "questions": [
      "질문1",
      "질문2",
      "질문3"
    ],
    "keywords": [
      "키워드1",
      "키워드2",
      "키워드3"
    ]
  }
}