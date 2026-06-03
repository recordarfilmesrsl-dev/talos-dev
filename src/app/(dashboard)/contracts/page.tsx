'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  Search,
  Plus,
  RefreshCw,
  Calendar,
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  CalendarDays,
  PlusCircle,
  Trash2,
  Building2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Client {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
}

interface Contract {
  id: string;
  client_id: string;
  monthly_value: number;
  start_date: string;
  end_date: string;
  billing_type: string;
  auto_renewal: boolean;
  status: string;
  upsell_value: number;
  created_at: string;
  clients: Client;
}

export default function ContractsPage() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [clientsList, setClientsList] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  // Modals state
  const [isNewContractOpen, setIsNewContractOpen] = useState(false);
  const [isRenewOpen, setIsRenewOpen] = useState(false);
  const [isUpsellOpen, setIsUpsellOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  
  const [isActionSaving, setIsActionSaving] = useState(false);

  // Form fields
  const [clientId, setClientId] = useState('');
  const [monthlyValue, setMonthlyValue] = useState(0);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [billingType, setBillingType] = useState('monthly');
  const [autoRenewal, setAutoRenewal] = useState('true');
  
  // Action fields (Renewal/Upsell)
  const [newEndDate, setNewEndDate] = useState('');
  const [upsellAmount, setUpsellAmount] = useState(0);

  const fetchContracts = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('contracts')
        .select(`
          *,
          clients (
            id,
            first_name,
            last_name,
            email,
            phone
          )
        `)
        .order('end_date', { ascending: true });

      if (error) throw error;
      setContracts(data || []);
    } catch (err) {
      console.error('Error fetching contracts:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchClients = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('id, first_name, last_name, email, phone')
        .order('first_name');
      if (error) throw error;
      setClientsList(data || []);
    } catch (err) {
      console.error('Error fetching clients for dropdown:', err);
    }
  }, []);

  useEffect(() => {
    fetchContracts();
    fetchClients();
  }, [fetchContracts, fetchClients]);

  // Contract analysis stats
  const totalMRR = contracts
    .filter(c => c.status === 'active' && new Date(c.end_date) >= new Date())
    .reduce((acc, curr) => acc + (Number(curr.monthly_value) + Number(curr.upsell_value || 0)), 0);

  const activeContractsCount = contracts
    .filter(c => c.status === 'active' && new Date(c.end_date) >= new Date()).length;

  const expiringContractsCount = contracts.filter(c => {
    if (c.status !== 'active') return false;
    const diffTime = new Date(c.end_date).getTime() - new Date().getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 30;
  }).length;

  // Filters logic
  const getFilteredContracts = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let list = contracts;

    if (activeTab === 'active') {
      list = contracts.filter(c => c.status === 'active' && new Date(c.end_date) >= today);
    } else if (activeTab === 'expiring') {
      list = contracts.filter(c => {
        if (c.status !== 'active') return false;
        const diffTime = new Date(c.end_date).getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays >= 0 && diffDays <= 30;
      });
    } else if (activeTab === 'expired') {
      list = contracts.filter(c => c.status === 'expired' || new Date(c.end_date) < today);
    }

    return list.filter(c => 
      `${c.clients?.first_name} ${c.clients?.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.clients?.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const handleOpenNewContract = () => {
    setClientId('');
    setMonthlyValue(0);
    const today = new Date().toISOString().split('T')[0];
    setStartDate(today);
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    setEndDate(nextYear.toISOString().split('T')[0]);
    setBillingType('monthly');
    setAutoRenewal('true');
    setIsNewContractOpen(true);
  };

  const handleSaveContract = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsActionSaving(true);
    try {
      const { error } = await supabase
        .from('contracts')
        .insert([
          {
            client_id: clientId,
            monthly_value: monthlyValue,
            start_date: startDate,
            end_date: endDate,
            billing_type: billingType,
            auto_renewal: autoRenewal === 'true',
            status: 'active',
            upsell_value: 0
          }
        ]);

      if (error) throw error;
      toast.success('Contrato criado com sucesso!');
      await fetchContracts();
      setIsNewContractOpen(false);
    } catch (err) {
      console.error('Error saving new contract:', err);
      toast.error('Erro ao criar contrato.');
    } finally {
      setIsActionSaving(false);
    }
  };

  const handleOpenRenew = (contract: Contract) => {
    setSelectedContract(contract);
    const currEnd = new Date(contract.end_date);
    currEnd.setFullYear(currEnd.getFullYear() + 1);
    setNewEndDate(currEnd.toISOString().split('T')[0]);
    setIsRenewOpen(true);
  };

  const handleRenew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContract) return;

    setIsActionSaving(true);
    try {
      const { error } = await supabase
        .from('contracts')
        .update({
          end_date: newEndDate,
          status: 'active'
        })
        .eq('id', selectedContract.id);

      if (error) throw error;
      toast.success('Contrato renovado com sucesso!');
      await fetchContracts();
      setIsRenewOpen(false);
    } catch (err) {
      console.error('Error renewing contract:', err);
      toast.error('Erro ao renovar contrato.');
    } finally {
      setIsActionSaving(false);
    }
  };

  const handleOpenUpsell = (contract: Contract) => {
    setSelectedContract(contract);
    setUpsellAmount(0);
    setIsUpsellOpen(true);
  };

  const handleUpsell = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContract) return;

    setIsActionSaving(true);
    try {
      const currentUpsell = Number(selectedContract.upsell_value) || 0;
      const { error } = await supabase
        .from('contracts')
        .update({
          upsell_value: currentUpsell + upsellAmount
        })
        .eq('id', selectedContract.id);

      if (error) throw error;
      toast.success('Upsell registrado com sucesso!');
      await fetchContracts();
      setIsUpsellOpen(false);
    } catch (err) {
      console.error('Error registering upsell:', err);
      toast.error('Erro ao registrar upsell.');
    } finally {
      setIsActionSaving(false);
    }
  };

  const handleDeleteContract = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este contrato? Esta ação é irreversível.')) return;
    try {
      const { error } = await supabase.from('contracts').delete().eq('id', id);
      if (error) throw error;
      setContracts(prev => prev.filter(c => c.id !== id));
      toast.success('Contrato excluído com sucesso!');
    } catch (err) {
      console.error('Error deleting contract:', err);
      toast.error('Erro ao excluir contrato.');
    }
  };

  const exportContractPDF = async (contract: Contract) => {
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
      doc.text('CONTRATO DE PRESTAÇÃO DE SERVIÇOS', 20, 25);
      
      doc.setFont('courier', 'normal');
      doc.setFontSize(10);
      doc.text('ERP TALOS INTEGRADO', 20, 35);

      // Company Info
      doc.setFontSize(8);
      doc.text(`E-mail: ${settings.company_email}`, 130, 20);
      doc.text(`Fone: ${settings.company_phone}`, 130, 26);
      doc.text(`Data Emissão: ${new Date().toLocaleDateString('pt-BR')}`, 130, 32);

      // Section 1: Parties
      doc.setFillColor(244, 244, 245);
      doc.rect(20, 55, 170, 10, 'F');
      doc.setTextColor(9, 9, 11);
      doc.setFont('courier', 'bold');
      doc.setFontSize(11);
      doc.text('PARTES CONTRATANTES', 25, 62);

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
      
      const clientName = contract.clients ? `${contract.clients.first_name} ${contract.clients.last_name}` : 'Cliente Não Informado';
      const clientEmail = contract.clients?.email || 'Não informado';
      const clientPhone = contract.clients?.phone || 'Não informado';

      addField('CONTRATADA', settings.company_name);
      addField('CONTRATANTE', clientName);
      addField('E-MAIL CONTATO', clientEmail);
      addField('TELEFONE', clientPhone);

      // Section 2: Contract Terms
      y += 10;
      doc.setFillColor(244, 244, 245);
      doc.rect(20, y, 170, 10, 'F');
      doc.setFont('courier', 'bold');
      doc.text('TERMOS E VIGÊNCIA DO CONTRATO', 25, y + 7);

      y += 18;
      addField('DATA INÍCIO', new Date(contract.start_date).toLocaleDateString('pt-BR'));
      addField('DATA TÉRMINO', new Date(contract.end_date).toLocaleDateString('pt-BR'));
      addField('TIPO RECORRÊNCIA', contract.billing_type === 'monthly' ? 'Mensal' : contract.billing_type === 'quarterly' ? 'Trimestral' : 'Anual');
      addField('RENOVAÇÃO AUTO', contract.auto_renewal ? 'Sim' : 'Não');
      addField('STATUS DO CONTRATO', contract.status.toUpperCase());

      // Section 3: Financials
      y += 10;
      doc.setFillColor(244, 244, 245);
      doc.rect(20, y, 170, 10, 'F');
      doc.setFont('courier', 'bold');
      doc.text('VALORES DO CONTRATO', 25, y + 7);

      y += 18;
      doc.setFont('courier', 'normal');
      doc.text('Item', 20, y);
      doc.text('Valor', 140, y);
      
      y += 3;
      doc.setDrawColor(228, 228, 231);
      doc.line(20, y, 190, y);

      y += 8;
      doc.text('Mensalidade Base do Contrato', 20, y);
      doc.text(`R$ ${Number(contract.monthly_value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 140, y);

      if (Number(contract.upsell_value) > 0) {
        y += 8;
        doc.text('Adicional por Upgrades (Upsell)', 20, y);
        doc.text(`R$ ${Number(contract.upsell_value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 140, y);
      }

      y += 10;
      doc.setDrawColor(200, 200, 200);
      doc.line(20, y, 190, y);

      y += 8;
      doc.setFont('courier', 'bold');
      doc.text('Total Recorrente Mensal', 20, y);
      const totalVal = Number(contract.monthly_value || 0) + Number(contract.upsell_value || 0);
      doc.text(`R$ ${totalVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 140, y);

      // Terms
      y += 20;
      doc.setFont('courier', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(113, 113, 122);
      doc.text('Este contrato é regido pelas cláusulas do acordo de adesão digital.', 20, y);
      doc.text('O não pagamento das mensalidades nos prazos devidos sujeita o contrato a rescisão imediata.', 20, y + 5);

      // Signature lines
      y += 25;
      doc.setDrawColor(200, 200, 200);
      doc.line(20, y, 90, y);
      doc.line(120, y, 190, y);
      
      doc.text('Assinatura da Contratada', 20, y + 6);
      doc.text('Assinatura da Contratante', 120, y + 6);

      doc.save(`contrato-talos-${clientName.toLowerCase().replace(/\s+/g, '-')}.pdf`);
      toast.success('Contrato em PDF baixado com sucesso!');
    } catch (err) {
      console.error('Erro ao gerar contrato PDF:', err);
      toast.error('Erro ao exportar contrato PDF.');
    }
  };

  const getContractStatusBadge = (contract: Contract) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = new Date(contract.end_date);

    if (contract.status === 'canceled') {
      return <Badge className="bg-red-500/10 text-red-400 border-red-500/20 gap-1.5"><XCircle className="w-3.5 h-3.5" /> Cancelado</Badge>;
    }

    if (end < today || contract.status === 'expired') {
      return <Badge className="bg-zinc-500/10 text-zinc-400 border-zinc-500/20 gap-1.5"><Clock className="w-3.5 h-3.5" /> Vencido</Badge>;
    }

    const diffTime = end.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays >= 0 && diffDays <= 30) {
      return <Badge className="bg-yellow-500/10 text-yellow-400 border-yellow-500/20 gap-1.5 animate-pulse"><AlertTriangle className="w-3.5 h-3.5" /> A Vencer ({diffDays}d)</Badge>;
    }

    return <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> Ativo</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <FileText className="w-6 h-6 text-zinc-200" />
            Contratos de Clientes
          </h1>
          <p className="text-zinc-400 text-sm">Monitore receitas recorrentes (MRR), vigência de contratos, renovações e upsells.</p>
        </div>

        <Button 
          onClick={handleOpenNewContract}
          className="flex items-center gap-2 px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-black font-semibold rounded-xl shadow-lg shadow-zinc-900/20 active:scale-95 border-0"
        >
          <Plus className="w-4 h-4" />
          Novo Contrato
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-zinc-950/50 border-zinc-900 text-white shadow-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold text-zinc-400 uppercase">Receita Recorrente Mensal (MRR)</CardTitle>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-emerald-400">R$ {totalMRR.toLocaleString('pt-BR')}</div>
            <p className="text-[10px] text-zinc-500 mt-1">Soma de contratos ativos + upsells</p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-950/50 border-zinc-900 text-white shadow-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold text-zinc-400 uppercase">Contratos Ativos</CardTitle>
            <CheckCircle2 className="w-4 h-4 text-zinc-300" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black">{activeContractsCount}</div>
            <p className="text-[10px] text-zinc-500 mt-1">Contratos vigentes no momento</p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-950/50 border-zinc-900 text-white shadow-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold text-zinc-400 uppercase">Alertas de Vencimento</CardTitle>
            <AlertTriangle className={cn("w-4 h-4", expiringContractsCount > 0 ? "text-yellow-400 animate-bounce" : "text-zinc-500")} />
          </CardHeader>
          <CardContent>
            <div className={cn("text-2xl font-black", expiringContractsCount > 0 ? "text-yellow-400" : "")}>
              {expiringContractsCount}
            </div>
            <p className="text-[10px] text-zinc-500 mt-1">Vencendo nos próximos 30 dias</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs Filtros e Pesquisa */}
      <Tabs defaultValue="all" onValueChange={setActiveTab} className="w-full space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <TabsList className="bg-zinc-950 border border-zinc-900 p-1 rounded-xl">
            <TabsTrigger value="all" className="rounded-lg data-[state=active]:bg-zinc-900 data-[state=active]:text-white">Todos</TabsTrigger>
            <TabsTrigger value="active" className="rounded-lg data-[state=active]:bg-zinc-900 data-[state=active]:text-white">Ativos</TabsTrigger>
            <TabsTrigger value="expiring" className="rounded-lg data-[state=active]:bg-yellow-500/10 data-[state=active]:text-yellow-400">A Vencer (30d)</TabsTrigger>
            <TabsTrigger value="expired" className="rounded-lg data-[state=active]:bg-zinc-900 data-[state=active]:text-white">Vencidos</TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <Input 
                type="text" 
                placeholder="Buscar por cliente..."
                className="w-full bg-black border border-zinc-900 text-white pl-10 pr-4 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-400/50 text-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button 
              variant="outline"
              onClick={fetchContracts}
              className="bg-black border border-zinc-900 text-zinc-400 hover:text-white rounded-xl"
            >
              <RefreshCw className={cn("w-5 h-5", loading && "animate-spin")} />
            </Button>
          </div>
        </div>

        {/* Tabela de Contratos */}
        <div className="bg-zinc-950/50 border border-zinc-900 rounded-2xl overflow-hidden shadow-xl">
          <Table className="w-full text-left border-collapse">
            <TableHeader>
              <TableRow className="bg-black/50 border-b border-zinc-900 hover:bg-transparent">
                <TableHead className="p-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Cliente</TableHead>
                <TableHead className="p-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Recorrência (Faturamento)</TableHead>
                <TableHead className="p-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Vigência (Início / Fim)</TableHead>
                <TableHead className="p-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Valores (Base / Upsell / Total)</TableHead>
                <TableHead className="p-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Auto Renovação</TableHead>
                <TableHead className="p-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Status</TableHead>
                <TableHead className="p-4 text-xs font-bold text-zinc-500 uppercase tracking-wider text-right"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-zinc-900/50">
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="p-12 text-center">
                    <Loader2 className="w-8 h-8 text-zinc-200 animate-spin mx-auto mb-2" />
                    <p className="text-zinc-500 text-sm font-medium">Carregando contratos...</p>
                  </TableCell>
                </TableRow>
              ) : getFilteredContracts().length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="p-12 text-center">
                    <FileText className="w-12 h-12 text-zinc-900 mx-auto mb-3" />
                    <p className="text-zinc-400 font-medium">Nenhum contrato encontrado</p>
                    <p className="text-zinc-600 text-sm">Feche vendas com leads ou crie contratos manualmente.</p>
                  </TableCell>
                </TableRow>
              ) : (
                getFilteredContracts().map((contract) => {
                  const clientName = contract.clients 
                    ? `${contract.clients.first_name} ${contract.clients.last_name}`
                    : 'Cliente Deletado';

                  const baseValue = Number(contract.monthly_value || 0);
                  const upsellValue = Number(contract.upsell_value || 0);
                  const totalValue = baseValue + upsellValue;

                  return (
                    <TableRow key={contract.id} className="hover:bg-zinc-900/30 transition-colors group">
                      <TableCell className="p-4 font-bold text-white">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-zinc-500" />
                          {clientName}
                        </div>
                      </TableCell>

                      <TableCell className="p-4">
                        <Badge variant="outline" className="bg-black border-zinc-900 capitalize text-zinc-300">
                          {contract.billing_type === 'monthly' ? 'Mensal' : 
                           contract.billing_type === 'quarterly' ? 'Trimestral' : 'Anual'}
                        </Badge>
                      </TableCell>

                      <TableCell className="p-4 text-xs text-zinc-400 font-medium">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                          {new Date(contract.start_date).toLocaleDateString('pt-BR')}
                          <span className="text-zinc-600">→</span>
                          {new Date(contract.end_date).toLocaleDateString('pt-BR')}
                        </div>
                      </TableCell>

                      <TableCell className="p-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-white">
                            R$ {totalValue.toLocaleString('pt-BR')}
                          </span>
                          {upsellValue > 0 && (
                            <span className="text-[10px] text-emerald-400 font-semibold">
                              Base: R$ {baseValue} + Upsell: R$ {upsellValue}
                            </span>
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="p-4">
                        <Badge className={cn(
                          "border",
                          contract.auto_renewal 
                            ? "bg-zinc-900 text-zinc-300 border-zinc-800"
                            : "bg-zinc-900 text-zinc-500 border-zinc-800/50"
                        )}>
                          {contract.auto_renewal ? 'Sim' : 'Não'}
                        </Badge>
                      </TableCell>

                      <TableCell className="p-4">
                        {getContractStatusBadge(contract)}
                      </TableCell>

                      <TableCell className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => exportContractPDF(contract)}
                            className="text-zinc-400 hover:text-zinc-300 hover:bg-zinc-900 gap-1"
                            title="Gerar PDF do Contrato"
                          >
                            <FileText className="w-4 h-4" />
                            PDF
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleOpenRenew(contract)}
                            className="text-zinc-400 hover:text-zinc-300 hover:bg-zinc-900 gap-1"
                          >
                            <CalendarDays className="w-4 h-4" />
                            Renovar
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleOpenUpsell(contract)}
                            className="text-zinc-400 hover:text-emerald-400 hover:bg-emerald-400/10 gap-1"
                          >
                            <PlusCircle className="w-4 h-4" />
                            Upsell
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleDeleteContract(contract.id)}
                            className="h-8 w-8 text-zinc-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg"
                            title="Excluir contrato"
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

      {/* Novo Contrato Dialog */}
      <Dialog open={isNewContractOpen} onOpenChange={setIsNewContractOpen}>
        <DialogContent className="bg-zinc-950 border-zinc-900 text-white rounded-3xl overflow-hidden p-0 shadow-2xl">
          <DialogHeader className="p-6 pb-4 bg-gradient-to-r from-black to-zinc-950 border-b border-zinc-900">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-zinc-100 text-black/20 flex items-center justify-center text-zinc-200 border border-zinc-800">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-white">Criar Contrato Manual</DialogTitle>
                <DialogDescription className="text-xs text-zinc-400">Associe um contrato de receita recorrente a um cliente cadastrado.</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleSaveContract} className="p-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="clientSelect">Selecionar Cliente</Label>
              <Select value={clientId} onValueChange={(val) => setClientId(val || '')}>
                <SelectTrigger className="bg-black border-zinc-900 text-white">
                  <SelectValue placeholder="Selecione o Cliente" />
                </SelectTrigger>
                <SelectContent className="bg-black border-zinc-900 text-white">
                  {clientsList.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.first_name} {c.last_name} ({c.email})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="newVal">Valor Mensal (R$)</Label>
                <Input 
                  required
                  id="newVal"
                  type="number"
                  min="0"
                  step="0.01"
                  value={monthlyValue}
                  onChange={(e) => setMonthlyValue(Number(e.target.value))}
                  className="bg-black border-zinc-900 text-white focus-visible:ring-zinc-400"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="newBilling">Tipo Faturamento</Label>
                <Select value={billingType} onValueChange={(val) => setBillingType(val || '')}>
                  <SelectTrigger className="bg-black border-zinc-900 text-white">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent className="bg-black border-zinc-900 text-white">
                    <SelectItem value="monthly">Mensal</SelectItem>
                    <SelectItem value="quarterly">Trimestral</SelectItem>
                    <SelectItem value="yearly">Anual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="newStart">Data de Início</Label>
                <Input 
                  required
                  id="newStart"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-black border-zinc-900 text-white focus-visible:ring-zinc-400"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="newEnd">Data de Término</Label>
                <Input 
                  required
                  id="newEnd"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-black border-zinc-900 text-white focus-visible:ring-zinc-400"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="newAutoRenew">Renovação Automática</Label>
              <Select value={autoRenewal} onValueChange={(val) => setAutoRenewal(val || '')}>
                <SelectTrigger className="bg-black border-zinc-900 text-white">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent className="bg-black border-zinc-900 text-white">
                  <SelectItem value="true">Sim</SelectItem>
                  <SelectItem value="false">Não</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </form>

          <DialogFooter className="p-6 bg-black border-t border-zinc-900 flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsNewContractOpen(false)}
              className="bg-zinc-950 hover:bg-zinc-900 border-zinc-900 text-zinc-300 hover:text-white"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              onClick={handleSaveContract}
              disabled={isActionSaving || !clientId}
              className="bg-zinc-100 hover:bg-zinc-200 text-black font-semibold shadow-lg shadow-zinc-900/20 font-bold"
            >
              {isActionSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Salvar Contrato
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Renovação Dialog */}
      <Dialog open={isRenewOpen} onOpenChange={setIsRenewOpen}>
        <DialogContent className="bg-zinc-950 border-zinc-900 text-white rounded-3xl overflow-hidden p-0 shadow-2xl">
          <DialogHeader className="p-6 pb-4 bg-gradient-to-r from-black to-zinc-950 border-b border-zinc-900">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-zinc-100 text-black/20 flex items-center justify-center text-zinc-200 border border-zinc-800">
                <CalendarDays className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-white">Renovação de Contrato</DialogTitle>
                <DialogDescription className="text-xs text-zinc-400">
                  Estenda a data de vigência para o cliente {selectedContract?.clients ? `${selectedContract.clients.first_name} ${selectedContract.clients.last_name}` : ''}.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleRenew} className="p-6 space-y-4">
            <div className="space-y-1.5">
              <Label>Data de Término Atual</Label>
              <div className="bg-black border border-zinc-900 px-4 py-3 rounded-xl text-sm text-zinc-400">
                {selectedContract ? new Date(selectedContract.end_date).toLocaleDateString('pt-BR') : ''}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="newEndDate">Nova Data de Término</Label>
              <Input 
                required
                id="newEndDate"
                type="date"
                value={newEndDate}
                onChange={(e) => setNewEndDate(e.target.value)}
                className="bg-black border-zinc-900 text-white focus-visible:ring-zinc-400"
              />
            </div>
          </form>

          <DialogFooter className="p-6 bg-black border-t border-zinc-900 flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsRenewOpen(false)}
              className="bg-zinc-950 hover:bg-zinc-900 border-zinc-900 text-zinc-300 hover:text-white"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              onClick={handleRenew}
              disabled={isActionSaving}
              className="bg-zinc-100 hover:bg-zinc-200 text-black font-semibold shadow-lg shadow-zinc-900/20 font-bold"
            >
              {isActionSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Confirmar Renovação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upsell Dialog */}
      <Dialog open={isUpsellOpen} onOpenChange={setIsUpsellOpen}>
        <DialogContent className="bg-zinc-950 border-zinc-900 text-white rounded-3xl overflow-hidden p-0 shadow-2xl">
          <DialogHeader className="p-6 pb-4 bg-gradient-to-r from-black to-zinc-950 border-b border-zinc-900">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600/20 flex items-center justify-center text-emerald-500 border border-emerald-500/20">
                <PlusCircle className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-white">Registrar Upsell (Upgrade)</DialogTitle>
                <DialogDescription className="text-xs text-zinc-400">Adicione receita recorrente mensal extra ao contrato deste cliente.</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleUpsell} className="p-6 space-y-4">
            <div className="space-y-1.5">
              <Label>Valor Base do Contrato</Label>
              <div className="bg-black border border-zinc-900 px-4 py-3 rounded-xl text-sm font-semibold text-zinc-400">
                R$ {selectedContract ? Number(selectedContract.monthly_value).toLocaleString('pt-BR') : '0,00'}
              </div>
            </div>

            {selectedContract && Number(selectedContract.upsell_value) > 0 ? (
              <div className="space-y-1.5">
                <Label>Upsell Atual Acumulado</Label>
                <div className="bg-black border border-zinc-900 px-4 py-3 rounded-xl text-sm font-semibold text-emerald-400/80">
                  + R$ {Number(selectedContract.upsell_value).toLocaleString('pt-BR')}
                </div>
              </div>
            ) : null}

            <div className="space-y-1.5">
              <Label htmlFor="upsellAmount">Valor Mensal a Adicionar (R$)</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
                <Input 
                  required
                  id="upsellAmount"
                  type="number"
                  min="1"
                  step="0.01"
                  value={upsellAmount}
                  onChange={(e) => setUpsellAmount(Number(e.target.value))}
                  className="bg-black border-zinc-900 text-white pl-10 focus-visible:ring-zinc-400"
                  placeholder="0.00"
                />
              </div>
            </div>
          </form>

          <DialogFooter className="p-6 bg-black border-t border-zinc-900 flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsUpsellOpen(false)}
              className="bg-zinc-950 hover:bg-zinc-900 border-zinc-900 text-zinc-300 hover:text-white"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              onClick={handleUpsell}
              disabled={isActionSaving || upsellAmount <= 0}
              className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20 font-bold"
            >
              {isActionSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Registrar Upsell
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
