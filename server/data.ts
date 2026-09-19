import fs from 'fs';
import path from 'path';
import { Notice, User, Department, AuditEntry, ParentUser } from '../src/types';

const DATA_DIR = path.join(process.cwd(), 'data');
const NOTICES_FILE = path.join(DATA_DIR, 'notices.json');
const AUDIT_FILE = path.join(DATA_DIR, 'audit.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export const INITIAL_DEPARTMENTS: Department[] = [
  { id: 'acad', name: 'Academic Affairs', code: 'ACAD', color: '#2563EB', icon: 'GraduationCap', contactEmail: 'dean.acad@amka.edu' },
  { id: 'exam', name: 'Examination Office', code: 'EXAM', color: '#DC2626', icon: 'FileText', contactEmail: 'controller.exam@amka.edu' },
  { id: 'reg', name: 'Registrar & Administration', code: 'REG', color: '#4F46E5', icon: 'Building2', contactEmail: 'registrar@amka.edu' },
  { id: 'stud', name: 'Student Affairs & Welfare', code: 'STUD', color: '#059669', icon: 'Users', contactEmail: 'student.affairs@amka.edu' },
  { id: 'place', name: 'Training & Placements', code: 'TPO', color: '#D97706', icon: 'Briefcase', contactEmail: 'placements@amka.edu' },
  { id: 'est', name: 'Estate & Facilities', code: 'EST', color: '#7C3AED', icon: 'Wrench', contactEmail: 'estates@amka.edu' },
  { id: 'lib', name: 'Central University Library', code: 'LIB', color: '#0891B2', icon: 'BookOpen', contactEmail: 'library@amka.edu' },
  { id: 'health', name: 'Campus Health & Safety', code: 'HSE', color: '#E11D48', icon: 'HeartPulse', contactEmail: 'healthcenter@amka.edu' },
];

export const DEMO_USERS: User[] = [
  {
    id: 'usr_super',
    name: 'Dr. Alistair Vance',
    email: 'registrar@amka.edu',
    role: 'super_admin',
    department: 'Registrar & Administration',
    designation: 'Chief Registrar & Provost',
    token: 'token_super_admin_amka',
  },
  {
    id: 'usr_acad',
    name: 'Prof. Meera Sen',
    email: 'dean.acad@amka.edu',
    role: 'department_head',
    department: 'Academic Affairs',
    designation: 'Dean of Academic Affairs',
    token: 'token_dept_head_amka',
  },
  {
    id: 'usr_exam',
    name: 'Dr. Kevin O’Connor',
    email: 'controller.exam@amka.edu',
    role: 'staff_officer',
    department: 'Examination Office',
    designation: 'Assistant Controller of Examinations',
    token: 'token_staff_officer_amka',
  },
  {
    id: 'usr_place',
    name: 'Anita Roy',
    email: 'placements@amka.edu',
    role: 'staff_officer',
    department: 'Training & Placements',
    designation: 'Placement Officer',
    token: 'token_staff_place_amka',
  },
];

// Minimal valid sample PDF Data URI for testing real in-app PDF preview
const SAMPLE_CIRCULAR_PDF_DATA_URI =
  'data:application/pdf;base64,JVBERi0xLjQKJeLjz9MKMSAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwovUGFnZXMgMiAwIFIKPj4KZW5kb2JqCjIgMCBvYmoKPDwKL1R5cGUgL1BhZ2VzCi9LaWRzIFszIDAgUl0KL0NvdW50IDEKPj4KZW5kb2JqCjMgMCBvYmoKPDwKL1R5cGUgL1BhZ2UKL1BhcmVudCAyIDAgUgovTWVkaWFCb3ggWzAgMCA2MTIgNzkyXQovQ29udGVudHMgNCAwIFIKL1Jlc291cmNlcwogPDwKICAvRm9udCA8PCAvRjEgNSAwIFIgPj4KID4+Cj4+CmVuZG9iago0IDAgb2JqCjw8Ci9MZW5ndGggMTM4Cj4+CnN0cmVhbQpCVAovRjEgMTggVGYKNTAgNzMwIFRECihtYW5kYXRvcnkgSW5zdGl0dXRpb25hbCBDaXJjdWxhciAtIEFNS0EgUGxhdGZvcm0pIFRqCjAgLTI1IFRECi9GMSAxMiBUZgooT2ZmaWNpYWwgT3JkZXI6IFNwcmluZyAyMDI2IEV4YW1pbmF0aW9ucyAmIEFjYWRlbWljIFBsYW5uaW5nKSBUagpFVAplbmRzdHJlYW0KZW5kb2JqCjUgMCBvYmoKPDwKL1R5cGUgL1ZvbnQKL1N1YnR5cGUgL1R5cGUxCi9CYXNlRm9udCAvSGVsdmV0aWNhCj4+CmVuZG9iagp4cmVmCjAgNgowMDAwMDAwMDAwIDY1NTM1IGYgCjAwMDAwMDAwMTUgMDAwMDAgbiAKMDAwMDAwMDA2OCAwMDAwMCBuIAowMDAwMDAwMTI1IDAwMDAwIG4gCjAwMDAwMDAyNjAgMDAwMDAgbiAKMDAwMDAwMDQ1MCAwMDAwMCBuIAp0cmFpbGVyCjw8Ci9TaXplIDYKL1Jvb3QgMSAwIFIKPj4Kc3RhcnR4cmVmCjUyMQolJUVPRg==';

const SAMPLE_IMAGE_DATA_URI =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450"><rect width="800" height="450" fill="%231e293b"/><text x="50%25" y="42%25" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-weight="bold" font-size="28" fill="%23f8fafc">AMKA CAMPUS NOTICE BOARD</text><text x="50%25" y="55%25" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="18" fill="%2394a3b8">Official Institutional Document &amp; Visual Exhibit</text><line x1="250" y1="280" x2="550" y2="280" stroke="%233b82f6" stroke-width="3"/></svg>';

export const INITIAL_NOTICES: Notice[] = [
  {
    id: 'not_001',
    referenceNumber: 'AMKA/EXAM/2026/089',
    title: 'Final Examination Timetable & Admit Card Issuance (Spring 2026)',
    content: `### Controller of Examinations - Official Notification

All registered undergraduate and postgraduate candidates are hereby informed that the **End-Semester Examination (Spring 2026)** will commence on **October 5, 2026**.

#### Mandatory Protocol:
1. **Hall Tickets / Admit Cards**: Digital admit cards will be accessible via the student ERP portal starting **September 25, 2026**.
2. **Identification**: Physical Institutional Smart Cards (RFID IDs) are strictly mandatory at the entrance of the Examination Halls.
3. **Prohibited Items**: Smartwatches, programmable scientific calculators, cell phones, and non-transparent stationery pouches are strictly barred inside the Examination Blocks (Block C & Block D).
4. **Reporting Time**: Students must occupy their allocated examination desks at least **20 minutes before** the bell.

Please inspect the attached circular PDF for the detailed course-code breakdown and floor matrix.`,
    summary: 'Spring 2026 End-Semester Examinations commence Oct 5. Admit cards available Sept 25. Strict ID card checks and electronics ban enforced.',
    department: 'Examination Office',
    category: 'Examinations',
    tags: ['Exams', 'Spring 2026', 'Admit Cards', 'Schedules'],
    urgency: 'urgent',
    status: 'published',
    isPinned: true,
    targetAudience: ['Undergraduates', 'Postgraduates', 'Faculty'],
    author: {
      id: 'usr_exam',
      name: 'Dr. Kevin O’Connor',
      designation: 'Assistant Controller of Examinations',
      department: 'Examination Office',
      email: 'controller.exam@amka.edu',
    },
    attachments: [
      {
        id: 'att_exam_pdf',
        name: 'Spring-2026-Final-Exam-Schedule.pdf',
        type: 'pdf',
        mimeType: 'application/pdf',
        size: 245760,
        url: SAMPLE_CIRCULAR_PDF_DATA_URI,
        uploadedAt: '2026-09-18T09:00:00.000Z',
      },
    ],
    publishDate: '2026-09-18T08:30:00.000Z',
    expiryDate: '2026-10-30T23:59:59.000Z',
    viewsCount: 1420,
    acknowledgementsCount: 312,
    createdAt: '2026-09-18T08:30:00.000Z',
    updatedAt: '2026-09-18T08:30:00.000Z',
  },
  {
    id: 'not_002',
    referenceNumber: 'AMKA/EST/2026/041',
    title: 'Emergency Power Grid Maintenance – Engineering & Science Blocks',
    content: `### Campus Facilities & Estate Directorate

Notice is hereby served to all department deans, research scholars, and laboratory supervisors:

Scheduled high-voltage transformer substation diagnostics will take place this **Saturday, September 20, 2026**, between **06:00 AM and 12:30 PM**.

- **Impacted Zones**: Science Complex (Buildings 1–3), Mechanical Workshops, and the Central High-Performance Computing Cluster.
- **Critical Computing Protocol**: HPC Cluster operators must gracefully hibernate compute jobs before **05:00 AM**.
- **Generator Backup**: Emergency backup diesel generator supplies will maintain essential environmental chambers and cryogenic freezers.

Contact the 24/7 Estate Control Room at ext. 4400 for emergency assistance.`,
    summary: 'Emergency transformer maintenance on Saturday Sept 20 from 06:00 to 12:30. Science & Engineering blocks will run on emergency generator only.',
    department: 'Estate & Facilities',
    category: 'Maintenance',
    tags: ['Power Outage', 'Maintenance', 'HPC Cluster', 'Facilities'],
    urgency: 'urgent',
    status: 'published',
    isPinned: true,
    targetAudience: ['Faculty', 'Staff', 'Researchers', 'All Students'],
    author: {
      id: 'usr_super',
      name: 'Dr. Alistair Vance',
      designation: 'Chief Registrar & Provost',
      department: 'Registrar & Administration',
      email: 'registrar@amka.edu',
    },
    attachments: [],
    publishDate: '2026-09-19T06:00:00.000Z',
    expiryDate: '2026-09-22T00:00:00.000Z',
    viewsCount: 884,
    acknowledgementsCount: 94,
    createdAt: '2026-09-19T06:00:00.000Z',
    updatedAt: '2026-09-19T06:00:00.000Z',
  },
  {
    id: 'not_003',
    referenceNumber: 'AMKA/TPO/2026/112',
    title: 'Annual Campus Placement Drive 2026-27: Tier-1 Technology Firms',
    content: `### Training & Corporate Relations Cell

Registration for the first wave of campus recruitment for graduating batches (Class of 2027) is now active.

#### Participating Partners in Wave 1:
- Cloud & AI Engineering firms
- Quantitative Research & Financial Analytics
- Autonomous Systems & Robotics

#### Eligibility Criteria:
- Minimum cumulative GPA of 7.5 or equivalent.
- No active backlogs or academic discipline probations.

**Deadlines**: Student profiles must be validated in the Placement Portal by **September 28, 2026, 17:00 IST**. Pre-placement talks will be hosted in Auditorium B and streamed simultaneously.`,
    summary: 'Wave 1 Campus Recruitment for Class of 2027 active. Minimum 7.5 CGPA required. Resume and profile submission deadline is Sept 28.',
    department: 'Training & Placements',
    category: 'Placements',
    tags: ['Careers', 'Placements', 'Class of 2027', 'Interviews'],
    urgency: 'normal',
    status: 'published',
    isPinned: false,
    targetAudience: ['Undergraduates', 'Postgraduates'],
    author: {
      id: 'usr_place',
      name: 'Anita Roy',
      designation: 'Placement Officer',
      department: 'Training & Placements',
      email: 'placements@amka.edu',
    },
    attachments: [
      {
        id: 'att_place_img',
        name: 'Placement-Drive-Wave1-Flyer.svg',
        type: 'image',
        mimeType: 'image/svg+xml',
        size: 18432,
        url: SAMPLE_IMAGE_DATA_URI,
        uploadedAt: '2026-09-17T11:20:00.000Z',
      },
    ],
    publishDate: '2026-09-17T10:00:00.000Z',
    expiryDate: '2026-10-15T23:59:59.000Z',
    viewsCount: 2310,
    acknowledgementsCount: 450,
    createdAt: '2026-09-17T10:00:00.000Z',
    updatedAt: '2026-09-17T10:00:00.000Z',
  },
  {
    id: 'not_004',
    referenceNumber: 'AMKA/ACAD/2026/033',
    title: 'Interdisciplinary Undergraduate Research Fellowship (IURF) Grants',
    content: `### Office of the Dean (Academic Affairs)

Applications are invited for the **Autumn 2026 cycle of the IURF Program**. 

The grant provides up to **$5,000 per project** for undergraduate scholars collaborating across at least two distinct schools (e.g., Computer Science and Biological Sciences, or Mechanical Design and Urban Architecture).

#### Key Dates:
- **Proposal Submission Deadline**: October 12, 2026
- **Faculty Endorsement**: October 18, 2026
- **Grant Award Notification**: November 1, 2026

Guidelines for submission and budget justification templates can be retrieved through the central academic repository.`,
    summary: 'IURF grants of up to $5,000 open for cross-disciplinary undergraduate research projects. Application deadline is October 12, 2026.',
    department: 'Academic Affairs',
    category: 'Research',
    tags: ['Research', 'Grants', 'Undergraduate', 'Fellowships'],
    urgency: 'info',
    status: 'published',
    isPinned: false,
    targetAudience: ['Undergraduates', 'Faculty'],
    author: {
      id: 'usr_acad',
      name: 'Prof. Meera Sen',
      designation: 'Dean of Academic Affairs',
      department: 'Academic Affairs',
      email: 'dean.acad@amka.edu',
    },
    attachments: [],
    publishDate: '2026-09-16T14:15:00.000Z',
    expiryDate: '2026-10-20T23:59:59.000Z',
    viewsCount: 740,
    acknowledgementsCount: 88,
    createdAt: '2026-09-16T14:15:00.000Z',
    updatedAt: '2026-09-16T14:15:00.000Z',
  },
  {
    id: 'not_005',
    referenceNumber: 'AMKA/LIB/2026/019',
    title: '24/7 Extended Library Hours & IEEE / ACM Digital Library Renewal',
    content: `### Central University Library

In anticipation of midterm reviews and upcoming thesis submissions:

1. **Extended Reading Rooms**: The East Wing study chambers and Quiet Pods will operate **24 hours a day, 7 days a week** effective Monday, September 22.
2. **Institutional Digital Pass**: Subscriptions for IEEE Xplore, ACM Digital Library, and Nature Journals have been renewed for the academic year 2026-27. Campus VPN is required when accessing remotely.
3. **Book Return Grace Period**: Fines for standard circulation books are waived until the end of September.`,
    summary: 'Central Library East Wing open 24/7 starting Sept 22. IEEE, ACM, Nature digital access refreshed. Book overdue fines waived for September.',
    department: 'Central University Library',
    category: 'Library',
    tags: ['Library', '24x7 Study', 'Journals', 'Digital Access'],
    urgency: 'info',
    status: 'published',
    isPinned: false,
    targetAudience: ['All Students', 'Faculty', 'Researchers'],
    author: {
      id: 'usr_super',
      name: 'Dr. Alistair Vance',
      designation: 'Chief Registrar & Provost',
      department: 'Registrar & Administration',
      email: 'registrar@amka.edu',
    },
    attachments: [],
    publishDate: '2026-09-15T12:00:00.000Z',
    expiryDate: '2026-10-31T23:59:59.000Z',
    viewsCount: 960,
    acknowledgementsCount: 160,
    createdAt: '2026-09-15T12:00:00.000Z',
    updatedAt: '2026-09-15T12:00:00.000Z',
  },
  {
    id: 'not_006',
    referenceNumber: 'AMKA/HSE/2026/012',
    title: 'Campus Seasonal Health Advisory & Free Influenza Vaccination Drive',
    content: `### Campus Health Center & Safety Directorate

A complimentary seasonal influenza vaccination camp will be conducted at the Student Wellness Pavilion on **Wednesday, September 24, from 09:00 to 17:00**.

- **Who should attend**: All residential students, dining hall staff, faculty, and administrative personnel.
- **Bring with you**: Campus ID card and health history record if any pre-existing allergies exist.
- **Sanitization & Hygiene**: Hands-free sanitization stations have been replenished across all lecture hall complexes.`,
    summary: 'Free seasonal flu vaccination camp at Wellness Pavilion on Sept 24, 09:00 - 17:00. Open to all students, staff, and faculty.',
    department: 'Campus Health & Safety',
    category: 'Health',
    tags: ['Wellness', 'Vaccination', 'Health Advisory', 'Clinic'],
    urgency: 'normal',
    status: 'published',
    isPinned: false,
    targetAudience: ['All Students', 'Faculty', 'Staff'],
    author: {
      id: 'usr_super',
      name: 'Dr. Alistair Vance',
      designation: 'Chief Registrar & Provost',
      department: 'Registrar & Administration',
      email: 'registrar@amka.edu',
    },
    attachments: [],
    publishDate: '2026-09-14T09:30:00.000Z',
    expiryDate: '2026-09-26T23:59:59.000Z',
    viewsCount: 650,
    acknowledgementsCount: 75,
    createdAt: '2026-09-14T09:30:00.000Z',
    updatedAt: '2026-09-14T09:30:00.000Z',
  },
];

export const INITIAL_AUDIT_LOGS: AuditEntry[] = [
  {
    id: 'aud_001',
    noticeId: 'not_001',
    noticeTitle: 'Final Examination Timetable & Admit Card Issuance (Spring 2026)',
    action: 'create',
    performedBy: 'Dr. Kevin O’Connor',
    role: 'staff_officer',
    timestamp: '2026-09-18T08:30:00.000Z',
    details: 'Initial publication with official PDF circular attached',
  },
  {
    id: 'aud_002',
    noticeId: 'not_001',
    noticeTitle: 'Final Examination Timetable & Admit Card Issuance (Spring 2026)',
    action: 'pin',
    performedBy: 'Dr. Kevin O’Connor',
    role: 'staff_officer',
    timestamp: '2026-09-18T08:35:00.000Z',
    details: 'Pinned notice to priority campus bulletin',
  },
  {
    id: 'aud_003',
    noticeId: 'not_002',
    noticeTitle: 'Emergency Power Grid Maintenance – Engineering & Science Blocks',
    action: 'create',
    performedBy: 'Dr. Alistair Vance',
    role: 'super_admin',
    timestamp: '2026-09-19T06:00:00.000Z',
    details: 'Urgent institutional facilities notice broadcast',
  },
  {
    id: 'aud_004',
    noticeId: 'not_002',
    noticeTitle: 'Emergency Power Grid Maintenance – Engineering & Science Blocks',
    action: 'pin',
    performedBy: 'Dr. Alistair Vance',
    role: 'super_admin',
    timestamp: '2026-09-19T06:02:00.000Z',
    details: 'Emergency pin activated for campus kiosk display ticker',
  },
];

export const INITIAL_PARENTS: ParentUser[] = [
  {
    id: 'parent_001',
    name: 'Mrs. Elena Rostova',
    email: 'elena.rostova@gmail.com',
    phone: '+1 (555) 234-8901',
    studentRollNo: 'AMKA-2024-CS-042',
    studentName: 'Alex Rostova',
    relationship: 'Mother',
    department: 'Academic Affairs',
    status: 'approved',
    registeredAt: '2026-09-15T10:00:00.000Z',
    approvedAt: '2026-09-15T14:30:00.000Z',
    approvedBy: 'Dr. Alistair Vance (Registrar)',
    token: 'token_parent_elena_001',
  },
  {
    id: 'parent_002',
    name: 'Mr. David K. Chen',
    email: 'david.chen.fam@outlook.com',
    phone: '+1 (555) 871-3320',
    studentRollNo: 'AMKA-2025-ENG-118',
    studentName: 'Marcus Chen',
    relationship: 'Father',
    department: 'Academic Affairs',
    status: 'pending',
    registeredAt: '2026-09-19T02:15:00.000Z',
    token: 'token_parent_david_002',
  },
  {
    id: 'parent_003',
    name: 'Sarah M. Jenkins',
    email: 'sjenkins.legal@westnet.org',
    phone: '+1 (555) 440-1922',
    studentRollNo: 'AMKA-2024-BIO-077',
    studentName: 'Chloe Jenkins',
    relationship: 'Guardian',
    department: 'Student Affairs & Welfare',
    status: 'pending',
    registeredAt: '2026-09-19T04:40:00.000Z',
    token: 'token_parent_sarah_003',
  },
];

