import SwaggerClientWrapper from "@/components/swagger-client";

export default async function PurchasingDocsPage() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  const specUrl = `${baseUrl}/api/purchasing/docs/spec`;

  return <SwaggerClientWrapper url={specUrl} />;
}
