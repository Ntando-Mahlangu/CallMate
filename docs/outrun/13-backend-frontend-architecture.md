OUTRUN V1 – BACKEND & FRONTEND ARCHITECTURE
________________________________________
OBJECTIVE
Build Outrun like a world-class SaaS product that can support millions of users, multiple AI agents, enterprise customers, and years of future development.
The codebase should prioritize:
Maintainability
Readability
Scalability
Performance
Security
Testability
Every architectural decision should reduce future technical debt.
________________________________________
RECOMMENDED TECHNOLOGY STACK
Frontend
Framework:
Next.js (App Router)
Language:
TypeScript
Styling:
Tailwind CSS
UI Components:
shadcn/ui
Icons:
Lucide
Animations:
Framer Motion
Forms:
React Hook Form
Validation:
Zod
State Management:
TanStack Query + Zustand
Charts:
Recharts
Markdown Rendering:
react-markdown
Code Highlighting:
Shiki
________________________________________
Backend
Runtime:
Node.js
Framework:
NestJS
Language:
TypeScript
Validation:
Zod
ORM:
Prisma
Authentication:
Better Auth or Auth.js
Background Jobs:
BullMQ
Queue:
Redis
File Storage:
AWS S3 compatible storage
Caching:
Redis
________________________________________
Database
Primary:
PostgreSQL
Search:
PostgreSQL Full Text Search initially
Future:
OpenSearch
________________________________________
AI Layer
The AI provider must be abstracted.
Never tightly couple business logic to a single AI provider.
Support:
Anthropic
OpenAI
Google
Future Local Models
Every provider should implement the same interface.
________________________________________
PROJECT STRUCTURE
apps/
web/
api/
packages/
ui/
database/
ai/
shared/
types/
config/
workers/
documentation/
tests/
scripts/
Every module should be reusable.
Avoid duplicated logic.
________________________________________
FRONTEND ARCHITECTURE
Organize pages by feature.
Example
Dashboard
Campaigns
Companies
Growth Blueprint
SEO
Settings
Billing
Authentication
Each feature owns:
Components
Hooks
Types
API Client
Validation
Utilities
Tests
________________________________________
COMPONENT RULES
Components must be:
Small
Reusable
Typed
Accessible
Testable
Never create components exceeding approximately 300 lines unless strongly justified.
Split complexity into smaller modules.
________________________________________
DESIGN SYSTEM
Centralize:
Buttons
Cards
Inputs
Dialogs
Tables
Navigation
Charts
Typography
Badges
Notifications
Progress Indicators
Every page should reuse the design system.
Never duplicate UI.
________________________________________
API LAYER
Every API route should include:
Validation
Authentication
Authorization
Logging
Error Handling
Typed Responses
Rate Limiting where appropriate
No business logic inside controllers.
Controllers coordinate.
Services perform work.
________________________________________
SERVICE LAYER
Each service has one responsibility.
Examples
Campaign Service
Lead Service
Growth Service
SEO Service
AI Service
Billing Service
Memory Service
Notification Service
Search Service
Website Service
Never create "God Services."
________________________________________
AI SERVICE
Create a provider abstraction.
Interface
Generate()
Summarize()
Embed()
Classify()
Reason()
Switching providers should require configuration changes rather than rewriting application code.
________________________________________
REPOSITORY LAYER
Database access should be isolated.
Controllers never query the database directly.
Services interact with repositories.
Repositories interact with Prisma.
________________________________________
ERROR HANDLING
Centralized.
Return structured errors.
Include:
Code
Message
Suggested Action
Correlation ID
Log unexpected failures.
Never expose stack traces.
________________________________________
LOGGING
Log:
Authentication
AI Requests
Campaign Launches
API Errors
Billing Events
Integrations
Background Jobs
Performance
Use structured logs.
________________________________________
BACKGROUND WORKERS
Dedicated workers handle:
Website Crawling
SEO Analysis
AI Generation
Lead Enrichment
Weekly Reviews
Campaign Preparation
Memory Indexing
Report Generation
Do not perform long-running tasks during API requests.
________________________________________
WEBSOCKETS
Support real-time updates.
Examples
Campaign Progress
AI Generation
Website Analysis
Notifications
Dashboard Refresh
Users should see live progress.
________________________________________
CACHING
Cache:
Dashboard
Growth Score
Recent AI Responses
Business Profile
Search Results
Invalidate intelligently.
Never cache sensitive user-specific data incorrectly.
________________________________________
PERFORMANCE
Lazy loading
Route-level code splitting
Image optimization
Streaming responses
Server Components where appropriate
Pagination
Virtualized lists
Optimistic UI updates
The application should feel responsive at all times.
________________________________________
ACCESSIBILITY
Meet WCAG standards where practical.
Support:
Keyboard Navigation
Screen Readers
Focus States
Semantic HTML
Color Contrast
Reduced Motion Preferences
Accessibility is a core feature.
________________________________________
INTERNATIONALIZATION
Prepare architecture for:
Multiple Languages
Multiple Currencies
Timezones
Localized Formatting
Even if English is the initial language.
________________________________________
SECURITY
Validate every request.
Sanitize inputs.
Escape outputs.
Protect against:
XSS
CSRF
SQL Injection
SSRF
Command Injection
Mass Assignment
Broken Authentication
Rate-limit sensitive endpoints.
________________________________________
TESTING
Every feature should include:
Unit Tests
Integration Tests
End-to-End Tests
AI Evaluation Tests
Accessibility Tests
Regression Tests
CI should prevent merging failing code.
________________________________________
CI/CD
Every pull request should run:
Linting
Type Checking
Tests
Security Checks
Build Validation
Deployment Preview
Nothing reaches production without passing automated validation.
________________________________________
DOCUMENTATION
Every major module should include:
Purpose
Responsibilities
Dependencies
Public Interfaces
Examples
Architecture Diagram (where helpful)
Documentation should remain synchronized with implementation.
________________________________________
FEATURE DEVELOPMENT WORKFLOW
Every new feature follows this order:
Requirements
UX Design
Database Changes
API Design
Backend Logic
Frontend Components
Testing
Documentation
Performance Review
Security Review
Never skip steps.
________________________________________
DEFINITION OF DONE
A feature is only complete if:
It works reliably.
It is secure.
It is tested.
It is documented.
It is responsive.
It is accessible.
It follows the design system.
It integrates with AI Memory where appropriate.
It performs well.
It is maintainable.
Working code alone is not considered complete.
________________________________________
FUTURE READINESS
The architecture should support:
Mobile App
Desktop App
Public API
Marketplace
Plugin System
Enterprise Features
Additional AI Agents
Voice Interfaces
Multi-region deployment
Without major restructuring.
________________________________________
SUCCESS METRIC
The architecture succeeds if another senior engineer can join the project, understand the system quickly, and confidently add new features without introducing unnecessary complexity or technical debt.
Every part of Outrun should feel intentionally engineered, consistent, and built for long-term evolution rather than short-term convenience.
