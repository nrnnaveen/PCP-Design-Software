/**
 * FloZ ECA — Supabase Cloud Project Storage Engine
 * Manages cloud project persistence, multi-layer board syncing,
 * remote listing, and deterministic JSON deserialization.
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { AuthService } from './auth';
import { ApexProject } from './types';
import { ProjectSerializer } from './serialization';
import { ProjectMigrationAdapter } from './migrationAdapter';

export interface CloudProjectRecord {
  id: string;
  userId: string;
  name: string;
  description: string;
  layers: 2 | 4 | 6 | 8;
  partsCount: number;
  netsCount: number;
  createdAt: string;
  updatedAt: string;
  isCloud: boolean;
}

const LOCAL_CLOUD_CACHE_KEY = 'floz_cloud_projects_cache_v1';

export class CloudProjectService {
  /**
   * Fetches all cloud projects belonging to the current user.
   */
  public static async listProjects(): Promise<CloudProjectRecord[]> {
    const user = AuthService.getUser();

    // 1. If Supabase is active and user is signed in, query remote database
    if (isSupabaseConfigured() && supabase && !user.isGuest) {
      try {
        const { data, error } = await (supabase as any)
          .from('projects')
          .select('id, user_id, name, description, layers, parts_count, nets_count, created_at, updated_at')
          .order('updated_at', { ascending: false });

        if (error) {
          console.warn('Failed to query Supabase projects:', error.message);
        } else if (data) {
          const records: CloudProjectRecord[] = data.map((row: any) => ({
            id: row.id,
            userId: row.user_id,
            name: row.name || 'Untitled Board',
            description: row.description || '',
            layers: (row.layers as any) || 2,
            partsCount: row.parts_count || 0,
            netsCount: row.nets_count || 0,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            isCloud: true,
          }));

          // Cache locally for offline resilience
          this.cacheLocalRecords(records);
          return records;
        }
      } catch (err) {
        console.warn('Supabase projects fetch error, falling back to local cache:', err);
      }
    }

    // 2. Fallback to cached projects
    return this.getCachedLocalRecords();
  }

  /**
   * Saves or updates a project in Supabase cloud storage.
   */
  public static async saveProject(project: ApexProject): Promise<{ id: string; isCloud: boolean }> {
    const user = AuthService.getUser();
    const partsCount = project.pcb?.footprints?.length || 0;
    const netsCount = Object.keys(project.netGraph?.nets || {}).length;
    const layers = (project.pcb?.stackup?.filter((l) => l.type === 'copper').length || 2) as 2 | 4 | 6 | 8;

    // Always keep an autosave snapshot locally
    ProjectSerializer.saveToAutosave(project);

    // 1. If Supabase is active and authenticated, upload to cloud
    if (isSupabaseConfigured() && supabase && !user.isGuest) {
      try {
        const projectPayload = {
          id: project.metadata.id,
          user_id: user.id,
          name: project.metadata.name || 'Untitled Board',
          description: project.metadata.description || '',
          layers,
          parts_count: partsCount,
          nets_count: netsCount,
          data: JSON.parse(ProjectSerializer.serialize(project)),
          updated_at: new Date().toISOString(),
        };

        const { data, error } = await (supabase as any)
          .from('projects')
          .upsert(projectPayload, { onConflict: 'id' })
          .select('id')
          .single();

        if (error) {
          throw new Error(`Supabase save failed: ${error.message}`);
        }

        const savedId = data?.id || project.metadata.id;
        return { id: savedId, isCloud: true };
      } catch (err: any) {
        console.warn('Cloud save failed, saved locally instead:', err);
        return { id: project.metadata.id, isCloud: false };
      }
    }

    // Local save only
    return { id: project.metadata.id, isCloud: false };
  }

  /**
   * Loads a complete project by ID from Supabase or local cache.
   */
  public static async loadProject(projectId: string): Promise<ApexProject> {
    const user = AuthService.getUser();

    // 1. Fetch from Supabase
    if (isSupabaseConfigured() && supabase && !user.isGuest) {
      try {
        const { data, error } = await (supabase as any)
          .from('projects')
          .select('data')
          .eq('id', projectId)
          .single();

        if (error) {
          throw new Error(`Failed to load project from Supabase: ${error.message}`);
        }

        if (data?.data) {
          return ProjectMigrationAdapter.migrate(data.data);
        }
      } catch (err: any) {
        console.warn('Failed to load from cloud, attempting local backup:', err);
      }
    }

    // 2. Check local autosave or backups
    const local = ProjectSerializer.loadFromAutosave();
    if (local && local.metadata.id === projectId) {
      return local;
    }

    try {
      const backupRaw = localStorage.getItem(`apex_eda_backup_${projectId}`);
      if (backupRaw) {
        return ProjectSerializer.deserialize(backupRaw);
      }
    } catch {}

    throw new Error(`Project with ID "${projectId}" could not be found.`);
  }

  /**
   * Deletes a project from Supabase and local cache.
   */
  public static async deleteProject(projectId: string): Promise<void> {
    const user = AuthService.getUser();

    if (isSupabaseConfigured() && supabase && !user.isGuest) {
      const { error } = await (supabase as any)
        .from('projects')
        .delete()
        .eq('id', projectId);

      if (error) {
        throw new Error(`Failed to delete project: ${error.message}`);
      }
    }

    // Remove from local cache & backups
    try {
      localStorage.removeItem(`apex_eda_backup_${projectId}`);
      const cached = this.getCachedLocalRecords().filter((p) => p.id !== projectId);
      this.cacheLocalRecords(cached);
    } catch {}
  }

  private static cacheLocalRecords(records: CloudProjectRecord[]): void {
    try {
      localStorage.setItem(LOCAL_CLOUD_CACHE_KEY, JSON.stringify(records));
    } catch {}
  }

  private static getCachedLocalRecords(): CloudProjectRecord[] {
    try {
      const saved = localStorage.getItem(LOCAL_CLOUD_CACHE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  }
}
