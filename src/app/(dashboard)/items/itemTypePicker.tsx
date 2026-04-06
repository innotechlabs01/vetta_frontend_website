import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "lucide-react";

export type Product = {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  price: number | null;
  image_url: string | null;
  is_available: boolean | null;
  created_by: string;
  created_at: string | null;
  updated_at: string | null;
  item_type?: 'physical' | 'prepared_food' | 'digital' | 'medication' | 'other' | null;
};


