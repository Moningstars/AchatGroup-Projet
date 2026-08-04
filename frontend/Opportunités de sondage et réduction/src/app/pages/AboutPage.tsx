import { Users, ShoppingCart, BarChart3, Shield, Zap, Award } from 'lucide-react';

export function AboutPage() {
  const team = [
    { name: 'Kofi Mensah', role: 'CEO & Co-fondateur', img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=300&fit=crop&auto=format' },
    { name: 'Ama Adjei', role: 'Directrice Produit', img: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300&h=300&fit=crop&auto=format' },
    { name: 'Kwame Boateng', role: 'CTO', img: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&h=300&fit=crop&auto=format' },
  ];

  const values = [
    { icon: <Users className="w-6 h-6" />, title: 'Communauté', desc: 'Nous croyons en la puissance du collectif. Ensemble, nous obtenons de meilleures conditions pour tous.' },
    { icon: <Shield className="w-6 h-6" />, title: 'Confiance', desc: 'Remboursement automatique si l\'objectif n\'est pas atteint. Votre argent est toujours protégé.' },
    { icon: <Award className="w-6 h-6" />, title: 'Récompense', desc: 'Chaque participation vous rapporte des points convertibles en argent réel.' },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 space-y-16">

      {/* Hero */}
      <section className="text-center space-y-5">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto shadow-lg"
          style={{ background: 'linear-gradient(135deg, oklch(0.48 0.24 275), oklch(0.42 0.22 195))' }}>
          <Zap className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-4xl font-bold text-foreground" style={{ fontFamily: 'Outfit, sans-serif' }}>
          Qui sommes-nous ?
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          OpportuniHub est la première plateforme d'opportunités groupées en Afrique de l'Ouest.
          Nous combinons les achats collectifs à prix dégressifs et les sondages rémunérés pour
          créer une expérience unique où tout le monde gagne.
        </p>
      </section>

      {/* Mission */}
      <section className="rounded-2xl overflow-hidden"
        style={{ background: 'linear-gradient(135deg, oklch(0.32 0.18 275), oklch(0.44 0.22 195))' }}>
        <div className="p-10 text-white text-center space-y-4">
          <h2 className="text-3xl font-bold" style={{ fontFamily: 'Outfit, sans-serif' }}>Notre mission</h2>
          <p className="text-white/80 text-lg max-w-2xl mx-auto leading-relaxed">
            Rendre les produits et services de qualité accessibles à tous grâce à la force du nombre,
            tout en valorisant l'opinion des consommateurs africains.
          </p>
          <div className="flex flex-wrap justify-center gap-6 pt-4">
            {[['12 400+', 'Membres'], ['3 200', 'Achats réalisés'], ['8,5M FCFA', 'Économisés']].map(([val, lbl]) => (
              <div key={lbl} className="text-center">
                <div className="text-3xl font-bold" style={{ fontFamily: 'Outfit, sans-serif' }}>{val}</div>
                <div className="text-white/60 text-sm">{lbl}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="space-y-8">
        <h2 className="text-2xl font-bold text-foreground text-center" style={{ fontFamily: 'Outfit, sans-serif' }}>Comment ça marche ?</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { icon: <ShoppingCart className="w-7 h-7" />, step: '01', title: 'Choisissez une offre', desc: 'Parcourez nos achats groupés et sondages. Rejoignez les offres qui vous intéressent.' },
            { icon: <Users className="w-7 h-7" />, step: '02', title: 'Le groupe grandit', desc: 'Plus il y a de participants, plus le prix baisse. Les paliers de prix sont transparents et affichés.' },
            { icon: <Award className="w-7 h-7" />, step: '03', title: 'Vous économisez', desc: 'L\'objectif atteint, vous êtes livré au meilleur prix. Sinon, vous êtes intégralement remboursé.' },
          ].map(({ icon, step, title, desc }) => (
            <div key={step} className="bg-card border border-border rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ background: 'oklch(0.94 0.04 275)', color: 'oklch(0.40 0.20 275)' }}>
                  {icon}
                </div>
                <span className="text-4xl font-bold text-border" style={{ fontFamily: 'JetBrains Mono, monospace' }}>{step}</span>
              </div>
              <h3 className="font-bold text-foreground" style={{ fontFamily: 'Outfit, sans-serif' }}>{title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Values */}
      <section className="space-y-8">
        <h2 className="text-2xl font-bold text-foreground text-center" style={{ fontFamily: 'Outfit, sans-serif' }}>Nos valeurs</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {values.map(({ icon, title, desc }) => (
            <div key={title} className="text-center space-y-3 p-6 rounded-2xl border border-border bg-card">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto"
                style={{ background: 'linear-gradient(135deg, oklch(0.94 0.04 275), oklch(0.94 0.04 195))', color: 'oklch(0.40 0.20 275)' }}>
                {icon}
              </div>
              <h3 className="font-bold text-foreground" style={{ fontFamily: 'Outfit, sans-serif' }}>{title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Team */}
      <section className="space-y-8">
        <h2 className="text-2xl font-bold text-foreground text-center" style={{ fontFamily: 'Outfit, sans-serif' }}>L'équipe fondatrice</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {team.map(({ name, role, img }) => (
            <div key={name} className="text-center space-y-3 p-6 rounded-2xl border border-border bg-card">
              <img src={img} alt={name} className="w-20 h-20 rounded-full object-cover mx-auto border-2 border-primary/20" />
              <div>
                <div className="font-bold text-foreground" style={{ fontFamily: 'Outfit, sans-serif' }}>{name}</div>
                <div className="text-sm text-muted-foreground">{role}</div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
