/**
 * lab/workspace.js — active notebook target owned by the domain.
 *
 * The panel renders and mutates this state, but core code reads it from App.
 * That keeps saveCheckpoint independent from UI widgets while leaving project
 * and series validation in the notebook model.
 */

import { INBOX_PROJECT_ID } from './notebook.js';

export class NotebookWorkspace {
  constructor(notebook) {
    this.notebook = notebook;
    this.activeProjectId = INBOX_PROJECT_ID;
    this.activeSeriesId = null;
    this.ensure();
  }

  ensure() {
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

  setProject(projectId) {
    if (!this.notebook.getProject(projectId)) return this;
    this.activeProjectId = projectId;
    this.activeSeriesId = null;
    return this.ensure();
  }

  setSeries(seriesId) {
    if (!seriesId) {
      this.activeSeriesId = null;
      return this.ensure();
    }
    const series = this.notebook.getSeries(seriesId);
    if (!series || series.projectId !== this.activeProjectId) return this;
    this.activeSeriesId = seriesId;
    return this.ensure();
  }

  get target() {
    this.ensure();
    return {
      projectId: this.activeProjectId,
      seriesId: this.activeSeriesId,
    };
  }
}
