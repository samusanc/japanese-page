# Local Development Server Guide

Since the application is structured as a modern JS project compiled by **Vite**, you need to run the local Vite development server to resolve modules and aliases (e.g. `@core/*`, `@modules/*`) correctly.

Follow these instructions to set up and run the server on Windows:

---

## 1. Install Node.js and npm

If you do not have Node.js installed, the fastest way to install it on Windows is using **winget** (Windows Package Manager).

1. Open **PowerShell** or Command Prompt.
2. Run the following command:
   ```powershell
   winget install OpenJS.NodeJS.LTS
   ```
3. Complete the installation wizard (grant Windows UAC/Administrator permission if prompted).
4. **Important**: Close and reopen your terminal or code editor to load the updated system PATH environment.

---

## 2. Install Project Dependencies

Navigate to the project directory and run the package installer:

```powershell
npm install
```

### Windows Execution Policy Workaround
If you receive a security error in PowerShell saying:
> *"No se puede cargar el archivo npm.ps1 porque la ejecución de scripts está deshabilitada en este sistema"*
> (Script execution is disabled on this system)

This is a default Windows security policy. You can bypass this restriction by calling the batch executable **`npm.cmd`** directly instead of `npm`:

```powershell
npm.cmd install
```

---

## 3. Run the Development Server

Start the local Vite development server:

```powershell
npm run dev
```

*(Or use the batch command if execution policies are restricted):*

```powershell
npm.cmd run dev
```

Once started, the server will output the local address:
```
  ➜  Local:   http://localhost:5173/
```
Open **[http://localhost:5173/](http://localhost:5173/)** in your web browser to test and play!

---

## 4. Useful Development Commands

- **Run Dev Server**: `npm run dev`
- **Build Production Bundle**: `npm run build`
- **Preview Production Build Locally**: `npm run preview`
- **Run Unit & Content Tests**: `npm test`
- **Rebuild Vocabulary Card Decks**: `python scripts/build_vocab.py`
- **Generate Spoken Voice Audio (TTS)**: `python generate_audio_edge.py`
