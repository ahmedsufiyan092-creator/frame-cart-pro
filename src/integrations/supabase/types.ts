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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      addresses: {
        Row: {
          area: string | null
          city: string
          created_at: string
          email: string | null
          full_name: string
          house_no: string
          id: string
          is_default: boolean
          landmark: string | null
          mobile_number: string
          pin_code: string
          state: string
          street: string
          user_id: string
        }
        Insert: {
          area?: string | null
          city: string
          created_at?: string
          email?: string | null
          full_name: string
          house_no: string
          id?: string
          is_default?: boolean
          landmark?: string | null
          mobile_number: string
          pin_code: string
          state: string
          street: string
          user_id: string
        }
        Update: {
          area?: string | null
          city?: string
          created_at?: string
          email?: string | null
          full_name?: string
          house_no?: string
          id?: string
          is_default?: boolean
          landmark?: string | null
          mobile_number?: string
          pin_code?: string
          state?: string
          street?: string
          user_id?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          meta: Json
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          meta?: Json
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          meta?: Json
        }
        Relationships: []
      }
      cart_items: {
        Row: {
          cart_id: string
          created_at: string
          frame_id: string
          id: string
          product_id: string
          quantity: number
          size_id: string
        }
        Insert: {
          cart_id: string
          created_at?: string
          frame_id: string
          id?: string
          product_id: string
          quantity?: number
          size_id: string
        }
        Update: {
          cart_id?: string
          created_at?: string
          frame_id?: string
          id?: string
          product_id?: string
          quantity?: number
          size_id?: string
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
            foreignKeyName: "cart_items_frame_id_fkey"
            columns: ["frame_id"]
            isOneToOne: false
            referencedRelation: "frame_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_size_id_fkey"
            columns: ["size_id"]
            isOneToOne: false
            referencedRelation: "size_options"
            referencedColumns: ["id"]
          },
        ]
      }
      carts: {
        Row: {
          coupon_code: string | null
          created_at: string
          guest_token: string | null
          id: string
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          coupon_code?: string | null
          created_at?: string
          guest_token?: string | null
          id?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          coupon_code?: string | null
          created_at?: string
          guest_token?: string | null
          id?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      coupon_redemptions: {
        Row: {
          code: string
          created_at: string
          discount_amount: number
          id: string
          order_id: string | null
          user_id: string | null
        }
        Insert: {
          code: string
          created_at?: string
          discount_amount?: number
          id?: string
          order_id?: string | null
          user_id?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          discount_amount?: number
          id?: string
          order_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coupon_redemptions_code_fkey"
            columns: ["code"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["code"]
          },
        ]
      }
      coupons: {
        Row: {
          code: string
          created_at: string
          description: string | null
          discount_type: string
          discount_value: number
          expires_at: string | null
          is_active: boolean
          max_discount: number | null
          min_order_value: number
          per_user_limit: number
          usage_limit: number | null
          used_count: number
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          discount_type: string
          discount_value: number
          expires_at?: string | null
          is_active?: boolean
          max_discount?: number | null
          min_order_value?: number
          per_user_limit?: number
          usage_limit?: number | null
          used_count?: number
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          is_active?: boolean
          max_discount?: number | null
          min_order_value?: number
          per_user_limit?: number
          usage_limit?: number | null
          used_count?: number
        }
        Relationships: []
      }
      frame_options: {
        Row: {
          id: string
          is_active: boolean
          name: string
          price_modifier: number
          sort_order: number
          swatch: string
        }
        Insert: {
          id: string
          is_active?: boolean
          name: string
          price_modifier?: number
          sort_order?: number
          swatch: string
        }
        Update: {
          id?: string
          is_active?: boolean
          name?: string
          price_modifier?: number
          sort_order?: number
          swatch?: string
        }
        Relationships: []
      }
      inventory_movements: {
        Row: {
          change: number
          created_at: string
          created_by: string | null
          id: string
          order_id: string | null
          product_id: string
          reason: string | null
          type: string
          variant_id: string | null
        }
        Insert: {
          change: number
          created_at?: string
          created_by?: string | null
          id?: string
          order_id?: string | null
          product_id: string
          reason?: string | null
          type: string
          variant_id?: string | null
        }
        Update: {
          change?: number
          created_at?: string
          created_by?: string | null
          id?: string
          order_id?: string | null
          product_id?: string
          reason?: string | null
          type?: string
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount: number
          id: string
          invoice_number: string
          issued_at: string
          order_id: string
          pdf_url: string | null
        }
        Insert: {
          amount: number
          id?: string
          invoice_number: string
          issued_at?: string
          order_id: string
          pdf_url?: string | null
        }
        Update: {
          amount?: number
          id?: string
          invoice_number?: string
          issued_at?: string
          order_id?: string
          pdf_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          channel: string
          created_at: string
          error: string | null
          id: string
          order_id: string | null
          payload: Json
          provider_message_id: string | null
          recipient: string | null
          sent_at: string | null
          status: string
          template: string
          user_id: string | null
        }
        Insert: {
          channel: string
          created_at?: string
          error?: string | null
          id?: string
          order_id?: string | null
          payload?: Json
          provider_message_id?: string | null
          recipient?: string | null
          sent_at?: string | null
          status?: string
          template: string
          user_id?: string | null
        }
        Update: {
          channel?: string
          created_at?: string
          error?: string | null
          id?: string
          order_id?: string | null
          payload?: Json
          provider_message_id?: string | null
          recipient?: string | null
          sent_at?: string | null
          status?: string
          template?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          frame_id: string | null
          frame_name: string | null
          id: string
          line_total: number
          order_id: string
          product_id: string | null
          product_image: string | null
          product_name: string | null
          product_slug: string | null
          product_snapshot: Json | null
          quantity: number
          size_id: string | null
          size_label: string | null
          unit_price: number
        }
        Insert: {
          frame_id?: string | null
          frame_name?: string | null
          id?: string
          line_total: number
          order_id: string
          product_id?: string | null
          product_image?: string | null
          product_name?: string | null
          product_slug?: string | null
          product_snapshot?: Json | null
          quantity: number
          size_id?: string | null
          size_label?: string | null
          unit_price: number
        }
        Update: {
          frame_id?: string | null
          frame_name?: string | null
          id?: string
          line_total?: number
          order_id?: string
          product_id?: string | null
          product_image?: string | null
          product_name?: string | null
          product_slug?: string | null
          product_snapshot?: Json | null
          quantity?: number
          size_id?: string | null
          size_label?: string | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      order_status_history: {
        Row: {
          changed_by: string | null
          created_at: string
          id: string
          note: string | null
          order_id: string
          status: Database["public"]["Enums"]["order_status"]
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          id?: string
          note?: string | null
          order_id: string
          status: Database["public"]["Enums"]["order_status"]
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          id?: string
          note?: string | null
          order_id?: string
          status?: Database["public"]["Enums"]["order_status"]
        }
        Relationships: [
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          cancelled_reason: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          coupon_code: string | null
          courier_partner: string | null
          created_at: string
          currency: string
          customer_snapshot: Json
          delivered_at: string | null
          discount_total: number
          grand_total: number
          guest_token: string | null
          id: string
          inventory_finalized: boolean
          inventory_reserved: boolean
          notes: string | null
          order_number: string
          paid_at: string | null
          payment_method: string | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          shipping_address: Json
          shipping_total: number
          status: Database["public"]["Enums"]["order_status"]
          subtotal: number
          tax_total: number
          tracking_number: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          cancelled_reason?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          coupon_code?: string | null
          courier_partner?: string | null
          created_at?: string
          currency?: string
          customer_snapshot?: Json
          delivered_at?: string | null
          discount_total?: number
          grand_total?: number
          guest_token?: string | null
          id?: string
          inventory_finalized?: boolean
          inventory_reserved?: boolean
          notes?: string | null
          order_number: string
          paid_at?: string | null
          payment_method?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          shipping_address: Json
          shipping_total?: number
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          tax_total?: number
          tracking_number?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          cancelled_reason?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          coupon_code?: string | null
          courier_partner?: string | null
          created_at?: string
          currency?: string
          customer_snapshot?: Json
          delivered_at?: string | null
          discount_total?: number
          grand_total?: number
          guest_token?: string | null
          id?: string
          inventory_finalized?: boolean
          inventory_reserved?: boolean
          notes?: string | null
          order_number?: string
          paid_at?: string | null
          payment_method?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          shipping_address?: Json
          shipping_total?: number
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          tax_total?: number
          tracking_number?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      payment_events: {
        Row: {
          created_at: string
          error: string | null
          event_id: string | null
          event_type: string
          id: string
          order_id: string | null
          payload: Json
          payment_id: string | null
          processed: boolean
          processed_at: string | null
          provider_order_id: string | null
          provider_payment_id: string | null
        }
        Insert: {
          created_at?: string
          error?: string | null
          event_id?: string | null
          event_type: string
          id?: string
          order_id?: string | null
          payload?: Json
          payment_id?: string | null
          processed?: boolean
          processed_at?: string | null
          provider_order_id?: string | null
          provider_payment_id?: string | null
        }
        Update: {
          created_at?: string
          error?: string | null
          event_id?: string | null
          event_type?: string
          id?: string
          order_id?: string | null
          payload?: Json
          payment_id?: string | null
          processed?: boolean
          processed_at?: string | null
          provider_order_id?: string | null
          provider_payment_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_events_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          amount_refunded: number
          created_at: string
          currency: string
          error_code: string | null
          error_description: string | null
          id: string
          method: string | null
          order_id: string
          provider: string
          provider_order_id: string | null
          provider_payment_id: string | null
          provider_signature: string | null
          status: Database["public"]["Enums"]["payment_status"]
          updated_at: string
        }
        Insert: {
          amount: number
          amount_refunded?: number
          created_at?: string
          currency?: string
          error_code?: string | null
          error_description?: string | null
          id?: string
          method?: string | null
          order_id: string
          provider?: string
          provider_order_id?: string | null
          provider_payment_id?: string | null
          provider_signature?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Update: {
          amount?: number
          amount_refunded?: number
          created_at?: string
          currency?: string
          error_code?: string | null
          error_description?: string | null
          id?: string
          method?: string | null
          order_id?: string
          provider?: string
          provider_order_id?: string | null
          provider_payment_id?: string | null
          provider_signature?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      product_categories: {
        Row: {
          category_id: string
          product_id: string
        }
        Insert: {
          category_id: string
          product_id: string
        }
        Update: {
          category_id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_categories_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          id: string
          kind: string
          product_id: string
          sort_order: number
          url: string
        }
        Insert: {
          id?: string
          kind?: string
          product_id: string
          sort_order?: number
          url: string
        }
        Update: {
          id?: string
          kind?: string
          product_id?: string
          sort_order?: number
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          frame_id: string
          id: string
          is_active: boolean
          price_override: number | null
          product_id: string
          size_id: string
          sku: string | null
          stock_quantity: number
        }
        Insert: {
          frame_id: string
          id?: string
          is_active?: boolean
          price_override?: number | null
          product_id: string
          size_id: string
          sku?: string | null
          stock_quantity?: number
        }
        Update: {
          frame_id?: string
          id?: string
          is_active?: boolean
          price_override?: number | null
          product_id?: string
          size_id?: string
          sku?: string | null
          stock_quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_frame_id_fkey"
            columns: ["frame_id"]
            isOneToOne: false
            referencedRelation: "frame_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_variants_size_id_fkey"
            columns: ["size_id"]
            isOneToOne: false
            referencedRelation: "size_options"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          badge: string | null
          base_price: number
          care_instructions: string | null
          color_palette: Json
          compare_at_price: number | null
          created_at: string
          description: string
          frame_material: string | null
          id: string
          is_best_seller: boolean
          is_featured: boolean
          is_new_arrival: boolean
          low_stock_threshold: number
          materials: string | null
          name: string
          orientation: string
          paper_gsm: string | null
          rating: number
          review_count: number
          seo_description: string | null
          seo_title: string | null
          shipping_time: string | null
          sku: string | null
          slug: string
          status: string
          stock_quantity: number
          style: string | null
          tagline: string | null
          tags: Json
          theme: string | null
          updated_at: string
        }
        Insert: {
          badge?: string | null
          base_price: number
          care_instructions?: string | null
          color_palette?: Json
          compare_at_price?: number | null
          created_at?: string
          description?: string
          frame_material?: string | null
          id?: string
          is_best_seller?: boolean
          is_featured?: boolean
          is_new_arrival?: boolean
          low_stock_threshold?: number
          materials?: string | null
          name: string
          orientation?: string
          paper_gsm?: string | null
          rating?: number
          review_count?: number
          seo_description?: string | null
          seo_title?: string | null
          shipping_time?: string | null
          sku?: string | null
          slug: string
          status?: string
          stock_quantity?: number
          style?: string | null
          tagline?: string | null
          tags?: Json
          theme?: string | null
          updated_at?: string
        }
        Update: {
          badge?: string | null
          base_price?: number
          care_instructions?: string | null
          color_palette?: Json
          compare_at_price?: number | null
          created_at?: string
          description?: string
          frame_material?: string | null
          id?: string
          is_best_seller?: boolean
          is_featured?: boolean
          is_new_arrival?: boolean
          low_stock_threshold?: number
          materials?: string | null
          name?: string
          orientation?: string
          paper_gsm?: string | null
          rating?: number
          review_count?: number
          seo_description?: string | null
          seo_title?: string | null
          shipping_time?: string | null
          sku?: string | null
          slug?: string
          status?: string
          stock_quantity?: number
          style?: string | null
          tagline?: string | null
          tags?: Json
          theme?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      refunds: {
        Row: {
          amount: number
          created_at: string
          id: string
          order_id: string
          payment_id: string | null
          provider_payment_id: string | null
          provider_refund_id: string | null
          reason: string | null
          requested_by: string | null
          status: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          order_id: string
          payment_id?: string | null
          provider_payment_id?: string | null
          provider_refund_id?: string | null
          reason?: string | null
          requested_by?: string | null
          status?: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          order_id?: string
          payment_id?: string | null
          provider_payment_id?: string | null
          provider_refund_id?: string | null
          reason?: string | null
          requested_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "refunds_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refunds_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      return_requests: {
        Row: {
          admin_note: string | null
          created_at: string
          details: string | null
          id: string
          order_id: string
          reason: string
          refund_amount: number | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          admin_note?: string | null
          created_at?: string
          details?: string | null
          id?: string
          order_id: string
          reason: string
          refund_amount?: number | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          admin_note?: string | null
          created_at?: string
          details?: string | null
          id?: string
          order_id?: string
          reason?: string
          refund_amount?: number | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "return_requests_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          author_name: string
          body: string
          created_at: string
          helpful_count: number
          id: string
          is_verified_purchase: boolean
          moderated_at: string | null
          moderated_by: string | null
          order_id: string | null
          product_id: string
          rating: number
          status: string
          title: string | null
          user_id: string | null
        }
        Insert: {
          author_name: string
          body: string
          created_at?: string
          helpful_count?: number
          id?: string
          is_verified_purchase?: boolean
          moderated_at?: string | null
          moderated_by?: string | null
          order_id?: string | null
          product_id: string
          rating: number
          status?: string
          title?: string | null
          user_id?: string | null
        }
        Update: {
          author_name?: string
          body?: string
          created_at?: string
          helpful_count?: number
          id?: string
          is_verified_purchase?: boolean
          moderated_at?: string | null
          moderated_by?: string | null
          order_id?: string | null
          product_id?: string
          rating?: number
          status?: string
          title?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      shipments: {
        Row: {
          carrier: string | null
          created_at: string
          delivered_at: string | null
          id: string
          order_id: string
          shipped_at: string | null
          status: string
          tracking_number: string | null
          tracking_url: string | null
        }
        Insert: {
          carrier?: string | null
          created_at?: string
          delivered_at?: string | null
          id?: string
          order_id: string
          shipped_at?: string | null
          status?: string
          tracking_number?: string | null
          tracking_url?: string | null
        }
        Update: {
          carrier?: string | null
          created_at?: string
          delivered_at?: string | null
          id?: string
          order_id?: string
          shipped_at?: string | null
          status?: string
          tracking_number?: string | null
          tracking_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shipments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      size_options: {
        Row: {
          dimensions: string
          id: string
          is_active: boolean
          label: string
          price_modifier: number
          sort_order: number
        }
        Insert: {
          dimensions: string
          id: string
          is_active?: boolean
          label: string
          price_modifier?: number
          sort_order?: number
        }
        Update: {
          dimensions?: string
          id?: string
          is_active?: boolean
          label?: string
          price_modifier?: number
          sort_order?: number
        }
        Relationships: []
      }
      store_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wishlist_items: {
        Row: {
          created_at: string
          id: string
          product_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlist_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role:
        | "SUPER_ADMIN"
        | "ADMIN"
        | "ORDER_MANAGER"
        | "PRODUCT_MANAGER"
        | "INVENTORY_MANAGER"
        | "CUSTOMER_SUPPORT"
        | "MARKETING"
      order_status:
        | "payment_pending"
        | "confirmed"
        | "processing"
        | "packed"
        | "shipped"
        | "out_for_delivery"
        | "delivered"
        | "cancelled"
        | "return_requested"
        | "returned"
        | "refunded"
      payment_status:
        | "created"
        | "authorized"
        | "captured"
        | "failed"
        | "refunded"
        | "partially_refunded"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: [
        "SUPER_ADMIN",
        "ADMIN",
        "ORDER_MANAGER",
        "PRODUCT_MANAGER",
        "INVENTORY_MANAGER",
        "CUSTOMER_SUPPORT",
        "MARKETING",
      ],
      order_status: [
        "payment_pending",
        "confirmed",
        "processing",
        "packed",
        "shipped",
        "out_for_delivery",
        "delivered",
        "cancelled",
        "return_requested",
        "returned",
        "refunded",
      ],
      payment_status: [
        "created",
        "authorized",
        "captured",
        "failed",
        "refunded",
        "partially_refunded",
      ],
    },
  },
} as const
