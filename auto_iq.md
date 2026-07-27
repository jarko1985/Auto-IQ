# CLAUDE.md

## Project

**Working Name:** AutoIQ UAE  
**Product Type:** AI-powered vehicle diagnostics, spare-parts marketplace, garage booking, payments, and repair-order management platform.  
**Phase 1 Market:** United Arab Emirates  
**Vehicle Scope:** Cars, SUVs, light trucks, and heavy trucks  
**Primary Web Stack:** Next.js, TypeScript, Tailwind CSS, shadcn/ui, Prisma, PostgreSQL  
**Initial Hosting:** Vercel  
**Target Hosting:** AWS  
**AI Providers:** OpenAI primary, Anthropic Claude fallback  
**Architecture Style:** Modular monolith first, service-ready boundaries for later extraction  
**Primary Goal:** Build a production-ready MVP without overengineering, while preserving a clean migration path to AWS and independently deployable services.

---

# 1. Instructions for Claude Code

You are the principal software architect and senior full-stack engineer for this project.

Your job is to:

1. Design before implementing.
2. Prefer incremental, testable changes.
3. Preserve existing working code.
4. Never make broad refactors without explaining the impact.
5. Never silently change database contracts, API response shapes, authentication behavior, or business rules.
6. Use strict TypeScript.
7. Use server-side authorization for every protected action.
8. Treat AI responses as probabilistic recommendations, not definitive mechanical diagnoses.
9. Keep the product safe, auditable, and suitable for a UAE commercial launch.
10. Optimize for maintainability, clarity, and developer handoff.

Before changing code, always:

- inspect the relevant files;
- summarize the current implementation;
- identify dependencies;
- propose the smallest safe change;
- list expected files to create or modify;
- state database, API, security, and migration impacts.

After changing code, always:

- summarize what changed;
- list files changed;
- state how to test;
- state known limitations;
- state the recommended next step.

Do not:

- expose secrets in source code;
- place provider API keys in client components;
- trust client-provided user IDs, roles, prices, inventory, totals, or permissions;
- allow the LLM to directly perform database writes, payments, bookings, refunds, or inventory changes;
- claim that an AI diagnosis is medically or mechanically guaranteed;
- generate fake vehicle specifications, part compatibility data, or vendor availability;
- bypass validation for speed;
- use `any` unless there is a documented unavoidable reason.

---

# 2. Product Vision

AutoIQ UAE helps drivers and vehicle owners:

- describe vehicle symptoms;
- complete an intelligent diagnostic questionnaire;
- upload dashboard or damage images;
- receive ranked probable causes;
- understand severity and whether it is safe to continue driving;
- view estimated parts and labor ranges;
- locate vendors with compatible parts;
- locate garages that can provide the required service;
- book a garage or mobile mechanic;
- pay online;
- track a repair order;
- submit the actual repair outcome.

The platform also helps:

### Vendors

- manage spare-parts inventory;
- define compatibility;
- manage pricing and availability;
- receive customer orders;
- manage fulfillment.

### Garages

- manage services;
- receive appointments;
- create estimates;
- create and manage repair orders;
- assign mechanics;
- manage parts and labor;
- update job status;
- issue invoices;
- collect payment;
- capture final diagnosis and repair outcome.

### Administrators

- approve vendors and garages;
- manage vehicle and fault knowledge;
- moderate AI output quality;
- manage disputes and refunds;
- manage users and roles;
- review audit logs;
- monitor platform health and analytics.

---

# 3. Product Principles

1. **Safety first**  
   Critical symptoms must trigger clear stop-driving guidance and emergency recommendations.

2. **Probabilities, not certainty**  
   Return ranked causes with confidence levels and supporting evidence.

3. **Structured data before free text**  
   Diagnostic sessions must capture normalized answers, not only chat transcripts.

4. **Human confirmation**  
   Final diagnosis should be confirmed by a qualified garage or mechanic.

5. **Explainability**  
   Every recommendation should show the symptoms, codes, or evidence that influenced it.

6. **Marketplace integrity**  
   Inventory, price, compatibility, and garage availability must come from verified platform data.

7. **Learning from outcomes**  
   The platform improves using verified repair outcomes, not by allowing the model to retrain itself directly from unreviewed user text.

8. **UAE-first localization**  
   Support AED, kilometers, UAE phone formats, UAE addresses, English and Arabic readiness, and UAE payment providers.

---

# 4. Recommended Technical Stack

## Core

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui
- React Hook Form
- Zod
- Prisma ORM
- PostgreSQL
- Auth.js / NextAuth
- TanStack Query where client caching is required
- Zustand only for small temporary UI state
- Server Actions for trusted same-app mutations where appropriate
- Route Handlers for public, mobile-ready, webhook, or third-party APIs
- Vitest
- React Testing Library
- Playwright
- ESLint
- Prettier

## AI

- OpenAI Responses API as primary
- Anthropic Messages API as fallback
- Provider abstraction in application code
- RAG over approved automotive documents
- pgvector for MVP
- OpenSearch vector engine after AWS migration if justified
- structured JSON outputs validated with Zod
- explicit confidence and evidence model
- offline evaluation dataset
- prompt versioning

## Payments

Abstract the payment gateway.

Preferred evaluation order for UAE launch:

1. Stripe, where the merchant setup and required flows are supported
2. Checkout.com
3. Network International
4. Amazon Payment Services

Never hardcode payment logic to a single provider.

## Storage

### MVP

- PostgreSQL
- S3-compatible object storage or Vercel-compatible managed storage
- background job provider selected explicitly before implementation

### AWS Target

- ECS Fargate
- Application Load Balancer
- RDS PostgreSQL
- ElastiCache for Valkey
- S3
- CloudFront
- AWS WAF
- Secrets Manager
- CloudWatch
- ECR
- OpenSearch when required
- SQS for jobs
- SES or approved email provider
- SNS or approved SMS provider

---

# 5. Architecture Rules

Use a modular monolith with explicit domain boundaries.

Recommended domains:

- identity
- users
- organizations
- vehicles
- diagnostics
- automotive-knowledge
- ai-orchestration
- vendors
- inventory
- catalog
- garages
- services
- bookings
- repair-orders
- orders
- payments
- invoices
- reviews
- notifications
- media
- admin
- analytics
- audit

Each domain should contain:

- schema or DTOs;
- service layer;
- repository or Prisma access layer where useful;
- authorization rules;
- tests;
- event definitions where relevant.

Do not put all business logic inside:

- React components;
- route handlers;
- server actions;
- Prisma hooks;
- AI prompts.

Use this dependency direction:

```text
UI
  -> application services
      -> domain rules
          -> repositories and external adapters
```

External providers must be behind interfaces:

```text
AIProvider
PaymentProvider
EmailProvider
SmsProvider
StorageProvider
MapsProvider
SearchProvider
```

---

# 6. Repository Structure

Start with a single Next.js application and shared packages only where they create real value.

```text
autoiq/
├─ app/
│  ├─ [locale]/
│  │  ├─ (public)/
│  │  ├─ (auth)/
│  │  ├─ dashboard/
│  │  ├─ vendor/
│  │  ├─ garage/
│  │  └─ admin/
│  ├─ api/
│  │  └─ v1/
│  └─ layout.tsx
├─ components/
│  ├─ ui/
│  ├─ forms/
│  ├─ diagnostics/
│  ├─ vehicles/
│  ├─ marketplace/
│  ├─ vendor/
│  ├─ garage/
│  └─ admin/
├─ features/
│  ├─ auth/
│  ├─ users/
│  ├─ organizations/
│  ├─ vehicles/
│  ├─ diagnostics/
│  ├─ automotive-knowledge/
│  ├─ ai/
│  ├─ vendors/
│  ├─ inventory/
│  ├─ garages/
│  ├─ bookings/
│  ├─ repair-orders/
│  ├─ payments/
│  ├─ notifications/
│  └─ audit/
├─ lib/
│  ├─ auth/
│  ├─ db/
│  ├─ ai/
│  ├─ payments/
│  ├─ storage/
│  ├─ validation/
│  ├─ security/
│  ├─ observability/
│  └─ utils/
├─ prisma/
│  ├─ schema.prisma
│  ├─ migrations/
│  └─ seed.ts
├─ public/
├─ tests/
│  ├─ unit/
│  ├─ integration/
│  ├─ e2e/
│  └─ fixtures/
├─ docs/
│  ├─ architecture/
│  ├─ api/
│  ├─ adr/
│  ├─ prompts/
│  └─ runbooks/
├─ scripts/
├─ .github/
│  └─ workflows/
├─ CLAUDE.md
├─ README.md
└─ package.json
```

Extract to a monorepo only when at least one of these becomes true:

- a separate worker must be deployed independently;
- the admin portal requires a separate release lifecycle;
- a mobile application is added;
- shared packages are being duplicated;
- background processing becomes operationally independent.

---

# 7. Core User Roles

Use RBAC with organization-aware permissions.

Initial roles:

- CUSTOMER
- VENDOR_OWNER
- VENDOR_STAFF
- GARAGE_OWNER
- GARAGE_MANAGER
- MECHANIC
- SUPPORT_AGENT
- CONTENT_MANAGER
- ADMIN
- SUPER_ADMIN

Do not rely only on a single `role` column for business authorization.

Use:

- users;
- organizations;
- organization_memberships;
- roles;
- permissions;
- role_permissions;
- membership_roles.

Every protected action must verify:

1. authentication;
2. organization membership where applicable;
3. role and permission;
4. ownership or assigned scope;
5. resource state.

---

# 8. Main Product Workflows

## 8.1 Customer Diagnostic Workflow

```text
Create account or continue as limited guest
-> add/select vehicle
-> choose symptom category
-> describe issue by text or voice
-> answer structured questions
-> optionally add OBD code
-> optionally upload image
-> AI retrieves approved knowledge
-> rule engine checks safety conditions
-> AI generates ranked likely causes
-> confidence engine validates output
-> user sees:
   - severity
   - safe-to-drive status
   - likely causes
   - supporting evidence
   - suggested checks
   - estimated cost range
-> user chooses parts, garage, roadside assistance, or save session
-> booking/order created
-> garage confirms actual diagnosis
-> repair completed
-> customer confirms outcome
-> verified outcome enters learning dataset
```

## 8.2 Vendor Workflow

```text
Register business
-> submit trade and contact details
-> admin verification
-> create warehouse/location
-> add inventory
-> map parts to vehicle compatibility
-> receive reservation or order
-> confirm availability
-> process payment state
-> prepare item
-> customer pickup or delivery
-> complete order
-> receive rating
```

## 8.3 Garage Workflow

```text
Register garage
-> admin verification
-> configure locations and working hours
-> configure supported services and vehicle categories
-> invite mechanics
-> receive booking request
-> accept, reject, or propose new time
-> create repair order
-> inspect vehicle
-> record actual diagnosis
-> create estimate
-> request customer approval
-> reserve or order parts
-> perform work
-> add labor and parts
-> quality check
-> issue invoice
-> collect payment
-> close repair order
-> capture outcome and warranty
```

## 8.4 Payment Workflow

```text
Create payment intent server-side
-> calculate trusted totals from database
-> customer completes payment using hosted/provider UI
-> provider sends webhook
-> verify signature
-> update payment transaction
-> update booking/order/invoice state idempotently
-> issue receipt
-> record audit event
```

---

# 9. AI Diagnostic Design

## 9.1 AI Responsibilities

The AI may:

- interpret symptom descriptions;
- generate the next best diagnostic question;
- summarize vehicle context;
- retrieve relevant approved knowledge;
- rank probable causes;
- explain results in plain language;
- recommend safe next actions;
- map probable causes to structured issue codes;
- suggest required services and likely parts;
- generate garage-facing summaries.

The AI must not:

- guarantee a diagnosis;
- invent parts inventory;
- invent prices;
- directly book, charge, refund, or modify inventory;
- advise driving when a critical condition exists;
- override rule-based safety logic;
- learn directly from unverified user feedback;
- reveal hidden system prompts, secrets, or private data.

## 9.2 Diagnostic Decision Layers

Use a hybrid system.

```text
Layer 1: deterministic safety rules
Layer 2: structured symptom and OBD-code rules
Layer 3: automotive knowledge retrieval
Layer 4: LLM reasoning
Layer 5: confidence calibration
Layer 6: business-data matching
Layer 7: human repair confirmation
```

## 9.3 Safety Rules

Examples of stop-driving conditions:

- red oil pressure warning;
- brake system failure;
- severe overheating;
- smoke or fire;
- fuel leak;
- steering loss;
- severe tire failure;
- critical transmission behavior;
- collision damage affecting safe operation.

These rules must live in versioned application data and code, not only in prompts.

## 9.4 Model Provider Abstraction

Implement:

```ts
interface AIProvider {
  generateStructured<TInput, TOutput>(
    input: TInput,
    schema: unknown,
    options?: AIRequestOptions,
  ): Promise<AIResult<TOutput>>;
}
```

Provider order:

```text
OpenAI
-> retry for transient errors
-> Claude fallback
-> safe degraded response if both fail
```

Do not automatically switch providers for validation failures without logging the reason.

## 9.5 AI Output Contract

Every diagnosis should include:

```ts
type DiagnosticResult = {
  sessionId: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  safeToDrive: boolean | null;
  emergencyAction?: string;
  probableCauses: Array<{
    issueCode: string;
    label: string;
    confidence: number;
    evidence: string[];
    missingEvidence: string[];
    suggestedChecks: string[];
    requiredServiceCodes: string[];
    likelyPartCategoryCodes: string[];
  }>;
  limitations: string[];
  modelMetadata: {
    provider: string;
    model: string;
    promptVersion: string;
    knowledgeDocumentIds: string[];
  };
};
```

Validate all AI outputs with Zod.

Reject:

- invalid confidence totals;
- unknown issue codes;
- unsupported service codes;
- unsupported part categories;
- unrecognized severity values;
- untrusted URLs;
- executable content.

## 9.6 Learning Strategy

Do not claim live autonomous learning.

Use this controlled workflow:

```text
diagnostic session
-> AI recommendation
-> garage actual diagnosis
-> parts used
-> repair action
-> repair outcome
-> customer confirmation
-> quality review
-> approved training/evaluation record
```

Use verified outcomes to:

- improve retrieval;
- adjust question ordering;
- calibrate confidence;
- evaluate prompts;
- train classical ranking models;
- create fine-tuning datasets later.

Initial ML candidates after enough verified data:

- XGBoost;
- LightGBM;
- logistic regression;
- calibrated classification;
- learning-to-rank.

---

# 10. Initial Data Model

The Prisma schema should begin with these domains.

## Identity and Organizations

- User
- Account
- Session
- VerificationToken
- Organization
- OrganizationMembership
- Role
- Permission
- MembershipRole
- Address

## Vehicles

- VehicleMake
- VehicleModel
- VehicleTrim
- EngineVariant
- Vehicle
- VehicleDocument
- ServiceRecord
- OBDDevice
- OBDReading

## Diagnostics

- DiagnosticSession
- DiagnosticMessage
- DiagnosticQuestion
- DiagnosticAnswer
- DiagnosticResult
- DiagnosticCause
- DiagnosticEvidence
- DiagnosticAttachment
- DiagnosticFeedback
- VerifiedRepairOutcome

## Automotive Knowledge

- Symptom
- SymptomCategory
- FaultIssue
- DiagnosticRule
- RepairGuide
- RepairStep
- ServiceBulletin
- KnowledgeDocument
- KnowledgeChunk
- PromptTemplate
- PromptVersion
- ModelEvaluation

## Parts and Vendors

- PartCategory
- Part
- PartCompatibility
- Vendor
- VendorLocation
- InventoryItem
- InventoryReservation
- VendorOrder
- VendorOrderItem

## Garages

- Garage
- GarageLocation
- GarageService
- GarageVehicleCapability
- MechanicProfile
- WorkingHours
- Appointment
- RepairOrder
- RepairOrderStatusHistory
- RepairEstimate
- RepairEstimateLine
- RepairJob
- RepairPart
- LaborEntry
- Inspection
- Warranty

## Commerce

- Cart
- CartItem
- Invoice
- InvoiceLine
- Payment
- PaymentTransaction
- Refund
- Payout
- CommissionRule
- Coupon

## Platform

- Notification
- NotificationPreference
- Review
- Dispute
- AuditLog
- MediaAsset
- WebhookEvent
- OutboxEvent
- IdempotencyKey
- FeatureFlag

---

# 11. Database Conventions

Use PostgreSQL UUIDs.

Every business entity should normally include:

```text
id
createdAt
updatedAt
deletedAt where soft deletion is justified
version where optimistic locking is needed
```

Rules:

- use UTC timestamps;
- do not store money as floating-point;
- store monetary values as integer minor units;
- store currency explicitly;
- use unique constraints for externally visible identifiers;
- use partial or composite indexes based on actual query paths;
- prevent duplicate webhook processing;
- use database transactions for multi-record financial and inventory operations;
- use explicit status enums;
- preserve status history for bookings, orders, repairs, and payments;
- never delete financial records;
- never overwrite repair outcomes without audit history.

---

# 12. API Conventions

Base path:

```text
/api/v1
```

Use JSON.

Success format:

```json
{
  "data": {},
  "meta": {}
}
```

Error format:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request contains invalid data.",
    "details": [],
    "requestId": "..."
  }
}
```

Use:

- Zod request validation;
- server-side authorization;
- idempotency keys for payments, orders, and bookings;
- cursor pagination;
- ISO 8601 UTC timestamps;
- consistent error codes;
- request IDs;
- rate limiting.

Initial endpoint groups:

```text
/auth
/users
/organizations
/vehicles
/diagnostics
/vendors
/parts
/inventory
/garages
/services
/appointments
/repair-orders
/estimates
/orders
/invoices
/payments
/reviews
/notifications
/admin
/webhooks
```

---

# 13. Initial API Roadmap

## Authentication

```text
POST /api/v1/auth/register
POST /api/v1/auth/phone/request-otp
POST /api/v1/auth/phone/verify-otp
GET  /api/v1/auth/session
POST /api/v1/auth/logout
```

## Vehicles

```text
GET    /api/v1/vehicles
POST   /api/v1/vehicles
GET    /api/v1/vehicles/:vehicleId
PATCH  /api/v1/vehicles/:vehicleId
DELETE /api/v1/vehicles/:vehicleId
GET    /api/v1/vehicle-catalog/makes
GET    /api/v1/vehicle-catalog/models
GET    /api/v1/vehicle-catalog/trims
```

## Diagnostics

```text
POST /api/v1/diagnostics
GET  /api/v1/diagnostics/:sessionId
POST /api/v1/diagnostics/:sessionId/messages
POST /api/v1/diagnostics/:sessionId/answers
POST /api/v1/diagnostics/:sessionId/attachments
POST /api/v1/diagnostics/:sessionId/analyze
GET  /api/v1/diagnostics/:sessionId/results
POST /api/v1/diagnostics/:sessionId/feedback
```

## Marketplace

```text
GET  /api/v1/parts/search
GET  /api/v1/vendors/search
GET  /api/v1/garages/search
POST /api/v1/inventory/reservations
POST /api/v1/vendor-orders
POST /api/v1/appointments
```

## Repair Management

```text
POST  /api/v1/repair-orders
GET   /api/v1/repair-orders/:repairOrderId
PATCH /api/v1/repair-orders/:repairOrderId/status
POST  /api/v1/repair-orders/:repairOrderId/inspections
POST  /api/v1/repair-orders/:repairOrderId/estimates
POST  /api/v1/repair-orders/:repairOrderId/estimate-approval
POST  /api/v1/repair-orders/:repairOrderId/jobs
POST  /api/v1/repair-orders/:repairOrderId/parts
POST  /api/v1/repair-orders/:repairOrderId/complete
```

## Payments

```text
POST /api/v1/payments/intents
GET  /api/v1/payments/:paymentId
POST /api/v1/refunds
POST /api/v1/webhooks/payments/:provider
```

---

# 14. UI Routes

## Public

```text
/
about
how-it-works
vendors
garages
pricing
safety
terms
privacy
```

## Customer

```text
/dashboard
/dashboard/vehicles
/dashboard/vehicles/new
/dashboard/diagnostics
/dashboard/diagnostics/new
/dashboard/diagnostics/[id]
/dashboard/bookings
/dashboard/orders
/dashboard/repair-orders
/dashboard/payments
/dashboard/profile
```

## Vendor

```text
/vendor
/vendor/inventory
/vendor/inventory/new
/vendor/orders
/vendor/locations
/vendor/staff
/vendor/settings
```

## Garage

```text
/garage
/garage/calendar
/garage/appointments
/garage/repair-orders
/garage/repair-orders/[id]
/garage/mechanics
/garage/services
/garage/invoices
/garage/settings
```

## Admin

```text
/admin
/admin/users
/admin/vendors
/admin/garages
/admin/vehicle-catalog
/admin/knowledge
/admin/diagnostics
/admin/ai-evaluations
/admin/payments
/admin/disputes
/admin/audit
/admin/feature-flags
```

---

# 15. Phased Implementation Roadmap

## Phase 0 — Foundation

Goal: establish a reliable engineering base.

Deliverables:

- Next.js application;
- TypeScript strict mode;
- Tailwind and shadcn/ui;
- linting and formatting;
- environment validation;
- Prisma and PostgreSQL;
- Auth.js;
- structured logging;
- error handling;
- feature flags;
- audit framework;
- GitHub Actions;
- unit and E2E test setup;
- initial documentation.

Exit criteria:

- app deploys to Vercel;
- database migrations run safely;
- authentication works;
- CI blocks broken builds;
- protected routes enforce authorization.

## Phase 1 — Customer and Vehicle Foundation

Deliverables:

- customer profile;
- UAE address model;
- vehicle catalog;
- vehicle registration;
- vehicle documents;
- service history;
- dashboard;
- basic notifications.

Exit criteria:

- customer can register;
- customer can add and manage vehicles;
- administrators can manage vehicle catalog data.

## Phase 2 — Diagnostic MVP

Deliverables:

- diagnostic session lifecycle;
- structured symptom categories;
- dynamic questionnaire;
- free-text symptom input;
- OpenAI provider;
- Claude fallback;
- provider abstraction;
- approved knowledge ingestion;
- pgvector retrieval;
- rule-based safety checks;
- ranked probable causes;
- confidence display;
- diagnostic history;
- user feedback.

Exit criteria:

- a user can complete an end-to-end diagnostic session;
- outputs are structured and validated;
- critical safety rules override model output;
- provider fallback is tested;
- AI logs contain no prohibited secrets.

## Phase 3 — Vendor Inventory

Deliverables:

- vendor onboarding;
- admin verification;
- locations;
- parts catalog;
- vehicle compatibility;
- inventory;
- price;
- stock;
- reservations;
- vendor order flow.

Exit criteria:

- verified vendors can manage stock;
- customers can find compatible parts;
- reservations prevent overselling;
- inventory changes are audited.

## Phase 4 — Garage Booking and Repair Orders

Deliverables:

- garage onboarding;
- service catalog;
- vehicle capabilities;
- working hours;
- appointments;
- estimates;
- repair orders;
- mechanic assignment;
- inspections;
- jobs;
- labor;
- parts;
- invoices;
- status tracking;
- final diagnosis;
- warranty.

Exit criteria:

- customer can book a garage;
- garage can complete the full repair lifecycle;
- customer must approve estimates;
- final outcome is captured.

## Phase 5 — Payments and Monetization

Deliverables:

- payment provider abstraction;
- checkout;
- payment intents;
- webhooks;
- invoices;
- refunds;
- commissions;
- subscriptions;
- featured listings;
- vendor and garage billing.

Exit criteria:

- no client-generated totals are trusted;
- webhook handling is idempotent;
- refunds and payment failures are auditable;
- commission calculations are tested.

## Phase 6 — Intelligence Improvements

Deliverables:

- image upload and dashboard-light analysis;
- voice input;
- OBD code input;
- OBD device integration research;
- confidence calibration;
- evaluation dashboard;
- verified repair dataset;
- question-ranking optimization;
- cost-estimation model.

Exit criteria:

- AI evaluation scores are measurable;
- prompt versions are traceable;
- verified outcomes are separated from unverified feedback.

## Phase 7 — AWS Migration

Deliverables:

- containerization;
- ECR;
- ECS Fargate;
- ALB;
- RDS PostgreSQL;
- Valkey;
- S3;
- SQS;
- CloudFront;
- WAF;
- Secrets Manager;
- CloudWatch;
- infrastructure as code;
- backup and recovery procedures;
- blue/green or rolling deployment;
- migration runbook.

Exit criteria:

- production traffic can be moved safely;
- rollback is tested;
- backups are tested;
- monitoring and alarms are active.

---

# 16. Sprint Roadmap

Use two-week sprints.

## Sprint 0 — Project Bootstrap

- initialize Next.js;
- configure strict TypeScript;
- add Tailwind and shadcn/ui;
- configure ESLint and Prettier;
- configure Vitest and Playwright;
- configure environment schema;
- add Prisma;
- add PostgreSQL;
- add base CI;
- create architecture decision records;
- create application shell.

## Sprint 1 — Authentication and Authorization

- Auth.js;
- email and password;
- Google;
- Apple placeholder/configuration;
- phone OTP provider abstraction;
- users;
- sessions;
- organizations;
- memberships;
- RBAC;
- protected layouts;
- audit login events.

## Sprint 2 — Vehicle Catalog and Customer Vehicles

- makes;
- models;
- trims;
- engine variants;
- vehicle CRUD;
- VIN and plate validation;
- service history;
- document upload;
- customer dashboard.

## Sprint 3 — Diagnostic Session Foundation

- diagnostic session schema;
- symptom categories;
- question and answer model;
- wizard UI;
- session persistence;
- resume session;
- rule-based safety checks.

## Sprint 4 — AI Orchestration

- AI provider interface;
- OpenAI adapter;
- Claude adapter;
- structured output;
- prompt versioning;
- retry and fallback;
- AI audit metadata;
- test fixtures;
- mocked provider tests.

## Sprint 5 — Knowledge Base and RAG

- document ingestion;
- chunking;
- embeddings;
- pgvector;
- retrieval;
- citations;
- knowledge admin;
- re-index flow;
- retrieval tests.

## Sprint 6 — Diagnostic Results

- ranked causes;
- confidence;
- severity;
- safe-to-drive;
- suggested checks;
- cost-range placeholder;
- service and part-category mapping;
- diagnostic history;
- customer feedback.

## Sprint 7 — Vendor Onboarding

- vendor profile;
- documents;
- admin approval;
- locations;
- staff;
- vendor dashboard.

## Sprint 8 — Parts and Inventory

- parts catalog;
- compatibility;
- inventory;
- pricing;
- stock adjustment;
- reservation;
- vendor orders;
- inventory audit.

## Sprint 9 — Garage Onboarding and Services

- garage profile;
- approval;
- locations;
- services;
- capabilities;
- hours;
- mechanics;
- garage dashboard.

## Sprint 10 — Booking

- garage search;
- availability;
- appointments;
- acceptance and rejection;
- rescheduling;
- notifications;
- customer booking history.

## Sprint 11 — Repair Orders

- repair order;
- inspection;
- actual diagnosis;
- estimate;
- customer approval;
- jobs;
- parts;
- labor;
- status history;
- completion;
- warranty.

## Sprint 12 — Payments

- payment abstraction;
- selected gateway adapter;
- payment intent;
- webhook;
- invoice;
- refund;
- commission;
- idempotency;
- payment tests.

## Sprint 13 — Admin and Operations

- user moderation;
- vendor and garage moderation;
- diagnostic monitoring;
- prompt management;
- disputes;
- refunds;
- audit viewer;
- operational dashboard.

## Sprint 14 — Hardening and Launch

- security review;
- accessibility;
- performance;
- load tests;
- E2E regression;
- backup validation;
- privacy and terms;
- support runbooks;
- production launch checklist.

---

# 17. Prompt Library for Claude Code

Use these prompts one at a time. Do not ask Claude to build the entire application in a single prompt.

## Prompt 01 — Architecture Bootstrap

```text
Read CLAUDE.md completely.

Act as the principal architect for AutoIQ UAE.

Inspect the current repository and produce:

1. current-state summary;
2. recommended application architecture;
3. dependency decisions;
4. proposed folder structure;
5. environment-variable plan;
6. initial database domains;
7. security risks;
8. implementation order for Sprint 0.

Do not write code yet.

Use the existing repository where possible. Identify any conflict between the repository and CLAUDE.md.
```

## Prompt 02 — Bootstrap the Next.js Application

```text
Read CLAUDE.md and the current repository.

Implement Sprint 0 only.

Requirements:

- Next.js App Router;
- strict TypeScript;
- Tailwind CSS;
- shadcn/ui;
- ESLint;
- Prettier;
- environment validation using Zod;
- base application shell;
- centralized error handling;
- structured logger;
- Vitest;
- React Testing Library;
- Playwright;
- health endpoint;
- GitHub Actions for lint, type-check, unit tests, build, and E2E smoke test.

Before coding, list files to create or modify.
After coding, provide test commands and known limitations.
```

## Prompt 03 — Design the Initial Prisma Schema

```text
Read CLAUDE.md.

Design the initial Prisma schema for Phase 0 and Phase 1 only.

Include:

- User;
- Auth.js compatibility models;
- Organization;
- OrganizationMembership;
- Role;
- Permission;
- Address;
- VehicleMake;
- VehicleModel;
- VehicleTrim;
- EngineVariant;
- Vehicle;
- VehicleDocument;
- ServiceRecord;
- AuditLog.

Requirements:

- PostgreSQL;
- UUIDs;
- correct indexes;
- unique constraints;
- UTC timestamps;
- soft deletion only where justified;
- organization-aware authorization;
- no premature marketplace or payment tables.

First provide the proposed ERD and design decisions.
Then implement the schema, migration, and seed data.
```

## Prompt 04 — Authentication and RBAC

```text
Read CLAUDE.md and inspect the current auth implementation.

Implement Sprint 1.

Support:

- email/password;
- Google;
- Apple-ready provider configuration;
- phone OTP provider abstraction;
- Auth.js sessions;
- account linking safeguards;
- email verification;
- password reset;
- organization membership;
- RBAC;
- route protection;
- server-side permission checks;
- login and security audit events.

Do not expose role checks only in the UI.
Add unit and integration tests.
```

## Prompt 05 — Vehicle Catalog and Vehicle CRUD

```text
Read CLAUDE.md.

Implement Sprint 2.

Build:

- vehicle make, model, trim, and engine catalog;
- customer vehicle CRUD;
- UAE plate number field;
- VIN field;
- model year;
- mileage in kilometers;
- fuel type;
- transmission type;
- vehicle type;
- optional service history;
- vehicle document uploads through a storage abstraction.

Create:

- Prisma models or migration updates;
- Zod schemas;
- service layer;
- protected APIs or server actions;
- customer UI;
- admin catalog UI;
- tests.

Do not use unverified third-party vehicle data.
Seed a small clearly labeled development dataset.
```

## Prompt 06 — Diagnostic Domain Design

```text
Read CLAUDE.md.

Before coding, design the diagnostics domain.

Produce:

- entity model;
- diagnostic session state machine;
- question types;
- answer types;
- symptom taxonomy;
- severity model;
- safe-to-drive model;
- attachment model;
- result model;
- feedback model;
- verified repair outcome model;
- business rules;
- authorization rules;
- API contracts;
- failure cases.

Do not implement AI yet.
After the design is approved by the existing architecture, implement Sprint 3.
```

## Prompt 07 — Diagnostic Wizard

```text
Read CLAUDE.md and the diagnostics domain design.

Implement the diagnostic wizard.

Requirements:

- choose vehicle;
- choose symptom category;
- enter free-text description;
- dynamic structured questions;
- yes/no, single select, multi-select, numeric, text, and media question types;
- save progress;
- resume session;
- cancel session;
- safety warnings;
- responsive UI;
- accessible forms;
- server-side validation;
- full session audit trail.

Do not call an LLM yet.
Use deterministic rules and seed questions for the first implementation.
```

## Prompt 08 — AI Provider Abstraction

```text
Read CLAUDE.md.

Implement the AI provider abstraction for diagnostics.

Create:

- AIProvider interface;
- OpenAI adapter;
- Anthropic adapter;
- provider router;
- timeout;
- retry for transient errors;
- fallback;
- structured Zod output;
- request metadata;
- usage tracking;
- prompt version tracking;
- safe degraded response;
- unit tests with mocked providers.

Do not allow provider SDKs in client code.
Do not log raw secrets or unnecessary personal data.
```

## Prompt 09 — Diagnostic Prompt Design

```text
Read CLAUDE.md.

Create versioned diagnostic prompts.

The system must:

- use vehicle context;
- use structured answers;
- use retrieved approved knowledge;
- return only the DiagnosticResult schema;
- provide ranked probable causes;
- explain evidence;
- list missing evidence;
- suggest safe checks;
- never guarantee a diagnosis;
- never invent inventory or prices;
- respect rule-based safety decisions;
- refuse unsupported or dangerous instructions.

Create:

- system prompt;
- diagnostic reasoning prompt;
- next-question prompt;
- customer explanation prompt;
- garage summary prompt;
- fallback prompt;
- prompt tests;
- adversarial test cases.

Store prompt source files under docs/prompts or the approved prompt module.
```

## Prompt 10 — RAG and Knowledge Base

```text
Read CLAUDE.md.

Implement the MVP automotive knowledge base using PostgreSQL and pgvector.

Build:

- document model;
- chunk model;
- ingestion service;
- text extraction boundary;
- chunking;
- embeddings;
- indexing;
- metadata filters;
- retrieval;
- citation IDs;
- admin upload and re-index flow;
- duplicate detection;
- versioning;
- retrieval tests.

Only approved documents may be used for production answers.
Track source, make, model, year range, engine, document type, and approval state.
```

## Prompt 11 — Diagnostic Analysis

```text
Read CLAUDE.md.

Implement the end-to-end analysis action.

Flow:

1. load authenticated session and owned vehicle;
2. validate diagnostic state;
3. execute deterministic safety rules;
4. retrieve approved knowledge;
5. call primary AI provider;
6. validate structured result;
7. apply confidence and taxonomy checks;
8. fall back if necessary;
9. persist result and metadata;
10. return customer-safe output.

Add idempotency so repeated requests do not create duplicate results.
Add integration tests for success, fallback, invalid output, provider outage, and critical safety conditions.
```

## Prompt 12 — Vendor Domain

```text
Read CLAUDE.md.

Design and implement vendor onboarding.

Include:

- vendor organization;
- business profile;
- UAE trade-license metadata;
- verification state;
- locations;
- staff membership;
- admin approval;
- audit trail;
- vendor dashboard;
- authorization tests.

Do not implement inventory until onboarding and access control are complete.
```

## Prompt 13 — Parts Catalog and Compatibility

```text
Read CLAUDE.md.

Design the parts catalog and compatibility model.

Support:

- canonical part;
- manufacturer;
- part number;
- alternate part numbers;
- category;
- OEM or aftermarket;
- vehicle compatibility;
- year range;
- engine variant;
- trim constraints;
- notes;
- media;
- approval state.

Prevent vendors from creating conflicting canonical data without review.
Implement admin-managed canonical parts and vendor-linked inventory items.
```

## Prompt 14 — Inventory

```text
Read CLAUDE.md.

Implement vendor inventory.

Support:

- location-level stock;
- available, reserved, and damaged quantities;
- price in minor units;
- currency;
- stock adjustment;
- reorder threshold;
- reservation expiry;
- audit history;
- optimistic locking or safe transactional updates;
- search filters;
- compatibility matching.

Add concurrency tests to prevent overselling.
```

## Prompt 15 — Garage Domain

```text
Read CLAUDE.md.

Implement garage onboarding and configuration.

Support:

- garage organization;
- verification;
- locations;
- service catalog;
- vehicle-type capability;
- make specialization;
- working hours;
- mechanics;
- mechanic skills;
- staff roles;
- admin approval;
- garage dashboard.

Add server-side organization authorization and tests.
```

## Prompt 16 — Booking Engine

```text
Read CLAUDE.md.

Design and implement the booking engine.

Support:

- garage search;
- service matching;
- distance-ready location model;
- available slots;
- appointment request;
- acceptance;
- rejection;
- rescheduling;
- cancellation;
- no-show;
- reminders;
- booking status history;
- diagnostic-session linkage.

Prevent double booking.
Use database transactions and deterministic slot rules.
```

## Prompt 17 — Repair Order Management

```text
Read CLAUDE.md.

Implement the full repair-order workflow.

Support:

- creation from booking;
- initial inspection;
- actual diagnosis;
- repair estimate;
- estimate line items;
- customer approval or rejection;
- mechanic assignment;
- jobs;
- parts;
- labor;
- status history;
- quality check;
- completion;
- invoice;
- warranty;
- verified repair outcome.

Use an explicit state machine.
Do not allow invalid state transitions.
Add authorization, audit, and integration tests.
```

## Prompt 18 — Payment Architecture

```text
Read CLAUDE.md.

Design the payment subsystem before implementing a provider.

Produce:

- payment intent model;
- transaction model;
- invoice model;
- refund model;
- commission model;
- payout model;
- idempotency model;
- webhook model;
- state machines;
- PCI boundary;
- failure handling;
- reconciliation plan;
- provider interface.

Do not write gateway-specific UI until the design is complete.
```

## Prompt 19 — Payment Provider

```text
Read CLAUDE.md and the approved payment architecture.

Implement the selected UAE-compatible payment provider behind PaymentProvider.

Requirements:

- server-calculated totals;
- hosted or provider-secure payment collection;
- signed webhook verification;
- idempotent event processing;
- payment status synchronization;
- refund support;
- invoice linkage;
- audit logging;
- local test mode;
- integration tests.

Never trust client amount, currency, commission, or order ownership.
```

## Prompt 20 — Notifications

```text
Read CLAUDE.md.

Implement a notification abstraction.

Support:

- in-app;
- email;
- SMS-ready adapter;
- templates;
- localization readiness;
- notification preferences;
- event-driven dispatch;
- retries;
- delivery status;
- deduplication.

Initial events:

- email verification;
- diagnostic complete;
- booking requested;
- booking accepted;
- estimate ready;
- estimate approved;
- payment complete;
- repair status changed;
- repair completed.
```

## Prompt 21 — Adaptive Diagnostics and Dual-Audience Explanations

```text
Read CLAUDE.md.

Activate the three dormant diagnostic prompt templates (next_question,
customer_explanation, garage_summary) and close the diagnostic feedback loop.

Implement:

- AI-ranked next-question selection over the existing static question bank —
  skip questions already made irrelevant by prior answers, prioritize the
  most diagnostically useful remaining one; do not have the AI invent new
  question types or options, only select/reorder the existing bank;
- a plain-language customer-facing explanation of the diagnostic result;
- a technical garage-facing summary of the same result, surfaced wherever a
  repair order references the originating diagnostic session;
- graceful fallback to the current static question order if the AI call
  fails;
- an admin view of low-rated diagnostic feedback linked back to its session.

Promote the three prompt templates from DRAFT to ACTIVE.
```

## Prompt 22 — Visual Diagnostics

```text
Read CLAUDE.md.

Implement photo/video diagnostic input.

Requirements:

- a storage provider that actually persists uploaded bytes in development —
  the current console provider discards them; fix this first;
- an upload path wiring the existing (currently unused) diagnostic
  attachment model end to end: route, UI, and persisted rows;
- image input passed into the existing AI provider's vision-capable calls
  alongside the text prompt;
- graceful behavior when no image is attached.

Do not change the payment provider or storage abstractions' other existing
consumers.
```

## Prompt 23 — Predictive Maintenance

```text
Read CLAUDE.md.

Implement predictive maintenance surfaced on the customer dashboard.

Requirements:

- a pure, unit-testable function computing predicted-due services from
  service history and elapsed mileage/time;
- lazy on-demand computation on read, matching the existing stale-order/
  stale-booking expiry pattern already used elsewhere — no new job
  scheduler in this prompt;
- a vehicle health dashboard card surfacing the result.

Do not build proactive push/email delivery yet — that depends on the
notification system and a job scheduler, neither of which exist yet.
```

## Prompt 24 — Trust Transparency and Voice Intake

```text
Read CLAUDE.md.

Improve diagnostic result transparency and add voice-based symptom intake.

Requirements:

- surface existing knowledge-citation/evidence data more prominently in the
  diagnostic result UI;
- a microphone control on the wizard's describe-issue step using the
  browser's native speech-to-text API to fill the existing free-text
  description field;
- no new backend speech-to-text provider or vendor key in this prompt.

Document the accepted browser-support limitations of client-side speech
recognition rather than silently degrading.
```

## Prompt 25 — Arabic-Native AI Reasoning

```text
Read CLAUDE.md.

Make AI diagnostic reasoning respond natively in Arabic when the session's
locale is Arabic, not just translate the surrounding UI chrome.

Start with an investigation: confirm whether this needs Arabic prompt
template versions or whether a locale-aware instruction on the existing
English templates is sufficient, before writing code.

Thread the active locale through to the analysis pipeline and the prompt
builder.
```

## Prompt 26 — AI-Generated Diagnostic Questions

```text
Read CLAUDE.md.

Replace the Diagnostic Wizard's Step 4 questionnaire — currently a static
seeded question bank that AI only reorders and skips within — with questions
generated live by AI, tailored to the vehicle, symptom category, and
free-text description collected in Step 3.

Requirements:

- generate the full question set for a session in a single batch AI call
  immediately after Step 3's description is saved, not a live round-trip
  before every individual question;
- each generated question must validate into the same structured shape the
  wizard's UI already renders (yes/no, single-select with options, or short
  text) — no free-form/unstructured questions;
- generate natively in the session's locale (English or Arabic), reusing the
  locale-threading pipeline built in the Arabic-Native AI Reasoning prompt
  rather than duplicating it;
- fall back to a small, generic, category-agnostic static question set if
  generation fails or times out, so the wizard never breaks.

This retires the seeded question bank as the source of question text and the
next-question ranking mechanism it replaces — remove that code rather than
leaving it alongside the new path. The final diagnostic result continues to
come from the existing AI analysis pipeline unchanged; only where question
text originates changes.
```

## Prompt 27 — Garage Recommendations and Distance Search

```text
Read CLAUDE.md.

Extend the customer journey past the AI Diagnostic Result: recommend real
garages that can perform the repair, ranked by distance and rating, and let
the customer act on a diagnosis immediately instead of the journey ending at
the result screen.

Requirements:

- expand the garage service-type vocabulary so every diagnosis service
  category (engine, electrical, suspension, cooling, exhaust, tyres, body,
  steering, fuel system) has a real matching GarageService value — the
  diagnosis taxonomy and the garage catalog's service vocabulary don't
  overlap today beyond brakes/AC/transmission/battery/general inspection;
- add real garage coordinates and distance-based search: browser
  geolocation plus an interactive Google Map with pins on the garage search
  page, sortable/filterable by distance;
- add a minimal garage rating system — customers may rate a garage once per
  completed repair order, only after they've verified the repair outcome;
- surface recommended garages from a completed diagnostic result via both a
  compact sidebar panel (top matches) and a prominent CTA that deep-links to
  the full, pre-filtered garage search;
- reseed the garage catalog with enough realistic test garages, spread
  across multiple emirates with real coordinates, to exercise every service
  category, vehicle type, and make specialization.

Google Maps must degrade gracefully with no API key configured (none is
provisioned yet) — never break the search page, just show a plain fallback
until one is provisioned.
```

## Prompt 28 — Admin Console

```text
Read CLAUDE.md.

Implement the admin console.

Include:

- users;
- vendors;
- garages;
- vehicle catalog;
- parts catalog;
- knowledge documents;
- prompt versions;
- diagnostic sessions;
- AI evaluation results;
- bookings;
- repair orders;
- payments;
- refunds;
- disputes;
- audit logs;
- feature flags.

Every admin action must be permission-checked and audited.
Add confirmation for destructive or financially sensitive actions.
```

## Prompt 29 — AI Evaluation Framework

```text
Read CLAUDE.md.

Implement an offline AI evaluation framework, and extend it with real-world
outcome tracking against production repair data.

Include:

- curated test cases;
- expected issue codes;
- expected severity;
- expected safe-to-drive outcome;
- forbidden outputs;
- retrieval quality checks;
- provider comparison;
- prompt version comparison;
- pass/fail thresholds;
- regression report;
- cost and latency metrics;
- real-world outcome correlation: compare each DiagnosticResult's top-ranked
  cause against the confirmed diagnosis of any RepairOrder that originated
  from that session, and report an accuracy rate alongside the curated-test
  results.

The curated-test suite must run without affecting production data. The
outcome-correlation report is read-only against existing production data —
it is calibration reporting, not model retraining.
```

## Prompt 30 — CI/CD

```text
Read CLAUDE.md.

Implement production-grade GitHub Actions.

Pull request pipeline:

- install with lockfile;
- lint;
- format check;
- type-check;
- unit tests;
- integration tests;
- Prisma validation;
- migration safety check;
- build;
- dependency audit;
- secret scan;
- E2E smoke test.

Main branch:

- build immutable artifact;
- deploy preview or staging;
- run smoke tests;
- require approval for production;
- deploy;
- run post-deployment checks;
- record version.

Document rollback.
Do not expose secrets in logs.
```

## Prompt 31 — Docker and AWS Readiness

```text
Read CLAUDE.md.

Prepare the application for future AWS deployment while preserving Vercel deployment.

Create:

- production Dockerfile;
- .dockerignore;
- health and readiness endpoints;
- runtime environment strategy;
- stateless application rules;
- object-storage abstraction;
- job-queue abstraction;
- migration command;
- startup documentation;
- ECS readiness checklist.

Do not migrate to AWS yet.
```

## Prompt 32 — AWS Infrastructure Design

```text
Read CLAUDE.md.

Design the target AWS architecture.

Include:

- Route 53;
- CloudFront;
- WAF;
- ALB;
- ECS Fargate;
- ECR;
- RDS PostgreSQL Multi-AZ strategy;
- Valkey;
- S3;
- SQS;
- Secrets Manager;
- KMS;
- CloudWatch;
- CloudTrail;
- GuardDuty;
- backup;
- disaster recovery;
- staging and production isolation;
- VPC;
- public and private subnets;
- NAT cost considerations;
- deployment strategy;
- estimated scaling path.

Produce Mermaid diagrams and an implementation backlog.
Do not provision infrastructure yet.
```

## Prompt 33 — Security Review

```text
Read CLAUDE.md.

Perform a security review of the entire repository.

Check:

- authentication;
- authorization;
- IDOR;
- tenant isolation;
- CSRF;
- XSS;
- SSRF;
- SQL injection;
- file upload;
- prompt injection;
- LLM data leakage;
- rate limiting;
- payment tampering;
- webhook verification;
- secrets;
- logs;
- audit;
- dependency risks;
- insecure defaults.

Return findings by severity and provide concrete patches for critical and high issues.
```

## Prompt 34 — Launch Readiness

```text
Read CLAUDE.md.

Create a production launch-readiness report.

Cover:

- completed scope;
- incomplete scope;
- test coverage;
- security;
- privacy;
- backups;
- monitoring;
- alerting;
- incident response;
- payment reconciliation;
- support workflow;
- AI evaluation;
- legal disclaimers;
- operational runbooks;
- rollback;
- go/no-go recommendation.

Do not claim readiness when evidence is missing.
```

---

# 18. Coding Standards

## TypeScript

- strict mode;
- no implicit `any`;
- prefer discriminated unions;
- validate external data;
- never use type assertions to bypass validation;
- use explicit return types on public services;
- keep DTOs separate from database models when useful.

## React and Next.js

- server components by default;
- client components only for real interactivity;
- keep data fetching server-side when possible;
- do not expose secrets through environment variables prefixed for the client;
- use loading, empty, error, and success states;
- maintain accessibility;
- avoid oversized page components;
- use feature-based organization.

## Prisma

- no Prisma calls directly from arbitrary UI components;
- use transactions for financial, inventory, booking, and repair state changes;
- review every migration;
- never use destructive reset in production;
- add indexes for real access paths;
- avoid unbounded queries;
- use pagination;
- use select/include carefully.

## API

- validate input with Zod;
- authorize server-side;
- use stable error codes;
- do not leak stack traces;
- use request IDs;
- use idempotency for sensitive actions;
- use rate limits;
- document public endpoints.

## AI

- version prompts;
- validate outputs;
- log provider and model metadata;
- separate retrieved source data from user text;
- defend against prompt injection;
- never permit direct tool execution without explicit application-side validation;
- keep critical decisions deterministic;
- store evaluation results;
- redact sensitive data where possible.

## Tests

Required layers:

- unit tests for domain rules;
- integration tests for database and API behavior;
- E2E tests for critical workflows;
- provider adapters tested using mocks;
- migration tests for high-risk schema changes;
- concurrency tests for bookings and inventory;
- webhook replay tests;
- AI regression tests.

## Git

Branch naming:

```text
feature/...
fix/...
chore/...
docs/...
refactor/...
```

Commit convention:

```text
feat:
fix:
docs:
refactor:
test:
chore:
perf:
security:
```

Pull requests must include:

- problem;
- solution;
- scope;
- screenshots where relevant;
- database impact;
- API impact;
- security impact;
- test evidence;
- rollback notes.

---

# 19. Definition of Done

A feature is complete only when:

- requirements are implemented;
- server-side authorization exists;
- validation exists;
- errors are handled;
- audit requirements are met;
- unit or integration tests exist;
- critical E2E path is covered where applicable;
- loading, empty, and error UI states exist;
- accessibility has been reviewed;
- migrations are safe;
- API contracts are documented;
- logs and metrics are sufficient;
- secrets are not exposed;
- documentation is updated;
- acceptance criteria pass.

---

# 20. Environment Variables

Define and validate variables centrally.

Examples:

```text
DATABASE_URL
DIRECT_URL
AUTH_SECRET
AUTH_GOOGLE_ID
AUTH_GOOGLE_SECRET
AUTH_APPLE_ID
AUTH_APPLE_SECRET
OPENAI_API_KEY
ANTHROPIC_API_KEY
AI_PRIMARY_PROVIDER
AI_PRIMARY_MODEL
AI_FALLBACK_PROVIDER
AI_FALLBACK_MODEL
STORAGE_PROVIDER
STORAGE_BUCKET
PAYMENT_PROVIDER
PAYMENT_WEBHOOK_SECRET
EMAIL_PROVIDER
SMS_PROVIDER
APP_URL
LOG_LEVEL
```

Never commit real values.

Maintain:

```text
.env.example
```

with descriptions and safe placeholders.

---

# 21. Observability

Every request should have a request ID.

Track:

- API latency;
- error rate;
- AI provider latency;
- AI token usage;
- AI fallback rate;
- invalid AI output rate;
- diagnostic completion rate;
- critical safety triggers;
- booking conversion;
- inventory reservation failures;
- payment success rate;
- webhook failures;
- repair-order duration;
- refund rate.

Use structured logs.

Do not log:

- passwords;
- OTPs;
- access tokens;
- refresh tokens;
- full payment details;
- provider secrets;
- unnecessary identity documents;
- raw private prompts without redaction.

---

# 22. Security and Compliance Notes

Prepare for:

- UAE Personal Data Protection Law considerations;
- clear consent;
- purpose limitation;
- data retention controls;
- account deletion workflow;
- export workflow;
- vendor and garage data-processing obligations;
- payment-provider PCI boundary;
- role-based access;
- auditability;
- incident response.

Include a clear product disclaimer:

- the platform provides diagnostic assistance;
- it does not replace inspection by a qualified mechanic;
- users must stop driving when the platform identifies critical safety symptoms;
- emergency services or roadside assistance should be contacted where appropriate.

Legal text must be reviewed by qualified UAE counsel before launch.

---

# 23. Initial MVP Boundary

The MVP should include:

- all authentication methods at the architecture level;
- customer account;
- vehicle management;
- diagnostic wizard;
- OpenAI with Claude fallback;
- rule-based safety;
- approved RAG knowledge base;
- ranked diagnostic results;
- vendor onboarding;
- basic inventory;
- garage onboarding;
- booking;
- basic repair-order management;
- payment provider abstraction;
- one implemented payment provider;
- admin moderation;
- feedback and verified repair outcomes.

The MVP should not initially include:

- autonomous model retraining;
- direct vehicle ECU control;
- unsupported OBD device integrations;
- real-time fleet telematics;
- insurance claims;
- automatic parts ordering without confirmation;
- dynamic surge pricing;
- complex multi-vendor delivery logistics;
- native mobile apps;
- microservices unless operationally required.

---

# 24. First Command to Give Claude Code

Use this exact prompt first:

```text
Read CLAUDE.md completely and treat it as the source of truth for this repository.

Inspect the current repository without changing files.

Then produce:

1. a concise current-state assessment;
2. differences between the repository and CLAUDE.md;
3. the recommended architecture for the first six sprints;
4. the exact Sprint 0 backlog;
5. the files you expect to create or modify;
6. database, API, authentication, security, testing, and deployment decisions;
7. risks and unresolved decisions.

Do not write code until this assessment is complete.
Do not propose microservices for the MVP unless there is a concrete deployment requirement.
Prefer a modular monolith that can migrate from Vercel to AWS.
```

---

# 25. Decision Log

Create Architecture Decision Records under:

```text
docs/adr/
```

Initial ADRs:

```text
ADR-001 Modular monolith for MVP
ADR-002 Next.js App Router
ADR-003 PostgreSQL and Prisma
ADR-004 Auth.js and RBAC
ADR-005 OpenAI primary and Claude fallback
ADR-006 Hybrid diagnostic engine
ADR-007 pgvector for MVP
ADR-008 Payment provider abstraction
ADR-009 Vercel-first deployment
ADR-010 AWS target architecture
ADR-011 Outbox pattern for reliable events
ADR-012 Structured AI output and prompt versioning
```

Each ADR should contain:

- context;
- decision;
- alternatives;
- consequences;
- status;
- date.

---

# 26. Final Guidance

Build the platform in this order:

```text
foundation
-> identity
-> vehicles
-> deterministic diagnostics
-> AI orchestration
-> knowledge retrieval
-> diagnostic results
-> vendors
-> inventory
-> garages
-> bookings
-> repair orders
-> payments
-> admin
-> AI evaluation
-> AWS migration
```

Do not begin with:

- microservices;
- fine-tuning;
- OBD hardware;
- complex fleet features;
- predictive maintenance;
- fully automated repair decisions.

The platform's defensible asset will be:

```text
verified vehicle context
+ structured symptoms
+ approved technical knowledge
+ AI recommendations
+ actual garage diagnosis
+ repair actions
+ parts used
+ final repair outcome
+ UAE pricing and availability
```

Treat that dataset as a first-class product from day one.
