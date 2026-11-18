import { stepStates } from '../lib/lifecycle';
import type { Stage } from '../services/types';
import { Disclosure } from './Disclosure';

function CheckIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 12 12" aria-hidden="true" focusable="false">
      <path d="M2 6.5 4.7 9 10 3.2" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * The lifecycle as a connected timeline: completed steps are filled, the step in progress is
 * ringed, and upcoming steps are hollow. It shows where the lease is and cannot skip a step.
 * Every state is also written in words (visibly on wider screens, and for screen readers
 * always), so color and shape are never the only cue.
 */
export function LifecycleTimeline({ stage, complete }: { stage: Stage; complete: boolean }) {
  const steps = stepStates(stage, complete);
  const current = steps.find((step) => step.state === 'current');
  const lastIndex = steps.length - 1;
  return (
    <div className="timeline">
      <ol className="timeline__list" aria-label="Lifecycle">
        {steps.map((step, index) => {
          const spoken = step.state === 'done' ? 'completed' : step.state === 'current' ? 'current step, in progress' : 'not started';
          const note = step.state === 'current' ? 'In progress' : complete && index === lastIndex ? 'Complete' : null;
          return (
            <li key={step.stage} className={`timeline__step timeline__step--${step.state}`} aria-current={step.state === 'current' ? 'step' : undefined}>
              <span className="timeline__node" aria-hidden="true">
                {step.state === 'done' && <CheckIcon />}
              </span>
              <span className="timeline__label">
                {step.label}
                <span className="sr-only">, {spoken}</span>
              </span>
              {note && (
                <span className="timeline__note" aria-hidden="true">
                  {note}
                </span>
              )}
            </li>
          );
        })}
      </ol>
      {/* Very narrow screens have no room for five labels, so the current step is written out once. */}
      <p className="timeline__summary" aria-hidden="true">
        {current ? `${current.label}, in progress` : 'All steps complete'}
      </p>
    </div>
  );
}

/**
 * Current status as one line with the full lifecycle timeline behind it, so the overview opens with
 * where things stand and the five-step list is one tap away.
 */
export function LifecycleStatus({ stage, complete }: { stage: Stage; complete: boolean }) {
  const current = stepStates(stage, complete).find((step) => step.state === 'current');
  const title = complete ? 'Settlement complete' : current ? `${current.label}: in progress` : 'Status';
  return (
    <Disclosure title={title} meta="Timeline" metaIsAction standalone>
      <LifecycleTimeline stage={stage} complete={complete} />
    </Disclosure>
  );
}
