# SmartQueue Campus — Full-Stack Starter

## What this version does
- Responsive SmartQueue Campus client UI.
- Registrar, Clinic, Cashier, ICT.
- Shortest-wait/shortest-queue sorting.
- Supabase connection (`src/supabase.js`).
- Email OTP authentication hook.
- Database schema for profiles, offices, transactions, requirements, queue tickets, transfers, feedback, and chat.
- Realtime enabled for queue tickets and chat.
- RLS starter policies.
- Demo mode when Supabase environment variables are not filled.

## Connect it
1. Create a Supabase project.
2. In Supabase SQL Editor, run `supabase/schema.sql`.
3. Copy `.env.example` to `.env.local`.
4. Put your Supabase Project URL and anon key in `.env.local`.
5. Run:
   npm install
   npm run dev
6. Deploy the project to Vercel and add the same environment variables.

## Important
The SQL is a starter production architecture. Before institutional launch, add server-side role checks for staff/admin operations, a secure queue-number RPC/transaction, storage policies for document uploads, stronger moderation/rate limiting, and audit logging.
