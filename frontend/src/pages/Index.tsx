import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { RefreshCw, PlayCircle, Search, ChevronLeft, ChevronRight } from "lucide-react";
import TransactionTable from "../components/TransactionTable";
import ExplainModal from "../components/ExplainModal";
import Footer from "../components/Footer";
import FilterControls from "../components/FilterControls";
import ChartsPanel from "../components/ChartsPanel";

const API_BASE_URL = "http://127.0.0.1:8000";

const MOCK_MERCHANTS = ["Amazon","Uber","Apple Store","Walmart","Target","Netflix","Steam"];

function generateMockTransactions(count = 10, offset = 0) {
  const arr = [];
  for (let i = 0; i < count; i++) {
    const amt = Math.random() * 5000 + 100;
    const isFraud = Math.random() > 0.7;
    arr.push({
      tx: {
        transaction_id: `TX${offset + i + 1}`,
        user_id: `U${Math.floor(Math.random() * 200)}`,
        amount: parseFloat(amt.toFixed(2)),
        country: ["US", "IN", "GB", "CA"][Math.floor(Math.random() * 4)],
        device: ["mobile", "desktop"][Math.floor(Math.random() * 2)],
        merchant: MOCK_MERCHANTS[Math.floor(Math.random() * MOCK_MERCHANTS.length)],
        timestamp: new Date().toISOString(),
      },
      score: isFraud ? Math.random() * 0.5 + 0.5 : Math.random() * 0.4,
      label: isFraud,
    });
  }
  return arr;
}

export default function Index() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [allTransactions, setAllTransactions] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [demoMode, setDemoMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [perPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [explain, setExplain] = useState<any>(null);
  
  // Filter states
  const [amountRange, setAmountRange] = useState<[number, number]>([0, 5000]);
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [selectedMerchants, setSelectedMerchants] = useState<string[]>([]);
  const [fraudOnly, setFraudOnly] = useState(false);
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  });
  
  const autoRefreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const previousTransactionsRef = useRef<any[]>([]);

  async function fetchTransactions(silent = false) {
    if (!silent) setLoading(true);
    try {
      const skip = (page - 1) * perPage;
      const url = `${API_BASE_URL}/transactions/query?limit=100&skip=0`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const allData = data.results || [];
      setAllTransactions(allData);
      
      // Check for high-risk transactions
      if (silent && previousTransactionsRef.current.length > 0) {
        const newHighRisk = allData.filter((t: any) => 
          t.label && t.score > 0.7 && 
          !previousTransactionsRef.current.some((prev: any) => prev.tx.transaction_id === t.tx.transaction_id)
        );
        
        if (newHighRisk.length > 0) {
          toast.error(`⚠️ ${newHighRisk.length} new high-risk transaction(s) detected!`, {
            duration: 5000,
          });
        }
      }
      
      previousTransactionsRef.current = allData;
      applyFilters(allData);
    } catch {
      if (!silent) toast.error("Using demo data");
      setDemoMode(true);
      const mockData = generateMockTransactions(100, 0);
      setAllTransactions(mockData);
      previousTransactionsRef.current = mockData;
      applyFilters(mockData);
    } finally {
      if (!silent) setLoading(false);
    }
  }

  function applyFilters(data: any[]) {
    let filtered = [...data];

    // Apply search
    if (searchQuery) {
      filtered = filtered.filter((t) =>
        t.tx.user_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.tx.merchant.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.tx.country.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply amount range
    filtered = filtered.filter(
      (t) => t.tx.amount >= amountRange[0] && t.tx.amount <= amountRange[1]
    );

    // Apply country filter
    if (selectedCountries.length > 0) {
      filtered = filtered.filter((t) => selectedCountries.includes(t.tx.country));
    }

    // Apply merchant filter
    if (selectedMerchants.length > 0) {
      filtered = filtered.filter((t) => selectedMerchants.includes(t.tx.merchant));
    }

    // Apply fraud filter
    if (fraudOnly) {
      filtered = filtered.filter((t) => t.label);
    }

    // Apply date range
    if (dateRange.from) {
      filtered = filtered.filter((t) => {
        const txDate = new Date(t.tx.timestamp);
        const from = new Date(dateRange.from!);
        from.setHours(0, 0, 0, 0);
        return txDate >= from;
      });
    }
    if (dateRange.to) {
      filtered = filtered.filter((t) => {
        const txDate = new Date(t.tx.timestamp);
        const to = new Date(dateRange.to!);
        to.setHours(23, 59, 59, 999);
        return txDate <= to;
      });
    }

    setTotal(filtered.length);
    const start = (page - 1) * perPage;
    setTransactions(filtered.slice(start, start + perPage));
  }

  async function fetchSummary() {
    try {
      const res = await fetch(`${API_BASE_URL}/transactions/summary`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setSummary(data);
    } catch {
      setSummary({
        fraud_vs_nonfraud: { fraud: 15, nonfraud: 35 },
        total_transactions: 50,
        fraud_percentage: 30,
      });
    }
  }

  useEffect(() => {
    fetchTransactions();
    fetchSummary();
    
    // Set up auto-refresh every 30 seconds
    autoRefreshIntervalRef.current = setInterval(() => {
      fetchTransactions(true);
      fetchSummary();
    }, 30000);
    
    return () => {
      if (autoRefreshIntervalRef.current) {
        clearInterval(autoRefreshIntervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    applyFilters(allTransactions);
  }, [page, searchQuery, amountRange, selectedCountries, selectedMerchants, fraudOnly, dateRange, allTransactions]);

  function resetFilters() {
    setAmountRange([0, 5000]);
    setSelectedCountries([]);
    setSelectedMerchants([]);
    setFraudOnly(false);
    setDateRange({ from: undefined, to: undefined });
    setSearchQuery("");
    setPage(1);
  }

  async function handleExplain(tx: any) {
    try {
      const res = await fetch(`${API_BASE_URL}/transactions/${tx.transaction_id}/explain`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setExplain(data);
    } catch {
      setExplain({
        score: 0.75,
        explanations: [
          { feature: "num__amount", shap_value: 0.15, value: tx.amount },
          { feature: "cat__country_US", shap_value: -0.08, value: 1 },
        ],
      });
    }
  }

  const totalPages = Math.ceil(total / perPage);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="gradient-header">
        <div className="container mx-auto px-6 py-6">
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Fraud Detection Dashboard
          </h1>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-6 py-8">
        <div className="space-y-8 animate-fade-in">
          {/* Filter Controls */}
          <FilterControls
            amountRange={amountRange}
            onAmountRangeChange={setAmountRange}
            selectedCountries={selectedCountries}
            onCountryChange={setSelectedCountries}
            selectedMerchants={selectedMerchants}
            onMerchantChange={setSelectedMerchants}
            fraudOnly={fraudOnly}
            onFraudOnlyChange={setFraudOnly}
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            onReset={resetFilters}
          />

          {/* Controls */}
          <div className="glass-card p-6">
            <div className="flex flex-wrap gap-4 items-center">
              <button
                onClick={() => {
                  fetchTransactions();
                  fetchSummary();
                  toast.success("Refreshed");
                }}
                disabled={loading}
                className="btn-primary"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </button>
              
              <button
                onClick={() => {
                  setDemoMode(!demoMode);
                  if (!demoMode) {
                    const mockData = generateMockTransactions(perPage, (page - 1) * perPage);
                    setTransactions(mockData);
                    setTotal(50);
                  } else {
                    fetchTransactions();
                  }
                }}
                className="btn-secondary"
              >
                <PlayCircle className="w-4 h-4 mr-2" />
                {demoMode ? "Live Mode" : "Demo Mode"}
              </button>

              <div className="flex-1 flex items-center gap-2 max-w-md">
                <Search className="w-5 h-5 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && fetchTransactions()}
                  placeholder="Search by user, merchant, country..."
                  className="input-modern flex-1"
                />
              </div>
            </div>
          </div>

          {/* Charts Panel */}
          <ChartsPanel transactions={allTransactions} />

          {/* Summary Stats */}
          {summary && (
            <div className="glass-card p-6">
              <h2 className="text-xl font-semibold mb-6 text-foreground">Quick Stats</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="stat-card">
                  <div className="text-sm text-muted-foreground font-medium">Total Transactions</div>
                  <div className="text-3xl font-bold text-foreground mt-2">
                    {summary.fraud_vs_nonfraud.fraud + summary.fraud_vs_nonfraud.nonfraud}
                  </div>
                </div>
                <div className="stat-card fraud-stat">
                  <div className="text-sm text-destructive-foreground font-medium">Fraudulent</div>
                  <div className="text-3xl font-bold text-destructive-foreground mt-2">
                    {summary.fraud_vs_nonfraud.fraud}
                  </div>
                </div>
                <div className="stat-card success-stat">
                  <div className="text-sm text-foreground font-medium">Legitimate</div>
                  <div className="text-3xl font-bold text-foreground mt-2">
                    {summary.fraud_vs_nonfraud.nonfraud}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Transactions Table */}
          <div className="glass-card overflow-hidden">
            <div className="p-6 border-b border-border">
              <h2 className="text-xl font-semibold text-foreground">Recent Transactions</h2>
            </div>
            <TransactionTable rows={transactions} onExplain={handleExplain} />
            
            {/* Pagination */}
            <div className="p-6 border-t border-border flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Page {page} of {totalPages} • Total: {total}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="btn-icon"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="btn-icon"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />

      {explain && <ExplainModal explain={explain} onClose={() => setExplain(null)} />}
    </div>
  );
}
