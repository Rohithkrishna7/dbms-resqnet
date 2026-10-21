# ResQNet — Disaster Response and Resource Management System

A full-stack emergency response coordination platform powered by **Neo4j AuraDB**, built with **Node.js/Express**, **React (Vite)**, **Tailwind CSS**, **Recharts**, and **Cytoscape.js**.

ResQNet provides community administrators with real-time graph-driven operational command to track disasters, triage emergency requests, assign volunteers, manage relief supply inventories, and explore relationship topologies.

---

## 1. System Architecture & Tech Stack

- **Frontend:** React 18, Vite, Tailwind CSS, Lucide Icons
- **Analytics & Visualizations:** Recharts (data charts), Cytoscape.js (interactive graph canvas)
- **Backend API:** Node.js, Express, `neo4j-driver` (official Neo4j JavaScript Driver)
- **Database:** Neo4j AuraDB (Cloud Managed Graph Database)

### Preserved Graph Schema (9 Core Entity Labels)

The system strictly adheres to the established database schema:

| Label | Primary ID Key | Description & Role |
| :--- | :--- | :--- |
| `ROLE` | `RoleID` | System permission roles |
| `USER` | `UserID` | Community members, coordinators, personnel |
| `LOCATION` | `LocationID` | Physical geographical coordinates and regions |
| `DISASTER` | `DisasterID` | Active or historical crisis incidents |
| `EMERGENCY_REQUEST` | `RequestID` | Civilian distress alerts and supply requests |
| `VOLUNTEER` | `VolunteerID` | Relief personnel readiness profiles |
| `ASSIGNMENT` | `AssignmentID` | Mission deployments connecting volunteers to requests |
| `RESOURCE` | `ResourceID` | Supply catalog types and measurement units |
| `INVENTORY` | `InventoryID` | Physical warehouse stock quantities |

### Core Graph Relationships
- `(:USER)-[:HAS_ROLE]->(:ROLE)`
- `(:USER)-[:LOCATED_AT]->(:LOCATION)`
- `(:DISASTER)-[:OCCURRED_AT]->(:LOCATION)`
- `(:USER)-[:HAS_VOLUNTEER_PROFILE]->(:VOLUNTEER)`
- `(:USER)-[:SUBMITTED]->(:EMERGENCY_REQUEST)`
- `(:EMERGENCY_REQUEST)-[:RELATED_TO_DISASTER]->(:DISASTER)`
- `(:EMERGENCY_REQUEST)-[:REQUESTED_AT]->(:LOCATION)`
- `(:VOLUNTEER)-[:HAS_ASSIGNMENT]->(:ASSIGNMENT)`
- `(:ASSIGNMENT)-[:FOR_REQUEST]->(:EMERGENCY_REQUEST)`
- `(:INVENTORY)-[:STOCKS_RESOURCE]->(:RESOURCE)`
- `(:INVENTORY)-[:STORED_AT]->(:LOCATION)`

---

## 2. Prerequisites

- **Node.js:** v18.0.0 or later (v24.14.1 recommended)
- **npm:** v9.0.0 or later
- **Neo4j AuraDB:** An active AuraDB instance (Free or Professional tier)

---

## 3. Quickstart & Installation

### Step 1: Install All Dependencies
From the repository root directory, run:
```bash
npm run install:all
```
*(This installs root dependencies and runs `npm install` inside both `backend/` and `frontend/`)*

### Step 2: Configure Environment Variables
Copy the template configuration in `backend/`:
```bash
# Windows PowerShell
Copy-Item backend/.env.example backend/.env

# Linux / macOS
cp backend/.env.example backend/.env
```

Open `backend/.env` in your text editor and fill in your Neo4j AuraDB connection details:
```env
PORT=5000

# Neo4j AuraDB connection string (typically neo4j+s://...)
NEO4J_URI=neo4j+s://your-instance-id.databases.neo4j.io
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=your_neo4j_password_here

# Default database for AuraDB
NEO4J_DATABASE=neo4j

# Inventory threshold for low-stock warning
LOW_STOCK_THRESHOLD=25
```

> **Security Guarantee:** Credentials are read only server-side by Node.js. Secrets are excluded from Git via `.gitignore` and never exposed to the frontend or API payloads.

---

## 4. Running the Application

### Option A: Run Both Backend & Frontend Concurrently (Recommended)
From the project root:
```bash
npm run dev
```
- **Backend API:** `http://localhost:5000`
- **Frontend App:** `http://localhost:3000`

### Option B: Run Services Separately
In Terminal 1 (Backend):
```bash
cd backend
npm run dev
```

In Terminal 2 (Frontend):
```bash
cd frontend
npm run dev
```

---

## 5. REST API Documentation

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Live database connectivity status, address, agent, and indexed node count |
| `GET` | `/api/dashboard/summary` | Real-time KPI counts, 9-entity metrics, breakdown charts, and recent requests |
| `GET` | `/api/disasters` | List disasters with status, severity, and text search filters |
| `GET` | `/api/disasters/:id` | Detailed disaster record with connected emergency requests |
| `POST` | `/api/disasters` | Declare a new disaster and link to location (`:OCCURRED_AT`) |
| `PUT` | `/api/disasters/:id` | Update disaster severity, status, description, and location |
| `GET` | `/api/requests` | List emergency requests with priority, status, and disaster filters |
| `GET` | `/api/requests/:id` | Detailed request with connected requester user, disaster, and volunteer |
| `POST` | `/api/requests` | Submit request and connect relationships (`:SUBMITTED`, `:RELATED_TO_DISASTER`, `:REQUESTED_AT`) |
| `PATCH`| `/api/requests/:id/status`| Update request status (`Pending`, `In Progress`, `Resolved`, `Cancelled`) |
| `GET` | `/api/volunteers` | List volunteer profiles with contact info and active assignments |
| `PATCH`| `/api/volunteers/:id/availability` | Update volunteer status (`Available`, `Deployed`, `Unavailable`) |
| `GET` | `/api/assignments` | List volunteer mission assignments with request & location details |
| `POST` | `/api/assignments` | Create assignment with strict validation of volunteer and request existence |
| `PATCH`| `/api/assignments/:id/status` | Update assignment status (`Assigned`, `In Progress`, `Completed`, `Cancelled`) |
| `GET` | `/api/inventory` | List resources, quantities, depot locations, and low-stock flags |
| `PATCH`| `/api/inventory/:id/quantity` | Update inventory quantity in Neo4j |
| `GET` | `/api/inventory/categories` | Distinct resource categories |
| `GET` | `/api/graph` | Cytoscape graph elements with entity type filtering and limit controls |
| `GET` | `/api/meta/*` | Dropdown metadata for locations, users, disasters, volunteers, and requests |

---

## 6. Demonstration Walkthrough & Feature Verification

### 1. Dashboard
- View live KPI cards: Active Disasters, Pending Requests, Available Volunteers, Total Relief Inventory.
- Check the 9-Entity Graph overview showing counts for all labels.
- Analyze charts: Disaster type breakdown, request status distribution, inventory by category.
- View the Recent Emergency Requests table.

### 2. Disaster Management
- Filter disasters by Status (`Active`, `Ongoing`, `Contained`, `Resolved`) or Severity (`Critical`, `High`, `Medium`, `Low`).
- Click the eye icon to view connected emergency requests linked via `:RELATED_TO_DISASTER`.
- Click **"Declare New Disaster"** to insert a new disaster node and establish an `:OCCURRED_AT` edge to a location.
- Click the edit icon to update status and severity in Neo4j.

### 3. Emergency Requests
- Filter requests by Priority and Status.
- Click **"Create Emergency Request"** to create a request with validated links to a requester `(:USER)`, disaster `(:DISASTER)`, and location `(:LOCATION)`.
- Click **"Update"** to advance request status (e.g. from `Pending` to `In Progress` or `Resolved`).

### 4. Volunteer Management
- View volunteer profiles, contact details, skills, experience, and currently assigned missions.
- Click **"Change Availability Status"** to toggle readiness (`Available`, `Deployed`, `Unavailable`).

### 5. Assignments
- View assignments connecting volunteers to requests.
- Click **"Assign Volunteer"**:
  - The modal dropdowns query live volunteers and requests from Neo4j.
  - Submitting creates the `ASSIGNMENT` node, creates `(:VOLUNTEER)-[:HAS_ASSIGNMENT]->(:ASSIGNMENT)`, creates `(:ASSIGNMENT)-[:FOR_REQUEST]->(:EMERGENCY_REQUEST)`, and automatically updates the volunteer to `Deployed`.
- Update assignment status to `Completed` once relief has been dispatched.

### 6. Relief Inventory
- View supply stocks across warehouse locations.
- Adjust the **"Low Threshold"** slider/input to dynamically flag low-stock supplies.
- Toggle **"Low Stock Only"** to view resources needing replenishment.
- Click **"Update Stock"** to modify the quantity directly in Neo4j.

### 7. Interactive Graph Explorer
- View full topological representation of nodes and relationships rendered with Cytoscape.js.
- Toggle entity labels on/off (`ROLE`, `USER`, `LOCATION`, `DISASTER`, `EMERGENCY_REQUEST`, `VOLUNTEER`, `ASSIGNMENT`, `RESOURCE`, `INVENTORY`).
- Change layout algorithms: *Force-Directed (CoSE)*, *Concentric*, *Circular*, *Hierarchical Tree*, or *Grid*.
- Click any node or edge to inspect its labels, ID, and raw properties in the inspector panel.

---

## 7. Troubleshooting

- **"AuraDB Offline / Credentials not configured":**
  Ensure you have created `backend/.env` with your actual AuraDB credentials. Click the **"DBMS Info"** button in the top navigation bar to test your connection at any time.
- **Connection Timed Out:**
  Ensure your IP address is allowed in Neo4j AuraDB (AuraDB permits connections from all IPs `0.0.0.0/0` by default unless IP whitelisting is enabled).
- **Driver Integer Serialization:**
  All integers returned by the official Neo4j driver are converted into native JavaScript numbers via `cypherUtils.toNative()` to prevent `{ low, high }` formatting errors.
