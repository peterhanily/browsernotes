import type { Folder, Note, Task, TimelineEvent, Timeline, StandaloneIOC, Whiteboard, Tag } from '../types';

const SAMPLE_FOLDER_ID = 'sample-investigation';
const SAMPLE_TIMELINE_ID = 'sample-timeline-1';

function sampleId(prefix: string, n: number): string {
  return `sample-${prefix}-${n}`;
}

export function isSampleEntity(id: string): boolean {
  return id.startsWith('sample-');
}

export function generateSampleInvestigation(): {
  folder: Folder;
  notes: Note[];
  tasks: Task[];
  timelineEvents: TimelineEvent[];
  timeline: Timeline;
  standaloneIOCs: StandaloneIOC[];
  whiteboard: Whiteboard;
  tags: Tag[];
} {
  const now = Date.now();
  const DAY = 86400000;
  const HOUR = 3600000;
  const MIN = 60000;

  // Base timestamp: 7 days ago (start of the 5-day attack window)
  const baseTs = now - 7 * DAY;

  // ─── Tags ──────────────────────────────────────────────────────────
  const tags: Tag[] = [
    { id: sampleId('tag', 1), name: 'midnight-typhoon', color: '#ef4444' },
    { id: sampleId('tag', 2), name: 'supply-chain', color: '#f97316' },
    { id: sampleId('tag', 3), name: 'cloud', color: '#3b82f6' },
    { id: sampleId('tag', 4), name: 'exfiltration', color: '#a855f7' },
    { id: sampleId('tag', 5), name: 'legal-data', color: '#ec4899' },
    { id: sampleId('tag', 6), name: 'persistence', color: '#14b8a6' },
    { id: sampleId('tag', 7), name: 'initial-access', color: '#f59e0b' },
    { id: sampleId('tag', 8), name: 'remediation', color: '#22c55e' },
  ];

  // ─── Folder ────────────────────────────────────────────────────────
  const folder: Folder = {
    id: SAMPLE_FOLDER_ID,
    name: 'Operation DARK GLACIER — OpenSlaw.ai Compromise (Sample)',
    description: `# Operation DARK GLACIER

**Victim:** OpenSlaw.ai — AI-powered legal document platform
**Threat Actor:** Midnight Typhoon (APT, nation-state nexus)
**Attack Vector:** Supply-chain compromise via poisoned npm package (\`@pdfcore/render\`) + secondary phishing campaign
**Impact:** Exfiltration of privileged legal documents, cloud infrastructure compromise, credential theft

## Summary

Midnight Typhoon compromised a third-party PDF processing library used by OpenSlaw.ai, injecting a backdoor into the build pipeline. The backdoor established C2 via domain-fronted HTTPS and DNS tunneling. Attackers pivoted through AWS infrastructure, harvested IAM credentials and SSO tokens, and staged 2.3 GB of legal documents for exfiltration to servers in Bucharest and Singapore.

This sample investigation demonstrates every ThreatCaddy feature — notes, IOCs, timelines, entity graphs, whiteboards, tasks, data import, and more. **Delete it when done exploring.**`,
    status: 'active',
    clsLevel: 'TLP:AMBER',
    papLevel: 'PAP:AMBER',
    order: 999,
    createdAt: baseTs,
    updatedAt: now,
    timelineId: SAMPLE_TIMELINE_ID,
    tags: ['midnight-typhoon', 'supply-chain'],
  };

  // ─── Timeline ──────────────────────────────────────────────────────
  const timeline: Timeline = {
    id: SAMPLE_TIMELINE_ID,
    name: 'DARK GLACIER Incident Timeline',
    description: 'Five-day attack window from initial supply-chain compromise through exfiltration and containment',
    color: '#ef4444',
    order: 1,
    createdAt: baseTs,
    updatedAt: now,
  };

  // ─── Notes (12) ────────────────────────────────────────────────────
  const notes: Note[] = [
    // Note 1: Executive Summary
    {
      id: sampleId('note', 1),
      title: 'Executive Summary — Operation DARK GLACIER',
      content: `# Executive Summary — Operation DARK GLACIER

## Incident Overview

On ${new Date(baseTs).toLocaleDateString()}, the OpenSlaw.ai security team detected anomalous outbound traffic from production servers. Investigation revealed a sophisticated supply-chain attack through a compromised npm dependency (\`@pdfcore/render v3.2.1\`), attributed to the threat actor **Midnight Typhoon**.

## Key Findings

- **Initial Access:** Backdoored npm package \`@pdfcore/render\` v3.2.1 deployed to OpenSlaw.ai production via routine dependency update
- **Secondary Vector:** Targeted phishing campaign against 5 OpenSlaw.ai engineers using spoofed DocuSign notifications
- **C2 Channels:** Domain-fronted HTTPS (cdn-assets-proxy.com → 185.220.101.34) and DNS tunneling (data.update-svc-cdn.net)
- **Credential Theft:** AWS IAM keys, SSO session tokens, and database credentials harvested
- **Lateral Movement:** Pivot from build server → production API servers → AWS S3/RDS → backup infrastructure
- **Exfiltration:** 2.3 GB of privileged legal documents staged in Bucharest (185.156.73.22), landed in Singapore
- **MITRE ATT&CK:** T1195.002, T1566.001, T1059.001, T1078.004, T1537, T1567.002, T1071.001, T1572

## Impact Assessment

- **Confidential legal documents** from 47 client matters potentially exposed
- **Attorney-client privileged** communications compromised
- **Regulatory exposure:** GDPR, SOC 2, attorney-client privilege implications
- **Estimated remediation cost:** $2.4M

## Related Analysis

See detailed notes on: [Phishing Campaign](#), [Malware Analysis](#), [Cloud Pivot](#), [C2 Infrastructure](#), [Credential Harvesting](#), [Data Exfiltration](#), [Lateral Movement](#), [Threat Actor Profile](#)`,
      folderId: SAMPLE_FOLDER_ID,
      tags: ['midnight-typhoon'],
      pinned: true,
      archived: false,
      trashed: false,
      clsLevel: 'TLP:AMBER',
      linkedNoteIds: [sampleId('note', 2), sampleId('note', 3), sampleId('note', 4), sampleId('note', 5), sampleId('note', 6), sampleId('note', 7), sampleId('note', 8), sampleId('note', 9), sampleId('note', 11)],
      iocAnalysis: {
        extractedAt: baseTs + HOUR,
        iocs: [
          { id: 'sioc-exec-1', type: 'domain', value: 'cdn-assets-proxy.com', confidence: 'confirmed', firstSeen: baseTs, dismissed: false, attribution: 'Midnight Typhoon', relationships: [{ targetIOCId: '185.220.101.34', relationshipType: 'resolves-to' }] },
          { id: 'sioc-exec-2', type: 'ipv4', value: '185.220.101.34', confidence: 'confirmed', firstSeen: baseTs, dismissed: false, attribution: 'Midnight Typhoon' },
          { id: 'sioc-exec-3', type: 'domain', value: 'update-svc-cdn.net', confidence: 'confirmed', firstSeen: baseTs, dismissed: false, attribution: 'Midnight Typhoon', relationships: [{ targetIOCId: '91.215.85.17', relationshipType: 'resolves-to' }] },
          { id: 'sioc-exec-4', type: 'ipv4', value: '185.156.73.22', confidence: 'high', firstSeen: baseTs + 3 * DAY, dismissed: false, attribution: 'Midnight Typhoon' },
        ],
      },
      iocTypes: ['domain', 'ipv4'],
      createdAt: baseTs,
      updatedAt: baseTs + 2 * HOUR,
    },
    // Note 2: Initial Compromise
    {
      id: sampleId('note', 2),
      title: 'Initial Compromise — Supply Chain via @pdfcore/render',
      content: `# Initial Compromise — Supply Chain Attack

## Attack Vector

The threat actor compromised the npm registry account of the maintainer of \`@pdfcore/render\`, a PDF processing library used by OpenSlaw.ai's document ingestion pipeline.

### Timeline

1. **T-14 days:** Midnight Typhoon gains access to maintainer's npm account (credential stuffing, no MFA)
2. **T-10 days:** Publishes v3.2.1 with backdoor in \`src/renderer/init.js\`
3. **T-7 days (${new Date(baseTs).toLocaleDateString()}):** OpenSlaw.ai CI/CD pipeline pulls updated dependency during routine build
4. **T-7 days +2h:** Backdoored build deployed to production

### Backdoor Analysis

The injected code in \`init.js\`:
- Decodes a base64 payload from a string disguised as a PDF font mapping table
- Spawns a child process that establishes C2 via HTTPS to \`cdn-assets-proxy.com\`
- Implements DNS tunneling fallback via \`data.update-svc-cdn.net\`
- Harvests environment variables (AWS keys, DB connection strings)
- Beacon interval: 45s with 25% jitter

### MITRE ATT&CK
- **T1195.002** — Supply Chain Compromise: Compromise Software Supply Chain
- **T1059.001** — Command and Scripting Interpreter: PowerShell / Node.js`,
      folderId: SAMPLE_FOLDER_ID,
      tags: ['supply-chain', 'initial-access'],
      pinned: false,
      archived: false,
      trashed: false,
      clsLevel: 'TLP:AMBER',
      iocAnalysis: {
        extractedAt: baseTs + 3 * HOUR,
        iocs: [
          { id: 'sioc-sc-1', type: 'url', value: 'https://registry.npmjs.org/@pdfcore/render/-/render-3.2.1.tgz', confidence: 'confirmed', firstSeen: baseTs - 10 * DAY, dismissed: false },
          { id: 'sioc-sc-2', type: 'sha256', value: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', confidence: 'confirmed', firstSeen: baseTs, dismissed: false, attribution: 'Midnight Typhoon', relationships: [{ targetIOCId: 'cdn-assets-proxy.com', relationshipType: 'communicates-with' }, { targetIOCId: 'CVE-2024-38856', relationshipType: 'exploits' }] },
          { id: 'sioc-sc-3', type: 'mitre-attack', value: 'T1195.002', confidence: 'confirmed', firstSeen: baseTs, dismissed: false },
        ],
      },
      iocTypes: ['url', 'sha256', 'mitre-attack'],
      createdAt: baseTs + HOUR,
      updatedAt: baseTs + 4 * HOUR,
    },
    // Note 3: Phishing Campaign
    {
      id: sampleId('note', 3),
      title: 'Phishing Campaign — DocuSign Lure Targeting Engineers',
      content: `# Phishing Campaign Analysis

## Overview

Concurrent with the supply-chain attack, Midnight Typhoon launched a targeted phishing campaign against 5 OpenSlaw.ai software engineers. The campaign used spoofed DocuSign notifications to harvest SSO credentials.

## Email Details

- **From:** noreply@docusign-notifications.openslaw-legal.com
- **Subject:** "[DocuSign] OpenSlaw Q4 Equity Vesting — Signature Required"
- **Sent:** ${new Date(baseTs + 6 * HOUR).toISOString()}
- **Recipients:** 5 senior engineers (platform, infra, security teams)
- **2 clicks, 1 credential submission confirmed** (engineer: m.chen@openslaw.ai)

## Phishing Infrastructure

| Component | Value |
|-----------|-------|
| Sender domain | docusign-notifications.openslaw-legal.com |
| Landing page | hxxps://app.docusign-verify.openslaw-legal.com/sign/review |
| Hosting IP | 89.44.9.241 (Amsterdam, NL) |
| SSL cert | Let's Encrypt, issued 3 days prior |
| Registrar | Namecheap, registered 5 days prior |

## Credential Harvesting

The landing page cloned the DocuSign SSO flow and proxied authentication to the real OpenSlaw Okta tenant, capturing session tokens in real-time (Evilginx-style).

### MITRE ATT&CK
- **T1566.001** — Phishing: Spearphishing Attachment
- **T1078.004** — Valid Accounts: Cloud Accounts`,
      folderId: SAMPLE_FOLDER_ID,
      tags: ['midnight-typhoon', 'initial-access'],
      pinned: false,
      archived: false,
      trashed: false,
      clsLevel: 'TLP:AMBER',
      iocAnalysis: {
        extractedAt: baseTs + 8 * HOUR,
        iocs: [
          { id: 'sioc-ph-1', type: 'email', value: 'noreply@docusign-notifications.openslaw-legal.com', confidence: 'confirmed', firstSeen: baseTs + 6 * HOUR, dismissed: false },
          { id: 'sioc-ph-2', type: 'domain', value: 'openslaw-legal.com', confidence: 'confirmed', firstSeen: baseTs + 6 * HOUR, dismissed: false, attribution: 'Midnight Typhoon', relationships: [{ targetIOCId: '89.44.9.241', relationshipType: 'resolves-to' }] },
          { id: 'sioc-ph-3', type: 'url', value: 'https://app.docusign-verify.openslaw-legal.com/sign/review', confidence: 'confirmed', firstSeen: baseTs + 6 * HOUR, dismissed: false, relationships: [{ targetIOCId: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', relationshipType: 'downloads' }] },
          { id: 'sioc-ph-4', type: 'ipv4', value: '89.44.9.241', confidence: 'confirmed', firstSeen: baseTs + 6 * HOUR, dismissed: false },
          { id: 'sioc-ph-5', type: 'mitre-attack', value: 'T1566.001', confidence: 'confirmed', firstSeen: baseTs + 6 * HOUR, dismissed: false },
        ],
      },
      iocTypes: ['email', 'domain', 'url', 'ipv4', 'mitre-attack'],
      createdAt: baseTs + 7 * HOUR,
      updatedAt: baseTs + 10 * HOUR,
    },
    // Note 4: Malware Analysis
    {
      id: sampleId('note', 4),
      title: 'Malware Analysis — Backdoored PDF Parser Binary',
      content: `# Malware Analysis: @pdfcore/render v3.2.1 Backdoor

## Static Analysis

- **Package:** @pdfcore/render v3.2.1
- **Backdoor location:** \`src/renderer/init.js\` (lines 847-912)
- **SHA-256 (package tarball):** e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
- **SHA-256 (dropped binary):** 7d865e959b2466918c9863afca942d0fb89d7c9ac0c99bafc3749504ded97730
- **MD5 (dropped binary):** a3f2b8c91e4d57f6a8b3c2d1e0f9a8b7

## Behavioral Analysis

1. On module load, decodes base64 payload hidden in font table constant
2. Drops native binary \`libpdfmetrics.node\` to \`node_modules/.cache/\`
3. Binary capabilities:
   - HTTPS C2 with domain fronting (CloudFront → cdn-assets-proxy.com)
   - DNS tunneling fallback (TXT records to data.update-svc-cdn.net)
   - Environment variable harvesting (AWS_*, DATABASE_*, OKTA_*)
   - File system reconnaissance
   - Process injection into Node.js worker threads
4. Anti-analysis: Checks for sandbox artifacts, delays execution by 120s

## Dropped Artifacts

| File | Hash (SHA-256) | Purpose |
|------|---------------|---------|
| libpdfmetrics.node | 7d865e959b2466918c9863afca942d0fb89d7c9ac0c99bafc3749504ded97730 | Main implant |
| .cache/.pdfrc | — | Encrypted config (C2 endpoints, exfil keys) |

## MITRE ATT&CK
- **T1059.001** — Command and Scripting Interpreter
- **T1547.001** — Boot or Logon Autostart Execution
- **T1195.002** — Supply Chain Compromise`,
      folderId: SAMPLE_FOLDER_ID,
      tags: ['midnight-typhoon', 'supply-chain'],
      pinned: false,
      archived: false,
      trashed: false,
      clsLevel: 'TLP:AMBER',
      iocAnalysis: {
        extractedAt: baseTs + DAY,
        iocs: [
          { id: 'sioc-mal-1', type: 'sha256', value: '7d865e959b2466918c9863afca942d0fb89d7c9ac0c99bafc3749504ded97730', confidence: 'confirmed', firstSeen: baseTs, dismissed: false, attribution: 'Midnight Typhoon', relationships: [{ targetIOCId: 'cdn-assets-proxy.com', relationshipType: 'communicates-with' }, { targetIOCId: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', relationshipType: 'drops' }] },
          { id: 'sioc-mal-2', type: 'md5', value: 'a3f2b8c91e4d57f6a8b3c2d1e0f9a8b7', confidence: 'confirmed', firstSeen: baseTs, dismissed: false },
          { id: 'sioc-mal-3', type: 'mitre-attack', value: 'T1059.001', confidence: 'confirmed', firstSeen: baseTs, dismissed: false },
          { id: 'sioc-mal-4', type: 'mitre-attack', value: 'T1547.001', confidence: 'confirmed', firstSeen: baseTs, dismissed: false },
        ],
      },
      iocTypes: ['sha256', 'md5', 'mitre-attack'],
      createdAt: baseTs + 10 * HOUR,
      updatedAt: baseTs + DAY + 2 * HOUR,
    },
    // Note 5: Cloud Infrastructure Pivot
    {
      id: sampleId('note', 5),
      title: 'Cloud Infrastructure Pivot — AWS Lateral Movement',
      content: `# Cloud Infrastructure Pivot

## Attack Progression

After the backdoored package was deployed to the build server, Midnight Typhoon used harvested environment variables to pivot through OpenSlaw.ai's AWS infrastructure.

### Credential Chain

1. **Build server** → AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY (CI role: \`openslaw-ci-deploy\`)
2. CI role → AssumeRole to \`openslaw-prod-api\` (overprivileged trust policy)
3. Prod API role → S3 full access, RDS read replicas, SES sending
4. Stolen Okta SSO token (from phishing) → AWS SSO → \`openslaw-admin\` role

### Observed Actions

| Time | Action | Resource |
|------|--------|----------|
| T+4h | ListBuckets | All S3 buckets enumerated |
| T+6h | GetObject (bulk) | s3://openslaw-legal-docs/* |
| T+8h | CreateDBSnapshot | RDS \`openslaw-prod-db\` |
| T+12h | DescribeInstances | Full EC2 inventory |
| T+18h | AssumeRole | \`openslaw-backup-admin\` |
| T+24h | GetObject | s3://openslaw-db-backups/* |

### MITRE ATT&CK
- **T1078.004** — Valid Accounts: Cloud Accounts
- **T1537** — Transfer Data to Cloud Account
- **T1580** — Cloud Infrastructure Discovery`,
      folderId: SAMPLE_FOLDER_ID,
      tags: ['cloud', 'midnight-typhoon'],
      pinned: false,
      archived: false,
      trashed: false,
      clsLevel: 'TLP:AMBER',
      iocAnalysis: {
        extractedAt: baseTs + DAY + 4 * HOUR,
        iocs: [
          { id: 'sioc-cloud-1', type: 'mitre-attack', value: 'T1078.004', confidence: 'confirmed', firstSeen: baseTs + 4 * HOUR, dismissed: false },
          { id: 'sioc-cloud-2', type: 'mitre-attack', value: 'T1537', confidence: 'high', firstSeen: baseTs + DAY, dismissed: false },
        ],
      },
      iocTypes: ['mitre-attack'],
      createdAt: baseTs + DAY,
      updatedAt: baseTs + DAY + 6 * HOUR,
    },
    // Note 6: C2 Infrastructure
    {
      id: sampleId('note', 6),
      title: 'C2 Infrastructure — Domain Fronting & DNS Tunneling',
      content: `# C2 Infrastructure

## Primary C2: Domain-Fronted HTTPS

- **Fronting domain:** cdn-assets-proxy.com (behind CloudFront)
- **True origin IP:** 185.220.101.34 (Moscow, RU — AS50867)
- **Protocol:** HTTPS/443 with TLS 1.3
- **Beacon interval:** 45s ± 25% jitter
- **User-Agent:** Mimics legitimate CloudFront SDK traffic
- **Data encoding:** Custom binary protocol over HTTP/2 streams

## Secondary C2: DNS Tunneling

- **Domain:** data.update-svc-cdn.net
- **Authoritative NS IP:** 91.215.85.17 (Shanghai, CN — AS4134)
- **Protocol:** DNS TXT records, base32-encoded payloads
- **Used for:** Backup C2, low-bandwidth command relay
- **Beacon:** Every 300s when primary C2 unavailable

## Exfiltration Endpoints

- **Primary staging:** 185.156.73.22 (Bucharest, RO — AS9009)
- **Data landing:** 103.253.41.98 (Singapore, SG — AS133618)
- **Protocol:** HTTPS with client certificate authentication

## Infrastructure Registration

| Domain | Registrar | Created | Nameserver |
|--------|-----------|---------|------------|
| cdn-assets-proxy.com | Njalla | T-21 days | ns1.njal.la |
| update-svc-cdn.net | Porkbun | T-18 days | Custom NS (91.215.85.17) |
| openslaw-legal.com | Namecheap | T-12 days | Namecheap DNS |

### MITRE ATT&CK
- **T1071.001** — Application Layer Protocol: Web Protocols
- **T1572** — Protocol Tunneling`,
      folderId: SAMPLE_FOLDER_ID,
      tags: ['midnight-typhoon'],
      pinned: false,
      archived: false,
      trashed: false,
      clsLevel: 'TLP:AMBER',
      iocAnalysis: {
        extractedAt: baseTs + DAY + 8 * HOUR,
        iocs: [
          { id: 'sioc-c2-1', type: 'domain', value: 'cdn-assets-proxy.com', confidence: 'confirmed', firstSeen: baseTs, dismissed: false, attribution: 'Midnight Typhoon', relationships: [{ targetIOCId: '185.220.101.34', relationshipType: 'resolves-to' }] },
          { id: 'sioc-c2-2', type: 'ipv4', value: '185.220.101.34', confidence: 'confirmed', firstSeen: baseTs, dismissed: false, attribution: 'Midnight Typhoon' },
          { id: 'sioc-c2-3', type: 'domain', value: 'update-svc-cdn.net', confidence: 'confirmed', firstSeen: baseTs, dismissed: false, attribution: 'Midnight Typhoon', relationships: [{ targetIOCId: '91.215.85.17', relationshipType: 'resolves-to' }] },
          { id: 'sioc-c2-4', type: 'ipv4', value: '91.215.85.17', confidence: 'high', firstSeen: baseTs + 2 * HOUR, dismissed: false, attribution: 'Midnight Typhoon' },
          { id: 'sioc-c2-5', type: 'mitre-attack', value: 'T1071.001', confidence: 'confirmed', firstSeen: baseTs, dismissed: false },
          { id: 'sioc-c2-6', type: 'mitre-attack', value: 'T1572', confidence: 'confirmed', firstSeen: baseTs, dismissed: false },
        ],
      },
      iocTypes: ['domain', 'ipv4', 'mitre-attack'],
      createdAt: baseTs + DAY + 6 * HOUR,
      updatedAt: baseTs + DAY + 10 * HOUR,
    },
    // Note 7: Credential Harvesting
    {
      id: sampleId('note', 7),
      title: 'Credential Harvesting — Cloud IAM & SSO Tokens',
      content: `# Credential Harvesting

## Harvested Credentials

### Via Supply-Chain Backdoor (Environment Variables)
| Credential | Source | Access Level |
|-----------|--------|-------------|
| AWS_ACCESS_KEY_ID (AKIA...) | Build server env | CI deploy role |
| DATABASE_URL | Build server env | RDS read/write |
| OKTA_API_TOKEN | Build server env | SSO admin read |

### Via Phishing (Evilginx Session Hijack)
| Credential | Source | Access Level |
|-----------|--------|-------------|
| Okta session token (m.chen) | Phishing proxy | Full SSO access |
| AWS SSO session | Okta → AWS SSO | openslaw-admin role |

### Via Cloud Pivot
| Credential | Source | Access Level |
|-----------|--------|-------------|
| AssumeRole token (prod-api) | CI trust policy | S3, RDS, SES |
| AssumeRole token (backup-admin) | Prod-api trust | S3 backup access |

## Impact

- 6 distinct credential sets compromised
- Full access to production data stores
- Admin-level cloud management access
- Estimated 47 client matters' data accessible

### MITRE ATT&CK
- **T1003.006** — OS Credential Dumping: DCSync (cloud equivalent)
- **T1078.004** — Valid Accounts: Cloud Accounts`,
      folderId: SAMPLE_FOLDER_ID,
      tags: ['cloud', 'midnight-typhoon'],
      pinned: false,
      archived: false,
      trashed: false,
      clsLevel: 'TLP:RED',
      iocAnalysis: {
        extractedAt: baseTs + 2 * DAY,
        iocs: [
          { id: 'sioc-cred-1', type: 'mitre-attack', value: 'T1003.006', confidence: 'high', firstSeen: baseTs + DAY, dismissed: false },
        ],
      },
      iocTypes: ['mitre-attack'],
      createdAt: baseTs + DAY + 8 * HOUR,
      updatedAt: baseTs + 2 * DAY + 4 * HOUR,
    },
    // Note 8: Data Exfiltration
    {
      id: sampleId('note', 8),
      title: 'Data Exfiltration — Legal Document Staging & Transfer',
      content: `# Data Exfiltration

## Staging Phase (Day 3-4)

The attacker used the compromised \`openslaw-prod-api\` role to bulk-download documents from S3:

- **Source:** s3://openslaw-legal-docs/ (47 client matter prefixes)
- **Volume:** ~2.3 GB across 12,847 documents
- **Method:** GetObject calls from us-east-1 EC2 instance (attacker-controlled)
- **Staging server:** 185.156.73.22 (Bucharest, RO)

## Transfer Phase (Day 4)

- **Destination:** 103.253.41.98 (Singapore, SG)
- **Protocol:** HTTPS with mutual TLS authentication
- **Duration:** ~6 hours, throttled to avoid bandwidth alerts
- **Data:** Compressed archives (7z, AES-256 encrypted)
- **Total exfiltrated:** 2.3 GB

## Document Categories Affected

| Category | Count | Sensitivity |
|----------|-------|-------------|
| Merger agreements | 3,200 | Attorney-client privileged |
| Due diligence reports | 2,100 | Confidential |
| Litigation documents | 4,500 | Attorney work product |
| Regulatory filings (draft) | 1,800 | Material non-public |
| Client communications | 1,247 | Privileged |

### MITRE ATT&CK
- **T1567.002** — Exfiltration Over Web Service: Exfiltration to Cloud Storage
- **T1560.001** — Archive Collected Data: Archive via Utility
- **T1041** — Exfiltration Over C2 Channel`,
      folderId: SAMPLE_FOLDER_ID,
      tags: ['exfiltration', 'legal-data'],
      pinned: false,
      archived: false,
      trashed: false,
      clsLevel: 'TLP:RED',
      iocAnalysis: {
        extractedAt: baseTs + 3 * DAY + 4 * HOUR,
        iocs: [
          { id: 'sioc-exfil-1', type: 'ipv4', value: '185.156.73.22', confidence: 'confirmed', firstSeen: baseTs + 3 * DAY, dismissed: false, attribution: 'Midnight Typhoon' },
          { id: 'sioc-exfil-2', type: 'ipv4', value: '103.253.41.98', confidence: 'high', firstSeen: baseTs + 4 * DAY, dismissed: false, attribution: 'Midnight Typhoon' },
          { id: 'sioc-exfil-3', type: 'mitre-attack', value: 'T1567.002', confidence: 'confirmed', firstSeen: baseTs + 3 * DAY, dismissed: false },
          { id: 'sioc-exfil-4', type: 'mitre-attack', value: 'T1560.001', confidence: 'high', firstSeen: baseTs + 3 * DAY, dismissed: false },
        ],
      },
      iocTypes: ['ipv4', 'mitre-attack'],
      createdAt: baseTs + 3 * DAY,
      updatedAt: baseTs + 4 * DAY,
    },
    // Note 9: Lateral Movement
    {
      id: sampleId('note', 9),
      title: 'Lateral Movement — Network Mapping & Cloud Pivot',
      content: `# Lateral Movement Observations

## Build Server → Production

The backdoored \`@pdfcore/render\` ran in the CI/CD pipeline context on the build server. From there:

1. Harvested AWS credentials from environment variables
2. Used CI deploy role to enumerate AWS resources
3. Assumed \`openslaw-prod-api\` role via overprivileged trust policy
4. Accessed production S3 buckets and RDS instances

## Phishing → Cloud Admin

The phished SSO session (m.chen) provided:
1. Direct access to AWS SSO console
2. Assumed \`openslaw-admin\` role
3. Full CloudTrail access (disabled logging for 4 hours)
4. Created snapshot of production RDS
5. Launched EC2 instance in us-east-1 for data staging

## Network Mapping

CloudTrail logs show extensive reconnaissance:
- DescribeInstances, DescribeSubnets, DescribeSecurityGroups
- ListBuckets, ListUsers, ListRoles
- GetCallerIdentity from 3 different role contexts

### Affected Systems

| System | Access Level | Evidence |
|--------|-------------|----------|
| build-server-01 | Code execution | Backdoored dependency |
| openslaw-api-prod (3 instances) | API-level | Stolen deploy keys |
| s3://openslaw-legal-docs | Read | Stolen IAM role |
| s3://openslaw-db-backups | Read | Role chain |
| RDS openslaw-prod-db | Snapshot created | Admin SSO |
| CloudTrail | Disabled 4h | Admin SSO |

### MITRE ATT&CK
- **T1021.001** — Remote Services: Remote Desktop Protocol (cloud equivalent: SSO)
- **T1580** — Cloud Infrastructure Discovery`,
      folderId: SAMPLE_FOLDER_ID,
      tags: ['cloud', 'midnight-typhoon'],
      pinned: false,
      archived: false,
      trashed: false,
      clsLevel: 'TLP:AMBER',
      iocAnalysis: {
        extractedAt: baseTs + 2 * DAY + 8 * HOUR,
        iocs: [
          { id: 'sioc-lat-1', type: 'mitre-attack', value: 'T1021.001', confidence: 'high', firstSeen: baseTs + DAY, dismissed: false },
        ],
      },
      iocTypes: ['mitre-attack'],
      createdAt: baseTs + 2 * DAY,
      updatedAt: baseTs + 2 * DAY + 10 * HOUR,
    },
    // Note 10: Remediation Playbook
    {
      id: sampleId('note', 10),
      title: 'Remediation Playbook',
      content: `# Remediation Playbook — Operation DARK GLACIER

## Phase 1: Immediate Containment (0-4h)

- [x] Isolate build server from network
- [x] Revoke all AWS IAM keys associated with CI pipeline
- [x] Invalidate all Okta SSO sessions
- [x] Block C2 domains/IPs at WAF and DNS level
- [x] Enable CloudTrail logging (was disabled by attacker)
- [ ] Kill attacker EC2 instance in us-east-1

## Phase 2: Eradication (4-48h)

- [x] Roll back @pdfcore/render to v3.1.9 (last known good)
- [x] Pin all npm dependencies with integrity hashes
- [ ] Rotate ALL AWS IAM credentials (including service accounts)
- [ ] Rotate database passwords and connection strings
- [ ] Rebuild build server from golden image
- [ ] Deploy updated WAF rules for domain fronting detection

## Phase 3: Recovery (48h-7d)

- [ ] Rebuild CI/CD pipeline with dependency scanning
- [ ] Implement npm lockfile integrity verification
- [ ] Deploy AWS GuardDuty and enable S3 data events
- [ ] Implement least-privilege IAM policies
- [ ] Enable MFA on all npm registry accounts (coordinate with vendor)
- [ ] Conduct tabletop exercise

## Phase 4: Long-term Improvements

- [ ] Implement SCA (Software Composition Analysis) in CI
- [ ] Deploy runtime application self-protection (RASP)
- [ ] Segment build infrastructure from production
- [ ] Implement break-glass procedures for admin roles
- [ ] Client notification and regulatory reporting`,
      folderId: SAMPLE_FOLDER_ID,
      tags: ['remediation'],
      pinned: false,
      archived: false,
      trashed: false,
      clsLevel: 'TLP:AMBER',
      createdAt: baseTs + 4 * DAY,
      updatedAt: baseTs + 5 * DAY,
    },
    // Note 11: Threat Actor Profile
    {
      id: sampleId('note', 11),
      title: 'Threat Actor Profile — Midnight Typhoon TTPs',
      content: `# Threat Actor Profile: Midnight Typhoon

## Overview

Midnight Typhoon is a sophisticated APT group with suspected nation-state sponsorship. First observed in 2022, the group targets legal tech, financial services, and government contractors, focusing on exfiltrating privileged communications and intellectual property.

## Known TTPs

### Initial Access
- Supply-chain attacks on npm/PyPI packages (favored)
- Spear-phishing with Evilginx-style credential proxying
- Exploitation of cloud misconfigurations

### Execution & Persistence
- Node.js/Python backdoors disguised as legitimate packages
- Domain fronting for C2 (CloudFront, Azure CDN)
- DNS tunneling as backup C2

### Collection & Exfiltration
- Cloud-native data theft (S3, Azure Blob, GCS)
- Staged exfil through multiple jurisdictions
- AES-256 encrypted archives
- Throttled transfer to avoid DLP alerts

## Infrastructure Preferences

- **Hosting:** Bulletproof providers in Eastern Europe, East Asia
- **Registration:** Privacy-focused registrars (Njalla, Porkbun)
- **C2:** Domain fronting through major CDNs
- **Exfil:** Multi-hop through Romania, Singapore, Hong Kong

## Previous Campaigns (Open Source)

1. **LegalEagle (2023):** Compromised legal document management SaaS
2. **CloudJack (2024):** Supply-chain attack on Python cloud SDK wrapper
3. **DarkGlacier (Current):** OpenSlaw.ai via @pdfcore/render

## Diamond Model

- **Adversary:** Midnight Typhoon
- **Capability:** High (custom tooling, supply-chain expertise, cloud-native)
- **Infrastructure:** Domain fronting, DNS tunneling, multi-hop exfil
- **Victim:** OpenSlaw.ai (legal tech, AI document platform)`,
      folderId: SAMPLE_FOLDER_ID,
      tags: ['midnight-typhoon'],
      pinned: false,
      archived: false,
      trashed: false,
      clsLevel: 'TLP:AMBER',
      createdAt: baseTs + 3 * DAY,
      updatedAt: baseTs + 4 * DAY + 6 * HOUR,
    },
    // Note 12: IOC Sharing Report Draft
    {
      id: sampleId('note', 12),
      title: 'IOC Sharing Report Draft',
      content: `# IOC Sharing Report — Operation DARK GLACIER

**Classification:** TLP:AMBER
**Date:** ${new Date(now).toLocaleDateString()}
**Author:** OpenSlaw.ai Security Team

## Network Indicators

| Type | Value | Confidence | Context |
|------|-------|------------|---------|
| Domain | cdn-assets-proxy.com | Confirmed | Primary C2 (domain fronted) |
| Domain | update-svc-cdn.net | Confirmed | DNS tunnel C2 |
| Domain | openslaw-legal.com | Confirmed | Phishing infrastructure |
| IPv4 | 185.220.101.34 | Confirmed | C2 server (Moscow) |
| IPv4 | 91.215.85.17 | High | DNS tunnel NS (Shanghai) |
| IPv4 | 89.44.9.241 | Confirmed | Phishing hosting (Amsterdam) |
| IPv4 | 185.156.73.22 | Confirmed | Exfil staging (Bucharest) |
| IPv4 | 103.253.41.98 | High | Data landing (Singapore) |
| URL | hxxps://app.docusign-verify.openslaw-legal.com/sign/review | Confirmed | Phishing landing |
| Email | noreply@docusign-notifications.openslaw-legal.com | Confirmed | Phishing sender |

## File Indicators

| Type | Value | Context |
|------|-------|---------|
| SHA-256 | e3b0c44298fc1c...7852b855 | Backdoored @pdfcore/render v3.2.1 |
| SHA-256 | 7d865e959b2466...ed97730 | Dropped implant (libpdfmetrics.node) |
| MD5 | a3f2b8c91e4d57f6a8b3c2d1e0f9a8b7 | Dropped implant |
| MD5 | c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2 | Encrypted config file |

## Vulnerability Indicators

| CVE | Description | Relevance |
|-----|------------|-----------|
| CVE-2024-38856 | npm registry auth bypass | Used for initial package compromise |
| CVE-2024-21413 | Outlook RCE | Exploited in phishing attachment variant |

## Attribution

Indicators align with known **Midnight Typhoon** infrastructure patterns, tooling, and TTPs. High confidence attribution based on:
- Overlap with CloudJack (2024) C2 infrastructure
- Consistent use of domain fronting + DNS tunnel dual-C2
- Target selection pattern (legal tech sector)
- Exfil routing through Romania → Singapore pipeline`,
      folderId: SAMPLE_FOLDER_ID,
      tags: ['midnight-typhoon'],
      pinned: false,
      archived: false,
      trashed: false,
      clsLevel: 'TLP:AMBER',
      iocAnalysis: {
        extractedAt: baseTs + 5 * DAY,
        iocs: [
          { id: 'sioc-rpt-1', type: 'domain', value: 'cdn-assets-proxy.com', confidence: 'confirmed', firstSeen: baseTs, dismissed: false, attribution: 'Midnight Typhoon' },
          { id: 'sioc-rpt-2', type: 'ipv4', value: '185.220.101.34', confidence: 'confirmed', firstSeen: baseTs, dismissed: false, attribution: 'Midnight Typhoon' },
        ],
      },
      iocTypes: ['domain', 'ipv4'],
      createdAt: baseTs + 5 * DAY,
      updatedAt: baseTs + 5 * DAY + 4 * HOUR,
    },
    // Note 13: SIEM Data Import
    {
      id: sampleId('note', 13),
      title: 'SIEM Log Import — Splunk CSV & CrowdStrike JSON',
      content: `# SIEM Data Import Log

## Imported Datasets

Two data sources were bulk-imported into this investigation using ThreatCaddy's **Data Import** feature (New → Import Data):

### 1. Splunk Alert Export (CSV)

\`\`\`
timestamp,src_ip,dst_ip,alert_name,severity,mitre_technique
${new Date(baseTs + 2 * HOUR).toISOString()},10.2.1.50,185.220.101.34,Outbound C2 Beacon,critical,T1071.001
${new Date(baseTs + 4 * HOUR).toISOString()},10.2.1.50,91.215.85.17,DNS Tunnel Activity,high,T1572
${new Date(baseTs + DAY).toISOString()},10.2.1.50,52.94.76.0,AWS API Enumeration,medium,T1580
\`\`\`

- **Format:** CSV with 847 rows
- **Auto-mapped columns:** timestamp, src_ip (IOC:IPv4), dst_ip (IOC:IPv4), alert_name (Event Title), severity (Confidence), mitre_technique (MITRE Technique)
- **Result:** 847 timeline events created, 23 unique IOCs extracted

### 2. CrowdStrike EDR Telemetry (JSON)

\`\`\`json
[
  {"timestamp": "${new Date(baseTs).toISOString()}", "ImageFileName": "libpdfmetrics.node", "SHA256": "7d865e959b2466...", "ParentImageFileName": "node.exe", "DetectName": "Backdoor/Node.Implant"},
  {"timestamp": "${new Date(baseTs + 45 * MIN).toISOString()}", "ImageFileName": "dns.exe", "DnsRequest": "data.update-svc-cdn.net", "DetectName": "SuspiciousDnsQuery"}
]
\`\`\`

- **Format:** JSON array with nested process tree objects
- **Auto-flattened:** \`process.parent.name\` → dot-notation columns
- **Result:** 312 timeline events, 8 unique file-path IOCs, 15 hash IOCs

## Import Feature Notes

The Data Import feature supports:
- **Paste or file drop** — CSV, TSV, JSON array, NDJSON
- **Auto-detection** — Format detection + column mapping for common SIEM schemas
- **Column override** — Manual mapping adjustment before import
- **Bulk creation** — Timeline events, standalone IOCs, and summary note in one step
- **Deduplication** — IOCs deduplicated by type:value pair`,
      folderId: SAMPLE_FOLDER_ID,
      tags: ['midnight-typhoon'],
      pinned: false,
      archived: false,
      trashed: false,
      clsLevel: 'TLP:AMBER',
      createdAt: baseTs + 5 * DAY + 2 * HOUR,
      updatedAt: baseTs + 5 * DAY + 6 * HOUR,
    },
  ];

  // ─── Tasks (14) ────────────────────────────────────────────────────
  const tasks: Task[] = [
    // Completed (4)
    { id: sampleId('task', 1), title: 'Analyze backdoored npm package', description: 'Perform static and dynamic analysis of @pdfcore/render v3.2.1 to identify backdoor mechanism, C2 protocol, and dropped artifacts.', completed: true, priority: 'high', status: 'done', order: 1, folderId: SAMPLE_FOLDER_ID, tags: ['supply-chain'], clsLevel: 'TLP:AMBER', trashed: false, archived: false, createdAt: baseTs, updatedAt: baseTs + DAY, completedAt: baseTs + DAY, linkedNoteIds: [sampleId('note', 4)], linkedTimelineEventIds: [sampleId('event', 3)] },
    { id: sampleId('task', 2), title: 'Block C2 domains and IPs at WAF', description: 'Add cdn-assets-proxy.com, update-svc-cdn.net, openslaw-legal.com, and all associated IPs to WAF block rules and DNS sinkholes.', completed: true, priority: 'high', status: 'done', order: 2, folderId: SAMPLE_FOLDER_ID, tags: ['remediation'], clsLevel: 'TLP:AMBER', trashed: false, archived: false, createdAt: baseTs + 2 * HOUR, updatedAt: baseTs + 4 * DAY + 6 * HOUR, completedAt: baseTs + 4 * DAY + 6 * HOUR, linkedNoteIds: [sampleId('note', 6)], linkedTimelineEventIds: [sampleId('event', 14)] },
    { id: sampleId('task', 3), title: 'Revoke compromised AWS IAM credentials', description: 'Identify and revoke all IAM access keys, session tokens, and role trust policies associated with the compromised CI pipeline and phished SSO session.', completed: true, priority: 'high', status: 'done', order: 3, folderId: SAMPLE_FOLDER_ID, tags: ['cloud', 'remediation'], trashed: false, archived: false, createdAt: baseTs + 4 * HOUR, updatedAt: baseTs + 4 * DAY + 8 * HOUR, completedAt: baseTs + 4 * DAY + 8 * HOUR, linkedNoteIds: [sampleId('note', 7)], linkedTimelineEventIds: [sampleId('event', 15)] },
    { id: sampleId('task', 4), title: 'Roll back npm dependency to safe version', description: 'Revert @pdfcore/render to v3.1.9, pin with integrity hash, and redeploy all production services.', completed: true, priority: 'high', status: 'done', order: 4, folderId: SAMPLE_FOLDER_ID, tags: ['supply-chain', 'remediation'], trashed: false, archived: false, createdAt: baseTs + HOUR, updatedAt: baseTs + 4 * DAY + 4 * HOUR, completedAt: baseTs + 4 * DAY + 4 * HOUR, linkedNoteIds: [sampleId('note', 2)], linkedTimelineEventIds: [sampleId('event', 16)] },
    // In-progress (4)
    { id: sampleId('task', 5), title: 'Rotate all database credentials', description: 'Rotate RDS master passwords, application connection strings, and Redis auth tokens across all environments.', completed: false, priority: 'high', status: 'in-progress', order: 5, folderId: SAMPLE_FOLDER_ID, tags: ['cloud', 'remediation'], trashed: false, archived: false, createdAt: baseTs + DAY, updatedAt: baseTs + 5 * DAY, linkedNoteIds: [sampleId('note', 7), sampleId('note', 10)] },
    { id: sampleId('task', 6), title: 'Assess full scope of document exfiltration', description: 'Cross-reference CloudTrail S3 GetObject logs with document inventory to determine exactly which client matters were accessed. Identify all 47 affected client matters.', completed: false, priority: 'high', status: 'in-progress', order: 6, folderId: SAMPLE_FOLDER_ID, tags: ['exfiltration', 'legal-data'], clsLevel: 'TLP:RED', trashed: false, archived: false, createdAt: baseTs + 3 * DAY, updatedAt: baseTs + 5 * DAY, linkedNoteIds: [sampleId('note', 8)], linkedTimelineEventIds: [sampleId('event', 11), sampleId('event', 12)] },
    { id: sampleId('task', 7), title: 'Deploy dependency scanning in CI pipeline', description: 'Implement SCA tooling (Snyk/Dependabot) in CI pipeline with lockfile integrity verification and auto-block on high-severity findings.', completed: false, priority: 'medium', status: 'in-progress', order: 7, folderId: SAMPLE_FOLDER_ID, tags: ['supply-chain', 'remediation'], trashed: false, archived: false, createdAt: baseTs + 4 * DAY, updatedAt: baseTs + 5 * DAY, linkedNoteIds: [sampleId('note', 10)] },
    { id: sampleId('task', 8), title: 'Rebuild build server from golden image', description: 'Decommission compromised build server. Provision new build infrastructure from hardened AMI with enhanced monitoring.', completed: false, priority: 'medium', status: 'in-progress', order: 8, folderId: SAMPLE_FOLDER_ID, tags: ['remediation'], trashed: false, archived: false, createdAt: baseTs + 4 * DAY, updatedAt: baseTs + 5 * DAY + 2 * HOUR, linkedNoteIds: [sampleId('note', 10)], linkedTimelineEventIds: [sampleId('event', 17)] },
    // Todo (6)
    { id: sampleId('task', 9), title: 'Prepare client notification letters', description: 'Draft notification letters for 47 affected clients under attorney-client privilege breach protocol. Coordinate with legal counsel and compliance.', completed: false, priority: 'high', status: 'todo', order: 9, folderId: SAMPLE_FOLDER_ID, tags: ['legal-data'], clsLevel: 'TLP:RED', trashed: false, archived: false, createdAt: baseTs + 4 * DAY, updatedAt: baseTs + 4 * DAY, dueDate: new Date(now + 3 * DAY).toISOString().slice(0, 10), linkedNoteIds: [sampleId('note', 8)] },
    { id: sampleId('task', 10), title: 'Implement least-privilege IAM policies', description: 'Redesign AWS IAM role trust policies to enforce least-privilege. Remove overprivileged trust between CI and production roles.', completed: false, priority: 'medium', status: 'todo', order: 10, folderId: SAMPLE_FOLDER_ID, tags: ['cloud', 'remediation'], trashed: false, archived: false, createdAt: baseTs + 4 * DAY, updatedAt: baseTs + 4 * DAY, dueDate: new Date(now + 7 * DAY).toISOString().slice(0, 10), linkedNoteIds: [sampleId('note', 5), sampleId('note', 10)] },
    { id: sampleId('task', 11), title: 'Enable AWS GuardDuty and S3 data events', description: 'Enable GuardDuty across all regions. Configure S3 data event logging in CloudTrail for openslaw-legal-docs and openslaw-db-backups buckets.', completed: false, priority: 'medium', status: 'todo', order: 11, folderId: SAMPLE_FOLDER_ID, tags: ['cloud', 'remediation'], trashed: false, archived: false, createdAt: baseTs + 4 * DAY + 2 * HOUR, updatedAt: baseTs + 4 * DAY + 2 * HOUR, linkedNoteIds: [sampleId('note', 10)] },
    { id: sampleId('task', 12), title: 'Compile IOC sharing report for ISAC', description: 'Finalize and distribute IOC sharing report through legal-sector ISAC. Ensure TLP:AMBER classification is applied.', completed: false, priority: 'medium', status: 'todo', order: 12, folderId: SAMPLE_FOLDER_ID, tags: ['midnight-typhoon'], clsLevel: 'TLP:AMBER', trashed: false, archived: false, createdAt: baseTs + 5 * DAY, updatedAt: baseTs + 5 * DAY, dueDate: new Date(now + 5 * DAY).toISOString().slice(0, 10), linkedNoteIds: [sampleId('note', 12)] },
    { id: sampleId('task', 13), title: 'Conduct post-incident tabletop exercise', description: 'Organize tabletop exercise with engineering, security, legal, and executive teams. Use DARK GLACIER as the scenario basis.', completed: false, priority: 'low', status: 'todo', order: 13, folderId: SAMPLE_FOLDER_ID, tags: ['remediation'], trashed: false, archived: false, createdAt: baseTs + 5 * DAY, updatedAt: baseTs + 5 * DAY, dueDate: new Date(now + 14 * DAY).toISOString().slice(0, 10), linkedNoteIds: [sampleId('note', 10)] },
    { id: sampleId('task', 14), title: 'File regulatory notifications (GDPR, SOC 2)', description: 'Coordinate with DPO and compliance team to file required regulatory notifications. GDPR 72-hour window applies for EU client data.', completed: false, priority: 'high', status: 'todo', order: 14, folderId: SAMPLE_FOLDER_ID, tags: ['legal-data', 'remediation'], clsLevel: 'TLP:RED', trashed: false, archived: false, createdAt: baseTs + 4 * DAY + 6 * HOUR, updatedAt: baseTs + 4 * DAY + 6 * HOUR, dueDate: new Date(now + 2 * DAY).toISOString().slice(0, 10) },
  ];

  // ─── Timeline Events (20) ─────────────────────────────────────────
  const timelineEvents: TimelineEvent[] = [
    // Day 0: Supply-chain compromise detected
    {
      id: sampleId('event', 1),
      timestamp: baseTs,
      title: 'Backdoored @pdfcore/render v3.2.1 pulled by CI',
      description: 'OpenSlaw.ai CI/CD pipeline pulled updated npm dependency @pdfcore/render v3.2.1 containing backdoor. Build deployed to production automatically.',
      eventType: 'initial-access',
      source: 'CI/CD Pipeline Logs',
      confidence: 'confirmed',
      linkedIOCIds: [],
      linkedNoteIds: [sampleId('note', 2)],
      linkedTaskIds: [sampleId('task', 1)],
      mitreAttackIds: ['T1195.002'],
      assets: ['build-server-01'],
      tags: ['supply-chain', 'initial-access'],
      starred: true,
      folderId: SAMPLE_FOLDER_ID,
      timelineId: SAMPLE_TIMELINE_ID,
      clsLevel: 'TLP:AMBER',
      latitude: 37.7749,
      longitude: -122.4194,
      trashed: false,
      archived: false,
      createdAt: baseTs,
      updatedAt: baseTs + HOUR,
    },
    {
      id: sampleId('event', 2),
      timestamp: baseTs + 45 * MIN,
      title: 'Backdoor activates — initial C2 beacon',
      description: 'libpdfmetrics.node implant drops and establishes first HTTPS beacon to cdn-assets-proxy.com via CloudFront domain fronting. Beacon interval: 45s ± 25% jitter.',
      eventType: 'command-and-control',
      source: 'Network Flow Analysis',
      confidence: 'confirmed',
      linkedIOCIds: [],
      linkedNoteIds: [sampleId('note', 4), sampleId('note', 6)],
      linkedTaskIds: [],
      mitreAttackIds: ['T1071.001'],
      assets: ['build-server-01'],
      tags: ['midnight-typhoon'],
      starred: true,
      folderId: SAMPLE_FOLDER_ID,
      timelineId: SAMPLE_TIMELINE_ID,
      clsLevel: 'TLP:AMBER',
      latitude: 55.7558,
      longitude: 37.6173,
      trashed: false,
      archived: false,
      createdAt: baseTs + HOUR,
      updatedAt: baseTs + 2 * HOUR,
    },
    {
      id: sampleId('event', 3),
      timestamp: baseTs + 2 * HOUR,
      title: 'Environment variables harvested from build server',
      description: 'Backdoor exfiltrates AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, DATABASE_URL, and OKTA_API_TOKEN from build server environment. Sent to C2 via encrypted channel.',
      eventType: 'credential-access',
      source: 'Malware Analysis',
      confidence: 'confirmed',
      linkedIOCIds: [],
      linkedNoteIds: [sampleId('note', 4), sampleId('note', 7)],
      linkedTaskIds: [sampleId('task', 3)],
      mitreAttackIds: ['T1003.006'],
      assets: ['build-server-01'],
      tags: ['cloud'],
      starred: false,
      folderId: SAMPLE_FOLDER_ID,
      timelineId: SAMPLE_TIMELINE_ID,
      trashed: false,
      archived: false,
      createdAt: baseTs + 3 * HOUR,
      updatedAt: baseTs + 3 * HOUR,
    },
    {
      id: sampleId('event', 4),
      timestamp: baseTs + 4 * HOUR,
      title: 'DNS tunnel C2 fallback established',
      description: 'Secondary C2 channel activated via DNS TXT record queries to data.update-svc-cdn.net. Authoritative NS at 91.215.85.17 (Shanghai).',
      eventType: 'command-and-control',
      source: 'DNS Logs',
      confidence: 'confirmed',
      linkedIOCIds: [],
      linkedNoteIds: [sampleId('note', 6)],
      linkedTaskIds: [],
      mitreAttackIds: ['T1572'],
      assets: ['build-server-01'],
      tags: ['midnight-typhoon'],
      starred: false,
      folderId: SAMPLE_FOLDER_ID,
      timelineId: SAMPLE_TIMELINE_ID,
      latitude: 31.2304,
      longitude: 121.4737,
      trashed: false,
      archived: false,
      createdAt: baseTs + 5 * HOUR,
      updatedAt: baseTs + 5 * HOUR,
    },
    // Day 0: Phishing campaign
    {
      id: sampleId('event', 5),
      timestamp: baseTs + 6 * HOUR,
      title: 'Phishing emails sent to 5 OpenSlaw engineers',
      description: 'DocuSign-themed phishing emails sent from noreply@docusign-notifications.openslaw-legal.com targeting platform, infra, and security team engineers.',
      eventType: 'initial-access',
      source: 'Email Gateway',
      confidence: 'confirmed',
      linkedIOCIds: [],
      linkedNoteIds: [sampleId('note', 3)],
      linkedTaskIds: [],
      mitreAttackIds: ['T1566.001'],
      assets: ['email-gateway'],
      tags: ['midnight-typhoon', 'initial-access'],
      starred: false,
      folderId: SAMPLE_FOLDER_ID,
      timelineId: SAMPLE_TIMELINE_ID,
      latitude: 52.3676,
      longitude: 4.9041,
      trashed: false,
      archived: false,
      createdAt: baseTs + 7 * HOUR,
      updatedAt: baseTs + 7 * HOUR,
    },
    {
      id: sampleId('event', 6),
      timestamp: baseTs + 8 * HOUR,
      title: 'Engineer m.chen submits SSO credentials via phishing page',
      description: 'Senior engineer m.chen clicks phishing link and authenticates through Evilginx-proxied SSO flow. Okta session token captured by attacker.',
      eventType: 'credential-access',
      source: 'Okta Logs',
      confidence: 'confirmed',
      linkedIOCIds: [],
      linkedNoteIds: [sampleId('note', 3), sampleId('note', 7)],
      linkedTaskIds: [],
      mitreAttackIds: ['T1078.004'],
      assets: ['okta-sso'],
      tags: ['midnight-typhoon'],
      starred: true,
      folderId: SAMPLE_FOLDER_ID,
      timelineId: SAMPLE_TIMELINE_ID,
      trashed: false,
      archived: false,
      createdAt: baseTs + 9 * HOUR,
      updatedAt: baseTs + 9 * HOUR,
    },
    // Day 1: Cloud pivot
    {
      id: sampleId('event', 7),
      timestamp: baseTs + DAY,
      title: 'CI role used to enumerate AWS resources',
      description: 'Stolen CI IAM credentials used to call ListBuckets, DescribeInstances, ListRoles from external IP. Full AWS resource inventory obtained.',
      eventType: 'discovery',
      source: 'AWS CloudTrail',
      confidence: 'confirmed',
      linkedIOCIds: [],
      linkedNoteIds: [sampleId('note', 5), sampleId('note', 9)],
      linkedTaskIds: [],
      mitreAttackIds: ['T1580'],
      actor: 'Midnight Typhoon',
      assets: ['aws-account'],
      tags: ['cloud'],
      starred: false,
      folderId: SAMPLE_FOLDER_ID,
      timelineId: SAMPLE_TIMELINE_ID,
      latitude: 39.0438,
      longitude: -77.4874,
      trashed: false,
      archived: false,
      createdAt: baseTs + DAY + HOUR,
      updatedAt: baseTs + DAY + HOUR,
    },
    {
      id: sampleId('event', 8),
      timestamp: baseTs + DAY + 4 * HOUR,
      title: 'AssumeRole to openslaw-prod-api via trust policy',
      description: 'CI deploy role assumes openslaw-prod-api role using overprivileged trust policy. Attacker now has S3, RDS, and SES access in production context.',
      eventType: 'privilege-escalation',
      source: 'AWS CloudTrail',
      confidence: 'confirmed',
      linkedIOCIds: [],
      linkedNoteIds: [sampleId('note', 5)],
      linkedTaskIds: [],
      mitreAttackIds: ['T1078.004'],
      actor: 'Midnight Typhoon',
      assets: ['aws-account'],
      tags: ['cloud', 'midnight-typhoon'],
      starred: false,
      folderId: SAMPLE_FOLDER_ID,
      timelineId: SAMPLE_TIMELINE_ID,
      trashed: false,
      archived: false,
      createdAt: baseTs + DAY + 5 * HOUR,
      updatedAt: baseTs + DAY + 5 * HOUR,
    },
    // Day 2: SSO → Admin pivot
    {
      id: sampleId('event', 9),
      timestamp: baseTs + 2 * DAY,
      title: 'Phished SSO session used to access AWS console',
      description: 'Attacker uses stolen m.chen Okta session to SSO into AWS console. Assumes openslaw-admin role with full administrative privileges.',
      eventType: 'lateral-movement',
      source: 'AWS CloudTrail / Okta',
      confidence: 'confirmed',
      linkedIOCIds: [],
      linkedNoteIds: [sampleId('note', 7), sampleId('note', 9)],
      linkedTaskIds: [],
      mitreAttackIds: ['T1021.001'],
      actor: 'Midnight Typhoon',
      assets: ['aws-account', 'okta-sso'],
      tags: ['cloud', 'midnight-typhoon'],
      starred: false,
      folderId: SAMPLE_FOLDER_ID,
      timelineId: SAMPLE_TIMELINE_ID,
      trashed: false,
      archived: false,
      createdAt: baseTs + 2 * DAY + HOUR,
      updatedAt: baseTs + 2 * DAY + HOUR,
    },
    {
      id: sampleId('event', 10),
      timestamp: baseTs + 2 * DAY + 2 * HOUR,
      title: 'CloudTrail logging disabled by attacker',
      description: 'Attacker uses admin role to stop CloudTrail logging in us-east-1. Logging gap lasts approximately 4 hours.',
      eventType: 'defense-evasion',
      source: 'AWS CloudTrail (StopLogging event)',
      confidence: 'confirmed',
      linkedIOCIds: [],
      linkedNoteIds: [sampleId('note', 9)],
      linkedTaskIds: [],
      mitreAttackIds: ['T1562.008'],
      actor: 'Midnight Typhoon',
      assets: ['aws-account'],
      tags: ['cloud'],
      starred: false,
      folderId: SAMPLE_FOLDER_ID,
      timelineId: SAMPLE_TIMELINE_ID,
      trashed: false,
      archived: false,
      createdAt: baseTs + 2 * DAY + 3 * HOUR,
      updatedAt: baseTs + 2 * DAY + 3 * HOUR,
    },
    // Day 3: Data exfiltration begins
    {
      id: sampleId('event', 11),
      timestamp: baseTs + 3 * DAY,
      title: 'Bulk S3 GetObject — legal document download begins',
      description: 'Attacker begins bulk download of s3://openslaw-legal-docs/ using prod-api role. 12,847 objects across 47 client matter prefixes. Launched from attacker-controlled EC2 in us-east-1.',
      eventType: 'collection',
      source: 'S3 Access Logs',
      confidence: 'confirmed',
      linkedIOCIds: [],
      linkedNoteIds: [sampleId('note', 8)],
      linkedTaskIds: [sampleId('task', 6)],
      mitreAttackIds: ['T1530'],
      actor: 'Midnight Typhoon',
      assets: ['s3-legal-docs'],
      tags: ['exfiltration', 'legal-data'],
      starred: true,
      folderId: SAMPLE_FOLDER_ID,
      timelineId: SAMPLE_TIMELINE_ID,
      latitude: 39.0438,
      longitude: -77.4874,
      trashed: false,
      archived: false,
      createdAt: baseTs + 3 * DAY + HOUR,
      updatedAt: baseTs + 3 * DAY + HOUR,
    },
    {
      id: sampleId('event', 12),
      timestamp: baseTs + 3 * DAY + 8 * HOUR,
      title: 'Data staged to Bucharest server',
      description: '2.3 GB of compressed legal documents transferred to exfiltration staging server at 185.156.73.22 (Bucharest, Romania). AES-256 encrypted 7z archives.',
      eventType: 'exfiltration',
      source: 'Network Flow Analysis',
      confidence: 'high',
      linkedIOCIds: [],
      linkedNoteIds: [sampleId('note', 8)],
      linkedTaskIds: [sampleId('task', 6)],
      mitreAttackIds: ['T1567.002', 'T1560.001'],
      actor: 'Midnight Typhoon',
      assets: ['s3-legal-docs'],
      tags: ['exfiltration'],
      starred: true,
      folderId: SAMPLE_FOLDER_ID,
      timelineId: SAMPLE_TIMELINE_ID,
      latitude: 44.4268,
      longitude: 26.1025,
      trashed: false,
      archived: false,
      createdAt: baseTs + 3 * DAY + 9 * HOUR,
      updatedAt: baseTs + 3 * DAY + 9 * HOUR,
    },
    // Day 4: Exfiltration continues, detection
    {
      id: sampleId('event', 13),
      timestamp: baseTs + 4 * DAY,
      title: 'Data lands at Singapore endpoint',
      description: 'Final destination: 103.253.41.98 (Singapore). Data transferred from Bucharest staging over mutual-TLS HTTPS. Throttled transfer over 6 hours.',
      eventType: 'exfiltration',
      source: 'Threat Intelligence',
      confidence: 'high',
      linkedIOCIds: [],
      linkedNoteIds: [sampleId('note', 8)],
      linkedTaskIds: [],
      mitreAttackIds: ['T1041'],
      actor: 'Midnight Typhoon',
      assets: [],
      tags: ['exfiltration'],
      starred: false,
      folderId: SAMPLE_FOLDER_ID,
      timelineId: SAMPLE_TIMELINE_ID,
      latitude: 1.3521,
      longitude: 103.8198,
      trashed: false,
      archived: false,
      createdAt: baseTs + 4 * DAY + HOUR,
      updatedAt: baseTs + 4 * DAY + HOUR,
    },
    {
      id: sampleId('event', 14),
      timestamp: baseTs + 4 * DAY + 4 * HOUR,
      title: 'Anomalous outbound traffic detected — SOC alert',
      description: 'SOC analyst identifies anomalous outbound data volume from production API servers. Correlation with domain-fronted HTTPS traffic triggers investigation.',
      eventType: 'detection',
      source: 'SIEM / SOC',
      confidence: 'confirmed',
      linkedIOCIds: [],
      linkedNoteIds: [sampleId('note', 1)],
      linkedTaskIds: [sampleId('task', 2)],
      mitreAttackIds: [],
      assets: ['openslaw-api-prod'],
      tags: ['midnight-typhoon'],
      starred: true,
      folderId: SAMPLE_FOLDER_ID,
      timelineId: SAMPLE_TIMELINE_ID,
      latitude: 37.7749,
      longitude: -122.4194,
      trashed: false,
      archived: false,
      createdAt: baseTs + 4 * DAY + 5 * HOUR,
      updatedAt: baseTs + 4 * DAY + 5 * HOUR,
    },
    {
      id: sampleId('event', 15),
      timestamp: baseTs + 4 * DAY + 6 * HOUR,
      title: 'Containment — C2 domains blocked, IAM keys revoked',
      description: 'C2 domains/IPs blocked at WAF. All compromised IAM credentials revoked. Okta sessions invalidated. Build server isolated.',
      eventType: 'containment',
      source: 'SOC',
      confidence: 'confirmed',
      linkedIOCIds: [],
      linkedNoteIds: [sampleId('note', 10)],
      linkedTaskIds: [sampleId('task', 2), sampleId('task', 3)],
      mitreAttackIds: [],
      assets: ['build-server-01', 'aws-account', 'okta-sso'],
      tags: ['remediation'],
      starred: true,
      folderId: SAMPLE_FOLDER_ID,
      timelineId: SAMPLE_TIMELINE_ID,
      latitude: 37.7749,
      longitude: -122.4194,
      trashed: false,
      archived: false,
      createdAt: baseTs + 4 * DAY + 7 * HOUR,
      updatedAt: baseTs + 4 * DAY + 7 * HOUR,
    },
    {
      id: sampleId('event', 16),
      timestamp: baseTs + 4 * DAY + 8 * HOUR,
      title: 'npm dependency rolled back to v3.1.9',
      description: '@pdfcore/render pinned to v3.1.9 with integrity hash. All production services redeployed with clean dependency tree.',
      eventType: 'eradication',
      source: 'Engineering',
      confidence: 'confirmed',
      linkedIOCIds: [],
      linkedNoteIds: [sampleId('note', 2), sampleId('note', 10)],
      linkedTaskIds: [sampleId('task', 4)],
      mitreAttackIds: [],
      assets: ['build-server-01', 'openslaw-api-prod'],
      tags: ['supply-chain', 'remediation'],
      starred: false,
      folderId: SAMPLE_FOLDER_ID,
      timelineId: SAMPLE_TIMELINE_ID,
      trashed: false,
      archived: false,
      createdAt: baseTs + 4 * DAY + 9 * HOUR,
      updatedAt: baseTs + 4 * DAY + 9 * HOUR,
    },
    // Day 5: Recovery
    {
      id: sampleId('event', 17),
      timestamp: baseTs + 5 * DAY,
      title: 'Build server rebuild initiated from golden image',
      description: 'Compromised build server decommissioned. New build infrastructure provisioned from hardened AMI with enhanced monitoring and network isolation.',
      eventType: 'recovery',
      source: 'Infrastructure',
      confidence: 'confirmed',
      linkedIOCIds: [],
      linkedNoteIds: [sampleId('note', 10)],
      linkedTaskIds: [sampleId('task', 8)],
      mitreAttackIds: [],
      assets: ['build-server-01'],
      tags: ['remediation'],
      starred: false,
      folderId: SAMPLE_FOLDER_ID,
      timelineId: SAMPLE_TIMELINE_ID,
      trashed: false,
      archived: false,
      createdAt: baseTs + 5 * DAY,
      updatedAt: baseTs + 5 * DAY,
    },
    {
      id: sampleId('event', 18),
      timestamp: baseTs + 5 * DAY + 4 * HOUR,
      title: 'CloudTrail re-enabled with S3 data events',
      description: 'CloudTrail logging restored in all regions. S3 data event logging enabled for sensitive buckets. GuardDuty activation in progress.',
      eventType: 'recovery',
      source: 'Cloud Security',
      confidence: 'confirmed',
      linkedIOCIds: [],
      linkedNoteIds: [sampleId('note', 10)],
      linkedTaskIds: [sampleId('task', 11)],
      mitreAttackIds: [],
      assets: ['aws-account'],
      tags: ['cloud', 'remediation'],
      starred: false,
      folderId: SAMPLE_FOLDER_ID,
      timelineId: SAMPLE_TIMELINE_ID,
      trashed: false,
      archived: false,
      createdAt: baseTs + 5 * DAY + 4 * HOUR,
      updatedAt: baseTs + 5 * DAY + 4 * HOUR,
    },
    {
      id: sampleId('event', 19),
      timestamp: baseTs + 5 * DAY + 8 * HOUR,
      title: 'Forensic imaging of compromised systems completed',
      description: 'Full disk images captured from build-server-01 and attacker EC2 instance. Memory dumps preserved. Chain of custody documented.',
      eventType: 'evidence',
      source: 'DFIR',
      confidence: 'confirmed',
      linkedIOCIds: [],
      linkedNoteIds: [],
      linkedTaskIds: [],
      mitreAttackIds: [],
      assets: ['build-server-01'],
      tags: ['remediation'],
      starred: false,
      folderId: SAMPLE_FOLDER_ID,
      timelineId: SAMPLE_TIMELINE_ID,
      trashed: false,
      archived: false,
      createdAt: baseTs + 5 * DAY + 9 * HOUR,
      updatedAt: baseTs + 5 * DAY + 9 * HOUR,
    },
    {
      id: sampleId('event', 20),
      timestamp: now + 14 * DAY,
      title: 'Post-incident review and tabletop exercise scheduled',
      description: 'Full post-incident review with engineering, security, legal, and executive teams. Tabletop exercise using DARK GLACIER scenario.',
      eventType: 'communication',
      source: 'SOC',
      confidence: 'confirmed',
      linkedIOCIds: [],
      linkedNoteIds: [sampleId('note', 10)],
      linkedTaskIds: [sampleId('task', 13)],
      mitreAttackIds: [],
      assets: [],
      tags: [],
      starred: false,
      folderId: SAMPLE_FOLDER_ID,
      timelineId: SAMPLE_TIMELINE_ID,
      trashed: false,
      archived: false,
      createdAt: baseTs + 5 * DAY + 10 * HOUR,
      updatedAt: baseTs + 5 * DAY + 10 * HOUR,
    },
  ];

  // ─── Standalone IOCs (25) ─────────────────────────────────────────
  const standaloneIOCs: StandaloneIOC[] = [
    // IPv4 (4)
    { id: sampleId('ioc', 1), type: 'ipv4', value: '185.220.101.34', confidence: 'confirmed', attribution: 'Midnight Typhoon', analystNotes: 'Primary C2 server. Moscow, RU (AS50867). Domain-fronted via CloudFront.', folderId: SAMPLE_FOLDER_ID, tags: ['midnight-typhoon'], clsLevel: 'TLP:AMBER', iocStatus: 'active', iocSubtype: 'C2', relationships: [{ targetIOCId: 'cdn-assets-proxy.com', relationshipType: 'hosts' }], trashed: false, archived: false, createdAt: baseTs, updatedAt: baseTs + HOUR },
    { id: sampleId('ioc', 2), type: 'ipv4', value: '91.215.85.17', confidence: 'high', attribution: 'Midnight Typhoon', analystNotes: 'DNS tunnel authoritative nameserver. Shanghai, CN (AS4134).', folderId: SAMPLE_FOLDER_ID, tags: ['midnight-typhoon'], clsLevel: 'TLP:AMBER', iocStatus: 'active', iocSubtype: 'C2', trashed: false, archived: false, createdAt: baseTs + HOUR, updatedAt: baseTs + 2 * HOUR },
    { id: sampleId('ioc', 3), type: 'ipv4', value: '185.156.73.22', confidence: 'confirmed', attribution: 'Midnight Typhoon', analystNotes: 'Exfiltration staging server. Bucharest, RO (AS9009).', folderId: SAMPLE_FOLDER_ID, tags: ['exfiltration'], clsLevel: 'TLP:AMBER', iocStatus: 'active', iocSubtype: 'exfil-staging', trashed: false, archived: false, createdAt: baseTs + 3 * DAY, updatedAt: baseTs + 3 * DAY + HOUR },
    { id: sampleId('ioc', 4), type: 'ipv4', value: '103.253.41.98', confidence: 'high', attribution: 'Midnight Typhoon', analystNotes: 'Final data landing server. Singapore (AS133618).', folderId: SAMPLE_FOLDER_ID, tags: ['exfiltration'], clsLevel: 'TLP:AMBER', iocStatus: 'active', iocSubtype: 'exfil-landing', trashed: false, archived: false, createdAt: baseTs + 4 * DAY, updatedAt: baseTs + 4 * DAY + HOUR },
    // Domains (5)
    { id: sampleId('ioc', 5), type: 'domain', value: 'cdn-assets-proxy.com', confidence: 'confirmed', attribution: 'Midnight Typhoon', analystNotes: 'Primary C2 domain. Domain-fronted behind CloudFront. Registered via Njalla.', folderId: SAMPLE_FOLDER_ID, tags: ['midnight-typhoon'], clsLevel: 'TLP:AMBER', iocStatus: 'active', iocSubtype: 'C2', relationships: [{ targetIOCId: '185.220.101.34', relationshipType: 'resolves-to' }], trashed: false, archived: false, createdAt: baseTs, updatedAt: baseTs + HOUR },
    { id: sampleId('ioc', 6), type: 'domain', value: 'update-svc-cdn.net', confidence: 'confirmed', attribution: 'Midnight Typhoon', analystNotes: 'DNS tunneling C2 domain. TXT record-based exfil. Registered via Porkbun.', folderId: SAMPLE_FOLDER_ID, tags: ['midnight-typhoon'], clsLevel: 'TLP:AMBER', iocStatus: 'active', iocSubtype: 'C2-DNS', relationships: [{ targetIOCId: '91.215.85.17', relationshipType: 'resolves-to' }], trashed: false, archived: false, createdAt: baseTs, updatedAt: baseTs + HOUR },
    { id: sampleId('ioc', 7), type: 'domain', value: 'openslaw-legal.com', confidence: 'confirmed', attribution: 'Midnight Typhoon', analystNotes: 'Phishing infrastructure domain. Spoofed OpenSlaw.ai branding.', folderId: SAMPLE_FOLDER_ID, tags: ['midnight-typhoon', 'initial-access'], clsLevel: 'TLP:AMBER', iocStatus: 'active', iocSubtype: 'phishing', relationships: [{ targetIOCId: '89.44.9.241', relationshipType: 'resolves-to' }], trashed: false, archived: false, createdAt: baseTs + 6 * HOUR, updatedAt: baseTs + 7 * HOUR },
    { id: sampleId('ioc', 8), type: 'domain', value: 'docusign-verify.openslaw-legal.com', confidence: 'confirmed', analystNotes: 'Phishing landing page subdomain. Evilginx-style credential proxy.', folderId: SAMPLE_FOLDER_ID, tags: ['initial-access'], iocStatus: 'resolved', iocSubtype: 'phishing', trashed: false, archived: false, createdAt: baseTs + 6 * HOUR, updatedAt: baseTs + 4 * DAY + 8 * HOUR },
    { id: sampleId('ioc', 9), type: 'domain', value: 'docusign-notifications.openslaw-legal.com', confidence: 'confirmed', analystNotes: 'Phishing email sender subdomain.', folderId: SAMPLE_FOLDER_ID, tags: ['initial-access'], iocStatus: 'resolved', iocSubtype: 'phishing', trashed: false, archived: false, createdAt: baseTs + 6 * HOUR, updatedAt: baseTs + 4 * DAY + 8 * HOUR },
    // SHA-256 (3)
    { id: sampleId('ioc', 10), type: 'sha256', value: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', confidence: 'confirmed', attribution: 'Midnight Typhoon', analystNotes: 'Backdoored @pdfcore/render v3.2.1 npm package tarball.', folderId: SAMPLE_FOLDER_ID, tags: ['supply-chain'], clsLevel: 'TLP:AMBER', iocStatus: 'active', relationships: [{ targetIOCId: 'cdn-assets-proxy.com', relationshipType: 'communicates-with' }, { targetIOCId: 'CVE-2024-38856', relationshipType: 'exploits' }], trashed: false, archived: false, createdAt: baseTs + HOUR, updatedAt: baseTs + DAY },
    { id: sampleId('ioc', 11), type: 'sha256', value: '7d865e959b2466918c9863afca942d0fb89d7c9ac0c99bafc3749504ded97730', confidence: 'confirmed', attribution: 'Midnight Typhoon', analystNotes: 'Dropped implant binary: libpdfmetrics.node', folderId: SAMPLE_FOLDER_ID, tags: ['midnight-typhoon'], clsLevel: 'TLP:AMBER', iocStatus: 'active', relationships: [{ targetIOCId: 'cdn-assets-proxy.com', relationshipType: 'communicates-with' }, { targetIOCId: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', relationshipType: 'drops' }], trashed: false, archived: false, createdAt: baseTs + 2 * HOUR, updatedAt: baseTs + DAY },
    { id: sampleId('ioc', 12), type: 'sha256', value: 'f4a8b3c7d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e7f6a5', confidence: 'high', attribution: 'Midnight Typhoon', analystNotes: 'Encrypted config file (.pdfrc) containing C2 endpoints and exfil encryption keys.', folderId: SAMPLE_FOLDER_ID, tags: ['midnight-typhoon'], iocStatus: 'under-investigation', trashed: false, archived: false, createdAt: baseTs + DAY, updatedAt: baseTs + DAY + 4 * HOUR },
    // MD5 (2)
    { id: sampleId('ioc', 13), type: 'md5', value: 'a3f2b8c91e4d57f6a8b3c2d1e0f9a8b7', confidence: 'confirmed', analystNotes: 'MD5 of dropped implant binary (libpdfmetrics.node).', folderId: SAMPLE_FOLDER_ID, tags: ['midnight-typhoon'], trashed: false, archived: false, createdAt: baseTs + 2 * HOUR, updatedAt: baseTs + 2 * HOUR },
    { id: sampleId('ioc', 14), type: 'md5', value: 'c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2', confidence: 'high', analystNotes: 'MD5 of encrypted config file (.pdfrc).', folderId: SAMPLE_FOLDER_ID, tags: ['midnight-typhoon'], trashed: false, archived: false, createdAt: baseTs + DAY, updatedAt: baseTs + DAY },
    // URLs (3)
    { id: sampleId('ioc', 15), type: 'url', value: 'https://registry.npmjs.org/@pdfcore/render/-/render-3.2.1.tgz', confidence: 'confirmed', analystNotes: 'Backdoored npm package download URL.', folderId: SAMPLE_FOLDER_ID, tags: ['supply-chain'], iocStatus: 'resolved', trashed: false, archived: false, createdAt: baseTs, updatedAt: baseTs + 4 * DAY + 4 * HOUR, relationships: [{ targetIOCId: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', relationshipType: 'downloads' }] },
    { id: sampleId('ioc', 16), type: 'url', value: 'https://app.docusign-verify.openslaw-legal.com/sign/review', confidence: 'confirmed', analystNotes: 'Phishing landing page URL. Evilginx proxy to real Okta SSO.', folderId: SAMPLE_FOLDER_ID, tags: ['initial-access'], iocStatus: 'resolved', trashed: false, archived: false, createdAt: baseTs + 6 * HOUR, updatedAt: baseTs + 4 * DAY + 8 * HOUR },
    { id: sampleId('ioc', 17), type: 'url', value: 'https://cdn-assets-proxy.com/api/v2/telemetry', confidence: 'confirmed', attribution: 'Midnight Typhoon', analystNotes: 'C2 beacon endpoint. Disguised as CloudFront telemetry API.', folderId: SAMPLE_FOLDER_ID, tags: ['midnight-typhoon'], clsLevel: 'TLP:AMBER', iocStatus: 'active', relationships: [{ targetIOCId: '7d865e959b2466918c9863afca942d0fb89d7c9ac0c99bafc3749504ded97730', relationshipType: 'downloads' }], trashed: false, archived: false, createdAt: baseTs + HOUR, updatedAt: baseTs + HOUR },
    // Email (2)
    { id: sampleId('ioc', 18), type: 'email', value: 'noreply@docusign-notifications.openslaw-legal.com', confidence: 'confirmed', analystNotes: 'Phishing sender address. Spoofed DocuSign notification.', folderId: SAMPLE_FOLDER_ID, tags: ['initial-access'], iocStatus: 'resolved', trashed: false, archived: false, createdAt: baseTs + 6 * HOUR, updatedAt: baseTs + 4 * DAY + 8 * HOUR },
    { id: sampleId('ioc', 19), type: 'email', value: 'support@openslaw-legal.com', confidence: 'medium', analystNotes: 'Secondary phishing address found in email headers. May be used in follow-up campaigns.', folderId: SAMPLE_FOLDER_ID, tags: ['initial-access'], iocStatus: 'under-investigation', trashed: false, archived: false, createdAt: baseTs + 8 * HOUR, updatedAt: baseTs + DAY },
    // CVE (2)
    { id: sampleId('ioc', 20), type: 'cve', value: 'CVE-2024-38856', confidence: 'high', analystNotes: 'npm registry authentication bypass used by Midnight Typhoon to compromise @pdfcore/render maintainer account.', folderId: SAMPLE_FOLDER_ID, tags: ['supply-chain'], iocSubtype: 'auth-bypass', iocStatus: 'active', trashed: false, archived: false, createdAt: baseTs, updatedAt: baseTs + HOUR },
    { id: sampleId('ioc', 21), type: 'cve', value: 'CVE-2024-21413', confidence: 'medium', analystNotes: 'Outlook RCE — secondary exploitation vector observed in phishing attachment variant (under investigation).', folderId: SAMPLE_FOLDER_ID, tags: ['midnight-typhoon'], iocSubtype: 'RCE', iocStatus: 'under-investigation', trashed: false, archived: false, createdAt: baseTs + DAY, updatedAt: baseTs + DAY },
    // MITRE ATT&CK (4)
    { id: sampleId('ioc', 22), type: 'mitre-attack', value: 'T1195.002', confidence: 'confirmed', analystNotes: 'Supply Chain Compromise: Compromise Software Supply Chain — primary initial access vector.', folderId: SAMPLE_FOLDER_ID, tags: ['supply-chain'], trashed: false, archived: false, createdAt: baseTs, updatedAt: baseTs },
    { id: sampleId('ioc', 23), type: 'mitre-attack', value: 'T1566.001', confidence: 'confirmed', analystNotes: 'Phishing: Spearphishing Attachment — secondary access vector targeting engineers.', folderId: SAMPLE_FOLDER_ID, tags: ['initial-access'], trashed: false, archived: false, createdAt: baseTs + 6 * HOUR, updatedAt: baseTs + 6 * HOUR },
    { id: sampleId('ioc', 24), type: 'mitre-attack', value: 'T1567.002', confidence: 'high', analystNotes: 'Exfiltration Over Web Service: Exfiltration to Cloud Storage — data theft to external servers.', folderId: SAMPLE_FOLDER_ID, tags: ['exfiltration'], trashed: false, archived: false, createdAt: baseTs + 3 * DAY, updatedAt: baseTs + 3 * DAY },
    { id: sampleId('ioc', 25), type: 'mitre-attack', value: 'T1071.001', confidence: 'confirmed', analystNotes: 'Application Layer Protocol: Web Protocols — C2 via HTTPS with domain fronting.', folderId: SAMPLE_FOLDER_ID, tags: ['midnight-typhoon'], trashed: false, archived: false, createdAt: baseTs, updatedAt: baseTs },
  ];

  // ─── Whiteboard ────────────────────────────────────────────────────
  // Excalidraw element helper — provides required defaults
  const el = (id: string, type: string, x: number, y: number, w: number, h: number, overrides: Record<string, unknown> = {}) => ({
    id, type, x, y, width: w, height: h,
    strokeColor: '#ffffff', backgroundColor: 'transparent', fillStyle: 'solid' as const,
    strokeWidth: 2, strokeStyle: 'solid' as const, roughness: 0, opacity: 100,
    angle: 0, seed: Math.abs(id.split('').reduce((a, c) => a + c.charCodeAt(0), 0) * 7919),
    version: 1, versionNonce: Math.abs(id.split('').reduce((a, c) => a + c.charCodeAt(0), 0) * 6211),
    index: null, isDeleted: false, groupIds: [] as string[], frameId: null,
    boundElements: null, updated: baseTs + 3 * DAY, link: null, locked: false,
    roundness: type === 'arrow' || type === 'line' ? null : { type: 'adaptive' as const },
    ...overrides,
  });
  const txt = (id: string, x: number, y: number, w: number, h: number, text: string, overrides: Record<string, unknown> = {}) => ({
    ...el(id, 'text', x, y, w, h),
    text, originalText: text, autoResize: true,
    fontSize: 16, fontFamily: 1, textAlign: 'center', verticalAlign: 'middle',
    containerId: null, lineHeight: 1.25,
    ...overrides,
  });
  const arrow = (id: string, x: number, y: number, points: number[][], overrides: Record<string, unknown> = {}) => ({
    ...el(id, 'arrow', x, y, Math.abs(points[points.length - 1][0]), Math.abs(points[points.length - 1][1])),
    points, startArrowhead: null, endArrowhead: 'arrow',
    startBinding: null, endBinding: null, lastCommittedPoint: null,
    strokeColor: '#6b7280', strokeWidth: 2,
    ...overrides,
  });

  const whiteboardElements = JSON.stringify([
    // ── Title ──
    txt('wb-t0', 420, 10, 440, 40, 'OPERATION DARK GLACIER — Attack Flow', { fontSize: 24, fontFamily: 2, strokeColor: '#ef4444', textAlign: 'center' }),
    txt('wb-t1', 450, 55, 380, 24, 'Midnight Typhoon · 5-Day Attack Window · OpenSlaw.ai', { fontSize: 13, fontFamily: 2, strokeColor: '#6b7280', textAlign: 'center' }),

    // ── Phase 1: Initial Access (Day 0) ──
    txt('wb-ph1', 20, 95, 200, 20, 'DAY 0 — INITIAL ACCESS', { fontSize: 11, fontFamily: 2, strokeColor: '#ef4444', textAlign: 'left' }),
    // Supply chain box
    el('wb-r1', 'rectangle', 30, 120, 220, 80, { strokeColor: '#ef4444', backgroundColor: '#ef444415' }),
    txt('wb-r1t', 35, 125, 210, 24, 'Supply Chain Compromise', { fontSize: 15, fontFamily: 2, strokeColor: '#ef4444', containerId: null }),
    txt('wb-r1s', 35, 152, 210, 40, '@pdfcore/render v3.2.1\nBackdoored npm package\nT1195.002', { fontSize: 11, strokeColor: '#9ca3af' }),
    // Phishing box
    el('wb-r2', 'rectangle', 30, 230, 220, 80, { strokeColor: '#f97316', backgroundColor: '#f9731615' }),
    txt('wb-r2t', 35, 235, 210, 24, 'Phishing Campaign', { fontSize: 15, fontFamily: 2, strokeColor: '#f97316' }),
    txt('wb-r2s', 35, 262, 210, 40, 'DocuSign lure → 5 engineers\n1 credential captured (m.chen)\nT1566.001', { fontSize: 11, strokeColor: '#9ca3af' }),

    // ── Phase 2: Execution & C2 (Day 0) ──
    txt('wb-ph2', 310, 95, 200, 20, 'DAY 0 — EXECUTION & C2', { fontSize: 11, fontFamily: 2, strokeColor: '#a855f7', textAlign: 'left' }),
    el('wb-r3', 'rectangle', 310, 120, 220, 80, { strokeColor: '#a855f7', backgroundColor: '#a855f715' }),
    txt('wb-r3t', 315, 125, 210, 24, 'Backdoor Activation', { fontSize: 15, fontFamily: 2, strokeColor: '#a855f7' }),
    txt('wb-r3s', 315, 152, 210, 40, 'libpdfmetrics.node dropped\nEnv vars harvested\nAWS keys, DB creds, Okta token', { fontSize: 11, strokeColor: '#9ca3af' }),
    el('wb-r4', 'rectangle', 310, 230, 220, 80, { strokeColor: '#3b82f6', backgroundColor: '#3b82f615' }),
    txt('wb-r4t', 315, 235, 210, 24, 'Dual C2 Channels', { fontSize: 15, fontFamily: 2, strokeColor: '#3b82f6' }),
    txt('wb-r4s', 315, 262, 210, 40, 'HTTPS domain fronting\ncdn-assets-proxy.com → Moscow\nDNS tunnel → Shanghai', { fontSize: 11, strokeColor: '#9ca3af' }),

    // ── Phase 3: Pivot & Escalation (Day 1-2) ──
    txt('wb-ph3', 590, 95, 250, 20, 'DAY 1-2 — PIVOT & ESCALATION', { fontSize: 11, fontFamily: 2, strokeColor: '#06b6d4', textAlign: 'left' }),
    el('wb-r5', 'rectangle', 590, 120, 220, 80, { strokeColor: '#06b6d4', backgroundColor: '#06b6d415' }),
    txt('wb-r5t', 595, 125, 210, 24, 'AWS Cloud Pivot', { fontSize: 15, fontFamily: 2, strokeColor: '#06b6d4' }),
    txt('wb-r5s', 595, 152, 210, 40, 'CI role → prod-api role\nS3 + RDS + SES access\nT1078.004', { fontSize: 11, strokeColor: '#9ca3af' }),
    el('wb-r6', 'rectangle', 590, 230, 220, 80, { strokeColor: '#ec4899', backgroundColor: '#ec489915' }),
    txt('wb-r6t', 595, 235, 210, 24, 'Privilege Escalation', { fontSize: 15, fontFamily: 2, strokeColor: '#ec4899' }),
    txt('wb-r6s', 595, 262, 210, 40, 'SSO → openslaw-admin role\nCloudTrail disabled 4h\nFull admin access', { fontSize: 11, strokeColor: '#9ca3af' }),

    // ── Phase 4: Collection & Exfil (Day 3-4) ──
    txt('wb-ph4', 870, 95, 230, 20, 'DAY 3-4 — EXFILTRATION', { fontSize: 11, fontFamily: 2, strokeColor: '#eab308', textAlign: 'left' }),
    el('wb-r7', 'rectangle', 870, 120, 220, 80, { strokeColor: '#eab308', backgroundColor: '#eab30815' }),
    txt('wb-r7t', 875, 125, 210, 24, 'Data Collection', { fontSize: 15, fontFamily: 2, strokeColor: '#eab308' }),
    txt('wb-r7s', 875, 152, 210, 40, '12,847 legal documents\n47 client matters\ns3://openslaw-legal-docs/', { fontSize: 11, strokeColor: '#9ca3af' }),
    el('wb-r8', 'rectangle', 870, 230, 220, 80, { strokeColor: '#ef4444', backgroundColor: '#ef444415' }),
    txt('wb-r8t', 875, 235, 210, 24, 'Exfiltration', { fontSize: 15, fontFamily: 2, strokeColor: '#ef4444' }),
    txt('wb-r8s', 875, 262, 210, 40, '2.3 GB encrypted (7z, AES-256)\nBucharest staging → Singapore\nT1567.002', { fontSize: 11, strokeColor: '#9ca3af' }),

    // ── Phase 5: Detection & Response (Day 4-5) ──
    txt('wb-ph5', 1150, 95, 230, 20, 'DAY 4-5 — RESPONSE', { fontSize: 11, fontFamily: 2, strokeColor: '#22c55e', textAlign: 'left' }),
    // Detection diamond
    el('wb-d1', 'diamond', 1175, 120, 160, 80, { strokeColor: '#22c55e', backgroundColor: '#22c55e15' }),
    txt('wb-d1t', 1195, 140, 120, 40, 'SOC ALERT\nAnomaly Detected', { fontSize: 12, fontFamily: 2, strokeColor: '#22c55e' }),
    el('wb-r9', 'rectangle', 1150, 230, 220, 80, { strokeColor: '#10b981', backgroundColor: '#10b98115' }),
    txt('wb-r9t', 1155, 235, 210, 24, 'Containment & Eradication', { fontSize: 15, fontFamily: 2, strokeColor: '#10b981' }),
    txt('wb-r9s', 1155, 262, 210, 40, 'C2 blocked, keys revoked\nnpm rolled back, server rebuilt\nForensic imaging complete', { fontSize: 11, strokeColor: '#9ca3af' }),

    // ── Arrows (phase connections) ──
    arrow('wb-a1', 250, 155, [[0, 0], [60, 0]], { strokeColor: '#ef4444' }),    // Supply Chain → Backdoor
    arrow('wb-a2', 250, 265, [[0, 0], [60, 0]], { strokeColor: '#f97316' }),    // Phishing → C2
    arrow('wb-a3', 530, 155, [[0, 0], [60, 0]], { strokeColor: '#a855f7' }),    // Backdoor → AWS Pivot
    arrow('wb-a4', 530, 265, [[0, 0], [60, 0]], { strokeColor: '#3b82f6' }),    // C2 → Priv Esc
    arrow('wb-a5', 810, 155, [[0, 0], [60, 0]], { strokeColor: '#06b6d4' }),    // AWS Pivot → Collection
    arrow('wb-a6', 810, 265, [[0, 0], [60, 0]], { strokeColor: '#ec4899' }),    // Priv Esc → Exfil
    arrow('wb-a7', 1090, 155, [[0, 0], [85, 0]], { strokeColor: '#eab308' }),   // Collection → Detection
    arrow('wb-a8', 1090, 265, [[0, 0], [60, 0]], { strokeColor: '#ef4444' }),   // Exfil → Containment
    // Vertical connections
    arrow('wb-a9', 140, 200, [[0, 0], [0, 30]], { strokeColor: '#6b7280', strokeWidth: 1, strokeStyle: 'dashed' }),    // Supply → Phishing (parallel vectors)
    arrow('wb-a10', 420, 200, [[0, 0], [0, 30]], { strokeColor: '#6b7280', strokeWidth: 1, strokeStyle: 'dashed' }),   // Backdoor → C2
    arrow('wb-a11', 700, 200, [[0, 0], [0, 30]], { strokeColor: '#6b7280', strokeWidth: 1, strokeStyle: 'dashed' }),   // Pivot → Priv Esc
    arrow('wb-a12', 980, 200, [[0, 0], [0, 30]], { strokeColor: '#6b7280', strokeWidth: 1, strokeStyle: 'dashed' }),   // Collection → Exfil
    arrow('wb-a13', 1255, 200, [[0, 0], [0, 30]], { strokeColor: '#22c55e', strokeWidth: 1 }),   // Detection → Containment

    // ── Infrastructure annotations (bottom row) ──
    txt('wb-inf', 420, 345, 440, 20, 'INFRASTRUCTURE', { fontSize: 11, fontFamily: 2, strokeColor: '#6b7280', textAlign: 'center' }),
    el('wb-infbox', 'rectangle', 30, 365, 1340, 70, { strokeColor: '#374151', backgroundColor: '#1f293715', strokeWidth: 1 }),
    txt('wb-inf1', 45, 372, 200, 20, '185.220.101.34', { fontSize: 13, fontFamily: 3, strokeColor: '#3b82f6', textAlign: 'left' }),
    txt('wb-inf1l', 45, 395, 200, 16, 'C2 Server · Moscow, RU', { fontSize: 10, strokeColor: '#6b7280', textAlign: 'left' }),
    txt('wb-inf2', 280, 372, 200, 20, '91.215.85.17', { fontSize: 13, fontFamily: 3, strokeColor: '#06b6d4', textAlign: 'left' }),
    txt('wb-inf2l', 280, 395, 200, 16, 'DNS Tunnel NS · Shanghai, CN', { fontSize: 10, strokeColor: '#6b7280', textAlign: 'left' }),
    txt('wb-inf3', 520, 372, 200, 20, '89.44.9.241', { fontSize: 13, fontFamily: 3, strokeColor: '#f97316', textAlign: 'left' }),
    txt('wb-inf3l', 520, 395, 200, 16, 'Phishing Host · Amsterdam, NL', { fontSize: 10, strokeColor: '#6b7280', textAlign: 'left' }),
    txt('wb-inf4', 760, 372, 200, 20, '185.156.73.22', { fontSize: 13, fontFamily: 3, strokeColor: '#eab308', textAlign: 'left' }),
    txt('wb-inf4l', 760, 395, 200, 16, 'Exfil Staging · Bucharest, RO', { fontSize: 10, strokeColor: '#6b7280', textAlign: 'left' }),
    txt('wb-inf5', 1000, 372, 200, 20, '103.253.41.98', { fontSize: 13, fontFamily: 3, strokeColor: '#ef4444', textAlign: 'left' }),
    txt('wb-inf5l', 1000, 395, 200, 16, 'Data Landing · Singapore, SG', { fontSize: 10, strokeColor: '#6b7280', textAlign: 'left' }),

    // ── MITRE ATT&CK reference (top-right) ──
    el('wb-mitre', 'rectangle', 1150, 0, 220, 85, { strokeColor: '#374151', backgroundColor: '#1f293715', strokeWidth: 1 }),
    txt('wb-mitret', 1160, 5, 200, 16, 'MITRE ATT&CK', { fontSize: 11, fontFamily: 2, strokeColor: '#14b8a6', textAlign: 'left' }),
    txt('wb-mitrel', 1160, 22, 200, 60, 'T1195.002 · T1566.001\nT1078.004 · T1071.001\nT1572 · T1567.002\nT1537 · T1560.001', { fontSize: 10, fontFamily: 3, strokeColor: '#6b7280', textAlign: 'left', lineHeight: 1.4 }),
  ]);

  const whiteboard: Whiteboard = {
    id: sampleId('whiteboard', 1),
    name: 'DARK GLACIER Attack Flow',
    elements: whiteboardElements,
    folderId: SAMPLE_FOLDER_ID,
    tags: ['midnight-typhoon'],
    order: 1,
    trashed: false,
    archived: false,
    createdAt: baseTs + 3 * DAY,
    updatedAt: baseTs + 5 * DAY,
  };

  return { folder, notes, tasks, timelineEvents, timeline, standaloneIOCs, whiteboard, tags };
}
