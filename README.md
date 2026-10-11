# Nation of Niches

A niche-focused social platform for iOS and Android, built with React Native and Expo.

## Requirements

- Node.js 18 or later
- Expo Go (for device testing) or an Android/iOS emulator

## Getting Started

```bash
npm install
cp .env.example .env
```

Add your Supabase credentials to `.env`:

```
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Start the development server:

```bash
npx expo start
```

## Project Structure

```
app/                 Expo Router screens and navigation
  (tabs)/            Bottom tab navigator
src/
  components/        Shared UI components
  constants/         Theme and design tokens
  hooks/             Custom hooks
  lib/               Supabase client and data access
  types/             TypeScript models
```

## Database

Apply `supabase_schema.sql` in the Supabase SQL editor to provision tables, policies, and indexes.
