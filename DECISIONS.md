# Architecture & Business Logic Decisions

## 1. Authentication & State
- **Decision:** Use `next-auth` Credentials provider for MVP.
- **Reason:** Fast to implement without relying on external OAuth providers.
- **Security:** Roles are extracted from the JWT session on the server. Middlewares block page access; Server Actions validate roles before interacting with DB.

## 2. Server Actions for Mutations
- **Decision:** Use Next.js Server Actions (`src/app/actions`) instead of standard API routes for forms.
- **Reason:** Streamlines development for MVP, ensures fast form processing with built-in cache revalidation (`revalidatePath`), and removes need for complex client-side API fetching state.

## 3. Strict Server-Side Ownership
- **Decision:** Developer IDs are retrieved from `getServerSession()` during task creation and updates. They are NEVER accepted from client forms.
- **Reason:** Prevents Developer A from updating Developer B's tasks or manipulating history.

## 4. Centralized Calculation Service
- **Decision:** All metric calculations (`Delivery Delay`, `Start Delay`, `Effort Variance`, etc.) are housed in `src/services/calculations.ts`.
- **Reason:** Prevents UI calculation bugs. When a Task passes testing, the server action automatically determines the Delivery Delay using the pure functions in the calculation service.

## 5. UI Architecture
- **Decision:** Monolithic dashboard architecture using TailwindCSS and Lucide Icons.
- **Reason:** Requires minimal components and gives a SaaS feel out of the box while remaining easily manageable by a single developer.

## 6. Timezone Handling (ADR)
- **Decision:** Centralize date operations in `src/utils/date.ts` using `date-fns` and `date-fns-tz`.
- **Reason:** The business logic explicitly requires `Asia/Kolkata` evaluation for dates, especially regarding overdue status and display text. Native JS Dates evaluate timezone based on the underlying server OS, which causes drift in production.

## 7. Shared Dashboard Aggregations (ADR)
- **Decision:** Both PM and CEO dashboards invoke identically mapped service functions in `src/services/dashboardService.ts`.
- **Reason:** Prevents identical metric categories (e.g. "On-Time Completion Rate") from drifting apart due to separate Prisma query structures.

## 8. Dynamic Dashboard Developer Rendering (ADR)
- **Decision:** Hardcoded names are strictly banned. `getDynamicDeveloperPerformance()` queries `where: { role: 'DEVELOPER' }` and joins their tasks to compute averages and sums entirely dynamically.
- **Reason:** Allows the system to scale smoothly without manual UI intervention when developers join or leave the project team.
