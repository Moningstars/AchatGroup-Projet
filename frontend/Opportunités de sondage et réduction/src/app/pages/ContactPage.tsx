import { useState } from 'react';
import { Mail, Phone, MapPin, Send, MessageSquare, Clock } from 'lucide-react';

export function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSent(true);
  };

  const infos = [
    { icon: <Mail className="w-5 h-5" />, label: 'Email', val: 'contact@opportunihub.com' },
    { icon: <Phone className="w-5 h-5" />, label: 'Téléphone', val: '+229 01 XX XX XX' },
    { icon: <MapPin className="w-5 h-5" />, label: 'Adresse', val: 'Cotonou, Bénin, Afrique de l\'Ouest' },
    { icon: <Clock className="w-5 h-5" />, label: 'Horaires', val: 'Lun – Ven · 8h00 – 18h00' },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 space-y-10">

      {/* Header */}
      <div className="text-center space-y-3">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto"
          style={{ background: 'linear-gradient(135deg, oklch(0.48 0.24 275), oklch(0.42 0.22 195))' }}>
          <MessageSquare className="w-7 h-7 text-white" />
        </div>
        <h1 className="text-4xl font-bold text-foreground" style={{ fontFamily: 'Outfit, sans-serif' }}>Contactez-nous</h1>
        <p className="text-muted-foreground max-w-lg mx-auto">
          Une question, une suggestion ou un problème ? Notre équipe vous répond dans les 24 heures.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">

        {/* Form */}
        <div className="lg:col-span-3 bg-card border border-border rounded-2xl p-8">
          {sent ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4 py-12">
              <div className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{ background: 'oklch(0.92 0.06 150)', color: 'oklch(0.38 0.16 150)' }}>
                <Send className="w-7 h-7" />
              </div>
              <h2 className="text-xl font-bold text-foreground" style={{ fontFamily: 'Outfit, sans-serif' }}>Message envoyé !</h2>
              <p className="text-muted-foreground">Nous reviendrons vers vous dans les prochaines 24 heures.</p>
              <button
                onClick={() => { setSent(false); setForm({ name: '', email: '', subject: '', message: '' }); }}
                className="text-sm text-primary hover:underline"
              >
                Envoyer un autre message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <h2 className="text-xl font-bold text-foreground mb-6" style={{ fontFamily: 'Outfit, sans-serif' }}>Envoyer un message</h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Nom complet</label>
                  <input
                    type="text" required value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Kofi Mensah"
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-input-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Adresse email</label>
                  <input
                    type="email" required value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="kofi@example.com"
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-input-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Sujet</label>
                <select
                  required value={form.subject}
                  onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-input-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all text-sm"
                >
                  <option value="">Choisir un sujet</option>
                  <option>Question sur un achat groupé</option>
                  <option>Problème avec un sondage</option>
                  <option>Mon portefeuille</option>
                  <option>Signaler un problème</option>
                  <option>Autre</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Message</label>
                <textarea
                  required rows={5} value={form.message}
                  onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                  placeholder="Décrivez votre demande en détail..."
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-input-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all text-sm resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl font-semibold text-white flex items-center justify-center gap-2 transition-all hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, oklch(0.48 0.24 275), oklch(0.42 0.22 195))', fontFamily: 'Outfit, sans-serif' }}
              >
                <Send className="w-4 h-4" /> Envoyer le message
              </button>
            </form>
          )}
        </div>

        {/* Info panel */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
            <h3 className="font-bold text-foreground" style={{ fontFamily: 'Outfit, sans-serif' }}>Nos coordonnées</h3>
            {infos.map(({ icon, label, val }) => (
              <div key={label} className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: 'oklch(0.94 0.04 275)', color: 'oklch(0.40 0.20 275)' }}>
                  {icon}
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">{label}</div>
                  <div className="text-sm font-medium text-foreground">{val}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-2xl p-6 space-y-2"
            style={{ background: 'linear-gradient(135deg, oklch(0.32 0.18 275), oklch(0.44 0.22 195))' }}>
            <h3 className="font-bold text-white text-sm" style={{ fontFamily: 'Outfit, sans-serif' }}>Support prioritaire</h3>
            <p className="text-white/70 text-xs leading-relaxed">
              Pour les questions urgentes liées à un paiement ou un remboursement, contactez-nous directement par téléphone.
            </p>
            <p className="text-white font-semibold text-sm pt-1">+229 01 XX XX XX</p>
          </div>
        </div>
      </div>
    </div>
  );
}
