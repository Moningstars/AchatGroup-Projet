import { Clock, Users, TrendingDown, Award, Target } from 'lucide-react';
import type { Opportunity, Survey } from '../App';

interface HomeProps {
  opportunities: Opportunity[];
  surveys: Survey[];
  onSelectOpportunity: (id: string) => void;
  onSelectSurvey: (id: string) => void;
}

export function Home({ opportunities, surveys, onSelectOpportunity, onSelectSurvey }: HomeProps) {
  const formatTimeRemaining = (deadline: Date) => {
    const now = new Date();
    const diff = deadline.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 24) {
      return `${Math.floor(hours / 24)}j ${hours % 24}h`;
    }
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-8">
      <section>
        <div className="flex items-center gap-2 mb-4">
          <TrendingDown className="w-6 h-6 text-primary" />
          <h2>Opportunités d'achats groupés</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {opportunities.map(opp => {
            const progress = (opp.currentParticipants / opp.targetParticipants) * 100;
            const discount = Math.round(((opp.originalPrice - opp.currentPrice) / opp.originalPrice) * 100);

            return (
              <button
                key={opp.id}
                onClick={() => onSelectOpportunity(opp.id)}
                className="bg-card border border-border rounded-xl overflow-hidden hover:shadow-xl hover:scale-[1.02] transition-all text-left group"
              >
                <div className="aspect-video w-full overflow-hidden bg-muted relative">
                  <img
                    src={opp.imageUrl}
                    alt={opp.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  {discount > 0 && (
                    <div className="absolute top-3 right-3 bg-gradient-to-br from-destructive to-destructive/80 text-destructive-foreground px-3 py-1.5 rounded-full shadow-lg">
                      <span className="font-mono">-{discount}%</span>
                    </div>
                  )}
                </div>
                <div className="p-4 space-y-3">
                  <div>
                    <span className="text-xs bg-gradient-to-br from-primary/20 to-primary/10 text-primary px-3 py-1 rounded-full border border-primary/20">
                      {opp.category}
                    </span>
                    <h3 className="mt-2">{opp.title}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">{opp.description}</p>
                  </div>

                  <div className="flex items-baseline gap-2 bg-gradient-to-br from-primary/5 to-transparent p-3 rounded-lg -mx-1">
                    <span className="text-2xl text-primary font-mono">
                      {opp.currentPrice.toLocaleString()}
                    </span>
                    <span className="text-sm line-through text-muted-foreground font-mono">
                      {opp.originalPrice.toLocaleString()}
                    </span>
                    <span className="text-xs text-muted-foreground">FCFA</span>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-sm mb-1.5">
                      <span className="text-muted-foreground">Progression</span>
                      <span className="font-mono bg-primary/10 text-primary px-2 py-0.5 rounded-full text-xs">
                        {opp.currentParticipants}/{opp.targetParticipants}
                      </span>
                    </div>
                    <div className="h-2.5 bg-muted rounded-full overflow-hidden shadow-inner">
                      <div
                        className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-500 shadow-sm"
                        style={{ width: `${Math.min(progress, 100)}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm pt-2 border-t border-border/50">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      <span>{formatTimeRemaining(opp.deadline)}</span>
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Users className="w-4 h-4" />
                      <span>{opp.currentParticipants}</span>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section>
        <div className="flex items-center gap-2 mb-4">
          <Award className="w-6 h-6 text-secondary" />
          <h2>Sondages rémunérés</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {surveys.map(survey => {
            const progress = (survey.currentParticipants / survey.targetParticipants) * 100;

            return (
              <button
                key={survey.id}
                onClick={() => onSelectSurvey(survey.id)}
                className="bg-card border border-border rounded-xl overflow-hidden hover:shadow-xl hover:scale-[1.02] transition-all text-left group"
              >
                <div className="aspect-video w-full overflow-hidden bg-muted relative">
                  <img
                    src={survey.imageUrl}
                    alt={survey.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-3 right-3">
                    {survey.rewardType === 'money' ? (
                      <div className="bg-gradient-to-br from-secondary to-secondary/80 text-secondary-foreground px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1">
                        <Award className="w-4 h-4" />
                        <span className="font-mono text-sm">{survey.reward.toLocaleString()}</span>
                      </div>
                    ) : (
                      <div className="bg-gradient-to-br from-warning to-warning/80 text-warning-foreground px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1">
                        <Award className="w-4 h-4" />
                        <span className="font-mono text-sm">{survey.reward}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="p-4 space-y-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs bg-gradient-to-br from-secondary/20 to-secondary/10 text-secondary px-3 py-1 rounded-full border border-secondary/20">
                        {survey.rewardType === 'money' ? 'Argent' : 'Points'}
                      </span>
                      <span className="text-xs bg-accent text-accent-foreground px-3 py-1 rounded-full border border-accent-foreground/10">
                        {survey.questions.length} questions
                      </span>
                    </div>
                    <h3 className="mt-2">{survey.title}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">{survey.description}</p>
                  </div>

                  <div className={`flex items-center gap-2 p-3 rounded-lg -mx-1 ${
                    survey.rewardType === 'money'
                      ? 'bg-gradient-to-br from-secondary/5 to-transparent'
                      : 'bg-gradient-to-br from-warning/5 to-transparent'
                  }`}>
                    <Award className={`w-5 h-5 ${survey.rewardType === 'money' ? 'text-secondary' : 'text-warning'}`} />
                    <span className={`text-xl font-mono ${survey.rewardType === 'money' ? 'text-secondary' : 'text-warning'}`}>
                      {survey.reward.toLocaleString()} {survey.rewardType === 'money' ? 'FCFA' : 'points'}
                    </span>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-sm mb-1.5">
                      <span className="text-muted-foreground">Participants</span>
                      <span className="font-mono bg-secondary/10 text-secondary px-2 py-0.5 rounded-full text-xs">
                        {survey.currentParticipants}/{survey.targetParticipants}
                      </span>
                    </div>
                    <div className="h-2.5 bg-muted rounded-full overflow-hidden shadow-inner">
                      <div
                        className="h-full bg-gradient-to-r from-secondary to-secondary/60 transition-all duration-500 shadow-sm"
                        style={{ width: `${Math.min(progress, 100)}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-sm text-muted-foreground pt-2 border-t border-border/50">
                    <Clock className="w-4 h-4" />
                    <span>{formatTimeRemaining(survey.deadline)}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
