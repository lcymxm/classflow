import { useState } from "react";
import {
  Check,
  Copy,
  Layers,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import type { FormEvent } from "react";
import type { ScheduleData, TimetableCreateInput } from "../types";
import { MAX_TIMETABLES } from "../lib/factory";
import { getDefaultStartDate } from "../lib/date";
import { Modal } from "./Modal";
import { TIMETABLE_TEMPLATES } from "../lib/templates";

interface TimetableManagerProps {
  data: ScheduleData;
  onClose: () => void;
  onSwitch: (id: string) => void;
  onCreate: (input: TimetableCreateInput) => void;
  onRename: (id: string, name: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
}

export function TimetableManager({
  data,
  onClose,
  onSwitch,
  onCreate,
  onRename,
  onDuplicate,
  onDelete,
}: TimetableManagerProps) {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [semesterName, setSemesterName] = useState("");
  const [startDate, setStartDate] = useState(getDefaultStartDate());
  const [totalWeeks, setTotalWeeks] = useState(20);
  const [showWeekends, setShowWeekends] = useState(true);
  const [profileId, setProfileId] = useState(
    data.periodProfiles[0]?.id ?? "",
  );
  const [templateId, setTemplateId] = useState("blank");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [error, setError] = useState("");

  const active = data.timetables.find(
    (timetable) => timetable.id === data.activeTimetableId,
  );
  const canCreate = data.timetables.length < MAX_TIMETABLES;

  const startCreate = () => {
    setCreating(true);
    setName(`我的课表 ${data.timetables.length + 1}`);
    setSemesterName("");
    setStartDate(getDefaultStartDate());
    setTotalWeeks(20);
    setShowWeekends(true);
    setProfileId(data.periodProfiles[0]?.id ?? "");
    setTemplateId("blank");
    setError("");
  };

  const submitCreate = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) {
      setError("给这套课表起个名字吧。");
      return;
    }
    if (!profileId) {
      setError("请选择一套作息时间。");
      return;
    }
    onCreate({
      name: name.trim(),
      semesterName: semesterName.trim(),
      startDate,
      totalWeeks: Math.min(30, Math.max(1, totalWeeks)),
      showWeekends,
      periodProfileId: profileId,
      templateId,
    });
  };

  const startRename = (id: string, currentName: string) => {
    setRenamingId(id);
    setRenameValue(currentName);
    setError("");
  };

  const submitRename = (id: string) => {
    const next = renameValue.trim();
    if (!next) {
      setError("课表名称不能为空。");
      return;
    }
    onRename(id, next);
    setRenamingId(null);
    setError("");
  };

  return (
    <Modal
      className="timetable-manager-modal"
      eyebrow="YOUR TIMETABLES"
      title="课表管理"
      onClose={onClose}
      footer={
        <>
          <p className="modal-foot-note">
            当前共 {data.timetables.length} 套课表，最多 {MAX_TIMETABLES} 套
          </p>
          <span className="modal-foot-spacer" />
          <button className="secondary-button" type="button" onClick={onClose}>
            关闭
          </button>
          <button
            className="primary-button"
            type="button"
            onClick={startCreate}
            disabled={!canCreate}
          >
            <Plus size={15} />
            新建课表
          </button>
        </>
      }
    >
      <div className="timetable-manager">
        {error ? <p className="form-error">{error}</p> : null}

        {creating ? (
          <form className="timetable-create-card" onSubmit={submitCreate}>
            <div className="timetable-create-head">
              <div>
                <span className="micro-label">NEW TIMETABLE</span>
                <h3>新建一套课表</h3>
              </div>
              <button
                className="icon-button"
                type="button"
                onClick={() => setCreating(false)}
                aria-label="取消新建"
              >
                <X size={16} />
              </button>
            </div>
            <div className="form-grid">
              <label className="field">
                <span className="field-label">课表名称</span>
                <input
                  className="field-input"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="例如：主课表、实验课表"
                  maxLength={60}
                  autoFocus
                />
              </label>
              <label className="field">
                <span className="field-label">学期名称</span>
                <input
                  className="field-input"
                  value={semesterName}
                  onChange={(event) => setSemesterName(event.target.value)}
                  placeholder="留空自动生成"
                  maxLength={60}
                />
              </label>
              <label className="field">
                <span className="field-label">开学第一周（周一）</span>
                <input
                  className="field-input"
                  type="date"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                />
              </label>
              <label className="field">
                <span className="field-label">学期总周数</span>
                <input
                  className="field-input"
                  type="number"
                  min={1}
                  max={30}
                  value={totalWeeks}
                  onChange={(event) =>
                    setTotalWeeks(Math.min(30, Math.max(1, Number(event.target.value) || 1)))
                  }
                />
              </label>
              <div className="field field--wide">
                <span className="field-label">从模板开始</span>
                <div className="template-picker" role="group" aria-label="课表模板">
                  {TIMETABLE_TEMPLATES.map((template) => (
                    <button
                      key={template.id}
                      className={`template-option ${templateId === template.id ? "is-selected" : ""}`}
                      type="button"
                      onClick={() => setTemplateId(template.id)}
                      aria-pressed={templateId === template.id}
                    >
                      <strong>{template.name}</strong>
                      <small>{template.description}</small>
                    </button>
                  ))}
                </div>
                <small className="field-hint">模板课程只是起点，创建后可以自由修改。</small>
              </div>

              <label className="field field--wide">
                <span className="field-label">使用作息方案</span>
                <select
                  className="field-input"
                  value={profileId}
                  onChange={(event) => setProfileId(event.target.value)}
                >
                  {data.periodProfiles.map((profile) => (
                    <option key={profile.id} value={profile.id}>
                      {profile.name} · {profile.periods.length} 节
                    </option>
                  ))}
                </select>
                <small className="field-hint">创建后可以在设置里随时切换或修改。</small>
              </label>
            </div>
            <label className="toggle-row toggle-row--compact">
              <span>
                <strong>显示周末</strong>
                <small>关闭后周末课程仍会保留，调休周末仍会显示。</small>
              </span>
              <input
                type="checkbox"
                checked={showWeekends}
                onChange={(event) => setShowWeekends(event.target.checked)}
              />
              <span className="switch" aria-hidden="true" />
            </label>
            <div className="timetable-create-actions">
              <button className="secondary-button" type="button" onClick={() => setCreating(false)}>
                取消
              </button>
              <button className="primary-button" type="submit">
                <Check size={15} />
                创建并进入
              </button>
            </div>
          </form>
        ) : null}

        <div className="timetable-list">
          {data.timetables.map((timetable) => {
            const isActive = timetable.id === data.activeTimetableId;
            return (
              <article
                className={`timetable-row ${isActive ? "is-active" : ""}`}
                key={timetable.id}
              >
                <span className="timetable-row-icon" aria-hidden="true">
                  <Layers size={18} />
                </span>
                <div className="timetable-row-main">
                  {renamingId === timetable.id ? (
                    <div className="timetable-rename">
                      <input
                        className="field-input"
                        value={renameValue}
                        onChange={(event) => setRenameValue(event.target.value)}
                        maxLength={60}
                        autoFocus
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            submitRename(timetable.id);
                          }
                          if (event.key === "Escape") setRenamingId(null);
                        }}
                      />
                      <button
                        className="icon-button"
                        type="button"
                        onClick={() => submitRename(timetable.id)}
                        aria-label="保存名称"
                      >
                        <Check size={15} />
                      </button>
                      <button
                        className="icon-button"
                        type="button"
                        onClick={() => setRenamingId(null)}
                        aria-label="取消重命名"
                      >
                        <X size={15} />
                      </button>
                    </div>
                  ) : (
                    <div className="timetable-row-title">
                      <h3>{timetable.name}</h3>
                      {isActive ? <span className="active-pill">当前</span> : null}
                    </div>
                  )}
                  <p>
                    {timetable.semester.name} · {timetable.courses.length} 门课程
                    {timetable.events.length > 0 ? ` · ${timetable.events.length} 条日程` : ""}
                  </p>
                </div>
                <div className="timetable-row-actions">
                  {!isActive ? (
                    <button
                      className="text-button"
                      type="button"
                      onClick={() => onSwitch(timetable.id)}
                    >
                      进入
                    </button>
                  ) : null}
                  <button
                    className="icon-button"
                    type="button"
                    onClick={() => startRename(timetable.id, timetable.name)}
                    aria-label={`重命名${timetable.name}`}
                    title="重命名"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    className="icon-button"
                    type="button"
                    onClick={() => onDuplicate(timetable.id)}
                    aria-label={`复制${timetable.name}`}
                    title="复制课表"
                  >
                    <Copy size={15} />
                  </button>
                  <button
                    className="icon-button danger-icon"
                    type="button"
                    onClick={() => onDelete(timetable.id)}
                    disabled={data.timetables.length <= 1}
                    aria-label={`删除${timetable.name}`}
                    title={data.timetables.length <= 1 ? "至少保留一套课表" : "删除课表"}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </article>
            );
          })}
        </div>

        {data.timetables.length === 0 || !active ? (
          <p className="settings-note">还没有课表，点右下角新建一套。</p>
        ) : null}
      </div>
    </Modal>
  );
}
