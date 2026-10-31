import { ProductForm } from "@/components/admin/product-form";
import { AdminPageHeader } from "@/components/admin/ui";
import { productFormOptions } from "@/lib/admin/data";

export const metadata = { title: "Add product" };

export default async function NewProductPage() {
  const options = await productFormOptions();
  return (
    <>
      <AdminPageHeader title="Add product" description="Fill in the details, add photos and sizes, then create the product." />
      <ProductForm
        {...options}
        initial={{
          name: "", slug: "", category_id: "", brand_id: "", regular_price: "", sale_price: "",
          short_description: "", description: "", fabric: "", embroidery: "", care_instructions: "", piece_count: "",
          is_active: true, is_featured: false, is_new_arrival: true, is_best_seller: false, is_luxury: false,
          seo_title: "", seo_description: "", images: [], variants: [],
        }}
      />
    </>
  );
}
