'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Briefcase,
  Search,
  Plus,
  RefreshCw,
  Mail,
  Phone as PhoneIcon,
  Edit2,
  Trash2,
  Loader2
} from 'lucide-react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  role: string;
  status: string;
  created_at: string;
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // Form states
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('developer');
  const [status, setStatus] = useState('active');

  const fetchEmployees = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEmployees(data || []);
    } catch (err) {
      console.error('Error fetching employees:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const handleOpenModal = (employee?: Employee) => {
    if (employee) {
      setEditingEmployee(employee);
      setFirstName(employee.first_name);
      setLastName(employee.last_name);
      setEmail(employee.email || '');
      setPhone(employee.phone || '');
      setRole(employee.role || 'developer');
      setStatus(employee.status || 'active');
    } else {
      setEditingEmployee(null);
      setFirstName('');
      setLastName('');
      setEmail('');
      setPhone('');
      setRole('developer');
      setStatus('active');
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (editingEmployee) {
        // Update employee
        const { error } = await supabase
          .from('employees')
          .update({
            first_name: firstName,
            last_name: lastName,
            email: email,
            phone: phone,
            role: role,
            status: status
          })
          .eq('id', editingEmployee.id);

        if (error) throw error;
      } else {
        // Create employee
        const { error } = await supabase
          .from('employees')
          .insert([
            {
              first_name: firstName,
              last_name: lastName,
              email: email,
              phone: phone,
              role: role,
              status: status
            }
          ]);

        if (error) throw error;
      }
      
      await fetchEmployees();
      setIsModalOpen(false);
    } catch (err) {
      console.error('Error saving employee:', err);
      alert('Erro ao salvar funcionário. Verifique se o e-mail já está cadastrado.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja remover este funcionário?')) return;
    try {
      const { error } = await supabase.from('employees').delete().eq('id', id);
      if (error) throw error;
      setEmployees(prev => prev.filter(emp => emp.id !== id));
    } catch (err) {
      console.error('Error deleting employee:', err);
      alert('Erro ao deletar funcionário.');
    }
  };

  const filteredEmployees = employees.filter(emp => 
    `${emp.first_name} ${emp.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.role?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Briefcase className="w-6 h-6 text-zinc-200" />
            Gestão de Funcionários
          </h1>
          <p className="text-zinc-400 text-sm">Gerencie o time de colaboradores e atribua tarefas específicas.</p>
        </div>

        <Button 
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-black font-semibold rounded-xl transition-all shadow-lg shadow-zinc-900/20 active:scale-95 border-0"
        >
          <Plus className="w-4 h-4" />
          Adicionar Funcionário
        </Button>
      </div>

      {/* Busca e Filtros */}
      <div className="bg-zinc-950/50 border border-zinc-900 p-4 rounded-2xl flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <Input 
            type="text" 
            placeholder="Buscar por nome, e-mail ou cargo..."
            className="w-full bg-black border border-zinc-900 text-white pl-10 pr-4 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-400/50 transition-all text-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button 
          variant="outline"
          onClick={fetchEmployees}
          className="bg-black border border-zinc-900 text-zinc-400 hover:text-white rounded-xl"
        >
          <RefreshCw className={cn("w-5 h-5", loading && "animate-spin")} />
        </Button>
      </div>

      {/* Tabela de Funcionários */}
      <div className="bg-zinc-950/50 border border-zinc-900 rounded-2xl overflow-hidden shadow-xl">
        <Table className="w-full text-left border-collapse">
          <TableHeader>
            <TableRow className="bg-black/50 border-b border-zinc-900 hover:bg-transparent">
              <TableHead className="p-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Funcionário</TableHead>
              <TableHead className="p-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Cargo</TableHead>
              <TableHead className="p-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Status</TableHead>
              <TableHead className="p-4 text-xs font-bold text-zinc-500 uppercase tracking-wider text-right"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-zinc-900/50">
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="p-12 text-center">
                  <Loader2 className="w-8 h-8 text-zinc-200 animate-spin mx-auto mb-2" />
                  <p className="text-zinc-500 text-sm font-medium">Carregando funcionários...</p>
                </TableCell>
              </TableRow>
            ) : filteredEmployees.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="p-12 text-center">
                  <Briefcase className="w-12 h-12 text-zinc-900 mx-auto mb-3" />
                  <p className="text-zinc-400 font-medium">Nenhum funcionário encontrado</p>
                  <p className="text-zinc-600 text-sm">Registre um novo colaborador para começar.</p>
                </TableCell>
              </TableRow>
            ) : (
              filteredEmployees.map((emp) => {
                return (
                  <TableRow key={emp.id} className="hover:bg-zinc-900/30 transition-colors group">
                    <TableCell className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800/50 flex items-center justify-center text-zinc-400 font-bold uppercase tracking-tighter">
                          {emp.first_name[0]}{emp.last_name[0]}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-white group-hover:text-zinc-300 transition-colors">
                            {emp.first_name} {emp.last_name}
                          </div>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="flex items-center gap-1 text-[10px] text-zinc-500">
                              <Mail className="w-3 h-3" />
                              {emp.email}
                            </span>
                            {emp.phone && (
                              <span className="flex items-center gap-1 text-[10px] text-zinc-500">
                                <PhoneIcon className="w-3 h-3" />
                                {emp.phone}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    
                    <TableCell className="p-4">
                      <span className="text-sm text-zinc-300 font-medium capitalize">
                        {emp.role}
                      </span>
                    </TableCell>

                    <TableCell className="p-4">
                      <Badge className={cn(
                        "border text-[10px] uppercase font-bold",
                        emp.status === 'active' 
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : "bg-zinc-500/10 text-zinc-500 border-zinc-800"
                      )}>
                        {emp.status === 'active' ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>

                    <TableCell className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleOpenModal(emp)}
                          className="h-8 w-8 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900 rounded-lg"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDelete(emp.id)}
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
                {editingEmployee ? <Edit2 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-white">
                  {editingEmployee ? 'Editar Funcionário' : 'Cadastrar Funcionário'}
                </DialogTitle>
                <DialogDescription className="text-xs text-zinc-400">
                  {editingEmployee ? 'Modifique os dados cadastrais do colaborador.' : 'Registre um novo colaborador no sistema.'}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleSave} className="p-6 space-y-5">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="firstName">Nome</Label>
                  <Input 
                    required
                    id="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="bg-black border-zinc-900 text-white focus-visible:ring-zinc-400"
                    placeholder="Ex: Carlos"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lastName">Sobrenome</Label>
                  <Input 
                    required
                    id="lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="bg-black border-zinc-900 text-white focus-visible:ring-zinc-400"
                    placeholder="Ex: Souza"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email">E-mail</Label>
                  <Input 
                    required
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-black border-zinc-900 text-white focus-visible:ring-zinc-400"
                    placeholder="carlos@taloserp.com"
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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="role">Cargo / Função</Label>
                  <Input 
                    required
                    id="role"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="bg-black border-zinc-900 text-white focus-visible:ring-zinc-400"
                    placeholder="Ex: Developer, Designer, Manager"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="status">Status</Label>
                  <Select value={status} onValueChange={(val) => setStatus(val || 'active')}>
                    <SelectTrigger className="bg-black border-zinc-900 text-white focus:ring-zinc-400">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent className="bg-black border-zinc-900 text-white">
                      <SelectItem value="active">Ativo</SelectItem>
                      <SelectItem value="inactive">Inativo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <DialogFooter className="pt-4 border-t border-zinc-900 flex gap-3">
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
                disabled={isSaving}
                className="bg-zinc-100 hover:bg-zinc-200 text-black font-semibold shadow-lg shadow-zinc-900/20 font-bold"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Salvando...
                  </>
                ) : (
                  'Salvar Funcionário'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
