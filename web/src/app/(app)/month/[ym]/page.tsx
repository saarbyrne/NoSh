import MonthSummary from "@/components/MonthSummary";

export default async function MonthPage({
  params,
}: {
  params: Promise<{ ym: string }>;
}) {
  const { ym } = await params;
  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-4">Month {ym}</h1>
      <MonthSummary />
    </div>
  );
}


