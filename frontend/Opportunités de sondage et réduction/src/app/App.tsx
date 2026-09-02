import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { HomePage } from './pages/HomePage';
import { AboutPage } from './pages/AboutPage';
import { ContactPage } from './pages/ContactPage';
import { OpportunityDetails } from './components/OpportunityDetails';
import { SurveyDetails } from './components/SurveyDetails';
import { AppHeader } from './components/AppHeader';

export type Screen = 'home' | 'opportunities' | 'about' | 'contact' | 'opportunity-detail' | 'survey-detail';

export interface User {
  id: string;
  name: string;
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
  questions: SurveyQuestion[];
  imageUrl: string;
}

export interface SurveyQuestion {
  id: string;
  question: string;
  type: 'single' | 'multiple' | 'text';
  options?: string[];
}

const demoUser: User = {
  id: '1', name: 'Visiteur', balance: 0, points: 0, eligibilities: ['canalbox_fibre', 'haojue_moto']
};

const INITIAL_OPPORTUNITIES: Opportunity[] = [
  {
    id: '1',
    title: 'iPhone 15 Pro Max',
    description: 'Dernier modèle Apple avec 256GB de stockage et puce A17 Pro',
    originalPrice: 850000,
    targetPrice: 650000,
    currentParticipants: 98,
    targetParticipants: 100,
    deadline: new Date(Date.now() + 48 * 60 * 60 * 1000),
    priceBreakpoints: [
      { participants: 100, price: 650000 },
      { participants: 150, price: 600000 },
      { participants: 200, price: 550000 }
    ],
    currentPrice: 682000,
    imageUrl: 'https://images.unsplash.com/photo-1696446702779-019d9b7c9253?w=600&h=400&fit=crop',
    category: 'Électronique'
  },
  {
    id: '2',
    title: 'Samsung Galaxy S24 Ultra',
    description: 'Smartphone haut de gamme avec stylet S Pen et zoom 100x',
    originalPrice: 720000,
    targetPrice: 520000,
    currentParticipants: 48,
    targetParticipants: 50,
    deadline: new Date(Date.now() + 72 * 60 * 60 * 1000),
    priceBreakpoints: [
      { participants: 50, price: 520000 },
      { participants: 80, price: 480000 },
      { participants: 100, price: 450000 }
    ],
    currentPrice: 620000,
    imageUrl: 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=600&h=400&fit=crop',
    category: 'Électronique'
  },
  {
    id: '3',
    title: 'Moto Haojue DK150',
    description: 'Moto économique et robuste, idéale pour vos déplacements quotidiens',
    originalPrice: 1200000,
    targetPrice: 950000,
    currentParticipants: 148,
    targetParticipants: 200,
    deadline: new Date(Date.now() + 24 * 60 * 60 * 1000),
    priceBreakpoints: [
      { participants: 100, price: 1050000 },
      { participants: 150, price: 1000000 },
      { participants: 200, price: 950000 }
    ],
    currentPrice: 1020000,
    imageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&h=400&fit=crop',
    category: 'Véhicules'
  },
  {
    id: '4',
    title: 'MacBook Air M3',
    description: 'Ordinateur portable ultra-léger avec puce Apple M3',
    originalPrice: 1400000,
    targetPrice: 1100000,
    currentParticipants: 32,
    targetParticipants: 80,
    deadline: new Date(Date.now() + 96 * 60 * 60 * 1000),
    priceBreakpoints: [
      { participants: 50, price: 1250000 },
      { participants: 80, price: 1100000 },
    ],
    currentPrice: 1320000,
    imageUrl: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600&h=400&fit=crop',
    category: 'Électronique'
  }
];

const INITIAL_SURVEYS: Survey[] = [
  {
    id: '1',
    title: 'Sondage Canalbox Fibre',
    description: 'Donnez votre avis sur votre expérience avec la fibre Canalbox et gagnez 2 500 FCFA',
    reward: 2500,
    rewardType: 'money',
    currentParticipants: 687,
    targetParticipants: 1000,
    deadline: new Date(Date.now() + 120 * 60 * 60 * 1000),
    eligibilityCriteria: ['canalbox_fibre'],
    questions: [
      { id: '1', question: 'Êtes-vous satisfait de votre connexion Canalbox Fibre?', type: 'single', options: ['Très satisfait', 'Satisfait', 'Peu satisfait', 'Pas satisfait'] },
      { id: '2', question: 'Quel est le débit moyen que vous recevez?', type: 'single', options: ['Moins de 50 Mbps', '50-100 Mbps', '100-200 Mbps', 'Plus de 200 Mbps'] },
      { id: '3', question: 'Recommanderiez-vous Canalbox à un proche?', type: 'single', options: ['Oui, certainement', 'Probablement', 'Probablement pas', 'Non'] }
    ],
    imageUrl: 'https://images.unsplash.com/photo-1606904825846-647eb07f5be2?w=600&h=400&fit=crop'
  },
  {
    id: '2',
    title: 'Sondage Moto Haojue',
    description: 'Partagez votre expérience avec votre moto Haojue et gagnez 500 points',
    reward: 500,
    rewardType: 'points',
    currentParticipants: 412,
    targetParticipants: 800,
    deadline: new Date(Date.now() + 168 * 60 * 60 * 1000),
    eligibilityCriteria: ['haojue_moto'],
    questions: [
      { id: '1', question: 'Depuis combien de temps possédez-vous votre Haojue?', type: 'single', options: ['Moins de 6 mois', '6-12 mois', '1-2 ans', 'Plus de 2 ans'] },
      { id: '2', question: 'Quelle est votre consommation moyenne?', type: 'single', options: ['Moins de 2L/100km', '2-3L/100km', '3-4L/100km', 'Plus de 4L/100km'] },
      { id: '3', question: 'Quels aspects appréciez-vous le plus?', type: 'multiple', options: ['Économie de carburant', 'Robustesse', 'Prix des pièces', 'Confort', 'Design'] }
    ],
    imageUrl: 'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?w=600&h=400&fit=crop'
  }
];

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');
  const [selectedOpportunityId, setSelectedOpportunityId] = useState<string | null>(null);
  const [selectedSurveyId, setSelectedSurveyId] = useState<string | null>(null);
  const [opportunities, setOpportunities] = useState<Opportunity[]>(INITIAL_OPPORTUNITIES);
  const [surveys] = useState<Survey[]>(INITIAL_SURVEYS);

  const navigate = (screen: Screen) => {
    setCurrentScreen(screen);
    setSelectedOpportunityId(null);
    setSelectedSurveyId(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleParticipate = (opportunityId: string) => {
    setOpportunities(prev => prev.map(o =>
      o.id === opportunityId ? { ...o, currentParticipants: o.currentParticipants + 1 } : o
    ));
  };

  const handleCompleteSurvey = (_surveyId: string) => {
    setCurrentScreen('home');
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setOpportunities(prev => prev.map(opp => {
        const sorted = [...opp.priceBreakpoints].sort((a, b) => b.participants - a.participants);
        let currentPrice = opp.originalPrice;
        for (const bp of sorted) {
          if (opp.currentParticipants >= bp.participants) { currentPrice = bp.price; break; }
        }
        const progress = opp.currentParticipants / opp.targetParticipants;
        if (progress < 1 && progress > 0) {
          currentPrice = opp.originalPrice - (opp.originalPrice - opp.targetPrice) * progress;
        }
        return { ...opp, currentPrice: Math.round(currentPrice) };
      }));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const showDetail = currentScreen === 'opportunity-detail' && selectedOpportunityId;
  const showSurvey = currentScreen === 'survey-detail' && selectedSurveyId;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader currentScreen={currentScreen} onNavigate={navigate} />

      <main>
        {showDetail && (
          <motion.div key={`opp-${selectedOpportunityId}`} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <OpportunityDetails
              opportunity={opportunities.find(o => o.id === selectedOpportunityId)!}
              user={demoUser}
              onParticipate={handleParticipate}
              onBack={() => navigate('home')}
            />
          </motion.div>
        )}

        {showSurvey && (
          <motion.div key={`survey-${selectedSurveyId}`} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <SurveyDetails
              survey={surveys.find(s => s.id === selectedSurveyId)!}
              user={demoUser}
              onComplete={handleCompleteSurvey}
              onBack={() => navigate('home')}
            />
          </motion.div>
        )}

        {!showDetail && !showSurvey && currentScreen === 'home' && (
          <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
            <HomePage
              opportunities={opportunities}
              surveys={surveys}
              onSelectOpportunity={(id) => { setSelectedOpportunityId(id); setCurrentScreen('opportunity-detail'); }}
              onSelectSurvey={(id) => { setSelectedSurveyId(id); setCurrentScreen('survey-detail'); }}
            />
          </motion.div>
        )}

        {!showDetail && !showSurvey && currentScreen === 'opportunities' && (
          <motion.div key="opps" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
            <HomePage
              opportunities={opportunities}
              surveys={surveys}
              onSelectOpportunity={(id) => { setSelectedOpportunityId(id); setCurrentScreen('opportunity-detail'); }}
              onSelectSurvey={(id) => { setSelectedSurveyId(id); setCurrentScreen('survey-detail'); }}
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
    </div>
  );
}
