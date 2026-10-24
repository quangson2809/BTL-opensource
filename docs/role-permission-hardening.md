# Role-permission hardening audit

**Scope:** role catalog, role-to-permission mappings, and backend/database enforcement.  
**Branch:** `feature/role-permission-hardening`  
**Baseline:** `main` at `7ffb50135ce75e84c5733549d4a0d4b7a21b3559` (verified from the repository files returned during this audit).  
**Important:** this document describes repository implementation and test coverage; it does not assert that the hosted Supabase project has applied every migration.

## 1. Existing model — no parallel RBAC system

The application uses the existing tables `vai_tro`, `quyen`, and `phan_quyen_vai_tro`, with `phan_cong_vai_tro` assigning roles to accounts. Permission definitions are migration-owned. Role mappings are managed by the existing guarded RPCs `admin_create_role` and `admin_update_role`; no new authorization tables or parallel permission store are introduced.

## 2. Role × permission × capability matrix

| Role / assignment | Role catalog mutation | Permission mapping mutation | `ACTIVITY_VIEW_SUBTREE` default | Activity visibility |
|---|---|---|---|---|
| ADMIN | May create/update custom roles; built-in role metadata and mappings are immutable | Through guarded RPCs only | Not part of the documented default mapping | Own activity and other routes remain governed by their existing guards/RLS |
| DM | Denied | Denied | Seeded by migration | Own activity and activity in its permitted descendant subtree |
| UM | Denied | Denied | Seeded by migration | Own activity and activity in its permitted descendant subtree |
| SA | Denied | Denied | Not part of the documented default mapping | Own activity; descendant visibility only if an authorized administrator maps the permission to an eligible assigned role |
| Custom role | Not an actor; controlled by an authorized administrator | Can receive/revoke existing permission mappings through `admin_update_role` | Only when mapped | The permission grants descendant activity reads only within `is_in_subtree`; it does not grant access outside that subtree |

**Scope limitation:** the repository currently defines `ACTIVITY_VIEW_SUBTREE` as the permission whose mapping changes activity-read scope. Other business capabilities still use their existing role guards and RLS/RPC rules; assigning this permission does not grant unrelated capabilities. This matrix must not be interpreted as a general permission framework for every screen.

## 3. Authorization trace

| Operation | UI / Server Action | Database enforcement | Evidence |
|---|---|---|---|
| View role/permission catalog | `/admin/roles`, guarded by `requireAdmin` | RLS/application-access gate on reads | `src/app/admin/roles/page.tsx` |
| Create custom role and initial mappings | `/admin/roles/new` → `createRole` | `admin_create_role` verifies ADMIN, reserved role codes, name, and permission IDs; inserts role + mappings in one transaction | `src/app/admin/roles/actions.ts`, migration `20261017090000_admin_role_catalog_management.sql`, test `010_admin_role_catalog_management_test.sql` |
| Update metadata and replace/revoke mappings | `/admin/roles/[id]/edit` → `updateRole` | `admin_update_role` verifies ADMIN, locks target role, rejects system roles/invalid permissions, and replaces mappings atomically | Same migration and test 010 |
| Bypass the Server Action with direct table writes | Not exposed by UI | Authenticated INSERT/UPDATE/DELETE on role catalog/mapping tables is revoked; RPC ACLs exclude `anon` and `public` | Test 010 and `supabase/tests/database/002_rls_test.sql` |
| Use a permission for activity reads | Activity queries/RLS | `can_view_activity` requires active application access; own activity is allowed; descendant activity requires `has_permission('ACTIVITY_VIEW_SUBTREE')` and `is_in_subtree` | Migration `20261017110000_permission_based_activity_scope.sql`, test `012_activity_permission_role_scope_test.sql` |
| Protect system roles | Edit page hides editing; Server Action validates IDs | Trigger prevents system-role deletion and role-code mutation; RPC rejects editing `ADMIN/DM/UM/SA` | Migration `20261017090000_admin_role_catalog_management.sql`, test 010 |

## 4. Privileged-role policy

The recorded policy is that `ADMIN`, `DM`, `UM`, and `SA` are system roles: their metadata and permission mappings are read-only through role catalog management; system roles cannot be deleted; role codes are immutable. The administrator may configure mappings only for custom roles. Permission definitions remain migration-owned.

Account role assignment/revocation is a separate workflow. Existing database RPCs also prevent an Admin from locking their own account or revoking their own ADMIN role and protect the last active Admin. This work does not loosen those protections.

## 5. Revocation semantics

Permission checks are database-backed, not copied into the JWT as a role-permission snapshot: `can_view_activity` calls `has_permission`, which reads current role-to-permission mapping. The new assertions in test 012 exercise this contract by granting the permission, verifying descendant visibility, revoking it through `admin_update_role` while retaining the reader's authenticated identity, and asserting that the next query denies descendant rows while own activity remains visible.

This establishes the intended database semantics under the test transaction. It does not replace testing against the hosted Supabase deployment or any other authorization path that might cache permission decisions.

## 6. Acceptance status

| Criterion | Status | Evidence / limitation |
|---|---|---|
| Valid existing permission can be granted to a custom role | Existing and tested | pgTAP 010 and 012 |
| Permission mapping can be revoked | Existing implementation; additional regression test added in this branch | New grant → revoke → denied assertion in test 012 |
| Invalid permission ID rejected without partial update | Existing and tested | pgTAP 010 |
| Non-Admin direct RPC mutation denied | Existing and tested | pgTAP 010 |
| Direct authenticated DML bypass denied | Existing and tested | pgTAP 010 and 002 |
| Built-in roles protected | Existing and tested | Migration trigger + pgTAP 010 |
| Permission affects backend/database data visibility | Existing and tested | pgTAP 012 |
| Revocation effective without re-login for the tested database path | New regression test added; CI result pending | Test 012 |
| All application features are governed by a universal permission catalog | Not implemented / not claimed | Current permission semantics are intentionally limited; existing role/RLS/RPC guards remain |
| Hosted Supabase migration state and live multi-role browser flow | Unverified here | Must be checked separately against the target project; no hosted migration was run |

## 7. Files changed in this hardening branch

- `supabase/tests/database/012_activity_permission_role_scope_test.sql`: add a regression test proving that removing `ACTIVITY_VIEW_SUBTREE` immediately removes descendant activity visibility for the same authenticated identity, while preserving own-activity access.
- This audit document: record the existing model, privilege boundaries, actual permission scope, and acceptance limitations.

No migration or production database data was changed by this branch.
