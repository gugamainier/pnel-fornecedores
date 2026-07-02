/** Wordmark FLOWNIX: "FLOWN" + os 4 pontos da marca (azul/vermelho/roxo/verde) + "X". */
export default function FlownixLogo({ className = "" }: { className?: string }) {
  return (
    <div
      className={`flex items-center font-heading font-bold tracking-tight text-white ${className}`}
      aria-label="FLOWNIX"
    >
      <span>FLOWN</span>
      <span
        className="mx-[0.12em] grid grid-cols-2 gap-[0.08em]"
        aria-hidden
        style={{ width: "0.9em", height: "0.9em" }}
      >
        <span className="rounded-[2px] bg-brand-600" />
        <span className="rounded-[2px] bg-fxred-600" />
        <span className="rounded-[2px] bg-fxpurple-600" />
        <span className="rounded-[2px] bg-fxgreen-600" />
      </span>
      <span>X</span>
    </div>
  );
}
