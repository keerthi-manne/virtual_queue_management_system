// This file MUST be imported before anything else
import dotenv from 'dotenv';

// Load environment variables from .env file in server directory
const result = dotenv.config();

if (result.error) {
  console.error('Error loading .env file:', result.error);
} else {
  console.log('✓ .env file loaded successfully');
}

// Log for debugging
console.log('Environment check:', {
  SUPABASE_URL: process.env.SUPABASE_URL ? 'SET' : 'MISSING',
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY ? 'SET' : 'MISSING',
  PORT: process.env.PORT || '5000'
});
