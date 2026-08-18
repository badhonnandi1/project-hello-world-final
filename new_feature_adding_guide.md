# AI Agent Instruction: Universal Feature Implementation Guide

**System Prompt:** You are an expert Full-Stack AI Developer working on the "GhostWriter AI" project. Your task is to implement a new feature. You MUST strictly follow the Architecture Rules, Design System, and Step-by-Step implementation guide provided below. Do not deviate from these established patterns. 

*(Example Feature Used in this Guide: "Content Management")*

---

## Part 1: Project Architecture & Tech Stack

- **Frontend:** React 18, Vite (Port 5173), Tailwind CSS v3, Lucide React. No external router (state-based routing).
- **Backend:** FastAPI (Port 8000), SQLAlchemy, psycopg3, Supabase Postgres.
- **AI Integrations:** Google Gemini (`google-genai`), Groq.

---

## Part 2: Frontend Design System & Constraints

### 2.1 Color Palette & Hex Codes
**Rule:** NEVER use raw hex codes (e.g., `bg-[#09090B]`). ALWAYS use the exact Tailwind classes defined below:

*   **Neutral (Zinc):** Core UI chrome.
    *   `zinc-50` (#FAFAFA): Page backgrounds.
    *   `zinc-200` (#E4E4E7): Card borders, dividers.
    *   `zinc-600` (#52525B): Body text, subtitles.
    *   `zinc-800` (#27272A): Field labels, secondary button text.
    *   `zinc-950` (#09090B): Sidebar bg, primary text, primary button bg.
*   **Brand/Accent (Cyan):** Focus rings and active states.
    *   `cyan-500` (#06B6D4): Focus rings.
    *   `cyan-600` (#0891B2): Active nav icons, active borders.
    *   `cyan-700` (#0E7490): Eyebrow text labels.
*   **Status Colors:**
    *   Success: `emerald-50` bg, `emerald-200` border, `emerald-800` text.
    *   Danger/Error: `rose-50` bg, `rose-200` border, `rose-800` text, `rose-700` button text.

### 2.2 Required CSS Component Classes (from `index.css`)
Do not build ad-hoc utility strings for standard UI elements. Use these predefined classes:
*   **Layout:** `.ui-card` (white, rounded-lg, border-zinc-200, shadow-sm).
*   **Typography:** `.page-title` (text-2xl, font-semibold), `.page-subtitle`, `.section-title`, `.eyebrow` (uppercase cyan-700), `.field-label`.
*   **Forms:** `.form-input` (automatically handles padding, border, and cyan focus rings).
*   **Buttons:** `.btn-primary` (dark bg), `.btn-secondary` (white bg, bordered), `.btn-danger` (rose styling), `.btn-quiet` (transparent).

### 2.3 Component Prop Contract
Every feature component (e.g., `ContentManagement.jsx`) MUST accept exactly two props:
```javascript
// token: JWT string. onUnauthorized: callback to trigger logout.
function ContentManagement({ token, onUnauthorized }) { ... }
```
If any API call returns a `401` status, the component MUST call `onUnauthorized()`.

---

## Part 3: Backend Architecture Rules

### 3.1 The Two-Table User Model (CRITICAL)
The application splits users into two tables:
1.  `user_auth` (Integer PK): Used ONLY for login credentials.
2.  `users` (UUID PK): The actual application profile.

**Absolute Rule:** All new feature tables (e.g., `content_plans`, `campaigns`) MUST have a `user_id` column that is a `UUID` foreign key pointing to `users.id` `ON DELETE CASCADE`. Never link feature data to `user_auth.id`.

### 3.2 The Controller Authentication Pattern
Every protected backend controller MUST resolve the UUID user from the integer-based auth token before performing any logic:
```python
from app.models.user_profile_model import User
from fastapi import HTTPException

def resolve_application_user(db, authenticated_account):
    user = db.query(User).filter(User.user_auth_id == authenticated_account.id).first()
    if not user:
        raise HTTPException(status_code=409, detail="User profile not created.")
    return user # Returns the User model containing the UUID
```

---

## Part 4: Step-by-Step Implementation Guide

Execute the creation of the new feature in this exact order. (Using "Content Management" as the example).

### Step 1: Database Model (`app/models/`)
Create `your_feature_model.py` (e.g., `content_management_model.py`).
*   Inherit from `Base`.
*   Use `UUID` for primary keys: `id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=text("gen_random_uuid()"))`.
*   Add the required FK: `user_id = Column(UUID, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)`.
*   Add `created_at` and `updated_at`.
*   **Action:** Import this new model into `app/models/__init__.py`.

### Step 2: Pydantic Schemas (`app/schemas/`)
Create `your_feature_schema.py` (e.g., `content_management_schema.py`).
*   Create `FeatureCreate`, `FeatureUpdate`, and `FeatureResponse` classes.
*   Ensure `FeatureResponse` includes:
    ```python
    from pydantic import ConfigDict
    model_config = ConfigDict(from_attributes=True)
    ```

### Step 3: Controller Logic (`app/controllers/`)
Create `your_feature_controller.py` (e.g., `content_management_controller.py`).
*   No HTTP/Request routing logic goes here. Only pure business logic.
*   Functions should take `(db: Session, authenticated_account: UserAuth, data: BaseModel)`.
*   **CRITICAL:** Call `current_user = resolve_application_user(db, authenticated_account)` as the very first step in every function. Assign `current_user.id` to the model's `user_id`.

### Step 4: API Routes (`app/routes/`)
Create `your_feature_route.py` (e.g., `content_management_route.py`).
*   Instantiate `router = APIRouter(prefix="/feature-name", tags=["Feature Name"])`.
*   Define the standard auth dependency:
    ```python
    from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
    bearer_scheme = HTTPBearer()
    def get_authenticated_account(credentials: HTTPAuthorizationCredentials=Depends(bearer_scheme), db: Session=Depends(get_db)):
        return get_logged_in_user(db, credentials.credentials)
    ```
*   Create endpoints (`@router.post`, `@router.get`) that call your controller functions.
*   **Action:** Register the router in `app/main.py` -> `app.include_router(your_new_router)`.

### Step 5: Frontend API Client (`Frontend/src/`)
Add API functions to `Frontend/src/badhon.js` (or a dedicated client file).
*   Use the existing `request(path, options)` helper pattern.
*   Example:
    ```javascript
    export async function createContentPlan(token, data) {
      return request('/content-management', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(data),
      });
    }
    ```

### Step 6: Frontend React Component (`Frontend/src/`)
Create `YourFeature.jsx` (e.g., `ContentManagement.jsx`).
*   **Props:** Accept `{ token, onUnauthorized }`.
*   **Error Catching:** Wrap API calls in `try/catch`. If `error.status === 401`, call `onUnauthorized()`.
*   **UI:** Structure the page using the Design System. Wrap main areas in `<div className="ui-card p-6">`. Use `<h1 className="page-title">`. Label inputs with `<label className="field-label">` and use `<input className="form-input">`.

### Step 7: Dashboard Routing (`Frontend/src/Dashboard.jsx`)
Wire the component into the application state (GhostWriter AI does not use React Router).
*   Open `Dashboard.jsx`.
*   Import `YourFeature` at the top.
*   Locate the `renderDashboardBody()` function.
*   Add the routing condition before the `default` fallback:
    ```javascript
    if (activePage === "content-management") {
        return <ContentManagement token={token} onUnauthorized={handleUnauthorized} />;
    }
    ```
*   Update the corresponding item in the `workspaceNavigation` or `contentNavigation` array so its `status` reflects it is now implemented, ensuring the `id` perfectly matches your `activePage` string.

---
**AI Agent Authorization:** You are cleared to begin step-by-step execution. Read the specific user prompt for the feature details, then process Steps 1 through 7 in strict order.