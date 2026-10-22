export interface CommitRecord {
  hash: string;
  timestamp: number;
  subject: string;
  parents: string[];
  files: string[];
}

export interface DependencyEdge { from: string; to: string; }
export interface CoChangeEdge { source: string; target: string; weight: number; }

export interface FileSignals {
  file: string;
  changes: number;
  bugfixChanges: number;
  mergeTouches: number;
  dependencyIn: number;
  dependencyOut: number;
  coChangeWeight: number;
  coChangePartners: number;
  lastChangedAt: number | null;
}

export interface FileRisk extends FileSignals {
  risk: number;
  level: "low" | "medium" | "high" | "critical";
  reasons: string[];
}

export interface FaultlineReport {
  repository: string;
  generatedAt: string;
  commitsAnalyzed: number;
  filesAnalyzed: number;
  bugfixCommits: number;
  mergeCommits: number;
  summary: {
    averageRisk: number;
    criticalFiles: number;
    highFiles: number;
    dependencyEdges: number;
    coChangeEdges: number;
  };
  files: FileRisk[];
  dependencies: DependencyEdge[];
  coChanges: CoChangeEdge[];
}
