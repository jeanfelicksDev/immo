'use client';

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';

interface NavSection {
  title: string;
  items: {
    href: string;
    label: string;
    icon: string;
    badge?: string;
  }[];
}

const navSections: NavSection[] = [
  {
    title: "VUE D'ENSEMBLE",
    items: [
      { href: '/dashboard', label: 'Tableau de Bord', icon: 'dashboard' },
    ],
  },
  {
    title: 'GESTION IMMOBILIÈRE',
    items: [
      { href: '/proprietaires', label: 'Propriétaires',       icon: 'real_estate_agent' },
      { href: '/maisons',       label: 'Biens & Maisons',     icon: 'domain' },
      { href: '/locataires',    label: 'Locataires',          icon: 'group' },
      { href: '/souscriptions', label: 'Contrats de Location',icon: 'description' },
    ],
  },
  {
    title: 'FINANCES & COMPTABILITÉ',
    items: [
      { href: '/reglements', label: 'Paiements & Loyers', icon: 'payments' },
      { href: '/depenses',   label: 'Dépenses & Charges', icon: 'receipt_long' },
      { href: '/rapports',   label: 'Rapports & Analytique', icon: 'analytics' },
    ],
  },
  {
    title: 'SYSTÈME & ADMINISTRATION',
    items: [
      { href: '/utilisateurs',  label: 'Gestion des Comptes',   icon: 'manage_accounts' },
      { href: '/profil',        label: 'Mon Profil & Réglages', icon: 'person' },
    ],
  },
];

// ─── Sidebar Premium ──────────────────────────────────────────
export function Sidebar() {
  const pathname = usePathname();
  const router   = useRouter();
  const [currentUser, setCurrentUser] = React.useState<any>(null);
  const [isAdmin, setIsAdmin] = React.useState<boolean>(true); // Défaut permissif pendant le chargement

  React.useEffect(() => {
    try {
      const stored = localStorage.getItem('user');
      if (stored) {
        const parsed = JSON.parse(stored);
        setCurrentUser(parsed);
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
    } catch (e) {
      console.warn('Erreur lecture utilisateur:', e);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  return (
    <aside className="fixed inset-y-0 left-0 w-[310px] side-nav-glass text-slate-200 z-50 flex flex-col py-6 shadow-2xl border-r border-slate-800/80 overflow-y-auto custom-scrollbar">
      {/* ─── Identité Visuelle Premium ───────────────────────────── */}
      <div className="px-6 mb-[2cm] flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#FFE088] via-[#D4AF37] to-[#8E7200] flex items-center justify-center font-display font-black text-slate-950 text-lg shadow-lg shadow-[#D4AF37]/20 border border-white/30 shrink-0">
            IG
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display font-extrabold text-xl text-white tracking-tight leading-none">
                Immo<span className="text-[#FFE088]">Gest</span>
              </h1>
              <span className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded bg-[#D4AF37]/20 text-[#FFE088] border border-[#D4AF37]/30 tracking-widest">
                PRO
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <p className="font-sans text-[11.5px] text-slate-400 font-semibold tracking-wide">
                {currentUser?.role || (isAdmin ? 'Administrateur' : 'Gestionnaire Actif')}
              </p>
            </div>
          </div>
        </div>
      </div>


      {/* ─── Navigation Structurée par Groupes ────────────────────── */}
      <nav className="flex-1 space-y-6 px-4">
        {navSections.map((section) => {
          // Filtrer les éléments selon les autorisations
          const filteredItems = section.items.filter((item) => {
            if (item.href === '/utilisateurs' && !isAdmin) {
              return false; // Masquer la Gestion des Comptes pour non-admins
            }
            return true;
          });

          if (filteredItems.length === 0) return null;

          return (
            <div key={section.title} className="space-y-1.5">
              <div className="px-3 pb-1.5 text-[12.5px] font-black tracking-widest text-slate-400/90 uppercase font-sans">
                {section.title}
              </div>
              {filteredItems.map((item) => {
                const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
                return (
                  <Link key={item.href} href={item.href}>
                    <div
                      className={`relative flex items-center gap-4 px-4 py-3 rounded-xl text-[15px] font-bold transition-all duration-200 cursor-pointer group ${
                        isActive
                          ? 'bg-gradient-to-r from-[#D4AF37]/30 via-[#D4AF37]/15 to-transparent text-white font-extrabold border-l-4 border-[#D4AF37] shadow-sm'
                          : 'text-slate-300 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <span
                        className={`material-symbols-outlined text-[23px] transition-transform duration-200 group-hover:scale-110 ${
                          isActive ? 'text-[#FFE088]' : 'text-slate-400 group-hover:text-slate-200'
                        }`}
                      >
                        {item.icon}
                      </span>
                      <span className="flex-1 tracking-wide">{item.label}</span>
                      {item.badge && (
                        <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          {item.badge}
                        </span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* ─── Carte Profil Utilisateur & Déconnexion ──────────────────── */}
      <div className="border-t border-slate-800/90 pt-4 px-4 mt-4 space-y-3">
        <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
          <Link href="/profil" className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer">
            <div className="w-9 h-9 rounded-lg bg-slate-800 text-amber-300 font-bold text-xs flex items-center justify-center border border-amber-500/30">
              {currentUser?.nom ? currentUser.nom.substring(0, 2).toUpperCase() : 'AD'}
            </div>
            <div className="truncate">
              <p className="text-[14px] font-bold text-white truncate">
                {currentUser?.nom || 'Administrateur'}
              </p>
              <p className="text-[11.5px] text-slate-400 truncate">
                {currentUser?.role || 'Profil & Agence'}
              </p>
            </div>
          </Link>
          <button
            onClick={handleLogout}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
            title="Déconnexion"
          >
            <span className="material-symbols-outlined text-lg">logout</span>
          </button>
        </div>
      </div>
    </aside>
  );
}

// ─── Page Wrapper ─────────────────────────────────────────────
interface PageWrapperProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}

export function PageWrapper({ title, subtitle, action, children }: PageWrapperProps) {
  return (
    <div className="animate-fade-in p-8 max-w-[1600px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-slate-900 tracking-tight">{title}</h1>
          {subtitle && <p className="text-sm font-medium text-slate-500 mt-1">{subtitle}</p>}
        </div>
        {action && <div>{action}</div>}
      </div>
      {children}
    </div>
  );
}

// ─── Modal Premium ───────────────────────────────────────────
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: string;
}

export function Modal({ isOpen, onClose, title, children, footer, maxWidth }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop">
      <div className={`modal-panel ${maxWidth || ''}`}>
        <div className="modal-header">
          <div className="flex items-center gap-3">
            <span className="w-1.5 h-6 bg-gradient-to-b from-[#FFE088] to-[#D4AF37] rounded-full shadow-sm"></span>
            <h2 className="font-display text-xl font-bold text-slate-900 tracking-tight">{title}</h2>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-200/80 hover:text-slate-800 transition-all font-bold"
          >
            ✕
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

// ─── DataTable ────────────────────────────────────────────────
interface Column<T> {
  key: keyof T | string;
  label: string;
  render?: (row: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  keyExtractor?: (row: T) => string;
}

export function DataTable<T extends Record<string, any>>({
  columns, data, loading, emptyMessage = 'Aucun enregistrement trouvé.', keyExtractor
}: DataTableProps<T>) {
  if (loading) {
    return (
      <div className="card">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex gap-4 py-4 border-b border-slate-100">
            {columns.map((_, j) => (
              <div key={j} className="h-4 bg-slate-100 animate-pulse rounded-lg flex-1" />
            ))}
          </div>
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="card text-center py-16">
        <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">inventory_2</span>
        <p className="text-slate-500 font-medium text-sm">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden p-0 border border-slate-200/80">
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={String(col.key)} className={col.className}>
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={keyExtractor ? keyExtractor(row) : i}>
                {columns.map((col) => (
                  <td key={String(col.key)} className={col.className}>
                    {col.render ? col.render(row) : String(row[col.key as string] ?? '—')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Pagination ───────────────────────────────────────────────
interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
}

export function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between mt-6">
      <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
        Page {page} sur {totalPages}
      </span>
      <div className="flex gap-2">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="btn btn-secondary btn-sm disabled:opacity-40"
        >
          ← Précédent
        </button>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="btn btn-secondary btn-sm disabled:opacity-40"
        >
          Suivant →
        </button>
      </div>
    </div>
  );
}

// ─── Badge de statut ─────────────────────────────────────────
export function StatutBadge({ statut }: { statut: string }) {
  const classes: Record<string, string> = {
    'Active':     'badge-active',
    'Payé':       'badge-paid',
    'Paye':       'badge-paid',
    'Partiel':    'badge-pending',
    'En attente': 'badge-pending',
    'En retard':  'badge-late',
    'Expirée':    'badge-expired',
    'Résiliée':   'badge-expired',
  };
  return <span className={`badge ${classes[statut] ?? 'badge-expired'}`}>{statut}</span>;
}
