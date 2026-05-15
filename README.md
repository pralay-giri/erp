# Meetel ERP - Technical Documentation

This document provides a comprehensive guide for developers to set up, run, build, and integrate with the Meetel ERP system.

---

## 🏗️ Project Architecture

The system is a centralized ERP platform integrating **CRM**, **Sales**, **Warehouse**, and **System Monitoring** modules.
- **Frontend**: Cross-platform application built with **React Native (Expo)**, targeting Web and Android.
- **Backend**: High-performance REST API built with **Node.js/Express**, using **Sequelize ORM** and **MySQL**.
- **Security**: Secure session-based authentication via **JWT** and real-time **RBAC** (Role-Based Access Control).

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js**: v16+
- **MySQL**: 8.0+
- **JDK 17+** (For Android builds)
- **Android Studio** (For Android emulation/builds)

### 2. Installation
Clone the repository and install dependencies for both the server and frontend.

```bash
# Install Server dependencies
cd server
npm install

# Install Frontend dependencies
cd ../frontend
npm install
```

### 3. Backend Setup
1. Create a `.env` file in the `server/` directory:
   ```env
   PORT=5000
   DB_HOST=localhost
   DB_NAME=erp_db
   DB_USER=your_user
   DB_PASSWORD=your_password
   DB_DIALECT=mysql
   JWT_SECRET=your_secure_secret_key
   ```
2. Initialize and Seed the database:
   ```bash
   # Reset and seed with demo data (USE CAUTION: Drops tables)
   npm run db:force:seed
   ```

### 4. Frontend Setup
Update the API base URL in `frontend/constants/Api.ts`:
```typescript
export const API_BASE_URL = "http://YOUR_LOCAL_IP:5000/api";
```

---

## 💻 Running the Application

### Development Mode
Run both backend and frontend concurrently for the best development experience.

**Terminal 1: Backend**
```bash
cd server
npm run dev
```

**Terminal 2: Frontend (Web)**
```bash
cd frontend
npm run web
```

**Terminal 3: Frontend (Android)**
```bash
cd frontend
npm run android
```

---

## 📦 Building for Production

### Web Build
Generates a static web application in the `frontend/dist` directory.
```bash
cd frontend
npm run build:web
```

### Android Build (APK/AAB)
To generate a release build for Android:
```bash
cd frontend
npm run build:android
```
*Note: This requires a configured Android environment (local SDK or EAS Build).*


This is a production-ready Node.js/Express backend for a centralized ERP system. It handles a "Golden Path" workflow: CRM Lead → Sales Order → Warehouse Inventory Deduction.

## 🚀 Getting Started

### Prerequisites
- **Node.js**: v16 or higher
- **MySQL**: 8.0 or higher

### Setup Instructions
1. **Install Dependencies**: `npm install`
2. **Environment Configuration**: Create a `.env` file with `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, and `PORT`.
3. **Database Setup**: Ensure the database exists in MySQL.

### Database Management Commands
| Command | Action |
| :--- | :--- |
| `npm run db:sync` | Updates schema (`alter: true`). |
| `npm run db:sync:seed` | Updates schema and populates demo data. |
| `npm run db:force` | Drops and recreates all tables. |
| `npm run db:force:seed` | Resets DB and populates fresh demo data. |

---

## 🔐 Authentication & Authorization
The system uses a secure session-based approach:
1. **JWT Verification**: Validates the session token for every request.
2. **RBAC Middleware**: Decodes the JWT to identify the user and verifies their role directly against the MySQL database to ensure real-time permission enforcement.

| Header | Required | Description |
| :--- | :--- | :--- |
| `Authorization` | Yes | Bearer `<JWT_TOKEN>` obtained from the login endpoint. |

**Supported Roles**: `admin`, `sales`, `warehouse`


---

## 📡 API Reference

### 1. Authentication Module
#### `POST /api/auth/login`
Authenticates a user and returns a session token.
- **Payload**: `{"email": "...", "password": "..."}`
- **Returns**: `{"token": "...", "user": {"id", "name", "email", "role"}}`

---

### 2. CRM / Leads Module

#### Lead Schema

The lead object now carries full contact and qualification details.

| Field | Required | Type | Notes |
| :--- | :---: | :--- | :--- |
| `customer_name` | ✅ | String (150) | Full name of the contact person. |
| `phone` | ✅ | String (20) | Primary phone number. |
| `email` | ✅ | String (150) | Valid email address — format is server-validated. |
| `company` | ⬜ | String (150) | Company or business name. |
| `source` | ⬜ | Enum | How the lead was acquired. One of: `WALK_IN`, `REFERRAL`, `ONLINE`, `COLD_CALL`, `OTHER`. Defaults to `OTHER`. |
| `notes` | ⬜ | Text | Free-form notes about the lead. |
| `status` | ✅ | Enum | `NEW` (default) or `CONVERTED`. Set automatically — not sent on create. |
| `assigned_to` | ⬜ | UUID | Sales staff user ID. Can be set on create or via the `/assign` endpoint. |

---

#### `GET /api/leads`
Fetch leads with advanced filtering and pagination.
- **Allowed Roles**: `admin`, `sales`
- **Note (role-based)**: `sales` users only see leads assigned to them; `admin` sees all.

| Parameter | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `search` | String | - | Partial match across `customer_name`, `phone`, `email`, and `company`. |
| `status` | Enum | - | `NEW` or `CONVERTED`. |
| `limit` | Int | 10 | Pagination limit. |
| `offset` | Int | 0 | Pagination offset. |
| `startDate`/`endDate` | Date | - | Creation date filter (inclusive). |

**Response shape**:
```json
{
  "success": true,
  "data": [
    {
      "id": "UUID",
      "customer_name": "Jane Doe",
      "phone": "+91 98765 43210",
      "email": "jane@example.com",
      "company": "Acme Corp",
      "source": "REFERRAL",
      "notes": "Interested in bulk order.",
      "status": "NEW",
      "assigned_to": "UUID",
      "assignee": { "id": "UUID", "name": "...", "email": "...", "role": "sales" },
      "createdAt": "2026-05-15T..."
    }
  ],
  "meta": { "totalItems": 42, "limit": 10, "offset": 0 }
}
```

---

#### `POST /api/leads`
Create a new lead.
- **Allowed Roles**: `admin`, `sales`

**Payload**:
```json
{
  "customer_name": "Jane Doe",
  "phone": "+91 98765 43210",
  "email": "jane@example.com",
  "company": "Acme Corp",
  "source": "REFERRAL",
  "notes": "Optional free-form notes.",
  "assigned_to": "<SALES_USER_UUID>"
}
```

> `customer_name`, `phone`, and `email` are **required**. All other fields are optional.
> The server rejects invalid email formats and returns a `400` with an `errors` array listing all validation failures.

**Error response (400)**:
```json
{ "success": false, "errors": ["phone is required", "email format is invalid"] }
```

---

#### `GET /api/leads/export`
Export filtered leads to Excel (`.xlsx`).
- **Allowed Roles**: `admin`
- **Behavior**: Respects `search`, `status`, `startDate`, and `endDate`. Defaults to the **current month** if no dates are provided.

**Exported columns**: Lead ID, Customer Name, Phone, Email, Company, Source, Status, Assigned To, Notes, Created At.

---

#### `GET /api/leads/sales-staff`
Fetch a list of all sales team members.
- **Allowed Roles**: `admin`
- **Purpose**: Populates assignment dropdowns during lead creation or reassignment.
- **Parameters**: `search` (matches `name` or `email`)
- **Returns**: `[{"id": "UUID", "name": "...", "email": "...", "leads_count": 5, "orders_count": 2}]`

---

#### `PATCH /api/leads/:id/assign`
Reassign an existing lead to a different sales staff member.
- **Allowed Roles**: `admin`
- **Payload**: `{"assigned_to": "<SALES_USER_UUID>"}`
- **Behavior**: Atomically decrements the old assignee's `leads_count` and increments the new assignee's `leads_count`.

---

### 3. Sales / Orders Module
#### `POST /api/orders/convert`
**The Golden Path**: Converts a lead to an order with multiple products.
- **Allowed Roles**: `admin`, `sales`

**Example Payload**:
```json
{
  "leadId": "UUID",
  "items": [
    { "productId": "UUID", "quantity": 2 },
    { "productId": "UUID", "quantity": 1 }
  ]
}
```

#### `GET /api/sales`
Fetch orders with nested multi-item data and pagination.
- **Allowed Roles**: `admin`, `sales`

| Parameter | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `search` | String | - | Match on Customer Name or Product SKU. |
| `limit` | Int | 10 | Pagination limit. |
| `offset` | Int | 0 | Pagination offset. |
| `startDate`/`endDate` | Date | - | Order date filter. |

#### `GET /api/sales/:id`
Fetch details for a specific order.
- **Allowed Roles**: `admin`, `sales`
- **Returns**: Order data with nested `items`, `lead`, and `processor` details.

#### `GET /api/sales/stats`
Retrieves high-level performance metrics for the sales team.
- **Allowed Roles**: `admin`, `sales`
- **Returns**: Total revenue, total orders count, and average order value.

#### `GET /api/sales/export`
Generates an Excel report of orders.
- **Allowed Roles**: `admin`
- **Behavior**: Respects `search` and date filters. Defaults to the **Current Month** if no dates are provided.

---

### 4. Warehouse / Inventory Module
#### `GET /api/warehouse/inventory`
Public inventory list with search and pagination.

| Parameter | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `search` | String | - | Match on Product Name or SKU. |
| `limit` | Int | 10 | Pagination limit. |
| `offset` | Int | 0 | Pagination offset. |

#### `GET /api/warehouse/transactions` (Admin Only)
Full audit trail of all inventory movements.
- **Allowed Roles**: `admin`

| Parameter | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `search` | String | - | Match on Product Name or SKU. |
| `type` | Enum | - | `SALE`, `RESTOCK`, `INITIAL_STOCK`, or `ADJUSTMENT`. |
| `startDate`/`endDate` | Date | - | Transaction timestamp filter. |
| `limit`/`offset` | Int | 10 / 0 | Pagination. |

#### `GET /api/warehouse/transactions/export` (Admin Only)
Exports the full transaction audit trail to Excel.
- **Allowed Roles**: `admin`
- **Behavior**: Respects `search`, `type`, and date filters. Defaults to the **Current Month** if dates are omitted.

#### `POST /api/warehouse/restock`
- **Allowed Roles**: `admin`, `warehouse`
- **Payload**: `{"productId": "UUID", "amount": 10}`

#### `GET /api/warehouse/export`
Exports current inventory levels to Excel.
- **Allowed Roles**: `admin`
- **Behavior**: Respects filtering parameters. Defaults to the **Current Month** if dates are omitted.

| Parameter | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `search` | String | - | Match on Product Name or SKU. |
| `startDate`/`endDate` | Date | - | Filter products by creation date. |

---

### 5. Dashboard Module
#### `GET /api/dashboard`
Returns role-specific KPIs and performance rankings.

**Admin Metrics**:
- `totalRevenue`: Sum of all processed orders.
- `totalLeads` / `totalOrders`: Aggregate counts.
- `lowStockAlerts`: Count of products with stock < 10.
- `topSalesPerformance`: Top 5 sales users ranked by revenue, including conversion counts.
- `topSellingProducts`: Top 5 products by total quantity sold.

**Sales Metrics**:
- `myAssignedLeads`: Lead count for the authenticated user.
- `myProcessedOrders`: Order count for the authenticated user.
- `topPremiumProducts`: 5 highest priced products currently in stock.

**Warehouse Metrics**:
- `totalSKUs`: Total unique products in system.
- `criticalStockItems`: List of products with stock < 5.
- `transactionsToday`: Count of stock movements in the last 24h.
- `topMovingProducts`: Top 5 products by sales volume (total quantity sold).

---

### 6. System Health & Monitoring
#### `GET /health`
Returns real-time system, process, and database connectivity metrics.
- **Allowed Roles**: `admin`
- **Returns**: JSON object with Node process stats, hardware load, and MySQL status.

---


## ⚡ Performance & Scalability
- **Denormalized Counters**: `User` table stores `leads_count` and `orders_count` for O(1) stats.
- **Worker Threads**: Excel generation is offloaded to background threads.
- **CORS Enabled**: Configured to allow all origins for cross-platform development.
- **Logging**: Integrated **Morgan** for real-time API request monitoring.

## 🏗️ Project Structure
- `src/controllers/`: Business logic (Multi-item transactions, Filtering).
- `src/middleware/`: Secure RBAC using DB-verified roles.
- `src/models/`: Sequelize definitions (User, Lead, Product, Order, OrderItem).
- `src/workers/`: Offloaded CPU tasks (Excel generation).

## 📝 License
ISC
