type Entry = { subject: string; content: string }

const PICK_LIMIT = 10

// 직무별로 우선 참고할 전공 과목 (KnowledgeEntry.subject 기준)
const ROLE_SUBJECTS: Record<string, string[]> = {
  "백엔드 개발자": ["데이터베이스", "웹 개발", "네트워크", "운영체제", "자료구조", "알고리즘", "객체지향 프로그래밍", "클라우드·DevOps", "정보보안"],
  "프론트엔드 개발자": ["프론트엔드", "웹 개발", "네트워크", "자료구조", "알고리즘", "정보보안", "소프트웨어 공학"],
  "풀스택 개발자": ["웹 개발", "프론트엔드", "데이터베이스", "네트워크", "클라우드·DevOps", "정보보안", "객체지향 프로그래밍"],
  "모바일 개발자": ["모바일", "객체지향 프로그래밍", "운영체제", "네트워크", "자료구조", "소프트웨어 공학"],
  "AI/ML 엔지니어": ["AI·머신러닝", "데이터 엔지니어링", "알고리즘", "자료구조", "운영체제", "데이터베이스"],
  "데이터 엔지니어": ["데이터 엔지니어링", "데이터베이스", "클라우드·DevOps", "알고리즘", "운영체제", "AI·머신러닝"],
  "DevOps 엔지니어": ["클라우드·DevOps", "운영체제", "네트워크", "정보보안", "소프트웨어 공학", "데이터베이스"],
  "보안 엔지니어": ["정보보안", "네트워크", "운영체제", "웹 개발", "클라우드·DevOps"],
  "QA 엔지니어": ["소프트웨어 공학", "웹 개발", "객체지향 프로그래밍", "데이터베이스", "프론트엔드"],
  "임베디드 개발자": ["컴퓨터 구조·임베디드", "운영체제", "자료구조", "알고리즘", "네트워크", "객체지향 프로그래밍"],
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j]!, a[i]!]
  }
  return a
}

// 직무 관련 과목 위주로 무작위 추출하되, 과목을 번갈아 뽑아 한 과목에 쏠리지 않게 한다
export function pickKnowledge(entries: Entry[], jobRole?: string): Entry[] {
  const preferred = jobRole ? ROLE_SUBJECTS[jobRole] : undefined
  const related = preferred ? entries.filter(e => preferred.includes(e.subject)) : []
  const pool = related.length > 0 ? related : entries

  const bySubject = new Map<string, Entry[]>()
  for (const e of shuffle(pool)) {
    if (!bySubject.has(e.subject)) bySubject.set(e.subject, [])
    bySubject.get(e.subject)!.push(e)
  }

  const queues = shuffle([...bySubject.values()])
  const picked: Entry[] = []
  while (picked.length < PICK_LIMIT && queues.some(q => q.length > 0)) {
    for (const q of queues) {
      const e = q.shift()
      if (e) picked.push(e)
      if (picked.length >= PICK_LIMIT) break
    }
  }
  return picked
}
