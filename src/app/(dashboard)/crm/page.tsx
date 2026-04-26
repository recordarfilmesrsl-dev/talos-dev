'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  MoreVertical, 
  Plus, 
  Search, 
  Filter, 
  ArrowRightLeft,
  Calendar,
  DollarSign,
  User,
  MoreHorizontal,
  Loader2,
  RefreshCw,
  CheckCircle2,
  Clock,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';

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
  { id: 'new', title: 'Novo', color: 'bg-blue-500' },
  { id: 'contacted', title: 'Em Contato', color: 'bg-yellow-500' },
  { id: 'qualified', title: 'Qualificado', color: 'bg-purple-500' },
  { id: 'proposal', title: 'Proposta', color: 'bg-indigo-500' },
  { id: 'negotiation', title: 'Negociação', color: 'bg-orange-500' },
  { id: 'closed', title: 'Fechado', color: 'bg-emerald-500' },
];

export default function CRMPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

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
    } catch (err) {
      console.error('Error updating lead status:', err);
    } finally {
      setUpdatingId(null);
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
            <ArrowRightLeft className="w-6 h-6 text-blue-500" />
            CRM & Funil de Vendas
          </h1>
          <p className="text-slate-400 text-sm">Dados reais conectados ao Supabase.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
            <input 
              type="text" 
              placeholder="Pesquisar leads..."
              className="bg-slate-900/50 border border-slate-800 text-white pl-10 pr-4 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all w-64 text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button 
            onClick={fetchLeads}
            className="p-2 bg-slate-900/50 border border-slate-800 rounded-xl hover:bg-slate-800 transition-colors text-slate-400 hover:text-white"
            title="Atualizar dados"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all shadow-lg shadow-blue-600/20 active:scale-95 font-medium text-sm">
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
              className="w-80 flex flex-col bg-slate-900/30 border border-slate-800/50 rounded-2xl overflow-hidden"
            >
              {/* Header da Coluna */}
              <div className="p-4 flex items-center justify-between border-b border-slate-800/50 bg-slate-900/50">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${column.color}`} />
                  <h3 className="font-semibold text-white text-sm">{column.title}</h3>
                  <span className="bg-slate-800 text-slate-400 text-xs px-2 py-0.5 rounded-full font-mono">
                    {getLeadsByStatus(column.id).length}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-slate-500 text-[10px] font-medium uppercase tracking-wider">
                  R$ {getLeadsByStatus(column.id).reduce((acc, curr) => acc + (Number(curr.value) || 0), 0).toLocaleString('pt-BR')}
                </div>
              </div>

              {/* Lista de Cards */}
              <div className="flex-1 p-3 flex flex-col gap-3 overflow-y-auto custom-scrollbar">
                {loading && leads.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                  </div>
                ) : getLeadsByStatus(column.id).length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-slate-800/30 rounded-2xl">
                    <div className="w-10 h-10 rounded-full bg-slate-800/50 flex items-center justify-center mb-2 text-slate-600">
                      <Clock className="w-5 h-5" />
                    </div>
                    <p className="text-slate-600 text-xs font-medium">Sem leads nesta fase</p>
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
                        className={`bg-slate-900 border border-slate-800 p-4 rounded-2xl hover:border-blue-500/50 transition-all cursor-pointer group relative shadow-xl ${updatingId === lead.id ? 'opacity-50 pointer-events-none' : ''}`}
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center text-slate-400 border border-slate-700/50 shadow-inner group-hover:from-blue-500/20 group-hover:to-blue-600/20 group-hover:text-blue-400 transition-all">
                              <User className="w-5 h-5" />
                            </div>
                            <div>
                              <h4 className="text-white text-sm font-bold group-hover:text-blue-400 transition-colors leading-tight">
                                {lead.first_name} {lead.last_name}
                              </h4>
                              <div className="flex items-center gap-1.5 mt-1">
                                <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider ${
                                  lead.source === 'WhatsApp' ? 'text-green-400 bg-green-400/10' :
                                  lead.source === 'Instagram' ? 'text-pink-400 bg-pink-400/10' :
                                  lead.source === 'Site' ? 'text-blue-400 bg-blue-400/10' :
                                  'text-purple-400 bg-purple-400/10'
                                }`}>
                                  {lead.source}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col items-end">
                            <button className="text-slate-600 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-all">
                              <MoreVertical className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-1.5 text-slate-400">
                              <Calendar className="w-3.5 h-3.5" />
                              {new Date(lead.created_at).toLocaleDateString('pt-BR')}
                            </div>
                            <div className="flex items-center gap-1 text-emerald-400 font-bold bg-emerald-400/5 px-2 py-1 rounded-lg border border-emerald-400/10">
                              <DollarSign className="w-3 h-3" />
                              {Number(lead.value || 0).toLocaleString('pt-BR')}
                            </div>
                          </div>
                        </div>

                        {/* Ações de Mudança de Status */}
                        <div className="mt-4 pt-4 border-t border-slate-800/50 flex items-center justify-between gap-2">
                          <div className="flex -space-x-1.5">
                            {[1, 2].map((i) => (
                              <div key={i} className="w-6 h-6 rounded-full border-2 border-slate-900 bg-slate-800 flex items-center justify-center text-[8px] text-white font-bold ring-1 ring-slate-700/50 shadow-lg">
                                {i === 1 ? 'AT' : 'RS'}
                              </div>
                            ))}
                          </div>
                          
                          <div className="flex items-center gap-1">
                            {column.id !== 'closed' && (
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const nextIdx = columns.findIndex(c => c.id === column.id) + 1;
                                  if (nextIdx < columns.length) updateLeadStatus(lead.id, columns[nextIdx].id);
                                }}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-blue-600 text-slate-400 hover:text-white rounded-xl text-[10px] font-bold transition-all border border-slate-700 hover:border-blue-500 shadow-sm active:scale-95"
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
                          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[1px] flex items-center justify-center rounded-2xl">
                            <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                )}
                
                <button className="flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed border-slate-800 text-slate-500 hover:text-blue-400 hover:border-blue-400/50 transition-all text-xs font-bold group">
                  <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  ADICIONAR LEAD
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

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
          border: 2px solid #020617;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #334155;
        }
      `}</style>
    </div>
  );
}
