'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { Sidebar, PageWrapper } from '@/components/ui';

interface NotificationItem {
  id: string;
  type: 'system' | 'lease' | 'maintenance' | 'financial';
  title: string;
  message: string;
  time: string;
  read: boolean;
  priority: 'high' | 'medium' | 'low';
}

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: '1',
    type: 'financial',
    title: 'Paiement Loyer Reçu — Résidence Azure',
    message: 'Le locataire Marc Lavoine a réglé son loyer de 150,000 FCFA pour le mois de Juillet.',
    time: 'Il y a 20 min',
    read: false,
    priority: 'medium',
  },
  {
    id: '2',
    type: 'lease',
    title: 'Expiration de Bail Prochaine (15 jours)',
    message: 'Le contrat de souscription de Sophie Dubois (Le Grand Palais, Penthouse A) arrive à échéance le 15 Août.',
    time: 'Il y a 2 heures',
    read: false,
    priority: 'high',
  },
  {
    id: '3',
    type: 'maintenance',
    title: 'Signalement de Fuite d\'Eau',
    message: 'Une demande de réparation d\'urgence a été soumise pour l\'Appartement 105 par Alice Moreau.',
    time: 'Il y a 4 heures',
    read: false,
    priority: 'high',
  },
  {
    id: '4',
    type: 'system',
    title: 'Sauvegarde Automatique de la Base de Données',
    message: 'La sauvegarde de nuit a été effectuée avec succès sur le serveur sécurisé.',
    time: 'Hier à 03:00',
    read: true,
    priority: 'low',
  },
  {
    id: '5',
    type: 'financial',
    title: 'Relance Impayé Envoyée',
    message: 'Un rappel automatique par SMS/Email a été transmis au locataire en retard de paiement (N° Contrat SUB-2026-088).',
    time: 'Hier à 14:30',
    read: true,
    priority: 'medium',
  },
];

export default function NotificationsPage() {
  const [items, setItems] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);
  const [filterType, setFilterType] = useState<string>('all');

  const filtered = items.filter(n => {
    if (filterType === 'unread') return !n.read;
    if (filterType === 'all') return true;
    return n.type === filterType;
  });

  const unreadCount = items.filter(n => !n.read).length;

  const markAsRead = (id: string) => {
    setItems(items.map(n => n.id === id ? { ...n, read: true } : n));
    toast.success('Notification marquée comme lue.');
  };

  const markAllAsRead = () => {
    setItems(items.map(n => ({ ...n, read: true })));
    toast.success('Toutes les notifications ont été marquées comme lues.');
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <PageWrapper
          title="Centre de Notifications"
          subtitle="Gérez les alertes du portefeuille immobilier et les demandes de maintenance."
          action={
            <button onClick={markAllAsRead} className="btn btn-secondary flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">done_all</span>
              <span>Tout marquer comme lu</span>
            </button>
          }
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Sidebar Filtres */}
            <div className="lg:col-span-3 space-y-4">
              <div className="glass-card rounded-xl p-5">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Catégories</h3>
                <div className="space-y-1">
                  {[
                    { key: 'all', label: 'Toutes les notifications', count: items.length, icon: 'list' },
                    { key: 'unread', label: 'Non lues', count: unreadCount, icon: 'mark_email_unread' },
                    { key: 'financial', label: 'Finances & Loyers', count: items.filter(i => i.type === 'financial').length, icon: 'payments' },
                    { key: 'lease', label: 'Baux & Échéances', count: items.filter(i => i.type === 'lease').length, icon: 'description' },
                    { key: 'maintenance', label: 'Maintenance', count: items.filter(i => i.type === 'maintenance').length, icon: 'engineering' },
                    { key: 'system', label: 'Système', count: items.filter(i => i.type === 'system').length, icon: 'dns' },
                  ].map((cat) => (
                    <button
                      key={cat.key}
                      onClick={() => setFilterType(cat.key)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                        filterType === cat.key
                          ? 'bg-slate-900 text-white shadow-sm'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="material-symbols-outlined text-base">{cat.icon}</span>
                        <span>{cat.label}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        filterType === cat.key ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {cat.count}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Notification Items List */}
            <div className="lg:col-span-9 space-y-4">
              {filtered.length === 0 ? (
                <div className="card text-center py-16">
                  <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">notifications_off</span>
                  <p className="text-slate-500 font-medium text-sm">Aucune notification dans cette catégorie.</p>
                </div>
              ) : (
                filtered.map((item) => (
                  <div
                    key={item.id}
                    className={`glass-card rounded-xl p-5 transition-all flex items-start justify-between gap-4 ${
                      !item.read ? 'border-l-4 border-l-[#D4AF37] bg-white' : 'opacity-85'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${
                        item.type === 'financial'   ? 'bg-emerald-50 text-emerald-700' :
                        item.type === 'lease'       ? 'bg-amber-50 text-amber-700' :
                        item.type === 'maintenance' ? 'bg-rose-50 text-rose-700' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        <span className="material-symbols-outlined text-xl">
                          {item.type === 'financial' ? 'payments' : item.type === 'lease' ? 'description' : item.type === 'maintenance' ? 'engineering' : 'dns'}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-display font-bold text-slate-900 text-sm">{item.title}</h4>
                          {!item.read && (
                            <span className="w-2 h-2 rounded-full bg-[#D4AF37]"></span>
                          )}
                        </div>
                        <p className="text-xs text-slate-600 mt-1 leading-relaxed">{item.message}</p>
                        <span className="text-[11px] text-slate-400 font-medium mt-2 inline-block">{item.time}</span>
                      </div>
                    </div>

                    {!item.read && (
                      <button
                        onClick={() => markAsRead(item.id)}
                        className="btn btn-secondary btn-sm shrink-0"
                        title="Marquer comme lu"
                      >
                        ✓ Lu
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>

          </div>
        </PageWrapper>
      </main>
    </div>
  );
}
