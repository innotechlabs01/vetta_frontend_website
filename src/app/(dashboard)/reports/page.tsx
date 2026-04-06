import Link from "next/link";
import { ArrowRight } from "lucide-react";

const reportCards = [
  {
    title: "Transacciones",
    description: "Detalle de operaciones con KPIs y tabla agregable.",
    href: "/reports/transactions",
  },
  {
    title: "Balance",
    description: "Balance de monedas con exportación a Excel.",
    href: "/reports/balance",
  },
];

export default function ReportsPage() {
  return (
    <div className="px-6 py-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Informes</h1>
          <p className="text-sm text-gray-500">
            Acceso rápido a los reportes principales.
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {reportCards.map((card) => (
          <Link
            key={card.title}
            href={card.href}
            className="group rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-blue-200 hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold text-gray-900">{card.title}</h2>
                <p className="mt-1 text-sm text-gray-500">{card.description}</p>
              </div>
              <span className="mt-1 inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-gray-400 transition group-hover:border-blue-200 group-hover:text-blue-600">
                <ArrowRight className="h-4 w-4" />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
