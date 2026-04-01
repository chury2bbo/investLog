"use client";

import { useState } from "react";

// ─── 컬러 토큰 ───────────────────────────────────────────────
const C = {
  primary: "#05C072",
  negative: "#F04452",
  text: "#1A221A",
  textMuted: "#6B7B6B",
  textFaint: "#9AA99A",
  bg: "#F5F7F5",
  surface: "#FFFFFF",
  border: "#E8EEE8",
  borderInput: "#D4DDD4",
};

// ─── Button ──────────────────────────────────────────────────
function Button({
  children,
  variant = "primary",
  size = "md",
  disabled = false,
  onClick,
}: {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "black";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  onClick?: () => void;
}) {
  const base = "rounded-xl font-semibold transition-opacity inline-flex items-center justify-center";
  const sizes = { sm: "px-3 py-1.5 text-xs", md: "px-5 py-2.5 text-sm", lg: "w-full py-3 text-sm" };
  const variants = {
    primary: { backgroundColor: C.primary, color: "#fff" },
    secondary: { backgroundColor: "#F0F4F0", color: C.text },
    black: { backgroundColor: C.text, color: "#fff" },
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${sizes[size]}`}
      style={{ ...variants[variant], opacity: disabled ? 0.4 : 1 }}
    >
      {children}
    </button>
  );
}

// ─── Card ────────────────────────────────────────────────────
function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl p-5 ${className}`}
      style={{ backgroundColor: C.surface, boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}
    >
      {children}
    </div>
  );
}

// ─── Tag ─────────────────────────────────────────────────────
function Tag({ label, color = "green" }: { label: string; color?: "green" | "gray" | "blue" | "orange" }) {
  const styles = {
    green:  { backgroundColor: "#E6F9F1", color: "#05C072" },
    gray:   { backgroundColor: "#F0F4F0", color: C.textMuted },
    blue:   { backgroundColor: "#E8F0FE", color: "#4285F4" },
    orange: { backgroundColor: "#FFF3E8", color: "#F07D05" },
  };
  return (
    <span className="text-xs font-medium px-2 py-1 rounded-md" style={styles[color]}>
      {label}
    </span>
  );
}

// ─── PnlTag ──────────────────────────────────────────────────
function PnlTag({ value }: { value: number }) {
  const positive = value >= 0;
  return (
    <span
      className="text-xs font-semibold px-2 py-1 rounded-md"
      style={{
        backgroundColor: positive ? "#E6F9F1" : "#FEE8EA",
        color: positive ? C.primary : C.negative,
      }}
    >
      {positive ? "+" : ""}{value.toFixed(2)}%
    </span>
  );
}

// ─── Input ───────────────────────────────────────────────────
function Input({
  label,
  placeholder,
  type = "text",
}: {
  label: string;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1" style={{ color: C.textMuted }}>
        {label}
      </label>
      <input
        type={type}
        placeholder={placeholder}
        className="w-full pb-2 text-sm bg-transparent outline-none border-b"
        style={{ borderColor: C.borderInput, color: C.text }}
      />
    </div>
  );
}

// ─── Divider ─────────────────────────────────────────────────
function Divider() {
  return <div className="h-px w-full my-4" style={{ backgroundColor: C.border }} />;
}

// ─── LoadingSpinner ──────────────────────────────────────────
function LoadingSpinner({ size = 24 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className="animate-spin"
      style={{ color: C.primary }}
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" strokeOpacity="0.2" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" />
    </svg>
  );
}

// ─── EmptyState ──────────────────────────────────────────────
function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-2">
      <div className="text-3xl">📭</div>
      <p className="text-sm" style={{ color: C.textFaint }}>{message}</p>
    </div>
  );
}

// ─── SectionTitle ────────────────────────────────────────────
function SectionTitle({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-sm font-bold" style={{ color: C.text }}>{title}</h2>
      {action}
    </div>
  );
}

// ─── BottomSheet ─────────────────────────────────────────────
function BottomSheet({ open, onClose, title, children }: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        className="relative w-full rounded-t-3xl p-6"
        style={{ backgroundColor: C.surface, maxHeight: "80vh", overflowY: "auto" }}
      >
        <div className="w-10 h-1 rounded-full mx-auto mb-5" style={{ backgroundColor: C.border }} />
        <h3 className="text-base font-bold mb-4" style={{ color: C.text }}>{title}</h3>
        {children}
      </div>
    </div>
  );
}

// ─── 미리보기 페이지 ─────────────────────────────────────────
export default function PreviewPage() {
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: C.bg }}>
      <div className="max-w-lg mx-auto space-y-8">
        <div>
          <h1 className="text-xl font-bold mb-1" style={{ color: C.text }}>
            컴포넌트 미리보기
          </h1>
          <p className="text-xs" style={{ color: C.textFaint }}>
            공통 컴포넌트 샘플입니다.
          </p>
        </div>

        {/* Button */}
        <Card>
          <SectionTitle title="Button" />
          <div className="flex flex-wrap gap-3">
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="black">Black</Button>
            <Button variant="primary" size="sm">Small</Button>
            <Button variant="primary" disabled>Disabled</Button>
          </div>
          <div className="mt-3">
            <Button variant="primary" size="lg">Full Width</Button>
          </div>
        </Card>

        {/* Tag / PnlTag */}
        <Card>
          <SectionTitle title="Tag & PnlTag" />
          <div className="flex flex-wrap gap-2">
            <Tag label="KOSPI" color="green" />
            <Tag label="AI" color="blue" />
            <Tag label="배당주" color="orange" />
            <Tag label="성장주" color="gray" />
            <Tag label="매수" color="green" />
            <Tag label="매도" color="gray" />
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            <PnlTag value={12.34} />
            <PnlTag value={-5.67} />
            <PnlTag value={0.0} />
          </div>
        </Card>

        {/* Input */}
        <Card>
          <SectionTitle title="Input" />
          <div className="space-y-5">
            <Input label="종목명" placeholder="삼성전자" />
            <Input label="가격" placeholder="72,000" type="number" />
            <Input label="이메일" placeholder="example@email.com" type="email" />
          </div>
        </Card>

        {/* Card 예시 */}
        <Card>
          <SectionTitle
            title="보유 종목"
            action={<Button variant="secondary" size="sm">+ 추가</Button>}
          />
          <div className="space-y-3">
            {[
              { name: "삼성전자", ticker: "005930", pnl: 8.32, amount: "1,234,000" },
              { name: "NVIDIA", ticker: "NVDA", pnl: -3.21, amount: "2,340,000" },
            ].map((item) => (
              <div key={item.ticker} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold" style={{ color: C.text }}>{item.name}</p>
                  <p className="text-xs mt-0.5" style={{ color: C.textFaint }}>{item.ticker}</p>
                </div>
                <div className="text-right flex flex-col items-end gap-1">
                  <p className="text-sm font-semibold" style={{ color: C.text }}>
                    ₩{item.amount}
                  </p>
                  <PnlTag value={item.pnl} />
                </div>
              </div>
            ))}
          </div>

          <Divider />
          <EmptyState message="보유 종목이 없습니다" />
        </Card>

        {/* LoadingSpinner */}
        <Card>
          <SectionTitle title="LoadingSpinner" />
          <div className="flex gap-4 items-center">
            <LoadingSpinner size={20} />
            <LoadingSpinner size={28} />
            <LoadingSpinner size={36} />
          </div>
        </Card>

        {/* BottomSheet */}
        <Card>
          <SectionTitle title="BottomSheet" />
          <Button variant="primary" onClick={() => setSheetOpen(true)}>
            바텀시트 열기
          </Button>
        </Card>

        <BottomSheet
          open={sheetOpen}
          onClose={() => setSheetOpen(false)}
          title="매매 등록"
        >
          <div className="space-y-5">
            <Input label="종목명" placeholder="삼성전자" />
            <Input label="가격" placeholder="72,000" />
            <Input label="수량" placeholder="10" />
            <div className="flex flex-wrap gap-2">
              <Tag label="실적호조" color="green" />
              <Tag label="기술적분석" color="blue" />
              <Tag label="저평가" color="orange" />
            </div>
            <Button variant="primary" size="lg">저장</Button>
          </div>
        </BottomSheet>
      </div>
    </div>
  );
}
