# Xen.ai - AI-Powered Collaborative Code Editor

Xen.ai is a modern, collaborative code editor platform that combines the power of artificial intelligence with real-time collaboration features. Built with Next.js and Firebase, it provides developers with an intuitive workspace for coding, pair programming, and project management.

## Features

### 🤖 AI-Powered Assistance
- Intelligent code suggestions and completions
- Context-aware code analysis
- Smart error detection and fixes

### 👥 Real-Time Collaboration
- Multi-user editing capabilities
- Live cursor tracking
- Team member presence indicators
- Instant chat and code discussions

### 🔐 Secure Authentication
- Email/Password authentication
- Google OAuth integration
- Facebook authentication (coming soon)
- GitHub authentication (coming soon)

### 💼 Workspace Management
- Create public and private workspaces
- Invite team members
- Role-based access control
- Project organization tools

### 👤 User Profiles
- Customizable user profiles
- Activity tracking
- Contribution statistics
- Collaboration history

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn package manager
- Firebase account

### Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/xenai.git
cd xenai
```

2. Install dependencies
```bash
npm install
# or
yarn install
```

3. Set up environment variables
Create a `.env.local` file in the root directory and add your Firebase configuration:
```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

4. Start the development server
```bash
npm run dev
# or
yarn dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

```
xenai/
├── src/
│   ├── app/              # Next.js app directory
│   ├── components/       # Reusable components
│   ├── config/          # Configuration files
│   ├── context/         # React context providers
│   ├── helpers/         # Helper functions
│   └── styles/          # Global styles
├── public/              # Static assets
└── package.json         # Project dependencies
```

## Technologies Used

- **Frontend Framework**: Next.js 13+ with App Router
- **Authentication**: Firebase Auth
- **Database**: Firebase Firestore
- **State Management**: React Context
- **Styling**: Tailwind CSS
- **UI Components**: Shadcn UI
- **Animations**: Framer Motion
- **Code Editor**: Monaco Editor (coming soon)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

If you have any questions or need help with setup, please open an issue or contact our support team.

## Acknowledgments

- Thanks to all contributors who have helped shape XenAI
- Special thanks to the open-source community for their invaluable tools and libraries
