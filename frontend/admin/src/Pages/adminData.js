export const menuSections = [
  {
    title: 'PRINCIPAL',
    items: [
      { label: "Vue d'ensemble", path: '', badge: 'NEW' },
      { label: 'Opportunités', path: 'opportunites' },
      { label: 'Sondages', path: 'sondages' },
      { label: 'Utilisateurs', path: 'utilisateurs' },
      { label: 'Portefeuilles', path: 'portefeuilles' },
      { label: 'Commanditaires', path: 'commanditaires' },
    ],
  },
  {
    title: 'CONTENU',
    items: [
      { label: 'Bannières', path: 'bannieres' },
    ],
  },
  {
    title: 'SYSTÈME',
    items: [
      { label: 'KYC', path: 'kyc' },
      { label: 'Paramètres', path: 'parametres' },
    ],
  },
]

export const visitorData = [
  { month: 'Jan', value: 9 },
  { month: 'Fév', value: 14 },
  { month: 'Mar', value: 13 },
  { month: 'Avr', value: 15 },
  { month: 'Mai', value: 17 },
  { month: 'Juin', value: 20 },
]

export const portfolioShare = [
  { name: 'Argent (YAS)', value: 62, color: '#4338ca' },
  { name: 'Argent (Moov)', value: 18, color: '#10b981' },
  { name: 'Points', value: 20, color: '#f59e0b' },
]

export const opportunityProgress = [
  { label: 'iPhone 15 Pro', value: 420 },
  { label: 'Samsung S24', value: 320 },
  { label: 'MacBook Air', value: 180 },
  { label: 'PlayStation 5', value: 980 },
  { label: 'Clim. Hisense', value: 520 },
]

export const recentTransactions = [
  { name: 'Kouassi Aimé', type: 'Souscription', method: 'Wave', amount: '+120 000 F', date: '24 jun. 2026', tone: 'text-slate-900', badge: 'bg-violet-100 text-violet-700' },
  { name: 'Aminata Koné', type: 'Remboursement', method: 'YAS Money', amount: '-350 000 F', date: '24 jun. 2026', tone: 'text-rose-600', badge: 'bg-rose-100 text-rose-700' },
  { name: 'Fatou Diallo', type: 'Récompense', method: 'Moov Money', amount: '-5 000 F', date: '23 jun. 2026', tone: 'text-slate-900', badge: 'bg-emerald-100 text-emerald-700' },
  { name: 'Moussa Coulibaly', type: 'Recharge', method: 'Orange Money', amount: '+10 000 F', date: '23 jun. 2026', tone: 'text-slate-900', badge: 'bg-sky-100 text-sky-700' },
  { name: 'Ibrahim Traoré', type: 'Gel', method: 'Système', amount: '+75 000 F', date: '22 jun. 2026', tone: 'text-slate-900', badge: 'bg-amber-100 text-amber-700' },
]

export const opportunityList = [
  { id: 'OPP-001', product: 'iPhone 15 Pro 256Go', manager: 'Koffi Bernard', price: '750 000 F', progress: 423, total: 500, expiration: '15 jul. 2026', status: 'En cours', statusClass: 'bg-sky-100 text-sky-700', bar: 'bg-indigo-500' },
  { id: 'OPP-002', product: 'Samsung Galaxy S24 Ultra', manager: 'Koffi Bernard', price: '620 000 F', progress: 312, total: 300, expiration: '30 jun. 2026', status: 'Succès', statusClass: 'bg-emerald-100 text-emerald-700', bar: 'bg-emerald-500' },
  { id: 'OPP-003', product: 'MacBook Air M2 8Go/256Go', manager: 'Diabaté Sana', price: '1 200 000 F', progress: 187, total: 200, expiration: '01 août. 2026', status: 'En cours', statusClass: 'bg-sky-100 text-sky-700', bar: 'bg-indigo-500' },
  { id: 'OPP-004', product: 'PlayStation 5 Standard', manager: 'Koffi Bernard', price: '350 000 F', progress: 89, total: 1000, expiration: '20 jun. 2026', status: 'Échec', statusClass: 'bg-rose-100 text-rose-700', bar: 'bg-rose-500' },
  { id: 'OPP-005', product: 'Climatiseur Hisense 1.5CV', manager: 'Diabaté Sana', price: '250 000 F', progress: 256, total: 400, expiration: '20 jul. 2026', status: 'En cours', statusClass: 'bg-sky-100 text-sky-700', bar: 'bg-amber-500' },
]

export const surveyList = [
  { id: 'SON-001', title: 'Utilisateurs Fibre CanalBox', sponsor: 'CanalBox CI', reward: 'Argent', quota: 1000, responded: 847, amount: '5 000', currency: 'FCFA/répondant', payment: 'YAS Money', earned: '4 235 000 F', expires: '10 jul. 2026', status: 'En cours', statusClass: 'bg-sky-100 text-sky-700', eligibility: 'Abonnés Fibre CanalBox actifs', color: 'bg-amber-50 text-amber-700', progress: 85 },
  { id: 'SON-002', title: 'Propriétaires Moto Haojue', sponsor: 'Haojue Afrique', reward: 'Argent', quota: 500, responded: 312, amount: '3 000', currency: 'FCFA/répondant', payment: 'Moov Money', earned: '936 000 F', expires: '05 jul. 2026', status: 'En cours', statusClass: 'bg-sky-100 text-sky-700', eligibility: 'Propriétaires Moto marque Haojue', color: 'bg-amber-50 text-amber-700', progress: 62 },
  { id: 'SON-003', title: 'Clients Orange Money actifs', sponsor: 'Orange CI', reward: 'Points', quota: 1200, responded: 1020, amount: '2 000', currency: 'FCFA/répondant', payment: 'Orange Money', earned: '4 000 000 F', expires: '28 jun. 2026', status: 'Distribué', statusClass: 'bg-emerald-100 text-emerald-700', eligibility: 'Utilisateurs Orange Money vérifiés', color: 'bg-amber-50 text-amber-700', progress: 85 },
]

export const participantRows = [
  { name: 'Kouassi Aimé', phone: '+225 07 12 34 56', verification: 'Complet', available: '45 000', frozen: '120 000', points: '2 500', activity: '3 opp. · 7 sondages', since: '12 mar. 2025', status: 'Actif', statusClass: 'bg-emerald-100 text-emerald-700' },
  { name: 'Fatou Diallo', phone: '+221 77 98 76 54', verification: 'Partiel', available: '12 500', frozen: '-', points: '800', activity: '1 opp. · 4 sondages', since: '20 mai 2025', status: 'Actif', statusClass: 'bg-emerald-100 text-emerald-700' },
  { name: 'Ibrahim Traoré', phone: '+223 65 43 21 09', verification: 'Complet', available: '0', frozen: '75 000', points: '150', activity: '2 opp. · 2 sondages', since: '08 jan. 2025', status: 'Suspendu', statusClass: 'bg-rose-100 text-rose-700' },
  { name: 'Aminata Koné', phone: '+225 05 56 78 90', verification: 'Complet', available: '87 500', frozen: '350 000', points: '5 100', activity: '5 opp. · 12 sondages', since: '03 nov. 2024', status: 'Actif', statusClass: 'bg-emerald-100 text-emerald-700' },
  { name: 'Moussa', phone: '+225 05 78 45 21 12', verification: 'Partiel', available: '32 000', frozen: '15 000', points: '1 100', activity: '1 opp. · 1 sondage', since: '15 jan. 2025', status: 'Actif', statusClass: 'bg-emerald-100 text-emerald-700' },
]

export const walletSummary = {
  balance: '45 600 000', reserve: '12 400 000', points: '3 200 000', total: '61 200 000', currency: 'FCFA', tagline: 'FCFA disponibles', action: 'Alimenter le wallet', icon: '💼', 
}

export const walletTransactions = [
  { ref: 'TXN-2847', opportunity: 'OPP-001', participant: 'Kouassi Aimé', type: 'Souscription', amount: '+120 000 F', method: 'Wave', status: 'Complète', statusClass: 'bg-emerald-100 text-emerald-700', date: '24 jun. 2026, 14:32' },
  { ref: 'TXN-2846', opportunity: 'OPP-004', participant: 'Aminata Koné', type: 'Remboursement', amount: '-350 000 F', method: 'YAS Money', status: 'En cours', statusClass: 'bg-sky-100 text-sky-700', date: '24 jun. 2026, 11:15' },
  { ref: 'TXN-2845', opportunity: 'OPP-003', participant: 'Fatou Diallo', type: 'Récompense', amount: '-5 000 F', method: 'Moov Money', status: 'Complète', statusClass: 'bg-emerald-100 text-emerald-700', date: '23 jun. 2026, 09:44' },
]

export const sponsorCards = [
  { id: 'CMD-001', name: 'CanalBox CI', balance: '5 000 000', financed: 2, status: 'Actif', statusClass: 'bg-emerald-100 text-emerald-700', email: 'partnerships@canalbox.ci', phone: '+225 20 30 40 50', badge: 'Argent' },
  { id: 'CMD-002', name: 'Haojue Afrique', balance: '1 500 000', financed: 1, status: 'Actif', statusClass: 'bg-emerald-100 text-emerald-700', email: 'marketing@haojue.africa', phone: '+225 27 10 20 30', badge: 'Argent' },
  { id: 'CMD-003', name: 'Orange CI', balance: '12 000 000', financed: 1, status: 'Actif', statusClass: 'bg-emerald-100 text-emerald-700', email: 'b2b@orange.ci', phone: '+225 27 00 00 00', badge: 'Points' },
  { id: 'CMD-004', name: 'Jumia CI', balance: '750 000', financed: 1, status: 'Inactif', statusClass: 'bg-slate-100 text-slate-500', email: 'ads@jumia.ci', phone: '+225 20 25 25 25', badge: 'Points' },
]
