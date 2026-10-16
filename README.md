# Merve Deniz Senelen — Portfolio

An interactive portfolio presented as a full-screen 3D room. Visitors can open a desktop-style project browser, explore selected GitHub projects, visit profile links, and play two queued YouTube videos from the guitar.

## Features

- **Interactive 3D room:** Built with Three.js. The laptop opens the desktop view, the project box opens selected projects, the notebooks link to Medium, and the light switch toggles day/night lighting.
- **Selected projects:** The project box opens a centered, scrollable dialog with Melodia and OpsLens. Repository descriptions and language breakdowns are fetched from GitHub’s public API; local content provides fallbacks and additional technology details.
- **Desktop view:** Desktop icons open movable windows for the project timeline, profile/skills, GitHub, LinkedIn, email, and resume.
- **YouTube mini-player:** Clicking the guitar opens an embedded player. It plays `W_NcoP44AFI` first and advances to `8g-aABfzo3g` when the first video ends. The player also links to the first video on YouTube.
- **Room links:** The sticky notes link to LinkedIn, GitHub, and the resume. The framed portrait links to Instagram.
- **Keyboard and touch support:** The project box is an explicit click target; the project dialog closes with its close button, Escape, or a click outside it. Equivalent links and controls are available to assistive technology.

## Tech Stack

- React 19
- Vite 8
- Three.js
- Oxlint

## Getting Started

Use Node.js 20.19+ or 22.12+.

```sh
npm install
npm run dev
```

Vite prints the local development URL after the server starts.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the development server with hot reload. |
| `npm run build` | Create the production site in `dist/`. |
| `npm run preview` | Serve the production build locally. Run `npm run build` first. |
| `npm run lint` | Run Oxlint. |

## Project Structure

```text
src/
  App.jsx                 Lazy-loads the room experience
  content.js              Profile, experience, skills, and project content
  components/
    Room.jsx              React UI, project dialog, and YouTube player
    Desktop.jsx           Desktop overlay and its draggable windows
  room/
    scene.js              Three.js room geometry and interactions
  styles.css              Room, dialog, player, and desktop styles
public/
  resume.pdf              Resume download
  PXL_20260906_170423277.jpg  Portrait used in the Instagram photo frame
  PXL_20260502_122514550 (1).jpg  Leopard-print noticeboard texture
```

## Updating Portfolio Content

Edit `src/content.js` to update the profile, social URLs, skills, experience, or project timeline. The `projects` array supplies the five entries shown in the desktop Projects window and should stay ordered newest first. `githubProjects` supplies the project box dialog and its selected projects.

Room interactions and object placement live in `src/room/scene.js`; React overlays and external media controls live in `src/components/Room.jsx`. Replace the portrait or noticeboard image in `public/` and update its path in the scene code if the filename changes.

## External Services

- GitHub project metadata uses the unauthenticated public GitHub REST API. GitHub may rate-limit requests; the portfolio includes local fallback details.
- YouTube playback uses the YouTube IFrame Player API and requires a network connection. Browser autoplay restrictions may require the visitor to press Play in the mini-player.
- Google Fonts supplies Caveat and Cormorant Garamond; the site falls back to local serif/handwriting alternatives if the font service is unavailable.

## Production Build

```sh
npm run build
npm run preview
```

The generated static site is in `dist/` and can be hosted by a static web host. The production build currently reports a Vite chunk-size advisory because the Three.js room bundle is over the default 500 kB warning threshold; the room itself is lazy-loaded.