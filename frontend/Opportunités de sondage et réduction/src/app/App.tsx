import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { HomePage } from './pages/HomePage';
import { AboutPage } from './pages/AboutPage';
import { ContactPage } from './pages/ContactPage';
import { OpportunityDetails } from './components/OpportunityDetails';
import { SurveyDetails } from './components/SurveyDetails';
import { AppHeader } from './components/AppHeader';
import { AuthModal } from './components/AuthModal';
import {
  api,
  assetUrl,
  PARTICIPANT_TOKEN_KEY,
  PARTICIPANT_USER_KEY,
  type ApiEligibilite,
  type ApiOpportunite,
  type ApiSondage,
  type ApiWallet,
} from './services/api';

export type Screen = 'home' | 'opportunities' | 'about' | 'contact' | 'opportunity-detail' | 'survey-detail';

export interface User {
  id: string;
  name: string;
  telephone?: string;
  balance: number;
  points: number;
  eligibilities: string[];
}

export interface Opportunity {
  id: string;
  title: string;
  description: string;
  originalPrice: number;
  targetPrice: number;
  currentParticipants: number;
  targetParticipants: number;
  deadline: Date;
  priceBreakpoints: { participants: number; price: number }[];
  currentPrice: number;
  imageUrl: string;
  category: string;
  participationId?: string;
  participationStatus?: string;
  participationQuantity?: number;
  participationAmount?: number;
  deliveryStatus?: string;
  deliveryProgress?: number;
}

export interface Survey {
  id: string;
  title: string;
  description: string;
  reward: number;
  rewardType: 'points' | 'money';
  currentParticipants: number;
  targetParticipants: number;
  deadline: Date;
  eligibilityCriteria: string[];
  eligibilityQuestions: SurveyQuestion[];
  questions: SurveyQuestion[];
  imageUrl: string;
}

export interface SurveyQuestion {
  id: string;
  question: string;
  type: 'single' | 'multiple' | 'text' | 'yes_no';
  required?: boolean;
  options?: { id: string; label: string }[];
}

const fallbackUser: User = { id: '', name: 'Visiteur', balance: 0, points: 0, eligibilities: [] };

function questionType(type: string): SurveyQuestion['type'] {
  if (type === 'CHOIX_MULTIPLE') return 'multiple';
  if (type === 'TEXTE_LIBRE') return 'text';
  if (type === 'OUI_NON') return 'yes_no';
  return 'single';
}

function mapQuestion(q: any): SurveyQuestion {
  const type = questionType(q.typeQuestion);
  return {
    id: q.id,
    question: q.texte,
    type,
    required: q.obligatoire !== false,
    options: type === 'yes_no'
      ? [{ id: 'oui', label: 'Oui' }, { id: 'non', label: 'Non' }]
      : (q.options || [])
          .slice()
          .sort((a: any, b: any) => Number(a.ordre || 0) - Number(b.ordre || 0))
          .map((o: any) => ({ id: o.id, label: o.libelle })),
  };
}

function mapOpportunity(op: ApiOpportunite, participation?: {
  id: string;
  montantGele?: number;
  quantite?: number;
  statut?: string;
  progressionLivraison?: number;
  statutLivraison?: string;
}): Opportunity {
  const paliers = (op.paliers || []).slice().sort((a, b) => a.seuilMin - b.seuilMin);
  const last = paliers[paliers.length - 1];
  return {
    id: op.id,
    title: op.titre,
    description: op.description || '',
    originalPrice: Number(op.prixNormal || 0),
    targetPrice: Number(last?.prix || op.prixActuel || op.prixNormal || 0),
    currentParticipants: Number(op.participantsActuels || 0),
    targetParticipants: Number(op.seuilMaximal || op.seuilMinimum || 1),
    deadline: new Date(op.dateExpiration),
    priceBreakpoints: paliers.map(p => ({ participants: p.seuilMin, price: Number(p.prix || 0) })),
    currentPrice: Number(op.prixActuel || op.prixNormal || 0),
    imageUrl: assetUrl(op.images?.[0]?.url),
    category: op.categorie || 'Opportunité',
    participationId: participation?.id,
    participationStatus: participation?.statut,
    participationQuantity: participation?.quantite,
    participationAmount: Number(participation?.montantGele || 0),
    deliveryStatus: participation?.statutLivraison,
    deliveryProgress: participation?.progressionLivraison,
  };
}

function mapSurvey(s: ApiSondage, eligibilite?: ApiEligibilite): Survey {
  return {
    id: s.id,
    title: s.titre,
    description: s.description || '',
    reward: Number(s.recompense || 0),
    rewardType: s.typeRecompense === 'POINTS' ? 'points' : 'money',
    currentParticipants: Number(s.repondantsActuels || 0),
    targetParticipants: Number(s.quotaVise || 1),
    deadline: new Date(s.dateExpiration),
    eligibilityCriteria: s.hasEligibilite ? ['Répondre au test d’éligibilité'] : [],
    eligibilityQuestions: (eligibilite?.questions || []).map(mapQuestion),
    questions: (s.questions || []).map(mapQuestion),
    imageUrl: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=600&h=400&fit=crop',
  };
}

function restoreUser(): User | null {
  try {
    const raw = localStorage.getItem(PARTICIPANT_USER_KEY);
    return raw ? JSON.parse(raw) as User : null;
  } catch {
    return null;
  }
}

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');
  const [selectedOpportunityId, setSelectedOpportunityId] = useState<string | null>(null);
  const [selectedSurveyId, setSelectedSurveyId] = useState<string | null>(null);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [user, setUser] = useState<User | null>(() => restoreUser());
  const [showAuth, setShowAuth] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);

  const selectedOpportunity = useMemo(
    () => opportunities.find(o => o.id === selectedOpportunityId),
    [opportunities, selectedOpportunityId],
  );
  const selectedSurvey = useMemo(
    () => surveys.find(s => s.id === selectedSurveyId),
    [surveys, selectedSurveyId],
  );

  const hydrateWallet = async (baseUser: User) => {
    try {
      const wallet: ApiWallet = await api.wallet();
      const next = { ...baseUser, balance: Number(wallet.soldeDisponible || 0), points: Number(wallet.soldePoints || 0) };
      setUser(next);
      localStorage.setItem(PARTICIPANT_USER_KEY, JSON.stringify(next));
    } catch {
      setUser(baseUser);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [rawOpps, rawSurveys] = await Promise.all([api.opportunites(), api.sondages()]);
      let participations: Awaited<ReturnType<typeof api.mesOpportunites>> = [];
      if (localStorage.getItem(PARTICIPANT_TOKEN_KEY)) {
        try { participations = await api.mesOpportunites(); } catch { participations = []; }
      }
      const participationsByOpp = Object.fromEntries(participations.map(p => [p.opportuniteId, p]));
      setOpportunities(rawOpps.map(op => mapOpportunity(op, participationsByOpp[op.id])));
      setSurveys(rawSurveys.map(s => mapSurvey(s)));
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Impossible de charger les données');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const restored = restoreUser();
    if (restored && localStorage.getItem(PARTICIPANT_TOKEN_KEY)) hydrateWallet(restored);
  }, []);

  const navigate = (screen: Screen) => {
    setCurrentScreen(screen);
    setSelectedOpportunityId(null);
    setSelectedSurveyId(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const requireAuth = () => {
    if (!user || !localStorage.getItem(PARTICIPANT_TOKEN_KEY)) {
      setShowAuth(true);
      return false;
    }
    return true;
  };

  const handleLogin = async (telephone: string) => {
    const auth = await api.loginDev(telephone);
    localStorage.setItem(PARTICIPANT_TOKEN_KEY, auth.token);
    const next: User = {
      id: auth.id,
      name: auth.nom || auth.telephone || telephone,
      telephone: auth.telephone || telephone,
      balance: 0,
      points: 0,
      eligibilities: [],
    };
    localStorage.setItem(PARTICIPANT_USER_KEY, JSON.stringify(next));
    setShowAuth(false);
    await hydrateWallet(next);
    await loadData();
  };

  const logout = () => {
    localStorage.removeItem(PARTICIPANT_TOKEN_KEY);
    localStorage.removeItem(PARTICIPANT_USER_KEY);
    setUser(null);
    loadData();
  };

  const handleParticipate = async (opportunityId: string) => {
    if (!requireAuth()) return;
    try {
      await api.souscrire(opportunityId, 1);
      setNotice('Participation enregistrée. Les fonds sont gelés jusqu’à validation du quota.');
      await loadData();
      const current = restoreUser();
      if (current) await hydrateWallet(current);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Souscription impossible');
    }
  };

  const handleConfirmReception = async (participationId: string, recu: boolean, commentaire?: string) => {
    if (!requireAuth()) return;
    try {
      await api.confirmerReception(participationId, recu, commentaire);
      setNotice(recu ? 'Réception confirmée, merci.' : 'Litige signalé, l’équipe va suivre le dossier.');
      await loadData();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Confirmation impossible');
    }
  };

  const loadSurveyEligibility = async (surveyId: string) => {
    const survey = surveys.find(s => s.id === surveyId);
    if (!survey || survey.eligibilityQuestions.length > 0) return;
    try {
      const eligibilite = await api.eligibilite(surveyId);
      setSurveys(prev => prev.map(s => s.id === surveyId ? { ...s, eligibilityQuestions: eligibilite.questions.map(mapQuestion) } : s));
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Test d’éligibilité indisponible');
    }
  };

  const handleCompleteSurvey = async (
    surveyId: string,
    eligibilityAnswers: Record<string, string[]>,
    surveyAnswers: Record<string, string[]>,
  ) => {
    if (!requireAuth()) return;
    const survey = surveys.find(s => s.id === surveyId);
    if (!survey) return;
    try {
      if (survey.eligibilityQuestions.length > 0) {
        await api.passerEligibilite(surveyId, Object.entries(eligibilityAnswers).flatMap(([questionId, values]) => {
          const q = survey.eligibilityQuestions.find(item => item.id === questionId);
          return values.map(value => q?.type === 'text' || q?.type === 'yes_no'
            ? { questionId, valeurTexte: value }
            : { questionId, optionId: value });
        }));
      }
      await api.repondreSondage(surveyId, Object.entries(surveyAnswers).flatMap(([questionId, values]) => {
        const q = survey.questions.find(item => item.id === questionId);
        return values.map(value => q?.type === 'text' || q?.type === 'yes_no'
          ? { questionId, valeurTexte: value }
          : { questionId, optionReponseId: value });
      }));
      setNotice('Réponse enregistrée. La récompense suivra le mode de distribution du sondage.');
      navigate('home');
      await loadData();
      const current = restoreUser();
      if (current) await hydrateWallet(current);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Impossible de terminer le sondage');
    }
  };

  const showDetail = currentScreen === 'opportunity-detail' && selectedOpportunity;
  const showSurvey = currentScreen === 'survey-detail' && selectedSurvey;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader
        currentScreen={currentScreen}
        onNavigate={navigate}
        user={user}
        onLoginClick={() => setShowAuth(true)}
        onLogout={logout}
      />

      {notice && (
        <div className="mx-auto mt-4 max-w-4xl rounded-xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm text-primary">
          <div className="flex items-center justify-between gap-4">
            <span>{notice}</span>
            <button onClick={() => setNotice(null)} className="font-semibold">Fermer</button>
          </div>
        </div>
      )}

      <main>
        {loading && (
          <div className="mx-auto max-w-4xl px-4 py-12 text-center text-muted-foreground">
            Chargement des données OpportuniHub…
          </div>
        )}

        {!loading && showDetail && (
          <motion.div key={`opp-${selectedOpportunityId}`} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <OpportunityDetails
              opportunity={selectedOpportunity}
              user={user || fallbackUser}
              onParticipate={handleParticipate}
              onConfirmReception={handleConfirmReception}
              onBack={() => navigate('home')}
            />
          </motion.div>
        )}

        {!loading && showSurvey && (
          <motion.div key={`survey-${selectedSurveyId}`} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <SurveyDetails
              survey={selectedSurvey}
              user={user || fallbackUser}
              onLoadEligibility={loadSurveyEligibility}
              onComplete={handleCompleteSurvey}
              onBack={() => navigate('home')}
            />
          </motion.div>
        )}

        {!loading && !showDetail && !showSurvey && currentScreen === 'home' && (
          <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
            <HomePage
              opportunities={opportunities}
              surveys={surveys}
              onSelectOpportunity={(id) => { setSelectedOpportunityId(id); setCurrentScreen('opportunity-detail'); }}
              onSelectSurvey={(id) => { setSelectedSurveyId(id); setCurrentScreen('survey-detail'); loadSurveyEligibility(id); }}
            />
          </motion.div>
        )}

        {!loading && !showDetail && !showSurvey && currentScreen === 'opportunities' && (
          <motion.div key="opps" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
            <HomePage
              opportunities={opportunities}
              surveys={surveys}
              onSelectOpportunity={(id) => { setSelectedOpportunityId(id); setCurrentScreen('opportunity-detail'); }}
              onSelectSurvey={(id) => { setSelectedSurveyId(id); setCurrentScreen('survey-detail'); loadSurveyEligibility(id); }}
              scrollToCategories
            />
          </motion.div>
        )}

        {currentScreen === 'about' && (
          <motion.div key="about" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
            <AboutPage />
          </motion.div>
        )}

        {currentScreen === 'contact' && (
          <motion.div key="contact" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
            <ContactPage />
          </motion.div>
        )}
      </main>

      {showAuth && <AuthModal onLogin={handleLogin} onClose={() => setShowAuth(false)} />}
    </div>
  );
}
