export interface TradeLog {
  id: number;
  date: string;
  ticker: string;
  name: string;
  type: "BUY" | "SELL";
  price: number;
  quantity: number;
  reasonTags: string[];
  emotion: string | null;
  memo: string | null;
  realizedPnlRate?: number | null;
  account: {
    memo: string | null;
    brokerageCompany: { name: string };
  };
}

export interface AccountOption {
  id: number;
  memo: string | null;
  brokerageCompany: { code: string; name: string };
  holdings: { ticker: string; name: string; country: string; avgPrice: number; quantity: number }[];
  cashBalances: { currency: string; amount: number }[];
}

export interface Filters {
  dateFrom: string;
  dateTo: string;
  accountId: string;
  tradeType: "" | "BUY" | "SELL";
  market: "" | "KR" | "US";
  keyword: string;
}

export const INITIAL_FILTERS: Filters = {
  dateFrom: "",
  dateTo: "",
  accountId: "",
  tradeType: "",
  market: "",
  keyword: "",
};

export function getCountryFromTicker(ticker: string): "KR" | "US" {
  return ticker.length <= 6 && /^\d+$/.test(ticker) ? "KR" : "US";
}

export function formatTradeDate(date: string, short = false): string {
  const d = new Date(date);
  const yy = String(d.getFullYear()).slice(2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return short ? `${mm}.${dd}` : `${yy}.${mm}.${dd}`;
}

export function formatPrice(trade: { price: number; ticker: string }): string {
  const country = getCountryFromTicker(trade.ticker);
  return country === "US"
    ? `$${trade.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : `₩${trade.price.toLocaleString()}`;
}

export function formatTotal(trade: { price: number; quantity: number; ticker: string }): string {
  const total = trade.price * trade.quantity;
  const country = getCountryFromTicker(trade.ticker);
  return country === "US"
    ? `$${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : `₩${total.toLocaleString()}`;
}

export const QUICK_DATE_OPTIONS = [
  { label: "최근 1주", days: 7 },
  { label: "최근 1개월", days: 30 },
  { label: "최근 3개월", days: 90 },
  { label: "최근 6개월", days: 180 },
  { label: "최근 1년", days: 365 },
  { label: "전체", days: -1 },
] as const;

export function getDateFrom(days: number): string {
  if (days === -1) return "2000-01-01";
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}
