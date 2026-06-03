'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  FolderKanban,
  Plus,
  Search,
  RefreshCw,
  Calendar,
  Building2,
  DollarSign,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  Edit2,
  Trash2,
  Loader2,
  Briefcase,
  Layers,
  Sparkles
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Client {
  id: string;
  first_name: string;
  last_name: string;
}

interface Task {
  id: string;
  project_id: string | null;
  status: string;
}

interface Project {
  id: string;
  name: string;
  status: 'planning' | 'in_progress' | 'review' | 'completed';
  client_id: string | null;
  budget: number;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  clients: Client | null;
}

const COLUMNS = [
  { id: 'planning', title: 'Planejamento', color: 'text-zinc-400', bg: 'bg-zinc-950/20' },
  { id: 'in_progress', title: 'Em Execução', color: 'text-amber-400', bg: 'bg-amber-500/5' },
  { id: 'review', title: 'Em Revisão', color: 'text-purple-400', bg: 'bg-purple-500/5' },
  { id: 'completed', title: 'Concluído', color: 'text-emerald-400', bg: 'bg-emerald-500/5' }
] as const;

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Drag and Drop state
  const [draggedOverColumn, setDraggedOverColumn] = useState<string | null>(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [clientId, setClientId] = useState('none');
  const [budget, setBudget] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState<Project['status']>('planning');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch projects with client information
      const { data: projectsData, error: projError } = await supabase
        .from('projects')
        .select(`
          *,
          clients (
            id,
            first_name,
            last_name
          )
        `)
        .order('created_at', { ascending: false });

      if (projError) throw projError;

      // Fetch clients
      const { data: clientsData, error: clientError } = await supabase
        .from('clients')
        .select('id, first_name, last_name')
        .order('first_name');

      if (clientError) throw clientError;

      // Fetch tasks to compute completion percentage
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('id, project_id, status');

      if (tasksError) throw tasksError;

      setProjects(projectsData || []);
      setClients(clientsData || []);
      setTasks(tasksData || []);
    } catch (err) {
      console.error('Erro ao buscar dados de projetos:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOpenModal = (project?: Project) => {
    if (project) {
      setEditingProject(project);
      setName(project.name);
      setClientId(project.client_id || 'none');
      setBudget(project.budget?.toString() || '');
      setStartDate(project.start_date || '');
      setEndDate(project.end_date || '');
      setStatus(project.status);
    } else {
      setEditingProject(null);
      setName('');
      setClientId('none');
      setBudget('');
      setStartDate('');
      setEndDate('');
      setStatus('planning');
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSaving(true);
    try {
      const payload = {
        name,
        client_id: clientId === 'none' ? null : clientId,
        budget: budget ? parseFloat(budget) : 0,
        start_date: startDate || null,
        end_date: endDate || null,
        status
      };

      if (editingProject) {
        const { error } = await supabase
          .from('projects')
          .update(payload)
          .eq('id', editingProject.id);

        if (error) throw error;
        toast.success('Projeto atualizado com sucesso!');
      } else {
        const { error } = await supabase
          .from('projects')
          .insert([payload]);

        if (error) throw error;
        toast.success('Projeto cadastrado com sucesso!');
      }

      await fetchData();
      setIsModalOpen(false);
    } catch (err) {
      console.error('Erro ao salvar projeto:', err);
      toast.error('Erro ao salvar o projeto.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza de que deseja excluir este projeto? Todas as tarefas vinculadas serão afetadas.')) return;
    try {
      const { error } = await supabase.from('projects').delete().eq('id', id);
      if (error) throw error;
      setProjects(prev => prev.filter(p => p.id !== id));
      toast.success('Projeto excluído com sucesso!');
    } catch (err) {
      console.error('Erro ao deletar projeto:', err);
      toast.error('Erro ao deletar projeto.');
    }
  };

  const moveStatus = async (project: Project, direction: 'prev' | 'next') => {
    const statuses: Project['status'][] = ['planning', 'in_progress', 'review', 'completed'];
    const currentIndex = statuses.indexOf(project.status);
    let nextIndex = currentIndex;

    if (direction === 'prev' && currentIndex > 0) {
      nextIndex = currentIndex - 1;
    } else if (direction === 'next' && currentIndex < statuses.length - 1) {
      nextIndex = currentIndex + 1;
    }

    if (nextIndex === currentIndex) return;

    const nextStatus = statuses[nextIndex];

    try {
      // Optimistic update
      setProjects(prev => prev.map(p => p.id === project.id ? { ...p, status: nextStatus } : p));

      const { error } = await supabase
        .from('projects')
        .update({ status: nextStatus })
        .eq('id', project.id);

      if (error) throw error;
      toast.success('Status do projeto atualizado!');
    } catch (err) {
      console.error('Erro ao mover status do projeto:', err);
      toast.error('Erro ao mover status do projeto.');
      // Rollback
      setProjects(prev => prev.map(p => p.id === project.id ? { ...p, status: project.status } : p));
    }
  };

  // Helper values
  const filteredProjects = projects.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.clients && `${p.clients.first_name} ${p.clients.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Metrics
  const totalBudget = projects.reduce((acc, p) => acc + (Number(p.budget) || 0), 0);
  const activeCount = projects.filter(p => p.status !== 'completed').length;
  const completedCount = projects.filter(p => p.status === 'completed').length;

  return (
    <div className="space-y-6 font-mono">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <FolderKanban className="w-6 h-6 text-zinc-200" />
            Quadro de Projetos
          </h1>
          <p className="text-zinc-400 text-xs mt-0.5">Gerencie os projetos ativos de pós-venda dos seus clientes.</p>
        </div>

        <Button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-black font-semibold rounded-xl transition-all shadow-lg active:scale-95 border-0 font-medium text-xs cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Novo Projeto
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-zinc-950/50 border-zinc-900 text-white shadow-xl rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Projetos Ativos</span>
            <Layers className="w-4 h-4 text-zinc-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-white">{activeCount}</div>
            <p className="text-[10px] text-zinc-500 mt-1">Em andamento ou planejamento</p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-950/50 border-zinc-900 text-white shadow-xl rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Concluídos</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-emerald-400">{completedCount}</div>
            <p className="text-[10px] text-zinc-500 mt-1">Entregas pós-vendas concluídas</p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-950/50 border-zinc-900 text-white shadow-xl rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Orçamento Consolidado</span>
            <DollarSign className="w-4 h-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-white">
              R$ {totalBudget.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[10px] text-zinc-500 mt-1">Faturamento total sob projetos</p>
          </CardContent>
        </Card>
      </div>

      {/* Busca e Atualização */}
      <div className="bg-zinc-950/50 border border-zinc-900 p-4 rounded-2xl flex flex-col sm:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <Input
            type="text"
            placeholder="Buscar por projeto ou cliente..."
            className="w-full bg-black border border-zinc-900 text-white pl-10 pr-4 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-400/50 transition-all text-xs"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button
          variant="outline"
          onClick={fetchData}
          className="bg-black border border-zinc-900 text-zinc-400 hover:text-white rounded-xl py-2 px-3 self-stretch sm:self-auto cursor-pointer"
        >
          <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
        </Button>
      </div>

      {/* Quadro Kanban */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5 items-start">
        {COLUMNS.map((column) => {
          const colProjects = filteredProjects.filter(p => p.status === column.id);

          return (
            <div key={column.id} className="flex flex-col gap-4">
              {/* Header da Coluna */}
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-2">
                  <span className={cn("w-1.5 h-1.5 rounded-full", 
                    column.id === 'planning' ? 'bg-zinc-400' :
                    column.id === 'in_progress' ? 'bg-amber-400' :
                    column.id === 'review' ? 'bg-purple-400' : 'bg-emerald-400'
                  )} />
                  <span className={cn("text-xs font-bold uppercase tracking-wider", column.color)}>
                    {column.title}
                  </span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-zinc-900 text-zinc-500 rounded-md">
                  {colProjects.length}
                </span>
              </div>

              {/* Lista de Cards da Coluna */}
              <div 
                onDragOver={(e) => e.preventDefault()}
                onDragEnter={() => setDraggedOverColumn(column.id)}
                onDrop={async (e) => {
                  e.preventDefault();
                  const projectId = e.dataTransfer.getData('text/plain');
                  if (projectId) {
                    const project = projects.find(p => p.id === projectId);
                    const targetStatus = column.id as Project['status'];
                    if (project && project.status !== targetStatus) {
                      try {
                        // Optimistic update
                        setProjects(prev => prev.map(p => p.id === projectId ? { ...p, status: targetStatus } : p));
                        const { error } = await supabase
                          .from('projects')
                          .update({ status: targetStatus })
                          .eq('id', projectId);

                        if (error) throw error;
                        toast.success('Status do projeto atualizado!');
                      } catch (err) {
                        console.error(err);
                        toast.error('Erro ao atualizar status do projeto.');
                        // Rollback
                        setProjects(prev => prev.map(p => p.id === projectId ? { ...p, status: project.status } : p));
                      }
                    }
                  }
                  setDraggedOverColumn(null);
                  setActiveDragId(null);
                }}
                className={cn(
                  "flex flex-col gap-3 p-2 rounded-2xl border min-h-[450px] transition-all duration-200", 
                  draggedOverColumn === column.id ? "border-zinc-100/20 border-dashed ring-2 ring-zinc-100/10 bg-zinc-900/40" : "border-dashed border-zinc-900",
                  column.bg
                )}
              >
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-12 text-zinc-600 gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span className="text-[10px]">Carregando...</span>
                  </div>
                ) : colProjects.length === 0 ? (
                  <div className="text-center py-12 text-[10px] text-zinc-600 italic">
                    Sem projetos
                  </div>
                ) : (
                  colProjects.map((project) => {
                    // Calcular progresso de tarefas
                    const projectTasks = tasks.filter(t => t.project_id === project.id);
                    const totalTasks = projectTasks.length;
                    const completedTasks = projectTasks.filter(t => t.status === 'completed').length;
                    const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

                    return (
                      <Card 
                        key={project.id} 
                        draggable={!loading}
                        onDragStart={(e) => {
                          e.dataTransfer.setData('text/plain', project.id);
                          setActiveDragId(project.id);
                        }}
                        onDragEnd={() => {
                          setActiveDragId(null);
                          setDraggedOverColumn(null);
                        }}
                        className={cn(
                          "bg-black rounded-2xl hover:border-zinc-800 transition-all duration-200 shadow-lg p-4 space-y-4 group/card relative overflow-hidden cursor-grab active:cursor-grabbing",
                          activeDragId === project.id ? "border-zinc-100/50 opacity-40" : "border-zinc-900"
                        )}
                      >
                        {/* Indicador de Orçamento rápido */}
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-xs font-bold text-white tracking-tight line-clamp-1 flex-1">
                            {project.name}
                          </h3>
                        </div>

                        {/* Informações do Cliente */}
                        {project.clients ? (
                          <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 bg-zinc-950/80 px-2 py-1 rounded-lg border border-zinc-900 w-fit">
                            <Building2 className="w-3 h-3 text-zinc-500" />
                            <span className="truncate max-w-[120px]">
                              {project.clients.first_name} {project.clients.last_name}
                            </span>
                          </div>
                        ) : (
                          <div className="text-[10px] text-zinc-600 italic">Sem cliente associado</div>
                        )}

                        {/* Orçamento e Prazos */}
                        <div className="grid grid-cols-2 gap-2 text-[9px] text-zinc-500">
                          <div>
                            <span className="block text-zinc-600 font-bold uppercase text-[8px]">Budget</span>
                            <span className="text-zinc-300 font-bold">
                              R$ {project.budget?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                          <div>
                            <span className="block text-zinc-600 font-bold uppercase text-[8px]">Entrega</span>
                            <span className="text-zinc-300">
                              {project.end_date ? new Date(project.end_date).toLocaleDateString('pt-BR') : 'Sem prazo'}
                            </span>
                          </div>
                        </div>

                        {/* Progresso de Tarefas do Projeto */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[8px] font-bold">
                            <span className="text-zinc-500 uppercase">Tarefas</span>
                            <span className={cn(progressPercent === 100 ? "text-emerald-400" : "text-zinc-400")}>
                              {completedTasks}/{totalTasks} ({progressPercent}%)
                            </span>
                          </div>
                          <div className="w-full h-1 bg-zinc-900 rounded-full overflow-hidden">
                            <div 
                              className={cn("h-full rounded-full transition-all duration-300", 
                                progressPercent === 100 ? "bg-emerald-500" : "bg-white"
                              )} 
                              style={{ width: `${progressPercent}%` }} 
                            />
                          </div>
                        </div>

                        {/* Ações e Controles de Direção */}
                        <div className="flex items-center justify-between pt-2 border-t border-zinc-950">
                          {/* Botões de Direção Rápida */}
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => moveStatus(project, 'prev')}
                              disabled={column.id === 'planning'}
                              className={cn(
                                "p-1 rounded-md bg-zinc-950 border border-zinc-900 text-zinc-400 hover:text-white transition-all cursor-pointer disabled:opacity-30 disabled:pointer-events-none"
                              )}
                            >
                              <ArrowLeft className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => moveStatus(project, 'next')}
                              disabled={column.id === 'completed'}
                              className={cn(
                                "p-1 rounded-md bg-zinc-950 border border-zinc-900 text-zinc-400 hover:text-white transition-all cursor-pointer disabled:opacity-30 disabled:pointer-events-none"
                              )}
                            >
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          </div>

                          {/* Editar / Remover */}
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleOpenModal(project)}
                              className="p-1 rounded-md text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900 transition-all cursor-pointer"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => handleDelete(project.id)}
                              className="p-1 rounded-md text-zinc-500 hover:text-red-400 hover:bg-red-400/10 transition-all cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </Card>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Dialog para Cadastro e Edição de Projeto */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md bg-zinc-950 border-zinc-900 text-white rounded-3xl overflow-hidden p-0 shadow-2xl">
          <DialogHeader className="p-6 pb-4 bg-gradient-to-r from-black to-zinc-950 border-b border-zinc-900">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-zinc-100 text-black flex items-center justify-center border border-zinc-800">
                <FolderKanban className="w-5 h-5 text-black" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-white">
                  {editingProject ? 'Editar Projeto' : 'Novo Projeto'}
                </DialogTitle>
                <DialogDescription className="text-xs text-zinc-400">
                  Defina os prazos, o cliente e o orçamento do projeto pós-venda.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleSave} className="p-6 space-y-4">
            {/* Nome do Projeto */}
            <div className="space-y-1.5">
              <Label htmlFor="name">Nome do Projeto *</Label>
              <Input
                required
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-black border-zinc-900 text-white focus-visible:ring-zinc-400 text-xs"
                placeholder="Ex: Landing Page Talos"
              />
            </div>

            {/* Seletor de Cliente */}
            <div className="space-y-1.5">
              <Label htmlFor="client">Cliente Associado</Label>
              <Select value={clientId} onValueChange={(val) => setClientId(val || 'none')}>
                <SelectTrigger className="bg-black border-zinc-900 text-white focus:ring-zinc-400 text-xs">
                  <SelectValue placeholder="Selecione um cliente" />
                </SelectTrigger>
                <SelectContent className="bg-black border-zinc-900 text-white">
                  <SelectItem value="none">Nenhum cliente</SelectItem>
                  {clients.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.first_name} {c.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Orçamento */}
              <div className="space-y-1.5">
                <Label htmlFor="budget">Orçamento (R$)</Label>
                <Input
                  id="budget"
                  type="number"
                  step="0.01"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  className="bg-black border-zinc-900 text-white focus-visible:ring-zinc-400 text-xs"
                  placeholder="Ex: 5000"
                />
              </div>

              {/* Status */}
              <div className="space-y-1.5">
                <Label htmlFor="status">Status</Label>
                <Select value={status} onValueChange={(val) => setStatus(val as Project['status'])}>
                  <SelectTrigger className="bg-black border-zinc-900 text-white focus:ring-zinc-400 text-xs">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent className="bg-black border-zinc-900 text-white">
                    <SelectItem value="planning">Planejamento</SelectItem>
                    <SelectItem value="in_progress">Em Execução</SelectItem>
                    <SelectItem value="review">Em Revisão</SelectItem>
                    <SelectItem value="completed">Concluído</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Data Início */}
              <div className="space-y-1.5">
                <Label htmlFor="startDate">Data de Início</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-black border-zinc-900 text-white focus-visible:ring-zinc-400 text-xs font-sans"
                />
              </div>

              {/* Data Fim */}
              <div className="space-y-1.5">
                <Label htmlFor="endDate">Previsão de Entrega</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-black border-zinc-900 text-white focus-visible:ring-zinc-400 text-xs font-sans"
                />
              </div>
            </div>

            <DialogFooter className="pt-4 border-t border-zinc-900 flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}
                className="bg-zinc-950 hover:bg-zinc-900 border-zinc-900 text-zinc-300 hover:text-white text-xs py-2 h-9 cursor-pointer"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSaving}
                className="bg-zinc-100 hover:bg-zinc-200 text-black font-semibold shadow-lg text-xs py-2 h-9 font-bold cursor-pointer"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" />
                    Salvando...
                  </>
                ) : (
                  'Salvar Projeto'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
