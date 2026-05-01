"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowser } from "@/utils/supabase/client";
import { useEnvironment } from "@/context/EnvironmentContext";
import { cn } from "@/lib/utils";
import { TrendingUp } from "lucide-react";

interface CategoryStats {
  name: string;
  count: number;
  color: string;
}

export function CategoryChart({ className }: { className?: string }) {
  const { org } = useEnvironment();
  const organizationId = org?.id;
  const supabase = getSupabaseBrowser();
  
  const [stats, setStats] = useState<CategoryStats[]>([]);
  const [loading, setLoading] = useState(true);

  const colors = [
    "bg-blue-500",
    "bg-green-500", 
    "bg-yellow-500",
    "bg-purple-500",
    "bg-pink-500",
    "bg-indigo-500",
    "bg-teal-500",
    "bg-orange-500",
  ];

  useEffect(() => {
    if (!organizationId) return;

    const fetchStats = async () => {
      try {
        const { data, error } = await supabase
          .from("product_categories")
          .select("id, name")
          .eq("organization_id", organizationId)
          .order("name")
          .limit(8);

        if (error || !data) {
          setStats([]);
          return;
        }

        const categoriesWithCount = await Promise.all(
          data.map(async (cat, index) => {
            const { count } = await supabase
              .from("product_category_products")
              .select("*", { count: "estimated", head: true })
              .eq("category_id", cat.id);

            return {
              name: cat.name,
              count: count || 0,
              color: colors[index % colors.length],
            };
          })
        );

        setStats(categoriesWithCount.filter((s) => s.count > 0));
      } catch (error) {
        console.error("Error fetching category stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [organizationId, supabase]);

  if (loading) {
    return (
      <div className={cn("bg-muted/30 rounded-xl p-4 h-40 animate-pulse", className)} />
    );
  }

  if (stats.length === 0) {
    return null;
  }

  const total = stats.reduce((sum, s) => sum + s.count, 0);
  const maxCount = Math.max(...stats.map((s) => s.count));

  return (
    <div className={cn("bg-muted/30 rounded-xl p-4", className)}>
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-4 h-4 text-muted-foreground" />
        <h3 className="text-sm font-medium">Productos por categoría</h3>
      </div>
      
      <div className="space-y-2">
        {stats.slice(0, 5).map((stat) => (
          <div key={stat.name} className="flex items-center gap-3">
            <div className="w-20 truncate text-xs text-muted-foreground">
              {stat.name}
            </div>
            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={cn("h-full rounded-full transition-all", stat.color)}
                style={{ width: `${(stat.count / maxCount) * 100}%` }}
              />
            </div>
            <div className="w-8 text-xs text-right font-medium">
              {stat.count}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 pt-3 border-t text-xs text-muted-foreground text-center">
        Total: {total} productos en {stats.length} categorías
      </div>
    </div>
  );
}