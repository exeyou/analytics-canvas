# Analytics Canvas
Analytics Canvas is a full-stack, real-time system monitoring panel featuring a dynamic, persistent telemetry grid. The application allows users to orchestrate a modular system dashboard by dropping telemetry widgets onto an active canvas, toggling active live streams on or off, and modifying layout parameters. All changes to layout arrangement and metric state configurations automatically persist across system updates and page reloads.

## Core Features
**State Persistence Handshake**: Features an initialization protocol between the state machine and the database layer. This ensures that a browser refresh hydrates the layout configuration cleanly from the database instead of pushing default empty values that could overwrite existing states.

**Atomic Transaction Layer**: Uses database transactions to batch update the grid state. Changing, adding, or deleting visual components triggers a database transaction that updates layout schema and configuration parameters seamlessly.

**Real-Time Data Streaming**: Runs an asynchronous processing loop on the server that pulls system resource data, pushes it down an active WebSocket connection, and maps deviations against calculated baseline averages.

**Granular Telemetry Toggles**: Enables users to selectively background specific metric trackers. Muting an element halts its live rendering on the client interface while the backend safely continues recording data to prevent visual chart gaps if the stream is unmuted later.

## Technical Stack
**Frontend Framework**: Next.js 16 (App Router) paired with React 19.

**State & Layout Management**: Zustand for real-time memory handling and @dnd-kit/core for workspace layout manipulation.

**Visualization Engine**: Recharts for telemetry data rendering.

**Backend Runtime**: Node.js using the ws library for live socket channels and systeminformation for machine diagnostics.

**Database & Data Layer**: PostgreSQL database managed through Prisma 7 using native PostgreSQL driver adapters.

## System Requirements
To set up and run this application locally, ensure you have the following installed:

-Node.js version 18.0.0 or higher.

-A running PostgreSQL database instance (local or hosted).

## Installation and Setup
1. **Configure the Environment File**: Navigate to the server directory and create your local configuration file:
Copy server/.env.example to server/.env and adjust the DATABASE_URL connection string with your valid database credentials.

2. **Run the Automated Setup**: Execute the initialization script from the root directory. This command automatically installs all global and workspace dependencies, initializes the Prisma engine, and deploys the schema straight to your PostgreSQL database:
`npm run setup`

3. **Start the Application**: Launch the active development environment from the repository root to boot up the client dashboard and telemetry server concurrently:
`npm run dev`

Once booted, the application interface will be accessible at http://localhost:3000, and the telemetry socket server will run on port 4000.

## PostgreSQL User Permissions

The database user specified in your `DATABASE_URL` connection string must have sufficient privileges to manage the schema. Because this project utilizes Prisma's structural migration commands to set up tables, the database user requires:

* **CONNECT** privileges on the target database.
* **CREATE**, **USAGE**, and **REFERENCES** privileges on the `public` schema.
* Full Data Definition Language (**DDL**) and Data Manipulation Language (**DML**) capabilities to create, alter, drop, read, and write to tables (`Widget` and `ListenerState`).

If you are using a shared or restricted database cluster, you can configure a dedicated user via SQL before running the setup script:

```sql
CREATE USER canvas_dev WITH PASSWORD 'your_secure_password';

GRANT CONNECT ON DATABASE analytics_canvas TO canvas_dev;

-- (Run this while connected to the analytics_canvas database)
GRANT USAGE, CREATE ON SCHEMA public TO canvas_dev;