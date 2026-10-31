import { describe, expect, it } from 'vitest';
import { Reaction, ReactionEmoji } from '../types';
import { summarizeReactions, targetKey } from './reactions';

const reaction = (userId: string, emoji: ReactionEmoji): Reaction => ({
  id: `${userId}-${emoji}`,
  userId,
  emoji,
  target: { type: 'wishlist', id: 'w1' },
});

describe('summarizeReactions', () => {
  it("agrupa per emoji en l'ordre fix i marca les pròpies", () => {
    const summary = summarizeReactions(
      [reaction('pau', '🙋'), reaction('marta', '👍'), reaction('laia', '🙋'), reaction('marta', '🙋')],
      'marta',
    );
    expect(summary).toEqual([
      { emoji: '👍', label: "M'agrada", count: 1, mine: true, userIds: ['marta'] },
      { emoji: '🙋', label: "M'apunto", count: 3, mine: true, userIds: ['pau', 'laia', 'marta'] },
    ]);
  });

  it('sense usuari no en marca cap com a pròpia', () => {
    expect(summarizeReactions([reaction('pau', '❤️')], undefined)[0].mine).toBe(false);
  });

  it('sense reaccions retorna una llista buida', () => {
    expect(summarizeReactions([], 'marta')).toEqual([]);
  });
});

describe('targetKey', () => {
  it("combina el tipus i l'id", () => {
    expect(targetKey({ type: 'visit', id: 'v1' })).toBe('visit:v1');
  });
});
