"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export type KycFormState = {
  level: "base" | "complete";
  declarationAccepted: boolean;
  transaction_channel: string;
  transaction_channel_other: string;
  transaction_date: string;
  transaction_time: string;
  transaction_amount: string;
  transaction_currency: string;
  transaction_amount_usd: string;
  funds_source: string;
  transaction_purpose: string;
  beneficiary_details: string;
  full_name: string;
  date_of_birth: string;
  us_status: string;
  id_type: string;
  id_type_other: string;
  id_number: string;
  id_issuer_country: string;
  id_expiry: string;
  ssn: string;
  residential_address: string;
  phone: string;
  email: string;
  occupation: string;
  company: string;
  company_role: string;
  business_name: string;
  business_registration_number: string;
  business_function: string;
  business_address: string;
  authorized_representative_name: string;
  authorized_representative_title: string;
  authorized_representative_id_type: string;
  authorized_representative_id_number: string;
  authorized_representative_id_issuer_country: string;
  authorized_representative_id_expiry: string;
  customer_signature: string;
  verification_date: string;
  compliance_officer_name: string;
  compliance_officer_signature: string;
  verification_method: string;
  verification_check_id: boolean;
  verification_check_proof_of_address: boolean;
  verification_check_business_license: boolean;
  verification_check_other: boolean;
  verification_other: string;
};

export function createEmptyKycForm(): KycFormState {
  return {
    level: "base",
    declarationAccepted: false,
    transaction_channel: "",
    transaction_channel_other: "",
    transaction_date: "",
    transaction_time: "",
    transaction_amount: "",
    transaction_currency: "",
    transaction_amount_usd: "",
    funds_source: "",
    transaction_purpose: "",
    beneficiary_details: "",
    full_name: "",
    date_of_birth: "",
    us_status: "",
    id_type: "",
    id_type_other: "",
    id_number: "",
    id_issuer_country: "",
    id_expiry: "",
    ssn: "",
    residential_address: "",
    phone: "",
    email: "",
    occupation: "",
    company: "",
    company_role: "",
    business_name: "",
    business_registration_number: "",
    business_function: "",
    business_address: "",
    authorized_representative_name: "",
    authorized_representative_title: "",
    authorized_representative_id_type: "",
    authorized_representative_id_number: "",
    authorized_representative_id_issuer_country: "",
    authorized_representative_id_expiry: "",
    customer_signature: "",
    verification_date: "",
    compliance_officer_name: "",
    compliance_officer_signature: "",
    verification_method: "",
    verification_check_id: false,
    verification_check_proof_of_address: false,
    verification_check_business_license: false,
    verification_check_other: false,
    verification_other: "",
  };
}

type KycModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: KycFormState;
  onSave: (next: KycFormState) => void;
};

export default function KycModal({ open, onOpenChange, value, onSave }: KycModalProps) {
  const [draft, setDraft] = useState<KycFormState>(value);

  useEffect(() => {
    if (open) {
      setDraft(value);
    }
  }, [open, value]);

  const title = useMemo(
    () => (draft.level === "complete" ? "Formulario KYC completo" : "Formulario KYC base"),
    [draft.level]
  );
  const modalWidthClass =
    draft.level === "base" ? "sm:w-[1000px] sm:max-w-[1000px]" : "sm:max-w-screen";

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    onSave(draft);
    onOpenChange(false);
  };

  const setField = <K extends keyof KycFormState>(field: K, nextValue: KycFormState[K]) => {
    setDraft((prev) => ({ ...prev, [field]: nextValue }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={`h-screen max-w-screen overflow-auto rounded-[20px] ${modalWidthClass}`}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <p className="text-xs text-gray-500">
            Declaracion jurada para CGE Currency Global Exchange. Este formulario no bloquea la
            venta por ahora y se guarda como apoyo operativo.
          </p>
        </DialogHeader>

        <form className="space-y-4 px-2 sm:px-6" onSubmit={onSubmit}>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div>
              <label className="text-xs font-medium text-gray-600">Nivel KYC</label>
              <select
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                value={draft.level}
                onChange={(event) => setField("level", event.target.value as "base" | "complete")}
              >
                <option value="base">Base</option>
                <option value="complete">Completo</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Fecha transaccion</label>
              <input
                type="date"
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                value={draft.transaction_date}
                onChange={(event) => setField("transaction_date", event.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Hora transaccion</label>
              <input
                type="time"
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                value={draft.transaction_time}
                onChange={(event) => setField("transaction_time", event.target.value)}
              />
            </div>
          </div>

          <section className="rounded-2xl border bg-gray-50 p-3">
            <h4 className="text-sm font-semibold text-gray-800">Informacion de la transaccion</h4>
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
              <div>
                <label className="text-xs font-medium text-gray-600">Canal</label>
                <select
                  className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                  value={draft.transaction_channel}
                  onChange={(event) => setField("transaction_channel", event.target.value)}
                >
                  <option value="">Seleccionar...</option>
                  <option value="presencial">Presencial</option>
                  <option value="envio_postal">Envio postal</option>
                  <option value="transferencia">Transferencia</option>
                  <option value="otro">Otro</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Monto</label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                  value={draft.transaction_amount}
                  onChange={(event) => setField("transaction_amount", event.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Divisa</label>
                <input
                  className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                  value={draft.transaction_currency}
                  onChange={(event) => setField("transaction_currency", event.target.value)}
                  placeholder="USD"
                />
              </div>
            </div>
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <label className="text-xs font-medium text-gray-600">Equivalente USD</label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                  value={draft.transaction_amount_usd}
                  onChange={(event) => setField("transaction_amount_usd", event.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Otro canal</label>
                <input
                  className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                  value={draft.transaction_channel_other}
                  onChange={(event) => setField("transaction_channel_other", event.target.value)}
                  placeholder="Si aplica"
                />
              </div>
            </div>
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <label className="text-xs font-medium text-gray-600">Proveniencia de fondos</label>
                <textarea
                  rows={2}
                  className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                  value={draft.funds_source}
                  onChange={(event) => setField("funds_source", event.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Proposito de la transaccion</label>
                <textarea
                  rows={2}
                  className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                  value={draft.transaction_purpose}
                  onChange={(event) => setField("transaction_purpose", event.target.value)}
                />
              </div>
            </div>
            <div className="mt-3">
              <label className="text-xs font-medium text-gray-600">Detalles de pago del beneficiario</label>
              <textarea
                rows={2}
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                value={draft.beneficiary_details}
                onChange={(event) => setField("beneficiary_details", event.target.value)}
              />
            </div>
          </section>

          <section className="rounded-2xl border bg-gray-50 p-3">
            <h4 className="text-sm font-semibold text-gray-800">Datos personales</h4>
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <label className="text-xs font-medium text-gray-600">Nombre completo</label>
                <input
                  className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                  value={draft.full_name}
                  onChange={(event) => setField("full_name", event.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Fecha de nacimiento</label>
                <input
                  type="date"
                  className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                  value={draft.date_of_birth}
                  onChange={(event) => setField("date_of_birth", event.target.value)}
                />
              </div>
            </div>
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
              <div>
                <label className="text-xs font-medium text-gray-600">Condicion en USA</label>
                <select
                  className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                  value={draft.us_status}
                  onChange={(event) => setField("us_status", event.target.value)}
                >
                  <option value="">Seleccionar...</option>
                  <option value="citizen">Ciudadano</option>
                  <option value="resident">Residente</option>
                  <option value="tourist">Turista</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Tipo de identificacion</label>
                <select
                  className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                  value={draft.id_type}
                  onChange={(event) => setField("id_type", event.target.value)}
                >
                  <option value="">Seleccionar...</option>
                  <option value="passport">Pasaporte</option>
                  <option value="id">ID</option>
                  <option value="license">Licencia</option>
                  <option value="other">Otro</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">ID otro</label>
                <input
                  className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                  value={draft.id_type_other}
                  onChange={(event) => setField("id_type_other", event.target.value)}
                />
              </div>
            </div>
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
              <div>
                <label className="text-xs font-medium text-gray-600">Numero identificacion</label>
                <input
                  className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                  value={draft.id_number}
                  onChange={(event) => setField("id_number", event.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Pais emisor</label>
                <input
                  className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                  value={draft.id_issuer_country}
                  onChange={(event) => setField("id_issuer_country", event.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Fecha caducidad</label>
                <input
                  type="date"
                  className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                  value={draft.id_expiry}
                  onChange={(event) => setField("id_expiry", event.target.value)}
                />
              </div>
            </div>
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
              <div>
                <label className="text-xs font-medium text-gray-600">SSN</label>
                <input
                  className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                  value={draft.ssn}
                  onChange={(event) => setField("ssn", event.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Telefono</label>
                <input
                  className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                  value={draft.phone}
                  onChange={(event) => setField("phone", event.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Correo</label>
                <input
                  type="email"
                  className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                  value={draft.email}
                  onChange={(event) => setField("email", event.target.value)}
                />
              </div>
            </div>
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <label className="text-xs font-medium text-gray-600">Direccion residencial</label>
                <textarea
                  rows={2}
                  className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                  value={draft.residential_address}
                  onChange={(event) => setField("residential_address", event.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Ocupacion / compania / rol</label>
                <textarea
                  rows={2}
                  className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                  value={`${draft.occupation}\n${draft.company}\n${draft.company_role}`}
                  onChange={(event) => {
                    const [occupation = "", company = "", role = ""] = event.target.value.split("\n");
                    setDraft((prev) => ({
                      ...prev,
                      occupation,
                      company,
                      company_role: role,
                    }));
                  }}
                />
              </div>
            </div>
          </section>

          {draft.level === "complete" ? (
            <section className="rounded-2xl border bg-gray-50 p-3">
              <h4 className="text-sm font-semibold text-gray-800">Datos empresariales y verificacion</h4>
              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                <input
                  className="rounded-xl border px-3 py-2 text-sm"
                  placeholder="Nombre empresa"
                  value={draft.business_name}
                  onChange={(event) => setField("business_name", event.target.value)}
                />
                <input
                  className="rounded-xl border px-3 py-2 text-sm"
                  placeholder="Numero de registro"
                  value={draft.business_registration_number}
                  onChange={(event) => setField("business_registration_number", event.target.value)}
                />
                <input
                  className="rounded-xl border px-3 py-2 text-sm"
                  placeholder="Funcion de la empresa"
                  value={draft.business_function}
                  onChange={(event) => setField("business_function", event.target.value)}
                />
                <input
                  className="rounded-xl border px-3 py-2 text-sm"
                  placeholder="Direccion de la empresa"
                  value={draft.business_address}
                  onChange={(event) => setField("business_address", event.target.value)}
                />
                <input
                  className="rounded-xl border px-3 py-2 text-sm"
                  placeholder="Representante autorizado"
                  value={draft.authorized_representative_name}
                  onChange={(event) => setField("authorized_representative_name", event.target.value)}
                />
                <input
                  className="rounded-xl border px-3 py-2 text-sm"
                  placeholder="Titulo representante"
                  value={draft.authorized_representative_title}
                  onChange={(event) => setField("authorized_representative_title", event.target.value)}
                />
              </div>
              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-4">
                <input
                  className="rounded-xl border px-3 py-2 text-sm"
                  placeholder="Tipo ID rep"
                  value={draft.authorized_representative_id_type}
                  onChange={(event) => setField("authorized_representative_id_type", event.target.value)}
                />
                <input
                  className="rounded-xl border px-3 py-2 text-sm"
                  placeholder="Numero ID rep"
                  value={draft.authorized_representative_id_number}
                  onChange={(event) => setField("authorized_representative_id_number", event.target.value)}
                />
                <input
                  className="rounded-xl border px-3 py-2 text-sm"
                  placeholder="Pais emisor rep"
                  value={draft.authorized_representative_id_issuer_country}
                  onChange={(event) => setField("authorized_representative_id_issuer_country", event.target.value)}
                />
                <input
                  type="date"
                  className="rounded-xl border px-3 py-2 text-sm"
                  value={draft.authorized_representative_id_expiry}
                  onChange={(event) => setField("authorized_representative_id_expiry", event.target.value)}
                />
              </div>
              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                <input
                  type="date"
                  className="rounded-xl border px-3 py-2 text-sm"
                  placeholder="Verification date"
                  value={draft.verification_date}
                  onChange={(event) => setField("verification_date", event.target.value)}
                />
                <input
                  className="rounded-xl border px-3 py-2 text-sm"
                  placeholder="Compliance officer"
                  value={draft.compliance_officer_name}
                  onChange={(event) => setField("compliance_officer_name", event.target.value)}
                />
                <input
                  className="rounded-xl border px-3 py-2 text-sm"
                  placeholder="Verification method"
                  value={draft.verification_method}
                  onChange={(event) => setField("verification_method", event.target.value)}
                />
              </div>
              <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-700">
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={draft.verification_check_id}
                    onChange={(event) => setField("verification_check_id", event.target.checked)}
                  />
                  ID
                </label>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={draft.verification_check_proof_of_address}
                    onChange={(event) =>
                      setField("verification_check_proof_of_address", event.target.checked)
                    }
                  />
                  Proof of Address
                </label>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={draft.verification_check_business_license}
                    onChange={(event) =>
                      setField("verification_check_business_license", event.target.checked)
                    }
                  />
                  Business License
                </label>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={draft.verification_check_other}
                    onChange={(event) => setField("verification_check_other", event.target.checked)}
                  />
                  Other
                </label>
              </div>
              {draft.verification_check_other ? (
                <input
                  className="mt-2 w-full rounded-xl border px-3 py-2 text-sm"
                  placeholder="Detalle verificacion other"
                  value={draft.verification_other}
                  onChange={(event) => setField("verification_other", event.target.value)}
                />
              ) : null}
            </section>
          ) : null}

          <section className="rounded-2xl border bg-gray-50 p-3">
            <label className="inline-flex items-start gap-2 text-xs text-gray-700">
              <input
                type="checkbox"
                checked={draft.declarationAccepted}
                onChange={(event) => setField("declarationAccepted", event.target.checked)}
              />
              <span>
                Certifico bajo mi responsabilidad que los fondos de esta transaccion provienen de
                actividades licitas y no se relacionan con fraude, lavado de activos o
                financiamiento del terrorismo.
              </span>
            </label>
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <label className="text-xs font-medium text-gray-600">Firma del cliente</label>
                <input
                  className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                  value={draft.customer_signature}
                  onChange={(event) => setField("customer_signature", event.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Firma compliance officer</label>
                <input
                  className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                  value={draft.compliance_officer_signature}
                  onChange={(event) => setField("compliance_officer_signature", event.target.value)}
                />
              </div>
            </div>
          </section>

          <div className="flex items-center justify-end gap-2 pb-4">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="rounded-xl border px-4 py-2 text-sm hover:bg-gray-100"
            >
              Cerrar
            </button>
            <button
              type="submit"
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:brightness-110"
            >
              Guardar KYC
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
