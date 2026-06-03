'use client';

import React, { useState, useEffect } from 'react';
import {
  Bell,
  Search,
  User,
  Mail,
  Phone,
  Briefcase,
  Save,
  Loader2,
  X,
  Camera,
  LogOut,
  Plus,
  Pencil,
  Trash
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

interface Profile {
  id: string;
  name: string;
  role: string;
  email: string;
  phone: string;
}

export function Navbar() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [activeId, setActiveId] = useState<string>('');

  // Dialog open states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  // Profile target to edit (if null, we edit activeProfile)
  const [profileToEdit, setProfileToEdit] = useState<Profile | null>(null);

  // Form draft states for editing
  const [draftName, setDraftName] = useState('');
  const [draftRole, setDraftRole] = useState('');
  const [draftEmail, setDraftEmail] = useState('');
  const [draftPhone, setDraftPhone] = useState('');

  // Form states for adding
  const [addName, setAddName] = useState('');
  const [addRole, setAddRole] = useState('');
  const [addEmail, setAddEmail] = useState('');
  const [addPhone, setAddPhone] = useState('');

  // Load accounts on mount
  useEffect(() => {
    const savedList = localStorage.getItem('talos_admin_profiles_list');
    const savedActiveId = localStorage.getItem('talos_active_profile_id');
    const legacyProfile = localStorage.getItem('talos_admin_profile');

    let parsedList: Profile[] = [];
    let currentActiveId = '';

    if (savedList) {
      try {
        parsedList = JSON.parse(savedList);
      } catch (err) {
        console.error('Error parsing profiles list:', err);
      }
    }

    if (savedActiveId) {
      currentActiveId = savedActiveId;
    }

    // Seed if empty (start with exactly one account, no automatic dummy profiles)
    if (parsedList.length === 0) {
      let initialProfile: Profile = {
        id: '1',
        name: 'Iago Gabriel Riskoski',
        role: 'Super Admin',
        email: 'iago.riskoski@gmail.com',
        phone: '(11) 99999-8888'
      };

      if (legacyProfile) {
        try {
          const parsedLegacy = JSON.parse(legacyProfile);
          initialProfile = {
            id: '1',
            name: parsedLegacy.name || initialProfile.name,
            role: parsedLegacy.role || initialProfile.role,
            email: parsedLegacy.email || initialProfile.email,
            phone: parsedLegacy.phone || initialProfile.phone,
          };
        } catch (e) {}
      }

      parsedList = [initialProfile];
      currentActiveId = '1';
      
      localStorage.setItem('talos_admin_profiles_list', JSON.stringify(parsedList));
      localStorage.setItem('talos_active_profile_id', currentActiveId);
      localStorage.setItem('talos_admin_profile', JSON.stringify(initialProfile));
    }

    // Ensure active profile is in the list
    const active = parsedList.find(p => p.id === currentActiveId) || parsedList[0];
    if (active) {
      currentActiveId = active.id;
      localStorage.setItem('talos_active_profile_id', currentActiveId);
      localStorage.setItem('talos_admin_profile', JSON.stringify(active));
    }

    setProfiles(parsedList);
    setActiveId(currentActiveId);
  }, []);

  const activeProfile = profiles.find(p => p.id === activeId) || {
    id: '1',
    name: 'Iago Gabriel Riskoski',
    role: 'Super Admin',
    email: 'iago.riskoski@gmail.com',
    phone: '(11) 99999-8888'
  };

  const getInitials = (fullName: string) => {
    const parts = fullName.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return fullName.substring(0, 2).toUpperCase();
  };

  const getGradient = (name: string) => {
    const defaultName = name || 'AD';
    const colors = [
      'from-emerald-600 to-teal-700',
      'from-blue-600 to-indigo-700',
      'from-purple-600 to-pink-700',
      'from-orange-600 to-amber-700',
      'from-cyan-600 to-blue-700',
      'from-fuchsia-600 to-purple-700'
    ];
    let hash = 0;
    for (let i = 0; i < defaultName.length; i++) {
      hash = defaultName.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  };

  const openEditModal = (profile: Profile) => {
    setProfileToEdit(profile);
    setDraftName(profile.name);
    setDraftRole(profile.role);
    setDraftEmail(profile.email);
    setDraftPhone(profile.phone);
    setIsEditModalOpen(true);
  };

  const openAddModal = () => {
    setAddName('');
    setAddRole('');
    setAddEmail('');
    setAddPhone('');
    setIsAddModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const target = profileToEdit || activeProfile;
    if (!target) return;

    setIsSaving(true);

    setTimeout(() => {
      const updated = profiles.map(p => {
        if (p.id === target.id) {
          return {
            ...p,
            name: draftName,
            role: draftRole,
            email: draftEmail,
            phone: draftPhone
          };
        }
        return p;
      });

      setProfiles(updated);
      localStorage.setItem('talos_admin_profiles_list', JSON.stringify(updated));

      if (target.id === activeId) {
        const activeItem = updated.find(p => p.id === activeId);
        if (activeItem) {
          localStorage.setItem('talos_admin_profile', JSON.stringify(activeItem));
          window.dispatchEvent(new Event('talos_profile_updated'));
        }
      }

      setIsSaving(false);
      setIsEditModalOpen(false);
      setProfileToEdit(null);
    }, 600);
  };

  const handleAddAccount = (e: React.FormEvent) => {
    e.preventDefault();
    setIsAdding(true);

    setTimeout(() => {
      const newId = Date.now().toString();
      const newProfile: Profile = {
        id: newId,
        name: addName,
        role: addRole,
        email: addEmail,
        phone: addPhone
      };

      const updated = [...profiles, newProfile];
      setProfiles(updated);
      setActiveId(newId);

      localStorage.setItem('talos_admin_profiles_list', JSON.stringify(updated));
      localStorage.setItem('talos_active_profile_id', newId);
      localStorage.setItem('talos_admin_profile', JSON.stringify(newProfile));

      window.dispatchEvent(new Event('talos_profile_updated'));

      setIsAdding(false);
      setIsAddModalOpen(false);

      // Reset
      setAddName('');
      setAddRole('');
      setAddEmail('');
      setAddPhone('');
    }, 600);
  };

  const handleDeleteProfile = (profileId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    if (profiles.length <= 1) {
      alert("Você precisa manter pelo menos uma conta ativa.");
      return;
    }

    const targetProfile = profiles.find(p => p.id === profileId);
    if (!targetProfile) return;

    if (confirm(`Deseja remover a conta de ${targetProfile.name}?`)) {
      const updated = profiles.filter(p => p.id !== profileId);
      setProfiles(updated);
      localStorage.setItem('talos_admin_profiles_list', JSON.stringify(updated));

      if (activeId === profileId) {
        const nextActive = updated[0];
        setActiveId(nextActive.id);
        localStorage.setItem('talos_active_profile_id', nextActive.id);
        localStorage.setItem('talos_admin_profile', JSON.stringify(nextActive));
        window.dispatchEvent(new Event('talos_profile_updated'));
      }
    }
  };

  const handleSwitchAccount = (profileId: string) => {
    if (profileId === activeId) return;

    setActiveId(profileId);
    localStorage.setItem('talos_active_profile_id', profileId);

    const target = profiles.find(p => p.id === profileId);
    if (target) {
      localStorage.setItem('talos_admin_profile', JSON.stringify(target));
      window.dispatchEvent(new Event('talos_profile_updated'));
    }
  };

  const otherProfiles = profiles.filter(p => p.id !== activeId);

  return (
    <header className="h-16 border-b border-zinc-900 bg-black/80 backdrop-blur-md flex items-center justify-between px-8 sticky top-0 z-40">
      {/* Barra de busca */}
      <div className="flex items-center bg-zinc-950 border border-zinc-900 rounded-full px-4 py-1.5 w-96 group focus-within:border-zinc-700 transition-all">
        <Search className="w-4 h-4 text-zinc-500 group-focus-within:text-zinc-200" />
        <input 
          type="text" 
          placeholder="Pesquisar..." 
          className="bg-transparent border-none focus:ring-0 text-sm text-zinc-200 placeholder:text-zinc-600 w-full ml-2 outline-none"
        />
      </div>

      <div className="flex items-center gap-4">
        {/* Notificações */}
        <button className="p-2 hover:bg-zinc-900 rounded-full relative transition-colors">
          <Bell className="w-5 h-5 text-zinc-400" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-zinc-100 text-black rounded-full border-2 border-black" />
        </button>
        
        <div className="h-8 w-[1px] bg-zinc-800 mx-2" />
        
        {/* Bloco de perfil com Dropdown Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger render={
            <button 
              type="button"
              className="flex items-center gap-3 pl-2 text-left cursor-pointer hover:opacity-80 transition-all select-none border-0 bg-transparent focus:outline-none"
            >
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold text-zinc-200 leading-tight">{activeProfile.name}</p>
                <p className="text-[10px] text-zinc-500 mt-0.5 font-bold uppercase tracking-wider">{activeProfile.role}</p>
              </div>
              <div className={`w-10 h-10 bg-gradient-to-br ${getGradient(activeProfile.name)} rounded-full flex items-center justify-center border border-zinc-800 text-zinc-300 font-bold uppercase tracking-tighter text-sm shrink-0`}>
                {activeProfile.name ? getInitials(activeProfile.name) : 'AD'}
              </div>
            </button>
          } />

          <DropdownMenuContent className="w-[340px] bg-[#18181b] border border-zinc-900 text-zinc-200 rounded-3xl p-5 shadow-2xl font-mono text-[13px] z-50">
            {/* Top Row: Active email and Close button */}
            <div className="relative w-full flex items-center justify-between mb-5 px-1">
              <span className="text-zinc-400 text-xs font-mono select-all truncate max-w-[260px]">
                {activeProfile.email}
              </span>
              <DropdownMenuItem className="p-1 hover:bg-zinc-900 rounded-full transition-colors cursor-pointer !size-7 flex items-center justify-center border-0 bg-transparent shrink-0">
                <X className="w-4 h-4 text-zinc-500 hover:text-white" />
              </DropdownMenuItem>
            </div>

            {/* Middle Row: Large Avatar, Greeting, Manage Button */}
            <div className="flex flex-col items-center mb-2">
              <div className="relative group mb-3 select-none">
                <div className={`w-20 h-20 bg-gradient-to-br ${getGradient(activeProfile.name)} text-white rounded-full flex items-center justify-center text-3xl font-bold uppercase shadow-lg`}>
                  {activeProfile.name ? getInitials(activeProfile.name) : 'AD'}
                </div>
                <button 
                  type="button"
                  onClick={() => openEditModal(activeProfile)}
                  className="absolute bottom-0 right-0 bg-[#28282b] hover:bg-zinc-800 border border-zinc-800 p-1.5 rounded-full text-zinc-300 hover:text-white shadow-md cursor-pointer transition-colors"
                  title="Editar perfil"
                >
                  <Camera className="w-3.5 h-3.5" />
                </button>
              </div>

              <h2 className="text-base font-semibold text-white mb-1">
                Olá, {activeProfile.name ? activeProfile.name.trim().split(' ')[0] : 'Admin'}!
              </h2>
              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-4">{activeProfile.role}</p>

              <button
                type="button"
                onClick={() => openEditModal(activeProfile)}
                className="px-5 py-2.5 bg-transparent hover:bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white rounded-full text-[12px] font-semibold transition-all mb-2"
              >
                Gerenciar seu Perfil
              </button>
            </div>

            {/* Other Profiles Section */}
            {otherProfiles.length > 0 && (
              <>
                <DropdownMenuSeparator className="w-full my-3" />
                <div className="px-1 py-1.5 text-zinc-500 font-bold uppercase tracking-wider text-[10px] text-left">
                  Outras contas
                </div>
                <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                  {otherProfiles.map(p => (
                    <div
                      key={p.id}
                      onClick={() => handleSwitchAccount(p.id)}
                      className="group/item flex items-center justify-between p-2 hover:bg-zinc-900/60 border border-transparent hover:border-zinc-800/50 rounded-2xl cursor-pointer transition-all"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${getGradient(p.name)} text-white flex items-center justify-center text-xs font-bold uppercase shrink-0`}>
                          {getInitials(p.name)}
                        </div>
                        <div className="text-left min-w-0">
                          <p className="text-[13px] font-semibold text-zinc-200 truncate leading-tight">
                            {p.name}
                          </p>
                          <p className="text-[10px] text-zinc-500 truncate mt-0.5">{p.email}</p>
                        </div>
                      </div>

                      {/* Action Toolbar on hover */}
                      <div className="opacity-0 group-hover/item:opacity-100 flex items-center gap-1 transition-opacity shrink-0 ml-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditModal(p);
                          }}
                          className="p-1.5 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-lg transition-colors"
                          title="Editar perfil"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteProfile(p.id, e)}
                          className="p-1.5 hover:bg-red-500/20 text-zinc-500 hover:text-red-400 rounded-lg transition-colors"
                          title="Remover conta"
                        >
                          <Trash className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Add account button */}
            <button
              type="button"
              onClick={openAddModal}
              className="w-full flex items-center justify-center gap-2.5 px-4 py-3 hover:bg-zinc-900/60 text-zinc-300 hover:text-white rounded-2xl transition-all cursor-pointer border border-dashed border-zinc-800 hover:border-zinc-700 mt-3 text-xs font-semibold"
            >
              <Plus className="w-4 h-4 text-zinc-500" />
              Adicionar outra conta
            </button>

            <DropdownMenuSeparator className="w-full my-3" />

            <DropdownMenuItem 
              onClick={() => {
                if (confirm("Deseja sair da sua conta ativa?")) {
                  handleDeleteProfile(activeId, { stopPropagation: () => {} } as any);
                }
              }}
              className="flex items-center justify-center gap-2 p-2.5 w-full hover:bg-zinc-900 rounded-xl transition-all cursor-pointer text-zinc-400 hover:text-white border-0"
            >
              <LogOut className="w-4 h-4 text-zinc-500" />
              <span className="text-xs font-bold">Sair da conta</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Modal para Editar Perfil */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-md bg-zinc-950 border-zinc-900 text-white rounded-3xl overflow-hidden p-0 shadow-2xl">
          <DialogHeader className="p-6 pb-4 bg-gradient-to-r from-black to-zinc-950 border-b border-zinc-900">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-zinc-100 text-black flex items-center justify-center border border-zinc-850 font-bold">
                <User className="w-5 h-5 text-black" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-white">Editar Perfil</DialogTitle>
                <DialogDescription className="text-xs text-zinc-400">Edite as informações exibidas no sistema ERP.</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleSave} className="flex flex-col">
            <div className="p-6 space-y-4 flex-1">
              <div className="flex flex-col items-center gap-3 pb-2">
                <div className={`w-16 h-16 bg-gradient-to-br ${getGradient(draftName)} rounded-full flex items-center justify-center border-2 border-zinc-800 text-zinc-300 font-black text-xl shadow-lg`}>
                  {draftName ? getInitials(draftName) : 'AD'}
                </div>
                <div className="text-center">
                  <h3 className="text-sm font-bold text-white leading-tight">{draftName || 'Novo Perfil'}</h3>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mt-1">{draftRole || 'Cargo'}</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="name">Nome do Administrador</Label>
                <Input
                  required
                  id="name"
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  className="bg-black border-zinc-900 text-white focus-visible:ring-zinc-400"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="role">Cargo / Título</Label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <Input
                    required
                    id="role"
                    value={draftRole}
                    onChange={(e) => setDraftRole(e.target.value)}
                    className="bg-black border-zinc-900 text-white pl-10 focus-visible:ring-zinc-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email">E-mail</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <Input
                      required
                      type="email"
                      id="email"
                      value={draftEmail}
                      onChange={(e) => setDraftEmail(e.target.value)}
                      className="bg-black border-zinc-900 text-white pl-10 focus-visible:ring-zinc-400"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="phone">Telefone</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <Input
                      id="phone"
                      value={draftPhone}
                      onChange={(e) => setDraftPhone(e.target.value)}
                      className="bg-black border-zinc-900 text-white pl-10 focus-visible:ring-zinc-400"
                    />
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="p-6 bg-black border-t border-zinc-900 flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsEditModalOpen(false);
                  setProfileToEdit(null);
                }}
                className="bg-zinc-950 hover:bg-zinc-900 border-zinc-900 text-zinc-300 hover:text-white"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSaving}
                className="bg-zinc-100 hover:bg-zinc-200 text-black font-semibold shadow-lg shadow-zinc-900/20 font-bold flex items-center gap-1.5"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Salvar Alterações
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal para Adicionar Perfil */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="max-w-md bg-zinc-950 border-zinc-900 text-white rounded-3xl overflow-hidden p-0 shadow-2xl">
          <DialogHeader className="p-6 pb-4 bg-gradient-to-r from-black to-zinc-950 border-b border-zinc-900">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-zinc-100 text-black flex items-center justify-center border border-zinc-850 font-bold">
                <Plus className="w-5 h-5 text-black" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-white">Adicionar Conta</DialogTitle>
                <DialogDescription className="text-xs text-zinc-400">Preencha os dados do novo perfil de administrador.</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleAddAccount} className="flex flex-col">
            <div className="p-6 space-y-4 flex-1">
              <div className="space-y-1.5">
                <Label htmlFor="add-name">Nome do Administrador</Label>
                <Input
                  required
                  id="add-name"
                  placeholder="Ex: Iago Gabriel Riskoski"
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  className="bg-black border-zinc-900 text-white focus-visible:ring-zinc-400"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="add-role">Cargo / Título</Label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <Input
                    required
                    id="add-role"
                    placeholder="Ex: Super Admin"
                    value={addRole}
                    onChange={(e) => setAddRole(e.target.value)}
                    className="bg-black border-zinc-900 text-white pl-10 focus-visible:ring-zinc-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="add-email">E-mail</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <Input
                      required
                      type="email"
                      id="add-email"
                      placeholder="Ex: iago@exemplo.com"
                      value={addEmail}
                      onChange={(e) => setAddEmail(e.target.value)}
                      className="bg-black border-zinc-900 text-white pl-10 focus-visible:ring-zinc-400"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="add-phone">Telefone</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <Input
                      id="add-phone"
                      placeholder="Ex: (11) 99999-8888"
                      value={addPhone}
                      onChange={(e) => setAddPhone(e.target.value)}
                      className="bg-black border-zinc-900 text-white pl-10 focus-visible:ring-zinc-400"
                    />
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="p-6 bg-black border-t border-zinc-900 flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddModalOpen(false)}
                className="bg-zinc-950 hover:bg-zinc-900 border-zinc-900 text-zinc-300 hover:text-white"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isAdding}
                className="bg-zinc-100 hover:bg-zinc-200 text-black font-semibold shadow-lg shadow-zinc-900/20 font-bold flex items-center gap-1.5"
              >
                {isAdding ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Adicionando...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Adicionar Conta
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </header>
  );
}
