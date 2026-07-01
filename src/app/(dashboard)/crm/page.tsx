'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  ArrowRightLeft,
  Calendar,
  DollarSign,
  User,
  Loader2,
  RefreshCw,
  CheckCircle2,
  Clock,
  ArrowRight,
  ClipboardList,
  AlertTriangle,
  Edit2,
  Trash2,
  FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { ConvertLeadModal } from '@/components/ConvertLeadModal';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';

// Tipos
interface Lead {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  status: string;
  source: string;
  value: number;
  created_at: string;
}

interface Column {
  id: string;
  title: string;
  color: string;
}

const columns: Column[] = [
  { id: 'new', title: 'Novo', color: 'bg-white' },
  { id: 'contacted', title: 'Em Contato', color: 'bg-yellow-500' },
  { id: 'qualified', title: 'Qualificado', color: 'bg-purple-500' },
  { id: 'proposal', title: 'Proposta', color: 'bg-indigo-500' },
  { id: 'negotiation', title: 'Negociação', color: 'bg-orange-500' },
  { id: 'closed', title: 'Fechado', color: 'bg-emerald-500' },
];

export default function CRMPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [clients, setClients] = useState<{ id: string; lead_id: string }[]>([]);
  const [tasks, setTasks] = useState<{ id: string; client_id: string | null; status: string; due_date: string | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);


  // Conversão de Lead
  const [conversionLead, setConversionLead] = useState<Lead | null>(null);
  const [isConversionOpen, setIsConversionOpen] = useState(false);

  // Modal State para Cadastro/Edição
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Drag and drop state
  const [draggedOverColumn, setDraggedOverColumn] = useState<string | null>(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  // Form Fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [value, setValue] = useState('');
  const [source, setSource] = useState('');
  const [status, setStatus] = useState('new');

  const fetchLeads = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLeads(data || []);

      // Fetch clients to map to leads
      const { data: clientsData } = await supabase
        .from('clients')
        .select('id, lead_id');
      
      setClients(clientsData || []);

      // Fetch tasks to display counts
      const { data: tasksData } = await supabase
        .from('tasks')
        .select('id, client_id, status, due_date');
      
      setTasks(tasksData || []);
    } catch (err) {
      console.error('Error fetching leads/clients/tasks:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const getLeadTasksSummary = (leadId: string) => {
    const client = clients.find(c => c.lead_id === leadId);
    if (!client) return null;

    const clientTasks = tasks.filter(t => t.client_id === client.id);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const completed = clientTasks.filter(t => t.status === 'completed').length;
    const overdue = clientTasks.filter(t => {
      if (t.status === 'completed' || !t.due_date) return false;
      const due = new Date(t.due_date);
      due.setHours(0, 0, 0, 0);
      return due < today;
    }).length;
    const pending = clientTasks.filter(t => t.status === 'pending' && !(() => {
      if (!t.due_date) return false;
      const due = new Date(t.due_date);
      due.setHours(0, 0, 0, 0);
      return due < today;
    })()).length;

    return {
      total: clientTasks.length,
      completed,
      pending,
      overdue
    };
  };

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const handleOpenModal = (lead?: Lead, defaultStatus?: string) => {
    if (lead) {
      setEditingLead(lead);
      setFirstName(lead.first_name);
      setLastName(lead.last_name);
      setEmail(lead.email || '');
      setPhone(lead.phone || '');
      setValue(lead.value?.toString() || '0');
      setSource(lead.source || '');
      setStatus(lead.status || 'new');
    } else {
      setEditingLead(null);
      setFirstName('');
      setLastName('');
      setEmail('');
      setPhone('');
      setValue('0');
      setSource('');
      setStatus(defaultStatus || 'new');
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) return;

    setIsSaving(true);
    try {
      const payload = {
        first_name: firstName,
        last_name: lastName,
        email,
        phone,
        value: value ? parseFloat(value) : 0,
        source,
        status
      };

      let savedLead = null;
      const isNew = !editingLead;

      if (editingLead) {
        const { data, error } = await supabase
          .from('leads')
          .update(payload)
          .eq('id', editingLead.id)
          .select()
          .single();

        if (error) throw error;
        savedLead = data;
        toast.success('Lead atualizado com sucesso!');
      } else {
        const { data, error } = await supabase
          .from('leads')
          .insert([payload])
          .select()
          .single();

        if (error) throw error;
        savedLead = data;
        toast.success('Lead cadastrado com sucesso!');
      }

      await fetchLeads();
      setIsModalOpen(false);



      if (status === 'closed' && savedLead) {
        setConversionLead(savedLead);
        setIsConversionOpen(true);
      }
    } catch (err) {
      console.error('Erro ao salvar lead no CRM:', err);
      toast.error('Erro ao salvar o lead.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja remover este lead?')) return;
    try {
      const { error } = await supabase.from('leads').delete().eq('id', id);
      if (error) throw error;
      setLeads(prev => prev.filter(l => l.id !== id));
      setIsModalOpen(false);
      toast.success('Lead excluído com sucesso!');
    } catch (err) {
      console.error('Erro ao deletar lead:', err);
      toast.error('Erro ao deletar o lead.');
    }
  };

  const exportProposalPDF = async (lead: Lead) => {
    try {
      const { data: settingsData } = await supabase.from('settings').select('*').limit(1);
      const settings = settingsData?.[0] || {
        company_name: 'Talos Tech',
        company_email: 'contato@talostech.com',
        company_phone: '(11) 99999-9999'
      };

      const doc = new jsPDF();

      // Header Banner
      doc.setFillColor(9, 9, 11);
      doc.rect(0, 0, 210, 45, 'F');

      // Header Text
      doc.setTextColor(255, 255, 255);
      doc.setFont('courier', 'bold');
      doc.setFontSize(22);
      doc.text(settings.company_name.toUpperCase(), 20, 25);
      
      doc.setFont('courier', 'normal');
      doc.setFontSize(10);
      doc.text('PROPOSTA COMERCIAL COM CRM INTEGRADO', 20, 35);

      // Company Info
      doc.setFontSize(8);
      doc.text(`E-mail: ${settings.company_email}`, 130, 20);
      doc.text(`Fone: ${settings.company_phone}`, 130, 26);
      doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, 130, 32);

      // Section 1: Details
      doc.setFillColor(244, 244, 245);
      doc.rect(20, 55, 170, 10, 'F');
      doc.setTextColor(9, 9, 11);
      doc.setFont('courier', 'bold');
      doc.setFontSize(11);
      doc.text('DETALHES DO LEAD / OPORTUNIDADE', 25, 62);

      doc.setFont('courier', 'normal');
      doc.setFontSize(10);
      let y = 75;
      const addField = (label: string, val: string) => {
        doc.setFont('courier', 'bold');
        doc.text(`${label}:`, 20, y);
        doc.setFont('courier', 'normal');
        doc.text(val, 65, y);
        y += 8;
      };
      
      addField('CLIENTE PROSPECTADO', `${lead.first_name} ${lead.last_name}`);
      addField('E-MAIL DE CONTATO', lead.email || 'Não informado');
      addField('TELEFONE', lead.phone || 'Não informado');
      addField('ORIGEM DO LEAD', lead.source || 'Não informado');
      addField('DATA DE INGRESSO', new Date(lead.created_at).toLocaleDateString('pt-BR'));

      // Section 2: Financials
      y += 10;
      doc.setFillColor(244, 244, 245);
      doc.rect(20, y, 170, 10, 'F');
      doc.setFont('courier', 'bold');
      doc.text('VALORES DA PROPOSTA', 25, y + 7);

      y += 18;
      doc.setFont('courier', 'normal');
      doc.text('Descrição do Serviço', 20, y);
      doc.text('Valor Total', 140, y);
      
      y += 3;
      doc.setDrawColor(228, 228, 231);
      doc.line(20, y, 190, y);

      y += 8;
      doc.text(`Proposta Comercial - Lead #${lead.id.substring(0, 8)}`, 20, y);
      doc.setFont('courier', 'bold');
      doc.text(`R$ ${Number(lead.value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 140, y);

      // Terms
      y += 30;
      doc.setFont('courier', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(113, 113, 122);
      doc.text('Esta proposta tem validade de 15 dias úteis a partir da data de geração.', 20, y);
      doc.text('Ao assinar ou aprovar digitalmente, o cliente concorda com os termos propostos.', 20, y + 5);

      // Signature
      y += 25;
      doc.setDrawColor(200, 200, 200);
      doc.line(20, y, 90, y);
      doc.line(120, y, 190, y);
      
      doc.text('Assinatura do Consultor', 20, y + 6);
      doc.text('Assinatura do Cliente', 120, y + 6);

      doc.save(`proposta-talos-${lead.first_name.toLowerCase()}.pdf`);
      toast.success('Proposta comercial em PDF baixada com sucesso!');
    } catch (err) {
      console.error('Erro ao gerar proposta PDF:', err);
      toast.error('Erro ao exportar proposta PDF.');
    }
  };

  const updateLeadStatus = async (id: string, newStatus: string) => {
    try {
      setUpdatingId(id);
      const { error } = await supabase
        .from('leads')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;
      
      // Update local state
      setLeads(prev => prev.map(l => l.id === id ? { ...l, status: newStatus } : l));
      toast.success('Fase do lead atualizada!');


    } catch (err) {
      console.error('Error updating lead status:', err);
      toast.error('Erro ao mover lead.');
    } finally {
      setUpdatingId(null);
    }
  };



  const handleNextPhase = (lead: Lead, currentStatus: string) => {
    const nextIdx = columns.findIndex(c => c.id === currentStatus) + 1;
    if (nextIdx < columns.length) {
      const nextStatus = columns[nextIdx].id;
      if (nextStatus === 'closed') {
        setConversionLead(lead);
        setIsConversionOpen(true);
      } else {
        updateLeadStatus(lead.id, nextStatus);
      }
    }
  };

  const filteredLeads = leads.filter(lead => 
    `${lead.first_name} ${lead.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lead.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lead.source?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getLeadsByStatus = (status: string) => filteredLeads.filter(l => l.status === status);

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] overflow-hidden">
      {/* Header da Página */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <ArrowRightLeft className="w-6 h-6 text-zinc-200" />
            CRM & Funil de Vendas
          </h1>
          <p className="text-zinc-400 text-sm">Dados reais conectados ao Supabase.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-zinc-200 transition-colors" />
            <input 
              type="text" 
              placeholder="Pesquisar leads..."
              className="bg-zinc-950/50 border border-zinc-900 text-white pl-10 pr-4 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-400/50 focus:border-zinc-400/50 transition-all w-64 text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button 
            onClick={fetchLeads}
            className="p-2 bg-zinc-950/50 border border-zinc-900 rounded-xl hover:bg-zinc-900 transition-colors text-zinc-400 hover:text-white"
            title="Atualizar dados"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button 
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-black font-semibold rounded-xl transition-all shadow-lg shadow-zinc-900/20 active:scale-95 font-medium text-sm cursor-pointer border-0"
          >
            <Plus className="w-4 h-4" />
            Novo Lead
          </button>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto pb-4 custom-scrollbar">
        <div className="flex gap-4 h-full min-w-max">
          {columns.map((column) => (
            <div 
              key={column.id} 
              onDragOver={(e) => e.preventDefault()}
              onDragEnter={() => setDraggedOverColumn(column.id)}
              onDrop={(e) => {
                e.preventDefault();
                const leadId = e.dataTransfer.getData('text/plain');
                if (leadId) {
                  if (column.id === 'closed') {
                    const lead = leads.find(l => l.id === leadId);
                    if (lead) {
                      setConversionLead(lead);
                      setIsConversionOpen(true);
                    }
                  } else {
                    updateLeadStatus(leadId, column.id);
                  }
                }
                setDraggedOverColumn(null);
                setActiveDragId(null);
              }}
              className={cn(
                "w-80 flex flex-col bg-zinc-950/30 border rounded-2xl overflow-hidden transition-all duration-200",
                draggedOverColumn === column.id ? "border-zinc-100/20 border-dashed ring-2 ring-zinc-100/10 bg-zinc-900/40" : "border-zinc-900/50"
              )}
            >
              {/* Header da Coluna */}
              <div className="p-4 flex items-center justify-between border-b border-zinc-900/50 bg-zinc-950/50">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${column.color}`} />
                  <h3 className="font-semibold text-white text-sm">{column.title}</h3>
                  <span className="bg-zinc-900 text-zinc-400 text-xs px-2 py-0.5 rounded-full font-mono">
                    {getLeadsByStatus(column.id).length}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-zinc-500 text-[10px] font-medium uppercase tracking-wider">
                  R$ {getLeadsByStatus(column.id).reduce((acc, curr) => acc + (Number(curr.value) || 0), 0).toLocaleString('pt-BR')}
                </div>
              </div>

              {/* Lista de Cards */}
              <div className="flex-1 p-3 flex flex-col gap-3 overflow-y-auto custom-scrollbar">
                {loading && leads.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 text-zinc-200 animate-spin" />
                  </div>
                ) : getLeadsByStatus(column.id).length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-zinc-900/30 rounded-2xl">
                    <div className="w-10 h-10 rounded-full bg-zinc-900/50 flex items-center justify-center mb-2 text-zinc-600">
                      <Clock className="w-5 h-5" />
                    </div>
                    <p className="text-zinc-600 text-xs font-medium">Sem leads nesta fase</p>
                  </div>
                ) : (
                  <AnimatePresence>
                    {getLeadsByStatus(column.id).map((lead) => (
                      <motion.div
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        key={lead.id}
                        className={cn(
                          updatingId === lead.id && "opacity-50 pointer-events-none",
                          activeDragId === lead.id ? "opacity-40" : ""
                        )}
                      >
                        <div
                          draggable={updatingId !== lead.id}
                          onDragStart={(e) => {
                            e.dataTransfer.setData('text/plain', lead.id);
                            setActiveDragId(lead.id);
                          }}
                          onDragEnd={() => {
                            setActiveDragId(null);
                            setDraggedOverColumn(null);
                          }}
                          onDoubleClick={() => handleOpenModal(lead)}
                          className={cn(
                            "bg-zinc-950 border p-4 rounded-2xl hover:border-zinc-700/50 transition-all cursor-pointer group relative shadow-xl",
                            activeDragId === lead.id ? "border-zinc-100/50" : "border-zinc-900"
                          )}
                        >
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-zinc-900 to-zinc-950 flex items-center justify-center text-zinc-400 border border-zinc-800/50 shadow-inner group-hover:from-zinc-800 group-hover:to-zinc-900 group-hover:text-zinc-300 transition-all">
                              <User className="w-5 h-5" />
                            </div>
                            <div>
                              <h4 className="text-white text-sm font-bold group-hover:text-zinc-300 transition-colors leading-tight">
                                {lead.first_name} {lead.last_name}
                              </h4>
                              <div className="flex items-center gap-1.5 mt-1">
                                <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider ${
                                  lead.source === 'WhatsApp' ? 'text-green-400 bg-green-400/10' :
                                  lead.source === 'Instagram' ? 'text-pink-400 bg-pink-400/10' :
                                  lead.source === 'Site' ? 'text-zinc-300 bg-zinc-800' :
                                  'text-purple-400 bg-purple-400/10'
                                }`}>
                                  {lead.source}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                exportProposalPDF(lead);
                              }}
                              className="text-zinc-500 hover:text-zinc-300 p-1 rounded-lg hover:bg-zinc-900 transition-all cursor-pointer"
                              title="Gerar Proposta PDF"
                            >
                              <FileText className="w-4 h-4" />
                            </button>

                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenModal(lead);
                              }}
                              className="text-zinc-500 hover:text-white p-1 rounded-lg hover:bg-zinc-900 transition-all cursor-pointer"
                              title="Editar lead"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-1.5 text-zinc-400">
                              <Calendar className="w-3.5 h-3.5" />
                              {new Date(lead.created_at).toLocaleDateString('pt-BR')}
                            </div>
                            <div className="flex items-center gap-1 text-emerald-400 font-bold bg-emerald-400/5 px-2 py-1 rounded-lg border border-emerald-400/10">
                              <DollarSign className="w-3 h-3" />
                              {Number(lead.value || 0).toLocaleString('pt-BR')}
                            </div>
                          </div>
                          
                          {(() => {
                            const summary = getLeadTasksSummary(lead.id);
                            if (!summary) return null;
                            return (
                              <div className="mt-2 pt-2 border-t border-zinc-900/30 flex items-center justify-between text-[10px] text-zinc-500">
                                <div className="flex items-center gap-1">
                                  <ClipboardList className="w-3.5 h-3.5 text-zinc-500" />
                                  <span>Tarefas: {summary.total}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  {summary.completed > 0 && (
                                    <span className="flex items-center gap-0.5 text-emerald-400" title="Concluídas">
                                      <CheckCircle2 className="w-3 h-3" />
                                      {summary.completed}
                                    </span>
                                  )}
                                  {summary.pending > 0 && (
                                    <span className="flex items-center gap-0.5 text-yellow-500" title="Pendentes">
                                      <Clock className="w-3 h-3" />
                                      {summary.pending}
                                    </span>
                                  )}
                                  {summary.overdue > 0 && (
                                    <span className="flex items-center gap-0.5 text-red-500 font-bold animate-pulse" title="Atrasadas">
                                      <AlertTriangle className="w-3 h-3" />
                                      {summary.overdue}
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })()}
                        </div>

                        {/* Ações de Mudança de Status */}
                        <div className="mt-4 pt-4 border-t border-zinc-900/50 flex items-center justify-between gap-2">
                          <div className="flex -space-x-1.5">
                            {[1, 2].map((i) => (
                              <div key={i} className="w-6 h-6 rounded-full border-2 border-zinc-950 bg-zinc-900 flex items-center justify-center text-[8px] text-white font-bold ring-1 ring-zinc-800/50 shadow-lg">
                                {i === 1 ? 'AT' : 'RS'}
                              </div>
                            ))}
                          </div>
                          
                          <div className="flex items-center gap-1">
                            {column.id !== 'closed' && (
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleNextPhase(lead, column.id);
                                }}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-100 text-black text-zinc-400 hover:text-white rounded-xl text-[10px] font-bold transition-all border border-zinc-800 hover:border-zinc-700 shadow-sm active:scale-95"
                              >
                                Próxima Fase
                                <ArrowRight className="w-3 h-3" />
                              </button>
                            )}
                            {column.id === 'closed' && (
                              <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-[10px]">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                CONCLUÍDO
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {updatingId === lead.id && (
                          <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center rounded-2xl">
                            <Loader2 className="w-6 h-6 text-zinc-200 animate-spin" />
                          </div>
                        )}
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                )}
                
                <button 
                  onClick={() => handleOpenModal(undefined, column.id)}
                  className="flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed border-zinc-900 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700 transition-all text-xs font-bold group cursor-pointer w-full"
                >
                  <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  ADICIONAR LEAD
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <ConvertLeadModal
        isOpen={isConversionOpen}
        onClose={() => setIsConversionOpen(false)}
        lead={conversionLead}
        onSuccess={fetchLeads}
      />

      {/* Dialog para Cadastro e Edição de Lead */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md bg-zinc-950 border-zinc-900 text-white rounded-3xl overflow-hidden p-0 shadow-2xl font-mono">
          <DialogHeader className="p-6 pb-4 bg-gradient-to-r from-black to-zinc-950 border-b border-zinc-900">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-zinc-100 text-black flex items-center justify-center border border-zinc-800">
                <User className="w-5 h-5 text-black" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-white">
                  {editingLead ? 'Editar Lead' : 'Novo Lead'}
                </DialogTitle>
                <DialogDescription className="text-xs text-zinc-400">
                  Preencha os campos para salvar a oportunidade no funil.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleSave} className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="firstName">Nome *</Label>
                <Input
                  required
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="bg-black border-zinc-900 text-white focus-visible:ring-zinc-400 text-xs"
                  placeholder="Ex: João"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lastName">Sobrenome *</Label>
                <Input
                  required
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="bg-black border-zinc-900 text-white focus-visible:ring-zinc-400 text-xs"
                  placeholder="Ex: Silva"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">E-mail *</Label>
              <Input
                required
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-black border-zinc-900 text-white focus-visible:ring-zinc-400 text-xs"
                placeholder="joao@email.com"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="phone">Telefone *</Label>
                <Input
                  required
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="bg-black border-zinc-900 text-white focus-visible:ring-zinc-400 text-xs"
                  placeholder="(11) 99999-9999"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="value">Valor Estimado (R$)</Label>
                <Input
                  id="value"
                  type="number"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  className="bg-black border-zinc-900 text-white focus-visible:ring-zinc-400 text-xs"
                  placeholder="0"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="status">Fase do Funil</Label>
                <Select value={status} onValueChange={(val) => setStatus(val || 'new')}>
                  <SelectTrigger className="bg-black border-zinc-900 text-white focus:ring-zinc-400 text-xs">
                    <SelectValue placeholder="Fase" />
                  </SelectTrigger>
                  <SelectContent className="bg-black border-zinc-900 text-white">
                    <SelectItem value="new">Novo</SelectItem>
                    <SelectItem value="contacted">Em Contato</SelectItem>
                    <SelectItem value="qualified">Qualificado</SelectItem>
                    <SelectItem value="proposal">Proposta</SelectItem>
                    <SelectItem value="negotiation">Negociação</SelectItem>
                    <SelectItem value="closed">Fechado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="source">Origem do Lead</Label>
                <Input
                  id="source"
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  className="bg-black border-zinc-900 text-white focus-visible:ring-zinc-400 text-xs"
                  placeholder="Ex: WhatsApp, Site"
                />
              </div>
            </div>

            <DialogFooter className="pt-4 border-t border-zinc-900 flex justify-between gap-3">
              {editingLead && (
                <Button
                  type="button"
                  onClick={() => handleDelete(editingLead.id)}
                  className="bg-red-950/20 hover:bg-red-950/40 text-red-400 border border-red-900/50 text-xs py-2 h-9 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" />
                  Excluir
                </Button>
              )}
              <div className="flex gap-2 ml-auto">
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
                    'Salvar Lead'
                  )}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #1e293b;
          border-radius: 20px;
          border: 2px solid #000000;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #334155;
        }
      `}</style>
    </div>
  );
}
