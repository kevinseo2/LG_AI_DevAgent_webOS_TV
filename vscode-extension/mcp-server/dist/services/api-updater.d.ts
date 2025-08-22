export interface UpdateInfo {
    hasUpdates: boolean;
    lastChecked: string;
    availableUpdates: APIUpdate[];
    updateSummary: UpdateSummary;
}
export interface APIUpdate {
    apiName: string;
    currentVersion: string;
    latestVersion: string;
    changeType: 'major' | 'minor' | 'patch';
    changes: APIChange[];
    compatibilityImpact: 'breaking' | 'additive' | 'none';
}
export interface APIChange {
    type: 'added' | 'modified' | 'deprecated' | 'removed';
    element: 'method' | 'parameter' | 'return_value' | 'service_uri';
    name: string;
    description: string;
    migrationGuide?: string;
}
export interface UpdateSummary {
    totalAPIs: number;
    updatedAPIs: number;
    newMethods: number;
    deprecatedMethods: number;
    breakingChanges: number;
}
export declare class APIUpdater {
    private lastUpdateCheck;
    private updateInterval;
    checkForUpdates(forceCheck?: boolean): Promise<UpdateInfo>;
    private fetchUpdatesFromSource;
    applyUpdates(selectedUpdates: string[]): Promise<{
        success: boolean;
        appliedUpdates: string[];
        errors: string[];
    }>;
    private applyIndividualUpdate;
    generateMigrationReport(updates: APIUpdate[]): Promise<string>;
    private getCachedUpdateInfo;
    private cacheUpdateInfo;
    private updateCacheTimestamp;
    private simulateNetworkDelay;
    schedulePeriodicUpdates(intervalHours?: number): Promise<void>;
}
//# sourceMappingURL=api-updater.d.ts.map