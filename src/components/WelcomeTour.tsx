import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, BookmarkPlus, CalendarCheck, Check, Dices, Plus, Sparkles, Star, Users, Utensils, X } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';
import { CuisineTile } from './CuisineTile';
import { useAuth } from '../context/AuthContext';
import { cn } from '../utils/cn';

interface Props {
  onClose: () => void;
}

interface Slide {
  title: string;
  body: React.ReactNode;
  /** Il·lustració de dalt: una mini escena feta amb les peces de l'app. */
  art: React.ReactNode;
}

// Text diferent segons la mida de pantalla (al mòbil els botons són en llocs diferents)
const Mobile: React.FC<{ children: React.ReactNode }> = ({ children }) => <span className="sm:hidden">{children}</span>;
const Desktop: React.FC<{ children: React.ReactNode }> = ({ children }) => <span className="hidden sm:inline">{children}</span>;

// Arrossegament mínim (px) perquè un lliscament canviï de diapositiva
const SWIPE_THRESHOLD = 50;

const ART_FRAME = 'relative h-44 sm:h-48 rounded-3xl overflow-hidden flex items-center justify-center';
const ART_ICON = 'size-16 rounded-3xl flex items-center justify-center shadow-card';
const ART_CHIP = 'absolute flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface text-xs font-semibold text-stone-800 shadow-card';

const buildSlides = (nickname?: string): Slide[] => [
  {
    title: nickname ? `Hola, ${nickname}!` : 'Et donem la benvinguda!',
    body: (
      <>
        Aquesta és la teva llibreta de restaurants: els llocs on has anat, els que vols provar i els que comparteixes amb la colla. Et
        mostrem com funciona en un minut.
      </>
    ),
    art: (
      <div className={cn(ART_FRAME, 'bg-brand')}>
        <div className={cn(ART_ICON, 'size-20 bg-surface text-accent -rotate-6')}>
          <Utensils className="size-9" />
        </div>
        <CuisineTile cuisine="Italiana" className="absolute top-6 left-[14%] rotate-[-10deg] shadow-card" />
        <CuisineTile cuisine="Japonesa" className="absolute bottom-6 right-[14%] rotate-[8deg] shadow-card" />
        <CuisineTile cuisine="Catalana" className="absolute top-8 right-[20%] size-10 text-xl rotate-[12deg] shadow-card" />
      </div>
    ),
  },
  {
    title: 'Guarda els teus restaurants',
    body: (
      <>
        Afegeix-los amb <Mobile>el botó + de baix a la dreta</Mobile>
        <Desktop>el botó «Afegir restaurant»</Desktop>: cuina, preu, adreça, notes i enllaços. Marca els preferits amb l'estrella i troba'ls
        amb la cerca, els filtres o la vista de mapa.
      </>
    ),
    art: (
      <div className={cn(ART_FRAME, 'bg-accent-soft')}>
        <div className="w-60 rounded-3xl bg-surface p-4 shadow-card space-y-3 rotate-[-2deg]">
          <div className="flex items-center gap-3">
            <CuisineTile cuisine="Catalana" className="size-10 text-xl" />
            <div className="min-w-0 flex-1">
              <p className="font-extrabold tracking-tight text-stone-900">Can Pere</p>
              <p className="text-xs text-stone-500">Catalana · 20-30 €</p>
            </div>
            <Star className="size-5 fill-amber-400 text-amber-500" />
          </div>
          <div className="flex gap-1.5 text-xs">
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-900">
              <Star className="size-3.5 fill-amber-400 text-amber-500" />
              <strong>4.5</strong>
            </span>
            <span className="px-2.5 py-1 rounded-full bg-accent-soft font-semibold text-orange-800">Per anar</span>
          </div>
        </div>
        <span className="absolute bottom-5 right-[12%] size-11 rounded-full bg-brand text-white flex items-center justify-center shadow-lg shadow-accent/30">
          <Plus className="size-5" />
        </span>
      </div>
    ),
  },
  {
    title: 'Apunta cada visita',
    body: (
      <>
        Prem «Visita» a la targeta per registrar quan hi has anat, quina nota li poses i qui t'acompanyava. Les visites poden ser privades o
        del grup, i la nota del restaurant és la mitjana de totes.
      </>
    ),
    art: (
      <div className={cn(ART_FRAME, 'bg-emerald-50')}>
        <div className={cn(ART_ICON, 'bg-surface text-emerald-700')}>
          <CalendarCheck className="size-8" />
        </div>
        <span className={cn(ART_CHIP, 'top-7 left-[12%] text-emerald-800')}>
          <Check className="size-3.5" /> 3 visites
        </span>
        <span className={cn(ART_CHIP, 'bottom-7 right-[10%]')}>
          <Star className="size-3.5 fill-amber-400 text-amber-500" /> 4,7 de mitjana
        </span>
        <span className="absolute top-8 right-[14%] flex items-center gap-1 px-3 py-1.5 rounded-full bg-emerald-600 text-white text-xs font-bold shadow-card">
          <Plus className="size-3.5" /> Visita
        </span>
      </div>
    ),
  },
  {
    title: 'La llista de desitjats',
    body: (
      <>
        Quan algú et recomani un lloc, afegeix-lo a <Mobile>la pestanya Desitjats</Mobile>
        <Desktop>Desitjats</Desktop>. Marca'l com a planificat quan tingueu data i, quan hi aneu, converteix-lo en restaurant amb la primera
        visita.
      </>
    ),
    art: (
      <div className={cn(ART_FRAME, 'bg-violet-50')}>
        <div className={cn(ART_ICON, 'bg-surface text-violet-700')}>
          <BookmarkPlus className="size-8" />
        </div>
        <span className={cn(ART_CHIP, 'top-7 left-[10%]')}>💡 Recomanat per la Laia</span>
        <span className="absolute bottom-8 left-[16%] px-3 py-1.5 rounded-full bg-sky-50 text-sky-800 text-xs font-semibold shadow-card">
          Planificat
        </span>
        <span className="absolute top-12 right-[12%] px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-800 text-xs font-semibold shadow-card">
          Provat
        </span>
      </div>
    ),
  },
  {
    title: 'Comparteix-ho amb el teu grup',
    body: (
      <>
        Tens un espai personal i pots crear grups o unir-te'n amb un codi de 6 caràcters. Canvia d'espai amb el selector de dalt a
        l'esquerra. Tot el que afegeix el grup surt al moment, i pots copiar-hi els teus restaurants.
      </>
    ),
    art: (
      <div className={cn(ART_FRAME, 'bg-sky-50')}>
        <div className={cn(ART_ICON, 'bg-surface text-sky-700')}>
          <Users className="size-8" />
        </div>
        <span className={cn(ART_CHIP, 'top-7 left-[10%]')}>
          <span className="size-2 rounded-full bg-emerald-500 ring-4 ring-emerald-500/15" /> Sopars de divendres
        </span>
        <span className="absolute bottom-7 right-[12%] px-3 py-1.5 rounded-2xl bg-surface font-mono text-base font-bold tracking-[0.3em] text-stone-900 shadow-card">
          TAPES2
        </span>
      </div>
    ),
  },
  {
    title: 'No sabeu on anar?',
    body: (
      <>
        Prem «Sorprèn-me» i l'app en tria un a l'atzar d'entre els que tens filtrats. A <Mobile>la pestanya Resum</Mobile>
        <Desktop>Resum</Desktop> hi trobaràs les teves xifres i les cuines que més repeteixes.
      </>
    ),
    art: (
      <div className={cn(ART_FRAME, 'bg-amber-50')}>
        <div className={cn(ART_ICON, 'bg-surface text-accent rotate-12')}>
          <Dices className="size-8" />
        </div>
        <span className={cn(ART_CHIP, 'top-7 left-[10%] text-accent font-bold')}>Avui toca anar aquí!</span>
        <span className={cn(ART_CHIP, 'bottom-7 right-[10%]')}>
          <strong className="text-base tabular-nums">47</strong> restaurants
        </span>
      </div>
    ),
  },
  {
    title: 'Ja ho tens!',
    body: (
      <>
        Si vols, instal·la l'app des del botó de dalt per obrir-la com una més des de la pantalla d'inici. Pots tornar a veure aquesta guia
        des del teu perfil.
      </>
    ),
    art: (
      <div className={cn(ART_FRAME, 'bg-brand')}>
        <div className={cn(ART_ICON, 'size-20 bg-surface text-accent')}>
          <Sparkles className="size-9" />
        </div>
      </div>
    ),
  },
];

// Guia de benvinguda en diapositives. Al mòbil ocupa tota la pantalla i es pot lliscar; a l'escriptori és un diàleg.
export const WelcomeTour: React.FC<Props> = ({ onClose }) => {
  const { userProfile } = useAuth();
  const slides = buildSlides(userProfile?.nickname);
  const [index, setIndex] = useState(0);
  const isLast = index === slides.length - 1;
  const swipeStartX = useRef<number | null>(null);

  const goTo = (i: number) => setIndex(Math.max(0, Math.min(slides.length - 1, i)));
  const next = () => (isLast ? onClose() : goTo(index + 1));

  // Fletxes del teclat
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') setIndex((i) => Math.min(slides.length - 1, i + 1));
      if (e.key === 'ArrowLeft') setIndex((i) => Math.max(0, i - 1));
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [slides.length]);

  const handlePointerUp = (e: React.PointerEvent) => {
    if (swipeStartX.current === null) return;
    const dx = e.clientX - swipeStartX.current;
    swipeStartX.current = null;
    if (dx <= -SWIPE_THRESHOLD) goTo(index + 1);
    if (dx >= SWIPE_THRESHOLD) goTo(index - 1);
  };

  return (
    <Modal label="Guia de benvinguda" onClose={onClose} fullScreenOnMobile>
      <div className="flex-1 flex flex-col min-h-0">
        {/* Capçalera: progrés i sortir */}
        <div className="flex items-center justify-between px-5 sm:px-6 pt-4">
          <span className="text-xs font-semibold text-stone-500 tabular-nums">
            {index + 1} de {slides.length}
          </span>
          {isLast ? (
            <button
              type="button"
              onClick={onClose}
              aria-label="Tanca"
              className="p-2 -mr-2 rounded-full text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition-colors"
            >
              <X className="size-5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 -mr-2 rounded-full text-sm font-semibold text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition-colors"
            >
              Saltar
            </button>
          )}
        </div>

        {/* Diapositives: una pista horitzontal que es desplaça; totes fan l'alçada de la més alta */}
        <div
          className="flex-1 overflow-hidden touch-pan-y select-none"
          onPointerDown={(e) => {
            swipeStartX.current = e.clientX;
          }}
          onPointerUp={handlePointerUp}
          onPointerCancel={() => {
            swipeStartX.current = null;
          }}
          aria-roledescription="carrusel"
        >
          <div
            className="flex h-full transition-transform duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)]"
            style={{ transform: `translateX(-${index * 100}%)` }}
          >
            {slides.map((slide, i) => (
              <section
                key={i}
                aria-roledescription="diapositiva"
                aria-label={`${i + 1} de ${slides.length}`}
                aria-hidden={i !== index}
                inert={i !== index}
                className="w-full shrink-0 flex flex-col justify-center gap-6 px-5 sm:px-6 py-6"
              >
                {slide.art}
                <div className="space-y-2">
                  <h2 className="text-2xl font-extrabold tracking-tight text-stone-900 text-balance">{slide.title}</h2>
                  <p className="text-[15px] leading-relaxed text-stone-600 text-pretty">{slide.body}</p>
                </div>
              </section>
            ))}
          </div>
        </div>

        {/* Peu: punts i botons */}
        <div className="flex items-center justify-between gap-3 px-5 sm:px-6 pb-5 sm:pb-6 pt-2">
          <div className="flex items-center gap-1.5">
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Diapositiva ${i + 1}`}
                aria-current={i === index ? 'step' : undefined}
                className="p-1 -m-1 rounded-full"
              >
                <span
                  className={cn(
                    'block h-2 rounded-full transition-[width,background-color] duration-300',
                    i === index ? 'w-6 bg-accent' : 'w-2 bg-stone-300 hover:bg-stone-400',
                  )}
                />
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {index > 0 && (
              <Button variant="ghost" onClick={() => goTo(index - 1)} aria-label="Enrere" className="px-3">
                <ArrowLeft className="size-4" />
              </Button>
            )}
            <Button variant="brand" onClick={next}>
              {isLast ? 'Comença' : 'Següent'}
              {!isLast && <ArrowRight className="size-4" />}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
