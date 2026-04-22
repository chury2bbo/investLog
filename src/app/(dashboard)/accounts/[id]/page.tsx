"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Card,
  Button,
  Tag,
  PnlTag,
  SectionTitle,
  Input,
  LoadingSpinner,
  EmptyState,
  BottomSheet,
  Divider,
  ConfirmDialog,
  ThemeToggle,
  Skeleton,
  Toast,
  DatePicker,
  Tabs,
} from "@/components/ui";
import SectorDonutChart from "@/components/SectorDonutChart";
import { ImportModal } from "@/components/ImportModal";

import { formatKRW, fmtNum, stripNum } from "@/lib/format";

// ─── 타입 ────────────────────────────────────────────────

interface Holding {
  id: number;
  ticker: string;
  name: string;
  country: string;
  avgPrice: number;
  quantity: number;
  sectorAuto: string | null;
  sectorManual: string | null;
  tags: string[];
}

interface QuoteResult {
  ticker: string;
  price: number;
  change: number;
  changePercent: number;
}

interface CashBalance {
  id: number;
  currency: string;
  amount: number;
}

interface TradeLog {
  id: number;
  date: string;
  ticker: string;
  name: string;
  type: string;
  price: number;
  quantity: number;
}

interface CashLog {
  id: number;
  date: string;
  type: string;
  currency: string;
  amount: number;
  memo: string | null;
  ticker: string | null;
  tradeLogId: number | null;
}

interface AccountDetail {
  id: number;
  accountCode: string;
  memo: string | null;
  brokerageCompany: { code: string; name: string };
  holdings: Holding[];
  cashBalances: CashBalance[];
  tradeLogs: TradeLog[];
  cashLogs: CashLog[];
}

// ─── 메인 페이지 ─────────────────────────────────────────

export default function AccountDetailPage() {
  const params = useParams();
  const router = useRouter();
  const accountId = params.id as string;

  const [account, setAccount] = useState<AccountDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [quotes, setQuotes] = useState<Record<string, QuoteResult>>({});
  const [quotesLoading, setQuotesLoading] = useState(false);
  const [usdRate, setUsdRate] = useState(1400);

  // 탭
  const [activeTab, setActiveTab] = useState<"holdings" | "trades" | "cashflow">("holdings");

  // 통화 표시 토글 (외화 원본 / 원화 환산)
  const [displayCurrency, setDisplayCurrency] = useState<"original" | "KRW">("original");

  // 입출금 모달
  const [cashModal, setCashModal] = useState<"deposit_choose" | "deposit" | "withdraw" | "dividend" | null>(null);
  const [cashCurrency, setCashCurrency] = useState("KRW");
  const [cashAmount, setCashAmount] = useState("");
  const [cashSubmitting, setCashSubmitting] = useState(false);
  const [cashError, setCashError] = useState("");
  const cashAmountRef = useRef<HTMLInputElement>(null);

  // 입금/출금 날짜
  const [cashDate, setCashDate] = useState(() => {
    const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
    return kst.toISOString().slice(0, 10);
  });

  // 배당금 전용 state
  const [divTicker, setDivTicker] = useState("");
  const [divName, setDivName] = useState("");
  const [divShowHoldings, setDivShowHoldings] = useState(false);
  const [divQuery, setDivQuery] = useState("");
  const [divDate, setDivDate] = useState(() => {
    const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
    return kst.toISOString().slice(0, 10);
  });
  const [divSearchResults, setDivSearchResults] = useState<{ ticker: string; name: string; market: string }[]>([]);
  const [divShowDropdown, setDivShowDropdown] = useState(false);
  const divSearchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 입출금 팝업 열릴 때 금액 입력란 자동 포커스
  useEffect(() => {
    if (cashModal !== null) {
      setTimeout(() => cashAmountRef.current?.focus(), 100);
    }
  }, [cashModal]);

  // 계좌 삭제 모달
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // 종목 등록 모달
  const [holdingModal, setHoldingModal] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [hTicker, setHTicker] = useState("");
  const [hName, setHName] = useState("");
  const [hCountry, setHCountry] = useState("KR");
  const [hAvgPrice, setHAvgPrice] = useState("");
  const [hQuantity, setHQuantity] = useState("");
  const [hSubmitting, setHSubmitting] = useState(false);
  const [hError, setHError] = useState("");
  const [hPriceLoading, setHPriceLoading] = useState(false);

  // 종목 수정 모달 (평단가/수량)
  const [holdingEditModal, setHoldingEditModal] = useState(false);
  const [holdingEditTarget, setHoldingEditTarget] = useState<Holding | null>(null);
  const [holdingEditPrice, setHoldingEditPrice] = useState("");
  const [holdingEditQty, setHoldingEditQty] = useState("");
  const [holdingEditSubmitting, setHoldingEditSubmitting] = useState(false);
  const [holdingEditError, setHoldingEditError] = useState("");

  // 종목 삭제 확인
  const [holdingDeleteConfirm, setHoldingDeleteConfirm] = useState<Holding | null>(null);
  const [holdingDeleting, setHoldingDeleting] = useState(false);

  // 배당 이력
  const [divLogs, setDivLogs] = useState<CashLog[]>([]);

  // 배당 이력 삭제
  const [divDeleteConfirm, setDivDeleteConfirm] = useState<number | null>(null);
  const [divDeleting, setDivDeleting] = useState(false);
  const [cashDeleteConfirm, setCashDeleteConfirm] = useState<number | null>(null);
  const [cashDeleting, setCashDeleting] = useState(false);

  // 보유종목 매매내역 조회 모달
  const [holdingTradesTarget, setHoldingTradesTarget] = useState<Holding | null>(null);
  const [holdingTrades, setHoldingTrades] = useState<TradeLog[]>([]);
  const [holdingTradesLoading, setHoldingTradesLoading] = useState(false);

  const openHoldingTrades = useCallback(async (h: Holding) => {
    setHoldingTradesTarget(h);
    setHoldingTrades([]);
    setHoldingTradesLoading(true);
    try {
      const res = await fetch(`/api/trades?accountId=${accountId}&ticker=${encodeURIComponent(h.ticker)}&take=1000`);
      const json = await res.json();
      setHoldingTrades(json.data ?? []);
    } catch {
      setHoldingTrades([]);
    } finally {
      setHoldingTradesLoading(false);
    }
  }, [accountId]);

  // 물타기 계산기
  const [avgDownHolding, setAvgDownHolding] = useState<Holding | null>(null);
  const [avgDownPrice, setAvgDownPrice] = useState("");
  const [avgDownQty, setAvgDownQty] = useState("");
  const avgDownQtyRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!avgDownHolding) return;
    const t = setTimeout(() => avgDownQtyRef.current?.focus(), 200);
    return () => clearTimeout(t);
  }, [avgDownHolding]);

  // 섹터 편집 모달
  const [sectorEditModal, setSectorEditModal] = useState(false);
  const [sectorEditHolding, setSectorEditHolding] = useState<Holding | null>(null);
  const [sectorEditValue, setSectorEditValue] = useState("");
  const [sectorEditTags, setSectorEditTags] = useState<string[]>([]);
  const [sectorEditTagInput, setSectorEditTagInput] = useState("");
  const [sectorEditSubmitting, setSectorEditSubmitting] = useState(false);

  // 토스트
  const [toast, setToast] = useState<{ title: string; message: string; visible: boolean; variant?: "success" | "error" }>({ title: "", message: "", visible: false });
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showToast(title: string, message: string, opts?: { variant?: "success" | "error" }) {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ title, message, visible: true, variant: opts?.variant });
    toastTimerRef.current = setTimeout(() => setToast((p) => ({ ...p, visible: false })), 3500);
  }

  // 국내 종목 검색 autocomplete
  const [hStockQuery, setHStockQuery] = useState("");
  const [hStockResults, setHStockResults] = useState<{ ticker: string; name: string; market: string }[]>([]);
  const [hShowDropdown, setHShowDropdown] = useState(false);
  const [hActiveIndex, setHActiveIndex] = useState(-1);
  const hSearchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hStockSearchRef = useRef<HTMLDivElement>(null);
  const hInputRef = useRef<HTMLInputElement>(null);
  const hItemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const hAvgPriceRef = useRef<HTMLInputElement>(null);

  // 음성 인식
  const [hIsListening, setHIsListening] = useState(false);
  const [hMicError, setHMicError] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const hRecognitionRef = useRef<any>(null);
  const hSpeechSupported =
    typeof window !== "undefined" &&
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  // ─── 데이터 로딩 ───────────────────────────────────────

  const fetchAccount = useCallback(async () => {
    try {
      const res = await fetch(`/api/accounts`);
      if (!res.ok) return;
      const accounts = await res.json();
      if (!Array.isArray(accounts)) return;
      const acc = accounts.find((a: AccountDetail) => a.id === parseInt(accountId, 10));
      if (!acc) return;

      // 매매 이력 조회
      const tradesRes = await fetch(`/api/trades?accountId=${accountId}&take=10`);
      const tradesJson = tradesRes.ok ? await tradesRes.json() : [];
      const trades = Array.isArray(tradesJson) ? tradesJson : tradesJson.data ?? [];

      // 입출금 이력 조회 (배당 제외, 최근 20개)
      const cashLogsRes = await fetch(`/api/cash?accountId=${accountId}`);
      const cashLogs = cashLogsRes.ok ? await cashLogsRes.json() : [];

      // 배당 이력 전체 조회
      const divLogsRes = await fetch(`/api/cash?accountId=${accountId}&type=DIVIDEND`);
      const divLogsJson = divLogsRes.ok ? await divLogsRes.json() : [];
      setDivLogs(Array.isArray(divLogsJson) ? divLogsJson : []);

      const accountData = {
        ...acc,
        tradeLogs: trades.slice(0, 10),
        cashLogs: Array.isArray(cashLogs) ? cashLogs : [],
      };
      setAccount(accountData);

      // 현재가 + 환율 병렬 조회
      const tickers = acc.holdings.map((h: Holding) => h.ticker);
      setQuotesLoading(true);
      try {
        const [qRes, fxRes] = await Promise.all([
          tickers.length > 0
            ? fetch(`/api/market/quote?tickers=${tickers.join(",")}`)
            : null,
          fetch("/api/market/quote?ticker=USDKRW"),
        ]);
        if (qRes?.ok) {
          const qData = await qRes.json();
          const map: Record<string, QuoteResult> = {};
          (qData.quotes ?? []).forEach((q: QuoteResult) => {
            map[q.ticker] = q;
          });
          setQuotes(map);
        }
        if (fxRes.ok) {
          const fxData = await fxRes.json();
          if (fxData.price) setUsdRate(fxData.price);
        }
      } catch {
        /* 조회 실패 */
      } finally {
        setQuotesLoading(false);
      }
    } catch {
      /* 조회 실패 */
    } finally {
      setLoading(false);
    }
  }, [accountId]);

  useEffect(() => {
    fetchAccount();
  }, [fetchAccount]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (hStockSearchRef.current && !hStockSearchRef.current.contains(e.target as Node)) {
        setHShowDropdown(false);
        setHActiveIndex(-1);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 음성 인식 cleanup
  useEffect(() => {
    return () => { hRecognitionRef.current?.stop(); };
  }, []);

  // 키보드 드롭다운 포커스 이동
  useEffect(() => {
    if (hActiveIndex === -1) {
      hInputRef.current?.focus();
    } else {
      hItemRefs.current[hActiveIndex]?.focus();
    }
  }, [hActiveIndex]);

  // 검색 결과 바뀌면 선택 초기화
  useEffect(() => {
    setHActiveIndex(-1);
  }, [hStockResults]);

  // ─── 입출금 처리 ───────────────────────────────────────

  async function handleCashSubmit() {
    if (!cashAmount || !account) return;
    if (cashModal === "dividend" && !divTicker) {
      setCashError("종목을 선택해주세요.");
      return;
    }
    setCashSubmitting(true);
    setCashError("");

    const amount = parseFloat(cashAmount.replace(/,/g, ""));
    const type = cashModal === "deposit" ? "DEPOSIT" : cashModal === "withdraw" ? "WITHDRAW" : "DIVIDEND";

    try {
      const res = await fetch("/api/cash", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: account.id,
          type,
          currency: cashCurrency,
          amount,
          ...(cashModal === "dividend" ? { ticker: divTicker, name: divName, date: divDate } : { date: cashDate }),
        }),
      });

      if (res.ok) {
        setCashModal(null);
        setCashAmount("");
        setCashError("");
        setDivTicker("");
        setDivName("");
        setDivQuery("");
        setDivShowHoldings(false);
        fetchAccount();
      } else {
        const data = await res.json();
        setCashError(data.error ?? "처리에 실패했습니다.");
      }
    } catch {
      setCashError("네트워크 오류가 발생했습니다.");
    } finally {
      setCashSubmitting(false);
    }
  }

  // ─── 배당금 종목 검색 ────────────────────────────────────

  function handleDivQueryChange(val: string) {
    setDivQuery(val);
    setDivTicker("");
    setDivName("");
    if (divSearchTimerRef.current) clearTimeout(divSearchTimerRef.current);
    if (!val.trim()) { setDivSearchResults([]); setDivShowDropdown(false); return; }
    setDivShowDropdown(true);
    divSearchTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/market/search?q=${encodeURIComponent(val.trim())}&country=ALL`);
        if (res.ok) {
          const data = await res.json();
          setDivSearchResults(Array.isArray(data) ? data : []);
        }
      } catch { /* 검색 실패 */ }
    }, 300);
  }

  function selectDivStock(ticker: string, name: string) {
    setDivTicker(ticker);
    setDivName(name);
    setDivQuery(name);
    setDivSearchResults([]);
    setDivShowDropdown(false);
  }

  // ─── 종목 등록 처리 ────────────────────────────────────

  function resetHoldingForm() {
    setHTicker("");
    setHName("");
    setHCountry("KR");
    setHAvgPrice("");
    setHQuantity("");
    setHError("");
    setHStockQuery("");
    setHStockResults([]);
    setHShowDropdown(false);
    setHPriceLoading(false);
    hRecognitionRef.current?.stop();
    setHIsListening(false);
    setHMicError(null);
  }

  function handleHStockQueryChange(val: string) {
    setHStockQuery(val);

    if (hSearchTimerRef.current) clearTimeout(hSearchTimerRef.current);

    if (!val.trim()) {
      setHStockResults([]);
      setHShowDropdown(false);
      return;
    }

    setHShowDropdown(true);
    hSearchTimerRef.current = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ q: val.trim() });
        if (hCountry === "US") params.set("country", "US");
        const res = await fetch(`/api/market/search?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setHStockResults(Array.isArray(data) ? data : []);
        }
      } catch {
        /* 검색 실패 */
      }
    }, 300);
  }

  function startHListening() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const recognition = new SR();
    hRecognitionRef.current = recognition;
    recognition.lang = "ko-KR";
    recognition.continuous = false;
    recognition.interimResults = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (e: any) => {
      const transcript: string = e.results[0][0].transcript;
      setHIsListening(false);
      handleHStockQueryChange(transcript);
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onerror = (e: any) => {
      setHIsListening(false);
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        setHMicError("마이크 권한이 차단되어 있습니다.\n브라우저 주소창 왼쪽 자물쇠 아이콘을 클릭해 마이크를 허용해 주세요.");
      }
    };
    recognition.onend = () => setHIsListening(false);
    setHMicError(null);
    recognition.start();
    setHIsListening(true);
  }

  function stopHListening() {
    hRecognitionRef.current?.stop();
    setHIsListening(false);
  }

  async function selectHStock(stock: { ticker: string; name: string; market: string }) {
    setHTicker(stock.ticker);
    setHName(stock.name);
    setHStockQuery("");
    setHShowDropdown(false);
    setHStockResults([]);

    // 현재가 조회 → 평단가 자동 입력
    setHPriceLoading(true);
    try {
      const res = await fetch(`/api/market/quote?tickers=${encodeURIComponent(stock.ticker)}`);
      if (res.ok) {
        const data = await res.json();
        const quote = (data.quotes ?? [])[0];
        if (quote?.price && quote.price > 0) {
          setHAvgPrice(String(quote.price));
        }
      }
    } catch {
      /* 현재가 조회 실패 시 빈칸 유지 */
    } finally {
      setHPriceLoading(false);
      setTimeout(() => hAvgPriceRef.current?.focus(), 50);
    }
  }

  async function handleAddHolding() {
    if (!hTicker || !hName || !hAvgPrice || !hQuantity) {
      setHError("필수 항목을 모두 입력해주세요.");
      return;
    }

    setHSubmitting(true);
    setHError("");

    try {
      const res = await fetch("/api/holdings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: parseInt(accountId, 10),
          ticker: hTicker,
          name: hName,
          country: hCountry,
          avgPrice: parseFloat(hAvgPrice),
          quantity: parseInt(hQuantity, 10),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setHError(data.error || "등록에 실패했습니다.");
        return;
      }

      setHoldingModal(false);
      resetHoldingForm();
      fetchAccount();
      showToast("종목 추가 완료", `${hName}(${hTicker})이(가) 등록되었습니다.`, { variant: "success" });
    } catch {
      setHError("네트워크 오류가 발생했습니다.");
    } finally {
      setHSubmitting(false);
    }
  }

  // ─── 종목 수정 (평단가/수량) ──────────────────────────────

  function openHoldingEdit(h: Holding) {
    setHoldingEditTarget(h);
    setHoldingEditPrice(String(h.country === "KR" ? Math.floor(h.avgPrice) : h.avgPrice));
    setHoldingEditQty(String(h.quantity));
    setHoldingEditError("");
    setHoldingEditModal(true);
  }

  async function handleHoldingEditSubmit() {
    if (!holdingEditTarget) return;
    const avgPrice = parseFloat(holdingEditPrice.replace(/,/g, ""));
    const quantity = parseInt(holdingEditQty.replace(/,/g, ""), 10);
    if (!avgPrice || !quantity || avgPrice <= 0 || quantity <= 0) {
      setHoldingEditError("평단가와 수량을 올바르게 입력해주세요.");
      return;
    }
    setHoldingEditSubmitting(true);
    setHoldingEditError("");
    try {
      const res = await fetch(`/api/holdings/${holdingEditTarget.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avgPrice, quantity }),
      });
      if (res.ok) {
        setHoldingEditModal(false);
        fetchAccount();
        showToast("종목 수정 완료", `${holdingEditTarget.name} 정보가 수정되었습니다.`, { variant: "success" });
      } else {
        const data = await res.json();
        setHoldingEditError(data.error ?? "수정 실패");
      }
    } catch {
      setHoldingEditError("오류가 발생했습니다.");
    } finally {
      setHoldingEditSubmitting(false);
    }
  }

  // ─── 종목 삭제 ──────────────────────────────────────────

  async function handleHoldingDelete() {
    if (!holdingDeleteConfirm) return;
    setHoldingDeleting(true);
    try {
      const deletedName = holdingDeleteConfirm.name;
      const res = await fetch(`/api/holdings/${holdingDeleteConfirm.id}`, { method: "DELETE" });
      if (res.ok) {
        setHoldingDeleteConfirm(null);
        fetchAccount();
        showToast("종목 삭제 완료", `${deletedName}이(가) 삭제되었습니다.`, { variant: "success" });
      }
    } catch {
      /* 실패 */
    } finally {
      setHoldingDeleting(false);
    }
  }

  // ─── 섹터 편집 ─────────────────────────────────────────

  function openSectorEdit(h: Holding) {
    setSectorEditHolding(h);
    setSectorEditValue(h.sectorManual ?? "");
    setSectorEditTags(h.tags ?? []);
    setSectorEditTagInput("");
    setSectorEditModal(true);
  }

  async function handleSectorEditSubmit() {
    if (!sectorEditHolding) return;
    setSectorEditSubmitting(true);
    try {
      const res = await fetch(`/api/holdings/${sectorEditHolding.id}/sector`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sectorManual: sectorEditValue || null,
          tags: sectorEditTags,
        }),
      });
      if (res.ok) {
        setSectorEditModal(false);
        fetchAccount();
      }
    } catch {
      /* 실패 */
    } finally {
      setSectorEditSubmitting(false);
    }
  }

  function addSectorTag() {
    const tag = sectorEditTagInput.trim();
    if (tag && !sectorEditTags.includes(tag)) {
      setSectorEditTags([...sectorEditTags, tag]);
    }
    setSectorEditTagInput("");
  }

  // ─── 섹터 분포 계산 ───────────────────────────────────

  // ─── 계좌 삭제 처리 ────────────────────────────────────

  async function handleDeleteAccount() {
    if (!account) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/accounts/${account.id}`, { method: "DELETE" });
      if (res.ok) {
        router.push("/accounts");
      }
    } catch {
      /* 삭제 실패 */
    } finally {
      setDeleting(false);
    }
  }

  // ─── 배당 이력 삭제 ───────────────────────────────────

  async function handleDeleteCashLog() {
    if (cashDeleteConfirm === null) return;
    setCashDeleting(true);
    try {
      const res = await fetch(`/api/cash/${cashDeleteConfirm}`, { method: "DELETE" });
      if (res.ok) {
        setCashDeleteConfirm(null);
        fetchAccount();
        showToast("삭제 완료", "입출금 이력이 삭제되었습니다.", { variant: "success" });
      } else {
        const data = await res.json();
        setCashDeleteConfirm(null);
        showToast("삭제 실패", data.error ?? "삭제에 실패했습니다.", { variant: "error" });
      }
    } catch {
      /* 삭제 실패 */
    } finally {
      setCashDeleting(false);
    }
  }

  async function handleDeleteDividend() {
    if (divDeleteConfirm === null) return;
    setDivDeleting(true);
    try {
      const res = await fetch(`/api/cash/${divDeleteConfirm}`, { method: "DELETE" });
      if (res.ok) {
        setDivDeleteConfirm(null);
        fetchAccount();
        showToast("삭제 완료", "배당 이력이 삭제되었습니다.", { variant: "success" });
      } else {
        const data = await res.json();
        setDivDeleteConfirm(null);
        showToast("삭제 실패", data.error ?? "삭제에 실패했습니다.", { variant: "error" });
      }
    } catch {
      /* 삭제 실패 */
    } finally {
      setDivDeleting(false);
    }
  }

  // ─── 캡처 불러오기 확인 ────────────────────────────────

  async function handleImportConfirm(
    importedHoldings: { ticker: string; name: string; avgPrice: string; quantity: string; country: string }[]
  ) {
    const failed: string[] = [];
    for (const h of importedHoldings) {
      try {
        const res = await fetch("/api/holdings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            accountId: parseInt(accountId, 10),
            ticker: h.ticker,
            name: h.name,
            country: h.country,
            avgPrice: parseFloat(h.avgPrice),
            quantity: parseInt(h.quantity, 10),
            replace: true,
          }),
        });
        if (!res.ok) failed.push(h.name);
      } catch {
        failed.push(h.name);
      }
    }
    fetchAccount();
    if (failed.length > 0) {
      showToast("일부 종목 등록 실패", `${failed.join(", ")} 등록에 실패했습니다.`, { variant: "error" });
    }
  }

  // ─── 섹터 분포: SectorDonutChart 컴포넌트 내부에서 계산 ───

  // ─── 로딩 / 에러 ──────────────────────────────────────

  if (loading) {
    return (
      <div className="w-full max-w-2xl md:max-w-5xl mx-auto px-5 py-6 pb-28 md:pb-6">
        {/* 헤더 (즉시 표시) */}
        <div className="flex items-center gap-2 mb-6">
          <button onClick={() => router.push("/accounts")} className="w-8 h-8 rounded-lg flex items-center justify-center bg-[var(--color-g100)] dark:bg-[var(--color-border)]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--color-text)]"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <div>
            <p className="text-sm text-[var(--color-g500)] dark:text-[var(--color-muted)]">계좌 상세</p>
            <Skeleton className="h-7 w-36 mt-1" />
          </div>
        </div>

        {/* 히어로 카드 스켈레톤 */}
        <div className="rounded-[20px] p-6 mb-4" style={{ background: "linear-gradient(135deg, var(--color-primary-dark) 0%, var(--color-primary) 100%)" }}>
          <Skeleton className="h-4 w-20 mb-2 !bg-white/20" />
          <Skeleton className="h-8 w-44 mb-4 !bg-white/20" />
          <div className="grid grid-cols-4 gap-1.5">
            <Skeleton className="h-3 w-12 !bg-white/15" />
            <Skeleton className="h-3 w-12 !bg-white/15" />
            <Skeleton className="h-3 w-12 !bg-white/15" />
            <Skeleton className="h-3 w-12 !bg-white/15" />
          </div>
          <div className="grid grid-cols-4 gap-1.5 mt-2">
            <Skeleton className="h-4 w-16 !bg-white/20" />
            <Skeleton className="h-4 w-16 !bg-white/20" />
            <Skeleton className="h-4 w-16 !bg-white/20" />
            <Skeleton className="h-4 w-16 !bg-white/20" />
          </div>
        </div>

        {/* 보유종목 스켈레톤 */}
        <div className="md:grid md:grid-cols-[1fr_340px] md:gap-5">
          <div>
            <Skeleton className="h-4 w-20 mb-3" />
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-2xl p-4 mb-2 bg-[var(--color-surface)] dark:bg-[var(--color-card)]" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                <div className="flex items-center gap-3">
                  <Skeleton className="w-10 h-10 !rounded-xl" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-24 mb-1.5" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                  <Skeleton className="h-5 w-16" />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 md:mt-0">
            <Skeleton className="h-4 w-24 mb-3" />
            <div className="rounded-2xl p-4 bg-[var(--color-surface)] dark:bg-[var(--color-card)]" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
              <Skeleton className="h-[200px] w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!account) {
    return (
      <div className="w-full max-w-2xl mx-auto px-5 py-6">
        <EmptyState message="계좌를 찾을 수 없습니다." />
      </div>
    );
  }

  const cashKRW = account.cashBalances.find((c) => c.currency === "KRW")?.amount ?? 0;
  const cashUSD = account.cashBalances.find((c) => c.currency === "USD")?.amount ?? 0;

  // 평가금 계산
  let evalKRW = 0;
  let evalUSD = 0;
  account.holdings.forEach((h) => {
    const quote = quotes[h.ticker];
    const curPrice = quote?.price || h.avgPrice;
    if (h.country !== "KR") evalUSD += curPrice * h.quantity;
    else evalKRW += curPrice * h.quantity;
  });
  const totalKRW = cashKRW + cashUSD * usdRate + evalKRW + evalUSD * usdRate;

  // 총 투자금 (원화 환산) + 수익률
  let investedKRW = 0;
  let investedUSD = 0;
  account.holdings.forEach((h) => {
    if (h.country !== "KR") investedUSD += h.avgPrice * h.quantity;
    else investedKRW += h.avgPrice * h.quantity;
  });
  const totalInvested = investedKRW + investedUSD * usdRate;
  const totalEvalKRW = evalKRW + evalUSD * usdRate;

  // KRW 단위 통일: 최대값 기준으로 억/만 결정
  const maxKRW = Math.max(investedKRW, cashKRW, evalKRW, totalKRW);
  const useOk = maxKRW >= 1_0000_0000;
  const fmtKRW = (v: number) =>
    useOk
      ? `₩${(Math.floor((v / 1_0000_0000) * 10) / 10).toLocaleString()}억`
      : v >= 10000
      ? `₩${(Math.floor((v / 10000) * 10) / 10).toLocaleString()}만`
      : `₩${Math.floor(v).toLocaleString()}`;
  const totalPnl = totalEvalKRW - totalInvested;
  const totalPnlRate = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;

  // ─── 렌더 ──────────────────────────────────────────────

  return (
    <div className="w-full max-w-2xl md:max-w-5xl mx-auto px-5 py-6 pb-28 md:pb-6 animate-[fadeIn_0.4s_ease-out]">
      {/* 토스트 */}
      <Toast
        title={toast.title}
        message={toast.message}
        visible={toast.visible}
        variant={toast.variant}
        onClose={() => setToast((p) => ({ ...p, visible: false }))}
      />

      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <button onClick={() => router.push("/accounts")} className="w-8 h-8 rounded-lg flex items-center justify-center bg-[var(--color-g100)] dark:bg-transparent hover:bg-[var(--color-g200)] dark:hover:bg-[var(--color-border)] transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--color-text)] dark:text-[var(--color-text)]"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <div>
            <p className="text-sm text-[var(--color-g500)] dark:text-[var(--color-muted)]">계좌 상세</p>
            <h1 className="text-[26px] font-extrabold tracking-tight text-[var(--color-text)] dark:text-[var(--color-text)]">
              {account.brokerageCompany.name}
              {account.memo && (
                <span className="ml-2 text-sm font-normal text-[var(--color-g400)] dark:text-[var(--color-muted)]">
                  {account.memo}
                </span>
              )}
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {(() => {
            const hasKR = account.holdings.some((h) => h.country === "KR");
            const hasForeign = account.holdings.some((h) => h.country !== "KR");
            const label = hasKR && hasForeign ? "국내·해외" : hasKR ? "국내" : hasForeign ? "해외" : "";
            return label ? <Tag label={label} color={hasForeign && hasKR ? "blue" : hasForeign ? "blue" : "green"} /> : null;
          })()}
          <div className="md:hidden"><ThemeToggle /></div>
        </div>
      </div>

      {/* ── ② 자산 요약 카드 ── */}
      <div
        className="rounded-[20px] p-6 mb-4 relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, var(--color-primary-dark) 0%, var(--color-primary) 100%)",
        }}
      >
        {/* 데코 — 오른쪽 상단 밝은 영역 */}
        <div className="absolute -top-16 -right-16 w-52 h-52 rounded-full" style={{ background: "rgba(255,255,255,0.08)" }} />
        <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }} />

        <div className="relative flex justify-between items-start">
          <div>
            <div className="text-sm mb-1" style={{ color: "rgba(255,255,255,0.55)" }}>
              합산 (원화)
            </div>
            <div className="text-[28px] font-extrabold text-white tracking-tight">
              ₩{Math.floor(totalKRW).toLocaleString()}
            </div>
          </div>
          <div
            className="rounded-xl px-3 py-2 text-right"
            style={{ backgroundColor: "rgba(255,255,255,0.92)", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}
          >
            <div className="flex items-center gap-1 justify-end">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                stroke={totalPnlRate >= 0 ? "var(--color-positive)" : "var(--color-negative)"}
              >
                {totalPnlRate >= 0
                  ? <><path d="M7 17L17 7" /><path d="M7 7h10v10" /></>
                  : <><path d="M7 7l10 10" /><path d="M17 7v10H7" /></>
                }
              </svg>
              <span className="text-[15px] font-bold" style={{ color: totalPnlRate >= 0 ? "var(--color-positive)" : "var(--color-negative)" }}>
                {totalPnlRate >= 0 ? "+" : ""}{totalPnlRate.toFixed(2)}%
              </span>
            </div>
            <div className="text-[11px] font-semibold mt-0.5" style={{ color: totalPnlRate >= 0 ? "var(--color-positive)" : "var(--color-negative)", opacity: 0.7 }}>
              {totalPnl >= 0 ? "+" : "-"}₩{Math.floor(Math.abs(totalPnl)).toLocaleString()}
            </div>
          </div>
        </div>

        {/* 평가금 · 투자원금 · 예수금 · 합산 테이블 */}
        <div className="relative mt-3 space-y-1.5">
          {/* 헤더 */}
          <div className="grid grid-cols-4 gap-1.5">
            <div className="text-[10px]" style={{ color: "rgba(255,255,255,0.5)" }}>평가금</div>
            <div className="text-[10px]" style={{ color: "rgba(255,255,255,0.5)" }}>투자원금</div>
            <div className="text-[10px]" style={{ color: "rgba(255,255,255,0.5)" }}>예수금</div>
            <div className="text-[10px]" style={{ color: "rgba(255,255,255,0.5)" }}>합산₩</div>
          </div>
          {/* 원화 행 */}
          {(investedKRW > 0 || cashKRW > 0 || evalKRW > 0) && (
            <div className="grid grid-cols-4 gap-1.5">
              <div className="text-xs font-bold text-white">
                {evalKRW > 0 ? fmtKRW(evalKRW) : <span style={{ color: "rgba(255,255,255,0.3)" }}>-</span>}
              </div>
              <div className="text-xs font-bold text-white">
                {investedKRW > 0 ? fmtKRW(investedKRW) : <span style={{ color: "rgba(255,255,255,0.3)" }}>-</span>}
              </div>
              <div className="text-xs font-bold text-white">
                {cashKRW > 0 ? fmtKRW(cashKRW) : <span style={{ color: "rgba(255,255,255,0.3)" }}>-</span>}
              </div>
              <div className="text-xs font-bold text-white">
                {fmtKRW(totalKRW)}
              </div>
            </div>
          )}
          {/* 달러 행 */}
          {(investedUSD > 0 || cashUSD > 0 || evalUSD > 0) && (
            <div className="grid grid-cols-4 gap-1.5">
              <div className="text-xs font-bold text-white">
                {evalUSD > 0 ? `$${evalUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : <span style={{ color: "rgba(255,255,255,0.3)" }}>-</span>}
              </div>
              <div className="text-xs font-bold text-white">
                {investedUSD > 0 ? `$${investedUSD.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : <span style={{ color: "rgba(255,255,255,0.3)" }}>-</span>}
              </div>
              <div className="text-xs font-bold text-white">
                {cashUSD > 0 ? `$${cashUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : <span style={{ color: "rgba(255,255,255,0.3)" }}>-</span>}
              </div>
              {investedKRW === 0 && cashKRW === 0 && evalKRW === 0 && (
                <div className="text-xs font-bold text-white">
                  {fmtKRW(totalKRW)}
                </div>
              )}
            </div>
          )}
          {/* 모두 없는 경우 */}
          {investedKRW === 0 && investedUSD === 0 && cashKRW === 0 && cashUSD === 0 && evalKRW === 0 && evalUSD === 0 && (
            <div className="grid grid-cols-4 gap-1.5">
              <div className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>-</div>
              <div className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>-</div>
              <div className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>-</div>
              <div className="text-xs font-bold text-white">₩0</div>
            </div>
          )}
        </div>

        <div className="flex gap-2 mt-3.5">
          <button
            onClick={() => {
              setCashCurrency("KRW");
              setCashModal("deposit_choose");
            }}
            className="flex-1 py-2.5 rounded-[10px] text-sm font-bold text-white cursor-pointer"
            style={{
              background: "rgba(255,255,255,0.2)",
              border: "1px solid rgba(255,255,255,0.3)",
            }}
          >
            + 입금
          </button>
          <button
            onClick={() => {
              setCashCurrency("KRW");
              setCashModal("withdraw");
            }}
            className="flex-1 py-2.5 rounded-[10px] text-sm font-semibold text-white cursor-pointer"
            style={{
              background: "rgba(255,255,255,0.1)",
              border: "1px solid rgba(255,255,255,0.2)",
            }}
          >
            출금
          </button>
        </div>
      </div>

      {/* 탭 버튼 */}
      <Tabs
        variant="segment"
        className="mt-4"
        tabs={[
          { key: "holdings", label: "보유종목" },
          { key: "trades",   label: "거래내역" },
          { key: "cashflow", label: "입출금" },
        ]}
        active={activeTab}
        onChange={setActiveTab}
      />

      {/* 탭 콘텐츠 */}
      <div className="mt-4">

      {/* ══ 보유종목 탭 ══ */}
      {activeTab === "holdings" && (
      <>
      <div className="md:grid md:grid-cols-[1fr_340px] md:gap-5">
      <div>
      {/* ── ① 보유 종목 리스트 ── */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="text-[13px] font-bold text-[var(--color-text)] dark:text-[var(--color-text)]">보유 종목</span>
          {/* 원화/외화 토글 */}
          {account.holdings.some((h) => h.country !== "KR") && (
            <div className="flex gap-0.5 rounded-xl bg-[var(--color-g100)] dark:bg-[var(--color-border)] p-0.5">
              <button
                onClick={() => setDisplayCurrency("original")}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  displayCurrency === "original"
                    ? "bg-[var(--color-surface)] dark:bg-[var(--color-card)] text-[var(--color-text)] shadow-sm"
                    : "text-[var(--color-g500)] dark:text-[var(--color-muted)] hover:text-[var(--color-text)]"
                }`}
              >
                $
              </button>
              <button
                onClick={() => setDisplayCurrency("KRW")}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  displayCurrency === "KRW"
                    ? "bg-[var(--color-surface)] dark:bg-[var(--color-card)] text-[var(--color-text)] shadow-sm"
                    : "text-[var(--color-g500)] dark:text-[var(--color-muted)] hover:text-[var(--color-text)]"
                }`}
              >
                ₩
              </button>
            </div>
          )}
        </div>
        <div className="hidden md:block">
          <Button size="sm" onClick={() => { resetHoldingForm(); setHoldingModal(true); }}>
            + 종목 등록
          </Button>
        </div>
      </div>

      {account.holdings.length === 0 ? (
        <Card className="mb-4">
          <EmptyState message="보유 종목이 없습니다." />
        </Card>
      ) : (
        <div className="space-y-2.5 mb-4">
          {[...account.holdings]
            .sort((a, b) => {
              // 국내(KR) 먼저, 해외 뒤
              if (a.country === "KR" && b.country !== "KR") return -1;
              if (a.country !== "KR" && b.country === "KR") return 1;
              // 같은 그룹 내에서 평가금액 큰 순
              const aVal = (quotes[a.ticker]?.price || a.avgPrice) * a.quantity;
              const bVal = (quotes[b.ticker]?.price || b.avgPrice) * b.quantity;
              return bVal - aVal;
            })
            .map((h) => {
            const isForeign = h.country !== "KR";
            const quote = quotes[h.ticker];
            const currentPrice = quote?.price || h.avgPrice;
            const evalValue = currentPrice * h.quantity;
            const investedValue = h.avgPrice * h.quantity;
            const pnl = evalValue - investedValue;
            const pnlRate = investedValue > 0 ? (pnl / investedValue) * 100 : 0;
            const hasQuote = !!quote;

            const fmtPrice = (v: number) => {
              const sign = v < 0 ? "-" : "";
              const abs = Math.abs(v);
              if (isForeign && displayCurrency === "KRW") {
                return `${sign}₩${Math.round(abs * usdRate).toLocaleString()}`;
              }
              return isForeign
                ? `${sign}$${abs.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                : `${sign}₩${Math.floor(abs).toLocaleString()}`;
            };
            const pnlColor = pnl > 0 ? "var(--color-positive)" : pnl < 0 ? "var(--color-negative)" : "var(--color-g400)";

            return (
              <Card key={h.id}>
                <div
                  onClick={() => openHoldingTrades(h)}
                  className="cursor-pointer hover:opacity-80 transition-opacity"
                >
                <div className="flex justify-between items-start gap-3 mb-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="shrink-0"><Tag label={isForeign ? "해외" : "국내"} color={isForeign ? "blue" : "green"} /></span>
                      <span className="text-[15px] font-bold text-[var(--color-text)] dark:text-[var(--color-text)] truncate">
                        {h.name}
                      </span>
                    </div>
                    <div className="text-xs text-[var(--color-g400)] dark:text-[var(--color-muted)] mt-0.5">
                      {h.ticker} · {h.quantity}주
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    {/* 현재가 */}
                    <div className="flex items-center gap-1.5 justify-end">
                      {quotesLoading ? (
                        <div className="w-16 h-4 rounded bg-[var(--color-g200)] dark:bg-[var(--color-border)] animate-pulse" />
                      ) : (
                        <span className="text-[15px] font-bold text-[var(--color-text)] dark:text-[var(--color-text)]">
                          {fmtPrice(currentPrice)}
                        </span>
                      )}
                    </div>
                    {/* 수익률 */}
                    {hasQuote && !quotesLoading && (
                      <div className="text-xs font-semibold mt-0.5" style={{ color: pnlColor }}>
                        {pnl >= 0 ? "+" : ""}{fmtPrice(pnl)} ({pnlRate >= 0 ? "+" : ""}{pnlRate.toFixed(2)}%)
                      </div>
                    )}
                  </div>
                </div>

                {/* 평단가 · 평가금액 */}
                <div className="flex justify-between text-xs text-[var(--color-g400)] dark:text-[var(--color-muted)] mb-2.5">
                  <span>평단가 {fmtPrice(h.avgPrice)}</span>
                  <span>평가금액 {fmtPrice(evalValue)}</span>
                </div>
                </div>

                <Divider />

                <div className="flex justify-between items-center mt-1">
                  <div className="flex gap-1 flex-wrap">
                    {h.sectorManual ? (
                      <Tag label={h.sectorManual} color="gray" />
                    ) : (
                      <span className="text-xs text-[var(--color-g400)] dark:text-[var(--color-muted)] px-2 py-0.5 rounded-md border border-dashed border-[var(--color-g200)] dark:border-[var(--color-border)]">
                        내섹터 미지정
                      </span>
                    )}
                    {h.sectorAuto && (
                      <Tag label={h.sectorAuto} color="gray" />
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); openSectorEdit(h); }}
                      title="섹터"
                      className="p-1.5 rounded-lg cursor-pointer bg-[var(--color-g100)] dark:bg-[var(--color-border)] text-[var(--color-g500)] dark:text-[var(--color-muted)] hover:bg-[var(--color-g200)] dark:hover:bg-[#354035] transition-colors"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); openHoldingEdit(h); }}
                      title="수정"
                      className="p-1.5 rounded-lg cursor-pointer bg-[var(--color-g100)] dark:bg-[var(--color-border)] text-[var(--color-g500)] dark:text-[var(--color-muted)] hover:bg-[var(--color-g200)] dark:hover:bg-[#354035] transition-colors"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setAvgDownHolding(h); const cp = quotes[h.ticker]?.price; setAvgDownPrice(cp ? String(h.country === "KR" ? Math.floor(cp) : cp) : ""); setAvgDownQty(""); }}
                      title="물타기 계산기"
                      className="p-1.5 rounded-lg cursor-pointer bg-[var(--color-g100)] dark:bg-[var(--color-border)] text-[var(--color-g500)] dark:text-[var(--color-muted)] hover:bg-[var(--color-g200)] dark:hover:bg-[#354035] transition-colors"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="10" x2="10" y2="10"/><line x1="14" y1="10" x2="16" y2="10"/><line x1="8" y1="14" x2="10" y2="14"/><line x1="14" y1="14" x2="16" y2="14"/><line x1="8" y1="18" x2="10" y2="18"/><line x1="14" y1="18" x2="16" y2="18"/></svg>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setHoldingDeleteConfirm(h); }}
                      title="삭제"
                      className="p-1.5 rounded-lg cursor-pointer bg-[var(--color-negative-soft)] dark:bg-[var(--color-border)] text-[var(--color-negative)] hover:bg-[rgba(240,68,82,0.2)] dark:hover:bg-[rgba(240,68,82,0.15)] transition-colors"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      </div>{/* 보유종목 탭 좌측 끝 */}

      {/* 보유종목 탭 우측: 섹터 분포 */}
      <div>
      <div className="mt-4 md:mt-0">
        <SectionTitle title="섹터 분포" />
        <Card>
          <SectorDonutChart
            holdings={account.holdings.map((h) => ({
              ...h,
              currentPrice: quotes[h.ticker]?.price ?? undefined,
              exchangeRate: h.country !== "KR" ? usdRate : 1,
            }))}
          />
        </Card>
      </div>
      </div>
      </div>
      <div className="mt-4">
        <button
          onClick={() => setDeleteConfirm(true)}
          className="w-full py-3.5 rounded-2xl text-sm font-bold text-white cursor-pointer transition-opacity hover:opacity-90"
          style={{ backgroundColor: "var(--color-negative)" }}
        >
          계좌 삭제
        </button>
      </div>
      </>
      )}

      {/* ══ 거래내역 탭 ══ */}
      {activeTab === "trades" && (
      <div>
      <SectionTitle title="최근 매매" />

      {account.tradeLogs.length === 0 ? (
        <Card>
          <p className="text-sm text-center py-4 text-[var(--color-g400)]">매매 기록이 없습니다.</p>
        </Card>
      ) : (
        <Card>
          {account.tradeLogs.map((t, i) => {
            const date = new Date(t.date);
            const dateStr = `${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;
            const isBuy = t.type === "BUY";

            return (
              <div
                key={t.id}
                className={`flex justify-between items-center py-2.5 ${i < account.tradeLogs.length - 1 ? "border-b border-[var(--color-g200)] dark:border-[var(--color-border)]" : ""}`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs text-[var(--color-g400)] w-9">
                    {dateStr}
                  </span>
                  <div>
                    <div className="text-sm font-semibold text-[var(--color-text)] dark:text-[var(--color-text)]">
                      {t.name}
                    </div>
                    <div className="text-[11px] text-[var(--color-g400)]">
                      {t.quantity}주 · {t.ticker.length <= 6 && /^\d+$/.test(t.ticker) ? `₩${Math.floor(t.price).toLocaleString()}` : `$${t.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    </div>
                  </div>
                </div>
                <Tag
                  label={isBuy ? "매수" : "매도"}
                  color={isBuy ? "green" : "orange"}
                />
              </div>
            );
          })}

          <button
            onClick={() => router.push(`/trades?accountId=${account.id}`)}
            className="w-full text-sm font-bold pt-3 pb-1 text-center cursor-pointer"
            style={{ color: "var(--color-primary)" }}
          >
            전체 매매일지 보기 →
          </button>
        </Card>
      )}

      </div>
      )}{/* 거래내역 탭 끝 */}

      {/* ══ 입출금 탭 ══ */}
      {activeTab === "cashflow" && (
      <div>
      {/* 입출금 이력 (DEPOSIT/WITHDRAW) */}
      {(() => {
        const cashInOutLogs = account.cashLogs
          .filter((l) => l.type !== "DIVIDEND" && !l.tradeLogId)
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        return (
          <>
            <SectionTitle title="입출금 이력" />
            {cashInOutLogs.length === 0 ? (
              <Card><p className="text-sm text-center py-4 text-[var(--color-g400)]">입출금 기록이 없습니다.</p></Card>
            ) : (
              <Card>
                <div className="max-h-55 overflow-y-auto">
                {cashInOutLogs.map((l, i) => {
                  const d = new Date(l.date);
                  const dateStr = `${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
                  const isDeposit = l.amount > 0;
                  const isKRW = l.currency === "KRW";
                  const amtStr = isKRW
                    ? `${isDeposit ? "+" : ""}₩${Math.abs(l.amount).toLocaleString()}`
                    : `${isDeposit ? "+" : ""}$${Math.abs(l.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                  return (
                    <div key={l.id} className={`flex justify-between items-center py-2.5 ${i < cashInOutLogs.length - 1 ? "border-b border-[var(--color-g200)] dark:border-[var(--color-border)]" : ""}`}>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-[var(--color-g400)] w-9">{dateStr}</span>
                        <span className="text-sm font-semibold text-[var(--color-text)]">{l.memo ?? (isDeposit ? "입금" : "출금")}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-sm font-bold" style={{ color: isDeposit ? "var(--color-primary)" : "var(--color-negative)" }}>{amtStr}</span>
                        <button type="button" onClick={() => setCashDeleteConfirm(l.id)} title="삭제" className="p-1.5 rounded-lg bg-[var(--color-negative-soft)] dark:bg-[var(--color-border)] text-[var(--color-negative)] hover:bg-[rgba(240,68,82,0.2)] dark:hover:bg-[rgba(240,68,82,0.15)] transition-colors cursor-pointer">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                        </button>
                      </div>
                    </div>
                  );
                })}
                </div>
              </Card>
            )}
          </>
        );
      })()}

      {/* 배당 이력 */}
      {(() => {
        if (divLogs.length === 0) return null;
        const sortedDivLogs = [...divLogs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        return (
          <div className="mt-4">
            <SectionTitle title="배당 이력" />
            <Card>
              <div className="max-h-55 overflow-y-auto">
              {sortedDivLogs.map((l, i) => {
                const d = new Date(l.date);
                const dateStr = `${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
                const isKRW = l.currency === "KRW";
                const amtStr = isKRW
                  ? `+₩${Math.abs(l.amount).toLocaleString()}`
                  : `+$${Math.abs(l.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                const holding = account.holdings.find((h) => h.ticker === l.ticker);
                const stockName = holding?.name ?? (l.memo && l.memo !== "배당금" ? l.memo : null);
                return (
                  <div key={l.id} className={`flex justify-between items-center py-2.5 ${i < sortedDivLogs.length - 1 ? "border-b border-[var(--color-g200)] dark:border-[var(--color-border)]" : ""}`}>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-[var(--color-g400)] w-9">{dateStr}</span>
                      <div>
                        <div className="text-sm font-semibold text-[var(--color-text)]">
                          {stockName ?? l.ticker}
                        </div>
                        <div className="text-[11px] text-[var(--color-g400)]">
                          {stockName ? l.ticker : "배당금"}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-sm font-bold" style={{ color: "var(--color-primary)" }}>{amtStr}</span>
                      <button type="button" onClick={() => setDivDeleteConfirm(l.id)} title="삭제" className="p-1.5 rounded-lg bg-[var(--color-negative-soft)] dark:bg-[var(--color-border)] text-[var(--color-negative)] hover:bg-[rgba(240,68,82,0.2)] dark:hover:bg-[rgba(240,68,82,0.15)] transition-colors cursor-pointer">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                      </button>
                    </div>
                  </div>
                );
              })}
              </div>
            </Card>
          </div>
        );
      })()}

      </div>
      )}{/* 입출금 탭 끝 */}

      </div>{/* 탭 콘텐츠 끝 */}

      {/* 삭제 확인 모달 */}
      <ConfirmDialog
        open={deleteConfirm}
        title="계좌를 삭제할까요?"
        message={`${account.brokerageCompany.name} 계좌의 보유 종목, 매매 기록, 예수금이\n모두 삭제되며 복구할 수 없습니다.`}
        confirmLabel="삭제"
        destructive
        confirmLoading={deleting}
        onConfirm={handleDeleteAccount}
        onCancel={() => setDeleteConfirm(false)}
      />

      {/* ── 입출금 바텀시트 ── */}
      <BottomSheet
        open={cashModal !== null}
        onClose={() => {
          setCashModal(null); setCashError(""); setCashAmount("");
          setDivTicker(""); setDivName(""); setDivQuery(""); setDivShowHoldings(false);
          const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
          const todayStr = kst.toISOString().slice(0, 10);
          setCashDate(todayStr);
          setDivDate(todayStr);
        }}
        title={
          cashModal === "deposit_choose" ? "입금"
          : cashModal === "deposit" ? "일반 입금"
          : cashModal === "dividend" ? "배당금 입금"
          : "출금"
        }
      >
        <div className="space-y-5">

          {/* ── 입금 유형 선택 ── */}
          {cashModal === "deposit_choose" && (
            <>
              <p className="text-sm text-[var(--color-g500)] text-center">입금 유형을 선택해주세요</p>
              <div className="flex gap-3">
                <button
                  onClick={() => { setCashModal("deposit"); setTimeout(() => cashAmountRef.current?.focus(), 100); }}
                  className="flex-1 py-4 rounded-2xl border-2 border-[var(--color-g200)] dark:border-[var(--color-border)] flex flex-col items-center gap-1.5 hover:border-[var(--color-primary)] transition-colors cursor-pointer"
                >
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="6" width="20" height="14" rx="2" />
                    <path d="M2 10h20" />
                    <circle cx="12" cy="15" r="1.5" fill="var(--color-primary)" stroke="none" />
                  </svg>
                  <span className="text-sm font-bold text-[var(--color-text)]">일반 입금</span>
                  <span className="text-[11px] text-[var(--color-g400)]">현금 입금</span>
                </button>
                <button
                  onClick={() => { setCashModal("dividend"); setDivShowHoldings(!!(account && account.holdings.length > 0)); }}
                  className="flex-1 py-4 rounded-2xl border-2 border-[var(--color-g200)] dark:border-[var(--color-border)] flex flex-col items-center gap-1.5 hover:border-[var(--color-primary)] transition-colors cursor-pointer"
                >
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 7v10M9.5 9.5c0-1.38 1.12-2.5 2.5-2.5s2.5 1.12 2.5 2.5c0 1.5-2.5 2.5-2.5 4" />
                    <circle cx="12" cy="16.5" r="0.75" fill="var(--color-primary)" stroke="none" />
                  </svg>
                  <span className="text-sm font-bold text-[var(--color-text)]">배당금</span>
                  <span className="text-[11px] text-[var(--color-g400)]">종목 배당 수령</span>
                </button>
              </div>
            </>
          )}

          {/* ── 일반 입금 / 출금 폼 ── */}
          {(cashModal === "deposit" || cashModal === "withdraw") && (
            <>
              <div className="flex gap-2">
                {["KRW", "USD"].map((c) => (
                  <button
                    key={c}
                    onClick={() => { setCashCurrency(c); setCashAmount(""); setCashError(""); setTimeout(() => cashAmountRef.current?.focus(), 0); }}
                    className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all"
                    style={{
                      backgroundColor: cashCurrency === c ? "var(--color-primary)" : "var(--color-g100)",
                      color: cashCurrency === c ? "#fff" : "var(--color-g500)",
                    }}
                  >
                    {c}
                  </button>
                ))}
              </div>
              <DatePicker label="날짜 *" value={cashDate} onChange={setCashDate} />
              <Input
                ref={cashAmountRef}
                label="금액"
                inputMode="numeric"
                value={fmtNum(cashAmount)}
                onChange={(e) => setCashAmount(stripNum(e.target.value, true))}
                placeholder={cashCurrency === "KRW" ? "1,000,000" : "1,000"}
              />
              {cashError && <p className="text-sm text-[var(--color-negative)] text-center -mt-1">{cashError}</p>}
              <Button size="lg" onClick={handleCashSubmit} disabled={cashSubmitting || !cashAmount}>
                {cashSubmitting ? "처리 중..." : cashModal === "deposit" ? "입금하기" : "출금하기"}
              </Button>
            </>
          )}

          {/* ── 배당금 폼 ── */}
          {cashModal === "dividend" && (
            <>
              {/* 종목 선택 */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-[var(--color-g500)]">종목 *</label>
                  {account && account.holdings.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setDivShowHoldings(!divShowHoldings)}
                      className="text-[11px] font-medium text-[var(--color-g500)] hover:text-[var(--color-primary)] transition-colors"
                    >
                      보유 종목 불러오기
                    </button>
                  )}
                </div>

                {/* 보유 종목 목록 */}
                {divShowHoldings && account && (
                  <div className="rounded-xl border border-[var(--color-g200)] dark:border-[var(--color-border)] p-2 max-h-32 overflow-y-auto space-y-1 mb-2">
                    {account.holdings.map((h) => (
                      <button
                        key={h.ticker}
                        type="button"
                        onClick={() => { selectDivStock(h.ticker, h.name); setDivShowHoldings(false); }}
                        className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-[var(--color-g100)] dark:hover:bg-[var(--color-border)] transition-colors flex items-center justify-between"
                      >
                        <span className="font-medium text-[var(--color-text)]">{h.name}</span>
                        <span className="text-xs text-[var(--color-g400)]">{h.ticker}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* 직접 검색 */}
                {divTicker ? (
                  <div className="flex items-center justify-between pb-2 border-b border-[var(--color-g200)] dark:border-[var(--color-border)]">
                    <div>
                      <span className="text-sm font-semibold text-[var(--color-text)]">{divName}</span>
                      <span className="text-xs text-[var(--color-g400)] ml-2">{divTicker}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setDivTicker(""); setDivName(""); setDivQuery(""); }}
                      className="text-lg leading-none text-[var(--color-g400)] hover:text-[var(--color-negative)] transition-colors"
                    >×</button>
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      type="text"
                      value={divQuery}
                      onChange={(e) => handleDivQueryChange(e.target.value)}
                      placeholder="종목명 또는 티커 검색"
                      className="w-full pb-2 text-sm bg-transparent border-b border-[var(--color-g200)] dark:border-[var(--color-border)] outline-none text-[var(--color-text)] placeholder:text-[var(--color-g300)]"
                    />
                    {divShowDropdown && divSearchResults.length > 0 && (
                      <div className="absolute top-full left-0 right-0 z-[200] mt-1 rounded-xl border border-[var(--color-g200)] dark:border-[var(--color-border)] bg-[var(--color-surface)] dark:bg-[var(--color-card)] shadow-lg overflow-hidden">
                        <div className="max-h-40 overflow-y-auto">
                          {divSearchResults.map((s) => (
                            <button
                              key={s.ticker}
                              type="button"
                              onMouseDown={(e) => { e.preventDefault(); selectDivStock(s.ticker, s.name); }}
                              className="w-full text-left px-3 py-2.5 hover:bg-[var(--color-g100)] dark:hover:bg-[var(--color-border)] transition-colors flex items-center justify-between"
                            >
                              <div>
                                <span className="text-sm font-medium text-[var(--color-text)]">{s.name}</span>
                                <span className="text-xs text-[var(--color-g400)] ml-2">{s.ticker}</span>
                              </div>
                              <span className="text-[10px] text-[var(--color-g400)]">{s.market}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 통화 + 금액 */}
              <div className="flex gap-2">
                {["KRW", "USD"].map((c) => (
                  <button
                    key={c}
                    onClick={() => { setCashCurrency(c); setCashAmount(""); setCashError(""); }}
                    className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all"
                    style={{
                      backgroundColor: cashCurrency === c ? "var(--color-primary)" : "var(--color-g100)",
                      color: cashCurrency === c ? "#fff" : "var(--color-g500)",
                    }}
                  >
                    {c}
                  </button>
                ))}
              </div>
              {/* 날짜 선택 */}
              <DatePicker label="배당 수령일 *" value={divDate} onChange={setDivDate} />
              <Input
                label="배당금액"
                inputMode="numeric"
                value={fmtNum(cashAmount)}
                onChange={(e) => setCashAmount(stripNum(e.target.value, true))}
                placeholder={cashCurrency === "KRW" ? "100,000" : "100"}
              />
              {cashError && <p className="text-sm text-[var(--color-negative)] text-center -mt-1">{cashError}</p>}
              <Button size="lg" onClick={handleCashSubmit} disabled={cashSubmitting || !cashAmount || !divTicker}>
                {cashSubmitting ? "처리 중..." : "배당금 등록"}
              </Button>
            </>
          )}

        </div>
      </BottomSheet>

      {/* ── 종목 등록 바텀시트 ── */}
      <BottomSheet
        open={holdingModal}
        onClose={() => setHoldingModal(false)}
        title="보유 종목 등록"
      >
        <div className="space-y-5">
          {/* 캡처 불러오기 */}
          <button
            type="button"
            onClick={() => { setHoldingModal(false); setImportModalOpen(true); }}
            className="w-full py-3 rounded-xl border-2 border-[var(--color-primary)] text-[var(--color-primary)] text-sm font-semibold flex items-center justify-center gap-2 hover:bg-[var(--color-primary-soft)] transition-colors cursor-pointer"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" />
            </svg>
            캡처로 불러오기
          </button>

          {/* 구분선 */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-[var(--color-g200)] dark:bg-[var(--color-border)]" />
            <span className="text-xs text-[var(--color-g400)] dark:text-[var(--color-muted)]">또는 직접 입력</span>
            <div className="flex-1 h-px bg-[var(--color-g200)] dark:bg-[var(--color-border)]" />
          </div>

          {/* 국내/해외 토글 */}
          <div className="flex rounded-xl overflow-hidden border border-[var(--color-g200)] dark:border-[var(--color-border)]">
            <button
              type="button"
              onClick={() => { setHCountry("KR"); setHTicker(""); setHName(""); setHAvgPrice(""); setHQuantity(""); setHStockQuery(""); setHStockResults([]); setHShowDropdown(false); }}
              className={`flex-1 py-2.5 text-sm font-semibold transition-colors cursor-pointer ${
                hCountry === "KR"
                  ? "bg-[var(--color-primary)] text-white"
                  : "bg-white dark:bg-[var(--color-card)] text-[var(--color-g400)] dark:text-[var(--color-muted)]"
              }`}
            >
              국내
            </button>
            <button
              type="button"
              onClick={() => { setHCountry("US"); setHTicker(""); setHName(""); setHAvgPrice(""); setHQuantity(""); setHStockQuery(""); setHStockResults([]); setHShowDropdown(false); }}
              className={`flex-1 py-2.5 text-sm font-semibold transition-colors cursor-pointer ${
                hCountry === "US"
                  ? "bg-[#4285F4] text-white"
                  : "bg-white dark:bg-[var(--color-card)] text-[var(--color-g400)] dark:text-[var(--color-muted)]"
              }`}
            >
              해외
            </button>
          </div>

          {/* 종목 검색 (국내: autocomplete / 해외: 직접 입력) */}
          {hCountry === "KR" ? (
            <div ref={hStockSearchRef}>
              <label className="block text-xs font-medium mb-1 text-[var(--color-g500)] dark:text-[var(--color-muted)]">
                종목 *
              </label>
              {hName && hTicker ? (
                <div className="flex items-center justify-between pb-2 border-b border-[var(--color-g200)] dark:border-[var(--color-border)]">
                  <div>
                    <span className="text-sm font-semibold text-[var(--color-text)] dark:text-[var(--color-text)]">
                      {hName}
                    </span>
                    <span className="text-xs text-[var(--color-g400)] dark:text-[var(--color-muted)] ml-2">
                      {hTicker}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setHName(""); setHTicker(""); setHAvgPrice(""); setHQuantity(""); }}
                    className="text-lg leading-none text-[var(--color-g400)] dark:text-[var(--color-muted)] hover:text-[var(--color-negative)] transition-colors"
                  >
                    ×
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <input
                      ref={hInputRef}
                      type="text"
                      value={hStockQuery}
                      onChange={(e) => handleHStockQueryChange(e.target.value)}
                      onFocus={() => { if (hStockQuery) setHShowDropdown(true); }}
                      onKeyDown={(e) => {
                        if (e.key === "ArrowDown" && hShowDropdown && hStockResults.length > 0) { e.preventDefault(); setHActiveIndex(0); }
                        else if (e.key === "Escape") { setHShowDropdown(false); setHActiveIndex(-1); }
                      }}
                      placeholder={hIsListening ? "듣는 중..." : "종목명 또는 티커 검색 (예: 삼성전자, 005930)"}
                      className="flex-1 pb-2 text-sm bg-transparent outline-none border-b border-[var(--color-g200)] dark:border-[var(--color-border)] text-[var(--color-text)] dark:text-[var(--color-text)] placeholder:text-[var(--color-g400)] dark:placeholder:text-[var(--color-muted)]"
                      style={hIsListening ? { borderColor: "var(--color-negative)", transition: "border-color 0.2s" } : undefined}
                    />
                    {hSpeechSupported && (
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={hIsListening ? stopHListening : startHListening}
                        className="relative flex-shrink-0 pb-2 group cursor-pointer"
                        style={{ color: hIsListening ? "var(--color-negative)" : "var(--color-g400)" }}
                      >
                        <span
                          className="absolute bottom-full right-0 mb-2 px-2.5 py-1.5 text-xs font-semibold text-white rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none bg-[#1D2720] z-10"
                          style={{ boxShadow: "0 4px 12px rgba(0,0,0,0.2)" }}
                        >
                          {hIsListening ? "음성 인식 중지" : "음성으로 종목 검색"}
                          <span className="absolute top-full right-3 w-0 h-0" style={{ borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderTop: "5px solid #1D2720" }} />
                        </span>
                        {hIsListening && (
                          <span className="absolute inset-0 flex items-center justify-center">
                            <span className="animate-ping absolute inline-flex h-5 w-5 rounded-full opacity-40" style={{ backgroundColor: "var(--color-negative)" }} />
                          </span>
                        )}
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                          <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                          <line x1="12" y1="19" x2="12" y2="23"/>
                          <line x1="8" y1="23" x2="16" y2="23"/>
                        </svg>
                      </button>
                    )}
                  </div>
                  {hMicError && (
                    <p className="mt-1 text-xs whitespace-pre-line" style={{ color: "var(--color-negative)" }}>
                      {hMicError}
                    </p>
                  )}
                  {hShowDropdown && (
                    <div className="mt-1 rounded-xl border border-[var(--color-g200)] dark:border-[var(--color-border)] bg-white dark:bg-[var(--color-card)] shadow-lg overflow-hidden">
                      {hStockResults.length > 0 ? (
                        <div className="max-h-48 overflow-y-auto">
                          {hStockResults.map((s, i) => (
                            <button
                              key={s.ticker}
                              ref={(el) => { hItemRefs.current[i] = el; }}
                              type="button"
                              onMouseDown={(e) => { e.preventDefault(); selectHStock(s); }}
                              onKeyDown={(e) => {
                                if (e.key === "ArrowDown") { e.preventDefault(); setHActiveIndex(Math.min(i + 1, hStockResults.length - 1)); }
                                else if (e.key === "ArrowUp") { e.preventDefault(); if (i === 0) setHActiveIndex(-1); else setHActiveIndex(i - 1); }
                                else if (e.key === "Enter") { e.preventDefault(); selectHStock(s); }
                                else if (e.key === "Escape") { setHShowDropdown(false); setHActiveIndex(-1); }
                              }}
                              className="w-full text-left px-3 py-2.5 hover:bg-[var(--color-g100)] dark:hover:bg-[var(--color-border)] focus:bg-[var(--color-g100)] dark:focus:bg-[var(--color-border)] outline-none transition-colors flex items-center justify-between"
                            >
                              <div>
                                <span className="text-sm font-medium text-[var(--color-text)] dark:text-[var(--color-text)]">
                                  {s.name}
                                </span>
                                <span className="text-xs text-[var(--color-g400)] dark:text-[var(--color-muted)] ml-2">
                                  {s.ticker}
                                </span>
                              </div>
                              <span className="text-[10px] text-[var(--color-g400)] dark:text-[var(--color-muted)]">
                                {s.market}
                              </span>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="px-3 py-3 text-sm text-[var(--color-g400)] dark:text-[var(--color-muted)]">
                          검색 결과가 없습니다
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            <div ref={hStockSearchRef}>
              <label className="block text-xs font-medium mb-1 text-[var(--color-g500)] dark:text-[var(--color-muted)]">
                종목 *
              </label>
              {hName && hTicker ? (
                <div className="flex items-center justify-between pb-2 border-b border-[var(--color-g200)] dark:border-[var(--color-border)]">
                  <div>
                    <span className="text-sm font-semibold text-[var(--color-text)] dark:text-[var(--color-text)]">
                      {hName}
                    </span>
                    <span className="text-xs text-[var(--color-g400)] dark:text-[var(--color-muted)] ml-2">
                      {hTicker}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setHName(""); setHTicker(""); setHAvgPrice(""); setHQuantity(""); }}
                    className="text-lg leading-none text-[var(--color-g400)] dark:text-[var(--color-muted)] hover:text-[var(--color-negative)] transition-colors"
                  >
                    ×
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <input
                      ref={hInputRef}
                      type="text"
                      value={hStockQuery}
                      onChange={(e) => handleHStockQueryChange(e.target.value)}
                      onFocus={() => { if (hStockQuery) setHShowDropdown(true); }}
                      onKeyDown={(e) => {
                        if (e.key === "ArrowDown" && hShowDropdown && hStockResults.length > 0) { e.preventDefault(); setHActiveIndex(0); }
                        else if (e.key === "Escape") { setHShowDropdown(false); setHActiveIndex(-1); }
                      }}
                      placeholder={hIsListening ? "듣는 중..." : "종목명 또는 티커 검색 (예: NVIDIA, NVDA)"}
                      className="flex-1 pb-2 text-sm bg-transparent outline-none border-b border-[var(--color-g200)] dark:border-[var(--color-border)] text-[var(--color-text)] dark:text-[var(--color-text)] placeholder:text-[var(--color-g400)] dark:placeholder:text-[var(--color-muted)]"
                      style={hIsListening ? { borderColor: "var(--color-negative)", transition: "border-color 0.2s" } : undefined}
                    />
                    {hSpeechSupported && (
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={hIsListening ? stopHListening : startHListening}
                        className="relative flex-shrink-0 pb-2 group cursor-pointer"
                        style={{ color: hIsListening ? "var(--color-negative)" : "var(--color-g400)" }}
                      >
                        <span
                          className="absolute bottom-full right-0 mb-2 px-2.5 py-1.5 text-xs font-semibold text-white rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none bg-[#1D2720] z-10"
                          style={{ boxShadow: "0 4px 12px rgba(0,0,0,0.2)" }}
                        >
                          {hIsListening ? "음성 인식 중지" : "음성으로 종목 검색"}
                          <span className="absolute top-full right-3 w-0 h-0" style={{ borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderTop: "5px solid #1D2720" }} />
                        </span>
                        {hIsListening && (
                          <span className="absolute inset-0 flex items-center justify-center">
                            <span className="animate-ping absolute inline-flex h-5 w-5 rounded-full opacity-40" style={{ backgroundColor: "var(--color-negative)" }} />
                          </span>
                        )}
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                          <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                          <line x1="12" y1="19" x2="12" y2="23"/>
                          <line x1="8" y1="23" x2="16" y2="23"/>
                        </svg>
                      </button>
                    )}
                  </div>
                  {hMicError && (
                    <p className="mt-1 text-xs whitespace-pre-line" style={{ color: "var(--color-negative)" }}>
                      {hMicError}
                    </p>
                  )}
                  {hShowDropdown && (
                    <div className="mt-1 rounded-xl border border-[var(--color-g200)] dark:border-[var(--color-border)] bg-white dark:bg-[var(--color-card)] shadow-lg overflow-hidden">
                      {hStockResults.length > 0 ? (
                        <div className="max-h-48 overflow-y-auto">
                          {hStockResults.map((s, i) => (
                            <button
                              key={s.ticker}
                              ref={(el) => { hItemRefs.current[i] = el; }}
                              type="button"
                              onMouseDown={(e) => { e.preventDefault(); selectHStock(s); }}
                              onKeyDown={(e) => {
                                if (e.key === "ArrowDown") { e.preventDefault(); setHActiveIndex(Math.min(i + 1, hStockResults.length - 1)); }
                                else if (e.key === "ArrowUp") { e.preventDefault(); if (i === 0) setHActiveIndex(-1); else setHActiveIndex(i - 1); }
                                else if (e.key === "Enter") { e.preventDefault(); selectHStock(s); }
                                else if (e.key === "Escape") { setHShowDropdown(false); setHActiveIndex(-1); }
                              }}
                              className="w-full text-left px-3 py-2.5 hover:bg-[var(--color-g100)] dark:hover:bg-[var(--color-border)] focus:bg-[var(--color-g100)] dark:focus:bg-[var(--color-border)] outline-none transition-colors flex items-center justify-between"
                            >
                              <div>
                                <span className="text-sm font-medium text-[var(--color-text)] dark:text-[var(--color-text)]">
                                  {s.name}
                                </span>
                                <span className="text-xs text-[var(--color-g400)] dark:text-[var(--color-muted)] ml-2">
                                  {s.ticker}
                                </span>
                              </div>
                              <span className="text-[10px] text-[var(--color-g400)] dark:text-[var(--color-muted)]">
                                {s.market}
                              </span>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="px-3 py-3 text-sm text-[var(--color-g400)] dark:text-[var(--color-muted)]">
                          검색 결과가 없습니다
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* 평단가 / 수량 */}
          <div className="grid grid-cols-2 gap-3">
            <Input
              ref={hAvgPriceRef}
              label={`평단가 * ${hPriceLoading ? "조회 중..." : ""}`}
              inputMode="decimal"
              value={fmtNum(hAvgPrice)}
              onChange={(e) => setHAvgPrice(stripNum(e.target.value, true))}
              placeholder={hPriceLoading ? "" : hCountry === "KR" ? "72,000" : "120.50"}
              disabled={hPriceLoading}
            />
            <Input
              label="수량 *"
              inputMode="numeric"
              value={fmtNum(hQuantity)}
              onChange={(e) => setHQuantity(stripNum(e.target.value))}
              placeholder="50"
            />
          </div>

          {/* 에러 */}
          {hError && (
            <div className="rounded-xl px-4 py-2.5 text-sm bg-[var(--color-negative-soft)] dark:bg-[#3D1519] text-[var(--color-negative)]">
              {hError}
            </div>
          )}

          <Button size="lg" onClick={handleAddHolding} disabled={hSubmitting}>
            {hSubmitting ? "등록 중..." : "종목 등록"}
          </Button>
        </div>
      </BottomSheet>

      {/* ─── 캡처 불러오기 모달 ────────────────────────────── */}
      <ImportModal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onConfirm={(holdings) => handleImportConfirm(holdings)}
      />

      {/* ─── 보유종목 매매내역 조회 바텀시트 ────────────────── */}
      <BottomSheet
        open={holdingTradesTarget !== null}
        onClose={() => setHoldingTradesTarget(null)}
        title={holdingTradesTarget ? `${holdingTradesTarget.name} 매매내역` : ""}
        titleRight={
          holdingTrades.length > 0
            ? <span className="text-xs text-[var(--color-g400)]">총 {holdingTrades.length}건</span>
            : undefined
        }
      >
        {holdingTradesLoading ? (
          <div className="py-8 flex justify-center">
            <LoadingSpinner />
          </div>
        ) : holdingTrades.length === 0 ? (
          <p className="text-sm text-center py-8 text-[var(--color-g400)]">
            이 계좌에서 매매 기록이 없습니다.
          </p>
        ) : (
          <div>
            {holdingTrades.slice(0, 10).map((t, i) => {
              const date = new Date(t.date);
              const dateStr = `${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;
              const isBuy = t.type === "BUY";
              const isKR = t.ticker.length <= 6 && /^\d+$/.test(t.ticker);
              const displayCount = Math.min(holdingTrades.length, 10);

              return (
                <div
                  key={t.id}
                  className={`flex justify-between items-center py-2.5 ${i < displayCount - 1 ? "border-b border-[var(--color-g200)] dark:border-[var(--color-border)]" : ""}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-[var(--color-g400)] w-9">
                      {dateStr}
                    </span>
                    <div>
                      <div className="text-sm font-semibold text-[var(--color-text)] dark:text-[var(--color-text)]">
                        {t.name}
                      </div>
                      <div className="text-[11px] text-[var(--color-g400)]">
                        {t.quantity}주 · {isKR ? `₩${Math.floor(t.price).toLocaleString()}` : `$${t.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                      </div>
                    </div>
                  </div>
                  <Tag
                    label={isBuy ? "매수" : "매도"}
                    color={isBuy ? "green" : "orange"}
                  />
                </div>
              );
            })}
            {holdingTrades.length > 10 && holdingTradesTarget && (
              <button
                onClick={() => {
                  setHoldingTradesTarget(null);
                  router.push(`/trades?accountId=${account.id}&ticker=${encodeURIComponent(holdingTradesTarget.ticker)}`);
                }}
                className="w-full text-sm font-bold pt-3 pb-1 text-center cursor-pointer"
                style={{ color: "var(--color-primary)" }}
              >
                매매일지에서 전체 보기 →
              </button>
            )}
          </div>
        )}
      </BottomSheet>

      {/* ─── 종목 수정 바텀시트 ────────────────────────────── */}
      <BottomSheet
        open={holdingEditModal}
        onClose={() => setHoldingEditModal(false)}
        title={`종목 수정 — ${holdingEditTarget?.name ?? ""}`}
      >
        <div className="space-y-4">
          <Input
            label="평단가"
            inputMode={holdingEditTarget?.country !== "KR" ? "decimal" : "numeric"}
            value={fmtNum(holdingEditPrice)}
            onChange={(e) => setHoldingEditPrice(stripNum(e.target.value, holdingEditTarget?.country !== "KR"))}
            placeholder="평균 매수 단가"
          />
          <Input
            label="보유 수량"
            inputMode="numeric"
            value={fmtNum(holdingEditQty)}
            onChange={(e) => setHoldingEditQty(stripNum(e.target.value))}
            placeholder="보유 주수"
          />
          {holdingEditError && (
            <p className="text-xs text-[var(--color-negative)]">{holdingEditError}</p>
          )}
          <Button
            size="lg"
            onClick={handleHoldingEditSubmit}
            disabled={holdingEditSubmitting}
          >
            {holdingEditSubmitting ? "저장 중..." : "저장"}
          </Button>
        </div>
      </BottomSheet>

      {/* ─── 종목 삭제 확인 ────────────────────────────────── */}
      <ConfirmDialog
        open={holdingDeleteConfirm !== null}
        title="종목을 삭제할까요?"
        message={`${holdingDeleteConfirm?.name ?? ""} (${holdingDeleteConfirm?.ticker ?? ""}) 종목이\n삭제되며 복구할 수 없습니다.`}
        confirmLabel="삭제"
        destructive
        confirmLoading={holdingDeleting}
        onConfirm={handleHoldingDelete}
        onCancel={() => setHoldingDeleteConfirm(null)}
      />

      <ConfirmDialog
        open={cashDeleteConfirm !== null}
        title="입출금 이력을 삭제할까요?"
        message={"삭제 시 예수금도 함께 반영되며\n복구할 수 없습니다."}
        confirmLabel="삭제"
        destructive
        confirmLoading={cashDeleting}
        onConfirm={handleDeleteCashLog}
        onCancel={() => setCashDeleteConfirm(null)}
      />

      <ConfirmDialog
        open={divDeleteConfirm !== null}
        title="배당 이력을 삭제할까요?"
        message={"삭제 시 예수금도 함께 차감되며\n복구할 수 없습니다."}
        confirmLabel="삭제"
        destructive
        confirmLoading={divDeleting}
        onConfirm={handleDeleteDividend}
        onCancel={() => setDivDeleteConfirm(null)}
      />

      {/* ─── 섹터 편집 바텀시트 ───────────────────────────── */}
      <BottomSheet
        open={sectorEditModal}
        onClose={() => setSectorEditModal(false)}
        title={`섹터 편집 — ${sectorEditHolding?.name ?? ""}`}
      >
        <div className="space-y-5">
          {/* 기본 섹터 (읽기 전용) */}
          <div>
            <label className="block text-xs font-medium mb-1 text-[var(--color-g500)] dark:text-[var(--color-muted)]">기본 섹터</label>
            <div className="pb-2 text-sm border-b border-[var(--color-g200)] dark:border-[var(--color-border)] text-[var(--color-g400)] dark:text-[var(--color-muted)]">
              {sectorEditHolding?.sectorAuto ?? "미분류"}
            </div>
          </div>

          {/* 내 섹터 */}
          <Input
            label="내 섹터"
            value={sectorEditValue}
            onChange={(e) => setSectorEditValue(e.target.value)}
            placeholder="예: AI 반도체, 배당주"
          />

          <Button size="lg" onClick={handleSectorEditSubmit} disabled={sectorEditSubmitting}>
            {sectorEditSubmitting ? "저장 중..." : "저장"}
          </Button>
        </div>
      </BottomSheet>

      {/* ─── 물타기 계산기 바텀시트 ──────────────────────── */}
      <BottomSheet
        open={avgDownHolding !== null}
        onClose={() => setAvgDownHolding(null)}
        title={`물타기 계산기 — ${avgDownHolding?.name ?? ""}`}
      >
        {avgDownHolding && (() => {
          const isKR = avgDownHolding.country === "KR";
          const fmt = (v: number) => isKR
            ? `₩${Math.floor(Math.abs(v)).toLocaleString()}`
            : `$${Math.abs(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
          const addPrice = parseFloat(avgDownPrice.replace(/,/g, "")) || 0;
          const addQty = parseInt(avgDownQty.replace(/,/g, "")) || 0;
          const hasInput = addPrice > 0 && addQty > 0;
          const newTotalQty = avgDownHolding.quantity + addQty;
          const newAvgPrice = hasInput
            ? (avgDownHolding.avgPrice * avgDownHolding.quantity + addPrice * addQty) / newTotalQty
            : 0;
          const requiredCapital = addPrice * addQty;

          return (
            <div className="space-y-4">
              {/* 현재 상태 */}
              <div className="flex justify-between text-xs p-3 rounded-xl bg-[var(--color-g100)] dark:bg-[var(--color-border)]">
                <div>
                  <div className="text-[var(--color-g400)] dark:text-[var(--color-muted)] mb-0.5">현재 평단가</div>
                  <div className="font-bold text-[var(--color-text)]">{fmt(avgDownHolding.avgPrice)}</div>
                </div>
                <div className="text-right">
                  <div className="text-[var(--color-g400)] dark:text-[var(--color-muted)] mb-0.5">보유 수량</div>
                  <div className="font-bold text-[var(--color-text)]">{avgDownHolding.quantity.toLocaleString()}주</div>
                </div>
              </div>

              {/* 입력 */}
              <Input
                label="추가 매수 단가"
                inputMode={isKR ? "numeric" : "decimal"}
                value={fmtNum(avgDownPrice)}
                onChange={(e) => setAvgDownPrice(stripNum(e.target.value, !isKR))}
                placeholder={isKR ? "원" : "USD"}
              />
              <Input
                ref={avgDownQtyRef}
                label="추가 매수 수량"
                inputMode="numeric"
                value={fmtNum(avgDownQty)}
                onChange={(e) => setAvgDownQty(stripNum(e.target.value))}
                onKeyDown={(e) => {
                  if (e.key === "ArrowUp" || e.key === "ArrowDown") {
                    e.preventDefault();
                    const cur = parseInt(avgDownQty.replace(/,/g, "")) || 0;
                    const next = Math.max(1, cur + (e.key === "ArrowUp" ? 1 : -1));
                    setAvgDownQty(String(next));
                  }
                }}
                placeholder="주"
              />

              {/* 결과 */}
              {hasInput && (
                <div className="p-4 rounded-xl border border-[var(--color-primary)] bg-[rgba(5,192,114,0.05)] space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-[var(--color-g500)] dark:text-[var(--color-muted)]">매수 후 평단가</span>
                    <span className="text-base font-bold text-[var(--color-primary)]">{fmt(newAvgPrice)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-[var(--color-g500)] dark:text-[var(--color-muted)]">매수 후 수량</span>
                    <span className="text-sm font-semibold text-[var(--color-text)]">{newTotalQty.toLocaleString()}주</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-[var(--color-g500)] dark:text-[var(--color-muted)]">필요 자금</span>
                    <span className="text-sm font-semibold text-[var(--color-text)]">
                      {fmt(requiredCapital)}
                      {!isKR && (
                        <span className="ml-1 text-xs text-[var(--color-g400)] dark:text-[var(--color-muted)]">
                          (₩{Math.round(requiredCapital * usdRate).toLocaleString()})
                        </span>
                      )}
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })()}
      </BottomSheet>

      {/* 모바일 FAB — 종목 등록 */}
      <button
        onClick={() => { resetHoldingForm(); setHoldingModal(true); }}
        className="md:hidden fixed bottom-24 right-5 w-12 h-12 rounded-2xl bg-[var(--color-primary)] text-white text-2xl flex items-center justify-center shadow-lg shadow-[var(--color-primary)]/30 z-40 active:scale-95 transition-transform cursor-pointer"
      >
        +
      </button>
    </div>
  );
}
