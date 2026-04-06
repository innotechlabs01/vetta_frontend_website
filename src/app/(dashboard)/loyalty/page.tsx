import { cookies } from "next/headers";
import { getLoyaltyRewardsAction } from "@/app/actions";
import LoyaltyModule from "./LoyaltyModule"; 

export default async function LoyaltyPage() {
  const cookieStore = await cookies();
  const orgId = cookieStore.get("org_id")?.value;
  
  if (!orgId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">No hay organización seleccionada</p>
      </div>
    );
  }

  const rewards = await getLoyaltyRewardsAction(orgId);
  
  return <LoyaltyModule initialRewards={rewards} />;
}