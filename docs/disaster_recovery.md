# Bestcrow Disaster Recovery & Rollback Runbook

> **Scope:** Production operational procedures for state restoration, SQLite WAL snapshot recovery, and Kubernetes zero-downtime rollback drills.  
> **Recovery Targets:**  
> - **Recovery Point Objective (RPO):** $< 60$ seconds (continuous event indexer slot reconciliation).  
> - **Recovery Time Objective (RTO):** $< 5$ minutes (automated point-in-time snapshot restoration).  

---

## 1. Architecture Overview

Bestcrow utilizes a multi-tiered state resilience model:
1. **Primary Source of Truth:** On-chain Solana Program Derived Addresses (PDAs) holding non-custodial capital escrow accounts, milestone tranches, and backer voting ledgers.
2. **Local Operational Cache:** SQLite WAL (Write-Ahead Logging) database indexing historical events, campaign summaries, and off-chain deliverables.
3. **Automated Online Snapshots:** Non-blocking point-in-time database snapshots created via `VACUUM INTO` and stored in persistent volume mounts (`/data/backups`).

---

## 2. Point-in-Time Database Recovery Drill

In the event of filesystem corruption, node termination, or catastrophic data loss, execute the following restoration procedure:

### Step 1: Halt Active Backend Write Ingestion
Stop or scale down the backend pod to prevent conflicting writes during disk recovery:
```bash
kubectl scale deployment bestcrow-backend --replicas=0 -n bestcrow
```

### Step 2: Locate and Inspect the Latest Consistent Snapshot
Navigate to the backup directory and verify the most recent SQLite snapshot:
```bash
ls -lt /data/backups/*.sqlite
```

Verify snapshot structural integrity using the built-in integrity checker:
```bash
sqlite3 /data/backups/bestcrow_snapshot_<TIMESTAMP>.sqlite "PRAGMA integrity_check;"
# Expected output: ok
```

### Step 3: Restore Database File
Archive the corrupted database and replace it with the verified snapshot:
```bash
# Archive corrupted state for post-mortem analysis
mv /data/bestcrow.sqlite /data/bestcrow_corrupted_$(date +%s).sqlite

# Restore from snapshot
cp /data/backups/bestcrow_snapshot_<TIMESTAMP>.sqlite /data/bestcrow.sqlite

# Ensure correct permissions
chmod 644 /data/bestcrow.sqlite
```

### Step 4: Resume Backend & Reconcile On-Chain Events
Scale backend replicas back up:
```bash
kubectl scale deployment bestcrow-backend --replicas=2 -n bestcrow
```

Upon startup:
1. `PRAGMA journal_mode = WAL;` is automatically initialized.
2. The `SolanaIndexer` queries `processed_transactions` and resumes signature ingestion from the latest confirmed slot.
3. Verify server logs:
```bash
kubectl logs -f deployment/bestcrow-backend -n bestcrow | grep "[Bestcrow]"
```

---

## 3. Kubernetes / Helm Rollback Drill

If a newly deployed Helm release exhibits regressions or fails readiness checks, execute an immediate rollback:

### Step 1: Query Release Revision History
```bash
helm history bestcrow -n bestcrow
```

Sample output:
```
REVISION    UPDATED                     STATUS          CHART              APP VERSION    DESCRIPTION
1           Sat Oct 17 18:00:00 2026    superseded      bestcrow-1.0.0     1.0.0          Install complete
2           Sat Oct 17 21:00:00 2026    deployed        bestcrow-1.0.1     1.0.1          Upgrade failed
```

### Step 2: Trigger Rollback
Roll back to the previous stable release revision:
```bash
helm rollback bestcrow 1 -n bestcrow --wait --timeout 30s
```

### Step 3: Validate Pod Health & Probe Readiness
Verify that rolling replacement completed with zero downtime:
```bash
kubectl get pods -n bestcrow -l app.kubernetes.io/name=bestcrow
curl -fsS http://<INGRESS_HOST>/api/health
```

---

## 4. Disaster Recovery Validation Checklist

- [ ] Online database snapshot generated via `VACUUM INTO` without locking active requests.
- [ ] Snapshot file passes `PRAGMA integrity_check` returning string `"ok"`.
- [ ] Database recovery restores all campaign, milestone, and backer records with zero data loss.
- [ ] `SolanaIndexer` skips previously processed signatures and backfills missed slots within $< 10$ seconds.
- [ ] Helm rollback executes in $< 30$ seconds with 0 downtime.
