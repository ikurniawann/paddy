import { ReceivePOPage } from "@/features/purchasing/po";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return <ReceivePOPage params={params} />;
}
