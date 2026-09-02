const API_BASE = import.meta.env.VITE_API_BASE_URL || `http://${window.location.hostname}:8080/api`;
const BACKEND_BASE = API_BASE.replace(/\/api\/?$/, '');

export const PARTICIPANT_TOKEN_KEY = 'opportunihub-participant-token';
export const PARTICIPANT_USER_KEY = 'opportunihub-participant-user';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem(PARTICIPANT_TOKEN_KEY);
  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type') && options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!response.ok) {
    let message = `Erreur API (${response.status})`;
    try {
      const body = await response.json();
      message = body.message || Object.values(body.erreurs || {}).join(', ') || message;
    } catch {
      // réponse non JSON
    }
    throw new Error(message);
  }
  if (response.status === 204) return undefined as T;
  const text = await response.text();
  return text ? JSON.parse(text) as T : undefined as T;
}

export function assetUrl(url?: string | null) {
  if (!url) return 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=600&h=400&fit=crop';
  return url.startsWith('http') ? url : `${BACKEND_BASE}${url}`;
}

export type AuthResponse = {
  token: string;
  id: string;
  nom?: string;
  telephone?: string;
  profilComplete?: boolean;
};

export type ApiOpportunite = {
  id: string;
  titre: string;
  description?: string;
  prixNormal: number;
  prixActuel: number;
  seuilMinimum: number;
  seuilMaximal?: number;
  participantsActuels: number;
  dateExpiration: string;
  categorie?: string;
  paliers?: { id: string; seuilMin: number; seuilMax: number; prix: number }[];
  images?: { id: string; url: string; legende?: string }[];
};

export type ApiSondage = {
  id: string;
  titre: string;
  description?: string;
  quotaVise: number;
  repondantsActuels: number;
  recompense: number;
  typeRecompense: 'ARGENT' | 'POINTS';
  dateExpiration: string;
  questions?: ApiQuestion[];
  hasEligibilite: boolean;
};

export type ApiQuestion = {
  id: string;
  ordre: number;
  typeQuestion: 'CHOIX_UNIQUE' | 'CHOIX_MULTIPLE' | 'OUI_NON' | 'TEXTE_LIBRE';
  texte: string;
  obligatoire: boolean;
  options?: { id: string; libelle: string; ordre: number }[];
};

export type ApiEligibilite = {
  id: string;
  titre: string;
  questions: ApiQuestion[];
};

export type ApiWallet = {
  soldeDisponible: number;
  soldePoints: number;
};

export type ApiParticipationOpportunite = {
  id: string;
  opportuniteId: string;
  montantGele?: number;
  quantite?: number;
  statut?: string;
  statutLivraison?: string;
  progressionLivraison?: number;
};

export const api = {
  loginDev: (telephone: string) =>
    request<AuthResponse>('/auth/dev/connexion', {
      method: 'POST',
      body: JSON.stringify({ telephone }),
    }),
  wallet: () => request<ApiWallet>('/wallet/solde'),
  opportunites: () => request<ApiOpportunite[]>('/opportunites'),
  sondages: () => request<ApiSondage[]>('/sondages'),
  mesOpportunites: () => request<ApiParticipationOpportunite[]>('/opportunites/mes-participations'),
  souscrire: (id: string, quantite = 1) =>
    request<void>(`/opportunites/${id}/souscrire?quantite=${encodeURIComponent(String(quantite))}`, {
      method: 'POST',
    }),
  confirmerReception: (participationId: string, recu: boolean, commentaire?: string) =>
    request<ApiParticipationOpportunite>(`/opportunites/mes-participations/${participationId}/reception`, {
      method: 'PATCH',
      body: JSON.stringify({ recu, commentaire }),
    }),
  eligibilite: (sondageId: string) => request<ApiEligibilite>(`/sondages/${sondageId}/eligibilite`),
  passerEligibilite: (sondageId: string, reponses: { questionId: string; optionId?: string; valeurTexte?: string }[]) =>
    request<void>(`/sondages/${sondageId}/eligibilite`, {
      method: 'POST',
      body: JSON.stringify({ reponses }),
    }),
  repondreSondage: (sondageId: string, reponses: { questionId: string; optionReponseId?: string; valeurTexte?: string }[]) =>
    request<void>(`/sondages/${sondageId}/repondre`, {
      method: 'POST',
      body: JSON.stringify({ reponses }),
    }),
};
