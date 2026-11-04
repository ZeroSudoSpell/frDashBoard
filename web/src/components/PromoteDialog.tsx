import { useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, ApiRequestError } from '../lib/api';
import { RELEASE_STAGES, STAGES, type Build, type ReleaseStage } from '../lib/types';

/**
 * Promotion dialog. Only offers stages later than the build's current one;
 * the server enforces the same rule, so this is UX, not the guardrail.
 */
export function PromoteDialog({ build, onClose }: { build: Build; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const qc = useQueryClient();

  const options = RELEASE_STAGES.filter((s) => STAGES.indexOf(s) > STAGES.indexOf(build.stage));
  const [toStage, setToStage] = useState<ReleaseStage>(options[0] ?? 'alpha');
  const [publishedBy, setPublishedBy] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    const d = ref.current;
    d?.showModal();
    const onCancel = (e: Event) => {
      e.preventDefault();
      onClose();
    };
    d?.addEventListener('cancel', onCancel);
    return () => d?.removeEventListener('cancel', onCancel);
  }, [onClose]);

  const mutation = useMutation({
    mutationFn: () => api.promote({ buildId: build._id, toStage, publishedBy, notes }),
    onSuccess: () => {
      // Everything derived from builds/releases is now stale.
      void qc.invalidateQueries({ queryKey: ['builds'] });
      void qc.invalidateQueries({ queryKey: ['summary'] });
      void qc.invalidateQueries({ queryKey: ['release-histogram'] });
      onClose();
    },
  });

  const errorText =
    mutation.error instanceof ApiRequestError ? mutation.error.body.error : mutation.error ? String(mutation.error) : null;

  return (
    <dialog ref={ref} aria-labelledby="promote-title">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
      >
        <h2 id="promote-title">Promote build</h2>
        <div className="meta">
          {build.project} · {build.board} · <span className="mono">{build.version}</span> · currently <b>{build.stage}</b>
        </div>

        <label className="field">
          To stage
          <select value={toStage} onChange={(e) => setToStage(e.target.value as ReleaseStage)}>
            {options.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Published by
          <input required maxLength={80} value={publishedBy} onChange={(e) => setPublishedBy(e.target.value)} placeholder="your.name" />
        </label>
        <label className="field">
          Notes
          <textarea rows={2} maxLength={1000} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>

        {errorText && <div className="error" role="alert">{errorText}</div>}

        <div className="dialog-actions">
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn primary" disabled={mutation.isPending || !publishedBy}>
            {mutation.isPending ? 'Promoting…' : `Promote to ${toStage}`}
          </button>
        </div>
      </form>
    </dialog>
  );
}
