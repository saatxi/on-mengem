import React, { useState } from 'react';
import { SmilePlus, X } from 'lucide-react';
import { ReactionTarget } from '../types';
import { useReactions } from '../context/ReactionsContext';
import { REACTION_EMOJIS, summarizeReactions } from '../utils/reactions';
import { plural } from '../utils/stats';
import { cn } from '../utils/cn';

interface Props {
  target: ReactionTarget;
  className?: string;
}

const PILL = 'inline-flex items-center justify-center h-8 rounded-full ring-1 transition-[background-color,transform] active:scale-[0.96]';

// Reaccions d'un ítem del grup: un xip per emoji amb el recompte (el propi, ressaltat) i un botó per afegir-ne
export const ReactionBar: React.FC<Props> = ({ target, className }) => {
  const { enabled, uid, members, reactionsFor, toggle } = useReactions();
  const [picking, setPicking] = useState(false);

  if (!enabled) return null;

  const reactions = reactionsFor(target);
  const summary = summarizeReactions(reactions, uid);
  const mine = new Set(reactions.filter((r) => r.userId === uid).map((r) => r.emoji));
  const nameOf = (id: string) => (id === uid ? 'Tu' : (members[id]?.nickname ?? 'Algú'));

  return (
    <div className={cn('flex flex-wrap items-center gap-1.5', className)}>
      {summary.map((s) => (
        <button
          key={s.emoji}
          type="button"
          onClick={() => toggle(target, s.emoji)}
          aria-pressed={s.mine}
          aria-label={`${s.label}, ${plural(s.count, 'persona', 'persones')}`}
          title={`${s.label}: ${s.userIds.map(nameOf).join(', ')}`}
          className={cn(
            PILL,
            'gap-1 px-2.5 text-sm',
            s.mine ? 'bg-accent-soft ring-accent text-stone-900' : 'bg-surface ring-stone-200 text-stone-700 hover:bg-stone-100',
          )}
        >
          <span aria-hidden="true">{s.emoji}</span>
          <span className="text-xs font-semibold tabular-nums">{s.count}</span>
        </button>
      ))}

      {picking ? (
        <div
          role="group"
          aria-label="Tria una reacció"
          onKeyDown={(e) => e.key === 'Escape' && setPicking(false)}
          className="inline-flex items-center gap-0.5 p-0.5 rounded-full bg-surface ring-1 ring-stone-200 shadow-card"
        >
          {REACTION_EMOJIS.map(({ emoji, label }) => (
            <button
              key={emoji}
              type="button"
              onClick={() => {
                toggle(target, emoji);
                setPicking(false);
              }}
              aria-pressed={mine.has(emoji)}
              aria-label={label}
              title={label}
              className={cn(
                'size-8 rounded-full text-base transition-[background-color,transform] active:scale-[0.9]',
                mine.has(emoji) ? 'bg-accent-soft' : 'hover:bg-stone-100',
              )}
            >
              {emoji}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setPicking(false)}
            aria-label="Tancar les reaccions"
            className="size-8 rounded-full flex items-center justify-center text-stone-500 hover:bg-stone-100 hover:text-stone-900"
          >
            <X className="size-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setPicking(true)}
          aria-label="Afegir una reacció"
          title="Afegir una reacció"
          className={cn(PILL, 'w-8 bg-surface ring-stone-200 text-stone-500 hover:bg-stone-100 hover:text-stone-900')}
        >
          <SmilePlus className="size-4" />
        </button>
      )}
    </div>
  );
};
