import RequireAuth from "@/components/RequireAuth";
import MonthSummaryClient from "@/components/MonthSummaryClient";

export default async function MonthPage({
  params,
}: {
  params: Promise<{ ym: string }>;
}) {
  const { ym } = await params;
  return (
    <RequireAuth>
      <div className="p-6">
        <h1 className="text-xl font-semibold mb-4">Month {ym}</h1>
        <MonthSummaryClient ym={ym} />
      </div>
    </RequireAuth>
  );
}


