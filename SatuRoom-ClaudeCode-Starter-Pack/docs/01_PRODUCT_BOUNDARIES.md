# Product Boundaries and Ecosystem

## Marketing website — `saturoom.com` (intended)
Public brand and product explanation, available features, FAQ, contact/CTA, and routes into actual products. It is not the academy dashboard. Do not present future products as available. Keep independently deployable.

## Football academy app — `bola.saturoom.com` (intended)
Authenticated academy operations with industry-specific navigation, terms, dashboards, data, setup, and workflows. This is the first operational product.

## Shared backend/API (proposed)
Identity/authentication, businesses, memberships, invitations, roles/permissions, optional branches/context, audit events, and common services. Academy domain modules remain distinct from shared platform primitives.

## Architecture shape (proposed)
Separate frontends for marketing and academy plus a documented API. Prefer a modular monolith initially. After repository audit, choose either a monorepo with separately deployable apps/shared packages or separate repositories plus shared backend. Explain trade-offs based on actual team and deployment needs.

## Multi-business access
A user may belong to multiple businesses. Membership binds a user to a business and permitted role/actions. If one accessible business exists, enter it after login where appropriate; if several exist, show a clear chooser/switcher. A subdomain, slug, or business ID is routing context—not authorization. Check membership and permissions on every protected server request.

## Future industries/mobile
F&B is future scope only. Do not build its workflows now. No mobile code now. Keep business rules out of UI-only code, document API/error/pagination/date contracts, and avoid browser-only assumptions so future clients can reuse the backend.
