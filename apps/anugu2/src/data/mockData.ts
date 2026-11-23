import {
  User,
  Parcel,
  LandApplication,
  BlockchainBlock,
  BlockchainTransaction,
  SurveyJob,
  CommunityAttestation,
  RevocationRecord,
  AuditLog,
  SystemNotification
} from '../types';

export const INITIAL_USERS: Record<string, User> = {
  citizen: {
    id: 'usr-cit-001',
    name: 'Chief Emeka Adeleke',
    email: 'emeka.adeleke@cadastre.anagu.org',
    role: 'citizen',
    nationalId: 'NIN-7749-2810-9421',
    walletAddress: '0x71C...B8e9',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
    verified: true,
    phone: '+234 803 555 0192',
    address: 'Plot 14, Victoria Island Extension, Lagos'
  },
  surveyor: {
    id: 'usr-srv-002',
    name: 'Surv. Amina Bello, FNIS',
    email: 'amina.bello@surv.anagu.gov',
    role: 'surveyor',
    nationalId: 'NIN-8821-3940-1102',
    walletAddress: '0x32A...F41d',
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&q=80',
    licenseNumber: 'SURV-REG-2014-0492',
    organization: 'Bello Cadastral Geomatics Ltd.',
    verified: true,
    phone: '+234 802 771 9920'
  },
  registrar: {
    id: 'usr-reg-003',
    name: 'Barr. Folake Adebayo',
    email: 'folake.adebayo@deeds.anagu.gov',
    role: 'registrar',
    nationalId: 'NIN-4491-1029-7733',
    walletAddress: '0x9E5...7c22',
    avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=150&q=80',
    organization: 'State Bureau of Lands & Title Deeds',
    verified: true,
    phone: '+234 809 332 4410'
  },
  admin: {
    id: 'usr-adm-004',
    name: 'Engr. David K. Okon',
    email: 'david.okon@lands.anagu.gov',
    role: 'admin',
    nationalId: 'NIN-1920-4820-5591',
    walletAddress: '0x44B...1890',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
    organization: 'Federal Ministry of Housing and Urban Development',
    verified: true
  },
  governor: {
    id: 'usr-gov-005',
    name: 'His Excellency Dr. B. A. Al-Hassan',
    email: 'executive.chamber@state.anagu.gov',
    role: 'governor',
    nationalId: 'NIN-0001-9928-1120',
    walletAddress: '0x1A0...0001',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80',
    organization: 'Executive Governor, State Government House',
    verified: true
  },
  sysadmin: {
    id: 'usr-sys-006',
    name: 'Kariuki M. Mwangi',
    email: 'sysadmin.cluster@infra.anagu.org',
    role: 'sysadmin',
    nationalId: 'NIN-6629-9182-3810',
    walletAddress: '0x00F...EE81',
    avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=150&q=80',
    organization: 'ANAGU Protocol Core Infrastructure',
    verified: true
  }
};

export const INITIAL_PARCELS: Parcel[] = [
  {
    id: 'pcl-001',
    titleNumber: 'C-OF-O-2026-004912',
    tokenHash: '0x8f2a41d99b031ce7b99c89e4726b12a873e4912a',
    ownerName: 'Chief Emeka Adeleke',
    ownerId: 'usr-cit-001',
    ownerNationalId: 'NIN-7749-2810-9421',
    state: 'Lagos',
    lga: 'Eti-Osa',
    district: 'Lekki Phase 1',
    landUse: 'Residential',
    sizeSqm: 1250,
    sizeHectares: 0.125,
    status: 'verified',
    dateRegistered: '2026-02-14',
    coordinates: [
      { id: 'bp-1', beaconNumber: 'SC/ET/091', lat: 6.4382, lng: 3.4715, easting: 552120, northing: 711940 },
      { id: 'bp-2', beaconNumber: 'SC/ET/092', lat: 6.4389, lng: 3.4721, easting: 552185, northing: 712015 },
      { id: 'bp-3', beaconNumber: 'SC/ET/093', lat: 6.4384, lng: 3.4728, easting: 552260, northing: 711960 },
      { id: 'bp-4', beaconNumber: 'SC/ET/094', lat: 6.4377, lng: 3.4722, easting: 552195, northing: 711885 }
    ],
    surveyPlanNumber: 'LA/SRV/2026/0149',
    surveyorName: 'Surv. Amina Bello, FNIS',
    marketValuation: 285000000,
    encumbrances: [],
    ipfsDocumentHash: 'QmZtmD2qt8S991eZg9z48v9324hfkz924jfe949',
    certificateIssued: true,
    blockNumber: 1849204
  },
  {
    id: 'pcl-002',
    titleNumber: 'C-OF-O-2025-009184',
    tokenHash: '0x3c9902a1b9472ef9104081c79012384918ef9104',
    ownerName: 'Chief Emeka Adeleke',
    ownerId: 'usr-cit-001',
    ownerNationalId: 'NIN-7749-2810-9421',
    state: 'Ogun',
    lga: 'Obafemi Owode',
    district: 'Mowe Industrial Corridor',
    landUse: 'Industrial',
    sizeSqm: 8500,
    sizeHectares: 0.85,
    status: 'verified',
    dateRegistered: '2025-11-20',
    coordinates: [
      { id: 'bp-11', beaconNumber: 'OG/MW/401', lat: 6.8124, lng: 3.4419, easting: 548760, northing: 753190 },
      { id: 'bp-12', beaconNumber: 'OG/MW/402', lat: 6.8138, lng: 3.4435, easting: 548940, northing: 753340 },
      { id: 'bp-13', beaconNumber: 'OG/MW/403', lat: 6.8120, lng: 3.4449, easting: 549090, northing: 753140 },
      { id: 'bp-14', beaconNumber: 'OG/MW/404', lat: 6.8105, lng: 3.4431, easting: 548900, northing: 752980 }
    ],
    surveyPlanNumber: 'OG/SRV/2025/8920',
    surveyorName: 'Surv. K. O. Alao',
    marketValuation: 410000000,
    encumbrances: ['Statutory Setback 15m to Expressway Buffer'],
    ipfsDocumentHash: 'QmX927490fhekslks02941094hjfkslz99021',
    certificateIssued: true,
    blockNumber: 1729104
  },
  {
    id: 'pcl-003',
    titleNumber: 'APP-PEND-2026-1192',
    tokenHash: '0x10fa982a74c104278104812a41d99b031ce7b99c',
    ownerName: 'Chief Emeka Adeleke',
    ownerId: 'usr-cit-001',
    ownerNationalId: 'NIN-7749-2810-9421',
    state: 'FCT Abuja',
    lga: 'Municipal',
    district: 'Maitama Extension',
    landUse: 'Mixed Use',
    sizeSqm: 3200,
    sizeHectares: 0.32,
    status: 'community_review',
    dateRegistered: '2026-03-01',
    coordinates: [
      { id: 'bp-21', beaconNumber: 'ABJ/MT/109', lat: 9.0882, lng: 7.5020, easting: 335120, northing: 1004890 },
      { id: 'bp-22', beaconNumber: 'ABJ/MT/110', lat: 9.0891, lng: 7.5028, easting: 335210, northing: 1004990 },
      { id: 'bp-23', beaconNumber: 'ABJ/MT/111', lat: 9.0886, lng: 7.5039, easting: 335330, northing: 1004940 },
      { id: 'bp-24', beaconNumber: 'ABJ/MT/112', lat: 9.0877, lng: 7.5031, easting: 335240, northing: 1004840 }
    ],
    surveyPlanNumber: 'FCT/CAD/2026/0049',
    surveyorName: 'Surv. Amina Bello, FNIS',
    marketValuation: 750000000,
    encumbrances: [],
    disputeNotes: 'Notice period active until March 28, 2026. 3 neighbor confirmations logged.',
    ipfsDocumentHash: 'QmY948100fhdkeal10820412hfksskd',
    certificateIssued: false,
    blockNumber: 1861002
  },
  {
    id: 'pcl-004',
    titleNumber: 'C-OF-O-2024-001189',
    tokenHash: '0x99248f2a1b9472ef9104081c79012384918ef910',
    ownerName: 'Greenfield Agro Allied Ltd.',
    ownerId: 'usr-cor-099',
    ownerNationalId: 'RC-1049281',
    state: 'Kaduna',
    lga: 'Chikun',
    district: 'Kujama Agri-Hub',
    landUse: 'Agricultural',
    sizeSqm: 45000,
    sizeHectares: 4.5,
    status: 'verified',
    dateRegistered: '2024-06-18',
    coordinates: [
      { id: 'bp-31', beaconNumber: 'KD/CH/701', lat: 10.4501, lng: 7.4201 },
      { id: 'bp-32', beaconNumber: 'KD/CH/702', lat: 10.4530, lng: 7.4240 },
      { id: 'bp-33', beaconNumber: 'KD/CH/703', lat: 10.4490, lng: 7.4280 },
      { id: 'bp-34', beaconNumber: 'KD/CH/704', lat: 10.4465, lng: 7.4230 }
    ],
    surveyPlanNumber: 'KD/SRV/2024/0712',
    surveyorName: 'Surv. Ibrahim Sani',
    marketValuation: 180000000,
    encumbrances: [],
    ipfsDocumentHash: 'QmP934981fkdsakdl10294109401kfsd',
    certificateIssued: true,
    blockNumber: 1492019
  },
  {
    id: 'pcl-005',
    titleNumber: 'REV-ORD-2026-00041',
    tokenHash: '0x000000000000000000000000000000000000DEAD',
    ownerName: 'Vanguard Realty Consortium',
    ownerId: 'usr-cor-044',
    ownerNationalId: 'RC-994821',
    state: 'Lagos',
    lga: 'Ibeju-Lekki',
    district: 'Coastal Highway Corridor',
    landUse: 'Commercial',
    sizeSqm: 18000,
    sizeHectares: 1.8,
    status: 'revoked',
    dateRegistered: '2023-08-11',
    coordinates: [
      { id: 'bp-41', beaconNumber: 'LA/IB/901', lat: 6.4710, lng: 3.8210 },
      { id: 'bp-42', beaconNumber: 'LA/IB/902', lat: 6.4740, lng: 3.8250 },
      { id: 'bp-43', beaconNumber: 'LA/IB/903', lat: 6.4700, lng: 3.8290 },
      { id: 'bp-44', beaconNumber: 'LA/IB/904', lat: 6.4670, lng: 3.8240 }
    ],
    surveyPlanNumber: 'LA/SRV/2023/1182',
    surveyorName: 'Surv. T. E. Johnson',
    marketValuation: 620000000,
    encumbrances: ['Statutory Revocation Order No. LGS/EX/2026/04'],
    disputeNotes: 'Acquired for Coastal Railway Right-of-Way. Compensation assessment published.',
    ipfsDocumentHash: 'QmDead0000000000000000000000000000000',
    certificateIssued: false,
    blockNumber: 1859011
  }
];

export const INITIAL_APPLICATIONS: LandApplication[] = [
  {
    id: 'app-001',
    applicationNumber: 'ANAGU-APP-2026-8819',
    applicantName: 'Chief Emeka Adeleke',
    applicantId: 'usr-cit-001',
    applicantPhone: '+234 803 555 0192',
    applicantEmail: 'emeka.adeleke@cadastre.anagu.org',
    state: 'FCT Abuja',
    lga: 'Municipal',
    district: 'Maitama Extension',
    landUse: 'Mixed Use',
    estimatedAreaSqm: 3200,
    status: 'community_attestation',
    dateSubmitted: '2026-03-01',
    lastUpdated: '2026-03-10',
    assignedSurveyor: 'Surv. Amina Bello, FNIS',
    surveyReportDate: '2026-03-05',
    attestationsCount: 3,
    requiredAttestations: 4,
    notes: 'Cadastral boundary verified. Awaiting 1 remaining Western boundary attestation.',
    documents: [
      { name: 'Deed_of_Assignment_Signed.pdf', type: 'application/pdf', size: '2.4 MB', uploadedAt: '2026-03-01' },
      { name: 'Cadastral_Survey_Plan_Lodge.pdf', type: 'application/pdf', size: '4.8 MB', uploadedAt: '2026-03-05' },
      { name: 'Tax_Clearance_Certificate_2025.pdf', type: 'application/pdf', size: '1.1 MB', uploadedAt: '2026-03-01' }
    ]
  },
  {
    id: 'app-002',
    applicationNumber: 'ANAGU-APP-2026-9041',
    applicantName: 'Dr. Stella K. Nnamdi',
    applicantId: 'usr-cit-104',
    applicantPhone: '+234 802 119 2810',
    applicantEmail: 'stella.nnamdi@biomed.ng',
    state: 'Lagos',
    lga: 'Ikeja',
    district: 'Alausa Commercial Zone',
    landUse: 'Commercial',
    estimatedAreaSqm: 1850,
    status: 'registrar_review',
    dateSubmitted: '2026-02-18',
    lastUpdated: '2026-03-09',
    assignedSurveyor: 'Surv. Amina Bello, FNIS',
    surveyReportDate: '2026-02-28',
    attestationsCount: 4,
    requiredAttestations: 4,
    notes: 'All 4 boundary neighbors attested without objection. Registrar signoff pending.',
    documents: [
      { name: 'Purchase_Receipt_Receipt094.pdf', type: 'application/pdf', size: '940 KB', uploadedAt: '2026-02-18' },
      { name: 'Perimeter_Survey_Sheet.pdf', type: 'application/pdf', size: '3.6 MB', uploadedAt: '2026-02-28' },
      { name: 'Governor_Consent_Previous.pdf', type: 'application/pdf', size: '1.8 MB', uploadedAt: '2026-02-18' }
    ]
  },
  {
    id: 'app-003',
    applicationNumber: 'ANAGU-APP-2026-9210',
    applicantName: 'Alhaji Bashir Yusuf',
    applicantId: 'usr-cit-312',
    applicantPhone: '+234 814 992 0019',
    applicantEmail: 'bashir.yusuf@kanoenterprises.com',
    state: 'Kano',
    lga: 'Nassarawa',
    district: 'Bompai Industrial Area',
    landUse: 'Industrial',
    estimatedAreaSqm: 12000,
    status: 'survey_assigned',
    dateSubmitted: '2026-03-08',
    lastUpdated: '2026-03-09',
    assignedSurveyor: 'Surv. Amina Bello, FNIS',
    attestationsCount: 0,
    requiredAttestations: 4,
    notes: 'Field reconnaissance scheduled for March 15, 2026.',
    documents: [
      { name: 'Traditional_Ruler_Allocation.pdf', type: 'application/pdf', size: '1.4 MB', uploadedAt: '2026-03-08' },
      { name: 'CAC_Certificate_Registration.pdf', type: 'application/pdf', size: '820 KB', uploadedAt: '2026-03-08' }
    ]
  }
];

export const INITIAL_TRANSACTIONS: BlockchainTransaction[] = [
  {
    id: 'tx-001',
    hash: '0x9a8f4b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a',
    type: 'TITLE_REGISTRATION',
    blockNumber: 1849204,
    timestamp: '2026-02-14 14:22:10 UTC',
    from: '0x9E5...7c22 (Registrar)',
    to: '0x71C...B8e9 (Chief Emeka Adeleke)',
    parcelTitle: 'C-OF-O-2026-004912',
    parcelId: 'pcl-001',
    status: 'confirmed',
    gasFee: '0.0028 ETH',
    signerRole: 'registrar',
    signature: '0x7f2019481adbc029e01824901928410283019283710293810293810293810293'
  },
  {
    id: 'tx-002',
    hash: '0x4f5a6b7c8d9e0f1a2b3c4d5e6f7a9a8f4b1c2d3e',
    type: 'SURVEY_ATTESTATION',
    blockNumber: 1849180,
    timestamp: '2026-02-12 11:05:44 UTC',
    from: '0x32A...F41d (Surv. Bello)',
    to: '0xCadastreContract',
    parcelTitle: 'C-OF-O-2026-004912',
    parcelId: 'pcl-001',
    status: 'confirmed',
    gasFee: '0.0019 ETH',
    signerRole: 'surveyor',
    signature: '0x1920381029381029381029381029381029381029381029381029381029381029'
  },
  {
    id: 'tx-003',
    hash: '0x1a2b3c4d5e6f7a9a8f4b1c2d3e4f5a6b7c8d9e0f',
    type: 'REVOCATION_ORDER',
    blockNumber: 1859011,
    timestamp: '2026-03-02 09:15:00 UTC',
    from: '0x1A0...0001 (Executive Governor)',
    to: '0x000...DEAD (Burn Address)',
    parcelTitle: 'REV-ORD-2026-00041',
    parcelId: 'pcl-005',
    status: 'confirmed',
    gasFee: '0.0045 ETH',
    signerRole: 'governor',
    signature: '0x8849102948102938102938102938102938102938102938102938102938102938'
  },
  {
    id: 'tx-004',
    hash: '0x6f7a9a8f4b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e',
    type: 'COMMUNITY_SIGN',
    blockNumber: 1861002,
    timestamp: '2026-03-06 16:40:12 UTC',
    from: '0x71C...B8e9 (Applicant)',
    to: '0xAttestationContract',
    parcelTitle: 'APP-PEND-2026-1192',
    parcelId: 'pcl-003',
    status: 'confirmed',
    gasFee: '0.0012 ETH',
    signerRole: 'citizen',
    signature: '0x3910294810293810293810293810293810293810293810293810293810293810'
  }
];

export const INITIAL_BLOCKS: BlockchainBlock[] = [
  {
    blockNumber: 1861004,
    hash: '0x49e10283fbc01928491029381029381029381029381029381029381029381029',
    parentHash: '0x99a8102938102938102938102938102938102938102938102938102938102938',
    timestamp: 'Just now',
    transactionsCount: 8,
    validator: 'Node-04 (Federal Land Geo-Cluster)',
    gasUsed: '1,420,910 / 15,000,000',
    status: 'verifying'
  },
  {
    blockNumber: 1861003,
    hash: '0x99a8102938102938102938102938102938102938102938102938102938102938',
    parentHash: '0x3810293810293810293810293810293810293810293810293810293810293810',
    timestamp: '14s ago',
    transactionsCount: 14,
    validator: 'Node-01 (Lagos State Sovereign Node)',
    gasUsed: '2,890,140 / 15,000,000',
    status: 'finalized'
  },
  {
    blockNumber: 1861002,
    hash: '0x3810293810293810293810293810293810293810293810293810293810293810',
    parentHash: '0x1290381029381029381029381029381029381029381029381029381029381029',
    timestamp: '29s ago',
    transactionsCount: 6,
    validator: 'Node-02 (Surveyors Registration Council)',
    gasUsed: '980,410 / 15,000,000',
    status: 'finalized'
  }
];

export const INITIAL_SURVEY_JOBS: SurveyJob[] = [
  {
    id: 'job-101',
    jobCode: 'SRV-JOB-2026-081',
    parcelId: 'pcl-003',
    applicantName: 'Chief Emeka Adeleke',
    location: 'Maitama Extension, FCT Abuja',
    landUse: 'Mixed Use',
    estimatedAreaSqm: 3200,
    scheduledDate: '2026-03-05',
    status: 'approved',
    surveyorNotes: '4 Boundary concrete pillars established with differential GPS. Zero boundary overlap.',
    beaconsPlaced: 4,
    cadastralPlanRef: 'FCT/CAD/2026/0049'
  },
  {
    id: 'job-102',
    jobCode: 'SRV-JOB-2026-094',
    parcelId: 'pcl-006-temp',
    applicantName: 'Alhaji Bashir Yusuf',
    location: 'Bompai Industrial Area, Kano',
    landUse: 'Industrial',
    estimatedAreaSqm: 12000,
    scheduledDate: '2026-03-15',
    status: 'pending',
    beaconsPlaced: 0
  },
  {
    id: 'job-103',
    jobCode: 'SRV-JOB-2026-072',
    parcelId: 'pcl-007-temp',
    applicantName: 'Chevron Employees Cooperative',
    location: 'Ajah Lekki Corridor, Lagos',
    landUse: 'Residential',
    estimatedAreaSqm: 5400,
    scheduledDate: '2026-03-08',
    status: 'in_progress',
    beaconsPlaced: 6,
    surveyorNotes: 'Field coordinates logged. Generating computerized traverse sheet.'
  }
];

export const INITIAL_COMMUNITY_ATTESTATIONS: CommunityAttestation[] = [
  {
    id: 'att-001',
    parcelId: 'pcl-003',
    parcelTitle: 'APP-PEND-2026-1192',
    applicantName: 'Chief Emeka Adeleke',
    location: 'Plot 481, Maitama Extension, FCT Abuja',
    tenureType: 'Statutory',
    attestationDeadline: '2026-03-28',
    status: 'open',
    neighborAttestations: [
      {
        neighborName: 'General M. I. Danjuma (Retd.)',
        boundarySide: 'North',
        status: 'confirmed',
        comment: 'I confirm the boundary line aligns with the existing masonry wall and beacon ABJ/MT/110.',
        date: '2026-03-04'
      },
      {
        neighborName: 'Ambassador Grace Nwafor',
        boundarySide: 'East',
        status: 'confirmed',
        comment: 'Surveyors walked the perimeter in my presence. Boundary confirmed.',
        date: '2026-03-06'
      },
      {
        neighborName: 'Ministry of Environment Green Corridor',
        boundarySide: 'South',
        status: 'confirmed',
        comment: 'Clear of natural drainage canal easement. Confirmed.',
        date: '2026-03-08'
      },
      {
        neighborName: 'Engr. T. S. Olanrewaju',
        boundarySide: 'West',
        status: 'pending'
      }
    ],
    publicDisputes: []
  },
  {
    id: 'att-002',
    parcelId: 'pcl-008-cust',
    parcelTitle: 'CUST-ALLOT-2026-0317',
    applicantName: 'Olorogun Family Land Trust',
    location: 'Ugbomro Communal Layout, Uvwie LGA, Delta State',
    tenureType: 'Customary',
    attestationDeadline: '2026-04-05',
    status: 'open',
    neighborAttestations: [
      {
        neighborName: 'Chief O. Akpobome (North Lineage)',
        boundarySide: 'North',
        status: 'confirmed',
        comment: 'Ancestral Iroko boundary tree and beacon DL/UV/201 confirmed by family elders.',
        date: '2026-03-09'
      },
      {
        neighborName: 'Ugbomro Youth & Community Trust',
        boundarySide: 'East',
        status: 'confirmed',
        comment: 'No overlap with communal town hall reserve.',
        date: '2026-03-10'
      },
      {
        neighborName: 'Madam E. Oghenekaro',
        boundarySide: 'South',
        status: 'pending'
      },
      {
        neighborName: 'Uvwie Traditional Council Stool Land',
        boundarySide: 'West',
        status: 'confirmed',
        comment: 'Chieftaincy seal verified against ancestral allotment register.',
        date: '2026-03-11'
      }
    ],
    publicDisputes: []
  }
];

export const INITIAL_REVOCATIONS: RevocationRecord[] = [
  {
    id: 'rev-001',
    orderNumber: 'REV-ORD-2026-00041',
    parcelId: 'pcl-005',
    parcelTitle: 'C-OF-O-2023-00918',
    previousOwner: 'Vanguard Realty Consortium',
    revocationReason: 'Overriding Public Interest',
    gazetteNoticeNumber: 'LGSG/VOL-59/NO-14',
    effectiveDate: '2026-03-02',
    compensationStatus: 'Determined',
    compensationAmount: 580000000,
    signedBy: 'His Excellency Dr. B. A. Al-Hassan (Executive Governor)',
    status: 'executed',
    sectionCitation: 'Land Use Act 1978, Section 28(2)'
  },
  {
    id: 'rev-002',
    orderNumber: 'REV-ORD-2025-00118',
    parcelId: 'pcl-099-rev',
    parcelTitle: 'C-OF-O-2021-00441',
    previousOwner: 'Apex Mining Logistics',
    revocationReason: 'Breach of Statutory Condition',
    gazetteNoticeNumber: 'KDSG/VOL-32/NO-08',
    effectiveDate: '2025-10-14',
    compensationStatus: 'Not Applicable',
    compensationAmount: 0,
    signedBy: 'Executive Governor, Kaduna State',
    status: 'executed',
    sectionCitation: 'Land Use Act 1978, Section 28(5)'
  }
];

export const INITIAL_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'aud-001',
    timestamp: '2026-03-12 10:14:22',
    actor: 'Executive Governor',
    actorRole: 'governor',
    action: 'STATUTORY_REVOCATION_EXECUTED',
    targetId: 'pcl-005',
    targetType: 'Revocation',
    details: 'Executed revocation of title C-OF-O-2023-00918 pursuant to Section 28 Land Use Act.',
    ipAddress: '102.89.44.12',
    hash: '0x9928190283019283019283019283'
  },
  {
    id: 'aud-002',
    timestamp: '2026-03-12 08:30:11',
    actor: 'Barr. Folake Adebayo',
    actorRole: 'registrar',
    action: 'APPLICATION_APPROVED',
    targetId: 'app-002',
    targetType: 'Application',
    details: 'Completed legal title validation for Dr. Stella K. Nnamdi. Sent to NFT issuance queue.',
    ipAddress: '102.89.31.8',
    hash: '0x4491029481029481029481029481'
  },
  {
    id: 'aud-003',
    timestamp: '2026-03-11 16:55:04',
    actor: 'Surv. Amina Bello, FNIS',
    actorRole: 'surveyor',
    action: 'CADASTRAL_PLAN_LODGED',
    targetId: 'job-101',
    targetType: 'Parcel',
    details: 'Lodged geodetic perimeter coordinates and 4 concrete beacon positions for Parcel pcl-003.',
    ipAddress: '105.112.44.91',
    hash: '0x3301928401928401928401928401'
  },
  {
    id: 'aud-004',
    timestamp: '2026-03-10 11:20:19',
    actor: 'Chief Emeka Adeleke',
    actorRole: 'citizen',
    action: 'TITLE_APPLICATION_SUBMITTED',
    targetId: 'app-001',
    targetType: 'Application',
    details: 'Initial registration application filed with 3 legal instruments and boundary estimate.',
    ipAddress: '197.210.8.44',
    hash: '0x7710294810294810294810294810'
  }
];

export const INITIAL_NOTIFICATIONS: SystemNotification[] = [
  {
    id: 'notif-1',
    title: 'Survey Verification Complete',
    message: 'Surv. Amina Bello submitted cadastral coordinates for Application ANAGU-APP-2026-8819.',
    timestamp: '10m ago',
    type: 'success',
    read: false,
    actionLink: '/portal/applications'
  },
  {
    id: 'notif-2',
    title: 'Community Attestation Notice',
    message: '3 of 4 boundary neighbors have signed off on Maitama Extension parcel.',
    timestamp: '2h ago',
    type: 'info',
    read: false,
    actionLink: '/portal/community'
  },
  {
    id: 'notif-3',
    title: 'Blockchain Block Finalized',
    message: 'Block #1861003 finalized with 14 immutable land registry transactions.',
    timestamp: '5h ago',
    type: 'info',
    read: true,
    actionLink: '/portal/explorer'
  }
];
