# Persistent Chat Widget with History Sidebar - Implementation Plan

## Problem Statement

Current AI chat implementation loses conversation history on page refresh and is only accessible from the portfolio/analysis page. Users need:
1. Persistent conversation history across sessions
2. Ability to switch between past conversations
3. Global access from any page (floating widget)
4. Similar UX to OpenAI's ChatGPT interface

## Current Architecture

**Frontend:** `apps/client/src/app/pages/portfolio/analysis/ai-chat-panel/`
- Embedded in portfolio analysis page only
- Component state for messages (lost on refresh)
- localStorage: `gf_ai_chat_messages`, `gf_ai_chat_session_id`
- Max 200 messages in localStorage (recently added)

**Backend:** `apps/api/src/app/endpoints/ai/ai.controller.ts`
- `POST /ai/chat` - single conversation endpoint
- `POST /ai/chat/feedback` - feedback submission
- Redis memory: 10 turns, 24h TTL per session

**Limitations:**
- No cross-session persistence
- No database storage
- Single conversation only
- Page-scoped (not global)

## Solution Architecture

### Ticket-Ready Deliverables (Must Close Before Build)

- [ ] Define `POST /ai/chat` transition contract: request/response schema, compatibility window, and deprecation path.
- [ ] Harden Prisma design: role enum, composite conversation list index, and conversation-to-memory session mapping field.
- [ ] Define Redis lifecycle policy: keying, TTL behavior, memory rehydration behavior, and delete semantics.
- [ ] Add security test matrix: cross-user conversation access, ownership checks, and expected status codes (`403`/`404`).
- [ ] Define measurable performance SLOs and regression gates (p95 latency + pagination/query budgets).
- [ ] Define failure-mode behavior for DB/Redis outages, retry policy, and UI degraded-state signaling.
- [ ] Define API rate limits and `429` response contract for chat and conversation endpoints.
- [ ] Define search implementation details (fields, indexing strategy, query behavior).
- [ ] Define responsive UX specifications (desktop/tablet/mobile layout and collision behavior).

### Phase 1: Database Schema & Backend

#### 1.1 Prisma Schema Extensions

```prisma
// prisma/schema.prisma

model ChatConversation {
  id              String   @id @default(cuid())
  userId          String
  memorySessionId String   @unique
  title           String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  messages        ChatMessage[]
  user            User     @relation(fields: [userId], references: [id])

  @@index([userId, updatedAt])
  @@index([userId, createdAt])
}

model ChatMessage {
  id             String   @id @default(cuid())
  conversationId String
  role           ChatMessageRole
  content        String   @db.Text
  metadata       Json?    // Store response data (toolCalls, verification, etc.)
  createdAt      DateTime @default(now())
  conversation   ChatConversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)

  @@index([conversationId, createdAt])
}

enum ChatMessageRole {
  USER
  ASSISTANT
}
```

#### 1.2 Backend Changes

**New DTOs:** `apps/api/src/app/endpoints/ai/ai-chat-conversation.dto.ts`
```typescript
export class CreateConversationDto {
  title?: string;
}

export class UpdateConversationDto {
  title?: string;
}

export class ListConversationsQueryDto {
  limit?: number = 20;
  offset?: number = 0;
  search?: string;
}
```

**New Service:** `apps/api/src/app/endpoints/ai/ai-chat-conversation.service.ts`
- `createConversation(userId, title?)`
- `listConversations(userId, pagination)`
- `getConversation(id, userId)`
- `listMessages(conversationId, userId, pagination)`
- `deleteConversation(id, userId)`
- `updateConversation(id, data, userId)`

**Updated Controller:** `apps/api/src/app/endpoints/ai/ai.controller.ts`
```typescript
@Post('conversations')
createConversation(@Body() dto: CreateConversationDto)

@Get('conversations')
listConversations(@Query() query: ListConversationsQueryDto)

@Get('conversations/:id')
getConversation(@Param('id') id: string)

@Get('conversations/:id/messages')
listMessages(@Param('id') id: string, @Query() query: ListMessagesQueryDto)

@Delete('conversations/:id')
deleteConversation(@Param('id') id: string)

@Patch('conversations/:id')
updateConversation(@Param('id') id: string, @Body() dto: UpdateConversationDto)
```

**Transition Contract (Backward-Compatible):**
```typescript
// Existing endpoint stays active during migration window
@Post('chat')
chat(@Body() dto: AiChatDto & { conversationId?: string })
```

- Request accepts both `conversationId` and legacy `sessionId`.
- Resolution order: `conversationId` first, `sessionId` fallback, then create new conversation.
- Response includes `conversationId` and keeps `memory.sessionId` for compatibility with existing clients.
- Deprecation: `sessionId` request usage marked deprecated after widget rollout + one release cycle.

**Updated AI Service:** `apps/api/src/app/endpoints/ai/ai.service.ts`
- Resolve active conversation using transition contract (`conversationId` / `sessionId`)
- Auto-create conversation on first message if no conversation mapping exists
- Save all user/assistant messages to database after response completes
- Load recent conversation messages when resuming and rehydrate memory when Redis session expires
- Keep Redis memory isolated by user + memorySessionId to support safe conversation switching

#### 1.3 Redis Lifecycle Mapping

- Memory key format remains: `ai-agent-memory-${userId}-${memorySessionId}`
- `ChatConversation.memorySessionId` is the canonical mapping from conversation to Redis memory.
- Conversation delete flow removes:
  - `ChatConversation` row (cascade `ChatMessage`)
  - Redis key for `memorySessionId`
- Expired Redis memory triggers rehydration from last `N` persisted messages for that conversation.
- Redis TTL remains 24h for memory state; persisted DB history remains source of truth.

#### 1.4 Error Handling and Degraded Modes

- **DB unavailable on `POST /ai/chat`:**
  - Continue assistant response using Redis memory when available.
  - Return `historyPersistence: 'degraded'` in response metadata.
  - Queue unsaved message pair for retry with exponential backoff (`1s, 2s, 4s, 8s, 16s`, max 5 attempts).
  - Client shows non-blocking banner: `History sync delayed. Retrying.`
- **Redis unavailable on `POST /ai/chat`:**
  - Rebuild prompt context from last 10 persisted conversation messages in DB.
  - Return `memorySource: 'database_fallback'` in response metadata.
- **DB and Redis unavailable:**
  - Return `503 Service Unavailable` with `Retry-After`.
  - Keep current input in client draft box for user retry.
- **Network timeout from client to API:**
  - Show pending state (`Sending...`) for request timeout window.
  - Retry once automatically in background, then surface actionable error.

#### 1.5 Rate Limiting

- `POST /ai/conversations`: max **50 conversations per user/day**.
- `POST /ai/chat`: max **100 messages per conversation/hour** and **300 messages per user/hour**.
- `POST /ai/chat/feedback`: max **30 feedback events per user/hour**.
- Enforce at API layer and return `429` with payload:
  - `code: 'RATE_LIMIT_EXCEEDED'`
  - `scope: 'conversation' | 'user' | 'feedback'`
  - `retryAfterSeconds: number`

### Phase 2: Frontend Service

#### 2.1 New AI Chat Service

**File:** `apps/client/src/app/services/ai-chat.service.ts`

```typescript
@Injectable({ providedIn: 'root' })
export class AiChatService {
  private currentConversation$ = new BehaviorSubject<ChatConversation | null>(null);
  private conversations$ = new BehaviorSubject<ChatConversation[]>([]);

  // Conversation CRUD
  createConversation(title?: string): Observable<ChatConversation>
  loadConversations(pagination?: ListConversationsQuery): Observable<ChatConversation[]>
  loadConversation(id: string): Observable<ChatConversation>
  deleteConversation(id: string): Observable<void>
  updateConversation(id: string, data: UpdateConversationDto): Observable<ChatConversation>

  // Messages
  sendMessage(conversationId: string, query: string): Observable<AiAgentChatResponse>
  loadMessages(conversationId: string): Observable<AiChatMessage[]>

  // State
  getCurrentConversation(): Observable<ChatConversation | null>
  getConversations(): Observable<ChatConversation[]>
}
```

#### 2.2 Enhanced localStorage Structure

```typescript
interface ChatStorageState {
  currentConversationId: string;
  conversations: Array<{
    id: string;
    title?: string;
    lastUpdated: Date;
    messageCount: number;
  }>;
}
```

#### 2.3 Search Specification

- Search scope: conversation `title` + rolling preview text built from the first 3 user messages.
- Data model support:
  - Add `searchText` field on `ChatConversation`.
  - Update `searchText` when title changes or one of first 3 user messages changes.
- Query strategy:
  - PostgreSQL full-text search: `to_tsvector('english', searchText)` + `plainto_tsquery`.
  - Add `GIN` index via SQL migration for `searchText` vector expression.
- API behavior:
  - Debounce 300ms on client before query.
  - Return top 20 matches ordered by rank, then by `updatedAt DESC`.

### Phase 3: UI Components

#### 3.1 Global Chat Widget

**Location:** `apps/client/src/app/components/global/ai-chat-widget/`

**Files:**
- `ai-chat-widget.component.ts` - Main widget controller
- `ai-chat-widget.component.scss` - Fixed positioning styles
- `ai-chat-widget.component.html` - Template

**Key Features:**
```typescript
@Component({
  selector: 'gf-ai-chat-widget',
  template: `
    <button class="chat-toggle" (click)="toggleChat()">
      <mat-icon>chat</mat-icon>
    </button>

    <div class="chat-container" *ngIf="isOpen">
      <gf-ai-chat-sidebar
        [conversations]="conversations"
        (conversationSelected)="loadConversation($event)"
        (newChat)="startNewChat()"
      ></gf-ai-chat-sidebar>

      <gf-ai-chat-panel
        [conversationId]="currentConversationId"
        [messages]="messages"
        (messageSent)="handleMessage($event)"
      ></gf-ai-chat-panel>
    </div>
  `,
  styles: [`
    .chat-toggle {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 1000;
    }
    .chat-container {
      position: fixed;
      bottom: 80px;
      right: 24px;
      width: 800px;
      height: 600px;
      z-index: 1000;
    }
  `]
})
export class GfAiChatWidgetComponent {
  isOpen = false;
  conversations$ = this.aiChatService.getConversations();
  // ...
}
```

#### 3.2 Chat History Sidebar

**Location:** `apps/client/src/app/components/global/ai-chat-widget/ai-chat-sidebar/`

**Files:**
- `ai-chat-sidebar.component.ts`
- `ai-chat-sidebar.component.scss`
- `ai-chat-sidebar.component.html`

**Features:**
- List of conversations with titles
- Search/filter
- New chat button
- Delete conversation option
- Auto-generate titles from first message

#### 3.3 Responsive UX Specification

- **Desktop (`>= 1200px`)**:
  - Floating widget anchored bottom-right.
  - Container target width `800px`, height `600px`.
  - Sidebar default open.
- **Tablet (`768px - 1199px`)**:
  - Floating widget anchored bottom-right.
  - Container target width `600px`, height `70vh`.
  - Sidebar collapsible and closed by default.
- **Mobile (`< 768px`)**:
  - Full-screen modal overlay.
  - Slide-out sidebar with explicit back button.
  - Input composer fixed to bottom safe area.
- **Collision behavior**:
  - Widget offsets from existing floating action buttons.
  - Highest overlay z-index in app shell layer.
  - Escape key and backdrop click close behavior defined consistently.

### Phase 4: Migration & Integration

#### 4.1 Refactor Existing Chat Panel

**Current:** `apps/client/src/app/pages/portfolio/analysis/ai-chat-panel/ai-chat-panel.component.ts`

**Changes:**
- Remove localStorage logic (move to service)
- Use `AiChatService` for all operations
- Keep as embedded option in portfolio page
- Share service with global widget

#### 4.2 Global Integration

**File:** `apps/client/src/app/app.component.ts`

```typescript
@Component({
  selector: 'gf-root',
  template: `
    <router-outlet></router-outlet>
    <gf-ai-chat-widget></gf-ai-chat-widget>
  `
})
export class AppComponent {}
```

#### 4.3 Permission & Feature Flag

**Service:** Check user permissions before showing widget
```typescript
if (this.user.hasPermissionToReadAiPrompt) {
  showChatWidget = true;
}
```

## Implementation Order

### Week 0: Contract + Safety Baseline
1. Finalize `POST /ai/chat` compatibility contract (`conversationId`, legacy `sessionId`, response fields).
2. Finalize Redis lifecycle mapping and delete semantics.
3. Finalize Prisma enums/indexes and migration plan.
4. Finalize degraded-mode behavior for DB/Redis/network failure paths.
5. Finalize API rate-limit policy and `429` response payload contract.
6. Finalize search implementation spec and indexing plan.
7. Finalize responsive UX specs for desktop/tablet/mobile.
8. Define measurable SLOs and add regression gate placeholders.
9. Define security test matrix for ownership and cross-user access.

### Week 1: Backend Foundation
1. Add Prisma models + migration
2. Create conversation service
3. Add controller endpoints
4. Update AI service to persist messages
5. Write tests for conversation CRUD

### Week 2: Frontend Service
1. Create `AiChatService` with API integration
2. Migrate existing chat panel to use service
3. Add conversation loading/saving logic
4. Update localStorage structure
5. Test service in isolation

### Week 3: UI Components
1. Build chat sidebar component
2. Extract chat panel logic to shared component
3. Create global chat widget wrapper
4. Add to app component
5. Implement conversation switching
6. Polish UI (animations, responsive design)

## Acceptance Criteria

- [ ] Widget toggle button visible on all pages (with permission)
- [ ] Clicking toggle opens/closes floating chat window
- [ ] Sidebar shows list of past conversations (title + timestamp)
- [ ] Clicking conversation loads it from database
- [ ] "New chat" button clears and starts fresh conversation
- [ ] All conversations persist across page refreshes
- [ ] All conversations persist across browser sessions
- [ ] Conversations sync across devices (database-backed)
- [ ] Search/filter conversations by title
- [ ] Delete individual conversations
- [ ] Rename conversations
- [ ] Existing portfolio chat still works embedded
- [ ] `POST /ai/chat` remains backward-compatible for existing `sessionId` clients during transition
- [ ] Conversation endpoints enforce ownership checks (cross-user IDs blocked with `403`/`404`)
- [ ] Conversation list query uses indexed path and meets p95 target
- [ ] Conversation message load is paginated and meets p95 target
- [ ] Redis delete + rehydration behavior is deterministic and covered by tests
- [ ] DB and Redis failure modes follow documented degraded behavior and user-facing status messaging
- [ ] API rate limits enforced with deterministic `429` contract for each scoped limit
- [ ] Search returns ranked matches over title + first-message preview text
- [ ] Widget behavior matches desktop/tablet/mobile UX specification

## Testing Strategy

### Backend Tests
```typescript
// ai-chat-conversation.service.spec.ts
describe('AiChatConversationService', () => {
  it('should create conversation with auto-generated title');
  it('should list conversations for user');
  it('should paginate results');
  it('should delete conversation and cascade messages');
  it('should reject cross-user conversation access');
  it('should use memorySessionId mapping for Redis lifecycle');
});

// ai.controller.spec.ts
describe('AiController chat transition contract', () => {
  it('should accept conversationId on POST /ai/chat');
  it('should accept legacy sessionId on POST /ai/chat');
  it('should return conversationId and memory.sessionId in response');
  it('should return deterministic 429 payload when rate limits are exceeded');
});
```

### Frontend Tests
```typescript
// ai-chat.service.spec.ts
describe('AiChatService', () => {
  it('should sync with localStorage');
  it('should handle network errors gracefully');
  it('should cache conversations locally');
});

// ai-chat-widget.component.spec.ts
describe('GfAiChatWidgetComponent', () => {
  it('should toggle open/closed');
  it('should load conversation from service');
  it('should create new conversation');
});
```

### E2E Tests
- Create conversation → refresh → verify persists
- Switch between conversations → verify correct context
- Delete conversation → verify removed from list
- Search conversations → verify filtering
- Attempt to load another user's conversation ID → verify `403`/`404`
- Continue old `sessionId` chat flow after deploy → verify compatibility
- Expire Redis key for active conversation → verify memory rehydration from persisted messages
- Simulate DB write outage on send → verify degraded status + retry behavior
- Simulate Redis outage on send → verify DB-context fallback path
- Exceed per-conversation and per-user limits → verify `429` payload and retry timing
- Validate search ranking over title + first-message preview text
- Validate desktop/tablet/mobile widget layouts and sidebar behavior

### Manual Verification
- Send message in widget and embedded panel → latest message renders first (reverse chronological UI behavior).
- Rate assistant response after list reordering → feedback applies to the correct assistant message.
- Delete conversation and refresh page → conversation remains deleted and does not reappear.
- Force API timeout from browser devtools and verify pending + retry + actionable error messaging.

## Performance Targets (SLOs)

- Conversation list (`GET /ai/conversations`, limit 50): p95 API latency < 250ms (excluding network RTT).
- Message page load (`GET /ai/conversations/:id/messages`, limit 100): p95 API latency < 350ms.
- Chat send overhead from persistence layer (`POST /ai/chat`): additional p95 < 120ms over current baseline.
- Widget open to first message paint (cached list path): p95 < 400ms on desktop local benchmark.
- DB query budget:
  - List conversations: max 2 queries/request
  - Load messages page: max 2 queries/request
  - Send message persist path: max 4 queries/request

## Performance Strategies

- **localStorage caching**: Keep lightweight conversation summary cache locally.
- **Lazy loading**: Load messages on demand by conversation.
- **Pagination defaults**: 50 conversations, 100 messages per page.
- **Debounced search**: 300ms debounce before API search.
- **Optimistic UI**: Update local list immediately, reconcile with server response.
- **Backpressure**: Rate-limit enforcement protects API and LLM spend under burst traffic.
- **Degraded mode retries**: Background sync retries prevent data loss on transient failures.

## Migration Strategy

### Database Migration
```bash
# Create new tables
pnpm nx run api:prisma:migrate

# Backfill existing Redis sessions (optional)
# Script to load active Redis sessions into database
```

### Zero-Downtime Deployment
1. Deploy backend contract changes first (`conversationId` + legacy `sessionId` support).
2. Keep existing frontend on legacy `sessionId` flow.
3. Deploy frontend widget/service using conversation APIs.
4. Enable feature flag for a subset of users and monitor latency/error/security metrics.
5. Remove legacy `sessionId` client usage after one stable release cycle.

## Rollback Plan

If critical issues arise:
1. Frontend: Fall back to localStorage-only mode
2. Backend: Keep old endpoints functional
3. Feature flag: Disable global widget
4. Database: Keep existing data, revert schema changes

## Open Questions

1. Should we store message metadata (toolCalls, verification) in JSON or separate tables?
   - **Decision**: JSON for simplicity (RDBMS not optimal for sparse data)

2. Should we auto-generate conversation titles?
   - **Decision**: Yes, use first 50 chars of first user message

3. Should conversations be shareable (like ChatGPT)?
   - **Decision**: No, private-only for MVP

4. Max messages per conversation?
   - **Decision**: No limit (database), but lazy load last 100

5. Should we export conversations?
   - **Decision**: Future enhancement, not MVP

## Files to Create

1. `apps/api/src/app/endpoints/ai/ai-chat-conversation.dto.ts`
2. `apps/api/src/app/endpoints/ai/ai-chat-conversation.service.ts`
3. `apps/api/src/app/endpoints/ai/ai-chat-conversation.controller.ts`
4. `apps/client/src/app/services/ai-chat.service.ts`
5. `apps/client/src/app/components/global/ai-chat-widget/`
6. `apps/client/src/app/components/global/ai-chat-widget/ai-chat-widget.component.ts`
7. `apps/client/src/app/components/global/ai-chat-widget/ai-chat-sidebar/`

## Files to Modify

1. `prisma/schema.prisma`
2. `apps/api/src/app/endpoints/ai/ai.service.ts`
3. `apps/api/src/app/endpoints/ai/ai.controller.ts`
4. `apps/client/src/app/pages/portfolio/analysis/ai-chat-panel/ai-chat-panel.component.ts`
5. `apps/client/src/app/app.component.ts`

## Estimated Effort

- **Week 0 hardening**: 3-4 days
- **Backend implementation**: 4-6 days
- **Frontend service + search**: 4-5 days
- **UI components + responsive UX**: 4-6 days
- **Testing + stabilization**: 4-5 days

**Total**: ~19-26 days (4-5 weeks)

### Scope Control Option (If 3 Weeks Is Required)

- Keep transition contract, Redis mapping, security tests, and core SLOs.
- Defer full-text search to title-only search for MVP.
- Defer tablet-specific layout polish to post-MVP.

## Plan Confidence

- **Architecture confidence**: Medium-high (strong phase structure, explicit rollout, measurable SLOs).
- **Primary risks**: Transition contract drift and Redis lifecycle edge cases.
- **Risk control basis**: Ownership tests, compatibility tests, and perf/security gates in CI.

## Next Steps

1. Convert the five ticket-ready deliverables into Linear sub-tasks with owners.
2. Approve transition contract and Redis lifecycle spec before schema migration.
3. Implement Week 0 hardening items and merge behind feature flag.
4. Execute Week 1-3 phases with SLO/security gates active in CI.
5. Run rollout checklist and remove legacy `sessionId` path after stability window.
