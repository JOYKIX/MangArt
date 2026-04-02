import { HomeForm } from "../components/HomeForm";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col justify-center gap-6 p-4">
      <h1 className="text-center text-5xl font-black tracking-wide">MangArt Duel</h1>
      <p className="text-center text-white/75">Draw manga clues. Guess fast. Become the ultimate senpai.</p>
      <HomeForm />
    </main>
  );
}
