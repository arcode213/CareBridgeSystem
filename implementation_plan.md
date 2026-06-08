# CareBridge Laboratory Module — Master Implementation Plan

Transform the existing basic laboratory UI into a high-performance Laboratory Information System (LIS) with role-based workbenches, TAT SLA enforcement, auto-routing, parallel multi-department processing, and automated report merging.

---

## User Review Required

> [!IMPORTANT]
> **Breaking Schema Change:** The current `LabInvestigation` model (1:1 with Referral) will be split into a **LabOrder → LabSample[]** parent-child hierarchy. Existing data in `LabInvestigation` will need a one-time migration script to become `LabOrder` documents with a single child `LabSample`.

> [!WARNING]
> **New `staffRole` Concept:** The plan introduces lab staff sub-roles (`manager`, `receptionist`, `technician`, `pathologist`) as an array on the `Laboratory` model. This does NOT change the `User.role` enum — all staff still log in as `role: 'laboratory'`. The sub-role controls which workbench components they see. This avoids touching the auth middleware or JWT structure.

> [!CAUTION]
> **PDF Merging Dependency:** The report merging engine requires `pdf-lib` (for combining PDFs) and potentially `sharp` (for image-to-PDF conversion). These are new npm dependencies on the backend.

---

## Open Questions

> [!IMPORTANT]
> 1. **Walk-In Billing:** For walk-in patients (no consultant referral), who receives the commission payout? Should the platform skip the consultant payout flow entirely, or should there be a "house consultant" fallback?
>
> 2. **Amended Report Notifications:** Should amended reports trigger a WhatsApp alert to the original consultant, or only an in-app notification? The current `notificationService` supports both channels.
>
> 3. **Barcode Generation:** Should barcodes be auto-generated server-side (e.g., UUID-based), or does the lab use external barcode printers where they scan a physical label? This affects whether `ReceptionDesk.jsx` shows a "Generate Barcode" button vs. a "Scan Barcode" input.
>
> 4. **DICOM Support Scope:** Full DICOM viewer integration is a large effort. For Phase 1, is it acceptable to simply store DICOM files as attachments and display them as download links (not inline rendering)?

---

## Proposed Changes

### Phase 1: Database Schema Architecture

---

#### [MODIFY] [Laboratory.js](file:///d:/Projects/CareBridge/backend/src/models/Laboratory.js)

Add lab staff roster and TAT configuration:

```diff
+ staffMembers: [
+   {
+     userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
+     staffRole: { type: String, enum: ['manager', 'receptionist', 'technician', 'pathologist'] },
+     assignedSection: { type: String },  // e.g. 'Haematology' — for technicians
+     isActive: { type: Boolean, default: true },
+   }
+ ],
+ tatTargets: {
+   type: Map,
+   of: Number,  // minutes per department, e.g. { "Biochemistry": 120, "Radiology": 1440 }
+   default: {},
+ },
+ testCatalog: {
+   type: Map,
+   of: String,  // testName -> department mapping, e.g. { "CBC": "Haematology", "LFT": "Biochemistry" }
+   default: {},
+ },
```

> [!NOTE]
> The `staffMembers` array references `User` documents that already have `role: 'laboratory'`. The `staffRole` field is purely for in-lab routing. A single user can only belong to one lab.

---

#### [DELETE] [LabInvestigation.js](file:///d:/Projects/CareBridge/backend/src/models/LabInvestigation.js)

This file will be replaced by two new models below.

---

#### [NEW] [LabOrder.js](file:///d:/Projects/CareBridge/backend/src/models/LabOrder.js)

Parent document — one per referral:

- `referralId` (1:1, unique)
- `laboratoryId`, `consultantId`
- `status`: derived (`pending`, `in_progress`, `completed`) — completed only when ALL child samples are validated
- `finalReportUrl`: merged PDF
- `reportVersion`: integer (increments on amendment)
- `isAmended`: boolean
- `isStat`: boolean
- Billing fields migrated from `LabInvestigation` (`billTotalPaisa`, `paymentMethod`, `paymentReference`, `weeklySettlementId`)
- `comments[]` array (migrated)

---

#### [NEW] [LabSample.js](file:///d:/Projects/CareBridge/backend/src/models/LabSample.js)

Child document — one per department/section:

- `labOrderId` (ref → LabOrder)
- `section`: auto-assigned from test catalog (e.g. "Haematology")
- `barcode`: unique per sample
- `isStat`: inherited from parent or overridden
- `status`: `awaiting_collection` → `collected` → `in_processing` → `awaiting_validation` → `completed`
- `qcFailed`, `qcFailureReason`, `isCritical`
- `investigations[]` (the `LabTestResultSchema` array, migrated)
- **TAT fields:** `collectionDate`, `processingStartedAt`, `targetCompletionDate` (auto-calculated from `tatTargets`), `tatBreached` (boolean)
- `validationDate`, `completedAt`
- `attachments[]`: `[{ fileName, fileUrl, fileType (pdf/jpeg/dicom/docx), uploadedAt }]`
- `sampleReportUrl`: per-section partial report PDF

---

#### [NEW] [migration_labinvestigation_to_laborder.js](file:///d:/Projects/CareBridge/backend/scripts/migration_labinvestigation_to_laborder.js)

One-time migration script:
1. Read all `LabInvestigation` documents
2. Create a `LabOrder` for each, copying billing/referral/consultant fields
3. Create a single `LabSample` child per `LabOrder`, copying status/barcode/section/investigations
4. Verify counts match, then rename old collection as backup

---

### Phase 2: Auto-Routing & Core Backend Engines

---

#### [NEW] [labRoutingEngine.js](file:///d:/Projects/CareBridge/backend/src/services/labRoutingEngine.js)

When a consultant creates a lab referral (or walk-in is registered):
1. Parse `summaryNotes` for test names (extracted from `selectedTests` in the frontend payload)
2. Look up each test in the lab's `testCatalog` map (or fall back to the hardcoded `TEST_CATALOGUE` from the frontend)
3. Group tests by department
4. Auto-generate one `LabSample` per unique department, each with status `awaiting_collection`
5. Set `targetCompletionDate` on each sample using the lab's `tatTargets[section]`

---

#### [MODIFY] [laboratoryController.js](file:///d:/Projects/CareBridge/backend/src/controllers/laboratoryController.js)

Major refactor — all endpoints shift from `LabInvestigation` to `LabOrder` + `LabSample`:

- **`unlockPatient`** → now returns the `LabOrder` + all child `LabSample`s
- **`collectSample`** → operates on `LabSample` by sample ID (not investigation ID)
- **`routeSampleToSection`** → **removed** (auto-routing replaces manual section assignment)
- **`validateResults`** → operates on individual `LabSample`; if ALL samples in the parent `LabOrder` are now `completed`, triggers the merging engine
- **`uploadReport`** → refactored to handle per-sample attachment upload; final report is auto-generated by the merging engine
- **New: `registerWalkIn`** → creates a Referral (type=laboratory, no consultantId) + LabOrder + auto-routed LabSamples
- **New: `getManagerStats`** → aggregated TAT metrics, STAT queue, QC failure rates
- **New: `amendReport`** → creates a new report version with `[AMENDED]` stamp, increments `reportVersion`, triggers `REPORT_CORRECTED` notification

---

#### [MODIFY] [laboratoryRoutes.js](file:///d:/Projects/CareBridge/backend/src/routes/laboratoryRoutes.js)

Updated routes:

```diff
  router.get('/profile', getMyProfile);
  router.patch('/profile', updateProfile);
  router.post('/unlock-patient', unlockPatient);
- router.get('/investigations', listMyInvestigations);
- router.post('/investigations/:id/collect', collectSample);
- router.post('/investigations/:id/process', routeSampleToSection);
- router.post('/investigations/:id/validate', validateResults);
- router.post('/investigations/:id/upload', uploadReport);
+ router.get('/orders', listMyOrders);
+ router.get('/orders/:orderId', getOrderDetail);
+ router.get('/samples', listMySamples);               // filtered by section & status
+ router.post('/samples/:sampleId/collect', collectSample);
+ router.post('/samples/:sampleId/enter-results', enterResults);
+ router.post('/samples/:sampleId/validate', validateSample);
+ router.post('/samples/:sampleId/reject', rejectSample);
+ router.post('/samples/:sampleId/attach', uploadAttachment);
+ router.post('/walk-in', registerWalkIn);
+ router.get('/manager/stats', getManagerStats);
+ router.post('/orders/:orderId/amend', amendReport);
```

---

#### [MODIFY] [pdfGenerator.js](file:///d:/Projects/CareBridge/backend/src/utils/pdfGenerator.js)

Expand from the current basic single-section PDF:

- **`generateSectionReport(sample, referral, lab)`** — per-section PDF with structured results
- **`mergeReports(labOrder, samples[], lab)`** — uses `pdf-lib` to combine all section PDFs + attached scans/documents into one unified Patient Report Card
- **`generateAmendedReport(labOrder, samples[], lab)`** — same as merge but stamps every page with `[AMENDED — Version N]` watermark

---

#### [MODIFY] [notificationService.js](file:///d:/Projects/CareBridge/backend/src/services/notificationService.js)

Add new notification types:

```diff
+ REPORT_CORRECTED: () =>
+   `📝 *CareBridge Health* — Report Amended\n\n${greeting}` +
+   `The lab report for patient *${data.patientName}* (Ref: ${data.referralCode}) has been amended (Version ${data.version}).` +
+   `\n\nPlease review the updated results on your dashboard.`,
+
+ TAT_BREACH: () =>
+   `⏰ *CareBridge Health* — TAT Breach Alert\n\n${greeting}` +
+   `Sample *${data.barcode}* (${data.section}) has breached the turnaround time target.` +
+   `\n\nImmediate attention required.`,
+
+ WALK_IN_REGISTERED: () =>
+   `🚶 *CareBridge Health* — Walk-In Registered\n\n${greeting}` +
+   `A walk-in patient *${data.patientName}* has been registered with code *${data.referralCode}*.`,
```

---

#### [MODIFY] [referralController.js](file:///d:/Projects/CareBridge/backend/src/controllers/referralController.js)

When creating a lab referral, invoke the auto-routing engine instead of creating a flat `LabInvestigation`:

```diff
- // Create LabInvestigation
- await LabInvestigation.create({ referralId: referral._id, ... });
+ // Create LabOrder + auto-route samples
+ const labOrder = await LabOrder.create({ referralId: referral._id, ... });
+ await labRoutingEngine.autoRoute(labOrder, requestedTests, laboratory);
```

---

### Phase 3: Role-Specific Frontend Workbenches

---

#### [NEW] [ReceptionDesk.jsx](file:///d:/Projects/CareBridge/frontend/src/pages/ReceptionDesk.jsx)

- **Code Entry Gate:** Large referral code input with instant search (debounced API call)
- **Walk-In Registration Form:** Patient demographics + test selection (reuses `TEST_CATALOGUE`) + auto-generates referral code
- **Barcode Dispatch Panel:** After unlock/walk-in, shows auto-generated barcodes per sample with print button
- **Today's Queue:** List of all today's orders with status indicators

---

#### [NEW] [TechnicianWorkbench.jsx](file:///d:/Projects/CareBridge/frontend/src/pages/TechnicianWorkbench.jsx)

- **Section-Filtered View:** Only shows `LabSample`s matching the logged-in tech's `assignedSection`
- **Live TAT Countdown:** Each card has a ticking timer (calculated from `targetCompletionDate`). Color transitions: Green (>50% time left) → Amber (25-50%) → Red (<25%) → Flashing Red (breached)
- **STAT Priority Lane:** STAT samples pinned to top with pulsing red border
- **Inline Result Entry:** Fast structured form — test name, result value, reference range, critical flag checkbox
- **Submit for Validation** button advances sample to `awaiting_validation`

---

#### [NEW] [ValidationQueue.jsx](file:///d:/Projects/CareBridge/frontend/src/pages/ValidationQueue.jsx)

- **Cross-Section Queue:** Shows ALL samples in `awaiting_validation` status across all departments
- **Side-by-Side Review:** Selected sample shows entered results with reference ranges highlighted
- **Approve / Reject:** 
  - Approve → marks sample `completed`, checks if all siblings are done, triggers merge if so
  - Reject → marks `qc_failed` with reason, sends back to technician
- **Critical Value Override:** Pathologist can flag/unflag critical values before approval

---

#### [NEW] [ManagerDashboard.jsx](file:///d:/Projects/CareBridge/frontend/src/pages/ManagerDashboard.jsx)

- **KPI Cards:** Total orders today, STAT queue count, TAT compliance %, QC failure rate, Critical alerts
- **STAT Queue Widget:** Live list of all STAT samples with countdown timers
- **In-Processing Board:** Kanban-style columns by section showing sample counts
- **TAT Performance Chart:** Bar chart comparing actual TAT vs. target per department (last 7 days)
- **Export Buttons:** Download analytics as Excel/PDF

---

#### [MODIFY] [LaboratoryDashboard.jsx](file:///d:/Projects/CareBridge/frontend/src/pages/LaboratoryDashboard.jsx)

Refactor to become a **role router** — checks the logged-in user's `staffRole` and redirects:
- `receptionist` → `/laboratory/reception`
- `technician` → `/laboratory/workbench`
- `pathologist` → `/laboratory/validation`
- `manager` → `/laboratory/manager`
- No role (legacy/owner) → shows the existing overview dashboard

---

#### [MODIFY] [LaboratoryInvestigations.jsx](file:///d:/Projects/CareBridge/frontend/src/pages/LaboratoryInvestigations.jsx)

Refactor to work with the new `LabOrder` + `LabSample` API structure. This page becomes a secondary "all orders" view accessible to managers, showing the order-level status with expandable sample details.

---

#### [MODIFY] [App.jsx](file:///d:/Projects/CareBridge/frontend/src/App.jsx)

Add new routes:

```diff
+ import ReceptionDesk from './pages/ReceptionDesk';
+ import TechnicianWorkbench from './pages/TechnicianWorkbench';
+ import ValidationQueue from './pages/ValidationQueue';
+ import ManagerDashboard from './pages/ManagerDashboard';

  <Route path="/laboratory/dashboard" ... />
  <Route path="/laboratory/investigations" ... />
  <Route path="/laboratory/settlements" ... />
+ <Route path="/laboratory/reception" element={<RoleGuard roles={['laboratory']}><ReceptionDesk /></RoleGuard>} />
+ <Route path="/laboratory/workbench" element={<RoleGuard roles={['laboratory']}><TechnicianWorkbench /></RoleGuard>} />
+ <Route path="/laboratory/validation" element={<RoleGuard roles={['laboratory']}><ValidationQueue /></RoleGuard>} />
+ <Route path="/laboratory/manager" element={<RoleGuard roles={['laboratory']}><ManagerDashboard /></RoleGuard>} />
```

---

#### [MODIFY] [ConsultantLabReferrals.jsx](file:///d:/Projects/CareBridge/frontend/src/pages/ConsultantLabReferrals.jsx)

- Update API calls from `/laboratory/investigations` to `/laboratory/orders`
- Show per-sample breakdown in the expanded detail view (one row per department with individual status)
- Show merged report download when all samples are complete
- Show `[AMENDED]` badge if `isAmended` is true

---

### Phase 4: Sidebar Navigation Update

---

#### [MODIFY] [DashboardLayout.jsx](file:///d:/Projects/CareBridge/frontend/src/layouts/DashboardLayout.jsx)

Update the laboratory sidebar to include workbench links based on the user's staff role:

```
📊 Dashboard
📋 All Orders           (all roles)
🏥 Reception Desk       (receptionist + manager)
🧪 Technician Bench     (technician + manager)
🔬 Validation Queue     (pathologist + manager)
📈 Manager Dashboard    (manager only)
💰 Settlements          (all roles)
```

---

## Verification Plan

### Automated Tests

1. **Auto-Routing Test:** Create a lab referral with CBC + Ultrasound → verify system generates two `LabSample` records under one `LabOrder`, routed to Haematology and Radiology respectively
2. **Report Merging Test:** Complete both samples with results → verify a single merged PDF is generated at `LabOrder.finalReportUrl`
3. **TAT Breach Test:** Create a sample with a 1-minute TAT target → wait for breach → verify `tatBreached` flag is set and TAT_BREACH notification fires
4. **Critical Protocol Test:** Flag a sample result as `isCritical` → verify immediate `LAB_CRITICAL_VALUE` WhatsApp notification is triggered
5. **Walk-In Test:** Register a walk-in patient via `/laboratory/walk-in` → verify a Referral + LabOrder + LabSamples are created without a `consultantId`
6. **Migration Script:** Run the migration on a test copy of the database → verify all existing `LabInvestigation` records are correctly transformed

### Manual Verification

- **Role-Based Access:** Log in as each staff role and confirm they only see their designated workbench
- **TAT Timer UI:** Observe the live countdown on `TechnicianWorkbench` — confirm color transitions at 50%, 25%, and 0%
- **Manager Export:** Download TAT analytics as Excel from `ManagerDashboard`
- **Amended Report:** Modify a completed report and verify the new PDF has `[AMENDED]` stamp

---

## Execution Order

| Phase | Description | Estimated Files |
|-------|-------------|-----------------|
| **1** | Schema models (LabOrder, LabSample, Laboratory updates) + migration script | 5 files |
| **2** | Backend engines (auto-routing, controller refactor, PDF merging, notifications) | 6 files |
| **3** | Frontend workbenches (Reception, Technician, Validation, Manager) | 4 new + 3 modified |
| **4** | Routing & sidebar integration (App.jsx, DashboardLayout, LaboratoryDashboard) | 3 files |
| **5** | Testing & verification | — |
