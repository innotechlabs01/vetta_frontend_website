export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      campaigns: {
        Row: {
          audience_filters: Json | null
          audience_setup: Json | null
          automation_config: Json | null
          channels: Database["public"]["Enums"]["channel_type"][] | null
          created_at: string | null
          created_by: string | null
          estimated_audience: number | null
          goal: Database["public"]["Enums"]["campaign_goal"]
          goal_description: string | null
          goal_label: string | null
          id: string
          is_automated: boolean | null
          message_template: string | null
          name: string
          offer_id: string | null
          organization_id: string
          scheduled_at: string | null
          status: Database["public"]["Enums"]["campaign_status"] | null
          total_queued: number | null
          updated_at: string | null
        }
        Insert: {
          audience_filters?: Json | null
          audience_setup?: Json | null
          automation_config?: Json | null
          channels?: Database["public"]["Enums"]["channel_type"][] | null
          created_at?: string | null
          created_by?: string | null
          estimated_audience?: number | null
          goal: Database["public"]["Enums"]["campaign_goal"]
          goal_description?: string | null
          goal_label?: string | null
          id?: string
          is_automated?: boolean | null
          message_template?: string | null
          name: string
          offer_id?: string | null
          organization_id: string
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["campaign_status"] | null
          total_queued?: number | null
          updated_at?: string | null
        }
        Update: {
          audience_filters?: Json | null
          audience_setup?: Json | null
          automation_config?: Json | null
          channels?: Database["public"]["Enums"]["channel_type"][] | null
          created_at?: string | null
          created_by?: string | null
          estimated_audience?: number | null
          goal?: Database["public"]["Enums"]["campaign_goal"]
          goal_description?: string | null
          goal_label?: string | null
          id?: string
          is_automated?: boolean | null
          message_template?: string | null
          name?: string
          offer_id?: string | null
          organization_id?: string
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["campaign_status"] | null
          total_queued?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      cart_items: {
        Row: {
          cart_id: string
          created_at: string | null
          id: string
          image_url: string | null
          price: number
          product_id: string
          quantity: number
          title: string
          updated_at: string | null
        }
        Insert: {
          cart_id: string
          created_at?: string | null
          id?: string
          image_url?: string | null
          price: number
          product_id: string
          quantity?: number
          title: string
          updated_at?: string | null
        }
        Update: {
          cart_id?: string
          created_at?: string | null
          id?: string
          image_url?: string | null
          price?: number
          product_id?: string
          quantity?: number
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_cart_id_fkey"
            columns: ["cart_id"]
            isOneToOne: false
            referencedRelation: "carts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      carts: {
        Row: {
          created_at: string | null
          id: string
          metadata: Json | null
          session_id: string | null
          status: string
          storespace_id: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          metadata?: Json | null
          session_id?: string | null
          status?: string
          storespace_id: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          metadata?: Json | null
          session_id?: string | null
          status?: string
          storespace_id?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "carts_storespace_id_fkey"
            columns: ["storespace_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_movements: {
        Row: {
          amount: number
          cashier_id: string | null
          counted_amount: number | null
          created_at: string | null
          created_by: string | null
          currency_code: string | null
          direction: Database["public"]["Enums"]["cash_direction"]
          expected_amount: number | null
          id: string
          location_id: string | null
          metadata: Json
          note: string | null
          organization_id: string
          payment_id: string | null
          pos_id: string | null
          reason: Database["public"]["Enums"]["cash_reason"]
          sale_id: string | null
          shift_id: string | null
          status: Database["public"]["Enums"]["cash_movement_status"]
          updated_at: string | null
        }
        Insert: {
          amount: number
          cashier_id?: string | null
          counted_amount?: number | null
          created_at?: string | null
          created_by?: string | null
          currency_code?: string | null
          direction: Database["public"]["Enums"]["cash_direction"]
          expected_amount?: number | null
          id?: string
          location_id?: string | null
          metadata?: Json
          note?: string | null
          organization_id: string
          payment_id?: string | null
          pos_id?: string | null
          reason?: Database["public"]["Enums"]["cash_reason"]
          sale_id?: string | null
          shift_id?: string | null
          status?: Database["public"]["Enums"]["cash_movement_status"]
          updated_at?: string | null
        }
        Update: {
          amount?: number
          cashier_id?: string | null
          counted_amount?: number | null
          created_at?: string | null
          created_by?: string | null
          currency_code?: string | null
          direction?: Database["public"]["Enums"]["cash_direction"]
          expected_amount?: number | null
          id?: string
          location_id?: string | null
          metadata?: Json
          note?: string | null
          organization_id?: string
          payment_id?: string | null
          pos_id?: string | null
          reason?: Database["public"]["Enums"]["cash_reason"]
          sale_id?: string | null
          shift_id?: string | null
          status?: Database["public"]["Enums"]["cash_movement_status"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cash_movements_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_movements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_movements_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_movements_pos_id_fkey"
            columns: ["pos_id"]
            isOneToOne: false
            referencedRelation: "pos_terminals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_movements_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_movements_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "v_sales_with_balance"
            referencedColumns: ["sale_id"]
          },
          {
            foreignKeyName: "cash_movements_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "cash_shifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_movements_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "v_cash_position"
            referencedColumns: ["shift_id"]
          },
          {
            foreignKeyName: "cash_movements_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "v_shift_summary"
            referencedColumns: ["shift_id"]
          },
        ]
      }
      cash_shifts: {
        Row: {
          cashier_id: string
          closed_at: string | null
          closed_by: string | null
          counted_closing_amount: number
          created_at: string | null
          delivery_enabled: boolean
          delivery_status: Database["public"]["Enums"]["channel_status"] | null
          difference_amount: number | null
          expected_closing_amount: number
          id: string
          location_id: string | null
          metadata: Json
          national_shipping_enabled: boolean
          national_shipping_status:
            | Database["public"]["Enums"]["channel_status"]
            | null
          notes: string | null
          opened_at: string
          opened_by: string | null
          opening_amount: number
          organization_id: string
          pickup_enabled: boolean
          pickup_status: Database["public"]["Enums"]["channel_status"] | null
          pos_id: string | null
          status: string
          total_card: number
          total_cash: number
          total_others: number
          total_transfer: number
          updated_at: string | null
        }
        Insert: {
          cashier_id: string
          closed_at?: string | null
          closed_by?: string | null
          counted_closing_amount?: number
          created_at?: string | null
          delivery_enabled?: boolean
          delivery_status?: Database["public"]["Enums"]["channel_status"] | null
          difference_amount?: number | null
          expected_closing_amount?: number
          id?: string
          location_id?: string | null
          metadata?: Json
          national_shipping_enabled?: boolean
          national_shipping_status?:
            | Database["public"]["Enums"]["channel_status"]
            | null
          notes?: string | null
          opened_at?: string
          opened_by?: string | null
          opening_amount?: number
          organization_id: string
          pickup_enabled?: boolean
          pickup_status?: Database["public"]["Enums"]["channel_status"] | null
          pos_id?: string | null
          status?: string
          total_card?: number
          total_cash?: number
          total_others?: number
          total_transfer?: number
          updated_at?: string | null
        }
        Update: {
          cashier_id?: string
          closed_at?: string | null
          closed_by?: string | null
          counted_closing_amount?: number
          created_at?: string | null
          delivery_enabled?: boolean
          delivery_status?: Database["public"]["Enums"]["channel_status"] | null
          difference_amount?: number | null
          expected_closing_amount?: number
          id?: string
          location_id?: string | null
          metadata?: Json
          national_shipping_enabled?: boolean
          national_shipping_status?:
            | Database["public"]["Enums"]["channel_status"]
            | null
          notes?: string | null
          opened_at?: string
          opened_by?: string | null
          opening_amount?: number
          organization_id?: string
          pickup_enabled?: boolean
          pickup_status?: Database["public"]["Enums"]["channel_status"] | null
          pos_id?: string | null
          status?: string
          total_card?: number
          total_cash?: number
          total_others?: number
          total_transfer?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cash_shifts_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_shifts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_shifts_pos_id_fkey"
            columns: ["pos_id"]
            isOneToOne: false
            referencedRelation: "pos_terminals"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_addresses: {
        Row: {
          city: string | null
          country_code: string | null
          created_at: string
          customer_id: string
          external_provider: string | null
          external_user_id: string | null
          id: string
          instructions: string | null
          is_default: boolean
          label: string | null
          lat: number | null
          line1: string
          line2: string | null
          lng: number | null
          metadata: Json
          neighborhood: string | null
          organization_id: string
          phone: string | null
          postal_code: string | null
          recipient_name: string | null
          state: string | null
          updated_at: string
        }
        Insert: {
          city?: string | null
          country_code?: string | null
          created_at?: string
          customer_id: string
          external_provider?: string | null
          external_user_id?: string | null
          id?: string
          instructions?: string | null
          is_default?: boolean
          label?: string | null
          lat?: number | null
          line1: string
          line2?: string | null
          lng?: number | null
          metadata?: Json
          neighborhood?: string | null
          organization_id: string
          phone?: string | null
          postal_code?: string | null
          recipient_name?: string | null
          state?: string | null
          updated_at?: string
        }
        Update: {
          city?: string | null
          country_code?: string | null
          created_at?: string
          customer_id?: string
          external_provider?: string | null
          external_user_id?: string | null
          id?: string
          instructions?: string | null
          is_default?: boolean
          label?: string | null
          lat?: number | null
          line1?: string
          line2?: string | null
          lng?: number | null
          metadata?: Json
          neighborhood?: string | null
          organization_id?: string
          phone?: string | null
          postal_code?: string | null
          recipient_name?: string | null
          state?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_addresses_customer_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_addresses_org_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_payment_methods: {
        Row: {
          brand: string | null
          created_at: string
          customer_id: string
          exp_month: number | null
          exp_year: number | null
          external_provider: string | null
          external_user_id: string | null
          id: string
          is_default: boolean
          last4: string | null
          metadata: Json
          organization_id: string
          provider: string
          provider_customer_id: string | null
          provider_payment_method_id: string
          status: string
          updated_at: string
        }
        Insert: {
          brand?: string | null
          created_at?: string
          customer_id: string
          exp_month?: number | null
          exp_year?: number | null
          external_provider?: string | null
          external_user_id?: string | null
          id?: string
          is_default?: boolean
          last4?: string | null
          metadata?: Json
          organization_id: string
          provider: string
          provider_customer_id?: string | null
          provider_payment_method_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          brand?: string | null
          created_at?: string
          customer_id?: string
          exp_month?: number | null
          exp_year?: number | null
          external_provider?: string | null
          external_user_id?: string | null
          id?: string
          is_default?: boolean
          last4?: string | null
          metadata?: Json
          organization_id?: string
          provider?: string
          provider_customer_id?: string | null
          provider_payment_method_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_payment_methods_customer_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_payment_methods_org_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          birthday: string | null
          created_at: string | null
          created_by: string | null
          current_credit_balance: number | null
          daily_limit_usd: number | null
          email: string | null
          external_provider: string | null
          external_user_id: string | null
          id: string
          id_number: string | null
          id_type: string | null
          is_loyal: boolean | null
          last_limit_check_at: string | null
          last_purchase_date: string | null
          last_purchase_location: string | null
          loyalty_level_id: string | null
          loyalty_points: number | null
          name: string
          notes: string | null
          organization_id: string
          phone: string | null
          updated_at: string | null
          zone: string | null
        }
        Insert: {
          address?: string | null
          birthday?: string | null
          created_at?: string | null
          created_by?: string | null
          current_credit_balance?: number | null
          daily_limit_usd?: number | null
          email?: string | null
          external_provider?: string | null
          external_user_id?: string | null
          id?: string
          id_number?: string | null
          id_type?: string | null
          is_loyal?: boolean | null
          last_limit_check_at?: string | null
          last_purchase_date?: string | null
          last_purchase_location?: string | null
          loyalty_level_id?: string | null
          loyalty_points?: number | null
          name: string
          notes?: string | null
          organization_id: string
          phone?: string | null
          updated_at?: string | null
          zone?: string | null
        }
        Update: {
          address?: string | null
          birthday?: string | null
          created_at?: string | null
          created_by?: string | null
          current_credit_balance?: number | null
          daily_limit_usd?: number | null
          email?: string | null
          external_provider?: string | null
          external_user_id?: string | null
          id?: string
          id_number?: string | null
          id_type?: string | null
          is_loyal?: boolean | null
          last_limit_check_at?: string | null
          last_purchase_date?: string | null
          last_purchase_location?: string | null
          loyalty_level_id?: string | null
          loyalty_points?: number | null
          name?: string
          notes?: string | null
          organization_id?: string
          phone?: string | null
          updated_at?: string | null
          zone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_loyalty_level_id_fkey"
            columns: ["loyalty_level_id"]
            isOneToOne: false
            referencedRelation: "loyalty_levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_codes: {
        Row: {
          created_at: string | null
          delivery_code: string
          delivery_used: boolean | null
          delivery_used_at: string | null
          expires_at: string | null
          id: string
          order_id: string
          pickup_code: string
          pickup_used: boolean | null
          pickup_used_at: string | null
        }
        Insert: {
          created_at?: string | null
          delivery_code: string
          delivery_used?: boolean | null
          delivery_used_at?: string | null
          expires_at?: string | null
          id?: string
          order_id: string
          pickup_code: string
          pickup_used?: boolean | null
          pickup_used_at?: string | null
        }
        Update: {
          created_at?: string | null
          delivery_code?: string
          delivery_used?: boolean | null
          delivery_used_at?: string | null
          expires_at?: string | null
          id?: string
          order_id?: string
          pickup_code?: string
          pickup_used?: boolean | null
          pickup_used_at?: string | null
        }
        Relationships: []
      }
      delivery_orders: {
        Row: {
          created_at: string | null
          current_latitude: number | null
          current_longitude: number | null
          customer_address: string | null
          customer_id: string | null
          customer_latitude: number | null
          customer_longitude: number | null
          customer_name: string | null
          customer_phone: string | null
          delivery_code: string | null
          distance_km: number | null
          driver_id: string | null
          estimated_earnings: number | null
          estimated_time_minutes: number | null
          id: string
          pickup_code: string | null
          restaurant_address: string | null
          restaurant_id: string | null
          restaurant_latitude: number | null
          restaurant_longitude: number | null
          restaurant_name: string | null
          sale_id: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          current_latitude?: number | null
          current_longitude?: number | null
          customer_address?: string | null
          customer_id?: string | null
          customer_latitude?: number | null
          customer_longitude?: number | null
          customer_name?: string | null
          customer_phone?: string | null
          delivery_code?: string | null
          distance_km?: number | null
          driver_id?: string | null
          estimated_earnings?: number | null
          estimated_time_minutes?: number | null
          id?: string
          pickup_code?: string | null
          restaurant_address?: string | null
          restaurant_id?: string | null
          restaurant_latitude?: number | null
          restaurant_longitude?: number | null
          restaurant_name?: string | null
          sale_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          current_latitude?: number | null
          current_longitude?: number | null
          customer_address?: string | null
          customer_id?: string | null
          customer_latitude?: number | null
          customer_longitude?: number | null
          customer_name?: string | null
          customer_phone?: string | null
          delivery_code?: string | null
          distance_km?: number | null
          driver_id?: string | null
          estimated_earnings?: number | null
          estimated_time_minutes?: number | null
          id?: string
          pickup_code?: string | null
          restaurant_address?: string | null
          restaurant_id?: string | null
          restaurant_latitude?: number | null
          restaurant_longitude?: number | null
          restaurant_name?: string | null
          sale_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_orders_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_orders_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "v_sales_with_balance"
            referencedColumns: ["sale_id"]
          },
        ]
      }
      delivery_tips: {
        Row: {
          amount: number
          created_at: string | null
          driver_id: string | null
          id: string
          order_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          driver_id?: string | null
          id?: string
          order_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          driver_id?: string | null
          id?: string
          order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_tips_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_tips_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_tips_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_sales_with_balance"
            referencedColumns: ["sale_id"]
          },
        ]
      }
      discount_date_ranges: {
        Row: {
          discount_id: string
          end_date: string | null
          end_enabled: boolean
          end_time: string
          id: string
          organization_id: string
          start_date: string | null
          start_enabled: boolean
          start_time: string
        }
        Insert: {
          discount_id: string
          end_date?: string | null
          end_enabled?: boolean
          end_time?: string
          id?: string
          organization_id: string
          start_date?: string | null
          start_enabled?: boolean
          start_time?: string
        }
        Update: {
          discount_id?: string
          end_date?: string | null
          end_enabled?: boolean
          end_time?: string
          id?: string
          organization_id?: string
          start_date?: string | null
          start_enabled?: boolean
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "discount_date_ranges_discount_id_fkey"
            columns: ["discount_id"]
            isOneToOne: false
            referencedRelation: "discounts"
            referencedColumns: ["id"]
          },
        ]
      }
      discount_item_categories: {
        Row: {
          category_id: string
          discount_id: string
          id: string
          organization_id: string
        }
        Insert: {
          category_id: string
          discount_id: string
          id?: string
          organization_id: string
        }
        Update: {
          category_id?: string
          discount_id?: string
          id?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "discount_item_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discount_item_categories_discount_id_fkey"
            columns: ["discount_id"]
            isOneToOne: false
            referencedRelation: "discounts"
            referencedColumns: ["id"]
          },
        ]
      }
      discount_items: {
        Row: {
          discount_id: string
          id: string
          item_id: string
          organization_id: string
        }
        Insert: {
          discount_id: string
          id?: string
          item_id: string
          organization_id: string
        }
        Update: {
          discount_id?: string
          id?: string
          item_id?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "discount_items_discount_id_fkey"
            columns: ["discount_id"]
            isOneToOne: false
            referencedRelation: "discounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discount_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      discount_locations: {
        Row: {
          discount_id: string
          id: string
          location_id: string
          organization_id: string
        }
        Insert: {
          discount_id: string
          id?: string
          location_id: string
          organization_id: string
        }
        Update: {
          discount_id?: string
          id?: string
          location_id?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "discount_locations_discount_id_fkey"
            columns: ["discount_id"]
            isOneToOne: false
            referencedRelation: "discounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discount_locations_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      discount_weekly_schedules: {
        Row: {
          discount_id: string
          end_time: string
          id: string
          organization_id: string
          start_time: string
          weekday: number
        }
        Insert: {
          discount_id: string
          end_time: string
          id?: string
          organization_id: string
          start_time: string
          weekday: number
        }
        Update: {
          discount_id?: string
          end_time?: string
          id?: string
          organization_id?: string
          start_time?: string
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: "discount_weekly_schedules_discount_id_fkey"
            columns: ["discount_id"]
            isOneToOne: false
            referencedRelation: "discounts"
            referencedColumns: ["id"]
          },
        ]
      }
      discounts: {
        Row: {
          amount: number
          amount_type: Database["public"]["Enums"]["discount_amount_type"]
          automatic: boolean
          created_at: string | null
          discount_code: string | null
          id: string
          is_active: boolean
          minimum_spend: number | null
          name: string
          organization_id: string
          scope: Database["public"]["Enums"]["discount_scope_type"]
          updated_at: string | null
        }
        Insert: {
          amount: number
          amount_type?: Database["public"]["Enums"]["discount_amount_type"]
          automatic?: boolean
          created_at?: string | null
          discount_code?: string | null
          id?: string
          is_active?: boolean
          minimum_spend?: number | null
          name: string
          organization_id: string
          scope?: Database["public"]["Enums"]["discount_scope_type"]
          updated_at?: string | null
        }
        Update: {
          amount?: number
          amount_type?: Database["public"]["Enums"]["discount_amount_type"]
          automatic?: boolean
          created_at?: string | null
          discount_code?: string | null
          id?: string
          is_active?: boolean
          minimum_spend?: number | null
          name?: string
          organization_id?: string
          scope?: Database["public"]["Enums"]["discount_scope_type"]
          updated_at?: string | null
        }
        Relationships: []
      }
      driver_commissions: {
        Row: {
          commission_type: string
          commission_value: number
          created_at: string | null
          driver_id: string
          id: string
        }
        Insert: {
          commission_type: string
          commission_value: number
          created_at?: string | null
          driver_id: string
          id?: string
        }
        Update: {
          commission_type?: string
          commission_value?: number
          created_at?: string | null
          driver_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_commissions_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_earnings: {
        Row: {
          base_amount: number | null
          commission_amount: number | null
          created_at: string | null
          delivery_order_id: string | null
          driver_id: string
          id: string
          location_id: string
          organization_id: string
          tip: number | null
          total_amount: number | null
        }
        Insert: {
          base_amount?: number | null
          commission_amount?: number | null
          created_at?: string | null
          delivery_order_id?: string | null
          driver_id: string
          id?: string
          location_id: string
          organization_id: string
          tip?: number | null
          total_amount?: number | null
        }
        Update: {
          base_amount?: number | null
          commission_amount?: number | null
          created_at?: string | null
          delivery_order_id?: string | null
          driver_id?: string
          id?: string
          location_id?: string
          organization_id?: string
          tip?: number | null
          total_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "driver_earnings_delivery_order_id_fkey"
            columns: ["delivery_order_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_earnings_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_earnings_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_earnings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          }
        ]
      }
      driver_locations: {
        Row: {
          created_at: string | null
          driver_id: string
          id: string
          is_active: boolean | null
          location: unknown
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          driver_id: string
          id?: string
          is_active?: boolean | null
          location: unknown
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          driver_id?: string
          id?: string
          is_active?: boolean | null
          location?: unknown
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "driver_locations_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      drivers: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          location_id: string | null
          max_concurrent_orders: number | null
          max_simultaneous_orders: number | null
          name: string
          organization_id: string | null
          phone: string | null
          status: string | null
          updated_at: string | null
          vehicle_brand: string | null
          vehicle_model: string | null
          vehicle_plate: string | null
          vehicle_type: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          location_id?: string | null
          max_concurrent_orders?: number | null
          max_simultaneous_orders?: number | null
          name: string
          organization_id?: string | null
          phone?: string | null
          status?: string | null
          updated_at?: string | null
          vehicle_brand?: string | null
          vehicle_model?: string | null
          vehicle_plate?: string | null
          vehicle_type?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          location_id?: string | null
          max_concurrent_orders?: number | null
          max_simultaneous_orders?: number | null
          name?: string
          organization_id?: string | null
          phone?: string | null
          status?: string | null
          updated_at?: string | null
          vehicle_brand?: string | null
          vehicle_model?: string | null
          vehicle_plate?: string | null
          vehicle_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "drivers_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drivers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      earnings: {
        Row: {
          created_at: string | null
          currency: string | null
          driver_earnings: number
          driver_id: string
          id: string
          order_id: string | null
          order_total: number
          status: string | null
          system_fee_amount: number
          system_fee_percent: number
          tip_amount: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          currency?: string | null
          driver_earnings: number
          driver_id: string
          id?: string
          order_id?: string | null
          order_total: number
          status?: string | null
          system_fee_amount: number
          system_fee_percent?: number
          tip_amount?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          currency?: string | null
          driver_earnings?: number
          driver_id?: string
          id?: string
          order_id?: string | null
          order_total?: number
          status?: string | null
          system_fee_amount?: number
          system_fee_percent?: number
          tip_amount?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "earnings_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "earnings_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_sales_with_balance"
            referencedColumns: ["sale_id"]
          },
        ]
      }
      emergency_alerts: {
        Row: {
          alert_type: string
          created_at: string | null
          driver_id: string
          id: string
          location: unknown
          message: string | null
          notified_admin: boolean | null
          notified_contacts: boolean | null
          order_id: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          alert_type: string
          created_at?: string | null
          driver_id: string
          id?: string
          location: unknown
          message?: string | null
          notified_admin?: boolean | null
          notified_contacts?: boolean | null
          order_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          alert_type?: string
          created_at?: string | null
          driver_id?: string
          id?: string
          location?: unknown
          message?: string | null
          notified_admin?: boolean | null
          notified_contacts?: boolean | null
          order_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "emergency_alerts_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emergency_alerts_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_sales_with_balance"
            referencedColumns: ["sale_id"]
          },
        ]
      }
      fx_market_rates: {
        Row: {
          asset_kind: Database["public"]["Enums"]["fx_asset_kind"]
          base_currency: string
          buy_margin_bps: number | null
          buy_price: number
          calculated_at: string
          created_at: string
          created_by: string | null
          id: string
          organization_id: string
          pricing_mode: Database["public"]["Enums"]["fx_pricing_mode"]
          product_id: string
          quote_currency: string
          reference_price: number
          sell_margin_bps: number | null
          sell_price: number
          source: string | null
          source_payload: Json | null
          spread_bps: number | null
        }
        Insert: {
          asset_kind: Database["public"]["Enums"]["fx_asset_kind"]
          base_currency: string
          buy_margin_bps?: number | null
          buy_price: number
          calculated_at?: string
          created_at?: string
          created_by?: string | null
          id?: string
          organization_id: string
          pricing_mode: Database["public"]["Enums"]["fx_pricing_mode"]
          product_id: string
          quote_currency: string
          reference_price: number
          sell_margin_bps?: number | null
          sell_price: number
          source?: string | null
          source_payload?: Json | null
          spread_bps?: number | null
        }
        Update: {
          asset_kind?: Database["public"]["Enums"]["fx_asset_kind"]
          base_currency?: string
          buy_margin_bps?: number | null
          buy_price?: number
          calculated_at?: string
          created_at?: string
          created_by?: string | null
          id?: string
          organization_id?: string
          pricing_mode?: Database["public"]["Enums"]["fx_pricing_mode"]
          product_id?: string
          quote_currency?: string
          reference_price?: number
          sell_margin_bps?: number | null
          sell_price?: number
          source?: string | null
          source_payload?: Json | null
          spread_bps?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fx_market_rates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fx_market_rates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fx_market_rates_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      integrations: {
        Row: {
          auth_method: string
          created_at: string
          credentials_metadata: Json
          encrypted_credentials: string
          encryption_version: number
          id: string
          organization_id: string
          provider: string
          updated_at: string
        }
        Insert: {
          auth_method: string
          created_at?: string
          credentials_metadata?: Json
          encrypted_credentials: string
          encryption_version?: number
          id?: string
          organization_id: string
          provider: string
          updated_at?: string
        }
        Update: {
          auth_method?: string
          created_at?: string
          credentials_metadata?: Json
          encrypted_credentials?: string
          encryption_version?: number
          id?: string
          organization_id?: string
          provider?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "integrations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_movements: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          inventory_batch_id: string | null
          movement_type: string
          notes: string | null
          organization_id: string
          product_id: string
          quantity_units: number
          reference_id: string | null
          reference_type: string | null
          unit_cost: number | null
          variant_id: string
          warehouse_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          inventory_batch_id?: string | null
          movement_type: string
          notes?: string | null
          organization_id: string
          product_id: string
          quantity_units: number
          reference_id?: string | null
          reference_type?: string | null
          unit_cost?: number | null
          variant_id: string
          warehouse_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          inventory_batch_id?: string | null
          movement_type?: string
          notes?: string | null
          organization_id?: string
          product_id?: string
          quantity_units?: number
          reference_id?: string | null
          reference_type?: string | null
          unit_cost?: number | null
          variant_id?: string
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_batch_fkey"
            columns: ["inventory_batch_id"]
            isOneToOne: false
            referencedRelation: "product_variant_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_product_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_variant_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_warehouse_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          created_at: string | null
          email: string
          id: string
          ip_address: string | null
          name: string
          notes: string | null
          phone: string
          product_type: string
          source: string | null
          status: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          ip_address?: string | null
          name: string
          notes?: string | null
          phone: string
          product_type: string
          source?: string | null
          status?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          ip_address?: string | null
          name?: string
          notes?: string | null
          phone?: string
          product_type?: string
          source?: string | null
          status?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: []
      }
      location_coverage_zones: {
        Row: {
          color: string
          created_at: string
          delivery_time_minutes: number | null
          id: string
          is_active: boolean
          location_id: string
          logistics_cost: number
          name: string
          organization_id: string
          path: Json
          polygon: unknown
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          delivery_time_minutes?: number | null
          id?: string
          is_active?: boolean
          location_id: string
          logistics_cost?: number
          name: string
          organization_id: string
          path?: Json
          polygon?: unknown
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          delivery_time_minutes?: number | null
          id?: string
          is_active?: boolean
          location_id?: string
          logistics_cost?: number
          name?: string
          organization_id?: string
          path?: Json
          polygon?: unknown
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "location_coverage_zones_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "location_coverage_zones_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      location_hours_weekly: {
        Row: {
          close_time: string
          close_time_1: string | null
          close_time_2: string | null
          id: string
          is_open: boolean
          location_id: string
          open_time: string
          open_time_1: string | null
          open_time_2: string | null
          weekday: number
        }
        Insert: {
          close_time?: string
          close_time_1?: string | null
          close_time_2?: string | null
          id?: string
          is_open?: boolean
          location_id: string
          open_time?: string
          open_time_1?: string | null
          open_time_2?: string | null
          weekday: number
        }
        Update: {
          close_time?: string
          close_time_1?: string | null
          close_time_2?: string | null
          id?: string
          is_open?: boolean
          location_id?: string
          open_time?: string
          open_time_1?: string | null
          open_time_2?: string | null
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: "location_hours_weekly_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      location_members: {
        Row: {
          created_at: string
          id: string
          location_id: string
          organization_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          location_id: string
          organization_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          location_id?: string
          organization_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_locmem_location"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_locmem_org"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      location_service_zones: {
        Row: {
          city: string | null
          created_at: string
          enabled: boolean
          id: string
          location_id: string
          organization_id: string
          postal_prefix: string | null
          service_channel: string
          text_pattern: string | null
          updated_at: string
        }
        Insert: {
          city?: string | null
          created_at?: string
          enabled?: boolean
          id?: string
          location_id: string
          organization_id: string
          postal_prefix?: string | null
          service_channel: string
          text_pattern?: string | null
          updated_at?: string
        }
        Update: {
          city?: string | null
          created_at?: string
          enabled?: boolean
          id?: string
          location_id?: string
          organization_id?: string
          postal_prefix?: string | null
          service_channel?: string
          text_pattern?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "location_service_zones_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "location_service_zones_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      location_special_day_ranges: {
        Row: {
          close_time: string
          id: string
          open_time: string
          special_day_id: string
        }
        Insert: {
          close_time: string
          id?: string
          open_time: string
          special_day_id: string
        }
        Update: {
          close_time?: string
          id?: string
          open_time?: string
          special_day_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "location_special_day_ranges_special_day_id_fkey"
            columns: ["special_day_id"]
            isOneToOne: false
            referencedRelation: "location_special_days"
            referencedColumns: ["id"]
          },
        ]
      }
      location_special_days: {
        Row: {
          date: string
          id: string
          is_closed: boolean
          label: string | null
          location_id: string
          note: string | null
        }
        Insert: {
          date: string
          id?: string
          is_closed?: boolean
          label?: string | null
          location_id: string
          note?: string | null
        }
        Update: {
          date?: string
          id?: string
          is_closed?: boolean
          label?: string | null
          location_id?: string
          note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "location_special_days_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          city: string | null
          country: string | null
          created_at: string
          id: string
          image_url: string | null
          is_active: boolean
          latitude: number
          local_delivery_enabled: boolean
          location: unknown
          longitude: number
          name: string
          organization_id: string
          phone: string | null
          pickup_enabled: boolean
          place_description: string | null
          place_id: string | null
          postal_code: string | null
          prep_orders: boolean
          province: string | null
          shipping_enabled: boolean
          timezone: string
          updated_at: string
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          latitude: number
          local_delivery_enabled?: boolean
          location?: unknown
          longitude: number
          name: string
          organization_id: string
          phone?: string | null
          pickup_enabled?: boolean
          place_description?: string | null
          place_id?: string | null
          postal_code?: string | null
          prep_orders?: boolean
          province?: string | null
          shipping_enabled?: boolean
          timezone?: string
          updated_at?: string
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          latitude?: number
          local_delivery_enabled?: boolean
          location?: unknown
          longitude?: number
          name?: string
          organization_id?: string
          phone?: string | null
          pickup_enabled?: boolean
          place_description?: string | null
          place_id?: string | null
          postal_code?: string | null
          prep_orders?: boolean
          province?: string | null
          shipping_enabled?: boolean
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      loyalty_levels: {
        Row: {
          benefits: string | null
          color: string | null
          created_at: string | null
          id: string
          name: string
          organization_id: string
          points_required: number
          updated_at: string | null
        }
        Insert: {
          benefits?: string | null
          color?: string | null
          created_at?: string | null
          id?: string
          name: string
          organization_id: string
          points_required: number
          updated_at?: string | null
        }
        Update: {
          benefits?: string | null
          color?: string | null
          created_at?: string | null
          id?: string
          name?: string
          organization_id?: string
          points_required?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_levels_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_program_settings: {
        Row: {
          birthday_bonus_points: number
          created_at: string | null
          id: string
          is_active: boolean | null
          min_purchase_for_points: number
          organization_id: string
          points_expiration_days: number | null
          points_per_currency: number
          referral_bonus_points: number
          updated_at: string | null
          welcome_bonus_points: number
        }
        Insert: {
          birthday_bonus_points?: number
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          min_purchase_for_points?: number
          organization_id: string
          points_expiration_days?: number | null
          points_per_currency?: number
          referral_bonus_points?: number
          updated_at?: string | null
          welcome_bonus_points?: number
        }
        Update: {
          birthday_bonus_points?: number
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          min_purchase_for_points?: number
          organization_id?: string
          points_expiration_days?: number | null
          points_per_currency?: number
          referral_bonus_points?: number
          updated_at?: string | null
          welcome_bonus_points?: number
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_program_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_rewards: {
        Row: {
          benefit_type: string | null
          benefit_value: number | null
          condition_type: string | null
          created_at: string | null
          description: string | null
          free_products_ids: string[] | null
          free_products_quantity: number | null
          id: string
          image_url: string | null
          is_active: boolean | null
          minimum_amount: number | null
          minimum_quantity: number | null
          name: string
          organization_id: string
          points_cost: number
          product_id: string | null
          product_ids: string[] | null
          reward_type: string | null
          special_event_type: string | null
          special_range_end: string | null
          special_range_start: string | null
          total_limit: number | null
          updated_at: string | null
          user_limit: number | null
          valid_until: string | null
          weekdays: number[] | null
        }
        Insert: {
          benefit_type?: string | null
          benefit_value?: number | null
          condition_type?: string | null
          created_at?: string | null
          description?: string | null
          free_products_ids?: string[] | null
          free_products_quantity?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          minimum_amount?: number | null
          minimum_quantity?: number | null
          name: string
          organization_id: string
          points_cost: number
          product_id?: string | null
          product_ids?: string[] | null
          reward_type?: string | null
          special_event_type?: string | null
          special_range_end?: string | null
          special_range_start?: string | null
          total_limit?: number | null
          updated_at?: string | null
          user_limit?: number | null
          valid_until?: string | null
          weekdays?: number[] | null
        }
        Update: {
          benefit_type?: string | null
          benefit_value?: number | null
          condition_type?: string | null
          created_at?: string | null
          description?: string | null
          free_products_ids?: string[] | null
          free_products_quantity?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          minimum_amount?: number | null
          minimum_quantity?: number | null
          name?: string
          organization_id?: string
          points_cost?: number
          product_id?: string | null
          product_ids?: string[] | null
          reward_type?: string | null
          special_event_type?: string | null
          special_range_end?: string | null
          special_range_start?: string | null
          total_limit?: number | null
          updated_at?: string | null
          user_limit?: number | null
          valid_until?: string | null
          weekdays?: number[] | null
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_rewards_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_items: {
        Row: {
          created_at: string | null
          icon: string
          id: string
          is_visible: boolean | null
          order: number | null
          route: string
          section: string
          subtitle: string | null
          title: string
        }
        Insert: {
          created_at?: string | null
          icon: string
          id: string
          is_visible?: boolean | null
          order?: number | null
          route: string
          section: string
          subtitle?: string | null
          title: string
        }
        Update: {
          created_at?: string | null
          icon?: string
          id?: string
          is_visible?: boolean | null
          order?: number | null
          route?: string
          section?: string
          subtitle?: string | null
          title?: string
        }
        Relationships: []
      }
      modifier_locations: {
        Row: {
          hide_online: boolean | null
          id: string
          is_available: boolean | null
          location_id: string
          modifier_id: string
          organization_id: string
          price_delta: number | null
        }
        Insert: {
          hide_online?: boolean | null
          id?: string
          is_available?: boolean | null
          location_id: string
          modifier_id: string
          organization_id: string
          price_delta?: number | null
        }
        Update: {
          hide_online?: boolean | null
          id?: string
          is_available?: boolean | null
          location_id?: string
          modifier_id?: string
          organization_id?: string
          price_delta?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "modifier_locations_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "modifier_locations_modifier_id_fkey"
            columns: ["modifier_id"]
            isOneToOne: false
            referencedRelation: "modifiers"
            referencedColumns: ["id"]
          },
        ]
      }
      modifier_set_locations: {
        Row: {
          hide_online: boolean | null
          id: string
          is_available: boolean | null
          location_id: string
          modifier_set_id: string
          organization_id: string
        }
        Insert: {
          hide_online?: boolean | null
          id?: string
          is_available?: boolean | null
          location_id: string
          modifier_set_id: string
          organization_id: string
        }
        Update: {
          hide_online?: boolean | null
          id?: string
          is_available?: boolean | null
          location_id?: string
          modifier_set_id?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "modifier_set_locations_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "modifier_set_locations_modifier_set_id_fkey"
            columns: ["modifier_set_id"]
            isOneToOne: false
            referencedRelation: "modifier_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      modifier_sets: {
        Row: {
          created_at: string | null
          display_name: string | null
          hide_online: boolean
          id: string
          is_active: boolean
          max_selections: number | null
          min_selections: number
          name: string
          organization_id: string
          require_selection: boolean
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          display_name?: string | null
          hide_online?: boolean
          id?: string
          is_active?: boolean
          max_selections?: number | null
          min_selections?: number
          name: string
          organization_id: string
          require_selection?: boolean
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          display_name?: string | null
          hide_online?: boolean
          id?: string
          is_active?: boolean
          max_selections?: number | null
          min_selections?: number
          name?: string
          organization_id?: string
          require_selection?: boolean
          updated_at?: string | null
        }
        Relationships: []
      }
      modifiers: {
        Row: {
          created_at: string | null
          display_name: string | null
          hide_online: boolean
          id: string
          image_url: string | null
          is_active: boolean
          modifier_set_id: string
          name: string
          organization_id: string
          preselect: boolean
          price_delta: number
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          display_name?: string | null
          hide_online?: boolean
          id?: string
          image_url?: string | null
          is_active?: boolean
          modifier_set_id: string
          name: string
          organization_id: string
          preselect?: boolean
          price_delta?: number
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          display_name?: string | null
          hide_online?: boolean
          id?: string
          image_url?: string | null
          is_active?: boolean
          modifier_set_id?: string
          name?: string
          organization_id?: string
          preselect?: boolean
          price_delta?: number
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "modifiers_modifier_set_id_fkey"
            columns: ["modifier_set_id"]
            isOneToOne: false
            referencedRelation: "modifier_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_settings: {
        Row: {
          allow_email: boolean
          allow_sms: boolean
          allow_whatsapp: boolean
          back_in_stock: boolean
          created_at: string
          external_provider: string
          external_user_id: string
          id: string
          metadata: Json
          new_products: boolean
          newsletter: boolean
          order_delivery_updates: boolean
          order_payment_events: boolean
          order_status_changes: boolean
          organization_id: string
          promotions: boolean
          quiet_end: string | null
          quiet_hours_enabled: boolean
          quiet_start: string | null
          recommendations: boolean
          security_alerts: boolean
          surveys: boolean
          timezone: string | null
          tips: boolean
          updated_at: string
        }
        Insert: {
          allow_email?: boolean
          allow_sms?: boolean
          allow_whatsapp?: boolean
          back_in_stock?: boolean
          created_at?: string
          external_provider?: string
          external_user_id: string
          id?: string
          metadata?: Json
          new_products?: boolean
          newsletter?: boolean
          order_delivery_updates?: boolean
          order_payment_events?: boolean
          order_status_changes?: boolean
          organization_id: string
          promotions?: boolean
          quiet_end?: string | null
          quiet_hours_enabled?: boolean
          quiet_start?: string | null
          recommendations?: boolean
          security_alerts?: boolean
          surveys?: boolean
          timezone?: string | null
          tips?: boolean
          updated_at?: string
        }
        Update: {
          allow_email?: boolean
          allow_sms?: boolean
          allow_whatsapp?: boolean
          back_in_stock?: boolean
          created_at?: string
          external_provider?: string
          external_user_id?: string
          id?: string
          metadata?: Json
          new_products?: boolean
          newsletter?: boolean
          order_delivery_updates?: boolean
          order_payment_events?: boolean
          order_status_changes?: boolean
          organization_id?: string
          promotions?: boolean
          quiet_end?: string | null
          quiet_hours_enabled?: boolean
          quiet_start?: string | null
          recommendations?: boolean
          security_alerts?: boolean
          surveys?: boolean
          timezone?: string | null
          tips?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_settings_org_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          attempts: number
          campaign_id: string
          channel: string
          created_at: string
          customer_id: string
          delivered_at: string | null
          error_message: string | null
          external_id: string | null
          group_key: string | null
          id: string
          last_attempt_response: string | null
          organization_id: string
          payload: Json
          priority: number
          read_by_users: string[] | null
          recipient: string
          scheduled_at: string
          status: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          campaign_id: string
          channel: string
          created_at?: string
          customer_id: string
          delivered_at?: string | null
          error_message?: string | null
          external_id?: string | null
          group_key?: string | null
          id?: string
          last_attempt_response?: string | null
          organization_id: string
          payload: Json
          priority?: number
          read_by_users?: string[] | null
          recipient: string
          scheduled_at: string
          status?: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          campaign_id?: string
          channel?: string
          created_at?: string
          customer_id?: string
          delivered_at?: string | null
          error_message?: string | null
          external_id?: string | null
          group_key?: string | null
          id?: string
          last_attempt_response?: string | null
          organization_id?: string
          payload?: Json
          priority?: number
          read_by_users?: string[] | null
          recipient?: string
          scheduled_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      offers: {
        Row: {
          code: string | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          max_uses: number | null
          max_uses_per_user: number | null
          name: string
          type: Database["public"]["Enums"]["offer_type"]
          updated_at: string | null
          valid_from: string | null
          valid_until: string | null
          value: number | null
        }
        Insert: {
          code?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          max_uses_per_user?: number | null
          name: string
          type: Database["public"]["Enums"]["offer_type"]
          updated_at?: string | null
          valid_from?: string | null
          valid_until?: string | null
          value?: number | null
        }
        Update: {
          code?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          max_uses_per_user?: number | null
          name?: string
          type?: Database["public"]["Enums"]["offer_type"]
          updated_at?: string | null
          valid_from?: string | null
          valid_until?: string | null
          value?: number | null
        }
        Relationships: []
      }
      option_sets: {
        Row: {
          created_at: string | null
          display_name: string | null
          id: string
          name: string
          organization_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          display_name?: string | null
          id?: string
          name: string
          organization_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          display_name?: string | null
          id?: string
          name?: string
          organization_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      options: {
        Row: {
          created_at: string | null
          display_name: string | null
          id: string
          name: string
          option_set_id: string
          organization_id: string
          sort_order: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          display_name?: string | null
          id?: string
          name: string
          option_set_id: string
          organization_id: string
          sort_order?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          display_name?: string | null
          id?: string
          name?: string
          option_set_id?: string
          organization_id?: string
          sort_order?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "options_option_set_id_fkey"
            columns: ["option_set_id"]
            isOneToOne: false
            referencedRelation: "option_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      order_track: {
        Row: {
          actual_arrival: string | null
          assigned_at: string | null
          branch_id: string
          created_at: string | null
          delivered_at: string | null
          driver_id: string | null
          driver_name: string | null
          driver_phone: string | null
          estimated_arrival: string | null
          id: string
          order_id: string
          picked_up_at: string | null
          status: string
          updated_at: string | null
          vehicle_info: string | null
        }
        Insert: {
          actual_arrival?: string | null
          assigned_at?: string | null
          branch_id: string
          created_at?: string | null
          delivered_at?: string | null
          driver_id?: string | null
          driver_name?: string | null
          driver_phone?: string | null
          estimated_arrival?: string | null
          id?: string
          order_id: string
          picked_up_at?: string | null
          status?: string
          updated_at?: string | null
          vehicle_info?: string | null
        }
        Update: {
          actual_arrival?: string | null
          assigned_at?: string | null
          branch_id?: string
          created_at?: string | null
          delivered_at?: string | null
          driver_id?: string | null
          driver_name?: string | null
          driver_phone?: string | null
          estimated_arrival?: string | null
          id?: string
          order_id?: string
          picked_up_at?: string | null
          status?: string
          updated_at?: string | null
          vehicle_info?: string | null
        }
        Relationships: []
      }
      organization_members: {
        Row: {
          created_at: string | null
          id: string
          organization_id: string
          role: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          organization_id: string
          role: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          organization_id?: string
          role?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_service_channels: {
        Row: {
          created_at: string
          delivery_enabled: boolean
          national_shipping_enabled: boolean
          organization_id: string
          pickup_enabled: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          delivery_enabled?: boolean
          national_shipping_enabled?: boolean
          organization_id: string
          pickup_enabled?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          delivery_enabled?: boolean
          national_shipping_enabled?: boolean
          organization_id?: string
          pickup_enabled?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_service_channels_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          billing_address: Json | null
          brand_banner_url: string | null
          brand_colors: Json | null
          brand_description: string | null
          brand_logo_landscape_url: string | null
          brand_logo_url: string | null
          business_category: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          custom_hostname: string | null
          default_tip_percentage: number | null
          id: string
          legal_name: string | null
          name: string
          organization_size: string | null
          slug: string
          social_links: Json | null
          support_email: string | null
          support_phone: string | null
          support_whatsapp: string | null
          timezone: string | null
          title_init: string | null
          title_last: string | null
          updated_at: string | null
        }
        Insert: {
          billing_address?: Json | null
          brand_banner_url?: string | null
          brand_colors?: Json | null
          brand_description?: string | null
          brand_logo_landscape_url?: string | null
          brand_logo_url?: string | null
          business_category?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          custom_hostname?: string | null
          default_tip_percentage?: number | null
          id?: string
          legal_name?: string | null
          name: string
          organization_size?: string | null
          slug: string
          social_links?: Json | null
          support_email?: string | null
          support_phone?: string | null
          support_whatsapp?: string | null
          timezone?: string | null
          title_init?: string | null
          title_last?: string | null
          updated_at?: string | null
        }
        Update: {
          billing_address?: Json | null
          brand_banner_url?: string | null
          brand_colors?: Json | null
          brand_description?: string | null
          brand_logo_landscape_url?: string | null
          brand_logo_url?: string | null
          business_category?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          custom_hostname?: string | null
          default_tip_percentage?: number | null
          id?: string
          legal_name?: string | null
          name?: string
          organization_size?: string | null
          slug?: string
          social_links?: Json | null
          support_email?: string | null
          support_phone?: string | null
          support_whatsapp?: string | null
          timezone?: string | null
          title_init?: string | null
          title_last?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          authorization_code: string | null
          captured_at: string | null
          cashier_id: string | null
          change_amount: number
          created_at: string | null
          created_by: string | null
          currency_code: string | null
          direction: Database["public"]["Enums"]["payment_direction"]
          exchange_rate: number | null
          expires_at: string | null
          fee_amount: number
          fee_tax_amount: number
          id: string
          is_refund: boolean
          location_id: string | null
          metadata: Json
          method: Database["public"]["Enums"]["payment_method"]
          organization_id: string
          paid_at: string | null
          pos_id: string | null
          provider: string | null
          provider_tx_id: string | null
          purchase_id: string | null
          reference: string | null
          refunded_payment_id: string | null
          sale_id: string
          shift_id: string | null
          status: Database["public"]["Enums"]["payment_status"]
          store_id: string | null
          surcharge_amount: number
          tax_withheld_amount: number
          tip_amount: number
          updated_at: string | null
        }
        Insert: {
          amount: number
          authorization_code?: string | null
          captured_at?: string | null
          cashier_id?: string | null
          change_amount?: number
          created_at?: string | null
          created_by?: string | null
          currency_code?: string | null
          direction?: Database["public"]["Enums"]["payment_direction"]
          exchange_rate?: number | null
          expires_at?: string | null
          fee_amount?: number
          fee_tax_amount?: number
          id?: string
          is_refund?: boolean
          location_id?: string | null
          metadata?: Json
          method: Database["public"]["Enums"]["payment_method"]
          organization_id: string
          paid_at?: string | null
          pos_id?: string | null
          provider?: string | null
          provider_tx_id?: string | null
          purchase_id?: string | null
          reference?: string | null
          refunded_payment_id?: string | null
          sale_id: string
          shift_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          store_id?: string | null
          surcharge_amount?: number
          tax_withheld_amount?: number
          tip_amount?: number
          updated_at?: string | null
        }
        Update: {
          amount?: number
          authorization_code?: string | null
          captured_at?: string | null
          cashier_id?: string | null
          change_amount?: number
          created_at?: string | null
          created_by?: string | null
          currency_code?: string | null
          direction?: Database["public"]["Enums"]["payment_direction"]
          exchange_rate?: number | null
          expires_at?: string | null
          fee_amount?: number
          fee_tax_amount?: number
          id?: string
          is_refund?: boolean
          location_id?: string | null
          metadata?: Json
          method?: Database["public"]["Enums"]["payment_method"]
          organization_id?: string
          paid_at?: string | null
          pos_id?: string | null
          provider?: string | null
          provider_tx_id?: string | null
          purchase_id?: string | null
          reference?: string | null
          refunded_payment_id?: string | null
          sale_id?: string
          shift_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          store_id?: string | null
          surcharge_amount?: number
          tax_withheld_amount?: number
          tip_amount?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "purchases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_refunded_payment_id_fkey"
            columns: ["refunded_payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "v_sales_with_balance"
            referencedColumns: ["sale_id"]
          },
        ]
      }
      pos_print_zones: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          location_id: string
          name: string
          organization_id: string
          printer_config: Json | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          location_id: string
          name: string
          organization_id: string
          printer_config?: Json | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          location_id?: string
          name?: string
          organization_id?: string
          printer_config?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pos_print_zones_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_print_zones_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      pos_terminals: {
        Row: {
          code: string
          created_at: string | null
          created_by: string | null
          current_cashier_id: string | null
          description: string | null
          device_uuid: string | null
          id: string
          ip_address: string | null
          is_active: boolean
          is_online: boolean
          last_online_at: string | null
          last_open_shift_id: string | null
          location_id: string | null
          metadata: Json
          name: string
          organization_id: string
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          created_by?: string | null
          current_cashier_id?: string | null
          description?: string | null
          device_uuid?: string | null
          id?: string
          ip_address?: string | null
          is_active?: boolean
          is_online?: boolean
          last_online_at?: string | null
          last_open_shift_id?: string | null
          location_id?: string | null
          metadata?: Json
          name: string
          organization_id: string
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          created_by?: string | null
          current_cashier_id?: string | null
          description?: string | null
          device_uuid?: string | null
          id?: string
          ip_address?: string | null
          is_active?: boolean
          is_online?: boolean
          last_online_at?: string | null
          last_open_shift_id?: string | null
          location_id?: string | null
          metadata?: Json
          name?: string
          organization_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pos_terminals_last_open_shift_id_fkey"
            columns: ["last_open_shift_id"]
            isOneToOne: false
            referencedRelation: "cash_shifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_terminals_last_open_shift_id_fkey"
            columns: ["last_open_shift_id"]
            isOneToOne: false
            referencedRelation: "v_cash_position"
            referencedColumns: ["shift_id"]
          },
          {
            foreignKeyName: "pos_terminals_last_open_shift_id_fkey"
            columns: ["last_open_shift_id"]
            isOneToOne: false
            referencedRelation: "v_shift_summary"
            referencedColumns: ["shift_id"]
          },
          {
            foreignKeyName: "pos_terminals_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_terminals_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      product_batch_items: {
        Row: {
          batch_id: string
          created_at: string
          id: string
          location_id: string | null
          organization_id: string
          product_id: string
          quantity_units: number | null
          updated_at: string
          variant_id: string | null
        }
        Insert: {
          batch_id: string
          created_at?: string
          id?: string
          location_id?: string | null
          organization_id: string
          product_id: string
          quantity_units?: number | null
          updated_at?: string
          variant_id?: string | null
        }
        Update: {
          batch_id?: string
          created_at?: string
          id?: string
          location_id?: string | null
          organization_id?: string
          product_id?: string
          quantity_units?: number | null
          updated_at?: string
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_batch_items_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_batch_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_batch_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_categories: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          organization_id: string
          parent_id: string | null
          position: number
          slug: string | null
          sort_order: number
          storage_path: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          organization_id: string
          parent_id?: string | null
          position?: number
          slug?: string | null
          sort_order?: number
          storage_path?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          organization_id?: string
          parent_id?: string | null
          position?: number
          slug?: string | null
          sort_order?: number
          storage_path?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      product_category_products: {
        Row: {
          category_id: string
          created_at: string | null
          created_by: string | null
          id: string
          organization_id: string
          product_id: string
        }
        Insert: {
          category_id: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          organization_id: string
          product_id: string
        }
        Update: {
          category_id?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          organization_id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_category_products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_category_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          created_at: string | null
          id: string
          is_primary: boolean
          organization_id: string
          product_id: string | null
          sort_order: number | null
          storage_path: string
          url: string
          variant_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_primary?: boolean
          organization_id: string
          product_id?: string | null
          sort_order?: number | null
          storage_path: string
          url: string
          variant_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_primary?: boolean
          organization_id?: string
          product_id?: string | null
          sort_order?: number | null
          storage_path?: string
          url?: string
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_images_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      product_location_settings: {
        Row: {
          created_at: string | null
          id: string
          is_available: boolean | null
          location_id: string
          low_stock_threshold: number | null
          organization_id: string
          product_id: string
          updated_at: string | null
          variant_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_available?: boolean | null
          location_id: string
          low_stock_threshold?: number | null
          organization_id: string
          product_id: string
          updated_at?: string | null
          variant_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_available?: boolean | null
          location_id?: string
          low_stock_threshold?: number | null
          organization_id?: string
          product_id?: string
          updated_at?: string | null
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_location_settings_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_location_settings_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_location_settings_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      product_modifier_overrides: {
        Row: {
          hide_online: boolean | null
          id: string
          is_active: boolean | null
          modifier_id: string
          organization_id: string
          preselect: boolean | null
          price_delta: number | null
          product_id: string
        }
        Insert: {
          hide_online?: boolean | null
          id?: string
          is_active?: boolean | null
          modifier_id: string
          organization_id: string
          preselect?: boolean | null
          price_delta?: number | null
          product_id: string
        }
        Update: {
          hide_online?: boolean | null
          id?: string
          is_active?: boolean | null
          modifier_id?: string
          organization_id?: string
          preselect?: boolean | null
          price_delta?: number | null
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_modifier_overrides_modifier_id_fkey"
            columns: ["modifier_id"]
            isOneToOne: false
            referencedRelation: "modifiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_modifier_overrides_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_modifier_set_links: {
        Row: {
          created_at: string | null
          id: string
          modifier_set_id: string
          organization_id: string
          product_id: string
          sort_order: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          modifier_set_id: string
          organization_id: string
          product_id: string
          sort_order?: number
        }
        Update: {
          created_at?: string | null
          id?: string
          modifier_set_id?: string
          organization_id?: string
          product_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_modifier_set_links_modifier_set_id_fkey"
            columns: ["modifier_set_id"]
            isOneToOne: false
            referencedRelation: "modifier_sets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_modifier_set_links_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_modifier_sets: {
        Row: {
          id: string
          max_selections: number | null
          min_selections: number | null
          modifier_set_id: string
          organization_id: string
          product_id: string
          require_selection: boolean | null
          sort_order: number | null
        }
        Insert: {
          id?: string
          max_selections?: number | null
          min_selections?: number | null
          modifier_set_id: string
          organization_id: string
          product_id: string
          require_selection?: boolean | null
          sort_order?: number | null
        }
        Update: {
          id?: string
          max_selections?: number | null
          min_selections?: number | null
          modifier_set_id?: string
          organization_id?: string
          product_id?: string
          require_selection?: boolean | null
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_modifier_sets_modifier_set_id_fkey"
            columns: ["modifier_set_id"]
            isOneToOne: false
            referencedRelation: "modifier_sets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_modifier_sets_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_option_set_links: {
        Row: {
          created_at: string | null
          id: string
          option_set_id: string
          organization_id: string
          product_id: string
          sort_order: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          option_set_id: string
          organization_id: string
          product_id: string
          sort_order?: number
        }
        Update: {
          created_at?: string | null
          id?: string
          option_set_id?: string
          organization_id?: string
          product_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_option_set_links_option_set_id_fkey"
            columns: ["option_set_id"]
            isOneToOne: false
            referencedRelation: "option_sets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_option_set_links_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_option_value_links: {
        Row: {
          created_at: string | null
          id: string
          option_set_id: string
          option_value_id: string
          organization_id: string
          product_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          option_set_id: string
          option_value_id: string
          organization_id: string
          product_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          option_set_id?: string
          option_value_id?: string
          organization_id?: string
          product_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_povl_option_set"
            columns: ["option_set_id"]
            isOneToOne: false
            referencedRelation: "option_sets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_povl_option_value"
            columns: ["option_value_id"]
            isOneToOne: false
            referencedRelation: "options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_povl_organization"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_povl_product"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variant_batches: {
        Row: {
          batch_code: string
          created_at: string
          expiration_date: string | null
          id: string
          organization_id: string
          product_id: string
          quantity_units: number | null
          unit_cost: number | null
          updated_at: string
          variant_id: string
          warehouse_id: string
        }
        Insert: {
          batch_code: string
          created_at?: string
          expiration_date?: string | null
          id?: string
          organization_id: string
          product_id: string
          quantity_units?: number | null
          unit_cost?: number | null
          updated_at?: string
          variant_id: string
          warehouse_id: string
        }
        Update: {
          batch_code?: string
          created_at?: string
          expiration_date?: string | null
          id?: string
          organization_id?: string
          product_id?: string
          quantity_units?: number | null
          unit_cost?: number | null
          updated_at?: string
          variant_id?: string
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_pvb_product"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_pvb_variant"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_variant_batches_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variant_location_inventory: {
        Row: {
          created_at: string | null
          id: string
          is_tracked: boolean
          location_id: string
          on_hand: number
          organization_id: string
          reserved: number
          safety_stock: number
          updated_at: string | null
          variant_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_tracked?: boolean
          location_id: string
          on_hand?: number
          organization_id: string
          reserved?: number
          safety_stock?: number
          updated_at?: string | null
          variant_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_tracked?: boolean
          location_id?: string
          on_hand?: number
          organization_id?: string
          reserved?: number
          safety_stock?: number
          updated_at?: string | null
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variant_location_inventory_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_variant_location_inventory_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variant_location_settings: {
        Row: {
          created_at: string | null
          id: string
          is_available: boolean | null
          location_id: string
          organization_id: string
          price: number | null
          updated_at: string | null
          variant_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_available?: boolean | null
          location_id: string
          organization_id: string
          price?: number | null
          updated_at?: string | null
          variant_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_available?: boolean | null
          location_id?: string
          organization_id?: string
          price?: number | null
          updated_at?: string | null
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variant_location_settings_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_variant_location_settings_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variant_locations: {
        Row: {
          created_at: string | null
          id: string
          is_available: boolean | null
          is_tracked: boolean
          location_id: string
          on_hand: number
          organization_id: string
          price: number | null
          reserved: number
          safety_stock: number
          updated_at: string | null
          variant_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_available?: boolean | null
          is_tracked?: boolean
          location_id: string
          on_hand?: number
          organization_id: string
          price?: number | null
          reserved?: number
          safety_stock?: number
          updated_at?: string | null
          variant_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_available?: boolean | null
          is_tracked?: boolean
          location_id?: string
          on_hand?: number
          organization_id?: string
          price?: number | null
          reserved?: number
          safety_stock?: number
          updated_at?: string | null
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variant_locations_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_variant_locations_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variant_options: {
        Row: {
          created_at: string | null
          id: string
          option_set_id: string
          option_value_id: string
          organization_id: string
          product_id: string
          updated_at: string | null
          variant_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          option_set_id: string
          option_value_id: string
          organization_id: string
          product_id: string
          updated_at?: string | null
          variant_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          option_set_id?: string
          option_value_id?: string
          organization_id?: string
          product_id?: string
          updated_at?: string | null
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_pvo_option_set"
            columns: ["option_set_id"]
            isOneToOne: false
            referencedRelation: "option_sets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_pvo_option_value"
            columns: ["option_value_id"]
            isOneToOne: false
            referencedRelation: "options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_pvo_organization"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_pvo_product"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_pvo_variant"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          created_at: string | null
          default_unit_cost: number | null
          gtin: string | null
          id: string
          image_url: string | null
          is_active: boolean
          is_default: boolean
          name: string | null
          organization_id: string
          price: number | null
          product_id: string
          sku: string | null
          updated_at: string | null
          weight_grams: number | null
        }
        Insert: {
          created_at?: string | null
          default_unit_cost?: number | null
          gtin?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_default?: boolean
          name?: string | null
          organization_id: string
          price?: number | null
          product_id: string
          sku?: string | null
          updated_at?: string | null
          weight_grams?: number | null
        }
        Update: {
          created_at?: string | null
          default_unit_cost?: number | null
          gtin?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_default?: boolean
          name?: string | null
          organization_id?: string
          price?: number | null
          product_id?: string
          sku?: string | null
          updated_at?: string | null
          weight_grams?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          active_principle: string | null
          concentration: string | null
          content_unit: string | null
          created_at: string | null
          created_by: string
          cum_code: string | null
          description: string | null
          dian_tariff_code: string | null
          fx_asset_kind: Database["public"]["Enums"]["fx_asset_kind"] | null
          fx_auto_pricing: boolean
          fx_base_currency: string | null
          fx_buy_margin_bps: number | null
          fx_buy_price: number | null
          fx_last_rate_at: string | null
          fx_last_rate_source: string | null
          fx_market_feed_payload: Json | null
          fx_price_metadata: Json
          fx_pricing_mode: Database["public"]["Enums"]["fx_pricing_mode"] | null
          fx_quantity_precision: number
          fx_quote_currency: string | null
          fx_quote_unit: number
          fx_reference_code: string | null
          fx_reference_price: number | null
          fx_sell_margin_bps: number | null
          fx_sell_price: number | null
          id: string
          image_url: string | null
          inc_rate: number | null
          inc_type: Database["public"]["Enums"]["tax_inc_type"]
          invima_record: string | null
          is_available: boolean | null
          item_type: Database["public"]["Enums"]["product_item_type"]
          ium_code: string | null
          iva_category: Database["public"]["Enums"]["tax_iva_category"]
          iva_rate: number
          lab_name: string | null
          manufacturer_name: string | null
          manufacturer_nit: string | null
          measurement_unit: string | null
          minimum_unit: string | null
          name: string
          organization_id: string
          packaging_unit: string | null
          preparation_time_minutes: number | null
          price: number | null
          price_includes_taxes: boolean
          principal_bar_code: string | null
          storage_temp_max: number | null
          storage_temp_min: number | null
          tax_observation: string | null
          unit_code: string | null
          unspsc_code: string | null
          updated_at: string | null
        }
        Insert: {
          active_principle?: string | null
          concentration?: string | null
          content_unit?: string | null
          created_at?: string | null
          created_by: string
          cum_code?: string | null
          description?: string | null
          dian_tariff_code?: string | null
          fx_asset_kind?: Database["public"]["Enums"]["fx_asset_kind"] | null
          fx_auto_pricing?: boolean
          fx_base_currency?: string | null
          fx_buy_margin_bps?: number | null
          fx_buy_price?: number | null
          fx_last_rate_at?: string | null
          fx_last_rate_source?: string | null
          fx_market_feed_payload?: Json | null
          fx_price_metadata?: Json
          fx_pricing_mode?:
            | Database["public"]["Enums"]["fx_pricing_mode"]
            | null
          fx_quantity_precision?: number
          fx_quote_currency?: string | null
          fx_quote_unit?: number
          fx_reference_code?: string | null
          fx_reference_price?: number | null
          fx_sell_margin_bps?: number | null
          fx_sell_price?: number | null
          id?: string
          image_url?: string | null
          inc_rate?: number | null
          inc_type?: Database["public"]["Enums"]["tax_inc_type"]
          invima_record?: string | null
          is_available?: boolean | null
          item_type?: Database["public"]["Enums"]["product_item_type"]
          ium_code?: string | null
          iva_category?: Database["public"]["Enums"]["tax_iva_category"]
          iva_rate?: number
          lab_name?: string | null
          manufacturer_name?: string | null
          manufacturer_nit?: string | null
          measurement_unit?: string | null
          minimum_unit?: string | null
          name: string
          organization_id: string
          packaging_unit?: string | null
          preparation_time_minutes?: number | null
          price?: number | null
          price_includes_taxes?: boolean
          principal_bar_code?: string | null
          storage_temp_max?: number | null
          storage_temp_min?: number | null
          tax_observation?: string | null
          unit_code?: string | null
          unspsc_code?: string | null
          updated_at?: string | null
        }
        Update: {
          active_principle?: string | null
          concentration?: string | null
          content_unit?: string | null
          created_at?: string | null
          created_by?: string
          cum_code?: string | null
          description?: string | null
          dian_tariff_code?: string | null
          fx_asset_kind?: Database["public"]["Enums"]["fx_asset_kind"] | null
          fx_auto_pricing?: boolean
          fx_base_currency?: string | null
          fx_buy_margin_bps?: number | null
          fx_buy_price?: number | null
          fx_last_rate_at?: string | null
          fx_last_rate_source?: string | null
          fx_market_feed_payload?: Json | null
          fx_price_metadata?: Json
          fx_pricing_mode?:
            | Database["public"]["Enums"]["fx_pricing_mode"]
            | null
          fx_quantity_precision?: number
          fx_quote_currency?: string | null
          fx_quote_unit?: number
          fx_reference_code?: string | null
          fx_reference_price?: number | null
          fx_sell_margin_bps?: number | null
          fx_sell_price?: number | null
          id?: string
          image_url?: string | null
          inc_rate?: number | null
          inc_type?: Database["public"]["Enums"]["tax_inc_type"]
          invima_record?: string | null
          is_available?: boolean | null
          item_type?: Database["public"]["Enums"]["product_item_type"]
          ium_code?: string | null
          iva_category?: Database["public"]["Enums"]["tax_iva_category"]
          iva_rate?: number
          lab_name?: string | null
          manufacturer_name?: string | null
          manufacturer_nit?: string | null
          measurement_unit?: string | null
          minimum_unit?: string | null
          name?: string
          organization_id?: string
          packaging_unit?: string | null
          preparation_time_minutes?: number | null
          price?: number | null
          price_includes_taxes?: boolean
          principal_bar_code?: string | null
          storage_temp_max?: number | null
          storage_temp_min?: number | null
          tax_observation?: string | null
          unit_code?: string | null
          unspsc_code?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          birthday: string | null
          company_name: string | null
          created_at: string | null
          driver_percentage: number | null
          email: string | null
          first_name: string | null
          full_name: string | null
          has_onboarding: boolean | null
          id: string
          job_title: string | null
          last_name: string | null
          loyalty_program: string | null
          phone: string | null
          primary_organization_id: string | null
          subscriptions: string | null
          updated_at: string | null
          use_case: string | null
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          birthday?: string | null
          company_name?: string | null
          created_at?: string | null
          driver_percentage?: number | null
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          has_onboarding?: boolean | null
          id?: string
          job_title?: string | null
          last_name?: string | null
          loyalty_program?: string | null
          phone?: string | null
          primary_organization_id?: string | null
          subscriptions?: string | null
          updated_at?: string | null
          use_case?: string | null
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          birthday?: string | null
          company_name?: string | null
          created_at?: string | null
          driver_percentage?: number | null
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          has_onboarding?: boolean | null
          id?: string
          job_title?: string | null
          last_name?: string | null
          loyalty_program?: string | null
          phone?: string | null
          primary_organization_id?: string | null
          subscriptions?: string | null
          updated_at?: string | null
          use_case?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_primary_organization_id_fkey"
            columns: ["primary_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      promotions: {
        Row: {
          applies_to: string | null
          created_at: string | null
          description: string | null
          discount_type: string
          discount_value: number
          end_date: string | null
          id: string
          is_active: boolean | null
          minimum_purchase: number | null
          name: string
          organization_id: string
          product_id: string | null
          start_date: string
          updated_at: string | null
        }
        Insert: {
          applies_to?: string | null
          created_at?: string | null
          description?: string | null
          discount_type: string
          discount_value: number
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          minimum_purchase?: number | null
          name: string
          organization_id: string
          product_id?: string | null
          start_date: string
          updated_at?: string | null
        }
        Update: {
          applies_to?: string | null
          created_at?: string | null
          description?: string | null
          discount_type?: string
          discount_value?: number
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          minimum_purchase?: number | null
          name?: string
          organization_id?: string
          product_id?: string | null
          start_date?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "promotions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_items: {
        Row: {
          comments: string | null
          created_at: string
          discount_amount: number
          fx_quote_currency: string | null
          fx_reference_price: number | null
          fx_source: string | null
          fx_trade_price: number | null
          fx_trade_side: Database["public"]["Enums"]["fx_operation_side"] | null
          id: string
          inc_amount: number | null
          inc_rate: number | null
          is_tax_exempt_item: boolean | null
          iva_amount: number | null
          iva_rate: number | null
          line_total_after_taxes: number | null
          line_total_before_taxes: number | null
          metadata: Json
          modifiers: Json | null
          organization_id: string
          product_bar_code: string | null
          product_id: string | null
          product_name: string | null
          purchase_id: string
          quantity: number
          taxable_base: number | null
          total_price: number
          unit_code: string | null
          unit_price: number
          unspsc_code: string | null
        }
        Insert: {
          comments?: string | null
          created_at?: string
          discount_amount?: number
          fx_quote_currency?: string | null
          fx_reference_price?: number | null
          fx_source?: string | null
          fx_trade_price?: number | null
          fx_trade_side?:
            | Database["public"]["Enums"]["fx_operation_side"]
            | null
          id?: string
          inc_amount?: number | null
          inc_rate?: number | null
          is_tax_exempt_item?: boolean | null
          iva_amount?: number | null
          iva_rate?: number | null
          line_total_after_taxes?: number | null
          line_total_before_taxes?: number | null
          metadata?: Json
          modifiers?: Json | null
          organization_id: string
          product_bar_code?: string | null
          product_id?: string | null
          product_name?: string | null
          purchase_id: string
          quantity?: number
          taxable_base?: number | null
          total_price?: number
          unit_code?: string | null
          unit_price?: number
          unspsc_code?: string | null
        }
        Update: {
          comments?: string | null
          created_at?: string
          discount_amount?: number
          fx_quote_currency?: string | null
          fx_reference_price?: number | null
          fx_source?: string | null
          fx_trade_price?: number | null
          fx_trade_side?:
            | Database["public"]["Enums"]["fx_operation_side"]
            | null
          id?: string
          inc_amount?: number | null
          inc_rate?: number | null
          is_tax_exempt_item?: boolean | null
          iva_amount?: number | null
          iva_rate?: number | null
          line_total_after_taxes?: number | null
          line_total_before_taxes?: number | null
          metadata?: Json
          modifiers?: Json | null
          organization_id?: string
          product_bar_code?: string | null
          product_id?: string | null
          product_name?: string | null
          purchase_id?: string
          quantity?: number
          taxable_base?: number | null
          total_price?: number
          unit_code?: string | null
          unit_price?: number
          unspsc_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_items_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "purchases"
            referencedColumns: ["id"]
          },
        ]
      }
      purchases: {
        Row: {
          completed_at: string | null
          counterparty_id: string | null
          counterparty_snapshot: Json
          created_at: string
          created_by: string | null
          currency_code: string
          delivery_metadata: Json
          discount_total_amount: number
          fx_average_rate: number | null
          fx_buy_rate: number | null
          fx_counter_currency: string | null
          fx_market_rate_id: string | null
          fx_reference_rate: number | null
          fx_sell_rate: number | null
          grand_total: number
          id: string
          invoice_number: string | null
          location_id: string | null
          metadata: Json
          notes: string | null
          operation_side: Database["public"]["Enums"]["fx_operation_side"]
          order_number: number
          organization_id: string
          payment_method: string | null
          pos_id: string | null
          price_includes_taxes: boolean
          shift_id: string | null
          status: string
          subtotal_amount: number
          tax_inc_amount: number
          tax_iva_amount: number
          tax_other_amount: number
          tip: number
          tip_percentage: number
          total_amount: number
          updated_at: string
          voided_at: string | null
        }
        Insert: {
          completed_at?: string | null
          counterparty_id?: string | null
          counterparty_snapshot?: Json
          created_at?: string
          created_by?: string | null
          currency_code?: string
          delivery_metadata?: Json
          discount_total_amount?: number
          fx_average_rate?: number | null
          fx_buy_rate?: number | null
          fx_counter_currency?: string | null
          fx_market_rate_id?: string | null
          fx_reference_rate?: number | null
          fx_sell_rate?: number | null
          grand_total?: number
          id?: string
          invoice_number?: string | null
          location_id?: string | null
          metadata?: Json
          notes?: string | null
          operation_side?: Database["public"]["Enums"]["fx_operation_side"]
          order_number?: number
          organization_id: string
          payment_method?: string | null
          pos_id?: string | null
          price_includes_taxes?: boolean
          shift_id?: string | null
          status?: string
          subtotal_amount?: number
          tax_inc_amount?: number
          tax_iva_amount?: number
          tax_other_amount?: number
          tip?: number
          tip_percentage?: number
          total_amount?: number
          updated_at?: string
          voided_at?: string | null
        }
        Update: {
          completed_at?: string | null
          counterparty_id?: string | null
          counterparty_snapshot?: Json
          created_at?: string
          created_by?: string | null
          currency_code?: string
          delivery_metadata?: Json
          discount_total_amount?: number
          fx_average_rate?: number | null
          fx_buy_rate?: number | null
          fx_counter_currency?: string | null
          fx_market_rate_id?: string | null
          fx_reference_rate?: number | null
          fx_sell_rate?: number | null
          grand_total?: number
          id?: string
          invoice_number?: string | null
          location_id?: string | null
          metadata?: Json
          notes?: string | null
          operation_side?: Database["public"]["Enums"]["fx_operation_side"]
          order_number?: number
          organization_id?: string
          payment_method?: string | null
          pos_id?: string | null
          price_includes_taxes?: boolean
          shift_id?: string | null
          status?: string
          subtotal_amount?: number
          tax_inc_amount?: number
          tax_iva_amount?: number
          tax_other_amount?: number
          tip?: number
          tip_percentage?: number
          total_amount?: number
          updated_at?: string
          voided_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchases_counterparty_id_fkey"
            columns: ["counterparty_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_fx_market_rate_id_fkey"
            columns: ["fx_market_rate_id"]
            isOneToOne: false
            referencedRelation: "fx_market_rates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      qr_contexts: {
        Row: {
          created_at: string
          extra_data: Json | null
          id: string
          is_active: boolean
          location_id: string
          mode: Database["public"]["Enums"]["qr_mode"]
          organization_id: string
          table_number: string | null
          updated_at: string
          visits: number
        }
        Insert: {
          created_at?: string
          extra_data?: Json | null
          id?: string
          is_active?: boolean
          location_id: string
          mode: Database["public"]["Enums"]["qr_mode"]
          organization_id: string
          table_number?: string | null
          updated_at?: string
          visits?: number
        }
        Update: {
          created_at?: string
          extra_data?: Json | null
          id?: string
          is_active?: boolean
          location_id?: string
          mode?: Database["public"]["Enums"]["qr_mode"]
          organization_id?: string
          table_number?: string | null
          updated_at?: string
          visits?: number
        }
        Relationships: [
          {
            foreignKeyName: "qr_contexts_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qr_contexts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      reward_redemptions: {
        Row: {
          created_by: string | null
          customer_id: string
          id: string
          notes: string | null
          organization_id: string
          points_used: number
          redemption_date: string | null
          reward_id: string
        }
        Insert: {
          created_by?: string | null
          customer_id: string
          id?: string
          notes?: string | null
          organization_id: string
          points_used: number
          redemption_date?: string | null
          reward_id: string
        }
        Update: {
          created_by?: string | null
          customer_id?: string
          id?: string
          notes?: string | null
          organization_id?: string
          points_used?: number
          redemption_date?: string | null
          reward_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reward_redemptions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reward_redemptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reward_redemptions_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "loyalty_rewards"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_items: {
        Row: {
          comments: string | null
          created_at: string | null
          discount_amount: number | null
          id: string
          inc_amount: number | null
          inc_rate: number | null
          is_tax_exempt_item: boolean
          iva_amount: number | null
          iva_rate: number | null
          line_total_after_taxes: number | null
          line_total_before_taxes: number | null
          modifiers: Json | null
          organization_id: string
          product_bar_code: string | null
          product_id: string
          product_name: string | null
          quantity: number
          sale_id: string
          taxable_base: number | null
          total_price: number
          unit_code: string | null
          unit_price: number
          unspsc_code: string | null
        }
        Insert: {
          comments?: string | null
          created_at?: string | null
          discount_amount?: number | null
          id?: string
          inc_amount?: number | null
          inc_rate?: number | null
          is_tax_exempt_item?: boolean
          iva_amount?: number | null
          iva_rate?: number | null
          line_total_after_taxes?: number | null
          line_total_before_taxes?: number | null
          modifiers?: Json | null
          organization_id: string
          product_bar_code?: string | null
          product_id: string
          product_name?: string | null
          quantity?: number
          sale_id: string
          taxable_base?: number | null
          total_price: number
          unit_code?: string | null
          unit_price: number
          unspsc_code?: string | null
        }
        Update: {
          comments?: string | null
          created_at?: string | null
          discount_amount?: number | null
          id?: string
          inc_amount?: number | null
          inc_rate?: number | null
          is_tax_exempt_item?: boolean
          iva_amount?: number | null
          iva_rate?: number | null
          line_total_after_taxes?: number | null
          line_total_before_taxes?: number | null
          modifiers?: Json | null
          organization_id?: string
          product_bar_code?: string | null
          product_id?: string
          product_name?: string | null
          quantity?: number
          sale_id?: string
          taxable_base?: number | null
          total_price?: number
          unit_code?: string | null
          unit_price?: number
          unspsc_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "v_sales_with_balance"
            referencedColumns: ["sale_id"]
          },
        ]
      }
      sales: {
        Row: {
          billing_address: Json | null
          cashier_id: string | null
          created_at: string | null
          created_by: string | null
          cufe: string | null
          currency_code: string | null
          customer_id: string | null
          delivery_location: unknown
          delivery_metadata: Json | null
          dian_issue_timestamp: string | null
          dian_metadata: Json | null
          dian_qr_url: string | null
          discount_total_amount: number | null
          driver_assigned_at: string | null
          driver_id: string | null
          due_date: string | null
          einvoice_status: string | null
          exchange_rate: number | null
          external_provider: string | null
          external_user_id: string | null
          grand_total: number | null
          id: string
          invoice_number: string | null
          invoice_prefix: string | null
          is_einvoice: boolean
          metadata: Json
          notes: string | null
          order_number: number | null
          order_type: Database["public"]["Enums"]["order_type"]
          organization_id: string
          payment_method: string | null
          payment_snapshot: Json | null
          payment_terms: string | null
          picked_up_at: string | null
          pickup_location: unknown
          pos_id: string | null
          price_includes_taxes: boolean
          service_charge_amount: number | null
          shift_id: string | null
          shipping_address: Json | null
          shipping_amount: number | null
          status: Database["public"]["Enums"]["order_status"] | null
          store_id: string | null
          subtotal_amount: number | null
          tax_inc_amount: number | null
          tax_iva_amount: number | null
          tax_other_amount: number | null
          tip: number | null
          tip_amount: number | null
          tip_percentage: number
          total_amount: number
          updated_at: string | null
          verification_code: string | null
          wh_ica_amount: number | null
          wh_income_tax_amount: number | null
          wh_iva_amount: number | null
        }
        Insert: {
          billing_address?: Json | null
          cashier_id?: string | null
          created_at?: string | null
          created_by?: string | null
          cufe?: string | null
          currency_code?: string | null
          customer_id?: string | null
          delivery_location?: unknown
          delivery_metadata?: Json | null
          dian_issue_timestamp?: string | null
          dian_metadata?: Json | null
          dian_qr_url?: string | null
          discount_total_amount?: number | null
          driver_assigned_at?: string | null
          driver_id?: string | null
          due_date?: string | null
          einvoice_status?: string | null
          exchange_rate?: number | null
          external_provider?: string | null
          external_user_id?: string | null
          grand_total?: number | null
          id?: string
          invoice_number?: string | null
          invoice_prefix?: string | null
          is_einvoice?: boolean
          metadata?: Json
          notes?: string | null
          order_number?: number | null
          order_type?: Database["public"]["Enums"]["order_type"]
          organization_id: string
          payment_method?: string | null
          payment_snapshot?: Json | null
          payment_terms?: string | null
          picked_up_at?: string | null
          pickup_location?: unknown
          pos_id?: string | null
          price_includes_taxes?: boolean
          service_charge_amount?: number | null
          shift_id?: string | null
          shipping_address?: Json | null
          shipping_amount?: number | null
          status?: Database["public"]["Enums"]["order_status"] | null
          store_id?: string | null
          subtotal_amount?: number | null
          tax_inc_amount?: number | null
          tax_iva_amount?: number | null
          tax_other_amount?: number | null
          tip?: number | null
          tip_amount?: number | null
          tip_percentage?: number
          total_amount: number
          updated_at?: string | null
          verification_code?: string | null
          wh_ica_amount?: number | null
          wh_income_tax_amount?: number | null
          wh_iva_amount?: number | null
        }
        Update: {
          billing_address?: Json | null
          cashier_id?: string | null
          created_at?: string | null
          created_by?: string | null
          cufe?: string | null
          currency_code?: string | null
          customer_id?: string | null
          delivery_location?: unknown
          delivery_metadata?: Json | null
          dian_issue_timestamp?: string | null
          dian_metadata?: Json | null
          dian_qr_url?: string | null
          discount_total_amount?: number | null
          driver_assigned_at?: string | null
          driver_id?: string | null
          due_date?: string | null
          einvoice_status?: string | null
          exchange_rate?: number | null
          external_provider?: string | null
          external_user_id?: string | null
          grand_total?: number | null
          id?: string
          invoice_number?: string | null
          invoice_prefix?: string | null
          is_einvoice?: boolean
          metadata?: Json
          notes?: string | null
          order_number?: number | null
          order_type?: Database["public"]["Enums"]["order_type"]
          organization_id?: string
          payment_method?: string | null
          payment_snapshot?: Json | null
          payment_terms?: string | null
          picked_up_at?: string | null
          pickup_location?: unknown
          pos_id?: string | null
          price_includes_taxes?: boolean
          service_charge_amount?: number | null
          shift_id?: string | null
          shipping_address?: Json | null
          shipping_amount?: number | null
          status?: Database["public"]["Enums"]["order_status"] | null
          store_id?: string | null
          subtotal_amount?: number | null
          tax_inc_amount?: number | null
          tax_iva_amount?: number | null
          tax_other_amount?: number | null
          tip?: number | null
          tip_amount?: number | null
          tip_percentage?: number
          total_amount?: number
          updated_at?: string | null
          verification_code?: string | null
          wh_ica_amount?: number | null
          wh_income_tax_amount?: number | null
          wh_iva_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "cash_shifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "v_cash_position"
            referencedColumns: ["shift_id"]
          },
          {
            foreignKeyName: "sales_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "v_shift_summary"
            referencedColumns: ["shift_id"]
          },
        ]
      }
      shortlink_clicks: {
        Row: {
          browser: string | null
          city: string | null
          clicked_at: string
          code: string
          country: string | null
          device: string | null
          id: number
          ip: unknown
          is_mobile: boolean | null
          latitude: number | null
          longitude: number | null
          metadata: Json | null
          os: string | null
          referer: string | null
          region: string | null
          user_agent: string | null
        }
        Insert: {
          browser?: string | null
          city?: string | null
          clicked_at?: string
          code: string
          country?: string | null
          device?: string | null
          id?: never
          ip?: unknown
          is_mobile?: boolean | null
          latitude?: number | null
          longitude?: number | null
          metadata?: Json | null
          os?: string | null
          referer?: string | null
          region?: string | null
          user_agent?: string | null
        }
        Update: {
          browser?: string | null
          city?: string | null
          clicked_at?: string
          code?: string
          country?: string | null
          device?: string | null
          id?: never
          ip?: unknown
          is_mobile?: boolean | null
          latitude?: number | null
          longitude?: number | null
          metadata?: Json | null
          os?: string | null
          referer?: string | null
          region?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shortlink_clicks_code_fkey"
            columns: ["code"]
            isOneToOne: false
            referencedRelation: "shortlinks"
            referencedColumns: ["code"]
          },
        ]
      }
      shortlinks: {
        Row: {
          clicks: number
          code: string
          created_at: string
          to_url: string
        }
        Insert: {
          clicks?: number
          code: string
          created_at?: string
          to_url: string
        }
        Update: {
          clicks?: number
          code?: string
          created_at?: string
          to_url?: string
        }
        Relationships: []
      }
      spatial_ref_sys: {
        Row: {
          auth_name: string | null
          auth_srid: number | null
          proj4text: string | null
          srid: number
          srtext: string | null
        }
        Insert: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid: number
          srtext?: string | null
        }
        Update: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid?: number
          srtext?: string | null
        }
        Relationships: []
      }
      subscription_frequency_options: {
        Row: {
          billing_anchor: Database["public"]["Enums"]["billing_anchor_type"]
          billing_anchor_value: number | null
          created_at: string | null
          discount_type:
            | Database["public"]["Enums"]["discount_amount_type"]
            | null
          discount_value: number | null
          end_after_cycles: number | null
          end_on_date: string | null
          end_type: Database["public"]["Enums"]["subscription_end_type"]
          id: string
          interval_count: number
          interval_unit: Database["public"]["Enums"]["subscription_interval_unit"]
          is_active: boolean
          label: string
          organization_id: string
          pause_allowed: boolean
          pause_limit_days: number | null
          plan_id: string
          start_offset_days: number
          updated_at: string | null
        }
        Insert: {
          billing_anchor?: Database["public"]["Enums"]["billing_anchor_type"]
          billing_anchor_value?: number | null
          created_at?: string | null
          discount_type?:
            | Database["public"]["Enums"]["discount_amount_type"]
            | null
          discount_value?: number | null
          end_after_cycles?: number | null
          end_on_date?: string | null
          end_type?: Database["public"]["Enums"]["subscription_end_type"]
          id?: string
          interval_count?: number
          interval_unit?: Database["public"]["Enums"]["subscription_interval_unit"]
          is_active?: boolean
          label: string
          organization_id: string
          pause_allowed?: boolean
          pause_limit_days?: number | null
          plan_id: string
          start_offset_days?: number
          updated_at?: string | null
        }
        Update: {
          billing_anchor?: Database["public"]["Enums"]["billing_anchor_type"]
          billing_anchor_value?: number | null
          created_at?: string | null
          discount_type?:
            | Database["public"]["Enums"]["discount_amount_type"]
            | null
          discount_value?: number | null
          end_after_cycles?: number | null
          end_on_date?: string | null
          end_type?: Database["public"]["Enums"]["subscription_end_type"]
          id?: string
          interval_count?: number
          interval_unit?: Database["public"]["Enums"]["subscription_interval_unit"]
          is_active?: boolean
          label?: string
          organization_id?: string
          pause_allowed?: boolean
          pause_limit_days?: number | null
          plan_id?: string
          start_offset_days?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscription_frequency_options_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plan_categories: {
        Row: {
          category_id: string
          created_at: string | null
          id: string
          organization_id: string
          plan_id: string
        }
        Insert: {
          category_id: string
          created_at?: string | null
          id?: string
          organization_id: string
          plan_id: string
        }
        Update: {
          category_id?: string
          created_at?: string | null
          id?: string
          organization_id?: string
          plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_plan_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_plan_categories_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plan_items: {
        Row: {
          created_at: string | null
          id: string
          item_id: string
          organization_id: string
          plan_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          item_id: string
          organization_id: string
          plan_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          item_id?: string
          organization_id?: string
          plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_plan_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_plan_items_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          organization_id: string
          scope: string
          shipping_discount_type: string | null
          shipping_discount_value: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          organization_id: string
          scope?: string
          shipping_discount_type?: string | null
          shipping_discount_value?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string
          scope?: string
          shipping_discount_type?: string | null
          shipping_discount_value?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          canceled_at: string | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          customer_id: string | null
          external_provider: string | null
          external_user_id: string | null
          id: string
          metadata: Json
          organization_id: string
          plan_code: string
          provider: string
          provider_subscription_id: string
          status: string
          trial_end: string | null
          updated_at: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          canceled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          customer_id?: string | null
          external_provider?: string | null
          external_user_id?: string | null
          id?: string
          metadata?: Json
          organization_id: string
          plan_code: string
          provider: string
          provider_subscription_id: string
          status?: string
          trial_end?: string | null
          updated_at?: string
        }
        Update: {
          cancel_at_period_end?: boolean
          canceled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          customer_id?: string | null
          external_provider?: string | null
          external_user_id?: string | null
          id?: string
          metadata?: Json
          organization_id?: string
          plan_code?: string
          provider?: string
          provider_subscription_id?: string
          status?: string
          trial_end?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_customer_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_org_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_shares: {
        Row: {
          created_at: string | null
          driver_id: string
          expiry_time: string | null
          id: string
          order_id: string | null
          recipient_name: string | null
          recipient_phone: string
          share_token: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          driver_id: string
          expiry_time?: string | null
          id?: string
          order_id?: string | null
          recipient_name?: string | null
          recipient_phone: string
          share_token?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          driver_id?: string
          expiry_time?: string | null
          id?: string
          order_id?: string | null
          recipient_name?: string | null
          recipient_phone?: string
          share_token?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trip_shares_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_shares_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_sales_with_balance"
            referencedColumns: ["sale_id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          created_at: string | null
          dark_mode: boolean | null
          default_tab: number | null
          language: string | null
          notifications_enabled: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          dark_mode?: boolean | null
          default_tab?: number | null
          language?: string | null
          notifications_enabled?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          dark_mode?: boolean | null
          default_tab?: number | null
          language?: string | null
          notifications_enabled?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_stats: {
        Row: {
          created_at: string | null
          earnings_today: number | null
          last_order_date: string | null
          orders_today: number | null
          rating: number | null
          total_earnings: number | null
          total_orders: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          earnings_today?: number | null
          last_order_date?: string | null
          orders_today?: number | null
          rating?: number | null
          total_earnings?: number | null
          total_orders?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          earnings_today?: number | null
          last_order_date?: string | null
          orders_today?: number | null
          rating?: number | null
          total_earnings?: number | null
          total_orders?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      warehouses: {
        Row: {
          created_at: string
          description: string | null
          id: string
          location_id: string
          name: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          location_id: string
          name: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          location_id?: string
          name?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "warehouses_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      zones: {
        Row: {
          center_latitude: number
          center_longitude: number
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          radius_km: number
          updated_at: string | null
        }
        Insert: {
          center_latitude: number
          center_longitude: number
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          radius_km?: number
          updated_at?: string | null
        }
        Update: {
          center_latitude?: number
          center_longitude?: number
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          radius_km?: number
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      daily_earnings_view: {
        Row: {
          date: string | null
          driver_id: string | null
          last_updated: string | null
          orders_count: number | null
          total_earnings: number | null
          total_system_fees: number | null
          total_tips: number | null
        }
        Relationships: []
      }
      geography_columns: {
        Row: {
          coord_dimension: number | null
          f_geography_column: unknown
          f_table_catalog: unknown
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Relationships: []
      }
      geometry_columns: {
        Row: {
          coord_dimension: number | null
          f_geometry_column: unknown
          f_table_catalog: string | null
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Insert: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Update: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Relationships: []
      }
      v_cash_position: {
        Row: {
          cash_from_payments: number | null
          cash_movements_net: number | null
          closed_at: string | null
          counted_closing_amount: number | null
          difference_amount_calc: number | null
          expected_cash: number | null
          location_id: string | null
          opened_at: string | null
          opening_amount: number | null
          organization_id: string | null
          pos_id: string | null
          shift_id: string | null
          status: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cash_shifts_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_shifts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_shifts_pos_id_fkey"
            columns: ["pos_id"]
            isOneToOne: false
            referencedRelation: "pos_terminals"
            referencedColumns: ["id"]
          },
        ]
      }
      v_org_members_with_locations: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string | null
          organization_id: string | null
          phone: string | null
          role: string | null
          updated_at: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      v_sale_payment_totals: {
        Row: {
          first_payment_at: string | null
          last_payment_at: string | null
          net_card: number | null
          net_cash: number | null
          net_others: number | null
          net_transfer: number | null
          organization_id: string | null
          sale_id: string | null
          total_captured: number | null
          total_net_received: number | null
          total_refunded: number | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "v_sales_with_balance"
            referencedColumns: ["sale_id"]
          },
        ]
      }
      v_sales_with_balance: {
        Row: {
          balance_due: number | null
          customer_id: string | null
          first_payment_at: string | null
          grand_total: number | null
          last_payment_at: string | null
          organization_id: string | null
          sale_id: string | null
          total_paid_net: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      v_shift_cash_from_payments: {
        Row: {
          cash_from_payments: number | null
          location_id: string | null
          organization_id: string | null
          pos_id: string | null
          shift_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      v_shift_cash_movements: {
        Row: {
          cash_in: number | null
          cash_movements_net: number | null
          cash_out: number | null
          location_id: string | null
          notes: string | null
          organization_id: string | null
          pos_id: string | null
          reason: Database["public"]["Enums"]["cash_reason"] | null
          shift_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cash_movements_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_movements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_movements_pos_id_fkey"
            columns: ["pos_id"]
            isOneToOne: false
            referencedRelation: "pos_terminals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_movements_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "cash_shifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_movements_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "v_cash_position"
            referencedColumns: ["shift_id"]
          },
          {
            foreignKeyName: "cash_movements_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "v_shift_summary"
            referencedColumns: ["shift_id"]
          },
        ]
      }
      v_shift_summary: {
        Row: {
          cash_in: number | null
          cash_movements_net: number | null
          cash_out: number | null
          closed_at: string | null
          counted_closing_amount: number | null
          difference_amount: number | null
          expected_closing_cash: number | null
          location_id: string | null
          opened_at: string | null
          opening_amount: number | null
          organization_id: string | null
          pos_id: string | null
          shift_id: string | null
          status: string | null
          total_card: number | null
          total_cash: number | null
          total_others: number | null
          total_transfer: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cash_shifts_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_shifts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_shifts_pos_id_fkey"
            columns: ["pos_id"]
            isOneToOne: false
            referencedRelation: "pos_terminals"
            referencedColumns: ["id"]
          },
        ]
      }
      variant_locations: {
        Row: {
          available_to_sell: number | null
          created_at: string | null
          id: string | null
          is_available: boolean | null
          is_tracked: boolean | null
          location_id: string | null
          on_hand: number | null
          organization_id: string | null
          price: number | null
          reserved: number | null
          safety_stock: number | null
          updated_at: string | null
          variant_id: string | null
        }
        Insert: {
          available_to_sell?: never
          created_at?: string | null
          id?: string | null
          is_available?: boolean | null
          is_tracked?: boolean | null
          location_id?: string | null
          on_hand?: number | null
          organization_id?: string | null
          price?: number | null
          reserved?: number | null
          safety_stock?: number | null
          updated_at?: string | null
          variant_id?: string | null
        }
        Update: {
          available_to_sell?: never
          created_at?: string | null
          id?: string | null
          is_available?: boolean | null
          is_tracked?: boolean | null
          location_id?: string | null
          on_hand?: number | null
          organization_id?: string | null
          price?: number | null
          reserved?: number | null
          safety_stock?: number | null
          updated_at?: string | null
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_variant_locations_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_variant_locations_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      _postgis_deprecate: {
        Args: { newname: string; oldname: string; version: string }
        Returns: undefined
      }
      _postgis_index_extent: {
        Args: { col: string; tbl: unknown }
        Returns: unknown
      }
      _postgis_pgsql_version: { Args: never; Returns: string }
      _postgis_scripts_pgsql_version: { Args: never; Returns: string }
      _postgis_selectivity: {
        Args: { att_name: string; geom: unknown; mode?: string; tbl: unknown }
        Returns: number
      }
      _postgis_stats: {
        Args: { ""?: string; att_name: string; tbl: unknown }
        Returns: string
      }
      _ranges_for_weekday: {
        Args: { p_location_id: string; p_weekday: number }
        Returns: {
          close_time: string
          open_time: string
        }[]
      }
      _st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_crosses: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      _st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_intersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      _st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      _st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      _st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_sortablehash: { Args: { geom: unknown }; Returns: number }
      _st_touches: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_voronoi: {
        Args: {
          clip?: unknown
          g1: unknown
          return_polygons?: boolean
          tolerance?: number
        }
        Returns: unknown
      }
      _st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      addauth: { Args: { "": string }; Returns: boolean }
      addgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              new_dim: number
              new_srid_in: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
      calculate_daily_earnings: {
        Args: { p_driver_id: string; p_end_date: string; p_start_date: string }
        Returns: {
          date: string
          orders_count: number
          total_earnings: number
          total_system_fees: number
          total_tips: number
        }[]
      }
      calculate_distance_between_points: {
        Args: { lat1: number; lat2: number; lng1: number; lng2: number }
        Returns: number
      }
      calculate_order_earnings: {
        Args: {
          p_driver_id?: string
          p_order_total: number
          p_tip_amount?: number
        }
        Returns: {
          driver_earnings: number
          order_total: number
          system_fee_amount: number
          system_fee_percent: number
          tip_amount: number
        }[]
      }
      can_edit_org: { Args: { p_org: string }; Returns: boolean }
      category_list_with_counts:
        | {
            Args: { p_org: string }
            Returns: {
              created_at: string
              description: string
              id: string
              image_url: string
              is_active: boolean
              name: string
              organization_id: string
              parent_id: string
              parent_name: string
              products_count: number
              storage_path: string
              updated_at: string
            }[]
          }
        | {
            Args: {
              p_is_active?: boolean
              p_limit?: number
              p_offset?: number
              p_org: string
              p_search?: string
            }
            Returns: {
              created_at: string
              description: string
              id: string
              image_url: string
              is_active: boolean
              name: string
              organization_id: string
              parent_id: string
              parent_name: string
              products_count: number
              sort_order: number
              storage_path: string
              updated_at: string
            }[]
          }
      category_reorder: {
        Args: { p_items: Json; p_org: string }
        Returns: undefined
      }
      category_reorder_simple: {
        Args: { p_items: Json; p_org: string }
        Returns: undefined
      }
      check_slug_availability: {
        Args: { p_current_org_id?: string; p_slug: string }
        Returns: Json
      }
      create_default_org:
        | { Args: { p_org_name?: string }; Returns: string }
        | { Args: { p_org_name?: string; p_slug?: string }; Returns: string }
        | { Args: { p_org_name?: string; p_slug?: string; p_business_category?: string }; Returns: string }
      current_org_id: { Args: never; Returns: string }
      deactivate_expired_loyalty_rewards: {
        Args: never
        Returns: {
          affected_count: number
          execution_time: string
        }[]
      }
      disablelongtransactions: { Args: never; Returns: string }
      dropgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { column_name: string; table_name: string }; Returns: string }
      dropgeometrytable:
        | {
            Args: {
              catalog_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { schema_name: string; table_name: string }; Returns: string }
        | { Args: { table_name: string }; Returns: string }
      enablelongtransactions: { Args: never; Returns: string }
      equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      find_nearby_locations: {
        Args: { p_lat: number; p_lng: number; p_radius_km: number }
        Returns: {
          address_line1: string
          brand_banner_url: string
          brand_logo_url: string
          business_category: string
          delivery_status: string
          distance_km: number
          id: string
          image_url: string
          is_open: boolean
          name: string
          national_shipping_status: string
          organization_id: string
          organization_name: string
          organization_slug: string
          pickup_status: string
          shift_status: string
          status_text: string
        }[]
      }
      find_nearest_location: {
        Args: {
          p_lat: number
          p_lng: number
          p_org_id: string
          p_radius_km?: number
          p_service_channel?: string
        }
        Returns: {
          address_line1: string
          city: string
          distance_meters: number
          is_open: boolean
          latitude: number
          local_delivery_enabled: boolean
          location_id: string
          longitude: number
          name: string
          pickup_enabled: boolean
          shipping_enabled: boolean
        }[]
      }
      find_next_opening: {
        Args: { p_from_time: string; p_location_id: string; p_timezone: string }
        Returns: string
      }
      format_next_opening: {
        Args: { p_next_open: string; p_timezone: string }
        Returns: string
      }
      geometry: { Args: { "": string }; Returns: unknown }
      geometry_above: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_below: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_cmp: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_contained_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_distance_box: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_distance_centroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_eq: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_ge: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_gt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_le: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_left: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_lt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overabove: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overbelow: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overleft: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overright: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_right: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_within: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geomfromewkt: { Args: { "": string }; Returns: unknown }
      get_driver_earnings_summary: {
        Args: { p_driver_id: string }
        Returns: {
          avg_earnings_per_order: number
          last_updated: string
          total_earnings: number
          total_orders: number
          total_tips: number
        }[]
      }
      get_location_channel_status: {
        Args: { p_location_id: string }
        Returns: {
          delivery_status: string
          is_location_open: boolean
          location_id: string
          location_status_text: string
          national_shipping_status: string
          next_open_at: string
          pickup_status: string
        }[]
      }
      get_next_order_number: { Args: { org_id: string }; Returns: number }
      gettransactionid: { Args: never; Returns: unknown }
      has_org_role: {
        Args: { p_org: string; p_roles: string[] }
        Returns: boolean
      }
      increment_campaign_metric: {
        Args: { p_campaign_id: string; p_metric_field: string }
        Returns: undefined
      }
      increment_shortlink_clicks: { Args: { p_code: string }; Returns: number }
      is_admin_of_org: { Args: { p_org: string }; Returns: boolean }
      is_location_available_at: {
        Args: { p_at: string; p_location: string }
        Returns: boolean
      }
      is_location_available_now: {
        Args: { p_location: string }
        Returns: boolean
      }
      is_member_of_location_org: {
        Args: { p_location: string }
        Returns: boolean
      }
      is_member_of_org: { Args: { p_org: string }; Returns: boolean }
      is_member_of_special_day: {
        Args: { special_day: string }
        Returns: boolean
      }
      is_org_admin: { Args: { _org: string }; Returns: boolean }
      is_org_member: { Args: { p_org: string }; Returns: boolean }
      is_point_in_coverage_zone: {
        Args: { p_lat: number; p_lng: number; p_location_id: string }
        Returns: {
          delivery_time_minutes: number
          is_covered: boolean
          logistics_cost: number
          zone_id: string
          zone_name: string
        }[]
      }
      json_to_polygon_geography: { Args: { json_path: Json }; Returns: unknown }
      location_is_open_now: {
        Args: { p_at: string; p_location_id: string }
        Returns: {
          is_open: boolean
          location_id: string
          next_open_at: string
          status_text: string
        }[]
      }
      location_statuses_for_org: {
        Args: { p_at?: string; p_org: string }
        Returns: {
          address_line1: string
          city: string
          id: string
          image_url: string
          is_open: boolean
          local_delivery_enabled: boolean
          name: string
          next_open_at: string
          pickup_enabled: boolean
          prep_orders: boolean
          status_text: string
          timezone: string
        }[]
      }
      longtransactionsenabled: { Args: never; Returns: boolean }
      next_order_number: { Args: { org_id: string }; Returns: number }
      org_slug_available: { Args: { p_slug: string }; Returns: boolean }
      populate_geometry_columns:
        | { Args: { tbl_oid: unknown; use_typmod?: boolean }; Returns: number }
        | { Args: { use_typmod?: boolean }; Returns: string }
      postgis_constraint_dims: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_srid: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_type: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: string
      }
      postgis_extensions_upgrade: { Args: never; Returns: string }
      postgis_full_version: { Args: never; Returns: string }
      postgis_geos_version: { Args: never; Returns: string }
      postgis_lib_build_date: { Args: never; Returns: string }
      postgis_lib_revision: { Args: never; Returns: string }
      postgis_lib_version: { Args: never; Returns: string }
      postgis_libjson_version: { Args: never; Returns: string }
      postgis_liblwgeom_version: { Args: never; Returns: string }
      postgis_libprotobuf_version: { Args: never; Returns: string }
      postgis_libxml_version: { Args: never; Returns: string }
      postgis_proj_version: { Args: never; Returns: string }
      postgis_scripts_build_date: { Args: never; Returns: string }
      postgis_scripts_installed: { Args: never; Returns: string }
      postgis_scripts_released: { Args: never; Returns: string }
      postgis_svn_version: { Args: never; Returns: string }
      postgis_type_name: {
        Args: {
          coord_dimension: number
          geomname: string
          use_new_name?: boolean
        }
        Returns: string
      }
      postgis_version: { Args: never; Returns: string }
      postgis_wagyu_version: { Args: never; Returns: string }
      product_create: {
        Args: {
          p_description?: string
          p_image_url?: string
          p_is_available?: boolean
          p_name: string
          p_org: string
          p_price?: number
        }
        Returns: {
          active_principle: string | null
          concentration: string | null
          content_unit: string | null
          created_at: string | null
          created_by: string
          cum_code: string | null
          description: string | null
          dian_tariff_code: string | null
          fx_asset_kind: Database["public"]["Enums"]["fx_asset_kind"] | null
          fx_auto_pricing: boolean
          fx_base_currency: string | null
          fx_buy_margin_bps: number | null
          fx_buy_price: number | null
          fx_last_rate_at: string | null
          fx_last_rate_source: string | null
          fx_market_feed_payload: Json | null
          fx_price_metadata: Json
          fx_pricing_mode: Database["public"]["Enums"]["fx_pricing_mode"] | null
          fx_quantity_precision: number
          fx_quote_currency: string | null
          fx_quote_unit: number
          fx_reference_code: string | null
          fx_reference_price: number | null
          fx_sell_margin_bps: number | null
          fx_sell_price: number | null
          id: string
          image_url: string | null
          inc_rate: number | null
          inc_type: Database["public"]["Enums"]["tax_inc_type"]
          invima_record: string | null
          is_available: boolean | null
          item_type: Database["public"]["Enums"]["product_item_type"]
          ium_code: string | null
          iva_category: Database["public"]["Enums"]["tax_iva_category"]
          iva_rate: number
          lab_name: string | null
          manufacturer_name: string | null
          manufacturer_nit: string | null
          measurement_unit: string | null
          minimum_unit: string | null
          name: string
          organization_id: string
          packaging_unit: string | null
          preparation_time_minutes: number | null
          price: number | null
          price_includes_taxes: boolean
          principal_bar_code: string | null
          storage_temp_max: number | null
          storage_temp_min: number | null
          tax_observation: string | null
          unit_code: string | null
          unspsc_code: string | null
          updated_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "products"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      product_delete: { Args: { p_id: string }; Returns: undefined }
      product_update: {
        Args: {
          p_description?: string
          p_id: string
          p_image_url?: string
          p_is_available?: boolean
          p_name?: string
          p_price?: number
        }
        Returns: {
          active_principle: string | null
          concentration: string | null
          content_unit: string | null
          created_at: string | null
          created_by: string
          cum_code: string | null
          description: string | null
          dian_tariff_code: string | null
          fx_asset_kind: Database["public"]["Enums"]["fx_asset_kind"] | null
          fx_auto_pricing: boolean
          fx_base_currency: string | null
          fx_buy_margin_bps: number | null
          fx_buy_price: number | null
          fx_last_rate_at: string | null
          fx_last_rate_source: string | null
          fx_market_feed_payload: Json | null
          fx_price_metadata: Json
          fx_pricing_mode: Database["public"]["Enums"]["fx_pricing_mode"] | null
          fx_quantity_precision: number
          fx_quote_currency: string | null
          fx_quote_unit: number
          fx_reference_code: string | null
          fx_reference_price: number | null
          fx_sell_margin_bps: number | null
          fx_sell_price: number | null
          id: string
          image_url: string | null
          inc_rate: number | null
          inc_type: Database["public"]["Enums"]["tax_inc_type"]
          invima_record: string | null
          is_available: boolean | null
          item_type: Database["public"]["Enums"]["product_item_type"]
          ium_code: string | null
          iva_category: Database["public"]["Enums"]["tax_iva_category"]
          iva_rate: number
          lab_name: string | null
          manufacturer_name: string | null
          manufacturer_nit: string | null
          measurement_unit: string | null
          minimum_unit: string | null
          name: string
          organization_id: string
          packaging_unit: string | null
          preparation_time_minutes: number | null
          price: number | null
          price_includes_taxes: boolean
          principal_bar_code: string | null
          storage_temp_max: number | null
          storage_temp_min: number | null
          tax_observation: string | null
          unit_code: string | null
          unspsc_code: string | null
          updated_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "products"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      products_list: {
        Args: {
          p_limit?: number
          p_offset?: number
          p_org: string
          p_search?: string
        }
        Returns: {
          active_principle: string | null
          concentration: string | null
          content_unit: string | null
          created_at: string | null
          created_by: string
          cum_code: string | null
          description: string | null
          dian_tariff_code: string | null
          fx_asset_kind: Database["public"]["Enums"]["fx_asset_kind"] | null
          fx_auto_pricing: boolean
          fx_base_currency: string | null
          fx_buy_margin_bps: number | null
          fx_buy_price: number | null
          fx_last_rate_at: string | null
          fx_last_rate_source: string | null
          fx_market_feed_payload: Json | null
          fx_price_metadata: Json
          fx_pricing_mode: Database["public"]["Enums"]["fx_pricing_mode"] | null
          fx_quantity_precision: number
          fx_quote_currency: string | null
          fx_quote_unit: number
          fx_reference_code: string | null
          fx_reference_price: number | null
          fx_sell_margin_bps: number | null
          fx_sell_price: number | null
          id: string
          image_url: string | null
          inc_rate: number | null
          inc_type: Database["public"]["Enums"]["tax_inc_type"]
          invima_record: string | null
          is_available: boolean | null
          item_type: Database["public"]["Enums"]["product_item_type"]
          ium_code: string | null
          iva_category: Database["public"]["Enums"]["tax_iva_category"]
          iva_rate: number
          lab_name: string | null
          manufacturer_name: string | null
          manufacturer_nit: string | null
          measurement_unit: string | null
          minimum_unit: string | null
          name: string
          organization_id: string
          packaging_unit: string | null
          preparation_time_minutes: number | null
          price: number | null
          price_includes_taxes: boolean
          principal_bar_code: string | null
          storage_temp_max: number | null
          storage_temp_min: number | null
          tax_observation: string | null
          unit_code: string | null
          unspsc_code: string | null
          updated_at: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "products"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      refresh_daily_earnings_view: { Args: never; Returns: undefined }
      set_primary_product_image: {
        Args: { p_image_id: string; p_product_id: string }
        Returns: undefined
      }
      slugify_sql: { Args: { p_text: string }; Returns: string }
      st_3dclosestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3ddistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_3dlongestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmakebox: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmaxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dshortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_addpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_angle:
        | { Args: { line1: unknown; line2: unknown }; Returns: number }
        | {
            Args: { pt1: unknown; pt2: unknown; pt3: unknown; pt4?: unknown }
            Returns: number
          }
      st_area:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_asencodedpolyline: {
        Args: { geom: unknown; nprecision?: number }
        Returns: string
      }
      st_asewkt: { Args: { "": string }; Returns: string }
      st_asgeojson:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: {
              geom_column?: string
              maxdecimaldigits?: number
              pretty_bool?: boolean
              r: Record<string, unknown>
            }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_asgml:
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
            }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
      st_askml:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_aslatlontext: {
        Args: { geom: unknown; tmpl?: string }
        Returns: string
      }
      st_asmarc21: { Args: { format?: string; geom: unknown }; Returns: string }
      st_asmvtgeom: {
        Args: {
          bounds: unknown
          buffer?: number
          clip_geom?: boolean
          extent?: number
          geom: unknown
        }
        Returns: unknown
      }
      st_assvg:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_astext: { Args: { "": string }; Returns: string }
      st_astwkb:
        | {
            Args: {
              geom: unknown
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown[]
              ids: number[]
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
      st_asx3d: {
        Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
        Returns: string
      }
      st_azimuth:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: number }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_boundingdiagonal: {
        Args: { fits?: boolean; geom: unknown }
        Returns: unknown
      }
      st_buffer:
        | {
            Args: { geom: unknown; options?: string; radius: number }
            Returns: unknown
          }
        | {
            Args: { geom: unknown; quadsegs: number; radius: number }
            Returns: unknown
          }
      st_centroid: { Args: { "": string }; Returns: unknown }
      st_clipbybox2d: {
        Args: { box: unknown; geom: unknown }
        Returns: unknown
      }
      st_closestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_collect: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_concavehull: {
        Args: {
          param_allow_holes?: boolean
          param_geom: unknown
          param_pctconvex: number
        }
        Returns: unknown
      }
      st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_coorddim: { Args: { geometry: unknown }; Returns: number }
      st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_crosses: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_curvetoline: {
        Args: { flags?: number; geom: unknown; tol?: number; toltype?: number }
        Returns: unknown
      }
      st_delaunaytriangles: {
        Args: { flags?: number; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_difference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_disjoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_distance:
        | {
            Args: { geog1: unknown; geog2: unknown; use_spheroid?: boolean }
            Returns: number
          }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_distancesphere:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
        | {
            Args: { geom1: unknown; geom2: unknown; radius: number }
            Returns: number
          }
      st_distancespheroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_expand:
        | { Args: { box: unknown; dx: number; dy: number }; Returns: unknown }
        | {
            Args: { box: unknown; dx: number; dy: number; dz?: number }
            Returns: unknown
          }
        | {
            Args: {
              dm?: number
              dx: number
              dy: number
              dz?: number
              geom: unknown
            }
            Returns: unknown
          }
      st_force3d: { Args: { geom: unknown; zvalue?: number }; Returns: unknown }
      st_force3dm: {
        Args: { geom: unknown; mvalue?: number }
        Returns: unknown
      }
      st_force3dz: {
        Args: { geom: unknown; zvalue?: number }
        Returns: unknown
      }
      st_force4d: {
        Args: { geom: unknown; mvalue?: number; zvalue?: number }
        Returns: unknown
      }
      st_generatepoints:
        | { Args: { area: unknown; npoints: number }; Returns: unknown }
        | {
            Args: { area: unknown; npoints: number; seed: number }
            Returns: unknown
          }
      st_geogfromtext: { Args: { "": string }; Returns: unknown }
      st_geographyfromtext: { Args: { "": string }; Returns: unknown }
      st_geohash:
        | { Args: { geog: unknown; maxchars?: number }; Returns: string }
        | { Args: { geom: unknown; maxchars?: number }; Returns: string }
      st_geomcollfromtext: { Args: { "": string }; Returns: unknown }
      st_geometricmedian: {
        Args: {
          fail_if_not_converged?: boolean
          g: unknown
          max_iter?: number
          tolerance?: number
        }
        Returns: unknown
      }
      st_geometryfromtext: { Args: { "": string }; Returns: unknown }
      st_geomfromewkt: { Args: { "": string }; Returns: unknown }
      st_geomfromgeojson:
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": string }; Returns: unknown }
      st_geomfromgml: { Args: { "": string }; Returns: unknown }
      st_geomfromkml: { Args: { "": string }; Returns: unknown }
      st_geomfrommarc21: { Args: { marc21xml: string }; Returns: unknown }
      st_geomfromtext: { Args: { "": string }; Returns: unknown }
      st_gmltosql: { Args: { "": string }; Returns: unknown }
      st_hasarc: { Args: { geometry: unknown }; Returns: boolean }
      st_hausdorffdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_hexagon: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_hexagongrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_interpolatepoint: {
        Args: { line: unknown; point: unknown }
        Returns: number
      }
      st_intersection: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_intersects:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_isvaliddetail: {
        Args: { flags?: number; geom: unknown }
        Returns: Database["public"]["CompositeTypes"]["valid_detail"]
        SetofOptions: {
          from: "*"
          to: "valid_detail"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      st_length:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_letters: { Args: { font?: Json; letters: string }; Returns: unknown }
      st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      st_linefromencodedpolyline: {
        Args: { nprecision?: number; txtin: string }
        Returns: unknown
      }
      st_linefromtext: { Args: { "": string }; Returns: unknown }
      st_linelocatepoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_linetocurve: { Args: { geometry: unknown }; Returns: unknown }
      st_locatealong: {
        Args: { geometry: unknown; leftrightoffset?: number; measure: number }
        Returns: unknown
      }
      st_locatebetween: {
        Args: {
          frommeasure: number
          geometry: unknown
          leftrightoffset?: number
          tomeasure: number
        }
        Returns: unknown
      }
      st_locatebetweenelevations: {
        Args: { fromelevation: number; geometry: unknown; toelevation: number }
        Returns: unknown
      }
      st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makebox2d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makeline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makevalid: {
        Args: { geom: unknown; params: string }
        Returns: unknown
      }
      st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_minimumboundingcircle: {
        Args: { inputgeom: unknown; segs_per_quarter?: number }
        Returns: unknown
      }
      st_mlinefromtext: { Args: { "": string }; Returns: unknown }
      st_mpointfromtext: { Args: { "": string }; Returns: unknown }
      st_mpolyfromtext: { Args: { "": string }; Returns: unknown }
      st_multilinestringfromtext: { Args: { "": string }; Returns: unknown }
      st_multipointfromtext: { Args: { "": string }; Returns: unknown }
      st_multipolygonfromtext: { Args: { "": string }; Returns: unknown }
      st_node: { Args: { g: unknown }; Returns: unknown }
      st_normalize: { Args: { geom: unknown }; Returns: unknown }
      st_offsetcurve: {
        Args: { distance: number; line: unknown; params?: string }
        Returns: unknown
      }
      st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_perimeter: {
        Args: { geog: unknown; use_spheroid?: boolean }
        Returns: number
      }
      st_pointfromtext: { Args: { "": string }; Returns: unknown }
      st_pointm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
        }
        Returns: unknown
      }
      st_pointz: {
        Args: {
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_pointzm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_polyfromtext: { Args: { "": string }; Returns: unknown }
      st_polygonfromtext: { Args: { "": string }; Returns: unknown }
      st_project: {
        Args: { azimuth: number; distance: number; geog: unknown }
        Returns: unknown
      }
      st_quantizecoordinates: {
        Args: {
          g: unknown
          prec_m?: number
          prec_x: number
          prec_y?: number
          prec_z?: number
        }
        Returns: unknown
      }
      st_reduceprecision: {
        Args: { geom: unknown; gridsize: number }
        Returns: unknown
      }
      st_relate: { Args: { geom1: unknown; geom2: unknown }; Returns: string }
      st_removerepeatedpoints: {
        Args: { geom: unknown; tolerance?: number }
        Returns: unknown
      }
      st_segmentize: {
        Args: { geog: unknown; max_segment_length: number }
        Returns: unknown
      }
      st_setsrid:
        | { Args: { geog: unknown; srid: number }; Returns: unknown }
        | { Args: { geom: unknown; srid: number }; Returns: unknown }
      st_sharedpaths: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_shortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_simplifypolygonhull: {
        Args: { geom: unknown; is_outer?: boolean; vertex_fraction: number }
        Returns: unknown
      }
      st_split: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_square: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_squaregrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_srid:
        | { Args: { geog: unknown }; Returns: number }
        | { Args: { geom: unknown }; Returns: number }
      st_subdivide: {
        Args: { geom: unknown; gridsize?: number; maxvertices?: number }
        Returns: unknown[]
      }
      st_swapordinates: {
        Args: { geom: unknown; ords: unknown }
        Returns: unknown
      }
      st_symdifference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_symmetricdifference: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_tileenvelope: {
        Args: {
          bounds?: unknown
          margin?: number
          x: number
          y: number
          zoom: number
        }
        Returns: unknown
      }
      st_touches: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_transform:
        | {
            Args: { from_proj: string; geom: unknown; to_proj: string }
            Returns: unknown
          }
        | {
            Args: { from_proj: string; geom: unknown; to_srid: number }
            Returns: unknown
          }
        | { Args: { geom: unknown; to_proj: string }; Returns: unknown }
      st_triangulatepolygon: { Args: { g1: unknown }; Returns: unknown }
      st_union:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
        | {
            Args: { geom1: unknown; geom2: unknown; gridsize: number }
            Returns: unknown
          }
      st_voronoilines: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_voronoipolygons: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_wkbtosql: { Args: { wkb: string }; Returns: unknown }
      st_wkttosql: { Args: { "": string }; Returns: unknown }
      st_wrapx: {
        Args: { geom: unknown; move: number; wrap: number }
        Returns: unknown
      }
      unaccent: { Args: { "": string }; Returns: string }
      unlockrows: { Args: { "": string }; Returns: number }
      update_driver_location: {
        Args: { p_driver_id: string; p_latitude: number; p_longitude: number }
        Returns: undefined
      }
      updategeometrysrid: {
        Args: {
          catalogn_name: string
          column_name: string
          new_srid_in: number
          schema_name: string
          table_name: string
        }
        Returns: string
      }
      validate_delivery_zone:
        | {
            Args: { p_lat: number; p_lng: number; p_org_id: string }
            Returns: {
              delivery_time_minutes: number
              is_covered: boolean
              location_id: string
              location_name: string
              logistics_cost: number
              zone_id: string
              zone_name: string
            }[]
          }
        | {
            Args: {
              p_lat: number
              p_lng: number
              p_location_id?: string
              p_org_id: string
            }
            Returns: {
              delivery_time_minutes: number
              is_covered: boolean
              location_id: string
              location_name: string
              logistics_cost: number
              zone_id: string
              zone_name: string
            }[]
          }
    }
    Enums: {
      billing_anchor_type: "purchase_date" | "day_of_month" | "weekday"
      campaign_goal:
        | "awareness"
        | "engagement"
        | "conversion"
        | "retention"
        | "birthday"
      campaign_status:
        | "draft"
        | "in_delivery"
        | "completed"
        | "cancelled"
        | "pending_execution"
      cart_status: "open" | "pending" | "completed" | "cancelled" | "abandoned"
      cash_direction: "in" | "out" | "adjustment"
      cash_movement_status: "draft" | "confirmed" | "voided"
      cash_reason:
        | "opening_float"
        | "cash_sale"
        | "cash_refund"
        | "petty_cash"
        | "supplier_payout"
        | "cash_pickup"
        | "bank_deposit"
        | "closing_adjustment"
        | "other"
      channel_status: "active" | "waiting" | "inactive"
      channel_type: "whatsapp" | "sms" | "email" | "push"
      discount_amount_type: "percent" | "fixed"
      discount_scope_type: "all_items" | "items" | "categories"
      fx_asset_kind: "currency" | "precious_metal" | "commodity"
      fx_operation_side: "buy" | "sell"
      fx_pricing_mode:
        | "manual"
        | "market_plus_margin"
        | "market_minus_margin"
        | "fixed_spread"
      notification_status:
        | "queued"
        | "processing"
        | "delivered"
        | "failed"
        | "cancelled"
      offer_type:
        | "percentage"
        | "fixed_amount"
        | "free_shipping"
        | "bogo"
        | "gift"
      order_status:
        | "NEW"
        | "PREPARING"
        | "OUT_FOR_DELIVERY"
        | "SCHEDULED_FOR_PICKUP"
        | "SCHEDULED_FOR_DELIVERY"
        | "DRAFT"
        | "CANCELED"
        | "RETURNED"
        | "COMPLETED"
        | "VOIDED"
        | "READY_FOR_PICKUP"
      order_type:
        | "DINE_IN"
        | "SELF_SERVE"
        | "PICKUP"
        | "DELIVERY_LOCAL"
        | "SHIPMENT_NATIONAL"
        | "COUNTER"
      org_role: "owner" | "admin" | "editor" | "viewer"
      payment_direction: "inflow" | "outflow"
      payment_method:
        | "cash"
        | "card"
        | "transfer"
        | "nequi"
        | "daviplata"
        | "wompi"
        | "qr"
        | "voucher"
        | "gift_card"
        | "store_credit"
        | "other"
        | "bold"
        | "cash_on_delivery"
      payment_status:
        | "pending"
        | "authorized"
        | "captured"
        | "settled"
        | "failed"
        | "refunded"
        | "voided"
        | "canceled"
      product_item_type:
        | "prepared_food"
        | "medication"
        | "physical"
        | "digital"
        | "other"
        | "foreign_exchange_asset"
      qr_mode: "TABLE" | "SIN_FILA" | "TAKEAWAY" | "DELIVERY" | "PICKUP"
      subscription_end_type: "never" | "on_date" | "after_cycles"
      subscription_interval_unit: "day" | "week" | "month"
      tax_inc_type:
        | "NINGUNO"
        | "COMIDAS_BEBIDAS"
        | "TELECOM"
        | "VEHICULOS"
        | "BOLSAS_PLASTICAS"
        | "OTROS"
      tax_iva_category: "GRAVADO" | "EXENTO" | "EXCLUIDO" | "NO_CAUSA"
    }
    CompositeTypes: {
      geometry_dump: {
        path: number[] | null
        geom: unknown
      }
      valid_detail: {
        valid: boolean | null
        reason: string | null
        location: unknown
      }
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      billing_anchor_type: ["purchase_date", "day_of_month", "weekday"],
      campaign_goal: [
        "awareness",
        "engagement",
        "conversion",
        "retention",
        "birthday",
      ],
      campaign_status: [
        "draft",
        "in_delivery",
        "completed",
        "cancelled",
        "pending_execution",
      ],
      cart_status: ["open", "pending", "completed", "cancelled", "abandoned"],
      cash_direction: ["in", "out", "adjustment"],
      cash_movement_status: ["draft", "confirmed", "voided"],
      cash_reason: [
        "opening_float",
        "cash_sale",
        "cash_refund",
        "petty_cash",
        "supplier_payout",
        "cash_pickup",
        "bank_deposit",
        "closing_adjustment",
        "other",
      ],
      channel_status: ["active", "waiting", "inactive"],
      channel_type: ["whatsapp", "sms", "email", "push"],
      discount_amount_type: ["percent", "fixed"],
      discount_scope_type: ["all_items", "items", "categories"],
      fx_asset_kind: ["currency", "precious_metal", "commodity"],
      fx_operation_side: ["buy", "sell"],
      fx_pricing_mode: [
        "manual",
        "market_plus_margin",
        "market_minus_margin",
        "fixed_spread",
      ],
      notification_status: [
        "queued",
        "processing",
        "delivered",
        "failed",
        "cancelled",
      ],
      offer_type: [
        "percentage",
        "fixed_amount",
        "free_shipping",
        "bogo",
        "gift",
      ],
      order_status: [
        "NEW",
        "PREPARING",
        "OUT_FOR_DELIVERY",
        "SCHEDULED_FOR_PICKUP",
        "SCHEDULED_FOR_DELIVERY",
        "DRAFT",
        "CANCELED",
        "RETURNED",
        "COMPLETED",
        "VOIDED",
        "READY_FOR_PICKUP",
      ],
      order_type: [
        "DINE_IN",
        "SELF_SERVE",
        "PICKUP",
        "DELIVERY_LOCAL",
        "SHIPMENT_NATIONAL",
        "COUNTER",
      ],
      org_role: ["owner", "admin", "editor", "viewer"],
      payment_direction: ["inflow", "outflow"],
      payment_method: [
        "cash",
        "card",
        "transfer",
        "nequi",
        "daviplata",
        "wompi",
        "qr",
        "voucher",
        "gift_card",
        "store_credit",
        "other",
        "bold",
        "cash_on_delivery",
      ],
      payment_status: [
        "pending",
        "authorized",
        "captured",
        "settled",
        "failed",
        "refunded",
        "voided",
        "canceled",
      ],
      product_item_type: [
        "prepared_food",
        "medication",
        "physical",
        "digital",
        "other",
        "foreign_exchange_asset",
      ],
      qr_mode: ["TABLE", "SIN_FILA", "TAKEAWAY", "DELIVERY", "PICKUP"],
      subscription_end_type: ["never", "on_date", "after_cycles"],
      subscription_interval_unit: ["day", "week", "month"],
      tax_inc_type: [
        "NINGUNO",
        "COMIDAS_BEBIDAS",
        "TELECOM",
        "VEHICULOS",
        "BOLSAS_PLASTICAS",
        "OTROS",
      ],
      tax_iva_category: ["GRAVADO", "EXENTO", "EXCLUIDO", "NO_CAUSA"],
    },
  },
} as const
