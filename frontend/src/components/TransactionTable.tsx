import { AlertCircle } from "lucide-react";

const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
});

interface Transaction {
  transaction_id: string;
  user_id: string;
  amount: number;
  country: string;
  device: string;
  merchant: string;
}

interface TransactionRow {
  tx: Transaction;
  score: number;
  label: boolean;
}

interface Props {
  rows: TransactionRow[];
  onExplain: (tx: Transaction) => void;
}

export default function TransactionTable({ rows, onExplain }: Props) {
  const hasRows = rows && rows.length > 0;

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border text-left">
            <th className="px-6 py-4 text-sm font-semibold text-muted-foreground">User</th>
            <th className="px-6 py-4 text-sm font-semibold text-muted-foreground">Amount</th>
            <th className="px-6 py-4 text-sm font-semibold text-muted-foreground">Country</th>
            <th className="px-6 py-4 text-sm font-semibold text-muted-foreground">Device</th>
            <th className="px-6 py-4 text-sm font-semibold text-muted-foreground">Merchant</th>
            <th className="px-6 py-4 text-sm font-semibold text-muted-foreground">Score</th>
            <th className="px-6 py-4 text-sm font-semibold text-muted-foreground">Fraud?</th>
            <th className="px-6 py-4 text-sm font-semibold text-muted-foreground">Actions</th>
          </tr>
        </thead>
        <tbody>
          {!hasRows && (
            <tr>
              <td colSpan={8} className="px-6 py-12 text-center text-muted-foreground">
                No transactions found.
              </td>
            </tr>
          )}

          {hasRows && rows.map((row, idx) => {
            const { tx, score, label } = row;

            return (
              <tr 
                key={tx.transaction_id || idx} 
                className={`border-b border-border hover:bg-accent/5 transition-colors ${
                  label ? 'bg-destructive/5' : ''
                }`}
              >
                <td className="px-6 py-4 font-mono text-sm">{tx.user_id}</td>
                <td className="px-6 py-4 font-semibold">{currencyFormatter.format(tx.amount)}</td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                    {tx.country}
                  </span>
                </td>
                <td className="px-6 py-4 capitalize text-sm">{tx.device || 'N/A'}</td>
                <td className="px-6 py-4 font-medium">{tx.merchant}</td>
                <td className="px-6 py-4 font-mono text-sm">{(score || 0).toFixed(3)}</td>
                <td className="px-6 py-4">
                  {label ? (
                    <span className="inline-flex items-center gap-1 text-destructive font-semibold">
                      <AlertCircle className="w-4 h-4" />
                      Yes
                    </span>
                  ) : (
                    <span className="text-muted-foreground">No</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <button 
                    onClick={() => onExplain(tx)}
                    className="btn-sm"
                  >
                    Explain
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
