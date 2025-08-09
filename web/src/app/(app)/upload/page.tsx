import UploadCard from "@/components/UploadCard";
import RequireAuth from "@/components/RequireAuth";

export default function UploadPage() {
  return (
    <RequireAuth>
      <div className="p-6">
        <h1 className="text-xl font-semibold mb-4">Upload a photo</h1>
        <UploadCard />
      </div>
    </RequireAuth>
  );
}


