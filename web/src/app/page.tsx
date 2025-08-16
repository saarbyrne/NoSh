import Header from "@/components/Header";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <Header title="NoSh" />
      <div className="pt-20 p-6 space-y-4">
        <div className="flex gap-3">
          <a className="underline" href="/login">Login</a>
          <a className="underline" href="/upload">Upload photo</a>
        </div>
      </div>
    </div>
  );
}
