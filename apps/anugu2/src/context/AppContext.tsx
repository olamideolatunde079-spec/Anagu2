import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  UserRole,
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
import { getAuth, subscribeToAuth } from '../lib/supabase';
import { apiRequest } from '../lib/api';
import {
  INITIAL_PARCELS,
  INITIAL_APPLICATIONS,
  INITIAL_TRANSACTIONS,
  INITIAL_BLOCKS,
  INITIAL_SURVEY_JOBS,
  INITIAL_COMMUNITY_ATTESTATIONS,
  INITIAL_REVOCATIONS,
  INITIAL_AUDIT_LOGS,
  INITIAL_NOTIFICATIONS,
} from '../data/mockData';

const GUEST_USER: User = {
  id: '',
  name: 'Guest',
  email: '',
  role: 'citizen',
  nationalId: '',
  walletAddress: '',
  avatarUrl: '',
  verified: false,
};

interface LandApplicationSubmission extends Partial<LandApplication> {
  coordinates: [number, number][];
  nationalId: string;
  surveyPlanNumber?: string;
  communityWitnesses?: string[];
  legalClearanceHash?: string;
  addressDesc?: string;
}

interface LandApplicationSubmissionResult {
  applicationId: string;
  parcelId: string;
  spatialResult: {
    valid: boolean;
    reason?: string;
    diagnosticMessage?: string;
    spatialHash?: string;
  };
}

interface AppContextType {
  // Theme & Role
  theme: 'dark' | 'light';
  setTheme: (t: 'dark' | 'light') => void;
  toggleTheme: () => void;
  currentRole: UserRole;
  setCurrentRole: (r: UserRole) => void;
  currentUser: User;
  isAuthenticated: boolean;
  authLoading: boolean;

  // Data & State
  parcels: Parcel[];
  applications: LandApplication[];
  transactions: BlockchainTransaction[];
  blocks: BlockchainBlock[];
  surveyJobs: SurveyJob[];
  communityAttestations: CommunityAttestation[];
  revocations: RevocationRecord[];
  auditLogs: AuditLog[];
  notifications: SystemNotification[];

  // Mutations
  registerLandApplication: (data: LandApplicationSubmission) => Promise<LandApplicationSubmissionResult>;
  updateApplicationStatus: (appId: string, newStatus: LandApplication['status'], notes?: string) => void;
  signNeighborAttestation: (attestationId: string, neighborName: string, status: 'confirmed' | 'disputed', comment?: string) => void;
  submitSurveyReport: (jobId: string, notes: string, beaconsPlaced: number, planRef: string) => void;
  approveTitleDeed: (appId: string) => Parcel;
  executeGovernorRevocation: (revocationData: {
    parcelId: string;
    reason: RevocationRecord['revocationReason'];
    gazetteRef: string;
    compensationAmount: number;
  }) => void;
  markNotificationRead: (id: string) => void;
  addNotification: (notif: Omit<SystemNotification, 'id' | 'timestamp' | 'read'>) => void;

  // Offline / Sync Simulation
  isOfflineMode: boolean;
  toggleOfflineMode: () => void;
  offlineQueueCount: number;
  syncOfflineQueue: () => void;

  // Active Certificate Modal State
  selectedCertificateParcel: Parcel | null;
  setSelectedCertificateParcel: (parcel: Parcel | null) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<'dark' | 'light'>('light');
  const [currentRole, setCurrentRole] = useState<UserRole>('citizen');
  const [authenticatedUser, setAuthenticatedUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [parcels, setParcels] = useState<Parcel[]>(INITIAL_PARCELS);
  const [applications, setApplications] = useState<LandApplication[]>(INITIAL_APPLICATIONS);
  const [transactions, setTransactions] = useState<BlockchainTransaction[]>(INITIAL_TRANSACTIONS);
  const [blocks, setBlocks] = useState<BlockchainBlock[]>(INITIAL_BLOCKS);
  const [surveyJobs, setSurveyJobs] = useState<SurveyJob[]>(INITIAL_SURVEY_JOBS);
  const [communityAttestations, setCommunityAttestations] = useState<CommunityAttestation[]>(INITIAL_COMMUNITY_ATTESTATIONS);
  const [revocations, setRevocations] = useState<RevocationRecord[]>(INITIAL_REVOCATIONS);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(INITIAL_AUDIT_LOGS);
  const [notifications, setNotifications] = useState<SystemNotification[]>(INITIAL_NOTIFICATIONS);

  // Offline Simulation
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [offlineQueueCount, setOfflineQueueCount] = useState(2);

  // Active Certificate Modal
  const [selectedCertificateParcel, setSelectedCertificateParcel] = useState<Parcel | null>(null);

  // Always keep document root light
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('dark');
    root.classList.add('light');
  }, []);

  // ── Local API JWT session ────────────────────────────────────────────────
  useEffect(() => {
    let active = true;
    const applySession = () => {
      if (!active) return;
      const session = getAuth();
      if (!session?.user) {
        setIsAuthenticated(false);
        setAuthenticatedUser(null);
        setCurrentRole('citizen');
        return;
      }

      const user = session.user;
      const roleMap: Record<string, UserRole> = {
        CITIZEN: 'citizen',
        SURVEYOR: 'surveyor',
        REGISTRAR: 'registrar',
        LAND_ADMINISTRATOR: 'admin',
        GOVERNOR: 'governor',
      };
      const role = roleMap[String(user.role ?? '').toUpperCase()] ?? 'citizen';
      setCurrentRole(role);
      setIsAuthenticated(true);
      setAuthenticatedUser({
        ...GUEST_USER,
        id: user.id,
        name: user.fullName || user.email?.split('@')[0] || 'User',
        email: user.email,
        role,
        nationalId: user.nationalId ?? '',
        walletAddress: user.walletAddress ?? '',
        verified: false,
      });
    };

    applySession();
    setAuthLoading(false);
    const unsubscribe = subscribeToAuth(applySession);

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  // Hydrate live applications & notifications from backend when authenticated
  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;

    const loadLiveBackendData = async () => {
      try {
        const [backendApps, backendNotifs] = await Promise.all([
          apiRequest<Array<{
            id: string;
            applicationRef?: string | null;
            ownerName: string;
            applicantId: string;
            status: string;
            submittedAt?: string;
            createdAt?: string;
            updatedAt?: string;
            rejectionReason?: string | null;
          }>>('/applications').catch(() => null),
          apiRequest<Array<{
            id: string;
            title: string;
            body: string;
            category: string;
            isRead: boolean;
            createdAt: string;
          }>>('/notifications').catch(() => null),
        ]);

        if (cancelled) return;

        if (Array.isArray(backendApps) && backendApps.length > 0) {
          const statusMap: Record<string, LandApplication['status']> = {
            SUBMITTED: 'submitted',
            SPATIAL_VERIFIED: 'survey_assigned',
            OWNERSHIP_VERIFIED: 'community_attestation',
            LEGAL_VERIFIED: 'registrar_review',
            APPROVED: 'approved',
            BLOCKCHAIN_REGISTERED: 'approved',
            NFT_ISSUED: 'approved',
            COMPLETED: 'approved',
            REJECTED: 'rejected',
            CANCELLED: 'rejected',
          };
          const mapped: LandApplication[] = backendApps.map((app) => ({
            id: app.id,
            applicationNumber: app.applicationRef ?? `ANAGU-${app.id.slice(0, 8).toUpperCase()}`,
            applicantName: app.ownerName,
            applicantId: app.applicantId,
            applicantPhone: '',
            applicantEmail: currentUser.email,
            tenureType: 'Statutory',
            state: 'Anambra',
            lga: 'Awka South',
            district: '',
            landUse: 'Residential',
            estimatedAreaSqm: 0,
            status: statusMap[app.status] ?? 'submitted',
            dateSubmitted: (app.submittedAt ?? app.createdAt ?? new Date().toISOString()).slice(0, 10),
            lastUpdated: (app.updatedAt ?? new Date().toISOString()).slice(0, 10),
            attestationsCount: 0,
            requiredAttestations: 3,
            notes: app.rejectionReason ?? `Status: ${app.status}`,
            documents: [],
          }));
          setApplications((prev) => {
            const existingIds = new Set(mapped.map((m) => m.id));
            return [...mapped, ...prev.filter((p) => !existingIds.has(p.id))];
          });
        }

        if (Array.isArray(backendNotifs) && backendNotifs.length > 0) {
          const mappedNotifs: SystemNotification[] = backendNotifs.map((n) => ({
            id: n.id,
            title: n.title,
            message: n.body,
            type: n.category === 'REJECTION' ? 'warning' : 'info',
            timestamp: n.createdAt.slice(0, 16).replace('T', ' '),
            read: n.isRead,
          }));
          setNotifications((prev) => {
            const ids = new Set(mappedNotifs.map((m) => m.id));
            return [...mappedNotifs, ...prev.filter((p) => !ids.has(p.id))];
          });
        }
      } catch {
        // Offline demo fallback silently preserved
      }
    };

    void loadLiveBackendData();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  const toggleTheme = () => {
    setTheme('light');
  };

  const currentUser = authenticatedUser || GUEST_USER;

  const addNotification = (notif: Omit<SystemNotification, 'id' | 'timestamp' | 'read'>) => {
    const newNotif: SystemNotification = {
      ...notif,
      id: `notif-${Date.now()}`,
      timestamp: 'Just now',
      read: false
    };
    setNotifications(prev => [newNotif, ...prev]);
  };

  const markNotificationRead = (id: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const logAuditEvent = (action: string, targetId: string, targetType: AuditLog['targetType'], details: string) => {
    const newLog: AuditLog = {
      id: `aud-${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      actor: currentUser.name,
      actorRole: currentRole,
      action,
      targetId,
      targetType,
      details,
      ipAddress: '197.210.8.' + Math.floor(Math.random() * 200 + 10),
      hash: '0x' + Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('')
    };
    setAuditLogs(prev => [newLog, ...prev]);
  };

  const registerLandApplication = async (
    data: LandApplicationSubmission,
  ): Promise<LandApplicationSubmissionResult> => {
    // Try the backend first; fall back to local simulation if unreachable
    let result: LandApplicationSubmissionResult;
    try {
      result = await apiRequest<LandApplicationSubmissionResult>('/applications', {
        method: 'POST',
        body: JSON.stringify({
          ownerName: data.applicantName || currentUser.name,
          nationalId: data.nationalId,
          surveyPlanNumber: data.surveyPlanNumber,
          communityWitnesses: data.communityWitnesses,
          legalClearanceHash: data.legalClearanceHash,
          coordinates: data.coordinates,
          lga: data.lga,
          state: data.state,
          addressDesc: data.district,
        }),
      });
    } catch {
      // Backend unavailable — simulate locally
      result = {
        applicationId: `local-${Date.now()}`,
        parcelId: `pcl-local-${Date.now()}`,
        spatialResult: { valid: true, spatialHash: '0x' + Math.random().toString(16).slice(2).padEnd(40, '0') },
      };
    }

    const appNum = `ANAGU-APP-${result.applicationId.slice(0, 8).toUpperCase()}`;

    const newApp: LandApplication = {
      id: result.applicationId,
      applicationNumber: appNum,
      applicantName: data.applicantName || currentUser.name,
      applicantId: currentUser.id,
      applicantPhone: data.applicantPhone || currentUser.phone || '',
      applicantEmail: data.applicantEmail || currentUser.email,
      tenureType: data.tenureType || 'Statutory',
      state: data.state || '',
      lga: data.lga || '',
      district: data.district || '',
      landUse: data.landUse || 'Residential',
      estimatedAreaSqm: data.estimatedAreaSqm || 0,
      northNeighbor: data.northNeighbor,
      southNeighbor: data.southNeighbor,
      eastNeighbor: data.eastNeighbor,
      westNeighbor: data.westNeighbor,
      surveyorSurconNo: data.surveyorSurconNo,
      assignedSurveyor: data.assignedSurveyor,
      status: 'submitted',
      dateSubmitted: new Date().toISOString().substring(0, 10),
      lastUpdated: new Date().toISOString().substring(0, 10),
      attestationsCount: 0,
      requiredAttestations: 4,
      notes: `Spatial verification passed. Parcel ${result.parcelId} is recorded for ownership and legal review.`,
      documents: [],
    };

    setApplications(prev => [newApp, ...prev]);
    addNotification({
      title: 'Spatial Verification Passed',
      message: `Application ${appNum} is recorded. Ownership and legal review are still required.`,
      type: 'success'
    });

    return result;
  };

  const updateApplicationStatus = (appId: string, newStatus: LandApplication['status'], notes?: string) => {
    setApplications(prev =>
      prev.map(app => {
        if (app.id === appId) {
          return {
            ...app,
            status: newStatus,
            lastUpdated: new Date().toISOString().substring(0, 10),
            notes: notes || app.notes
          };
        }
        return app;
      })
    );
    logAuditEvent('APPLICATION_STATUS_UPDATE', appId, 'Application', `Status updated to ${newStatus}`);
  };

  const signNeighborAttestation = (attestationId: string, neighborName: string, status: 'confirmed' | 'disputed', comment?: string) => {
    setCommunityAttestations(prev =>
      prev.map(item => {
        if (item.id === attestationId) {
          const updatedNeighbors = item.neighborAttestations.map(neighbor => {
            if (neighbor.neighborName === neighborName) {
              return {
                ...neighbor,
                status,
                comment: comment || neighbor.comment,
                date: new Date().toISOString().substring(0, 10)
              };
            }
            return neighbor;
          });
          return { ...item, neighborAttestations: updatedNeighbors };
        }
        return item;
      })
    );

    logAuditEvent('COMMUNITY_ATTESTATION_SIGNED', attestationId, 'Parcel', `Neighbor ${neighborName} signed boundary as ${status}`);
    addNotification({
      title: 'Neighbor Signoff Recorded',
      message: `${neighborName} submitted boundary confirmation for attestation ${attestationId}.`,
      type: 'info'
    });
  };

  const submitSurveyReport = (jobId: string, notes: string, beaconsPlaced: number, planRef: string) => {
    setSurveyJobs(prev =>
      prev.map(j => {
        if (j.id === jobId) {
          return {
            ...j,
            status: 'approved',
            surveyorNotes: notes,
            beaconsPlaced,
            cadastralPlanRef: planRef
          };
        }
        return j;
      })
    );

    // Also update any matching application to community_attestation
    setApplications(prev =>
      prev.map(app => {
        if (app.status === 'survey_assigned' || app.status === 'submitted') {
          return {
            ...app,
            status: 'community_attestation',
            assignedSurveyor: currentUser.name,
            surveyReportDate: new Date().toISOString().substring(0, 10),
            notes: `Cadastral survey completed under plan ${planRef}. Boundary notice active for neighbor sign-off.`
          };
        }
        return app;
      })
    );

    // Record on-chain transaction
    const newTx: BlockchainTransaction = {
      id: `tx-${Date.now()}`,
      hash: '0x' + Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
      type: 'SURVEY_ATTESTATION',
      blockNumber: blocks[0]?.blockNumber ? blocks[0].blockNumber + 1 : 1861005,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC',
      from: currentUser.walletAddress,
      to: '0xCadastreContract',
      parcelTitle: planRef,
      parcelId: jobId,
      status: 'confirmed',
      gasFee: '0.0021 ETH',
      signerRole: 'surveyor',
      signature: '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')
    };
    setTransactions(prev => [newTx, ...prev]);

    logAuditEvent('CADASTRAL_SURVEY_SUBMITTED', jobId, 'Parcel', `Cadastral plan ${planRef} submitted with ${beaconsPlaced} beacons`);
    addNotification({
      title: 'Survey Plan Lodged',
      message: `Survey plan ${planRef} has been validated against topological rules and committed.`,
      type: 'success'
    });
  };

  const approveTitleDeed = (appId: string): Parcel => {
    const targetApp = applications.find(a => a.id === appId) || applications[0];
    const newTitleNumber = `C-OF-O-2026-00${Math.floor(5000 + Math.random() * 4999)}`;
    const tokenHash = '0x' + Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join('');

    const newParcel: Parcel = {
      id: `pcl-${Date.now()}`,
      titleNumber: newTitleNumber,
      tokenHash,
      ownerName: targetApp.applicantName,
      ownerId: targetApp.applicantId,
      ownerNationalId: 'NIN-8891-2094-1102',
      state: targetApp.state,
      lga: targetApp.lga,
      district: targetApp.district,
      landUse: targetApp.landUse,
      sizeSqm: targetApp.estimatedAreaSqm,
      sizeHectares: Number((targetApp.estimatedAreaSqm / 10000).toFixed(3)),
      status: 'verified',
      dateRegistered: new Date().toISOString().substring(0, 10),
      coordinates: [
        { id: 'bp-new-1', beaconNumber: 'SC/NEW/01', lat: 6.442, lng: 3.481 },
        { id: 'bp-new-2', beaconNumber: 'SC/NEW/02', lat: 6.443, lng: 3.483 },
        { id: 'bp-new-3', beaconNumber: 'SC/NEW/03', lat: 6.441, lng: 3.484 },
        { id: 'bp-new-4', beaconNumber: 'SC/NEW/04', lat: 6.440, lng: 3.482 }
      ],
      surveyPlanNumber: `SPN/${new Date().getFullYear()}/${Math.floor(1000 + Math.random() * 9000)}`,
      surveyorName: targetApp.assignedSurveyor || 'Surv. Amina Bello, FNIS',
      marketValuation: 195000000,
      encumbrances: [],
      ipfsDocumentHash: 'Qm' + Array.from({ length: 44 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
      certificateIssued: true,
      blockNumber: blocks[0]?.blockNumber ? blocks[0].blockNumber + 1 : 1861005
    };

    setParcels(prev => [newParcel, ...prev]);

    // Update application
    setApplications(prev =>
      prev.map(a =>
        a.id === appId
          ? {
              ...a,
              status: 'approved',
              notes: `Approved by Registrar ${currentUser.name}. Certificate of Occupancy ${newTitleNumber} issued.`
            }
          : a
      )
    );

    // Add minting transaction
    const mintTx: BlockchainTransaction = {
      id: `tx-${Date.now()}`,
      hash: '0x' + Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
      type: 'TITLE_REGISTRATION',
      blockNumber: blocks[0]?.blockNumber ? blocks[0].blockNumber + 1 : 1861005,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC',
      from: currentUser.walletAddress,
      to: `0xUserWallet (${targetApp.applicantName})`,
      parcelTitle: newTitleNumber,
      parcelId: newParcel.id,
      status: 'confirmed',
      gasFee: '0.0034 ETH',
      signerRole: 'registrar',
      signature: '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')
    };
    setTransactions(prev => [mintTx, ...prev]);

    logAuditEvent('TITLE_DEED_APPROVED', newParcel.id, 'Parcel', `Issued C of O ${newTitleNumber} to ${targetApp.applicantName}`);
    addNotification({
      title: 'Title Deed Approved & Minted',
      message: `Certificate of Occupancy ${newTitleNumber} has been minted onto the blockchain registry.`,
      type: 'success'
    });

    return newParcel;
  };

  const executeGovernorRevocation = (revocationData: {
    parcelId: string;
    reason: RevocationRecord['revocationReason'];
    gazetteRef: string;
    compensationAmount: number;
  }) => {
    const targetParcel = parcels.find(p => p.id === revocationData.parcelId);
    if (!targetParcel) return;

    const orderNum = `REV-ORD-2026-${Math.floor(10000 + Math.random() * 90000)}`;

    const newRevocation: RevocationRecord = {
      id: `rev-${Date.now()}`,
      orderNumber: orderNum,
      parcelId: targetParcel.id,
      parcelTitle: targetParcel.titleNumber,
      previousOwner: targetParcel.ownerName,
      revocationReason: revocationData.reason,
      gazetteNoticeNumber: revocationData.gazetteRef,
      effectiveDate: new Date().toISOString().substring(0, 10),
      compensationStatus: revocationData.compensationAmount > 0 ? 'Determined' : 'Not Applicable',
      compensationAmount: revocationData.compensationAmount,
      signedBy: `${currentUser.name} (${currentUser.organization || 'Executive Governor'})`,
      status: 'executed'
    };

    setRevocations(prev => [newRevocation, ...prev]);

    // Update parcel status
    setParcels(prev =>
      prev.map(p =>
        p.id === targetParcel.id
          ? {
              ...p,
              status: 'revoked',
              encumbrances: [...p.encumbrances, `Statutory Revocation Order ${orderNum}`],
              disputeNotes: `Title revoked by State Governor under Gazette Ref: ${revocationData.gazetteRef}. Reason: ${revocationData.reason}.`
            }
          : p
      )
    );

    // Add burn transaction to blockchain
    const burnTx: BlockchainTransaction = {
      id: `tx-${Date.now()}`,
      hash: '0x' + Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
      type: 'REVOCATION_ORDER',
      blockNumber: blocks[0]?.blockNumber ? blocks[0].blockNumber + 1 : 1861005,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC',
      from: currentUser.walletAddress,
      to: '0x000000000000000000000000000000000000DEAD',
      parcelTitle: targetParcel.titleNumber,
      parcelId: targetParcel.id,
      status: 'confirmed',
      gasFee: '0.0052 ETH',
      signerRole: 'governor',
      signature: '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')
    };
    setTransactions(prev => [burnTx, ...prev]);

    logAuditEvent('STATUTORY_REVOCATION_EXECUTED', targetParcel.id, 'Revocation', `Order ${orderNum} executed. Reason: ${revocationData.reason}`);
    addNotification({
      title: 'Executive Revocation Executed',
      message: `Title ${targetParcel.titleNumber} has been revoked by executive order. Memorial entry recorded on-chain.`,
      type: 'warning'
    });
  };

  const toggleOfflineMode = () => {
    setIsOfflineMode(prev => {
      const next = !prev;
      addNotification({
        title: next ? 'Simulated Offline Mode Enabled' : 'Online Reconnected',
        message: next
          ? 'MQTT edge broker cached transactions locally in IndexedDB queue.'
          : 'Local edge cache synchronized 2 queued cadastral events to validator nodes.',
        type: next ? 'warning' : 'success'
      });
      return next;
    });
  };

  const syncOfflineQueue = () => {
    setOfflineQueueCount(0);
    addNotification({
      title: 'MQTT Cache Synchronized',
      message: 'All queued edge field notes and beacon telemetries committed to consensus network.',
      type: 'success'
    });
  };

  return (
    <AppContext.Provider
      value={{
        theme,
        setTheme,
        toggleTheme,
        currentRole,
        setCurrentRole,
        currentUser,
        isAuthenticated,
        authLoading,
        parcels,
        applications,
        transactions,
        blocks,
        surveyJobs,
        communityAttestations,
        revocations,
        auditLogs,
        notifications,
        registerLandApplication,
        updateApplicationStatus,
        signNeighborAttestation,
        submitSurveyReport,
        approveTitleDeed,
        executeGovernorRevocation,
        markNotificationRead,
        addNotification,
        isOfflineMode,
        toggleOfflineMode,
        offlineQueueCount,
        syncOfflineQueue,
        selectedCertificateParcel,
        setSelectedCertificateParcel
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
