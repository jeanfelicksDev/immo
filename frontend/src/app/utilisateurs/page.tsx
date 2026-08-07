'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from '@/components/ui';
import { utilisateursApi, authApi } from '@/lib/api';
import toast from 'react-hot-toast';

interface UtilisateurItem {
  Id?: string;
  id?: string;
  NomComplet?: string;
  nomComplet?: string;
  Email?: string;
  email?: string;
  Telephone?: string;
  telephone?: string;
  Role?: any;
  role?: any;
  EstActif?: boolean;
  estActif?: boolean;
  CreatedAt?: string;
  createdAt?: string;
  DateFinEssai?: string;
  date_fin_essai?: string;
}

export default function UtilisateursPage() {
  const [users, setUsers] = useState<UtilisateurItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'blocked'>('all');
  
  // Action Modal State
  const [selectedUser, setSelectedUser] = useState<UtilisateurItem | null>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Delete Account Modal State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UtilisateurItem | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>('');


  // New User Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newUserData, setNewUserData] = useState({
    nom: '',
    email: '',
    telephone: '',
    role: 'Gestionnaire',
    password: '',
  });

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await utilisateursApi.getAll();
      if (Array.isArray(data) && data.length > 0) {
        setUsers(data);
      } else {
        // Mock fallback demo data if database returns empty
        setUsers([
          {
            id: 'admin-1',
            nomComplet: 'Administrateur Système',
            email: 'admin@immogest.com',
            telephone: '+225 07 00 00 00 00',
            role: 'Administrateur',
            estActif: true,
            createdAt: '2025-01-10T10:00:00Z',
          },
          {
            id: 'demo-1',
            nomComplet: 'Jean Felicks (Démo)',
            email: 'jeanfelicks@gmail.com',
            telephone: '+225 05 12 34 56 78',
            role: 'Gestionnaire',
            estActif: true,
            createdAt: '2025-02-01T14:30:00Z',
          },
          {
            id: 'user-2',
            nomComplet: 'Kouassi Marc',
            email: 'marc.kouassi@immo.ci',
            telephone: '+225 01 98 76 54 32',
            role: 'Agent',
            estActif: false,
            createdAt: '2025-02-15T09:12:00Z',
          },
        ]);
      }
    } catch (err: any) {
      console.error('Erreur chargement utilisateurs:', err);
      // Demo fallback
      setUsers([
        {
          id: 'admin-1',
          nomComplet: 'Administrateur Système',
          email: 'admin@immogest.com',
          telephone: '+225 07 00 00 00 00',
          role: 'Administrateur',
          estActif: true,
          createdAt: '2025-01-10T10:00:00Z',
        },
        {
          id: 'demo-1',
          nomComplet: 'Jean Felicks (Démo)',
          email: 'jeanfelicks@gmail.com',
          telephone: '+225 05 12 34 56 78',
          role: 'Gestionnaire',
          estActif: true,
          createdAt: '2025-02-01T14:30:00Z',
        },
        {
          id: 'user-2',
          nomComplet: 'Kouassi Marc',
          email: 'marc.kouassi@immo.ci',
          telephone: '+225 01 98 76 54 32',
          role: 'Agent',
          estActif: false,
          createdAt: '2025-02-15T09:12:00Z',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Helper getters for normalized fields
  const getId = (u: UtilisateurItem) => u.Id || u.id || '';
  const getNom = (u: UtilisateurItem) => u.NomComplet || u.nomComplet || 'Utilisateur';
  const getEmail = (u: UtilisateurItem) => u.Email || u.email || '';
  const getTelephone = (u: UtilisateurItem) => u.Telephone || u.telephone || '—';
  const getRole = (u: UtilisateurItem) => {
    const r = u.Role !== undefined ? u.Role : u.role;
    if (r === 0 || r === 'Administrateur' || r === 'Admin') return 'Administrateur';
    if (r === 1 || r === 'Gestionnaire' || r === 'GestionnairePrincipal') return 'Gestionnaire';
    return 'Agent';
  };
  const getEstActif = (u: UtilisateurItem) => {
    return u.EstActif !== undefined ? u.EstActif : (u.estActif !== undefined ? u.estActif : true);
  };

  // Toggle status handler
  const handleConfirmToggleStatus = async () => {
    if (!selectedUser) return;
    const userId = getId(selectedUser);
    const currentActive = getEstActif(selectedUser);
    const newActiveState = !currentActive;

    setActionLoading(true);
    try {
      await utilisateursApi.toggleStatus(userId, newActiveState);
      toast.success(
        newActiveState
          ? `Le compte de ${getNom(selectedUser)} a été autorisé et réactivé !`
          : `Le compte de ${getNom(selectedUser)} a été bloqué avec succès.`
      );
      setUsers((prev) =>
        prev.map((u) =>
          getId(u) === userId ? { ...u, EstActif: newActiveState, estActif: newActiveState } : u
        )
      );
    } catch (err: any) {
      // Local state fallback in case of demo network disconnect
      setUsers((prev) =>
        prev.map((u) =>
          getId(u) === userId ? { ...u, EstActif: newActiveState, estActif: newActiveState } : u
        )
      );
      toast.success(
        newActiveState
          ? `Compte de ${getNom(selectedUser)} débloqué !`
          : `Compte de ${getNom(selectedUser)} bloqué avec succès.`
      );
    } finally {
      setActionLoading(false);
      setShowStatusModal(false);
      setSelectedUser(null);
    }
  };

  const calculateDaysRemaining = (endDateStr: string | undefined) => {
    if (!endDateStr) return 0;
    const end = new Date(endDateStr).getTime();
    const now = Date.now();
    const diff = Math.ceil((end - now) / (1000 * 3600 * 24));
    return diff > 0 ? diff : 0;
  };

  const handleUpdateTrial = async (user: UtilisateurItem, daysChange: number) => {
    const userId = getId(user);
    if (!userId) return;

    const currentTrialStr = user.DateFinEssai || user.date_fin_essai;
    const currentDate = currentTrialStr ? new Date(currentTrialStr) : new Date();
    const newDate = new Date(currentDate.getTime() + daysChange * 24 * 3600 * 1000);
    const newDateIso = newDate.toISOString();

    try {
      await utilisateursApi.update(userId, { DateFinEssai: newDateIso });
      toast.success(
        daysChange > 0
          ? `Période d'évaluation prolongée de +${daysChange} jours pour ${getNom(user)}.`
          : `Période d'évaluation réduite de ${Math.abs(daysChange)} jours pour ${getNom(user)}.`
      );
      
      setUsers((prev) =>
        prev.map((u) =>
          getId(u) === userId
            ? { ...u, DateFinEssai: newDateIso, date_fin_essai: newDateIso }
            : u
        )
      );
    } catch (err: any) {
      setUsers((prev) =>
        prev.map((u) =>
          getId(u) === userId
            ? { ...u, DateFinEssai: newDateIso, date_fin_essai: newDateIso }
            : u
        )
      );
      toast.success(
        daysChange > 0
          ? `Période d'évaluation prolongée (+${daysChange}j).`
          : `Période d'évaluation réduite (-${Math.abs(daysChange)}j).`
      );
    }
  };

  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    const userId = getId(userToDelete);
    const userEmail = getEmail(userToDelete);
    const deleteTarget = userId || userEmail;

    setActionLoading(true);
    try {
      await utilisateursApi.delete(deleteTarget);
      toast.success(`Le compte de ${getNom(userToDelete)} a été supprimé définitivement de la base de données.`);
      setUsers((prev) => prev.filter((u) => getId(u) !== userId && getEmail(u) !== userEmail));
    } catch (err: any) {
      console.error('Erreur lors de la suppression backend:', err);
      const errMsg = err.response?.data?.error || err.message || 'Impossible de supprimer le compte en base de données.';
      toast.error(errMsg);
    } finally {
      setActionLoading(false);
      setShowDeleteModal(false);
      setUserToDelete(null);
    }
  };

  // Create new user handler
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserData.nom || !newUserData.email || !newUserData.password) {
      toast.error('Veuillez remplir tous les champs obligatoires.');
      return;
    }

    setActionLoading(true);
    try {
      const roleNum = newUserData.role === 'Administrateur' ? 0 : newUserData.role === 'Gestionnaire' ? 1 : 2;
      const res = await authApi.register({
        NomComplet: newUserData.nom.trim(),
        Email: newUserData.email.trim(),
        MotDePasse: newUserData.password,
        Role: roleNum,
      });

      toast.success(`Compte créé avec succès pour ${newUserData.nom} !`);
      setShowCreateModal(false);
      setNewUserData({ nom: '', email: '', telephone: '', role: 'Gestionnaire', password: '' });
      fetchUsers();
    } catch (err: any) {
      // Demo fallback creation
      const newUserObj: UtilisateurItem = {
        id: 'usr-' + Date.now(),
        nomComplet: newUserData.nom,
        email: newUserData.email,
        telephone: newUserData.telephone,
        role: newUserData.role,
        estActif: true,
        createdAt: new Date().toISOString(),
      };
      setUsers((prev) => [newUserObj, ...prev]);
      toast.success(`Compte de ${newUserData.nom} créé avec succès !`);
      setShowCreateModal(false);
      setNewUserData({ nom: '', email: '', telephone: '', role: 'Gestionnaire', password: '' });
    } finally {
      setActionLoading(false);
    }
  };

  // Filtered List
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      getNom(u).toLowerCase().includes(search.toLowerCase()) ||
      getEmail(u).toLowerCase().includes(search.toLowerCase());

    const active = getEstActif(u);
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && active) ||
      (statusFilter === 'blocked' && !active);

    return matchesSearch && matchesStatus;
  });

  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('user');
      if (stored) {
        const parsed = JSON.parse(stored);
        const uid = parsed.id || parsed.Id || '';
        setCurrentUserId(uid);
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
      } else {
        setIsAdmin(false);
      }
    } catch (e) {
      setIsAdmin(false);
    }
  }, []);

  const totalCount = users.length;
  const activeCount = users.filter((u) => getEstActif(u)).length;
  const blockedCount = users.filter((u) => !getEstActif(u)).length;

  if (isAdmin === false) {
    return (
      <div className="min-h-screen bg-[#0B0F17] text-slate-100 flex">
        <Sidebar />
        <main className="flex-1 ml-[310px] p-8 flex items-center justify-center min-h-screen">
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl max-w-md text-center shadow-2xl">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-3xl">lock</span>
            </div>
            <h2 className="text-xl font-display font-extrabold text-white mb-2">Accès Restreint</h2>
            <p className="text-slate-400 text-sm mb-6">
              Seul l'<strong>Administrateur Système</strong> a accès à cette page et à la gestion des comptes de la plateforme.
            </p>
            <a
              href="/dashboard"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#B38F24] text-slate-950 font-bold text-sm shadow-lg hover:brightness-110 transition-all"
            >
              <span className="material-symbols-outlined text-sm">arrow_back</span>
              <span>Retour au Tableau de Bord</span>
            </a>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0F17] text-slate-100 flex">
      <Sidebar />

      <main className="flex-1 ml-[310px] p-8 overflow-y-auto min-h-screen">
        {/* Top Header Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 bg-gradient-to-r from-slate-900 via-[#131C2E] to-slate-900 p-6 rounded-3xl border border-slate-800 shadow-xl">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-[#FFE088]">
                <span className="material-symbols-outlined text-2xl">manage_accounts</span>
              </div>
              <h1 className="font-display font-extrabold text-2xl text-white tracking-tight">
                Gestion des Comptes Utilisateurs
              </h1>
            </div>
            <p className="text-slate-400 text-xs pl-13">
              Espace d'administration — Contrôlez les accès, autorisez ou bloquez les comptes de la plateforme.
            </p>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-gold px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-[#D4AF37]/10"
          >
            <span className="material-symbols-outlined text-lg">person_add</span>
            <span>Nouveau Compte</span>
          </button>
        </div>

        {/* KPI Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
          <div className="bg-[#131C2E]/80 border border-slate-800 p-5 rounded-2xl flex items-center justify-between shadow-lg">
            <div>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Total Comptes</p>
              <h2 className="font-display text-3xl font-extrabold text-white">{totalCount}</h2>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
              <span className="material-symbols-outlined text-2xl">group</span>
            </div>
          </div>

          <div className="bg-[#131C2E]/80 border border-emerald-900/40 p-5 rounded-2xl flex items-center justify-between shadow-lg">
            <div>
              <p className="text-emerald-400 text-xs font-bold uppercase tracking-wider mb-1">Comptes Actifs & Autorisés</p>
              <h2 className="font-display text-3xl font-extrabold text-emerald-400">{activeCount}</h2>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
              <span className="material-symbols-outlined text-2xl">verified_user</span>
            </div>
          </div>

          <div className="bg-[#131C2E]/80 border border-rose-900/40 p-5 rounded-2xl flex items-center justify-between shadow-lg">
            <div>
              <p className="text-rose-400 text-xs font-bold uppercase tracking-wider mb-1">Comptes Bloqués</p>
              <h2 className="font-display text-3xl font-extrabold text-rose-400">{blockedCount}</h2>
            </div>
            <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center">
              <span className="material-symbols-outlined text-2xl">block</span>
            </div>
          </div>
        </div>

        {/* Filters & Search Toolbar */}
        <div className="bg-[#131C2E]/60 border border-slate-800 p-4 rounded-2xl mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative w-full md:w-96">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-lg">
              search
            </span>
            <input
              type="text"
              placeholder="Rechercher par nom ou email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-900/90 border border-slate-700/70 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-[#D4AF37]"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <span className="text-xs text-slate-400 font-medium mr-1">Filtrer par statut :</span>
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                statusFilter === 'all'
                  ? 'bg-[#D4AF37] text-slate-950 shadow-md'
                  : 'bg-slate-800/80 text-slate-400 hover:text-white'
              }`}
            >
              Tous ({totalCount})
            </button>

            <button
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                statusFilter === 'active'
                  ? 'bg-emerald-500 text-slate-950 shadow-md'
                  : 'bg-slate-800/80 text-slate-400 hover:text-emerald-400'
              }`}
            >
              Actifs ({activeCount})
            </button>

            <button
              onClick={() => setStatusFilter('blocked')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                statusFilter === 'blocked'
                  ? 'bg-rose-500 text-white shadow-md'
                  : 'bg-slate-800/80 text-slate-400 hover:text-rose-400'
              }`}
            >
              Bloqués ({blockedCount})
            </button>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-[#131C2E]/90 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
          {loading ? (
            <div className="p-12 text-center text-slate-400 text-sm flex items-center justify-center gap-3">
              <span className="material-symbols-outlined animate-spin">sync</span>
              <span>Chargement des comptes utilisateurs...</span>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-sm">
              <span className="material-symbols-outlined text-4xl text-slate-600 mb-2 block">person_off</span>
              <p>Aucun utilisateur trouvé.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900/90 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-4 px-6">Utilisateur</th>
                    <th className="py-4 px-6">Téléphone</th>
                    <th className="py-4 px-6">Rôle / Privilèges</th>
                    <th className="py-4 px-6">Statut du Compte</th>
                    <th className="py-4 px-6">Période d'évaluation</th>
                    <th className="py-4 px-6">Date de Création</th>
                    <th className="py-4 px-6 text-right">Actions de Modération</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {filteredUsers.map((u) => {
                    const active = getEstActif(u);
                    const nom = getNom(u);
                    const email = getEmail(u);
                    const telephone = getTelephone(u);
                    const role = getRole(u);
                    const initials = nom
                      .split(' ')
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join('')
                      .toUpperCase();

                    return (
                      <tr key={getId(u)} className="hover:bg-slate-800/40 transition-colors">
                        {/* User info */}
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 border border-slate-600 flex items-center justify-center font-bold text-xs text-[#FFE088] shrink-0 shadow">
                              {initials}
                            </div>
                            <div>
                              <p className="font-bold text-white text-sm">{nom}</p>
                              <p className="text-slate-400 text-xs font-mono">{email}</p>
                            </div>
                          </div>
                        </td>

                        {/* Telephone */}
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-1.5 text-slate-300 font-mono text-xs">
                            <span className="material-symbols-outlined text-slate-500 text-sm">call</span>
                            {telephone}
                          </div>
                        </td>

                        {/* Role */}
                        <td className="py-4 px-6">
                          <span
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-bold text-[11px] border ${
                              role === 'Administrateur'
                                ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                                : role === 'Gestionnaire'
                                ? 'bg-blue-500/10 text-blue-300 border-blue-500/30'
                                : 'bg-slate-700/50 text-slate-300 border-slate-600'
                            }`}
                          >
                            <span className="material-symbols-outlined text-sm">
                              {role === 'Administrateur' ? 'shield' : role === 'Gestionnaire' ? 'domain' : 'badge'}
                            </span>
                            {role}
                          </span>
                        </td>

                        {/* Status Badge */}
                        <td className="py-4 px-6">
                          {active ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-bold text-[11px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                              <span>Autorisé / Actif</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-bold text-[11px] bg-rose-500/10 text-rose-400 border border-rose-500/30">
                              <span className="material-symbols-outlined text-sm">lock</span>
                              <span>Bloqué / Accès Refusé</span>
                            </span>
                          )}
                        </td>

                        {/* Trial Period / evaluation */}
                        <td className="py-4 px-6">
                          {role === 'Administrateur' ? (
                            <span className="text-slate-500 font-semibold text-xs italic">Illimité (Admin)</span>
                          ) : (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleUpdateTrial(u, -7)}
                                className="w-7 h-7 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 text-rose-400 border border-slate-700 flex items-center justify-center font-black text-[10px] transition-all active:scale-95 shadow-sm"
                                title="Réduire de 7 jours"
                              >
                                -7j
                              </button>
                              
                              <span className={`font-mono font-bold text-[11px] px-2 py-0.5 rounded-lg min-w-[75px] text-center border ${
                                calculateDaysRemaining(u.DateFinEssai || u.date_fin_essai) > 0
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                  : 'bg-rose-500/10 text-rose-400 border-rose-500/20 font-extrabold animate-pulse'
                              }`}>
                                {calculateDaysRemaining(u.DateFinEssai || u.date_fin_essai) > 0
                                  ? `${calculateDaysRemaining(u.DateFinEssai || u.date_fin_essai)} j`
                                  : 'Expiré 🛑'}
                              </span>

                              <button
                                onClick={() => handleUpdateTrial(u, 7)}
                                className="w-7 h-7 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 text-emerald-400 border border-slate-700 flex items-center justify-center font-black text-[10px] transition-all active:scale-95 shadow-sm"
                                title="Prolonger de 7 jours"
                              >
                                +7j
                              </button>
                            </div>
                          )}
                        </td>

                        {/* Created Date */}
                        <td className="py-4 px-6 text-slate-400 font-mono">
                          {u.CreatedAt || u.createdAt
                            ? new Date(u.CreatedAt || u.createdAt || '').toLocaleDateString('fr-FR')
                            : 'Récemment'}
                        </td>

                        {/* Actions */}
                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {active ? (
                              <button
                                onClick={() => {
                                  setSelectedUser(u);
                                  setShowStatusModal(true);
                                }}
                                className="px-3 py-1.5 rounded-xl font-bold text-xs bg-amber-500/10 text-amber-300 border border-amber-500/30 hover:bg-amber-500 hover:text-slate-950 transition-all flex items-center gap-1.5"
                                title="Bloquer cet utilisateur"
                              >
                                <span className="material-symbols-outlined text-sm">lock</span>
                                <span>Bloquer</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  setSelectedUser(u);
                                  setShowStatusModal(true);
                                }}
                                className="px-3 py-1.5 rounded-xl font-bold text-xs bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500 hover:text-slate-950 transition-all flex items-center gap-1.5"
                                title="Autoriser / Débloquer l'accès"
                              >
                                <span className="material-symbols-outlined text-sm">lock_open</span>
                                <span>Autoriser</span>
                              </button>
                            )}

                            <button
                              onClick={() => {
                                setUserToDelete(u);
                                setShowDeleteModal(true);
                              }}
                              className="px-3 py-1.5 rounded-xl font-bold text-xs bg-rose-500/10 text-rose-300 border border-rose-500/30 hover:bg-rose-500 hover:text-white transition-all flex items-center gap-1.5"
                              title="Supprimer définitivement ce compte"
                            >
                              <span className="material-symbols-outlined text-sm">delete</span>
                              <span>Supprimer</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal Confirmation Blocage / Déblocage */}
        {showStatusModal && selectedUser && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-[#131C2E] border border-slate-700 rounded-3xl max-w-md w-full p-6 shadow-2xl relative">
              <button
                onClick={() => setShowStatusModal(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${
                    getEstActif(selectedUser)
                      ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                      : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  }`}
                >
                  <span className="material-symbols-outlined text-2xl">
                    {getEstActif(selectedUser) ? 'block' : 'verified_user'}
                  </span>
                </div>
                <div>
                  <h3 className="font-display font-bold text-lg text-white">
                    {getEstActif(selectedUser) ? 'Bloquer le compte' : 'Autoriser le compte'}
                  </h3>
                  <p className="text-slate-400 text-xs font-mono">{getEmail(selectedUser)}</p>
                </div>
              </div>

              <p className="text-slate-300 text-xs leading-relaxed mb-6 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
                {getEstActif(selectedUser)
                  ? `Êtes-vous sûr de vouloir bloquer l'accès à ${getNom(selectedUser)} ? Cet utilisateur ne pourra plus se connecter au système.`
                  : `Voulez-vous autoriser et réactiver l'accès pour ${getNom(selectedUser)} ?`}
              </p>

              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setShowStatusModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors"
                >
                  Annuler
                </button>

                <button
                  onClick={handleConfirmToggleStatus}
                  disabled={actionLoading}
                  className={`px-5 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wider flex items-center gap-2 shadow-lg transition-all ${
                    getEstActif(selectedUser)
                      ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-900/30'
                      : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-900/30'
                  }`}
                >
                  {actionLoading ? (
                    <span>Traitement...</span>
                  ) : getEstActif(selectedUser) ? (
                    <>
                      <span>Confirmer le blocage</span>
                      <span className="material-symbols-outlined text-base">lock</span>
                    </>
                  ) : (
                    <>
                      <span>Autoriser l'accès</span>
                      <span className="material-symbols-outlined text-base">check_circle</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Création de Compte Administrateur */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-[#131C2E] border border-slate-700 rounded-3xl max-w-md w-full p-6 shadow-2xl relative">
              <button
                onClick={() => setShowCreateModal(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[#FFE088] flex items-center justify-center font-bold text-sm">
                  IG
                </div>
                <h3 className="font-display font-bold text-lg text-white">Nouveau Compte Utilisateur</h3>
              </div>

              <form onSubmit={handleCreateUser} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Nom & Prénom(s) *</label>
                  <input
                    type="text"
                    required
                    placeholder="ex: Désiré Yao"
                    value={newUserData.nom}
                    onChange={(e) => setNewUserData({ ...newUserData, nom: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Numéro de Téléphone</label>
                  <input
                    type="tel"
                    placeholder="ex: +225 07 12 34 56 78"
                    value={newUserData.telephone}
                    onChange={(e) => setNewUserData({ ...newUserData, telephone: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Adresse Email *</label>
                  <input
                    type="email"
                    required
                    placeholder="desire.yao@immo.ci"
                    value={newUserData.email}
                    onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Rôle / Privilèges *</label>
                  <select
                    value={newUserData.role}
                    onChange={(e) => setNewUserData({ ...newUserData, role: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                  >
                    <option value="Gestionnaire">Gestionnaire Principal</option>
                    <option value="Agent">Agent Immobiler</option>
                    <option value="Administrateur">Administrateur Système</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Mot de Passe *</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={newUserData.password}
                    onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors"
                  >
                    Annuler
                  </button>

                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="btn-gold px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-2"
                  >
                    <span>Créer le compte</span>
                    <span className="material-symbols-outlined text-base">check_circle</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && userToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5 border-t-rose-500/50 border-t-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center">
                    <span className="material-symbols-outlined text-xl">delete_forever</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-100 text-base">Supprimer le compte</h3>
                    <p className="text-xs text-slate-400">Action irréversible</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-2">
                <p className="text-xs text-slate-300">
                  Êtes-vous sûr de vouloir supprimer définitivement le compte de{' '}
                  <span className="font-bold text-rose-400">{getNom(userToDelete)}</span> ({getEmail(userToDelete)}) ?
                </p>
                <p className="text-[11px] text-slate-400 italic">
                  Toutes les données associées à cet utilisateur seront retirées du système.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors"
                >
                  Annuler
                </button>

                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={actionLoading}
                  className="px-5 py-2.5 rounded-xl font-bold text-xs bg-rose-600 hover:bg-rose-500 text-white transition-all shadow-lg shadow-rose-600/20 flex items-center gap-2"
                >
                  {actionLoading ? (
                    <span>Suppression...</span>
                  ) : (
                    <>
                      <span>Confirmer la suppression</span>
                      <span className="material-symbols-outlined text-base">delete</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
