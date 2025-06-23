### ✅ Concept

* Core mechanics are simple: a turn-based guessing and deduction game.
* No real-time physics, animation, or intensive graphics.
* Most of the complexity is in **game logic and UI state**, which are great for learning.

### ✅ Familiar Pattern

The concept is similar to existing social deduction games like *Chameleon* (by Big Potato), *Spyfall*, and *Among Us* (without the movement)—making it easier to design UX around well-established patterns.

---

## 🔧 Why It's Ideal for a First Game

### ✅ You’ll Practice:

* Multiplayer session management (great if using Firebase or Supabase)
* Turn-based logic and role assignments (like “who’s the faker?”)
* Simple UI/UX elements (grid layout, word reveals, voting screen, score tracking)
* Hosting/inviting friends via link (good practice in deep linking)
* Game state transitions (lobby → round → clues → voting → scoring)

### ✅ Can Start Simple:

You can **ship a basic prototype** without:

* Audio
* Complex animations
* Fancy design
* In-app purchases

Then add polish over time.

---

## 📱Suggested Tech Stack

* **Frontend:** React Native (Expo) or Flutter
* **Backend:** Firebase (Authentication, Firestore for game state, Functions for logic)
* **Realtime:** Firebase’s `onSnapshot` or Supabase’s `realtime` channels
* **Link sharing:** Dynamic links (e.g., Branch, Firebase Dynamic Links)

---

## 💡Tips for Scoping MVP

**MVP features to focus on:**

* Game creation with join link
* Grid generation with one secret word
* Assigning “faker” role
* Clue input & display
* Voting logic
* Round scoring
* Game state & turn rotation

**Skip in v1:**

* Persistent logins
* Fancy graphics
* In-game chat (just show who said what clue)
* Friends list

---

## 🎯 Stretch Goals (Post-MVP)

* Timers for clue or voting
* In-app voice chat or emoji reactions
* Categories with unlockable words
* Stats & leaderboards
* Custom categories
* AI player (for solo mode or filler)