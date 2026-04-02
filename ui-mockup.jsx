import { useState, useEffect } from "react";

// ── 디자인 토큰 ──────────────────────────────────────────────
const C = {
  green:       "#05C072",
  greenSoft:   "#E8FBF3",
  greenMid:    "#03A862",
  greenDark:   "#027A47",
  red:         "#F04452",
  redSoft:     "#FFF0F1",
  orange:      "#FF7B00",
  orangeSoft:  "#FFF4EB",
  blue:        "#3182F6",
  blueSoft:    "#EBF3FE",
  purple:      "#7C3AED",
  purpleSoft:  "#F3EFFE",
  white:       "#FFFFFF",
  bg:          "#F5F7F5",
  gray50:      "#F9FAF9",
  gray100:     "#F0F4F0",
  gray200:     "#E4EAE4",
  gray300:     "#C9D4C9",
  gray400:     "#9EAD9E",
  gray500:     "#6B7D6B",
  gray600:     "#4A5C4A",
  gray700:     "#2E3D2E",
  black:       "#1A221A",
  dk_bg:       "#0D1210",
  dk_surface:  "#151C14",
  dk_card:     "#1D2720",
  dk_border:   "#2A3828",
  dk_text:     "#DCE8DC",
  dk_muted:    "#5C7A5C",
};

// ── 공통 컴포넌트 ─────────────────────────────────────────────

const Tag = ({ children, color = C.green, bg = C.greenSoft }) => (
  <span style={{ display: "inline-flex", alignItems: "center", background: bg, color, borderRadius: 6, padding: "3px 8px", fontSize: 11, fontWeight: 600, whiteSpace: "nowrap" }}>{children}</span>
);

const PnlTag = ({ v }) => (
  <Tag color={v >= 0 ? C.green : C.red} bg={v >= 0 ? C.greenSoft : C.redSoft}>{v >= 0 ? "+" : ""}{v}%</Tag>
);

const Card = ({ children, style = {}, d }) => (
  <div style={{ background: d ? C.dk_card : C.white, borderRadius: 16, padding: 20, border: d ? `1px solid ${C.dk_border}` : "none", boxShadow: d ? "none" : "0 1px 4px rgba(0,0,0,0.05)", ...style }}>{children}</div>
);

const Input = ({ label, placeholder, defaultValue, d, type = "text" }) => (
  <div style={{ marginBottom: 16 }}>
    {label && <div style={{ fontSize: 12, color: d ? C.dk_muted : C.gray500, marginBottom: 5, fontWeight: 500 }}>{label}</div>}
    <input type={type} defaultValue={defaultValue} placeholder={placeholder}
      style={{ width: "100%", border: "none", borderBottom: `2px solid ${d ? C.dk_border : C.gray200}`, background: "transparent", padding: "10px 0", fontSize: 15, color: d ? C.dk_text : C.black, outline: "none", boxSizing: "border-box" }} />
  </div>
);

const Btn = ({ children, variant = "primary", onClick, full, d, style: s = {} }) => {
  const v = {
    primary: { background: C.green, color: "#fff" },
    secondary: { background: d ? C.dk_card : C.gray100, color: d ? C.dk_text : C.gray700, border: d ? `1px solid ${C.dk_border}` : "none" },
    black: { background: C.black, color: "#fff" },
    outline: { background: "transparent", color: C.green, border: `1.5px solid ${C.green}` },
  };
  return (
    <button onClick={onClick} style={{ border: "none", borderRadius: 12, padding: "13px 20px", fontSize: 14, fontWeight: 700, cursor: "pointer", width: full ? "100%" : "auto", transition: "opacity 0.15s", ...v[variant], ...s }}>{children}</button>
  );
};

const Divider = ({ d }) => <div style={{ height: 1, background: d ? C.dk_border : C.gray100, margin: "4px 0" }} />;
const SecTitle = ({ children, d }) => <div style={{ fontSize: 15, fontWeight: 700, color: d ? C.dk_text : C.black, letterSpacing: "-0.02em", marginBottom: 12, marginTop: 24 }}>{children}</div>;

// ── 바텀시트 모달 ─────────────────────────────────────────────

const Sheet = ({ title, subtitle, onClose, children, d }) => (
  <div style={{ position: "absolute", inset: 0, zIndex: 200 }}>
    <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)" }} />
    <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: d ? C.dk_surface : C.white, borderRadius: "24px 24px 0 0", padding: "12px 20px 44px", maxHeight: "88%", overflowY: "auto", boxShadow: "0 -8px 40px rgba(0,0,0,0.15)" }}>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
        <div style={{ width: 36, height: 4, background: d ? C.dk_border : C.gray200, borderRadius: 2 }} />
      </div>
      {title && <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: d ? C.dk_text : C.black }}>{title}</div>
        {subtitle && <div style={{ fontSize: 13, color: d ? C.dk_muted : C.gray500, marginTop: 2 }}>{subtitle}</div>}
      </div>}
      {children}
    </div>
  </div>
);

// ── 로그인 화면 ───────────────────────────────────────────────

const Login = ({ d, onLogin, onGoRegister }) => (
  <div style={{ minHeight: "100vh", background: d ? C.dk_bg : C.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
    <div style={{ width: "100%", maxWidth: 400 }}>
      {/* 로고 */}
      <div style={{ textAlign: "center", marginBottom: 40 }}>
        <div style={{ width: 56, height: 56, borderRadius: 16, background: C.green, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, margin: "0 auto 12px", boxShadow: `0 8px 24px ${C.green}44` }}>📈</div>
        <div style={{ fontSize: 24, fontWeight: 800, color: d ? C.dk_text : C.black, letterSpacing: "-0.03em" }}>InvestLog</div>
        <div style={{ fontSize: 13, color: d ? C.dk_muted : C.gray500, marginTop: 4 }}>나만의 투자 관리 서비스</div>
      </div>

      {/* 로그인 카드 */}
      <Card d={d} style={{ padding: "28px 24px" }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: d ? C.dk_text : C.black, marginBottom: 24 }}>로그인</div>
        <Input label="이메일" placeholder="example@email.com" d={d} type="email" />
        <Input label="비밀번호" placeholder="비밀번호를 입력하세요" d={d} type="password" />

        {/* 오류 메시지 예시 */}
        <div style={{ background: C.redSoft, borderRadius: 10, padding: "10px 14px", fontSize: 13, color: C.red, marginBottom: 16, display: "none" }}>
          이메일 또는 비밀번호가 틀렸어요.
        </div>

        <Btn variant="primary" full onClick={onLogin} style={{ marginTop: 8, padding: "15px 0", fontSize: 15 }}>로그인</Btn>

        {/* 구분선 */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "20px 0" }}>
          <div style={{ flex: 1, height: 1, background: d ? C.dk_border : C.gray200 }} />
          <span style={{ fontSize: 12, color: d ? C.dk_muted : C.gray400 }}>또는</span>
          <div style={{ flex: 1, height: 1, background: d ? C.dk_border : C.gray200 }} />
        </div>

        {/* 소셜 로그인 */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button style={{ width: "100%", padding: "13px 0", borderRadius: 12, border: `1px solid ${d ? C.dk_border : C.gray200}`, background: d ? C.dk_card : C.white, fontSize: 14, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, color: d ? C.dk_text : C.black }}>
            <span style={{ fontSize: 18 }}>G</span> Google로 로그인
          </button>
          <button style={{ width: "100%", padding: "13px 0", borderRadius: 12, border: "none", background: "#FEE500", fontSize: 14, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, color: "#191919" }}>
            <span style={{ fontSize: 18 }}>💬</span> 카카오로 로그인
          </button>
        </div>
      </Card>

      {/* 회원가입 링크 */}
      <div style={{ textAlign: "center", marginTop: 20 }}>
        <span style={{ fontSize: 14, color: d ? C.dk_muted : C.gray500 }}>아직 계정이 없으신가요? </span>
        <button onClick={onGoRegister} style={{ fontSize: 14, fontWeight: 700, color: C.green, background: "none", border: "none", cursor: "pointer" }}>회원가입</button>
      </div>
    </div>
  </div>
);

// ── 회원가입 화면 ─────────────────────────────────────────────

const Register = ({ d, onRegister, onGoLogin }) => {
  const [step, setStep] = useState(1); // 1: 입력, 2: 완료
  return (
    <div style={{ minHeight: "100vh", background: d ? C.dk_bg : C.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: C.green, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, margin: "0 auto 10px", boxShadow: `0 6px 20px ${C.green}44` }}>📈</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: d ? C.dk_text : C.black, letterSpacing: "-0.03em" }}>InvestLog</div>
        </div>

        {step === 1 ? (
          <Card d={d} style={{ padding: "28px 24px" }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: d ? C.dk_text : C.black, marginBottom: 4 }}>회원가입</div>
            <div style={{ fontSize: 13, color: d ? C.dk_muted : C.gray500, marginBottom: 24 }}>투자 기록을 시작해보세요</div>

            <Input label="이름" placeholder="홍길동" d={d} />
            <Input label="이메일" placeholder="example@email.com" d={d} type="email" />
            <Input label="비밀번호" placeholder="8자 이상 입력" d={d} type="password" />
            <Input label="비밀번호 확인" placeholder="비밀번호를 다시 입력" d={d} type="password" />

            {/* 이메일 중복 오류 예시 */}
            <div style={{ background: C.redSoft, borderRadius: 10, padding: "10px 14px", fontSize: 13, color: C.red, marginBottom: 12 }}>
              이미 사용 중인 이메일이에요.
            </div>

            <Btn variant="primary" full onClick={() => setStep(2)} style={{ padding: "15px 0", fontSize: 15 }}>가입하기</Btn>
          </Card>
        ) : (
          <Card d={d} style={{ padding: "40px 24px", textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: d ? C.dk_text : C.black, marginBottom: 8 }}>가입 완료!</div>
            <div style={{ fontSize: 14, color: d ? C.dk_muted : C.gray500, lineHeight: 1.7, marginBottom: 28 }}>
              InvestLog에 오신 걸 환영해요.<br />나만의 투자 기록을 시작해볼까요?
            </div>
            <Btn variant="primary" full onClick={onRegister} style={{ padding: "15px 0", fontSize: 15 }}>시작하기 →</Btn>
          </Card>
        )}

        {step === 1 && (
          <div style={{ textAlign: "center", marginTop: 20 }}>
            <span style={{ fontSize: 14, color: d ? C.dk_muted : C.gray500 }}>이미 계정이 있으신가요? </span>
            <button onClick={onGoLogin} style={{ fontSize: 14, fontWeight: 700, color: C.green, background: "none", border: "none", cursor: "pointer" }}>로그인</button>
          </div>
        )}
      </div>
    </div>
  );
};

// ── 온보딩 화면 ───────────────────────────────────────────────

const Onboarding = ({ d, onComplete }) => {
  const [step, setStep] = useState(1);
  const [accounts, setAccounts] = useState([
    { id: 1, name: "키움증권 (국내)", cash: "", holdings: [{ name: "삼성전자", ticker: "005930", avg: "72,000", qty: "50" }] },
  ]);
  const [searchVal, setSearchVal] = useState("");
  const [showDrop, setShowDrop] = useState(false);

  const searchResults = [
    { name: "삼성전자", ticker: "005930", market: "KOSPI" },
    { name: "삼성SDI", ticker: "006400", market: "KOSPI" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: d ? C.dk_bg : C.bg, padding: "24px 20px 60px" }}>
      <div style={{ maxWidth: 480, margin: "0 auto" }}>

        {/* 헤더 */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: C.green, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>📈</div>
            <span style={{ fontSize: 15, fontWeight: 700, color: C.green }}>InvestLog</span>
          </div>
          {/* 진행 바 */}
          <div style={{ height: 4, background: d ? C.dk_border : C.gray200, borderRadius: 2, marginBottom: 10 }}>
            <div style={{ width: step === 1 ? "50%" : "100%", height: "100%", background: C.green, borderRadius: 2, transition: "width 0.3s ease" }} />
          </div>
          <div style={{ fontSize: 12, color: d ? C.dk_muted : C.gray400 }}>{step} / 2 단계</div>
        </div>

        {step === 1 ? (
          <>
            <div style={{ fontSize: 22, fontWeight: 800, color: d ? C.dk_text : C.black, letterSpacing: "-0.03em", marginBottom: 6 }}>계좌와 종목을 등록해요</div>
            <div style={{ fontSize: 14, color: d ? C.dk_muted : C.gray500, marginBottom: 24, lineHeight: 1.6 }}>현재 보유 중인 계좌와 종목을 입력해주세요.<br />나중에 언제든지 수정할 수 있어요.</div>

            {accounts.map((acc, ai) => (
              <Card key={acc.id} d={d} style={{ marginBottom: 12 }}>
                {/* 계좌명 */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: d ? C.dk_text : C.black }}>계좌 {ai + 1}</div>
                  {ai > 0 && <button style={{ fontSize: 12, color: C.red, background: "none", border: "none", cursor: "pointer" }}>삭제</button>}
                </div>
                <Input label="계좌명" placeholder="예: 키움증권 (국내)" defaultValue={acc.name} d={d} />

                {/* 예수금 */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 12, color: d ? C.dk_muted : C.gray500, marginBottom: 5, fontWeight: 500 }}>
                    예수금 <span style={{ color: d ? C.dk_muted : C.gray400, fontWeight: 400 }}>(선택)</span>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input placeholder="0" defaultValue={acc.cash} style={{ flex: 1, border: "none", borderBottom: `2px solid ${d ? C.dk_border : C.gray200}`, background: "transparent", padding: "10px 0", fontSize: 15, color: d ? C.dk_text : C.black, outline: "none" }} />
                    <div style={{ background: d ? C.dk_border : C.gray100, borderRadius: 8, padding: "6px 12px", fontSize: 13, fontWeight: 600, color: d ? C.dk_muted : C.gray600 }}>KRW</div>
                  </div>
                  <div style={{ fontSize: 11, color: d ? C.dk_muted : C.gray400, marginTop: 5 }}>💡 나중에 계좌 상세에서도 입력할 수 있어요</div>
                </div>

                <Divider d={d} />

                {/* 종목 목록 */}
                <div style={{ marginTop: 14 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: d ? C.dk_text : C.black, marginBottom: 10 }}>보유 종목</div>

                  {acc.holdings.map((h, hi) => (
                    <div key={hi} style={{ background: d ? C.dk_border : C.gray50, borderRadius: 10, padding: "10px 12px", marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: d ? C.dk_text : C.black }}>{h.name}</div>
                        <div style={{ fontSize: 11, color: d ? C.dk_muted : C.gray400, marginTop: 1 }}>{h.ticker} · 평단 {h.avg}원 · {h.qty}주</div>
                      </div>
                      <button style={{ fontSize: 12, color: C.red, background: "none", border: "none", cursor: "pointer" }}>삭제</button>
                    </div>
                  ))}

                  {/* 종목 검색 */}
                  <div style={{ position: "relative", marginTop: 8 }}>
                    <div style={{ background: d ? C.dk_border : C.gray100, borderRadius: 10, padding: "10px 12px", display: "flex", gap: 8, alignItems: "center" }}>
                      <span style={{ fontSize: 14 }}>🔍</span>
                      <input
                        value={searchVal}
                        onChange={e => { setSearchVal(e.target.value); setShowDrop(e.target.value.length > 0); }}
                        placeholder="종목명 검색 (예: 삼성전자)"
                        style={{ flex: 1, border: "none", background: "transparent", fontSize: 13, color: d ? C.dk_text : C.black, outline: "none" }}
                      />
                    </div>

                    {/* 자동완성 드롭다운 */}
                    {showDrop && (
                      <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: d ? C.dk_surface : C.white, borderRadius: 10, boxShadow: "0 4px 20px rgba(0,0,0,0.12)", zIndex: 50, marginTop: 4, overflow: "hidden", border: d ? `1px solid ${C.dk_border}` : "none" }}>
                        {searchResults.map((r, i) => (
                          <div key={i} onClick={() => { setSearchVal(""); setShowDrop(false); }} style={{ padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", borderBottom: i < searchResults.length - 1 ? `1px solid ${d ? C.dk_border : C.gray100}` : "none" }}>
                            <div>
                              <div style={{ fontSize: 14, fontWeight: 600, color: d ? C.dk_text : C.black }}>{r.name}</div>
                              <div style={{ fontSize: 11, color: d ? C.dk_muted : C.gray400, marginTop: 1 }}>{r.market}</div>
                            </div>
                            <Tag color={d ? C.dk_muted : C.gray500} bg={d ? C.dk_border : C.gray100}>{r.ticker}</Tag>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}

            {/* 계좌 추가 */}
            <button onClick={() => setAccounts(prev => [...prev, { id: Date.now(), name: "", cash: "", holdings: [] }])}
              style={{ width: "100%", padding: "13px 0", borderRadius: 12, border: `1.5px dashed ${d ? C.dk_border : C.gray300}`, background: "transparent", fontSize: 14, fontWeight: 600, color: d ? C.dk_muted : C.gray500, cursor: "pointer", marginBottom: 20 }}>
              + 계좌 추가
            </button>

            <div style={{ display: "flex", gap: 10 }}>
              <Btn variant="secondary" d={d} onClick={onComplete} style={{ flex: 1 }}>건너뛰기</Btn>
              <Btn variant="primary" onClick={() => setStep(2)} style={{ flex: 2, padding: "13px 0" }}>다음 →</Btn>
            </div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 22, fontWeight: 800, color: d ? C.dk_text : C.black, letterSpacing: "-0.03em", marginBottom: 6 }}>첫 매매를 기록해요</div>
            <div style={{ fontSize: 14, color: d ? C.dk_muted : C.gray500, marginBottom: 24, lineHeight: 1.6 }}>매매 이유를 기록하면 나중에<br />내 투자 성향을 분석할 수 있어요.</div>

            <Card d={d} style={{ marginBottom: 12 }}>
              {/* 매수/매도 토글 */}
              <div style={{ display: "flex", background: d ? C.dk_border : C.gray100, borderRadius: 12, padding: 3, marginBottom: 16 }}>
                {["매수", "매도"].map((t, i) => (
                  <button key={t} style={{ flex: 1, border: "none", borderRadius: 10, padding: "9px 0", fontSize: 14, fontWeight: 700, cursor: "pointer", background: i === 0 ? C.green : "transparent", color: i === 0 ? "#fff" : (d ? C.dk_muted : C.gray500) }}>{t}</button>
                ))}
              </div>

              {/* 종목 */}
              <div style={{ background: d ? C.dk_border : C.gray100, borderRadius: 10, padding: "12px 14px", marginBottom: 14, display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 14, color: d ? C.dk_muted : C.gray500 }}>종목명으로 검색</span>
                <span>🔍</span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                <Input label="가격 🔴 필수" placeholder="0" d={d} />
                <Input label="수량 🔴 필수" placeholder="0" d={d} />
              </div>

              {/* 이유 태그 */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: d ? C.dk_text : C.black, marginBottom: 8 }}>
                  매수 이유 <span style={{ fontSize: 11, color: d ? C.dk_muted : C.gray400, fontWeight: 400 }}>(선택 — 나중에 추가 가능)</span>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {["기술적분석", "저평가", "테마/트렌드", "실적호조", "분할매수"].map((tag, i) => (
                    <button key={tag} style={{ background: i === 0 ? C.green : (d ? C.dk_border : C.gray100), color: i === 0 ? "#fff" : (d ? C.dk_muted : C.gray600), border: "none", borderRadius: 8, padding: "7px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{tag}</button>
                  ))}
                </div>
              </div>

              {/* 심리 */}
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: d ? C.dk_text : C.black, marginBottom: 8 }}>
                  심리 상태 <span style={{ fontSize: 11, color: d ? C.dk_muted : C.gray400, fontWeight: 400 }}>(선택)</span>
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {["확신", "불안", "FOMO", "기계적"].map((e, i) => (
                    <button key={e} style={{ background: i === 0 ? C.greenSoft : (d ? C.dk_border : C.gray100), color: i === 0 ? C.green : (d ? C.dk_muted : C.gray600), border: "none", borderRadius: 8, padding: "7px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{e}</button>
                  ))}
                </div>
              </div>
            </Card>

            {/* 태그 미완성 알림 */}
            <div style={{ background: d ? C.dk_card : C.greenSoft, borderRadius: 12, padding: "12px 14px", marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center", border: d ? `1px solid ${C.dk_border}` : "none" }}>
              <div style={{ fontSize: 13, color: d ? C.dk_muted : C.green }}>📝 이유 태그 없이 저장해도 괜찮아요.<br /><span style={{ fontSize: 11 }}>나중에 매매일지에서 추가할 수 있어요.</span></div>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setStep(1)} style={{ flex: 1, padding: "13px 0", borderRadius: 12, border: "none", background: d ? C.dk_card : C.gray100, color: d ? C.dk_text : C.gray700, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>← 이전</button>
              <Btn variant="secondary" d={d} onClick={onComplete} style={{ flex: 1 }}>건너뛰기</Btn>
              <Btn variant="primary" onClick={onComplete} style={{ flex: 2, padding: "13px 0" }}>완료 🎉</Btn>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// ── 아이콘 사이드바 (PC) ─────────────────────────────────────

const IconSidebar = ({ page, go, d, toggleD }) => {
  const [hovered, setHovered] = useState(null);
  const nav = [
    { id: "dashboard",   icon: "📊", label: "대시보드" },
    { id: "accounts",    icon: "💳", label: "계좌 관리" },
    { id: "trades",      icon: "📝", label: "매매일지" },
    { id: "analysis",    icon: "🔍", label: "종목 분석" },
    { id: "personality", icon: "🧠", label: "투자 성향" },
  ];
  return (
    <div style={{ width: 64, flexShrink: 0, background: d ? C.dk_surface : C.white, borderRight: `1px solid ${d ? C.dk_border : C.gray100}`, height: "100vh", position: "sticky", top: 0, display: "flex", flexDirection: "column", alignItems: "center", padding: "20px 0" }}>
      <div style={{ width: 36, height: 36, borderRadius: 10, background: C.green, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, marginBottom: 28, flexShrink: 0, boxShadow: `0 4px 12px ${C.green}44` }}>📈</div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4, width: "100%" }}>
        {nav.map(item => (
          <div key={item.id} style={{ position: "relative" }} onMouseEnter={() => setHovered(item.id)} onMouseLeave={() => setHovered(null)}>
            <button onClick={() => go(item.id)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: "10px 0", border: "none", background: page === item.id ? (d ? `${C.green}22` : C.greenSoft) : "transparent", cursor: "pointer", borderRadius: 0, fontSize: 20, position: "relative" }}>
              {page === item.id && <div style={{ position: "absolute", left: 0, top: "20%", bottom: "20%", width: 3, background: C.green, borderRadius: "0 2px 2px 0" }} />}
              <span style={{ opacity: page === item.id ? 1 : 0.45 }}>{item.icon}</span>
            </button>
            {hovered === item.id && (
              <div style={{ position: "absolute", left: 70, top: "50%", transform: "translateY(-50%)", background: d ? C.dk_card : C.black, color: "#fff", fontSize: 12, fontWeight: 600, padding: "5px 10px", borderRadius: 8, whiteSpace: "nowrap", zIndex: 300, boxShadow: "0 4px 12px rgba(0,0,0,0.2)" }}>
                {item.label}
                <div style={{ position: "absolute", left: -4, top: "50%", transform: "translateY(-50%)", width: 0, height: 0, borderTop: "5px solid transparent", borderBottom: "5px solid transparent", borderRight: `5px solid ${d ? C.dk_card : C.black}` }} />
              </div>
            )}
          </div>
        ))}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "center" }}>
        <button onClick={toggleD} style={{ width: 40, height: 40, borderRadius: 10, border: "none", background: d ? C.dk_border : C.gray100, fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>{d ? "☀️" : "🌙"}</button>
        <div style={{ width: 32, height: 32, borderRadius: "50%", background: C.green, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 12, fontWeight: 800, boxShadow: `0 2px 8px ${C.green}44`, marginTop: 4 }}>준</div>
      </div>
    </div>
  );
};

// ── 바텀 네비 (모바일) ────────────────────────────────────────

const BottomNav = ({ page, go, d }) => (
  <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: d ? C.dk_surface : C.white, borderTop: `1px solid ${d ? C.dk_border : C.gray100}`, display: "flex", justifyContent: "space-around", padding: "8px 0 20px", zIndex: 50 }}>
    {[
      { id: "dashboard",   icon: "📊", label: "홈" },
      { id: "accounts",    icon: "💳", label: "계좌" },
      { id: "trades",      icon: "📝", label: "매매" },
      { id: "analysis",    icon: "🔍", label: "분석" },
      { id: "personality", icon: "🧠", label: "성향" },
    ].map(item => (
      <button key={item.id} onClick={() => go(item.id)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, background: "none", border: "none", cursor: "pointer", opacity: page === item.id ? 1 : 0.35, padding: "4px 12px" }}>
        <span style={{ fontSize: 22 }}>{item.icon}</span>
        <span style={{ fontSize: 10, fontWeight: page === item.id ? 700 : 400, color: page === item.id ? C.green : (d ? C.dk_muted : C.gray500) }}>{item.label}</span>
      </button>
    ))}
  </div>
);

// ── 페이지들 (기존 동일) ──────────────────────────────────────

const Dashboard = ({ d, mobile }) => (
  <div>
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontSize: 13, color: d ? C.dk_muted : C.gray500 }}>안녕하세요, 준호님 👋</div>
      <div style={{ fontSize: mobile ? 24 : 28, fontWeight: 800, color: d ? C.dk_text : C.black, letterSpacing: "-0.04em", marginTop: 2 }}>내 투자 현황</div>
    </div>
    <div style={{ background: `linear-gradient(135deg, ${C.greenDark || "#027A47"} 0%, ${C.green} 100%)`, borderRadius: 20, padding: 24, marginBottom: 16, position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: -60, right: -60, width: 200, height: 200, borderRadius: "50%", background: "rgba(255,255,255,0.06)" }} />
      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", marginBottom: 6 }}>총 보유 자산</div>
      <div style={{ fontSize: mobile ? 32 : 40, fontWeight: 800, color: "#fff", letterSpacing: "-0.04em", lineHeight: 1.1 }}>37,842,000<span style={{ fontSize: mobile ? 18 : 22, fontWeight: 400 }}>원</span></div>
      <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 8 }}>
        <span style={{ background: "rgba(255,255,255,0.2)", color: "#fff", borderRadius: 6, padding: "3px 9px", fontSize: 12, fontWeight: 700 }}>+842,000원 +2.27%</span>
        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>전일 대비</span>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
        {[{ label: "국내주식", value: "₩18.2M" }, { label: "해외주식", value: "$14.2K" }, { label: "예수금", value: "₩5.2M" }].map(i => (
          <div key={i.label} style={{ flex: 1, background: "rgba(255,255,255,0.12)", borderRadius: 12, padding: "12px 10px" }}>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginBottom: 4 }}>{i.label}</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>{i.value}</div>
          </div>
        ))}
      </div>
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10, marginBottom: 16 }}>
      {[{ label: "총 수익률", value: "+12.4%", color: C.green }, { label: "총 수익금", value: "₩4.2M", color: C.green }, { label: "보유 종목", value: "6종목" }, { label: "총 계좌", value: "2개" }].map(s => (
        <Card key={s.label} d={d} style={{ padding: "16px 18px" }}>
          <div style={{ fontSize: 12, color: d ? C.dk_muted : C.gray500, marginBottom: 6 }}>{s.label}</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: s.color || (d ? C.dk_text : C.black), letterSpacing: "-0.03em" }}>{s.value}</div>
        </Card>
      ))}
    </div>
    <Card d={d} style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: d ? C.dk_text : C.black, marginBottom: 14 }}>자산 배분</div>
      <div style={{ height: 10, borderRadius: 5, overflow: "hidden", display: "flex", marginBottom: 14 }}>
        <div style={{ width: "48%", background: C.green }} /><div style={{ width: "38%", background: C.greenMid, opacity: 0.6 }} /><div style={{ width: "9%", background: C.orange }} /><div style={{ width: "5%", background: C.gray300 }} />
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
        {[{ color: C.green, label: "국내주식", value: "48%" }, { color: C.greenMid, label: "해외주식", value: "38%" }, { color: C.orange, label: "원화 예수금", value: "9%" }, { color: C.gray300, label: "달러 예수금", value: "5%" }].map(i => (
          <div key={i.label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: i.color }} />
            <span style={{ fontSize: 12, color: d ? C.dk_muted : C.gray500 }}>{i.label}</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: d ? C.dk_text : C.black }}>{i.value}</span>
          </div>
        ))}
      </div>
    </Card>
    <SecTitle d={d}>계좌 현황</SecTitle>
    {[{ name: "키움증권", type: "국내", stocks: 3, pnl: 12.4, cash: "₩5.2M" }, { name: "미래에셋", type: "해외", stocks: 3, pnl: -2.1, cash: "$3.2K" }].map(a => (
      <Card key={a.name} d={d} style={{ marginBottom: 10, cursor: "pointer" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: d ? C.dk_border : C.greenSoft, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>💳</div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: d ? C.dk_text : C.black }}>{a.name}</div>
              <div style={{ fontSize: 12, color: d ? C.dk_muted : C.gray400, marginTop: 1 }}>{a.type} · {a.stocks}종목 · {a.cash}</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}><PnlTag v={a.pnl} /><span style={{ color: d ? C.dk_muted : C.gray300, fontSize: 16 }}>›</span></div>
        </div>
      </Card>
    ))}
  </div>
);

const Accounts = ({ d, onModal }) => {
  const [tab, setTab] = useState("기본 섹터");
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24 }}>
        <div><div style={{ fontSize: 13, color: d ? C.dk_muted : C.gray500 }}>계좌 상세</div><div style={{ fontSize: 26, fontWeight: 800, color: d ? C.dk_text : C.black, letterSpacing: "-0.04em" }}>키움증권</div></div>
        <Tag>국내주식</Tag>
      </div>
      <div style={{ background: `linear-gradient(135deg, ${C.green}, ${C.greenMid})`, borderRadius: 20, padding: 22, marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", marginBottom: 4 }}>원화 예수금 ⓘ</div>
        <div style={{ fontSize: 28, fontWeight: 800, color: "#fff", letterSpacing: "-0.03em" }}>5,230,000원</div>
        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          <button onClick={() => onModal("deposit")} style={{ flex: 1, background: "rgba(255,255,255,0.2)", color: "#fff", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 10, padding: "9px 0", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>+ 입금</button>
          <button onClick={() => onModal("withdraw")} style={{ flex: 1, background: "rgba(255,255,255,0.1)", color: "#fff", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 10, padding: "9px 0", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>출금</button>
        </div>
      </div>
      <SecTitle d={d}>보유 종목</SecTitle>
      {[
        { name: "삼성전자", ticker: "005930", avg: 72000, cur: 78500, qty: 50, pnl: 9.0, sector: "반도체", myTag: "AI반도체", tags: ["AI", "배당주"] },
        { name: "SK하이닉스", ticker: "000660", avg: 135000, cur: 198000, qty: 20, pnl: 46.7, sector: "반도체", myTag: null, tags: [] },
        { name: "NAVER", ticker: "035420", avg: 189000, cur: 178000, qty: 10, pnl: -5.8, sector: "IT서비스", myTag: null, tags: [] },
      ].map(s => (
        <Card key={s.ticker} d={d} style={{ marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
            <div><div style={{ fontSize: 15, fontWeight: 700, color: d ? C.dk_text : C.black }}>{s.name}</div><div style={{ fontSize: 12, color: d ? C.dk_muted : C.gray400, marginTop: 1 }}>{s.ticker} · {s.qty}주 · 평단 {s.avg.toLocaleString()}원</div></div>
            <div style={{ textAlign: "right" }}><div style={{ fontSize: 15, fontWeight: 700, color: d ? C.dk_text : C.black }}>{(s.cur * s.qty).toLocaleString()}원</div><div style={{ fontSize: 12, color: d ? C.dk_muted : C.gray400 }}>{s.cur.toLocaleString()}원</div></div>
          </div>
          <Divider d={d} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              <Tag color={d ? C.dk_muted : C.gray500} bg={d ? C.dk_border : C.gray100}>{s.sector}</Tag>
              {s.myTag && <Tag>{s.myTag}</Tag>}
              {s.tags.map(t => <Tag key={t} color={C.purple} bg={C.purpleSoft}>{t}</Tag>)}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}><PnlTag v={s.pnl} /><button onClick={() => onModal("sectorEdit")} style={{ fontSize: 12, color: C.green, background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>편집</button></div>
          </div>
        </Card>
      ))}
      <SecTitle d={d}>최근 매매</SecTitle>
      <Card d={d} style={{ marginBottom: 16 }}>
        {[{ date: "03.27", name: "SK하이닉스", type: "매수", price: "135,000원", qty: 20 }, { date: "03.20", name: "삼성전자", type: "매수", price: "72,000원", qty: 50 }, { date: "03.15", name: "NAVER", type: "매도", price: "195,000원", qty: 5 }].map((t, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: i < 2 ? `1px solid ${d ? C.dk_border : C.gray100}` : "none" }}>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <span style={{ fontSize: 12, color: d ? C.dk_muted : C.gray400, width: 34 }}>{t.date}</span>
              <div><div style={{ fontSize: 14, fontWeight: 600, color: d ? C.dk_text : C.black }}>{t.name}</div><div style={{ fontSize: 11, color: d ? C.dk_muted : C.gray400 }}>{t.qty}주 · {t.price}</div></div>
            </div>
            <Tag color={t.type === "매수" ? C.green : C.red} bg={t.type === "매수" ? C.greenSoft : C.redSoft}>{t.type}</Tag>
          </div>
        ))}
        <button style={{ width: "100%", background: "none", border: "none", color: C.green, fontSize: 13, fontWeight: 700, padding: "12px 0 4px", cursor: "pointer" }}>전체 매매일지 보기 →</button>
      </Card>
      <SecTitle d={d}>섹터 분포</SecTitle>
      <Card d={d}>
        <div style={{ display: "flex", background: d ? C.dk_border : C.gray100, borderRadius: 10, padding: 3, marginBottom: 16 }}>
          {["기본 섹터", "내 섹터"].map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ flex: 1, border: "none", borderRadius: 8, padding: "8px 0", fontSize: 13, fontWeight: 600, cursor: "pointer", background: tab === t ? (d ? C.dk_card : C.white) : "transparent", color: tab === t ? (d ? C.dk_text : C.black) : (d ? C.dk_muted : C.gray500), boxShadow: tab === t ? "0 1px 4px rgba(0,0,0,0.08)" : "none" }}>{t}</button>
          ))}
        </div>
        {[{ label: "반도체", pct: 70, color: C.green }, { label: "IT서비스", pct: 30, color: C.greenMid }].map(item => (
          <div key={item.label} style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}><span style={{ fontSize: 13, color: d ? C.dk_text : C.gray700 }}>{item.label}</span><span style={{ fontSize: 13, fontWeight: 700, color: d ? C.dk_text : C.black }}>{item.pct}%</span></div>
            <div style={{ height: 8, background: d ? C.dk_border : C.gray100, borderRadius: 4 }}><div style={{ width: `${item.pct}%`, height: "100%", background: item.color, borderRadius: 4 }} /></div>
          </div>
        ))}
      </Card>
    </div>
  );
};

const Trades = ({ d, mobile, onModal }) => (
  <div>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24 }}>
      <div><div style={{ fontSize: 26, fontWeight: 800, color: d ? C.dk_text : C.black, letterSpacing: "-0.04em" }}>매매일지</div><div style={{ fontSize: 13, color: d ? C.dk_muted : C.gray500, marginTop: 2 }}>내 모든 매매 기록</div></div>
      {!mobile && <Btn variant="primary" onClick={() => onModal("tradeAdd")}>+ 매매 등록</Btn>}
    </div>
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 20 }}>
      {["전체", "키움증권", "미래에셋", "매수만", "매도만"].map((f, i) => (
        <button key={f} style={{ background: i === 0 ? C.black : (d ? C.dk_card : C.gray100), color: i === 0 ? "#fff" : (d ? C.dk_muted : C.gray600), border: d && i !== 0 ? `1px solid ${C.dk_border}` : "none", borderRadius: 20, padding: "7px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>{f}</button>
      ))}
    </div>
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {[
        { date: "2026.03.27", name: "SK하이닉스", type: "매수", price: "135,000원", qty: 20, tags: ["기술적분석"], emotion: "확신", account: "키움증권" },
        { date: "2026.03.22", name: "NVIDIA", type: "매수", price: "$875", qty: 3, tags: ["테마/트렌드", "추가매수"], emotion: "FOMO", account: "미래에셋" },
        { date: "2026.03.15", name: "NAVER", type: "매도", price: "195,000원", qty: 5, tags: ["목표가달성"], emotion: "기계적", account: "키움증권", pnl: 3.2 },
        { date: "2026.03.10", name: "삼성전자", type: "매수", price: "72,000원", qty: 50, tags: ["저평가", "분할매수"], emotion: "확신", account: "키움증권" },
      ].map((t, i) => (
        <Card key={i} d={d}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ fontSize: 15, fontWeight: 700, color: d ? C.dk_text : C.black }}>{t.name}</span><Tag color={t.type === "매수" ? C.green : C.red} bg={t.type === "매수" ? C.greenSoft : C.redSoft}>{t.type}</Tag></div>
              <div style={{ fontSize: 12, color: d ? C.dk_muted : C.gray400, marginTop: 2 }}>{t.date} · {t.account}</div>
            </div>
            <div style={{ textAlign: "right" }}><div style={{ fontSize: 15, fontWeight: 700, color: d ? C.dk_text : C.black }}>{t.price}</div><div style={{ fontSize: 12, color: d ? C.dk_muted : C.gray400 }}>{t.qty}주</div></div>
          </div>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {t.tags.map(tag => <Tag key={tag} color={d ? C.dk_muted : C.gray600} bg={d ? C.dk_border : C.gray100}>{tag}</Tag>)}
            <Tag color={C.purple} bg={C.purpleSoft}>{t.emotion}</Tag>
            {t.pnl && <Tag color={C.green} bg={C.greenSoft}>수익 +{t.pnl}%</Tag>}
          </div>
        </Card>
      ))}
    </div>
    {mobile && (
      <div style={{ position: "fixed", bottom: 90, right: 20, zIndex: 40 }}>
        <button onClick={() => onModal("tradeAdd")} style={{ width: 52, height: 52, borderRadius: 16, background: C.green, color: "#fff", fontSize: 24, border: "none", cursor: "pointer", boxShadow: `0 4px 20px ${C.green}55` }}>+</button>
      </div>
    )}
  </div>
);

const Analysis = ({ d, onModal }) => (
  <div>
    <div style={{ fontSize: 26, fontWeight: 800, color: d ? C.dk_text : C.black, letterSpacing: "-0.04em", marginBottom: 20 }}>종목 분석</div>
    <div style={{ background: d ? C.dk_card : C.gray100, borderRadius: 14, padding: "12px 16px", display: "flex", alignItems: "center", gap: 8, marginBottom: 20, border: d ? `1px solid ${C.dk_border}` : "none" }}>
      <span>🔍</span>
      <input placeholder="종목명 또는 티커 검색 (예: 삼성전자, NVDA)" style={{ border: "none", background: "transparent", fontSize: 14, color: d ? C.dk_text : C.black, outline: "none", flex: 1 }} />
    </div>
    <Card d={d} style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
        <div><div style={{ fontSize: 20, fontWeight: 800, color: d ? C.dk_text : C.black, letterSpacing: "-0.02em" }}>NVIDIA</div><div style={{ fontSize: 12, color: d ? C.dk_muted : C.gray400, marginTop: 2 }}>NVDA · NASDAQ · Technology</div></div>
        <div style={{ textAlign: "right" }}><div style={{ fontSize: 22, fontWeight: 800, color: d ? C.dk_text : C.black }}><span style={{ fontSize: 14, fontWeight: 400 }}>$</span>875.40</div><Tag color={C.green} bg={C.greenSoft}>+2.3%</Tag></div>
      </div>
      <Divider d={d} />
      <div style={{ fontSize: 13, color: d ? C.dk_muted : C.gray600, lineHeight: 1.7, marginTop: 10 }}>엔비디아는 AI·데이터센터용 GPU를 설계·판매하는 미국 반도체 기업입니다. H100 등 AI 가속기 시장을 주도하며 전 세계 AI 인프라의 핵심 공급자입니다.</div>
    </Card>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8, marginBottom: 16 }}>
      {[{ label: "52주 최고", value: "$974.00" }, { label: "52주 최저", value: "$461.70" }, { label: "Forward PER ⓘ", value: "35.2x" }, { label: "PBR ⓘ", value: "18.4x" }].map(i => (
        <Card key={i.label} d={d} style={{ padding: "14px 16px" }}><div style={{ fontSize: 11, color: d ? C.dk_muted : C.gray400, marginBottom: 5 }}>{i.label}</div><div style={{ fontSize: 17, fontWeight: 700, color: d ? C.dk_text : C.black }}>{i.value}</div></Card>
      ))}
    </div>
    <Card d={d} style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: d ? C.dk_text : C.black }}>MDD 차트 ⓘ</div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <input defaultValue="2024-01-01" style={{ border: "none", background: d ? C.dk_border : C.gray100, borderRadius: 6, padding: "4px 8px", fontSize: 11, color: d ? C.dk_text : C.black, outline: "none", width: 88 }} />
          <span style={{ fontSize: 11, color: d ? C.dk_muted : C.gray400 }}>~</span>
          <input defaultValue="2026-03-29" style={{ border: "none", background: d ? C.dk_border : C.gray100, borderRadius: 6, padding: "4px 8px", fontSize: 11, color: d ? C.dk_text : C.black, outline: "none", width: 88 }} />
        </div>
      </div>
      <div style={{ position: "relative", height: 120, background: d ? C.dk_border : C.gray50, borderRadius: 12, overflow: "hidden" }}>
        <svg width="100%" height="120" style={{ position: "absolute" }}>
          <defs><linearGradient id="gg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C.green} stopOpacity="0.25" /><stop offset="100%" stopColor={C.green} stopOpacity="0" /></linearGradient></defs>
          <polygon points="0,90 0,72 60,58 120,42 180,32 240,22 300,16 360,12 360,90" fill="url(#gg)" />
          <polyline points="0,72 60,58 120,42 180,32 240,22 300,16 360,12" fill="none" stroke={C.green} strokeWidth="2.5" strokeLinejoin="round" />
        </svg>
        <svg width="100%" height="50" style={{ position: "absolute", bottom: 0 }}>
          <defs><linearGradient id="rg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C.red} stopOpacity="0.35" /><stop offset="100%" stopColor={C.red} stopOpacity="0.05" /></linearGradient></defs>
          <polygon points="0,50 0,20 60,28 120,42 180,16 240,32 300,22 360,28 360,50" fill="url(#rg)" />
          <polyline points="0,20 60,28 120,42 180,16 240,32 300,22 360,28" fill="none" stroke={C.red} strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
      </div>
      <div style={{ marginTop: 10, background: d ? `${C.red}18` : C.redSoft, borderRadius: 10, padding: "8px 12px", fontSize: 12, color: C.red }}>📉 조회 기간 중 최대 <b>-34.2%</b> 하락한 적이 있어요. 현재는 고점 대비 <b>-8.1%</b> 수준이에요.</div>
    </Card>
    <Btn variant="primary" full onClick={() => onModal("aiReport")} d={d}>🤖 AI 종목 분석 리포트 생성</Btn>
  </div>
);

const Personality = ({ d, onModal }) => (
  <div>
    <div style={{ fontSize: 26, fontWeight: 800, color: d ? C.dk_text : C.black, letterSpacing: "-0.04em", marginBottom: 4 }}>투자 성향</div>
    <div style={{ fontSize: 13, color: d ? C.dk_muted : C.gray500, marginBottom: 24 }}>내 매매 패턴을 AI가 분석해요</div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10, marginBottom: 16 }}>
      {[{ label: "총 매매 횟수", value: "24건" }, { label: "평균 보유일", value: "43일" }, { label: "전체 승률", value: "62.5%", color: C.green }, { label: "평균 수익률", value: "+8.3%", color: C.green }].map(s => (
        <Card key={s.label} d={d} style={{ padding: "16px 18px" }}><div style={{ fontSize: 12, color: d ? C.dk_muted : C.gray500, marginBottom: 6 }}>{s.label}</div><div style={{ fontSize: 22, fontWeight: 800, color: s.color || (d ? C.dk_text : C.black), letterSpacing: "-0.03em" }}>{s.value}</div></Card>
      ))}
    </div>
    <Card d={d} style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: d ? C.dk_text : C.black, marginBottom: 14 }}>매수 이유 분포</div>
      {[{ label: "기술적분석", pct: 38, color: C.green }, { label: "테마/트렌드", pct: 24, color: C.greenMid }, { label: "저평가", pct: 18, color: C.orange }, { label: "FOMO", pct: 12, color: C.red }, { label: "기타", pct: 8, color: C.gray300 }].map(item => (
        <div key={item.label} style={{ marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}><span style={{ fontSize: 13, color: d ? C.dk_text : C.gray700 }}>{item.label}</span><span style={{ fontSize: 13, fontWeight: 700, color: d ? C.dk_text : C.black }}>{item.pct}%</span></div>
          <div style={{ height: 7, background: d ? C.dk_border : C.gray100, borderRadius: 4 }}><div style={{ width: `${item.pct}%`, height: "100%", background: item.color, borderRadius: 4 }} /></div>
        </div>
      ))}
    </Card>
    <Card d={d} style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: d ? C.dk_text : C.black, marginBottom: 12 }}>심리 상태별 수익률</div>
      {[{ label: "확신", value: "+9.1%", color: C.green }, { label: "기계적", value: "+6.2%", color: C.greenMid }, { label: "불안", value: "+1.8%", color: C.orange }, { label: "FOMO", value: "-5.3%", color: C.red }].map((item, i) => (
        <div key={item.label} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: i < 3 ? `1px solid ${d ? C.dk_border : C.gray100}` : "none" }}><span style={{ fontSize: 14, color: d ? C.dk_muted : C.gray600 }}>{item.label}</span><span style={{ fontSize: 14, fontWeight: 700, color: item.color }}>{item.value}</span></div>
      ))}
    </Card>
    <Btn variant="black" full onClick={() => onModal("personalityReport")} d={d}>🧠 AI 성향 리포트 생성하기</Btn>
  </div>
);

// ── 모달들 ────────────────────────────────────────────────────

const ModalTrade = ({ d, close }) => (
  <Sheet title="매매 등록" d={d} onClose={close}>
    <div style={{ display: "flex", background: d ? C.dk_border : C.gray100, borderRadius: 12, padding: 3, marginBottom: 20 }}>
      {["매수", "매도"].map((t, i) => (<button key={t} style={{ flex: 1, border: "none", borderRadius: 10, padding: "10px 0", fontSize: 14, fontWeight: 700, cursor: "pointer", background: i === 0 ? C.green : "transparent", color: i === 0 ? "#fff" : (d ? C.dk_muted : C.gray500) }}>{t}</button>))}
    </div>
    <div style={{ background: d ? C.dk_border : C.gray100, borderRadius: 12, padding: "12px 14px", marginBottom: 16, display: "flex", justifyContent: "space-between", cursor: "pointer" }}><span style={{ fontSize: 14, color: d ? C.dk_muted : C.gray500 }}>종목명으로 검색</span><span>🔍</span></div>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 4 }}>
      <Input label="가격 🔴" placeholder="0" d={d} />
      <Input label="수량 🔴" placeholder="0" d={d} />
    </div>
    <div style={{ fontSize: 13, fontWeight: 700, color: d ? C.dk_text : C.black, marginBottom: 6 }}>매수 이유 <span style={{ fontSize: 11, color: d ? C.dk_muted : C.gray400, fontWeight: 400 }}>(선택)</span></div>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
      {["기술적분석", "저평가", "테마/트렌드", "실적호조", "분할매수", "추가매수"].map((tag, i) => (<button key={tag} style={{ background: i === 0 ? C.green : (d ? C.dk_border : C.gray100), color: i === 0 ? "#fff" : (d ? C.dk_muted : C.gray600), border: "none", borderRadius: 8, padding: "7px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{tag}</button>))}
    </div>
    <div style={{ fontSize: 13, fontWeight: 700, color: d ? C.dk_text : C.black, marginBottom: 8 }}>심리 상태 <span style={{ fontSize: 11, color: d ? C.dk_muted : C.gray400, fontWeight: 400 }}>(선택)</span></div>
    <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
      {["확신", "불안", "FOMO", "기계적"].map((e, i) => (<button key={e} style={{ background: i === 0 ? C.greenSoft : (d ? C.dk_border : C.gray100), color: i === 0 ? C.green : (d ? C.dk_muted : C.gray600), border: "none", borderRadius: 8, padding: "7px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{e}</button>))}
    </div>
    <Input label="메모 (선택)" placeholder="간단한 메모를 남겨보세요" d={d} />
    <div style={{ display: "flex", gap: 8 }}>
      <Btn variant="secondary" d={d} onClick={close}>취소</Btn>
      <Btn variant="primary" onClick={close} style={{ flex: 1 }}>저장하기</Btn>
    </div>
  </Sheet>
);

const ModalCash = ({ d, close }) => (
  <Sheet title="⚠️ 예수금이 부족해요" d={d} onClose={close}>
    <div style={{ background: d ? C.dk_border : C.redSoft, borderRadius: 14, padding: 16, marginBottom: 20, textAlign: "center" }}>
      <div style={{ fontSize: 13, color: d ? C.dk_muted : C.gray600, lineHeight: 1.8 }}>예수금 잔고 <b style={{ color: d ? C.dk_text : C.black }}>₩0</b>이지만<br />매매 기록은 저장할 수 있어요.<br />나중에 예수금을 업데이트해 주세요.</div>
    </div>
    <div style={{ display: "flex", gap: 8 }}>
      <Btn variant="secondary" d={d} onClick={close}>그래도 저장</Btn>
      <Btn variant="primary" onClick={close} style={{ flex: 1 }}>예수금 입력</Btn>
    </div>
  </Sheet>
);

const ModalSector = ({ d, close }) => (
  <Sheet title="섹터 편집" subtitle="삼성전자" d={d} onClose={close}>
    <div style={{ background: d ? C.dk_border : C.gray100, borderRadius: 12, padding: "14px 16px", marginBottom: 20 }}>
      <div style={{ fontSize: 11, color: d ? C.dk_muted : C.gray400, marginBottom: 4 }}>기본 섹터 (자동)</div>
      <div style={{ fontSize: 15, fontWeight: 600, color: d ? C.dk_text : C.black }}>반도체</div>
      <button style={{ fontSize: 12, color: C.green, background: "none", border: "none", cursor: "pointer", padding: "4px 0 0", fontWeight: 600 }}>↻ 새로고침</button>
    </div>
    <Input label="내 섹터" defaultValue="AI 반도체" placeholder="나만의 섹터명 입력" d={d} />
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 12, color: d ? C.dk_muted : C.gray400, marginBottom: 8 }}>태그</div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {["AI", "배당주", "성장주"].map(tag => <Tag key={tag}>{tag} ×</Tag>)}
        <button style={{ background: "none", border: `1px dashed ${d ? C.dk_border : C.gray300}`, borderRadius: 6, padding: "3px 10px", fontSize: 12, color: d ? C.dk_muted : C.gray400, cursor: "pointer" }}>+ 추가</button>
      </div>
    </div>
    <div style={{ display: "flex", gap: 8 }}>
      <Btn variant="secondary" d={d} onClick={close}>취소</Btn>
      <Btn variant="primary" onClick={close} style={{ flex: 1 }}>저장</Btn>
    </div>
  </Sheet>
);

const ModalDeposit = ({ d, close }) => (
  <Sheet title="입금 등록" d={d} onClose={close}>
    <div style={{ display: "flex", background: d ? C.dk_border : C.gray100, borderRadius: 12, padding: 3, marginBottom: 20 }}>
      {["KRW (원화)", "USD (달러)"].map((t, i) => (<button key={t} style={{ flex: 1, border: "none", borderRadius: 10, padding: "9px 0", fontSize: 13, fontWeight: 600, cursor: "pointer", background: i === 0 ? (d ? C.dk_card : C.white) : "transparent", color: i === 0 ? (d ? C.dk_text : C.black) : (d ? C.dk_muted : C.gray500), boxShadow: i === 0 ? "0 1px 4px rgba(0,0,0,0.08)" : "none" }}>{t}</button>))}
    </div>
    <Input label="금액" placeholder="0" d={d} type="number" />
    <Input label="메모 (선택)" placeholder="예: 3월 급여" d={d} />
    <Btn variant="primary" full onClick={close}>등록하기</Btn>
  </Sheet>
);

const ModalAI = ({ d, close, type }) => (
  <Sheet title={type === "p" ? "🧠 내 투자 성향" : "🤖 NVIDIA 분석"} subtitle={type === "p" ? "최근 24건 매매 분석 기준" : "AI 기반 종목 분석 리포트"} d={d} onClose={close}>
    {type === "p" ? (
      <>
        <div style={{ background: d ? C.dk_border : C.greenSoft, borderRadius: 14, padding: 16, marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: C.green, fontWeight: 700, marginBottom: 4 }}>투자 스타일</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: d ? C.dk_text : C.black }}>📈 모멘텀 + 기술적 투자자</div>
          <div style={{ fontSize: 13, color: d ? C.dk_muted : C.gray600, marginTop: 6, lineHeight: 1.6 }}>차트 분석 기반 매수가 38%로 가장 높고, 추세에 올라타는 성향이 강해요.</div>
        </div>
        {[{ icon: "✅", title: "잘하는 것", content: "기술적분석 기반 매수의 승률이 64%로 가장 높아요.", bg: C.greenSoft }, { icon: "⚠️", title: "반복되는 실수", content: "FOMO 매수의 평균 수익률이 -5.3%로 손실이 커요.", bg: C.redSoft }, { icon: "💡", title: "개선 권고", content: "FOMO 느껴질 때는 하루 기다려보는 습관을 만들어보세요.", bg: C.orangeSoft }].map(item => (
          <div key={item.title} style={{ background: d ? C.dk_border : item.bg, borderRadius: 12, padding: "14px 16px", marginBottom: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: d ? C.dk_text : C.black, marginBottom: 4 }}>{item.icon} {item.title}</div>
            <div style={{ fontSize: 13, color: d ? C.dk_muted : C.gray600, lineHeight: 1.6 }}>{item.content}</div>
          </div>
        ))}
      </>
    ) : (
      <>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          {[{ label: "적정 매수가", value: "$800~$850", color: C.green }, { label: "목표 매도가", value: "$1,000~$1,100", color: C.greenMid }].map(i => (
            <Card key={i.label} d={d} style={{ flex: 1, padding: "12px 14px" }}><div style={{ fontSize: 11, color: d ? C.dk_muted : C.gray400 }}>{i.label}</div><div style={{ fontSize: 15, fontWeight: 700, color: i.color, marginTop: 3 }}>{i.value}</div></Card>
          ))}
        </div>
        <div style={{ background: d ? C.dk_border : C.greenSoft, borderRadius: 14, padding: "14px 16px", marginBottom: 12 }}>
          <div style={{ fontSize: 24, fontWeight: 800, color: C.green }}>BUY</div>
          <div style={{ fontSize: 13, color: d ? C.dk_muted : C.gray600, marginTop: 4, lineHeight: 1.6 }}>AI 인프라 수요 성장과 강력한 시장 지위를 고려할 때 현재 주가는 매력적인 매수 구간입니다.</div>
        </div>
        {[{ label: "강점 💪", content: "AI 반도체 시장 점유율 80%+ 독점적 지위", bg: C.greenSoft }, { label: "약점 ⚠️", content: "높은 밸류에이션, 중국 수출 규제 리스크", bg: C.redSoft }, { label: "기회 🌱", content: "데이터센터·자율주행·로보틱스 AI 수요 폭발", bg: C.blueSoft }, { label: "위협 🌩", content: "AMD·인텔의 추격, 지정학적 공급망 리스크", bg: C.orangeSoft }].map(item => (
          <div key={item.label} style={{ background: d ? C.dk_border : item.bg, borderRadius: 10, padding: "10px 14px", marginBottom: 6 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: d ? C.dk_text : C.black, marginBottom: 2 }}>{item.label}</div>
            <div style={{ fontSize: 12, color: d ? C.dk_muted : C.gray600 }}>{item.content}</div>
          </div>
        ))}
      </>
    )}
    <Btn variant="secondary" full d={d} onClick={close} style={{ marginTop: 12 }}>닫기</Btn>
  </Sheet>
);

// ── 메인 앱 ──────────────────────────────────────────────────

export default function App() {
  const [scene, setScene] = useState("login"); // login | register | onboarding | app
  const [page,  setPage]  = useState("dashboard");
  const [modal, setModal] = useState(null);
  const [dark,  setDark]  = useState(false);
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    const check = () => setMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const go = (p) => { setPage(p); setModal(null); };

  // ── 인증 전 화면 (로그인 / 회원가입 / 온보딩) ─────────────
  if (scene === "login") {
    return <Login d={dark} onLogin={() => setScene("app")} onGoRegister={() => setScene("register")} />;
  }
  if (scene === "register") {
    return <Register d={dark} onRegister={() => setScene("onboarding")} onGoLogin={() => setScene("login")} />;
  }
  if (scene === "onboarding") {
    return <Onboarding d={dark} onComplete={() => setScene("app")} />;
  }

  // ── 인증 후 메인 앱 ────────────────────────────────────────
  const pp = { d: dark, mobile, onModal: setModal };
  const pages = {
    dashboard:   <Dashboard   {...pp} />,
    accounts:    <Accounts    {...pp} />,
    trades:      <Trades      {...pp} />,
    analysis:    <Analysis    {...pp} />,
    personality: <Personality {...pp} />,
  };
  const modals = {
    tradeAdd:          <ModalTrade   d={dark} close={() => setModal(null)} />,
    cashWarning:       <ModalCash    d={dark} close={() => setModal(null)} />,
    sectorEdit:        <ModalSector  d={dark} close={() => setModal(null)} />,
    deposit:           <ModalDeposit d={dark} close={() => setModal(null)} />,
    withdraw:          <ModalDeposit d={dark} close={() => setModal(null)} />,
    aiReport:          <ModalAI      d={dark} close={() => setModal(null)} type="a" />,
    personalityReport: <ModalAI      d={dark} close={() => setModal(null)} type="p" />,
  };

  return (
    <div style={{ background: dark ? C.dk_bg : C.bg, minHeight: "100vh", fontFamily: "'Pretendard', 'Apple SD Gothic Neo', system-ui, sans-serif", color: dark ? C.dk_text : C.black }}>
      <div style={{ display: "flex", minHeight: "100vh" }}>
        {!mobile && <IconSidebar page={page} go={go} d={dark} toggleD={() => setDark(v => !v)} />}
        <main style={{ flex: 1, padding: mobile ? "24px 16px 100px" : "40px 48px 60px", maxWidth: mobile ? "100%" : 720, position: "relative", minHeight: "100vh" }}>
          {pages[page]}
          {modal && modals[modal]}
        </main>
        {!mobile && <div style={{ flex: 1 }} />}
      </div>
      {mobile && <BottomNav page={page} go={go} d={dark} />}
      {mobile && (
        <button onClick={() => setDark(v => !v)} style={{ position: "fixed", top: 16, right: 16, zIndex: 100, background: dark ? C.dk_card : C.white, border: `1px solid ${dark ? C.dk_border : C.gray200}`, borderRadius: 10, padding: "6px 10px", fontSize: 16, cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>{dark ? "☀️" : "🌙"}</button>
      )}
      {/* 씬 전환 버튼 (시연용) */}
      <div style={{ position: "fixed", bottom: mobile ? 90 : 20, left: 20, zIndex: 100, display: "flex", flexDirection: "column", gap: 4 }}>
        {[
          { label: "🔐 로그인", s: "login" },
          { label: "📝 회원가입", s: "register" },
          { label: "🚀 온보딩", s: "onboarding" },
        ].map(btn => (
          <button key={btn.s} onClick={() => setScene(btn.s)} style={{ background: dark ? C.dk_card : C.white, border: `1px solid ${dark ? C.dk_border : C.gray200}`, borderRadius: 8, padding: "5px 10px", fontSize: 11, fontWeight: 600, cursor: "pointer", color: dark ? C.dk_text : C.gray600, boxShadow: "0 2px 8px rgba(0,0,0,0.08)", whiteSpace: "nowrap" }}>{btn.label}</button>
        ))}
      </div>
      {!mobile && (
        <div style={{ position: "fixed", bottom: 20, right: 20, background: dark ? C.dk_card : C.white, border: `1px solid ${dark ? C.dk_border : C.gray200}`, borderRadius: 12, padding: "10px 14px", fontSize: 11, color: dark ? C.dk_muted : C.gray400, boxShadow: "0 2px 12px rgba(0,0,0,0.08)" }}>💡 창 너비 768px 이하로 줄이면 모바일 뷰로 전환돼요</div>
      )}
    </div>
  );
}
