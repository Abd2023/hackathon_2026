# Gorsel Asistan (MVP)

Gorsel Asistan is an AI-powered, mobile-first web application designed to help users make better e-commerce purchasing decisions simply by taking a picture of a product. 

This project was built as part of a Hackathon to demonstrate the power of Agentic Workflows using Google Gemini.

## Features

- **Vision Agent**: Takes an uploaded image of a product, identifies its brand, category, and exact model, and generates search queries.
- **Deal-Breaker (Özel Şart)**: Users can input a specific condition (e.g., "Must not have a fragile scroll wheel"). The AI evaluates the product reviews against this exact condition.
- **Marketplace Provider System**: A modular hybrid fetching system that can fall back to deterministic mock data (Fixtures) or perform live scraping.
- **Decision Agent**: Evaluates the retrieved marketplace listings, analyzes pros/cons, checks the deal-breaker condition, and synthesizes a final verdict ("Güvenle Alabilirsiniz" or "Özel Şartı Sağlamıyor").
- **Mobile-First UI**: Built with Next.js 16 and Tailwind CSS v4 to look like a native mobile app.

## Project Structure

- `src/app`: Next.js 16 App Router UI and API routes (`/api/analyze`).
- `src/components`: Reusable React components (`AgentProgress`, `ResultView`, etc).
- `src/lib/agents`: The core AI layer (`vision-agent.ts`, `decision-agent.ts`, `orchestrator.ts`).
- `src/lib/gemini`: Configures `@google/genai` client and prompt templates.
- `src/lib/marketplaces`: The data source layer for gathering product listings.
- `src/lib/schemas`: Zod schemas for structured data.
- `src/lib/scraping`: Playwright-based live scraping foundation.

## Local Setup

1. **Clone & Install**
   ```bash
   git clone ...
   cd hackathon_2026
   npm install
   ```

2. **Environment Variables**
   Create a `.env.local` file by copying `.env.example`:
   ```bash
   cp .env.example .env.local
   ```
   Add your Gemini API Key to `.env.local`:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   DATA_MODE=fixture # Change to "live" to enable experimental scraping
   ```

3. **Run the App**
   ```bash
   npm run dev
   ```

4. **Testing the App**
   Open `http://localhost:3000` in a mobile emulator or resize your browser to mobile width.
   Upload a picture of a product (e.g., a mouse, keyboard, headphones).
   (Optional) Enter a "Deal Breaker" condition.
   Click "Hemen Bul".

## Agentic Flow Overview

1. User uploads an image -> **Vision Agent** (Gemini) classifies it.
2. The orchestrator triggers the **Marketplace Provider** to search for listings.
3. The **Decision Agent** (Gemini) evaluates the listings and user's deal-breaker condition.
4. The final Recommendation JSON is presented via the `ResultView` UI.
