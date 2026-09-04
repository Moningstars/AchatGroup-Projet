import { useState, useEffect } from 'react';
import { ArrowLeft, Clock, Users, TrendingDown, AlertCircle, CheckCircle2, ChevronDown } from 'lucide-react';
import type { Opportunity, User } from '../App';

interface OpportunityDetailsProps {
  opportunity: Opportunity;
  user: User;
  onParticipate: (opportunityId: string) => Promise<void>;
  onConfirmReception?: (participationId: string, recu: boolean, commentaire?: string) => void;
  onBack: () => void;
}

export function OpportunityDetails({ opportunity, user, onParticipate, onConfirmReception, onBack }: OpportunityDetailsProps) {
  const [showPriceBreakdown, setShowPriceBreakdown] = useState(false);
  const [participated, setParticipated] = useState(Boolean(opportunity.participationId));
  const [deliveryComment, setDeliveryComment] = useState('');
  const [subscribing, setSubscribing] = useState(false);

  useEffect(() => {
    setParticipated(Boolean(opportunity.participationId));
  }, [opportunity.participationId]);

  const formatTimeRemaining = (deadline: Date) => {
    const now = new Date();
    const diff = deadline.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    if (hours > 24) {
      return `${Math.floor(hours / 24)}j ${hours % 24}h ${minutes}m`;
    }
    return `${hours}h ${minutes}m ${seconds}s`;
  };

  const [timeRemaining, setTimeRemaining] = useState(formatTimeRemaining(opportunity.deadline));

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeRemaining(formatTimeRemaining(opportunity.deadline));
    }, 1000);
    return () => clearInterval(interval);
  }, [opportunity.deadline]);

  const progress = (opportunity.currentParticipants / opportunity.targetParticipants) * 100;
  const discount = Math.round(((opportunity.originalPrice - opportunity.currentPrice) / opportunity.originalPrice) * 100);
  const canAfford = user.balance >= opportunity.currentPrice;

  const nextBreakpoint = opportunity.priceBreakpoints
    .filter(bp => bp.participants > opportunity.currentParticipants)
    .sort((a, b) => a.participants - b.participants)[0];

  const handleParticipate = async () => {
    if (canAfford && !participated && !subscribing) {
      setSubscribing(true);
      try {
        await onParticipate(opportunity.id);
      } finally {
        setSubscribing(false);
      }
    }
  };

  const canConfirmReception = Boolean(
    opportunity.participationId &&
    (opportunity.deliveryStatus === 'EN_LIVRAISON' || opportunity.deliveryStatus === 'LIVRE_A_CONFIRMER')
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        <span>Retour</span>
      </button>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="aspect-video w-full overflow-hidden bg-muted">
          <img
            src={opportunity.imageUrl}
            alt={opportunity.title}
            className="w-full h-full object-cover"
          />
        </div>

        <div className="p-6 space-y-6">
          <div>
            <span className="text-xs bg-primary/10 text-primary px-3 py-1 rounded-full">
              {opportunity.category}
            </span>
            <h1 className="mt-3">{opportunity.title}</h1>
            <p className="text-muted-foreground mt-2">{opportunity.description}</p>
          </div>

          <div className="bg-muted/50 rounded-xl p-4 space-y-4">
            <div className="flex items-baseline justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Prix actuel</p>
                <div className="flex items-baseline gap-3">
                  <span className="text-3xl text-primary font-mono">
                    {opportunity.currentPrice.toLocaleString()} FCFA
                  </span>
                  <span className="text-lg line-through text-muted-foreground font-mono">
                    {opportunity.originalPrice.toLocaleString()}
                  </span>
                </div>
              </div>
              {discount > 0 && (
                <div className="text-right">
                  <div className="text-2xl bg-destructive/10 text-destructive px-4 py-2 rounded-lg">
                    -{discount}%
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">d'économie</p>
                </div>
              )}
            </div>

            {nextBreakpoint && (
              <div className="flex items-start gap-2 text-sm bg-card/50 rounded-lg p-3">
                <TrendingDown className="w-4 h-4 text-secondary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-foreground">
                    Prochain palier : <span className="font-mono text-secondary">{nextBreakpoint.price.toLocaleString()} FCFA</span>
                  </p>
                  <p className="text-muted-foreground">
                    Encore {nextBreakpoint.participants - opportunity.currentParticipants} personnes
                  </p>
                </div>
              </div>
            )}

            <button
              onClick={() => setShowPriceBreakdown(!showPriceBreakdown)}
              className="flex items-center justify-between w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <span>Voir tous les paliers de prix</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${showPriceBreakdown ? 'rotate-180' : ''}`} />
            </button>

            {showPriceBreakdown && (
              <div className="space-y-2 pt-2">
                {opportunity.priceBreakpoints.map((bp, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center justify-between text-sm p-2 rounded ${
                      opportunity.currentParticipants >= bp.participants
                        ? 'bg-success/10 text-success'
                        : 'text-muted-foreground'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {opportunity.currentParticipants >= bp.participants && (
                        <CheckCircle2 className="w-4 h-4" />
                      )}
                      <span>{bp.participants} personnes</span>
                    </div>
                    <span className="font-mono">{bp.price.toLocaleString()} FCFA</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Users className="w-5 h-5" />
                <span>Participants</span>
              </div>
              <span className="font-mono text-lg">
                {opportunity.currentParticipants}/{opportunity.targetParticipants}
              </span>
            </div>
            <div className="h-3 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {progress >= 100 ? 'Objectif dépassé !' : `${Math.round(progress)}% de l'objectif atteint`}
            </p>
          </div>

          <div className="flex items-center gap-2 text-muted-foreground bg-muted/50 rounded-lg p-4">
            <Clock className="w-5 h-5 flex-shrink-0" />
            <div>
              <p className="text-sm">Temps restant</p>
              <p className="text-lg text-foreground font-mono">{timeRemaining}</p>
            </div>
          </div>

          {!canAfford && (
            <div className="flex items-start gap-2 bg-destructive/10 text-destructive rounded-lg p-4">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium">Solde insuffisant</p>
                <p className="text-destructive/80 mt-1">
                  Rechargez votre portefeuille pour participer à cette opportunité.
                </p>
              </div>
            </div>
          )}

          <button
            onClick={handleParticipate}
            disabled={!canAfford || participated || subscribing}
            className={`w-full py-4 rounded-xl text-lg transition-colors ${
              participated
                ? 'bg-success text-success-foreground cursor-not-allowed'
                : canAfford
                ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                : 'bg-muted text-muted-foreground cursor-not-allowed'
            }`}
          >
            {participated ? (
              <span className="flex items-center justify-center gap-2">
                <CheckCircle2 className="w-5 h-5" />
                Participation confirmée
              </span>
            ) : subscribing ? (
              'Participation en cours…'
            ) : (
              `Participer pour ${opportunity.currentPrice.toLocaleString()} FCFA`
            )}
          </button>

          {participated && (
            <div className="rounded-xl border border-success/20 bg-success/10 p-4 text-sm text-success">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0" />
                <div>
                  <p className="font-semibold">Vous participez déjà à cette opportunité.</p>
                  <p className="mt-1 text-success/80">
                    Statut : {(opportunity.participationStatus || 'EN_ATTENTE').replaceAll('_', ' ')}
                    {opportunity.participationQuantity ? ` · Quantité : ${opportunity.participationQuantity}` : ''}
                    {opportunity.participationAmount ? ` · Fonds gelés : ${opportunity.participationAmount.toLocaleString()} FCFA` : ''}
                  </p>
                </div>
              </div>
            </div>
          )}

          {!participated && (
            <div className="bg-accent/50 rounded-lg p-4 space-y-2 text-sm">
              <h4>Comment ça marche ?</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Vous payez le prix actuel pour réserver l'article</li>
                <li>• Le prix diminue au fur et à mesure que d'autres personnes participent</li>
                <li>• Si l'objectif est atteint, vous recevez l'article au prix réduit</li>
                <li>• Si l'objectif n'est pas atteint avant la fin, vous êtes remboursé intégralement</li>
              </ul>
            </div>
          )}

          {participated && opportunity.deliveryStatus && (
            <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h4>Suivi de votre livraison</h4>
                  <p className="text-muted-foreground">Statut : {opportunity.deliveryStatus.replaceAll('_', ' ')}</p>
                </div>
                <span className="font-mono text-primary">{opportunity.deliveryProgress || 0}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-secondary transition-all"
                  style={{ width: `${Math.min(opportunity.deliveryProgress || 0, 100)}%` }}
                />
              </div>
              {canConfirmReception && opportunity.participationId && onConfirmReception && (
                <div className="space-y-2">
                  <textarea
                    value={deliveryComment}
                    onChange={e => setDeliveryComment(e.target.value)}
                    placeholder="Commentaire optionnel sur la livraison..."
                    className="w-full min-h-20 p-3 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                  />
                  <div className="grid gap-2 sm:grid-cols-2">
                    <button
                      onClick={() => onConfirmReception(opportunity.participationId!, true, deliveryComment)}
                      className="rounded-lg bg-success px-4 py-3 font-semibold text-success-foreground"
                    >
                      Confirmer la réception
                    </button>
                    <button
                      onClick={() => onConfirmReception(opportunity.participationId!, false, deliveryComment)}
                      className="rounded-lg bg-destructive/10 px-4 py-3 font-semibold text-destructive"
                    >
                      Signaler un problème
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
