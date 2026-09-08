# VoiceBridge Backend

Backend API server for VoiceBridge, powered by Node.js, Express, MongoDB, and Google Gemini AI.

## Features

- User Authentication (JWT & bcrypt)
- Voice & AI Processing integration (Google Gemini)
- MongoDB integration via Mongoose
- RESTful API endpoints

## Getting Started

### Prerequisites

- Node.js (v18+)
- MongoDB database (local or Atlas)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/Santhoshkumar010904/voicebackend.git
   cd voicebackend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   Copy `.env.example` to `.env` and fill in your details:
   ```bash
   cp .env.example .env
   ```

4. Start the server:
   ```bash
   # Development mode (with nodemon)
   npm run dev

   # Production mode
   npm start
   ```
