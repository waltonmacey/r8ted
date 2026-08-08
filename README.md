# R8ted

Personal rankings. Vite + React + Tailwind, optional Firebase Firestore/Auth, deployed to GitHub Pages.

## Run locally
    nvm use --lts        # make sure `which node` points into ~/.nvm
    npm install
    npm run dev

Runs on localStorage until Firebase env vars exist. Data model, taxonomy, and design tokens live in src/lib and tailwind.config.js.

## Enable Firebase (optional, syncs data across devices)
1. Create a Firebase project (or reuse the prototype's), enable Firestore and Email/Password auth, add a user for yourself.
2. Copy the web app config values into `.env.local` in the repo root:

        VITE_FIREBASE_API_KEY=...
        VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
        VITE_FIREBASE_PROJECT_ID=your-project
        VITE_FIREBASE_APP_ID=...
        VITE_OWNER_EMAIL=you@example.com

3. In firestore.rules, replace OWNER_EMAIL with the same email, then publish the rules from the Firebase console (or `firebase deploy --only firestore:rules`).

## Deploy
One command, after the GitHub repo exists and Pages is set to the gh-pages branch:

    npm run deploy

If the repo name is not `r8ted`, update `base` in vite.config.js to match.

## Add a catalog
Drop a JSON file in `src/catalogs/`. Format is documented at the top of `src/lib/catalogLoader.js`. It appears in the New list flow automatically at next build.
