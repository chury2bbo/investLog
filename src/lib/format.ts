/** 원화 금액을 억/만 단위로 축약 */
export function formatKRW(value: number): string {
  if (Math.abs(value) >= 1_0000_0000) {
    return `${Math.floor((value / 1_0000_0000) * 10) / 10}억`;
  }
  if (Math.abs(value) >= 1_0000) {
    return `${Math.floor((value / 10000) * 10) / 10}만`;
  }
  return Math.floor(value).toLocaleString();
}

/** 원화/달러 금액을 축약 표시 (₩1.2억, $1.2K) */
export function formatCompact(value: number, currency: string): string {
  if (currency === "USD") {
    if (Math.abs(value) >= 1000) return `$${(value / 1000).toFixed(1)}K`;
    return `$${value.toFixed(0)}`;
  }
  return `₩${formatKRW(value)}`;
}

/** 통화 기호 포함 금액 표시 (₩1,000 / $1,000) */
export function formatCash(amount: number, currency: string): string {
  if (currency === "USD") {
    return `$${amount.toLocaleString()}`;
  }
  return `₩${amount.toLocaleString()}`;
}

/** 국가별 가격 표시 (₩72,000 / $120.50) */
export function formatPrice(value: number, country: string): string {
  if (country !== "KR") {
    return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `₩${value.toLocaleString()}`;
}

/** 숫자 문자열에 천 단위 콤마 (소수점 보존) */
export function fmtNum(val: string): string {
  if (!val) return "";
  const [int, dec] = val.split(".");
  const formatted = int.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return dec !== undefined ? `${formatted}.${dec}` : formatted;
}

/** 문자열에서 숫자만 추출 (allowDot=true면 소수점 허용) */
export function stripNum(val: string, allowDot = false): string {
  return allowDot ? val.replace(/[^0-9.]/g, "") : val.replace(/[^0-9]/g, "");
}
