export default function Home() {
  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">NoSh</h1>
      <div className="flex gap-3">
        <a className="underline" href="/login">Login</a>
        <a className="underline" href="/upload">Upload photo</a>
      </div>
    </div>
  );
}
