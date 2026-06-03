'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Settings,
  Building2,
  Mail,
  Phone,
  Link as LinkIcon,
  Database,
  Save,
  Loader2,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface SettingsData {
  id?: string;
  company_name: string;
  company_email: string;
  company_phone: string;
  n8n_webhook_url: string;
}

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [settingsId, setSettingsId] = useState<string | null>(null);

  // Form fields
  const [companyName, setCompanyName] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [companyPhone, setCompanyPhone] = useState('');
  const [n8nWebhookUrl, setN8nWebhookUrl] = useState('');

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .limit(1);

      if (error) throw error;

      if (data && data.length > 0) {
        const item = data[0];
        setSettingsId(item.id);
        setCompanyName(item.company_name || '');
        setCompanyEmail(item.company_email || '');
        setCompanyPhone(item.company_phone || '');
        setN8nWebhookUrl(item.n8n_webhook_url || '');
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload = {
        company_name: companyName,
        company_email: companyEmail,
        company_phone: companyPhone,
        n8n_webhook_url: n8nWebhookUrl
      };

      if (settingsId) {
        // Update existing settings
        const { error } = await supabase
          .from('settings')
          .update(payload)
          .eq('id', settingsId);

        if (error) throw error;
      } else {
        // Insert new settings
        const { data, error } = await supabase
          .from('settings')
          .insert([payload])
          .select();

        if (error) throw error;
        if (data && data.length > 0) {
          setSettingsId(data[0].id);
        }
      }

      alert('Configurações salvas com sucesso!');
    } catch (err) {
      console.error('Error saving settings:', err);
      alert('Erro ao salvar as configurações.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Settings className="w-6 h-6 text-zinc-200" />
          Configurações do Sistema
        </h1>
        <p className="text-zinc-400 text-sm">Gerencie o perfil da empresa, integrações com o n8n e status de conexões.</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-12 bg-zinc-950/50 border border-zinc-900 rounded-2xl">
          <Loader2 className="w-8 h-8 text-zinc-200 animate-spin" />
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Form Section */}
            <div className="md:col-span-2 space-y-6">
              {/* Company Profile */}
              <Card className="bg-zinc-950/50 border-zinc-900 text-white shadow-xl">
                <CardHeader>
                  <CardTitle className="text-sm font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    Perfil da Empresa
                  </CardTitle>
                  <CardDescription className="text-xs text-zinc-500">
                    Informações institucionais exibidas em relatórios e contratos.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="companyName">Nome da Empresa</Label>
                    <Input
                      id="companyName"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="bg-black border-zinc-900 text-white focus-visible:ring-zinc-400"
                      placeholder="Ex: Talos Tech Ltda"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="companyEmail">E-mail de Contato</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                        <Input
                          id="companyEmail"
                          type="email"
                          value={companyEmail}
                          onChange={(e) => setCompanyEmail(e.target.value)}
                          className="bg-black border-zinc-900 text-white pl-10 focus-visible:ring-zinc-400"
                          placeholder="contato@talostech.com"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="companyPhone">Telefone corporativo</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                        <Input
                          id="companyPhone"
                          value={companyPhone}
                          onChange={(e) => setCompanyPhone(e.target.value)}
                          className="bg-black border-zinc-900 text-white pl-10 focus-visible:ring-zinc-400"
                          placeholder="(11) 99999-9999"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* n8n Webhook Settings */}
              <Card className="bg-zinc-950/50 border-zinc-900 text-white shadow-xl">
                <CardHeader>
                  <CardTitle className="text-sm font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-2">
                    <LinkIcon className="w-4 h-4" />
                    Integração com n8n (WhatsApp / Automações)
                  </CardTitle>
                  <CardDescription className="text-xs text-zinc-500">
                    Insira a URL do seu webhook do n8n para enviar notificações automáticas de leads e contatos.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="n8nWebhookUrl">URL do Webhook do n8n (WhatsApp)</Label>
                    <div className="relative">
                      <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                      <Input
                        id="n8nWebhookUrl"
                        value={n8nWebhookUrl}
                        onChange={(e) => setN8nWebhookUrl(e.target.value)}
                        className="bg-black border-zinc-900 text-white pl-10 focus-visible:ring-zinc-400"
                        placeholder="https://primary-production.n8n.cloud/webhook/..."
                      />
                    </div>
                    <p className="text-[10px] text-zinc-500 mt-1">
                      Os eventos disparados pelo funil de vendas (CRM) e pela lista de clientes serão enviados via POST JSON para esta URL.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center gap-2 px-5 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-black font-semibold rounded-xl transition-all shadow-lg active:scale-95 border-0 text-sm font-bold"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Salvar Configurações
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Status Sidepanel */}
            <div className="space-y-6">
              <Card className="bg-zinc-950/50 border-zinc-900 text-white shadow-xl h-fit">
                <CardHeader>
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                    Status das Conexões
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Database */}
                  <div className="flex items-center justify-between p-3 bg-black/50 border border-zinc-900 rounded-xl">
                    <div className="flex items-center gap-2.5">
                      <Database className="w-4 h-4 text-zinc-400" />
                      <div className="text-xs">
                        <p className="font-bold text-white">Banco de Dados</p>
                        <p className="text-[10px] text-zinc-500">Supabase PostgreSQL</p>
                      </div>
                    </div>
                    <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 font-bold uppercase text-[9px] gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Conectado
                    </Badge>
                  </div>

                  {/* n8n status */}
                  <div className="flex items-center justify-between p-3 bg-black/50 border border-zinc-900 rounded-xl">
                    <div className="flex items-center gap-2.5">
                      <LinkIcon className="w-4 h-4 text-zinc-400" />
                      <div className="text-xs">
                        <p className="font-bold text-white">Integração n8n</p>
                        <p className="text-[10px] text-zinc-500">Gatilho WhatsApp</p>
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
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
