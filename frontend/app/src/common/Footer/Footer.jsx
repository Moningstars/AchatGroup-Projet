import { Link, useNavigate, useLocation } from 'react-router-dom'
import { ShieldCheck, Send } from 'lucide-react'
import { FacebookIcon, InstagramIcon, XIcon, WhatsAppIcon } from './SocialIcons'

const TRUST_CHIPS = ['Paiement sécurisé', "Identité vérifiée (KYC)", 'Support réactif']

const PLATEFORME_LINKS = [
  { label: 'Opportunités', to: '/opportunites' },
  { label: 'Sondages rémunérés', to: '/sondages' },
  { label: 'Mon portefeuille', to: '/portefeuille' },
  { label: 'Historique des participations', to: '/historique' },
]

const CONFIANCE_LINKS = [
  { label: 'Sécurité des paiements', to: '#' },
  { label: "Vérification d'identité", to: '/verification' },
  { label: 'Politique de remboursement', to: '#' },
  { label: 'Résolution des litiges', to: '#' },
]

const SOCIALS = [
  { Icon: FacebookIcon, label: 'Facebook', href: '#' },
  { Icon: InstagramIcon, label: 'Instagram', href: '#' },
  { Icon: XIcon, label: 'X', href: '#' },
  { Icon: WhatsAppIcon, label: 'WhatsApp', href: '#' },
]

const Footer = () => {
  const navigate = useNavigate()
  const location = useLocation()

  const scrollTo = (id) => {
    if (location.pathname === '/') {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
    } else {
      navigate('/', { state: { scrollTo: id } })
    }
  }

  return (
    <footer className="bg-navy-dark text-[#C9D9E4]">

      {/* Marque + newsletter */}
      <div className="flex flex-wrap justify-between gap-10 px-6 py-10 md:px-10 border-b border-white/10">
        <div className="max-w-sm">
          <Link to="/" className="flex items-center gap-2.5 mb-4 group w-fit">
            <div className="w-9 h-9 bg-accent rounded-xl flex items-center justify-center text-white shrink-0 group-hover:scale-105 transition-transform">
              <i className="ti ti-building-community text-xl" />
            </div>
            <span className="font-heading font-extrabold text-lg text-white">OpportuniHub</span>
          </Link>
          <p className="text-sm text-[#9FB4C4] mb-5">
            Vos fonds sont protégés et votre identité vérifiée à chaque étape — participez en toute confiance.
          </p>
          <div className="flex flex-wrap gap-2">
            {TRUST_CHIPS.map(label => (
              <span key={label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-emerald-100 bg-success/15 border border-success/30">
                <ShieldCheck size={13} className="text-success shrink-0" />
                {label}
              </span>
            ))}
          </div>
        </div>

        <div className="max-w-xs w-full">
          <h4 className="font-heading font-extrabold text-sm text-white mb-2.5">Recevoir les prochaines opportunités</h4>
          <form onSubmit={(e) => e.preventDefault()} className="flex rounded-full border border-white/20 overflow-hidden">
            <input
              type="email"
              placeholder="Votre adresse e-mail"
              className="flex-1 bg-transparent px-4 py-2.5 text-sm text-white placeholder:text-[#7C93A5] outline-none"
            />
            <button type="submit" aria-label="S'inscrire" className="w-11 flex items-center justify-center bg-accent text-navy-dark shrink-0 hover:opacity-90 transition-opacity">
              <Send size={15} />
            </button>
          </form>
          <div className="flex gap-2 mt-4">
            {SOCIALS.map(({ Icon, label, href }) => (
              <a key={label} href={href} aria-label={label} className="w-9 h-9 rounded-full flex items-center justify-center bg-white/[0.07] text-[#C9D9E4] hover:bg-white/[0.14] transition-colors">
                <Icon />
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Colonnes de liens */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-8 px-6 py-10 md:px-10 border-b border-white/10">
        <div>
          <h4 className="font-heading font-extrabold text-xs uppercase tracking-wider text-[#7C93A5] mb-4">Plateforme</h4>
          <ul className="space-y-2.5">
            {PLATEFORME_LINKS.map(({ label, to }) => (
              <li key={label}><Link to={to} className="text-sm hover:text-white transition-colors">{label}</Link></li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="font-heading font-extrabold text-xs uppercase tracking-wider text-[#7C93A5] mb-4">Confiance</h4>
          <ul className="space-y-2.5">
            {CONFIANCE_LINKS.map(({ label, to }) => (
              <li key={label}>
                {to === '#'
                  ? <a href="#" className="text-sm hover:text-white transition-colors">{label}</a>
                  : <Link to={to} className="text-sm hover:text-white transition-colors">{label}</Link>}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="font-heading font-extrabold text-xs uppercase tracking-wider text-[#7C93A5] mb-4">Entreprise</h4>
          <ul className="space-y-2.5">
            <li><button onClick={() => scrollTo('qui-sommes-nous')} className="text-sm hover:text-white transition-colors text-left">Qui sommes-nous</button></li>
            <li><a href="#" className="text-sm hover:text-white transition-colors">Carrières</a></li>
            <li><a href="#" className="text-sm hover:text-white transition-colors">Presse</a></li>
            <li><button onClick={() => scrollTo('contact')} className="text-sm hover:text-white transition-colors text-left">Nous contacter</button></li>
          </ul>
        </div>

        <div>
          <h4 className="font-heading font-extrabold text-xs uppercase tracking-wider text-[#7C93A5] mb-4">Recharge portefeuille</h4>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {['Flooz', 'T-Money'].map(name => (
              <span key={name} className="text-[11px] font-bold px-2.5 py-1.5 rounded-md bg-white/[0.06] border border-white/[0.14]">{name}</span>
            ))}
          </div>
          <p className="text-xs text-[#6E8494]">Recharge instantanée via Paygate.</p>
        </div>
      </div>

      {/* Barre légale */}
      <div className="flex flex-wrap justify-between items-center gap-3 px-6 py-5 md:px-10">
        <span className="text-xs text-[#7C93A5]">© {new Date().getFullYear()} OpportuniHub. Tous droits réservés.</span>
        <div className="flex gap-4">
          <a href="#" className="text-xs text-[#9FB4C4] hover:text-white transition-colors">CGU</a>
          <a href="#" className="text-xs text-[#9FB4C4] hover:text-white transition-colors">Confidentialité</a>
          <a href="#" className="text-xs text-[#9FB4C4] hover:text-white transition-colors">Cookies</a>
        </div>
      </div>
    </footer>
  )
}

export default Footer
