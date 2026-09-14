<div align="center">
  <img src="public/hotfire/logo-horizontal.png" alt="HotFire Operating System" width="620" />

  # HotFire OS

  A polished browser-based desktop experience built with TypeScript, React, HTML, and CSS.
</div>

## About

HotFire OS recreates the feel of a modern desktop operating system inside a web browser. It includes a boot sequence, welcome screen, draggable application windows, a launcher, a dock, persistent preferences, and a growing collection of useful applications.

HotFire OS is a web application and desktop simulation. It is not a replacement for Windows, Linux, or macOS and does not have unrestricted access to the host computer.

## Applications

- **Files** — create folders and text files, edit and save notes, search, rename, delete, import local files, and export text documents.
- **Flare** — tabbed browsing with navigation history, bookmarks, reload, search, and an external-page fallback.
- **Video** — local video playlists, seeking, volume, playback speed, looping, picture-in-picture, and fullscreen playback.
- **Music** — local audio playback with a responsive visualizer.
- **Terminal** — a safe simulated terminal with commands for exploring and launching HotFire apps.
- **Calculator** — a compact standard calculator.
- **Calendar** — monthly navigation and a simple daily agenda.
- **Settings** — wallpapers, accent colors, clock preferences, reduced motion, and startup behavior.
- **Ember Rush** — a timed arcade game with streaks and a persistent high score.

## Desktop features

- Animated boot and welcome experience
- Draggable, focusable application windows
- Working minimize, maximize, restore, and close controls
- App launcher with search
- Desktop shortcuts and application dock
- Persistent virtual files, preferences, bookmarks, and game scores using browser storage
- Responsive layouts for desktop and smaller screens
- Custom HotFire branding and app icons

## Getting started

### Requirements

- Node.js 22.13 or newer
- npm

### Run locally

```bash
git clone https://github.com/tansheetalitaj/hotfire-os.git
cd hotfire-os
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production build

```bash
npm run build
```

## Technology

- TypeScript
- React 19
- Vinext and Vite
- Tailwind CSS
- Lucide React icons
- Browser Local Storage, File, Blob, Media, Fullscreen, and Picture-in-Picture APIs

## Browser limitations

- The Files application uses a sandboxed virtual file system stored in the current browser. It cannot freely modify arbitrary files on the computer.
- Imported binary files are kept local; the virtual file manager stores their metadata rather than uploading their contents.
- Some websites block iframe embedding through their security policies. Flare provides an **Open externally** option for those pages.
- Media format support depends on the browser and operating system codecs.

## Project structure

```text
app/                 Main React experience and styling
components/          Reusable UI components
hooks/               Shared React hooks
lib/                 Project utilities
public/hotfire/      Logos, wallpaper, and application icons
```

## License

The original source code in this repository is available under the [MIT License](LICENSE).

The HotFire name, logos, visual identity, wallpaper, and other original brand artwork are **not** granted under the MIT License and remain the property of their respective owner. Bundled third-party icon artwork remains subject to its original authors' terms. The MIT License applies to the source code unless a file states otherwise and does not grant trademark rights.

Copyright © 2026 Tansheet Ali Taj.
