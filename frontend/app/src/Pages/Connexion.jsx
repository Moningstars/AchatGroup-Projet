import { useEffect, useState, useRef } from 'react'
import { ArrowRight, X, Loader2, ShieldCheck, Lock, ArrowLeft, CheckCircle2, ChevronDown, Search, Check } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
// import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth'
import { useAuth } from '../context/AuthContext'
import { authVerifierFirebase, completerProfil, connexionDev } from '../services/api'
// import { firebaseAuth } from '../services/firebase'
import { AsYouType, isValidPhoneNumber } from 'libphonenumber-js'

// [DEV] Contournement temporaire tant que Firebase Phone Auth n'est pas configuré
// (voir backend AuthService.connecterDev — actif tant que firebase.dev-mode=true).
// Le flow Firebase réel est conservé en commentaire ci-dessous, à réactiver une fois
// Firebase configuré : décommenter les imports + blocs marqués "Firebase" et supprimer
// les blocs marqués "[DEV]".
const DEV_OTP_CODE = '123456'

const ERREURS_FIREBASE = {
  'auth/invalid-phone-number': 'Numéro de téléphone invalide',
  'auth/too-many-requests': 'Trop de tentatives. Réessayez plus tard',
  'auth/invalid-verification-code': 'Code invalide',
  'auth/code-expired': 'Code expiré, redemandez-en un',
}

const messageErreurFirebase = (e) => ERREURS_FIREBASE[e.code] || "Erreur d'envoi du code"

const PAYS = [
  { code: 'TG', indicatif: '+228', nom: 'Togo',          flag: '🇹🇬' },
  { code: 'BJ', indicatif: '+229', nom: 'Bénin',         flag: '🇧🇯' },
  { code: 'CI', indicatif: '+225', nom: "Côte d'Ivoire", flag: '🇨🇮' },
  { code: 'SN', indicatif: '+221', nom: 'Sénégal',       flag: '🇸🇳' },
  { code: 'GH', indicatif: '+233', nom: 'Ghana',         flag: '🇬🇭' },
  { code: 'ML', indicatif: '+223', nom: 'Mali',          flag: '🇲🇱' },
  { code: 'BF', indicatif: '+226', nom: 'Burkina Faso',  flag: '🇧🇫' },
  { code: 'NE', indicatif: '+227', nom: 'Niger',         flag: '🇳🇪' },
  { code: 'GN', indicatif: '+224', nom: 'Guinée',        flag: '🇬🇳' },
]

export default function Connexion() {
  const [step, setStep]               = useState('phone')
  const [pays, setPays]               = useState(PAYS[0])
  const [telephone, setTelephone]     = useState('')
  const [searchPays, setSearchPays]   = useState('')
  const [code, setCode]               = useState(['', '', '', '', '', ''])
  const [nom, setNom]                 = useState('')
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState('')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef                   = useRef(null)
  const confirmationResultRef         = useRef(null)
  const recaptchaVerifierRef          = useRef(null)

  const navigate   = useNavigate()
  const location   = useLocation()
  const { user, saveSession, isAuthenticated } = useAuth()
  const from       = location.state?.from || '/'

  useEffect(() => {
    if (!isAuthenticated) return
    if (user?.profilComplete === false) setStep('profil')
    else navigate(from, { replace: true })
  }, [isAuthenticated, user, from, navigate])

  // Fermer dropdown au clic extérieur
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false)
        setSearchPays('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Formatage en temps réel avec libphonenumber-js
  const handleTelephoneChange = (e) => {
    const digits = e.target.value.replace(/\D/g, '')
    const formatted = new AsYouType(pays.code).input(digits)
    setTelephone(formatted)
  }

  const handlePaysChange = (p) => {
    setPays(p)
    setTelephone('')
    setDropdownOpen(false)
    setSearchPays('')
  }

  // Numéro propre pour le backend (sans espaces ni 0 initial)
  const telephoneDigits  = telephone.replace(/\D/g, '').replace(/^0/, '')
  const telephoneComplet = pays.indicatif + telephoneDigits

  const isPhoneValid = (() => {
    if (telephoneDigits.length < 5) return false
    try { return isValidPhoneNumber(telephoneComplet) } catch { return false }
  })()

  const paysFiltres = PAYS.filter(p =>
    p.nom.toLowerCase().includes(searchPays.toLowerCase()) ||
    p.indicatif.includes(searchPays)
  )

  const handleInitier = async () => {
    if (!telephone.trim()) { setError('Entrez votre numéro'); return }
    if (!isPhoneValid) { setError(`Numéro invalide pour ${pays.nom}`); return }
    setError(''); setLoading(true)
    try {
      // ── Firebase ──
      // if (!recaptchaVerifierRef.current) {
      //   recaptchaVerifierRef.current = new RecaptchaVerifier(firebaseAuth, 'recaptcha-container', { size: 'invisible' })
      // }
      // confirmationResultRef.current = await signInWithPhoneNumber(firebaseAuth, telephoneComplet, recaptchaVerifierRef.current)

      // ── [DEV] pas d'envoi de SMS réel, code fixe ──
      console.info(`[DEV] Code OTP pour ${telephoneComplet} : ${DEV_OTP_CODE}`)

      setStep('otp')
    } catch (e) {
      setError(messageErreurFirebase(e))
    } finally { setLoading(false) }
  }

  const handleVerifier = async (otpCode) => {
    const finalCode = otpCode || code.join('')
    if (finalCode.length !== 6) return
    setError(''); setLoading(true)
    try {
      // ── Firebase ──
      // const credential = await confirmationResultRef.current.confirm(finalCode)
      // const idToken = await credential.user.getIdToken()
      // const auth = await authVerifierFirebase(idToken)

      // ── [DEV] vérification locale du code fixe + connexion sans token Firebase ──
      if (finalCode !== DEV_OTP_CODE) {
        throw { response: { data: { message: 'Code invalide' } } }
      }
      const auth = await connexionDev(telephoneComplet)

      saveSession(auth)
      if (!auth.profilComplete) setStep('profil')
      else navigate(from, { replace: true })
    } catch (e) {
      setError(e.code ? messageErreurFirebase(e) : (e.response?.data?.message || 'Code invalide'))
    } finally { setLoading(false) }
  }

  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return
    const newCode = [...code]
    newCode[index] = value.slice(-1)
    setCode(newCode)
    if (value && index < 5) document.getElementById(`otp-${index + 1}`)?.focus()
    if (newCode.every(c => c !== '')) handleVerifier(newCode.join(''))
  }

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !code[index] && index > 0)
      document.getElementById(`otp-${index - 1}`)?.focus()
  }

  const handleCompleterProfil = async () => {
    if (!nom.trim()) { setError('Entrez votre pseudo'); return }
    setError(''); setLoading(true)
    try {
      const auth = await completerProfil(nom.trim())
      saveSession(auth)
      navigate(from, { replace: true })
    } catch (e) {
      setError(e.response?.data?.message || 'Erreur profil')
    } finally { setLoading(false) }
  }

  const stepNum    = { phone: 1, otp: 2, profil: 3 }[step]
  const totalSteps = 3

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-primary/10 backdrop-blur-md">
      <div id="recaptcha-container" />
      <div className="w-full max-w-3xl flex flex-col md:flex-row overflow-hidden rounded-3xl shadow-2xl shadow-primary/20 border border-white/40">

        {/* ── Brand Panel ── */}
        <div className="relative h-[28vh] md:h-auto md:w-[38%] bg-primary flex flex-col items-center justify-center p-6 text-white overflow-hidden shrink-0">
          <img src="https://cdn.jsdelivr.net/npm/game-icons-transparent@latest/svgs/delapouite/square.svg" className="absolute -top-10 -left-10 w-64 h-64 opacity-[0.03] rotate-12 invert" alt="" />
          <img src="https://cdn.jsdelivr.net/npm/game-icons-transparent@latest/svgs/lorc/bordered-shield.svg" className="absolute -bottom-20 -right-20 w-80 h-80 opacity-[0.03] -rotate-12 invert" alt="" />

          <div className="absolute top-5 left-5 flex items-center gap-2">
            <div className="w-8 h-8 bg-accent rounded-xl flex items-center justify-center shadow-lg shadow-accent/20">
              <ShieldCheck size={18} className="text-primary" />
            </div>
            <span className="font-heading font-extrabold text-lg tracking-tight">OpportuniHub</span>
          </div>

          <div className="z-10 text-center space-y-3 max-w-[220px]">
            <h1 className="text-3xl font-heading font-extrabold leading-tight tracking-tighter">
              Puissance <span className="text-accent italic">Collective.</span>
            </h1>
            <p className="text-white/60 text-xs font-medium leading-relaxed">
              Le premier réseau d'achat groupé d'Afrique de l'Ouest.
            </p>
          </div>
        </div>

        {/* ── Form Panel ── */}
        <div className="relative flex-1 bg-white z-20 flex flex-col p-6 md:p-10 overflow-y-auto">
          <button onClick={() => navigate('/')} className="absolute right-5 top-5 w-9 h-9 flex items-center justify-center rounded-full bg-bg-light text-primary hover:bg-gray-100 transition-colors">
            <X size={18} />
          </button>

          <div className="max-w-sm w-full mx-auto flex-1 flex flex-col justify-center py-6">

            {/* Progress dots */}
            <div className="flex justify-center gap-2 mb-8">
              {[1, 2, 3].slice(0, totalSteps).map(s => (
                <div key={s} className={`h-1.5 rounded-full transition-all duration-500 ${s === stepNum ? 'w-6 bg-accent' : 'w-2 bg-gray-100'}`} />
              ))}
            </div>

            <div className="space-y-7">
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  {step !== 'phone' && (
                    <button onClick={() => setStep('phone')} className="w-8 h-8 rounded-full bg-bg-light flex items-center justify-center text-primary active:scale-90 transition-transform">
                      <ArrowLeft size={16} />
                    </button>
                  )}
                  <h2 className="text-2xl font-heading font-extrabold text-primary tracking-tight">
                    {step === 'phone' ? 'Connexion' : step === 'otp' ? 'Vérification' : 'Bienvenue !'}
                  </h2>
                </div>
                <p className="text-gray-400 text-sm font-medium">
                  {step === 'phone'  ? 'Entrez votre numéro pour continuer' :
                   step === 'otp'    ? `Code envoyé au ${telephoneComplet}` :
                   'Complétez votre profil pour commencer'}
                </p>
              </div>

              <div className="space-y-8">

                {/* ── Étape 1 : numéro ── */}
                {step === 'phone' && (
                  <div className="space-y-5">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-primary uppercase tracking-[0.2em] ml-1">
                        Numéro de téléphone
                      </label>

                      {/* Champ téléphone */}
                      <div className={`flex items-center bg-bg-light border-2 rounded-2xl overflow-visible transition-all ${
                        isPhoneValid ? 'border-success/50 focus-within:border-success' : 'border-gray-100 focus-within:border-primary'
                      }`}>

                        {/* Sélecteur de pays */}
                        <div className="relative shrink-0 border-r-2 border-gray-100" ref={dropdownRef}>
                          <button
                            type="button"
                            onClick={() => { setDropdownOpen(v => !v); setSearchPays('') }}
                            className="flex items-center gap-1.5 px-3 py-4 hover:bg-gray-200/40 transition-colors rounded-l-2xl"
                          >
                            <span className="text-xl leading-none">{pays.flag}</span>
                            <span className="font-bold text-primary text-sm tabular-nums">{pays.indicatif}</span>
                            <ChevronDown size={12} className={`text-gray-400 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
                          </button>

                          {/* Dropdown pays */}
                          {dropdownOpen && (
                            <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl z-50 border border-gray-100 overflow-hidden">

                              {/* Recherche */}
                              <div className="p-2.5 border-b border-gray-100">
                                <div className="relative">
                                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                  <input
                                    type="text"
                                    placeholder="Rechercher un pays..."
                                    value={searchPays}
                                    onChange={e => setSearchPays(e.target.value)}
                                    className="w-full text-xs pl-8 pr-3 py-2 bg-bg-light rounded-xl border border-gray-100 focus:outline-none focus:border-primary"
                                    autoFocus
                                  />
                                </div>
                              </div>

                              {/* Liste */}
                              <div className="max-h-52 overflow-y-auto py-1">
                                {paysFiltres.length === 0 ? (
                                  <p className="text-center text-xs text-gray-400 py-6">Pays non disponible</p>
                                ) : paysFiltres.map(p => (
                                  <button
                                    key={p.code}
                                    type="button"
                                    onClick={() => handlePaysChange(p)}
                                    className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-bg-light transition-colors ${pays.code === p.code ? 'bg-primary/5' : ''}`}
                                  >
                                    <span className="text-lg leading-none">{p.flag}</span>
                                    <span className="flex-1 text-left text-sm font-semibold text-primary">{p.nom}</span>
                                    <span className="text-xs font-bold text-gray-400 tabular-nums">{p.indicatif}</span>
                                    {pays.code === p.code && <Check size={12} className="text-success shrink-0" />}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Saisie numéro */}
                        <input
                          type="tel"
                          placeholder="XX XX XX XX"
                          value={telephone}
                          onChange={handleTelephoneChange}
                          onKeyDown={e => e.key === 'Enter' && handleInitier()}
                          className="flex-1 bg-transparent px-4 py-4 text-lg font-bold text-primary placeholder:text-gray-300 focus:outline-none min-w-0"
                          autoFocus
                        />

                        {/* Indicateur de validité */}
                        {telephone.length > 0 && (
                          <div className="pr-4 shrink-0">
                            {isPhoneValid
                              ? <CheckCircle2 size={20} className="text-success" />
                              : <div className="w-5 h-5 rounded-full border-2 border-gray-200" />
                            }
                          </div>
                        )}
                      </div>

                    </div>

                    <button
                      onClick={handleInitier}
                      disabled={loading || !isPhoneValid}
                      className="w-full bg-primary text-white font-black py-5 rounded-2xl shadow-xl shadow-primary/20 flex items-center justify-center gap-3 group active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {loading
                        ? <Loader2 className="animate-spin" />
                        : <><span>Continuer</span><ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" /></>
                      }
                    </button>
                  </div>
                )}

                {/* ── Étape 2 : OTP ── */}
                {step === 'otp' && (
                  <div className="space-y-10 text-center">
                    <div className="flex justify-between gap-2">
                      {code.map((digit, i) => (
                        <input
                          key={i} id={`otp-${i}`} type="text" maxLength={1} value={digit}
                          inputMode="numeric"
                          onChange={e => handleOtpChange(i, e.target.value)}
                          onKeyDown={e => handleKeyDown(i, e)}
                          className="w-12 h-16 bg-bg-light border-2 border-gray-100 rounded-xl text-center text-2xl font-black text-primary focus:border-accent focus:bg-white focus:ring-4 focus:ring-accent/5 outline-none transition-all"
                        />
                      ))}
                    </div>
                    <button onClick={() => setStep('phone')} className="text-xs font-black text-gray-400 uppercase tracking-widest hover:text-primary transition-colors underline underline-offset-8">
                      Changer de numéro
                    </button>
                  </div>
                )}

                {/* ── Étape 3 : Profil ── */}
                {step === 'profil' && (
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-primary uppercase tracking-[0.2em] ml-1">Votre Pseudo</label>
                      <input
                        type="text"
                        placeholder="ex : KingJean225"
                        value={nom}
                        onChange={e => setNom(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleCompleterProfil()}
                        className="w-full bg-bg-light border-2 border-gray-100 rounded-2xl px-6 py-5 text-lg font-bold text-primary focus:border-primary outline-none transition-all"
                        autoFocus
                      />
                    </div>
                    <button onClick={handleCompleterProfil} disabled={loading} className="w-full bg-primary text-white font-black py-5 rounded-2xl shadow-xl shadow-primary/20 flex items-center justify-center gap-3 active:scale-[0.98] transition-all">
                      {loading ? <Loader2 className="animate-spin" /> : <><span>Commencer l'aventure</span><CheckCircle2 size={20} /></>}
                    </button>
                  </div>
                )}

                {/* Erreur */}
                {error && (
                  error.toLowerCase().includes('suspendu') ? (
                    <div className="p-4 bg-urgency/5 border border-urgency/10 rounded-2xl text-urgency text-xs font-bold text-center">
                      Compte suspendu.{' '}
                      <a href="/#contact" className="underline hover:opacity-80 transition-opacity">Contactez l'administrateur</a>
                    </div>
                  ) : (
                    <div className="p-4 bg-urgency/5 border border-urgency/10 rounded-2xl text-urgency text-xs font-bold text-center">{error}</div>
                  )
                )}
              </div>

              <div className="pt-8 text-center space-y-4">
                <p className="text-[10px] text-gray-400 font-medium leading-relaxed max-w-[280px] mx-auto uppercase tracking-wider">
                  Connexion sécurisée par OTP. Vos données sont protégées.
                </p>
                <div className="flex items-center justify-center gap-1.5 text-[9px] font-black text-success uppercase tracking-[0.2em]">
                  <Lock size={12} /> SSL ENCRYPTED
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
