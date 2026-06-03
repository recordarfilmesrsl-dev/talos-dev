'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/lib/supabase';
import { Loader2, Mail, Key, DollarSign, Calendar, ShieldCheck } from 'lucide-react';

interface Lead {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  value: number;
}

interface ConvertLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead | null;
  onSuccess: () => void;
}

export function ConvertLeadModal({ isOpen, onClose, lead, onSuccess }: ConvertLeadModalProps) {
  const [loading, setLoading] = useState(false);
  const [gmail, setGmail] = useState('');
  const [password, setPassword] = useState('');
  const [notes, setNotes] = useState('');
  
  const [monthlyValue, setMonthlyValue] = useState(0);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [billingType, setBillingType] = useState('monthly');
  const [autoRenewal, setAutoRenewal] = useState('true');

  useEffect(() => {
    if (lead) {
      setGmail(lead.email || '');
      setMonthlyValue(Number(lead.value) || 0);
      
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      setStartDate(todayStr);
      
      const nextYear = new Date(today);
      nextYear.setFullYear(today.getFullYear() + 1);
      setEndDate(nextYear.toISOString().split('T')[0]);
      
      setPassword('');
      setNotes('');
      setBillingType('monthly');
      setAutoRenewal('true');
    }
  }, [lead]);

  const handleConvert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lead) return;

    setLoading(true);
    try {
      // 1. Create client
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .insert([
          {
            first_name: lead.first_name,
            last_name: lead.last_name,
            email: lead.email,
            phone: lead.phone,
            lead_id: lead.id,
          }
        ])
        .select()
        .single();

      if (clientError) throw clientError;

      const clientId = clientData.id;

      // 2. Create client credentials
      const { error: credsError } = await supabase
        .from('client_credentials')
        .insert([
          {
            client_id: clientId,
            gmail: gmail,
            password: password,
            notes: notes,
          }
        ]);

      if (credsError) throw credsError;

      // 3. Create contract
      const { error: contractError } = await supabase
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
          }
        ]);

      if (contractError) throw contractError;

      // 4. Update Lead Status to closed/Fechado (if not already done)
      const { error: leadError } = await supabase
        .from('leads')
        .update({ status: 'closed' })
        .eq('id', lead.id);

      if (leadError) throw leadError;

      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error converting lead to client:', err);
      alert('Ocorreu um erro ao converter o lead. Verifique os logs.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl bg-zinc-950 border-zinc-900 text-white rounded-3xl overflow-hidden p-0 shadow-2xl">
        <DialogHeader className="p-6 pb-4 bg-gradient-to-r from-zinc-900/40 to-zinc-950 border-b border-zinc-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-zinc-100 text-black/20 flex items-center justify-center text-zinc-300 border border-zinc-800">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-white">Fechar Negócio & Converter</DialogTitle>
              <DialogDescription className="text-xs text-zinc-400">
                Parabéns! Preencha as credenciais e as informações do contrato para {lead?.first_name} {lead?.last_name}.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleConvert} className="p-6 space-y-5 max-h-[70vh] overflow-y-auto custom-scrollbar">
          {/* Seção 1: Credenciais */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-zinc-300 border-b border-zinc-900 pb-1.5 uppercase tracking-wider text-[11px]">
              1. Credenciais de Acesso do Cliente
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="gmail" className="text-xs text-zinc-400">Gmail do Cliente</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <Input
                    required
                    id="gmail"
                    type="email"
                    placeholder="cliente@gmail.com"
                    value={gmail}
                    onChange={(e) => setGmail(e.target.value)}
                    className="bg-black border-zinc-900 text-white pl-10 focus-visible:ring-zinc-400"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs text-zinc-400">Senha de Acesso</Label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <Input
                    required
                    id="password"
                    type="text"
                    placeholder="Senha provisória/acesso"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-black border-zinc-900 text-white pl-10 focus-visible:ring-zinc-400"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notes" className="text-xs text-zinc-400">Outros Acessos / Observações</Label>
              <Textarea
                id="notes"
                placeholder="Acessos de hospedagem, links de redes sociais ou notas importantes sobre o cliente."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="bg-black border-zinc-900 text-white focus-visible:ring-zinc-400 min-h-[60px]"
              />
            </div>
          </div>

          {/* Seção 2: Contrato */}
          <div className="space-y-4 pt-2">
            <h3 className="text-sm font-bold text-zinc-300 border-b border-zinc-900 pb-1.5 uppercase tracking-wider text-[11px]">
              2. Informações de Contrato
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="monthlyValue" className="text-xs text-zinc-400">Valor Mensal (R$)</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
                  <Input
                    required
                    id="monthlyValue"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={monthlyValue}
                    onChange={(e) => setMonthlyValue(Number(e.target.value))}
                    className="bg-black border-zinc-900 text-white pl-10 focus-visible:ring-zinc-400"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="billingType" className="text-xs text-zinc-400">Faturamento</Label>
                <Select value={billingType} onValueChange={(val) => setBillingType(val || '')}>
                  <SelectTrigger className="bg-black border-zinc-900 text-white focus:ring-zinc-400">
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
                <Label htmlFor="startDate" className="text-xs text-zinc-400">Data de Início</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <Input
                    required
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="bg-black border-zinc-900 text-white pl-10 focus-visible:ring-zinc-400"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="endDate" className="text-xs text-zinc-400">Data de Término</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <Input
                    required
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="bg-black border-zinc-900 text-white pl-10 focus-visible:ring-zinc-400"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1.5 col-span-2">
              <Label htmlFor="autoRenewal" className="text-xs text-zinc-400">Renovação Automática</Label>
              <Select value={autoRenewal} onValueChange={(val) => setAutoRenewal(val || '')}>
                <SelectTrigger className="bg-black border-zinc-900 text-white focus:ring-zinc-400">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent className="bg-black border-zinc-900 text-white">
                  <SelectItem value="true">Sim (Auto renovar)</SelectItem>
                  <SelectItem value="false">Não</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </form>

        <DialogFooter className="p-6 bg-black border-t border-zinc-900 flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="bg-zinc-950 hover:bg-zinc-900 border-zinc-900 text-zinc-300 hover:text-white"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            onClick={handleConvert}
            disabled={loading}
            className="bg-zinc-100 hover:bg-zinc-200 text-black font-semibold shadow-lg shadow-zinc-900/20 font-bold"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Salvando...
              </>
            ) : (
              'Confirmar Fechamento'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
