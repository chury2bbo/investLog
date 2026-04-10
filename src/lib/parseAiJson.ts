/**
 * Claude API 응답 텍스트에서 JSON 객체를 안전하게 추출하고 파싱한다.
 *
 * 처리 순서:
 * 1) ```json ... ``` 코드 블록이 있으면 안쪽 텍스트만 사용
 * 2) 첫 `{` 부터 마지막 `}` 까지를 JSON 후보로 추출
 * 3) JSON.parse 시도 — 실패 시 null 반환
 *
 * @returns 파싱된 객체. 파싱 실패 시 null.
 */
export function parseAiJson<T = unknown>(text: string): T | null {
  if (!text) return null;

  // 1) 마크다운 코드블록 안쪽 추출
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const source = codeBlockMatch ? codeBlockMatch[1].trim() : text;

  // 2) 첫 `{` ~ 마지막 `}` 추출 (greedy)
  const start = source.indexOf("{");
  const end = source.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  const jsonStr = source.slice(start, end + 1);

  // 3) JSON.parse
  try {
    return JSON.parse(jsonStr) as T;
  } catch {
    return null;
  }
}
