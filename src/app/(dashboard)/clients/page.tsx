'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  UserCheck,
  Search,
  Plus,
  RefreshCw,
  Eye,
  EyeOff,
  Mail,
  Phone,
  Key,
  Edit2,
  Trash2,
  Loader2,
  Save,
  X,
  FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ClientCredential {
  id: string;
  gmail: string;
  password?: string;
  notes: string;
}

interface Client {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  created_at: string;
  client_credentials: ClientCredential[];
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [isSaving, setIsSaving] = useState(false);


  
  // Form states
  const [first_name, setFirstName] = useState('');
  const [last_name, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [gmail, setGmail] = useState('');
  const [password, setPassword] = useState('');
  const [notes, setNotes] = useState('');

  // Password visibility states
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});

  const fetchClients = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('clients')
        .select(`
          *,
          client_credentials (
            id,
            gmail,
            password,
            notes
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setClients(data || []);
    } catch (err) {
      console.error('Error fetching clients:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const togglePasswordVisibility = (id: string) => {
    setShowPasswords(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleOpenModal = (client?: Client) => {
    if (client) {
      setEditingClient(client);
      setFirstName(client.first_name);
      setLastName(client.last_name);
      setEmail(client.email || '');
      setPhone(client.phone || '');
      
      const cred = client.client_credentials?.[0];
      setGmail(cred?.gmail || '');
      setPassword(cred?.password || '');
      setNotes(cred?.notes || '');
    } else {
      setEditingClient(null);
      setFirstName('');
      setLastName('');
      setEmail('');
      setPhone('');
      setGmail('');
      setPassword('');
      setNotes('');
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (editingClient) {
        // 1. Update client details
        const { error: clientError } = await supabase
          .from('clients')
          .update({ first_name, last_name, email, phone })
          .eq('id', editingClient.id);

        if (clientError) throw clientError;

        // 2. Update/Insert credentials
        const cred = editingClient.client_credentials?.[0];
        if (cred) {
          const { error: credError } = await supabase
            .from('client_credentials')
            .update({ gmail, password, notes })
            .eq('id', cred.id);
          if (credError) throw credError;
        } else {
          const { error: credError } = await supabase
            .from('client_credentials')
            .insert([{ client_id: editingClient.id, gmail, password, notes }]);
          if (credError) throw credError;
        }
      } else {
        // 1. Create client
        const { data: newClient, error: clientError } = await supabase
          .from('clients')
          .insert([{ first_name, last_name, email, phone }])
          .select()
          .single();

        if (clientError) throw clientError;

        // 2. Create credentials
        const { error: credError } = await supabase
          .from('client_credentials')
          .insert([{ client_id: newClient.id, gmail, password, notes }]);

        if (credError) throw credError;
      }
      
      await fetchClients();
      setIsModalOpen(false);
    } catch (err) {
      console.error('Error saving client:', err);
      alert('Erro ao salvar cliente. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja remover este cliente? Todos os contratos e credenciais vinculados serão excluídos permanentemente.')) return;
    try {
      const { error } = await supabase.from('clients').delete().eq('id', id);
      if (error) throw error;
      setClients(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      console.error('Error deleting client:', err);
    }
  };

  const filteredClients = clients.filter(client => 
    `${client.first_name} ${client.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.client_credentials?.[0]?.gmail?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-zinc-200" />
            Gestão de Clientes & Credenciais
          </h1>
          <p className="text-zinc-400 text-sm">Controle de acessos do Gmail, senhas e notas para cada cliente ativo.</p>
        </div>

        <div className="flex items-center gap-3">
          <Button 
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-black font-semibold rounded-xl transition-all shadow-lg shadow-zinc-900/20 active:scale-95 font-medium text-sm border-0"
          >
            <Plus className="w-4 h-4" />
            Adicionar Cliente
          </Button>
        </div>
      </div>

      {/* Busca e Filtros */}
      <div className="bg-zinc-950/50 border border-zinc-900 p-4 rounded-2xl flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <Input 
            type="text" 
            placeholder="Buscar por nome, email ou Gmail..."
            className="w-full bg-black border border-zinc-900 text-white pl-10 pr-4 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-400/50 transition-all text-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button 
          variant="outline"
          onClick={fetchClients}
          className="bg-black border border-zinc-900 text-zinc-400 hover:text-white rounded-xl"
        >
          <RefreshCw className={cn("w-5 h-5", loading && "animate-spin")} />
        </Button>
      </div>

      {/* Tabela de Clientes */}
      <div className="bg-zinc-950/50 border border-zinc-900 rounded-2xl overflow-hidden shadow-xl">
        <Table className="w-full text-left border-collapse">
          <TableHeader>
            <TableRow className="bg-black/50 border-b border-zinc-900 hover:bg-transparent">
              <TableHead className="p-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Cliente</TableHead>
              <TableHead className="p-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Acesso Gmail</TableHead>
              <TableHead className="p-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Senha do Gmail</TableHead>
              <TableHead className="p-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Observações/Acessos</TableHead>
              <TableHead className="p-4 text-xs font-bold text-zinc-500 uppercase tracking-wider text-right"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-zinc-900/50">
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="p-12 text-center">
                  <Loader2 className="w-8 h-8 text-zinc-200 animate-spin mx-auto mb-2" />
                  <p className="text-zinc-500 text-sm font-medium">Carregando clientes...</p>
                </TableCell>
              </TableRow>
            ) : filteredClients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="p-12 text-center">
                  <UserCheck className="w-12 h-12 text-zinc-900 mx-auto mb-3" />
                  <p className="text-zinc-400 font-medium">Nenhum cliente encontrado</p>
                  <p className="text-zinc-600 text-sm">Registre um novo cliente ou converta um lead.</p>
                </TableCell>
              </TableRow>
            ) : (
              filteredClients.map((client) => {
                const credential = client.client_credentials?.[0];
                const isPasswordVisible = !!showPasswords[client.id];

                return (
                  <TableRow key={client.id} className="hover:bg-zinc-900/30 transition-colors group">
                    <TableCell className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800/50 flex items-center justify-center text-zinc-400 font-bold uppercase tracking-tighter">
                          {client.first_name[0]}{client.last_name[0]}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-white group-hover:text-zinc-300 transition-colors">
                            {client.first_name} {client.last_name}
                          </div>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="flex items-center gap-1 text-[10px] text-zinc-500">
                              <Mail className="w-3 h-3" />
                              {client.email}
                            </span>
                            {client.phone && (
                              <span className="flex items-center gap-1 text-[10px] text-zinc-500">
                                <Phone className="w-3 h-3" />
                                {client.phone}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    
                    <TableCell className="p-4">
                      {credential?.gmail ? (
                        <div className="flex items-center gap-2 text-sm text-zinc-300 font-medium">
                          <Mail className="w-3.5 h-3.5 text-red-400" />
                          {credential.gmail}
                        </div>
                      ) : (
                        <span className="text-xs text-zinc-600 italic">Sem Gmail cadastrado</span>
                      )}
                    </TableCell>

                    <TableCell className="p-4">
                      {credential?.password ? (
                        <div className="flex items-center gap-2">
                          <Key className="w-3.5 h-3.5 text-yellow-400" />
                          <span className="text-sm font-mono tracking-wide text-zinc-300">
                            {isPasswordVisible ? credential.password : '••••••••'}
                          </span>
                          <button
                            type="button"
                            onClick={() => togglePasswordVisibility(client.id)}
                            className="p-1 text-zinc-500 hover:text-white transition-colors"
                          >
                            {isPasswordVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-zinc-600 italic">Sem senha cadastrada</span>
                      )}
                    </TableCell>

                    <TableCell className="p-4">
                      {credential?.notes ? (
                        <p className="text-xs text-zinc-400 line-clamp-2 max-w-xs">{credential.notes}</p>
                      ) : (
                        <span className="text-xs text-zinc-600 italic">-</span>
                      )}
                    </TableCell>

                    <TableCell className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleOpenModal(client)}
                          className="h-8 w-8 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900 rounded-lg"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDelete(client.id)}
                          className="h-8 w-8 text-zinc-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Cadastro/Edição Dialog */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-xl bg-zinc-950 border-zinc-900 text-white rounded-3xl overflow-hidden p-0 shadow-2xl">
          <DialogHeader className="p-6 pb-4 bg-gradient-to-r from-black to-zinc-950 border-b border-zinc-900">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-zinc-100 text-black/20 flex items-center justify-center text-zinc-200 border border-zinc-800">
                {editingClient ? <Edit2 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-white">
                  {editingClient ? 'Editar Cadastro' : 'Cadastrar Cliente'}
                </DialogTitle>
                <DialogDescription className="text-xs text-zinc-400">
                  {editingClient ? 'Modifique os dados cadastrais e as credenciais.' : 'Registre um cliente manualmente no sistema.'}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleSave} className="p-6 space-y-5 max-h-[70vh] overflow-y-auto custom-scrollbar">
            {/* Seção 1: Dados Cadastrais */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-zinc-300 border-b border-zinc-900 pb-1.5 uppercase tracking-wider text-[11px]">
                1. Informações Básicas
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="first_name">Nome</Label>
                  <Input 
                    required
                    id="first_name"
                    value={first_name}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="bg-black border-zinc-900 text-white focus-visible:ring-zinc-400"
                    placeholder="Ex: João"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="last_name">Sobrenome</Label>
                  <Input 
                    required
                    id="last_name"
                    value={last_name}
                    onChange={(e) => setLastName(e.target.value)}
                    className="bg-black border-zinc-900 text-white focus-visible:ring-zinc-400"
                    placeholder="Ex: Silva"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input 
                    required
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-black border-zinc-900 text-white focus-visible:ring-zinc-400"
                    placeholder="cliente@empresa.com"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input 
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="bg-black border-zinc-900 text-white focus-visible:ring-zinc-400"
                    placeholder="(11) 99999-9999"
                  />
                </div>
              </div>
            </div>

            {/* Seção 2: Credenciais */}
            <div className="space-y-4 pt-2">
              <h3 className="text-sm font-bold text-zinc-300 border-b border-zinc-900 pb-1.5 uppercase tracking-wider text-[11px]">
                2. Acesso e Senhas do Cliente
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="gmail">Gmail</Label>
                  <Input 
                    id="gmail"
                    type="email"
                    value={gmail}
                    onChange={(e) => setGmail(e.target.value)}
                    className="bg-black border-zinc-900 text-white focus-visible:ring-zinc-400"
                    placeholder="gmail@gmail.com"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password">Senha de Acesso</Label>
                  <Input 
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-black border-zinc-900 text-white focus-visible:ring-zinc-400"
                    placeholder="Digite a senha"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="notes">Acessos Extras / Observações</Label>
                <Textarea 
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="bg-black border-zinc-900 text-white focus-visible:ring-zinc-400 min-h-[80px]"
                  placeholder="Links de hospedagem, painéis de administração, credenciais adicionais, etc."
                />
              </div>
            </div>
          </form>

          <DialogFooter className="p-6 bg-black border-t border-zinc-900 flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
              className="bg-zinc-950 hover:bg-zinc-900 border-zinc-900 text-zinc-300 hover:text-white"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              onClick={handleSave}
              disabled={isSaving}
              className="bg-zinc-100 hover:bg-zinc-200 text-black font-semibold shadow-lg shadow-zinc-900/20 font-bold"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Salvando...
                </>
              ) : (
                'Salvar Cliente'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
