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

  // Base timestamp: 7 days ago
  const baseTs = now - 7 * DAY;

  const tags: Tag[] = [
    { id: sampleId('tag', 1), name: 'apt-29', color: '#ef4444' },
    { id: sampleId('tag', 2), name: 'phishing', color: '#f97316' },
    { id: sampleId('tag', 3), name: 'c2', color: '#3b82f6' },
    { id: sampleId('tag', 4), name: 'malware', color: '#a855f7' },
    { id: sampleId('tag', 5), name: 'remediation', color: '#22c55e' },
  ];

  const folder: Folder = {
    id: SAMPLE_FOLDER_ID,
    name: 'Operation STARDUST (Sample)',
    description: 'A sample APT-29 (Cozy Bear) investigation demonstrating ThreatCaddy features. Delete this investigation when you are done exploring.',
    status: 'active',
    clsLevel: 'TLP:AMBER',
    order: 999,
    createdAt: baseTs,
    updatedAt: now,
    timelineId: SAMPLE_TIMELINE_ID,
    tags: ['apt-29'],
  };

  const timeline: Timeline = {
    id: SAMPLE_TIMELINE_ID,
    name: 'STARDUST Incident Timeline',
    description: 'Timeline of observed attacker and defender activity',
    color: '#ef4444',
    order: 1,
    createdAt: baseTs,
    updatedAt: now,
  };

  const notes: Note[] = [
    {
      id: sampleId('note', 1),
      title: 'Executive Summary — Operation STARDUST',
      content: `# Executive Summary\n\nOn ${new Date(baseTs).toLocaleDateString()}, a targeted phishing campaign was detected targeting our finance department. Attribution indicators point to **APT-29 (Cozy Bear)**.\n\n## Key Findings\n\n- Spear-phishing email with malicious attachment delivered to 3 users\n- One user executed the attachment, leading to dropper execution\n- C2 beacon established to \`stardust-update.com\` (45.77.123.45)\n- Credential harvesting via Mimikatz observed\n- Lateral movement to domain controller\n- Data staging on \\\\\\\\DC01\\\\C$\\\\Temp detected before exfiltration\n\n## Current Status\n\nContainment is in progress. Affected endpoints have been isolated. Full remediation pending.`,
      folderId: SAMPLE_FOLDER_ID,
      tags: ['apt-29'],
      pinned: true,
      archived: false,
      trashed: false,
      clsLevel: 'TLP:AMBER',
      iocAnalysis: {
        extractedAt: baseTs + HOUR,
        iocs: [
          { id: 'sioc1', type: 'domain', value: 'stardust-update.com', confidence: 'confirmed', firstSeen: baseTs, dismissed: false, attribution: 'APT-29' },
          { id: 'sioc2', type: 'ipv4', value: '45.77.123.45', confidence: 'high', firstSeen: baseTs, dismissed: false, attribution: 'APT-29' },
        ],
      },
      iocTypes: ['domain', 'ipv4'],
      createdAt: baseTs,
      updatedAt: baseTs + 2 * HOUR,
    },
    {
      id: sampleId('note', 2),
      title: 'Phishing Email Analysis',
      content: `# Phishing Email Analysis\n\n## Headers\n\n- **From:** hr-updates@stardust-portal.com\n- **Subject:** "Quarterly Compensation Review — Action Required"\n- **Date:** ${new Date(baseTs).toISOString()}\n- **X-Mailer:** Microsoft Outlook 16.0\n\n## Attachment\n\n- **Filename:** Q4_Compensation_Review.xlsm\n- **SHA-256:** a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2\n- Contains VBA macro that downloads second-stage payload\n\n## Observations\n\n- Email spoofed internal HR domain\n- Payload URL embedded in macro: \`https://stardust-cdn.com/update.exe\`\n- 3 recipients, 1 execution confirmed (user: jsmith@corp)`,
      folderId: SAMPLE_FOLDER_ID,
      tags: ['phishing', 'apt-29'],
      pinned: false,
      archived: false,
      trashed: false,
      clsLevel: 'TLP:AMBER',
      iocAnalysis: {
        extractedAt: baseTs + 2 * HOUR,
        iocs: [
          { id: 'sioc3', type: 'email', value: 'hr-updates@stardust-portal.com', confidence: 'confirmed', firstSeen: baseTs, dismissed: false },
          { id: 'sioc4', type: 'sha256', value: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2', confidence: 'confirmed', firstSeen: baseTs, dismissed: false },
          { id: 'sioc5', type: 'url', value: 'https://stardust-cdn.com/update.exe', confidence: 'high', firstSeen: baseTs, dismissed: false, attribution: 'APT-29' },
          { id: 'sioc6', type: 'domain', value: 'stardust-portal.com', confidence: 'confirmed', firstSeen: baseTs, dismissed: false },
        ],
      },
      iocTypes: ['email', 'sha256', 'url', 'domain'],
      createdAt: baseTs + HOUR,
      updatedAt: baseTs + 3 * HOUR,
    },
    {
      id: sampleId('note', 3),
      title: 'Malware Analysis — Dropper',
      content: `# Malware Analysis: Q4_Compensation_Review.xlsm\n\n## Static Analysis\n\n- **Type:** Office Open XML with VBA macros\n- **SHA-256:** a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2\n- **MD5:** d4e5f6a1b2c3d4e5f6a1b2c3\n- VBA uses PowerShell to download payload from stardust-cdn.com\n\n## Dynamic Analysis (Sandbox)\n\n- Drops \`svchost_update.exe\` in %TEMP%\n- Payload SHA-256: b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3\n- Establishes HTTPS C2 to 45.77.123.45:443\n- Persistence: Registry Run key (HKCU\\\\Software\\\\Microsoft\\\\Windows\\\\CurrentVersion\\\\Run\\\\SvcUpdate)\n- Anti-analysis: checks for VM artifacts, debugger presence\n\n## MITRE ATT&CK\n\n- T1566.001 — Spear-phishing Attachment\n- T1059.001 — PowerShell\n- T1547.001 — Registry Run Keys`,
      folderId: SAMPLE_FOLDER_ID,
      tags: ['malware', 'apt-29'],
      pinned: false,
      archived: false,
      trashed: false,
      clsLevel: 'TLP:AMBER',
      iocAnalysis: {
        extractedAt: baseTs + 4 * HOUR,
        iocs: [
          { id: 'sioc7', type: 'md5', value: 'd4e5f6a1b2c3d4e5f6a1b2c3', confidence: 'confirmed', firstSeen: baseTs + HOUR, dismissed: false },
          { id: 'sioc8', type: 'sha256', value: 'b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3', confidence: 'confirmed', firstSeen: baseTs + HOUR, dismissed: false, attribution: 'APT-29' },
          { id: 'sioc9', type: 'file-path', value: '%TEMP%\\svchost_update.exe', confidence: 'confirmed', firstSeen: baseTs + HOUR, dismissed: false },
          { id: 'sioc10', type: 'mitre-attack', value: 'T1566.001', confidence: 'confirmed', firstSeen: baseTs, dismissed: false },
          { id: 'sioc11', type: 'mitre-attack', value: 'T1059.001', confidence: 'confirmed', firstSeen: baseTs, dismissed: false },
          { id: 'sioc12', type: 'mitre-attack', value: 'T1547.001', confidence: 'confirmed', firstSeen: baseTs, dismissed: false },
        ],
      },
      iocTypes: ['md5', 'sha256', 'file-path', 'mitre-attack'],
      createdAt: baseTs + 3 * HOUR,
      updatedAt: baseTs + 5 * HOUR,
    },
    {
      id: sampleId('note', 4),
      title: 'C2 Infrastructure Analysis',
      content: `# C2 Infrastructure\n\n## Primary C2\n\n- **Domain:** stardust-update.com\n- **IP:** 45.77.123.45 (Vultr VPS, NL)\n- **Protocol:** HTTPS (port 443)\n- **Beacon interval:** ~60s with 20% jitter\n- **SSL cert:** Let's Encrypt, issued 10 days before incident\n\n## Secondary/Fallback\n\n- **Domain:** stardust-sync.net\n- **IP:** 104.238.167.89 (Vultr VPS, US)\n- Not yet observed in active traffic, found in binary strings\n\n## DNS Resolution History\n\n| Domain | First Seen | IP |\n|--------|-----------|----|\n| stardust-update.com | 10 days ago | 45.77.123.45 |\n| stardust-sync.net | 12 days ago | 104.238.167.89 |\n| stardust-cdn.com | 14 days ago | 45.77.123.45 |`,
      folderId: SAMPLE_FOLDER_ID,
      tags: ['c2', 'apt-29'],
      pinned: false,
      archived: false,
      trashed: false,
      clsLevel: 'TLP:AMBER',
      iocAnalysis: {
        extractedAt: baseTs + 6 * HOUR,
        iocs: [
          { id: 'sioc13', type: 'domain', value: 'stardust-sync.net', confidence: 'medium', firstSeen: baseTs + 2 * HOUR, dismissed: false, attribution: 'APT-29' },
          { id: 'sioc14', type: 'ipv4', value: '104.238.167.89', confidence: 'medium', firstSeen: baseTs + 2 * HOUR, dismissed: false },
          { id: 'sioc15', type: 'domain', value: 'stardust-cdn.com', confidence: 'high', firstSeen: baseTs, dismissed: false, attribution: 'APT-29' },
        ],
      },
      iocTypes: ['domain', 'ipv4'],
      createdAt: baseTs + 5 * HOUR,
      updatedAt: baseTs + 7 * HOUR,
    },
    {
      id: sampleId('note', 5),
      title: 'Lateral Movement Observations',
      content: `# Lateral Movement\n\n## Credential Access\n\n- Mimikatz executed on WKSTN-042 at ${new Date(baseTs + DAY + 4 * HOUR).toLocaleString()}\n- Obtained domain admin credentials (da_admin)\n- T1003.001 — OS Credential Dumping: LSASS Memory\n\n## Movement\n\n- RDP from WKSTN-042 to DC01 using da_admin at ${new Date(baseTs + DAY + 6 * HOUR).toLocaleString()}\n- SMB file copy to \\\\\\\\DC01\\\\C$\\\\Temp\n- T1021.001 — Remote Desktop Protocol\n- T1021.002 — SMB/Windows Admin Shares\n\n## Affected Systems\n\n| Hostname | Role | Status |\n|----------|------|--------|\n| WKSTN-042 | User workstation | Compromised |\n| DC01 | Domain Controller | Compromised |\n| FS01 | File Server | Under investigation |`,
      folderId: SAMPLE_FOLDER_ID,
      tags: ['apt-29'],
      pinned: false,
      archived: false,
      trashed: false,
      clsLevel: 'TLP:AMBER',
      iocAnalysis: {
        extractedAt: baseTs + DAY + 8 * HOUR,
        iocs: [
          { id: 'sioc16', type: 'mitre-attack', value: 'T1003.001', confidence: 'confirmed', firstSeen: baseTs + DAY, dismissed: false },
          { id: 'sioc17', type: 'mitre-attack', value: 'T1021.001', confidence: 'confirmed', firstSeen: baseTs + DAY, dismissed: false },
          { id: 'sioc18', type: 'mitre-attack', value: 'T1021.002', confidence: 'confirmed', firstSeen: baseTs + DAY, dismissed: false },
        ],
      },
      iocTypes: ['mitre-attack'],
      createdAt: baseTs + DAY + 7 * HOUR,
      updatedAt: baseTs + DAY + 9 * HOUR,
    },
    {
      id: sampleId('note', 6),
      title: 'Data Exfiltration Assessment',
      content: `# Data Exfiltration Assessment\n\n## Staging\n\n- Data staged at \\\\\\\\DC01\\\\C$\\\\Temp\\\\backup.7z\n- Compressed archive (~450MB)\n- Contains files from finance share (Q4 reports, compensation data)\n\n## Exfiltration\n\n- Exfiltrated via HTTPS to C2 at ${new Date(baseTs + 2 * DAY).toLocaleString()}\n- Total data: ~450MB over 2 hours\n- T1041 — Exfiltration Over C2 Channel\n- T1560.001 — Archive Collected Data\n\n## Impact\n\n- **Confidential financial data** potentially exposed\n- Employee compensation records (PII)\n- Q4 earnings projections (material non-public information)`,
      folderId: SAMPLE_FOLDER_ID,
      tags: ['apt-29'],
      pinned: false,
      archived: false,
      trashed: false,
      clsLevel: 'TLP:RED',
      iocAnalysis: {
        extractedAt: baseTs + 2 * DAY + 4 * HOUR,
        iocs: [
          { id: 'sioc19', type: 'mitre-attack', value: 'T1041', confidence: 'high', firstSeen: baseTs + 2 * DAY, dismissed: false },
          { id: 'sioc20', type: 'mitre-attack', value: 'T1560.001', confidence: 'high', firstSeen: baseTs + 2 * DAY, dismissed: false },
          { id: 'sioc21', type: 'file-path', value: '\\\\DC01\\C$\\Temp\\backup.7z', confidence: 'confirmed', firstSeen: baseTs + 2 * DAY, dismissed: false },
        ],
      },
      iocTypes: ['mitre-attack', 'file-path'],
      createdAt: baseTs + 2 * DAY + 2 * HOUR,
      updatedAt: baseTs + 2 * DAY + 5 * HOUR,
    },
    {
      id: sampleId('note', 7),
      title: 'Remediation Plan',
      content: `# Remediation Plan\n\n## Immediate (0-24h)\n\n- [x] Isolate WKSTN-042 and DC01\n- [x] Block C2 domains/IPs at firewall\n- [ ] Force password reset for da_admin and all domain admins\n- [ ] Revoke all active sessions\n\n## Short-term (1-7 days)\n\n- [ ] Full EDR scan across all endpoints\n- [ ] Review AD logs for additional lateral movement\n- [ ] Rebuild DC01 from known-good backup\n- [ ] Deploy updated YARA/Sigma rules\n\n## Long-term\n\n- Implement MFA for all privileged accounts\n- Deploy network segmentation for finance segment\n- Enhance email gateway rules for macro-enabled attachments\n- Conduct tabletop exercise for similar scenarios`,
      folderId: SAMPLE_FOLDER_ID,
      tags: ['remediation'],
      pinned: false,
      archived: false,
      trashed: false,
      clsLevel: 'TLP:AMBER',
      createdAt: baseTs + 3 * DAY,
      updatedAt: baseTs + 4 * DAY,
    },
    {
      id: sampleId('note', 8),
      title: 'IOC Sharing Report Draft',
      content: `# IOC Sharing Report — Operation STARDUST\n\n**Classification:** TLP:AMBER\n**Date:** ${new Date(now).toLocaleDateString()}\n\n## Network Indicators\n\n| Type | Value | Confidence | Notes |\n|------|-------|------------|-------|\n| Domain | stardust-update.com | Confirmed | Primary C2 |\n| Domain | stardust-cdn.com | High | Payload hosting |\n| Domain | stardust-sync.net | Medium | Fallback C2 |\n| Domain | stardust-portal.com | Confirmed | Phishing sender domain |\n| IP | 45.77.123.45 | High | C2 server (Vultr NL) |\n| IP | 104.238.167.89 | Medium | Fallback C2 (Vultr US) |\n| URL | https://stardust-cdn.com/update.exe | High | Payload URL |\n\n## File Indicators\n\n| Type | Value | Notes |\n|------|-------|-------|\n| SHA-256 | a1b2c3...a1b2 | Dropper (xlsm) |\n| SHA-256 | b2c3d4...b2c3 | Payload (svchost_update.exe) |\n| MD5 | d4e5f6a1b2c3d4e5f6a1b2c3 | Dropper |\n\n## Attribution\n\nIndicators align with known APT-29 (Cozy Bear) TTPs and infrastructure patterns.`,
      folderId: SAMPLE_FOLDER_ID,
      tags: ['apt-29'],
      pinned: false,
      archived: false,
      trashed: false,
      clsLevel: 'TLP:AMBER',
      createdAt: baseTs + 4 * DAY,
      updatedAt: baseTs + 5 * DAY,
    },
  ];

  const tasks: Task[] = [
    {
      id: sampleId('task', 1), title: 'Analyze phishing email headers', description: 'Extract and analyze full email headers from the spear-phishing email targeting finance dept.', completed: true, priority: 'high', status: 'done', order: 1, folderId: SAMPLE_FOLDER_ID, tags: ['phishing'], clsLevel: 'TLP:AMBER', trashed: false, archived: false, createdAt: baseTs, updatedAt: baseTs + 4 * HOUR, completedAt: baseTs + 4 * HOUR,
    },
    {
      id: sampleId('task', 2), title: 'Submit malware sample to sandbox', description: 'Upload Q4_Compensation_Review.xlsm and svchost_update.exe to sandbox for dynamic analysis.', completed: true, priority: 'high', status: 'done', order: 2, folderId: SAMPLE_FOLDER_ID, tags: ['malware'], clsLevel: 'TLP:AMBER', trashed: false, archived: false, createdAt: baseTs + HOUR, updatedAt: baseTs + 6 * HOUR, completedAt: baseTs + 6 * HOUR,
    },
    {
      id: sampleId('task', 3), title: 'Block C2 domains on firewall', description: 'Add stardust-update.com, stardust-cdn.com, stardust-sync.net, and stardust-portal.com to DNS blackhole and firewall block rules.', completed: false, priority: 'high', status: 'in-progress', order: 3, folderId: SAMPLE_FOLDER_ID, tags: ['c2', 'remediation'], clsLevel: 'TLP:AMBER', trashed: false, archived: false, createdAt: baseTs + 2 * HOUR, updatedAt: baseTs + DAY,
    },
    {
      id: sampleId('task', 4), title: 'Scan all endpoints for persistence artifacts', description: 'Use EDR to scan for Registry Run key (SvcUpdate), svchost_update.exe in %TEMP%, and related indicators.', completed: false, priority: 'high', status: 'todo', order: 4, folderId: SAMPLE_FOLDER_ID, tags: ['remediation'], trashed: false, archived: false, createdAt: baseTs + 4 * HOUR, updatedAt: baseTs + 4 * HOUR,
    },
    {
      id: sampleId('task', 5), title: 'Review AD logs for lateral movement', description: 'Analyze Active Directory authentication logs for additional compromised accounts and lateral movement beyond WKSTN-042 → DC01.', completed: false, priority: 'medium', status: 'in-progress', order: 5, folderId: SAMPLE_FOLDER_ID, tags: ['apt-29'], trashed: false, archived: false, createdAt: baseTs + 6 * HOUR, updatedAt: baseTs + DAY + 2 * HOUR,
    },
    {
      id: sampleId('task', 6), title: 'Notify affected users', description: 'Notify the 3 phishing recipients and jsmith (who executed the attachment). Coordinate with HR for credential reset.', completed: false, priority: 'medium', status: 'todo', order: 6, folderId: SAMPLE_FOLDER_ID, tags: ['remediation'], trashed: false, archived: false, createdAt: baseTs + DAY, updatedAt: baseTs + DAY,
    },
    {
      id: sampleId('task', 7), title: 'Prepare IOC report for ISAC', description: 'Compile all confirmed IOCs with confidence levels and attribution data for sharing via ISAC channel.', completed: false, priority: 'medium', status: 'todo', order: 7, folderId: SAMPLE_FOLDER_ID, tags: ['apt-29'], clsLevel: 'TLP:AMBER', trashed: false, archived: false, createdAt: baseTs + 2 * DAY, updatedAt: baseTs + 2 * DAY,
    },
    {
      id: sampleId('task', 8), title: 'Rebuild DC01 from backup', description: 'Coordinate with IT to rebuild DC01 from last known-good backup. Verify integrity before rejoining to domain.', completed: false, priority: 'high', status: 'todo', order: 8, folderId: SAMPLE_FOLDER_ID, tags: ['remediation'], trashed: false, archived: false, createdAt: baseTs + 3 * DAY, updatedAt: baseTs + 3 * DAY,
    },
    {
      id: sampleId('task', 9), title: 'Deploy updated detection rules', description: 'Write and deploy YARA rules for the dropper/payload, and Sigma rules for the C2 beacon pattern and persistence mechanism.', completed: false, priority: 'medium', status: 'todo', order: 9, folderId: SAMPLE_FOLDER_ID, tags: ['malware', 'remediation'], trashed: false, archived: false, createdAt: baseTs + 3 * DAY, updatedAt: baseTs + 3 * DAY,
    },
    {
      id: sampleId('task', 10), title: 'Post-incident review meeting', description: 'Schedule and conduct post-incident review with SOC, IT, and management. Document lessons learned.', completed: false, priority: 'low', status: 'todo', order: 10, folderId: SAMPLE_FOLDER_ID, tags: [], dueDate: new Date(now + 7 * DAY).toISOString().slice(0, 10), trashed: false, archived: false, createdAt: baseTs + 4 * DAY, updatedAt: baseTs + 4 * DAY,
    },
  ];

  const timelineEvents: TimelineEvent[] = [
    {
      id: sampleId('event', 1), timestamp: baseTs, title: 'Phishing email received', description: 'Spear-phishing email "Quarterly Compensation Review" delivered to 3 finance dept users.', eventType: 'initial-access', source: 'Email Gateway', confidence: 'confirmed', linkedIOCIds: [], linkedNoteIds: [sampleId('note', 2)], linkedTaskIds: [sampleId('task', 1)], mitreAttackIds: ['T1566.001'], assets: ['EMAIL-GW'], tags: ['phishing'], starred: true, folderId: SAMPLE_FOLDER_ID, timelineId: SAMPLE_TIMELINE_ID, clsLevel: 'TLP:AMBER', trashed: false, archived: false, createdAt: baseTs, updatedAt: baseTs + HOUR,
    },
    {
      id: sampleId('event', 2), timestamp: baseTs + 2 * HOUR, title: 'User clicked malicious attachment', description: 'User jsmith opened Q4_Compensation_Review.xlsm and enabled macros.', eventType: 'execution', source: 'EDR', confidence: 'confirmed', linkedIOCIds: [], linkedNoteIds: [], linkedTaskIds: [], mitreAttackIds: ['T1204.002'], assets: ['WKSTN-042'], tags: ['phishing'], starred: false, folderId: SAMPLE_FOLDER_ID, timelineId: SAMPLE_TIMELINE_ID, trashed: false, archived: false, createdAt: baseTs + 2 * HOUR, updatedAt: baseTs + 3 * HOUR,
    },
    {
      id: sampleId('event', 3), timestamp: baseTs + 2 * HOUR + 30 * 60000, title: 'Dropper executed — payload downloaded', description: 'VBA macro launched PowerShell, downloaded svchost_update.exe from stardust-cdn.com.', eventType: 'execution', source: 'EDR', confidence: 'confirmed', linkedIOCIds: [], linkedNoteIds: [sampleId('note', 3)], linkedTaskIds: [sampleId('task', 2)], mitreAttackIds: ['T1059.001'], assets: ['WKSTN-042'], tags: ['malware'], starred: false, folderId: SAMPLE_FOLDER_ID, timelineId: SAMPLE_TIMELINE_ID, trashed: false, archived: false, createdAt: baseTs + 3 * HOUR, updatedAt: baseTs + 3 * HOUR,
    },
    {
      id: sampleId('event', 4), timestamp: baseTs + 3 * HOUR, title: 'C2 beacon established', description: 'svchost_update.exe began beaconing to stardust-update.com (45.77.123.45) over HTTPS every ~60s.', eventType: 'command-and-control', source: 'NGFW', confidence: 'confirmed', linkedIOCIds: [], linkedNoteIds: [sampleId('note', 4)], linkedTaskIds: [sampleId('task', 3)], mitreAttackIds: ['T1071.001'], assets: ['WKSTN-042'], tags: ['c2'], starred: true, folderId: SAMPLE_FOLDER_ID, timelineId: SAMPLE_TIMELINE_ID, trashed: false, archived: false, createdAt: baseTs + 3 * HOUR, updatedAt: baseTs + 4 * HOUR,
    },
    {
      id: sampleId('event', 5), timestamp: baseTs + 3 * HOUR + 15 * 60000, title: 'Persistence established', description: 'Registry Run key created at HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run\\SvcUpdate.', eventType: 'persistence', source: 'EDR', confidence: 'confirmed', linkedIOCIds: [], linkedNoteIds: [], linkedTaskIds: [], mitreAttackIds: ['T1547.001'], assets: ['WKSTN-042'], tags: ['malware'], starred: false, folderId: SAMPLE_FOLDER_ID, timelineId: SAMPLE_TIMELINE_ID, trashed: false, archived: false, createdAt: baseTs + 4 * HOUR, updatedAt: baseTs + 4 * HOUR,
    },
    {
      id: sampleId('event', 6), timestamp: baseTs + DAY + 4 * HOUR, title: 'Credential harvesting via Mimikatz', description: 'Mimikatz sekurlsa::logonpasswords executed on WKSTN-042. Domain admin credentials (da_admin) obtained.', eventType: 'credential-access', source: 'EDR', confidence: 'confirmed', linkedIOCIds: [], linkedNoteIds: [sampleId('note', 5)], linkedTaskIds: [], mitreAttackIds: ['T1003.001'], assets: ['WKSTN-042'], tags: ['apt-29'], starred: true, folderId: SAMPLE_FOLDER_ID, timelineId: SAMPLE_TIMELINE_ID, trashed: false, archived: false, createdAt: baseTs + DAY + 5 * HOUR, updatedAt: baseTs + DAY + 5 * HOUR,
    },
    {
      id: sampleId('event', 7), timestamp: baseTs + DAY + 6 * HOUR, title: 'Lateral movement to domain controller', description: 'RDP session from WKSTN-042 to DC01 using da_admin credentials.', eventType: 'lateral-movement', source: 'Windows Event Log', confidence: 'confirmed', linkedIOCIds: [], linkedNoteIds: [sampleId('note', 5)], linkedTaskIds: [sampleId('task', 5)], mitreAttackIds: ['T1021.001'], assets: ['WKSTN-042', 'DC01'], tags: ['apt-29'], starred: false, folderId: SAMPLE_FOLDER_ID, timelineId: SAMPLE_TIMELINE_ID, trashed: false, archived: false, createdAt: baseTs + DAY + 7 * HOUR, updatedAt: baseTs + DAY + 7 * HOUR,
    },
    {
      id: sampleId('event', 8), timestamp: baseTs + DAY + 20 * HOUR, title: 'Data staging on DC01', description: 'Files from finance share compressed to \\\\DC01\\C$\\Temp\\backup.7z (~450MB).', eventType: 'collection', source: 'File Integrity Monitoring', confidence: 'high', linkedIOCIds: [], linkedNoteIds: [sampleId('note', 6)], linkedTaskIds: [], mitreAttackIds: ['T1560.001'], assets: ['DC01', 'FS01'], tags: ['apt-29'], starred: false, folderId: SAMPLE_FOLDER_ID, timelineId: SAMPLE_TIMELINE_ID, trashed: false, archived: false, createdAt: baseTs + 2 * DAY, updatedAt: baseTs + 2 * DAY,
    },
    {
      id: sampleId('event', 9), timestamp: baseTs + 2 * DAY, title: 'Data exfiltration detected', description: '~450MB exfiltrated via HTTPS to C2 over 2 hours. Detected by anomalous outbound traffic volume.', eventType: 'exfiltration', source: 'NGFW / NetFlow', confidence: 'high', linkedIOCIds: [], linkedNoteIds: [sampleId('note', 6)], linkedTaskIds: [], mitreAttackIds: ['T1041'], assets: ['DC01'], tags: ['apt-29'], starred: true, folderId: SAMPLE_FOLDER_ID, timelineId: SAMPLE_TIMELINE_ID, trashed: false, archived: false, createdAt: baseTs + 2 * DAY + HOUR, updatedAt: baseTs + 2 * DAY + HOUR,
    },
    {
      id: sampleId('event', 10), timestamp: baseTs + 2 * DAY + 4 * HOUR, title: 'Containment initiated', description: 'WKSTN-042 and DC01 isolated from network. C2 domains/IPs blocked at firewall.', eventType: 'containment', source: 'SOC', confidence: 'confirmed', linkedIOCIds: [], linkedNoteIds: [], linkedTaskIds: [sampleId('task', 3)], mitreAttackIds: [], assets: ['WKSTN-042', 'DC01'], tags: ['remediation'], starred: false, folderId: SAMPLE_FOLDER_ID, timelineId: SAMPLE_TIMELINE_ID, trashed: false, archived: false, createdAt: baseTs + 2 * DAY + 5 * HOUR, updatedAt: baseTs + 2 * DAY + 5 * HOUR,
    },
    {
      id: sampleId('event', 11), timestamp: baseTs + 3 * DAY, title: 'Remediation started', description: 'Credential resets initiated. Endpoint scanning underway across all systems.', eventType: 'eradication', source: 'SOC', confidence: 'confirmed', linkedIOCIds: [], linkedNoteIds: [sampleId('note', 7)], linkedTaskIds: [sampleId('task', 4), sampleId('task', 8)], mitreAttackIds: [], assets: [], tags: ['remediation'], starred: false, folderId: SAMPLE_FOLDER_ID, timelineId: SAMPLE_TIMELINE_ID, trashed: false, archived: false, createdAt: baseTs + 3 * DAY, updatedAt: baseTs + 3 * DAY,
    },
    {
      id: sampleId('event', 12), timestamp: now + 7 * DAY, title: 'Post-incident review scheduled', description: 'Review meeting with SOC, IT, and management to document lessons learned.', eventType: 'recovery', source: 'SOC', confidence: 'confirmed', linkedIOCIds: [], linkedNoteIds: [], linkedTaskIds: [sampleId('task', 10)], mitreAttackIds: [], assets: [], tags: [], starred: false, folderId: SAMPLE_FOLDER_ID, timelineId: SAMPLE_TIMELINE_ID, trashed: false, archived: false, createdAt: baseTs + 4 * DAY, updatedAt: baseTs + 4 * DAY,
    },
  ];

  const standaloneIOCs: StandaloneIOC[] = [
    { id: sampleId('ioc', 1), type: 'ipv4', value: '45.77.123.45', confidence: 'confirmed', attribution: 'APT-29', analystNotes: 'Primary C2 server. Vultr VPS in Netherlands.', folderId: SAMPLE_FOLDER_ID, tags: ['c2', 'apt-29'], trashed: false, archived: false, createdAt: baseTs, updatedAt: baseTs + HOUR },
    { id: sampleId('ioc', 2), type: 'ipv4', value: '104.238.167.89', confidence: 'medium', attribution: 'APT-29', analystNotes: 'Fallback C2. Found in binary strings, not yet active.', folderId: SAMPLE_FOLDER_ID, tags: ['c2', 'apt-29'], trashed: false, archived: false, createdAt: baseTs + HOUR, updatedAt: baseTs + 2 * HOUR },
    { id: sampleId('ioc', 3), type: 'domain', value: 'stardust-update.com', confidence: 'confirmed', attribution: 'APT-29', analystNotes: 'Primary C2 domain.', folderId: SAMPLE_FOLDER_ID, tags: ['c2', 'apt-29'], trashed: false, archived: false, createdAt: baseTs, updatedAt: baseTs + HOUR },
    { id: sampleId('ioc', 4), type: 'domain', value: 'stardust-cdn.com', confidence: 'high', attribution: 'APT-29', analystNotes: 'Payload hosting domain.', folderId: SAMPLE_FOLDER_ID, tags: ['apt-29', 'malware'], trashed: false, archived: false, createdAt: baseTs, updatedAt: baseTs },
    { id: sampleId('ioc', 5), type: 'domain', value: 'stardust-sync.net', confidence: 'medium', attribution: 'APT-29', analystNotes: 'Fallback C2 domain. Not yet observed in live traffic.', folderId: SAMPLE_FOLDER_ID, tags: ['c2', 'apt-29'], trashed: false, archived: false, createdAt: baseTs + HOUR, updatedAt: baseTs + 2 * HOUR },
    { id: sampleId('ioc', 6), type: 'domain', value: 'stardust-portal.com', confidence: 'confirmed', analystNotes: 'Phishing sender domain. Spoofed internal HR.', folderId: SAMPLE_FOLDER_ID, tags: ['phishing'], trashed: false, archived: false, createdAt: baseTs, updatedAt: baseTs },
    { id: sampleId('ioc', 7), type: 'sha256', value: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2', confidence: 'confirmed', analystNotes: 'Dropper: Q4_Compensation_Review.xlsm', folderId: SAMPLE_FOLDER_ID, tags: ['malware'], trashed: false, archived: false, createdAt: baseTs + HOUR, updatedAt: baseTs + 2 * HOUR },
    { id: sampleId('ioc', 8), type: 'sha256', value: 'b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3', confidence: 'confirmed', attribution: 'APT-29', analystNotes: 'Payload: svchost_update.exe', folderId: SAMPLE_FOLDER_ID, tags: ['malware', 'apt-29'], trashed: false, archived: false, createdAt: baseTs + 2 * HOUR, updatedAt: baseTs + 3 * HOUR },
    { id: sampleId('ioc', 9), type: 'md5', value: 'd4e5f6a1b2c3d4e5f6a1b2c3', confidence: 'confirmed', analystNotes: 'MD5 of dropper xlsm', folderId: SAMPLE_FOLDER_ID, tags: ['malware'], trashed: false, archived: false, createdAt: baseTs + 2 * HOUR, updatedAt: baseTs + 2 * HOUR },
    { id: sampleId('ioc', 10), type: 'url', value: 'https://stardust-cdn.com/update.exe', confidence: 'high', attribution: 'APT-29', analystNotes: 'Payload download URL triggered by VBA macro.', folderId: SAMPLE_FOLDER_ID, tags: ['malware', 'apt-29'], trashed: false, archived: false, createdAt: baseTs + HOUR, updatedAt: baseTs + 2 * HOUR },
    { id: sampleId('ioc', 11), type: 'email', value: 'hr-updates@stardust-portal.com', confidence: 'confirmed', analystNotes: 'Phishing sender address.', folderId: SAMPLE_FOLDER_ID, tags: ['phishing'], trashed: false, archived: false, createdAt: baseTs, updatedAt: baseTs },
    { id: sampleId('ioc', 12), type: 'cve', value: 'CVE-2024-21413', confidence: 'medium', analystNotes: 'Outlook vulnerability exploited for initial execution (under investigation).', folderId: SAMPLE_FOLDER_ID, tags: ['apt-29'], trashed: false, archived: false, createdAt: baseTs + DAY, updatedAt: baseTs + DAY },
    { id: sampleId('ioc', 13), type: 'mitre-attack', value: 'T1566.001', confidence: 'confirmed', analystNotes: 'Spear-phishing Attachment', folderId: SAMPLE_FOLDER_ID, tags: ['apt-29'], trashed: false, archived: false, createdAt: baseTs, updatedAt: baseTs },
    { id: sampleId('ioc', 14), type: 'mitre-attack', value: 'T1059.001', confidence: 'confirmed', analystNotes: 'PowerShell used for payload download', folderId: SAMPLE_FOLDER_ID, tags: ['apt-29'], trashed: false, archived: false, createdAt: baseTs + 2 * HOUR, updatedAt: baseTs + 2 * HOUR },
    { id: sampleId('ioc', 15), type: 'file-path', value: '%TEMP%\\svchost_update.exe', confidence: 'confirmed', analystNotes: 'Payload drop location on victim workstation.', folderId: SAMPLE_FOLDER_ID, tags: ['malware'], trashed: false, archived: false, createdAt: baseTs + 2 * HOUR, updatedAt: baseTs + 2 * HOUR },
  ];

  // Simple whiteboard with a JSON representation of an attack flow diagram
  const whiteboardElements = JSON.stringify([
    { type: 'rectangle', id: 'wb-el-1', x: 50, y: 200, width: 160, height: 60, strokeColor: '#ef4444', backgroundColor: '#ef444422', fillStyle: 'solid', label: { text: 'Phishing Email' } },
    { type: 'rectangle', id: 'wb-el-2', x: 280, y: 200, width: 160, height: 60, strokeColor: '#f97316', backgroundColor: '#f9731622', fillStyle: 'solid', label: { text: 'Macro Execution' } },
    { type: 'rectangle', id: 'wb-el-3', x: 510, y: 200, width: 160, height: 60, strokeColor: '#3b82f6', backgroundColor: '#3b82f622', fillStyle: 'solid', label: { text: 'C2 Established' } },
    { type: 'rectangle', id: 'wb-el-4', x: 510, y: 340, width: 160, height: 60, strokeColor: '#a855f7', backgroundColor: '#a855f722', fillStyle: 'solid', label: { text: 'Credential Theft' } },
    { type: 'rectangle', id: 'wb-el-5', x: 280, y: 340, width: 160, height: 60, strokeColor: '#06b6d4', backgroundColor: '#06b6d422', fillStyle: 'solid', label: { text: 'Lateral Movement' } },
    { type: 'rectangle', id: 'wb-el-6', x: 50, y: 340, width: 160, height: 60, strokeColor: '#ef4444', backgroundColor: '#ef444422', fillStyle: 'solid', label: { text: 'Data Exfiltration' } },
  ]);

  const whiteboard: Whiteboard = {
    id: sampleId('whiteboard', 1),
    name: 'STARDUST Attack Flow',
    elements: whiteboardElements,
    folderId: SAMPLE_FOLDER_ID,
    tags: ['apt-29'],
    order: 1,
    trashed: false,
    archived: false,
    createdAt: baseTs + 2 * DAY,
    updatedAt: baseTs + 3 * DAY,
  };

  return { folder, notes, tasks, timelineEvents, timeline, standaloneIOCs, whiteboard, tags };
}
