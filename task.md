# CareBridge Laboratory Module — Task Tracker

## Phase 1: Database Schema Architecture
- [/] Modify `Laboratory.js` — add staffMembers, tatTargets, testCatalog
- [ ] Create `LabOrder.js` model
- [ ] Create `LabSample.js` model
- [ ] Create migration script `migration_labinvestigation_to_laborder.js`

## Phase 2: Backend Engines
- [ ] Create `labRoutingEngine.js` service
- [ ] Refactor `laboratoryController.js` for LabOrder/LabSample
- [ ] Update `laboratoryRoutes.js`
- [ ] Expand `pdfGenerator.js` (section reports + merging + amended)
- [ ] Update `notificationService.js` (new notification types)
- [ ] Update `referralController.js` (use auto-routing on lab referral creation)

## Phase 3: Frontend Workbenches
- [ ] Create `ReceptionDesk.jsx`
- [ ] Create `TechnicianWorkbench.jsx`
- [ ] Create `ValidationQueue.jsx`
- [ ] Create `ManagerDashboard.jsx` (lab manager)
- [ ] Refactor `LaboratoryDashboard.jsx` (role router)
- [ ] Refactor `LaboratoryInvestigations.jsx` (LabOrder/LabSample API)
- [ ] Update `ConsultantLabReferrals.jsx` (multi-sample view)

## Phase 4: Routing & Sidebar
- [ ] Update `App.jsx` (new lab routes)
- [ ] Update `DashboardLayout.jsx` (lab sidebar nav)

## Phase 5: Verification
- [ ] Run migration script test
- [ ] Verify auto-routing logic
- [ ] Verify report merging
- [ ] Verify TAT countdown UI
- [ ] Build check (frontend + backend)
