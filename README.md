# CardioAssist AI - Doctor Portal

Graduation project prototype with fictional patients and deterministic synthetic results. Academic Prototype - Not for Clinical Use.

## Run locally

```sh
npm install
npm run dev -- --host 127.0.0.1
```

On Windows PowerShell, use `cmd /c npm ...` if execution policy blocks npm.ps1.

Open http://127.0.0.1:5173 for the public landing page, then choose **Enter doctor portal**. On the sign-in screen, use `doctor@cardioassist.demo` / `demo123`, or select **Enter demo workspace**.

## Demo workflows

- Search Ahmed Ali, open his assessment, add review notes, and print the report.
- Start a new assessment from a patient profile; drafts and records persist locally.
- Accept a patient request, then simulate a mobile submission from Notifications.
- Doctors cannot create patients directly; new patients join through accepted connection requests. Connected patient information can be edited.
- Compare assessment history or change illustrative inputs in the scenario simulator.
- Change themes, simulate request/model failures, or reset demo data in Settings.

The app uses React, TypeScript, Vite, Tailwind, shadcn's Base UI button, TanStack Router, Recharts, React Hook Form, Zod, Lucide, and localStorage. The public landing page uses a lazy-loaded Three.js heart study with surface/structure views, reduced-motion support, and a bitmap fallback. Inter is bundled locally. No backend, real authentication, or real AI model is connected.

## Verification

```sh
npm run build
npm run lint
npm run test:e2e
```

End-to-end tests use installed Microsoft Edge and expect the development server on port 5173. Screenshots and failure traces are generated in `test-results/`.
