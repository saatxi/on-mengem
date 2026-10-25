import React, { useState } from 'react';
import { Check, Copy, Share2 } from 'lucide-react';
import { Group } from '../types';
import { cn } from '../utils/cn';
import { CARD } from '../utils/ui';
import { Button } from './Button';
import { GroupHistory } from './GroupHistory';
import { GroupMembers } from './GroupMembers';

interface Props {
  group: Group;
  onJoinGroup: () => void;
  onCreateGroup: () => void;
}

export const GroupTab: React.FC<Props> = ({ group, onJoinGroup, onCreateGroup }) => {
  const [copiedCode, setCopiedCode] = useState(false);

  const copyCode = () => {
    navigator.clipboard.writeText(group.code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const shareOnWhatsApp = () => {
    const text = encodeURIComponent(
      `Uneix-te al meu grup "${group.name}" a On mengem? amb el codi: ${group.code} per compartir restaurants i llistes de desitjats en temps real!`,
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-6">
      {/* Grup actiu i codi d'invitació */}
      <div className={cn(CARD, 'p-5 sm:p-7')}>
        <div className="flex flex-col md:flex-row justify-between gap-5">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-accent">
              Grup actiu{group.ownerName ? ` · creat per ${group.ownerName}` : ''}
            </p>
            <h2 className="mt-1 text-3xl font-extrabold text-stone-900 tracking-tight break-words">{group.name}</h2>
            {group.description && <p className="mt-1 text-sm text-stone-600 max-w-lg">{group.description}</p>}
          </div>

          <div className="w-full md:w-80 shrink-0 p-4 rounded-3xl bg-accent-soft">
            <p className="text-sm font-semibold text-orange-900 mb-2">Codi d'invitació</p>
            <div className="flex items-center gap-2">
              <span className="flex-1 px-3 py-2 rounded-2xl bg-surface font-mono text-xl font-bold tracking-[0.3em] text-stone-900 text-center shadow-card">
                {group.code}
              </span>
              <Button onClick={copyCode} size="lg" className="px-4">
                {copiedCode ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copiedCode ? 'Copiat' : 'Copiar'}</span>
              </Button>
            </div>
            <Button onClick={shareOnWhatsApp} variant="success" className="mt-2 w-full">
              <Share2 className="w-4 h-4" />
              <span>Compartir per WhatsApp</span>
            </Button>
          </div>
        </div>
      </div>

      <GroupMembers group={group} onJoinGroup={onJoinGroup} onCreateGroup={onCreateGroup} />
      <GroupHistory key={group.id} group={group} />
    </div>
  );
};
