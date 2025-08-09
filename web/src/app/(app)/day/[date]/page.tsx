import DaySummary from "@/components/DaySummary";

export default async function DayPage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const { date } = await params;
  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-4">Day {date}</h1>
      <DaySummary />
    </div>
  );
}


