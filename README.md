# ByteDuel 🥊

**Instant Coding Showdown** - A competitive coding platform where developers battle in real-time coding duels with AI-generated challenges and epic highlight reels.

![ByteDuel Screenshot](https://via.placeholder.com/800x400/1f2937/ffffff?text=ByteDuel+Screenshot)

## ✨ Features

- **🎯 Real-time Coding Duels** - Face off against other developers in timed coding challenges
- **🤖 AI-Generated Problems** - Fresh, fair coding problems tailored to your skill level
- **📊 ELO Rating System** - Competitive ranking with skill-based matchmaking
- **🎥 Highlight Reels** - Shareable code replay videos with AI commentary
- **📚 Practice Mode** - Self-paced learning with hints and guidance
- **🏆 Tournaments** - Bracketed competitions with multiple rounds
- **🔥 Multiple Game Modes** - Ranked duels, timed trials, bot challenges, and more

## 🚀 Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS
- **Animations**: Framer Motion
- **Code Editor**: Monaco Editor
- **Backend**: Supabase (PostgreSQL, Auth, Real-time)
- **Authentication**: GitHub OAuth + Email/Password
- **Deployment**: Netlify
- **State Management**: Zustand

## 🏗️ Architecture

```
src/
├── components/          # Reusable UI components
├── pages/              # Route components
├── lib/                # Core utilities and services
├── services/           # API and external service integrations
├── store/              # State management
└── types/              # TypeScript type definitions
```

## 🛠️ Setup & Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/byteduel.git
   cd byteduel
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Fill in your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   VITE_GITHUB_CLIENT_ID=your_github_oauth_app_client_id
   ```

4. **Set up Supabase database**
   ```bash
   # Run the migration files in supabase/migrations/
   # Or use Supabase CLI if available
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

## 🎮 Game Modes

### 🥊 Ranked Duel
- Competitive 1v1 matches with ELO rating
- Skill-based matchmaking
- Real-time opponent finding

### ⏱️ Timed Trial
- Solo challenges with strict time limits
- Personal best tracking
- Difficulty progression

### 🏆 Tournament
- Bracketed competitions
- Multiple elimination rounds
- Leaderboard rankings

### 🤖 Beat the Bot
- Challenge AI opponents
- Various difficulty levels
- Algorithm-specific challenges

### 📖 Practice Mode
- Self-paced learning
- Hints and guidance
- Topic-focused problems

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_SUPABASE_URL` | Supabase project URL | ✅ |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key | ✅ |
| `VITE_GITHUB_CLIENT_ID` | GitHub OAuth app client ID | ✅ |
| `VITE_MATCHMAKER_INTERVAL` | Matchmaking check interval (ms) | ❌ |
| `VITE_CODE_EXECUTION_TIMEOUT` | Code execution timeout (ms) | ❌ |

### Database Schema

The application uses Supabase with the following main tables:
- `users` - User profiles and ratings
- `duels` - Coding challenge sessions
- `submissions` - Code submissions and results
- `match_history` - Historical match data
- `practice_sessions` - Practice mode sessions
- `tournaments` - Tournament data

## 🚀 Deployment

### Netlify (Recommended)

1. Connect your GitHub repository to Netlify
2. Set build command: `npm run build`
3. Set publish directory: `dist`
4. Add environment variables in Netlify dashboard
5. Deploy!

### Manual Deployment

```bash
npm run build
# Upload dist/ folder to your hosting provider
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Monaco Editor for the code editing experience
- Supabase for the backend infrastructure
- Framer Motion for smooth animations
- Lucide React for beautiful icons

## 📞 Support

If you have any questions or need help, please:
- Open an issue on GitHub
- Check the documentation
- Join our Discord community

---

**Built with ❤️ for the coding community**