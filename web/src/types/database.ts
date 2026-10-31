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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      addresses: {
        Row: {
          address_line: string
          city: string
          created_at: string
          full_name: string
          id: string
          is_default: boolean
          label: string | null
          phone: string
          postal_code: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address_line: string
          city: string
          created_at?: string
          full_name: string
          id?: string
          is_default?: boolean
          label?: string | null
          phone: string
          postal_code?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address_line?: string
          city?: string
          created_at?: string
          full_name?: string
          id?: string
          is_default?: boolean
          label?: string | null
          phone?: string
          postal_code?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "addresses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          entity: string
          entity_id: string | null
          id: number
          new_data: Json | null
          old_data: Json | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          entity: string
          entity_id?: string | null
          id?: never
          new_data?: Json | null
          old_data?: Json | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          entity?: string
          entity_id?: string | null
          id?: never
          new_data?: Json | null
          old_data?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_audit_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      banners: {
        Row: {
          alt: string
          created_at: string
          cta_href: string | null
          cta_label: string | null
          ends_at: string | null
          heading: string
          id: string
          image_path: string
          is_active: boolean
          mobile_image_path: string | null
          promo_text: string | null
          sort_order: number
          starts_at: string | null
          subheading: string | null
          updated_at: string
        }
        Insert: {
          alt: string
          created_at?: string
          cta_href?: string | null
          cta_label?: string | null
          ends_at?: string | null
          heading: string
          id?: string
          image_path: string
          is_active?: boolean
          mobile_image_path?: string | null
          promo_text?: string | null
          sort_order?: number
          starts_at?: string | null
          subheading?: string | null
          updated_at?: string
        }
        Update: {
          alt?: string
          created_at?: string
          cta_href?: string | null
          cta_label?: string | null
          ends_at?: string | null
          heading?: string
          id?: string
          image_path?: string
          is_active?: boolean
          mobile_image_path?: string | null
          promo_text?: string | null
          sort_order?: number
          starts_at?: string | null
          subheading?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      brands: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          is_featured: boolean
          logo_path: string | null
          name: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_featured?: boolean
          logo_path?: string | null
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_featured?: boolean
          logo_path?: string | null
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      cart_items: {
        Row: {
          created_at: string
          id: string
          quantity: number
          updated_at: string
          user_id: string
          variant_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          quantity: number
          updated_at?: string
          user_id: string
          variant_id: string
        }
        Update: {
          created_at?: string
          id?: string
          quantity?: number
          updated_at?: string
          user_id?: string
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_path: string | null
          is_active: boolean
          name: string
          seo_description: string | null
          seo_title: string | null
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_path?: string | null
          is_active?: boolean
          name: string
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_path?: string | null
          is_active?: boolean
          name?: string
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      colors: {
        Row: {
          hex: string | null
          id: string
          name: string
        }
        Insert: {
          hex?: string | null
          id?: string
          name: string
        }
        Update: {
          hex?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      contact_messages: {
        Row: {
          created_at: string
          email: string
          id: string
          is_handled: boolean
          message: string
          name: string
          phone: string | null
          subject: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          is_handled?: boolean
          message: string
          name: string
          phone?: string | null
          subject?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          is_handled?: boolean
          message?: string
          name?: string
          phone?: string | null
          subject?: string | null
        }
        Relationships: []
      }
      content_pages: {
        Row: {
          body: string
          seo_description: string | null
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          body?: string
          seo_description?: string | null
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          body?: string
          seo_description?: string | null
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      coupon_redemptions: {
        Row: {
          coupon_id: string
          created_at: string
          id: string
          order_id: string
          phone: string
          user_id: string | null
        }
        Insert: {
          coupon_id: string
          created_at?: string
          id?: string
          order_id: string
          phone: string
          user_id?: string | null
        }
        Update: {
          coupon_id?: string
          created_at?: string
          id?: string
          order_id?: string
          phone?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coupon_redemptions_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_redemptions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_redemptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          code: string
          created_at: string
          description: string | null
          discount_type: Database["public"]["Enums"]["discount_type"]
          expires_at: string | null
          id: string
          is_active: boolean
          max_discount: number | null
          min_order_amount: number
          per_customer_limit: number | null
          starts_at: string | null
          times_used: number
          updated_at: string
          usage_limit: number | null
          value: number
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          discount_type: Database["public"]["Enums"]["discount_type"]
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_discount?: number | null
          min_order_amount?: number
          per_customer_limit?: number | null
          starts_at?: string | null
          times_used?: number
          updated_at?: string
          usage_limit?: number | null
          value: number
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          discount_type?: Database["public"]["Enums"]["discount_type"]
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_discount?: number | null
          min_order_amount?: number
          per_customer_limit?: number | null
          starts_at?: string | null
          times_used?: number
          updated_at?: string
          usage_limit?: number | null
          value?: number
        }
        Relationships: []
      }
      faq_items: {
        Row: {
          answer: string
          created_at: string
          id: string
          is_active: boolean
          question: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          answer: string
          created_at?: string
          id?: string
          is_active?: boolean
          question: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          answer?: string
          created_at?: string
          id?: string
          is_active?: boolean
          question?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      home_sections: {
        Row: {
          category_id: string | null
          created_at: string
          id: string
          image_path: string | null
          is_active: boolean
          kind: Database["public"]["Enums"]["home_section_kind"]
          slug: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          id?: string
          image_path?: string | null
          is_active?: boolean
          kind: Database["public"]["Enums"]["home_section_kind"]
          slug: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          id?: string
          image_path?: string | null
          is_active?: boolean
          kind?: Database["public"]["Enums"]["home_section_kind"]
          slug?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "home_sections_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_movements: {
        Row: {
          actor_id: string | null
          created_at: string
          delta: number
          id: number
          note: string | null
          order_id: string | null
          reason: Database["public"]["Enums"]["inventory_reason"]
          variant_id: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          delta: number
          id?: never
          note?: string | null
          order_id?: string | null
          reason: Database["public"]["Enums"]["inventory_reason"]
          variant_id: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          delta?: number
          id?: never
          note?: string | null
          order_id?: string | null
          reason?: Database["public"]["Enums"]["inventory_reason"]
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
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
      newsletter_subscribers: {
        Row: {
          created_at: string
          email: string
          id: string
          source: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          source?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          source?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      notification_logs: {
        Row: {
          attempts: number
          channel: string
          created_at: string
          error: string | null
          event: Database["public"]["Enums"]["notification_event"]
          id: string
          language: string
          last_attempt_at: string | null
          order_id: string | null
          phone: string
          provider_message_id: string | null
          response: Json | null
          sent_at: string | null
          status: Database["public"]["Enums"]["notification_status"]
          template_name: string
          updated_at: string
          variables: Json
        }
        Insert: {
          attempts?: number
          channel?: string
          created_at?: string
          error?: string | null
          event: Database["public"]["Enums"]["notification_event"]
          id?: string
          language?: string
          last_attempt_at?: string | null
          order_id?: string | null
          phone: string
          provider_message_id?: string | null
          response?: Json | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["notification_status"]
          template_name: string
          updated_at?: string
          variables?: Json
        }
        Update: {
          attempts?: number
          channel?: string
          created_at?: string
          error?: string | null
          event?: Database["public"]["Enums"]["notification_event"]
          id?: string
          language?: string
          last_attempt_at?: string | null
          order_id?: string | null
          phone?: string
          provider_message_id?: string | null
          response?: Json | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["notification_status"]
          template_name?: string
          updated_at?: string
          variables?: Json
        }
        Relationships: [
          {
            foreignKeyName: "notification_logs_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_settings: {
        Row: {
          enabled: boolean
          events: Json
          id: number
          updated_at: string
        }
        Insert: {
          enabled?: boolean
          events?: Json
          id?: number
          updated_at?: string
        }
        Update: {
          enabled?: boolean
          events?: Json
          id?: number
          updated_at?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          image_path: string | null
          line_total: number | null
          order_id: string
          product_id: string | null
          product_name: string
          product_slug: string
          quantity: number
          sku: string
          unit_price: number
          variant_id: string | null
          variant_label: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_path?: string | null
          line_total?: number | null
          order_id: string
          product_id?: string | null
          product_name: string
          product_slug: string
          quantity: number
          sku: string
          unit_price: number
          variant_id?: string | null
          variant_label: string
        }
        Update: {
          created_at?: string
          id?: string
          image_path?: string | null
          line_total?: number | null
          order_id?: string
          product_id?: string | null
          product_name?: string
          product_slug?: string
          quantity?: number
          sku?: string
          unit_price?: number
          variant_id?: string | null
          variant_label?: string
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
          {
            foreignKeyName: "order_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      order_status_history: {
        Row: {
          actor_id: string | null
          created_at: string
          from_status: Database["public"]["Enums"]["order_status"] | null
          id: number
          note: string | null
          order_id: string
          to_status: Database["public"]["Enums"]["order_status"]
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          from_status?: Database["public"]["Enums"]["order_status"] | null
          id?: never
          note?: string | null
          order_id: string
          to_status: Database["public"]["Enums"]["order_status"]
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          from_status?: Database["public"]["Enums"]["order_status"] | null
          id?: never
          note?: string | null
          order_id?: string
          to_status?: Database["public"]["Enums"]["order_status"]
        }
        Relationships: [
          {
            foreignKeyName: "order_status_history_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
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
          address_line: string
          cancel_reason: string | null
          cancelled_at: string | null
          city: string
          coupon_code: string | null
          coupon_id: string | null
          courier: string | null
          created_at: string
          customer_name: string
          delivered_at: string | null
          discount_total: number
          email: string | null
          id: string
          notes: string | null
          order_number: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_status: Database["public"]["Enums"]["payment_status"]
          phone: string
          postal_code: string | null
          shipping_fee: number
          status: Database["public"]["Enums"]["order_status"]
          subtotal: number
          total: number
          tracking_number: string | null
          tracking_url: string | null
          updated_at: string
          user_id: string | null
          whatsapp_opt_in: boolean
        }
        Insert: {
          address_line: string
          cancel_reason?: string | null
          cancelled_at?: string | null
          city: string
          coupon_code?: string | null
          coupon_id?: string | null
          courier?: string | null
          created_at?: string
          customer_name: string
          delivered_at?: string | null
          discount_total?: number
          email?: string | null
          id?: string
          notes?: string | null
          order_number: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_status?: Database["public"]["Enums"]["payment_status"]
          phone: string
          postal_code?: string | null
          shipping_fee?: number
          status?: Database["public"]["Enums"]["order_status"]
          subtotal: number
          total: number
          tracking_number?: string | null
          tracking_url?: string | null
          updated_at?: string
          user_id?: string | null
          whatsapp_opt_in?: boolean
        }
        Update: {
          address_line?: string
          cancel_reason?: string | null
          cancelled_at?: string | null
          city?: string
          coupon_code?: string | null
          coupon_id?: string | null
          courier?: string | null
          created_at?: string
          customer_name?: string
          delivered_at?: string | null
          discount_total?: number
          email?: string | null
          id?: string
          notes?: string | null
          order_number?: string
          payment_method?: Database["public"]["Enums"]["payment_method"]
          payment_status?: Database["public"]["Enums"]["payment_status"]
          phone?: string
          postal_code?: string | null
          shipping_fee?: number
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          total?: number
          tracking_number?: string | null
          tracking_url?: string | null
          updated_at?: string
          user_id?: string | null
          whatsapp_opt_in?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "orders_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          method: Database["public"]["Enums"]["payment_method"]
          order_id: string
          payload: Json | null
          provider_ref: string | null
          receipt_path: string | null
          status: Database["public"]["Enums"]["payment_status"]
          updated_at: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          method: Database["public"]["Enums"]["payment_method"]
          order_id: string
          payload?: Json | null
          provider_ref?: string | null
          receipt_path?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          order_id?: string
          payload?: Json | null
          provider_ref?: string | null
          receipt_path?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          alt: string | null
          color_id: string | null
          created_at: string
          id: string
          product_id: string
          sort_order: number
          storage_path: string
        }
        Insert: {
          alt?: string | null
          color_id?: string | null
          created_at?: string
          id?: string
          product_id: string
          sort_order?: number
          storage_path: string
        }
        Update: {
          alt?: string | null
          color_id?: string | null
          created_at?: string
          id?: string
          product_id?: string
          sort_order?: number
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_images_color_id_fkey"
            columns: ["color_id"]
            isOneToOne: false
            referencedRelation: "colors"
            referencedColumns: ["id"]
          },
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
          color_id: string | null
          created_at: string
          id: string
          is_active: boolean
          price_override: number | null
          product_id: string
          size_id: string
          sku: string
          stock: number
          updated_at: string
        }
        Insert: {
          color_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          price_override?: number | null
          product_id: string
          size_id: string
          sku: string
          stock?: number
          updated_at?: string
        }
        Update: {
          color_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          price_override?: number | null
          product_id?: string
          size_id?: string
          sku?: string
          stock?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_color_id_fkey"
            columns: ["color_id"]
            isOneToOne: false
            referencedRelation: "colors"
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
            referencedRelation: "sizes"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          base_price: number
          brand_id: string | null
          care_instructions: string | null
          category_id: string
          compare_at_price: number | null
          created_at: string
          description: string | null
          embroidery: string | null
          fabric: string | null
          id: string
          is_active: boolean
          is_best_seller: boolean
          is_featured: boolean
          is_luxury: boolean
          is_new_arrival: boolean
          name: string
          piece_count: number | null
          search_vector: unknown
          seo_description: string | null
          seo_title: string | null
          short_description: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          base_price: number
          brand_id?: string | null
          care_instructions?: string | null
          category_id: string
          compare_at_price?: number | null
          created_at?: string
          description?: string | null
          embroidery?: string | null
          fabric?: string | null
          id?: string
          is_active?: boolean
          is_best_seller?: boolean
          is_featured?: boolean
          is_luxury?: boolean
          is_new_arrival?: boolean
          name: string
          piece_count?: number | null
          search_vector?: unknown
          seo_description?: string | null
          seo_title?: string | null
          short_description?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          base_price?: number
          brand_id?: string | null
          care_instructions?: string | null
          category_id?: string
          compare_at_price?: number | null
          created_at?: string
          description?: string | null
          embroidery?: string | null
          fabric?: string | null
          id?: string
          is_active?: boolean
          is_best_seller?: boolean
          is_featured?: boolean
          is_luxury?: boolean
          is_new_arrival?: boolean
          name?: string
          piece_count?: number | null
          search_vector?: unknown
          seo_description?: string | null
          seo_title?: string | null
          short_description?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
      returns: {
        Row: {
          admin_note: string | null
          created_at: string
          id: string
          order_id: string
          order_item_id: string | null
          reason: string
          refund_amount: number | null
          status: Database["public"]["Enums"]["return_status"]
          updated_at: string
        }
        Insert: {
          admin_note?: string | null
          created_at?: string
          id?: string
          order_id: string
          order_item_id?: string | null
          reason: string
          refund_amount?: number | null
          status?: Database["public"]["Enums"]["return_status"]
          updated_at?: string
        }
        Update: {
          admin_note?: string | null
          created_at?: string
          id?: string
          order_id?: string
          order_item_id?: string | null
          reason?: string
          refund_amount?: number | null
          status?: Database["public"]["Enums"]["return_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "returns_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "returns_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          body: string | null
          created_at: string
          id: string
          is_approved: boolean
          product_id: string
          rating: number
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          is_approved?: boolean
          product_id: string
          rating: number
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          is_approved?: boolean
          product_id?: string
          rating?: number
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sizes: {
        Row: {
          code: string
          id: string
          label: string
          sort_order: number
        }
        Insert: {
          code: string
          id?: string
          label: string
          sort_order?: number
        }
        Update: {
          code?: string
          id?: string
          label?: string
          sort_order?: number
        }
        Relationships: []
      }
      store_settings: {
        Row: {
          address: string | null
          bank_account_number: string | null
          bank_account_title: string | null
          bank_iban: string | null
          bank_name: string | null
          bank_transfer_enabled: boolean
          closed_message: string | null
          cod_enabled: boolean
          contact_email: string | null
          contact_phone: string | null
          currency: string
          facebook_url: string | null
          free_shipping_threshold: number
          id: number
          instagram_url: string | null
          logo_path: string | null
          low_stock_threshold: number
          shipping_fee: number
          store_name: string
          store_open: boolean
          tagline: string | null
          tiktok_url: string | null
          updated_at: string
          whatsapp_message: string | null
          whatsapp_number: string | null
        }
        Insert: {
          address?: string | null
          bank_account_number?: string | null
          bank_account_title?: string | null
          bank_iban?: string | null
          bank_name?: string | null
          bank_transfer_enabled?: boolean
          closed_message?: string | null
          cod_enabled?: boolean
          contact_email?: string | null
          contact_phone?: string | null
          currency?: string
          facebook_url?: string | null
          free_shipping_threshold?: number
          id?: number
          instagram_url?: string | null
          logo_path?: string | null
          low_stock_threshold?: number
          shipping_fee?: number
          store_name?: string
          store_open?: boolean
          tagline?: string | null
          tiktok_url?: string | null
          updated_at?: string
          whatsapp_message?: string | null
          whatsapp_number?: string | null
        }
        Update: {
          address?: string | null
          bank_account_number?: string | null
          bank_account_title?: string | null
          bank_iban?: string | null
          bank_name?: string | null
          bank_transfer_enabled?: boolean
          closed_message?: string | null
          cod_enabled?: boolean
          contact_email?: string | null
          contact_phone?: string | null
          currency?: string
          facebook_url?: string | null
          free_shipping_threshold?: number
          id?: number
          instagram_url?: string | null
          logo_path?: string | null
          low_stock_threshold?: number
          shipping_fee?: number
          store_name?: string
          store_open?: boolean
          tagline?: string | null
          tiktok_url?: string | null
          updated_at?: string
          whatsapp_message?: string | null
          whatsapp_number?: string | null
        }
        Relationships: []
      }
      wishlists: {
        Row: {
          created_at: string
          product_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          product_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          product_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlists_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wishlists_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_adjust_stock: {
        Args: {
          p_mode: string
          p_note?: string
          p_quantity: number
          p_variant_id: string
        }
        Returns: number
      }
      admin_customers: {
        Args: { p_limit?: number; p_offset?: number; p_search?: string }
        Returns: {
          customer_key: string
          email: string
          last_order_at: string
          name: string
          orders_count: number
          phone: string
          registered: boolean
          total_count: number
          total_spent: number
        }[]
      }
      admin_dashboard_stats: { Args: never; Returns: Json }
      admin_sales_report: {
        Args: { p_from: string; p_granularity?: string; p_to: string }
        Returns: Json
      }
      admin_save_product: {
        Args: { p_images: Json; p_product: Json; p_variants: Json }
        Returns: string
      }
      admin_set_payment_status: {
        Args: {
          p_note?: string
          p_order_id: string
          p_status: Database["public"]["Enums"]["payment_status"]
        }
        Returns: undefined
      }
      admin_update_order_status: {
        Args: {
          p_courier?: string
          p_note?: string
          p_order_id: string
          p_status: Database["public"]["Enums"]["order_status"]
          p_tracking_number?: string
          p_tracking_url?: string
        }
        Returns: {
          address_line: string
          cancel_reason: string | null
          cancelled_at: string | null
          city: string
          coupon_code: string | null
          coupon_id: string | null
          courier: string | null
          created_at: string
          customer_name: string
          delivered_at: string | null
          discount_total: number
          email: string | null
          id: string
          notes: string | null
          order_number: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_status: Database["public"]["Enums"]["payment_status"]
          phone: string
          postal_code: string | null
          shipping_fee: number
          status: Database["public"]["Enums"]["order_status"]
          subtotal: number
          total: number
          tracking_number: string | null
          tracking_url: string | null
          updated_at: string
          user_id: string | null
          whatsapp_opt_in: boolean
        }
        SetofOptions: {
          from: "*"
          to: "orders"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      check_rate_limit: {
        Args: { p_key: string; p_limit: number; p_window_seconds: number }
        Returns: boolean
      }
      claim_notifications: {
        Args: { p_ids?: string[]; p_limit?: number; p_manual?: boolean }
        Returns: {
          attempts: number
          channel: string
          created_at: string
          error: string | null
          event: Database["public"]["Enums"]["notification_event"]
          id: string
          language: string
          last_attempt_at: string | null
          order_id: string | null
          phone: string
          provider_message_id: string | null
          response: Json | null
          sent_at: string | null
          status: Database["public"]["Enums"]["notification_status"]
          template_name: string
          updated_at: string
          variables: Json
        }[]
        SetofOptions: {
          from: "*"
          to: "notification_logs"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      has_purchased: { Args: { p_product_id: string }; Returns: boolean }
      is_admin: { Args: never; Returns: boolean }
      normalize_pk_phone: { Args: { p_phone: string }; Returns: string }
      place_order: {
        Args: {
          p_coupon_code?: string
          p_customer: Json
          p_items: Json
          p_payment_method: Database["public"]["Enums"]["payment_method"]
          p_user_id?: string
        }
        Returns: {
          order_id: string
          order_number: string
          total: number
        }[]
      }
      quote_cart: {
        Args: {
          p_coupon_code?: string
          p_items: Json
          p_phone?: string
          p_user_id?: string
        }
        Returns: Json
      }
      search_products: {
        Args: { p_limit?: number; p_offset?: number; p_query: string }
        Returns: {
          base_price: number
          brand_id: string | null
          care_instructions: string | null
          category_id: string
          compare_at_price: number | null
          created_at: string
          description: string | null
          embroidery: string | null
          fabric: string | null
          id: string
          is_active: boolean
          is_best_seller: boolean
          is_featured: boolean
          is_luxury: boolean
          is_new_arrival: boolean
          name: string
          piece_count: number | null
          search_vector: unknown
          seo_description: string | null
          seo_title: string | null
          short_description: string | null
          slug: string
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "products"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      track_order: {
        Args: { p_order_number: string; p_phone: string }
        Returns: Json
      }
    }
    Enums: {
      discount_type: "percent" | "fixed"
      home_section_kind:
        | "new_arrivals"
        | "luxury"
        | "best_sellers"
        | "brands"
        | "category"
      inventory_reason: "order" | "cancel" | "return" | "restock" | "adjustment"
      notification_event:
        | "order_placed"
        | "order_confirmed"
        | "order_processing"
        | "order_shipped"
        | "order_delivered"
        | "order_cancelled"
        | "test"
      notification_status:
        | "pending"
        | "sending"
        | "sent"
        | "delivered"
        | "read"
        | "failed"
      order_status:
        | "pending"
        | "confirmed"
        | "processing"
        | "shipped"
        | "delivered"
        | "cancelled"
        | "returned"
      payment_method:
        | "cod"
        | "bank_transfer"
        | "easypaisa"
        | "jazzcash"
        | "card"
      payment_status:
        | "pending"
        | "awaiting_verification"
        | "paid"
        | "failed"
        | "refunded"
      return_status:
        | "requested"
        | "approved"
        | "rejected"
        | "received"
        | "refunded"
      user_role: "customer" | "admin"
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
      discount_type: ["percent", "fixed"],
      home_section_kind: [
        "new_arrivals",
        "luxury",
        "best_sellers",
        "brands",
        "category",
      ],
      inventory_reason: ["order", "cancel", "return", "restock", "adjustment"],
      notification_event: [
        "order_placed",
        "order_confirmed",
        "order_processing",
        "order_shipped",
        "order_delivered",
        "order_cancelled",
        "test",
      ],
      notification_status: [
        "pending",
        "sending",
        "sent",
        "delivered",
        "read",
        "failed",
      ],
      order_status: [
        "pending",
        "confirmed",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
        "returned",
      ],
      payment_method: ["cod", "bank_transfer", "easypaisa", "jazzcash", "card"],
      payment_status: [
        "pending",
        "awaiting_verification",
        "paid",
        "failed",
        "refunded",
      ],
      return_status: [
        "requested",
        "approved",
        "rejected",
        "received",
        "refunded",
      ],
      user_role: ["customer", "admin"],
    },
  },
} as const
