# Sus Word - Multiplayer Social Deduction Game

A real-time multiplayer social deduction word game built with Next.js and Supabase. Players try to identify the "faker" who doesn't know the secret word while giving clues that relate to it.

## 🎮 Game Overview

Sus Word is inspired by games like *The Chameleon* and *Spyfall*. Players are shown a grid of 16 words from a category, with one secret word highlighted for everyone except the "faker". Players give one-word clues related to the secret word, then vote to identify who they think is the faker.

### Game Flow
1. **Lobby**: Players join a room using a 4-digit code
2. **Role Reveal**: Players see their role (regular player or faker) with a 3D flip animation
3. **Clue Giving**: Each player submits a one-word clue related to the secret word
4. **Voting**: Players vote for who they think is the faker
5. **Results**: Scoring based on whether the faker was caught
6. **Faker Guess**: If caught, the faker can guess the secret word for bonus points
7. **Next Round**: Multi-round gameplay with cumulative scoring

## 🚀 Features

- **Real-time Multiplayer**: Live updates using Supabase Realtime
- **Responsive UI**: Beautiful, modern interface with smooth animations
- **Role-based Gameplay**: Different experiences for faker vs. regular players
- **Multi-round Support**: Configurable number of rounds (default: 3)
- **Live Voting**: Real-time vote status with visual indicators
- **Score Tracking**: Persistent scoring across rounds
- **Host Controls**: Game management with "End Game" and "Next Round" buttons
- **Mobile Friendly**: Responsive design for all screen sizes

## 🛠 Tech Stack

- **Frontend**: Next.js 14 with TypeScript
- **Backend**: Supabase (PostgreSQL + Realtime)
- **Styling**: Tailwind CSS
- **Authentication**: Anonymous sessions via Supabase
- **Real-time**: Supabase Realtime subscriptions
- **Deployment**: Ready for Vercel/Netlify

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/sus-word.git
   cd sus-word
   ```

2. **Install dependencies**
   ```bash
   cd app
   npm install
   ```

3. **Set up Supabase**
   - Create a new project at [supabase.com](https://supabase.com)
   - Copy your project URL and anon key
   - Run the SQL schema from `app/src/db/schema.sql`
   - Run the seed data from `app/src/db/seed.sql`

4. **Configure environment variables**
   ```bash
   cp .env.example .env.local
   ```
   Add your Supabase credentials:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

## 🎯 Game Rules

### Scoring System
- **Faker caught + guesses correctly**: Faker gets 2 points
- **Faker caught + guesses incorrectly**: Players who voted for faker get 1 point each
- **Faker not caught**: Faker gets 2 points

### Player Roles
- **Regular Players**: See the secret word highlighted in green, give clues to help others identify the faker
- **Faker**: Don't see the secret word, must blend in by giving plausible clues

## 🏗 Project Structure

```
app/
├── src/
│   ├── app/                 # Next.js app router pages
│   │   ├── game/[id]/      # Game room page
│   │   ├── join/           # Join game page
│   │   └── lobby/[id]/     # Lobby page
│   ├── components/         # Reusable React components
│   ├── hooks/              # Custom React hooks
│   ├── lib/                # Utility functions and actions
│   ├── types/              # TypeScript type definitions
│   └── db/                 # Database schema and migrations
```

## 🔧 Key Components

- **`useGameRealtime`**: Custom hook managing real-time game state
- **`RoleReveal`**: 3D flip animation for role reveal
- **`Confetti`**: Celebration animation for game completion
- **Game Actions**: Server actions for game state management

## 🚀 Deployment

The app is ready to deploy on Vercel or Netlify:

1. **Vercel**: Connect your GitHub repo and deploy
2. **Netlify**: Use the build command `npm run build` in the `app` directory
3. **Environment Variables**: Add your Supabase credentials to your deployment platform

## 🎨 UI Features

- **Gradient Headers**: Beautiful gradient backgrounds
- **Real-time Indicators**: Live vote status with checkmarks
- **Responsive Layout**: Works on desktop, tablet, and mobile
- **Smooth Animations**: Fade-in transitions between game phases
- **Loading States**: Proper loading indicators for all actions

## 🔍 Development Notes

- **Real-time Architecture**: Uses Supabase's `postgres_changes` for live updates
- **Row Level Security**: Proper RLS policies for data access
- **Type Safety**: Full TypeScript coverage
- **Error Handling**: Comprehensive error handling and user feedback

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🎉 Acknowledgments

Inspired by *The Chameleon* and *Spyfall* board games. Built with love using modern web technologies.
