# Thoughts Archived by Dave

Write, Tear, Burn, Heal: a private daily journaling ritual with a time-locked Ashes Vault.

```
npm install
npm run dev
```

## Sync across devices (optional)

Without setup, everything stays in this browser. To sync between phone and laptop:

1. Create a free project at https://supabase.com.
2. In the SQL editor, run [`supabase/schema.sql`](supabase/schema.sql).
3. **Authentication -> URL Configuration**: set *Site URL* to your deployed address (and add `http://localhost:5173` under *Redirect URLs* for local testing).
4. Copy `.env.example` to `.env.local` and fill in the project URL and anon key (**Project Settings -> API**).
5. Deploy (Vercel / Netlify / Cloudflare Pages) and add the same two variables in the host's environment settings. Build command `npm run build`, output `dist`.
6. In the app, tap the cloud icon, sign in with your email, and create a passphrase.

**Privacy:** entries are encrypted in the browser (PBKDF2 + AES-GCM) before upload. The server stores only ciphertext. Forget the passphrase and the cloud copy is unrecoverable. The sign-in email cannot reset it.

Encryption needs https (or localhost).
