import { Reaction, ReactionEmoji, ReactionTarget } from '../types';

/** Emojis de les reaccions en l'ordre en què es mostren, amb el nom accessible de cadascun. */
export const REACTION_EMOJIS: { emoji: ReactionEmoji; label: string }[] = [
  { emoji: '👍', label: "M'agrada" },
  { emoji: '👎', label: "No m'agrada" },
  { emoji: '❤️', label: "M'encanta" },
  { emoji: '🤤', label: 'Quina gana' },
  { emoji: '🙋', label: "M'apunto" },
];

/** Clau d'un ítem per agrupar-ne les reaccions. */
export const targetKey = (target: ReactionTarget) => `${target.type}:${target.id}`;

export interface ReactionSummary {
  emoji: ReactionEmoji;
  label: string;
  count: number;
  /** Si l'usuari actual hi ha reaccionat. */
  mine: boolean;
  userIds: string[];
}

/** Recompte de les reaccions d'un ítem per emoji, en l'ordre de REACTION_EMOJIS i sense els que no en tenen cap. */
export const summarizeReactions = (reactions: Reaction[], uid: string | undefined): ReactionSummary[] =>
  REACTION_EMOJIS.flatMap(({ emoji, label }) => {
    const userIds = reactions.filter((r) => r.emoji === emoji).map((r) => r.userId);
    return userIds.length ? [{ emoji, label, count: userIds.length, mine: uid !== undefined && userIds.includes(uid), userIds }] : [];
  });
