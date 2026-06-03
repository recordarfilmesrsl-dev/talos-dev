'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Zap,
  Link as LinkIcon,
  Play,
  CheckCircle2,
  XCircle,
  Loader2,
  Settings as SettingsIcon,
  Send,
  Terminal
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

export default function AutomationsPage() {
  const [loading, setLoading] = useState(true);
  const [n8nWebhookUrl, setN8nWebhookUrl] = useState<string | null>(null);

  // Tester states
  const [testPayload, setTestPayload] = useState({
    event_type: 'test_trigger',
    first_name: 'Mateo',
    last_name: 'Silveira',
    phone: '(11) 99999-8888',
    email: 'mateo@test.com',
    value: 1500,
    status: 'closed'
  });
  
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    status?: number;
    message?: string;
    body?: string;
  } | null>(null);

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('settings')
        .select('n8n_webhook_url')
        .limit(1);

      if (error) throw error;

      if (data && data.length > 0) {
        setN8nWebhookUrl(data[0].n8n_webhook_url || null);
      }
    } catch (err) {
      console.error('Error fetching settings for automations:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleTestWebhook = async () => {
    if (!n8nWebhookUrl) return;

    setIsTesting(true);
    setTestResult(null);

    try {
      const response = await fetch(n8nWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...testPayload,
          timestamp: new Date().toISOString()
        })
      });

      const responseText = await response.text();

      setTestResult({
        success: response.ok,
        status: response.status,
        body: responseText || '(Sem corpo de resposta)'
      });
    } catch (err: any) {
      console.error('Error triggering webhook:', err);
      setTestResult({
        success: false,
        message: err.message || 'Erro de rede ao disparar o webhook. Verifique se o n8n está acessível e aceita requisições CORS.'
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Zap className="w-6 h-6 text-zinc-200" />
            Automações & Webhooks
          </h1>
          <p className="text-zinc-400 text-sm">Monitore o status da integração com o n8n e teste os disparos de mensagens.</p>
        </div>

        <Link href="/settings">
          <Button variant="outline" className="bg-black border-zinc-900 text-zinc-400 hover:text-white flex items-center gap-2 rounded-xl">
            <SettingsIcon className="w-4 h-4" />
            Configurar n8n
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-12 bg-zinc-950/50 border border-zinc-900 rounded-2xl">
          <Loader2 className="w-8 h-8 text-zinc-200 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Status and Active Triggers */}
          <div className="md:col-span-2 space-y-6">
            {/* Status Card */}
            <Card className="bg-zinc-950/50 border-zinc-900 text-white shadow-xl">
              <CardHeader>
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-2">
                  Status da Automação (n8n)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-black/50 border border-zinc-900 rounded-xl">
                  <div className="flex items-center gap-3">
                    <LinkIcon className="w-5 h-5 text-zinc-400" />
                    <div>
                      <p className="font-bold text-white text-sm">Gatilho de WhatsApp</p>
                      <p className="text-xs text-zinc-500 max-w-md break-all">
                        {n8nWebhookUrl ? n8nWebhookUrl : 'Nenhuma URL de webhook cadastrada no sistema.'}
                      </p>
                    </div>
                  </div>
                  {n8nWebhookUrl ? (
                    <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 font-bold uppercase text-[9px] gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Configurado
                    </Badge>
                  ) : (
                    <Badge className="bg-red-500/10 text-red-400 border-red-500/20 font-bold uppercase text-[9px] gap-1">
                      <XCircle className="w-3 h-3 text-red-400" /> Inativo
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Active Triggers list */}
            <Card className="bg-zinc-950/50 border-zinc-900 text-white shadow-xl">
              <CardHeader>
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-zinc-300">
                  Gatilhos Integrados ao CRM
                </CardTitle>
                <CardDescription className="text-xs text-zinc-500">
                  Estes eventos no sistema do CRM/Clientes farão chamadas automáticas para o seu n8n.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Trigger 0 */}
                <div className="flex items-center justify-between p-3.5 bg-black/30 border border-zinc-900 rounded-xl">
                  <div>
                    <p className="font-bold text-white text-sm">Cadastro de Novo Lead</p>
                    <p className="text-xs text-zinc-500">Disparado automaticamente assim que um novo lead é inserido no sistema.</p>
                  </div>
                  <Badge variant="outline" className="border-zinc-800 text-zinc-400 uppercase text-[9px] font-bold">
                    lead_created
                  </Badge>
                </div>

                {/* Trigger 1 */}
                <div className="flex items-center justify-between p-3.5 bg-black/30 border border-zinc-900 rounded-xl">
                  <div>
                    <p className="font-bold text-white text-sm">Mudança de Fase no Funil (CRM)</p>
                    <p className="text-xs text-zinc-500">Gatilho automático disparado ao arrastar/mover um Lead de coluna.</p>
                  </div>
                  <Badge variant="outline" className="border-zinc-800 text-zinc-400 uppercase text-[9px] font-bold">
                    lead_status_changed
                  </Badge>
                </div>

                {/* Trigger 2 */}
                <div className="flex items-center justify-between p-3.5 bg-black/30 border border-zinc-900 rounded-xl">
                  <div>
                    <p className="font-bold text-white text-sm">Disparo Manual via WhatsApp Icon</p>
                    <p className="text-xs text-zinc-500">Disparado de forma manual ao clicar no ícone do WhatsApp no CRM ou Clientes.</p>
                  </div>
                  <Badge variant="outline" className="border-zinc-800 text-zinc-400 uppercase text-[9px] font-bold">
                    client_whatsapp_manual
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Webhook Tester Sidepanel */}
          <div>
            <Card className="bg-zinc-950/50 border-zinc-900 text-white shadow-xl h-full">
              <CardHeader>
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                  <Play className="w-3.5 h-3.5 text-zinc-400" />
                  Testador de Disparos
                </CardTitle>
                <CardDescription className="text-xs text-zinc-500">
                  Envie dados de teste diretamente para o seu webhook do n8n para validar o funcionamento do seu fluxo.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="bg-black/50 border border-zinc-900 p-3 rounded-xl space-y-2 text-xs">
                    <p className="text-zinc-500 font-semibold uppercase text-[10px]">Payload de Teste (JSON)</p>
                    <pre className="font-mono text-zinc-300 whitespace-pre-wrap leading-relaxed">
                      {JSON.stringify(testPayload, null, 2)}
                    </pre>
                  </div>

                  <Button
                    onClick={handleTestWebhook}
                    disabled={isTesting || !n8nWebhookUrl}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-black font-semibold rounded-xl transition-all shadow-md active:scale-95 border-0 text-xs font-bold disabled:opacity-50"
                  >
                    {isTesting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Disparando...
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        Disparar Webhook de Teste
                      </>
                    )}
                  </Button>

                  {/* Test Results Output */}
                  {testResult && (
                    <div className={cn(
                      "border p-3.5 rounded-xl space-y-2 text-xs",
                      testResult.success 
                        ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-400" 
                        : "bg-red-500/5 border-red-500/20 text-red-400"
                    )}>
                      <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[10px]">
                        <Terminal className="w-4 h-4" />
                        Resultado do Disparo
                      </div>
                      <p className="font-semibold">
                        Status: {testResult.status ? `${testResult.status} ${testResult.success ? 'OK' : 'Error'}` : 'Erro de Rede'}
                      </p>
                      {testResult.message && <p className="text-[11px] leading-relaxed">{testResult.message}</p>}
                      {testResult.body && (
                        <div className="bg-black/40 p-2 rounded border border-zinc-900/50 mt-1 max-h-24 overflow-y-auto font-mono text-[10px] text-zinc-400 select-all">
                          Resposta: {testResult.body}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
