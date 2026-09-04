# Frame Cart Core

FRAME CART — FINAL PRODUCTION COMPLETION / FIX EXISTING PROJECT ONLY

I am attaching the latest FRAME CART ZIP. WORK ONLY ON THIS EXISTING PROJECT. DO NOT CREATE A NEW PROJECT, NEW TEMPLATE, NEW STORE, OR SEPARATE FRONTEND. Upgrade, fix, complete and productionize this exact codebase.

This is the FINAL pass. Do a full audit first, then implement everything below and do not leave mock/fake functionality.

1. FIRST: AUDIT + FIX CURRENT PROJECT

Audit the entire existing codebase, Supabase integration, auth, routes, admin route, database migrations, checkout, Razorpay, webhook, inventory, orders and notifications.

Fix all broken routes, build errors, runtime errors, SSR/client issues and permission issues.

The current /admin flow must be fixed so an authorized admin can actually open and use the panel.

2. ADMIN LOGIN — MUST WORK

Create a dedicated secure admin entry:

/admin/login

Do NOT use a fake/hardcoded frontend password.

Use Supabase Auth email/password authentication plus server-side RBAC.

Required behavior:

Admin email + password login

Logout

Session persistence

Redirect unauthorized users away from /admin

After login verify the authenticated user has SUPER_ADMIN or ADMIN role

Never trust a frontend-only admin flag

Never hardcode admin password in source code

Never store admin password in localStorage

Show clear access-denied page for normal customers

Create a secure bootstrap/admin setup so I can create one admin user from Supabase and assign the correct role without modifying source code.

3. FULL ADMIN PANEL

The admin panel must be a real usable operations console, not just a dashboard.

Keep/improve the existing admin functions and make the UI actually expose them:

Dashboard

Orders

Order details

Change order status

Customers

Products

Product create/edit

Categories

Sizes/frames/variants

Inventory and stock adjustments

Coupons

Reviews moderation

Returns

Refunds

Shipments/tracking

Staff / roles

Audit logs

Store settings

Integration status

Payment status

Notification status

Use proper role-based access for:
SUPER_ADMIN
ADMIN
ORDER_MANAGER
PRODUCT_MANAGER
INVENTORY_MANAGER
CUSTOMER_SUPPORT
MARKETING

Every sensitive action must be checked on the server.

4. SUPABASE — FINALIZE PRODUCTION DATABASE

Use the connected Supabase project as the single source of truth.

Keep all existing commerce functionality on PostgreSQL/Supabase.

Verify and fix:

profiles

user_roles

products

categories

product_images

product_variants

size_options

frame_options

carts

cart_items

addresses

orders

order_items

order_status_history

payments

payment_events

refunds

inventory_movements

coupons

coupon_redemptions

wishlist

reviews

shipments

notifications

audit logs

store settings

Add missing constraints, indexes, relations and RLS policies where required.

Customers must only access their own protected data.

5. AUTHENTICATION

Customer auth must support:

Signup

Login

Logout

Email verification

Forgot password

Reset password

Persistent session

Account/profile

Addresses

Wishlist

Orders

Order details

Do not use localStorage as authentication.

6. CART + CHECKOUT

Make checkout fully server-authoritative.

Server must calculate:

product price

size/frame modifiers

quantity

coupon discount

shipping

tax

final payable amount

Never trust amount/discount/total sent by browser.

Keep guest checkout and guest-cart merge working.

Prevent duplicate orders and duplicate checkout submissions.

7. RAZORPAY — FINAL PRODUCTION IMPLEMENTATION

Keep Razorpay fully server-side for secrets.

Required environment variables:

RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=

Frontend may receive only the public Key ID.

Implement and verify:

server-side Razorpay order creation

Razorpay Checkout

UPI

Cards

Netbanking

Wallets

payment signature verification

payment status handling

failed payment handling

retry payment

webhook handling

refund handling

idempotency

payment event history

Webhook route:

/api/payments/webhook

Verify X-Razorpay-Signature using the raw request body and RAZORPAY_WEBHOOK_SECRET.

Handle at minimum:

payment.authorized

payment.captured

payment.failed

order.paid

refund.created

refund.processed

Do not mark an order paid from frontend success alone.

Protect against:

amount tampering

forged payment responses

forged webhooks

duplicate webhook processing

unauthorized refunds

paying another customer's order

8. ORDER + INVENTORY

Order lifecycle must support:

payment_pending
confirmed
processing
packed
shipped
out_for_delivery
delivered
cancelled
return_requested
returned
refunded

Implement reliable inventory reservation/release/finalization.

Prevent overselling and negative stock.

Support COD and Razorpay.

9. REFUNDS / RETURNS

Support:

full refund

partial refund

refund status

refund history

return request

admin approval

audit trail

Razorpay refund operations must be server-side and authorized.

10. NOTIFICATIONS

Keep notification architecture ready for real providers.

Do NOT simulate successful delivery.

Support provider configuration for:

Email

WhatsApp Business / Meta Cloud API

SMS

If credentials are missing, show NOT CONFIGURED in admin integration settings instead of pretending the message was sent.

11. INVOICES

Generate real order invoices/PDFs from actual order data.

Do not invent:

GSTIN

company registration number

legal address

tax percentage

bank details

Use only values I configure in Store Settings.

12. SECURITY

Perform a final security audit for:

IDOR

broken access control

privilege escalation

unauthorized refunds

unauthorized order access

coupon abuse

price manipulation

XSS/injection

forged Razorpay signatures

forged webhook events

secret exposure

admin endpoint abuse

Never expose these to browser/client code:

SUPABASE_SECRET_KEY
SUPABASE_SERVICE_ROLE_KEY
DATABASE_URL
RAZORPAY_KEY_SECRET
RAZORPAY_WEBHOOK_SECRET

Never hardcode credentials.

13. UI / UX

Substantially improve the existing FRAME CART design in the same project.

Make it:

premium

modern

minimal

elegant

mobile-first

fast

accessible

responsive

Keep the existing brand identity but redesign weak screens.

Admin UI must feel like a professional ecommerce operations dashboard.

Customer UI must have polished:
Home → Shop → Product → Cart → Checkout → Order confirmation → Account → Orders.

14. DATA + DEMO CONTENT

Do not rely on fake frontend/localStorage/in-memory production data.

Use Supabase as the persistent source of truth.

Keep existing valid product seed/content where useful, but make sure admin can manage it from the actual database.

15. FINAL VALIDATION

Do this exact sequence:

AUDIT → IMPLEMENT → TEST → FIX → VERIFY

Verify:

build passes

lint passes

customer signup/login works

admin login works

admin role protection works

admin dashboard opens

product CRUD works

order management works

inventory works

coupons work

checkout works

COD works

Razorpay configuration is detected correctly

webhook route works

payment state transitions are correct

refunds are protected

guest checkout works

customer cannot access another customer's order

unauthorized user cannot access admin

no secrets reach frontend

At the end, give a concise report containing:

What was fixed

What was completed

Admin login/setup instructions

Required environment secrets

Required Razorpay webhook setup

Required email/WhatsApp/SMS credentials

Supabase setup/status

Build/test result

Any external configuration that still needs my action

IMPORTANT: Modify and complete the attached FRAME CART project. Do not throw away the existing project and do not create a separate replacement project.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://frame-cart-pro.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/c9d339fb-a660-4eed-99ea-9cca8147c773).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
