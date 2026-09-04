import React from 'react';
import { Link } from 'react-router-dom';
import { Clock, Users } from 'lucide-react';

const SurveyCard = ({ survey, variant = 'grid' }) => {
  if (!survey) return null;
  const { id, titre, recompense, tempsEstime, participantsActuels, image } = survey;

  if (variant === 'carousel') {
    return (
      <div className="min-w-[300px] bg-primary p-6 rounded-3xl relative overflow-hidden text-white border-2 border-primary shadow-xl shadow-primary/20 group">
        <div className="relative z-10">
          <div className="bg-success text-white px-2.5 py-1 rounded-lg text-[10px] font-extrabold inline-block mb-4 uppercase tracking-widest shadow-lg shadow-success/20">New Arrival</div>
          <h3 className="font-heading font-extrabold text-xl mb-2 leading-tight">{titre}</h3>
          <p className="text-white/60 text-xs mb-6 font-medium leading-relaxed line-clamp-2">Participate and help us grow while getting paid directly to your wallet.</p>
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[10px] text-white/50 font-bold uppercase tracking-widest">Reward</span>
              <span className="text-2xl font-extrabold text-accent">{(recompense || 0).toLocaleString('fr-FR')} <span className="text-xs">FCFA</span></span>
            </div>
            <Link to={`/sondages/${id}`} className="bg-white text-primary px-6 py-3 rounded-2xl text-xs font-extrabold shadow-lg active:scale-95 transition-transform">Take Now</Link>
          </div>
        </div>
        <div className="absolute -right-8 -bottom-8 opacity-10">
          <i className="ti ti-device-mobile text-[140px]" />
        </div>
      </div>
    );
  }

  return (
    <article className="bg-white rounded-3xl overflow-hidden relative border-2 border-gray-100 flex flex-col group hover:border-primary transition-all break-inside-avoid mb-4">
      <div className="relative overflow-hidden">
        <div className="reward-badge absolute top-2 right-2 z-10">Gagnez {(recompense || 0).toLocaleString('fr-FR')} FCFA</div>
        <img 
          src={image || 'https://images.unsplash.com/photo-1734255026082-82fdc81991f0?auto=format&w=400&q=80&fit=crop'} 
          alt={titre} 
          className="w-full object-cover aspect-[3/4] group-hover:scale-105 transition-transform duration-500" 
        />
      </div>
      <div className="p-4 bg-white grow flex flex-col justify-between">
        <h3 className="font-heading text-sm font-bold leading-tight mb-2 text-slate-800 line-clamp-2">{titre}</h3>
        <div className="flex items-center gap-3 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
          <span className="flex items-center gap-1"><Clock size={10} /> {tempsEstime || '5'}m</span>
          <span className="flex items-center gap-1"><Users size={10} /> {participantsActuels || 0}</span>
        </div>
      </div>
      <Link to={`/sondages/${id}`} className="absolute inset-0 z-20" />
    </article>
  );
};

export default SurveyCard;
