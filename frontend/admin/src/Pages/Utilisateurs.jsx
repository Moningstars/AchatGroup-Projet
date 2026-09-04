import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Loader2, ShieldCheck, ShieldOff, Users, Eye, User, Phone, Calendar, CheckCircle2, ShieldAlert, Globe, MapPin, CreditCard, Briefcase, Mail, Home, Trash2, AlertTriangle } from 'lucide-react'
import {
  Badge, Card, Table, Th, Td, Tr, Spinner, EmptyState,
  SearchInput, FilterPill, ActionBtn, Pagination,
} from '../components/ui'
import { getAdminUtilisateurs, getAdminUtilisateurDetail, activerUtilisateur, suspendreUtilisateur, supprimerUtilisateur } from '../services/api'

const STATUT_COLOR = { EN_ATTENTE: 'amber', ACTIF: 'emerald', SUSPENDU: 'rose', BANNI: 'gray' }
const STATUT_LABEL = { EN_ATTENTE: 'En attente', ACTIF: 'Actif', SUSPENDU: 'Suspendu', BANNI: 'Banni' }
const VERIF_COLOR  = { AUCUN: 'gray', QUESTIONS_FILTRES: 'amber', PREUVE_DOCUMENT: 'sky', VERIFIE: 'emerald' }
const VERIF_LABEL  = { AUCUN: 'Aucune', QUESTIONS_FILTRES: 'Questions filtre', PREUVE_DOCUMENT: 'Document', VERIFIE: 'Vérifié' }

const FILTERS       = ['TOUS', 'ACTIF', 'EN_ATTENTE', 'SUSPENDU']
const FILTER_LABELS = ['Tous', 'Actifs', 'En attente', 'Suspendus']

const AV_COLORS = ['bg-violet-100 text-violet-700', 'bg-emerald-100 text-emerald-700', 'bg-sky-100 text-sky-700', 'bg-amber-100 text-amber-700', 'bg-indigo-100 text-indigo-700']

function avatarColor(name) {
  const code = (name || '?').charCodeAt(0)
  return AV_COLORS[code % AV_COLORS.length]
}

function initiales(nom) {
  if (!nom) return '?'
  return nom.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

function formatDate(dt) {
  if (!dt) return '—'
  return new Date(dt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function DetailRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-slate-100 last:border-0">
      <div className="w-7 h-7 flex-shrink-0 rounded-lg bg-violet-50 flex items-center justify-center mt-0.5">
        <Icon size={13} className="text-violet-500" />
      </div>
      <div className="min-w-0">
        <p className="text-[9.5px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
        <p className="mt-0.5 text-[13px] font-semibold text-slate-800 break-all">{value || '—'}</p>
      </div>
    </div>
  )
}

const TYPE_PIECE_LABEL = {
  CNI: 'Carte nationale d\'identité',
  PASSEPORT: 'Passeport',
  PERMIS_CONDUIRE: 'Permis de conduire',
  TITRE_SEJOUR: 'Titre de séjour',
}

function Section({ title, children }) {
  return (
    <div>
      <p className="text-[9.5px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">{title}</p>
      <div className="rounded-xl border border-slate-100 bg-slate-50/50 px-3">{children}</div>
    </div>
  )
}

function UserDetailContent({ userId, baseUser, onClose, onDeleted }) {
  const [detail, setDetail]       = useState(null)
  const [loading, setLoading]     = useState(true)
  const [confirmDel, setConfirmDel] = useState(false)
  const [deleting, setDeleting]   = useState(false)
  const [delError, setDelError]   = useState('')

  useEffect(() => {
    if (!userId) return
    let cancelled = false
    getAdminUtilisateurDetail(userId)
      .then(data => { if (!cancelled) setDetail(data) })
      .catch(() => { if (!cancelled) setDetail(null) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [userId])

  const handleSupprimer = async () => {
    setDeleting(true)
    setDelError('')
    try {
      await supprimerUtilisateur(userId)
      onDeleted()
      onClose()
    } catch (err) {
      if (err.response?.status === 409) {
        setDelError('Impossible de supprimer : cet utilisateur a des données liées (participations, transactions). Suspendez-le à la place.')
      } else {
        setDelError('Erreur lors de la suppression.')
      }
      setConfirmDel(false)
    } finally {
      setDeleting(false)
    }
  }

  if (!userId) return null

  const d = detail || baseUser
  const hasKyc = detail && (detail.prenom || detail.numeroPiece || detail.email)

  return (
    <div className="mx-auto w-full max-w-5xl pb-8">
      <div className="flex w-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 flex-shrink-0">
          <div className={`w-10 h-10 flex-shrink-0 rounded-xl flex items-center justify-center text-[13px] font-bold ${avatarColor(d?.nom)}`}>
            {initiales(d?.nom)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-slate-900 text-sm truncate">
              {detail?.prenom ? `${detail.prenom} ${detail.nom || ''}` : (d?.nom || '—')}
            </p>
            <p className="text-[11px] font-mono text-slate-400 mt-0.5">{d?.id?.slice(0, 8)}…</p>
          </div>
          <Badge color={STATUT_COLOR[d?.statut] || 'gray'}>{STATUT_LABEL[d?.statut] || d?.statut}</Badge>
          <button onClick={onClose} className="inline-flex flex-shrink-0 items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"><ArrowLeft size={14} /> Retour</button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 size={22} className="animate-spin text-violet-500" /></div>
          ) : (
            <>
              <Section title="Compte">
                <DetailRow icon={Phone}       label="Téléphone"          value={d?.telephone} />
                <DetailRow icon={Calendar}    label="Inscrit le"         value={formatDate(d?.createdAt)} />
                <DetailRow icon={CheckCircle2} label="Profil"            value={d?.profilComplete ? 'Complet' : 'Incomplet'} />
                <DetailRow icon={ShieldAlert} label="Niveau vérification" value={VERIF_LABEL[d?.niveauVerification] || d?.niveauVerification} />
              </Section>

              {hasKyc ? (
                <>
                  <Section title="Identité">
                    <DetailRow icon={User}     label="Nom complet"       value={`${detail.prenom || ''} ${detail.nom || ''}`.trim()} />
                    <DetailRow icon={Calendar} label="Date de naissance"  value={formatDate(detail.dateNaissance)} />
                    <DetailRow icon={MapPin}   label="Lieu de naissance"  value={detail.lieuNaissance} />
                    <DetailRow icon={Globe}    label="Nationalité"        value={detail.nationalite} />
                  </Section>

                  <Section title="Pièce d'identité">
                    <DetailRow icon={CreditCard} label="Type"       value={TYPE_PIECE_LABEL[detail.typePiece] || detail.typePiece} />
                    <DetailRow icon={CreditCard} label="Numéro"     value={detail.numeroPiece} />
                    <DetailRow icon={Calendar}   label="Expiration" value={formatDate(detail.dateExpirationPiece)} />
                  </Section>

                  <Section title="Coordonnées">
                    <DetailRow icon={Mail}   label="Email"        value={detail.email} />
                    <DetailRow icon={Home}   label="Adresse"      value={detail.adresse} />
                    <DetailRow icon={MapPin} label="Ville / Pays" value={[detail.ville, detail.pays].filter(Boolean).join(' · ')} />
                  </Section>

                  {(detail.profession || detail.sourceRevenus) && (
                    <Section title="Situation professionnelle">
                      {detail.profession    && <DetailRow icon={Briefcase} label="Profession"      value={detail.profession} />}
                      {detail.sourceRevenus && <DetailRow icon={Briefcase} label="Source de revenus" value={detail.sourceRevenus} />}
                    </Section>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center py-6 gap-2 text-center rounded-xl border border-dashed border-slate-200 bg-slate-50">
                  <User size={24} className="text-slate-300" />
                  <p className="text-[12px] font-semibold text-slate-400">Aucune information KYC renseignée</p>
                  <p className="text-[11px] text-slate-300">L'utilisateur n'a pas encore soumis de dossier de vérification.</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/60 flex-shrink-0 space-y-2">
          {delError && (
            <div className="flex items-start gap-2 rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-[11.5px] text-rose-700">
              <AlertTriangle size={13} className="flex-shrink-0 mt-0.5 text-rose-500" />
              <span>{delError}</span>
            </div>
          )}
          <div className="flex items-center justify-between gap-2">
            {confirmDel ? (
              <div className="flex items-center gap-2 flex-1">
                <AlertTriangle size={14} className="text-rose-500 flex-shrink-0" />
                <span className="text-[11.5px] font-semibold text-rose-700 flex-1">Supprimer définitivement ?</span>
                <button
                  onClick={handleSupprimer}
                  disabled={deleting}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-[11.5px] font-bold text-white hover:bg-rose-700 transition disabled:opacity-60"
                >
                  {deleting ? <Loader2 size={12} className="animate-spin" /> : null}
                  Confirmer
                </button>
                <button
                  onClick={() => setConfirmDel(false)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11.5px] font-semibold text-slate-600 hover:bg-slate-50 transition"
                >
                  Annuler
                </button>
              </div>
            ) : (
              <>
                <button
                  onClick={() => { setDelError(''); setConfirmDel(true) }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[11.5px] font-semibold text-rose-600 hover:bg-rose-100 transition"
                >
                  <Trash2 size={13} /> Supprimer le compte
                </button>
                <button
                  onClick={onClose}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
                >
                  Fermer
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Utilisateurs() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const focusedUserId = searchParams.get('focus')
  const [utilisateurs, setUtilisateurs] = useState([])
  const [loading, setLoading]           = useState(true)
  const [filterIdx, setFilterIdx]       = useState(0)
  const [search, setSearch]             = useState('')
  const [actionId, setActionId]         = useState(null)
  const [confirmId, setConfirmId]       = useState(null)
  const [page, setPage]                 = useState(1)

  const fetchData = () => {
    setLoading(true)
    getAdminUtilisateurs()
      .then(setUtilisateurs)
      .catch(() => setUtilisateurs([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    let cancelled = false
    getAdminUtilisateurs()
      .then(data => { if (!cancelled) setUtilisateurs(data) })
      .catch(() => { if (!cancelled) setUtilisateurs([]) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!focusedUserId || loading || utilisateurs.length === 0) return
    const focusedIndex = utilisateurs.findIndex(u => String(u.id) === String(focusedUserId))
    if (focusedIndex < 0) return
    setFilterIdx(0)
    setSearch('')
    setPage(Math.floor(focusedIndex / 10) + 1)
  }, [focusedUserId, loading, utilisateurs])

  useEffect(() => {
    if (!focusedUserId || loading) return undefined
    const timer = window.setTimeout(() => {
      document.querySelector('[data-focused-user="true"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 150)
    return () => window.clearTimeout(timer)
  }, [focusedUserId, loading, page])

  const handleActiver = async (id) => {
    setActionId(id)
    try { await activerUtilisateur(id); fetchData() }
    catch { setActionId(null) }
    finally { setActionId(null) }
  }

  const handleSuspendre = async (id) => {
    setConfirmId(null)
    setActionId(id)
    try { await suspendreUtilisateur(id); fetchData() }
    catch { setActionId(null) }
    finally { setActionId(null) }
  }

  const filtre   = FILTERS[filterIdx]
  const filtered = utilisateurs
    .filter(u => filtre === 'TOUS' || u.statut === filtre)
    .filter(u => {
      if (!search) return true
      const q = search.toLowerCase()
      return u.nom?.toLowerCase().includes(q) || u.telephone?.toLowerCase().includes(q)
    })

  const countByStatut = key => utilisateurs.filter(u => u.statut === key).length
  useEffect(() => setPage(1), [filterIdx, search])
  const utilisateursPage = filtered.slice((page - 1) * 10, page * 10)

  return (
    <div className="space-y-4">

      {/* ── En-tête ── */}
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[13px] font-bold text-slate-900">Utilisateurs</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {utilisateurs.length} compte{utilisateurs.length !== 1 ? 's' : ''} inscrits
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {[
              { key: 'ACTIF',      label: 'Actifs',      cls: 'bg-emerald-50 text-emerald-700' },
              { key: 'EN_ATTENTE', label: 'En attente',  cls: 'bg-amber-50 text-amber-700' },
              { key: 'SUSPENDU',   label: 'Suspendus',   cls: 'bg-rose-50 text-rose-600' },
            ].map(({ key, label, cls }) => (
              <span key={key} className={`text-[11px] font-bold px-2.5 py-1 rounded-lg ${cls}`}>
                {countByStatut(key)} {label}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-3 items-center">
          <SearchInput value={search} onChange={setSearch} placeholder="Nom ou téléphone…" />
          <div className="flex gap-1.5 flex-wrap">
            {FILTER_LABELS.map((label, idx) => (
              <FilterPill key={label} label={label} active={filterIdx === idx} onClick={() => setFilterIdx(idx)} />
            ))}
          </div>
        </div>
      </Card>

      {/* ── Tableau ── */}
      <Card noPad>
        {loading ? (
          <Spinner py="py-12" />
        ) : filtered.length === 0 ? (
          <EmptyState icon={Users} title="Aucun utilisateur trouvé" />
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  <Th>Utilisateur</Th>
                  <Th>Téléphone</Th>
                  <Th>Vérification</Th>
                  <Th>Profil</Th>
                  <Th>Inscrit le</Th>
                  <Th>Statut</Th>
                  <Th>Actions</Th>
                </tr>
              </thead>
              <tbody>
                {utilisateursPage.map(u => {
                  const isFocused = String(u.id) === String(focusedUserId)
                  return (
                  <Tr key={u.id} data-focused-user={isFocused ? 'true' : undefined} className={isFocused ? 'bg-violet-50 ring-2 ring-inset ring-violet-400 hover:bg-violet-50' : ''}>
                    <Td>
                      <div className="flex items-center gap-2.5">
                        <div className={`w-7 h-7 flex-shrink-0 rounded-lg flex items-center justify-center text-[10px] font-bold ${isFocused ? 'bg-violet-600 text-white' : avatarColor(u.nom)}`}>
                          {initiales(u.nom)}
                        </div>
                        <div>
                          <span className="font-semibold text-slate-900 text-[12.5px]">{u.nom || '—'}</span>
                          {isFocused && <span className="ml-2 rounded-full bg-violet-600 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-white">Sélectionné</span>}
                        </div>
                      </div>
                    </Td>
                    <Td><span className="font-mono text-[11.5px] text-slate-500">{u.telephone || '—'}</span></Td>
                    <Td><Badge color={VERIF_COLOR[u.niveauVerification] || 'gray'}>{VERIF_LABEL[u.niveauVerification] || u.niveauVerification}</Badge></Td>
                    <Td><Badge color={u.profilComplete ? 'emerald' : 'amber'}>{u.profilComplete ? 'Complet' : 'Incomplet'}</Badge></Td>
                    <Td><span className="text-[12px] text-slate-500">{formatDate(u.createdAt)}</span></Td>
                    <Td><Badge color={STATUT_COLOR[u.statut] || 'gray'}>{STATUT_LABEL[u.statut] || u.statut}</Badge></Td>
                    <Td>
                      {actionId === u.id ? (
                        <Loader2 size={15} className="animate-spin text-violet-500" />
                      ) : confirmId === u.id ? (
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-rose-600 font-semibold">Confirmer ?</span>
                          <ActionBtn variant="red" onClick={() => handleSuspendre(u.id)}>Oui</ActionBtn>
                          <ActionBtn onClick={() => setConfirmId(null)}>Non</ActionBtn>
                        </div>
                      ) : (
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => navigate(`/utilisateurs/${u.id}`)}
                            className="inline-flex items-center justify-center w-7 h-7 rounded-lg border border-slate-200 bg-slate-50 text-slate-500 hover:bg-violet-50 hover:border-violet-200 hover:text-violet-600 transition"
                            title="Voir les informations"
                          >
                            <Eye size={13} />
                          </button>
                          {(u.statut === 'SUSPENDU' || u.statut === 'EN_ATTENTE') && (
                            <ActionBtn variant="green" onClick={() => handleActiver(u.id)}>
                              <ShieldCheck size={12} /> Activer
                            </ActionBtn>
                          )}
                          {u.statut === 'ACTIF' && (
                            <ActionBtn variant="red" onClick={() => setConfirmId(u.id)}>
                              <ShieldOff size={12} /> Suspendre
                            </ActionBtn>
                          )}
                          {(u.statut === 'BANNI' || !u.statut) && (
                            <span className="text-[11px] text-slate-400 italic">—</span>
                          )}
                        </div>
                      )}
                    </Td>
                  </Tr>
                  )
                })}
              </tbody>
            </Table>
            <Pagination page={page} totalItems={filtered.length} onPageChange={setPage} />
            <div className="px-4 py-2.5 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                {filtered.length} résultat{filtered.length !== 1 ? 's' : ''} sur {utilisateurs.length}
              </span>
            </div>
          </>
        )}
      </Card>
    </div>
  )
}

export function UtilisateurDetailPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  return (
    <UserDetailContent
      userId={id}
      baseUser={{ id }}
      onClose={() => navigate('/utilisateurs')}
      onDeleted={() => navigate('/utilisateurs')}
    />
  )
}
