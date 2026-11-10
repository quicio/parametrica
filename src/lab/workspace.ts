/** Active notebook target owned by the domain. */

import { INBOX_PROJECT_ID } from './notebook.ts';

export interface NotebookProjectLike {
  id: string;
  [key: string]: unknown;
}
export interface NotebookSeriesLike {
  id: string;
  projectId: string;
  [key: string]: unknown;
}
export interface NotebookWorkspaceHost {
  projects: NotebookProjectLike[];
  ensureInbox(): unknown;
  seriesFor(projectId: string): NotebookSeriesLike[];
  getProject(id: string): NotebookProjectLike | null | undefined;
  getSeries(id: string): NotebookSeriesLike | null | undefined;
}

export class NotebookWorkspace {
  notebook: NotebookWorkspaceHost;
  activeProjectId: string;
  activeSeriesId: string | null;

  constructor(notebook: NotebookWorkspaceHost) {
    this.notebook = notebook;
    this.activeProjectId = INBOX_PROJECT_ID;
    this.activeSeriesId = null;
    this.ensure();
  }

  ensure(): this {
    this.notebook.ensureInbox();
    const projects = this.notebook.projects;
    if (!projects.some((project) => project.id === this.activeProjectId)) {
      this.activeProjectId = projects[0]?.id ?? INBOX_PROJECT_ID;
      this.activeSeriesId = null;
    }
    const series = this.notebook.seriesFor(this.activeProjectId);
    if (this.activeSeriesId && !series.some((entry) => entry.id === this.activeSeriesId)) {
      this.activeSeriesId = null;
    }
    return this;
  }

  setProject(projectId: string): this {
    if (!this.notebook.getProject(projectId)) return this;
    this.activeProjectId = projectId;
    this.activeSeriesId = null;
    return this.ensure();
  }

  setSeries(seriesId: string | null): this {
    if (!seriesId) {
      this.activeSeriesId = null;
      return this.ensure();
    }
    const series = this.notebook.getSeries(seriesId);
    if (!series || series.projectId !== this.activeProjectId) return this;
    this.activeSeriesId = seriesId;
    return this.ensure();
  }

  get target(): { projectId: string; seriesId: string | null } {
    this.ensure();
    return {
      projectId: this.activeProjectId,
      seriesId: this.activeSeriesId,
    };
  }
}
