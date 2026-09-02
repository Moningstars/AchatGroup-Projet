import { useState } from 'react';
import { ArrowLeft, Award, Clock, Users, AlertCircle, CheckCircle2 } from 'lucide-react';
import type { Survey, User, SurveyQuestion } from '../App';

interface SurveyDetailsProps {
  survey: Survey;
  user: User;
  onLoadEligibility: (surveyId: string) => Promise<void>;
  onComplete: (
    surveyId: string,
    eligibilityAnswers: Record<string, string[]>,
    surveyAnswers: Record<string, string[]>,
  ) => Promise<void>;
  onBack: () => void;
}

export function SurveyDetails({ survey, user, onLoadEligibility, onComplete, onBack }: SurveyDetailsProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [eligibilityAnswers, setEligibilityAnswers] = useState<Record<string, string[]>>({});
  const [showEligibilityCheck, setShowEligibilityCheck] = useState(true);
  const [isEligible, setIsEligible] = useState<boolean | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const checkEligibility = async () => {
    if (survey.eligibilityCriteria.length > 0 && survey.eligibilityQuestions.length === 0) {
      await onLoadEligibility(survey.id);
      return;
    }
    const missingRequired = survey.eligibilityQuestions.some(q =>
      q.required !== false && !(eligibilityAnswers[q.id]?.length > 0)
    );
    if (missingRequired) {
      setIsEligible(false);
      return;
    }
    await onLoadEligibility(survey.id);
    setIsEligible(true);
    setShowEligibilityCheck(false);
  };

  const handleAnswer = (questionId: string, value: string, isMultiple: boolean, eligibility = false) => {
    const setter = eligibility ? setEligibilityAnswers : setAnswers;
    setter(prev => {
      if (isMultiple) {
        const current = prev[questionId] || [];
        if (current.includes(value)) {
          return { ...prev, [questionId]: current.filter(v => v !== value) };
        } else {
          return { ...prev, [questionId]: [...current, value] };
        }
      } else {
        return { ...prev, [questionId]: [value] };
      }
    });
  };

  const currentQuestion = survey.questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === survey.questions.length - 1;
  const hasAnswered = answers[currentQuestion?.id]?.length > 0;

  const handleNext = async () => {
    if (isLastQuestion) {
      setSubmitting(true);
      try {
        await onComplete(survey.id, eligibilityAnswers, answers);
      } finally {
        setSubmitting(false);
      }
    } else {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const progress = ((currentQuestionIndex + 1) / survey.questions.length) * 100;

  const formatTimeRemaining = (deadline: Date) => {
    const now = new Date();
    const diff = deadline.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));

    if (hours > 24) {
      return `${Math.floor(hours / 24)} jours`;
    }
    return `${hours} heures`;
  };

  if (showEligibilityCheck) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Retour</span>
        </button>

        <div className="bg-card border border-border rounded-2xl p-6 space-y-6">
          <div className="aspect-video w-full overflow-hidden bg-muted rounded-xl">
            <img
              src={survey.imageUrl}
              alt={survey.title}
              className="w-full h-full object-cover"
            />
          </div>

          <div>
            <span className="text-xs bg-secondary/10 text-secondary px-3 py-1 rounded-full">
              {survey.rewardType === 'money' ? 'Argent' : 'Points'}
            </span>
            <h1 className="mt-3">{survey.title}</h1>
            <p className="text-muted-foreground mt-2">{survey.description}</p>
          </div>

          <div className="flex items-center gap-4 justify-between bg-muted/50 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <Award className={`w-6 h-6 ${survey.rewardType === 'money' ? 'text-secondary' : 'text-warning'}`} />
              <div>
                <p className="text-sm text-muted-foreground">Récompense</p>
                <p className="text-xl font-mono">
                  {survey.reward.toLocaleString()} {survey.rewardType === 'money' ? 'FCFA' : 'points'}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Questions</p>
              <p className="text-xl font-mono">{survey.questions.length}</p>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-primary" />
              Vérification d'éligibilité
            </h3>
            {survey.eligibilityQuestions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Cliquez pour charger ou valider le test d’éligibilité avant de répondre.
              </p>
            ) : (
              <div className="space-y-4">
                {survey.eligibilityQuestions.map(question => (
                  <div key={question.id} className="rounded-xl border border-border bg-muted/20 p-4">
                    <p className="font-medium">{question.question}</p>
                    {question.type === 'text' ? (
                      <textarea
                        value={eligibilityAnswers[question.id]?.[0] || ''}
                        onChange={(e) => handleAnswer(question.id, e.target.value, false, true)}
                        placeholder="Votre réponse..."
                        className="mt-3 w-full min-h-20 p-3 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                      />
                    ) : (
                      <div className="mt-3 space-y-2">
                        {question.options?.map(option => {
                          const selected = eligibilityAnswers[question.id]?.includes(option.id);
                          const multiple = question.type === 'multiple';
                          return (
                            <button
                              key={option.id}
                              onClick={() => handleAnswer(question.id, option.id, multiple, true)}
                              className={`w-full rounded-lg border p-3 text-left transition ${selected ? 'border-secondary bg-secondary/10' : 'border-border bg-card hover:bg-muted/50'}`}
                            >
                              {option.label}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {isEligible === false && (
            <div className="flex items-start gap-2 bg-destructive/10 text-destructive rounded-lg p-4">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium">Vous n'êtes pas éligible</p>
                <p className="text-destructive/80 mt-1">
                  Vous ne répondez pas aux critères requis pour participer à ce sondage.
                </p>
              </div>
            </div>
          )}

          <button
            onClick={checkEligibility}
            disabled={false}
            className={`w-full py-4 rounded-xl text-lg transition-colors ${
              'bg-primary text-primary-foreground hover:bg-primary/90'
            }`}
          >
            {survey.eligibilityCriteria.length > 0 && survey.eligibilityQuestions.length === 0
              ? 'Charger le test'
              : isEligible === false
                ? 'Réponses manquantes'
                : 'Valider et commencer'}
          </button>

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span>{survey.currentParticipants}/{survey.targetParticipants} participants</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>{formatTimeRemaining(survey.deadline)} restantes</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        <span>Quitter</span>
      </button>

      <div className="bg-card border border-border rounded-2xl p-6 space-y-6">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Question {currentQuestionIndex + 1} sur {survey.questions.length}
            </span>
            <span className="font-mono">{Math.round(progress)}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-secondary transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="space-y-4">
          <h2>{currentQuestion.question}</h2>

          {currentQuestion.type === 'text' ? (
            <textarea
              value={answers[currentQuestion.id]?.[0] || ''}
              onChange={(e) => handleAnswer(currentQuestion.id, e.target.value, false)}
              placeholder="Votre réponse..."
              className="w-full min-h-32 p-4 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          ) : (
            <div className="space-y-3">
              {currentQuestion.options?.map((option) => {
                const isSelected = answers[currentQuestion.id]?.includes(option.id);
                const isMultiple = currentQuestion.type === 'multiple';

                return (
                  <button
                    key={option.id}
                    onClick={() => handleAnswer(currentQuestion.id, option.id, isMultiple)}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                      isSelected
                        ? 'border-secondary bg-secondary/10'
                        : 'border-border bg-muted/30 hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-5 h-5 rounded ${
                          isMultiple ? 'rounded-md' : 'rounded-full'
                        } border-2 flex items-center justify-center ${
                          isSelected ? 'border-secondary bg-secondary' : 'border-border'
                        }`}
                      >
                        {isSelected && (
                          <CheckCircle2 className="w-4 h-4 text-secondary-foreground" />
                        )}
                      </div>
                      <span>{option.label}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {currentQuestion.type === 'multiple' && (
            <p className="text-sm text-muted-foreground">
              Vous pouvez sélectionner plusieurs réponses
            </p>
          )}
        </div>

        <div className="flex gap-3">
          {currentQuestionIndex > 0 && (
            <button
              onClick={() => setCurrentQuestionIndex(prev => prev - 1)}
              className="px-6 py-3 rounded-lg bg-muted text-foreground hover:bg-muted/80 transition-colors"
            >
              Précédent
            </button>
          )}
          <button
            onClick={handleNext}
            disabled={!hasAnswered || submitting}
            className={`flex-1 py-3 rounded-lg transition-colors ${
              hasAnswered
                ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                : 'bg-muted text-muted-foreground cursor-not-allowed'
            }`}
          >
            {submitting ? 'Envoi en cours…' : isLastQuestion ? 'Terminer et recevoir la récompense' : 'Suivant'}
          </button>
        </div>
      </div>
    </div>
  );
}
