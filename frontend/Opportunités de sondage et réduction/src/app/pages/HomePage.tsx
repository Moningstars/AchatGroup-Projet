import { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Clock, Users, TrendingDown, Award, ChevronLeft, ChevronRight, Flame, Zap, BarChart3, Tag, CheckCircle2, PackageCheck } from 'lucide-react';
import type { Opportunity, Survey } from '../App';

interface HomePageProps {
  opportunities: Opportunity[];
  surveys: Survey[];
  onSelectOpportunity: (id: string) => void;
  onSelectSurvey: (id: string) => void;
  scrollToCategories?: boolean;
}

const SLIDES = [
  {
    id: 1,
    badge: 'Achat groupé · 2 places restantes',
    title: 'iPhone 15 Pro Max',
    subtitle: 'à 650 000 FCFA au lieu de 850 000 FCFA',
    desc: 'Rejoignez les 98 membres déjà inscrits. Objectif atteint dans 48h !',
    cta: 'Rejoindre le groupe',
    color: 'from-[oklch(0.32_0.18_275)] via-[oklch(0.44_0.24_275)] to-[oklch(0.38_0.22_195)]',
    accent: 'oklch(0.85 0.20 75)',
    img: 'https://images.unsplash.com/photo-1696446702779-019d9b7c9253?w=700&h=500&fit=crop',
  },
  {
    id: 2,
    badge: 'Sondage rémunéré · 2 500 FCFA',
    title: 'Donnez votre avis\nsur Canalbox Fibre',
    subtitle: '3 questions · 5 minutes maximum',
    desc: '687 participants déjà récompensés. Objectif 1 000 participants.',
    cta: 'Participer maintenant',
    color: 'from-[oklch(0.28_0.15_195)] via-[oklch(0.40_0.20_195)] to-[oklch(0.35_0.18_150)]',
    accent: 'oklch(0.85 0.20 75)',
    img: 'https://images.unsplash.com/photo-1606904825846-647eb07f5be2?w=700&h=500&fit=crop',
  },
  {
    id: 3,
    badge: 'Achat groupé · Véhicules',
    title: 'Moto Haojue DK150',
    subtitle: 'dès 950 000 FCFA avec 200 participants',
    desc: '148 membres ont déjà rejoint. Plus que 52 places pour atteindre le meilleur prix.',
    cta: 'Voir l\'offre',
    color: 'from-[oklch(0.28_0.12_25)] via-[oklch(0.42_0.18_35)] to-[oklch(0.38_0.14_50)]',
    accent: 'oklch(0.88 0.18 75)',
    img: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=700&h=500&fit=crop',
  },
  {
    id: 4,
    badge: 'Nouveauté · Électronique',
    title: 'MacBook Air M3',
    subtitle: 'à partir de 1 100 000 FCFA',
    desc: 'Nouvel achat groupé ouvert. Soyez parmi les premiers à rejoindre et bénéficiez du meilleur tarif.',
    cta: 'Découvrir l\'offre',
    color: 'from-[oklch(0.22_0.08_280)] via-[oklch(0.35_0.15_280)] to-[oklch(0.30_0.12_220)]',
    accent: 'oklch(0.80 0.22 75)',
    img: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=700&h=500&fit=crop',
  },
];

const CATEGORIES: { id: string; label: string; icon: React.ReactNode; color: string; textColor: string }[] = [
  { id: 'Électronique', label: 'Électronique', icon: <Zap className="w-5 h-5" />, color: 'oklch(0.94 0.04 275)', textColor: 'oklch(0.40 0.20 275)' },
  { id: 'Véhicules', label: 'Véhicules', icon: <TrendingDown className="w-5 h-5" />, color: 'oklch(0.94 0.04 35)', textColor: 'oklch(0.40 0.16 35)' },
  { id: 'Sondages', label: 'Sondages rémunérés', icon: <BarChart3 className="w-5 h-5" />, color: 'oklch(0.94 0.05 150)', textColor: 'oklch(0.35 0.16 150)' },
];

function formatTime(deadline: Date) {
  const diff = deadline.getTime() - Date.now();
  if (diff <= 0) return 'Expiré';
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h > 24) return `${Math.floor(h / 24)}j ${h % 24}h`;
  return `${h}h ${m}m`;
}

function participationLabel(status?: string) {
  switch (status) {
    case 'CONFIRMEE':
      return 'Confirmée';
    case 'REMBOURSEE':
      return 'Remboursée';
    case 'EN_ATTENTE':
      return 'En attente quota';
    default:
      return status ? status.replaceAll('_', ' ') : 'Déjà participé';
  }
}

function deliveryLabel(status?: string) {
  switch (status) {
    case 'EN_ATTENTE_QUOTA':
      return 'En attente du quota';
    case 'A_PREPARER':
      return 'À préparer';
    case 'EN_PREPARATION':
      return 'En préparation';
    case 'EN_LIVRAISON':
      return 'En livraison';
    case 'LIVRE_A_CONFIRMER':
      return 'À confirmer';
    case 'LIVRE_CONFIRME':
      return 'Livré';
    case 'LITIGE':
      return 'Litige';
    case 'ANNULE':
      return 'Annulé';
    default:
      return status ? status.replaceAll('_', ' ') : '';
  }
}

function OpportunityCard({ opp, onClick }: { opp: Opportunity; onClick: () => void }) {
  const progress = Math.min((opp.currentParticipants / opp.targetParticipants) * 100, 100);
  const discount = Math.round(((opp.originalPrice - opp.currentPrice) / opp.originalPrice) * 100);
  const hasParticipated = Boolean(opp.participationId);

  return (
    <motion.button
      onClick={onClick}
      className={`bg-card border rounded-2xl overflow-hidden text-left group w-full ${
        hasParticipated ? 'border-secondary/50 ring-2 ring-secondary/10' : 'border-border'
      }`}
      whileHover={{ y: -4, boxShadow: '0 12px 40px oklch(0.48 0.24 275 / 0.12)' }}
      transition={{ duration: 0.2 }}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        <img src={opp.imageUrl} alt={opp.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.45) 0%, transparent 55%)' }} />
        {discount > 0 && (
          <div className="absolute top-3 left-3 flex items-center gap-1 px-2.5 py-1 rounded-full text-white text-xs font-bold shadow-lg"
            style={{ background: 'oklch(0.55 0.22 25)' }}>
            <Flame className="w-3 h-3" /> -{discount}%
          </div>
        )}
        {hasParticipated && (
          <div className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white text-secondary text-xs font-bold shadow-lg">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Déjà participé
          </div>
        )}
        <div className="absolute bottom-3 left-3 right-3">
          <div className="flex items-center justify-between text-white text-xs">
            <span className="flex items-center gap-1 bg-black/30 backdrop-blur-sm px-2 py-1 rounded-full">
              <Users className="w-3 h-3" /> {opp.currentParticipants}/{opp.targetParticipants}
            </span>
            <span className="flex items-center gap-1 bg-black/30 backdrop-blur-sm px-2 py-1 rounded-full">
              <Clock className="w-3 h-3" /> {formatTime(opp.deadline)}
            </span>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-3">
        <div>
          <h3 className="font-bold text-foreground leading-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>{opp.title}</h3>
          <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{opp.description}</p>
        </div>

        {hasParticipated && (
          <div className="rounded-xl border border-secondary/20 bg-secondary/10 p-3 text-sm text-secondary">
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 font-semibold">
                <CheckCircle2 className="w-4 h-4" />
                {participationLabel(opp.participationStatus)}
              </span>
              {opp.participationQuantity && (
                <span className="rounded-full bg-white/70 px-2 py-0.5 text-xs">
                  Qté {opp.participationQuantity}
                </span>
              )}
            </div>
            {opp.participationAmount ? (
              <p className="mt-1 text-xs text-secondary/80">
                {opp.participationAmount.toLocaleString()} FCFA gelés pour cette participation.
              </p>
            ) : null}
            {opp.deliveryStatus && (
              <div className="mt-2 flex items-center justify-between gap-3 text-xs text-secondary/90">
                <span className="flex items-center gap-1.5">
                  <PackageCheck className="w-3.5 h-3.5" />
                  {deliveryLabel(opp.deliveryStatus)}
                </span>
                <span className="font-mono">{opp.deliveryProgress || 0}%</span>
              </div>
            )}
          </div>
        )}

        <div className="flex items-baseline gap-2">
          <span className="text-xl font-bold text-primary" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
            {opp.currentPrice.toLocaleString()}
          </span>
          <span className="text-sm line-through text-muted-foreground" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
            {opp.originalPrice.toLocaleString()}
          </span>
          <span className="text-xs text-muted-foreground">FCFA</span>
        </div>

        <div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${progress}%`, background: 'linear-gradient(90deg, oklch(0.48 0.24 275), oklch(0.55 0.20 195))' }}
            />
          </div>
          <div className="mt-1 text-xs text-muted-foreground text-right">{Math.round(progress)}% atteint</div>
        </div>
      </div>
    </motion.button>
  );
}

function SurveyCard({ survey, onClick }: { survey: Survey; onClick: () => void }) {
  const progress = Math.min((survey.currentParticipants / survey.targetParticipants) * 100, 100);

  return (
    <motion.button
      onClick={onClick}
      className="bg-card border border-border rounded-2xl overflow-hidden text-left group w-full"
      whileHover={{ y: -4, boxShadow: '0 12px 40px oklch(0.55 0.20 195 / 0.12)' }}
      transition={{ duration: 0.2 }}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        <img src={survey.imageUrl} alt={survey.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.45) 0%, transparent 55%)' }} />
        <div className="absolute top-3 left-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-white text-xs font-bold shadow-lg"
          style={{ background: survey.rewardType === 'money' ? 'oklch(0.50 0.20 195)' : 'oklch(0.65 0.18 75)' }}>
          <Award className="w-3.5 h-3.5" />
          {survey.reward.toLocaleString()} {survey.rewardType === 'money' ? 'FCFA' : 'pts'}
        </div>
        <div className="absolute bottom-3 left-3 right-3">
          <div className="flex items-center justify-between text-white text-xs">
            <span className="flex items-center gap-1 bg-black/30 backdrop-blur-sm px-2 py-1 rounded-full">
              <Users className="w-3 h-3" /> {survey.currentParticipants}/{survey.targetParticipants}
            </span>
            <span className="flex items-center gap-1 bg-black/30 backdrop-blur-sm px-2 py-1 rounded-full">
              <Clock className="w-3 h-3" /> {formatTime(survey.deadline)}
            </span>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-3">
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ background: 'oklch(0.93 0.04 150)', color: 'oklch(0.38 0.15 150)' }}>
              {survey.questions.length} questions
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ background: 'oklch(0.95 0.03 275)', color: 'oklch(0.45 0.18 275)' }}>
              {survey.rewardType === 'money' ? 'Argent' : 'Points'}
            </span>
          </div>
          <h3 className="font-bold text-foreground leading-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>{survey.title}</h3>
          <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{survey.description}</p>
        </div>

        <div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${progress}%`, background: 'linear-gradient(90deg, oklch(0.55 0.20 150), oklch(0.50 0.20 195))' }}
            />
          </div>
          <div className="mt-1 text-xs text-muted-foreground text-right">{Math.round(progress)}% atteint</div>
        </div>
      </div>
    </motion.button>
  );
}

export function HomePage({ opportunities, surveys, onSelectOpportunity, onSelectSurvey, scrollToCategories }: HomePageProps) {
  const [slide, setSlide] = useState(0);
  const [paused, setPaused] = useState(false);
  const categoriesRef = useRef<HTMLDivElement>(null);
  const total = SLIDES.length;

  useEffect(() => {
    if (scrollToCategories && categoriesRef.current) {
      setTimeout(() => categoriesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    }
  }, [scrollToCategories]);

  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => setSlide(s => (s + 1) % total), 5000);
    return () => clearInterval(t);
  }, [paused, total]);

  const prev = () => { setPaused(true); setSlide(s => (s - 1 + total) % total); };
  const next = () => { setPaused(true); setSlide(s => (s + 1) % total); };

  const electroOpps = opportunities.filter(o => o.category === 'Électronique');
  const vehicleOpps = opportunities.filter(o => o.category === 'Véhicules');
  const s = SLIDES[slide];

  return (
    <div>
      {/* ── HERO BANNER ── */}
      <div
        className="relative overflow-hidden"
        style={{ minHeight: '520px' }}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {/* Background transition */}
        <div
          key={slide}
          className={`absolute inset-0 bg-gradient-to-br ${s.color} transition-opacity duration-700`}
        />

        {/* Decorative circles */}
        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full opacity-15" style={{ background: 'white' }} />
        <div className="absolute bottom-0 -left-16 w-56 h-56 rounded-full opacity-10" style={{ background: 'white' }} />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-12 flex flex-col lg:flex-row items-center gap-10 min-h-[520px]">
          {/* Text */}
          <div className="flex-1 text-white space-y-5 text-center lg:text-left">
            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold mb-4"
                style={{ background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.25)' }}>
                <Tag className="w-3 h-3" /> {s.badge}
              </span>
              <h1 className="text-4xl sm:text-5xl font-bold leading-tight whitespace-pre-line" style={{ fontFamily: 'Outfit, sans-serif' }}>
                {s.title}
              </h1>
              <p className="text-lg font-semibold mt-2" style={{ color: s.accent }}>{s.subtitle}</p>
            </div>
            <p className="text-white/75 leading-relaxed max-w-md mx-auto lg:mx-0">{s.desc}</p>
            <button
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl font-bold text-sm shadow-lg transition-all hover:shadow-xl hover:opacity-90"
              style={{ background: s.accent, color: 'oklch(0.20 0.05 280)', fontFamily: 'Outfit, sans-serif' }}
            >
              {s.cta}
            </button>
          </div>

          {/* Image */}
          <div className="w-full lg:w-[420px] shrink-0">
            <div className="rounded-2xl overflow-hidden shadow-2xl aspect-[4/3]" style={{ border: '2px solid rgba(255,255,255,0.15)' }}>
              <img key={slide} src={s.img} alt={s.title} className="w-full h-full object-cover" />
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3">
          <button onClick={prev} className="w-8 h-8 rounded-full flex items-center justify-center text-white transition-all hover:bg-white/20" style={{ background: 'rgba(255,255,255,0.12)' }}>
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="flex gap-2">
            {SLIDES.map((_, i) => (
              <button key={i} onClick={() => { setPaused(true); setSlide(i); }}
                className="rounded-full transition-all duration-300"
                style={{ width: i === slide ? '24px' : '8px', height: '8px', background: i === slide ? 'white' : 'rgba(255,255,255,0.40)' }}
              />
            ))}
          </div>
          <button onClick={next} className="w-8 h-8 rounded-full flex items-center justify-center text-white transition-all hover:bg-white/20" style={{ background: 'rgba(255,255,255,0.12)' }}>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── STATS BAR ── */}
      <div className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 grid grid-cols-3 divide-x divide-border">
          {[
            { val: '12 400+', label: 'Membres actifs' },
            { val: '3 200', label: 'Achats réalisés' },
            { val: '98%', label: 'Satisfaction client' },
          ].map(({ val, label }) => (
            <div key={label} className="text-center px-4">
              <div className="text-xl font-bold text-primary" style={{ fontFamily: 'Outfit, sans-serif' }}>{val}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── CATEGORIES ── */}
      <div ref={categoriesRef} className="max-w-7xl mx-auto px-4 sm:px-6 py-12 space-y-14">

        {/* Électronique */}
        {electroOpps.length > 0 && (
          <section>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: CATEGORIES[0].color, color: CATEGORIES[0].textColor }}>
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-bold text-foreground" style={{ fontFamily: 'Outfit, sans-serif' }}>Électronique</h2>
                <p className="text-sm text-muted-foreground">{electroOpps.length} offre{electroOpps.length > 1 ? 's' : ''} disponible{electroOpps.length > 1 ? 's' : ''}</p>
              </div>
              <div className="ml-auto">
                <div className="h-px w-32 sm:w-64" style={{ background: 'linear-gradient(90deg, oklch(0.48 0.24 275), transparent)' }} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {electroOpps.map((opp, i) => (
                <motion.div key={opp.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
                  <OpportunityCard opp={opp} onClick={() => onSelectOpportunity(opp.id)} />
                </motion.div>
              ))}
            </div>
          </section>
        )}

        {/* Véhicules */}
        {vehicleOpps.length > 0 && (
          <section>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: CATEGORIES[1].color, color: CATEGORIES[1].textColor }}>
                <TrendingDown className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-bold text-foreground" style={{ fontFamily: 'Outfit, sans-serif' }}>Véhicules</h2>
                <p className="text-sm text-muted-foreground">{vehicleOpps.length} offre{vehicleOpps.length > 1 ? 's' : ''} disponible{vehicleOpps.length > 1 ? 's' : ''}</p>
              </div>
              <div className="ml-auto">
                <div className="h-px w-32 sm:w-64" style={{ background: 'linear-gradient(90deg, oklch(0.55 0.16 35), transparent)' }} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {vehicleOpps.map((opp, i) => (
                <motion.div key={opp.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
                  <OpportunityCard opp={opp} onClick={() => onSelectOpportunity(opp.id)} />
                </motion.div>
              ))}
            </div>
          </section>
        )}

        {/* Sondages */}
        {surveys.length > 0 && (
          <section>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: CATEGORIES[2].color, color: CATEGORIES[2].textColor }}>
                <BarChart3 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-bold text-foreground" style={{ fontFamily: 'Outfit, sans-serif' }}>Sondages rémunérés</h2>
                <p className="text-sm text-muted-foreground">{surveys.length} sondage{surveys.length > 1 ? 's' : ''} disponible{surveys.length > 1 ? 's' : ''}</p>
              </div>
              <div className="ml-auto">
                <div className="h-px w-32 sm:w-64" style={{ background: 'linear-gradient(90deg, oklch(0.50 0.18 150), transparent)' }} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {surveys.map((survey, i) => (
                <motion.div key={survey.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
                  <SurveyCard survey={survey} onClick={() => onSelectSurvey(survey.id)} />
                </motion.div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* ── FOOTER CTA ── */}
      <div className="border-t border-border py-16"
        style={{ background: 'linear-gradient(135deg, oklch(0.97 0.02 275), oklch(0.97 0.02 195))' }}>
        <div className="max-w-2xl mx-auto text-center px-4 space-y-4">
          <h2 className="text-3xl font-bold text-foreground" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Prêt à économiser ensemble ?
          </h2>
          <p className="text-muted-foreground">Rejoignez des milliers de membres et profitez des meilleurs prix grâce aux achats groupés.</p>
          <button
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl font-bold text-white shadow-md hover:shadow-lg transition-all hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, oklch(0.48 0.24 275), oklch(0.42 0.22 195))', fontFamily: 'Outfit, sans-serif' }}
          >
            <Zap className="w-4 h-4" /> Commencer maintenant
          </button>
        </div>
      </div>
    </div>
  );
}
