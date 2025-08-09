import GoalsView from "@/components/GoalsView";

export default async function GoalsPage({
  params,
}: {
  params: Promise<{ monthId: string }>;
}) {
  const { monthId } = await params;
  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-4">Goals for {monthId}</h1>
      <GoalsView />
    </div>
  );
}


