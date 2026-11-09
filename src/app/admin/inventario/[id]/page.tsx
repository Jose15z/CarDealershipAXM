import { VehicleForm } from "@/components/admin/vehicle-form";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <VehicleForm id={id} />;
}
