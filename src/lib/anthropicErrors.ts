import Anthropic from "@anthropic-ai/sdk";

export function getAnthropicErrorInfo(err: unknown): { message: string; status: number } {
  if (err instanceof Anthropic.AuthenticationError) {
    return { message: "AI API 키가 유효하지 않습니다. 관리자에게 문의하세요.", status: 500 };
  }
  if (err instanceof Anthropic.PermissionDeniedError) {
    return { message: "AI API 크레딧이 부족합니다. 관리자에게 문의하세요.", status: 503 };
  }
  if (err instanceof Anthropic.RateLimitError) {
    return { message: "AI API 요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.", status: 429 };
  }
  if (err instanceof Error && (err.message?.includes("Overloaded") || err.message?.includes("529"))) {
    return { message: "AI 서버가 일시적으로 과부하 상태입니다. 잠시 후 다시 시도해주세요.", status: 503 };
  }
  return { message: "AI 서버와 통신에 실패했습니다.", status: 500 };
}
