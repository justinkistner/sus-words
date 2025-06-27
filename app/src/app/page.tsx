import Image from "next/image";
import Link from "next/link";
import VideoHoverButton from "@/components/VideoHoverButton";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 bg-gradient-to-b from-slate-800 to-slate-900 text-white">
      <main className="flex flex-col items-center max-w-4xl w-full">
        <div className="mb-12 text-center">
          <div className="mb-6">
            <Image 
              src="/sus-words-logo.png" 
              alt="Sus Word Logo" 
              width={256} 
              height={256}
              className="mx-auto"
            />
          </div>
          <h1 className="text-5xl md:text-6xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-500">
            Sus Word
          </h1>
          <p className="text-xl md:text-2xl text-slate-300 mb-8">
            A social deduction word game for players and fakers
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-2xl">
          <VideoHoverButton
            href="/create"
            staticImage="/create-game.png"
            hoverVideo="/create-game-hover.mp4"
            title="Create Game"
            description="Start a room, invite your friends"
            bgColorClass="bg-white"
          />

          <VideoHoverButton
            href="/join"
            staticImage="/join-game.png"
            hoverVideo="/join-game-hover.mp4"
            title="Join Game"
            description="Enter a code to join your friends"
            bgColorClass="bg-white"
          />
        </div>

        <div className="mt-16 p-8 bg-slate-800/50 rounded-xl max-w-2xl w-full">
          <h2 className="text-3xl font-bold mb-8 text-center">How to Play</h2>
          
          <div className="space-y-8">
            <div className="flex gap-4">
              <div className="flex-shrink-0 relative">
                <div className="w-12 h-12 bg-slate-700 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                </div>
                <div className="absolute top-12 left-1/2 transform -translate-x-1/2 w-0.5 h-16 bg-slate-600"></div>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Receive Secret Word</h3>
                <p className="text-slate-300">All players except the faker receive the secret word.</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 relative">
                <div className="w-12 h-12 bg-slate-700 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <div className="absolute top-12 left-1/2 transform -translate-x-1/2 w-0.5 h-16 bg-slate-600"></div>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Give Clues</h3>
                <p className="text-slate-300">Hint you know the secret word without giving it away to the faker.</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 relative">
                <div className="w-12 h-12 bg-slate-700 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Vote Out The Faker To Win!</h3>
                <p className="text-slate-300">But if you do, the faker can guess the word and win!</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="mt-16 text-slate-400 text-sm">
        <p>Sus Word Game &copy; {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
}
