# Live CanadaArm2 orientation using International Space Station telemetry

## Description

## Installation

1. To get started, clone the repository and install the dependencies:

   ```bash
   git clone https://github.com/bfeist/canadarm-live.git
   cd vite-express-ts
   npm install
   ```

2. Then create a `.env` file by copying `.env.sample` to `.env`
3. Run `/scripts/make-dev-ssl-cert.sh` (used for docker deploys only)

## Usage

### Development

To start both the frontend and backend in development mode, run:

```bash
npm run dev
```

This will start the Vite development server for the frontend and the Express server for the backend concurrently.

Available at `http://localhost:5100`

### Build

To build the application for production:

```bash
npm run build
```

This script builds the application. The result is put in `.local/vite/dist`.

### Start Production Server

After building, start the production server with:

```bash
npm run start
```

This runs a simple `node ./.local/express/dist/api.js` command to start the express server that serves the `/api/v1` endpoints.

### Deploy via Docker

- `npm run docker:preview:rebuild`
  - Builds docker image:
    - `nginx`
      - vite is used to build the front-end (React) to static assets in `/.local/vite/dist`
      - these are copied into the nginx image at the default nginx path
      - `/api/v1/` routes are proxied to the `express` server
- `npm run docker:preview` to start the containers
- Go to `https://localhost` to hit the nginx server

## Structure

- `src/`: Contains the source code for the React frontend.
- `.local/vite/dist`: Destination for the built frontend files.
