# Interactive Black Hole Simulation

**Host:** [https://black-h-sim1-web.vercel.app](https://black-h-sim1-web.vercel.app)

A realistic and interactive 3D simulation of a Black Hole, built with Three.js. Explore the physics of general relativity, gravitational lensing, and time dilation from the cockpit of a sci-fi spaceship.

## Features

*   **Realistic Visuals**:
    *   **Gravitational Lensing**: Real-time raymarching shader distorting the background starfield.
    *   **Volumetric Accretion Disk**: Glowing, swirling matter.
    *   **Relativistic Jets**: Particle systems simulating high-energy ejections.
*   **Interactive Physics**:
    *   **Time Dilation**: See how time slows down as you approach the event horizon.
    *   **Tidal Forces**: Visual and UI warnings for "Spaghettification".
    *   **Redshift**: Visual warping and color shifting due to extreme gravity.
*   **Spaceship Controls**:
    *   Procedural 3D spaceship model with thruster effects.
    *   1st Person (Cockpit) and 3rd Person (Orbit) camera modes.

## How to Play

1.  **Launch**: Open the simulation and read the Mission Briefing.
2.  **Controls**:
    *   **W / A / S / D**: Move Forward, Left, Backward, Right.
    *   **Space**: Ascend (Go Up).
    *   **Shift**: Descend (Go Down).
    *   **Mouse**: Aim the spaceship (Look around).
    *   **ESC**: Release cursor control / Pause interaction.
    *   **1 / 2 / 3**: Teleport to interesting locations (Safe Orbit, Accretion Disk, Jets).
3.  **Mission**:
    *   Experiment with the **Mass Slider** in the UI to see how the black hole grows and affects gravity.
    *   Fly close to the Event Horizon (the black sphere) but don't fall in!
    *   Switch views to see your ship warping under gravity.

## Development

*   **Tech Stack**: Three.js, Vite, Vanilla JS.
*   **Run Locally**:
    ```bash
    npm install
    npm start
    ```
