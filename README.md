# SakhiCycle 🌸

> Your cycle, your *sakhi*.

SakhiCycle is a web app that helps you understand and track your menstrual cycle. It combines period tracking, an AI chatbot for your questions, and clear, approachable period education, like a good friend (*sakhi*) who's always there to inform and support you.

## Features

- **Cycle tracking:** log periods and symptoms, and see your history at a glance
- **Predictions:** get estimates for upcoming periods and fertile windows
- **Chatbot:** ask anything about your cycle or body, judgment-free
- **Period education:** learn how the cycle works, what's normal, and when to talk to a doctor

## Getting Started

### Prerequisites

- Node.js 18+ and npm (or your preferred package manager)

### Installation

```bash
# Clone the repository
git clone https://github.com/<your-username>/sakhicycle.git
cd sakhicycle

# Install dependencies
npm install
```

### Environment Variables

Create a `.env.local` file in the project root and add any keys the app needs (for example, the chatbot's API key):

```env
# Example
CHATBOT_API_KEY=your_key_here
```

### Run Locally

```bash
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

## Deployment

SakhiCycle is deployed on [Vercel](https://vercel.com):

1. Push the project to GitHub.
2. Import the repository in Vercel.
3. Add your environment variables in the project settings.
4. Deploy.

## Privacy

Cycle data is personal. SakhiCycle is built to be privacy-friendly, so only collect and store what the app needs.

## Disclaimer

SakhiCycle provides general information and predictions for educational purposes only. It is not a substitute for professional medical advice, diagnosis, or treatment. If you have health concerns, please consult a doctor.

## Contributing

Contributions, issues, and feature requests are welcome. Feel free to open an issue or submit a pull request.

## License

Add your license here (e.g., MIT).
