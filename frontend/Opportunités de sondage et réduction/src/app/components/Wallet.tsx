import { useState } from 'react';
import { Wallet as WalletIcon, ArrowDownToLine, ArrowUpFromLine, History, Award, TrendingDown, Plus, X } from 'lucide-react';
import type { User } from '../App';

interface Transaction {
  id: string;
  type: 'deposit' | 'withdrawal' | 'participation' | 'reward' | 'refund';
  amount: number;
  date: Date;
  description: string;
}

interface WalletProps {
  user: User;
  transactions: Transaction[];
  onDeposit: (amount: number) => void;
  onWithdraw: (amount: number, method: string) => void;
  onConvertPoints: (points: number) => void;
}

export function Wallet({ user, transactions, onDeposit, onWithdraw, onConvertPoints }: WalletProps) {
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawMethod, setWithdrawMethod] = useState<'moov' | 'yas'>('moov');
  const [convertPoints, setConvertPoints] = useState('');

  const handleDeposit = () => {
    const amount = parseInt(depositAmount);
    if (amount > 0 && amount <= 1000000) {
      onDeposit(amount);
      setDepositAmount('');
      setShowDepositModal(false);
    }
  };

  const handleWithdraw = () => {
    const amount = parseInt(withdrawAmount);
    if (amount > 0 && amount <= user.balance) {
      onWithdraw(amount, withdrawMethod === 'moov' ? 'Moov Money' : 'YAS');
      setWithdrawAmount('');
      setShowWithdrawModal(false);
    }
  };

  const handleConvert = () => {
    const points = parseInt(convertPoints);
    if (points > 0 && points <= user.points) {
      onConvertPoints(points);
      setConvertPoints('');
      setShowConvertModal(false);
    }
  };

  const quickAmounts = [5000, 10000, 25000, 50000, 100000];
  const quickPoints = [100, 250, 500, 1000];

  const transactionIcons = {
    deposit: <ArrowDownToLine className="w-5 h-5 text-success" />,
    withdrawal: <ArrowUpFromLine className="w-5 h-5 text-destructive" />,
    participation: <TrendingDown className="w-5 h-5 text-primary" />,
    reward: <Award className="w-5 h-5 text-secondary" />,
    refund: <Plus className="w-5 h-5 text-success" />
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <div className="bg-gradient-to-br from-primary via-primary to-secondary text-primary-foreground rounded-2xl p-6 space-y-4 shadow-lg">
        <div className="flex items-center gap-2 opacity-90">
          <WalletIcon className="w-5 h-5" />
          <span className="text-sm">Mon Portefeuille</span>
        </div>
        <div>
          <p className="text-4xl font-mono">{user.balance.toLocaleString()} FCFA</p>
          <p className="text-sm opacity-75 mt-1">Solde disponible</p>
        </div>
        <div className="flex items-center justify-between pt-3 border-t border-primary-foreground/20">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 opacity-90" />
            <span className="opacity-90">{user.points.toLocaleString()} points</span>
          </div>
          <button
            onClick={() => setShowConvertModal(true)}
            className="text-sm bg-primary-foreground/20 hover:bg-primary-foreground/30 px-4 py-1.5 rounded-full transition-colors"
          >
            Convertir
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => setShowDepositModal(true)}
          className="flex items-center justify-center gap-2 bg-gradient-to-br from-success to-success/80 text-success-foreground rounded-xl py-4 hover:shadow-lg transition-all shadow-md"
        >
          <ArrowDownToLine className="w-5 h-5" />
          <span>Recharger</span>
        </button>
        <button
          onClick={() => setShowWithdrawModal(true)}
          className="flex items-center justify-center gap-2 bg-card border-2 border-border text-foreground rounded-xl py-4 hover:shadow-lg transition-all"
        >
          <ArrowUpFromLine className="w-5 h-5" />
          <span>Retirer</span>
        </button>
      </div>

      <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-muted-foreground" />
          <h2>Historique des transactions</h2>
        </div>

        {transactions.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Aucune transaction</p>
        ) : (
          <div className="space-y-2">
            {transactions.map(transaction => (
              <div
                key={transaction.id}
                className="flex items-center justify-between p-4 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {transactionIcons[transaction.type]}
                  <div>
                    <p className="text-sm">{transaction.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {transaction.date.toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
                <span
                  className={`font-mono ${
                    transaction.amount > 0 ? 'text-success' : 'text-destructive'
                  }`}
                >
                  {transaction.amount > 0 ? '+' : ''}
                  {transaction.amount.toLocaleString()} FCFA
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {showDepositModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl p-6 max-w-md w-full space-y-6">
            <div className="flex items-center justify-between">
              <h2>Recharger le portefeuille</h2>
              <button
                onClick={() => setShowDepositModal(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Montant (FCFA)</label>
              <input
                type="number"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                placeholder="Entrez le montant"
                className="w-full p-4 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring font-mono text-lg"
              />
            </div>

            <div>
              <p className="text-sm text-muted-foreground mb-3">Montants rapides</p>
              <div className="grid grid-cols-3 gap-2">
                {quickAmounts.map(amount => (
                  <button
                    key={amount}
                    onClick={() => setDepositAmount(String(amount))}
                    className="py-2 px-3 bg-muted hover:bg-muted/70 rounded-lg text-sm font-mono transition-colors"
                  >
                    {amount.toLocaleString()}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-accent/50 rounded-lg p-4 space-y-2 text-sm">
              <h4 className="flex items-center gap-2">
                <span className="w-5 h-5 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-xs">i</span>
                Méthodes de paiement
              </h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Moov Money</li>
                <li>• Orange Money</li>
                <li>• MTN Mobile Money</li>
                <li>• Carte bancaire (Visa, Mastercard)</li>
              </ul>
            </div>

            <button
              onClick={handleDeposit}
              disabled={!depositAmount || parseInt(depositAmount) <= 0}
              className={`w-full py-4 rounded-xl transition-colors ${
                depositAmount && parseInt(depositAmount) > 0
                  ? 'bg-success text-success-foreground hover:bg-success/90'
                  : 'bg-muted text-muted-foreground cursor-not-allowed'
              }`}
            >
              Confirmer le rechargement
            </button>
          </div>
        </div>
      )}

      {showWithdrawModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl p-6 max-w-md w-full space-y-6">
            <div className="flex items-center justify-between">
              <h2>Retirer de l'argent</h2>
              <button
                onClick={() => setShowWithdrawModal(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-muted/50 rounded-lg p-4">
              <p className="text-sm text-muted-foreground">Solde disponible</p>
              <p className="text-2xl font-mono text-primary">{user.balance.toLocaleString()} FCFA</p>
            </div>

            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Montant à retirer (FCFA)</label>
              <input
                type="number"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder="Entrez le montant"
                max={user.balance}
                className="w-full p-4 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring font-mono text-lg"
              />
            </div>

            <div>
              <p className="text-sm text-muted-foreground mb-3">Méthode de retrait</p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setWithdrawMethod('moov')}
                  className={`p-4 rounded-lg border-2 transition-colors ${
                    withdrawMethod === 'moov'
                      ? 'border-primary bg-primary/10'
                      : 'border-border bg-muted/30 hover:bg-muted/50'
                  }`}
                >
                  <div className="text-center">
                    <p className="font-medium">Moov Money</p>
                  </div>
                </button>
                <button
                  onClick={() => setWithdrawMethod('yas')}
                  className={`p-4 rounded-lg border-2 transition-colors ${
                    withdrawMethod === 'yas'
                      ? 'border-primary bg-primary/10'
                      : 'border-border bg-muted/30 hover:bg-muted/50'
                  }`}
                >
                  <div className="text-center">
                    <p className="font-medium">YAS</p>
                  </div>
                </button>
              </div>
            </div>

            <button
              onClick={handleWithdraw}
              disabled={!withdrawAmount || parseInt(withdrawAmount) <= 0 || parseInt(withdrawAmount) > user.balance}
              className={`w-full py-4 rounded-xl transition-colors ${
                withdrawAmount && parseInt(withdrawAmount) > 0 && parseInt(withdrawAmount) <= user.balance
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                  : 'bg-muted text-muted-foreground cursor-not-allowed'
              }`}
            >
              Retirer {withdrawAmount ? parseInt(withdrawAmount).toLocaleString() : '0'} FCFA
            </button>
          </div>
        </div>
      )}

      {showConvertModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl p-6 max-w-md w-full space-y-6">
            <div className="flex items-center justify-between">
              <h2>Convertir des points</h2>
              <button
                onClick={() => setShowConvertModal(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-gradient-to-br from-warning/20 to-warning/5 rounded-lg p-4 border border-warning/30">
              <div className="flex items-center gap-2 mb-2">
                <Award className="w-5 h-5 text-warning" />
                <p className="text-sm text-muted-foreground">Points disponibles</p>
              </div>
              <p className="text-2xl font-mono text-warning">{user.points.toLocaleString()} points</p>
              <p className="text-xs text-muted-foreground mt-2">1 point = 10 FCFA</p>
            </div>

            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Nombre de points à convertir</label>
              <input
                type="number"
                value={convertPoints}
                onChange={(e) => setConvertPoints(e.target.value)}
                placeholder="Entrez le nombre de points"
                max={user.points}
                className="w-full p-4 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring font-mono text-lg"
              />
              {convertPoints && parseInt(convertPoints) > 0 && (
                <p className="text-sm text-muted-foreground mt-2">
                  = <span className="text-success font-mono">{(parseInt(convertPoints) * 10).toLocaleString()} FCFA</span>
                </p>
              )}
            </div>

            <div>
              <p className="text-sm text-muted-foreground mb-3">Conversions rapides</p>
              <div className="grid grid-cols-4 gap-2">
                {quickPoints.map(points => (
                  <button
                    key={points}
                    onClick={() => setConvertPoints(String(points))}
                    disabled={points > user.points}
                    className={`py-2 px-3 rounded-lg text-sm font-mono transition-colors ${
                      points > user.points
                        ? 'bg-muted/50 text-muted-foreground cursor-not-allowed'
                        : 'bg-muted hover:bg-muted/70'
                    }`}
                  >
                    {points}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleConvert}
              disabled={!convertPoints || parseInt(convertPoints) <= 0 || parseInt(convertPoints) > user.points}
              className={`w-full py-4 rounded-xl transition-colors ${
                convertPoints && parseInt(convertPoints) > 0 && parseInt(convertPoints) <= user.points
                  ? 'bg-warning text-warning-foreground hover:bg-warning/90'
                  : 'bg-muted text-muted-foreground cursor-not-allowed'
              }`}
            >
              Convertir {convertPoints ? parseInt(convertPoints).toLocaleString() : '0'} points
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
