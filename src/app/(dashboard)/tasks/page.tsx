'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  ClipboardList,
  Search,
  Plus,
  RefreshCw,
  Calendar,
  User,
  Building2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Loader2,
  Edit2,
  Trash2,
  CheckSquare,
  Square
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
import { Textarea } from '@/components/ui/textarea';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
}

interface Client {
  id: string;
  first_name: string;
  last_name: string;
}

interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  due_date: string | null;
  employee_id: string | null;
  client_id: string | null;
  project_id: string | null;
  created_at: string;
  employees: Employee | null;
  clients: Client | null;
  projects: { id: string; name: string } | null;
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('all');
  const [selectedClientId, setSelectedClientId] = useState('all');
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [employeeId, setEmployeeId] = useState('none');
  const [clientId, setClientId] = useState('none');
  const [projectId, setProjectId] = useState('none');
  const [status, setStatus] = useState('pending');

  const [projects, setProjects] = useState<{ id: string; name: string; client_id: string | null }[]>([]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      // Fetch tasks
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select(`
          *,
          employees (
            id,
            first_name,
            last_name
          ),
          clients (
            id,
            first_name,
            last_name
          ),
          projects (
            id,
            name
          )
        `)
        .order('due_date', { ascending: true });

      if (tasksError) throw tasksError;

      // Fetch active employees
      const { data: empsData, error: empsError } = await supabase
        .from('employees')
        .select('id, first_name, last_name')
        .eq('status', 'active')
        .order('first_name');

      if (empsError) throw empsError;

      // Fetch clients
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('id, first_name, last_name')
        .order('first_name');

      if (clientsError) throw clientsError;

      // Fetch projects
      const { data: projsData, error: projsError } = await supabase
        .from('projects')
        .select('id, name, client_id')
        .order('name');

      if (projsError) throw projsError;

      setTasks(tasksData || []);
      setEmployees(empsData || []);
      setClients(clientsData || []);
      setProjects(projsData || []);
    } catch (err) {
      console.error('Error fetching tasks page data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOpenModal = (task?: Task) => {
    if (task) {
      setEditingTask(task);
      setTitle(task.title);
      setDescription(task.description || '');
      setDueDate(task.due_date || '');
      setEmployeeId(task.employee_id || 'none');
      setClientId(task.client_id || 'none');
      setProjectId(task.project_id || 'none');
      setStatus(task.status || 'pending');
    } else {
      setEditingTask(null);
      setTitle('');
      setDescription('');
      setDueDate('');
      setEmployeeId('none');
      setClientId('none');
      setProjectId('none');
      setStatus('pending');
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSaving(true);
    try {
      const payload = {
        title,
        description,
        due_date: dueDate ? dueDate : null,
        employee_id: employeeId === 'none' ? null : employeeId,
        client_id: clientId === 'none' ? null : clientId,
        project_id: projectId === 'none' ? null : projectId,
        status
      };

      if (editingTask) {
        const { error } = await supabase
          .from('tasks')
          .update(payload)
          .eq('id', editingTask.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('tasks')
          .insert([payload]);

        if (error) throw error;
      }

      await fetchData();
      setIsModalOpen(false);
    } catch (err) {
      console.error('Error saving task:', err);
      alert('Erro ao salvar tarefa.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja remover esta tarefa?')) return;
    try {
      const { error } = await supabase.from('tasks').delete().eq('id', id);
      if (error) throw error;
      setTasks(prev => prev.filter(t => t.id !== id));
    } catch (err) {
      console.error('Error deleting task:', err);
    }
  };

  const toggleStatus = async (task: Task) => {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    try {
      // Optimistic update
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t));
      const { error } = await supabase
        .from('tasks')
        .update({ status: newStatus })
        .eq('id', task.id);
      if (error) throw error;
    } catch (err) {
      console.error('Error toggling task status:', err);
      // Rollback
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: task.status } : t));
    }
  };

  // Helper: check if a task is overdue
  const isOverdue = (task: Task) => {
    if (task.status === 'completed' || !task.due_date) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(task.due_date);
    due.setHours(0, 0, 0, 0);
    return due < today;
  };

  // Compute metrics based on UNFILTERED data
  const totalCount = tasks.length;
  const completedCount = tasks.filter(t => t.status === 'completed').length;
  const overdueCount = tasks.filter(isOverdue).length;
  const pendingCount = tasks.filter(t => t.status === 'pending' && !isOverdue(t)).length;

  // Apply filters
  const getFilteredTasks = () => {
    let list = tasks;

    // Search query filter
    if (searchQuery.trim()) {
      list = list.filter(t => 
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Employee filter
    if (selectedEmployeeId !== 'all') {
      list = list.filter(t => t.employee_id === selectedEmployeeId);
    }

    // Client filter
    if (selectedClientId !== 'all') {
      list = list.filter(t => t.client_id === selectedClientId);
    }

    // Tab filter
    if (activeTab === 'pending') {
      list = list.filter(t => t.status === 'pending' && !isOverdue(t));
    } else if (activeTab === 'completed') {
      list = list.filter(t => t.status === 'completed');
    } else if (activeTab === 'overdue') {
      list = list.filter(isOverdue);
    }

    return list;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-zinc-200" />
            Tarefas
          </h1>
          <p className="text-zinc-400 text-sm">Distribua e acompanhe tarefas vinculadas a funcionários e clientes.</p>
        </div>

        <Button 
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-black font-semibold rounded-xl transition-all shadow-lg shadow-zinc-900/20 active:scale-95 border-0 font-medium text-sm"
        >
          <Plus className="w-4 h-4" />
          Nova Tarefa
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-zinc-950/50 border-zinc-900 text-white shadow-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold text-zinc-400 uppercase">Total</CardTitle>
            <ClipboardList className="w-4 h-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black">{totalCount}</div>
            <p className="text-[10px] text-zinc-500 mt-1">Todas as tarefas registradas</p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-950/50 border-zinc-900 text-white shadow-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold text-zinc-400 uppercase">Pendentes</CardTitle>
            <Clock className="w-4 h-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-yellow-500">{pendingCount}</div>
            <p className="text-[10px] text-zinc-500 mt-1">Em dia, aguardando conclusão</p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-950/50 border-zinc-900 text-white shadow-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold text-zinc-400 uppercase">Concluídas</CardTitle>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-emerald-500">{completedCount}</div>
            <p className="text-[10px] text-zinc-500 mt-1">Atividades realizadas</p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-950/50 border-zinc-900 text-white shadow-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold text-zinc-400 uppercase">Atrasadas</CardTitle>
            <AlertTriangle className={cn("w-4 h-4", overdueCount > 0 ? "text-red-500 animate-bounce" : "text-zinc-500")} />
          </CardHeader>
          <CardContent>
            <div className={cn("text-2xl font-black", overdueCount > 0 ? "text-red-500" : "")}>{overdueCount}</div>
            <p className="text-[10px] text-zinc-500 mt-1">Prazo expirado e pendentes</p>
          </CardContent>
        </Card>
      </div>

      {/* Busca e Filtros */}
      <div className="bg-zinc-950/50 border border-zinc-900 p-4 rounded-2xl flex flex-col md:flex-row gap-4 items-center">
        {/* Search */}
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <Input 
            type="text" 
            placeholder="Buscar por título ou descrição..."
            className="w-full bg-black border border-zinc-900 text-white pl-10 pr-4 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-400/50 transition-all text-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Dropdowns */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Employee filter */}
          <div className="w-48">
            <Select value={selectedEmployeeId} onValueChange={(val) => setSelectedEmployeeId(val || 'all')}>
              <SelectTrigger className="bg-black border-zinc-900 text-white">
                <SelectValue placeholder="Funcionário: Todos" />
              </SelectTrigger>
              <SelectContent className="bg-black border-zinc-900 text-white">
                <SelectItem value="all">Funcionário: Todos</SelectItem>
                {employees.map(emp => (
                  <SelectItem key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Client filter */}
          <div className="w-48">
            <Select value={selectedClientId} onValueChange={(val) => setSelectedClientId(val || 'all')}>
              <SelectTrigger className="bg-black border-zinc-900 text-white">
                <SelectValue placeholder="Cliente: Todos" />
              </SelectTrigger>
              <SelectContent className="bg-black border-zinc-900 text-white">
                <SelectItem value="all">Cliente: Todos</SelectItem>
                {clients.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.first_name} {c.last_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button 
            variant="outline"
            onClick={fetchData}
            className="bg-black border border-zinc-900 text-zinc-400 hover:text-white rounded-xl"
          >
            <RefreshCw className={cn("w-5 h-5", loading && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* Tabs Filtros por Status */}
      <Tabs defaultValue="all" onValueChange={setActiveTab} className="w-full space-y-4">
        <TabsList className="bg-zinc-950 border border-zinc-900 p-1 rounded-xl">
          <TabsTrigger value="all" className="rounded-lg data-[state=active]:bg-zinc-900 data-[state=active]:text-white">Todas ({tasks.length})</TabsTrigger>
          <TabsTrigger value="pending" className="rounded-lg data-[state=active]:bg-zinc-900 data-[state=active]:text-white">Pendentes ({tasks.filter(t => t.status === 'pending' && !isOverdue(t)).length})</TabsTrigger>
          <TabsTrigger value="completed" className="rounded-lg data-[state=active]:bg-zinc-900 data-[state=active]:text-white">Concluídas ({tasks.filter(t => t.status === 'completed').length})</TabsTrigger>
          <TabsTrigger value="overdue" className="rounded-lg data-[state=active]:bg-red-500/10 data-[state=active]:text-red-400">Atrasadas ({tasks.filter(isOverdue).length})</TabsTrigger>
        </TabsList>

        {/* Tabela de Tarefas */}
        <div className="bg-zinc-950/50 border border-zinc-900 rounded-2xl overflow-hidden shadow-xl">
          <Table className="w-full text-left border-collapse">
            <TableHeader>
              <TableRow className="bg-black/50 border-b border-zinc-900 hover:bg-transparent">
                <TableHead className="w-10 p-4"></TableHead>
                <TableHead className="p-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Atividade</TableHead>
                <TableHead className="p-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Responsável</TableHead>
                <TableHead className="p-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Cliente</TableHead>
                <TableHead className="p-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Projeto</TableHead>
                <TableHead className="p-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Prazo de Entrega</TableHead>
                <TableHead className="p-4 text-xs font-bold text-zinc-500 uppercase tracking-wider text-right"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-zinc-900/50">
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="p-12 text-center">
                    <Loader2 className="w-8 h-8 text-zinc-200 animate-spin mx-auto mb-2" />
                    <p className="text-zinc-500 text-sm font-medium">Carregando tarefas...</p>
                  </TableCell>
                </TableRow>
              ) : getFilteredTasks().length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="p-12 text-center">
                    <ClipboardList className="w-12 h-12 text-zinc-900 mx-auto mb-3" />
                    <p className="text-zinc-400 font-medium">Nenhuma tarefa encontrada</p>
                    <p className="text-zinc-600 text-sm">Use o botão no topo para registrar uma nova tarefa.</p>
                  </TableCell>
                </TableRow>
              ) : (
                getFilteredTasks().map((task) => {
                  const overdue = isOverdue(task);
                  const empName = task.employees 
                    ? `${task.employees.first_name} ${task.employees.last_name}`
                    : 'Não Atribuído';
                  const clientName = task.clients 
                    ? `${task.clients.first_name} ${task.clients.last_name}`
                    : 'Nenhum';

                  return (
                    <TableRow key={task.id} className="hover:bg-zinc-900/30 transition-colors group">
                      <TableCell className="p-4 text-center">
                        <button 
                          onClick={() => toggleStatus(task)}
                          className="text-zinc-500 hover:text-white transition-colors"
                        >
                          {task.status === 'completed' ? (
                            <CheckSquare className="w-5 h-5 text-emerald-500" />
                          ) : (
                            <Square className={cn("w-5 h-5", overdue ? "text-red-500" : "text-zinc-600")} />
                          )}
                        </button>
                      </TableCell>

                      <TableCell className="p-4">
                        <div className="flex flex-col">
                          <span className={cn(
                            "text-sm font-bold text-white transition-all",
                            task.status === 'completed' && "line-through text-zinc-500 font-normal"
                          )}>
                            {task.title}
                          </span>
                          {task.description && (
                            <p className="text-xs text-zinc-500 mt-0.5 line-clamp-1 max-w-xs">{task.description}</p>
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="p-4">
                        <div className="flex items-center gap-2 text-sm text-zinc-300">
                          <User className="w-3.5 h-3.5 text-zinc-500" />
                          {empName}
                        </div>
                      </TableCell>

                      <TableCell className="p-4 font-medium">
                        {task.client_id ? (
                          <div className="flex items-center gap-2 text-sm text-zinc-300">
                            <Building2 className="w-3.5 h-3.5 text-zinc-500" />
                            {clientName}
                          </div>
                        ) : (
                          <span className="text-xs text-zinc-600 italic">Nenhum</span>
                        )}
                      </TableCell>

                      <TableCell className="p-4 font-medium">
                        {task.project_id && task.projects ? (
                          <Badge className="bg-zinc-900 border border-zinc-800 text-zinc-300 text-[10px] font-medium font-mono uppercase rounded-lg">
                            {task.projects.name}
                          </Badge>
                        ) : (
                          <span className="text-xs text-zinc-600 italic">Nenhum</span>
                        )}
                      </TableCell>

                      <TableCell className="p-4 text-xs font-medium">
                        {task.due_date ? (
                          <div className={cn(
                            "flex items-center gap-1.5",
                            task.status === 'completed' ? "text-zinc-500" :
                            overdue ? "text-red-400 font-bold" : "text-zinc-400"
                          )}>
                            <Calendar className="w-3.5 h-3.5" />
                            {new Date(task.due_date).toLocaleDateString('pt-BR')}
                            {overdue && <span className="text-[9px] px-1 py-0.25 bg-red-950 text-red-400 border border-red-900 rounded font-bold ml-1 uppercase">Atrasado</span>}
                          </div>
                        ) : (
                          <span className="text-xs text-zinc-600 italic">Sem prazo</span>
                        )}
                      </TableCell>

                      <TableCell className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleOpenModal(task)}
                            className="h-8 w-8 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900 rounded-lg"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleDelete(task.id)}
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
      </Tabs>

      {/* Cadastro/Edição Dialog */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-xl bg-zinc-950 border-zinc-900 text-white rounded-3xl overflow-hidden p-0 shadow-2xl">
          <DialogHeader className="p-6 pb-4 bg-gradient-to-r from-black to-zinc-950 border-b border-zinc-900">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-zinc-100 text-black/20 flex items-center justify-center text-zinc-200 border border-zinc-800">
                <ClipboardList className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-white">
                  {editingTask ? 'Editar Tarefa' : 'Nova Tarefa'}
                </DialogTitle>
                <DialogDescription className="text-xs text-zinc-400">
                  {editingTask ? 'Modifique os detalhes da tarefa selecionada.' : 'Preencha os campos para programar uma nova atividade.'}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleSave} className="p-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="title">Título da Atividade *</Label>
              <Input 
                required
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="bg-black border-zinc-900 text-white focus-visible:ring-zinc-400"
                placeholder="Ex: Desenvolver página de checkout"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">Descrição (Opcional)</Label>
              <Textarea 
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="bg-black border-zinc-900 text-white focus-visible:ring-zinc-400 min-h-[80px]"
                placeholder="Ex: Adicionar tratamento de erros e conectar com o gateway de pagamentos."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="dueDate">Prazo de Entrega</Label>
                <Input 
                  id="dueDate"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="bg-black border-zinc-900 text-white focus-visible:ring-zinc-400"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="status">Status</Label>
                <Select value={status} onValueChange={(val) => setStatus(val || 'pending')}>
                  <SelectTrigger className="bg-black border-zinc-900 text-white focus:ring-zinc-400">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent className="bg-black border-zinc-900 text-white">
                    <SelectItem value="pending">Pendente</SelectItem>
                    <SelectItem value="completed">Concluída</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="employee">Responsável (Colaborador)</Label>
                <Select value={employeeId} onValueChange={(val) => setEmployeeId(val || 'none')}>
                  <SelectTrigger className="bg-black border-zinc-900 text-white focus:ring-zinc-400">
                    <SelectValue placeholder="Não atribuído" />
                  </SelectTrigger>
                  <SelectContent className="bg-black border-zinc-900 text-white">
                    <SelectItem value="none">Não atribuído</SelectItem>
                    {employees.map(emp => (
                      <SelectItem key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="client">Cliente Associado</Label>
                <Select value={clientId} onValueChange={(val) => {
                  setClientId(val || 'none');
                  setProjectId('none'); // reset project if client changes
                }}>
                  <SelectTrigger className="bg-black border-zinc-900 text-white focus:ring-zinc-400">
                    <SelectValue placeholder="Nenhum cliente" />
                  </SelectTrigger>
                  <SelectContent className="bg-black border-zinc-900 text-white">
                    <SelectItem value="none">Nenhum cliente</SelectItem>
                    {clients.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.first_name} {c.last_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="project">Projeto Associado (Opcional)</Label>
              <Select value={projectId} onValueChange={(val) => setProjectId(val || 'none')}>
                <SelectTrigger className="bg-black border-zinc-900 text-white focus:ring-zinc-400">
                  <SelectValue placeholder="Nenhum projeto" />
                </SelectTrigger>
                <SelectContent className="bg-black border-zinc-900 text-white">
                  <SelectItem value="none">Nenhum projeto</SelectItem>
                  {projects
                    .filter(p => clientId === 'none' || p.client_id === clientId)
                    .map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
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
                  'Salvar Tarefa'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
