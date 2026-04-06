// app/marketing/page.tsx (o donde esté tu página)
"use client";

import React, { useEffect, useState } from "react";
import { WizardModal } from "@/components/marketing/wizardModal";
import { WizardState } from "@/types";
import { createClient, Campaign } from "@/utils/supabase/client";

type CampaignRow = {
  id: string;
  name: string;
  audience: string;
  status: string;
  date: string;
  deliveryRate: number;
  ctr: number;
  sends: number;
  conversions: number;
  image_url: string;
};

export default function CampaignsManager() {
  const [rows, setRows] = useState<CampaignRow[]>([]);
  const [openWizard, setOpenWizard] = useState(false);
  const [loading, setLoading] = useState(false);
  const supabase = createClient()

  useEffect(() => {
    loadCampaigns();
  }, []);

  async function loadCampaigns() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('campaigns')
        .select(`
          *,
          offers (
            name,
            code
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mapped: CampaignRow[] = (data || []).map((c: Campaign) => ({
        id: c.id,
        name: c.name,
        audience: c.estimated_audience?.toString() || '0',
        status: translateStatus(c.status),
        date: new Date(c.created_at).toLocaleDateString('es-ES'),
        deliveryRate: c.total_sent > 0
          ? Math.round((c.total_delivered / c.total_sent) * 100)
          : 0,
        ctr: c.total_delivered > 0
          ? Math.round((c.total_clicked / c.total_delivered) * 100)
          : 0,
        sends: c.total_sent || 0,
        conversions: c.total_converted || 0,
        image_url: '/joel.png'
      }));

      setRows(mapped);
    } catch (error) {
      console.error('Error loading campaigns:', error);
    } finally {
      setLoading(false);
    }
  }

  function translateStatus(status: string): string {
    const translations: Record<string, string> = {
      'draft': 'Borrador',
      'scheduled': 'Programada',
      'active': 'Activa',
      'paused': 'Pausada',
      'completed': 'Finalizada',
      'cancelled': 'Cancelada'
    };
    return translations[status] || status;
  }

  function onCreateCampaign(w: WizardState) {
    // Recargar campañas después de crear
    loadCampaigns();
  }

  return (
    <main className="min-h-screen w-full px-[25px] py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Marketing</h1>
        <button
          onClick={() => setOpenWizard(true)}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-full bg-blue-600 text-white px-4 py-2 text-sm hover:brightness-110 disabled:opacity-50"
        >
          Nueva Campaña
        </button>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-8">
          <p className="text-gray-500">Cargando campañas...</p>
        </div>
      )}

      {/* Table */}
      {!loading && (
        <div className="bg-white flex flex-col items-start gap-2.5">
          {/* Headers */}
          <div className="flex gap-2.5 w-full">
            <div className="w-[200px] text-[#666] font-inter text-[15px] not-italic font-normal leading-normal">Nombre</div>
            <div className="w-[138px] text-[#666] font-inter text-[15px] not-italic font-normal leading-normal">Audiencia</div>
            <div className="w-[109px] text-[#666] font-inter text-[15px] not-italic font-normal leading-normal">Estado</div>
            <div className="w-[120px] text-[#666] font-inter text-[15px] not-italic font-normal leading-normal">Fecha</div>
            <div className="w-[80px] text-[#666] font-inter text-[15px] not-italic font-normal leading-normal">% Entrega</div>
            <div className="w-[56px] text-[#666] font-inter text-[15px] not-italic font-normal leading-normal">CTR</div>
            <div className="w-[87px] text-[#666] font-inter text-[15px] not-italic font-normal leading-normal"># Entregas</div>
            <div className="w-[132px] text-[#666] font-inter text-[15px] not-italic font-normal leading-normal">Conversiones</div>
          </div>

          {/* Rows */}
          <div className="space-y-[10px] w-full">
            {rows.map((r) => (
              <div key={r.id} className="flex gap-2.5 p-[4px] h-[48px] bg-[#F6F6F6] items-center rounded-[8px] hover:bg-gray-100 self-stretch">
                <div className="w-[200px] flex items-center gap-2.5">
                  <div
                    className="w-[40px] h-[40px] shrink-0 rounded-lg flex items-center justify-center bg-gradient-to-br from-pink-400 to-purple-500 bg-cover bg-center bg-no-repeat"
                    style={{
                      backgroundImage: r.image_url ? `url(${r.image_url})` : undefined
                    }}
                  />
                  <span className="w-full overflow-hidden text-black text-ellipsis font-inter text-[15px] font-normal leading-normal">{r.name}</span>
                </div>
                <div className="w-[138px] overflow-hidden text-black text-ellipsis font-inter text-[15px] font-normal leading-normal">{r.audience}</div>
                <div className="w-[109px] text-gray-600">{r.status}</div>
                <div className="w-[120px] text-gray-600">{r.date}</div>
                <div className="w-[80px] text-gray-600">{r.deliveryRate}%</div>
                <div className="w-[56px] text-gray-600">{r.ctr}%</div>
                <div className="w-[87px] text-gray-600">{r.sends}</div>
                <div className="w-[132px] text-gray-600">{r.conversions}</div>
              </div>
            ))}
          </div>

          {/* Empty State */}
          {rows.length === 0 && (
            <div className="text-center py-8 w-full">
              <p className="text-gray-500">No hay campañas aún. Crea tu primera campaña.</p>
            </div>
          )}
        </div>
      )}

      {/* Wizard Modal */}
      <WizardModal
        open={openWizard}
        onClose={() => setOpenWizard(false)}
        onCreate={onCreateCampaign}
      />
    </main>
  );
}
