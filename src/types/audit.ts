export type AuditStatus = 'OK' | 'KO' | 'NON_APPLICABLE' | 'A_VERIFIER';
export type ConfidenceLevel = 'FORTE' | 'MOYENNE' | 'FAIBLE';

export type RGAACategory =
  | '1. Images'
  | '2. Cadres'
  | '3. Couleurs & Contrastes'
  | '4. Multimédia & Animations'
  | '5. Tableaux'
  | '6. Liens'
  | '7. Scripts & ARIA'
  | '8. Éléments obligatoires'
  | '9. Structuration de l\'information'
  | '10. Présentation & Zoom'
  | '11. Formulaires'
  | '12. Navigation & Clavier'
  | '13. Consultation';

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ElementEvidence {
  selector: string;
  tagName: string;
  htmlSnippet: string;
  role?: string;
  accessibleName?: string;
  rect?: BoundingBox;
  computedStyles?: Record<string, string>;
  signals: Record<string, any>;
  issueDescription: string;
  screenshotBase64?: string;
}

export interface RuleResult {
  id: string; // e.g. "RGAA-1.1"
  rgaaCriterion: string; // e.g. "Critère 1.1"
  category: RGAACategory;
  title: string;
  description: string;
  observation: string;
  analysis: string;
  decision: string;
  justification: string;
  status: AuditStatus;
  confidence: ConfidenceLevel;
  humanValidationRequired: boolean;
  recommendation: string;
  evidence: ElementEvidence[];
  signalsUsed: string[];
  threshold?: string;
  edgeCasesEncountered?: string;
}

export interface KeyboardStep {
  stepIndex: number;
  tagName: string;
  selector: string;
  role: string;
  accessibleName: string;
  rect?: BoundingBox;
  hasFocusIndicator: boolean;
  computedFocusStyles: {
    outlineWidth: string;
    outlineStyle: string;
    outlineColor: string;
    boxShadow: string;
    borderColor?: string;
  };
  htmlSnippet: string;
  isTrap?: boolean;
  isLost?: boolean;
  isOffScreen?: boolean;
}

export interface KeyboardTrailReport {
  totalSteps: number;
  uniqueElementsReached: number;
  invisibleFocusCount: number;
  trapDetected: boolean;
  lostFocusCount: number;
  steps: KeyboardStep[];
  status: AuditStatus;
  summary: string;
}

export interface PageAuditResult {
  id: string;
  url: string;
  title: string;
  timestamp: string;
  durationMs: number;
  viewport: { width: number; height: number };
  statusCounts: {
    OK: number;
    KO: number;
    A_VERIFIER: number;
    NON_APPLICABLE: number;
    total: number;
  };
  rules: RuleResult[];
  keyboardTrail?: KeyboardTrailReport;
  fullScreenshotBase64?: string;
  error?: {
    type: 'NETWORK_ERROR' | 'TIMEOUT' | 'SECURITY_BLOCKED' | 'PARSE_ERROR' | 'UNEXPECTED_ERROR';
    message: string;
    isAccessibilityKO: false;
  };
}

export interface AuditJob {
  id: string;
  createdAt: string;
  completedAt?: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  progress?: number; // 0 - 100
  currentUrl?: string;
  currentUrlIndex?: number;
  currentStep?: string;
  urls: string[];
  totalUrls?: number;
  options: {
    simulateKeyboard: boolean;
    simulateForms: boolean;
    simulateZoom: boolean;
    takeScreenshots: boolean;
    timeout?: number;
  };
  results: PageAuditResult[];
  globalSummary: {
    totalUrls?: number;
    completedUrls?: number;
    totalChecks: number;
    totalOK: number;
    totalKO: number;
    totalAVerifier: number;
    totalNA: number;
  };
}
