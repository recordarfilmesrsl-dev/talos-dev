'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Users, 
  Search, 
  Filter, 
  Plus, 
  MoreVertical, 
  Mail, 
  Phone, 
  Calendar,
  ExternalLink,
  Download,
  Loader2,
  RefreshCw,
  X,
  Trash2,
  Save,
  CheckCircle2,
  DollarSign
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { ConvertLeadModal } from '@/components/ConvertLeadModal';

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

const statusConfig: Record<string, { label: string; class: string }> = {
  new: { label: 'Novo', class: 'bg-zinc-900 text-zinc-300 border-zinc-800' },
  contacted: { label: 'Em Contato', class: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
  qualified: { label: 'Qualificado', class: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
  proposal: { label: 'Proposta', class: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' },
  negotiation: { label: 'Negociação', class: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
  closed: { label: 'Fechado', class: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
};

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    status: 'new',
    source: '',
    value: 0
  });

  // Conversão de Lead
  const [conversionLead, setConversionLead] = useState<Lead | null>(null);
  const [isConversionOpen, setIsConversionOpen] = useState(false);

  const fetchLeads = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLeads(data || []);
    } catch (err) {
      console.error('Error fetching leads:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  useEffect(() => {
    const originalStyle = window.getComputedStyle(document.body).overflow;
    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
      // Prevent layout shift
      document.body.style.paddingRight = `${window.innerWidth - document.documentElement.clientWidth}px`;
    } else {
      document.body.style.overflow = originalStyle;
      document.body.style.paddingRight = '0px';
    }
    return () => {
      document.body.style.overflow = originalStyle;
      document.body.style.paddingRight = '0px';
    };
  }, [isModalOpen]);

  const handleOpenModal = (lead?: Lead) => {
    if (lead) {
      setEditingLead(lead);
      setFormData({
        first_name: lead.first_name,
        last_name: lead.last_name,
        email: lead.email,
        phone: lead.phone,
        status: lead.status,
        source: lead.source,
        value: Number(lead.value)
      });
    } else {
      setEditingLead(null);
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        status: 'new',
        source: '',
        value: 0
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      let savedLead = null;
      const isNew = !editingLead;

      if (editingLead) {
        const { data, error } = await supabase
          .from('leads')
          .update(formData)
          .eq('id', editingLead.id)
          .select()
          .single();
        if (error) throw error;
        savedLead = data;
      } else {
        const { data, error } = await supabase
          .from('leads')
          .insert([formData])
          .select()
          .single();
        if (error) throw error;
        savedLead = data;
      }
      await fetchLeads();
      setIsModalOpen(false);



      if (formData.status === 'closed' && savedLead) {
        setConversionLead(savedLead);
        setIsConversionOpen(true);
      }
    } catch (err) {
      console.error('Error saving lead:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este lead?')) return;
    try {
      const { error } = await supabase.from('leads').delete().eq('id', id);
      if (error) throw error;
      setLeads(prev => prev.filter(l => l.id !== id));
      if (editingLead?.id === id) setIsModalOpen(false);
    } catch (err) {
      console.error('Error deleting lead:', err);
    }
  };

  const handleExportCSV = () => {
    if (leads.length === 0) return;

    // Usando ponto e vírgula (;) como separador para melhor compatibilidade com Excel em PT-BR
    const headers = ['Nome', 'Sobrenome', 'Email', 'Telefone', 'Status', 'Origem', 'Valor', 'Data'];
    const csvRows = [
      headers.join(';'),
      ...leads.map(lead => [
        lead.first_name.replace(/;/g, ' '),
        lead.last_name.replace(/;/g, ' '),
        lead.email,
        lead.phone,
        statusConfig[lead.status]?.label || lead.status,
        (lead.source || '').replace(/;/g, ' '),
        lead.value.toString().replace('.', ','), // Formato de moeda PT-BR
        new Date(lead.created_at).toLocaleDateString('pt-BR')
      ].join(';'))
    ];

    const csvString = csvRows.join('\r\n');
    // Adicionando BOM (Byte Order Mark) para que o Excel reconheça o UTF-8 corretamente
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `leads-talos-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredLeads = leads.filter(lead => 
    `${lead.first_name} ${lead.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lead.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lead.source?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-zinc-200" />
            Gestão de Leads
          </h1>
          <p className="text-zinc-400 text-sm">Visualize e gerencie todos os seus contatos em um só lugar.</p>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-950 border border-zinc-900 text-zinc-300 rounded-xl hover:bg-zinc-900 transition-all text-sm active:scale-95"
          >
            <Download className="w-4 h-4" />
            Exportar
          </button>
          <button 
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-black font-semibold rounded-xl transition-all shadow-lg shadow-zinc-900/20 active:scale-95 font-medium text-sm"
          >
            <Plus className="w-4 h-4" />
            Novo Lead
          </button>
        </div>
      </div>

      {/* Filtros e Busca */}
      <div className="bg-zinc-950/50 border border-zinc-900 p-4 rounded-2xl flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input 
            type="text" 
            placeholder="Buscar por nome, email ou origem..."
            className="w-full bg-black border border-zinc-900 text-white pl-10 pr-4 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-400/50 transition-all text-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <button className="flex items-center gap-2 px-4 py-2 bg-black border border-zinc-900 text-zinc-400 rounded-xl hover:text-white transition-all text-sm w-full md:w-auto justify-center">
            <Filter className="w-4 h-4" />
            Filtros
          </button>
          <button 
            onClick={fetchLeads}
            className="p-2 bg-black border border-zinc-900 text-zinc-400 rounded-xl hover:text-white transition-all"
          >
            <RefreshCw className={cn("w-5 h-5", loading && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* Tabela de Leads */}
      <div className="bg-zinc-950/50 border border-zinc-900 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-black/50 border-b border-zinc-900">
                <th className="p-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Lead</th>
                <th className="p-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Status</th>
                <th className="p-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Origem</th>
                <th className="p-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Valor</th>
                <th className="p-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Data</th>
                <th className="p-4 text-xs font-bold text-zinc-500 uppercase tracking-wider"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900/50">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center">
                    <Loader2 className="w-8 h-8 text-zinc-200 animate-spin mx-auto mb-2" />
                    <p className="text-zinc-500 text-sm font-medium">Carregando leads...</p>
                  </td>
                </tr>
              ) : filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center">
                    <Users className="w-12 h-12 text-zinc-900 mx-auto mb-3" />
                    <p className="text-zinc-400 font-medium">Nenhum lead encontrado</p>
                    <p className="text-zinc-600 text-sm">Tente mudar os filtros ou a pesquisa.</p>
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-zinc-900/30 transition-colors group">
                    <td className="p-4" onClick={() => handleOpenModal(lead)}>
                      <div className="flex items-center gap-3 cursor-pointer">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800/50 flex items-center justify-center text-zinc-400 group-hover:text-zinc-300 transition-all font-bold uppercase tracking-tighter">
                          {lead.first_name[0]}{lead.last_name[0]}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-white group-hover:text-zinc-300 transition-colors">
                            {lead.first_name} {lead.last_name}
                          </div>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="flex items-center gap-1 text-[10px] text-zinc-500">
                              <Mail className="w-3 h-3" />
                              {lead.email}
                            </span>
                            <span className="flex items-center gap-1 text-[10px] text-zinc-500">
                              <Phone className="w-3 h-3" />
                              {lead.phone}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={cn(
                        "text-[10px] font-bold px-2 py-1 rounded-lg border",
                        statusConfig[lead.status]?.class || 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
                      )}>
                        {statusConfig[lead.status]?.label || lead.status}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-zinc-400 font-medium">
                      {lead.source}
                    </td>
                    <td className="p-4">
                      <div className="text-sm font-bold text-emerald-400">
                        R$ {Number(lead.value).toLocaleString('pt-BR')}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2 text-xs text-zinc-500">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(lead.created_at).toLocaleDateString('pt-BR')}
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handleOpenModal(lead)}
                          className="p-2 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900 rounded-lg transition-all" 
                          title="Editar lead"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(lead.id)}
                          className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                          title="Excluir lead"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CRUD Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md z-[100]"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-[#000000] border border-zinc-800 rounded-3xl shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col max-h-[90vh] z-[101]"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-zinc-900 flex items-center justify-between bg-gradient-to-r from-zinc-950 to-black">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-zinc-100 text-black/20 flex items-center justify-center text-zinc-200 border border-zinc-800">
                    {editingLead ? <RefreshCw className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">
                      {editingLead ? 'Editar Lead' : 'Novo Lead'}
                    </h2>
                    <p className="text-xs text-zinc-500">
                      {editingLead ? 'Atualize os dados do contato.' : 'Cadastre uma nova oportunidade.'}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-900 rounded-xl transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Form */}
              <div className="overflow-y-auto flex-1 custom-scrollbar">
                <form onSubmit={handleSave} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase ml-1">Nome</label>
                    <input 
                      required
                      type="text" 
                      className="w-full bg-black border border-zinc-900 text-white p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-400/50 transition-all text-sm"
                      placeholder="Ex: João"
                      value={formData.first_name}
                      onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase ml-1">Sobrenome</label>
                    <input 
                      required
                      type="text" 
                      className="w-full bg-black border border-zinc-900 text-white p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-400/50 transition-all text-sm"
                      placeholder="Ex: Silva"
                      value={formData.last_name}
                      onChange={(e) => setFormData({...formData, last_name: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase ml-1">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                    <input 
                      required
                      type="email" 
                      className="w-full bg-black border border-zinc-900 text-white pl-10 pr-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-400/50 transition-all text-sm"
                      placeholder="joao@empresa.com"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase ml-1">Telefone</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                      <input 
                        required
                        type="text" 
                        className="w-full bg-black border border-zinc-900 text-white pl-10 pr-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-400/50 transition-all text-sm"
                        placeholder="(11) 99999-9999"
                        value={formData.phone}
                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase ml-1">Valor (R$)</label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
                      <input 
                        type="number" 
                        className="w-full bg-black border border-zinc-900 text-white pl-10 pr-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-400/50 transition-all text-sm"
                        placeholder="0.00"
                        value={formData.value}
                        onChange={(e) => setFormData({...formData, value: Number(e.target.value)})}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase ml-1">Status</label>
                    <select 
                      className="w-full bg-black border border-zinc-900 text-white p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-400/50 transition-all text-sm appearance-none cursor-pointer"
                      value={formData.status}
                      onChange={(e) => setFormData({...formData, status: e.target.value})}
                    >
                      {Object.entries(statusConfig).map(([key, config]) => (
                        <option key={key} value={key}>{config.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase ml-1">Origem</label>
                    <input 
                      type="text" 
                      className="w-full bg-black border border-zinc-900 text-white p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-400/50 transition-all text-sm"
                      placeholder="Ex: WhatsApp"
                      value={formData.source}
                      onChange={(e) => setFormData({...formData, source: e.target.value})}
                    />
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-4 py-3 bg-zinc-900 text-zinc-300 rounded-xl hover:bg-zinc-800 transition-all font-bold text-sm"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    disabled={isSaving}
                    className="flex-[2] px-4 py-3 bg-zinc-100 text-black text-white rounded-xl hover:bg-zinc-200 transition-all shadow-lg shadow-zinc-900/20 font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50"
                  >
                    {isSaving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    {editingLead ? 'Salvar Alterações' : 'Criar Lead'}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConvertLeadModal
        isOpen={isConversionOpen}
        onClose={() => setIsConversionOpen(false)}
        lead={conversionLead}
        onSuccess={fetchLeads}
      />
    </div>
  );
}
