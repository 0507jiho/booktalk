/** 알라딘 API는 http:// URL을 반환하는데, iOS ATS가 HTTP를 차단하므로 https://로 변환 */
export function fixImageUrl(url: string | undefined | null): string {
  if (!url) return '';
  return url.replace(/^http:\/\//, 'https://');
}
