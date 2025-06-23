import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 bg-gradient-to-b from-slate-800 to-slate-900 text-white">
      <main className="flex flex-col items-center max-w-4xl w-full">
        <div className="mb-12 text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-500">
            Sus Words
          </h1>
          <p className="text-xl md:text-2xl text-slate-300 mb-8">
            A social deduction word game for clever imposters
          </p>
          <p className="text-slate-400 max-w-2xl mx-auto">
            Join your friends, find the secret word, and spot the faker who doesn't know it!
            Can you blend in with the crowd or will your clues give you away?
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-2xl">
          <Link 
            href="/create"
            className="flex flex-col items-center justify-center p-8 bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all transform hover:scale-105"
          >
            <h2 className="text-2xl font-bold mb-2">Create Game</h2>
            <p className="text-center text-indigo-200">Start a new game and invite your friends</p>
          </Link>

          <Link 
            href="/join"
            className="flex flex-col items-center justify-center p-8 bg-cyan-600 hover:bg-cyan-700 rounded-xl transition-all transform hover:scale-105"
          >
            <h2 className="text-2xl font-bold mb-2">Join Game</h2>
            <p className="text-center text-cyan-200">Enter a room code to join an existing game</p>
          </Link>
        </div>

        <div className="mt-16 p-6 bg-slate-800/50 rounded-xl max-w-2xl w-full">
          <h2 className="text-xl font-semibold mb-4 text-center">How to Play</h2>
          <ol className="list-decimal pl-6 space-y-2">
            <li>Everyone sees a grid of words except for the "faker"</li>
            <li>Take turns giving one-word clues about the secret word</li>
            <li>Try to identify who doesn't know the word</li>
            <li>Vote on who you think is the faker</li>
            <li>Score points by finding the faker or by surviving as the faker</li>
          </ol>
        </div>
      </main>

      <footer className="mt-16 text-slate-400 text-sm">
        <p>Sus Words Game &copy; {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
}
