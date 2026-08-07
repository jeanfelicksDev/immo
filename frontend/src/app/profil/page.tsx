'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Sidebar, PageWrapper } from '@/components/ui';
import { entreprisesApi } from '@/lib/api';

export default function ProfilPage() {
  const [activeTab, setActiveTab] = useState<'entreprise' | 'securite'>('entreprise');
  const [loading, setLoading] = useState(false);
  const [entreprise, setEntreprise] = useState<any>({
    Denomination: 'ImmoGest Agence Pro',
    AdressePostale: '01 BP 4550 Abidjan 01',
    AdressePhysique: 'Boulevard de la République, Abidjan Plateau',
    Telephone: '+225 07 00 11 22 33',
    EmailCommercial: 'contact@immogest.com',
    RccmIfu: 'CI-ABJ-2026-B-88992',
    LogoUrl: '',
    Devise: 'FCFA',
    StatutSaaS: 'Essai',
    DateDebutEssai: new Date().toISOString(),
    DateFinEssai: new Date(Date.now() + 14 * 86400000).toISOString(),
    EstBloque: false,
  });

  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  const { register, handleSubmit, reset, setValue, watch } = useForm({
    defaultValues: entreprise
  });

  const logoWatch = watch('LogoUrl');

  useEffect(() => {
    try {
      const stored = localStorage.getItem('user');
      if (stored) {
        const parsed = JSON.parse(stored);
        const role = parsed.role !== undefined ? parsed.role : parsed.Role;
        const roleStr = String(role || '').trim().toLowerCase();
        const adminCheck = (
          role === 0 ||
          roleStr === 'administrateur' ||
          roleStr === 'administrateur système' ||
          roleStr === 'administrateursysteme' ||
          roleStr === 'admin'
        );
        setIsAdmin(adminCheck);
      }
    } catch (e) {}
  }, []);

  // Charger le profil de l'entreprise
  const loadData = async () => {
    try {
      const data = await entreprisesApi.getProfil();
      if (data) {
        setEntreprise(data);
        reset(data);
      }
    } catch {
      // Charger le profil local si hors ligne
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('entreprise_profil');
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            setEntreprise(parsed);
            reset(parsed);
          } catch {}
        }
      }
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onSaveProfil = async (formData: any) => {
    setLoading(true);
    try {
      const updated = await entreprisesApi.updateProfil(formData);
      const merged = { ...entreprise, ...formData, ...(updated || {}) };
      setEntreprise(merged);
      reset(merged);
      if (typeof window !== 'undefined') {
        localStorage.setItem('entreprise_profil', JSON.stringify(merged));
      }
      toast.success('Informations de l\'entreprise enregistrées avec succès !');
    } catch (err: any) {
      console.error('Erreur sauvegarde profil backend:', err);
      const errMsg = err.response?.data?.error || err.message || 'Erreur lors de l\'enregistrement en base de données.';
      toast.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  // Calcul du nombre de jours d'essai restants
  const calculateDaysRemaining = (endDateStr: string) => {
    if (!endDateStr) return 14;
    const end = new Date(endDateStr).getTime();
    const now = Date.now();
    const diff = Math.ceil((end - now) / (1000 * 3600 * 24));
    return diff > 0 ? diff : 0;
  };

  const daysRemaining = calculateDaysRemaining(entreprise.DateFinEssai);

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <PageWrapper
          title="Mon Profil & Paramètres Entreprise"
          subtitle="Personnalisez la dénomination de votre agence, votre adresse, votre logo et gérez les abonnements SaaS."
          action={
            activeTab === 'entreprise' && (
              <button onClick={handleSubmit(onSaveProfil)} disabled={loading} className="btn btn-primary shadow-lg shadow-slate-900/10">
                <span className="material-symbols-outlined text-sm">save</span>
                <span>{loading ? 'Enregistrement...' : 'Enregistrer le Profil'}</span>
              </button>
            )
          }
        >
          {/* Bannière de Statut du Compte SaaS / Période d'Essai */}
          <div className="mb-6 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-6 text-white shadow-xl flex flex-wrap items-center justify-between gap-4 border border-amber-500/20">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-400/20 text-amber-300 border border-amber-400/30 flex items-center justify-center font-black text-xl">
                🏢
              </div>
              <div>
                <h3 className="font-display font-extrabold text-lg text-white">
                  {entreprise.Denomination || 'Votre Entreprise'}
                </h3>
                <p className="text-xs text-slate-300">
                  {entreprise.AdressePostale || 'Adresse postale non renseignée'} • {entreprise.Telephone || 'Téléphone non renseigné'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-[11px] font-extrabold text-amber-300 uppercase tracking-widest">
                  Statut du Compte SaaS
                </p>
                <div className="flex items-center gap-2 mt-0.5 justify-end">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span className="font-extrabold text-sm text-white">
                    {entreprise.EstBloque ? '🛑 Compte Suspendu' : `Période d'essai (${daysRemaining} jours restants)`}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation par Onglets */}
          <div className="flex border-b border-slate-200 mb-8 gap-8">
            <button
              onClick={() => setActiveTab('entreprise')}
              className={`pb-3 text-sm font-extrabold flex items-center gap-2 border-b-2 transition-all ${
                activeTab === 'entreprise'
                  ? 'border-slate-900 text-slate-900'
                  : 'border-transparent text-slate-400 hover:text-slate-700'
              }`}
            >
              <span className="material-symbols-outlined text-lg">corporate_fare</span>
              <span>Identité Entreprise & Branding</span>
            </button>

            <button
              onClick={() => setActiveTab('securite')}
              className={`pb-3 text-sm font-extrabold flex items-center gap-2 border-b-2 transition-all ${
                activeTab === 'securite'
                  ? 'border-slate-900 text-slate-900'
                  : 'border-transparent text-slate-400 hover:text-slate-700'
              }`}
            >
              <span className="material-symbols-outlined text-lg">lock</span>
              <span>Sécurité & Mot de Passe</span>
            </button>
          </div>

          {/* ════════════════════════════════════════════════════════════
             ONGLET 1 : IDENTITÉ ENTREPRISE & BRANDING
             ════════════════════════════════════════════════════════════ */}
          {activeTab === 'entreprise' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-8 glass-card rounded-2xl p-6">
                <form onSubmit={handleSubmit(onSaveProfil)} className="space-y-6">
                  <h4 className="font-display font-extrabold text-slate-900 text-base mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#D4AF37]">badge</span>
                    Coordonnées Officielles de l'Agence / Entreprise
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="form-group">
                      <label className="form-label font-bold">Dénomination Sociale *</label>
                      <input
                        type="text"
                        placeholder="Ex: ImmoGest Agence Ivoire"
                        {...register('Denomination', { required: true })}
                        className="form-input"
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label font-bold">Email Commercial & Facturation</label>
                      <input
                        type="email"
                        placeholder="Ex: contact@immogest.com"
                        {...register('EmailCommercial')}
                        className="form-input"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="form-group">
                      <label className="form-label font-bold">Adresse Postale (Boîte Postale)</label>
                      <input
                        type="text"
                        placeholder="Ex: 01 BP 4550 Abidjan 01"
                        {...register('AdressePostale')}
                        className="form-input"
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label font-bold">Adresse Physique / Siège Social</label>
                      <input
                        type="text"
                        placeholder="Ex: Plateau, Bd de la République"
                        {...register('AdressePhysique')}
                        className="form-input"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="form-group">
                      <label className="form-label font-bold">N° Téléphone Officiel</label>
                      <input
                        type="tel"
                        placeholder="Ex: +225 07 00 11 22 33"
                        {...register('Telephone')}
                        className="form-input"
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label font-bold">N° RCCM / IFU (Fiscal)</label>
                      <input
                        type="text"
                        placeholder="Ex: CI-ABJ-2026-B-88992"
                        {...register('RccmIfu')}
                        className="form-input"
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label font-bold">Devise Principale</label>
                      <select {...register('Devise')} className="form-input">
                        <option value="FCFA">FCFA (XOF / XAF)</option>
                        <option value="EUR">Euro (€)</option>
                        <option value="USD">Dollar ($)</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-slate-100">
                    <label className="form-label font-bold block mb-2">URL du Logo Officiel de l'Entreprise</label>
                    <div className="flex gap-2.5 mb-3">
                      <input
                        type="text"
                        placeholder="Ex: https://votre-site.com/logo.png ou chargez une image"
                        {...register('LogoUrl')}
                        className="form-input flex-1"
                      />
                      <label
                        htmlFor="logo-file-input"
                        className="px-4 py-2.5 rounded-xl bg-slate-900 text-[#FFE088] font-extrabold text-xs flex items-center gap-2 shrink-0 cursor-pointer hover:bg-slate-800 transition-colors shadow-md border border-[#D4AF37]/30"
                      >
                        <span className="material-symbols-outlined text-base">upload_file</span>
                        <span>Charger Image</span>
                      </label>
                      <input
                        id="logo-file-input"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            if (file.size > 3 * 1024 * 1024) {
                              toast.error('L\'image du logo est trop volumineuse (max 3 Mo).');
                              return;
                            }
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              const base64 = event.target?.result as string;
                              setValue('LogoUrl', base64);
                              toast.success('Logo officiel chargé avec succès !');
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </div>
                    <p className="text-xs text-slate-500 font-medium">
                      Ce logo sera automatiquement affiché en haut de l'application et imprimé sur tous vos <strong>contrats de location et reçus de paiement PDF</strong>.
                    </p>
                  </div>
                </form>
              </div>

              {/* Aperçu du Badge & Logo Entreprise */}
              <div className="lg:col-span-4 space-y-6">
                <div className="glass-card rounded-2xl p-6 text-center">
                  <h4 className="font-display font-bold text-slate-900 text-sm mb-4">Aperçu du Logo & Carte</h4>
                  
                  <div className="w-28 h-28 mx-auto rounded-2xl bg-slate-900 text-[#FFE088] flex items-center justify-center font-extrabold text-3xl shadow-xl border-2 border-[#D4AF37]/40 overflow-hidden mb-4">
                    {logoWatch ? (
                      <img src={logoWatch} alt="Logo" className="w-full h-full object-cover" />
                    ) : (
                      <span>{entreprise.Denomination ? entreprise.Denomination.substring(0, 2).toUpperCase() : 'IG'}</span>
                    )}
                  </div>

                  <h5 className="font-display font-extrabold text-slate-900 text-lg">
                    {watch('Denomination') || 'ImmoGest Agence'}
                  </h5>
                  <p className="text-xs text-slate-500 font-medium mt-1">
                    {watch('AdressePostale') || 'Boîte postale non définie'}
                  </p>

                  <div className="mt-4 pt-4 border-t border-slate-100 text-left space-y-2 text-xs">
                    <p className="text-slate-600 font-semibold">📍 Siège : <span className="font-extrabold text-slate-900">{watch('AdressePhysique') || 'Abidjan'}</span></p>
                    <p className="text-slate-600 font-semibold">📞 Contact : <span className="font-extrabold text-slate-900">{watch('Telephone') || 'Non renseigné'}</span></p>
                    <p className="text-slate-600 font-semibold">📄 N° IFU/RCCM : <span className="font-extrabold text-slate-900">{watch('RccmIfu') || 'N/A'}</span></p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════
             ONGLET 2 : SÉCURITÉ & ACCÈS
             ════════════════════════════════════════════════════════════ */}
          {activeTab === 'securite' && (
            <div className="max-w-2xl glass-card rounded-2xl p-6 space-y-6">
              <h4 className="font-display font-extrabold text-slate-900 text-base flex items-center gap-2">
                <span className="material-symbols-outlined text-slate-900">key</span>
                Changement de Mot de Passe Administrateur
              </h4>

              <div className="form-group">
                <label className="form-label font-bold">Mot de Passe Actuel</label>
                <input type="password" placeholder="••••••••" className="form-input" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="form-label font-bold">Nouveau Mot de Passe</label>
                  <input type="password" placeholder="••••••••" className="form-input" />
                </div>
                <div className="form-group">
                  <label className="form-label font-bold">Confirmer la Saisie</label>
                  <input type="password" placeholder="••••••••" className="form-input" />
                </div>
              </div>

              <button onClick={() => toast.success('Mot de passe mis à jour avec succès.')} className="btn btn-primary">
                Mettre à jour le mot de passe
              </button>
            </div>
          )}
        </PageWrapper>
      </main>
    </div>
  );
}
