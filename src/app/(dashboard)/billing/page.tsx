'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  DollarSign,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  Plus,
  RefreshCw,
  Calendar,
  User,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Loader2,
  Edit2,
  Trash2,
  CheckSquare,
  Square,
  Building2,
  PlusCircle,
  FileText
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Client {
  id: string;
  first_name: string;
  last_name: string;
}

interface Contract {
  id: string;
  monthly_value: number;
  upsell_value: number;
  status: string;
  end_date: string;
}

interface Transaction {
  id: string;
  description: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  status: 'pending' | 'paid' | 'overdue';
  due_date: string;
  payment_date: string | null;
  client_id: string | null;
  created_at: string;
  clients: Client | null;
}

export default function BillingPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [activeTab, setActiveTab] = useState('all');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form fields
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('income');
  const [amount, setAmount] = useState(0);
  const [category, setCategory] = useState('other');
  const [status, setStatus] = useState<'pending' | 'paid' | 'overdue'>('pending');
  const [dueDate, setDueDate] = useState('');
  const [paymentDate, setPaymentDate] = useState('');
  const [clientId, setClientId] = useState('none');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      // 1. Fetch transactions
      const { data: txData, error: txError } = await supabase
        .from('financial_transactions')
        .select(`
          *,
          clients (
            id,
            first_name,
            last_name
          )
        `)
        .order('due_date', { ascending: false });

      if (txError) throw txError;

      // 2. Fetch active clients
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('id, first_name, last_name')
        .order('first_name');

      if (clientsError) throw clientsError;

      // 3. Fetch contracts to calculate MRR
      const { data: contractsData, error: contractsError } = await supabase
        .from('contracts')
        .select('id, monthly_value, upsell_value, status, end_date');

      if (contractsError) throw contractsError;

      setTransactions(txData || []);
      setClients(clientsData || []);
      setContracts(contractsData || []);
    } catch (err) {
      console.error('Error fetching billing data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOpenModal = (tx?: Transaction) => {
    if (tx) {
      setEditingTransaction(tx);
      setDescription(tx.description);
      setType(tx.type);
      setAmount(tx.amount);
      setCategory(tx.category);
      setStatus(tx.status);
      setDueDate(tx.due_date);
      setPaymentDate(tx.payment_date || '');
      setClientId(tx.client_id || 'none');
    } else {
      setEditingTransaction(null);
      setDescription('');
      setType('income');
      setAmount(0);
      setCategory('other');
      setStatus('pending');
      const today = new Date().toISOString().split('T')[0];
      setDueDate(today);
      setPaymentDate('');
      setClientId('none');
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || amount <= 0 || !dueDate) return;

    setIsSaving(true);
    try {
      const payload = {
        description,
        type,
        amount,
        category,
        status,
        due_date: dueDate,
        payment_date: status === 'paid' ? (paymentDate || new Date().toISOString().split('T')[0]) : null,
        client_id: type === 'income' && clientId !== 'none' ? clientId : null
      };

      if (editingTransaction) {
        const { error } = await supabase
          .from('financial_transactions')
          .update(payload)
          .eq('id', editingTransaction.id);

        if (error) throw error;
        toast.success('Lançamento atualizado com sucesso!');
      } else {
        const { error } = await supabase
          .from('financial_transactions')
          .insert([payload]);

        if (error) throw error;
        toast.success('Lançamento cadastrado com sucesso!');
      }

      await fetchData();
      setIsModalOpen(false);
    } catch (err) {
      console.error('Error saving transaction:', err);
      toast.error('Erro ao salvar lançamento.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este lançamento financeiro?')) return;
    try {
      const { error } = await supabase.from('financial_transactions').delete().eq('id', id);
      if (error) throw error;
      setTransactions(prev => prev.filter(t => t.id !== id));
      toast.success('Lançamento excluído com sucesso!');
    } catch (err) {
      console.error('Error deleting transaction:', err);
      toast.error('Erro ao excluir lançamento.');
    }
  };

  const handleTogglePaymentStatus = async (tx: Transaction) => {
    const newStatus = tx.status === 'paid' ? 'pending' : 'paid';
    const newPaymentDate = newStatus === 'paid' ? new Date().toISOString().split('T')[0] : null;

    try {
      // Optimistic update
      setTransactions(prev => prev.map(t => t.id === tx.id ? { ...t, status: newStatus, payment_date: newPaymentDate } : t));

      const { error } = await supabase
        .from('financial_transactions')
        .update({
          status: newStatus,
          payment_date: newPaymentDate
        })
        .eq('id', tx.id);

      if (error) throw error;
      toast.success(newStatus === 'paid' ? 'Lançamento marcado como pago!' : 'Lançamento marcado como pendente!');
    } catch (err) {
      console.error('Error toggling payment status:', err);
      // Rollback
      setTransactions(prev => prev.map(t => t.id === tx.id ? { ...t, status: tx.status, payment_date: tx.payment_date } : t));
      toast.error('Erro ao alterar status de pagamento.');
    }
  };

  const exportReceiptPDF = async (tx: Transaction) => {
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
      doc.text('RECIBO DE PAGAMENTO', 20, 25);
      
      doc.setFont('courier', 'normal');
      doc.setFontSize(10);
      doc.text(settings.company_name.toUpperCase(), 20, 35);

      // Company Info
      doc.setFontSize(8);
      doc.text(`E-mail: ${settings.company_email}`, 130, 20);
      doc.text(`Fone: ${settings.company_phone}`, 130, 26);
      doc.text(`Data Emissão: ${new Date().toLocaleDateString('pt-BR')}`, 130, 32);

      // Section 1: Transaction Details
      doc.setFillColor(244, 244, 245);
      doc.rect(20, 55, 170, 10, 'F');
      doc.setTextColor(9, 9, 11);
      doc.setFont('courier', 'bold');
      doc.setFontSize(11);
      doc.text('DETALHES DA TRANSAÇÃO / FATURAMENTO', 25, 62);

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
      
      const clientName = tx.clients ? `${tx.clients.first_name} ${tx.clients.last_name}` : 'Não associado';
      
      addField('DESCRIÇÃO', tx.description);
      addField('CLIENTE', clientName);
      addField('CATEGORIA', getCategoryLabel(tx.category));
      addField('TIPO', tx.type === 'income' ? 'Entrada (Receita)' : 'Saída (Despesa)');
      addField('STATUS', tx.status === 'paid' ? 'PAGO / LIQUIDADO' : tx.status === 'overdue' ? 'ATRASADO' : 'PENDENTE');
      addField('VENCIMENTO', new Date(tx.due_date).toLocaleDateString('pt-BR'));
      if (tx.payment_date) {
        addField('PAGAMENTO', new Date(tx.payment_date).toLocaleDateString('pt-BR'));
      }

      // Section 2: Total Amount
      y += 10;
      doc.setFillColor(244, 244, 245);
      doc.rect(20, y, 170, 10, 'F');
      doc.setFont('courier', 'bold');
      doc.text('VALOR TOTAL RECONHECIDO', 25, y + 7);

      y += 18;
      doc.setFont('courier', 'normal');
      doc.text('Item', 20, y);
      doc.text('Total', 140, y);
      
      y += 3;
      doc.setDrawColor(228, 228, 231);
      doc.line(20, y, 190, y);

      y += 8;
      doc.text(`${tx.description} - Ref #${tx.id.substring(0, 8)}`, 20, y);
      doc.setFont('courier', 'bold');
      doc.text(`R$ ${Number(tx.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 140, y);

      // Signature / Verification
      y += 30;
      doc.setFont('courier', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(113, 113, 122);
      doc.text('Este documento serve como recibo oficial de transação financeira.', 20, y);
      doc.text('Gerado automaticamente pelo ERP Talos.', 20, y + 5);

      // Signature line
      y += 25;
      doc.setDrawColor(200, 200, 200);
      doc.line(60, y, 150, y);
      doc.text('Representante de Faturamento / Talos ERP', 65, y + 6);

      doc.save(`recibo-talos-${tx.description.toLowerCase().replace(/\s+/g, '-')}.pdf`);
      toast.success('Recibo financeiro em PDF baixado com sucesso!');
    } catch (err) {
      console.error('Erro ao gerar recibo PDF:', err);
      toast.error('Erro ao exportar recibo PDF.');
    }
  };

  // Helper logic for dates
  const isOverdue = (tx: Transaction) => {
    if (tx.status === 'paid' || !tx.due_date) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(tx.due_date);
    due.setHours(0, 0, 0, 0);
    return due < today;
  };

  // Metrics (MRR from contracts, others from transactions)
  const today = new Date();
  const activeContracts = contracts.filter(c => {
    const end = new Date(c.end_date);
    end.setHours(0, 0, 0, 0);
    return c.status === 'active' && end >= today;
  });

  const totalMRR = activeContracts.reduce((acc, curr) => {
    return acc + (Number(curr.monthly_value || 0) + Number(curr.upsell_value || 0));
  }, 0);

  // Net Balance: paid income minus paid expenses
  const paidIncome = transactions
    .filter(t => t.type === 'income' && t.status === 'paid')
    .reduce((acc, curr) => acc + Number(curr.amount), 0);

  const paidExpense = transactions
    .filter(t => t.type === 'expense' && t.status === 'paid')
    .reduce((acc, curr) => acc + Number(curr.amount), 0);

  const netBalance = paidIncome - paidExpense;

  // Receivables: pending income + overdue income
  const totalReceivables = transactions
    .filter(t => t.type === 'income' && t.status !== 'paid')
    .reduce((acc, curr) => acc + Number(curr.amount), 0);

  // Payables: pending expense + overdue expense
  const totalPayables = transactions
    .filter(t => t.type === 'expense' && t.status !== 'paid')
    .reduce((acc, curr) => acc + Number(curr.amount), 0);

  // Apply filters
  const getFilteredTransactions = () => {
    let list = transactions;

    // Search query filter
    if (searchQuery.trim()) {
      list = list.filter(t => 
        t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.category.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Category filter
    if (selectedCategory !== 'all') {
      list = list.filter(t => t.category === selectedCategory);
    }

    // Tab filter
    if (activeTab === 'income') {
      list = list.filter(t => t.type === 'income');
    } else if (activeTab === 'expense') {
      list = list.filter(t => t.type === 'expense');
    } else if (activeTab === 'pending') {
      list = list.filter(t => t.status !== 'paid');
    }

    return list;
  };

  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case 'contract': return 'Contrato';
      case 'salary': return 'Salários/Pro Labore';
      case 'infrastructure': return 'Infraestrutura';
      case 'marketing': return 'Marketing';
      default: return 'Outros';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-zinc-200" />
            Gestão Financeira & Fluxo de Caixa
          </h1>
          <p className="text-zinc-400 text-sm">Controle de receitas, despesas, faturamento recorrente (MRR) e fluxo de caixa.</p>
        </div>

        <Button 
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-black font-semibold rounded-xl transition-all shadow-lg shadow-zinc-900/20 active:scale-95 border-0 font-medium text-sm"
        >
          <Plus className="w-4 h-4" />
          Novo Lançamento
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-zinc-950/50 border-zinc-900 text-white shadow-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold text-zinc-400 uppercase">Faturamento Recorrente (MRR)</CardTitle>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-emerald-400">R$ {totalMRR.toLocaleString('pt-BR')}</div>
            <p className="text-[10px] text-zinc-500 mt-1">Soma de todos os contratos ativos</p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-950/50 border-zinc-900 text-white shadow-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold text-zinc-400 uppercase">Saldo Mensal Realizado</CardTitle>
            {netBalance >= 0 ? (
              <ArrowUpRight className="w-4 h-4 text-emerald-500" />
            ) : (
              <ArrowDownRight className="w-4 h-4 text-red-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className={cn("text-2xl font-black", netBalance >= 0 ? "text-emerald-400" : "text-red-400")}>
              R$ {netBalance.toLocaleString('pt-BR')}
            </div>
            <p className="text-[10px] text-zinc-500 mt-1">Receitas pagas - Despesas pagas</p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-950/50 border-zinc-900 text-white shadow-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold text-zinc-400 uppercase">Contas a Receber</CardTitle>
            <Clock className="w-4 h-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-yellow-500">R$ {totalReceivables.toLocaleString('pt-BR')}</div>
            <p className="text-[10px] text-zinc-500 mt-1">Lançamentos de receita em aberto</p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-950/50 border-zinc-900 text-white shadow-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold text-zinc-400 uppercase">Contas a Pagar</CardTitle>
            <AlertTriangle className={cn("w-4 h-4", totalPayables > 0 ? "text-red-500 animate-pulse" : "text-zinc-500")} />
          </CardHeader>
          <CardContent>
            <div className={cn("text-2xl font-black", totalPayables > 0 ? "text-red-500" : "")}>R$ {totalPayables.toLocaleString('pt-BR')}</div>
            <p className="text-[10px] text-zinc-500 mt-1">Despesas pendentes de pagamento</p>
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
            placeholder="Buscar por descrição ou categoria..."
            className="w-full bg-black border border-zinc-900 text-white pl-10 pr-4 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-400/50 transition-all text-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="w-56">
            <Select value={selectedCategory} onValueChange={(val) => setSelectedCategory(val || 'all')}>
              <SelectTrigger className="bg-black border-zinc-900 text-white">
                <SelectValue placeholder="Categoria: Todas" />
              </SelectTrigger>
              <SelectContent className="bg-black border-zinc-900 text-white">
                <SelectItem value="all">Categoria: Todas</SelectItem>
                <SelectItem value="contract">Contrato</SelectItem>
                <SelectItem value="salary">Salários/Pro Labore</SelectItem>
                <SelectItem value="infrastructure">Infraestrutura</SelectItem>
                <SelectItem value="marketing">Marketing</SelectItem>
                <SelectItem value="other">Outros</SelectItem>
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

      {/* Tabs por Fluxo/Status */}
      <Tabs defaultValue="all" onValueChange={setActiveTab} className="w-full space-y-4">
        <TabsList className="bg-zinc-950 border border-zinc-900 p-1 rounded-xl">
          <TabsTrigger value="all" className="rounded-lg data-[state=active]:bg-zinc-900 data-[state=active]:text-white">Todos ({transactions.length})</TabsTrigger>
          <TabsTrigger value="income" className="rounded-lg data-[state=active]:bg-zinc-900 data-[state=active]:text-white">Receitas / Entradas ({transactions.filter(t => t.type === 'income').length})</TabsTrigger>
          <TabsTrigger value="expense" className="rounded-lg data-[state=active]:bg-zinc-900 data-[state=active]:text-white">Despesas / Saídas ({transactions.filter(t => t.type === 'expense').length})</TabsTrigger>
          <TabsTrigger value="pending" className="rounded-lg data-[state=active]:bg-zinc-900 data-[state=active]:text-white">Contas Pendentes ({transactions.filter(t => t.status !== 'paid').length})</TabsTrigger>
        </TabsList>

        {/* Tabela Financeira */}
        <div className="bg-zinc-950/50 border border-zinc-900 rounded-2xl overflow-hidden shadow-xl">
          <Table className="w-full text-left border-collapse">
            <TableHeader>
              <TableRow className="bg-black/50 border-b border-zinc-900 hover:bg-transparent">
                <TableHead className="w-10 p-4"></TableHead>
                <TableHead className="p-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Descrição / Categoria</TableHead>
                <TableHead className="p-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Tipo</TableHead>
                <TableHead className="p-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Valor</TableHead>
                <TableHead className="p-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Vencimento</TableHead>
                <TableHead className="p-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Pagamento</TableHead>
                <TableHead className="p-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Status</TableHead>
                <TableHead className="p-4 text-xs font-bold text-zinc-500 uppercase tracking-wider text-right"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-zinc-900/50">
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="p-12 text-center">
                    <Loader2 className="w-8 h-8 text-zinc-200 animate-spin mx-auto mb-2" />
                    <p className="text-zinc-500 text-sm font-medium">Carregando fluxo de caixa...</p>
                  </TableCell>
                </TableRow>
              ) : getFilteredTransactions().length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="p-12 text-center">
                    <DollarSign className="w-12 h-12 text-zinc-900 mx-auto mb-3" />
                    <p className="text-zinc-400 font-medium">Nenhum lançamento encontrado</p>
                    <p className="text-zinc-600 text-sm">Registre receitas ou despesas usando o botão no topo.</p>
                  </TableCell>
                </TableRow>
              ) : (
                getFilteredTransactions().map((tx) => {
                  const clientName = tx.clients 
                    ? `${tx.clients.first_name} ${tx.clients.last_name}`
                    : null;
                  
                  const overdue = isOverdue(tx);

                  return (
                    <TableRow key={tx.id} className="hover:bg-zinc-900/30 transition-colors group">
                      <TableCell className="p-4 text-center">
                        <button 
                          onClick={() => handleTogglePaymentStatus(tx)}
                          className="text-zinc-500 hover:text-white transition-colors"
                          title={tx.status === 'paid' ? "Marcar como pendente" : "Marcar como pago"}
                        >
                          {tx.status === 'paid' ? (
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
                            tx.status === 'paid' && "line-through text-zinc-500 font-normal"
                          )}>
                            {tx.description}
                          </span>
                          <span className="text-[10px] text-zinc-500 font-semibold mt-0.5 uppercase tracking-wider">
                            {getCategoryLabel(tx.category)} {clientName ? `• Cliente: ${clientName}` : ''}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell className="p-4">
                        <Badge className={cn(
                          "border text-[10px] uppercase font-bold gap-1",
                          tx.type === 'income' 
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                            : "bg-red-500/10 text-red-400 border-red-500/20"
                        )}>
                          {tx.type === 'income' ? (
                            <>
                              <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
                              Entrada
                            </>
                          ) : (
                            <>
                              <ArrowDownRight className="w-3.5 h-3.5 text-red-400" />
                              Saída
                            </>
                          )}
                        </Badge>
                      </TableCell>

                      <TableCell className="p-4 font-bold text-white">
                        R$ {tx.amount.toLocaleString('pt-BR')}
                      </TableCell>

                      <TableCell className="p-4 text-xs font-medium text-zinc-400">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                          {new Date(tx.due_date).toLocaleDateString('pt-BR')}
                        </div>
                      </TableCell>

                      <TableCell className="p-4 text-xs font-medium text-zinc-400">
                        {tx.payment_date ? (
                          <div className="flex items-center gap-1.5 text-emerald-400">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {new Date(tx.payment_date).toLocaleDateString('pt-BR')}
                          </div>
                        ) : (
                          <span className="text-xs text-zinc-650 italic">Pendente</span>
                        )}
                      </TableCell>

                      <TableCell className="p-4">
                        <Badge className={cn(
                          "border text-[10px] uppercase font-bold",
                          tx.status === 'paid' 
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : overdue 
                              ? "bg-red-500/10 text-red-400 border-red-500/20"
                              : "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                        )}>
                          {tx.status === 'paid' ? 'Pago' : overdue ? 'Atrasado' : 'Pendente'}
                        </Badge>
                      </TableCell>

                      <TableCell className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => exportReceiptPDF(tx)}
                            className="h-8 w-8 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900 rounded-lg"
                            title="Gerar Recibo PDF"
                          >
                            <FileText className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleOpenModal(tx)}
                            className="h-8 w-8 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900 rounded-lg"
                            title="Editar lançamento"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleDelete(tx.id)}
                            className="h-8 w-8 text-zinc-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg"
                            title="Excluir lançamento"
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
                <DollarSign className="w-5 h-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-white">
                  {editingTransaction ? 'Editar Lançamento' : 'Novo Lançamento Financeiro'}
                </DialogTitle>
                <DialogDescription className="text-xs text-zinc-400">
                  {editingTransaction ? 'Modifique os detalhes da transação financeira.' : 'Insira as informações de receita ou despesa no fluxo de caixa.'}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleSave} className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="type">Tipo de Lançamento</Label>
                <Select 
                  value={type} 
                  onValueChange={(val) => {
                    setType(val as 'income' | 'expense');
                    if (val === 'expense') {
                      setClientId('none');
                    }
                  }}
                >
                  <SelectTrigger className="bg-black border-zinc-900 text-white focus:ring-zinc-400">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent className="bg-black border-zinc-900 text-white">
                    <SelectItem value="income">Entrada (Receita)</SelectItem>
                    <SelectItem value="expense">Saída (Despesa)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="category">Categoria</Label>
                <Select value={category} onValueChange={(val) => setCategory(val || 'other')}>
                  <SelectTrigger className="bg-black border-zinc-900 text-white focus:ring-zinc-400">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent className="bg-black border-zinc-900 text-white">
                    <SelectItem value="contract">Contrato (Mensalidade)</SelectItem>
                    <SelectItem value="salary">Salários/Pro Labore</SelectItem>
                    <SelectItem value="infrastructure">Infraestrutura</SelectItem>
                    <SelectItem value="marketing">Marketing</SelectItem>
                    <SelectItem value="other">Outros</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">Descrição / Identificação *</Label>
              <Input 
                required
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="bg-black border-zinc-900 text-white focus-visible:ring-zinc-400"
                placeholder="Ex: Mensalidade - Cliente Silva, Hospedagem AWS..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="amount">Valor (R$) *</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <Input 
                    required
                    id="amount"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="bg-black border-zinc-900 text-white pl-10 focus-visible:ring-zinc-400"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="status">Status</Label>
                <Select 
                  value={status} 
                  onValueChange={(val) => {
                    setStatus(val as 'pending' | 'paid' | 'overdue');
                    if (val !== 'paid') {
                      setPaymentDate('');
                    } else if (!paymentDate) {
                      setPaymentDate(new Date().toISOString().split('T')[0]);
                    }
                  }}
                >
                  <SelectTrigger className="bg-black border-zinc-900 text-white focus:ring-zinc-400">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent className="bg-black border-zinc-900 text-white">
                    <SelectItem value="pending">Pendente</SelectItem>
                    <SelectItem value="paid">Pago</SelectItem>
                    <SelectItem value="overdue">Atrasado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="dueDate">Data de Vencimento *</Label>
                <Input 
                  required
                  id="dueDate"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="bg-black border-zinc-900 text-white focus-visible:ring-zinc-400"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="paymentDate">Data de Pagamento</Label>
                <Input 
                  id="paymentDate"
                  type="date"
                  disabled={status !== 'paid'}
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="bg-black border-zinc-900 text-white focus-visible:ring-zinc-400 disabled:opacity-50"
                />
              </div>
            </div>

            {type === 'income' && (
              <div className="space-y-1.5">
                <Label htmlFor="client">Cliente Associado (Opcional)</Label>
                <Select value={clientId} onValueChange={(val) => setClientId(val || 'none')}>
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
            )}
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
              disabled={isSaving}
              onClick={handleSave}
              className="bg-zinc-100 hover:bg-zinc-200 text-black font-semibold shadow-lg shadow-zinc-900/20 font-bold"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Salvando...
                </>
              ) : (
                'Salvar Lançamento'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
