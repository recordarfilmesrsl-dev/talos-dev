'use client';

import React, { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { CheckCircle2, AlertTriangle, Loader2, Sparkles, Briefcase } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  status: string;
}

function ConfirmInviteContent() {
  const searchParams = useSearchParams();
  const employeeId = searchParams.get('id');
  
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function fetchEmployee() {
      if (!employeeId) {
        setError('ID do convite inválido ou ausente.');
        setLoading(false);
        return;
      }

      try {
        const { data, error: dbError } = await supabase
          .from('employees')
          .select('id, first_name, last_name, email, role, status')
          .eq('id', employeeId)
          .single();

        if (dbError) throw dbError;
        if (!data) {
          setError('Funcionário não encontrado no sistema.');
        } else {
          setEmployee(data);
          if (data.status === 'active') {
            setSuccess(true);
          }
        }
      } catch (err: any) {
        console.error('Error loading employee invite:', err);
        setError('Erro ao carregar os dados do convite. Verifique se o link está correto.');
      } finally {
        setLoading(false);
      }
    }

    fetchEmployee();
  }, [employeeId]);

  const handleConfirm = async () => {
    if (!employeeId) return;
    setConfirming(true);
    try {
      const { error: updateError } = await supabase
        .from('employees')
        .update({ status: 'active' })
        .eq('id', employeeId);

      if (updateError) throw updateError;
      
      setSuccess(true);
      if (employee) {
        setEmployee({ ...employee, status: 'active' });
      }
      toast.success('Convite confirmado com sucesso!');
    } catch (err: any) {
      console.error('Error confirming employee invite:', err);
      toast.error('Erro ao confirmar convite no banco de dados.');
    } finally {
      setConfirming(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <Loader2 className="w-10 h-10 text-zinc-400 animate-spin mb-4" />
        <p className="text-zinc-500 text-sm font-medium">Carregando detalhes do convite...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md w-full bg-zinc-950 border border-zinc-900 rounded-3xl p-8 text-center shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-red-500/20" />
        <div className="w-12 h-12 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h1 className="text-xl font-bold text-white mb-2">Ops! Ocorreu um erro</h1>
        <p className="text-zinc-400 text-sm leading-relaxed mb-6">{error}</p>
        <p className="text-xs text-zinc-600">Se você acredita que isso é um erro, contate o administrador do sistema.</p>
      </div>
    );
  }

  return (
    <div className="max-w-md w-full bg-zinc-950 border border-zinc-900 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-zinc-800 to-zinc-900" />
      
      {success ? (
        <div className="text-center py-4">
          <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-[10px] font-bold uppercase tracking-wider mb-4">
            <Sparkles className="w-3 h-3" />
            Cadastro Ativado
          </div>

          <h1 className="text-2xl font-bold text-white mb-3">Bem-vindo à equipe!</h1>
          <p className="text-zinc-400 text-sm leading-relaxed mb-6">
            Olá, <strong className="text-white">{employee?.first_name} {employee?.last_name}</strong>. 
            Seu convite para a posição de <strong className="text-zinc-300">{employee?.role}</strong> foi confirmado com sucesso.
          </p>

          <div className="bg-black/50 border border-zinc-900 rounded-2xl p-4 text-left mb-6">
            <p className="text-xs text-zinc-500 leading-relaxed">
              O administrador do sistema já foi notificado. Você receberá as credenciais e acessos nos canais combinados.
            </p>
          </div>
          
          <p className="text-xs text-zinc-600">Você já pode fechar esta aba.</p>
        </div>
      ) : (
        <div>
          <div className="w-14 h-14 bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-2xl flex items-center justify-center mb-6">
            <Briefcase className="w-6 h-6" />
          </div>

          <h1 className="text-2xl font-bold text-white mb-3">Convite de Trabalho</h1>
          <p className="text-zinc-400 text-sm leading-relaxed mb-6">
            Você foi convidado a integrar a equipe da empresa no ERP Talos. Veja as informações do convite abaixo:
          </p>

          <div className="bg-black/50 border border-zinc-900 rounded-2xl p-5 space-y-4 mb-6">
            <div>
              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">Nome Completo</span>
              <span className="text-sm font-semibold text-white">{employee?.first_name} {employee?.last_name}</span>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">Cargo / Função</span>
                <span className="text-sm font-semibold text-zinc-300 capitalize">{employee?.role}</span>
              </div>
              <div>
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">E-mail</span>
                <span className="text-sm font-semibold text-zinc-300 truncate block">{employee?.email}</span>
              </div>
            </div>
          </div>

          <Button
            onClick={handleConfirm}
            disabled={confirming}
            className="w-full bg-zinc-100 hover:bg-zinc-200 text-black font-bold py-3 rounded-2xl transition-all shadow-lg active:scale-95 border-0 flex items-center justify-center gap-2"
          >
            {confirming ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Confirmando...
              </>
            ) : (
              'Confirmar e Aceitar Convite'
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

export default function ConfirmInvitePage() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 font-mono select-none">
      <Suspense fallback={
        <div className="min-h-screen bg-black flex items-center justify-center text-white">
          <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
        </div>
      }>
        <ConfirmInviteContent />
      </Suspense>
    </div>
  );
}
