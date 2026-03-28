/**
 * videoCache.js
 * D-ID로 생성된 아바타 영상 URL을 캐싱하여 동일 질문 재요청 시 재사용
 * 캐시 키: 질문 텍스트의 해시값
 */

const crypto = require('crypto');

// 메모리 캐시 (서버 재시작 시 초기화됨)
// 운영 환경에서는 Redis로 교체 권장
const cache = new Map();

// 캐시 만료 시간 (24시간)
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * 텍스트를 해시키로 변환
 * @param {string} text
 * @returns {string}
 */
function hashText(text) {
  return crypto.createHash('md5').update(text).digest('hex');
}

/**
 * 캐시에서 영상 URL 조회
 * @param {string} text - 질문 텍스트
 * @returns {string|null} 캐싱된 영상 URL 또는 null
 */
function getCache(text) {
  const key = hashText(text);
  const entry = cache.get(key);

  if (!entry) return null;

  // 만료 확인
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }

  return entry.url;
}

/**
 * 영상 URL을 캐시에 저장
 * @param {string} text - 질문 텍스트
 * @param {string} url - 영상 URL
 */
function setCache(text, url) {
  const key = hashText(text);
  cache.set(key, {
    url,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}

/**
 * 특정 항목 캐시 삭제
 * @param {string} text
 */
function deleteCache(text) {
  const key = hashText(text);
  cache.delete(key);
}

/**
 * 전체 캐시 초기화
 */
function clearCache() {
  cache.clear();
}

/**
 * 현재 캐시 크기 반환
 * @returns {number}
 */
function getCacheSize() {
  return cache.size;
}

module.exports = { getCache, setCache, deleteCache, clearCache, getCacheSize };
